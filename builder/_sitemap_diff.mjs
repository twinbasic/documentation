// Compare two sitemap.xml files as URL sets, ignoring ordering and
// inter-element whitespace. jekyll-sitemap emits entries in filesystem
// iteration order, tbdocs sorts them alphabetically (PLAN-6.md §7.D3),
// so byte diff is noise -- this tool shows the actual semantic delta.
//
// Usage: node _sitemap_diff.mjs [<jekyll-path>] [<tbdocs-path>]
//   <jekyll-path>  : default "../docs/_site/sitemap.xml"
//   <tbdocs-path>  : default "../docs/_site-new/sitemap.xml"
//
// Output: per-side counts, the symmetric difference of URL sets, and
// "MATCH" (exit 0) / "DIFFER" (exit 1) summary. With both sides loaded
// the comparison is O(n) over the URL sets.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import { extractSitemapUrls } from "./sitemap.mjs";

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const jekyllPath = path.resolve(process.cwd(), args[0] || "../docs/_site/sitemap.xml");
const tbdocsPath = path.resolve(process.cwd(), args[1] || "../docs/_site-new/sitemap.xml");

async function readUrls(p) {
  try {
    const xml = await fs.readFile(p, "utf8");
    return extractSitemapUrls(xml);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`MISSING: ${p}`);
      process.exit(2);
    }
    throw err;
  }
}

const [jekyllUrls, tbdocsUrls] = await Promise.all([
  readUrls(jekyllPath),
  readUrls(tbdocsPath),
]);

const onlyJekyll = [...jekyllUrls].filter(u => !tbdocsUrls.has(u)).sort();
const onlyTbdocs = [...tbdocsUrls].filter(u => !jekyllUrls.has(u)).sort();

console.log(`jekyll  ${jekyllPath}`);
console.log(`        ${jekyllUrls.size} entries`);
console.log(`tbdocs  ${tbdocsPath}`);
console.log(`        ${tbdocsUrls.size} entries`);
console.log();

if (onlyJekyll.length === 0 && onlyTbdocs.length === 0) {
  console.log(`MATCH: both sitemaps cover the same ${jekyllUrls.size} URLs.`);
  process.exit(0);
}

if (onlyJekyll.length > 0) {
  console.log(`only in jekyll (${onlyJekyll.length}):`);
  for (const u of onlyJekyll.slice(0, 20)) console.log(`  - ${u}`);
  if (onlyJekyll.length > 20) console.log(`  ... +${onlyJekyll.length - 20} more`);
  console.log();
}
if (onlyTbdocs.length > 0) {
  console.log(`only in tbdocs (${onlyTbdocs.length}):`);
  for (const u of onlyTbdocs.slice(0, 20)) console.log(`  + ${u}`);
  if (onlyTbdocs.length > 20) console.log(`  ... +${onlyTbdocs.length - 20} more`);
}

console.log(`\nDIFFER: ${onlyJekyll.length} only-jekyll, ${onlyTbdocs.length} only-tbdocs.`);
process.exit(1);
