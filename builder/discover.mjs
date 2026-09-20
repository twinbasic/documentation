// Phase 1 of tbdocs: walk the source tree once and produce a normalized
// inventory that every later phase consumes. See builder/PLAN-1.md for the
// full spec, design decisions, and edge-case handling.

import fg from "fast-glob";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { permalinkToDestPath } from "./paths.mjs";

const PAGE_EXT = /\.(md|html)$/i;
const IMAGE_SCOPE = /(^|\/)Images\//;

export async function discover(srcRoot, ignore = []) {
  const allFiles = await fg("**/*", {
    cwd: srcRoot,
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore,
  });
  allFiles.sort();

  const pages = [];
  const staticFiles = [];

  await Promise.all(allFiles.map(async (srcRel) => {
    const srcPath = path.join(srcRoot, srcRel);

    if (PAGE_EXT.test(srcRel)) {
      const raw = await fs.readFile(srcPath, "utf8");
      const parsed = parseFrontmatter(raw, srcRel);
      if (parsed) {
        pages.push(buildPage(srcRoot, srcRel, parsed));
        return;
      }
      // .md/.html without frontmatter falls through to static treatment.
    }

    const stat = await fs.stat(srcPath);
    const srcRelPosix = toPosix(srcRel);
    staticFiles.push({
      srcPath,
      srcRel: srcRelPosix,
      destRel: srcRelPosix,
      size: stat.size,
    });
  }));

  // Jekyll sorts site.pages by basename (`name` = basename with
  // extension) via `lib/jekyll/reader.rb:44`'s `site.pages.sort_by!
  // (&:name)`. Mirror that with JS's stable Array#sort. Tied
  // basenames (e.g. ~111 `index.md` pages from folder-style classes)
  // are kept in fast-glob's input order; their relative position
  // among sibling pages is then deterministically broken in Phase 2
  // by the explicit `nav_order` values in each page's frontmatter,
  // so the unstable-sort divergence Ruby exhibits between versions
  // doesn't reach the rendered output.
  pages.sort(byName);
  // Static files keep the full-path sort -- Jekyll's reader sorts
  // them with `site.static_files.sort_by!(&:relative_path)`, which
  // is what `bySrcRel` does.
  staticFiles.sort(bySrcRel);

  return { pages, staticFiles };
}

function basename(p) {
  const i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}

function byName(a, b) {
  const an = basename(a.srcRel);
  const bn = basename(b.srcRel);
  return an < bn ? -1 : an > bn ? 1 : 0;
}

function bySrcRel(a, b) {
  return a.srcRel < b.srcRel ? -1 : a.srcRel > b.srcRel ? 1 : 0;
}

// A UTF-8 BOM decodes to U+FEFF, which node's "utf8" reader hands back as
// the first character rather than swallowing. gray-matter's `test` then sees
// ﻿--- instead of ---, reports no frontmatter, and the caller files the
// page as a static asset: it vanishes from the nav and the search index, and
// its raw markdown is copied into the output tree and served verbatim,
// frontmatter keys and all. That is what happened to
// Reference/Built-In/AppGlobalClassObject/index.md, undetected, for months.
//
// Editors on Windows add a BOM without being asked, so this is a hazard any
// contributor can reintroduce. Strip it here, at the one place every .md and
// .html passes through, rather than policing the files.
function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function parseFrontmatter(raw, srcRel) {
  const text = stripBom(raw);
  if (!matter.test(text)) return null;
  try {
    return matter(text);
  } catch (err) {
    throw new Error(`Failed to parse frontmatter in ${srcRel}: ${err.message}`);
  }
}

function buildPage(srcRoot, srcRel, { data, content }) {
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

function toPosix(p) {
  return p.replace(/\\/g, "/");
}
