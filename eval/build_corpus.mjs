#!/usr/bin/env node
// Build the documentation-only corpus the use-case evaluation runs against.
//
// The corpus is a mirror of the repository in which every executable source
// file has been replaced by an unreadable stub. That makes "documentation
// only, no reading the implementation" a property of the tree rather than an
// instruction an evaluator has to be trusted to follow -- which matters,
// because a capable evaluator that quietly reads the source measures how good
// the source is, reports a clean pass, and tells you nothing about the docs.
//
//     node eval/build_corpus.mjs [--dest <path>] [--src <path>] [--quiet]
//
// See eval/README.md for how a round uses it.

import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { isOutputTree } from "../lib/markdown-files.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// What stays readable is an ALLOWLIST, and that is the whole design.
//
// The obvious shape is a denylist of source extensions -- .mjs, .py, .scss and
// so on. It is the same mistake builder/publish-policy.mjs exists to correct,
// and the argument transfers exactly: a denylist only refuses what somebody
// thought to name in advance. Add a .ts, a .rs or a .psm1 to this repository
// and it silently becomes readable, the round's central guarantee is void, and
// nothing reports it -- the round just measures something easier than it
// claims to.
//
// Inverted, a new source type shows up in the "stubbed" line of the summary
// the first time it appears. Print that line; it is the drift detector.
// ---------------------------------------------------------------------------

/** Extensions whose contents an evaluator may read. Prose and configuration. */
const READABLE_EXTENSIONS = new Set([
  ".md",      // every page, plan, README and note -- the corpus proper
  ".yml",     // _config.yml, _book.yml, CI workflows: configuration a reader edits
  ".yaml",
  ".dot",     // Graphviz diagram sources are authored content, not implementation
  ".txt",
]);

/** Extensionless files that stay readable, matched on basename. */
const READABLE_NAMES = new Set(["CNAME", "LICENSE", ".gitignore", ".nojekyll"]);

/** Binary and generated assets. Omitted entirely rather than stubbed: an
 *  evaluator cannot read them anyway, and they weigh ~130 MB. */
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pdf", ".zip", ".af", ".wasm", ".exe", ".dll",
]);

/** Directories and files never mirrored: dependencies, local state, and the
 *  harness's own working data. The build's output trees are the other thing
 *  never mirrored, and isExcluded finds those by name. */
const EXCLUDED_PATHS = [
  ".git", "node_modules", ".claude", ".claire", ".font-cache",
  // Gitignored and local: a one-line "@WIP.md" import shim that no clone
  // has. Mirrored, it points every evaluator at a file WITHHELD removes ---
  // round 7's UC-40 evaluator opened it first and reported the dead end.
  "CLAUDE.md",
  "docs/assets/fonts",
  "wisdom/data", "perf/results", "package-lock.json",
  // The harness itself. eval/usecases.md names the hazard each case probes,
  // so leaving it in the corpus hands every evaluator the answer key.
  "eval",
];

/** Withheld by name, each for a stated reason. These are deliberate parts of
 *  the experiment's design, not incidental filters. */
const WITHHELD = [
  {
    match: (rel) => rel === "WIP.md" || /^WIP\..+\.md$/.test(rel),
    why: "maintainer's private notes -- withheld so that \"the answer exists " +
         "only in WIP.md\" is a measurable outcome rather than an invisible rescue",
  },
  {
    match: (rel) => /(^|\/)REVIEW-USECASES-[^/]*\.md$/.test(rel),
    why: "this harness's own prior output -- a direct answer key",
  },
];

// Other builder/REVIEW-*.md and PLAN-REVIEW-*.md files are NOT withheld, and
// the distinction is deliberate. They are audit snapshots a real developer has
// in the tree, and round 1 produced a genuine finding precisely because one was
// present: the only in-tree document naming docs/_sass/custom/_fonts.scss was a
// frozen snapshot that builder/README.md explicitly disclaims as "not
// maintained reference documentation". Withholding those would measure a
// repository nobody works in.

const STUB = "/* [ source withheld for this exercise -- treat this file as unreadable ] */\n";

