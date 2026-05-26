// Phase 2 book chapter resolution + Phase 8 book.html assembly.
//
// Phase 2 surface (§A below): loadBookData, resolveBookChapters,
// sortByNavOrder. Loads _data/book.yml and walks every entry / part /
// chaptered-part-chapter, resolving the selector schema (page / pages /
// nav_page / nav_pages + no_descent) to a concrete Array<Page> stored
// as `_chapters` on the entry. Pre-resolves landing_page / foreword_page
// URL lookups in the same pass so Phase 8 has no pages-walk left to do.
//
// See builder/PLAN-2.md §5.8 + §6.4. Ports:
//   _plugins/book-resolve-chapters.rb (resolver)
//   _plugins/book-sort.rb            (sortByNavOrder)
//
// Phase 8 surface (§B-§G): assembleBook + bookChapterTransform +
// chapterAnchorFromUrl + rewriteBookHrefs. Builds the full book.html
// string for the sparse PDF tree. See builder/PLAN-8.md. Ports:
//   docs/book.html                       (Liquid walker)
//   docs/_layouts/book-combined.html     (head + title page wrapper)
//   docs/_includes/book-chapter-body.html (per-chapter article wrapper)
//   docs/_plugins/book-chapter-transform.rb (per-chapter body transform)
//   docs/_plugins/book-href-rewrite.rb   (cross-ref rewrite + landing strip)

import { compressHtml } from "./compress.mjs";
import { loadData } from "./data.mjs";

// ---------------------------------------------------------------------------
// §A  Phase 2: book.yml loader + chapter resolver + sort_by_nav_order
// ---------------------------------------------------------------------------

