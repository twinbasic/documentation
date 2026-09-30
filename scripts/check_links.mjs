// Offline link checker for static sites.
//
// The routine check runs *inside the build* -- `tbdocs --check`, which
// build.bat passes via --check-audit-index -- over the HTML the workers
// already hold, rather than writing ~270 MB out and reading it back.
// This script is the same check as a standalone tool, for a tree the
// build did not produce: a release zip, a bisect, someone else's
// artifact. It keeps its own command line, its own walk of the tree and
// its own reading of each page, and hands the pages to the functions
// the build's pass runs, builder/check.mjs's checkChunk and joinChunks,
// as one chunk. Both CI workflows still run it, though not directly:
// check_links_diff.mjs runs it in-process as its `script` side, only
// against the fixtures, and compares its findings with the build's. The
// two differ only in how they read the tree, so run that comparison
// whenever builder/check.mjs, builder/link-check.mjs or this script
// changes. See builder/PLAN-checks.md.
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
//   3 both.  --no-fail forces 0.  A command-line error exits 4, which
//   no check can produce, so it is never read as a failed check.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, workerData, Worker } from "node:worker_threads";

// The check is builder/check.mjs's, the one the build's --check pass
// runs, over the pure core in builder/link-check.mjs. This script adds
// only what a tree on disk needs: the walk, the reads, the choice of
// oracle, and its report's summary lines. See builder/link-check.mjs for
// why the dependency runs this way round.
import {
  checkChunk, joinChunks, findingsFor, normalizeBasePath, treeIndexFor,
} from "../builder/check.mjs";
import {
  FsOracle, formatLinkReport, formatIntegrityReport,
  resolve, OUTSIDE_BASEPATH_MARKER,
} from "../builder/link-check.mjs";
import { CliError, parseCli } from "../lib/cli.mjs";

// Tree-relative POSIX path, the space check.mjs works and reports in, so
// the same tree checked with a relative --root-dir, an absolute one, or
// from inside the build gives equal findings.
function relToRoot(rootStr, p) {
  const rootAbs = path.resolve(rootStr || ".");
  return path.relative(rootAbs, path.resolve(p)).replace(/\\/g, "/");
}