function parseArgs(argv) {
  const o = { src: REPO_ROOT, dest: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--src") o.src = path.resolve(argv[++i]);
    else if (argv[i] === "--dest") o.dest = path.resolve(argv[++i]);
    else if (argv[i] === "--quiet") o.quiet = true;
    else if (argv[i] === "--help" || argv[i] === "-h") o.help = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return o;
}

function isExcluded(rel) {
  // The build's output trees under docs/, by the test every tool that walks
  // docs/ uses. This list used to name them, and a build given --dest
  // docs/_site-basepath also writes _site-basepath-offline and
  // _site-basepath-pdf, which it missed.
  const [top, sub] = rel.split("/");
  if (top === "docs" && sub !== undefined && isOutputTree(sub)) return true;
  return EXCLUDED_PATHS.some((p) => rel === p || rel.startsWith(p + "/"));
}

function classify(rel) {
  for (const w of WITHHELD) if (w.match(rel)) return { kind: "withheld", why: w.why };
  const ext = path.extname(rel).toLowerCase();
  const base = path.basename(rel);
  if (BINARY_EXTENSIONS.has(ext)) return { kind: "binary", ext };
  if (READABLE_EXTENSIONS.has(ext) || READABLE_NAMES.has(base)) {
    return { kind: "readable", ext: ext || base };
  }
  return { kind: "stubbed", ext: ext || base };
}

function* walk(dir, srcRoot) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(srcRoot, abs).split(path.sep).join("/");
    if (isExcluded(rel)) continue;
    if (entry.isDirectory()) yield* walk(abs, srcRoot);
    else if (entry.isFile()) yield { abs, rel };
  }
}

function build({ src, dest, quiet }) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  const counts = { readable: new Map(), stubbed: new Map(), binary: 0, withheld: [] };
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const { abs, rel } of walk(src, src)) {
    const c = classify(rel);
    if (c.kind === "binary") { counts.binary++; continue; }
    if (c.kind === "withheld") { counts.withheld.push({ rel, why: c.why }); continue; }

    const out = path.join(dest, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (c.kind === "readable") {
      // LF, as the repository stores it. A Windows checkout with autocrlf
      // hands the corpus CRLF, and a permalink grep anchored with `$` then
      // matches nothing: round 9's UC-63 evaluator reported a working link
      // as broken, three times over, from exactly that. latin1 maps every byte
      // to one character and back, so nothing but the CRs changes.
      fs.writeFileSync(out, fs.readFileSync(abs, "latin1").replace(/\r\n/g, "\n"), "latin1");
      bump(counts.readable, c.ext);
    } else {
      fs.writeFileSync(out, STUB);
      bump(counts.stubbed, c.ext);
    }
  }

  if (!quiet) report(dest, counts);
  return counts;
}

function report(dest, counts) {
  const fmt = (m) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ");
  const total = (m) => [...m.values()].reduce((a, b) => a + b, 0);

  console.log(`corpus: ${dest}`);
  console.log(`  readable  ${String(total(counts.readable)).padStart(5)}  ${fmt(counts.readable)}`);
  console.log(`  stubbed   ${String(total(counts.stubbed)).padStart(5)}  ${fmt(counts.stubbed)}`);
  console.log(`  binary    ${String(counts.binary).padStart(5)}  omitted`);
  const byReason = new Map();
  for (const w of counts.withheld) {
    if (!byReason.has(w.why)) byReason.set(w.why, []);
    byReason.get(w.why).push(w.rel);
  }
  for (const [why, rels] of byReason) {
    const shown = rels.length > 3 ? `${rels.slice(0, 3).join(", ")} +${rels.length - 3} more` : rels.join(", ");
    console.log(`  withheld  ${String(rels.length).padStart(5)}  ${shown}\n              ${why}`);
  }
  console.log(
    "\nThe stubbed line is the drift detector: a source type this repository " +
    "\ngained shows up there the first time it appears. If one of those " +
    "\nextensions belongs in the corpus as prose, add it to READABLE_EXTENSIONS " +
    "\nrather than widening anything else."
  );
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.dest) {
  console.log(
    "Usage: node eval/build_corpus.mjs --dest <path> [--src <path>] [--quiet]\n\n" +
    "Mirrors the repository with every non-prose file replaced by an unreadable\n" +
    "stub, so a documentation evaluation cannot silently read the implementation.\n" +
    "See eval/README.md."
  );
  process.exit(opts.help ? 0 : 1);
}
build(opts);