// Back-compat wrapper around the generic `loadData` loader. The
// orchestrator (PLAN-9 §5.2) calls `loadData(srcRoot)` once and stashes
// the result on `site.data`; downstream consumers read
// `site.data.book` directly. `loadBookData` is retained for the verify
// harnesses and diff tools that haven't migrated to `site.data` yet.
export async function loadBookData(srcRoot) {
  const data = await loadData(srcRoot);
  return data.book ?? null;
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

// ---------------------------------------------------------------------------
// §B  Chapter anchor + URL helpers
// ---------------------------------------------------------------------------

// PLAN-8 §6.1: URL -> `ch-...` slug. Mirrors book-href-rewrite.rb's
// `chapter_anchor` -- replace every `/` with `-`, strip a leading or
// trailing `-`, and prepend `ch-`. The root URL `/` collapses to an
// empty seed; fall back to a slug of `fallbackTitle` so it reads
// `ch-introduction` rather than just `ch-`.
export function chapterAnchorFromUrl(url, fallbackTitle = null) {
  let seed = String(url).replaceAll("/", "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
  if (seed === "" && fallbackTitle) {
    seed = String(fallbackTitle).toLowerCase().replaceAll(" ", "-");
  }
  return "ch-" + seed;
}

// PLAN-8 §6.2: parent URL for relative-href resolution. Folder-style
// URLs (`/tB/Core/`) are their own parent; single-file URLs
// (`/tB/Core/Const`) drop the trailing segment.
function parentUrlOf(url) {
  if (url.endsWith("/")) return url;
  return url.replace(/[^\/]+$/, "");
}

// PLAN-8 §6.12 / §6.13 (duplicated from offline.mjs by design --
// book-href-rewrite.rb keeps its own copy of normalize_baseurl so
// plugins are independent).
function normalizeBaseurl(raw) {
  let baseurl = String(raw ?? "").replace(/\/+$/, "");
  if (baseurl && !baseurl.startsWith("/")) baseurl = "/" + baseurl;
  return baseurl;
}

// ---------------------------------------------------------------------------
// §C  Per-chapter body transform (port of book-chapter-transform.rb)
// ---------------------------------------------------------------------------

// PLAN-8 §6.3 / book-chapter-transform.rb WHITESPACE_PATTERNS. Longest
// first; reordering would change the post-transform body and break
// byte-parity. The 12 patterns wrap inter-span whitespace in
// `<span class="w">...</span>` so pagedjs's page splitter doesn't
// collapse it at page breaks.
const WHITESPACE_PATTERNS = (() => {
  const SP = " ";
  const NL = "\n";
  const S4 = "    ";
  const S8 = "        ";
  const S12 = "            ";
  const S16 = "                ";
  return [
    [`</span>${SP}${NL}${SP}${NL}<span`,
     `</span><span class="w">${SP}${NL}${SP}${NL}</span><span`],
    [`</span>${NL}${SP}${NL}<span`,
     `</span><span class="w">${NL}${SP}${NL}</span><span`],
    [`</span>${SP}${NL}${S12}<span`,
     `</span><span class="w">${SP}${NL}${S12}</span><span`],
    [`</span>${SP}${NL}${S8}<span`,
     `</span><span class="w">${SP}${NL}${S8}</span><span`],
    [`</span>${SP}${NL}${S4}<span`,
     `</span><span class="w">${SP}${NL}${S4}</span><span`],
    [`</span>${SP}${NL}<span`,
     `</span><span class="w">${SP}${NL}</span><span`],
    [`</span>${NL}${S16}<span`,
     `</span><span class="w">${NL}${S16}</span><span`],
    [`</span>${NL}${S12}<span`,
     `</span><span class="w">${NL}${S12}</span><span`],
    [`</span>${NL}${S8}<span`,
     `</span><span class="w">${NL}${S8}</span><span`],
    [`</span>${NL}${S4}<span`,
     `</span><span class="w">${NL}${S4}</span><span`],
    [`</span>${NL}<span`,
     `</span><span class="w">${NL}</span><span`],
    [`</span> <span`,
     `</span><span class="w"> </span><span`],
  ];
})();

// Note: the Ruby version consumes a trailing `\n?` to clean up the
// (typically blank) line following each tag. kramdown's markdownify
// emits a true blank line between `</summary>` and the next `<p>`
// (two `\n`s); consuming one `\n` leaves one for compressHtml to
// convert to a space. markdown-it (tbdocs's Phase 3) emits a single
// `\n` between them; consuming it would leave NO whitespace at all,
// and the post-assembly compress would join `</summary><p>` without
// the space Jekyll's compress emits. Drop the `\n?` from all three
// regexes so the separating newline is preserved either way. The
// resulting post-compress bytes are identical for kramdown's input
// (the duplicate `\n` collapses to one space) and now match for
// markdown-it's input too.
const DETAILS_OPEN_RE  = /<details[^>]*>/gi;
const DETAILS_CLOSE_RE = /<\/details>/gi;
const SUMMARY_RE       = /<summary[^>]*>|<\/summary>/gi;
const HEADING_SHIFT_RE = /<(\/?)h([1-6])\b/g;
const HEADING_ID_RE    = /<(h[2-6]|h7-stub)((?:\s+class="no_toc")?)\s+id="/g;

// PLAN-8 §6.3 / book-chapter-transform.rb#book_chapter_transform. Five
// logical passes:
//   1. strip `src="<baseurl>/` prefix (no-op when baseurl is empty)
//   2. unwrap <details>/<summary> tags (FAQ-style collapsibles flatten
//      for print)
//   3. wrap inter-span whitespace in <span class="w">...</span>
//      (longest pattern first)
//   4. heading shift by N levels (0..3), capping at h7-stub
//   5. anchor-id prefix on heading ids + intra-chapter href="#..."
export function bookChapterTransform(body, baseurl, headingShiftN, chapterAnchor) {
  if (!body) return body;
  let result = body;

  // Step 1: strip the baseurl-prefixed src. With baseurl="" the strip
  // is `src="/` -> `src="`, which removes the leading slash from
  // root-absolute image paths. Matches book-chapter-transform.rb's
  // `gsub!(%(src="#{baseurl}/), %(src="))` -- the Ruby version doesn't
  // gate on empty baseurl either; the include? check is only an
  // optimisation to skip the gsub! call when there's nothing to do.
  const strip = `src="${baseurl}/`;
  if (result.includes(strip)) result = result.replaceAll(strip, `src="`);

  // Step 2: unwrap <details>/<summary>.
  result = result.replace(DETAILS_OPEN_RE, "");
  result = result.replace(DETAILS_CLOSE_RE, "");
  result = result.replace(SUMMARY_RE, "");

  // Step 2b: strip the just-the-docs `<div class="table-wrapper">`
  // around every <table>. The book-combined layout doesn't run the
  // table_wrappers include, so Jekyll's book.html carries bare
  // `<table>` tags. tbdocs's Phase 3 renderer always wraps tables
  // (see render.mjs's table_open / table_close rules), so undo
  // the wrap here so the per-chapter body matches Jekyll's pre-wrap
  // shape.
  result = result.replaceAll(`<div class="table-wrapper"><table>`, `<table>`);
  result = result.replaceAll(`</table></div>`, `</table>`);

  // Step 3: whitespace span wrapping (longest first).
  for (const [search, replacement] of WHITESPACE_PATTERNS) {
    result = result.replaceAll(search, replacement);
  }

  // Step 4: heading shift by N (0..3 levels; cap at h7-stub).
  const n = Math.max(0, Math.min(3, Number(headingShiftN) || 0));
  if (n > 0) {
    result = result.replace(HEADING_SHIFT_RE, (_, slash, levelStr) => {
      const newLevel = parseInt(levelStr, 10) + n;
      return newLevel > 6 ? `<${slash}h7-stub` : `<${slash}h${newLevel}`;
    });
  }

  // Step 5: anchor-id prefix on every heading id + every href="#".
  if (chapterAnchor) {
    const prefix = `${chapterAnchor}-`;
    result = result.replace(HEADING_ID_RE, (_, tag, classAttr) => `<${tag}${classAttr} id="${prefix}`);
    result = result.replaceAll(`href="#`, `href="#${prefix}`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// §D  Article wrapper assembly (port of book-chapter-body.html)
// ---------------------------------------------------------------------------

// PLAN-8 §6.4: per-chapter article wrap. Sub-page detection + kind/name
// capture (1.6a/1.6c), heading-shift level computation, chapter anchor
// derivation, body transform, then <article>...</article> emit.
//
// `opts` keys:
//   articleClassOverride   string. When set, replaces the default "page".
//                          Sub-page styling never kicks in.
//   chapterAnchorOverride  string. Replaces the URL-derived anchor.
//   skipSubPageDetection   truthy. Don't read/update the state machine.
//   skipBaseHeadingShift   truthy. Skip the +1 1.5a base shift.
//   extraHeadingShift      truthy. Apply an additional +1 shift (1.9
//                          chaptered-part extra).
function emitChapter(out, chapter, opts, subPageState, baseurl) {
  let body = chapter.renderedContent;
  if (!body || !body.trim()) return;

  // book-chapter-body.html line 59-64: if content starts with `<`, use
  // verbatim; otherwise run through markdownify. tbdocs's Phase 3 has
  // already rendered every chapter; the body is HTML regardless.
  // (HTML pages like 404.html go through renderPage which returns
  // rawContent; markdown pages get rendered to HTML in renderPage.)

  const isSubPage = updateSubPageState(chapter, opts, subPageState);

  let n = 0;
  if (!opts.skipBaseHeadingShift) n++;
  if (isSubPage) n++;
  if (opts.extraHeadingShift) n++;

  const chapterAnchor = opts.chapterAnchorOverride
    ?? chapterAnchorFromUrl(chapter.permalink);

  body = bookChapterTransform(body, baseurl, n, chapterAnchor);
  if (!body.trim()) return;

  const articleClass = pickArticleClass(opts, isSubPage);
  const headerTitle  = pickHeaderTitle(chapter, opts, isSubPage, subPageState);

  // Article structure mirrors book-chapter-body.html lines 171-174:
  //   <article class="..." id="...">
  //   <span class="header-string">...</span>
  //   {body}
  //   </article>
  // Pre-compress; the html-compress pass at the end collapses the
  // surrounding whitespace.
  out.push(`<article class="${articleClass}" id="${chapterAnchor}">\n`);
  out.push(`<span class="header-string">${headerTitle}</span>\n`);
  out.push(body);
  // Some chapter bodies end with `\n`; some don't. The Liquid template
  // emits `{{ body }}\n</article>`, so we always need a separator
  // before </article>.
  if (!body.endsWith("\n")) out.push("\n");
  out.push("</article>");
}

// book-chapter-body.html lines 75-99. Skipped when skipSubPageDetection
// is truthy. For folder-style URLs (trailing slash), the state captures
// the new index URL + name + kind. For other URLs, returns true when
// the URL starts with the captured index URL.
function updateSubPageState(chapter, opts, state) {
  if (opts.skipSubPageDetection) return false;
  const url = chapter.permalink;
  if (url.endsWith("/")) {
    state.currentIndexUrl = url;
    state.currentIndexName = String(chapter.frontmatter.title ?? "")
      .replaceAll(" Module", "")
      .replaceAll(" module", "")
      .replaceAll(" Class", "")
      .replaceAll(" class", "")
      .replaceAll(" Package", "");
    // book-chapter-body.html line 85-90 reads chapter.content (the
    // pre-rendered markdown source). tbdocs already has the rendered
    // HTML in chapter.renderedContent; the same "first 200 chars,
    // lowercase, look for 'module'" heuristic gives the same answer
    // on the rendered HTML because the H1 text survives kramdown's
    // emit unchanged.
    const head = String(chapter.renderedContent ?? "").slice(0, 200).toLowerCase();
    state.currentIndexKind = head.includes("module") ? "module" : "class";
    return false;
  }
  if (state.currentIndexUrl === "") return false;
  if (url.startsWith(state.currentIndexUrl)) return true;
  state.currentIndexUrl = "";
  return false;
}

// book-chapter-body.html lines 155-170.
function pickArticleClass(opts, isSubPage) {
  if (opts.articleClassOverride) return opts.articleClassOverride;
  let cls = "page";
  if (isSubPage) cls += " sub-chapter";
  if (opts.extraHeadingShift) cls += " chaptered";
  return cls;
}

function pickHeaderTitle(chapter, opts, isSubPage, state) {
  if (opts.articleClassOverride) return chapter.frontmatter.title ?? "";
  if (isSubPage) return `${state.currentIndexName} - ${chapter.frontmatter.title ?? ""}`;
  return chapter.frontmatter.title ?? "";
}

// ---------------------------------------------------------------------------
// §E  Top-level walker (port of book.html's Liquid)
// ---------------------------------------------------------------------------

const ROMAN = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// PLAN-8 §5.2: assembleBook. Walks site.bookData and emits the title
// page + every <article>, runs the cross-ref rewrite + landing-strip
// pass, runs html-compress. Pure compute; no I/O.
export function assembleBook(site, pages) {
  const bookData = site.bookData;
  if (!bookData) {
    throw new Error("Phase 8: site.bookData is unset; Phase 2 didn't run.");
  }

  const lang = site.config?.lang ?? "en-US";
  const siteTitle = String(site.config?.title ?? "");
  const baseurl = String(site.config?.baseurl ?? "");

  const out = [];
  out.push(renderBookHead(lang, siteTitle));
  out.push("\n<body>\n");
  out.push(renderTitlePage(site));
  emitFrontMatter(out, bookData, baseurl);
  (bookData.parts ?? []).forEach((part, i) => emitPart(out, part, i, site, baseurl));
  out.push("\n</body>\n</html>\n");

  let html = out.join("");
  html = rewriteBookHrefs(html, site, pages);
  html = compressHtml(html);
  return html;
}

// PLAN-8 §6.9: head matches book-combined.html lines 1-8 byte-for-byte
// pre-compress. The two `<link>` elements don't carry `/>` self-closing
// (Jekyll emits without it).
function renderBookHead(lang, siteTitle) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${siteTitle}</title>
  <link rel="stylesheet" href="assets/css/rouge.css">
  <link rel="stylesheet" href="assets/css/print.css">
</head>`;
}

// PLAN-8 §6.9: title page matches book.html lines 41-60. The book title
// + subtitle are hardcoded in source HTML, not parameterised through
// the manifest; mirror verbatim.
function renderTitlePage(site) {
  const commit = site.buildInfo?.commit ?? "unknown";
  const commitDate = site.buildInfo?.commitDate ?? "unknown";
  const buildDate = formatBuildDate(commitDate);
  let buildLine;
  if (commit !== "unknown") {
    buildLine = commitDate !== "unknown"
      ? `Built ${buildDate} from commit ${commit} (${commitDate}).`
      : `Built ${buildDate} from commit ${commit}.`;
  } else {
    buildLine = `Built ${buildDate}.`;
  }
  const copyright = String(site.config?.footer_content ?? "");
  // The Liquid template has `{%- assign ... -%}` and `{%- if ... -%}`
  // blocks between `<div class="title-footer">` and `<p class="build-info">`
  // that eat all surrounding whitespace; in the source HTML there is
  // NO whitespace between those two tags. Mirror exactly so the post-
  // compress bytes line up. The newline+indent before
  // `<p class="copyright-line">` is preserved (book.html line 58, no
  // whitespace-eaters around it).
  return `<section class="title-page" id="title-page">
  <div class="title-block">
    <h1 class="book-title">twinBASIC Documentation</h1>
    <p class="book-subtitle">Reference Manual &amp; Tutorials</p>
  </div>
  <div class="title-footer"><p class="build-info">${buildLine}</p>
    <p class="copyright-line">${copyright}</p>
  </div>
</section>`;
}

// PLAN-8 §6.10 / §7.D7. Builds "26 May 2026" from an ISO date like
// "2026-05-26". Falls back to new Date() when the input is "unknown"
// (no git history) or unparseable.
function formatBuildDate(iso) {
  if (!iso || iso === "unknown") {
    const d = new Date();
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Parse YYYY-MM-DD explicitly to avoid timezone surprises. new
  // Date("2026-05-26") parses as UTC midnight, then localised --
  // getDate() can return 25 on a negative-UTC-offset system.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const da = parseInt(m[3], 10);
    return `${da} ${MONTH_NAMES[mo - 1]} ${y}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// PLAN-8 §6.9: part divider matches book.html lines 102-117. Order of
// optional pieces: title (H1 or silent <p>) -> subtitle -> intro.
function renderPartDivider(part, partNum, site) {
  const silent = part.no_outline_entry ? " silent" : "";
  // Jekyll's `{%- for part -%}` eats the leading whitespace before
  // `<article`; emit with no leading newline so `</article><article>`
  // / `</section><article>` join directly.
  let out = `<article class="part-divider${silent}" id="pt-${partNum}">\n`;
  out += `  <span class="part-title-string">${part.title}</span>\n`;
  out += `  <p class="part-number">Part ${ROMAN[partNum - 1] ?? ""}</p>\n`;
  if (part.no_outline_entry) {
    out += `  <p class="part-title-silent">${part.title}</p>`;
  } else {
    out += `  <h1 id="pt-${partNum}-title">${part.title}</h1>`;
  }
  if (part.subtitle) {
    // book.html line 111-112: subtitle | markdownify | remove '<p>'
    // | remove '</p>' | strip. Inline render via the markdown-it
    // instance Phase 3 stashed on site.markdown.
    const md = site.markdown;
    if (!md) {
      throw new Error("Phase 8: site.markdown is unset; Phase 3 didn't run before assembleBook.");
    }
    const renderedSubtitle = md.render(String(part.subtitle))
      .replaceAll("<p>", "")
      .replaceAll("</p>", "")
      .trim();
    out += `\n  <p class="part-subtitle">${renderedSubtitle}</p>`;
  }
  if (part.intro) {
    const md = site.markdown;
    if (!md) {
      throw new Error("Phase 8: site.markdown is unset; Phase 3 didn't run before assembleBook.");
    }
    out += `\n  <div class="part-intro">${md.render(String(part.intro))}</div>`;
  }
  out += `\n</article>`;
  return out;
}

// PLAN-8 §6.9: chapter divider matches book.html lines 218-227.
function renderChapterDivider(chEntry) {
  let idSeed;
  if (chEntry.landing_page) {
    idSeed = String(chEntry.landing_page).replaceAll("/", "-")
      .replace(/^-/, "")
      .replace(/-$/, "");
  } else {
    idSeed = String(chEntry.title ?? "").toLowerCase().replaceAll(" ", "-");
  }
  const dividerId = `chd-${idSeed}`;
  const silent = chEntry.no_outline_entry ? " silent" : "";
  // No leading newline -- mirrors Jekyll's `{%- for ch_entry -%}` strip.
  let out = `<article class="chapter-divider${silent}" id="${dividerId}">\n`;
  if (chEntry.no_outline_entry) {
    out += `  <p class="chapter-title-silent">${chEntry.title}</p>`;
  } else {
    out += `  <h2 id="${dividerId}-title">${chEntry.title}</h2>`;
  }
  if (chEntry.subtitle) {
    // book.html line 224-226: chapter subtitle is NOT markdownified --
    // emitted verbatim.
    out += `\n  <p class="chapter-subtitle">${chEntry.subtitle}</p>`;
  }
  out += `\n</article>`;
  return out;
}

// book.html lines 77-99: front-matter loop. Each fm entry's _chapters
// are emitted with article_class_override='front-matter' and
// skip_sub_page_detection=true. The root URL `/` collapses to an empty
// anchor seed; supply `ch-{fm.title-slug}` as the override.
function emitFrontMatter(out, bookData, baseurl) {
  const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
  for (const fm of bookData.front_matter ?? []) {
    for (const chapter of fm._chapters ?? []) {
      const fmAnchor = chapter.permalink === "/"
        ? `ch-${String(fm.title ?? "").toLowerCase().replaceAll(" ", "-")}`
        : null;
      // No inter-article whitespace -- Jekyll's `{%- for -%}` and
      // `{%- include -%}` strip everything around the include.
      emitChapter(out, chapter, {
        articleClassOverride: "front-matter",
        chapterAnchorOverride: fmAnchor,
        skipSubPageDetection: true,
      }, state, baseurl);
    }
  }
}

// book.html lines 101-282: numbered parts loop. Emits part-divider,
// optional foreword, optional chaptered-part landing, then the chapter
// content. The sub-page state machine resets per chapter (chaptered)
// or runs across the whole part (flat).
function emitPart(out, part, partIdx, site, baseurl) {
  const partNum = partIdx + 1;
  out.push(renderPartDivider(part, partNum, site));

  if (part.foreword_page && part._foreword) {
    const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
    emitChapter(out, part._foreword, {
      articleClassOverride: "part-foreword",
      skipSubPageDetection: true,
      skipBaseHeadingShift: !!part.no_heading_shift,
    }, state, baseurl);
  }

  if (part.chapters && part.landing_page && part._landing) {
    const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
    emitChapter(out, part._landing, {
      skipSubPageDetection: true,
      skipBaseHeadingShift: !!part.no_heading_shift,
    }, state, baseurl);
  }

  if (part.chapters) {
    for (const chEntry of part.chapters) {
      out.push(renderChapterDivider(chEntry));
      const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
      for (const chapter of chEntry._chapters ?? []) {
        const flags = chapteredFlags(part, chEntry);
        emitChapter(out, chapter, flags, state, baseurl);
      }
    }
  } else {
    const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
    for (const chapter of part._chapters ?? []) {
      const isPartLanding = part.landing_page && chapter.permalink === part.landing_page;
      const flags = {};
      if (part.no_heading_shift) flags.skipBaseHeadingShift = true;
      if (isPartLanding) flags.skipSubPageDetection = true;
      emitChapter(out, chapter, flags, state, baseurl);
    }
  }
}

// book.html lines 242-250: per-chaptered-chapter flag combinations.
//   part.no_heading_shift && ch_entry.no_heading_shift: skipBase=true
//   part.no_heading_shift                              : skipBase=true, extra=true
//   ch_entry.no_heading_shift                          : (no flags)
//   default                                            : extra=true
function chapteredFlags(part, chEntry) {
  const partSkip = !!part.no_heading_shift;
  const chSkip = !!chEntry.no_heading_shift;
  const flags = {};
  if (partSkip && chSkip) {
    flags.skipBaseHeadingShift = true;
  } else if (partSkip) {
    flags.skipBaseHeadingShift = true;
    flags.extraHeadingShift = true;
  } else if (chSkip) {
    // no flags
  } else {
    flags.extraHeadingShift = true;
  }
  return flags;
}

// ---------------------------------------------------------------------------
// §F  Cross-reference rewrite + landing-strip (port of book-href-rewrite.rb)
// ---------------------------------------------------------------------------

const EXTERNAL_PREFIXES = ["http://", "https://", "mailto:", "#"];

// PLAN-8 §6.6: walk each <article id="ch-..."> block, resolve relative
// hrefs, rewrite in-book targets to `#ch-...` anchors, strip the
// redundant landing-page heading.
//
// Jekyll's site.pages includes jekyll-redirect-from's generated stub
// pages, each carrying the redirect-from URL as its `page.url`. The
// rewriter's prefix match (`page: /tB/Modules/`, etc.) sweeps those
// stubs into the urlToAnchor map alongside the real pages, so a
// link like `[X](/tB/Modules/Aliased)` resolves to a `#ch-...`
// anchor (technically dangling -- no article carries that exact id,
// since the stub bodies aren't emitted as articles -- but matching
// Jekyll's bytes is the goal).
//
// tbdocs's `pages` array doesn't carry the stubs; derive them from
// each page's `frontmatter.redirect_from` and pass an extended array
// to the map builders below.
export function rewriteBookHrefs(html, site, pages) {
  const bookData = site.bookData;
  if (!bookData) return html;
  const baseurl = normalizeBaseurl(site.config?.baseurl);
  const pagesWithStubs = augmentWithRedirectStubs(pages);
  const urlToAnchor = buildUrlToAnchor(bookData, pagesWithStubs);
  if (urlToAnchor.size === 0) return html;
  const anchorToParent = buildAnchorToParent(bookData, pagesWithStubs);
  const stripTargets = buildLandingStripTargets(bookData);

  return html.replace(
    /(<article[^>]*id="(ch-[^"]+)"[^>]*>)([\s\S]*?)(<\/article>)/g,
    (_, open, anchorId, body, close) => {
      if (stripTargets.has(anchorId)) {
        const level = stripTargets.get(anchorId);
        const re = new RegExp(`<${level}\\b[^>]*>[\\s\\S]*?</${level}>`);
        body = body.replace(re, "");
      }
      const parentUrl = anchorToParent.get(anchorId);
      if (parentUrl) {
        body = rewriteBodyHrefs(body, parentUrl, urlToAnchor, baseurl);
      }
      return open + body + close;
    },
  );
}

function rewriteBodyHrefs(body, parentUrl, urlToAnchor, baseurl) {
  return body.replace(/href="([^"]*)"/g, (whole, href) => {
    if (EXTERNAL_PREFIXES.some(p => href.startsWith(p))) return whole;
    const abs = resolveHref(href, parentUrl);
    if (!abs || !abs.startsWith("/")) return whole;
    const [pathPart, fragPart] = splitHash(abs);
    const lookupPath = stripBaseurl(pathPart, baseurl);
    const target = urlToAnchor.get(lookupPath);
    if (target) {
      return fragPart
        ? `href="#${target}-${fragPart}"`
        : `href="#${target}"`;
    }
    const missPath = fragPart ? `${lookupPath}#${fragPart}` : lookupPath;
    return `href="${missPath}"`;
  });
}

// PLAN-8 §6.6 / book-href-rewrite.rb#resolve_href. Uses Web URL +
// dummy origin so RFC-3986 path normalisation is handled by the
// stdlib.
function resolveHref(href, parentUrl) {
  if (href.startsWith("/")) return href;
  try {
    const base = "http://x" + parentUrl;
    const merged = new URL(href, base);
    return merged.hash
      ? `${merged.pathname}${merged.hash}`
      : merged.pathname;
  } catch {
    return null;
  }
}

function splitHash(abs) {
  const i = abs.indexOf("#");
  if (i === -1) return [abs, null];
  return [abs.slice(0, i), abs.slice(i + 1)];
}

function stripBaseurl(p, baseurl) {
  if (!baseurl) return p;
  if (p === baseurl) return "/";
  if (p.startsWith(baseurl + "/")) return p.slice(baseurl.length);
  return p;
}

// PLAN-8 §6.7: which `<article>` anchors carry a "strip the first HN
// heading" instruction, and at what heading level. Mirrors
// book-href-rewrite.rb#build_landing_strip_targets.
function buildLandingStripTargets(bookData) {
  const map = new Map();
  for (const part of bookData.parts ?? []) {
    const partSkipBase = !!part.no_heading_shift;
    if (part.landing_page && !part.no_outline_entry) {
      const level = partSkipBase ? 1 : 2;
      const anchor = chapterAnchorFromUrl(part.landing_page, part.title);
      map.set(anchor, `h${level}`);
    }
    for (const ch of part.chapters ?? []) {
      if (!ch.landing_page || ch.no_outline_entry) continue;
      const chSkipExtra = !!ch.no_heading_shift;
      let level = 1;
      if (!partSkipBase) level++;
      if (!chSkipExtra) level++;
      const anchor = chapterAnchorFromUrl(ch.landing_page, ch.title);
      map.set(anchor, `h${level}`);
    }
  }
  return map;
}

// Synthesize redirect-stub Page-likes from each real page's
// `frontmatter.redirect_from`. The result is the original pages
// array concatenated with one virtual page per redirect-from URL,
// each carrying the from-URL as its permalink and inheriting the
// source page's `navPath` (so nav_page / nav_pages selectors still
// match). Mirrors jekyll-redirect-from's `:site, :post_read` Page
// generation.
function augmentWithRedirectStubs(pages) {
  const out = pages.slice();
  for (const p of pages) {
    const from = p.frontmatter?.redirect_from;
    if (from == null) continue;
    const fromList = Array.isArray(from) ? from : [from];
    for (const fromPath of fromList) {
      if (typeof fromPath !== "string" || fromPath === "") continue;
      out.push({
        permalink: fromPath,
        navPath: p.navPath,
        frontmatter: { title: p.frontmatter?.title ?? "" },
        // No other fields needed -- rewriteBookHrefs only reads
        // permalink, navPath, frontmatter.title from the pages list.
      });
    }
  }
  return out;
}

// PLAN-8 §6.8: iterate every book-yml entry that contributes one or
// more pages to the book. Mirrors book-href-rewrite.rb#book_entries.
function bookEntries(bookData) {
  if (!bookData) return [];
  const entries = [];
  for (const fm of bookData.front_matter ?? []) entries.push(fm);
  for (const part of bookData.parts ?? []) {
    if (part.page || part.pages || part.nav_page || part.nav_pages || part.landing_page) {
      entries.push(part);
    }
    if (part.foreword_page) {
      entries.push({ page: part.foreword_page, title: part.title, no_descent: true });
    }
    for (const ch of part.chapters ?? []) entries.push(ch);
  }
  return entries;
}

// PLAN-8 §6.8: pages selected by one entry. Mirrors
// book-href-rewrite.rb#entry_pages. Uses a Set to dedup.
function entryPages(entry, pages) {
  const out = new Set();
  const noDescent = !!entry.no_descent;

  const urlSpecs = [];
  if (entry.page) urlSpecs.push(entry.page);
  if (entry.pages) urlSpecs.push(...entry.pages);
  for (const prefix of urlSpecs) {
    for (const p of pages) {
      if (noDescent ? p.permalink === prefix : p.permalink.startsWith(prefix)) {
        out.add(p);
      }
    }
  }

  const navSpecs = [];
  if (entry.nav_page) navSpecs.push(entry.nav_page);
  if (entry.nav_pages) navSpecs.push(...entry.nav_pages);
  for (const np of navSpecs) {
    for (const p of pages) {
      const navPath = p.navPath;
      if (!navPath) continue;
      if (noDescent ? navPath === np : navPath.startsWith(np)) {
        out.add(p);
      }
    }
  }

  if (entry.landing_page) {
    for (const p of pages) if (p.permalink === entry.landing_page) out.add(p);
  }

  return [...out];
}

// PLAN-8 §6.8: permalink -> chapter-anchor map. Folder-style indexes
// get an alt entry without the trailing slash; .html-suffixed
// permalinks get an alt entry without .html; bare permalinks get an
// alt entry with .html appended. Smooths over the live-site's server-
// side trailing-slash redirect since the PDF has no server.
function buildUrlToAnchor(bookData, pages) {
  const map = new Map();
  for (const entry of bookEntries(bookData)) {
    for (const page of entryPages(entry, pages)) {
      const anchor = chapterAnchorFromUrl(page.permalink, entry.title);
      map.set(page.permalink, anchor);
      if (page.permalink.endsWith("/")) {
        map.set(page.permalink.replace(/\/$/, ""), anchor);
      } else if (page.permalink.endsWith(".html")) {
        map.set(page.permalink.replace(/\.html$/, ""), anchor);
      } else {
        map.set(page.permalink + ".html", anchor);
      }
    }
  }
  return map;
}

function buildAnchorToParent(bookData, pages) {
  const map = new Map();
  for (const entry of bookEntries(bookData)) {
    for (const page of entryPages(entry, pages)) {
      map.set(
        chapterAnchorFromUrl(page.permalink, entry.title),
        parentUrlOf(page.permalink),
      );
    }
  }
  return map;
}
