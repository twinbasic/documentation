// Single-target diff harness against Jekyll's _site/ output. Drives the
// tbdocs pipeline through the phase the requested target needs (Phase 3
// for body fragments / search content, Phase 4 for full page, Phase 5/6
// for auxiliaries, Phase 7 for offline-tree files), then byte-diffs the
// in-memory result against the matching Jekyll output.
//
// Usage:
//   node _diff.mjs [<page-srcRel>] [--phase3] [--no-strip] [--full]
//     Default mode. Diff page.html (Phase 4) vs `_site/<destPath>`.
//     <page-srcRel> defaults to "Reference/Core/Const.md".
//     --phase3 switches to body-fragment mode (extract <main>...</main>,
//     strip anchor-headings + auto-TOC, normalise whitespace, diff
//     against page.renderedContent).
//     --no-strip / --full keeps the sidebar in the Phase 4 diff (default
//     strips it so nav-order divergence doesn't dominate).
//
//   node _diff.mjs --redirect=<fromPath>
//     Diff one redirect stub. <fromPath> is one of the page's
//     frontmatter.redirect_from values (e.g. "/tB/Core/Day"). Resolves
//     to destPath via permalinkToDestPath, derives the stub HTML in-
//     memory, byte-diffs vs `_site/<destPath>`. Leading slash is
//     auto-added; the bare "tB/Core/Day" form also works.
//     Note: on Git Bash for Windows the MSYS layer rewrites a leading
//     "/foo" arg to a Windows path; prefix with `MSYS_NO_PATHCONV=1`
//     or pass the bare form ("tB/Core/Day") to avoid that.
//
//   node _diff.mjs --robots
//     Diff robots.txt. Derives the expected content in-memory via
//     sitemap.mjs's renderRobotsTxt, byte-diffs vs `_site/robots.txt`.
//
//   node _diff.mjs --search <page-srcRel>
//     Diff all search-index entries for one page. Filters the in-memory
//     derived entries to those originating in <page-srcRel>, finds
//     Jekyll's entries with the same `doc` value, set-diffs by
//     (doc, title, url, relUrl) tuple, then byte-diffs content per pair.
//
//   node _diff.mjs --offline=<srcRel>
//     Diff one offline-tree HTML page. Drives Phases 1-4 then applies
//     the offline transforms (stripSeo + URL rewrite + script inject)
//     in-memory, byte-diffs vs `_site-offline/<destPath>`. Use the
//     same <srcRel> as the default page mode.
//
//   node _diff.mjs --offline-redirect=<fromPath>
//     Diff one offline redirect stub. Derives the stub HTML, rewrites
//     the four <site.url>/<path> absolute URLs to page-relative,
//     byte-diffs vs `_site-offline/<destPath>`.
//
//   node _diff.mjs --offline-css=<themeRel>
//     Diff one offline CSS file. Reads <themeRel> from `_site/`
//     (e.g. `assets/css/just-the-docs-combined.css`), applies the
//     url() rewrite, byte-diffs vs `_site-offline/<themeRel>`.
//
//   node _diff.mjs --offline-jtd
//     Diff the patched `assets/js/just-the-docs.js`. Reads the
//     unpatched source from `_site/`, applies the navLink+initSearch
//     patches, byte-diffs vs `_site-offline/assets/js/just-the-docs.js`.
//
//   node _diff.mjs --offline-search
//     Diff the offline `search-data.js`. Wraps the in-memory
//     search-data.json bytes as `window.SEARCH_DATA = ...`, byte-diffs
//     vs `_site-offline/assets/js/search-data.js`.
//
// All modes print "MATCH" on full byte equality or "DIFFER" with the
// first divergence offset + ~200 chars of context.

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
import { deriveRedirectStubs } from "./redirects.mjs";
import { renderRobotsTxt } from "./sitemap.mjs";
import { deriveSearchEntries, writeSearchData } from "./search.mjs";
import {
  buildOfflineState,
  deriveOfflinePage,
  deriveOfflineRedirect,
  deriveOfflineCss,
  deriveOfflineJtdJs,
  deriveOfflineSearchDataJs,
} from "./offline.mjs";

const SIDEBAR_RE = /<nav aria-label="Main" id="site-nav"[\s\S]*?<\/nav>/;
function stripSidebar(h) { return h.replace(SIDEBAR_RE, "<SIDEBAR/>"); }

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

