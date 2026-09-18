// Choose -- and check -- the accessibility scan's page sample.
//
// The scan is a sample of a dozen pages out of ~1,160, so what it can possibly
// report is decided entirely by which dozen.  That choice was made once, by hand,
// against a site that has since grown; by the time anyone looked, SAMPLE_PAGES
// spanned 2,175-2,694 elements against a site maximum of 5,231 and contained no
// page with a table, an image, a disclosure widget or a video card.  Rules for
// those constructs were in the run options and had nothing to run on.  The scan
// reported "0 violations" and was not wrong -- it was answering a narrower
// question than anyone reading it believed.
//
// Nothing about that failure announces itself.  A construct added to the docs
// today is simply never audited, and the gate stays green.  So the sample is
// derived from the built tree rather than maintained by hand:
//
//   --check    (default) every construct family the site uses is covered by at
//              least one sample page, or exit 1 naming the gaps.  No browser,
//              ~1 s; check.bat runs it before the scan itself.
//   --propose  greedy set cover -- cheapest page that covers the most
//              still-uncovered families, until everything is covered.  Seeds
//              from the current SAMPLE_PAGES, so it proposes what to *add*;
//              --fresh ignores the current set and covers from scratch, which
//              is the way to ask whether the existing pages still earn their
//              place.  Prints a SAMPLE_PAGES block for lib/axe-scan.mjs.
//   --census   what each family is, how many pages use it, and which page uses
//              it most.
//
// Cost matters to --propose because audit cost is super-linear in element count
// (k = 2.73; builder/PLAN-axe-perf.md §Phase 1), so the cheapest cover is not
// the smallest one.  Measured per-page costs come from a sweep
// (scripts/sweep_a11y.mjs) when one has been run; otherwise the fitted curve
// stands in, which is good enough to rank candidates.
//
// Usage:
//   node scripts/pick_a11y_sample.mjs              # --check
//   node scripts/pick_a11y_sample.mjs --propose
//   node scripts/pick_a11y_sample.mjs --census
//   node scripts/pick_a11y_sample.mjs --propose --sweep perf/results/a11y-sweep.jsonl

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";
import { DEFAULT_ROOT_DIR, REPO_ROOT, SAMPLE_PAGES } from "./lib/axe-scan.mjs";

// ---------------------------------------------------------------------------
// Construct families
// ---------------------------------------------------------------------------
//
// A family is a markup construct that some axe rule keys on, counted on the
// built HTML.  `min` is how many instances a page needs before it counts as
// covering the family -- one stray <sup> in a footer is not coverage of
// footnotes, and every page carries some of the shared chrome's constructs.
//
// The chrome contributes a fixed floor to several of these (every page has the
// nav's ~92 inline SVG icons), so counts are taken *above the site-wide
// minimum* for that family.  What is left is the page's own content.
//
// `why` is the rule, or rule group, that has nothing to run on when no sample
// page covers the family.  It is the reason the family is in this list, and it
// is what a --check failure prints.
const FAMILIES = {
  img: { re: /<img[\s>]/g, min: 1, why: "image-alt" },
  table: { re: /<table[\s>]/g, min: 1, why: "th-has-data-cells, td-headers-attr, scope-attr-valid" },
  th: { re: /<th[\s>]/g, min: 2, why: "empty-table-header, table header association" },
  pre: { re: /<pre[\s>]/g, min: 1, why: "scrollable-region-focusable; the contrast stress case" },
  dl: { re: /<dl[\s>]/g, min: 1, why: "definition-list, dlitem" },
  details: { re: /<details[\s>]/g, min: 1, why: "summary naming and disclosure semantics" },
  video: { re: /class="[^"]*video-link/g, min: 1, why: "link-name and image-alt on video cards" },
  callout: { re: /class="[^"]*(?:note|important|warning)/g, min: 2, why: "color-contrast on tinted callout backgrounds" },
  blockquote: { re: /<blockquote[\s>]/g, min: 1, why: "color-contrast on quoted text" },
  kbd: { re: /<kbd[\s>]/g, min: 2, why: "color-contrast on inline key caps" },
  footnote: { re: /class="footnote/g, min: 1, why: "footnote back-reference link names" },
  sup: { re: /<sup[\s>]/g, min: 1, why: "color-contrast at small type sizes" },
  deepHeadings: { re: /<h3[\s>]/g, min: 4, why: "heading-order across a real h2/h3 nesting" },
  svgDiagram: { re: /class="svg-container"/g, min: 1, why: "role-img-alt on an inlined diagram" },
  codeDense: { re: /<code[\s>]/g, min: 200, why: "color-contrast at the density that dominates audit cost" },
  listDense: { re: /<li[\s>]/g, min: 150, why: "list, listitem at scale" },
};

