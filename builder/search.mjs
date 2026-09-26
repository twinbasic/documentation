// Phase 6 AUXILIARIES -- search-data.json. Originally a byte-for-byte port
// of the just-the-docs theme's `assets/js/zzzz-search-data.json` Liquid
// template plus the empty `_includes/lunr/custom-data.json` (which
// rendered as a blank indented line between the `url` and `relUrl`
// fields). That parity mattered only up to the Jekyll cutover, when this
// was still being checked against Jekyll's own output; nothing has
// compared against Jekyll since, and the search granularity now
// intentionally diverges from it (see below). The output is still the
// lunr index input that client-side `initSearch()` in
// `just-the-docs.js` feeds into `lunr(...)`.
//
// One entry per heading-bounded section of each titled page, up to
// `search.heading_level` (+ 1 prefix entry, when the first heading text
// differs from the page title or non-empty prose precedes it). A
// section whose title is in `search.fold_headings` (e.g. "See Also",
// "Example") is folded into the section before it instead of getting an
// entry of its own -- see `extractSections` and WIP.Search.md's "Design"
// §1 for why. See also builder/PLAN-6.md §5.3 + §7.D4 + §7.D5.
//
// Two extra fields, `names` and `qualified`, are joined in from the
// symbol index (`tB/symbols.json`'s in-memory form) once both it and the
// per-chunk entries exist -- see `joinSymbolsToEntries` below and
// WIP.Search.md's "Design" §2. They are two fields rather than one
// `symbols` field because BM25 discounts a match inside a long field:
// keeping bare names (client boost 100) separate from the longer
// `Container.Name` forms (boost 50) measured better than one field at
// any single boost.

import path from "node:path";

import { stripHtml } from "./seo.mjs";
import { writeFileMkdirp } from "./write.mjs";

// Phase 17 consolidation path: per-worker render handlers call
// deriveSearchEntries on their chunk and stash the result on
// state.searchChunks[i].  This function flattens those chunks (in chunk-
// index order, matching the serial page iteration), renumbers `i` so it
// is globally sequential, and writes the same byte-for-byte search-data.json
// a single-pass derivation over all pages at once would have produced.
export async function writeSearchDataFromChunks(searchChunks, destRoot, symbols) {
  // searchChunks starts as `new Array(N)` -- holes, not undefined -- and
  // each render:i.submit() fills its own slot. Array.prototype.flat()
  // skips holes silently, so a slot that has not been filled yet does
  // not throw: its pages just vanish from the index, and the only
  // symptom is a slightly smaller entry count nobody reads. That is
  // exactly what happened before renderJoin was given an `expected`
  // list. Refuse to write a partial index rather than lose pages
  // quietly.
  const missing = [];
  for (let i = 0; i < searchChunks.length; i++) {
    if (!(i in searchChunks)) missing.push(i);
  }
  if (missing.length) {
    throw new Error(
      `search index is incomplete: ${missing.length} of ${searchChunks.length} ` +
      `chunks never arrived (${missing.slice(0, 8).join(", ")}` +
      `${missing.length > 8 ? ", ..." : ""}). This is a scheduling bug, not a ` +
      `content one -- see the barrier wiring in dispatch.submit().`,
    );
  }

  const allEntries = searchChunks.flat();
  for (let idx = 0; idx < allEntries.length; idx++) allEntries[idx].i = idx;
  if (symbols?.length) joinSymbolsToEntries(allEntries, symbols);
  const body = allEntries.map(renderEntryString).join(",");
  const json = `{` + body + `\n}\n`;
  await writeFileMkdirp(path.join(destRoot, "assets/js/search-data.json"), json);
  return { entries: allEntries.length, json };
}

// Pure-compute derivation: produces the search-data entry array
// (already sanitised, already URL-encoded) without writing anything.
// Each entry is `{ i, doc, title, content, url, relUrl, sourcePage }`.
// `sourcePage` is the originating tbdocs page; renderEntryString below
// never reads it, so it never reaches the emitted JSON.
// The generator's two content skips, as a predicate: a page with no
// title has nothing to index, and `search_exclude: true` is an explicit
// opt-out.  The integrity check needs the same answer -- otherwise the
// first page to use either key fails --check with no hint why.
export function searchIncludes(page) {
  return Boolean(page.frontmatter?.title) && page.frontmatter?.search_exclude !== true;
}

