// tbdocs orchestrator. Phases 1+2+3+4+5+6+7+8: DISCOVER + COMPUTE +
// RENDER + TEMPLATE + WRITE ONLINE + AUXILIARIES + WRITE OFFLINE + WRITE PDF.
//
// Usage: node builder/index.mjs [--src <path>] [--dest <path>] [--dry-run]
//
// Default --src is "docs" relative to the current working directory.
// Default --dest is "<src>/_site-new" during the port; flip to "_site"
// once tbdocs replaces Jekyll. --dry-run skips all filesystem writes.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";
import { loadData } from "./data.mjs";
import { renderPhase, createMarkdownIt, initHighlighter, buildLinkTables } from "./render.mjs";
import { templatePhase } from "./template.mjs";
import { writePhase } from "./write.mjs";
import { writeRedirects } from "./redirects.mjs";
import { writeSitemap } from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";
import { writeOffline } from "./offline.mjs";
import { writePdf } from "./pdf.mjs";

function parseArgs(argv) {
  const args = { src: "docs", dest: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") {
      args.src = argv[++i];
    } else if (a.startsWith("--src=")) {
      args.src = a.slice("--src=".length);
    } else if (a === "--dest") {
      args.dest = argv[++i];
    } else if (a.startsWith("--dest=")) {
      args.dest = a.slice("--dest=".length);
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function makeTimer() {
  const laps = [];
  let last = Date.now();
  return {
    lap(label) {
      const now = Date.now();
      laps.push({ label, ms: now - last });
      last = now;
    },
    summary() {
      return laps.map(l => `${l.label}=${l.ms}ms`).join(" ");
    },
  };
}

async function main() {
  const { src, dest, dryRun } = parseArgs(process.argv.slice(2));
  const srcRoot = path.resolve(process.cwd(), src);
  // Default dest = sibling of src named _site-new during the port,
  // _site once tbdocs replaces Jekyll. Flip the default in one place
  // when the cutover happens.
  const destRoot = path.resolve(dest ?? path.join(srcRoot, "_site-new"));

  const t = makeTimer();
  const { pages, staticFiles } = await discover(srcRoot);
  t.lap("discover");

  // Issue build-info immediately so the git shell-outs overlap with the
  // CPU-bound nav work.
  const buildInfoPromise = captureBuildInfo();

  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  const { navTree } = computeNav(pages, config);
  t.lap("nav");

  // Build the shared markdown-it instance up front so Phase 2's SEO
  // pass and Phase 3's body renderer use the same configured renderer.
  // initHighlighter overlaps with the running git shell-outs above.
  const highlighter = await initHighlighter();
  const linkTables = buildLinkTables(pages);
  const baseurl = String(config.baseurl || "");
  const staticFileSet = new Set(staticFiles.map((s) => s.srcRel));
  const markdown = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles: staticFileSet });
  t.lap("markdown-init");

  const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config, markdown);
  t.lap("seo");

  const data = await loadData(srcRoot);
  const bookData = data.book ?? null;
  resolveBookChapters(bookData, pages);
  t.lap("book");

  const buildInfo = await buildInfoPromise;
  t.lap("buildInfo");

  const site = { config, navTree, seoSiteTitle, seoLogoUrl, buildInfo, bookData, data, markdown };

  await renderPhase(pages, site, staticFiles);
  t.lap("render");

  await templatePhase(pages, site);
  t.lap("template");

  const writeStats = await writePhase(pages, staticFiles, { destRoot, dryRun });
  t.lap("write");

  let auxStats = null;
  if (!dryRun) {
    const [redirectStats, sitemapStats, searchStats] = await Promise.all([
      writeRedirects(pages, site, destRoot),
      writeSitemap(pages, site, destRoot),
      writeSearchData(pages, site, destRoot),
    ]);
    auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };
  }
  t.lap("auxiliaries");

  let offlineStats = null;
  if (!dryRun) {
    offlineStats = await writeOffline(pages, staticFiles, site, destRoot, { auxStats });
  }
  t.lap("offline");

  let pdfStats = null;
  if (!dryRun) {
    pdfStats = await writePdf(pages, staticFiles, site, destRoot);
  }
  t.lap("pdf");

  console.log(`Phase 1+2+3+4+5+6+7+8 done: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
              `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files ` +
              `-> ${destRoot}`);
  if (auxStats) {
    console.log(`  aux:   ${auxStats.redirects.written} redirect stubs, ` +
                `${auxStats.sitemap.entries} sitemap entries, ` +
                `${auxStats.search.entries} search-index entries`);
  }
  if (offlineStats) {
    console.log(`  offline: ${offlineStats.html} HTML, ${offlineStats.css} CSS, ` +
                `${offlineStats.redirects} redirect stubs, ` +
                `${offlineStats.statics + offlineStats.assets} assets, ` +
                `${offlineStats.excluded} excluded ` +
                `(${offlineStats.unresolved} unresolved) -> ${destRoot}-offline`);
  }
  if (pdfStats) {
    const mb = (pdfStats.bookBytes / (1024 * 1024)).toFixed(1);
    const missingClause = pdfStats.missing > 0 ? ` (${pdfStats.missing} missing)` : "";
    console.log(`  pdf:     book.html (${mb} MB), ${pdfStats.css} CSS, ` +
                `${pdfStats.images} images${missingClause} -> ${destRoot}-pdf`);
  }
  console.log(t.summary());

  // Drift guard from PLAN-1.md §1.
  if (pages.length < 836) {
    console.error(`WARN: page count ${pages.length} below baseline 836`);
    process.exitCode = 1;
  }

  // Phase 8+ chains in here.
  return { pages, staticFiles, site, destRoot };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
