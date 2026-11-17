// Phase 1 of tbdocs: walk the source tree once and produce a normalized
// inventory that every later phase consumes. See builder/PLAN-1.md for the
// full spec, design decisions, and edge-case handling.
//
// The build does it in steps, so that the lanes read the pages (tbdocs.mjs:
// discoverList, discoverRead:i, discoverStatic, discover): listSources, then
// discover-read.mjs's readPages on the lanes beside statFiles on the main
// thread, then sortInventory. `discover` is the same steps in one call, for
// the tools that want the inventory and have no lanes.

import fg from "fast-glob";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PAGE_EXT, buildPage, readFrontmatter, toPosix } from "./discover-read.mjs";

/**
 * The files under `srcRoot` that `ignore` does not leave out, sorted, in two
 * lists: the .md and .html files, each a page if it has frontmatter, and the
 * others, which are static files.
 */
export async function listSources(srcRoot, ignore = []) {
  const allFiles = await fg("**/*", {
    cwd: srcRoot,
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore,
  });
  allFiles.sort();
  const pageRels = [];
  const otherRels = [];
  for (const srcRel of allFiles) (PAGE_EXT.test(srcRel) ? pageRels : otherRels).push(srcRel);
  return { pageRels, otherRels };
}

/** The static-file entries of `srcRels`, each with its size. */
export function statFiles(srcRoot, srcRels) {
  return Promise.all(
    srcRels.map(async (srcRel) => {
      const srcPath = path.join(srcRoot, srcRel);
      const stat = await fs.stat(srcPath);
      const srcRelPosix = toPosix(srcRel);
      return { srcPath, srcRel: srcRelPosix, destRel: srcRelPosix, size: stat.size };
    }),
  );
}

/**
 * Puts the pages and the static files in the order every later phase relies
 * on, in place.
 *
 * Jekyll sorts site.pages by basename (`name` = basename with extension) via
 * `lib/jekyll/reader.rb:44`'s `site.pages.sort_by!(&:name)`. Mirror that, but
 * with an explicit `srcRel` tie-break rather than by leaning on Array#sort's
 * stability.
 *
 * Stability is not enough here, and the reason is easy to miss: the pages
 * arrive in the order their files were read, which is not the order of the
 * listing. A stable sort then preserves that order for every tied basename --
 * and ~111 folder-style classes are all named `index.md`, so the ties are not
 * rare. Two builds of identical sources ordered those pages differently, which
 * reordered `search-data.json` (545 of 3724 entries moved between two runs of
 * the same commit) and made the file non-reproducible.
 *
 * Static files keep the full-path sort -- Jekyll's reader sorts them with
 * `site.static_files.sort_by!(&:relative_path)`, which is what `bySrcRel` does.
 */
export function sortInventory(pages, staticFiles) {
  pages.sort(byName);
  staticFiles.sort(bySrcRel);
}

export async function discover(srcRoot, ignore = []) {
  const { pageRels, otherRels } = await listSources(srcRoot, ignore);
  const pages = [];
  const plain = [];
  const warnings = [];
  await Promise.all(
    pageRels.map(async (srcRel) => {
      const raw = await fs.readFile(path.join(srcRoot, srcRel), "utf8");
      const parsed = readFrontmatter(raw, srcRel, warnings);
      if (parsed) pages.push(buildPage(srcRoot, srcRel, parsed));
      // .md/.html without frontmatter falls through to static treatment.
      else plain.push(srcRel);
    }),
  );
  for (const w of warnings) console.warn(w);
  const staticFiles = await statFiles(srcRoot, [...otherRels, ...plain]);
  sortInventory(pages, staticFiles);
  return { pages, staticFiles };
}

function basename(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}

function byName(a, b) {
  const an = basename(a.srcRel);
  const bn = basename(b.srcRel);
  if (an !== bn) return an < bn ? -1 : 1;
  return bySrcRel(a, b);
}

function bySrcRel(a, b) {
  return a.srcRel < b.srcRel ? -1 : a.srcRel > b.srcRel ? 1 : 0;
}
