// One-off verification harness for PLAN-6.md §10 acceptance.
// Run: cd builder && node verify-phase6.mjs
//
// Drives the full Phase 1+2+3+4+5+6 pipeline into a scratch directory
// (`docs/_site-verify/`) and checks:
//   - Redirect stubs: count matches the number of frontmatter
//     redirect_from entries; 5 spot-checked stubs match Jekyll byte-
//     for-byte; collision detection fires on a synthetic clash.
//   - Sitemap: entry count + URL set match Jekyll exactly; book.html
//     and /404.html absent; homepage present.
//   - Robots.txt: byte-identical to Jekyll's (48 bytes).
//   - Search index: entry count matches Jekyll exactly; the SET of
//     (doc, title, url, relUrl) quadruples matches Jekyll exactly; per-
//     entry content is byte-identical to Jekyll for every page not in
//     accepted-divergences.mjs; JSON parses + key sequence is contiguous;
//     book.html and 404.html contribute zero entries.
//   - Cross-substep: no Phase 6 file collides with a Phase 5 file.
//   - Performance: Phase 6 wall-time under 300 ms (3x soft target).
//
// PLAN-6 §10.5 is strict: no tolerance band. The only excused content
// divergences are those documented in accepted-divergences.mjs.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";
import { renderPhase } from "./render.mjs";
import { templatePhase } from "./template.mjs";
import { writePhase } from "./write.mjs";
import { writeRedirects } from "./redirects.mjs";
import { writeSitemap } from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";
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
  const verifyDest = path.join(srcRoot, "_site-verify");

  const t = makeTimer();
  const { pages, staticFiles } = await discover(srcRoot);
  t.lap("discover");

  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  const { navTree } = computeNav(pages, config);
  t.lap("nav");

  const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config);
  t.lap("seo");

  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  t.lap("book");

  const buildInfo = await captureBuildInfo();
  t.lap("buildInfo");

  const site = { config, navTree, seoSiteTitle, seoLogoUrl, buildInfo, bookData };

  await renderPhase(pages, site, staticFiles);
  t.lap("render");

  await templatePhase(pages, site);
  t.lap("template");

  await writePhase(pages, staticFiles, { destRoot: verifyDest, dryRun: false });
  t.lap("write");

  const t6Start = Date.now();
  const [redirectStats, sitemapStats, searchStats] = await Promise.all([
    writeRedirects(pages, site, verifyDest),
    writeSitemap(pages, site, verifyDest),
    writeSearchData(pages, site, verifyDest),
  ]);
  const t6Ms = Date.now() - t6Start;
  t.lap("auxiliaries");

  console.log("Substep timings:");
  for (const l of t.laps()) console.log(`  ${l.label}: ${l.ms} ms`);
  console.log();

  // ----- §10.2 redirect parity ------------------------------------------
  const expectedStubCount = pages.reduce((n, p) => {
    const rf = p.frontmatter?.redirect_from;
    if (!rf) return n;
    return n + (Array.isArray(rf) ? rf.length : 1);
  }, 0);

  assert(redirectStats.written === expectedStubCount,
    `redirect stub count: wrote ${redirectStats.written}, expected ${expectedStubCount}`)
    && passed(`redirect stub count: ${redirectStats.written}`);

  // Spot-check 5 stubs byte-for-byte vs Jekyll.
  const stubSamples = [
    "tB/Core/Day.html",
    "tB/Core/Hour.html",
    "tB/Core/Month.html",
    "tB/Core/Now.html",
    "tB/Modules/TextEncodingConstants.html",
  ];
  for (const rel of stubSamples) {
    const ourPath = path.join(verifyDest, rel);
    const jPath = path.join(jekyllSite, rel);
    let our, jekyll;
    try { our = await fs.readFile(ourPath); }
    catch { assert(false, `redirect stub exists: ${rel}`); continue; }
    try { jekyll = await fs.readFile(jPath); }
    catch { console.log(`  SKIP ${rel} (jekyll missing)`); continue; }
    if (bytesEqual(our, jekyll)) {
      passed(`redirect stub byte-match: ${rel}`);
    } else {
      assert(false, `redirect stub byte-match: ${rel}`);
    }
  }

  // Collision detection: synthesise a colliding redirect_from on a
  // copy of pages[] and confirm writeRedirects throws.
  const collisionPages = pages.map(p => ({ ...p, frontmatter: { ...p.frontmatter } }));
  const firstFaq = collisionPages.find(p => p.permalink === "/FAQ");
  const target = collisionPages.find(p => p.permalink !== "/FAQ" && p.html !== undefined);
  if (firstFaq && target) {
    target.frontmatter = { ...target.frontmatter, redirect_from: ["/FAQ"] };
    const collisionDest = path.join(srcRoot, "_site-verify-collision");
    await fs.mkdir(collisionDest, { recursive: true });
    let threw = false;
    try {
      await writeRedirects(collisionPages, site, collisionDest);
    } catch (err) {
      if (/collision|conflict|overwrite/i.test(err.message)) threw = true;
      else throw err;
    }
    await fs.rm(collisionDest, { recursive: true, force: true });
    assert(threw, "redirect collision detection fires on synthetic clash")
      && passed(`redirect collision detection fires on synthetic clash`);
  }

  // ----- §10.3 sitemap parity -------------------------------------------
  const jSitemap = await fs.readFile(path.join(jekyllSite, "sitemap.xml"), "utf8");
  const tSitemap = await fs.readFile(path.join(verifyDest, "sitemap.xml"), "utf8");

  const jSitemapUrls = new Set([...jSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
  const tSitemapUrls = new Set([...tSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));

  assert(jSitemapUrls.size === tSitemapUrls.size,
    `sitemap entry count: jekyll=${jSitemapUrls.size}, tbdocs=${tSitemapUrls.size}`)
    && passed(`sitemap entry count: ${tSitemapUrls.size}`);

  const onlyJekyllSitemap = [...jSitemapUrls].filter(u => !tSitemapUrls.has(u));
  const onlyTbdocsSitemap = [...tSitemapUrls].filter(u => !jSitemapUrls.has(u));
  assert(onlyJekyllSitemap.length === 0,
    `sitemap: no URLs only in jekyll (got ${onlyJekyllSitemap.length}: ${onlyJekyllSitemap.slice(0,3).join(", ")})`)
    && passed(`sitemap: no URLs only in jekyll`);
  assert(onlyTbdocsSitemap.length === 0,
    `sitemap: no URLs only in tbdocs (got ${onlyTbdocsSitemap.length}: ${onlyTbdocsSitemap.slice(0,3).join(", ")})`)
    && passed(`sitemap: no URLs only in tbdocs`);

  const homepage = "https://docs.twinbasic.com/";
  assert(tSitemapUrls.has(homepage),
    `sitemap includes homepage ${homepage}`)
    && passed(`sitemap includes homepage`);

  assert(![...tSitemapUrls].some(u => u.endsWith("/404.html")),
    `sitemap excludes /404.html`)
    && passed(`sitemap excludes /404.html`);

  assert(![...tSitemapUrls].some(u => u.endsWith("/book.html")),
    `sitemap excludes book.html (frontmatter sitemap: false)`)
    && passed(`sitemap excludes book.html`);

  // ----- §10.4 robots.txt parity ----------------------------------------
  const jRobots = await fs.readFile(path.join(jekyllSite, "robots.txt"));
  const tRobots = await fs.readFile(path.join(verifyDest, "robots.txt"));
  assert(bytesEqual(jRobots, tRobots),
    `robots.txt byte-identical (jekyll=${jRobots.length}, tbdocs=${tRobots.length})`)
    && passed(`robots.txt byte-identical (${tRobots.length} bytes)`);

  // ----- §10.5 search index parity (strict) -----------------------------
  const jSearch = JSON.parse(await fs.readFile(path.join(jekyllSite, "assets/js/search-data.json"), "utf8"));
  const tSearch = JSON.parse(await fs.readFile(path.join(verifyDest, "assets/js/search-data.json"), "utf8"));

  const jKeys = Object.keys(jSearch);
  const tKeys = Object.keys(tSearch);
  assert(jKeys.length === tKeys.length,
    `search entry count: jekyll=${jKeys.length}, tbdocs=${tKeys.length}`)
    && passed(`search entry count: ${tKeys.length}`);

  // Contiguous 0-indexed sequence.
  const expectedKeys = Array.from({ length: tKeys.length }, (_, i) => String(i));
  const keysOk = expectedKeys.every((k, i) => tKeys[i] === k);
  assert(keysOk, `search keys form contiguous 0..N-1 sequence`)
    && passed(`search keys form contiguous 0..N-1 sequence`);

  // book.html and 404.html have no title → zero entries.
  const hasBookEntry = Object.values(tSearch).some(e => e.url?.includes("/book.html") || e.url === "/book.html");
  const has404Entry = Object.values(tSearch).some(e => e.url === "/404.html");
  assert(!hasBookEntry, `book.html contributes zero search entries`)
    && passed(`book.html contributes zero search entries`);
  assert(!has404Entry, `404.html contributes zero search entries`)
    && passed(`404.html contributes zero search entries`);

  // SET parity on (doc, title, url, relUrl).
  const tupleSet = (s) => {
    const set = new Set();
    for (const k of Object.keys(s)) {
      const e = s[k];
      set.add(`${e.doc}\x00${e.title}\x00${e.url}\x00${e.relUrl}`);
    }
    return set;
  };
  const jTuples = tupleSet(jSearch);
  const tTuples = tupleSet(tSearch);
  const onlyJekyllSearch = [...jTuples].filter(x => !tTuples.has(x));
  const onlyTbdocsSearch = [...tTuples].filter(x => !jTuples.has(x));
  assert(onlyJekyllSearch.length === 0,
    `search: no (doc,title,url,relUrl) tuples only in jekyll (got ${onlyJekyllSearch.length})`)
    && passed(`search: no tuples only in jekyll`);
  assert(onlyTbdocsSearch.length === 0,
    `search: no (doc,title,url,relUrl) tuples only in tbdocs (got ${onlyTbdocsSearch.length})`)
    && passed(`search: no tuples only in tbdocs`);

  // Per-entry content parity, modulo accepted-divergences.
  // Map each entry to its source page via the url's path component
  // so we can gate by srcRel.
  const pageByPermalink = new Map();
  for (const p of pages) pageByPermalink.set(p.permalink, p);

  const tEntryByTuple = new Map();
  for (const k of tKeys) {
    const e = tSearch[k];
    tEntryByTuple.set(`${e.doc}\x00${e.title}\x00${e.url}\x00${e.relUrl}`, e);
  }

  let contentMatch = 0;
  let contentAccepted = 0;
  let contentFail = 0;
  const failures = [];
  for (const k of jKeys) {
    const je = jSearch[k];
    const tupleKey = `${je.doc}\x00${je.title}\x00${je.url}\x00${je.relUrl}`;
    const te = tEntryByTuple.get(tupleKey);
    if (!te) continue; // set-diff already caught this
    if (te.content === je.content) {
      contentMatch++;
      continue;
    }
    // Map this entry back to a source page. relUrl strips the fragment.
    const permalink = je.relUrl.replace(/#.*$/, "");
    const page = pageByPermalink.get(permalink);
    const srcRel = page?.srcRel;
    if (srcRel && ACCEPTED_DIVERGENCE_PATHS.has(srcRel)) {
      contentAccepted++;
    } else {
      contentFail++;
      if (failures.length < 5) {
        failures.push({ srcRel: srcRel ?? "(unknown)", url: je.url, title: je.title });
      }
    }
  }

  assert(contentFail === 0,
    `search: per-entry content byte-matches except for accepted-divergence pages (got ${contentFail} unaccepted failures)`)
    && passed(`search: per-entry content byte-matches (${contentMatch} match, ${contentAccepted} accepted)`);
  if (contentFail > 0) {
    console.log(`  first ${failures.length} unaccepted content divergences:`);
    for (const f of failures) {
      console.log(`    ${f.srcRel}: [${f.title}] ${f.url}`);
    }
  }

  // ----- §10.6 cross-substep: no Phase 6 file collides with Phase 5 -----
  const pageDestPaths = new Set(pages.filter(p => p.html !== undefined).map(p => p.destPath));
  const phase6Paths = ["sitemap.xml", "robots.txt", "assets/js/search-data.json"];
  for (const f of phase6Paths) {
    assert(!pageDestPaths.has(f), `phase-6 file doesn't collide with a page destPath: ${f}`)
      && passed(`phase-6 file doesn't collide with a page destPath: ${f}`);
  }

  // ----- performance smoke check ----------------------------------------
  if (t6Ms > 300) {
    console.error(`WARN: Phase 6 took ${t6Ms} ms (target <100, soft cap 300)`);
  } else if (t6Ms > 100) {
    console.log(`OK   Phase 6 took ${t6Ms} ms (above target 100 ms but under soft cap 300 ms)`);
  } else {
    passed(`Phase 6 took ${t6Ms} ms (under 100 ms target)`);
  }

  console.log();
  console.log(`Phase 6 stats: ${redirectStats.written} redirects, ` +
              `${sitemapStats.entries} sitemap entries, ` +
              `${searchStats.entries} search-index entries`);

  // ----- cleanup --------------------------------------------------------
  await fs.rm(verifyDest, { recursive: true, force: true });

  if (process.exitCode) {
    console.log("\nFAILED");
  } else {
    console.log("\nAll required checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
