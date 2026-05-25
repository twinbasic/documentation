// Walk every page and report body-fragment matches / divergences vs
// Jekyll's _site/ output. Buckets pages by their first-divergence
// signature so similar patterns surface together.
//
// Usage: node _diff_all.mjs [all]
//   "all" prints every bucket; default prints the top 10 by frequency.

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { renderPhase } from "./render.mjs";
import { ACCEPTED_DIVERGENCE_PATHS } from "./accepted-divergences.mjs";

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");

const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
computeNav(pages, config);
const seo = precomputeSeo(pages, config);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
await renderPhase(pages, { config, ...seo, bookData }, staticFiles);

let matched = 0;
let differed = 0;
let accepted = 0;
let missing = 0;
const firstDivergences = new Map();

for (const p of pages) {
  if (p.ext !== ".md") continue;
  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try {
    jekyllHtml = await fs.readFile(jekyllPath, "utf8");
  } catch {
    missing++;
    continue;
  }
  const jekyll = extractMainBody(jekyllHtml);
  const ours = normalise(p.renderedContent);
  if (jekyll === ours) {
    matched++;
    continue;
  }
  if (ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) {
    accepted++;
    continue;
  }
  differed++;
  const minLen = Math.min(jekyll.length, ours.length);
  let i = 0;
  while (i < minLen && jekyll[i] === ours[i]) i++;
  // Bucket by a short slice around the first divergence so similar
  // patterns get reported once.
  const window = ours.slice(Math.max(0, i - 30), Math.min(ours.length, i + 60));
  const list = firstDivergences.get(window) || [];
  list.push(p.srcRel);
  firstDivergences.set(window, list);
}

console.log(`Matched: ${matched}, Accepted: ${accepted}, Differed: ${differed}, Jekyll-missing: ${missing}, Total: ${pages.length}`);
console.log("");

const buckets = [...firstDivergences.entries()].sort((a, b) => b[1].length - a[1].length);
const top = process.argv[2] === "all" ? buckets : buckets.slice(0, 10);
for (const [window, sources] of top) {
  console.log(`--- ${sources.length} pages diverge near: ${JSON.stringify(window)}`);
  for (const s of sources.slice(0, 3)) console.log(`    ${s}`);
  if (sources.length > 3) console.log(`    ... +${sources.length - 3} more`);
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
