// Phase 1 of tbdocs: walk the source tree once and produce a normalized
// inventory that every later phase consumes. See builder/PLAN-1.md for the
// full spec, design decisions, and edge-case handling.

import fg from "fast-glob";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const HTMLISH_EXT = /\.(html?|xml)$/i;
const PAGE_EXT = /\.(md|html)$/i;
const IMAGE_SCOPE = /(^|\/)Images\//;

// Files that look like pages but are toolchain artifacts.
const IGNORE = [
  // Underscored directories at the root and at any depth -- catches
  // _site, _site-offline, _site-pdf, _pdf, _data, _includes, _layouts,
  // _sass, _plugins, _profile, and every _Images at any depth.
  "_*/**",
  "**/_*/**",
  // Defensive: caches and unrelated trees that should never be in docs/.
  "**/.git/**",
  "**/node_modules/**",
  "**/.jekyll-cache/**",
  "**/.sass-cache/**",
  // Theme assets ship prebuilt from builder/assets/ instead.
  "assets/css/**",
  "assets/js/**",
  // Top-level Jekyll / toolchain files.
  "Gemfile",
  "Gemfile.lock",
  "_config.yml",
  "*.bat",
  "redirects.json",
];

export async function discover(srcRoot) {
  const allFiles = await fg("**/*", {
    cwd: srcRoot,
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: IGNORE,
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

function parseFrontmatter(raw, srcRel) {
  if (!matter.test(raw)) return null;
  try {
    return matter(raw);
  } catch (err) {
    throw new Error(`Failed to parse frontmatter in ${srcRel}: ${err.message}`);
  }
}

function buildPage(srcRoot, srcRel, { data, content }) {
  const srcRelPosix = toPosix(srcRel);
  const ext = path.extname(srcRel).toLowerCase();
  const permalink = computePermalink(data.permalink, srcRelPosix);
  const destPath = computeDestPath(permalink);
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

function computeDestPath(permalink) {
  let p = permalink.startsWith("/") ? permalink.slice(1) : permalink;
  if (p === "") return "index.html";
  if (p.endsWith("/")) return p + "index.html";
  const last = p.slice(p.lastIndexOf("/") + 1);
  if (HTMLISH_EXT.test(last)) return p;
  return p + ".html";
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}
