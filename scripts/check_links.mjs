// Offline link checker for static sites.
//
// The routine check runs *inside the build* -- `tbdocs --check`, which
// build.bat passes via --check-audit-index -- over the HTML the workers
// already hold, rather than writing ~270 MB out and reading it back.
// This script is the same check as a standalone tool, for a tree the
// build did not produce: a release zip, a bisect, someone else's
// artifact. Both CI workflows still run it, though not directly: they
// invoke check_links_diff.mjs, which spawns this script as its `script`
// side, and only against the fixtures.
//
// The two front ends share builder/link-check.mjs, and
// scripts/check_links_diff.mjs is the gate that says they agree --
// run it whenever either side changes. See builder/PLAN-checks.md.
//
// Typical invocation (single pass):
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
// On this site (~793k link occurrences, ~10.7k unique targets across
// 1159 HTML files / 115 MB) each pass runs in ~2.6 s on the dev box,
// of which ~80 % is the SAX parse. It dedupes (target, frag) up front
// so each unique filesystem and fragment check fires exactly once
// regardless of how many pages link to the same target.
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
// --check-sitemap, --check-search, --check-remote-assets):
//   These share the existing htmlparser2 SAX parse pass -- no
//   second file read.  Exit codes are a bitwise pair so CI can tell
//   the two apart: 0 clean, 1 link failures, 2 integrity failures,
//   3 both.  --no-fail forces 0.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, workerData, Worker } from "node:worker_threads";

// The pure core -- extraction, resolution, the cross-file checks and
// the reporters -- lives in builder/. This script is one front end over
// it; the build's --check pass is the other. See builder/link-check.mjs
// for why the dependency runs this way round.
import {
  extractFromHtml, resolveOccurrences, FsOracle,
  IndexOracle, buildTreeIndex,
  checkSitemap, checkSearch, checkCanonical,
  formatLinkReport, formatIntegrityReport,
  normalizeBasePath, resolve, OUTSIDE_BASEPATH_MARKER,
} from "../builder/link-check.mjs";

// Tree-relative POSIX path. The core's cross-file checks work in this
// coordinate space, and so does the structured-findings view (see
// runCheck's `structured` option): the human-readable report keeps
// printing whatever shape the caller passed in, but findings need a
// stable space so the same tree checked with a relative --root-dir, an
// absolute one, or from inside the build compares equal.
function relToRoot(rootStr, p) {
  const rootAbs = path.resolve(rootStr || ".");
  return path.relative(rootAbs, path.resolve(p)).replace(/\\/g, "/");
}

// Walk paths -> tree-relative POSIX paths, redirect stubs dropped.
function relFilesFor(rootStr, htmlFiles, redirectStubSet) {
  const rootAbs = path.resolve(rootStr);
  const out = [];
  for (const file of htmlFiles) {
    if (redirectStubSet && redirectStubSet.has(path.resolve(file))) continue;
    out.push(path.relative(rootAbs, path.resolve(file)).replace(/\\/g, "/"));
  }
  return out;
}

// Cross-file check: every .html file (except hardcoded exclusions and
// redirect stubs) should appear in sitemap.xml.
// Returns an array of issue strings, or null if sitemap.xml is absent.
//
// One thing this side cannot do, and the fused side can: a page carrying
// `sitemap: false` or `search_exclude: true` is absent from the generated
// file on purpose, and nothing in the built HTML says so. The build knows
// because it still has the frontmatter and passes the generators' own
// opt-out sets to the checker; a tree this build did not produce is just a
// directory of HTML, so a deliberate omission and a bug look identical
// here. Both checks are opt-in flags for that reason.
function checkSitemapContents(rootStr, htmlFiles, redirectStubSet, basePath) {
  let xml;
  try { xml = fs.readFileSync(path.join(rootStr, "sitemap.xml"), "utf8"); } catch { return null; }
  return checkSitemap(xml, relFilesFor(rootStr, htmlFiles, redirectStubSet), basePath);
}

