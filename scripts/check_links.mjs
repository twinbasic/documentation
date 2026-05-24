// Offline link checker for static sites.
//
// Typical invocation (single pass), from docs/check.bat:
//
//     node scripts/check_links.mjs --offline --include-fragments
//         --fallback-extensions html --index-files "index.html,."
//         --root-dir docs/_site docs/_site
//
// Multiple passes can run in parallel by separating them with /sep/:
//
//     node scripts/check_links.mjs <args1...> /sep/ <args2...>
//
// Each /sep/-separated segment is dispatched to a worker_threads
// Worker (libuv threadpool).  Results are collected and printed in
// order with headers.  A single segment (no /sep/) runs inline.
//
// On this site (~733k link occurrences, ~12k unique targets across
// 1127 HTML files / 124 MB) each pass runs in ~2.2 s on the dev box.
// It dedupes (target, frag) up front so each unique filesystem and
// fragment check fires exactly once regardless of how many pages
// link to the same target.
//
// Online (network) link checking is not implemented. --offline is
// therefore required; the script exits non-zero if it is absent.
//
// Strictness beyond a typical link checker:
//   * Trailing slash on a file-shaped URL ('foo.html/') is reported
//     broken (catches authoring mistakes).
//   * <script src> URLs are checked.
//   * The --forbid PREFIX flag (repeatable) fails the run if any
//     extracted link starts with one of the given URL prefixes
//     (bare prefix and 'prefix/' exempt), used by the offline pass
//     to catch live-site links the offlinify rewrite missed.
//
// Output limitation: no per-link line numbers in error messages --
// htmlparser2 SAX doesn't expose source positions.

import * as fs from "node:fs";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { Parser } from "htmlparser2";
import { isMainThread, parentPort, workerData, Worker } from "node:worker_threads";

// tag -> [attr, ...]. SAX walker dispatches on tag name; for each
// matching attr present on that tag, the value becomes one or more
// link references. Covers the standard set of HTML link-bearing
// attributes (href / src / srcset / longdesc / formaction / action /
// data / cite / poster).
const LINK_ATTR_TABLE = new Map([
  ["a",          ["href"]],
  ["area",       ["href"]],
  ["base",       ["href"]],
  ["link",       ["href"]],
  ["img",        ["src", "longdesc", "srcset"]],
  ["script",     ["src"]],
  ["iframe",     ["src"]],
  ["frame",      ["src"]],
  ["embed",      ["src"]],
  ["source",     ["src", "srcset"]],
  ["audio",      ["src"]],
  ["video",      ["src", "poster"]],
  ["track",      ["src"]],
  ["input",      ["src", "formaction"]],
  ["button",     ["formaction"]],
  ["form",       ["action"]],
  ["object",     ["data"]],
  ["blockquote", ["cite"]],
  ["q",          ["cite"]],
  ["del",        ["cite"]],
  ["ins",        ["cite"]],
]);

const SRCSET_ATTRS = new Set(["srcset"]);

function* splitSrcset(value) {
  // `URL [descriptor], URL [descriptor], ...`. Descriptors cannot
  // contain commas, so a comma split is safe; each part's first
  // whitespace-separated token is the URL.
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const ws = trimmed.search(/\s/);
    const url = ws < 0 ? trimmed : trimmed.slice(0, ws);
    if (url) yield url;
  }
}

