// What each output tree receives, derived from the build's own records.
//
// Split out of builder/check.mjs so the main thread can compute it
// during `dispatch` -- which is on the render fan-out's critical path --
// without pulling in link-check.mjs and, through it, htmlparser2's
// ~23 ms import. This module imports nothing but fnmatch.mjs, the offline
// tree's exclusion rule, so a build without --check pays nothing for its
// presence.
//
// This is the piece that replaces check_links.mjs's directory walk, and
// the piece most able to fail silently. An entry missing here turns a
// working link into a reported break, which is loud. A spurious entry
// masks a real break, which is not. `tbdocs --check-audit-index` diffs
// the result against what actually landed on disk; see
// builder/check.mjs's auditIndex().

// Aux files the online tree receives after the pages are written. The symbol
// index is the online tree's alone: the IDE help add-in fetches it from the
// site, and the offline tree has no reader for it yet. llms.txt is for agents
// reading the site, and links to the markdown copies, which only it has.
// nav.html is the whole nav tree, which only an online page fetches; an
// offline page has it from nav.js.
import { matchesAny } from "./fnmatch.mjs";

const ONLINE_AUX = [
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "nav.html",
  "assets/js/search-data.json",
  "assets/js/search-index.json",
  "tB/symbols.json",
];
// The offline tree carries no sitemap, and the search index (with the search
// entries in it) not as JSON but as a script, search-index.js, since a page
// under file:// can load a script but not fetch a file; and the nav.js that
// puts the whole nav tree in place of a page's part of it.
const OFFLINE_AUX = ["assets/js/search-index.js", "assets/js/nav.js"];

// Every relative path a tree receives. `which` is "online" or "offline";
// the PDF tree's contents come from writePdf, which knows them exactly.
// `onlineOnlyRels` are files the online tree receives and the offline one
// does not: the help add-in's project file, the package test projects and the
// pages' markdown copies.
export function deriveTreeRels(
  which,
  { pages, staticFiles, stubs, themeAssetRels, excludePatterns, onlineOnlyRels = [] },
) {
  const rels = new Set();
  const add =
    which === "offline"
      ? (rel) => {
          const r = posix(rel);
          if (!matchesAny(r, excludePatterns)) rels.add(r);
        }
      : (rel) => rels.add(posix(rel));

  for (const p of pages) {
    if (p.frontmatter?.layout === "book-combined") continue;
    add(p.destPath);
  }
  for (const s of stubs) add(s.destPath);
  for (const s of staticFiles) add(s.destRel);
  for (const rel of themeAssetRels) add(rel);
  for (const rel of which === "offline" ? OFFLINE_AUX : ONLINE_AUX) add(rel);
  if (which !== "offline") for (const rel of onlineOnlyRels) add(rel);

  return [...rels];
}

export function posix(p) {
  return String(p).replaceAll("\\", "/");
}