// Pages that stay in the sample whatever the cover says, each for a reason the
// construct census cannot see.
const ANCHORS = {
  "/index.html": "the home layout -- no sidebar-driven content, its own hero",
  "/404.html": "the error layout, and the site's cheapest real page",
};

// Redirect stubs (~290 of them) are excluded, and cannot be included: each
// carries `<script>location=...</script>`, so the browser has navigated to the
// target before the audit runs and what axe walks is the target page.  Putting
// one in the sample buys a silent duplicate audit, not a new layout.
const STUB_CEILING = 100;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let mode = "check";
let rootDir = DEFAULT_ROOT_DIR;
let sweepPath = join(REPO_ROOT, "perf/results/a11y-sweep.jsonl");
let budget = Infinity;
let fresh = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--check") mode = "check";
  else if (a === "--propose") mode = "propose";
  else if (a === "--census") mode = "census";
  else if (a === "--fresh") fresh = true;
  else if (a === "--root-dir" && args[i + 1]) rootDir = args[++i];
  else if (a === "--sweep" && args[i + 1]) sweepPath = args[++i];
  else if (a === "--budget" && args[i + 1]) budget = parseFloat(args[++i]);
  else if (a === "-h" || a === "--help") {
    console.error("usage: node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]");
    console.error("                                        [--root-dir DIR] [--sweep FILE] [--budget MS]");
    process.exit(0);
  } else {
    console.error("unknown arg: " + a);
    process.exit(2);
  }
}
rootDir = resolve(rootDir);

// ---------------------------------------------------------------------------
// Scan the built tree
// ---------------------------------------------------------------------------

function discover(dir) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) out.push(p);
    }
  })(dir);
  return out;
}

const count = (html, re) => (html.match(re) || []).length;

const pages = discover(rootDir).map((p) => {
  const html = readFileSync(p, "utf8");
  const row = {
    filePath: "/" + relative(rootDir, p).split(sep).join("/"),
    tags: count(html, /<[a-zA-Z][a-zA-Z0-9-]*(\s|>|\/)/g),
    raw: {},
  };
  for (const [name, f] of Object.entries(FAMILIES)) row.raw[name] = count(html, f.re);
  return row;
});

const content = pages.filter((p) => p.tags >= STUB_CEILING);
const stubs = pages.filter((p) => p.tags < STUB_CEILING);

if (content.length === 0) {
  console.error(`no content pages under ${rootDir} -- has build.bat run?`);
  process.exit(2);
}

// Subtract the chrome floor so a page's numbers are its own content.
const floor = {};
for (const name of Object.keys(FAMILIES)) {
  floor[name] = Math.min(...content.map((p) => p.raw[name]));
}
for (const p of content) {
  p.own = {};
  for (const name of Object.keys(FAMILIES)) p.own[name] = p.raw[name] - floor[name];
}

const covers = (p, name) => p.own[name] >= FAMILIES[name].min;

// A family the site itself does not use cannot be covered, and is not a gap.
const present = Object.keys(FAMILIES).filter((name) => content.some((p) => covers(p, name)));
const absent = Object.keys(FAMILIES).filter((name) => !present.includes(name));

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------
//
// Measured, when a sweep has been run.  Otherwise the fitted curve from
// §Phase 1 -- cost is super-linear in element count, so a page's own size, not
// the page count, is what a widened scan pays for.
const EXPONENT = 2.73;
const measured = new Map();
if (existsSync(sweepPath)) {
  for (const line of readFileSync(sweepPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!measured.has(r.filePath)) measured.set(r.filePath, []);
      measured.get(r.filePath).push(r.runMs);
    } catch {
      // torn line from an interrupted sweep
    }
  }
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// Anchor the fitted curve on the sweep's own median page when there is one, so
// modelled and measured costs are on the same scale.
let refTags = 2400;
let refMs = 240;
if (measured.size) {
  const known = content.filter((p) => measured.has(p.filePath));
  if (known.length) {
    const mid = known.sort((a, b) => a.tags - b.tags)[Math.floor(known.length / 2)];
    refTags = mid.tags;
    refMs = median(measured.get(mid.filePath));
  }
}
const costOf = (p) =>
  measured.has(p.filePath)
    ? median(measured.get(p.filePath))
    : refMs * Math.pow(p.tags / refTags, EXPONENT);

const costSource = measured.size
  ? `measured (${measured.size} pages from ${relative(REPO_ROOT, sweepPath).split(sep).join("/")})`
  : `modelled (k=${EXPONENT}); run scripts/sweep_a11y.mjs for measured costs`;

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

const pad = (s, w) => String(s).padStart(w);

