// Shared path helper: permalink → output filename.
//
// Same rules apply to a page's permalink and to a redirect_from URL:
//   "/"            → "index.html"
//   "/foo/"        → "foo/index.html"
//   "/foo.html"    → "foo.html"  (HTML/XML extensions kept verbatim)
//   "/foo"         → "foo.html"
// A leading slash is stripped first; inputs without a leading slash
// (defensive) get the same treatment.
//
// Imported by discover.mjs (Phase 1) and redirects.mjs (Phase 6). See
// PLAN-6.md §6.1.

const HTMLISH_EXT = /\.(html?|xml)$/i;

export function permalinkToDestPath(permalink) {
  let p = permalink.startsWith("/") ? permalink.slice(1) : permalink;
  if (p === "") return "index.html";
  if (p.endsWith("/")) return p + "index.html";
  const last = p.slice(p.lastIndexOf("/") + 1);
  if (HTMLISH_EXT.test(last)) return p;
  return p + ".html";
}
