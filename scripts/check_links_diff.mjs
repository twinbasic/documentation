// Differential harness for the link checker.
//
// Runs the same check pass under two named *sides* -- two
// implementations that are supposed to reach identical conclusions --
// and diffs their findings category by category. Exits non-zero on any
// difference.
//
// It exists because of the failure mode that makes this whole
// refactor dangerous: a checker that silently checks *less* reports a
// clean pass. `check.bat` going green proves nothing about whether the
// fused path still looks at everything the standalone script does.
// This is the same role scripts/check_a11y_fingerprint.mjs plays on the
// axe side, and it has the same blind spot: it compares conclusions,
// never the shape of the work that produced them. Treat it as
// necessary, not sufficient.
//
// The comparison that matters is `--a script --b fused`: run it after
// touching builder/link-check.mjs, builder/check.mjs or
// scripts/check_links.mjs. It builds the site itself, so the two sides
// are looking at the same bytes.
//
// Usage:
//   node scripts/check_links_diff.mjs --a script --b fused
//   node scripts/check_links_diff.mjs --a script --b index
//   node scripts/check_links_diff.mjs --self-test
//   node scripts/check_links_diff.mjs --case online --case book -v
//   node scripts/check_links_diff.mjs --list
//
// Four of the six cases are the real invocations, verbatim:
//
//   online     _site/          integrity + sitemap + search + canonical
//   offline    _site-offline/  integrity + --forbid
//   book       _site-pdf/      book.html only, --no-fail, fragments
//   basepath   a tree built with --baseurl, checked with the matching
//              --base-path. The only pass where isOutsideBasePath() and
//              stripBasePath() do anything.
//
// The other four exist because those four, on a healthy site, compare
// empty against empty in nine of the ten categories:
//
//   online-abs _site/          `online` with an absolute --root-dir.
//                              Must agree with it findings-for-findings:
//                              runCheck() deliberately keeps --root-dir
//                              in its caller-supplied shape, and any
//                              index built from the build's own records
//                              has to normalise both sides or it misses
//                              silently. It did, twice.
//   fixture    a hand-written tree with one fault of every kind, so
//              every category has something in it to compare.
//   fixture-built          the same idea, but a tree the BUILD produces
//   fixture-built-offline  from test/fixtures/check-src -- which is the
//              only way the fused side can be held to it. Two cases over
//              one build: no single tree carries all nine categories,
//              because the online tree has the sitemap, search and
//              canonical checks and the offline tree is the only one with
//              a forbidden prefix.
//
// `online-abs` and `fixture` have no fused equivalent -- the fused pass
// checks what the build produced, so it has nothing to say about a
// --root-dir shape variation or a tree it did not write. That is exactly
// why the built pair had to exist: every `--b fused` run skipped
// `fixture`, so the one case that makes more than one category non-empty
// was never compared against the implementation this harness watches.

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { runCheck, selfTest as scriptSelfTest } from "./check_links.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const BASE_PATH = "/twinBASIC-docs";
const DEFAULT_BASEPATH_TREE = "docs/_site-basepath";
const FIXTURE_SRC  = "test/fixtures/check-src";
const FIXTURE_TREE = "test/fixtures/_out";

// What each fixture case expects to find. Asserted after the run, so a
// fixture that stopped provoking a category fails loudly instead of
// quietly reducing the comparison to empty-vs-empty again.
//
// A count of `null` means "this check did not run", which is a different
// statement from `0` and is asserted as such -- the online tree has no
// --forbid, and the offline tree has no sitemap, search or canonical
// check.
//
// On `html`: both shapes here are `closed-early`. An earlier comment
// claimed one of each kind, including one the document never closed --
// but `unclosed-tag` is not reachable through either fixture. htmlparser2
// force-closes any still-open ancestor as soon as a later close tag
// matches something further down the stack, and both this tree and
// templatePage() always end with `</body></html>`. Only a truly truncated
// document reaches `unclosed-tag`. (The third shape a reader might expect,
// a stray `</section>` with nothing open, is also absent: htmlparser2
// drops close tags for elements that were never opened without telling
// anyone, so the check cannot see them.)
const FIXTURE_EXPECTED = {
  broken: 2, forbidden: 1, html: 2, a11y: 3, dupIds: 1,
  remoteAssets: 1, sitemap: 1, search: 1, canonical: 1,
};

