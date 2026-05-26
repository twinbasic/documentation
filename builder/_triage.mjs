// Triage harness: walk every page, find the first divergence from
// Jekyll's output, then classify it into a coarse bucket so we can rank
// remaining work by pattern frequency * visual severity.
//
// Two modes, selected at the command line:
//
//   node _triage.mjs               -- Phase 4 mode (default, canonical).
//                                     Diffs page.html (full document, post-
//                                     templatePhase) against _site/<destPath>.
//                                     Strips the sidebar before classifying
//                                     -- nav-order divergence is a Phase 1/2
//                                     file-enumeration issue, not a Phase 4
//                                     classifier-actionable bucket; reported
//                                     once as "sidebar-only".
//
//   node _triage.mjs --phase3      -- Body-fragment mode (Phase 3 verification).
//                                     Extracts <main>...</main>, strips the
//                                     anchor-headings + children-TOC the
//                                     layout adds, normalises whitespace,
//                                     diffs against page.renderedContent.
//
// Severity scale:
//   high   = visible to the reader (wrong colors, missing content, wrong
//            text, broken links)
//   medium = visible if you look (extra whitespace, missing class on a
//            visible element)
//   low    = invisible to readers but breaks byte-equality (whitespace
//            artefacts, ordering, layout-only quirks)
//   info   = not a Phase 4 classifier-actionable bucket (upstream issue)

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";
import { renderPhase } from "./render.mjs";
import { templatePhase } from "./template.mjs";
import { deriveSitemapUrls, extractSitemapUrls, renderRobotsTxt } from "./sitemap.mjs";
import { deriveRedirectStubs } from "./redirects.mjs";
import { deriveSearchEntries, writeSearchData } from "./search.mjs";
import {
  buildOfflineState,
  deriveOfflinePage,
  deriveOfflineRedirect,
  deriveOfflineCss,
  deriveOfflineJtdJs,
  deriveOfflineSearchDataJs,
} from "./offline.mjs";
import { ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");
const siteOfflineRoot = path.join(srcRoot, "_site-offline");
const phase3Mode = process.argv.includes("--phase3");
const showAll = process.argv.includes("--all");

const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
const { navTree } = computeNav(pages, config);
const seo = precomputeSeo(pages, config);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
const buildInfo = phase3Mode ? null : await captureBuildInfo();
const site = { config, navTree, ...seo, buildInfo, bookData };
await renderPhase(pages, site, staticFiles);
if (!phase3Mode) await templatePhase(pages, site);

// ---------- Phase 4 (full-page) rules ----------------------------------
//
// Classification runs in two passes:
//   (a) content-based RULES tested against the diff context. These
//       capture cross-region patterns -- a kramdown nbsp before a
//       footnote backref, a Shiki/Rouge token-boundary mismatch,
//       etc. They're more specific than region detection alone.
//   (b) region-based fallback -- locate the first diff offset relative
//       to landmark positions in the Jekyll document (head/sidebar/
//       main-header/breadcrumbs/<main>/footer) and bucket by region.

const PHASE4_RULES = [
  {
    id: "nbsp-empty-table-cell",
    severity: "low",
    label: "Empty table cell: kramdown emits <td>\\xa0</td>; Phase 3 padEmptyCells emits <td> </td>",
    test: (j, o) => /<td[^>]*>\xa0/.test(j) && /<td[^>]*> /.test(o),
  },
  {
    id: "nbsp-footnote-backref",
    severity: "low",
    label: "Footnote backref: kramdown emits &#160;<a class=\"reversefootnote\">; Phase 3 footnote_anchor rule emits a regular space",
    test: (j, o) => /\xa0<a [^>]*class="reversefootnote"/.test(j) && / <a [^>]*class="reversefootnote"/.test(o),
  },
  {
    id: "code-highlight-other-lang",
    severity: "medium",
    label: "Per-language code highlighting (Shiki vs Rouge token-boundary differences in HTML/JSON/JS/etc.)",
    test: (j, o) => /class="language-(html|json|js|javascript|yaml|xml|sql|sh|cpp|c|ruby|liquid|text)/.test(j) &&
                    /class="language-(html|json|js|javascript|yaml|xml|sql|sh|cpp|c|ruby|liquid|text)/.test(o),
  },
  {
    id: "no_toc-on-heading",
    severity: "low",
    label: "`{: .no_toc }` lands on the heading element in kramdown vs on the following paragraph in ours",
    test: (j, o) => /<h\d class="no_toc"/.test(j) && /<p class="no_toc"/.test(o),
  },
  {
    id: "list-paragraph-wrap",
    severity: "low",
    label: "Loose/tight list paragraph wrapping (kramdown per-item vs markdown-it per-list)",
    test: (j, o) => {
      const jWrap = (j.match(/<li>\s*<p>/g) || []).length;
      const oWrap = (o.match(/<li>\s*<p>/g) || []).length;
      return jWrap !== oWrap;
    },
  },
  {
    id: "setext-heading-after-list",
    severity: "medium",
    label: "`---` after a list item parses as setext H2 (kramdown promotes; ours treats as <hr>)",
    test: (j, o) => /<li>\s*<h2/.test(j) && /<hr/.test(o),
  },
  {
    id: "smart-quote",
    severity: "low",
    label: "Smart quote / apostrophe (curly vs straight, en-dash vs hyphen) divergence",
    test: (j, o) => {
      const jChars = j.match(/[‘’“”–—]/g) || [];
      const oChars = o.match(/[‘’“”–—]/g) || [];
      return jChars.length !== oChars.length;
    },
  },
  {
    id: "blockquote-vs-admonition",
    severity: "medium",
    label: "Admonition rewrite skipped (body in <blockquote> instead of inside the alert div)",
    test: (j, o) => /markdown-alert/.test(j) && /<blockquote/.test(o),
  },
  {
    id: "scope-mapping",
    severity: "medium",
    label: "tB scope-to-class mapping mismatch (one Rouge class is the right answer; we picked the wrong neighbour)",
    test: (j, o) => /class="(k|kt|kd|ow|o|nf|nc|nn|nv|n|nb|na|s|se|mi|mf|m|ld|lb|le|ln|lu|c1|cm|cp|lc|p|err)"/.test(j) &&
                    /class="(k|kt|kd|ow|o|nf|nc|nn|nv|n|nb|na|s|se|mi|mf|m|ld|lb|le|ln|lu|c1|cm|cp|lc|p|err)"/.test(o),
  },
];

// Phase 3 rules (body-fragment mode). Same as the historical set; the
// nbsp rules are absent here because Phase 3's normalise() turns nbsp
// into regular whitespace -- the diff is invisible after normalisation.
const PHASE3_RULES = [
  PHASE4_RULES.find((r) => r.id === "code-highlight-other-lang"),
  PHASE4_RULES.find((r) => r.id === "no_toc-on-heading"),
  PHASE4_RULES.find((r) => r.id === "list-paragraph-wrap"),
  PHASE4_RULES.find((r) => r.id === "setext-heading-after-list"),
  {
    id: "kramdown-image-as-table",
    severity: "low",
    label: "Kramdown misparses `![alt | text](url)` as a markdown table (the `|` in alt text trips the table detector); we correctly emit `<img>`",
    test: (j, o) => /<td>!?\[/.test(j) && /<img\b/.test(o),
  },
  PHASE4_RULES.find((r) => r.id === "smart-quote"),
  PHASE4_RULES.find((r) => r.id === "blockquote-vs-admonition"),
  {
    id: "missing-anchor-attr",
    severity: "low",
    label: "kramdown emits role/itemprop attributes we don't (anchor accessibility metadata)",
    test: (j, o) => /role="doc-/.test(j) && !/role="doc-/.test(o),
  },
  {
    id: "deflist-wrap",
    severity: "low",
    label: "Definition list <p> wrap inside <dd> (tight vs loose detection differences)",
    test: (j, o) => /<dd>\s*<p>/.test(j) !== /<dd>\s*<p>/.test(o),
  },
  {
    id: "table-attrs",
    severity: "low",
    label: "Table attribute differences (alignment, header markup)",
    test: (j, o) => /<th[^>]+>/.test(j) || /<th[^>]+>/.test(o),
  },
  PHASE4_RULES.find((r) => r.id === "scope-mapping"),
  {
    id: "attr-encoding",
    severity: "low",
    label: "HTML attribute escaping / quoting differences",
    test: (j, o) => /&#?\w+;/.test(j) !== /&#?\w+;/.test(o),
  },
];

const FALLBACK = { id: "other", severity: "?", label: "Unclassified divergence" };

// ---------- region-based classifier (Phase 4 only) ---------------------

// Severity for region buckets. Most chrome regions are medium (a wrong
// SEO tag or footer link is visible), activation CSS / anchor-headings
// are low (invisible to readers, just byte-level), sidebar is info
// (out of Phase 4's scope -- nav order is a Phase 1/2 issue).
const REGION_SEVERITY = {
  "nav-order-propagation": { severity: "info", label: "Sidebar nav + per-page activation CSS only (Phase 1/2 file enumeration order propagating into the nav tree and the derived nth-child indices)" },
  "sidebar-only":     { severity: "info",   label: "Sidebar-only diff (nav-order from Phase 1/2 file enumeration; nothing else differs)" },
  "head-seo":         { severity: "medium", label: "Inside <!-- Begin Jekyll SEO tag --> block (title, og:*, canonical, JSON-LD)" },
  "head-activation":  { severity: "low",    label: "Inside <style id=\"jtd-nav-activation\"> block (per-page CSS)" },
  "head-other":       { severity: "medium", label: "Inside <head> but outside SEO + activation (meta, scripts, favicon)" },
  "sidebar":          { severity: "info",   label: "Inside the sidebar's auxiliary blocks (site-title, nav-external-links, site-footer)" },
  "svg-sprite":       { severity: "low",    label: "Inside the <svg class=\"d-none\"> icon sprite block" },
  "main-header":      { severity: "medium", label: "Inside <div id=\"main-header\"> (search input, aux-nav)" },
  "breadcrumbs":      { severity: "medium", label: "Inside <nav aria-label=\"Breadcrumb\"> block" },
  "anchor-heading":   { severity: "low",    label: "Inside a heading's <a class=\"anchor-heading\"> wrapper" },
  "body":             { severity: "medium", label: "Inside <main>...</main> (Phase 3 renderer territory)" },
  "children-nav":     { severity: "medium", label: "Inside the children-nav block (auto-generated TOC at page bottom)" },
  "footer-chrome":    { severity: "medium", label: "Inside <footer> (back-to-top, copyright, edit/offline links)" },
  "search-footer":    { severity: "low",    label: "Inside the search-overlay / search-button block" },
  "outside":          { severity: "low",    label: "Outside known regions (doctype, <html>, <body> opening, <body> closing, <html> close)" },
};

// Walk jekyll once, find each landmark's start. Returns sorted array
// of [pos, regionLabel] tuples for O(log n) region lookup per page.
function buildRegionMap(jekyll) {
  const landmarks = [];
  const push = (pos, label) => { if (pos >= 0) landmarks.push([pos, label]); };

  const headStart = jekyll.indexOf("<head>");
  const headEnd = jekyll.indexOf("</head>");
  push(headStart, "head-other");

  const activationStart = jekyll.indexOf(`<style id="jtd-nav-activation">`);
  const activationEnd = activationStart >= 0
    ? jekyll.indexOf("</style>", activationStart) + "</style>".length
    : -1;
  push(activationStart, "head-activation");
  if (activationEnd >= 0) push(activationEnd, "head-other");

  const seoStart = jekyll.indexOf("<!-- Begin Jekyll SEO tag");
  const seoEnd = jekyll.indexOf("<!-- End Jekyll SEO tag -->");
  push(seoStart, "head-seo");
  if (seoEnd >= 0) push(seoEnd + "<!-- End Jekyll SEO tag -->".length, "head-other");

  if (headEnd >= 0) push(headEnd + "</head>".length, "outside");

  const spriteStart = jekyll.indexOf(`<svg xmlns="http://www.w3.org/2000/svg" class="d-none">`);
  if (spriteStart >= 0) {
    const spriteEnd = jekyll.indexOf("</svg>", spriteStart) + "</svg>".length;
    push(spriteStart, "svg-sprite");
    push(spriteEnd, "outside");
  }

  const sideStart = jekyll.indexOf(`<div class="side-bar">`);
  push(sideStart, "sidebar");
  // The sidebar's matching </div> is just before <div class="main".
  const mainStart = jekyll.indexOf(`<div class="main" id="top">`);
  push(mainStart, "outside");

  const headerStart = jekyll.indexOf(`<div id="main-header"`, mainStart);
  push(headerStart, "main-header");
  // header ends at the next `<div class="main-content-wrap">`.
  const contentWrapStart = jekyll.indexOf(`<div class="main-content-wrap">`, mainStart);
  push(contentWrapStart, "outside");

  const breadcrumbStart = jekyll.indexOf(`<nav aria-label="Breadcrumb"`, contentWrapStart);
  if (breadcrumbStart >= 0) {
    const breadcrumbEnd = jekyll.indexOf("</nav>", breadcrumbStart) + "</nav>".length;
    push(breadcrumbStart, "breadcrumbs");
    push(breadcrumbEnd, "outside");
  }

  const mainBodyStart = jekyll.indexOf("<main>", contentWrapStart);
  const mainBodyEnd = jekyll.indexOf("</main>", mainBodyStart);
  push(mainBodyStart, "body");

  // children-nav lives inside <main>, but it's a Phase 4 emission
  // distinct from body. The TOC heading "Table of contents" is the
  // tell.
  const tocHeadingPos = mainBodyStart >= 0
    ? jekyll.indexOf(`<h2 class="text-delta">Table of contents</h2>`, mainBodyStart)
    : -1;
  if (tocHeadingPos >= 0 && tocHeadingPos < mainBodyEnd) {
    // The <hr> + <h2> + <ul> block is children-nav.
    push(tocHeadingPos, "children-nav");
  }
  if (mainBodyEnd >= 0) push(mainBodyEnd + "</main>".length, "outside");

  const footerStart = jekyll.indexOf("<footer>", mainBodyEnd);
  if (footerStart >= 0) {
    const footerEnd = jekyll.indexOf("</footer>", footerStart) + "</footer>".length;
    push(footerStart, "footer-chrome");
    push(footerEnd, "outside");
  }

  const searchOverlay = jekyll.indexOf(`<div class="search-overlay">`, footerStart >= 0 ? footerStart : 0);
  if (searchOverlay >= 0) {
    push(searchOverlay, "search-footer");
    push(searchOverlay + `<div class="search-overlay"></div>`.length, "outside");
  }

  landmarks.sort((a, b) => a[0] - b[0]);
  return landmarks;
}

function regionOf(offset, regionMap) {
  // Find the latest landmark <= offset (linear scan; per-page count is
  // ~10-15 so binary search isn't worth the indirection).
  let label = "outside";
  for (const [pos, l] of regionMap) {
    if (pos <= offset) label = l;
    else break;
  }
  return label;
}

// Anchor-heading is emitted INSIDE the body (`<main>`) by Phase 4.
// Specifically detect a diff inside an `<a ... class="anchor-heading">`
// wrapper -- region-of would call this "body" but the cause is Phase 4
// anchor injection, not Phase 3.
function isInsideAnchorHeading(jekyll, offset) {
  const start = jekyll.lastIndexOf("<a ", offset);
  if (start < 0) return false;
  const end = jekyll.indexOf(">", start);
  if (end < 0 || end < offset) return false;
  return jekyll.slice(start, end + 1).includes("anchor-heading");
}

// ---------- shared utilities -------------------------------------------

function normalise(s) {
  return s.replace(/\s+/g, " ").trim();
}

function extractMainBody(html) {
  const start = html.indexOf("<main>");
  if (start < 0) return "";
  const end = html.indexOf("</main>", start);
  if (end < 0) return "";
  let body = html.slice(start + "<main>".length, end);
  body = body.replace(
    /<a href="#[^"]*" class="anchor-heading"[^>]*>\s*<svg[^>]*>\s*<use [^>]*><\/use>\s*<\/svg>\s*<\/a>/g,
    "",
  );
  body = body.replace(/(<h\d[^>]*>)\s+/g, "$1");
  body = body.replace(/\s+(<\/h\d>)/g, "$1");
  const tocMarker = body.search(/<hr\s*\/?>\s*<h2 class="text-delta">Table of contents<\/h2>/);
  if (tocMarker >= 0) body = body.slice(0, tocMarker);
  return normalise(body);
}

const SIDEBAR_RE = /<nav aria-label="Main" id="site-nav"[\s\S]*?<\/nav>/;
const ACTIVATION_RE = /<style id="jtd-nav-activation">[\s\S]*?<\/style>/;
function stripSidebar(h) { return h.replace(SIDEBAR_RE, "<SIDEBAR/>"); }
function stripActivation(h) { return h.replace(ACTIVATION_RE, "<ACTIVATION/>"); }
function stripNavRelated(h) { return stripActivation(stripSidebar(h)); }

// ---------- main loop --------------------------------------------------

const buckets = new Map(); // id -> { rule, count, examples }
let matched = 0;
let differed = 0;
let accepted = 0;
let sidebarOnly = 0;
let navOrderPropagation = 0;
let skipped = 0;

function bumpBucket(id, rule, page, offset, jCtx, oCtx) {
  const b = buckets.get(id) || { rule, count: 0, examples: [] };
  b.count++;
  if (b.examples.length < 3) {
    b.examples.push({ srcRel: page.srcRel, offset, jCtx, oCtx });
  }
  buckets.set(id, b);
}

const RULES = phase3Mode ? PHASE3_RULES.filter(Boolean) : PHASE4_RULES;

for (const p of pages) {
  if (phase3Mode) {
    if (p.ext !== ".md") continue;
  } else {
    if (p.frontmatter.layout === "book-combined") continue;
    if (typeof p.html !== "string") { skipped++; continue; }
  }

  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); } catch { skipped++; continue; }

  let jekyllSubject, oursSubject;
  if (phase3Mode) {
    jekyllSubject = extractMainBody(jekyllHtml);
    oursSubject = normalise(p.renderedContent);
  } else {
    jekyllSubject = jekyllHtml;
    oursSubject = p.html;
  }

  if (jekyllSubject === oursSubject) { matched++; continue; }
  if (ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) { accepted++; continue; }
  differed++;

  // Phase 4 special: if the only diff is in the sidebar (and/or in the
  // activation CSS, which is derived from nav position), bucket once
  // as info and move on. No content rule fires -- the diff isn't
  // Phase-4-actionable; the root cause is Phase 1's file enumeration
  // order mismatch with Jekyll's Ruby Dir.glob, and it propagates
  // through Phase 2's nav-tree position into both the rendered sidebar
  // and the per-page activation CSS's nth-child indices.
  if (!phase3Mode) {
    if (stripSidebar(jekyllSubject) === stripSidebar(oursSubject)) {
      sidebarOnly++;
      bumpBucket(
        "sidebar-only",
        { id: "sidebar-only", severity: "info", label: REGION_SEVERITY["sidebar-only"].label },
        p, -1, "", "",
      );
      continue;
    }
    if (stripNavRelated(jekyllSubject) === stripNavRelated(oursSubject)) {
      navOrderPropagation++;
      bumpBucket(
        "nav-order-propagation",
        { id: "nav-order-propagation", severity: "info", label: REGION_SEVERITY["nav-order-propagation"].label },
        p, -1, "", "",
      );
      continue;
    }
  }

  // For Phase 4 mode, use sidebar-stripped subjects so the nav-order
  // divergence doesn't dominate every page's diff offset. The diff
  // offsets reported are in the stripped string.
  const jStripped = phase3Mode ? jekyllSubject : stripSidebar(jekyllSubject);
  const oStripped = phase3Mode ? oursSubject : stripSidebar(oursSubject);

  const minLen = Math.min(jStripped.length, oStripped.length);
  let i = 0;
  while (i < minLen && jStripped[i] === oStripped[i]) i++;
  const ctxStart = Math.max(0, i - 60);
  const ctxEnd = Math.min(Math.max(jStripped.length, oStripped.length), i + 200);
  const jCtx = jStripped.slice(ctxStart, Math.min(ctxEnd, jStripped.length));
  const oCtx = oStripped.slice(ctxStart, Math.min(ctxEnd, oStripped.length));

  // Content-based rule pass: more specific than region detection.
  let rule = RULES.find((r) => {
    try { return r.test(jCtx, oCtx); } catch { return false; }
  });

  if (rule) {
    bumpBucket(rule.id, rule, p, i, jCtx, oCtx);
    continue;
  }

  if (phase3Mode) {
    bumpBucket("other", FALLBACK, p, i, jCtx, oCtx);
    continue;
  }

  // Phase 4 region-based fallback. The stripped subject lost the
  // sidebar, so region positions shift by `(sidebarLen - "<SIDEBAR/>".length)`.
  // Build the region map against the STRIPPED jekyll so offsets line
  // up directly with i.
  const regionMap = buildRegionMap(jStripped);
  let regionId = regionOf(i, regionMap);
  if (regionId === "body" && isInsideAnchorHeading(jStripped, i)) {
    regionId = "anchor-heading";
  }
  const regionInfo = REGION_SEVERITY[regionId] || { severity: "?", label: "(unknown region)" };
  bumpBucket(regionId, { id: regionId, severity: regionInfo.severity, label: regionInfo.label }, p, i, jCtx, oCtx);
}

