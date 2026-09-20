// What each output tree receives, derived from the build's own records.
//
// Split out of builder/check.mjs so the main thread can compute it
// during `dispatch` -- which is on the render fan-out's critical path --
// without pulling in link-check.mjs and, through it, htmlparser2's
// ~23 ms import. This module imports nothing but node:path, so a build
// without --check pays nothing for its presence.
//
// This is the piece that replaces check_links.mjs's directory walk, and
// the piece most able to fail silently. An entry missing here turns a
// working link into a reported break, which is loud. A spurious entry
// masks a real break, which is not. `tbdocs --check-audit-index` diffs
// the result against what actually landed on disk; see
// builder/check.mjs's auditIndex().

// Aux files the online tree receives after the pages are written.
const ONLINE_AUX = ["sitemap.xml", "robots.txt", "assets/js/search-data.json"];
// The offline tree carries neither sitemap nor search index, but does
// get the JS wrapper writeOffline generates around the search data.
const OFFLINE_AUX = ["assets/js/search-data.js"];

// Every relative path a tree receives. `which` is "online" or "offline";
// the PDF tree's contents come from writePdf, which knows them exactly.
export function deriveTreeRels(which, {
  pages, staticFiles, stubs, themeAssetRels, excludePatterns,
}) {
  const rels = new Set();
  const add = which === "offline"
    ? (rel) => { const r = posix(rel); if (!excluded(r, excludePatterns)) rels.add(r); }
    : (rel) => rels.add(posix(rel));

  for (const p of pages) {
    if (p.frontmatter?.layout === "book-combined") continue;
    add(p.destPath);
  }
  for (const s of stubs)            add(s.destPath);
  for (const s of staticFiles)      add(s.destRel);
  for (const rel of themeAssetRels) add(rel);
  for (const rel of (which === "offline" ? OFFLINE_AUX : ONLINE_AUX)) add(rel);

  return [...rels];
}

export function posix(p) { return String(p).replaceAll("\\", "/"); }

// offlineExcluded's rule, inlined rather than imported: offline-rewrite.mjs
// is a much larger module and this is two functions.
function excluded(rel, patterns) {
  if (!patterns || !patterns.length) return false;
  return patterns.some(pat => fnmatch(pat, rel));
}

// File.fnmatch(..., FNM_PATHNAME): `*` does not cross `/`, `**` does.
function fnmatch(pattern, str) {
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") { re += ".*"; i++; }
      else { re += "[^/]*"; }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()|[]{}\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp(re + "$").test(str);
}