// sitemap.xml and search-data.json, which a cross-file check reads when
// they are there and reports skipped when they are not.
//
// One thing this side cannot do, and the build can: a page carrying
// `sitemap: false` or `search_exclude: true` is absent from the generated
// file on purpose, and nothing in the built HTML says so. The build knows
// because it still has the frontmatter and passes the generators' own
// opt-out sets to the checker; a tree this build did not produce is just a
// directory of HTML, so a deliberate omission and a bug look identical
// here. Both checks are opt-in flags for that reason.
function readIfPresent(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function printHelp(stream = process.stdout) {
  stream.write(`Usage: node check_links.mjs [options] <inputs...>
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
                             Reads <root-dir>/sitemap.xml; if the file is
                             absent, prints a warning and skips the
                             check without failing.
  --check-search             Every .html file in the input has at least
                             one entry in assets/js/search-data.json.
                             Reads from <root-dir>; if the file is
                             absent, prints a warning and skips the
                             check without failing.
  --check-canonical          Every page's <link rel="canonical" href>
                             URL path matches the page's own deployment
                             URL. Catches canonical URLs that include
                             --base-path / the wrong baseurl.

Exit codes:
  0  All checks passed.
  1  Link / forbidden-prefix check failed.
  2  Integrity check failed (no link failures).
  3  Both link and integrity checks failed.
  4  Command-line error, reported on stderr: no arguments, an unknown
     option, a flag without its value or with an empty one, no
     --offline, or no input.

Inputs are files or directories; directories are searched recursively
for *.html.
`);
}

// `forbid` is the only repeatable flag, and `help` is answered before any
// argument list is parsed.
const LINK_OPTIONS = {
  offline: { type: "boolean", default: false },
  "include-fragments": { type: "boolean", default: false },
  "fallback-extensions": { type: "string", default: "" },
  "index-files": { type: "string", default: "" },
  "root-dir": { type: "string", default: null },
  "base-path": { type: "string", default: "" },
  forbid: { type: "string", multiple: true },
  "no-fail": { type: "boolean", default: false },
  verbose: { type: "boolean", short: "v", default: false },
  help: { type: "boolean", short: "h", default: false },
  "check-html": { type: "boolean", default: false },
  "check-a11y": { type: "boolean", default: false },
  "check-ids": { type: "boolean", default: false },
  "check-remote-assets": { type: "boolean", default: false },
  "check-sitemap": { type: "boolean", default: false },
  "check-search": { type: "boolean", default: false },
  "check-canonical": { type: "boolean", default: false },
  // GitHub Pages serves from a case-sensitive filesystem; NTFS is
  // not. FsOracle asks the platform, so on Windows a wrong-case link
  // passes here and 404s in production -- and because
  // check_links_diff.mjs calls this script "the oracle of record",
  // the harness would report the side that is RIGHT as the one with
  // the extra finding. IndexOracle compares strings, so it behaves
  // the same everywhere. --oracle fs stays available for the case
  // where the question really is "what does this machine's
  // filesystem say".
  oracle: { type: "string", default: process.platform === "win32" ? "index" : "fs" },
};

function parseArgs(argv) {
  const { values, positionals } = parseCli(argv, { options: LINK_OPTIONS, positionals: { min: 0 } });
  const opts = {
    offline: values.offline,
    includeFragments: values.includeFragments,
    fallbackExtensions: values.fallbackExtensions,
    indexFiles: values.indexFiles,
    rootDir: values.rootDir,
    basePath: values.basePath,
    forbid: values.forbid,
    noFail: values.noFail,
    verbose: values.verbose,
    checkHtml: values.checkHtml,
    checkA11y: values.checkA11y,
    checkIds: values.checkIds,
    checkRemoteAssets: values.checkRemoteAssets,
    checkSitemap: values.checkSitemap,
    checkSearch: values.checkSearch,
    checkCanonical: values.checkCanonical,
    oracle: values.oracle,
  };

  return { opts, inputs: positionals };
}

function collectHtmlFiles(inputs) {
  const files = [];
  const warnings = [];
  for (const inp of inputs) {
    let s = null;
    try { s = fs.statSync(inp); } catch { /* reported below */ }
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
// nothing is written to stdout/stderr.  Returns { output, exitCode }, and
// for a command-line error (exit 4) an empty output and `error`, the line for
// stderr.
//
// With `structured: true` the result additionally carries a `findings`
// object -- builder/check.mjs's findingsFor, the same conclusions the
// report prints as sorted arrays of tree-relative strings, which
// scripts/check_links_diff.mjs compares with the build's. Building it
// costs a few ms and is skipped entirely when not requested.
export function runCheck(argv, { structured = false } = {}) {
  const buf = [];
  const write = (s) => buf.push(s);

  const commandLineError = (error) => ({ output: "", exitCode: 4, error });

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    if (!(e instanceof CliError)) throw e;
    return commandLineError(`error: ${e.message}`);
  }
  const { opts, inputs } = parsed;

  if (!opts.offline) {
    return commandLineError(
      "error: --offline is required. Online (network) checking is not " +
      "implemented by this tool."
    );
  }
  if (!inputs.length) {
    return commandLineError("error: at least one input file or directory is required");
  }

  // --root-dir is used in the shape it was given. checkChunk joins it to
  // each page's tree-relative path, so the paths it resolves links
  // against and the paths it looks fragment ids up by are in one shape,
  // relative or absolute, whatever shape the walk paths are in.
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
  // The cross-file checks leave redirect stubs out, and a tree on disk
  // does not say which pages the build generated as stubs, so they are
  // sniffed from their meta refresh.
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

  // This pass's tree, in the shape of check.mjs's TREES entries.
  const tree = {
    label: rootStr || ".",
    checkOpts,
    forbid: opts.forbid.length ? opts.forbid : null,
    crossFile: {
      sitemap: opts.checkSitemap, search: opts.checkSearch, canonical: opts.checkCanonical,
    },
    fallbackExts, indexFiles,
    includeFragments: opts.includeFragments,
  };

  // checkChunk reads each page's `html` once, in order, so a getter
  // keeps one page in memory at a time, and the whole tree goes through
  // as one chunk: the unique count and the -v figures below are then the
  // tree's, not a slice's. check.mjs reports a page by its tree-relative
  // path; walkPath maps that back to the path the walk found, which is
  // what the report prints.
  const walkPath = new Map();
  const docs = htmlFiles.map((file) => {
    const destPath = relToRoot(rootStr, file);
    walkPath.set(destPath, file);
    return { destPath, get html() { return fs.readFileSync(file, "utf8"); } };
  });

  const env = { root: rootStr, basePath, tree };
  if (opts.oracle === "index") env.index = treeIndexFor(rootStr, collectAllRelFiles(rootStr));
  else env.oracle = FsOracle();

  const chunk = checkChunk(docs, env);
  const tDone = performance.now();

  const r = joinChunks([chunk], {
    root: rootStr, tree, basePath,
    relFiles: docs.map(d => d.destPath),
    stubRels: new Set(chunk.stubs),
    aux: {
      sitemapXml: opts.checkSitemap
        ? readIfPresent(path.join(rootStr, "sitemap.xml")) : null,
      searchJson: opts.checkSearch
        ? readIfPresent(path.join(rootStr, "assets", "js", "search-data.json")) : null,
    },
  });

  const shown = (rel) => walkPath.get(rel) ?? rel;
  const byWalkPath = (m) => m && new Map([...m].map(([rel, v]) => [shown(rel), v]));
  const brokenShown = r.broken.slice();
  for (let i = 0; i < brokenShown.length; i += 3) brokenShown[i] = shown(brokenShown[i]);
  write(formatLinkReport(brokenShown, byWalkPath(r.forbiddenBySource)));

  let forbiddenCount = 0;
  if (r.forbiddenBySource) {
    for (const fhits of r.forbiddenBySource.values()) forbiddenCount += fhits.length;
  }
  const unique = chunk.uniqueLocal;
  const okUnique = unique - r.brokenUnique;
  const elapsed = (tDone - t0) / 1000;
  const forbidNote = tree.forbid ? `, ${forbiddenCount} forbidden` : "";
  write(
    `Checked ${r.occurrences} occurrences (${unique} unique) in ${elapsed.toFixed(3)}s ` +
    `-- ${okUnique} OK, ${r.brokenUnique} broken${forbidNote}\n`
  );

  if (opts.verbose) {
    const fmt = (ms) => `${(ms / 1000).toFixed(3)}s`;
    const stages = chunk.stages;
    write("\n");
    write(`  Files scanned:        ${htmlFiles.length}\n`);
    write(`  Fragment targets:     ${chunk.fragmentTargets}\n`);
    write(`  Walk:        ${fmt(tWalk - t0)}\n`);
    write(`  Extract:     ${fmt(stages.extract)}\n`);
    write(`  Resolve:     ${fmt(stages.resolve)}\n`);
    write(`  Check paths: ${fmt(stages.checkPaths)}\n`);
    write(`  Fragments:   ${fmt(stages.fragments)}\n`);
    write(`  Report:      ${fmt(stages.report)}\n`);
  }

  // ── Integrity check reporting ──────────────────────────────────────

  const integrityReport = formatIntegrityReport(byWalkPath(r.integrityByFile));
  let integrityIssueCount = integrityReport.count;
  write(integrityReport.text);

  // The cross-file checks: each result is null when the check could not
  // run, and joinChunks has already left the redirect stubs out.
  const crossFile = [
    [opts.checkSitemap, r.sitemapIssues, "--check-sitemap: sitemap.xml not found in root-dir"],
    [opts.checkSearch, r.searchIssues, "--check-search: search-data.json not found in root-dir"],
    [opts.checkCanonical, r.canonicalIssues,
      '--check-canonical: no <link rel="canonical"> found in any page'],
  ];
  for (const [requested, issues, skipped] of crossFile) {
    if (!requested) continue;
    if (issues === null) {
      write(`warning: ${skipped}, skipping\n`);
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
  const linksFailed = r.broken.length > 0 || forbiddenCount > 0;
  const integrityFailed = integrityIssueCount > 0;
  let exitCode = (linksFailed ? 1 : 0) | (integrityFailed ? 2 : 0);
  if (opts.noFail) exitCode = 0;

  if (!structured) return { output: buf.join(""), exitCode };

  // findingsFor leaves `unique` null because the build cannot count it
  // across its chunks. This pass is one chunk, so it can.
  const findings = findingsFor(r);
  findings.counts.unique = unique;
  return { output: buf.join(""), exitCode, findings };
}

// ── Self-test ──────────────────────────────────────────────────
// Regression guards.  Runs once per process; takes ~20 ms.
//
//   1. --check-sitemap and --check-search must strip --base-path from
//      the URLs they read before comparing them against the tree's own
//      paths.
//   2. The resolver must flag root-absolute URLs that escape
//      --base-path as broken (browser-semantics check).  A link
//      missing the baseurl prefix may still find a file on disk
//      under --root-dir, but it would 404 on a real subpath deploy.
//   3. --check-canonical must flag canonical URLs whose path
//      doesn't equal --base-path + the page's URL path.  Catches
//      "canonical missing baseurl" (would 404 on subpath deploy)
//      and the inverse "canonical includes baseurl on root deploy".
//
// Guards 1 and 3 run the whole pass, runCheck over a one-page tree, so
// they cover this script's reading of the tree as well as the check.

// Exported so scripts/check_links_diff.mjs can run it, since nothing in
// CI runs this script as an entry point. A clean comparison against a
// side that reads the tree wrongly means nothing, so the harness runs
// these first.
export function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-links-test-"));
  try {
    const page = path.join(tmp, "Foo.html");
    // One pass over the tree, with Foo.html declaring `canonical`.
    const run = (canonical, bp) => {
      fs.writeFileSync(page,
        `<html><head><link rel="canonical" href="${canonical}"></head><body>t</body></html>`);
      const argv = ["--offline", "--check-sitemap", "--check-search", "--check-canonical",
                    "--root-dir", tmp, tmp];
      if (bp) argv.push("--base-path", bp);
      const { findings, error } = runCheck(argv, { structured: true });
      if (!findings) throw new Error(`runCheck refused the self-test's arguments:\n${error}`);
      return findings;
    };

    fs.writeFileSync(path.join(tmp, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `<url>\n<loc>https://example.com/base/Foo</loc>\n</url>\n` +
      `</urlset>\n`);

    const assetsDir = path.join(tmp, "assets", "js");
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "search-data.json"),
      JSON.stringify({ "0": { url: "/base/Foo", title: "Foo", content: "" } }));

    const bp = "/base";

    // Guard 1: sitemap / search check base-path stripping. Guard 3's
    // first case, a correct canonical under --base-path, is this pass.
    const ok = run("https://example.com/base/Foo", bp);
    if (!ok.sitemap || ok.sitemap.length)
      throw new Error("--check-sitemap with --base-path: " + JSON.stringify(ok.sitemap));
    if (!ok.search || ok.search.length)
      throw new Error("--check-search with --base-path: " + JSON.stringify(ok.search));

    // Guard 2: resolver flags off-base-path root-absolute URLs.
    // /base/Foo (inside)  -> resolves to <tmp>/Foo (exists)
    // /Foo (outside)      -> sentinel target that won't exist on disk
    const inside = resolve("/base/Foo", tmp, page, tmp, bp);
    if (!inside || inside[0].startsWith(OUTSIDE_BASEPATH_MARKER))
      throw new Error("resolve('/base/Foo') should resolve inside base-path: " + JSON.stringify(inside));

    const outside = resolve("/Foo", tmp, page, tmp, bp);
    if (!outside || !outside[0].startsWith(OUTSIDE_BASEPATH_MARKER))
      throw new Error("resolve('/Foo') with base-path should be flagged outside: " + JSON.stringify(outside));

    // With no base-path, every root-absolute URL is in-bounds.
    const noBp = resolve("/Foo", tmp, page, tmp, "");
    if (!noBp || noBp[0].startsWith(OUTSIDE_BASEPATH_MARKER))
      throw new Error("resolve('/Foo') without --base-path must not be flagged: " + JSON.stringify(noBp));

    // Guard 3: canonical URL check.  Under --base-path /base, the
    // canonical for Foo.html must be "<host>/base/Foo" (the actual
    // deployment URL).  Both "missing baseurl" and "wrong baseurl"
    // are mismatches.
    if (!ok.canonical || ok.canonical.length)
      throw new Error("--check-canonical under --base-path: correct canonical flagged: " + JSON.stringify(ok.canonical));

    const miBp = run("https://example.com/Foo", bp).canonical;
    if (!miBp || miBp.length !== 1 || !miBp[0].includes("canonical-mismatch"))
      throw new Error("--check-canonical: should flag baseurl-less canonical under --base-path: " + JSON.stringify(miBp));

    // With no --base-path, canonical must NOT include any path prefix.
    const okNoBp = run("https://example.com/Foo", "").canonical;
    if (!okNoBp || okNoBp.length)
      throw new Error("--check-canonical without --base-path: correct canonical flagged: " + JSON.stringify(okNoBp));

    const exNoBp = run("https://example.com/base/Foo", "").canonical;
    if (!exNoBp || exNoBp.length !== 1 || !exNoBp[0].includes("canonical-mismatch"))
      throw new Error("--check-canonical: should flag canonical with extra prefix on root deploy: " + JSON.stringify(exNoBp));
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
    printHelp(process.stderr);
    process.exit(4);
  }

  if (segments.length === 1) {
    // Single command -- run inline, no worker overhead.
    const { output, exitCode, error } = runCheck(segments[0]);
    process.stdout.write(output);
    if (error) process.stderr.write(`${error}\n`);
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
      if (r.error) process.stderr.write(`${r.error}\n`);
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