export function deriveSearchEntries(pages, site) {
  const headingLevel = site.config.search?.heading_level ?? 2;
  const baseurl = String(site.config.baseurl ?? "");
  // Absent or empty means no folding, so behaviour is exactly the single-
  // entry-per-heading split described above.
  const foldHeadings = site.config.search?.fold_headings ?? [];
  const foldSet = new Set(foldHeadings.map((h) => String(h).trim().toLowerCase()));
  const entries = [];
  let i = 0;

  for (const page of pages) {
    const title = page.frontmatter?.title;
    if (!searchIncludes(page)) continue;
    // Unlike the two skips above, this is not a content decision. No
    // renderedContent means the page's render result never arrived, and
    // quietly leaving it out of the index is exactly how a scheduling
    // bug once removed six pages per build without anyone noticing.
    if (typeof page.renderedContent !== "string") {
      throw new Error(
        `search index: ${page.destPath} has no renderedContent; refusing to ` +
        `drop it from the index silently`,
      );
    }

    const { sections, titleFound, prefixContent } = extractSections(
      page,
      String(title),
      headingLevel,
      foldSet,
    );

    for (const sec of sections) {
      entries.push({
        i: i++,
        doc: String(title),
        title: sec.title,
        content: sanitiseContent(sec.body),
        url: encodeSpaces(baseurl + sec.url),
        relUrl: sec.url,
        sourcePage: page,
      });
    }

    if (!titleFound) {
      entries.push({
        i: i++,
        doc: String(title),
        title: String(title),
        content: sanitiseContent(prefixContent),
        url: encodeSpaces(baseurl + page.permalink),
        relUrl: page.permalink,
        sourcePage: page,
      });
    }
  }

  return entries;
}

// Returns the heading-split sections plus the prose-before-first-heading
// (`parts[0]`) and a `titleFound` flag indicating whether the title-
// prefix entry should be suppressed.
//
// `foldSet` is the lowercased, trimmed `search.fold_headings` list. A
// section whose title matches it (case-insensitively) is folded into the
// section immediately before it on this page: its body is appended to
// that earlier section's body, and the earlier section's title and url
// are kept, so the fold is invisible to anything reading the result --
// it just looks like one bigger section. A generic heading names nothing:
// as an entry of its own it would be a search result titled just "See
// Also" or "Example", and its text belongs to the member or topic above
// it. Measured, folding is a small gain with a smaller index (see
// WIP.Search.md's "What the numbers showed"). A generic heading with
// nothing before it on the page (the page's first heading) has nowhere
// to fold into, so it keeps its own entry -- same as any other section.
// The loop below still emits sections top to bottom, so entry order
// stays exactly as deterministic as it was before folding existed.
function extractSections(page, pageTitle, headingLevel, foldSet = new Set()) {
  let content = page.renderedContent;

  // h2..h<heading_level> → h1 substitution. For the upstream default
  // of 2 this is a single iteration. For higher levels (not configured
  // on this site) further iterations fold deeper headings into the
  // splitter's boundary set.
  for (let lvl = 2; lvl <= headingLevel; lvl++) {
    content = content
      .replaceAll(`<h${lvl}`, "<h1")
      .replaceAll(`</h${lvl}`, "</h1");
  }

  const parts = content.split("<h1");
  const prefixContent = parts[0] || "";
  const sections = [];
  let titleFound = false;

  for (let k = 1; k < parts.length; k++) {
    const part = parts[k];
    const closeIdx = part.indexOf("</h1>");
    const headingChunk = closeIdx === -1 ? part : part.slice(0, closeIdx);
    const body = closeIdx === -1 ? "" : part.slice(closeIdx + "</h1>".length);

    // Heading text: drop the attribute prefix (everything up to and
    // including the first `>`), then strip any inline HTML (e.g.
    // `<code>`, `<em>`).
    const gtIdx = headingChunk.indexOf(">");
    const titleHtml = gtIdx === -1 ? headingChunk : headingChunk.slice(gtIdx + 1);
    const sectionTitle = stripHtml(titleHtml);

    let url = page.permalink;
    if (sectionTitle === pageTitle && prefixContent === "") {
      titleFound = true;
    } else {
      // Extract id from `id="..."` if present exactly once.
      const idParts = headingChunk.split('id="');
      if (idParts.length === 2) {
        const idValue = idParts[1].split('"')[0];
        url = `${page.permalink}#${idValue}`;
      }
    }

    // Fold into the previous section on this page rather than starting a
    // new entry, unless this is the first section (nothing to fold into
    // yet). titleFound above is unaffected either way: it is about
    // whether the page-title prefix entry is still needed, not about
    // how many section entries the page ends up with.
    const isGeneric = foldSet.has(sectionTitle.trim().toLowerCase());
    if (isGeneric && sections.length > 0) {
      sections[sections.length - 1].body += body;
      continue;
    }

    sections.push({ title: sectionTitle, body, url });
  }

  return { sections, titleFound, prefixContent };
}