function normalise(s) {
  return s.replace(/\s+/g, " ").trim();
}

// Returns the value for `--flag value` or `--flag=value`. Returns null
// if the flag isn't present, "" if the flag has no value. The `=` form
// is needed on Git Bash for Windows, which auto-converts a bare
// leading-slash arg like "/tB/Core/Day" into a Windows path (MSYS
// MSYS_NO_PATHCONV).
function argValue(args, flag) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag) {
      return args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";
    }
    if (a.startsWith(flag + "=")) return a.slice(flag.length + 1);
  }
  return null;
}

// ---- Parse args ------------------------------------------------------

const args = process.argv.slice(2);
const phase3Mode = args.includes("--phase3");
const noStrip = args.includes("--no-strip") || args.includes("--full");
const redirectArg = argValue(args, "--redirect");
const searchArg = argValue(args, "--search");
const robotsMode = args.includes("--robots");
const offlineArg = argValue(args, "--offline");
const offlineRedirectArg = argValue(args, "--offline-redirect");
const offlineCssArg = argValue(args, "--offline-css");
const offlineJtdMode = args.includes("--offline-jtd");
const offlineSearchMode = args.includes("--offline-search");

// One mode at a time.
const mode = robotsMode ? "robots"
  : offlineJtdMode ? "offline-jtd"
  : offlineSearchMode ? "offline-search"
  : offlineRedirectArg !== null ? "offline-redirect"
  : offlineCssArg !== null ? "offline-css"
  : offlineArg !== null ? "offline-page"
  : redirectArg !== null ? "redirect"
  : searchArg !== null ? "search"
  : phase3Mode ? "phase3"
  : "page";

const needsTemplate = mode === "page" || mode === "offline-page";
const needsRender = mode === "page" || mode === "phase3" || mode === "search"
  || mode === "offline-page" || mode === "offline-search";
const needsOfflineState = mode === "offline-page" || mode === "offline-redirect"
  || mode === "offline-css";

// ---- Drive pipeline through required phase ---------------------------

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");
const siteOfflineRoot = path.join(srcRoot, "_site-offline");

const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
const { navTree } = computeNav(pages, config);
const seo = precomputeSeo(pages, config);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
const buildInfo = needsTemplate ? await captureBuildInfo() : null;
const site = { config, navTree, ...seo, buildInfo, bookData };
if (needsRender) await renderPhase(pages, site, staticFiles);
if (needsTemplate) await templatePhase(pages, site);

// Offline modes resolve URLs against Jekyll's _site/ tree (which is
// guaranteed to have every theme asset Phase 5+6 emits). The diff
// targets are Jekyll's _site-offline/<rel> files. Derive the redirect
// stubs in-memory so their destPaths land in the URL resolver's set
// (a page-relative `LBound` link resolves through the stub at
// `tB/Core/LBound.html` rather than coming back as unresolved).
let offlineState = null;
if (needsOfflineState) {
  let stubs = [];
  try { stubs = deriveRedirectStubs(pages, site); } catch { /* collision; let it surface later */ }
  offlineState = await buildOfflineState(pages, staticFiles, site, siteRoot, { stubs });
}

// ---- Dispatch --------------------------------------------------------

if (mode === "redirect")              await diffRedirect(redirectArg);
else if (mode === "robots")           await diffRobots();
else if (mode === "search")           await diffSearch(searchArg);
else if (mode === "offline-page")     await diffOfflinePage(offlineArg);
else if (mode === "offline-redirect") await diffOfflineRedirect(offlineRedirectArg);
else if (mode === "offline-css")      await diffOfflineCss(offlineCssArg);
else if (mode === "offline-jtd")      await diffOfflineJtd();
else if (mode === "offline-search")   await diffOfflineSearch();
else                                  await diffPage();

// ---- Mode: page (default, --phase3) ----------------------------------

