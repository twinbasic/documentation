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
//
// Integrity checks (--check-html, --check-a11y, --check-ids,
// --check-sitemap, --check-search):
//   These share the existing htmlparser2 SAX parse pass -- no
//   second file read.  Exit code 2 signals integrity-only failures
//   so CI can distinguish "broken link" from "malformed HTML".

import * as fs from "node:fs";
import * as os from "node:os";
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

// HTML5 void elements -- no closing tag, never pushed onto tag stack.
const HTML5_VOID_ELEMENTS = new Set([
  "area","base","br","col","embed","hr","img","input",
  "link","meta","param","source","track","wbr",
]);

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

// Derive the canonical URL path for an HTML file given its path
// relative to the site root (forward slashes). Strips the .html
// extension for parity with pages that have explicit permalinks.
//   "index.html"                     -> "/"
//   "tB/Core/Const.html"             -> "/tB/Core/Const"
//   "tB/Packages/VB/CheckBox/index.html" -> "/tB/Packages/VB/CheckBox/"
function deriveUrlPath(relPath) {
  const fwd = relPath.replace(/\\/g, "/");
  if (fwd === "index.html") return "/";
  if (fwd.endsWith("/index.html")) return "/" + fwd.slice(0, -"index.html".length);
  if (fwd.endsWith(".html")) return "/" + fwd.slice(0, -".html".length);
  return "/" + fwd;
}

// Strip a trailing .html so sitemap/search URLs from pages without
// explicit permalink (which keep the .html extension) compare equal
// to deriveUrlPath output. Idempotent on already-clean paths.
function stripHtmlSuffix(p) {
  return p.endsWith(".html") ? p.slice(0, -".html".length) : p;
}

// URL-decode (sitemap entries percent-encode spaces and Unicode;
// deriveUrlPath produces literal characters from the filename).
function decodePath(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

// Cross-file check: every .html file (except hardcoded exclusions and
// redirect stubs) should appear in sitemap.xml.
// Returns an array of issue strings, or null if sitemap.xml is absent.
function checkSitemapContents(rootStr, htmlFiles, redirectStubSet, basePath) {
  const sitemapPath = path.join(rootStr, "sitemap.xml");
  let xml;
  try { xml = fs.readFileSync(sitemapPath, "utf8"); } catch { return null; }

  // Extract <loc> paths, stripping the scheme+host prefix, any
  // --base-path prefix (e.g. '/twinBASIC-docs' from a GitHub Pages
  // subpath deploy), and trailing .html (Jekyll/tbdocs use .html for
  // pages without an explicit permalink; pages with permalinks omit it).
  const sitemapPaths = new Set();
  let siteRoot = null;
  for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const url = m[1].trim();
    if (!siteRoot) {
      const m2 = url.match(/^(https?:\/\/[^/]+)/);
      if (m2) siteRoot = m2[1];
    }
    const p = siteRoot ? url.slice(siteRoot.length) : url;
    sitemapPaths.add(stripHtmlSuffix(decodePath(stripBasePath(p || "/", basePath))));
  }

  // Hardcoded exclusions for first cut (no frontmatter access here).
  const EXCLUDE = new Set(["book.html", "404.html"]);
  const rootAbs = path.resolve(rootStr);
  const issues = [];

  for (const file of htmlFiles) {
    if (EXCLUDE.has(path.basename(file))) continue;
    if (redirectStubSet && redirectStubSet.has(path.resolve(file))) continue;
    const rel = path.relative(rootAbs, path.resolve(file)).replace(/\\/g, "/");
    const urlPath = deriveUrlPath(rel);
    if (!sitemapPaths.has(urlPath)) {
      issues.push(`${rel}: sitemap-missing: ${urlPath}`);
    }
  }
  return issues;
}