const mode = phase3Mode ? "Phase 3 (body fragment)" : "Phase 4 (full page)";
const navLine = phase3Mode ? "" : `, Sidebar-only: ${sidebarOnly}, Nav-order-propagation: ${navOrderPropagation}`;
const skippedLine = skipped > 0 ? `, Skipped: ${skipped}` : "";
console.log(`Mode: ${mode}`);
console.log(`Matched: ${matched}, Accepted: ${accepted}, Differed: ${differed}${navLine}${skippedLine}, Total: ${matched + accepted + differed + sidebarOnly + navOrderPropagation + skipped}`);

// ---- Phase 6 auxiliary audit -----------------------------------------
//
// The triage doesn't run Phase 6 (no file writes), so for each auxiliary
// we derive the tbdocs side in-memory via the pure-compute helpers
// exported from sitemap.mjs / redirects.mjs / search.mjs, then compare
// against the on-disk Jekyll `_site/`. Each section prints one top-line
// MATCH/DIFFER report; divergence details follow on indented lines.

// Sitemap URL set.
await auditSitemap(site, pages, siteRoot);
// Redirect stubs (count + per-stub byte content).
await auditRedirects(site, pages, siteRoot);
// robots.txt (single-file byte content).
await auditRobots(site, siteRoot);
// Search index (entry set + per-entry content, gated by accepted-divergences).
await auditSearch(site, pages, siteRoot);
// Offline tree: per-page derived HTML vs Jekyll's _site-offline/.
// Phase 7 territory. Pages first (the bulk), then auxiliaries.
if (!phase3Mode) {
  await auditOfflinePages(site, pages, staticFiles, siteRoot, siteOfflineRoot);
  await auditOfflineRedirects(site, pages, staticFiles, siteRoot, siteOfflineRoot);
  await auditOfflineCss(site, pages, staticFiles, siteRoot, siteOfflineRoot);
  await auditOfflineJtd(siteRoot, siteOfflineRoot);
  await auditOfflineSearch(site, pages, siteOfflineRoot);
}

