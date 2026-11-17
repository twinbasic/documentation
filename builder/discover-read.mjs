// The part of discover that opens files: a page's frontmatter split off and
// parsed into the page object every later phase consumes, a static file's
// size, and a picture pair's dimensions. Apart from discover.mjs so that a lane
// can run it after loading no more than this, the YAML parser and paths.mjs
// (the first stage of a lane's boot, cpu-worker.mjs): discover.mjs itself
// loads the glob library, which only the main thread needs.
//
// Everything here is synchronous. A lane has nothing else to do while it
// reads, and several lanes reading at once is what makes it parallel; the
// asynchronous calls would all queue on libuv's one pool of four threads.

import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import path from "node:path";

import { parseFrontmatter, unquotedHashValues } from "../lib/frontmatter.mjs";
import { permalinkToDestPath } from "./paths.mjs";

export const PAGE_EXT = /\.(md|html)$/i;
const IMAGE_SCOPE = /(^|\/)Images\//;

export const toPosix = (p) => p.replace(/\\/g, "/");

/**
 * One piece of the source tree (discover.mjs, cutPieces), read one file after
 * the other. Every path is relative to `srcRoot`.
 *
 * @param {string} srcRoot
 * @param {object} piece
 * @param {string[]} piece.pageRels  .md and .html files
 * @param {string[]} piece.statSrcs  static files to size
 * @param {[string, string][]} piece.pairs  a light picture's file and its dark picture's
 * @returns {{ pages: object[], plain: { srcRel: string, size: number }[], warnings: string[],
 *   sizes: number[], pairSizes: (number[] | null)[] }}
 *   the pages among `pageRels`; the files among them with no frontmatter
 *   (`plain`, which are static files), each with its size; the warnings to
 *   print; the size of each of `statSrcs`; and for each of `pairs`
 *   [lightW, lightH, darkW, darkH], or null when either is no PNG
 */
export function readPiece(srcRoot, { pageRels, statSrcs, pairs }) {
  const pages = [];
  const plain = [];
  const warnings = [];
  for (const srcRel of pageRels) {
    const file = path.join(srcRoot, srcRel);
    const parsed = readFrontmatter(readFileSync(file, "utf8"), srcRel, warnings);
    if (parsed) pages.push(buildPage(srcRoot, srcRel, parsed));
    // .md/.html without frontmatter falls through to static treatment.
    else plain.push({ srcRel: toPosix(srcRel), size: statSync(file).size });
  }
  const sizes = statSrcs.map((src) => statSync(path.resolve(srcRoot, src)).size);
  const pairSizes = pairs.map(([light, dark]) => {
    const l = pngSize(path.resolve(srcRoot, light));
    const d = pngSize(path.resolve(srcRoot, dark));
    return l && d ? [...l, ...d] : null;
  });
  return { pages, plain, warnings, sizes, pairSizes };
}

// A PNG file's width and height in pixels, from its header; null when it is no PNG.
function pngSize(file) {
  const fd = openSync(file, "r");
  try {
    const b = Buffer.alloc(24);
    const bytesRead = readSync(fd, b, 0, 24, 0);
    if (bytesRead < 24 || b.toString("latin1", 12, 16) !== "IHDR") return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } finally {
    closeSync(fd);
  }
}

// Every .md and .html passes through here, and `parseFrontmatter` drops a
// leading BOM, so a page an editor saved with one is still a page rather than
// a static asset served as raw markdown.
//
// `contentLine` is the file's 1-based line on which `content` starts, so a
// message about a line of the content can name the line of the file. The
// content is the text after the frontmatter block, so the lines before it are
// the lines of the block.
//
// A value left unquoted that ends in `#` is warned about, not refused: YAML
// drops a `#` after a space as a comment, so `title: Input #` titles the page
// `Input`, while `lang: C#` is read as written. Quoting the value keeps the `#`
// and silences the warning either way. The warning goes into `warnings`, for
// the main thread to print.
function readFrontmatter(raw, srcRel, warnings) {
  let parsed;
  try {
    parsed = parseFrontmatter(raw);
  } catch (err) {
    throw new Error(`Failed to parse frontmatter in ${srcRel}: ${err.message}`);
  }
  if (!parsed) return null;
  for (const { line, text } of unquotedHashValues(raw)) {
    warnings.push(
      `discover: ${srcRel}:${line}: an unquoted value ends in #, and YAML drops a # after a space as a comment; quote the value to keep it: ${text.trim()}`,
    );
  }
  const { data, content } = parsed;
  const block = raw.slice(0, raw.length - content.length);
  return { data, content, contentLine: (block.match(/\r\n?|\n/g) ?? []).length + 1 };
}

function buildPage(srcRoot, srcRel, { data, content, contentLine }) {
  const srcRelPosix = toPosix(srcRel);
  const ext = path.extname(srcRel).toLowerCase();
  const permalink = computePermalink(data.permalink, srcRelPosix);
  const destPath = permalinkToDestPath(permalink);
  return {
    srcPath: path.join(srcRoot, srcRel),
    srcRel: srcRelPosix,
    ext,
    frontmatter: data,
    rawContent: content,
    contentLine,
    permalink,
    destPath,
    layoutDefault: data.layout === undefined || data.layout === null,
    imageScope: IMAGE_SCOPE.test(srcRelPosix),
  };
}

function computePermalink(fmPermalink, srcRelPosix) {
  if (typeof fmPermalink === "string" && fmPermalink.length > 0) {
    return fmPermalink;
  }
  return "/" + srcRelPosix.replace(PAGE_EXT, "") + ".html";
}