// Cross-file check: every .html file (except exclusions and redirect
// stubs) should have at least one entry in search-data.json whose
// url matches the page's canonical path (ignoring fragment).
// Returns an array of issue strings, or null if search-data.json is absent.
function checkSearchContents(rootStr, htmlFiles, redirectStubSet, basePath) {
  let searchData;
  try {
    searchData = JSON.parse(
      fs.readFileSync(path.join(rootStr, "assets", "js", "search-data.json"), "utf8"));
  } catch { return null; }
  return checkSearch(searchData, relFilesFor(rootStr, htmlFiles, redirectStubSet), basePath);
}

// Thin wrapper over the core's SAX pass: read the file, hand over the
// string. Everything this used to do lives in builder/link-check.mjs so
// the build can call it on HTML it already has in memory.
function extractLinksAndIds(htmlPath, captureIds, forbidPrefixes, checkOpts) {
  return extractFromHtml(fs.readFileSync(htmlPath, "utf8"), captureIds, forbidPrefixes, checkOpts);
}

// Cross-file check: every page's <link rel="canonical" href="..."> must
// match the page's own deployment URL. Returns an array of issue
// strings, or null if no pages had a canonical href (the input set was
// empty / canonical-less).
function checkCanonicalContents(rootStr, canonicalByFile, redirectStubSet, basePath) {
  if (canonicalByFile.size === 0) return null;
  const rootAbs = path.resolve(rootStr);
  const byRel = new Map();
  for (const [file, canonical] of canonicalByFile) {
    if (redirectStubSet && redirectStubSet.has(path.resolve(file))) continue;
    byRel.set(path.relative(rootAbs, path.resolve(file)).replace(/\\/g, "/"), canonical);
  }
  return checkCanonical(byRel, basePath);
}

function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
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
  --oracle fs|index          How to answer "does this path exist".
                             'index' walks --root-dir once and answers
                             from a Set; 'fs' stats the disk. The
                             default is 'index' on Windows and 'fs'
                             elsewhere, because 'fs' inherits NTFS's
                             case-insensitivity: a link to
                             'tb/gloss.html' stats true against the file
                             tB/Gloss.html and then 404s on GitHub
                             Pages. 'index' compares strings and is
                             case-sensitive on every platform. See
                             builder/link-check.mjs.
  --threads N                Accepted for CLI compatibility; ignored.
  -v, --verbose              Print per-stage timing breakdown.
  -h, --help                 Show this help and exit.

