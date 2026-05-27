// Triage harness: walk every page, find the first divergence from
// Jekyll's output, then classify it into a coarse bucket so we can rank
// remaining work by pattern frequency * visual severity. Covers
// Phases 3 -> 8 in one run:
//
//   - Per-page Phase 4 diff vs `_site/<destPath>` (the main loop).
//   - Phase 6 auxiliaries: sitemap, redirects, robots, search index.
//   - Phase 7 offline mirror: pages, redirects, theme CSS, patched
//     just-the-docs.js, search-data.js wrap.
//   - Phase 8 PDF tree: book.html, two CSS files, image inventory.
//
// One mode, no flags except diagnostics:
//
//   node _triage.mjs                       -- run the full audit
//   node _triage.mjs --all                 -- print every example per bucket
//                                            (default caps at 3 per bucket)
//   node _triage.mjs --help                -- this message
//
// Severity scale (per-page Phase 4 buckets):
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
import { renderPhase, createMarkdownIt, initHighlighter, buildLinkTables } from "./render.mjs";
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
import { deriveBookOutputs, extractImagePaths } from "./pdf.mjs";
import { ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

const HELP_TEXT = `Usage: node _triage.mjs [--all] [--multi]

Walks every page and bucket-classifies the first divergence from
Jekyll's _site/. Also audits Phase 6 auxiliaries (sitemap, redirects,
robots, search), Phase 7 offline mirror (pages, redirects, CSS, JTD JS,
search-data.js), and Phase 8 PDF tree (book.html, CSS, images).

Flags:
  --all     Print every example per bucket (default caps at 3).
  --multi   For each page bucketed under a divergence, count every
            distinct divergence region (not just the first one) and
            include the count alongside the bucket signature.
            Surfaces hidden secondary divergences on already-bucketed
            pages -- e.g. a markdown parse difference behind a syntax-
            highlighting difference (PLAN-9 §5.12 / A1 path #3).
  --help    Print this message.

Output: per-bucket counts sorted by severity then frequency, plus
auxiliary MATCH/DIFFER lines. Exit 0 always (this is a diagnostic
tool; use verify-phase*.mjs for pass/fail.)`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(HELP_TEXT);
  process.exit(0);
}

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");
const siteOfflineRoot = path.join(srcRoot, "_site-offline");
const sitePdfRoot = path.join(srcRoot, "_site-pdf");
const showAll = process.argv.includes("--all");
const multiMode = process.argv.includes("--multi");

const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
const { navTree } = computeNav(pages, config);
const highlighter = await initHighlighter();
const linkTables = buildLinkTables(pages);
const baseurl = String(config.baseurl || "");
const staticFileSet = new Set(staticFiles.map((s) => s.srcRel));
const markdown = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles: staticFileSet });
const seo = precomputeSeo(pages, config, markdown);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
const buildInfo = await captureBuildInfo();
const site = { config, navTree, ...seo, buildInfo, bookData, markdown };
await renderPhase(pages, site, staticFiles);
await templatePhase(pages, site);

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

const SIDEBAR_RE = /<nav aria-label="Main" id="site-nav"[\s\S]*?<\/nav>/;
const ACTIVATION_RE = /<style id="jtd-nav-activation">[\s\S]*?<\/style>/;
function stripSidebar(h) { return h.replace(SIDEBAR_RE, "<SIDEBAR/>"); }
function stripActivation(h) { return h.replace(ACTIVATION_RE, "<ACTIVATION/>"); }
function stripNavRelated(h) { return stripActivation(stripSidebar(h)); }

// Build-info line normaliser for Phase 8 PDF book comparison.
const BUILD_INFO_RE = /<p class="build-info">Built[^<]*<\/p>/;
function normaliseBuildInfo(html) {
  return html.replace(
    BUILD_INFO_RE,
    `<p class="build-info">Built BUILDDATE from commit COMMIT (COMMITDATE).</p>`,
  );
}

// ---------- main loop --------------------------------------------------

const buckets = new Map(); // id -> { rule, count, examples }
let matched = 0;
let differed = 0;
let accepted = 0;
let sidebarOnly = 0;
let navOrderPropagation = 0;
let skipped = 0;

function bumpBucket(id, rule, page, offset, jCtx, oCtx, regions) {
  const b = buckets.get(id) || { rule, count: 0, examples: [] };
  b.count++;
  if (b.examples.length < 3) {
    b.examples.push({ srcRel: page.srcRel, offset, jCtx, oCtx, regions });
  }
  buckets.set(id, b);
}

