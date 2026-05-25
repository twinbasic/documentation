// Triage harness: walk every page, find the first divergence from
// Jekyll's body, then classify it into a coarse bucket so we can rank
// remaining work by pattern frequency * visual severity.
//
// Severity scale:
//   high   = visible to the reader (wrong colors, missing content, wrong
//            text, broken links)
//   medium = visible if you look (extra whitespace, missing class on a
//            visible element)
//   low    = invisible to readers but breaks byte-equality (class on
//            an element that has no associated CSS, attribute order
//            differences, layout-only quirks)

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

// Classification rules. Each entry: { id, severity, label, test(jekyllCtx, oursCtx) }.
// Run in order; first hit wins. Match against ~260 chars of context
// around the first divergence point.
const RULES = [
  {
    id: "code-highlight-other-lang",
    severity: "medium",
    label: "Per-language code highlighting (Shiki vs Rouge token-boundary differences in HTML/JSON/JS/etc.)",
    test: (j, o) => /class="language-(html|json|js|javascript|yaml|xml|sql|sh|cpp|c|ruby|liquid|text)/.test(j) &&
                    /class="language-(html|json|js|javascript|yaml|xml|sql|sh|cpp|c|ruby|liquid|text)/.test(o),
  },
  {
    id: "no_toc-on-heading",
    severity: "low",
    label: "`{: .no_toc }` lands on the heading element in kramdown vs on the following paragraph in ours",
    test: (j, o) => /<h\d class="no_toc"/.test(j) && /<p class="no_toc"/.test(o),
  },
  {
    id: "list-paragraph-wrap",
    severity: "low",
    label: "Loose/tight list paragraph wrapping (kramdown per-item vs markdown-it per-list)",
    test: (j, o) => {
      const jWrap = (j.match(/<li>\s*<p>/g) || []).length;
      const oWrap = (o.match(/<li>\s*<p>/g) || []).length;
      return jWrap !== oWrap;
    },
  },
  {
    id: "setext-heading-after-list",
    severity: "medium",
    label: "`---` after a list item parses as setext H2 (kramdown promotes; ours treats as <hr>)",
    test: (j, o) => /<li>\s*<h2/.test(j) && /<hr/.test(o),
  },
  {
    id: "kramdown-image-as-table",
    severity: "low",
    label: "Kramdown misparses `![alt | text](url)` as a markdown table (the `|` in alt text trips the table detector); we correctly emit `<img>`",
    test: (j, o) => /<td>!?\[/.test(j) && /<img\b/.test(o),
  },
  {
    id: "smart-quote",
    severity: "low",
    label: "Smart quote / apostrophe (curly vs straight, en-dash vs hyphen) divergence",
    test: (j, o) => {
      const jChars = j.match(/[‘’“”–—]/g) || [];
      const oChars = o.match(/[‘’“”–—]/g) || [];
      return jChars.length !== oChars.length;
    },
  },
  {
    id: "blockquote-vs-admonition",
    severity: "medium",
    label: "Admonition rewrite skipped (body in <blockquote> instead of inside the alert div)",
    test: (j, o) => /markdown-alert/.test(j) && /<blockquote/.test(o),
  },
  {
    id: "missing-anchor-attr",
    severity: "low",
    label: "kramdown emits role/itemprop attributes we don't (anchor accessibility metadata)",
    test: (j, o) => /role="doc-/.test(j) && !/role="doc-/.test(o),
  },
  {
    id: "deflist-wrap",
    severity: "low",
    label: "Definition list <p> wrap inside <dd> (tight vs loose detection differences)",
    test: (j, o) => /<dd>\s*<p>/.test(j) !== /<dd>\s*<p>/.test(o),
  },
  {
    id: "table-attrs",
    severity: "low",
    label: "Table attribute differences (alignment, header markup)",
    test: (j, o) => /<th[^>]+>/.test(j) || /<th[^>]+>/.test(o),
  },
  {
    id: "scope-mapping",
    severity: "medium",
    label: "tB scope-to-class mapping mismatch (one Rouge class is the right answer; we picked the wrong neighbour)",
    test: (j, o) => /class="(k|kt|kd|ow|o|nf|nc|nn|nv|n|nb|na|s|se|mi|mf|m|ld|lb|le|ln|lu|c1|cm|cp|lc|p|err)"/.test(j) &&
                    /class="(k|kt|kd|ow|o|nf|nc|nn|nv|n|nb|na|s|se|mi|mf|m|ld|lb|le|ln|lu|c1|cm|cp|lc|p|err)"/.test(o),
  },
  {
    id: "attr-encoding",
    severity: "low",
    label: "HTML attribute escaping / quoting differences",
    test: (j, o) => /&#?\w+;/.test(j) !== /&#?\w+;/.test(o),
  },
];

const FALLBACK = { id: "other", severity: "?", label: "Unclassified divergence" };

const buckets = new Map(); // id -> { rule, count, examples: [{srcRel, ctx}] }

let matched = 0;
let differed = 0;
let accepted = 0;

for (const p of pages) {
  if (p.ext !== ".md") continue;
  const jekyllPath = path.join(siteRoot, p.destPath);
  let jekyllHtml;
  try { jekyllHtml = await fs.readFile(jekyllPath, "utf8"); } catch { continue; }
  const jekyll = extractMainBody(jekyllHtml);
  const ours = normalise(p.renderedContent);
  if (jekyll === ours) { matched++; continue; }
  if (ACCEPTED_DIVERGENCE_PATHS.has(p.srcRel)) { accepted++; continue; }
  differed++;

  const minLen = Math.min(jekyll.length, ours.length);
  let i = 0;
  while (i < minLen && jekyll[i] === ours[i]) i++;
  const ctxStart = Math.max(0, i - 60);
  const ctxEnd = Math.min(Math.max(jekyll.length, ours.length), i + 200);
  const jCtx = jekyll.slice(ctxStart, Math.min(ctxEnd, jekyll.length));
  const oCtx = ours.slice(ctxStart, Math.min(ctxEnd, ours.length));

  let rule = RULES.find((r) => {
    try { return r.test(jCtx, oCtx); } catch { return false; }
  }) || FALLBACK;

  const bucket = buckets.get(rule.id) || { rule, count: 0, examples: [] };
  bucket.count++;
  if (bucket.examples.length < 3) {
    bucket.examples.push({ srcRel: p.srcRel, offset: i, jCtx, oCtx });
  }
  buckets.set(rule.id, bucket);
}

console.log(`Matched: ${matched} / Accepted: ${accepted} / Differed: ${differed} / Total .md: ${matched + accepted + differed}\n`);

const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
const sev = { high: 3, medium: 2, low: 1, "?": 0 };
sorted.sort((a, b) => (sev[b.rule.severity] - sev[a.rule.severity]) * 1000 + (b.count - a.count));

for (const b of sorted) {
  console.log(`=== [${b.rule.severity}] ${b.rule.id} -- ${b.count} pages`);
  console.log(`    ${b.rule.label}`);
  for (const ex of b.examples) {
    console.log(`    e.g. ${ex.srcRel} @ ${ex.offset}`);
    console.log(`         J: ${JSON.stringify(ex.jCtx.slice(0, 120))}`);
    console.log(`         O: ${JSON.stringify(ex.oCtx.slice(0, 120))}`);
  }
  console.log();
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