// One pass per file: extract every outgoing link AND every fragment-
// target id/name in a single parse. The Python original makes two
// passes (extract_links over all files, then extract_fragment_ids over
// the dedup'd fragment-target file set), but the per-file re-parse cost
// for the second pass outweighs the savings from skipping the ~25 % of
// files that no one links to with a fragment. captureIds=false is kept
// for completeness; main() always passes true when --include-fragments
// is on, which it always is in our use.
//
// forbidPrefixes is an array of string prefixes; any extracted link
// whose value starts with one of them, and whose tail past the prefix
// is non-empty and not just '/', is collected into the returned
// `forbidden` list. The bare prefix and prefix/ are exempt
// (intentional "go to live site" links).
function extractLinksAndIds(htmlPath, captureIds, forbidPrefixes) {
  const links = [];
  const ids = captureIds ? new Set() : null;
  const hasForbid = forbidPrefixes && forbidPrefixes.length > 0;
  const forbidden = hasForbid ? [] : null;
  const checkForbid = hasForbid ? (url) => {
    for (const prefix of forbidPrefixes) {
      if (!url.startsWith(prefix)) continue;
      const tail = url.slice(prefix.length);
      if (tail === "" || tail === "/") return;
      forbidden.push({ prefix, url });
      return;
    }
  } : null;
  const parser = new Parser({
    onopentag(name, attribs) {
      if (captureIds) {
        const id = attribs.id;
        if (id) ids.add(id);
        if (name === "a") {
          const nm = attribs.name;
          if (nm) ids.add(nm);
        }
      }
      const attrs = LINK_ATTR_TABLE.get(name);
      if (!attrs) return;
      for (const a of attrs) {
        const v = attribs[a];
        if (!v) continue;
        if (SRCSET_ATTRS.has(a)) {
          for (const u of splitSrcset(v)) {
            links.push(u);
            if (checkForbid) checkForbid(u);
          }
        } else {
          links.push(v);
          if (checkForbid) checkForbid(v);
        }
      }
    },
  });
  parser.write(fs.readFileSync(htmlPath, "utf8"));
  parser.end();
  return { links, ids, forbidden };
}

// Coerce a base-path arg into the canonical '/prefix' form (leading
// slash, no trailing slash). Empty input maps to empty string.
function normalizeBasePath(s) {
  if (!s) return "";
  let v = s.trim().replace(/\/+$/, "");
  if (!v) return "";
  if (!v.startsWith("/")) v = "/" + v;
  return v;
}

// Lop a base-path prefix off an absolute URL path, if it matches.
//
//   '/twinBASIC-docs/foo'    -> '/foo'     (prefix + /...)
//   '/twinBASIC-docs'        -> '/'        (bare prefix, treat as root)
//   '/twinBASIC-docs-other'  -> unchanged  (only strip on '/' or end)
//   '/foo'                   -> unchanged  (no prefix match)
function stripBasePath(pathStr, basePath) {
  if (!basePath) return pathStr;
  if (pathStr === basePath) return "/";
  if (pathStr.startsWith(basePath + "/")) return pathStr.slice(basePath.length);
  return pathStr;
}

// Resolve href -> [normalizedTargetStr, isDirLink, fragment].
// Returns null for schemes/netlocs we skip. Uses only string ops (no
// filesystem syscalls).
//
// isDirLink captures whether the URL ended in '/' before normalization.
// path.normalize strips trailing slashes, but the distinction matters
// for resolution: 'foo/' must resolve as a directory (try index files),
// while 'foo' falls through to fallback extensions ('foo.html') if no
// file/dir 'foo' exists.
//
// basePath is an absolute-URL prefix to strip before resolving against
// rootStr -- e.g. '/twinBASIC-docs' to handle a Jekyll --baseurl build.
// Only applied to absolute URLs; relative paths are unaffected.
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/;