async function diffPage() {
  const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--redirect" && args[i - 1] !== "--search");
  const which = positional[0] || "Reference/Core/Const.md";
  const p = pages.find((x) => x.srcRel === which);
  if (!p) { console.error("page not found:", which); process.exit(1); }

  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll output not found at:", jekyllPath); process.exit(1); }

  let jekyllSubject, oursSubject;
  if (phase3Mode) {
    jekyllSubject = extractMainBody(jekyllHtml);
    oursSubject = normalise(p.renderedContent);
  } else {
    if (p.html === undefined) {
      console.error(`page.html is undefined for ${which} (book.html bypass?)`);
      process.exit(1);
    }
    jekyllSubject = noStrip ? jekyllHtml : stripSidebar(jekyllHtml);
    oursSubject = noStrip ? p.html : stripSidebar(p.html);
  }

  const label = phase3Mode ? "Phase 3 body" : (noStrip ? "Phase 4 full page" : "Phase 4 sidebar-stripped");
  reportDiff(label, jekyllSubject, oursSubject);
}

// ---- Mode: --redirect ------------------------------------------------

async function diffRedirect(rawFromPath) {
  if (!rawFromPath) {
    console.error("--redirect needs a fromPath argument, e.g. --redirect=/tB/Core/Day");
    process.exit(1);
  }
  // Normalise: try the input as-is, with leading slash added, and as
  // destPath. Covers `/tB/Core/Day`, `tB/Core/Day`, and the rare
  // case where someone passes the resolved destPath directly.
  const candidates = [rawFromPath];
  if (!rawFromPath.startsWith("/")) candidates.push("/" + rawFromPath);
  const stubs = deriveRedirectStubs(pages, site);
  const stub = stubs.find(s => candidates.includes(s.fromPath) || candidates.includes(s.destPath));
  if (!stub) {
    console.error(`No redirect stub matches "${rawFromPath}".`);
    console.error(`Sample available fromPaths:`);
    for (const s of stubs.slice(0, 5)) console.error(`  ${s.fromPath}  →  ${s.destPath}`);
    process.exit(1);
  }
  const jekyllPath = path.join(siteRoot, stub.destPath);
  let jekyllStub;
  try { jekyllStub = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll stub not found:", jekyllPath); process.exit(1); }
  reportDiff(
    `redirect ${stub.fromPath} → ${stub.destPath} (owner: ${stub.sourcePage.srcRel})`,
    jekyllStub,
    stub.html,
  );
}

// ---- Mode: --robots --------------------------------------------------

async function diffRobots() {
  const expected = renderRobotsTxt(site.config);
  const jekyllPath = path.join(siteRoot, "robots.txt");
  let jekyllRobots;
  try { jekyllRobots = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll robots.txt not found:", jekyllPath); process.exit(1); }
  reportDiff("robots.txt", jekyllRobots, expected);
}

// ---- Mode: --search --------------------------------------------------

async function diffSearch(srcRel) {
  if (!srcRel) {
    console.error("--search needs a page srcRel argument, e.g. --search=Reference/Core/Const.md");
    process.exit(1);
  }
  const ourEntries = deriveSearchEntries(pages, site).filter(e => e.sourcePage.srcRel === srcRel);
  if (ourEntries.length === 0) {
    console.error(`No search entries from page ${srcRel}.`);
    console.error(`(Pages without a title or with search_exclude: true don't contribute any.)`);
    process.exit(1);
  }
  const raw = await fs.readFile(path.join(siteRoot, "assets/js/search-data.json"), "utf8").catch(() => null);
  if (raw == null) {
    console.error(`Jekyll search-data.json not found at ${path.join(siteRoot, "assets/js/search-data.json")}`);
    process.exit(1);
  }
  const jObj = JSON.parse(raw);
  // Match Jekyll's entries by URL prefix on relUrl: relUrl is the raw
  // permalink (with optional `#fragment`), so it's the unambiguous
  // page-identity key. Filtering by `doc` alone false-positives when
  // two pages share a title.
  const page = ourEntries[0].sourcePage;
  const permalink = page.permalink;
  const jekyllEntries = Object.values(jObj).filter(e =>
    e.relUrl === permalink || e.relUrl?.startsWith(permalink + "#"));

  const tupleOf = (e) => `${e.title}\x00${e.url}\x00${e.relUrl}`;
  const ourByTuple = new Map(ourEntries.map(e => [tupleOf(e), e]));
  const jekyllByTuple = new Map(jekyllEntries.map(e => [tupleOf(e), e]));

  const onlyJ = [...jekyllByTuple.keys()].filter(t => !ourByTuple.has(t));
  const onlyT = [...ourByTuple.keys()].filter(t => !jekyllByTuple.has(t));

  const contentDiffs = [];
  for (const [t, te] of ourByTuple) {
    const je = jekyllByTuple.get(t);
    if (!je) continue;
    if (je.content !== te.content) contentDiffs.push({ title: te.title, url: te.url, ours: te.content, jekyll: je.content });
  }

  const label = `search index for ${srcRel} (${ourEntries.length} our entries, ${jekyllEntries.length} jekyll entries)`;

  if (onlyJ.length === 0 && onlyT.length === 0 && contentDiffs.length === 0) {
    console.log(`MATCH (${label})`);
    return;
  }

  console.log(`DIFFER (${label})`);
  if (onlyJ.length > 0) {
    console.log(`  only-jekyll (${onlyJ.length}):`);
    for (const t of onlyJ.slice(0, 5)) console.log(`    - ${t.split("\x00").join(" | ")}`);
    if (onlyJ.length > 5) console.log(`    ... +${onlyJ.length - 5} more`);
  }
  if (onlyT.length > 0) {
    console.log(`  only-tbdocs (${onlyT.length}):`);
    for (const t of onlyT.slice(0, 5)) console.log(`    + ${t.split("\x00").join(" | ")}`);
    if (onlyT.length > 5) console.log(`    ... +${onlyT.length - 5} more`);
  }
  if (contentDiffs.length > 0) {
    console.log(`  content-diffs (${contentDiffs.length}):`);
    for (const cd of contentDiffs.slice(0, 3)) {
      const len = Math.min(cd.ours.length, cd.jekyll.length);
      let i = 0;
      while (i < len && cd.ours[i] === cd.jekyll[i]) i++;
      console.log(`    ≠ [${cd.title}] (offset ${i}, jekyll=${cd.jekyll.length}b, ours=${cd.ours.length}b)`);
      console.log(`      J: ${JSON.stringify(cd.jekyll.slice(Math.max(0, i - 30), i + 80))}`);
      console.log(`      T: ${JSON.stringify(cd.ours.slice(Math.max(0, i - 30), i + 80))}`);
    }
    if (contentDiffs.length > 3) console.log(`    ... +${contentDiffs.length - 3} more`);
  }
  process.exitCode = 1;
}

// ---- Mode: --offline=<srcRel> ---------------------------------------

async function diffOfflinePage(rawSrcRel) {
  if (!rawSrcRel) {
    console.error("--offline needs a srcRel argument, e.g. --offline=Reference/Core/Const.md");
    process.exit(1);
  }
  const p = pages.find(x => x.srcRel === rawSrcRel);
  if (!p) { console.error("page not found:", rawSrcRel); process.exit(1); }
  if (p.html === undefined) {
    console.error(`page.html is undefined for ${rawSrcRel} (book.html bypass?)`);
    process.exit(1);
  }
  const jekyllPath = path.join(siteOfflineRoot, p.destPath);
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll offline output not found at:", jekyllPath); process.exit(1); }

  const { html: oursHtml, misses } = deriveOfflinePage(p, offlineState);
  const label = `offline page ${p.destPath}` + (misses ? ` (${misses} unresolved URLs)` : "");
  reportDiff(label, jekyllHtml, oursHtml);
}

// ---- Mode: --offline-redirect=<fromPath> ----------------------------

async function diffOfflineRedirect(rawFromPath) {
  if (!rawFromPath) {
    console.error("--offline-redirect needs a fromPath argument, e.g. --offline-redirect=/tB/Core/Day");
    process.exit(1);
  }
  const candidates = [rawFromPath];
  if (!rawFromPath.startsWith("/")) candidates.push("/" + rawFromPath);
  const stubs = deriveRedirectStubs(pages, site);
  const stub = stubs.find(s => candidates.includes(s.fromPath) || candidates.includes(s.destPath));
  if (!stub) {
    console.error(`No redirect stub matches "${rawFromPath}".`);
    console.error(`Sample available fromPaths:`);
    for (const s of stubs.slice(0, 5)) console.error(`  ${s.fromPath}  →  ${s.destPath}`);
    process.exit(1);
  }
  const jekyllPath = path.join(siteOfflineRoot, stub.destPath);
  let jekyllStub;
  try { jekyllStub = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll offline stub not found:", jekyllPath); process.exit(1); }

  const oursStub = deriveOfflineRedirect(stub, offlineState);
  reportDiff(
    `offline redirect ${stub.fromPath} → ${stub.destPath} (owner: ${stub.sourcePage.srcRel})`,
    jekyllStub,
    oursStub,
  );
}

// ---- Mode: --offline-css=<themeRel> ---------------------------------

async function diffOfflineCss(rawRel) {
  if (!rawRel) {
    console.error("--offline-css needs a path argument, e.g. --offline-css=assets/css/just-the-docs-combined.css");
    process.exit(1);
  }
  const themeRel = rawRel.startsWith("/") ? rawRel.slice(1) : rawRel;
  const srcPath = path.join(siteRoot, themeRel);
  let cssIn;
  try { cssIn = await fs.readFile(srcPath, "utf8"); }
  catch { console.error("Jekyll source CSS not found at:", srcPath); process.exit(1); }

  const jekyllPath = path.join(siteOfflineRoot, themeRel);
  let jekyllCss;
  try { jekyllCss = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll offline CSS not found at:", jekyllPath); process.exit(1); }

  const { css: oursCss, misses } = deriveOfflineCss(cssIn, themeRel, offlineState);
  const label = `offline CSS ${themeRel}` + (misses ? ` (${misses} unresolved URLs)` : "");
  reportDiff(label, jekyllCss, oursCss);
}

// ---- Mode: --offline-jtd --------------------------------------------

async function diffOfflineJtd() {
  const srcPath = path.join(siteRoot, "assets/js/just-the-docs.js");
  let srcJs;
  try { srcJs = await fs.readFile(srcPath, "utf8"); }
  catch { console.error("Jekyll source just-the-docs.js not found:", srcPath); process.exit(1); }

  const jekyllPath = path.join(siteOfflineRoot, "assets/js/just-the-docs.js");
  let jekyllJs;
  try { jekyllJs = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll offline just-the-docs.js not found:", jekyllPath); process.exit(1); }

  const { js: oursJs, patches, warnings } = deriveOfflineJtdJs(srcJs);
  for (const w of warnings) console.warn(w);
  const label = `offline just-the-docs.js (patched: ${patches.join(", ") || "none"})`;
  reportDiff(label, jekyllJs, oursJs);
}

// ---- Mode: --offline-search -----------------------------------------

async function diffOfflineSearch() {
  // Derive the search-data.json bytes in memory (same path Phase 6
  // produces them), wrap as window.SEARCH_DATA = ..., diff vs Jekyll.
  // We need writeSearchData's bytes, but the function writes to disk
  // -- use a scratch dest so the write is harmless.
  const scratchDest = path.join(srcRoot, "_site-diff-scratch");
  await fs.mkdir(scratchDest, { recursive: true });
  const { json } = await writeSearchData(pages, site, scratchDest);
  await fs.rm(scratchDest, { recursive: true, force: true });

  const oursJs = deriveOfflineSearchDataJs(json);
  const jekyllPath = path.join(siteOfflineRoot, "assets/js/search-data.js");
  let jekyllJs;
  try { jekyllJs = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll offline search-data.js not found:", jekyllPath); process.exit(1); }

  reportDiff("offline search-data.js", jekyllJs, oursJs);
}

// ---- Shared: byte-diff with first-divergence context -----------------

function reportDiff(label, jekyll, ours) {
  if (jekyll === ours) {
    console.log(`MATCH (${label})`);
    return;
  }
  const minLen = Math.min(jekyll.length, ours.length);
  let i = 0;
  while (i < minLen && jekyll[i] === ours[i]) i++;
  const ctxStart = Math.max(0, i - 60);
  const ctxEnd = i + 200;
  console.log(`DIFFER (${label}) at offset ${i} of ${ours.length} ours / ${jekyll.length} jekyll`);
  console.log("JEKYLL:", JSON.stringify(jekyll.slice(ctxStart, Math.min(ctxEnd, jekyll.length))));
  console.log("OURS  :", JSON.stringify(ours.slice(ctxStart, Math.min(ctxEnd, ours.length))));
  process.exitCode = 1;
}