console.log();

async function auditSitemap(site, pages, siteRoot) {
  const p = path.join(siteRoot, "sitemap.xml");
  let xml;
  try { xml = await fs.readFile(p, "utf8"); } catch { xml = null; }
  if (xml == null) {
    console.log(`Sitemap: SKIPPED (no ${p})`);
    return;
  }
  const jset = extractSitemapUrls(xml);
  const tset = deriveSitemapUrls(pages, site);
  const onlyJ = [...jset].filter(u => !tset.has(u)).sort();
  const onlyT = [...tset].filter(u => !jset.has(u)).sort();
  if (onlyJ.length === 0 && onlyT.length === 0) {
    console.log(`Sitemap: MATCH (${jset.size} URLs)`);
    return;
  }
  console.log(`Sitemap: DIFFER (jekyll=${jset.size}, tbdocs=${tset.size}; ` +
              `only-jekyll=${onlyJ.length}, only-tbdocs=${onlyT.length})`);
  for (const u of onlyJ.slice(0, 5)) console.log(`  - ${u}`);
  if (onlyJ.length > 5) console.log(`  - ... +${onlyJ.length - 5} more`);
  for (const u of onlyT.slice(0, 5)) console.log(`  + ${u}`);
  if (onlyT.length > 5) console.log(`  + ... +${onlyT.length - 5} more`);
}

