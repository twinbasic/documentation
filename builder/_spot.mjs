// Spot-check the rendered body of a single page.
// Usage: node _spot.mjs [<src>] [<page-srcRel>]
//   <src>          : path to the docs/ directory (default "../docs")
//   <page-srcRel>  : page's source-relative path (default Const.md)
//
// Prints page.renderedContent verbatim. Use to eyeball Phase 3 output
// while iterating on a specific page.

import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { renderPhase } from "./render.mjs";

const srcRoot = path.resolve(process.cwd(), process.argv[2] || "../docs");
const { pages, staticFiles } = await discover(srcRoot);
const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
computeNav(pages, config);
const seo = precomputeSeo(pages, config);
const bookData = await loadBookData(srcRoot);
resolveBookChapters(bookData, pages);
await renderPhase(pages, { config, ...seo, bookData }, staticFiles);

const want = process.argv[3] || "Reference/Core/Const.md";
const p = pages.find(p => p.srcRel === want);
if (!p) { console.error("not found:", want); process.exit(1); }
console.log(p.renderedContent);
