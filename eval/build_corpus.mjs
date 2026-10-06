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
//     node eval/build_corpus.mjs [--dest <path>] [--repo <path>] [--quiet]
//
// See eval/README.md for how a round uses it.

import fs from "node:fs";
import path from "node:path";

import { CliError, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { isOutputTree } from "../lib/markdown-files.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";

exitOnCrash();

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
  ".md", // every page, plan, README and note -- the corpus proper
  ".yml", // _config.yml, _book.yml, CI workflows: configuration a reader edits
  ".yaml",
  ".dot", // Graphviz diagram sources are authored content, not implementation
  ".txt",
]);

/** Extensionless files that stay readable, matched on basename. */
const READABLE_NAMES = new Set(["CNAME", "LICENSE", ".gitignore", ".nojekyll"]);

/** Binary and generated assets. Omitted entirely rather than stubbed: an
 *  evaluator cannot read them anyway, and they weigh ~130 MB. */
// biome-ignore format: a table, one entry per line
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pdf", ".zip", ".af", ".wasm", ".exe", ".dll",
]);

/** Directories and files never mirrored: dependencies, local state, and the
 *  harness's own working data. The build's output trees are the other thing
 *  never mirrored, and isExcluded finds those by name. */
const EXCLUDED_PATHS = [
  ".git",
  "node_modules",
  ".claude",
  ".claire",
  ".font-cache",
  // Gitignored and local: a one-line "@WIP.md" import shim that no clone
  // has. Mirrored, it points every evaluator at a file WITHHELD removes, and
  // the evaluator reports a dead end.
  "CLAUDE.md",
  "docs/assets/fonts",
  "wisdom/data",
  "perf/results",
  "package-lock.json",
  // The harness itself. eval/usecases.md names the hazard each case probes,
  // so leaving it in the corpus hands every evaluator the answer key.
  "eval",
];

/** Withheld by name, each for a stated reason. These are deliberate parts of
 *  the experiment's design, not incidental filters. */
const WITHHELD = [
  {
    match: (rel) => rel === "WIP.md" || /^WIP\..+\.md$/.test(rel),
    why:
      "maintainer's private notes -- withheld so that \"the answer exists " +
      'only in WIP.md" is a measurable outcome rather than an invisible rescue',
  },
  {
    match: (rel) => /(^|\/)REVIEW-USECASES-[^/]*\.md$/.test(rel),
    why: "this harness's own prior output -- a direct answer key",
  },
];

// Other builder/REVIEW-*.md and PLAN-REVIEW-*.md files are NOT withheld, and
// the distinction is deliberate. They are audit snapshots a real developer has
// in the tree, and their presence can produce a genuine finding: a frozen
// snapshot that builder/README.md disclaims as "not maintained reference
// documentation" can be the only in-tree document naming a file. Withholding
// those would measure a repository nobody works in.

const STUB = "/* [ source withheld for this exercise -- treat this file as unreadable ] */\n";

// Whether `inner` is `outer` or lies under it; path.relative compares
// case-insensitively on Windows.
function isInside(outer, inner) {
  const rel = path.relative(outer, inner);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

// build() empties `dest` before it writes anything, so a `dest` that is or
// contains a folder the tool runs from or reads would delete it.
function refuseDest(dest, repo) {
  const doomed = [
    ["the repository root", REPO_ROOT],
    ["the current folder", process.cwd()],
    [`--repo ${repo}`, repo],
  ];
  for (const [what, folder] of doomed) {
    if (isInside(dest, path.resolve(folder))) {
      throw new CliError(
        "bad-dest",
        `refusing --dest ${dest}: it is or contains ${what}, which cleaning it would delete`,
        { option: "--dest", value: dest },
      );
    }
  }
  // A `dest` inside the tree being mirrored is walked too, so the mirror reads
  // back what it is writing, unless the walk passes over that folder.
  if (isInside(repo, dest) && !isExcluded(path.relative(repo, dest).split(path.sep).join("/"))) {
    throw new CliError(
      "bad-dest",
      `refusing --dest ${dest}: it is inside ${repo}, which the corpus mirrors, so the mirror would copy itself`,
      { option: "--dest", value: dest },
    );
  }
}

function parseArgs(argv) {
  const { values } = withUsageError(() => {
    const cli = parseCli(argv, {
      options: {
        repo: { type: "string" },
        dest: { type: "string" },
        quiet: { type: "boolean", default: false },
        help: { type: "boolean", short: "h" },
      },
      positionals: 0,
      stopAt: ["help"],
    });
    if (cli.stopped !== "help" && "dest" in cli.values) {
      refuseDest(path.resolve(cli.values.dest), "repo" in cli.values ? path.resolve(cli.values.repo) : REPO_ROOT);
    }
    return cli;
  });
  return {
    repo: "repo" in values ? path.resolve(values.repo) : REPO_ROOT,
    dest: "dest" in values ? path.resolve(values.dest) : null,
    quiet: values.quiet,
    help: values.help,
  };
}

function isExcluded(rel) {
  // The build's output trees under docs/, by the test every tool that walks
  // docs/ uses. A list of names would miss the siblings a build given --dest
  // docs/_site-basepath also writes: _site-basepath-offline and
  // _site-basepath-pdf.
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

function* walk(dir, repoRoot) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
    if (isExcluded(rel)) continue;
    if (entry.isDirectory()) yield* walk(abs, repoRoot);
    else if (entry.isFile()) yield { abs, rel };
  }
}

function build({ repo, dest, quiet }) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  const counts = { readable: new Map(), stubbed: new Map(), binary: 0, withheld: [] };
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const { abs, rel } of walk(repo, repo)) {
    const c = classify(rel);
    if (c.kind === "binary") {
      counts.binary++;
      continue;
    }
    if (c.kind === "withheld") {
      counts.withheld.push({ rel, why: c.why });
      continue;
    }

    const out = path.join(dest, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (c.kind === "readable") {
      // LF, as the repository stores it. A Windows checkout with autocrlf
      // hands the corpus CRLF, and a permalink grep anchored with `$` then
      // matches nothing, so a working link reads as broken. latin1 maps every byte
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
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ${n}`)
      .join(", ");
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
      "\nrather than widening anything else.",
  );
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.dest) {
  printHelpAndExit(
    "Usage: node eval/build_corpus.mjs --dest <path> [--repo <path>] [--quiet] [-h, --help]\n\n" +
      "Mirrors the repository with every non-prose file replaced by an unreadable\n" +
      "stub, so a documentation evaluation cannot silently read the implementation.\n" +
      "See eval/README.md.\n\n" +
      "Exit codes:\n" +
      "  0  the corpus was built\n" +
      "  2  a refused command line (a --dest that is or contains the repository, the\n" +
      "     working folder or --repo, or lies inside the tree it mirrors), or a crash",
    opts.help ? {} : { stream: "stderr", exitCode: 2 },
  );
}
build(opts);