// PLAN-9 §5.12 (A1) --multi: count distinct divergence regions on a
// page. Same resync algorithm as _diff.mjs's reportMultiDiff; capped
// at 50 regions to bound the cost on heavily-divergent pages.
function countDivergenceRegions(jekyll, ours) {
  if (jekyll === ours) return 0;
  const RESYNC_RUN = 32;
  const MAX_REGIONS = 50;
  let regions = 0;
  let j = 0, o = 0;
  while (j < jekyll.length && o < ours.length) {
    if (jekyll[j] === ours[o]) { j++; o++; continue; }
    const jStart = j, oStart = o;
    let resyncJ = -1, resyncO = -1;
    for (let dj = 0; dj <= 4096 && jStart + dj < jekyll.length; dj++) {
      for (let dO = 0; dO <= 4096 && oStart + dO < ours.length; dO++) {
        if (jekyll.substr(jStart + dj, RESYNC_RUN) === ours.substr(oStart + dO, RESYNC_RUN)) {
          resyncJ = jStart + dj;
          resyncO = oStart + dO;
          break;
        }
      }
      if (resyncJ !== -1) break;
    }
    regions++;
    if (resyncJ === -1 || regions >= MAX_REGIONS) break;
    j = resyncJ;
    o = resyncO;
  }
  return regions;
}

for (const p of pages) {
  if (p.frontmatter.layout === "book-combined") continue;
  if (typeof p.html !== "string") { skipped++; continue; }

  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); } catch { skipped++; continue; }

  const jekyllSubject = jekyllHtml;
  const oursSubject = p.html;

  if (jekyllSubject === oursSubject) { matched++; continue; }
  if (ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) { accepted++; continue; }
  differed++;

  // If the only diff is in the sidebar (and/or in the activation CSS,
  // which is derived from nav position), bucket once as info and move
  // on. No content rule fires -- the diff isn't Phase-4-actionable;
  // the root cause is Phase 1's file enumeration order mismatch with
  // Jekyll's Ruby Dir.glob, and it propagates through Phase 2's nav-
  // tree position into both the rendered sidebar and the per-page
  // activation CSS's nth-child indices.
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

  // Use sidebar-stripped subjects so the nav-order divergence doesn't
  // dominate every page's diff offset. The diff offsets reported are
  // in the stripped string.
  const jStripped = stripSidebar(jekyllSubject);
  const oStripped = stripSidebar(oursSubject);

  const minLen = Math.min(jStripped.length, oStripped.length);
  let i = 0;
  while (i < minLen && jStripped[i] === oStripped[i]) i++;
  const ctxStart = Math.max(0, i - 60);
  const ctxEnd = Math.min(Math.max(jStripped.length, oStripped.length), i + 200);
  const jCtx = jStripped.slice(ctxStart, Math.min(ctxEnd, jStripped.length));
  const oCtx = oStripped.slice(ctxStart, Math.min(ctxEnd, oStripped.length));

  // Content-based rule pass: more specific than region detection.
  let rule = PHASE4_RULES.find((r) => {
    try { return r.test(jCtx, oCtx); } catch { return false; }
  });

  // PLAN-9 §5.12 (A1) --multi: count divergence regions on the
  // stripped subjects so a "first divergence + bucket" match doesn't
  // mask a second class of divergence elsewhere on the page.
  const regions = multiMode ? countDivergenceRegions(jStripped, oStripped) : null;

  if (rule) {
    bumpBucket(rule.id, rule, p, i, jCtx, oCtx, regions);
    continue;
  }

  // Region-based fallback. The stripped subject lost the sidebar, so
  // region positions shift by `(sidebarLen - "<SIDEBAR/>".length)`.
  // Build the region map against the STRIPPED jekyll so offsets line
  // up directly with i.
  const regionMap = buildRegionMap(jStripped);
  let regionId = regionOf(i, regionMap);
  if (regionId === "body" && isInsideAnchorHeading(jStripped, i)) {
    regionId = "anchor-heading";
  }
  const regionInfo = REGION_SEVERITY[regionId] || { severity: "?", label: "(unknown region)" };
  bumpBucket(regionId, { id: regionId, severity: regionInfo.severity, label: regionInfo.label }, p, i, jCtx, oCtx, regions);
}

