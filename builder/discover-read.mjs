// The part of discover that reads the pages: a file's frontmatter split off and
// parsed, and the page object every later phase consumes. Apart from
// discover.mjs so that a lane can run it after loading no more than this, the
// YAML parser and paths.mjs: discover.mjs itself loads the glob library, which
// only the main thread needs.

import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import path from "node:path";

import { parseFrontmatter, unquotedHashValues } from "../lib/frontmatter.mjs";
import { permalinkToDestPath } from "./paths.mjs";

export const PAGE_EXT = /\.(md|html)$/i;
const IMAGE_SCOPE = /(^|\/)Images\//;

export const toPosix = (p) => p.replace(/\\/g, "/");

/**
 * Reads the files `srcRels` (each a .md or .html under `srcRoot`), one after the
 * other. Returns the pages among them, the files with no frontmatter (`plain`,
 * which are static files) and the warnings to print, each in the order of
 * `srcRels`.
 */
export function readPages(srcRoot, srcRels, statRels = [], pairs = []) {
  const pages = [];
  const plain = [];
  const warnings = [];
  // PROTOTYPE: the static files' sizes and the picture pairs' dimensions, here too.
  const s0 = performance.now();
  const sizes = statRels.map((rel) => statSync(path.join(srcRoot, rel)).size);
  const s1 = performance.now();
  const pairSizes = pairs.map(([light, dark]) => {
    const l = pngSizeSync(path.join(srcRoot, light));
    const d = pngSizeSync(path.join(srcRoot, dark));
    return l && d ? [...l, ...d] : null;
  });
  const s2 = performance.now();
  // PROTOTYPE: timing
  let read = 0;
  let parse = 0;
  const t0 = performance.now();
  for (const srcRel of srcRels) {
    const a = performance.now();
    const raw = readFileSync(path.join(srcRoot, srcRel), "utf8");
    const b = performance.now();
    const parsed = readFrontmatter(raw, srcRel, warnings);
    if (parsed) pages.push(buildPage(srcRoot, srcRel, parsed));
    else plain.push({ srcRel, size: statSync(path.join(srcRoot, srcRel)).size });
    read += b - a;
    parse += performance.now() - b;
  }
  const ms = {
    stat: Math.round(s1 - s0),
    pairs: Math.round(s2 - s1),
    read: Math.round(read),
    parse: Math.round(parse),
    all: Math.round(performance.now() - s0),
    at: Date.now(),
  };
  void t0;
  return { pages, plain, warnings, sizes, pairSizes, ms };
}

// A PNG file's width and height in pixels, from its header; null when it is no PNG.
function pngSizeSync(file) {
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
// and silences the warning either way.
export function readFrontmatter(raw, srcRel, warnings) {
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

export function buildPage(srcRoot, srcRel, { data, content, contentLine }) {
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
