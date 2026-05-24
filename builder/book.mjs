// Phase 2 book chapter resolution. Loads _data/book.yml and walks every
// entry / part / chaptered-part-chapter, resolving the selector schema
// (page / pages / nav_page / nav_pages + no_descent) to a concrete
// Array<Page> stored as `_chapters` on the entry. Pre-resolves
// landing_page / foreword_page URL lookups in the same pass so Phase 8
// has no pages-walk left to do.
//
// See builder/PLAN-2.md §5.8 + §6.4. Ports:
//   _plugins/book-resolve-chapters.rb (resolver)
//   _plugins/book-sort.rb            (sortByNavOrder)
//
// The renderer half (book.html assembly) is out of scope for Phase 2.

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export async function loadBookData(srcRoot) {
  const file = path.join(srcRoot, "_data", "book.yml");
  const raw = await fs.readFile(file, "utf8");
  return yaml.load(raw);
}

export function resolveBookChapters(bookData, pages) {
  if (!bookData) return;

  const byUrl = new Map();
  for (const p of pages) byUrl.set(p.permalink, p);

  for (const fm of bookData.front_matter || []) {
    fm._chapters = sortByNavOrder(collectMatches(fm, pages));
  }

  for (const part of bookData.parts || []) {
    if (part.chapters) {
      // Chaptered part: foreword/landing belong to the divider; per-
      // chapter resolution happens below. Foreword/landing on the
      // chaptered part itself are still URL lookups (rare today; only
      // foreword_page on Packages was wired in earlier iterations).
      if (part.foreword_page) part._foreword = byUrl.get(part.foreword_page);
      if (part.landing_page) part._landing = byUrl.get(part.landing_page);

      for (const chapter of part.chapters) {
        chapter._chapters = buildChapterList(chapter, pages, byUrl);
        if (chapter.landing_page) chapter._landing = byUrl.get(chapter.landing_page);
      }
    } else {
      // Flat part: landing emitted first, rest swept and sorted.
      part._chapters = buildChapterList(part, pages, byUrl);
      if (part.foreword_page) part._foreword = byUrl.get(part.foreword_page);
      if (part.landing_page) part._landing = byUrl.get(part.landing_page);
    }
  }
}

// Landing first (if any), then prefix-swept rest minus landing, sorted
// by nav order. Mirrors book.html's `chapters = landing | concat: rest`
// assembly.
function buildChapterList(entry, pages, byUrl) {
  const list = [];
  const landingUrl = entry.landing_page;
  const landing = landingUrl ? byUrl.get(landingUrl) : undefined;
  if (landing) list.push(landing);

  let rest = collectMatches(entry, pages);
  if (landingUrl) rest = rest.filter(p => p.permalink !== landingUrl);
  list.push(...sortByNavOrder(rest));
  return list;
}

// Same selector schema as the Ruby resolver. page/pages match against
// permalink; nav_page/nav_pages match against navPath. no_descent
// switches `includes` -> exact equality everywhere.
function collectMatches(entry, pages) {
  const out = [];
  const noDescent = !!entry.no_descent;

  const urlSpecs = [];
  if (entry.page) urlSpecs.push(entry.page);
  if (entry.pages) urlSpecs.push(...entry.pages);
  for (const prefix of urlSpecs) {
    if (noDescent) {
      for (const p of pages) if (p.permalink === prefix) out.push(p);
    } else {
      for (const p of pages) if (p.permalink.includes(prefix)) out.push(p);
    }
  }

  const navSpecs = [];
  if (entry.nav_page) navSpecs.push(entry.nav_page);
  if (entry.nav_pages) navSpecs.push(...entry.nav_pages);
  for (const np of navSpecs) {
    if (noDescent) {
      for (const p of pages) if (p.navPath === np) out.push(p);
    } else {
      for (const p of pages) if ((p.navPath || "").includes(np)) out.push(p);
    }
  }

  return out;
}

// §6.4. Group pages by their owning index page so an index and its
// leaves stay together; sort each group internally (index first by URL,
// then nav_order leaves with title tie-break, then nav_order-less
// leaves alphabetically). Group order is determined by each group's
// lead item's [nav_order, title]. See _plugins/book-sort.rb for the
// rationale (the book.html state machine depends on index pages
// appearing in the stream immediately before their sub-pages).
export function sortByNavOrder(input) {
  const pages = [...new Set(input)];

  const indexUrls = pages
    .filter(p => p.permalink.endsWith("/"))
    .map(p => p.permalink);

  const groups = new Map();
  for (const p of pages) {
    const url = p.permalink;
    let key;
    if (url.endsWith("/")) {
      key = url;
    } else {
      const owners = indexUrls.filter(iu => url.startsWith(iu));
      key = owners.length > 0
        ? owners.reduce((a, b) => a.length >= b.length ? a : b)
        : url;
    }
    let bucket = groups.get(key);
    if (!bucket) { bucket = []; groups.set(key, bucket); }
    bucket.push(p);
  }

  const sortedGroups = new Map();
  for (const [k, members] of groups) {
    sortedGroups.set(k, sortWithinGroup(members));
  }

  const orderedKeys = [...sortedGroups.keys()].sort((kA, kB) => {
    const a = sortedGroups.get(kA)[0];
    const b = sortedGroups.get(kB)[0];
    const aOrder = a.frontmatter.nav_order ?? Infinity;
    const bOrder = b.frontmatter.nav_order ?? Infinity;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const at = String(a.frontmatter.title || "").toLowerCase();
    const bt = String(b.frontmatter.title || "").toLowerCase();
    return at < bt ? -1 : at > bt ? 1 : 0;
  });

  return orderedKeys.flatMap(k => sortedGroups.get(k));
}

function sortWithinGroup(members) {
  const indexes = members.filter(p => p.permalink.endsWith("/"));
  indexes.sort((a, b) => a.permalink < b.permalink ? -1 : a.permalink > b.permalink ? 1 : 0);

  const leaves = members.filter(p => !p.permalink.endsWith("/"));
  const withOrder = leaves.filter(p => p.frontmatter.nav_order != null);
  const withoutOrder = leaves.filter(p => p.frontmatter.nav_order == null);

  withOrder.sort((a, b) => {
    const d = a.frontmatter.nav_order - b.frontmatter.nav_order;
    if (d !== 0) return d;
    const at = String(a.frontmatter.title || "").toLowerCase();
    const bt = String(b.frontmatter.title || "").toLowerCase();
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  withoutOrder.sort((a, b) => {
    const at = String(a.frontmatter.title || "").toLowerCase();
    const bt = String(b.frontmatter.title || "").toLowerCase();
    return at < bt ? -1 : at > bt ? 1 : 0;
  });

  return [...indexes, ...withOrder, ...withoutOrder];
}
