// Phase 6 AUXILIARIES -- search-data.json. Port of the just-the-docs
// theme's `assets/js/zzzz-search-data.json` Liquid template plus the
// empty `_includes/lunr/custom-data.json` (which renders as a blank
// indented line between the `url` and `relUrl` fields). The output is
// the lunr index input that client-side `initSearch()` in
// `just-the-docs.js` feeds into `lunr(...)`.
//
// One entry per heading-bounded section of each titled page. Pages with
// N visible headings produce up to N (+ 1 prefix entry, when the first
// heading text differs from the page title or non-empty prose precedes
// it). See builder/PLAN-6.md §5.3 + §7.D4 + §7.D5.

import path from "node:path";

import { stripHtml } from "./seo.mjs";
import { writeFileMkdirp } from "./write.mjs";

export async function writeSearchData(pages, site, destRoot) {
  const entries = deriveSearchEntries(pages, site);
  const body = entries.map(renderEntryString).join(",");
  const json = `{` + body + `\n}\n`;
  await writeFileMkdirp(path.join(destRoot, "assets/js/search-data.json"), json);
  return { entries: entries.length };
}

// Pure-compute derivation: produces the search-data entry array
// (already sanitised, already URL-encoded) without writing anything.
// Each entry is `{ i, doc, title, content, url, relUrl, sourcePage }`.
// `sourcePage` is the originating tbdocs page so callers (`_triage.mjs`,
// `_diff.mjs`) can gate by `srcRel` against `accepted-divergences.mjs`.
export function deriveSearchEntries(pages, site) {
  const headingLevel = site.config.search?.heading_level ?? 2;
  const entries = [];
  let i = 0;

  for (const page of pages) {
    const title = page.frontmatter?.title;
    if (!title) continue;
    if (page.frontmatter?.search_exclude === true) continue;
    if (typeof page.renderedContent !== "string") continue;

    const { sections, titleFound, prefixContent } = extractSections(
      page,
      String(title),
      headingLevel,
    );

    for (const sec of sections) {
      entries.push({
        i: i++,
        doc: String(title),
        title: sec.title,
        content: sanitiseContent(sec.body),
        url: encodeSpaces(sec.url),
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
        url: encodeSpaces(page.permalink),
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
function extractSections(page, pageTitle, headingLevel) {
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

    sections.push({ title: sectionTitle, body, url });
  }

  return { sections, titleFound, prefixContent };
}

// Per-entry JSON shape matching the upstream Liquid template's output
// byte-for-byte: doc / title / content / url, then a blank-indented
// line where the empty lunr/custom-data.json include used to render,
// then relUrl. Closing brace has 2-space indent. No trailing newline
// on the returned string -- the outer join with "," handles separation.
//
// Consumes a derived entry from `deriveSearchEntries`: content is
// already sanitised, url is already URL-encoded.
function renderEntryString(e) {
  return `"${e.i}": {\n` +
    `    "doc": ${JSON.stringify(e.doc)},\n` +
    `    "title": ${JSON.stringify(e.title)},\n` +
    `    "content": ${JSON.stringify(e.content)},\n` +
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
