// Spot-check the rendered output of a single page.
//
// Usage: node _spot.mjs [<src>] [<page-srcRel>] [--phase3]
//   <src>          : path to the docs/ directory (default "../docs")
//   <page-srcRel>  : page's source-relative path (default Const.md)
//   --phase3       : print page.renderedContent (Phase 3 body fragment)
//                    instead of page.html (Phase 4 full document; default)
//
// Use to eyeball output while iterating on a specific page. Phase 4
// mode is the default since it shows the complete rendered page;
// --phase3 falls back to the body fragment for renderer-only inspection.

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

const args = process.argv.slice(2);
const phase3Mode = args.includes("--phase3");
const positional = args.filter((a) => !a.startsWith("--"));
const srcRoot = path.resolve(process.cwd(), positional[0] || "../docs");
const want = positional[1] || "Reference/Core/Const.md";

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

const p = pages.find((p) => p.srcRel === want);
if (!p) { console.error("not found:", want); process.exit(1); }

if (phase3Mode) {
  console.log(p.renderedContent);
} else if (p.html === undefined) {
  console.error(`page.html is undefined for ${want} (book.html bypass?)`);
  process.exit(1);
} else {
  console.log(p.html);
}
