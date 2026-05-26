// Walk every page and report matches / divergences vs Jekyll's _site/
// output. Buckets pages by their first-divergence signature so similar
// patterns surface together.
//
// Usage: node _diff_all.mjs [all] [--phase3] [--no-strip] [--full]
//   "all"        : print every bucket (default: top 10 by frequency)
//   --phase3     : Phase 3 body-fragment mode (extract <main>, normalise
//                  whitespace, diff against page.renderedContent).
//                  Default is Phase 4 full-page mode.
//   --no-strip   : (Phase 4 mode only) don't strip the sidebar before
//                  diffing. With strip (default), nav-order divergence
//                  collapses into a single "sidebar-only" bucket per
//                  page. Without strip, every page diverges in the
//                  sidebar and dominates the buckets.
//   --full       : alias for --no-strip.
//
// Complements _triage.mjs: _triage classifies the first divergence into
// a semantic bucket (head-seo, nbsp-footnote-backref, etc.); _diff_all
// buckets by the literal divergence context string, surfacing
// near-identical structural patterns that the semantic classifier may
// not separate.

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
import { ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

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

const args = process.argv.slice(2);
const phase3Mode = args.includes("--phase3");
const noStrip = args.includes("--no-strip") || args.includes("--full");
const showAll = args.includes("all");

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");

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
const buildInfo = phase3Mode ? null : await captureBuildInfo();
const site = { config, navTree, ...seo, buildInfo, bookData, markdown };
await renderPhase(pages, site, staticFiles);
if (!phase3Mode) await templatePhase(pages, site);

let matched = 0;
let differed = 0;
let accepted = 0;
let missing = 0;
let skipped = 0;
const firstDivergences = new Map();

for (const p of pages) {
  if (phase3Mode) {
    if (p.ext !== ".md") continue;
  } else {
    if (p.frontmatter.layout === "book-combined") continue;
    if (p.html === undefined) { skipped++; continue; }
  }

  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try {
    jekyllHtml = await fs.readFile(jekyllPath, "utf8");
  } catch {
    missing++;
    continue;
  }

  let jekyllSubject, oursSubject;
  if (phase3Mode) {
    jekyllSubject = extractMainBody(jekyllHtml);
    oursSubject = normalise(p.renderedContent);
  } else {
    jekyllSubject = noStrip ? jekyllHtml : stripSidebar(jekyllHtml);
    oursSubject = noStrip ? p.html : stripSidebar(p.html);
  }

  if (jekyllSubject === oursSubject) { matched++; continue; }
  if (ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) { accepted++; continue; }
  differed++;

  const minLen = Math.min(jekyllSubject.length, oursSubject.length);
  let i = 0;
  while (i < minLen && jekyllSubject[i] === oursSubject[i]) i++;
  // Bucket by a short slice around the first divergence so similar
  // patterns get reported once.
  const window = oursSubject.slice(Math.max(0, i - 30), Math.min(oursSubject.length, i + 60));
  const list = firstDivergences.get(window) || [];
  list.push(p.srcRel);
  firstDivergences.set(window, list);
}

const mode = phase3Mode ? "Phase 3 body" : (noStrip ? "Phase 4 full" : "Phase 4 sidebar-stripped");
console.log(`Mode: ${mode}`);
console.log(`Matched: ${matched}, Accepted: ${accepted}, Differed: ${differed}, Jekyll-missing: ${missing}` +
  (skipped > 0 ? `, Skipped: ${skipped}` : "") +
  `, Total: ${pages.length}`);
console.log("");

const buckets = [...firstDivergences.entries()].sort((a, b) => b[1].length - a[1].length);
const top = showAll ? buckets : buckets.slice(0, 10);
for (const [window, sources] of top) {
  console.log(`--- ${sources.length} pages diverge near: ${JSON.stringify(window)}`);
  for (const s of sources.slice(0, 3)) console.log(`    ${s}`);
  if (sources.length > 3) console.log(`    ... +${sources.length - 3} more`);
}
