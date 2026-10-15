// What a worker needs to write the PDF tree (pdf.mjs's writePdf), packed on
// the main thread into one SharedArrayBuffer that every lane can read.
//
// The book is assembled from the pages as the main thread holds them after
// render:i.submit merged each one's renderedContent, and from site.bookData,
// whose _chapters, _foreword and _landing entries resolveBookChapters filled
// with those same page objects. bookCoverage compares them by identity, so a
// page reference inside bookData is packed as {$page: i}, its index in the
// pages list, and unpacked as the same object the list holds.
//
// markdown-it cannot cross the thread boundary, so the parts' subtitles and
// intros are rendered beforehand (book.mjs's prerenderPartText).

import { packShared, unpackShared } from "./sab-broadcast.mjs";

// What book.mjs and pdf.mjs read of a page. A page holds more -- its
// HTML, its source -- that the book never reads and the packing would
// only copy.
function pageProjection(p) {
  return {
    permalink: p.permalink,
    canonicalPermalink: p.canonicalPermalink,
    navPath: p.navPath,
    srcRel: p.srcRel,
    destPath: p.destPath,
    frontmatter: p.frontmatter,
    renderedContent: p.renderedContent,
  };
}

/**
 * @param {object} o
 * @param {object[]} o.pages        the build's pages, renderedContent merged
 * @param {object[]} o.staticFiles  the static-file descriptors
 * @param {object} o.site           config, buildInfo and bookData are read
 * @param {string | null} o.highlightCss
 * @param {boolean} o.check         hand the book to the link check
 * @param {boolean} o.skip          write no PDF tree
 * @returns {SharedArrayBuffer}
 */
export function packBookPayload({ pages, staticFiles, site, highlightCss, check, skip }) {
  if (skip) return packShared({ skip: true });
  const index = new Map(pages.map((p, i) => [p, i]));
  const bookData = JSON.parse(
    JSON.stringify(site.bookData, (_key, value) => (index.has(value) ? { $page: index.get(value) } : value)),
  );
  return packShared({
    pages: pages.map(pageProjection),
    bookData,
    staticFiles,
    config: site.config,
    buildInfo: site.buildInfo,
    highlightCss,
    check,
  });
}

/** The arguments writePdf takes, or null when the build writes no PDF tree. */
export function unpackBookPayload(sab) {
  const data = unpackShared(sab);
  if (data.skip) return null;
  const { pages } = data;
  const resolve = (value) => {
    if (Array.isArray(value)) return value.map(resolve);
    if (value === null || typeof value !== "object") return value;
    if (typeof value.$page === "number") return pages[value.$page];
    for (const key of Object.keys(value)) value[key] = resolve(value[key]);
    return value;
  };
  return {
    pages,
    staticFiles: data.staticFiles,
    site: { config: data.config, buildInfo: data.buildInfo, bookData: resolve(data.bookData) },
    highlightCss: data.highlightCss,
    check: data.check,
  };
}