// URL key for the symbol join: strips a trailing `/index` or
// `/index.html`, then a trailing slash, comparing everything up to and
// including a `#fragment` unchanged. Both sides of the join go through
// this -- a symbol's `url` (from `tB/symbols.json`, e.g.
// `/Widget/#paintpicture` or a bare `/Widget/`) and a search entry's
// `relUrl` (from `deriveSearchEntries`, always a page permalink, with or
// without a `#id` suffix) -- since the two are produced by different
// code and are not guaranteed to agree on trailing punctuation, only on
// the page and fragment they name. Order matters: stripping `/index`
// before the trailing slash turns `/Widget/index.html`, `/Widget/index`
// and `/Widget/` all into the same `/Widget`.
function normalizeSymbolUrl(u) {
  const s = String(u ?? "");
  const hashIdx = s.indexOf("#");
  const pathPart = hashIdx === -1 ? s : s.slice(0, hashIdx);
  const hash = hashIdx === -1 ? "" : s.slice(hashIdx);
  const noIndex = pathPart.replace(/\/index(\.html)?$/, "");
  const noTrailingSlash = noIndex.length > 1 && noIndex.endsWith("/") ? noIndex.slice(0, -1) : noIndex;
  return noTrailingSlash + hash;
}

// Joins `tB/symbols.json`'s in-memory symbols (each `{ name, container,
// url, ... }`, see `symbols.mjs`'s `deriveSymbolIndex`) onto the search
// entries whose `relUrl` names the same URL, attaching three fields:
//
//   - `names`: every distinct symbol name at that URL, space-separated.
//   - `qualified`: every distinct `Container.Name` form, space-
//     separated, for symbols that have a container (a bare statement or
//     operator does not).
//   - `primary`: the names in `names` that a reader typing that name most
//     likely wants, per `isPrimarySymbol` below. The client ranks these
//     first, so `Left` finds the Strings function before 40 controls'
//     `Left` properties (WIP.Search.md, "Reader intent").
//
// Mutates and returns `entries` -- called once, right before rendering,
// over the full flattened array, so there is no benefit to allocating a
// second array the caller would just discard. Pure with respect to
// `symbols`: nothing here writes to it. Exported (rather than folded
// into `writeSearchDataFromChunks`) so it can be unit-tested against
// synthetic entries and symbols without going through a page render.
export function joinSymbolsToEntries(entries, symbols) {
  const moduleNames = new Set();
  for (const s of symbols ?? []) if (s.kind === "module") moduleNames.add(s.name.toLowerCase());
  const byUrl = new Map();
  for (const s of symbols ?? []) {
    const key = normalizeSymbolUrl(s.url);
    let bucket = byUrl.get(key);
    if (!bucket) byUrl.set(key, (bucket = { names: new Set(), qualified: new Set(), primary: new Set() }));
    bucket.names.add(s.name);
    if (s.container) bucket.qualified.add(`${s.container}.${s.name}`);
    if (isPrimarySymbol(s, moduleNames)) bucket.primary.add(s.name);
  }
  for (const e of entries) {
    const bucket = byUrl.get(normalizeSymbolUrl(e.relUrl));
    if (!bucket) continue;
    if (bucket.names.size) e.names = [...bucket.names].join(" ");
    if (bucket.qualified.size) e.qualified = [...bucket.qualified].join(" ");
    if (bucket.primary.size) e.primary = [...bucket.primary].join(" ");
  }
  return entries;
}

// The first of the reader-intent tiers (WIP.Search.md, "Reader intent"):
// a type -- a page of its own -- or a language element, meaning a
// statement, keyword, operator, attribute or directive outside any
// package, or a procedure or property of a *module*, such as the Strings
// module's Left. Class members and enum constants are the lower tiers.
// eval/search_quality.mjs's `intentTier` states the same rule
// independently, as the ground truth this is measured against.
const PRIMARY_TYPE_KINDS = new Set(["class", "module", "interface", "enum", "control", "object", "type", "package"]);
const PRIMARY_LANGUAGE_KINDS = new Set(["statement", "keyword", "operator", "attribute", "directive"]);
const MODULE_MEMBER_KINDS = new Set(["function", "property", "sub", "method"]);

function isPrimarySymbol(s, moduleNames) {
  if (PRIMARY_TYPE_KINDS.has(s.kind)) return true;
  if (PRIMARY_LANGUAGE_KINDS.has(s.kind)) return s.package == null;
  return MODULE_MEMBER_KINDS.has(s.kind) && Boolean(s.container) && moduleNames.has(s.container.toLowerCase());
}

