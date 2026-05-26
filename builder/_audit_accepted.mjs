// Diagnostic: walk every page in ACCEPTED_DIVERGENCE_PATHS and diff
// its full Phase 4 output (sidebar stripped) against Jekyll's
// `_site/<destPath>`, reporting EVERY divergence region rather than
// just the first one. See builder/WIP.md (Builder diff / triage /
// verify tools) for the workflow context and PLAN-9.md §5.12 / A1 for
// the rationale.
//
// The Phase 4 / 7 / 8 verify harnesses short-circuit accepted pages
// after the first divergence. That can mask a different class of
// divergence elsewhere on the same page (the kramdown-vs-markdown-it
// strong-asterisk parse on Reference/Attributes.md was hidden behind
// a JSON syntax-highlighting divergence for a long time). This tool
// surfaces those secondaries.
//
// Usage: cd builder && node _audit_accepted.mjs [--all]
//   --all     Print every region per page (default caps at 5 per page).
//   --help    This message.
//
// Output: per-page list of divergence regions, each with character
// offsets and ~80 chars of context on each side. Exit 0 always.

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
import { ACCEPTED_DIVERGENCES, ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

const HELP_TEXT = `Usage: node _audit_accepted.mjs [--all]

Diffs every accepted-divergence page's Phase 4 output (sidebar
stripped) against Jekyll's _site/<destPath> and prints EVERY divergence
region, not just the first one. Use to surface hidden secondary
divergences masked by an existing accepted entry.

Flags:
  --all     Print every region per page (default caps at 5).
  --help    This message.`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(HELP_TEXT);
  process.exit(0);
}
const showAll = process.argv.includes("--all");

const SIDEBAR_RE = /<nav aria-label="Main" id="site-nav"[\s\S]*?<\/nav>/;
function stripSidebar(h) { return h.replace(SIDEBAR_RE, "<SIDEBAR/>"); }

// Same algorithm as _diff.mjs's reportMultiDiff: walk both strings,
// find divergence start, then look for a 32-char common substring to
// resync. Bound the search at 4096 chars / 50 regions / 4096 dj-dO
// inner pairs so highly-divergent pages don't quadratically blow up.
function findDivergenceRegions(jekyll, ours) {
  if (jekyll === ours) return [];
  const RESYNC_RUN = 32;
  const MAX_REGIONS = 50;
  const SEARCH_WINDOW = 4096;
  const regions = [];
  let j = 0, o = 0;
  while (j < jekyll.length && o < ours.length) {
    if (jekyll[j] === ours[o]) { j++; o++; continue; }
    const jStart = j, oStart = o;
    let resyncJ = -1, resyncO = -1;
    for (let dj = 0; dj <= SEARCH_WINDOW && jStart + dj < jekyll.length; dj++) {
      for (let dO = 0; dO <= SEARCH_WINDOW && oStart + dO < ours.length; dO++) {
        if (jekyll.substr(jStart + dj, RESYNC_RUN) === ours.substr(oStart + dO, RESYNC_RUN)) {
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
        unresolved: true,
      });
      break;
    }
    regions.push({ jStart, jEnd: resyncJ, oStart, oEnd: resyncO });
    if (regions.length >= MAX_REGIONS) break;
    j = resyncJ;
    o = resyncO;
  }
  return regions;
}

async function main() {
  const srcRoot = path.resolve(process.cwd(), "../docs");
  const siteRoot = path.join(srcRoot, "_site");

  const { pages, staticFiles } = await discover(srcRoot);
  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  computeNav(pages, config);
  const highlighter = await initHighlighter();
  const linkTables = buildLinkTables(pages);
  const baseurl = String(config.baseurl || "");
  const staticFileSet = new Set(staticFiles.map((s) => s.srcRel));
  const markdown = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles: staticFileSet });
  const seo = precomputeSeo(pages, config, markdown);
  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  const buildInfo = await captureBuildInfo();
  const site = { config, navTree: pages, ...seo, buildInfo, bookData, markdown };
  await renderPhase(pages, site, staticFiles);
  await templatePhase(pages, site);

  // Map srcRel -> documented entries (one srcRel can have multiple
  // accepted divergences in different buckets).
  const entriesByPath = new Map();
  for (const d of ACCEPTED_DIVERGENCES) {
    if (!entriesByPath.has(d.path)) entriesByPath.set(d.path, []);
    entriesByPath.get(d.path).push(d);
  }

  console.log(`Auditing ${ACCEPTED_DIVERGENCE_PATHS.size} accepted-divergence page(s).\n`);

  let totalRegions = 0;
  let pagesWithMultiple = 0;

  for (const srcRel of [...ACCEPTED_DIVERGENCE_PATHS].sort()) {
    const p = pages.find((x) => x.srcRel === srcRel);
    if (!p) {
      console.log(`MISS  ${srcRel} (not found in discovered pages)\n`);
      continue;
    }
    if (p.html === undefined) {
      console.log(`SKIP  ${srcRel} (page.html undefined; book.html bypass?)\n`);
      continue;
    }
    const jekyllPath = path.join(siteRoot, p.destPath);
    let jekyllHtml;
    try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); }
    catch { console.log(`MISS  ${srcRel} (Jekyll output not found at ${jekyllPath})\n`); continue; }

    const jStripped = stripSidebar(jekyllHtml);
    const oStripped = stripSidebar(p.html);

    const regions = findDivergenceRegions(jStripped, oStripped);
    totalRegions += regions.length;
    if (regions.length > 1) pagesWithMultiple++;

    const entries = entriesByPath.get(srcRel) || [];
    const entrySummary = entries.length === 0
      ? "(no entry?)"
      : entries.map(e => `${e.category}/${e.lang ?? "?"}`).join(", ");

    if (regions.length === 0) {
      console.log(`MATCH ${srcRel} -- 0 regions  [${entrySummary}]`);
      continue;
    }

    console.log(`DIFFER ${srcRel} -- ${regions.length} region${regions.length === 1 ? "" : "s"}  [${entrySummary}]`);
    const cap = showAll ? regions.length : Math.min(5, regions.length);
    for (let k = 0; k < cap; k++) {
      const r = regions[k];
      const jLen = r.jEnd - r.jStart;
      const oLen = r.oEnd - r.oStart;
      console.log(`  [${k + 1}] jekyll[${r.jStart}..${r.jEnd}] (${jLen} chars) / ` +
                  `ours[${r.oStart}..${r.oEnd}] (${oLen} chars)` +
                  (r.unresolved ? " -- unresolved" : ""));
      const jSlice = jStripped.slice(r.jStart, Math.min(r.jEnd, r.jStart + 120));
      const oSlice = oStripped.slice(r.oStart, Math.min(r.oEnd, r.oStart + 120));
      console.log(`      J: ${JSON.stringify(jSlice)}`);
      console.log(`      O: ${JSON.stringify(oSlice)}`);
    }
    if (!showAll && regions.length > 5) {
      console.log(`      ... +${regions.length - 5} more region${regions.length - 5 === 1 ? "" : "s"} (--all for full list)`);
    }
    console.log();
  }

  console.log(`\nSummary:`);
  console.log(`  Pages audited:           ${ACCEPTED_DIVERGENCE_PATHS.size}`);
  console.log(`  Pages with > 1 region:   ${pagesWithMultiple}`);
  console.log(`  Total regions found:     ${totalRegions}`);
  console.log(`\nAction: each region in a "DIFFER ... -- N regions" page should be`);
  console.log(`        covered by an accepted-divergences.mjs entry. Regions that aren't`);
  console.log(`        are candidates for either an additional accepted entry or a fix.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