// The built fixture, per tree. Measured against test/fixtures/check-src.
//
// `sitemap: 0` and `search: 0` are the honest answer, not a gap: a
// correct build cannot omit a page from either index. sitemap.mjs emits
// every page the checker then looks for, and the two sides normalise the
// URL identically; deriveSearchEntries pushes a fallback entry for any
// page with no headings, so `sections.length === 0` never co-occurs with
// an indexable page. Weird.md exists to hold that claim to the awkward
// case -- a permalink ending in the literal text `index.html`.
const FIXTURE_BUILT_ONLINE = {
  broken: 3, forbidden: null, html: 1, a11y: 3, dupIds: 1,
  remoteAssets: 1, sitemap: 0, search: 0, canonical: 1,
};

const FIXTURE_BUILT_OFFLINE = {
  broken: 3, forbidden: 1, html: 1, a11y: 3, dupIds: 1,
  remoteAssets: 1, sitemap: null, search: null, canonical: null,
};

// ── Cases ───────────────────────────────────────────────────────────

// Each case yields the argv for one check pass. `root` is the
// --root-dir string in the shape the real invocation uses; keeping that
// shape is the point of `online-abs`.
const CASES = {
  online: {
    describe: "_site/ -- integrity + sitemap + search + canonical",
    fused: { tree: "online", baseurl: "" },
    root: () => "docs/_site",
    argv: (root) => [
      "--offline", "--include-fragments",
      "--check-html", "--check-a11y", "--check-ids", "--check-remote-assets",
      "--check-sitemap", "--check-search", "--check-canonical",
      "--fallback-extensions", "html", "--index-files", "index.html,.",
      "--root-dir", root, root,
    ],
  },

  "online-abs": {
    describe: "_site/ -- as `online`, absolute --root-dir",
    sameAs: "online",
    root: () => path.join(REPO_ROOT, "docs", "_site"),
    argv: (root) => CASES.online.argv(root),
  },

  offline: {
    describe: "_site-offline/ -- integrity + --forbid",
    fused: { tree: "offline", baseurl: "" },
    root: () => "docs/_site-offline",
    argv: (root) => [
      "--offline", "--include-fragments",
      "--check-html", "--check-a11y", "--check-ids", "--check-remote-assets",
      "--forbid", "https://docs.twinbasic.com",
      "--fallback-extensions", "html", "--index-files", "index.html,.",
      "--root-dir", root, root,
    ],
  },

  book: {
    describe: "_site-pdf/book.html -- fragments only, --no-fail",
    fused: { tree: "pdf", baseurl: "" },
    root: () => "docs/_site-pdf",
    argv: (root) => [
      "--offline", "--no-fail", "--include-fragments",
      "--root-dir", root, path.posix.join(root.replace(/\\/g, "/"), "book.html"),
    ],
  },

  basepath: {
    describe: `a --baseurl ${BASE_PATH} tree, checked with --base-path`,
    fused: { tree: "online", baseurl: BASE_PATH, dest: DEFAULT_BASEPATH_TREE },
    needsBasePathTree: true,
    root: (opts) => opts.basePathTree,
    argv: (root) => [
      ...CASES.online.argv(root),
      "--base-path", BASE_PATH,
    ],
  },

  // A tiny synthetic tree carrying one fault of every kind. The real
  // site is clean, which means the four cases above compare empty
  // against empty in nine of the ten categories -- they prove the sides
  // agree about nothing being wrong, and almost nothing about whether
  // they agree about what *is*. This one makes every category non-empty.
  fixture: {
    describe: "synthetic tree with one fault of every kind",
    needsFixture: true,
    expect: FIXTURE_EXPECTED,
    root: (opts) => opts.fixtureDir,
    argv: (root) => [
      ...CASES.online.argv(root),
      "--forbid", "https://docs.twinbasic.com",
    ],
  },

  // The same idea as `fixture`, but a tree the BUILD produced -- which is
  // the only way the fused side can be held to it. `fixture` above is a
  // hand-written directory of HTML, so the fused pass has nothing to say
  // about it, and every `--b fused` run skipped it: the one case that
  // makes more than one category non-empty was never compared against the
  // implementation the harness exists to watch.
  //
  // Two cases over one build, because no single tree carries all nine
  // categories: the online tree has the sitemap, search and canonical
  // checks, and the offline tree is the only one with a forbidden prefix.
  "fixture-built": {
    describe: "a tree tbdocs built from test/fixtures/check-src -- online",
    fused: { tree: "online", baseurl: "", src: FIXTURE_SRC, dest: FIXTURE_TREE, offline: true },
    expect: FIXTURE_BUILT_ONLINE,
    root: () => FIXTURE_TREE,
    argv: (root) => CASES.online.argv(root),
  },

  "fixture-built-offline": {
    describe: "the same build's offline tree -- the only one with --forbid",
    fused: { tree: "offline", baseurl: "", src: FIXTURE_SRC, dest: FIXTURE_TREE, offline: true },
    expect: FIXTURE_BUILT_OFFLINE,
    root: () => `${FIXTURE_TREE}-offline`,
    argv: (root) => CASES.offline.argv(root),
  },
};