// Cross-file check: every .html file (except exclusions and redirect
// stubs) should have at least one entry in search-data.json whose
// url matches the page's canonical path (ignoring fragment).
// Returns an array of issue strings, or null if search-data.json is absent.
function checkSearchContents(rootStr, htmlFiles, redirectStubSet, basePath) {
  const searchPath = path.join(rootStr, "assets", "js", "search-data.json");
  let searchData;
  try { searchData = JSON.parse(fs.readFileSync(searchPath, "utf8")); } catch { return null; }

  // Build set of page-level URLs (strip fragment part, --base-path
  // prefix, and .html suffix; some pages without explicit permalink
  // keep .html; URLs are percent-encoded for spaces / Unicode).
  const searchPageUrls = new Set(
    Object.values(searchData).map(e => stripHtmlSuffix(decodePath(stripBasePath((e.url ?? "").split("#")[0], basePath))))
  );

  const EXCLUDE = new Set(["book.html", "404.html"]);
  const rootAbs = path.resolve(rootStr);
  const issues = [];

  for (const file of htmlFiles) {
    if (EXCLUDE.has(path.basename(file))) continue;
    if (redirectStubSet && redirectStubSet.has(path.resolve(file))) continue;
    const rel = path.relative(rootAbs, path.resolve(file)).replace(/\\/g, "/");
    const urlPath = deriveUrlPath(rel);
    if (!searchPageUrls.has(urlPath)) {
      issues.push(`${rel}: search-missing: ${urlPath}`);
    }
  }
  return issues;
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
//
// checkOpts: optional integrity-check flags object. When present, the
// SAX parse also collects:
//   checkHtml   -- unclosed / mismatched tags (htmlErrors)
//   checkA11y   -- img missing alt, empty anchors, empty href (a11yErrors)
//   checkIds    -- duplicate id attributes on the same page (dupIds)
//   captureRedirectStub -- detect <meta http-equiv="refresh"> (isRedirectStub)
function extractLinksAndIds(htmlPath, captureIds, forbidPrefixes, checkOpts) {
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

  // Integrity state -- only allocated when requested.
  const doHtml  = checkOpts?.checkHtml  ?? false;
  const doA11y  = checkOpts?.checkA11y  ?? false;
  const doIds   = checkOpts?.checkIds   ?? false;
  const doStub  = checkOpts?.captureRedirectStub ?? false;

  const tagStack   = doHtml ? [] : null;
  const htmlErrors = doHtml ? [] : null;
  const a11yErrors = doA11y ? [] : null;
  const idMap      = doIds  ? new Map() : null;

  // a11y anchor-tracking state.
  let inAnchor        = false;
  let anchorHasText   = false;
  let anchorHasChild  = false;  // any element child (img, svg, span, ...)
  let isRedirectStub  = false;

  const handlers = {
    onopentag(name, attribs) {
      // ── existing: capture ids ──────────────────────────────────
      if (captureIds) {
        const id = attribs.id;
        if (id) ids.add(id);
        if (name === "a") {
          const nm = attribs.name;
          if (nm) ids.add(nm);
        }
      }
      // ── existing: extract links ────────────────────────────────
      const attrs = LINK_ATTR_TABLE.get(name);
      if (attrs) {
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
      }

      // ── check-html: push non-void elements onto tag stack ──────
      if (tagStack !== null && !HTML5_VOID_ELEMENTS.has(name)) {
        tagStack.push(name);
      }

      // ── check-ids: count id attributes ────────────────────────
      if (idMap && attribs.id) {
        idMap.set(attribs.id, (idMap.get(attribs.id) ?? 0) + 1);
      }

      // ── check-a11y ─────────────────────────────────────────────
      if (doA11y) {
        // img without alt attribute (alt="" is valid for decorative images)
        if (name === "img" && !("alt" in attribs)) {
          a11yErrors.push({ type: "img-missing-alt", src: attribs.src ?? "" });
        }
        // empty href
        if (attribs.href === "") {
          a11yErrors.push({ type: "empty-href", tag: name });
        }
        // track anchor content for empty-anchor check
        if (name === "a") {
          inAnchor      = true;
          anchorHasText  = false;
          anchorHasChild = false;
        } else if (inAnchor) {
          anchorHasChild = true;  // any child element -- link carries content
        }
      }

      // ── redirect stub detection ────────────────────────────────
      if (doStub && name === "meta" &&
          (attribs["http-equiv"] ?? "").toLowerCase() === "refresh") {
        isRedirectStub = true;
      }
    },
  };

  if (doA11y) {
    handlers.ontext = function(text) {
      if (inAnchor && text.trim()) anchorHasText = true;
    };
  }

  if (doHtml || doA11y) {
    handlers.onclosetag = function(name) {
      // check-html: verify tag-stack balance
      if (tagStack !== null && !HTML5_VOID_ELEMENTS.has(name)) {
        const top = tagStack[tagStack.length - 1];
        if (top === name) {
          tagStack.pop();
        } else {
          // Mismatch: try lenient recovery by scanning back in the stack.
          const idx = tagStack.lastIndexOf(name);
          if (idx >= 0) {
            while (tagStack.length > idx + 1) {
              htmlErrors.push({ type: "mismatched-tag", tag: tagStack.pop() });
            }
            tagStack.pop();
          } else {
            htmlErrors.push({ type: "unexpected-close", tag: name });
          }
        }
      }
      // check-a11y: end-of-anchor check
      if (doA11y && name === "a" && inAnchor) {
        if (!anchorHasText && !anchorHasChild) {
          a11yErrors.push({ type: "empty-anchor" });
        }
        inAnchor = false;
      }
    };
  }

  if (doHtml) {
    handlers.onend = function() {
      // Flag any tags still open at end-of-document.
      for (let i = tagStack.length - 1; i >= 0; i--) {
        htmlErrors.push({ type: "unclosed-tag", tag: tagStack[i] });
      }
    };
  }

  const parser = new Parser(handlers);
  parser.write(fs.readFileSync(htmlPath, "utf8"));
  parser.end();

  // Collect duplicate IDs.
  const dupIds = idMap ? [] : null;
  if (idMap) {
    for (const [id, count] of idMap) {
      if (count > 1) dupIds.push({ id, count });
    }
  }

  return { links, ids, forbidden, htmlErrors, a11yErrors, dupIds, isRedirectStub };
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

// True when basePath is set and pathStr is a root-absolute URL that
// is NOT within the basePath. On a real subpath deploy such a URL
// would resolve outside the deployment and 404, even though it may
// still find a file on disk under --root-dir. The resolver flags
// these so they're reported as broken rather than silently resolving.
function isOutsideBasePath(pathStr, basePath) {
  if (!basePath) return false;
  if (!pathStr.startsWith("/")) return false;
  if (pathStr === basePath) return false;
  if (pathStr.startsWith(basePath + "/")) return false;
  return true;
}

// Sentinel target for off-base-path URLs. Angle brackets keep it
// from colliding with any real on-disk path on Windows or POSIX.
const OUTSIDE_BASEPATH_MARKER = "<<<outside-base-path>>>";

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
    if (isOutsideBasePath(pathStr, basePath)) {
      // Browser-semantics check: would 404 on a subpath deploy. Return
      // a sentinel target so the existing "broken" pipeline picks it
      // up; the reporter detects the marker to emit a clearer reason.
      target = OUTSIDE_BASEPATH_MARKER + pathStr;
    } else {
      const stripped = stripBasePath(pathStr, basePath);
      target = path.normalize(path.join(rootStr, stripped.replace(/^\/+/, "")));
    }
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

Integrity checks (share the existing htmlparser2 SAX parse pass):
  --check-html               HTML well-formedness: unclosed tags,
                             mismatched closes.
  --check-a11y               Accessibility basics: <img> missing alt,
                             empty <a> tags, empty href attributes.
  --check-ids                Duplicate id="..." attributes on the same
                             page.
  --check-sitemap            Every .html file in the input is in
                             sitemap.xml (or is a known exclusion).
                             Reads <root-dir>/sitemap.xml; skipped
                             silently if the file is absent.
  --check-search             Every .html file in the input has at least
                             one entry in assets/js/search-data.json.
                             Reads from <root-dir>; skipped silently if
                             the file is absent.

Exit codes:
  0  All checks passed.
  1  Link / forbidden-prefix check failed.
  2  Integrity check failed (no link failures).
  3  Both link and integrity checks failed.

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
    checkHtml: false,
    checkA11y: false,
    checkIds: false,
    checkSitemap: false,
    checkSearch: false,
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
    else if (a === "--check-html") opts.checkHtml = true;
    else if (a === "--check-a11y") opts.checkA11y = true;
    else if (a === "--check-ids") opts.checkIds = true;
    else if (a === "--check-sitemap") opts.checkSitemap = true;
    else if (a === "--check-search") opts.checkSearch = true;
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

  // Build checkOpts only when at least one integrity flag is on, to
  // avoid adding handlers to the parser on runs that don't need them.
  const needIntegrity = opts.checkHtml || opts.checkA11y || opts.checkIds;
  const needRedirectStub = opts.checkSitemap || opts.checkSearch;
  const checkOpts = (needIntegrity || needRedirectStub) ? {
    checkHtml: opts.checkHtml,
    checkA11y: opts.checkA11y,
    checkIds:  opts.checkIds,
    captureRedirectStub: needRedirectStub,
  } : null;

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

  // Per-file integrity results (populated when checkOpts is set).
  const integrityByFile = needIntegrity ? new Map() : null;
  const redirectStubSet = needRedirectStub ? new Set() : null;

  for (const src of htmlFiles) {
    const srcDir = path.dirname(src);
    const { links, ids, forbidden, htmlErrors, a11yErrors, dupIds, isRedirectStub } =
      extractLinksAndIds(src, opts.includeFragments, forbidPrefixes, checkOpts);
    for (const h of links) occurrences.push([src, srcDir, h]);
    if (idsByFile) idsByFile.set(src, ids);
    if (forbidden && forbidden.length) forbiddenBySource.set(src, forbidden);
    if (integrityByFile && (htmlErrors?.length || a11yErrors?.length || dupIds?.length)) {
      integrityByFile.set(src, { htmlErrors, a11yErrors, dupIds });
    }
    if (redirectStubSet && isRedirectStub) {
      redirectStubSet.add(path.resolve(src));
    }
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
      const reason = entry.target.startsWith(OUTSIDE_BASEPATH_MARKER)
        ? `outside --base-path '${basePath}' (would 404 on subpath deploy)`
        : "target not found";
      for (let i = 0; i < srcs.length; i += 2) {
        broken.push(srcs[i], srcs[i + 1], reason);
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

  // ── Integrity check reporting ──────────────────────────────────────

  let integrityIssueCount = 0;

  // Per-file html / a11y / ids findings.
  if (integrityByFile && integrityByFile.size > 0) {
    const lines = [];
    const sortedFiles = [...integrityByFile.keys()].sort();
    for (const src of sortedFiles) {
      const { htmlErrors, a11yErrors, dupIds } = integrityByFile.get(src);
      if (htmlErrors) {
        for (const e of htmlErrors) {
          lines.push(`${src}: html-${e.type}: <${e.tag}>`);
          integrityIssueCount++;
        }
      }
      if (a11yErrors) {
        for (const e of a11yErrors) {
          if (e.type === "img-missing-alt") {
            lines.push(`${src}: a11y-img-missing-alt: src=${e.src}`);
          } else if (e.type === "empty-anchor") {
            lines.push(`${src}: a11y-empty-anchor`);
          } else if (e.type === "empty-href") {
            lines.push(`${src}: a11y-empty-href: <${e.tag}>`);
          }
          integrityIssueCount++;
        }
      }
      if (dupIds) {
        for (const e of dupIds) {
          lines.push(`${src}: duplicate-id: '${e.id}' appears ${e.count} times`);
          integrityIssueCount++;
        }
      }
    }
    if (lines.length) {
      write("\n" + lines.join("\n") + "\n");
    }
  }

  // Cross-file sitemap check.
  if (opts.checkSitemap) {
    const issues = checkSitemapContents(rootStr, htmlFiles, redirectStubSet, basePath);
    if (issues === null) {
      write("warning: --check-sitemap: sitemap.xml not found in root-dir, skipping\n");
    } else if (issues.length) {
      write("\n" + issues.join("\n") + "\n");
      integrityIssueCount += issues.length;
    }
  }

  // Cross-file search-index check.
  if (opts.checkSearch) {
    const issues = checkSearchContents(rootStr, htmlFiles, redirectStubSet, basePath);
    if (issues === null) {
      write("warning: --check-search: search-data.json not found in root-dir, skipping\n");
    } else if (issues.length) {
      write("\n" + issues.join("\n") + "\n");
      integrityIssueCount += issues.length;
    }
  }

  // Summary line when any integrity flags were requested.
  if (needIntegrity || opts.checkSitemap || opts.checkSearch) {
    write(`Integrity: ${integrityIssueCount} issue(s)\n`);
  }

  // Exit codes: 1 = link failures, 2 = integrity failures, 3 = both.
  const linksFailed = broken.length > 0 || forbiddenCount > 0;
  const integrityFailed = integrityIssueCount > 0;
  let exitCode = (linksFailed ? 1 : 0) | (integrityFailed ? 2 : 0);
  if (opts.noFail) exitCode = 0;
  return { output: buf.join(""), exitCode };
}

// ── Self-test ──────────────────────────────────────────────────
// Regression guards.  Runs once per process; takes <10 ms.
//
//   1. checkSitemapContents / checkSearchContents must strip
//      --base-path from extracted URLs before comparing against
//      file-derived paths.
//   2. The resolver must flag root-absolute URLs that escape
//      --base-path as broken (browser-semantics check).  A link
//      missing the baseurl prefix may still find a file on disk
//      under --root-dir, but it would 404 on a real subpath deploy.

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-links-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "Foo.html"), "<html><body>t</body></html>");

    fs.writeFileSync(path.join(tmp, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `<url>\n<loc>https://example.com/base/Foo</loc>\n</url>\n` +
      `</urlset>\n`);

    const assetsDir = path.join(tmp, "assets", "js");
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "search-data.json"),
      JSON.stringify({ "0": { url: "/base/Foo", title: "Foo", content: "" } }));

    const files = [path.join(tmp, "Foo.html")];
    const bp = "/base";

    // Guard 1: sitemap / search check base-path stripping.
    const sm = checkSitemapContents(tmp, files, null, bp);
    if (!sm || sm.length)
      throw new Error("checkSitemapContents with --base-path: " + JSON.stringify(sm));

    const se = checkSearchContents(tmp, files, null, bp);
    if (!se || se.length)
      throw new Error("checkSearchContents with --base-path: " + JSON.stringify(se));

    // Guard 2: resolver flags off-base-path root-absolute URLs.
    // /base/Foo (inside)  -> resolves to <tmp>/Foo (exists)
    // /Foo (outside)      -> sentinel target that won't exist on disk
    const inside = resolve("/base/Foo", tmp, path.join(tmp, "Foo.html"), tmp, bp);
    if (!inside || inside[0].startsWith(OUTSIDE_BASEPATH_MARKER))
      throw new Error("resolve('/base/Foo') should resolve inside base-path: " + JSON.stringify(inside));

    const outside = resolve("/Foo", tmp, path.join(tmp, "Foo.html"), tmp, bp);
    if (!outside || !outside[0].startsWith(OUTSIDE_BASEPATH_MARKER))
      throw new Error("resolve('/Foo') with base-path should be flagged outside: " + JSON.stringify(outside));

    // With no base-path, every root-absolute URL is in-bounds.
    const noBp = resolve("/Foo", tmp, path.join(tmp, "Foo.html"), tmp, "");
    if (!noBp || noBp[0].startsWith(OUTSIDE_BASEPATH_MARKER))
      throw new Error("resolve('/Foo') without --base-path must not be flagged: " + JSON.stringify(noBp));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
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

  selfTest();

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