function resolve(href, sourceDir, sourcePath, rootStr, basePath) {
  let pathPart, frag;
  const hashIdx = href.indexOf("#");
  if (hashIdx >= 0) {
    pathPart = href.slice(0, hashIdx);
    frag = href.slice(hashIdx + 1);
  } else {
    pathPart = href;
    frag = null;
  }
  if (!pathPart) {
    return [sourcePath, false, frag];
  }

  // Cheap scheme/netloc check. Matches Python's urlparse heuristic:
  // a colon in the first 16 chars OR a leading "//" triggers the URL
  // path; if there is a real scheme or netloc, the link is skipped.
  const colon = pathPart.indexOf(":");
  if (pathPart.startsWith("//")) return null;
  if (colon >= 0 && colon < 16 && SCHEME_RE.test(pathPart)) return null;
  let pathStr = pathPart;

  if (pathStr.indexOf("%") >= 0) {
    try { pathStr = decodeURIComponent(pathStr); } catch { /* keep raw */ }
  }

  const isDirLink = pathStr.endsWith("/") || pathStr.endsWith("/.");

  let target;
  if (pathStr.startsWith("/")) {
    const stripped = stripBasePath(pathStr, basePath);
    target = path.normalize(path.join(rootStr, stripped.replace(/^\/+/, "")));
  } else {
    target = path.normalize(path.join(sourceDir, pathStr));
  }
  return [target, isDirLink, frag];
}

function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}

// Resolve a URL path string to an on-disk file by the same rules
// GitHub Pages applies at request time.
//
// A trailing-slash URL ('foo/') must resolve as a directory: try each
// indexFile in order, with '.' meaning 'accept the directory itself'.
// Fallback extensions never apply to dir-shaped links.
//
// A non-slash URL ('foo') tries the path as a file first, then as a dir
// (same index-file logic), then falls back to fallback extensions.
function checkPath(targetStr, isDirLink, fallbackExts, indexFiles) {
  const stat = statSafe(targetStr);
  if (isDirLink) {
    if (!stat || !stat.isDirectory()) return null;
    for (const idx of indexFiles) {
      if (idx === ".") return targetStr;
      const cand = path.join(targetStr, idx);
      const s = statSafe(cand);
      if (s && s.isFile()) return cand;
    }
    return null;
  }
  if (stat && stat.isFile()) return targetStr;
  if (stat && stat.isDirectory()) {
    for (const idx of indexFiles) {
      if (idx === ".") return targetStr;
      const cand = path.join(targetStr, idx);
      const s = statSafe(cand);
      if (s && s.isFile()) return cand;
    }
    return null;
  }
  for (const ext of fallbackExts) {
    const cand = targetStr + "." + ext;
    const s = statSafe(cand);
    if (s && s.isFile()) return cand;
  }
  return null;
}

function printHelp() {
  process.stdout.write(`Usage: node check_links.mjs [options] <inputs...>
       node check_links.mjs <args1...> /sep/ <args2...> [/sep/ ...]

Offline link checker for static sites. Only offline checking is
implemented; --offline is required.

Multiple check passes can be combined in one invocation by separating
them with /sep/.  Each segment runs on its own worker thread; results
are printed in order with headers.

Options:
  --offline                  REQUIRED. Skip network checks.
  --include-fragments        Verify URL fragments against id/name attrs.
  --fallback-extensions EXTS Comma-separated extensions to try if a path
                             does not resolve as-is (e.g. 'html').
  --index-files FILES        Comma-separated index file names to try when
                             a path resolves to a directory. '.' means
                             accept the directory itself.
  --root-dir DIR             Root directory for absolute URL paths.
  --base-path PREFIX         URL-path prefix to strip from absolute URLs
                             before resolving against --root-dir
                             (e.g. '/twinBASIC-docs').
  --forbid PREFIX            Fail if any extracted link starts with this
                             URL prefix. The bare prefix and 'prefix/'
                             are exempt (intentional "go to live site"
                             links). Repeatable.
  --no-fail                  Always exit 0, even if errors are found.
                             Errors are still printed. Useful for
                             informational checks that should not block.
  --threads N                Accepted for CLI compatibility; ignored.
  -v, --verbose              Print per-stage timing breakdown.
  -h, --help                 Show this help and exit.

Inputs are files or directories; directories are searched recursively
for *.html.
`);
}