async function auditRedirects(site, pages, siteRoot) {
  let stubs;
  try { stubs = deriveRedirectStubs(pages, site); }
  catch (err) {
    console.log(`Redirects: COLLISION (${err.message.split("\n")[0]})`);
    return;
  }
  let match = 0;
  let missing = 0;
  let mismatch = 0;
  const issues = [];
  for (const s of stubs) {
    let onDisk;
    try { onDisk = await fs.readFile(path.join(siteRoot, s.destPath), "utf8"); }
    catch { missing++; if (issues.length < 5) issues.push({ kind: "missing", destPath: s.destPath }); continue; }
    if (onDisk === s.html) { match++; }
    else { mismatch++; if (issues.length < 5) issues.push({ kind: "mismatch", destPath: s.destPath }); }
  }
  if (mismatch === 0 && missing === 0) {
    console.log(`Redirects: MATCH (${stubs.length} stubs)`);
    return;
  }
  console.log(`Redirects: DIFFER (${stubs.length} stubs; ${match} match, ${mismatch} byte-mismatch, ${missing} missing in jekyll)`);
  for (const i of issues) console.log(`  ${i.kind === "missing" ? "-" : "≠"} ${i.destPath}`);
  if (issues.length < missing + mismatch) console.log(`  ... +${missing + mismatch - issues.length} more`);
}

