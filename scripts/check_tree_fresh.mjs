// Refuse to scan a stale build.
//
// check.bat reads whatever docs/_site-offline/ happens to hold. Edit a
// page, run check.bat without rebuilding, and it audits the PREVIOUS
// build and passes -- a green run that says nothing about the change
// just made. CI never hits this because it builds in the same job; a
// dev box hits it every time the two commands are run out of order.
//
// The test is a newest-mtime comparison: anything under the source tree
// (and the parts of the repo that decide what the build emits) newer
// than the built tree's index.html means the tree on disk predates the
// current sources. Precision is not the goal -- the goal is that the
// common mistake stops being silent.
//
// Usage:
//   node scripts/check_tree_fresh.mjs [--tree DIR] [--marker FILE] [--source DIR ...]
//
// Exits 0 when the tree is at least as new as its inputs, 1 when it is
// stale (naming build.bat), 2 when the tree is absent, the command line is refused or
// the check crashes.
//
// `--marker` names the file inside the tree whose mtime stands for the
// build. It defaults to index.html, which every tree has EXCEPT
// docs/_site-pdf/ -- that one holds a single book.html. Without the
// option `--tree docs/_site-pdf` looked for an index.html that never
// exists and exited 2, so the flag was there but the PDF source tree
// could not actually be checked with it. book.bat passes
// `--marker book.html`.

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { isOutputTree } from "../lib/markdown-files.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";

exitOnCrash();

// Output trees live under docs/, so walking docs/ naively would compare
// the build against itself and always pass. They are skipped at the top of
// each source root by the prefix list the markdown walk uses, in
// lib/markdown-files.mjs. A list of names would miss siblings such as
// _site-basepath-offline and _site-basepath-pdf, which a build into
// _site-basepath writes, and they would be read as sources. These two are
// skipped at every depth.
const IGNORED_DIRS = new Set([".git", "node_modules"]);

// Files the build WRITES into a source directory. They are outputs, so their
// mtime says nothing about whether the tree is current -- and because the build
// writes them after the tree, including one would mark every fresh tree stale.
// page-baseline.json is written by the drift guard whenever the page count
// rises (builder/page-baseline.mjs), so `build.bat && check.bat` would have
// failed on the next run after any page addition. symbol-baseline.json is the
// same for the symbol index's URLs (builder/symbol-baseline.mjs), and is
// rewritten by any build that adds a heading. package-api.json is not here: the
// build reads it, and it decides the bytes of tB/symbols.json.
const IGNORED_FILES = new Set(["page-baseline.json", "symbol-baseline.json"]);

// The inputs that decide the built bytes. The source tree is the obvious
// one; the builder and the theme sources matter just as much, and are
// what a maintainer is most likely to be editing when they run these two
// commands in the wrong order. lib/ holds modules the builder shares with
// the other tools, so an edit there can change the build too.
const DEFAULT_SOURCES = ["docs", "builder", "lib"];
const DEFAULT_TREE = "docs/_site-offline";
const DEFAULT_MARKER = "index.html";

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      tree: { type: "string", default: DEFAULT_TREE },
      marker: { type: "string", default: DEFAULT_MARKER },
      source: { type: "string", multiple: true },
      help: { type: "boolean", short: "h" },
    },
    stopAt: ["help"],
  }),
);
if (cli.stopped === "help") {
  printHelpAndExit(
    "usage: node scripts/check_tree_fresh.mjs [--tree DIR] [--marker FILE] [--source DIR ...] [-h, --help]\n" +
      "\n" +
      "Exit codes:\n" +
      "  0  the tree is at least as new as its inputs\n" +
      "  1  the tree is stale; run build.bat\n" +
      "  2  the check could not run: a refused command line, no built tree or marker file,\n" +
      "     or a crash",
  );
}
let tree = cli.values.tree;
let markerName = cli.values.marker;
const sources = cli.values.source;
if (!sources.length) sources.push(...DEFAULT_SOURCES);

const treeDir = resolve(REPO_ROOT, tree);
const marker = join(treeDir, markerName);
if (!existsSync(marker)) {
  console.error(
    `check_tree_fresh: ${relative(REPO_ROOT, marker).replaceAll(sep, "/")} does not exist.\n` +
      `  Run build.bat first -- there is no built tree to check.`,
  );
  process.exit(2);
}
const builtAt = statSync(marker).mtimeMs;

// Newest mtime under `dir`, with the build's own outputs skipped.
// Returns { path, mtimeMs } or null for an absent directory.
function newestUnder(dir) {
  let best = null;
  const walk = (d, top) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (IGNORED_DIRS.has(e.name) || (top && isOutputTree(e.name))) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) {
        walk(p, false);
        continue;
      }
      if (!e.isFile() || IGNORED_FILES.has(e.name)) continue;
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (!best || st.mtimeMs > best.mtimeMs) best = { path: p, mtimeMs: st.mtimeMs };
    }
  };
  walk(dir, true);
  return best;
}

let newest = null;
for (const s of sources) {
  const found = newestUnder(resolve(REPO_ROOT, s));
  if (found && (!newest || found.mtimeMs > newest.mtimeMs)) newest = found;
}

if (newest && newest.mtimeMs > builtAt) {
  const rel = relative(REPO_ROOT, newest.path).replaceAll(sep, "/");
  const ageS = ((newest.mtimeMs - builtAt) / 1000).toFixed(0);
  console.error(
    `check_tree_fresh: ${tree} is ${ageS}s older than ${rel}.\n` +
      `  Run build.bat first. Scanning a stale tree reports a pass for the\n` +
      `  previous build, which is the one thing these gates must never do.`,
  );
  process.exit(1);
}

process.exit(0);