function parseArgs(argv) {
  const opts = {
    offline: false,
    includeFragments: false,
    fallbackExtensions: "",
    indexFiles: "",
    rootDir: null,
    basePath: "",
    forbid: [],
    noFail: false,
    verbose: false,
  };
  const inputs = [];
  const unknown = [];
  const need = (flag, i) => {
    if (i >= argv.length) throw new Error(`${flag} requires a value`);
    return argv[i];
  };

  let i = 0;
  while (i < argv.length) {
    const a = argv[i++];
    if (a === "--offline") opts.offline = true;
    else if (a === "--include-fragments") opts.includeFragments = true;
    else if (a === "--fallback-extensions") opts.fallbackExtensions = need(a, i++);
    else if (a === "--index-files") opts.indexFiles = need(a, i++);
    else if (a === "--root-dir") opts.rootDir = need(a, i++);
    else if (a === "--base-path") opts.basePath = need(a, i++);
    else if (a === "--forbid") opts.forbid.push(need(a, i++));
    else if (a === "--no-fail") opts.noFail = true;
    else if (a === "--threads") { need(a, i++); /* accepted, ignored */ }
    else if (a === "-v" || a === "--verbose") opts.verbose = true;
    else if (a === "-h" || a === "--help") { /* handled before dispatch */ }
    else if (a.startsWith("--")) {
      // Tolerate unknown flags passed through via check.bat's %*.
      // Consume an attached value if present.
      if (!a.includes("=") && i < argv.length && !argv[i].startsWith("-")) {
        unknown.push(a, argv[i++]);
      } else {
        unknown.push(a);
      }
    } else if (a.startsWith("-") && a.length > 1) {
      unknown.push(a);
    } else {
      inputs.push(a);
    }
  }
  return { opts, inputs, unknown };
}

function collectHtmlFiles(inputs) {
  const files = [];
  const warnings = [];
  for (const inp of inputs) {
    const s = statSafe(inp);
    if (!s) {
      warnings.push(`warning: input not found: ${inp}\n`);
      continue;
    }
    if (s.isFile()) {
      files.push(inp);
    } else if (s.isDirectory()) {
      const entries = fs.readdirSync(inp, { recursive: true, withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && e.name.endsWith(".html")) {
          files.push(path.join(e.parentPath || inp, e.name));
        }
      }
    }
  }
  return { files, warnings };
}