Integrity checks (share the existing htmlparser2 SAX parse pass):
  --check-html               HTML well-formedness: elements the parser
                             had to close for the document, either
                             because nothing closed them (unclosed-tag)
                             or because something else closed around
                             them first (closed-early -- usually invalid
                             nesting, e.g. a <div> inside a <p>). Void
                             elements and the contents of <svg>/<math>
                             are exempt. A stray close tag for an
                             element that was never opened is not
                             reported; htmlparser2 discards those before
                             the check can see them.
  --check-a11y               Accessibility basics: <img> missing alt,
                             empty <a> tags, empty href attributes.
  --check-ids                Duplicate id="..." attributes on the same
                             page.
  --check-remote-assets      <img src> pointing off-box (http://,
                             https:// or protocol-relative //host).
                             Remote images cost a network round trip
                             per page view, break the offline mirror,
                             and hard-fail the PDF book -- the forked
                             paged.js dropped async image loading, so
                             an image still in flight when it runs
                             throws instead of degrading. Vendor the
                             file under the section's Images/ folder.
  --check-sitemap            Every .html file in the input is in
                             sitemap.xml (or is a known exclusion).
                             Reads <root-dir>/sitemap.xml; skipped
                             silently if the file is absent.
  --check-search             Every .html file in the input has at least
                             one entry in assets/js/search-data.json.
                             Reads from <root-dir>; skipped silently if
                             the file is absent.
  --check-canonical          Every page's <link rel="canonical" href>
                             URL path matches the page's own deployment
                             URL. Catches canonical URLs that include
                             --base-path / the wrong baseurl.

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
    checkRemoteAssets: false,
    checkSitemap: false,
    checkSearch: false,
    checkCanonical: false,
    // GitHub Pages serves from a case-sensitive filesystem; NTFS is
    // not. FsOracle asks the platform, so on Windows a wrong-case link
    // passes here and 404s in production -- and because
    // check_links_diff.mjs calls this script "the oracle of record",
    // the harness would report the side that is RIGHT as the one with
    // the extra finding. IndexOracle compares strings, so it behaves
    // the same everywhere. --oracle fs stays available for the case
    // where the question really is "what does this machine's
    // filesystem say".
    oracle: process.platform === "win32" ? "index" : "fs",
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
    else if (a === "--check-remote-assets") opts.checkRemoteAssets = true;
    else if (a === "--check-sitemap") opts.checkSitemap = true;
    else if (a === "--check-search") opts.checkSearch = true;
    else if (a === "--check-canonical") opts.checkCanonical = true;
    else if (a === "--oracle") opts.oracle = need(a, i++);
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

// Every file under rootStr, as paths relative to it. Only used to build
// an IndexOracle under --oracle index: this is the development aid that
// says whether the Set-backed oracle answers the same questions the
// filesystem does. The build's own --check pass builds the identical
// structure from its output records instead of walking anything.
function collectAllRelFiles(rootStr) {
  const rels = [];
  let entries;
  try {
    entries = fs.readdirSync(rootStr, { recursive: true, withFileTypes: true });
  } catch { return rels; }
  const rootAbs = path.resolve(rootStr);
  for (const e of entries) {
    if (!e.isFile()) continue;
    const abs = path.join(e.parentPath || rootStr, e.name);
    rels.push(path.relative(rootAbs, path.resolve(abs)));
  }
  return rels;
}

// Run a single check pass.  All output is collected into a buffer;
// nothing is written to stdout/stderr.  Returns { output, exitCode }.
//
// With `structured: true` the result additionally carries a `findings`
// object -- the same conclusions the report prints, as sorted arrays of
// tree-relative strings, for machine comparison. It is what
// scripts/check_links_diff.mjs diffs. Building it costs a few ms and is
// skipped entirely when not requested, so the CLI path is unchanged.
export function runCheck(argv, { structured = false } = {}) {
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
  const needIntegrity = opts.checkHtml || opts.checkA11y || opts.checkIds || opts.checkRemoteAssets;
  const needRedirectStub = opts.checkSitemap || opts.checkSearch || opts.checkCanonical;
  const checkOpts = (needIntegrity || needRedirectStub || opts.checkCanonical) ? {
    checkHtml: opts.checkHtml,
    checkA11y: opts.checkA11y,
    checkIds:  opts.checkIds,
    checkRemoteAssets: opts.checkRemoteAssets,
    checkCanonical: opts.checkCanonical,
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
  const occurrences = []; // flat [srcPath, srcDir, href, ...] triples
  const idsByFile = opts.includeFragments ? new Map() : null;
  const forbidPrefixes = opts.forbid.length ? opts.forbid : null;
  const forbiddenBySource = forbidPrefixes ? new Map() : null;

  // Per-file integrity results (populated when checkOpts is set).
  const integrityByFile = needIntegrity ? new Map() : null;
  const redirectStubSet = needRedirectStub ? new Set() : null;
  const canonicalByFile = opts.checkCanonical ? new Map() : null;

  for (const src of htmlFiles) {
    const srcDir = path.dirname(src);
    const { links, ids, forbidden, htmlErrors, a11yErrors, dupIds, remoteAssets, isRedirectStub, canonicalHref } =
      extractLinksAndIds(src, opts.includeFragments, forbidPrefixes, checkOpts);
    for (const h of links) occurrences.push(src, srcDir, h);
    if (idsByFile) idsByFile.set(src, ids);
    if (forbidden && forbidden.length) forbiddenBySource.set(src, forbidden);
    if (integrityByFile && (htmlErrors?.length || a11yErrors?.length || dupIds?.length || remoteAssets?.length)) {
      integrityByFile.set(src, { htmlErrors, a11yErrors, dupIds, remoteAssets });
    }
    if (redirectStubSet && isRedirectStub) {
      redirectStubSet.add(path.resolve(src));
    }
    if (canonicalByFile && canonicalHref) {
      canonicalByFile.set(src, canonicalHref);
    }
  }
  const tExtract = performance.now();

  // Resolution, existence checks and fragment settling all live in the
  // core now. idsByFile keys match the walk-path shape and (because
  // rootStr is kept in its caller-supplied shape -- see above) the
  // resolver-built target shape too, so the fragment lookup lands
  // without canonicalisation. The set is complete here, so nothing
  // defers.
  const oracle = opts.oracle === "index"
    ? IndexOracle(buildTreeIndex(rootStr, collectAllRelFiles(rootStr)))
    : FsOracle();

  const { broken, brokenUniqueCount, uniqueCount, fragmentTargets, stages } =
    resolveOccurrences(occurrences, oracle, {
      rootStr, basePath, fallbackExts, indexFiles,
      includeFragments: opts.includeFragments,
      localIds: idsByFile,
    });
  const filesForFragments = [...fragmentTargets];
  const tDone = performance.now();
  write(formatLinkReport(broken, forbiddenBySource));

  let forbiddenCount = 0;
  if (forbiddenBySource) {
    for (const fhits of forbiddenBySource.values()) forbiddenCount += fhits.length;
  }
  const total = occurrences.length / 3;
  const unique = uniqueCount;
  const errorsUnique = brokenUniqueCount;
  const okUnique = unique - errorsUnique;
  const elapsed = (tDone - t0) / 1000;
  const forbidNote = forbidPrefixes ? `, ${forbiddenCount} forbidden` : "";
  write(
    `Checked ${total} occurrences (${unique} unique) in ${elapsed.toFixed(3)}s ` +
    `-- ${okUnique} OK, ${errorsUnique} broken${forbidNote}\n`
  );

  if (opts.verbose) {
    const fmt = (ms) => `${(ms / 1000).toFixed(3)}s`;
    write("\n");
    write(`  Files scanned:        ${htmlFiles.length}\n`);
    write(`  Fragment targets:     ${filesForFragments.length}\n`);
    write(`  Walk:        ${fmt(tWalk - t0)}\n`);
    write(`  Extract:     ${fmt(tExtract - tWalk)}\n`);
    write(`  Resolve:     ${fmt(stages.resolve)}\n`);
    write(`  Check paths: ${fmt(stages.checkPaths)}\n`);
    write(`  Fragments:   ${fmt(stages.fragments)}\n`);
    write(`  Report:      ${fmt(stages.report)}\n`);
  }

  // ── Integrity check reporting ──────────────────────────────────────

  const integrityReport = formatIntegrityReport(integrityByFile);
  let integrityIssueCount = integrityReport.count;
  write(integrityReport.text);

  // Cross-file sitemap check.
  let sitemapIssues = null, searchIssues = null, canonicalIssues = null;
  if (opts.checkSitemap) {
    const issues = sitemapIssues = checkSitemapContents(rootStr, htmlFiles, redirectStubSet, basePath);
    if (issues === null) {
      write("warning: --check-sitemap: sitemap.xml not found in root-dir, skipping\n");
    } else if (issues.length) {
      write("\n" + issues.join("\n") + "\n");
      integrityIssueCount += issues.length;
    }
  }

  // Cross-file search-index check.
  if (opts.checkSearch) {
    const issues = searchIssues = checkSearchContents(rootStr, htmlFiles, redirectStubSet, basePath);
    if (issues === null) {
      write("warning: --check-search: search-data.json not found in root-dir, skipping\n");
    } else if (issues.length) {
      write("\n" + issues.join("\n") + "\n");
      integrityIssueCount += issues.length;
    }
  }

  // Per-page canonical URL check.
  if (opts.checkCanonical && canonicalByFile) {
    const issues = canonicalIssues = checkCanonicalContents(rootStr, canonicalByFile, redirectStubSet, basePath);
    if (issues === null) {
      write("warning: --check-canonical: no <link rel=\"canonical\"> found in any page, skipping\n");
    } else if (issues.length) {
      write("\n" + issues.join("\n") + "\n");
      integrityIssueCount += issues.length;
    }
  }

  // Summary line when any integrity flags were requested.
  if (needIntegrity || opts.checkSitemap || opts.checkSearch || opts.checkCanonical) {
    write(`Integrity: ${integrityIssueCount} issue(s)\n`);
  }

  // Exit codes: 1 = link failures, 2 = integrity failures, 3 = both.
  const linksFailed = broken.length > 0 || forbiddenCount > 0;
  const integrityFailed = integrityIssueCount > 0;
  let exitCode = (linksFailed ? 1 : 0) | (integrityFailed ? 2 : 0);
  if (opts.noFail) exitCode = 0;

  if (!structured) return { output: buf.join(""), exitCode };

  return {
    output: buf.join(""),
    exitCode,
    findings: buildFindings({
      rootStr, broken, forbiddenBySource, integrityByFile,
      sitemapIssues, searchIssues, canonicalIssues,
      enabled: {
        html: opts.checkHtml, a11y: opts.checkA11y,
        ids: opts.checkIds, remoteAssets: opts.checkRemoteAssets,
        forbid: forbidPrefixes !== null, fragments: opts.includeFragments,
      },
      counts: {
        files:       htmlFiles.length,
        occurrences: occurrences.length / 3,
        unique:      uniqueCount,
        brokenUnique: brokenUniqueCount,
        forbidden:   forbiddenCount,
        integrity:   integrityIssueCount,
      },
      linksFailed, integrityFailed,
    }),
  };
}

// Reduce a pass's conclusions to sorted arrays of tree-relative strings.
// Category names match the flags that produce them, so a diff says which
// check drifted rather than only that something did.
function buildFindings({
  rootStr, broken, forbiddenBySource, integrityByFile,
  sitemapIssues, searchIssues, canonicalIssues, counts, enabled,
  linksFailed, integrityFailed,
}) {
  const rel = (p) => relToRoot(rootStr, p);

  const brokenOut = [];
  for (let i = 0; i < broken.length; i += 3) {
    brokenOut.push(`${rel(broken[i])}\t${broken[i + 1]}\t${broken[i + 2]}`);
  }

  const forbiddenOut = [];
  if (forbiddenBySource) {
    for (const [src, hits] of forbiddenBySource) {
      for (const h of hits) forbiddenOut.push(`${rel(src)}\t${h.url}\t${h.prefix}`);
    }
  }

  const html = [], a11y = [], dupIds = [], remoteAssets = [];
  if (integrityByFile) {
    for (const [src, rec] of integrityByFile) {
      const r = rel(src);
      for (const e of rec.htmlErrors ?? []) html.push(`${r}: html-${e.type}: <${e.tag}>`);
      for (const e of rec.a11yErrors ?? []) {
        if (e.type === "img-missing-alt")   a11y.push(`${r}: a11y-img-missing-alt: src=${e.src}`);
        else if (e.type === "empty-anchor") a11y.push(`${r}: a11y-empty-anchor`);
        else if (e.type === "empty-href")   a11y.push(`${r}: a11y-empty-href: <${e.tag}>`);
      }
      for (const e of rec.dupIds ?? []) dupIds.push(`${r}: duplicate-id: '${e.id}' appears ${e.count} times`);
      for (const e of rec.remoteAssets ?? []) remoteAssets.push(`${r}: remote-asset: <${e.tag} src="${e.src}">`);
    }
  }

  // `null` means "check not requested / input absent" and is distinct
  // from `[]` ("ran, found nothing") -- a fused path that silently
  // stopped running a cross-file check must not compare equal to one
  // that ran it clean.
  const sortOrNull = (a) => (a === null || a === undefined ? null : [...a].sort());

  const gate = (on, a) => (on ? a.sort() : null);

  return {
    broken:       brokenOut.sort(),
    forbidden:    gate(enabled.forbid, forbiddenOut),
    html:         gate(enabled.html, html),
    a11y:         gate(enabled.a11y, a11y),
    dupIds:       gate(enabled.ids, dupIds),
    remoteAssets: gate(enabled.remoteAssets, remoteAssets),
    sitemap:      sortOrNull(sitemapIssues),
    search:       sortOrNull(searchIssues),
    canonical:    sortOrNull(canonicalIssues),
    counts,
    linksFailed, integrityFailed,
  };
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
//   3. checkCanonicalContents must flag canonical URLs whose path
//      doesn't equal --base-path + the page's URL path.  Catches
//      "canonical missing baseurl" (would 404 on subpath deploy)
//      and the inverse "canonical includes baseurl on root deploy".

// Exported so scripts/check_links_diff.mjs can run it: these three guards
// used to sit inside the `isEntry` branch below, and since b97c75f nothing
// invokes this script as an entry point in CI -- so they ran in no
// automated context at all. A clean differential against a broken
// reference implementation means nothing, so the harness runs them first.
export function selfTest() {
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

    // Guard 3: canonical URL check.  Under --base-path /base, the
    // canonical for Foo.html must be "<host>/base/Foo" (the actual
    // deployment URL).  Both "missing baseurl" and "wrong baseurl"
    // are mismatches.
    const okBp = new Map([
      [path.join(tmp, "Foo.html"), "https://example.com/base/Foo"],
    ]);
    const okBpIssues = checkCanonicalContents(tmp, okBp, null, bp);
    if (!okBpIssues || okBpIssues.length)
      throw new Error("checkCanonicalContents under --base-path: correct canonical flagged: " + JSON.stringify(okBpIssues));

    const missingBaseurl = new Map([
      [path.join(tmp, "Foo.html"), "https://example.com/Foo"],
    ]);
    const miBpIssues = checkCanonicalContents(tmp, missingBaseurl, null, bp);
    if (!miBpIssues || miBpIssues.length !== 1 || !miBpIssues[0].includes("canonical-mismatch"))
      throw new Error("checkCanonicalContents: should flag baseurl-less canonical under --base-path: " + JSON.stringify(miBpIssues));

    // With no --base-path, canonical must NOT include any path prefix.
    const okNoBp = new Map([
      [path.join(tmp, "Foo.html"), "https://example.com/Foo"],
    ]);
    const okNoBpIssues = checkCanonicalContents(tmp, okNoBp, null, "");
    if (!okNoBpIssues || okNoBpIssues.length)
      throw new Error("checkCanonicalContents without --base-path: correct canonical flagged: " + JSON.stringify(okNoBpIssues));

    const extraBaseurl = new Map([
      [path.join(tmp, "Foo.html"), "https://example.com/base/Foo"],
    ]);
    const exNoBpIssues = checkCanonicalContents(tmp, extraBaseurl, null, "");
    if (!exNoBpIssues || exNoBpIssues.length !== 1 || !exNoBpIssues[0].includes("canonical-mismatch"))
      throw new Error("checkCanonicalContents: should flag canonical with extra prefix on root deploy: " + JSON.stringify(exNoBpIssues));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ── Module entry ────────────────────────────────────────────────

// The CLI path is gated on this module actually being the process entry
// so the pure pieces can be imported -- scripts/check_links_diff.mjs
// drives runCheck() in-process. The worker branch stays keyed on
// workerData.argv, which only the /sep/ dispatch below ever sets.
const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (!isMainThread && workerData?.argv) {
  const result = runCheck(workerData.argv);
  parentPort.postMessage(result);
} else if (isEntry) {
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
