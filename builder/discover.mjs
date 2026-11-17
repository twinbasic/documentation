// Phase 1 of tbdocs: walk the source tree once and produce a normalized
// inventory that every later phase consumes. See builder/PLAN-1.md for the
// full spec, design decisions, and edge-case handling.
//
// It is three steps, so that the build can give the middle one to its lanes
// (tbdocs.mjs: discoverList, discoverRead:i, discover): listSources and
// cutPieces on the main thread, discover-read.mjs's readPiece for each piece,
// which is every file opened, and assemble on the main thread again.
// `discover` is the same steps in one call and one piece, for the tools that
// want the inventory and have no lanes.

import fg from "fast-glob";
import path from "node:path";

import { PAGE_EXT, readPiece, toPosix } from "./discover-read.mjs";
import { picturePairs } from "./theme-pictures.mjs";

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

/**
 * A listing cut into `count` pieces for readPiece, and what assemble needs to
 * put their results together. `extra` is the static files from outside the
 * tree ({ src, dest }, `src` relative to the source root: _config.yml's
 * bundle_extra), which are sized and paired with the others.
 *
 * Piece i holds every count-th page file, static file and picture pair from
 * the i-th on, so that each piece has its share of every folder: the listing
 * is sorted, and a folder's files are alike in size.
 */
export function cutPieces({ pageRels, otherRels }, count, extra = []) {
  const statics = [
    ...otherRels.map((rel) => ({ srcRel: toPosix(rel), src: rel, extra: false })),
    ...extra.map((e) => ({ srcRel: e.dest, src: e.src, extra: true })),
  ];
  const pairs = picturePairs(statics);
  const pieces = Array.from({ length: Math.max(1, count) }, () => ({ pageRels: [], statSrcs: [], pairs: [] }));
  const share = (list, add) => {
    for (const [i, item] of list.entries()) add(pieces[i % pieces.length], item);
  };
  share(pageRels, (piece, rel) => piece.pageRels.push(rel));
  share(statics, (piece, s) => piece.statSrcs.push(s.src));
  share(pairs, (piece, [, light, dark]) => piece.pairs.push([light, dark]));
  return { pieces, statics, pairs };
}

/**
 * The inventory, from cutPieces' plan and each piece's result (readPiece), in
 * the pieces' order: the pages and the static files, sorted, with the files
 * from outside the tree after the others, and the picture pairs' sizes.
 */
export function assemble(srcRoot, { pieces, statics, pairs }, results) {
  const count = pieces.length;
  // Item j of a shared-out list is item floor(j / count) of piece j % count.
  const from = (j, field) => results[j % count][field][Math.floor(j / count)];
  const pages = [];
  const staticFiles = [];
  const extras = [];
  for (const result of results) {
    for (const page of result.pages) pages.push(page);
    for (const { srcRel, size } of result.plain) {
      staticFiles.push({ srcPath: path.join(srcRoot, srcRel), srcRel, destRel: srcRel, size });
    }
  }
  for (const [j, s] of statics.entries()) {
    const srcPath = s.extra ? path.resolve(srcRoot, s.src) : path.join(srcRoot, s.src);
    (s.extra ? extras : staticFiles).push({ srcPath, srcRel: s.srcRel, destRel: s.srcRel, size: from(j, "sizes") });
  }
  sortInventory(pages, staticFiles);
  staticFiles.push(...extras);
  const pictureSizes = Object.create(null);
  for (const [j, [light]] of pairs.entries()) {
    const size = from(j, "pairSizes");
    if (size) pictureSizes[light] = size;
  }
  return { pages, staticFiles, pictureSizes };
}

// Puts the pages and the static files in the order every later phase relies
// on, in place.
//
// Jekyll sorts site.pages by basename (`name` = basename with extension) via
// `lib/jekyll/reader.rb:44`'s `site.pages.sort_by!(&:name)`. Mirror that, but
// with an explicit `srcRel` tie-break rather than by leaning on Array#sort's
// stability.
//
// Stability is not enough here, and the reason is easy to miss: the pages
// arrive piece by piece, NOT in the listing's order, and before the pieces
// they arrived as each file's read resolved. A stable sort then preserves that
// order for every tied basename -- and ~111 folder-style classes are all named
// `index.md`, so the ties are not rare. Two builds of identical sources
// ordered those pages differently, which reordered `search-data.json` (545 of
// 3724 entries moved between two runs of the same commit) and made the file
// non-reproducible.
//
// Static files keep the full-path sort -- Jekyll's reader sorts them with
// `site.static_files.sort_by!(&:relative_path)`, which is what `bySrcRel`
// does.
function sortInventory(pages, staticFiles) {
  pages.sort(byName);
  staticFiles.sort(bySrcRel);
}

export async function discover(srcRoot, ignore = []) {
  const plan = cutPieces(await listSources(srcRoot, ignore), 1);
  const result = readPiece(srcRoot, plan.pieces[0]);
  for (const w of result.warnings) console.warn(w);
  const { pages, staticFiles } = assemble(srcRoot, plan, [result]);
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