// Run a single check pass.  All output is collected into a buffer;
// nothing is written to stdout/stderr.  Returns { output, exitCode }.
function runCheck(argv) {
  const buf = [];
  const write = (s) => buf.push(s);

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    write(`error: ${e.message}\n`);
    return { output: buf.join(""), exitCode: 2 };
  }
  const { opts, inputs, unknown } = parsed;

  if (unknown.length) {
    write(
      `warning: ignoring unrecognised arguments: ${unknown.join(" ")}\n`
    );
  }

  if (!opts.offline) {
    write(
      "error: --offline is required. Online (network) checking is not " +
      "implemented by this tool.\n"
    );
    return { output: buf.join(""), exitCode: 2 };
  }
  if (!inputs.length) {
    write("error: at least one input file or directory is required\n");
    return { output: buf.join(""), exitCode: 2 };
  }

  // Keep --root-dir in its caller-supplied shape (no path.resolve) so
  // resolver-built target strings have the same relative-vs-absolute
  // shape as walk paths -- otherwise the idsByFile lookup below would
  // miss for absolute-URL hrefs, which produce absolute targets when
  // root-dir is absolute but relative walk-path entries when not.
  // check.bat / CI both pass the same string for --root-dir and the
  // positional input, so the two sides always agree.
  const rootStr = opts.rootDir ?? "";
  const fallbackExts = opts.fallbackExtensions.split(",").filter(Boolean);
  const indexFiles = opts.indexFiles.split(",").filter(Boolean);
  const basePath = normalizeBasePath(opts.basePath);

  const t0 = performance.now();
  const { files: htmlFiles, warnings: walkWarnings } = collectHtmlFiles(inputs);
  for (const w of walkWarnings) write(w);
  const tWalk = performance.now();

  // Per-file: extract once, then group hrefs by (source_dir, href) so we
  // resolve each unique combination exactly once. The same nav/footer
  // links repeat across hundreds of pages from the same directory. Also
  // capture the per-file id/name set if fragment checking is on, so the
  // later fragment check is a Map lookup instead of a second SAX pass.
  // idsByFile key matches the walk-path shape and (because rootStr is
  // kept relative -- see above) the resolver-built target shape too,
  // so a later `idsByFile.get(entry.resolved)` lands without
  // canonicalisation.
  const occurrences = []; // [srcPath, srcDir, href]
  const idsByFile = opts.includeFragments ? new Map() : null;
  const forbidPrefixes = opts.forbid.length ? opts.forbid : null;
  const forbiddenBySource = forbidPrefixes ? new Map() : null;
  for (const src of htmlFiles) {
    const srcDir = path.dirname(src);
    const { links, ids, forbidden } = extractLinksAndIds(
      src, opts.includeFragments, forbidPrefixes
    );
    for (const h of links) occurrences.push([src, srcDir, h]);
    if (idsByFile) idsByFile.set(src, ids);
    if (forbidden && forbidden.length) forbiddenBySource.set(src, forbidden);
  }
  const tExtract = performance.now();

  // Memoize resolution by (sourceDir, href). Nested Map<srcDir,
  // Map<href, resolved>> avoids the per-occurrence composite-key
  // string allocation that a flat Map<srcDir+sep+href, _> would cost
  // (~733k of them on this site).
  const resolutionCache = new Map();
  // Same trick on the dedup side: Map<target, Map<isDirFrag, entry>>.
  // The inner key is a short string built from (isDir + (frag || ""))
  // -- no fresh allocation per occurrence beyond what JS would have
  // done anyway.
  const uniqueByTarget = new Map();
  const uniqueEntries = []; // flat list in insertion order for later loops
  for (let oi = 0; oi < occurrences.length; oi++) {
    const occ = occurrences[oi];
    const src = occ[0], srcDir = occ[1], href = occ[2];
    let dirCache = resolutionCache.get(srcDir);
    if (!dirCache) { dirCache = new Map(); resolutionCache.set(srcDir, dirCache); }
    let r;
    if (dirCache.has(href)) {
      r = dirCache.get(href);
    } else {
      r = resolve(href, srcDir, src, rootStr, basePath);
      dirCache.set(href, r);
    }
    if (r === null) continue;
    const target = r[0], isDir = r[1], frag = r[2];
    let inner = uniqueByTarget.get(target);
    if (!inner) { inner = new Map(); uniqueByTarget.set(target, inner); }
    const innerKey = (isDir ? "1" : "0") + (frag === null ? "" : frag);
    let entry = inner.get(innerKey);
    if (!entry) {
      entry = { target, isDir, frag, resolved: undefined, sources: [] };
      inner.set(innerKey, entry);
      uniqueEntries.push(entry);
    }
    entry.sources.push(src, href);
  }
  const tResolve = performance.now();

  // De-dup (target, isDir) for filesystem checks: 'foo' and 'foo#bar'
  // share the same path lookup. The inner-Map structure already groups
  // by target, so the per-target dir-flag check is at most two stats.
  for (const inner of uniqueByTarget.values()) {
    let resolvedFile;     // undefined = not yet computed
    let resolvedDir;
    let computedFile = false, computedDir = false;
    for (const entry of inner.values()) {
      if (entry.isDir) {
        if (!computedDir) {
          resolvedDir = checkPath(entry.target, true, fallbackExts, indexFiles);
          computedDir = true;
        }
        entry.resolved = resolvedDir;
      } else {
        if (!computedFile) {
          resolvedFile = checkPath(entry.target, false, fallbackExts, indexFiles);
          computedFile = true;
        }
        entry.resolved = resolvedFile;
      }
    }
  }
  const tCheckPaths = performance.now();

  // Fragment IDs were captured during the link-extraction pass; no
  // second SAX walk needed. Just expose a Map<file, Set<id>> for the
  // checking loop, restricted to actual fragment targets so the verbose
  // breakdown still reports a useful count.
  const fragmentCache = new Map();
  let filesForFragments = [];
  if (opts.includeFragments) {
    const setFor = new Set();
    for (const entry of uniqueEntries) {
      if (entry.frag && entry.resolved) setFor.add(entry.resolved);
    }
    filesForFragments = [...setFor].sort();
    for (const f of filesForFragments) {
      // A resolved target may be a file we never scanned (e.g. directly
      // referenced asset that isn't *.html), in which case it has no
      // captured id set; treat as empty so the fragment check fails.
      fragmentCache.set(f, idsByFile.get(f) || new Set());
    }
  }
  const tFragments = performance.now();

  const broken = []; // (src, href, reason) triples flattened
  let brokenUniqueCount = 0;
  for (const entry of uniqueEntries) {
    if (entry.resolved === null) {
      brokenUniqueCount++;
      const srcs = entry.sources;
      for (let i = 0; i < srcs.length; i += 2) {
        broken.push(srcs[i], srcs[i + 1], "target not found");
      }
      continue;
    }
    if (entry.frag && opts.includeFragments) {
      const ids = fragmentCache.get(entry.resolved);
      if (!ids || !ids.has(entry.frag)) {
        brokenUniqueCount++;
        const reason = `fragment #${entry.frag} not found`;
        const srcs = entry.sources;
        for (let i = 0; i < srcs.length; i += 2) {
          broken.push(srcs[i], srcs[i + 1], reason);
        }
      }
    }
  }
  const tDone = performance.now();

  // Merge broken + forbidden into a single per-source report so a file
  // with both kinds of issue appears in one block, with the BROKEN /
  // FORBIDDEN labels distinguishing them. Labels are padded to the
  // wider of the two so href columns line up.
  if (broken.length || (forbiddenBySource && forbiddenBySource.size)) {
    const bySource = new Map();
    for (let i = 0; i < broken.length; i += 3) {
      const src = broken[i], href = broken[i + 1], reason = broken[i + 2];
      let set = bySource.get(src);
      if (!set) { set = new Set(); bySource.set(src, set); }
      set.add("E\0" + href + "\0" + reason);
    }
    if (forbiddenBySource) {
      for (const [src, fhits] of forbiddenBySource) {
        let set = bySource.get(src);
        if (!set) { set = new Set(); bySource.set(src, set); }
        for (const fh of fhits) {
          set.add(`F\0${fh.url}\0forbidden prefix '${fh.prefix}'`);
        }
      }
    }
    const sortedSources = [...bySource.keys()].sort();
    const lines = [];
    for (const src of sortedSources) {
      lines.push("");
      lines.push(`${src}:`);
      const items = [...bySource.get(src)].sort();
      for (const item of items) {
        const j1 = item.indexOf("\0");
        const j2 = item.indexOf("\0", j1 + 1);
        const kind = item.slice(0, j1);
        const href = item.slice(j1 + 1, j2);
        const reason = item.slice(j2 + 1);
        const label = kind === "F" ? "FORBIDDEN" : "BROKEN   ";
        lines.push(`  ${label}  ${href} -- ${reason}`);
      }
    }
    lines.push("");
    write(lines.join("\n") + "\n");
  }

  let forbiddenCount = 0;
  if (forbiddenBySource) {
    for (const fhits of forbiddenBySource.values()) forbiddenCount += fhits.length;
  }
  const total = occurrences.length;
  const unique = uniqueEntries.length;
  const errorsUnique = brokenUniqueCount;
  const okUnique = unique - errorsUnique;
  const elapsed = (tDone - t0) / 1000;
  const forbidNote = forbidPrefixes ? `, ${forbiddenCount} forbidden` : "";
  write(
    `Checked ${total} occurrences (${unique} unique) in ${elapsed.toFixed(3)}s ` +
    `-- ${okUnique} OK, ${errorsUnique} broken${forbidNote}\n`
  );

  if (opts.verbose) {
    const fmt = (a, b) => `${((b - a) / 1000).toFixed(3)}s`;
    write("\n");
    write(`  Files scanned:        ${htmlFiles.length}\n`);
    write(`  Fragment targets:     ${filesForFragments.length}\n`);
    write(`  Walk:        ${fmt(t0, tWalk)}\n`);
    write(`  Extract:     ${fmt(tWalk, tExtract)}\n`);
    write(`  Resolve:     ${fmt(tExtract, tResolve)}\n`);
    write(`  Check paths: ${fmt(tResolve, tCheckPaths)}\n`);
    write(`  Fragments:   ${fmt(tCheckPaths, tFragments)}\n`);
    write(`  Report:      ${fmt(tFragments, tDone)}\n`);
  }

  let exitCode = (broken.length || forbiddenCount) ? 1 : 0;
  if (opts.noFail) exitCode = 0;
  return { output: buf.join(""), exitCode };
}

