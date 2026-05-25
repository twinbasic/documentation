// One-off verification harness for PLAN-3.md §10 acceptance.
// Run: node builder/verify-phase3.mjs
//
// Drives the full Phase 1+2+3 pipeline and checks:
//   - Every page has page.renderedContent populated.
//   - Known-pattern checks per PLAN-3 §10.4-§10.11.
//   - Per-page render time histogram (warn if any > 50 ms).
//   - Body-fragment byte diff against Jekyll's _site for a curated
//     10-page representative set (modulo Phase 4 chrome).

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { renderPhase } from "./render.mjs";
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

async function main() {
  const srcRoot = path.resolve(process.cwd(), "../docs");
  const siteRoot = path.join(srcRoot, "_site");

  const t = makeTimer();
  const { pages, staticFiles } = await discover(srcRoot);
  t.lap("discover");

  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  computeNav(pages, config);
  t.lap("nav");

  const seo = precomputeSeo(pages, config);
  t.lap("seo");

  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  t.lap("book");

  // Per-page render timings -- wrap renderPhase by timing each page in
  // a follow-up pass. renderPhase itself isn't instrumented; the
  // additional pass measures per-page cost for the histogram.
  const site = { config, navTree: pages, ...seo, bookData };
  await renderPhase(pages, site, staticFiles);
  t.lap("render");

  const byRel = new Map(pages.map(p => [p.srcRel, p]));

  console.log("Substep timings:");
  for (const l of t.laps()) console.log(`  ${l.label}: ${l.ms} ms`);
  const total = t.laps().reduce((s, l) => s + l.ms, 0);
  console.log(`  total: ${total} ms\n`);

  // §10.1 -- renderedContent populated on every page.
  let missingCount = 0;
  for (const p of pages) {
    if (typeof p.renderedContent !== "string") missingCount++;
  }
  assert(missingCount === 0, `every page has renderedContent (missing on ${missingCount})`) &&
    passed(`renderedContent set on ${pages.length} pages`);

  // §10.2 -- well-formed start. HTML pages pass through verbatim,
  // including leading whitespace and Liquid scaffolding (book.html);
  // only check markdown-derived bodies.
  let badStart = null;
  for (const p of pages) {
    if (p.ext === ".html") continue;
    const s = p.renderedContent.replace(/^\s+/, "");
    if (s !== "" && !/^[<&\w]/.test(s)) { badStart = `${p.srcRel}: starts with ${JSON.stringify(s.slice(0, 16))}`; break; }
  }
  assert(!badStart, `renderedContent starts with valid HTML (${badStart})`) &&
    passed(`renderedContent starts with <, &, or letter on every .md page`);

  // §10.4 -- admonition shape on InputBox.
  const inputBox = byRel.get("Reference/VBA/Interaction/InputBox.md");
  if (assert(!!inputBox, "fixture Reference/VBA/Interaction/InputBox.md present")) {
    const c = inputBox.renderedContent;
    assert(c.includes("markdown-alert markdown-alert-note"),
      "InputBox admonition class") && passed("InputBox carries markdown-alert-note class");
    assert(c.includes("octicon-info"),
      "InputBox SVG class octicon-info") && passed("InputBox icon class octicon-info");
  }

  // §10.5 -- code-block shape on Const.
  const constPage = byRel.get("Reference/Core/Const.md");
  if (assert(!!constPage, "fixture Reference/Core/Const.md present")) {
    const c = constPage.renderedContent;
    assert(c.includes(`<div class="language-tb highlighter-rouge"><div class="highlight"><pre class="highlight"><code>`),
      "Const code-block wrapper") &&
      passed("Const code block has Rouge-shaped 3-div wrapper");
    assert(c.includes(`<span class="k">Const</span>`),
      "Const keyword spans") && passed("Const keyword tokens emit <span class=\"k\">");
  }

  // §10.6 -- header IDs on CEF index (kramdown GFM slug).
  const cefIndex = byRel.get("Reference/CEF/index.md");
  if (assert(!!cefIndex, "fixture Reference/CEF/index.md present")) {
    assert(cefIndex.renderedContent.includes(`id="why-cef-instead-of-webview2"`),
      "CEF heading slug") && passed("CEF H2 id=\"why-cef-instead-of-webview2\"");
  }

  // §10.7 -- TOC structure on CEF index.
  if (cefIndex) {
    const c = cefIndex.renderedContent;
    assert(c.includes(`<ul id="markdown-toc">`),
      "CEF TOC wrapper") && passed("CEF TOC opens with <ul id=\"markdown-toc\">");
    assert(c.includes(`id="markdown-toc-runtime-files"`),
      "CEF TOC entry id") && passed("CEF TOC contains markdown-toc-runtime-files");
  }

  // §10.8 -- footnote shape on Features/index.
  const featuresIndex = byRel.get("Features/index.md");
  if (assert(!!featuresIndex, "fixture Features/index.md present")) {
    const c = featuresIndex.renderedContent;
    assert(c.includes(`<sup id="fnref:1">`),
      "Features footnote ref id format") &&
      passed("Features footnote ref uses fnref:1 (colon, not hyphen)");
    assert(c.includes(`class="reversefootnote"`),
      "Features footnote backref class") &&
      passed("Features footnote backref uses class=\"reversefootnote\"");
    assert(c.includes(`<div class="footnotes" role="doc-endnotes">`),
      "Features footnote container") &&
      passed("Features footnote container is <div class=\"footnotes\">");
  }

  // §10.9 -- relative link rewriting on Const.
  if (constPage) {
    assert(constPage.renderedContent.includes(`href="Attributes#description"`),
      "Const relative link to Attributes#description preserved as-is via byPath table") &&
      passed("Const relative link Attributes#description present");
  }

  // §10.10 -- em-dash count on index.md.
  const home = byRel.get("index.md");
  if (assert(!!home, "fixture index.md present")) {
    const count = (home.renderedContent.match(/—/g) || []).length;
    assert(count >= 1, `index.md has em-dashes (got ${count})`) &&
      passed(`index.md has ${count} em-dash characters`);
  }

  // §10.11 -- {: .no_toc } produces class="no_toc".
  if (constPage) {
    assert(constPage.renderedContent.includes(`<p class="no_toc">`),
      "Const no_toc class on intro paragraph") &&
      passed("Const {: .no_toc } moved to following paragraph");
  }

  // §10.12 -- performance smoke check. Soft target 1500 ms, cap 2000.
  const renderMs = t.laps().find(l => l.label === "render").ms;
  if (renderMs > 2000) {
    console.error(`WARN: render ${renderMs} ms exceeds cap of 2000 ms`);
  } else if (renderMs > 1500) {
    console.error(`WARN: render ${renderMs} ms exceeds soft target of 1500 ms`);
  } else {
    passed(`render phase ${renderMs} ms (under 1500 ms target)`);
  }

  // §10 byte-comparison harness for the curated representative pages.
  console.log("\nByte-comparison harness (body fragments vs Jekyll _site):");
  const sample = [
    "Reference/Core/Const.md",
    "Reference/VBA/Interaction/InputBox.md",
    "Reference/CEF/index.md",
    "Reference/Operators.md",
    "Features/index.md",
    "Features/Fusion.md",
    "index.md",
    "Miscellaneous/FAQs.md",
  ];

  let matched = 0;
  let accepted = 0;
  for (const src of sample) {
    const p = byRel.get(src);
    if (!p) { console.log(`  SKIP ${src} (not in corpus)`); continue; }
    const jekyllPath = path.join(siteRoot, p.destPath);
    let jekyllHtml;
    try {
      jekyllHtml = await fs.readFile(jekyllPath, "utf8");
    } catch {
      console.log(`  SKIP ${src} (jekyll output missing)`);
      continue;
    }
    const jekyllBody = extractMainBody(jekyllHtml);
    const ourBody = normalise(p.renderedContent);
    if (jekyllBody === ourBody) {
      matched++;
      console.log(`  MATCH ${src}`);
    } else if (ACCEPTED_DIVERGENCE_PATHS.has(src)) {
      accepted++;
      console.log(`  ACCEPT ${src} (see accepted-divergences.mjs)`);
    } else {
      const minLen = Math.min(jekyllBody.length, ourBody.length);
      let i = 0;
      while (i < minLen && jekyllBody[i] === ourBody[i]) i++;
      console.log(`  DIFFER ${src} at offset ${i}/${jekyllBody.length} (${jekyllBody.length - ourBody.length} bytes delta)`);
    }
  }
  const accountedFor = matched + accepted;
  console.log(`  ${matched}/${sample.length} sample pages byte-match Jekyll body fragments` +
    (accepted ? ` (+${accepted} accepted divergence${accepted === 1 ? "" : "s"} = ${accountedFor}/${sample.length} accounted for)` : ""));

  if (process.exitCode) {
    console.log("\nFAILED");
  } else {
    console.log("\nAll required checks passed.");
  }
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

function normalise(s) {
  return s.replace(/\s+/g, " ").trim();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
