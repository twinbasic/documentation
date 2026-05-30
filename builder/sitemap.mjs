// Phase 6 AUXILIARIES -- sitemap.xml + robots.txt. Port of jekyll-sitemap
// (the template + the gem code that synthesises the file pair in
// Jekyll's GENERATE phase). Output mirrors jekyll-sitemap's minified
// XML: no inter-element indentation, one `\n` after each tag delimiter.
// Entries are sorted alphabetically by absolute URL so a re-run produces
// byte-identical output (§7.D3).
//
// See builder/PLAN-6.md §5.2 + §6.3 + §7.D10. Writes two files into
// destRoot/.

import path from "node:path";

import { absoluteUrl } from "./seo.mjs";
import { writeFileMkdirp } from "./write.mjs";

export async function writeSitemap(pages, site, destRoot, precomputedUrls) {
  const config = site.config;

  const sitemapUrls = [...(precomputedUrls ?? deriveSitemapUrls(pages, site))].sort();

  const xml = renderSitemapXml(sitemapUrls);

  // §7.D10: a source-tree robots.txt page would shadow the generated
  // one. No page on this site sets permalink: /robots.txt; the check is
  // defensive.
  const sourceHasRobots = pages.some(p => p.permalink === "/robots.txt");

  const writes = [writeFileMkdirp(path.join(destRoot, "sitemap.xml"), xml)];
  if (!sourceHasRobots) {
    writes.push(writeFileMkdirp(path.join(destRoot, "robots.txt"), renderRobotsTxt(config)));
  }

  await Promise.all(writes);

  return { entries: sitemapUrls.length, robots: !sourceHasRobots };
}

// Derive the set of sitemap URLs from the in-memory page set, applying
// jekyll-sitemap's two filters and producing strings in the same form
// the XML emits (post-absoluteUrl, post-xmlEscape, so that on-disk
// `<loc>` content can be compared character-for-character against this
// set). Exported separately from writeSitemap so triage tools that
// haven't run Phase 6 can still cross-check the URL set in-memory
// against Jekyll's `_site/sitemap.xml`.
export function deriveSitemapUrls(pages, site) {
  const config = site.config;
  return new Set(
    pages
      .filter(p => p.frontmatter?.sitemap !== false)
      .filter(p => p.permalink !== "/404.html")
      .map(p => sitemapUrlFor(p, config)),
  );
}

// Parse the raw `<loc>...</loc>` URL values out of an on-disk
// sitemap.xml as a Set. Comparable against deriveSitemapUrls's output
// for set-difference reporting. Exported so `_triage.mjs` and
// `_sitemap_diff.mjs` share the extraction.
const LOC_RE = /<loc>([^<]+)<\/loc>/g;
export function extractSitemapUrls(xml) {
  const out = new Set();
  for (const m of xml.matchAll(LOC_RE)) out.add(m[1]);
  return out;
}

// jekyll-sitemap template line: `{{ site.url }}{{ doc.url | replace:
// '/index.html', '/' | absolute_url | xml_escape }}`. The /index.html
// strip handles the case where a permalink ends in /index.html so the
// directory-form URL shows in the sitemap. On this site no permalink
// uses that shape; the strip is defensive.
function sitemapUrlFor(page, config) {
  let url = String(page.permalink);
  if (url.endsWith("/index.html")) {
    url = url.slice(0, -"index.html".length);
  }
  return xmlEscape(absoluteUrl(url, config));
}

function renderSitemapXml(urls) {
  const entries = urls.map(u => `<url>\n<loc>${u}</loc>\n</url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</urlset>\n`;
}

// Exported so `_triage.mjs` / `_diff.mjs` can derive the expected
// robots.txt content in-memory and compare against `_site/robots.txt`.
export function renderRobotsTxt(config) {
  return `Sitemap: ${absoluteUrl("/sitemap.xml", config)}\n`;
}

// Liquid's xml_escape (= CGI.escapeHTML). Defensive: no permalink on
// this site contains any of these characters, so the function is a
// no-op on every current input.
function xmlEscape(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