// ── Module entry ────────────────────────────────────────────────

if (!isMainThread) {
  const result = runCheck(workerData.argv);
  parentPort.postMessage(result);
} else {
  const rawArgv = process.argv.slice(2);

  if (rawArgv.includes("-h") || rawArgv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  // Split on /sep/ into separate command lines.
  const commands = [];
  let current = [];
  for (const arg of rawArgv) {
    if (arg === "/sep/") {
      commands.push(current);
      current = [];
    } else {
      current.push(arg);
    }
  }
  commands.push(current);
  const segments = commands.filter(c => c.length > 0);

  if (segments.length === 0) {
    printHelp();
    process.exit(2);
  }

  if (segments.length === 1) {
    // Single command -- run inline, no worker overhead.
    const { output, exitCode } = runCheck(segments[0]);
    process.stdout.write(output);
    process.exit(exitCode);
  }

  // Multiple commands -- dispatch to worker threads.
  const t0 = performance.now();
  const n = segments.length;
  process.stdout.write(`Running ${n} checks in parallel...\n`);

  const promises = segments.map((cmd) =>
    new Promise((resolve, reject) => {
      const w = new Worker(new URL(import.meta.url), {
        workerData: { argv: cmd },
      });
      let result;
      w.on("message", (msg) => { result = msg; });
      w.on("error", reject);
      w.on("exit", () => {
        if (result) resolve(result);
        else reject(new Error("worker exited without posting a result"));
      });
    })
  );

  const settled = await Promise.allSettled(promises);
  const elapsed = ((performance.now() - t0) / 1000).toFixed(3);

  const HEADER_WIDTH = 78;
  let exitCode = 0;
  for (let i = 0; i < settled.length; i++) {
    const tag = `[${i + 1}/${n}]`;
    const prefix = `== ${tag} `;
    const header = prefix + "=".repeat(Math.max(3, HEADER_WIDTH - prefix.length));
    const cmdLine = segments[i].join(" ");

    process.stdout.write(`\n${header}\n${cmdLine}\n\n`);

    if (settled[i].status === "fulfilled") {
      const r = settled[i].value;
      process.stdout.write(r.output);
      if (r.exitCode !== 0 && exitCode === 0) exitCode = r.exitCode;
    } else {
      process.stdout.write(`INTERNAL ERROR: ${settled[i].reason}\n`);
      if (exitCode === 0) exitCode = 1;
    }
  }

  const summaryPrefix = `== ${n} checks completed in ${elapsed}s `;
  const summary = summaryPrefix + "=".repeat(Math.max(3, HEADER_WIDTH - summaryPrefix.length));
  process.stdout.write(`\n${summary}\n`);

  process.exit(exitCode);
}
