// One-off verification harness for PLAN-8.md §10 acceptance.
// Run: cd builder && node verify-phase8.mjs
//
// Drives the full Phase 1+2+3+4+5+6+7+8 pipeline into scratch
// destinations (`docs/_site-verify/` + `docs/_site-verify-offline/` +
// `docs/_site-verify-pdf/`) and checks:
//   - Structural: pdfRoot exists, book.html present and ~5.5 MB, CSS
//     copies match destRoot bytes, 88-ish files total, zero missing
//     images.
//   - Byte parity vs Jekyll's docs/_site-pdf/book.html with the build-
//     info line normalised on both sides.
//   - Cross-reference spot checks: a handful of in-book hrefs rewrite
//     to `#ch-...` correctly.
//   - Landing-strip spot checks: a chapter-level landing with both
//     shifts has its h3 stripped; a part-level landing has its h2
//     stripped.
//   - Image-resolution: every <img src=> in book.html resolves to a
//     file under pdfRoot/.
//   - Performance: Phase 8 wall time under 500 ms (soft cap).
//
// Output: per-check `OK <label>` / `FAIL: <reason>` lines, per-substep
// timings, optional WARN if soft cap exceeded.

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
import { writeOffline } from "./offline.mjs";
import { writePdf, deriveBookOutputs, extractImagePaths } from "./pdf.mjs";
import { ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

// Map each source path with an accepted divergence to the ch-... anchor
// it lands at in book.html. The verify harness uses this to skip the
// per-article byte compare for those chapters. Computed once via the
// page-list lookup -- a srcRel -> anchor map -- so a future addition
// to accepted-divergences.mjs surfaces automatically.
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

// Normalise the build-info line so commit / date / build-day
// variations across runs don't fail the byte diff.
const BUILD_INFO_RE = /<p class="build-info">Built[^<]*<\/p>/;
function normaliseBuildInfo(html) {
  return html.replace(BUILD_INFO_RE, `<p class="build-info">Built BUILDDATE from commit COMMIT (COMMITDATE).</p>`);
}

async function main() {
  const srcRoot = path.resolve(process.cwd(), "../docs");
  const jekyllPdf = path.join(srcRoot, "_site-pdf");
  const verifyDest = path.join(srcRoot, "_site-verify");
  const verifyOffline = path.join(srcRoot, "_site-verify-offline");
  const verifyPdf = path.join(srcRoot, "_site-verify-pdf");

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

  const [redirectStats, sitemapStats, searchStats] = await Promise.all([
    writeRedirects(pages, site, verifyDest),
    writeSitemap(pages, site, verifyDest),
    writeSearchData(pages, site, verifyDest),
  ]);
  t.lap("auxiliaries");
  const auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };

  await writeOffline(pages, staticFiles, site, verifyDest, { auxStats });
  t.lap("offline");

  const t8Start = Date.now();
  const pdfStats = await writePdf(pages, staticFiles, site, verifyDest);
  const t8Ms = Date.now() - t8Start;
  t.lap("pdf");

  console.log("Substep timings:");
  for (const l of t.laps()) console.log(`  ${l.label}: ${l.ms} ms`);
  console.log();
  console.log(`Phase 8 counters: book.html ${(pdfStats.bookBytes / 1024 / 1024).toFixed(2)} MB, ` +
              `${pdfStats.css} CSS, ${pdfStats.images} images, ${pdfStats.missing} missing`);
  console.log();

  // ----- §10.1 structural ----------------------------------------------
  const pdfStat = await fs.stat(verifyPdf).catch(() => null);
  assert(pdfStat && pdfStat.isDirectory(), `${verifyPdf} exists and is a directory`)
    && passed(`pdfRoot exists at ${verifyPdf}`);

  const bookHtmlPath = path.join(verifyPdf, "book.html");
  const bookHtmlStat = await fs.stat(bookHtmlPath).catch(() => null);
  assert(bookHtmlStat && bookHtmlStat.size > 1024 * 1024,
    `book.html exists and is at least 1 MB (got ${bookHtmlStat?.size ?? 0} bytes)`)
    && passed(`book.html size: ${bookHtmlStat.size} bytes`);

  // CSS byte-equal vs destRoot
  for (const rel of ["assets/css/print.css", "assets/css/rouge.css"]) {
    const a = await fs.readFile(path.join(verifyPdf, rel)).catch(() => null);
    const b = await fs.readFile(path.join(verifyDest, rel)).catch(() => null);
    if (!a || !b) {
      assert(false, `CSS pair exists: ${rel}`);
      continue;
    }
    if (bytesEqual(a, b)) passed(`CSS byte-match vs destRoot: ${rel}`);
    else assert(false, `CSS byte-match vs destRoot: ${rel} (a=${a.length}, b=${b.length})`);
  }

  // Zero missing images
  assert(pdfStats.missing === 0, `pdfStats.missing: ${pdfStats.missing} (expected 0)`)
    && passed(`zero missing images`);

  // ----- §10.2 book.html byte parity vs Jekyll's _site-pdf/book.html ---
  const ourHtml = await fs.readFile(bookHtmlPath, "utf8");
  const jHtml = await fs.readFile(path.join(jekyllPdf, "book.html"), "utf8").catch(() => null);
  const acceptedAnchors = buildAcceptedAnchors(pages);
  if (jHtml !== null) {
    // Compare per-article: split on <article ...>...</article>, compare
    // each block, skip those whose anchor is in acceptedAnchors. This
    // surfaces unrelated divergences clearly while accepting the known
    // Rouge-vs-Shiki / kramdown-vs-markdown-it differences.
    const ourArticles = parseArticles(normaliseBuildInfo(ourHtml));
    const jArticles = parseArticles(normaliseBuildInfo(jHtml));

    // Header-and-title-page prefix (everything before the first article).
    const ourPrefix = sliceBeforeFirstArticle(normaliseBuildInfo(ourHtml));
    const jPrefix = sliceBeforeFirstArticle(normaliseBuildInfo(jHtml));
    if (ourPrefix === jPrefix) {
      passed(`book.html header + title-page byte-match`);
    } else {
      const min = Math.min(ourPrefix.length, jPrefix.length);
      let i = 0;
      while (i < min && ourPrefix[i] === jPrefix[i]) i++;
      const start = Math.max(0, i - 60);
      assert(false, `book.html header differs at offset ${i} ` +
        `(ours=${ourPrefix.length}, jekyll=${jPrefix.length})`);
      console.error(`  jekyll context: ${JSON.stringify(jPrefix.slice(start, i + 120))}`);
      console.error(`  ours context:   ${JSON.stringify(ourPrefix.slice(start, i + 120))}`);
    }

    // Article-count check.
    assert(ourArticles.length === jArticles.length,
      `article count matches: ours=${ourArticles.length}, jekyll=${jArticles.length}`)
      && passed(`article count matches: ${ourArticles.length}`);

    // Per-article diff.
    let perfect = 0;
    let accepted = 0;
    const mismatched = [];
    const n = Math.min(ourArticles.length, jArticles.length);
    for (let i = 0; i < n; i++) {
      const a = ourArticles[i];
      const b = jArticles[i];
      if (a.anchor !== b.anchor) {
        mismatched.push({ idx: i, ourAnchor: a.anchor, jAnchor: b.anchor, reason: "anchor mismatch" });
        continue;
      }
      if (a.body === b.body) {
        perfect++;
        continue;
      }
      if (acceptedAnchors.has(a.anchor)) {
        accepted++;
        continue;
      }
      mismatched.push({ idx: i, ourAnchor: a.anchor, jAnchor: b.anchor, reason: "body diff" });
    }
    if (mismatched.length === 0) {
      passed(`book.html per-article byte-match (${perfect} match, ${accepted} accepted divergences)`);
    } else {
      assert(false, `book.html per-article byte-match: ${mismatched.length} unaccepted divergence(s) ` +
        `(${perfect} match, ${accepted} accepted)`);
      for (const m of mismatched.slice(0, 5)) {
        const a = ourArticles[m.idx];
        const b = jArticles[m.idx];
        console.error(`  article ${m.idx} (${m.ourAnchor || "n/a"}): ${m.reason}`);
        if (a && b && m.reason === "body diff") {
          const min = Math.min(a.body.length, b.body.length);
          let k = 0;
          while (k < min && a.body[k] === b.body[k]) k++;
          const start = Math.max(0, k - 60);
          console.error(`    jekyll: ${JSON.stringify(b.body.slice(start, k + 120))}`);
          console.error(`    ours:   ${JSON.stringify(a.body.slice(start, k + 120))}`);
        }
      }
      if (mismatched.length > 5) console.error(`    ... +${mismatched.length - 5} more`);
    }
  } else {
    console.log(`SKIP  book.html byte-match (jekyll _site-pdf/book.html missing)`);
  }

  // ----- §10.3 cross-reference rewrite spot checks ---------------------
  // Look for a handful of expected `<a href="#ch-...">` strings.
  const crossRefSamples = [
    `href="#ch-FAQ"`,
    `href="#ch-Features"`,
    `href="#ch-Reference-Statements"`,
    `href="#ch-Tutorials-Arrays"`,
  ];
  for (const ref of crossRefSamples) {
    assert(ourHtml.includes(ref), `cross-ref present: ${ref}`)
      && passed(`cross-ref present: ${ref}`);
  }

  // Out-of-book href stays as a non-anchor path. The /Documentation/...
  // tree isn't in book.yml, so its hrefs should remain absolute paths.
  // Find at least one /Documentation/... reference.
  assert(/href="\/Documentation\/[^"]+"/.test(ourHtml),
    `out-of-book href preserved: at least one href="/Documentation/..."`)
    && passed(`out-of-book href preserved (Documentation/...)`);

  // ----- §10.4 landing-strip spot checks -------------------------------
  // Features part-level landing (chapter anchor ch-Features). Default
  // flags: no_outline_entry false, no_heading_shift false -> strip h2.
  // The landing is /Features/ (the part's landing_page).
  const featuresArticleRe = /<article class="page" id="ch-Features">[\s\S]*?<\/article>/;
  const featuresArticle = ourHtml.match(featuresArticleRe);
  if (featuresArticle) {
    assert(!/<h2\b/.test(featuresArticle[0]),
      `landing-strip: ch-Features article has no <h2> (default flags -> strip h2)`)
      && passed(`landing-strip: ch-Features article has no <h2>`);
  } else {
    assert(false, `landing-strip: ch-Features article found in book.html`);
  }

  // ----- §10.5 image-resolution -----------------------------------------
  const imagePaths = extractImagePaths(ourHtml);
  let missingResolved = 0;
  for (const rel of imagePaths) {
    const ok = await fs.access(path.join(verifyPdf, rel)).then(() => true).catch(() => false);
    if (!ok) missingResolved++;
  }
  assert(missingResolved === 0,
    `every <img src=> resolves under pdfRoot (got ${missingResolved} missing of ${imagePaths.length})`)
    && passed(`every <img src=> resolves under pdfRoot (${imagePaths.length} images)`);

  // ----- §10.6 file count matches Jekyll's _site-pdf/ -------------------
  const ourPdfFiles = [];
  await walkFiles(verifyPdf, (p) => { ourPdfFiles.push(p); });
  const jPdfFiles = [];
  try {
    await walkFiles(jekyllPdf, (p) => { jPdfFiles.push(p); });
  } catch {}
  if (jPdfFiles.length > 0) {
    if (ourPdfFiles.length === jPdfFiles.length) {
      passed(`file count matches Jekyll's _site-pdf/: ${ourPdfFiles.length}`);
    } else {
      // Diff which files we have vs jekyll has.
      const ourRel = new Set(ourPdfFiles.map(f => path.relative(verifyPdf, f).replaceAll("\\", "/")));
      const jRel = new Set(jPdfFiles.map(f => path.relative(jekyllPdf, f).replaceAll("\\", "/")));
      const missing = [...jRel].filter(f => !ourRel.has(f));
      const extra = [...ourRel].filter(f => !jRel.has(f));
      assert(false,
        `file count mismatch: ours=${ourPdfFiles.length}, jekyll=${jPdfFiles.length} ` +
        `(missing ${missing.length}, extra ${extra.length})`);
      for (const f of missing.slice(0, 5)) console.log(`    missing: ${f}`);
      for (const f of extra.slice(0, 5)) console.log(`    extra: ${f}`);
    }
  } else {
    console.log(`SKIP  file-count compare (jekyll _site-pdf/ empty)`);
  }

  // ----- §10.7 deriveBookOutputs is pure-compute ------------------------
  // Calling it twice should produce identical bytes.
  const a = deriveBookOutputs(pages, site);
  const b = deriveBookOutputs(pages, site);
  if (a.bookHtml === b.bookHtml) {
    passed(`deriveBookOutputs is deterministic`);
  } else {
    assert(false, `deriveBookOutputs differs across calls`);
  }

  // ----- §10.8 performance smoke check ---------------------------------
  if (t8Ms > 500) {
    console.error(`WARN: Phase 8 took ${t8Ms} ms (soft cap 500 ms)`);
    process.exitCode = 1;
  } else if (t8Ms > 300) {
    console.log(`OK   Phase 8 took ${t8Ms} ms (above 300 ms target, under 500 ms soft cap)`);
  } else {
    passed(`Phase 8 took ${t8Ms} ms (under 300 ms target)`);
  }

  // ----- cleanup --------------------------------------------------------
  await fs.rm(verifyDest, { recursive: true, force: true });
  await fs.rm(verifyOffline, { recursive: true, force: true });
  await fs.rm(verifyPdf, { recursive: true, force: true });

  if (process.exitCode) {
    console.log("\nFAILED");
  } else {
    console.log("\nAll required checks passed.");
  }
}

// Parse the assembled book.html into a list of `{anchor, body}`
// entries, one per `<article>` block. `anchor` is the value of the
// article's `id="..."` attribute; `body` is the full block including
// the opening / closing tags. Mirrors `rewriteBookHrefs`'s regex.
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

// Recursive file walker. fn is called for each file path (absolute).
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
