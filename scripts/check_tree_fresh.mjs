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
// stale (naming build.bat), 2 when the tree is absent.
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
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Output trees live under docs/, so walking docs/ naively would compare
// the build against itself and always pass. Everything the build writes
// is excluded by name.
const IGNORED_DIRS = new Set([
  "_site", "_site-offline", "_site-pdf", "_site-basepath", "_serve", "_pdf",
  ".git", "node_modules",
]);

// Files the build WRITES into a source directory. They are outputs, so their
// mtime says nothing about whether the tree is current -- and because the build
// writes them after the tree, including one would mark every fresh tree stale.
// page-baseline.json is written by the drift guard whenever the page count
// rises (builder/page-baseline.mjs), so `build.bat && check.bat` would have
// failed on the next run after any page addition.
// census_attributes.mjs lives under builder/ but decides none of the built
// bytes -- it censuses twinBASIC package sources and never runs during a build.
// Without this, editing it marks every output tree stale, which blocks check.bat
// and makes book.bat refuse to render, for a tool the build never calls. Same
// reasoning as page-baseline.json: the sources this script watches are "the
// inputs that decide the built bytes", and neither file is one.
const IGNORED_FILES = new Set(["page-baseline.json", "census_attributes.mjs"]);

// The inputs that decide the built bytes. The source tree is the obvious
// one; the builder and the theme sources matter just as much, and are
// what a maintainer is most likely to be editing when they run these two
// commands in the wrong order.
const DEFAULT_SOURCES = ["docs", "builder"];
const DEFAULT_TREE = "docs/_site-offline";
const DEFAULT_MARKER = "index.html";

let tree = DEFAULT_TREE;
let markerName = DEFAULT_MARKER;
const sources = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--tree" && argv[i + 1]) tree = argv[++i];
  else if (argv[i] === "--marker" && argv[i + 1]) markerName = argv[++i];
  else if (argv[i] === "--source" && argv[i + 1]) sources.push(argv[++i]);
  else if (argv[i] === "-h" || argv[i] === "--help") {
    console.log(
      "usage: node scripts/check_tree_fresh.mjs [--tree DIR] [--marker FILE] [--source DIR ...]",
    );
    process.exit(0);
  } else {
    console.error(`unknown arg: ${argv[i]}`);
    process.exit(2);
  }
}
if (!sources.length) sources.push(...DEFAULT_SOURCES);

const treeDir = resolve(REPO_ROOT, tree);
const marker = join(treeDir, markerName);
if (!existsSync(marker)) {
  console.error(
    `check_tree_fresh: ${relative(REPO_ROOT, marker).replaceAll(sep, "/")} does not exist.\n` +
    `  Run build.bat first -- there is no built tree to check.`
  );
  process.exit(2);
}
const builtAt = statSync(marker).mtimeMs;

// Newest mtime under `dir`, with the build's own outputs skipped.
// Returns { path, mtimeMs } or null for an absent directory.
function newestUnder(dir) {
  let best = null;
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (IGNORED_DIRS.has(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.isFile() || IGNORED_FILES.has(e.name)) continue;
      let st;
      try { st = statSync(p); } catch { continue; }
      if (!best || st.mtimeMs > best.mtimeMs) best = { path: p, mtimeMs: st.mtimeMs };
    }
  };
  walk(dir);
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
    `  previous build, which is the one thing these gates must never do.`
  );
  process.exit(1);
}

process.exit(0);