async function auditRobots(site, siteRoot) {
  const p = path.join(siteRoot, "robots.txt");
  let onDisk;
  try { onDisk = await fs.readFile(p, "utf8"); } catch { onDisk = null; }
  if (onDisk == null) {
    console.log(`Robots.txt: SKIPPED (no ${p})`);
    return;
  }
  const expected = renderRobotsTxt(site.config);
  if (onDisk === expected) {
    console.log(`Robots.txt: MATCH (${expected.length} bytes)`);
    return;
  }
  console.log(`Robots.txt: DIFFER (jekyll=${onDisk.length}, tbdocs=${expected.length})`);
  console.log(`  J: ${JSON.stringify(onDisk.slice(0, 120))}`);
  console.log(`  T: ${JSON.stringify(expected.slice(0, 120))}`);
}

async function auditSearch(site, pages, siteRoot) {
  const p = path.join(siteRoot, "assets/js/search-data.json");
  let raw;
  try { raw = await fs.readFile(p, "utf8"); } catch { raw = null; }
  if (raw == null) {
    console.log(`Search index: SKIPPED (no ${p})`);
    return;
  }
  const jObj = JSON.parse(raw);
  const tEntries = deriveSearchEntries(pages, site);

  // Set-level comparison on (doc, title, url, relUrl) quadruples.
  const tupleOf = (e) => `${e.doc}\x00${e.title}\x00${e.url}\x00${e.relUrl}`;
  const jByTuple = new Map();
  for (const k of Object.keys(jObj)) jByTuple.set(tupleOf(jObj[k]), jObj[k]);
  const tByTuple = new Map();
  for (const e of tEntries) tByTuple.set(tupleOf(e), e);

  const onlyJ = [...jByTuple.keys()].filter(k => !tByTuple.has(k));
  const onlyT = [...tByTuple.keys()].filter(k => !jByTuple.has(k));

  // Per-entry content comparison, gated by accepted-divergences.
  let contentMatch = 0;
  let contentAccepted = 0;
  let contentFail = 0;
  const failures = [];
  for (const [tuple, te] of tByTuple) {
    const je = jByTuple.get(tuple);
    if (!je) continue;
    if (je.content === te.content) { contentMatch++; continue; }
    if (te.sourcePage && ACCEPTED_DIVERGENCE_PATHS.has(te.sourcePage.srcRel)) {
      contentAccepted++;
    } else {
      contentFail++;
      if (failures.length < 5) {
        failures.push({ srcRel: te.sourcePage?.srcRel ?? "(unknown)", url: te.url, title: te.title });
      }
    }
  }

  if (onlyJ.length === 0 && onlyT.length === 0 && contentFail === 0) {
    const acceptedSuffix = contentAccepted > 0 ? `; ${contentAccepted} accepted` : "";
    console.log(`Search index: MATCH (${jByTuple.size} entries${acceptedSuffix})`);
    return;
  }
  console.log(`Search index: DIFFER (jekyll=${jByTuple.size}, tbdocs=${tByTuple.size}; ` +
              `only-jekyll=${onlyJ.length}, only-tbdocs=${onlyT.length}, ` +
              `content-fail=${contentFail}, content-accepted=${contentAccepted})`);
  for (const f of failures) console.log(`  ≠ ${f.srcRel}: [${f.title}] ${f.url}`);
  if (failures.length < contentFail) console.log(`  ... +${contentFail - failures.length} more content failures`);
}