console.log(`Phase 4 (full page) per-page bucket scan:`);
console.log(`Matched: ${matched}, Accepted: ${accepted}, Differed: ${differed}, ` +
            `Sidebar-only: ${sidebarOnly}, Nav-order-propagation: ${navOrderPropagation}` +
            (skipped > 0 ? `, Skipped: ${skipped}` : "") +
            `, Total: ${matched + accepted + differed + sidebarOnly + navOrderPropagation + skipped}`);

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
// Offline tree (Phase 7).
await auditOfflinePages(site, pages, staticFiles, siteRoot, siteOfflineRoot);
await auditOfflineRedirects(site, pages, staticFiles, siteRoot, siteOfflineRoot);
await auditOfflineCss(site, pages, staticFiles, siteRoot, siteOfflineRoot);
await auditOfflineJtd(siteRoot, siteOfflineRoot);
await auditOfflineSearch(site, pages, siteOfflineRoot);
// PDF tree (Phase 8).
const pdfBookOk = await auditPdfBook(site, pages, sitePdfRoot);
const pdfCssOk  = await auditPdfCss(siteRoot, sitePdfRoot);
const pdfImagesOk = await auditPdfImages(site, pages, staticFiles, sitePdfRoot);
auditPdfTotal(pdfBookOk, pdfCssOk, pdfImagesOk);

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

// ---- Phase 8 PDF-tree audits ----------------------------------------
//
// Three checks, each prints one MATCH/DIFFER line. The book.html
// comparison normalises the build-info line on both sides so commit /
// build-date drift doesn't surface as a divergence. The per-article
// breakdown (744-ish exact-match plus accepted-divergence pages) is
// covered by verify-phase8; here we report the file-level result.

async function auditPdfBook(site, pages, sitePdfRoot) {
  const jBookPath = path.join(sitePdfRoot, "book.html");
  let jBook;
  try { jBook = await fs.readFile(jBookPath, "utf8"); }
  catch { console.log(`PDF book.html: SKIPPED (no ${jBookPath})`); return false; }

  const { bookHtml } = deriveBookOutputs(pages, site);
  const ours = normaliseBuildInfo(bookHtml);
  const theirs = normaliseBuildInfo(jBook);
  if (ours === theirs) {
    console.log(`PDF book.html: MATCH (build-info normalised, ${ours.length} bytes)`);
    return true;
  }

  // Per-article classification: split each side on <article>, compare
  // each block, allow articles whose source page is in
  // ACCEPTED_DIVERGENCE_PATHS to differ. Matches the verify-phase8
  // logic and the offline-pages audit pattern -- the propagation of
  // upstream Phase 3/4 divergences into the book is not a Phase 8
  // bug, so report "accepted" rather than "fail".
  const acceptedAnchors = buildAcceptedAnchors(pages);
  const ourArticles = parseArticles(ours);
  const jArticles = parseArticles(theirs);

  // Header before the first article -- everything from <!DOCTYPE> up
  // through the closing </section> of the title page.
  const ourPrefix = sliceBeforeFirstArticle(ours);
  const jPrefix = sliceBeforeFirstArticle(theirs);
  const prefixMatch = ourPrefix === jPrefix;

  // Per-article counts.
  let articleMatch = 0;
  let articleAccepted = 0;
  const mismatched = [];
  const n = Math.min(ourArticles.length, jArticles.length);
  for (let k = 0; k < n; k++) {
    const a = ourArticles[k];
    const b = jArticles[k];
    if (a.anchor !== b.anchor) {
      mismatched.push({ idx: k, anchor: a.anchor || b.anchor, reason: "anchor mismatch" });
      continue;
    }
    if (a.body === b.body) { articleMatch++; continue; }
    if (acceptedAnchors.has(a.anchor)) { articleAccepted++; continue; }
    mismatched.push({ idx: k, anchor: a.anchor, reason: "body diff" });
  }
  const articleCountMatch = ourArticles.length === jArticles.length;
  const ok = prefixMatch && articleCountMatch && mismatched.length === 0;
  if (ok) {
    const acceptedSuffix = articleAccepted > 0 ? `, ${articleAccepted} accepted` : "";
    console.log(`PDF book.html: MATCH (${articleMatch} articles${acceptedSuffix}, build-info normalised)`);
    return true;
  }

  console.log(`PDF book.html: DIFFER (` +
    `prefix=${prefixMatch ? "match" : "diff"}, ` +
    `articles ours=${ourArticles.length}/jekyll=${jArticles.length}, ` +
    `${articleMatch} match, ${articleAccepted} accepted, ${mismatched.length} unaccepted)`);
  for (const m of mismatched.slice(0, 5)) {
    console.log(`  ≠ article ${m.idx} (${m.anchor || "n/a"}): ${m.reason}`);
  }
  if (mismatched.length > 5) console.log(`  ... +${mismatched.length - 5} more`);
  return false;
}

// Source path -> `ch-...` anchor for each page in ACCEPTED_DIVERGENCE_PATHS.
function buildAcceptedAnchors(pages) {
  const accepted = new Set();
  for (const p of pages) {
    if (!ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) continue;
    const url = p.permalink;
    let seed = url.replaceAll("/", "-").replace(/^-/, "").replace(/-$/, "");
    if (seed === "") seed = String(p.frontmatter?.title ?? "").toLowerCase().replaceAll(" ", "-");
    accepted.add("ch-" + seed);
  }
  return accepted;
}

