// Body-fragment diff harness: extract the inner-most main-content body
// from Jekyll's _site/<page>.html and compare it to our renderedContent.
// Strips the Phase-4-equivalent chrome (heading anchors, children-TOC,
// inside-heading whitespace) before diffing so we measure what Phase 3
// actually produces.
//
// Usage: node _diff.mjs [<page-srcRel>]
//   <page-srcRel> defaults to "Reference/Core/Const.md".
//
// Prints "MATCH" on byte-equal bodies; otherwise the first divergence
// offset with ~200 chars of context from each side.

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { renderPhase } from "./render.mjs";

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");
const which = process.argv[2] || "Reference/Core/Const.md";

const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
computeNav(pages, config);
const seo = precomputeSeo(pages, config);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
await renderPhase(pages, { config, ...seo, bookData }, staticFiles);

const p = pages.find((x) => x.srcRel === which);
if (!p) { console.error("page not found:", which); process.exit(1); }

const jekyllPath = path.join(siteRoot, p.destPath);
let jekyllHtml;
try {
  jekyllHtml = await fs.readFile(jekyllPath, "utf8");
} catch {
  console.error("Jekyll output not found at:", jekyllPath);
  process.exit(1);
}

const jekyllBody = extractMainBody(jekyllHtml);
const ourBody = normalise(p.renderedContent);

if (jekyllBody === ourBody) {
  console.log("MATCH");
  process.exit(0);
}

const minLen = Math.min(jekyllBody.length, ourBody.length);
let i = 0;
while (i < minLen && jekyllBody[i] === ourBody[i]) i++;
const ctxStart = Math.max(0, i - 60);
const ctxEnd = Math.min(minLen, i + 200);
console.log(`DIFFER at offset ${i} of ${ourBody.length} ours / ${jekyllBody.length} jekyll`);
console.log("JEKYLL:", JSON.stringify(jekyllBody.slice(ctxStart, ctxEnd)));
console.log("OURS  :", JSON.stringify(ourBody.slice(ctxStart, ctxEnd)));

function extractMainBody(html) {
  const start = html.indexOf("<main>");
  if (start < 0) return "";
  const end = html.indexOf("</main>", start);
  if (end < 0) return "";
  let body = html.slice(start + "<main>".length, end);
  // Strip the heading anchors Phase 4 injects.
  body = body.replace(
    /<a href="#[^"]*" class="anchor-heading"[^>]*>\s*<svg[^>]*>\s*<use [^>]*><\/use>\s*<\/svg>\s*<\/a>/g,
    "",
  );
  body = body.replace(/(<h\d[^>]*>)\s+/g, "$1");
  body = body.replace(/\s+(<\/h\d>)/g, "$1");
  // Strip layout-added children-TOC; Phase 4 will add it from page.children.
  const tocMarker = body.search(/<hr\s*\/?>\s*<h2 class="text-delta">Table of contents<\/h2>/);
  if (tocMarker >= 0) body = body.slice(0, tocMarker);
  return normalise(body);
}

function normalise(s) {
  return s.replace(/\s+/g, " ").trim();
}