// Per-entry JSON shape matching the upstream Liquid template's output
// byte-for-byte: doc / title / content / url, then a blank-indented
// line where the empty lunr/custom-data.json include used to render,
// then relUrl. Closing brace has 2-space indent. No trailing newline
// on the returned string -- the outer join with "," handles separation.
//
// Consumes a derived entry from `deriveSearchEntries`, optionally
// carrying `names` / `qualified` / `primary` from `joinSymbolsToEntries`:
// content is already sanitised, url is already URL-encoded. The three
// are emitted only when non-empty, so an entry with no
// symbols (most of them -- see WIP.Search.md's "Design" §2) produces the
// exact same bytes as before the join existed.
export function renderEntryString(e) {
  let extra = "";
  if (e.names) extra += `    "names": ${JSON.stringify(e.names)},\n`;
  if (e.qualified) extra += `    "qualified": ${JSON.stringify(e.qualified)},\n`;
  if (e.primary) extra += `    "primary": ${JSON.stringify(e.primary)},\n`;
  return `"${e.i}": {\n` +
    `    "doc": ${JSON.stringify(e.doc)},\n` +
    `    "title": ${JSON.stringify(e.title)},\n` +
    `    "content": ${JSON.stringify(e.content)},\n` +
    extra +
    `    "url": "${e.url}",\n` +
    `    \n` +
    `    "relUrl": "${e.relUrl}"\n` +
    `  }`;
}

// Liquid `relative_url` for this site: paths are ASCII-safe except for
// the occasional space. encodeURI over-encodes (would touch `#` in
// `/foo#bar`); a targeted space replacement matches Jekyll byte-for-
// byte.
function encodeSpaces(s) {
  return s.includes(" ") ? s.replaceAll(" ", "%20") : s;
}

// Content sanitiser. Port of the Liquid filter chain in the template's
// `content` line: 14 replaces inserting ` . ` / ` | ` separators
// between block boundaries, then strip_html, remove 'Table of contents',
// normalize_whitespace (collapse + strip), three collapse passes, and a
// trailing-space append. The order is load-bearing for byte parity.
function sanitiseContent(html) {
  let s = String(html ?? "")
    .replaceAll("</h",  " . </h")
    .replaceAll("<hr",  " . <hr")
    .replaceAll("</p",  " . </p")
    .replaceAll("<ul",  " . <ul")
    .replaceAll("</ul", " . </ul")
    .replaceAll("<ol",  " . <ol")
    .replaceAll("</ol", " . </ol")
    .replaceAll("</tr", " . </tr")
    .replaceAll("<li",  " | <li")
    .replaceAll("</li", " | </li")
    .replaceAll("</td", " | </td")
    .replaceAll("<td",  " | <td")
    .replaceAll("</th", " | </th")
    .replaceAll("<th",  " | <th");
  s = stripHtml(s);
  s = s.replaceAll("Table of contents", "");
  // Jekyll's normalize_whitespace = collapse runs of `\s` + strip,
  // with the Ruby semantics for both: `\s` is ASCII-only
  // ([\t\n\v\f\r ]) and `String#strip` is the same set. JS's regex
  // `\s` and `String.prototype.trim` BOTH include NO-BREAK SPACE
  // ( ) and other Unicode whitespace, which would collapse the
  // `&nbsp;`-driven indentation kramdown emits inside blockquote /
  // definition-list syntax. Mirror Ruby's narrower set so search-
  // content stays byte-for-byte with Jekyll on pages that use
  // `&nbsp;` for layout (e.g. the `tB/Core/Class` syntax block).
  s = s.replace(/[\t\n\v\f\r ]+/g, " ");
  s = stripAsciiWhitespace(s);
  s = s.replaceAll(". . .", ".");
  s = s.replaceAll(". .", ".");
  s = s.replaceAll("| |", "|");
  return s + " ";
}

// Ruby's `String#strip` semantics: trim [\t\n\v\f\r ] (and \0, which
// kramdown never emits) from both ends, leaving every other byte --
// including   -- intact.
function stripAsciiWhitespace(s) {
  let start = 0;
  let end = s.length;
  while (start < end && isAsciiWs(s.charCodeAt(start))) start++;
  while (end > start && isAsciiWs(s.charCodeAt(end - 1))) end--;
  return s.slice(start, end);
}

function isAsciiWs(code) {
  return code === 0x20 || (code >= 0x09 && code <= 0x0d);
}
