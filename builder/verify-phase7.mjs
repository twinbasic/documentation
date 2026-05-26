// One-off verification harness for PLAN-7.md §10 acceptance.
// Run: cd builder && node verify-phase7.mjs
//
// Drives the full Phase 1+2+3+4+5+6+7 pipeline into scratch destinations
// (`docs/_site-verify/` + `docs/_site-verify-offline/`) and checks:
//   - Structural: offlineRoot exists, page count matches Phase 5,
//     redirect count matches Phase 6, theme assets present, search-data.js
//     present and starts with `window.SEARCH_DATA = `, offline_exclude
//     files (CNAME / robots.txt / sitemap.xml / book.html) absent.
//   - Byte parity vs Jekyll's docs/_site-offline/: 5 spot-checked pages
//     (a mix of top-level, deep, redirect-target, and space-in-permalink),
//     5 spot-checked redirect stubs, the patched just-the-docs.js,
//     and the search-data.js wrap.
//   - URL-rewrite completeness: zero surviving `href="/...`, `src="/...`,
//     `url(/...` outside of intentionally-external links.
//   - Zero surviving https://docs.twinbasic.com references outside of the
//     small number of external-link aux-links the config emits.
//   - Performance: total Phase 7 wall time under 1500 ms (soft cap).
//
// Output: per-check `OK <label>` / `FAIL: <reason>` lines, per-substep
// timings, optional WARN if soft cap exceeded.
//
// Accepted-divergence handling: pages in ACCEPTED_DIVERGENCE_PATHS are
// allowed to differ; the byte spot-check skips them.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";
import { renderPhase, createMarkdownIt, initHighlighter, buildLinkTables } from "./render.mjs";
import { templatePhase } from "./template.mjs";
import { writePhase } from "./write.mjs";
import { writeRedirects } from "./redirects.mjs";
import { writeSitemap } from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";
import { writeOffline } from "./offline.mjs";
import { ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

function passed(msg) { console.log(`OK   ${msg}`); }

function makeTimer() {
  let last = Date.now();
  const laps = [];
  return {
    lap(label) {
      const now = Date.now();
      laps.push({ label, ms: now - last });
      last = now;
    },
    laps() { return laps; },
  };
}

function bytesEqual(a, b) {
  return a.length === b.length && a.equals(b);
}

async function main() {
  const srcRoot = path.resolve(process.cwd(), "../docs");
  const jekyllSite = path.join(srcRoot, "_site");
  const jekyllOffline = path.join(srcRoot, "_site-offline");
  const verifyDest = path.join(srcRoot, "_site-verify");
  const verifyOffline = path.join(srcRoot, "_site-verify-offline");

  const t = makeTimer();
  const { pages, staticFiles } = await discover(srcRoot);
  t.lap("discover");

  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  const { navTree } = computeNav(pages, config);
  t.lap("nav");

  const highlighter = await initHighlighter();
  const linkTables = buildLinkTables(pages);
  const baseurl = String(config.baseurl || "");
  const staticFileSet = new Set(staticFiles.map((s) => s.srcRel));
  const markdown = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles: staticFileSet });
  t.lap("markdown-init");

  const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config, markdown);
  t.lap("seo");

  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  t.lap("book");

  const buildInfo = await captureBuildInfo();
  t.lap("buildInfo");

  const site = { config, navTree, seoSiteTitle, seoLogoUrl, buildInfo, bookData, markdown };

  await renderPhase(pages, site, staticFiles);
  t.lap("render");

  await templatePhase(pages, site);
  t.lap("template");

  await writePhase(pages, staticFiles, { destRoot: verifyDest, dryRun: false });
  t.lap("write");

  const [redirectStats, sitemapStats, searchStats] = await Promise.all([
    writeRedirects(pages, site, verifyDest),
    writeSitemap(pages, site, verifyDest),
    writeSearchData(pages, site, verifyDest),
  ]);
  t.lap("auxiliaries");
  const auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };

  const t7Start = Date.now();
  const offlineStats = await writeOffline(pages, staticFiles, site, verifyDest, { auxStats });
  const t7Ms = Date.now() - t7Start;
  t.lap("offline");

  console.log("Substep timings:");
  for (const l of t.laps()) console.log(`  ${l.label}: ${l.ms} ms`);
  console.log();
  console.log(`Phase 7 counters: ${offlineStats.html} HTML, ${offlineStats.css} CSS, ` +
              `${offlineStats.redirects} redirect stubs, ` +
              `${offlineStats.statics + offlineStats.assets} assets, ` +
              `${offlineStats.excluded} excluded (${offlineStats.unresolved} unresolved)`);
  console.log();

  // ----- §10.1 structural -----------------------------------------------
  const offlineStat = await fs.stat(verifyOffline).catch(() => null);
  assert(offlineStat && offlineStat.isDirectory(),
    `${verifyOffline} exists and is a directory`)
    && passed(`offlineRoot exists at ${verifyOffline}`);

  // Page count
  const expectedPages = pages.filter(p => p.html !== undefined).length;
  assert(offlineStats.html === expectedPages,
    `offline page count: wrote ${offlineStats.html}, expected ${expectedPages}`)
    && passed(`offline page count: ${offlineStats.html}`);

  // Redirect stubs
  assert(offlineStats.redirects === redirectStats.written,
    `offline redirect count: ${offlineStats.redirects}, expected ${redirectStats.written}`)
    && passed(`offline redirect count: ${offlineStats.redirects}`);

  // Zero unresolved on the production tree
  assert(offlineStats.unresolved === 0,
    `unresolved URL count: ${offlineStats.unresolved} (expected 0)`)
    && passed(`unresolved URL count: 0`);

  // Theme assets present
  for (const rel of [
    "assets/css/just-the-docs-combined.css",
    "assets/css/print.css",
    "assets/js/just-the-docs.js",
    "assets/js/vendor/lunr.min.js",
  ]) {
    const exists = await fs.access(path.join(verifyOffline, rel)).then(() => true).catch(() => false);
    assert(exists, `theme asset present: ${rel}`) && passed(`theme asset present: ${rel}`);
  }

  // search-data.js present and well-formed wrap
  const searchJsPath = path.join(verifyOffline, "assets/js/search-data.js");
  const searchJs = await fs.readFile(searchJsPath, "utf8").catch(() => null);
  assert(searchJs !== null, `search-data.js exists at ${searchJsPath}`)
    && passed(`search-data.js exists`);
  if (searchJs) {
    assert(searchJs.startsWith("window.SEARCH_DATA = "),
      `search-data.js starts with window.SEARCH_DATA = ...`)
      && passed(`search-data.js wraps as window.SEARCH_DATA`);
  }

  // offline_exclude files absent
  for (const rel of ["CNAME", "robots.txt", "sitemap.xml", "book.html"]) {
    const exists = await fs.access(path.join(verifyOffline, rel)).then(() => true).catch(() => false);
    assert(!exists, `excluded file absent: ${rel}`) && passed(`excluded file absent: ${rel}`);
  }

  // ----- §10.2 HTML byte parity -----------------------------------------
  // 5 spot-checked pages. Skip any that's in ACCEPTED_DIVERGENCE_PATHS.
  const pageSamples = [
    { srcRel: "FAQ.md", destRel: "FAQ.html" },
    { srcRel: "Reference/Core/Const.md", destRel: "tB/Core/Const.html" },
    { srcRel: "Tutorials/CustomControls/Form Designer.md", destRel: "Tutorials/CustomControls/Form Designer.html" },
    { srcRel: "Reference/VBA/DateTime/Day.md", destRel: "tB/Modules/DateTime/Day.html" },
    { srcRel: "Reference.md", destRel: "Reference.html" },
  ];
  for (const sample of pageSamples) {
    if (ACCEPTED_DIVERGENCE_PATHS.has(sample.srcRel)) {
      console.log(`SKIP  ${sample.destRel} (accepted divergence)`);
      continue;
    }
    const ourBytes = await fs.readFile(path.join(verifyOffline, sample.destRel)).catch(() => null);
    if (!ourBytes) { assert(false, `offline page exists: ${sample.destRel}`); continue; }
    const jBytes = await fs.readFile(path.join(jekyllOffline, sample.destRel)).catch(() => null);
    if (!jBytes) { console.log(`SKIP  ${sample.destRel} (jekyll missing)`); continue; }
    if (bytesEqual(ourBytes, jBytes)) {
      passed(`offline page byte-match: ${sample.destRel}`);
    } else {
      assert(false, `offline page byte-match: ${sample.destRel} (jekyll=${jBytes.length}, ours=${ourBytes.length})`);
    }
  }

  // ----- §10.4 redirect stub byte parity --------------------------------
  const stubSamples = [
    "tB/Core/Day.html",
    "tB/Core/Hour.html",
    "tB/Core/Month.html",
    "tB/Core/LBound.html",
    "tB/Core/UBound.html",
  ];
  for (const rel of stubSamples) {
    const ours = await fs.readFile(path.join(verifyOffline, rel)).catch(() => null);
    if (!ours) { assert(false, `offline redirect stub exists: ${rel}`); continue; }
    const jBytes = await fs.readFile(path.join(jekyllOffline, rel)).catch(() => null);
    if (!jBytes) { console.log(`SKIP  ${rel} (jekyll missing)`); continue; }
    if (bytesEqual(ours, jBytes)) {
      passed(`offline redirect byte-match: ${rel}`);
    } else {
      assert(false, `offline redirect byte-match: ${rel} (jekyll=${jBytes.length}, ours=${ours.length})`);
    }
  }

  // ----- §10.5 just-the-docs.js patch parity ----------------------------
  // Compare against Jekyll's offline JS only when Jekyll started from
  // the same source: that is, when our verify-tree's _site/ JS already
  // matches Jekyll's _site/ JS. If the upstream theme assets differ
  // (a Phase 5 divergence between builder/assets/ and Jekyll's vendor
  // bundle), the patched outputs will differ for the same reason --
  // not a Phase 7 issue.
  const jtdRel = "assets/js/just-the-docs.js";
  const oursJtd = await fs.readFile(path.join(verifyOffline, jtdRel), "utf8");
  const ourSourceJtd = await fs.readFile(path.join(verifyDest, jtdRel), "utf8");
  const jekyllSourceJtd = await fs.readFile(path.join(jekyllSite, jtdRel), "utf8").catch(() => null);
  const jJtd = await fs.readFile(path.join(jekyllOffline, jtdRel), "utf8").catch(() => null);
  if (jJtd != null && jekyllSourceJtd != null) {
    if (ourSourceJtd === jekyllSourceJtd) {
      // Upstream theme assets match; offline JS must too.
      if (oursJtd === jJtd) {
        passed(`offline just-the-docs.js byte-match`);
      } else {
        assert(false, `offline just-the-docs.js byte-match (jekyll=${jJtd.length}, ours=${oursJtd.length})`);
      }
    } else {
      console.log(`SKIP  offline just-the-docs.js byte-match (Phase 5 source theme JS differs from Jekyll; ` +
                  `ours=${ourSourceJtd.length}, jekyll=${jekyllSourceJtd.length})`);
    }
  }
  // Sanity: the patched functions are present.
  assert(/links\[i\]\.href === here/.test(oursJtd),
    `patched navLink() body present in just-the-docs.js`)
    && passed(`patched navLink() body present`);
  assert(/window\.SEARCH_DATA/.test(oursJtd),
    `patched initSearch() reads window.SEARCH_DATA`)
    && passed(`patched initSearch() reads window.SEARCH_DATA`);
  assert(Array.isArray(offlineStats.jtdPatches) &&
    offlineStats.jtdPatches.includes("navLink()") &&
    offlineStats.jtdPatches.includes("initSearch()"),
    `offlineStats.jtdPatches reports both patches landed`)
    && passed(`offlineStats.jtdPatches = ${JSON.stringify(offlineStats.jtdPatches)}`);

  // ----- §10.6 search-data.js content parity ---------------------------
  // Same JSON should round-trip through the wrap byte-for-byte.
  const jSearchJson = await fs.readFile(path.join(jekyllSite, "assets/js/search-data.json"), "utf8");
  const expectedWrap = `window.SEARCH_DATA = ${jSearchJson};\n`;
  // Note: our search-data.json may differ from Jekyll's by accepted-divergence
  // content; that propagates to search-data.js. Skip parity if the upstream
  // search-data.json already differs.
  if (auxStats.search.json === jSearchJson) {
    if (searchJs === expectedWrap) {
      passed(`search-data.js byte-match vs canonical wrap`);
    } else {
      assert(false, `search-data.js wrap mismatch (jekyll=${jSearchJson.length} json, ours=${searchJs.length})`);
    }
  } else {
    console.log(`SKIP  search-data.js wrap parity (upstream JSON differs -- see verify-phase6)`);
  }

  // ----- §10.7 URL-rewrite completeness --------------------------------
  // Scan every offline HTML page and assert no surviving root-absolute
  // href/src or url() references. Allowed: external https://... URLs.
  const sweepRoots = [verifyOffline];
  const offendingHtml = [];
  for (const root of sweepRoots) {
    await walkFiles(root, async (file) => {
      if (!file.endsWith(".html")) return;
      const html = await fs.readFile(file, "utf8");
      // Strip <code>/<pre> contents to avoid false positives.
      const stripped = html.replace(/<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>/g, "");
      const absHref = /\bhref="\/(?!\/)/.exec(stripped);
      const absSrc = /\bsrc="\/(?!\/)/.exec(stripped);
      if (absHref || absSrc) {
        offendingHtml.push({ file, hit: (absHref || absSrc)[0] });
      }
    });
  }
  assert(offendingHtml.length === 0,
    `no surviving href="/... or src="/... in offline HTML (got ${offendingHtml.length})`)
    && passed(`no surviving root-absolute href/src in offline HTML`);
  if (offendingHtml.length > 0) {
    for (const o of offendingHtml.slice(0, 5)) {
      console.log(`    ${path.relative(verifyOffline, o.file)}: ${o.hit}`);
    }
    if (offendingHtml.length > 5) console.log(`    ... +${offendingHtml.length - 5} more`);
  }

  // CSS url() sweep
  const offendingCss = [];
  await walkFiles(path.join(verifyOffline, "assets/css"), async (file) => {
    if (!file.endsWith(".css")) return;
    const css = await fs.readFile(file, "utf8");
    const hit = /url\(\s*["']?\/(?!\/)/.exec(css);
    if (hit) offendingCss.push({ file, hit: hit[0] });
  });
  assert(offendingCss.length === 0,
    `no surviving url(/... in offline CSS (got ${offendingCss.length})`)
    && passed(`no surviving root-absolute url() in offline CSS`);

  // ----- §10.8 surviving https://docs.twinbasic.com check -------------
  // SEO block stripped + redirect-stub URLs rewritten should leave only
  // intentional source-side links to the live site (e.g. the
  // "Documentation" aux-link in FAQ.md). Compare against Jekyll's set
  // of HTML files carrying the reference -- ours should be a subset.
  const ourLiveHits = new Set();
  await walkFiles(verifyOffline, async (file) => {
    if (!file.endsWith(".html") && !file.endsWith(".css")) return;
    const content = await fs.readFile(file, "utf8");
    if (content.includes("https://docs.twinbasic.com")) {
      ourLiveHits.add(path.relative(verifyOffline, file).replaceAll("\\", "/"));
    }
  });
  const jekyllLiveHits = new Set();
  await walkFiles(jekyllOffline, async (file) => {
    if (!file.endsWith(".html") && !file.endsWith(".css")) return;
    const content = await fs.readFile(file, "utf8");
    if (content.includes("https://docs.twinbasic.com")) {
      jekyllLiveHits.add(path.relative(jekyllOffline, file).replaceAll("\\", "/"));
    }
  });
  const ourExtra = [...ourLiveHits].filter(f => !jekyllLiveHits.has(f));
  assert(ourExtra.length === 0,
    `no extra https://docs.twinbasic.com references vs Jekyll (got ${ourExtra.length} extra; ` +
    `ours=${ourLiveHits.size}, jekyll=${jekyllLiveHits.size})`)
    && passed(`https://docs.twinbasic.com references match Jekyll set ` +
              `(${ourLiveHits.size} files, all intentional source-side links)`);
  if (ourExtra.length > 0) {
    for (const f of ourExtra.slice(0, 5)) console.log(`    ${f}`);
    if (ourExtra.length > 5) console.log(`    ... +${ourExtra.length - 5} more`);
  }

  // ----- §10.9 performance smoke check ---------------------------------
  // PLAN-9 §5.3: the B7 nav-block cache shaves ~200 ms off the HTML
  // pass; the soft cap drops from 1500 ms to 1200 ms accordingly.
  if (t7Ms > 1200) {
    console.error(`WARN: Phase 7 took ${t7Ms} ms (soft cap 1200 ms)`);
    process.exitCode = 1;
  } else if (t7Ms > 800) {
    console.log(`OK   Phase 7 took ${t7Ms} ms (above 800 ms target, under 1200 ms soft cap)`);
  } else {
    passed(`Phase 7 took ${t7Ms} ms (under 800 ms target)`);
  }

  // ----- cleanup --------------------------------------------------------
  await fs.rm(verifyDest, { recursive: true, force: true });
  await fs.rm(verifyOffline, { recursive: true, force: true });

  if (process.exitCode) {
    console.log("\nFAILED");
  } else {
    console.log("\nAll required checks passed.");
  }
}

// Recursive file walker. fn is called for each file path (absolute).
// Directories with no files are silently skipped.
async function walkFiles(root, fn) {
  let dirents;
  try { dirents = await fs.readdir(root, { withFileTypes: true }); }
  catch { return; }
  for (const d of dirents) {
    const full = path.join(root, d.name);
    if (d.isDirectory()) {
      await walkFiles(full, fn);
    } else if (d.isFile()) {
      await fn(full);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
