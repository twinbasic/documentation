// Single-target diff harness against Jekyll's `_site/` (Phases 4-6),
// `_site-offline/` (Phase 7), and `_site-pdf/` (Phase 8) outputs.
// Drives the tbdocs pipeline through the phase the requested target
// needs, then byte-diffs the in-memory result against the matching
// Jekyll output.
//
// Phase 4 / 6 modes (online site):
//
//   node _diff.mjs [<page-srcRel>] [--no-strip] [--full]
//     Default mode. Diff page.html (Phase 4) vs `_site/<destPath>`.
//     <page-srcRel> defaults to "Reference/Core/Const.md".
//     --no-strip / --full keeps the sidebar in the diff (default
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
//     Diff robots.txt vs `_site/robots.txt`.
//
//   node _diff.mjs --search <page-srcRel>
//     Diff search-index entries for one page vs `_site/assets/js/
//     search-data.json`. Filters tbdocs's derived entries to those
//     originating in <page-srcRel>, finds Jekyll's matching entries,
//     set-diffs and content-diffs per (doc, title, url, relUrl) tuple.
//
// Phase 7 modes (offline mirror):
//
//   node _diff.mjs --offline=<srcRel>
//     Diff one offline-tree HTML page vs `_site-offline/<destPath>`.
//
//   node _diff.mjs --offline-redirect=<fromPath>
//     Diff one offline redirect stub vs `_site-offline/<destPath>`.
//
//   node _diff.mjs --offline-css=<themeRel>
//     Diff one offline CSS file vs `_site-offline/<themeRel>`.
//
//   node _diff.mjs --offline-jtd
//     Diff the patched `assets/js/just-the-docs.js` vs
//     `_site-offline/assets/js/just-the-docs.js`.
//
//   node _diff.mjs --offline-search
//     Diff the offline `search-data.js` wrap vs
//     `_site-offline/assets/js/search-data.js`.
//
// Phase 8 modes (PDF book):
//
//   node _diff.mjs --book [--full]
//     Diff the assembled book.html vs `_site-pdf/book.html`. The
//     build-info line (`<p class="build-info">Built ...</p>`) is
//     normalised on both sides by default so commit / build-date
//     drift doesn't surface as a divergence. Pass `--book=full`
//     (no normalisation) to surface every byte difference.
//
//   node _diff.mjs --pdf-image=<rel>
//     Check whether an image path appears in the assembled book.html's
//     <img src=> set AND in `staticFiles[]`. Prints one of:
//       MATCH    -- referenced from book.html, in staticFiles
//       MISS     -- not referenced from book.html
//       MISSING-IN-INVENTORY -- referenced but not in staticFiles
//                               (Phase 8 would log it as missing)
//
//   node _diff.mjs --pdf-css=<rel>
//     Diff one PDF-tree CSS file vs `_site-pdf/<rel>`. Reads <rel>
//     from `_site/<rel>` (the source pdfify.rb copies from) and
//     `_site-pdf/<rel>`; the two must be byte-equal. Useful for
//     verifying `assets/css/print.css` / `assets/css/rouge.css`.
//
// All modes print "MATCH" on full byte equality or "DIFFER" with the
// first divergence offset + ~200 chars of context. Run with `--help`
// for this usage line.

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
import { deriveBookOutputs, extractImagePaths } from "./pdf.mjs";

const SIDEBAR_RE = /<nav aria-label="Main" id="site-nav"[\s\S]*?<\/nav>/;
function stripSidebar(h) { return h.replace(SIDEBAR_RE, "<SIDEBAR/>"); }

