// One-off verification harness for PLAN-4.md §10 acceptance.
// Run: node builder/verify-phase4.mjs
//
// Drives the full Phase 1+2+3+4 pipeline and checks:
//   - Every page (except book.html) has page.html populated, starts
//     with <!DOCTYPE html>, ends with </html>\n.
//   - book.html's page.html is undefined.
//   - Activation CSS matches Jekyll output for the four representative
//     pages (after whitespace normalisation).
//   - injectAnchorHeadings produces the expected shape.
//   - Full-page byte diff vs Jekyll _site for the four representative
//     pages (modulo accepted divergences).
//   - Performance: under 500 ms (target 300 ms).

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
import { templatePhase, navActivationCss, injectAnchorHeadings } from "./template.mjs";
import { compressHtml } from "./compress.mjs";

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

function normalise(s) {
  return s.replace(/\s+/g, " ").trim();
}

async function main() {
  const srcRoot = path.resolve(process.cwd(), "../docs");
  const siteRoot = path.join(srcRoot, "_site");

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

  const byRel = new Map(pages.map(p => [p.srcRel, p]));

  console.log("Substep timings:");
  for (const l of t.laps()) console.log(`  ${l.label}: ${l.ms} ms`);
  console.log();

  // §10.1 -- page.html populated on every page except book.html.
  let missing = 0;
  let badStart = 0;
  let badEnd = 0;
  let bookFound = null;
  for (const p of pages) {
    if (p.srcRel === "book.html") { bookFound = p; continue; }
    if (typeof p.html !== "string") { missing++; continue; }
    if (!p.html.startsWith("<!DOCTYPE html>")) badStart++;
    if (!p.html.endsWith("</html>\n")) badEnd++;
  }
  assert(missing === 0, `every non-book page has page.html (missing on ${missing})`)
    && passed(`page.html set on ${pages.length - 1} pages (book.html excluded)`);
  assert(badStart === 0, `page.html starts with <!DOCTYPE html> (${badStart} bad)`)
    && passed(`page.html starts with <!DOCTYPE html> on all pages`);
  assert(badEnd === 0, `page.html ends with </html>\\n (${badEnd} bad)`)
    && passed(`page.html ends with </html>\\n on all pages`);
  assert(bookFound && bookFound.html === undefined,
    `book.html bypassed (page.html undefined)`)
    && passed(`book.html bypassed (page.html === undefined)`);

  // §10.4 -- injectAnchorHeadings fixture check.
  const anchorIn = `<h1 id="const">Const</h1>`;
  const anchorOut = injectAnchorHeadings(anchorIn);
  const anchorExpected = `<h1 id="const"> <a href="#const" class="anchor-heading" aria-labelledby="const"><svg viewBox="0 0 16 16" aria-hidden="true"><use xlink:href="#svg-link"></use></svg></a> Const </h1>`;
  assert(anchorOut === anchorExpected,
    `anchor heading fixture\n  got:      ${anchorOut}\n  expected: ${anchorExpected}`)
    && passed(`injectAnchorHeadings wraps <h1 id="const">Const</h1> correctly`);

  const noIdIn = `<h1>404</h1>`;
  const noIdOut = injectAnchorHeadings(noIdIn);
  const noIdExpected = `<h1> 404 </h1>`;
  assert(noIdOut === noIdExpected,
    `anchor heading no-id fixture\n  got:      ${noIdOut}\n  expected: ${noIdExpected}`)
    && passed(`injectAnchorHeadings rebuilds <h1>404</h1> without anchor`);

  // §10.5 -- compressHtml fixture checks.
  const compressTests = [
    ["empty", "", ""],
    ["no pre", "foo  bar", "foo bar"],
    ["pre preserves whitespace", "<pre>  x  </pre>", "<pre>  x  </pre>"],
    ["leading whitespace stripped", "  <pre>a</pre>  ", "<pre>a</pre>"],
    ["multi-line pre body", "<pre>a\nb\nc</pre>", "<pre>a\nb\nc</pre>"],
    ["pre with attributes", '<pre class="x">  z  </pre>', '<pre class="x">  z  </pre>'],
    ["trailing newline preserved", "x\n", "x\n"],
  ];
  let compressPass = 0, compressFail = 0;
  for (const [name, input, expected] of compressTests) {
    const got = compressHtml(input);
    if (got === expected) { compressPass++; passed(`compress: ${name}`); }
    else { compressFail++; assert(false, `compress: ${name}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`); }
  }

  // §10.6 -- navActivationCss byte-match against rendered Jekyll output
  // for the four representative pages.
  console.log("\nActivation CSS comparison (normalised whitespace):");
  const activationCases = [
    "index.md",
    "Reference/Operators.md",
    "Reference/Core/Const.md",
    "404.html",
  ];
  for (const src of activationCases) {
    const p = byRel.get(src);
    if (!p) { console.log(`  SKIP ${src} (not in corpus)`); continue; }
    const ourCss = navActivationCss(p);
    const ourNorm = normalise(ourCss);

    const jekyllPath = path.join(siteRoot, p.destPath);
    let jekyllHtml;
    try {
      jekyllHtml = await fs.readFile(jekyllPath, "utf8");
    } catch {
      console.log(`  SKIP ${src} (Jekyll output missing)`);
      continue;
    }
    const styleMatch = jekyllHtml.match(/<style id="jtd-nav-activation">([\s\S]*?)<\/style>/);
    if (!styleMatch) {
      console.log(`  SKIP ${src} (no jtd-nav-activation block)`);
      continue;
    }
    const jekyllNorm = normalise(styleMatch[1]);

    if (ourNorm === jekyllNorm) {
      passed(`activation CSS ${src} (navLevels=${JSON.stringify(p.navLevels)})`);
    } else {
      assert(false, `activation CSS ${src} differs:\n  ours:    ${ourNorm}\n  jekyll:  ${jekyllNorm}`);
    }
  }

  // §10 byte-comparison harness for the curated representative pages.
  // The sidebar nav HTML is byte-identical across every page (it's
  // cached at init in Phase 4 and built from Phase 2's navTree). Any
  // nav-order divergence between Jekyll (Ruby Dir.glob, NTFS-native
  // order) and ours (fast-glob, alphabetical) shows up on every page,
  // not as a Phase 4 issue. To isolate the chrome work this phase
  // owns, run TWO diffs: full-page (sees nav-order noise), and
  // sidebar-stripped (post-Phase-4 verification of head, header,
  // breadcrumbs, footer, scripts).
  console.log("\nFull-page byte comparison vs Jekyll _site:");
  const sample = [
    "index.md",
    "Reference/Core/Const.md",
    "Reference/VBA/Interaction/InputBox.md",
    "Reference/CEF/index.md",
    "Reference/Operators.md",
    "Features/index.md",
    "404.html",
  ];

  // Sidebar HTML extraction: from `<nav aria-label="Main"` to the
  // closing `</nav>` of the site-nav. Replaced with a sentinel so the
  // diff focuses on the parts Phase 4 owns.
  const SIDEBAR_RE = /<nav aria-label="Main" id="site-nav"[\s\S]*?<\/nav>/;
  const stripSidebar = (h) => h.replace(SIDEBAR_RE, "<SIDEBAR/>");

  let matched = 0, sidebarMatched = 0;
  for (const src of sample) {
    const p = byRel.get(src);
    if (!p) { console.log(`  SKIP ${src} (not in corpus)`); continue; }
    if (typeof p.html !== "string") { console.log(`  SKIP ${src} (page.html undefined)`); continue; }
    const jekyllPath = path.join(siteRoot, p.destPath);
    let jekyllHtml;
    try {
      jekyllHtml = await fs.readFile(jekyllPath, "utf8");
    } catch {
      console.log(`  SKIP ${src} (jekyll output missing)`);
      continue;
    }
    const jStripped = stripSidebar(jekyllHtml);
    const oStripped = stripSidebar(p.html);
    if (jekyllHtml === p.html) {
      matched++;
      sidebarMatched++;
      console.log(`  MATCH ${src} (full + sidebar-stripped)`);
    } else if (jStripped === oStripped) {
      sidebarMatched++;
      console.log(`  SIDEBAR-DIFFERS-ONLY ${src} (chrome+body byte-match; nav-order divergence noted)`);
    } else {
      const minLen = Math.min(jStripped.length, oStripped.length);
      let i = 0;
      while (i < minLen && jStripped[i] === oStripped[i]) i++;
      const lead = i > 60 ? "..." : "";
      const start = Math.max(0, i - 60);
      console.log(`  DIFFER ${src}: first non-sidebar diff at offset ${i} (delta ${oStripped.length - jStripped.length} bytes)`);
      console.log(`    j: ${JSON.stringify(lead + jStripped.slice(start, i + 80))}`);
      console.log(`    o: ${JSON.stringify(lead + oStripped.slice(start, i + 80))}`);
    }
  }
  console.log(`  Full-page match: ${matched}/${sample.length}`);
  console.log(`  Sidebar-stripped match: ${sidebarMatched}/${sample.length}`);

  // Full-corpus sweep for posterity. The sidebar-stripped match rate
  // captures Phase 4's chrome work; the remaining body diffs are
  // pre-existing Phase 3 renderer divergences (nbsp in empty table
  // cells via padEmptyCells, nbsp before footnote backref via the
  // footnote_anchor rule, and the accepted-divergences entries for
  // non-tb syntax highlighting under shiki vs Rouge).
  console.log("\nCorpus-wide sweep (sidebar-stripped only):");
  let total = 0, fullMatch = 0, sidebarMatchAll = 0;
  for (const p of pages) {
    if (p.frontmatter.layout === "book-combined") continue;
    if (typeof p.html !== "string") continue;
    let jekyllHtml;
    try { jekyllHtml = await fs.readFile(path.join(siteRoot, p.destPath), "utf8"); }
    catch { continue; }
    total++;
    if (jekyllHtml === p.html) { fullMatch++; sidebarMatchAll++; continue; }
    if (stripSidebar(jekyllHtml) === stripSidebar(p.html)) sidebarMatchAll++;
  }
  console.log(`  Full-page match (corpus): ${fullMatch}/${total}`);
  console.log(`  Sidebar-stripped match (corpus): ${sidebarMatchAll}/${total} (${(100 * sidebarMatchAll / total).toFixed(1)}%)`);

  // §10.10 -- performance smoke check.
  const tmplMs = t.laps().find(l => l.label === "template").ms;
  if (tmplMs > 500) {
    console.error(`\nWARN: template ${tmplMs} ms exceeds cap of 500 ms`);
  } else if (tmplMs > 300) {
    console.error(`\nWARN: template ${tmplMs} ms exceeds soft target of 300 ms`);
  } else {
    passed(`template phase ${tmplMs} ms (under 300 ms target)`);
  }

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