// ---- Offline-tree audits (Phase 7) -----------------------------------
//
// For each output kind, we run the pure-compute derive helper from
// offline.mjs and byte-compare vs the matching file in Jekyll's
// `_site-offline/`. Classification distinguishes:
//
//   propagated-online   Our Phase 4 page.html already differs from
//                       Jekyll's _site/<rel>; the offline diff is the
//                       same root cause flowing through Phase 7. Not a
//                       Phase 7 bug. Sub-divided by whether the source
//                       page is in ACCEPTED_DIVERGENCE_PATHS.
//   offline-only        Our page.html matches _site/<rel> exactly, but
//                       the derived offline bytes differ from
//                       _site-offline/<rel>. This is a Phase 7 bug.
//
// Offline-only divergences are further bucketed by which offline
// transform looks responsible -- SEO strip, URL rewrite (absolute,
// relative, or in a script-src), script injection, or other.

async function auditOfflinePages(site, pages, staticFiles, siteRoot, siteOfflineRoot) {
  let stubs = [];
  try { stubs = deriveRedirectStubs(pages, site); } catch { /* collision; surface later */ }
  const state = await buildOfflineState(pages, staticFiles, site, siteRoot, { stubs });
  let match = 0;
  let skipped = 0;
  const propagatedAccepted = [];
  const propagatedUnaccepted = [];
  const offlineOnly = [];

  for (const p of pages) {
    if (p.frontmatter?.layout === "book-combined") continue;
    if (typeof p.html !== "string") { skipped++; continue; }

    const jekyllOnlinePath = path.join(siteRoot, p.destPath);
    const jekyllOfflinePath = path.join(siteOfflineRoot, p.destPath);
    let jOnline, jOffline;
    try { jOnline = await fs.readFile(jekyllOnlinePath, "utf8"); } catch { skipped++; continue; }
    try { jOffline = await fs.readFile(jekyllOfflinePath, "utf8"); } catch { skipped++; continue; }

    const { html: ours } = deriveOfflinePage(p, state);
    if (ours === jOffline) { match++; continue; }

    const onlineDiffers = p.html !== jOnline;
    if (onlineDiffers) {
      if (ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) propagatedAccepted.push(p.srcRel);
      else propagatedUnaccepted.push({ srcRel: p.srcRel, destPath: p.destPath });
    } else {
      const bucket = classifyOfflineDiff(jOffline, ours);
      offlineOnly.push({ srcRel: p.srcRel, destPath: p.destPath, bucket });
    }
  }

  // Phase 7 is "byte-perfect" when there are no unaccepted-propagated
  // divergences AND no offline-only divergences. `propagated-accepted`
  // is upstream Phase 3/4 territory flowing through; not a Phase 7 bug.
  const phase7Bugs = propagatedUnaccepted.length + offlineOnly.length;
  if (phase7Bugs === 0) {
    const detail = [`${match} match`];
    if (propagatedAccepted.length > 0) detail.push(`${propagatedAccepted.length} accepted`);
    if (skipped > 0) detail.push(`${skipped} skipped`);
    console.log(`Offline pages: MATCH (${detail.join(", ")})`);
    return;
  }
  console.log(
    `Offline pages: DIFFER (${match} match, ` +
    `${propagatedAccepted.length} propagated-accepted, ` +
    `${propagatedUnaccepted.length} propagated-unaccepted, ` +
    `${offlineOnly.length} offline-only` +
    (skipped > 0 ? `, ${skipped} skipped` : "") + `)`,
  );
  if (propagatedUnaccepted.length > 0) {
    console.log(`  propagated-unaccepted (Phase 3/4 divergence flowing through):`);
    for (const e of propagatedUnaccepted.slice(0, 5)) console.log(`    ≠ ${e.srcRel} → ${e.destPath}`);
    if (propagatedUnaccepted.length > 5) {
      console.log(`    ... +${propagatedUnaccepted.length - 5} more`);
    }
  }
  if (offlineOnly.length > 0) {
    console.log(`  offline-only (Phase 7-specific divergence):`);
    const byBucket = new Map();
    for (const e of offlineOnly) {
      const list = byBucket.get(e.bucket) ?? [];
      list.push(e);
      byBucket.set(e.bucket, list);
    }
    const sortedBuckets = [...byBucket.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [bucket, list] of sortedBuckets) {
      console.log(`    ${bucket}: ${list.length} pages`);
      for (const e of list.slice(0, 3)) console.log(`      e.g. ${e.srcRel} → ${e.destPath}`);
      if (list.length > 3) console.log(`      ... +${list.length - 3} more`);
    }
  }
}