// Normalise the build-info line so commit / date / build-day variations
// don't show up as divergences in --book mode.
const BUILD_INFO_RE = /<p class="build-info">Built[^<]*<\/p>/;
function normaliseBuildInfo(html) {
  return html.replace(
    BUILD_INFO_RE,
    `<p class="build-info">Built BUILDDATE from commit COMMIT (COMMITDATE).</p>`,
  );
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

const HELP_TEXT = `Usage:
  Online site (Phase 4 / 6):
    node _diff.mjs [<page-srcRel>] [--full]      page.html vs _site/
    node _diff.mjs --redirect=<fromPath>         redirect stub vs _site/
    node _diff.mjs --robots                      robots.txt vs _site/
    node _diff.mjs --search=<page-srcRel>        search-index entries

  Offline mirror (Phase 7):
    node _diff.mjs --offline=<srcRel>            offline page vs _site-offline/
    node _diff.mjs --offline-redirect=<fromPath> offline stub vs _site-offline/
    node _diff.mjs --offline-css=<themeRel>      offline CSS vs _site-offline/
    node _diff.mjs --offline-jtd                 patched JTD JS
    node _diff.mjs --offline-search              search-data.js wrap

  PDF book (Phase 8):
    node _diff.mjs --book [--book=full]          book.html vs _site-pdf/
                                                 default normalises build-info
    node _diff.mjs --pdf-image=<rel>             check image presence
    node _diff.mjs --pdf-css=<rel>               PDF-tree CSS vs _site-pdf/

  Page-diff modifiers (PLAN-9 §5.10 / §5.12):
    --against-disk[=<root>]                      read bytes from <root>
                                                 (default: <srcRoot>/_site-new/)
                                                 instead of the in-memory render
    --multi                                      continue past the first
                                                 divergence and report each
                                                 distinct region

  node _diff.mjs --help                          this message

Print "MATCH" on byte equality, "DIFFER" with first-divergence offset
and ~200 chars of context otherwise.`;

// ---- Parse args ------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP_TEXT);
  process.exit(0);
}
const noStrip = args.includes("--no-strip") || (args.includes("--full") && !args.some(a => a === "--book" || a === "--book=full"));
const redirectArg = argValue(args, "--redirect");
const searchArg = argValue(args, "--search");
const robotsMode = args.includes("--robots");
const offlineArg = argValue(args, "--offline");
const offlineRedirectArg = argValue(args, "--offline-redirect");
const offlineCssArg = argValue(args, "--offline-css");
const offlineJtdMode = args.includes("--offline-jtd");
const offlineSearchMode = args.includes("--offline-search");
const bookMode = args.includes("--book") || args.includes("--book=full");
const bookFullMode = args.includes("--book=full") || (args.includes("--book") && args.includes("--full"));
const pdfImageArg = argValue(args, "--pdf-image");
const pdfCssArg = argValue(args, "--pdf-css");
// --against-disk needs its own handling because argValue would
// otherwise consume the positional page-srcRel that often follows.
// `--against-disk` (bare) -> "" -> default root. `--against-disk=<p>`
// -> "<p>". Not passed at all -> null.
const againstDiskEq = args.find(a => a.startsWith("--against-disk="));
const againstDiskBare = args.includes("--against-disk");
const againstDiskArg = againstDiskEq != null
  ? againstDiskEq.slice("--against-disk=".length)
  : (againstDiskBare ? "" : null);
const multiMode = args.includes("--multi");

// One mode at a time.
const mode = robotsMode ? "robots"
  : offlineJtdMode ? "offline-jtd"
  : offlineSearchMode ? "offline-search"
  : offlineRedirectArg !== null ? "offline-redirect"
  : offlineCssArg !== null ? "offline-css"
  : offlineArg !== null ? "offline-page"
  : redirectArg !== null ? "redirect"
  : searchArg !== null ? "search"
  : pdfImageArg !== null ? "pdf-image"
  : pdfCssArg !== null ? "pdf-css"
  : bookMode ? "book"
  : "page";

const needsTemplate = mode === "page" || mode === "offline-page";
const needsRender = mode === "page" || mode === "search"
  || mode === "offline-page" || mode === "offline-search"
  || mode === "book" || mode === "pdf-image";
const needsOfflineState = mode === "offline-page" || mode === "offline-redirect"
  || mode === "offline-css";
const needsBuildInfo = needsTemplate || mode === "book";

// ---- Drive pipeline through required phase ---------------------------

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");
const siteOfflineRoot = path.join(srcRoot, "_site-offline");
const sitePdfRoot = path.join(srcRoot, "_site-pdf");

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
const buildInfo = needsBuildInfo ? await captureBuildInfo() : null;
const site = { config, navTree, ...seo, buildInfo, bookData, markdown };
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
else if (mode === "book")             await diffBook(bookFullMode);
else if (mode === "pdf-image")        await diffPdfImage(pdfImageArg);
else if (mode === "pdf-css")          await diffPdfCss(pdfCssArg);
else                                  await diffPage();

