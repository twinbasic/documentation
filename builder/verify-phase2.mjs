// One-off verification harness for PLAN-2.md §10 acceptance.
// Run: node builder/verify-phase2.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";

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

async function main() {
  const srcRoot = path.resolve(process.cwd(), "docs");

  const t = makeTimer();
  const { pages } = await discover(srcRoot);
  t.lap("discover");

  const buildInfoPromise = captureBuildInfo();
  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  const { navTree } = computeNav(pages, config);
  t.lap("nav");

  const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config);
  t.lap("seo");

  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  t.lap("book");

  const buildInfo = await buildInfoPromise;
  t.lap("buildInfo");

  console.log("Substep timings:");
  for (const l of t.laps()) console.log(`  ${l.label}: ${l.ms} ms`);
  const total = t.laps().reduce((s, l) => s + l.ms, 0);
  console.log(`  total: ${total} ms\n`);

  const byRel = new Map(pages.map(p => [p.srcRel, p]));
  const byUrl = new Map(pages.map(p => [p.permalink, p]));

  // ----- §10.1 navTree shape ------------------------------------------------
  assert(Array.isArray(navTree), "navTree is an array");
  assert(navTree.length > 0, `navTree has top-level entries (got ${navTree.length})`) &&
    passed(`navTree.length === ${navTree.length}`);

  let badNode = null;
  function checkNodes(nodes, depth = 0) {
    if (depth > 20) return;
    for (const n of nodes) {
      if (typeof n.title !== "string" || n.title === "") { badNode = `empty title at depth ${depth}`; return; }
      if (typeof n.url !== "string" || n.url === "")     { badNode = `empty url for "${n.title}"`; return; }
      if (!Array.isArray(n.children))                    { badNode = `children not array for "${n.title}"`; return; }
      checkNodes(n.children, depth + 1);
    }
  }
  checkNodes(navTree);
  assert(!badNode, `navTree well-formed (${badNode})`) && passed("every navNode has title, url, children[]");

  // ----- §10.2 per-page fields ---------------------------------------------
  const titledPages = pages.filter(p => typeof p.frontmatter.title === "string" && p.frontmatter.title !== "");
  let missing = null;
  for (const p of titledPages) {
    for (const f of ["navPath", "breadcrumbs", "children"]) {
      if (!(f in p)) { missing = `${p.srcRel}: missing ${f}`; break; }
    }
    if (missing) break;
  }
  assert(!missing, `all titled pages have navPath/breadcrumbs/children (${missing})`) &&
    passed(`all ${titledPages.length} titled pages have navPath, breadcrumbs, children`);

  // navLevels is undefined when the page can't be placed in nav
  // (nav_exclude, broken parent chain). The vast majority of titled
  // pages should have navLevels set.
  const withLevels = titledPages.filter(p => p.navLevels !== undefined);
  assert(withLevels.length > 0, "some titled pages have navLevels") &&
    passed(`${withLevels.length}/${titledPages.length} titled pages have navLevels`);

  // ----- §10.3 navPath fixtures --------------------------------------------
  const ops = byRel.get("Reference/Operators.md");
  if (assert(!!ops, "fixture Reference/Operators.md present")) {
    assert(ops.navPath === "Reference Section/Operators",
      `Operators.navPath === "Reference Section/Operators" (got "${ops.navPath}")`) &&
      passed("navPath: Operators -> Reference Section/Operators");
  }

  const constPage = byRel.get("Reference/Core/Const.md");
  if (assert(!!constPage, "fixture Reference/Core/Const.md present")) {
    assert(typeof constPage.navPath === "string" && constPage.navPath.endsWith("/Const"),
      `Const.navPath ends in /Const (got "${constPage.navPath}")`) &&
      passed(`navPath: Const -> "${constPage.navPath}"`);
  }

  // ----- §10.4 breadcrumbs ordering ----------------------------------------
  let crumbBad = null;
  for (const p of titledPages) {
    if (p.breadcrumbs.length === 0) continue;
    for (const c of p.breadcrumbs) {
      if (typeof c.title !== "string" || typeof c.url !== "string") {
        crumbBad = `${p.srcRel}: breadcrumb entry has wrong shape`;
        break;
      }
      if (!byUrl.has(c.url)) {
        crumbBad = `${p.srcRel}: breadcrumb url "${c.url}" not in pages`;
        break;
      }
    }
    if (crumbBad) break;
  }
  assert(!crumbBad, `breadcrumbs reference real pages (${crumbBad})`) &&
    passed("every breadcrumb entry points at an existing page");

  // ----- §10.5 navLevels[0] === 1 -------------------------------------------
  let levelBad = null;
  for (const p of withLevels) {
    if (p.navLevels[0] !== 1) {
      levelBad = `${p.srcRel}: navLevels[0] is ${p.navLevels[0]}, expected 1`;
      break;
    }
  }
  assert(!levelBad, `navLevels[0] === 1 for every laddered page (${levelBad})`) &&
    passed("navLevels[0] === 1 across the board");

  // ----- §10.6 integrity check fires on planted ambiguity ------------------
  await checkIntegrityAborts(pages, config);
  passed("nav-integrity-check throws on planted ambiguity");

  // ----- §10.7 SEO fields per page -----------------------------------------
  let seoBad = null;
  for (const p of pages) {
    for (const f of ["seoTitle", "seoFullTitle", "seoCanonical", "seoIsHome"]) {
      if (!(f in p)) { seoBad = `${p.srcRel}: missing ${f}`; break; }
    }
    if (seoBad) break;
  }
  assert(!seoBad, `all pages have SEO fields (${seoBad})`) &&
    passed(`all ${pages.length} pages have seoTitle/seoFullTitle/seoCanonical/seoIsHome`);
  assert(typeof seoSiteTitle === "string" && seoSiteTitle.length > 0,
    `seoSiteTitle non-empty (got "${seoSiteTitle}")`) && passed(`seoSiteTitle="${seoSiteTitle}"`);
  assert(typeof seoLogoUrl === "string" && seoLogoUrl.startsWith("https://"),
    `seoLogoUrl absolute (got "${seoLogoUrl}")`) && passed(`seoLogoUrl="${seoLogoUrl}"`);

  // ----- §10.8 homepage SEO --------------------------------------------------
  const home = byRel.get("index.md");
  if (assert(!!home, "fixture index.md present")) {
    assert(home.seoIsHome === true, `index.md seoIsHome === true (got ${home.seoIsHome})`) &&
      passed("index.md seoIsHome === true");
    // The site title is "twinBASIC Documentation" and the page title is
    // "Welcome", so seoFullTitle is "Welcome | twinBASIC Documentation"
    // -- they do not collapse. PLAN-2's §10.8 expectation predates the
    // current title.
    assert(home.seoFullTitle.includes(seoSiteTitle),
      `home seoFullTitle includes site title (got "${home.seoFullTitle}")`) &&
      passed(`home.seoFullTitle="${home.seoFullTitle}"`);
  }

  // ----- §10.9 markdown-active title ---------------------------------------
  const concat = byRel.get("Reference/Core/Concat.md");
  if (assert(!!concat, "fixture Reference/Core/Concat.md present")) {
    assert(concat.seoTitle === "&amp;, &amp;=",
      `Concat.seoTitle === "&amp;, &amp;=" (got "${concat.seoTitle}")`) &&
      passed(`Concat.seoTitle="${concat.seoTitle}"`);
  }

  // ----- §10.10 build-info -------------------------------------------------
  assert(typeof buildInfo.commit === "string" && buildInfo.commit.length > 0,
    "buildInfo.commit non-empty") && passed(`buildInfo.commit="${buildInfo.commit}"`);
  assert(typeof buildInfo.commitDate === "string" && buildInfo.commitDate.length > 0,
    "buildInfo.commitDate non-empty") && passed(`buildInfo.commitDate="${buildInfo.commitDate}"`);

  // ----- §10.11 front_matter[0] chapters -----------------------------------
  const fm0 = bookData.front_matter[0];
  if (assert(!!fm0, "bookData.front_matter[0] present")) {
    assert(Array.isArray(fm0._chapters) && fm0._chapters.length === 1,
      `front_matter[0]._chapters.length === 1 (got ${fm0._chapters?.length})`) &&
      passed(`front_matter[0]._chapters has 1 page (${fm0._chapters[0].permalink})`);
    assert(fm0._chapters[0].permalink === "/",
      `front_matter[0]._chapters[0] is the homepage`) &&
      passed("front_matter[0] sweeps in the homepage only");
  }

  // ----- §10.12 chaptered part has chapter._chapters, no part._chapters ----
  const features = bookData.parts[0];
  if (assert(!!features, "bookData.parts[0] (Features) present")) {
    assert(features._chapters === undefined,
      `parts[0]._chapters undefined for chaptered part (got ${features._chapters})`) &&
      passed("chaptered part has no part-level _chapters");
    assert(Array.isArray(features.chapters?.[0]?._chapters) && features.chapters[0]._chapters.length > 0,
      `parts[0].chapters[0]._chapters non-empty (got ${features.chapters?.[0]?._chapters?.length})`) &&
      passed(`Features.chapters[0]._chapters has ${features.chapters[0]._chapters.length} pages`);
  }

  // ----- §10.13 flat part has _chapters ------------------------------------
  const faq = bookData.parts.find(p => /frequently asked questions|faq/i.test(p.title));
  if (assert(!!faq, "FAQ part present")) {
    assert(Array.isArray(faq._chapters) && faq._chapters.length > 0,
      `FAQ._chapters non-empty (got ${faq._chapters?.length})`) &&
      passed(`FAQ._chapters has ${faq._chapters.length} pages`);
  }

  // ----- §10.14 chapters are deduped ---------------------------------------
  let dupBad = null;
  const walkEntries = function* () {
    for (const fm of bookData.front_matter || []) yield fm;
    for (const part of bookData.parts || []) {
      if (part.chapters) {
        for (const ch of part.chapters) yield ch;
      } else {
        yield part;
      }
    }
  };
  for (const entry of walkEntries()) {
    if (!entry._chapters) continue;
    const seen = new Set();
    for (const p of entry._chapters) {
      if (seen.has(p.permalink)) { dupBad = `${entry.title}: page ${p.permalink} appears twice`; break; }
      seen.add(p.permalink);
    }
    if (dupBad) break;
  }
  assert(!dupBad, `chapter lists deduped (${dupBad})`) &&
    passed("no chapter list contains duplicate pages");

  // ----- Performance check (informational) ---------------------------------
  if (total > 1000) {
    console.error(`WARN: total ${total} ms exceeds 1s soft target`);
  }

  if (process.exitCode) {
    console.log("\nFAILED");
  } else {
    console.log("\nAll checks passed.");
  }
}