const DEFAULT_CASES = [
  "online", "online-abs", "offline", "book", "basepath", "fixture",
  "fixture-built", "fixture-built-offline",
];

function writeFixture(dir) {
  const w = (rel, text) => {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text, "utf8");
  };

  // Two broken links (a missing target and a missing fragment), a
  // forbidden prefix, and a directory link that must resolve.
  w("index.html", `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://example.invalid/">
</head><body id="top">
<a href="ok.html">ok</a>
<a href="missing.html">gone</a>
<a href="sub/">dir</a>
<a href="other.html#nope">no such anchor</a>
<a href="other.html#real">fine</a>
<a href="#top">self</a>
<a href="https://docs.twinbasic.com/tB/Core/Dim">live site</a>
<a href="https://example.com/">external</a>
</body></html>\n`);

  w("ok.html", `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://example.invalid/ok">
</head><body><p>ok</p></body></html>\n`);

  w("other.html", `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://example.invalid/other">
</head><body><h2 id="real">real</h2></body></html>\n`);

  w("sub/index.html", `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://example.invalid/sub/">
</head><body><p>sub</p></body></html>\n`);

  // One of each integrity fault, plus a canonical that does not match
  // the page's own URL path. The two malformed shapes are a crossed
  // pair (<em> closed early by </strong>) and a <div> the document
  // never closes -- the parser repairs both, and reporting them is the
  // whole point of --check-html.
  w("bad.html", `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://example.invalid/somewhere-else">
</head><body>
<span id="dup">a</span><span id="dup">b</span>
<img src="ok.png">
<img src="https://example.com/remote.png" alt="remote">
<a href="ok.html"></a>
<a href="">empty</a>
<strong><em>crossed</strong></em>
<div>never closed
</body></html>\n`);

  // A redirect stub: excluded from the sitemap / search / canonical
  // checks, so its absence from both indexes must NOT be reported.
  w("stub.html", `<!DOCTYPE html><html><head>
<meta http-equiv="refresh" content="0; url=ok.html">
<link rel="canonical" href="https://example.invalid/nowhere">
</head><body><a href="ok.html">ok</a></body></html>\n`);

  w("ok.png", "not really a png");

  // other.html is deliberately absent from both indexes -- one
  // sitemap-missing and one search-missing.
  w("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.invalid/</loc></url>
<url><loc>https://example.invalid/ok</loc></url>
<url><loc>https://example.invalid/sub/</loc></url>
<url><loc>https://example.invalid/bad</loc></url>
</urlset>\n`);

  w("assets/js/search-data.json", JSON.stringify({
    0: { url: "/",        title: "Home", content: "" },
    1: { url: "/ok",      title: "Ok",   content: "" },
    2: { url: "/sub/",    title: "Sub",  content: "" },
    3: { url: "/bad#dup", title: "Bad",  content: "" },
  }));
}

// ── Sides ───────────────────────────────────────────────────────────
//
// A side is one implementation of "run this pass and tell me what you
// found". Phase 0 ships only `script`; Phase 2 adds the index-backed
// oracle and Phase 3 the in-build path. Registering them here keeps the
// harness itself unchanged as the implementations multiply.

const SIDES = {
  // Pinned to --oracle fs, not left to the default. The script's default
  // is platform-dependent (index on Windows, where NTFS makes FsOracle
  // case-insensitive), and a side that silently became the same oracle
  // as `index` would turn this comparison into a no-op on one platform.
  //
  // It is the reference implementation, not an oracle of record: on
  // Windows, FsOracle answers "exists" for a wrong-case path that 404s on
  // GitHub Pages, so on that one question the `index` side is the correct
  // one and this side is the one with the missing finding.
  script: {
    describe: "scripts/check_links.mjs with --oracle fs, in-process",
    run(argv) {
      argv = [...argv, "--oracle", "fs"];
      const { findings, exitCode, output } = runCheck(argv, { structured: true });
      if (!findings) {
        throw new Error(`runCheck refused the arguments (exit ${exitCode}):\n${output}`);
      }
      return findings;
    },
  },

  // Same script, same walk, but existence questions answered from a Set
  // built off one directory listing instead of a stat per candidate.
  // Proves the oracle's *lookup* semantics; whether the build's index
  // has the right entries in it is a separate question, and the `fused`
  // side is what answers that.
  index: {
    describe: "scripts/check_links.mjs with --oracle index",
    run(argv) {
      // Appended after the script side's --oracle fs, and the parser
      // takes the last value, so this wins.
      return SIDES.script.run([...argv, "--oracle", "index"]);
    },
  },

  // The build's own --check pass. One build per --baseurl serves every
  // case that reads the tree it produced, so the whole comparison costs
  // one or two builds rather than one per case.
  //
  // This is the side the whole harness exists for: it is the one that
  // could quietly check less than the script does, and on a clean site
  // nothing else would say so.
  fused: {
    describe: "tbdocs --check, the build's own pass",
    run(argv, { case: name }) {
      const c = CASES[name];
      if (!c.fused) throw new Error(`case '${name}' has no fused equivalent`);
      const all = fusedBuild(c.fused);
      const f = all[c.fused.tree];
      if (!f) {
        throw new Error(`the build produced no '${c.fused.tree}' findings ` +
                        `(was the tree skipped?)`);
      }
      return f;
    },
  },

  // Deliberately wrong, for --self-test. On a healthy site every
  // category is empty, so a harness that only diffed sets would pass
  // any mutation that merely stops working. This one exercises all
  // three detectors at once: an extra entry (set difference), a check
  // that stopped running (null vs []), and files that were never
  // looked at (count difference) -- the last being the failure mode
  // that actually matters.
  mutant: {
    describe: "script, then corrupted on purpose -- only for --self-test",
    run(argv) {
      const f = SIDES.script.run(argv);
      return {
        ...f,
        broken: [...f.broken, "Synthetic.html\t/nowhere\ttarget not found"].sort(),
        canonical: null,
        counts: { ...f.counts, files: f.counts.files - 1 },
      };
    },
  },
};

// Build once per distinct --baseurl / --dest and cache the findings the
// build wrote. The trees the script side reads are the ones this build
// produced, so both sides are looking at the same bytes.
const FUSED_CACHE = new Map();
function fusedBuild({ baseurl = "", dest = null, src = "docs", offline = false } = {}) {
  const key = `${src} ${baseurl} ${dest ?? ""}`;
  if (FUSED_CACHE.has(key)) return FUSED_CACHE.get(key);

  const out = path.join(os.tmpdir(), `tbdocs-findings-${process.pid}-${FUSED_CACHE.size}.json`);
  const args = ["builder/tbdocs.mjs", "--src", src, "--check-findings", out];
  if (baseurl) args.push("--baseurl", baseurl);
  // A --dest build skips the sibling trees, because the only case that
  // used one reads the online tree. `offline: true` asks for the offline
  // tree back: the forbidden-prefix rule runs nowhere else.
  if (dest) {
    args.push("--dest", dest, "--no-pdf");
    if (!offline) args.push("--no-offline");
  }

  console.log(`  building: node ${args.join(" ")}`);
  const r = spawnSync(process.execPath, args, { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
  // A non-zero exit is expected when the check finds something -- that
  // is the point. Only a missing findings file means the build failed.
  if (!fs.existsSync(out)) {
    console.error(r.stdout ?? "");
    console.error(r.stderr ?? "");
    throw new Error(`the build wrote no findings file (exit ${r.status})`);
  }
  const findings = JSON.parse(fs.readFileSync(out, "utf8"));
  fs.rmSync(out, { force: true });
  FUSED_CACHE.set(key, findings);
  return findings;
}

// ── Diffing ─────────────────────────────────────────────────────────

const CATEGORIES = [
  "broken", "forbidden", "html", "a11y", "dupIds", "remoteAssets",
  "sitemap", "search", "canonical",
];

function symmetricDifference(a, b) {
  // `null` is "check not requested / input absent" and is deliberately
  // not the same as `[]`. A side that stopped running a cross-file check
  // entirely must not compare equal to one that ran it and found nothing.
  if (a === null || b === null) {
    if (a === b) return null;
    return { nullMismatch: [a === null ? "null" : `${a.length} entries`,
                            b === null ? "null" : `${b.length} entries`] };
  }
  const setB = new Set(b);
  const setA = new Set(a);
  const onlyA = a.filter(x => !setB.has(x));
  const onlyB = b.filter(x => !setA.has(x));
  if (!onlyA.length && !onlyB.length) return null;
  return { onlyA, onlyB };
}

function diffFindings(x, y) {
  const diffs = [];
  for (const cat of CATEGORIES) {
    const d = symmetricDifference(x[cat] ?? null, y[cat] ?? null);
    if (d) diffs.push({ cat, ...d });
  }
  for (const key of Object.keys(x.counts)) {
    // A null count means that side does not compute the figure at all
    // -- see findingsFor()'s note on `unique`. Not a difference in what
    // was found.
    if (x.counts[key] === null || y.counts[key] === null) continue;
    if (x.counts[key] !== y.counts[key]) {
      diffs.push({ cat: `counts.${key}`, scalar: [x.counts[key], y.counts[key]] });
    }
  }
  for (const key of ["linksFailed", "integrityFailed"]) {
    if (x[key] !== y[key]) diffs.push({ cat: key, scalar: [x[key], y[key]] });
  }
  return diffs;
}

function printDiffs(label, aName, bName, diffs, maxLines) {
  console.log(`\nDIFF  ${label}  (${aName} vs ${bName})`);
  for (const d of diffs) {
    if (d.scalar) {
      console.log(`  ${d.cat}: ${d.scalar[0]} != ${d.scalar[1]}`);
      continue;
    }
    if (d.nullMismatch) {
      console.log(`  ${d.cat}: ${d.nullMismatch[0]} != ${d.nullMismatch[1]}  ` +
                  `(one side did not run this check)`);
      continue;
    }
    console.log(`  ${d.cat}: ${d.onlyA.length} only in ${aName}, ${d.onlyB.length} only in ${bName}`);
    for (const line of d.onlyA.slice(0, maxLines)) console.log(`    -${line}`);
    if (d.onlyA.length > maxLines) console.log(`    ... ${d.onlyA.length - maxLines} more`);
    for (const line of d.onlyB.slice(0, maxLines)) console.log(`    +${line}`);
    if (d.onlyB.length > maxLines) console.log(`    ... ${d.onlyB.length - maxLines} more`);
  }
}

// ── Base-path tree ──────────────────────────────────────────────────

// The `basepath` case needs a tree built with a matching --baseurl;
// nothing else in the repo produces one. Build it on demand, into a
// sibling of _site/ so it is covered by docs/.gitignore.
function ensureBasePathTree(dir, allowBuild) {
  const abs = path.resolve(REPO_ROOT, dir);
  if (fs.existsSync(path.join(abs, "index.html"))) return true;
  if (!allowBuild) {
    console.log(`  skipped: ${dir} is absent (pass --build-base-path to build it)`);
    return false;
  }
  console.log(`  building ${dir} with --baseurl ${BASE_PATH} ...`);
  const r = spawnSync(process.execPath, [
    "builder/tbdocs.mjs", "--src", "docs", "--dest", dir,
    "--baseurl", BASE_PATH, "--no-offline", "--no-pdf",
  ], { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stdout ?? "");
    console.error(r.stderr ?? "");
    throw new Error(`base-path build failed (exit ${r.status})`);
  }
  return true;
}

// ── Main ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const o = {
    a: "script", b: "script", cases: [], verbose: false, list: false,
    maxLines: 12, basePathTree: DEFAULT_BASEPATH_TREE, buildBasePath: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--a") o.a = argv[++i];
    else if (x === "--b") o.b = argv[++i];
    else if (x === "--case") o.cases.push(argv[++i]);
    else if (x === "--max-lines") o.maxLines = Number(argv[++i]);
    else if (x === "--base-path-tree") o.basePathTree = argv[++i];
    else if (x === "--build-base-path") o.buildBasePath = true;
    else if (x === "-v" || x === "--verbose") o.verbose = true;
    else if (x === "--self-test") o.selfTest = true;
    else if (x === "--list") o.list = true;
    else if (x === "-h" || x === "--help") { o.help = true; }
    else throw new Error(`unknown argument: ${x}`);
  }
  if (!o.cases.length) o.cases = [...DEFAULT_CASES];
  return o;
}

function printHelp() {
  console.log(`Usage: node scripts/check_links_diff.mjs [options]

  --a SIDE            first implementation  (default: script)
  --b SIDE            second implementation (default: script)
  --case NAME         run only this case; repeatable
  --base-path-tree D  tree for the 'basepath' case (default ${DEFAULT_BASEPATH_TREE})
  --build-base-path   build that tree if it is absent
  --max-lines N       per-category diff lines to print (default 12)
  --self-test         diff script against a deliberately broken side and
                      fail unless the difference is reported
  --list              list cases and sides, then exit
  -v, --verbose       print per-case finding counts even when clean
`);
}

// Guard on the guard. Everything below reduces to "the two sides agreed",
// which is also what a harness that compares nothing says.
function selfTest(opts) {
  // check_links.mjs's own three regression guards first. If the reference
  // implementation is broken, a clean differential against it means
  // nothing -- and since b97c75f nothing else runs them.
  try {
    scriptSelfTest();
    console.log("check_links.mjs self-test ok: base-path, isOutsideBasePath, canonical");
  } catch (e) {
    console.error(`check_links.mjs self-test FAILED: ${e.message}`);
    return 1;
  }

  const argv = CASES.online.argv(CASES.online.root(opts));
  const diffs = diffFindings(SIDES.script.run(argv), SIDES.mutant.run(argv));
  const cats = new Set(diffs.map(d => d.cat));
  const wanted = ["broken", "canonical", "counts.files"];
  const missed = wanted.filter(c => !cats.has(c));
  if (missed.length) {
    console.error(`self-test FAILED: no difference reported for ${missed.join(", ")}`);
    return 1;
  }
  console.log(`self-test ok: mutations detected in ${[...cats].join(", ")}`);
  return 0;
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error(`error: ${e.message}`); process.exit(2); }

  if (opts.help) { printHelp(); return 0; }
  if (opts.selfTest) return selfTest(opts);

  if (opts.list) {
    console.log("Cases:");
    for (const [name, c] of Object.entries(CASES)) {
      const same = c.sameAs ? `  [must equal ${c.sameAs}]` : "";
      console.log(`  ${name.padEnd(21)} ${c.describe}${same}`);
    }
    console.log("\nSides:");
    for (const [name, s] of Object.entries(SIDES)) {
      console.log(`  ${name.padEnd(11)} ${s.describe}`);
    }
    return 0;
  }

  for (const name of [opts.a, opts.b]) {
    if (!SIDES[name]) {
      console.error(`error: unknown side '${name}' (have: ${Object.keys(SIDES).join(", ")})`);
      return 2;
    }
  }
  for (const name of opts.cases) {
    if (!CASES[name]) {
      console.error(`error: unknown case '${name}' (have: ${Object.keys(CASES).join(", ")})`);
      return 2;
    }
  }

  // A bare invocation used to default both sides to `script` and print
  // "No differences across 6 case(s)" having compared nothing. The
  // comparison that costs two builds is the one worth asking for.
  if (opts.a === opts.b) {
    console.error(
      `error: --a and --b are both '${opts.a}', which compares nothing.
` +
      `  The comparison this harness exists for is --a script --b fused.
` +
      `  (--self-test is how to check the harness itself.)`
    );
    return 2;
  }

  console.log(`check_links_diff: ${opts.a} vs ${opts.b}`);

  // findings[side][case]
  const findings = { [opts.a]: {}, [opts.b]: {} };
  let differences = 0;
  let fixtureDir = null;
  const skipped = [];

  const usesFused = opts.a === "fused" || opts.b === "fused";

  for (const name of opts.cases) {
    const c = CASES[name];
    // The fused pass checks what the build produced, so it has nothing
    // to say about a --root-dir shape variation or a synthetic tree.
    if (usesFused && !c.fused) {
      skipped.push(`${name} (no fused equivalent)`);
      continue;
    }
    // The fused side *builds* the tree the script side then reads, so
    // the build has to happen before either side runs. Getting this
    // wrong compares the script's view of the previous build against
    // the new one, which shows up as phantom differences.
    if (usesFused) {
      if (c.fused.dest) opts.basePathTree = c.fused.dest;
      fusedBuild(c.fused);
    } else if (c.fused?.src && c.fused.src !== "docs") {
      // The tree is one this harness produces, so it has to exist even
      // when neither side is `fused` -- otherwise --a script --b index
      // reads an empty directory and reports every category as absent
      // on both sides, which looks like agreement about nothing.
      fusedBuild(c.fused);
    } else if (c.needsBasePathTree && !ensureBasePathTree(opts.basePathTree, opts.buildBasePath)) {
      skipped.push(name);
      continue;
    }
    if (c.needsFixture && !opts.fixtureDir) {
      opts.fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "link-check-fixture-"));
      fixtureDir = opts.fixtureDir;
      writeFixture(opts.fixtureDir);
    }
    const root = c.root(opts);
    const argv = c.argv(root);

    const t0 = performance.now();
    const perSide = {};
    for (const side of new Set([opts.a, opts.b])) {
      perSide[side] = SIDES[side].run(argv, { case: name, root });
      findings[side][name] = perSide[side];
    }
    const ms = performance.now() - t0;

    // A fixture that stops provoking a category goes quietly back to
    // empty-vs-empty, which is what every other case already is. Assert
    // the counts on BOTH sides: a category only one side reports shows up
    // in the diff, but one that both stopped reporting would not.
    if (c.expect) {
      for (const side of new Set([opts.a, opts.b])) {
        for (const [cat, want] of Object.entries(c.expect)) {
          const got = perSide[side][cat];
          const n = got === null ? null : Array.isArray(got) ? got.length : got;
          if (n === want) continue;
          const wanted = want === null ? "the check not to run" : `${want} finding(s)`;
          console.log(`\nFIXTURE  [${side}] ${cat}: expected ${wanted}, got ` +
                      `${n === null ? "null (did not run)" : n}`);
          if (Array.isArray(got)) for (const line of got) console.log(`    ${line}`);
          differences++;
        }
      }
    }

    const diffs = opts.a === opts.b ? [] : diffFindings(perSide[opts.a], perSide[opts.b]);
    if (diffs.length) {
      differences += diffs.length;
      printDiffs(name, opts.a, opts.b, diffs, opts.maxLines);
    } else {
      const f = perSide[opts.a];
      const note = opts.verbose
        ? `  ${f.counts.files} files, ${f.counts.occurrences} occurrences, ` +
          `${f.counts.brokenUnique} broken, ${f.counts.integrity} integrity`
        : "";
      console.log(`  ok  ${name.padEnd(11)} ${(ms / 1000).toFixed(2)}s${note}`);
    }
  }

  // Cross-case invariants: a case declaring `sameAs` must reach the
  // same findings as its twin, on every side. This is where a
  // coordinate-space slip shows up -- relative vs absolute --root-dir
  // produce the same conclusions or the index keys are wrong.
  for (const name of opts.cases) {
    const twin = CASES[name].sameAs;
    if (!twin || !opts.cases.includes(twin)) continue;
    for (const side of new Set([opts.a, opts.b])) {
      const x = findings[side][name], y = findings[side][twin];
      if (!x || !y) continue;
      const diffs = diffFindings(x, y);
      if (diffs.length) {
        differences += diffs.length;
        printDiffs(`${name} vs ${twin}`, name, twin, diffs, opts.maxLines);
      } else {
        console.log(`  ok  ${`${name}=${twin}`.padEnd(11)} same findings on side '${side}'`);
      }
    }
  }

  if (fixtureDir) fs.rmSync(fixtureDir, { recursive: true, force: true });

  if (skipped.length) {
    console.log(`\nskipped: ${skipped.join(", ")}`);
  }
  if (differences) {
    console.log(`\n${differences} difference(s) -- the two sides do not agree.`);
    return 1;
  }
  console.log(`\nNo differences across ${opts.cases.length - skipped.length} case(s).`);
  return 0;
}

process.exit(main());