// ---- Mode: page (default) -------------------------------------------

async function diffPage() {
  const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--redirect" && args[i - 1] !== "--search");
  const which = positional[0] || "Reference/Core/Const.md";
  const p = pages.find((x) => x.srcRel === which);
  if (!p) { console.error("page not found:", which); process.exit(1); }

  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll output not found at:", jekyllPath); process.exit(1); }

  // PLAN-9 §5.10 (B12) --against-disk: read the ours-side bytes from
  // a written tree on disk (default: <srcRoot>/_site-new/) instead
  // of the in-memory page.html. Useful for triaging write-time
  // encoding bugs or line-ending contamination that the in-memory
  // compare can't see.
  let oursHtml;
  let labelKind;
  if (againstDiskArg !== null) {
    const diskRoot = path.resolve(againstDiskArg || path.join(srcRoot, "_site-new"));
    const diskPath = path.join(diskRoot, p.destPath);
    try { oursHtml = await fs.readFile(diskPath, "utf8"); }
    catch { console.error("disk file not found:", diskPath); process.exit(1); }
    labelKind = `Phase 5 disk (${diskRoot})`;
  } else {
    if (p.html === undefined) {
      console.error(`page.html is undefined for ${which} (book.html bypass?)`);
      process.exit(1);
    }
    oursHtml = p.html;
    labelKind = "Phase 4";
  }
  const jekyllSubject = noStrip ? jekyllHtml : stripSidebar(jekyllHtml);
  const oursSubject = noStrip ? oursHtml : stripSidebar(oursHtml);
  const label = `${labelKind}${noStrip ? " full page" : " sidebar-stripped"}`;
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

// ---- Mode: --book / --book=full -------------------------------------

async function diffBook(full) {
  const { bookHtml } = deriveBookOutputs(pages, site);
  const jekyllPath = path.join(sitePdfRoot, "book.html");
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); }
  catch { console.error("Jekyll book.html not found at:", jekyllPath); process.exit(1); }

  const ours = full ? bookHtml : normaliseBuildInfo(bookHtml);
  const theirs = full ? jekyllHtml : normaliseBuildInfo(jekyllHtml);
  const label = full ? "book.html (full)" : "book.html (build-info normalised)";
  reportDiff(label, theirs, ours);
}

// ---- Mode: --pdf-image=<rel> ----------------------------------------