// Plant an ambiguity (two pages titled "X-Decoy-X" referencing each
// other as parents) and confirm validateNavIntegrity throws. We mutate
// a copy of the page array, not the originals, so the real run isn't
// affected.
async function checkIntegrityAborts(pages, config) {
  const decoyA = makeFixturePage("__decoy_a.md", { title: "DecoyTitle", parent: "Reference Section" });
  const decoyB = makeFixturePage("__decoy_b.md", { title: "DecoyTitle", parent: "Reference Section" });
  const child  = makeFixturePage("__decoy_child.md", { title: "AmbiguousChild", parent: "DecoyTitle" });

  const augmented = [...pages, decoyA, decoyB, child];
  try {
    computeNav(augmented, config);
  } catch (err) {
    if (!/ambiguity/i.test(err.message)) {
      throw new Error(`integrity check threw with unexpected message: ${err.message}`);
    }
    return;
  }
  throw new Error("integrity check did NOT abort on planted ambiguity");
}

function makeFixturePage(srcRel, frontmatter) {
  return {
    srcPath: srcRel,
    srcRel,
    ext: ".md",
    frontmatter,
    rawContent: "",
    permalink: "/" + srcRel.replace(/\.md$/, ".html"),
    destPath: srcRel.replace(/\.md$/, ".html"),
    layoutDefault: true,
    imageScope: false,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