if (mode === "census") {
  console.log(`construct census over ${content.length} content pages (+${stubs.length} redirect stubs)`);
  console.log(`cost: ${costSource}`);
  console.log("");
  console.log("  family".padEnd(18) + pad("min", 5) + pad("floor", 7) + pad("pages", 7) + pad("max", 6) + "  heaviest page");
  for (const name of Object.keys(FAMILIES)) {
    const hits = content.filter((p) => covers(p, name)).sort((a, b) => b.own[name] - a.own[name]);
    console.log(
      "  " + name.padEnd(16) + pad(FAMILIES[name].min, 5) + pad(floor[name], 7) +
      pad(hits.length, 7) + pad(hits[0]?.own[name] ?? 0, 6) + "  " + (hits[0]?.filePath ?? "-- none --")
    );
  }
  if (absent.length) {
    console.log("");
    console.log("families the site does not currently use: " + absent.join(", "));
  }
  process.exit(0);
}

if (mode === "check") {
  const sample = content.filter((p) => SAMPLE_PAGES.includes(p.filePath));
  const missingPages = SAMPLE_PAGES.filter(
    (f) => !pages.some((p) => p.filePath === f)
  );

  const gaps = present.filter((name) => !sample.some((p) => covers(p, name)));

  console.log(`a11y sample coverage: ${SAMPLE_PAGES.length} pages, ${present.length} construct families in use`);

  if (missingPages.length) {
    console.log("");
    console.log("SAMPLE_PAGES entries that are not in the built tree:");
    for (const f of missingPages) console.log("  " + f);
  }

  if (gaps.length) {
    console.log("");
    console.log("UNCOVERED -- the site uses these constructs and no sample page has one:");
    for (const name of gaps) {
      const best = content.filter((p) => covers(p, name)).sort((a, b) => costOf(a) - costOf(b));
      console.log(`  ${name.padEnd(16)} ${FAMILIES[name].why}`);
      console.log(`  ${"".padEnd(16)} cheapest page that covers it: ${best[0].filePath} (${costOf(best[0]).toFixed(0)}ms)`);
    }
    console.log("");
    console.log("Run --propose for a set that covers everything, or widen FAMILIES if a");
    console.log("construct no longer needs its own sample page.");
    process.exit(1);
  }

  if (missingPages.length) process.exit(1);
  console.log("every construct family in use is covered.");
  process.exit(0);
}

// --propose
const chosen = [];
const take = (p, reason) => {
  if (chosen.some((c) => c.page.filePath === p.filePath)) return;
  chosen.push({ page: p, reason });
};

// Seed from what is already there, unless asked for a clean sheet.  Widening
// an existing sample and designing one from scratch are different questions,
// and the first is almost always the one being asked: the current pages have
// history, and dropping one silently retires whatever it was covering.
if (!fresh) {
  for (const filePath of SAMPLE_PAGES) {
    const p = content.find((c) => c.filePath === filePath);
    if (p) take(p, "already in the sample");
  }
}
for (const [filePath, reason] of Object.entries(ANCHORS)) {
  const p = content.find((c) => c.filePath === filePath);
  if (p) take(p, reason);
}

// The largest page in the site earns a place on size alone: it is the worst
// case for anything that degrades with page size, and it is the page a
// size-blind sample is guaranteed to miss.
const largest = content.reduce((a, b) => (b.tags > a.tags ? b : a));
take(largest, "the site's largest page -- the size worst case");

const uncovered = new Set(present.filter((name) => !chosen.some((c) => covers(c.page, name))));

while (uncovered.size) {
  let best = null;
  for (const p of content) {
    if (chosen.some((c) => c.page.filePath === p.filePath)) continue;
    const gained = [...uncovered].filter((name) => covers(p, name));
    if (!gained.length) continue;
    const cost = costOf(p);
    if (cost > budget) continue;
    const score = gained.length / cost;
    if (!best || score > best.score) best = { p, gained, cost, score };
  }
  if (!best) break;
  take(best.p, `covers ${best.gained.join(", ")}`);
  for (const name of best.gained) uncovered.delete(name);
}

const totalMs = chosen.reduce((s, c) => s + costOf(c.page), 0);

console.log(`proposed sample: ${chosen.length} pages`);
console.log(`cost: ${costSource}`);
console.log("");
console.log("  page".padEnd(52) + pad("tags", 7) + pad("ms", 8) + "  why");
for (const c of chosen) {
  console.log("  " + c.page.filePath.padEnd(50) + pad(c.page.tags, 7) + pad(costOf(c.page).toFixed(0), 8) + "  " + c.reason);
}
console.log("");
console.log(`  one audit each: ${(totalMs / 1000).toFixed(1)}s; x2 themes x2 viewports: ${((totalMs * 4) / 1000).toFixed(1)}s of audit`);
if (uncovered.size) console.log(`  STILL UNCOVERED: ${[...uncovered].join(", ")}`);
console.log("");
console.log("export const SAMPLE_PAGES = [");
for (const c of chosen) console.log(`  ${JSON.stringify(c.page.filePath)},`);
console.log("];");