// Bucket an offline-only divergence by the nature of the first diff.
// `j` is Jekyll's _site-offline/ bytes; `o` is our derived bytes.
function classifyOfflineDiff(j, o) {
  const minLen = Math.min(j.length, o.length);
  let i = 0;
  while (i < minLen && j[i] === o[i]) i++;
  const ctxStart = Math.max(0, i - 80);
  const ctxEnd = i + 80;
  const jCtx = j.slice(ctxStart, ctxEnd);
  const oCtx = o.slice(ctxStart, ctxEnd);

  if (/<!-- Begin Jekyll SEO tag|<!-- End Jekyll SEO tag/.test(jCtx + oCtx)) {
    return "strip-seo";
  }
  if (/window\.OFFLINE_SITE_ROOT|search-data\.js/.test(jCtx + oCtx)) {
    return "script-inject";
  }
  if (/href="[^"]*"|src="[^"]*"/.test(jCtx + oCtx)) {
    return "href-src-rewrite";
  }
  if (/url\([^)]*\)/.test(jCtx + oCtx)) {
    return "css-url-rewrite";
  }
  return "other";
}

async function auditOfflineRedirects(site, pages, staticFiles, siteRoot, siteOfflineRoot) {
  let stubs;
  try { stubs = deriveRedirectStubs(pages, site); }
  catch (err) { console.log(`Offline redirects: COLLISION (${err.message.split("\n")[0]})`); return; }
  const state = await buildOfflineState(pages, staticFiles, site, siteRoot, { stubs });

  let match = 0, missing = 0, mismatch = 0, skipped = 0;
  const issues = [];
  for (const s of stubs) {
    const jPath = path.join(siteOfflineRoot, s.destPath);
    let jOff;
    try { jOff = await fs.readFile(jPath, "utf8"); }
    catch { skipped++; continue; }
    const ours = deriveOfflineRedirect(s, state);
    if (jOff === ours) { match++; continue; }
    mismatch++;
    if (issues.length < 5) issues.push({ destPath: s.destPath, fromPath: s.fromPath });
  }
  if (mismatch === 0 && missing === 0) {
    const skipSuffix = skipped > 0 ? ` (${skipped} skipped -- not in jekyll offline tree)` : "";
    console.log(`Offline redirects: MATCH (${match} stubs)${skipSuffix}`);
    return;
  }
  console.log(`Offline redirects: DIFFER (${stubs.length} stubs; ${match} match, ${mismatch} byte-mismatch, ${skipped} skipped)`);
  for (const i of issues) console.log(`  ≠ ${i.destPath} (from ${i.fromPath})`);
  if (issues.length < mismatch) console.log(`  ... +${mismatch - issues.length} more`);
}

