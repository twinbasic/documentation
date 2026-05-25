// Single-page diff harness against Jekyll's _site/ output.
//
// Usage: node _diff.mjs [<page-srcRel>] [--phase3] [--no-strip] [--full]
//   <page-srcRel> : default "Reference/Core/Const.md"
//   --phase3      : Phase 3 body-fragment mode. Extract <main>...</main>,
//                   strip the chrome's anchor-headings + auto-TOC, normalise
//                   whitespace, then diff against page.renderedContent.
//   --no-strip    : (Phase 4 mode only) compare the full page including the
//                   sidebar. Useful for inspecting Phase 1/2 nav-order
//                   propagation directly. By default the sidebar is replaced
//                   with a `<SIDEBAR/>` marker on both sides so the diff
//                   focuses on chrome + body.
//   --full        : alias for --no-strip.
//
// Phase 4 (default): diff page.html (full document, post-templatePhase)
// against _site/<destPath>, optionally with the sidebar stripped to isolate
// chrome and body work from Phase 1/2 nav-order divergence.
//
// Prints "MATCH" on byte-equal output; otherwise the first divergence
// offset with ~200 chars of context from each side.

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";
import { renderPhase } from "./render.mjs";
import { templatePhase } from "./template.mjs";

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
const positional = args.filter((a) => !a.startsWith("--"));
const which = positional[0] || "Reference/Core/Const.md";

const srcRoot = path.resolve(process.cwd(), "../docs");
const siteRoot = path.join(srcRoot, "_site");

const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
const { navTree } = computeNav(pages, config);
const seo = precomputeSeo(pages, config);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
const buildInfo = phase3Mode ? null : await captureBuildInfo();
const site = { config, navTree, ...seo, buildInfo, bookData };
await renderPhase(pages, site, staticFiles);
if (!phase3Mode) await templatePhase(pages, site);

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

let jekyllSubject, oursSubject;
if (phase3Mode) {
  jekyllSubject = extractMainBody(jekyllHtml);
  oursSubject = normalise(p.renderedContent);
} else {
  if (p.html === undefined) {
    console.error(`page.html is undefined for ${which} (book.html bypass?)`);
    process.exit(1);
  }
  jekyllSubject = noStrip ? jekyllHtml : stripSidebar(jekyllHtml);
  oursSubject = noStrip ? p.html : stripSidebar(p.html);
}

if (jekyllSubject === oursSubject) {
  const mode = phase3Mode ? "Phase 3 body" : (noStrip ? "Phase 4 full page" : "Phase 4 sidebar-stripped");
  console.log(`MATCH (${mode})`);
  process.exit(0);
}

const minLen = Math.min(jekyllSubject.length, oursSubject.length);
let i = 0;
while (i < minLen && jekyllSubject[i] === oursSubject[i]) i++;
const ctxStart = Math.max(0, i - 60);
const ctxEnd = i + 200;
const mode = phase3Mode ? "Phase 3 body" : (noStrip ? "Phase 4 full page" : "Phase 4 sidebar-stripped");
console.log(`DIFFER (${mode}) at offset ${i} of ${oursSubject.length} ours / ${jekyllSubject.length} jekyll`);
console.log("JEKYLL:", JSON.stringify(jekyllSubject.slice(ctxStart, Math.min(ctxEnd, jekyllSubject.length))));
console.log("OURS  :", JSON.stringify(oursSubject.slice(ctxStart, Math.min(ctxEnd, oursSubject.length))));