async function diffPdfImage(rel) {
  if (!rel) {
    console.error("--pdf-image needs a relative-path argument, e.g. --pdf-image=Features/Images/foo.png");
    process.exit(1);
  }
  const normRel = rel.replaceAll("\\", "/").replace(/^\//, "");
  const { bookHtml } = deriveBookOutputs(pages, site);
  const imagePaths = extractImagePaths(bookHtml);
  const inBook = imagePaths.includes(normRel);
  const inInventory = staticFiles.some(
    (s) => s.destRel.replaceAll("\\", "/") === normRel,
  );

  if (inBook && inInventory) {
    console.log(`MATCH (pdf-image ${normRel}: in book.html and in staticFiles[])`);
    return;
  }
  if (inBook && !inInventory) {
    console.log(`MISSING-IN-INVENTORY (pdf-image ${normRel}: in book.html, NOT in staticFiles[]) -- ` +
                `Phase 8's strict-mode reporter would flag this as a missing image`);
    process.exitCode = 1;
    return;
  }
  // !inBook
  const sample = imagePaths.slice(0, 5).join(", ");
  console.log(`MISS (pdf-image ${normRel}: not referenced from book.html. ` +
              `${imagePaths.length} image(s) referenced; first 5: ${sample})`);
  process.exitCode = 1;
}

// ---- Mode: --pdf-css=<rel> ------------------------------------------

async function diffPdfCss(rel) {
  if (!rel) {
    console.error("--pdf-css needs a path argument, e.g. --pdf-css=assets/css/print.css");
    process.exit(1);
  }
  // Pdfify reads CSS from <site.dest>/<rel> and writes <site.dest>-pdf/
  // <rel>; the two files should be byte-identical. The diff verifies
  // that Jekyll's _site-pdf/<rel> matches Jekyll's _site/<rel>.
  const themeRel = rel.startsWith("/") ? rel.slice(1) : rel;
  const onlinePath = path.join(siteRoot, themeRel);
  const pdfPath = path.join(sitePdfRoot, themeRel);
  let online, pdf;
  try { online = await fs.readFile(onlinePath, "utf8"); }
  catch { console.error("Jekyll _site/" + themeRel + " not found"); process.exit(1); }
  try { pdf = await fs.readFile(pdfPath, "utf8"); }
  catch { console.error("Jekyll _site-pdf/" + themeRel + " not found"); process.exit(1); }
  reportDiff(`pdf CSS ${themeRel} (_site/ -> _site-pdf/)`, online, pdf);
}

// ---- Shared: byte-diff with first-divergence context -----------------

function reportDiff(label, jekyll, ours) {
  if (jekyll === ours) {
    console.log(`MATCH (${label})`);
    return;
  }
  if (multiMode) {
    reportMultiDiff(label, jekyll, ours);
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

// PLAN-9 §5.12 (A1) --multi: walk both strings, locate every region
// where they diverge and re-sync, and emit each one. Re-syncs by
// looking for a 32-char common run after each divergence; gives up
// after 20 regions to bound noise on totally-different inputs.
function reportMultiDiff(label, jekyll, ours) {
  const RESYNC_RUN = 32;
  const MAX_REGIONS = 20;
  const regions = [];
  let j = 0, o = 0;
  while (j < jekyll.length && o < ours.length) {
    if (jekyll[j] === ours[o]) { j++; o++; continue; }
    const jStart = j;
    const oStart = o;
    // Advance both until we find a long common substring.
    let resyncJ = -1, resyncO = -1;
    for (let dj = 0; dj <= 4096 && jStart + dj < jekyll.length; dj++) {
      for (let dO = 0; dO <= 4096 && oStart + dO < ours.length; dO++) {
        if (jekyll.substr(jStart + dj, RESYNC_RUN) ===
            ours.substr(oStart + dO, RESYNC_RUN)) {
          resyncJ = jStart + dj;
          resyncO = oStart + dO;
          break;
        }
      }
      if (resyncJ !== -1) break;
    }
    if (resyncJ === -1) {
      regions.push({
        jStart, jEnd: jekyll.length,
        oStart, oEnd: ours.length,
        jSlice: jekyll.slice(jStart, Math.min(jStart + 200, jekyll.length)),
        oSlice: ours.slice(oStart, Math.min(oStart + 200, ours.length)),
        unresolved: true,
      });
      break;
    }
    regions.push({
      jStart, jEnd: resyncJ,
      oStart, oEnd: resyncO,
      jSlice: jekyll.slice(jStart, resyncJ),
      oSlice: ours.slice(oStart, resyncO),
    });
    if (regions.length >= MAX_REGIONS) break;
    j = resyncJ;
    o = resyncO;
  }
  console.log(`DIFFER-MULTI (${label}) ${regions.length} divergence region(s)`);
  for (const [k, r] of regions.entries()) {
    const j0 = Math.max(0, r.jStart - 30);
    const o0 = Math.max(0, r.oStart - 30);
    console.log(`  [${k + 1}] jekyll[${r.jStart}..${r.jEnd}] (${r.jEnd - r.jStart} chars) / ` +
                `ours[${r.oStart}..${r.oEnd}] (${r.oEnd - r.oStart} chars)` +
                (r.unresolved ? "  -- unresolved (no resync within 4096 chars)" : ""));
    console.log(`      jekyll: ${JSON.stringify(jekyll.slice(j0, Math.min(r.jEnd + 30, jekyll.length)))}`);
    console.log(`      ours  : ${JSON.stringify(ours.slice(o0, Math.min(r.oEnd + 30, ours.length)))}`);
  }
  process.exitCode = 1;
}