// Split book.html into `{anchor, body}` entries per <article> block.
function parseArticles(html) {
  const out = [];
  const re = /<article[^>]*id="(ch-[^"]+|pt-\d+|chd-[^"]+)"[^>]*>[\s\S]*?<\/article>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ anchor: m[1], body: m[0] });
  }
  return out;
}

function sliceBeforeFirstArticle(html) {
  const i = html.indexOf("<article");
  return i === -1 ? html : html.slice(0, i);
}

async function auditPdfCss(siteRoot, sitePdfRoot) {
  // Pdfify copies print.css + rouge.css from <site.dest>/<rel> to
  // <site.dest>-pdf/<rel>; the two must be byte-identical.
  const REQUIRED_CSS = ["assets/css/print.css", "assets/css/rouge.css"];
  let match = 0;
  const failures = [];
  for (const rel of REQUIRED_CSS) {
    const online = await fs.readFile(path.join(siteRoot, rel)).catch(() => null);
    const pdf = await fs.readFile(path.join(sitePdfRoot, rel)).catch(() => null);
    if (online && pdf && online.length === pdf.length && online.equals(pdf)) {
      match++;
    } else {
      failures.push({ rel, online: online?.length ?? null, pdf: pdf?.length ?? null });
    }
  }
  if (failures.length === 0) {
    console.log(`PDF CSS: MATCH (${match} files)`);
    return true;
  }
  console.log(`PDF CSS: DIFFER (${match} match, ${failures.length} byte-mismatch)`);
  for (const f of failures) {
    const onlineStr = f.online == null ? "(missing)" : `${f.online} bytes`;
    const pdfStr = f.pdf == null ? "(missing)" : `${f.pdf} bytes`;
    console.log(`  ≠ ${f.rel}: _site=${onlineStr}, _site-pdf=${pdfStr}`);
  }
  return false;
}

async function auditPdfImages(site, pages, staticFiles, sitePdfRoot) {
  const { bookHtml } = deriveBookOutputs(pages, site);
  const imagePaths = extractImagePaths(bookHtml);

  // For each image path in the assembled book.html, check that:
  //   1. The source exists in staticFiles[] (so Phase 8 can copy it).
  //   2. The destination file exists under _site-pdf/<rel> (Jekyll's
  //      pdfify already copied it there).
  const staticDestRels = new Set(staticFiles.map(s => s.destRel.replaceAll("\\", "/")));
  const missingInInventory = [];
  const missingOnDisk = [];
  for (const rel of imagePaths) {
    if (!staticDestRels.has(rel)) missingInInventory.push(rel);
    const exists = await fs.access(path.join(sitePdfRoot, rel)).then(() => true).catch(() => false);
    if (!exists) missingOnDisk.push(rel);
  }
  if (missingInInventory.length === 0 && missingOnDisk.length === 0) {
    console.log(`PDF images: MATCH (${imagePaths.length} files, 0 missing)`);
    return true;
  }
  console.log(`PDF images: DIFFER (${imagePaths.length} referenced, ` +
              `${missingInInventory.length} missing from staticFiles, ` +
              `${missingOnDisk.length} missing on disk)`);
  for (const rel of missingInInventory.slice(0, 5)) console.log(`  inventory- ${rel}`);
  if (missingInInventory.length > 5) console.log(`  ... +${missingInInventory.length - 5} more`);
  for (const rel of missingOnDisk.slice(0, 5)) console.log(`  on-disk- ${rel}`);
  if (missingOnDisk.length > 5) console.log(`  ... +${missingOnDisk.length - 5} more`);
  return false;
}

function auditPdfTotal(bookOk, cssOk, imagesOk) {
  if (bookOk && cssOk && imagesOk) {
    // 1 book.html + 2 CSS + N images. The image count varies with
    // chapter content; report what we have.
    console.log(`PDF total: book.html + CSS + images match Jekyll's _site-pdf/`);
  } else {
    const bad = [];
    if (!bookOk) bad.push("book.html");
    if (!cssOk) bad.push("CSS");
    if (!imagesOk) bad.push("images");
    console.log(`PDF total: ${bad.join(", ")} differ -- see above`);
  }
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
    const regionsTag = ex.regions != null ? ` (${ex.regions} distinct region${ex.regions === 1 ? "" : "s"})` : "";
    console.log(`    e.g. ${ex.srcRel} @ ${ex.offset}${regionsTag}`);
    console.log(`         J: ${JSON.stringify(ex.jCtx.slice(0, 120))}`);
    console.log(`         O: ${JSON.stringify(ex.oCtx.slice(0, 120))}`);
  }
  console.log();
}