async function auditOfflineCss(site, pages, staticFiles, siteRoot, siteOfflineRoot) {
  // We don't know which CSS files Phase 5 will copy from builder/assets/
  // without re-walking, so just enumerate Jekyll's _site/assets/css/.
  const cssDir = path.join(siteRoot, "assets/css");
  let dirents;
  try { dirents = await fs.readdir(cssDir, { withFileTypes: true }); }
  catch { console.log(`Offline CSS: SKIPPED (no ${cssDir})`); return; }
  const cssFiles = dirents.filter(d => d.isFile() && d.name.endsWith(".css")).map(d => d.name);

  let stubs = [];
  try { stubs = deriveRedirectStubs(pages, site); } catch { /* collision; surface later */ }
  const state = await buildOfflineState(pages, staticFiles, site, siteRoot, { stubs });
  let match = 0, mismatch = 0, skipped = 0;
  const issues = [];
  for (const name of cssFiles) {
    const themeRel = `assets/css/${name}`;
    const srcPath = path.join(siteRoot, themeRel);
    const dstPath = path.join(siteOfflineRoot, themeRel);
    let cssIn, jOff;
    try { cssIn = await fs.readFile(srcPath, "utf8"); } catch { skipped++; continue; }
    try { jOff = await fs.readFile(dstPath, "utf8"); } catch { skipped++; continue; }
    const { css: ours } = deriveOfflineCss(cssIn, themeRel, state);
    if (ours === jOff) { match++; continue; }
    mismatch++;
    if (issues.length < 5) issues.push({ themeRel });
  }
  if (mismatch === 0) {
    const skipSuffix = skipped > 0 ? ` (${skipped} skipped -- not in jekyll offline tree)` : "";
    console.log(`Offline CSS: MATCH (${match} files)${skipSuffix}`);
    return;
  }
  console.log(`Offline CSS: DIFFER (${cssFiles.length} files; ${match} match, ${mismatch} byte-mismatch, ${skipped} skipped)`);
  for (const i of issues) console.log(`  ≠ ${i.themeRel}`);
}

async function auditOfflineJtd(siteRoot, siteOfflineRoot) {
  const srcPath = path.join(siteRoot, "assets/js/just-the-docs.js");
  const dstPath = path.join(siteOfflineRoot, "assets/js/just-the-docs.js");
  let src, jOff;
  try { src = await fs.readFile(srcPath, "utf8"); } catch { console.log(`Offline JTD JS: SKIPPED (no ${srcPath})`); return; }
  try { jOff = await fs.readFile(dstPath, "utf8"); } catch { console.log(`Offline JTD JS: SKIPPED (no ${dstPath})`); return; }
  const { js: ours, patches, warnings } = deriveOfflineJtdJs(src);
  for (const w of warnings) console.log(`  WARN ${w}`);
  if (jOff === ours) {
    console.log(`Offline JTD JS: MATCH (${patches.length}/2 patches: ${patches.join(", ") || "none"})`);
    return;
  }
  const minLen = Math.min(jOff.length, ours.length);
  let i = 0;
  while (i < minLen && jOff[i] === ours[i]) i++;
  console.log(`Offline JTD JS: DIFFER at offset ${i} (jekyll=${jOff.length}, tbdocs=${ours.length})`);
  console.log(`  J: ${JSON.stringify(jOff.slice(Math.max(0, i - 30), i + 100))}`);
  console.log(`  T: ${JSON.stringify(ours.slice(Math.max(0, i - 30), i + 100))}`);
}

async function auditOfflineSearch(site, pages, siteOfflineRoot) {
  // Mirror auditSearch's strategy: derive in-memory rather than reading
  // _site/. writeSearchData writes one ~2.8 MB file; we scratch-write
  // to a temp dest just to capture the JSON bytes.
  const scratch = path.join(srcRoot, "_site-triage-scratch");
  await fs.mkdir(scratch, { recursive: true });
  let json;
  try { ({ json } = await writeSearchData(pages, site, scratch)); }
  finally { await fs.rm(scratch, { recursive: true, force: true }); }

  const ours = deriveOfflineSearchDataJs(json);
  const dstPath = path.join(siteOfflineRoot, "assets/js/search-data.js");
  let jOff;
  try { jOff = await fs.readFile(dstPath, "utf8"); }
  catch { console.log(`Offline search-data.js: SKIPPED (no ${dstPath})`); return; }
  if (jOff === ours) {
    console.log(`Offline search-data.js: MATCH (${ours.length} bytes)`);
    return;
  }
  // Whatever divergence we see in the JS is just the JSON divergence,
  // already covered by auditSearch's gating. Verify that Jekyll's
  // offline JS is the canonical wrap of Jekyll's online JSON; if so,
  // report as a propagation rather than a Phase 7 issue.
  const jJsonPath = path.join(siteRoot, "assets/js/search-data.json");
  let jJson = null;
  try { jJson = await fs.readFile(jJsonPath, "utf8"); } catch { /* fall through */ }
  if (jJson !== null && jOff === deriveOfflineSearchDataJs(jJson)) {
    console.log(`Offline search-data.js: MATCH (propagates from search-data.json -- see Search index above)`);
    return;
  }
  const minLen = Math.min(jOff.length, ours.length);
  let i = 0;
  while (i < minLen && jOff[i] === ours[i]) i++;
  console.log(`Offline search-data.js: DIFFER at offset ${i} (jekyll=${jOff.length}, tbdocs=${ours.length}) -- Phase 7 wrap divergence`);
}

const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
const sev = { high: 3, medium: 2, low: 1, info: 0, "?": -1 };
sorted.sort((a, b) => (sev[b.rule.severity] - sev[a.rule.severity]) * 1000 + (b.count - a.count));

for (const b of sorted) {
  console.log(`=== [${b.rule.severity}] ${b.rule.id} -- ${b.count} pages`);
  console.log(`    ${b.rule.label}`);
  const exCount = showAll ? b.examples.length : Math.min(3, b.examples.length);
  for (let k = 0; k < exCount; k++) {
    const ex = b.examples[k];
    if (ex.offset < 0) {
      // sidebar-only bucket -- no per-example context worth printing.
      continue;
    }
    console.log(`    e.g. ${ex.srcRel} @ ${ex.offset}`);
    console.log(`         J: ${JSON.stringify(ex.jCtx.slice(0, 120))}`);
    console.log(`         O: ${JSON.stringify(ex.oCtx.slice(0, 120))}`);
  }
  console.log();
}
