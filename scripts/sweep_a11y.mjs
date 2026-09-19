// Full-site accessibility sweep -- the coverage counterpart to check_a11y.mjs.
//
// check_a11y.mjs is a *gate*: a handful of pages, run on every build, fast
// enough to sit in check.bat.  This is a *survey*: every page in the built
// tree, run occasionally, to answer the question a sample cannot -- what is
// actually wrong out there, and what would it cost to audit it routinely.
//
// It exists because the sample was found to be unrepresentative.  SAMPLE_PAGES
// spans 2,175-2,694 elements against a site maximum of 5,231, and contains no
// page with a table, an image, a disclosure widget or a video card.  A sample
// that never sees a construct cannot report a defect in it, so "0 violations"
// from the gate was a statement about six pages, not about the site.  Widening
// the gate sensibly needs two things this produces:
//
//   * the violation census -- which rules fire, where, and on what construct,
//     so the widened set can be chosen to cover the constructs that break;
//   * the cost census -- per-page audit time and element count, so the widened
//     set can be chosen knowing what it costs.  Audit cost is super-linear in
//     element count (k = 2.73), so page count alone does not predict it.
//
// Results stream to JSONL as they are produced and --resume skips what is
// already there, because a full sweep is tens of minutes and should never have
// to start over.
//
// Usage:
//   node scripts/sweep_a11y.mjs                       # whole tree, 2 themes x 2 viewports
//   node scripts/sweep_a11y.mjs --theme light --viewport desktop
//   node scripts/sweep_a11y.mjs --filter /tB/Packages/VB/ --limit 20
//   node scripts/sweep_a11y.mjs --resume              # continue an interrupted sweep
//   node scripts/sweep_a11y.mjs --report              # re-print the summary, no browser
//
// Requires build.bat to have produced an up-to-date docs/_site-offline/.

import {
  readdirSync,
  readFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, join, relative, sep, dirname } from "node:path";
import {
  axeVersion,
  DEFAULT_ROOT_DIR,
  REPO_ROOT,
  THEMES,
  VIEWPORTS,
  getScheme,
  gotoPage,
  launchBrowser,
  newAuditPage,
  readAxeSource,
  runAxe,
} from "./lib/axe-scan.mjs";

// The production scheme, read from the one registry check_a11y.mjs reads --
// same bundle, same patches, same run options.  A survey run against a
// different axe than the gate runs would be reporting on a configuration
// nobody ships.
const PRODUCTION = getScheme("production");
const AXE_PATCHES = PRODUCTION.patches;

// Pages below this tag count are redirect stubs -- a canonical link, a meta
// refresh, `<script>location=...</script>` and a one-line body.  There are ~290
// of them and they are excluded outright, for a better reason than cost: they
// cannot be audited.  The inline script navigates before the audit runs, so
// what axe walks is the redirect *target*.  An earlier version of this script
// sampled three of them and produced three exact duplicates of other pages'
// results -- the stub for /CustomControls.html reported the same 2,221
// elements as /Tutorials/CustomControls/index.html.  A page nobody sees for
// longer than 0 ms is not a page to audit.
const STUB_TAG_CEILING = 100;

const args = process.argv.slice(2);
let rootDir = DEFAULT_ROOT_DIR;
let themeArg = "both";
let viewportArg = "both";
let filter = null;
let limit = Infinity;
let outPath = null;
let resume = false;
let reportOnly = false;
let stockAxe = false;
let recycleEvery = 100;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--root-dir" && args[i + 1]) rootDir = args[++i];
  else if (a === "--theme" && args[i + 1]) themeArg = args[++i];
  else if (a === "--viewport" && args[i + 1]) viewportArg = args[++i];
  else if (a === "--filter" && args[i + 1]) filter = args[++i];
  else if (a === "--limit" && args[i + 1]) limit = parseInt(args[++i], 10);
  else if (a === "--out" && args[i + 1]) outPath = args[++i];
  else if (a === "--resume") resume = true;
  else if (a === "--report") {
    reportOnly = true;
    resume = true;
  } else if (a === "--stock-axe") stockAxe = true;
  else if (a === "--recycle-every" && args[i + 1]) recycleEvery = parseInt(args[++i], 10);
  else if (a === "-h" || a === "--help") {
    console.error("usage: node scripts/sweep_a11y.mjs [--theme T] [--viewport V] [--filter SUBSTR]");
    console.error("                                   [--limit N] [--out FILE] [--resume] [--report]");
    console.error("                                   [--stock-axe] [--root-dir DIR]");
    process.exit(0);
  } else {
    console.error("unknown arg: " + a);
    process.exit(2);
  }
}

rootDir = resolve(rootDir);
outPath = resolve(outPath ?? join(REPO_ROOT, "perf/results/a11y-sweep.jsonl"));

const themes = themeArg === "both" ? THEMES : [themeArg];
const viewports = viewportArg === "both" ? Object.keys(VIEWPORTS) : [viewportArg];

// ---- page discovery ---------------------------------------------------

// Static start-tag count.  Not the element count axe sees -- it misses what
// scripts add and counts what parsing drops -- but it ranks pages correctly
// and costs no browser, which is all it is used for here: separating stubs
// from content before the sweep starts.
function staticTagCount(html) {
  const m = html.match(/<[a-zA-Z][a-zA-Z0-9-]*(\s|>|\/)/g);
  return m ? m.length : 0;
}

function discoverPages(dir) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) out.push(p);
    }
  })(dir);
  return out
    .map((p) => ({
      filePath: "/" + relative(dir, p).split(sep).join("/"),
      tags: staticTagCount(readFileSync(p, "utf8")),
    }))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

const allPages = discoverPages(rootDir);
const stubs = allPages.filter((p) => p.tags < STUB_TAG_CEILING);
const content = allPages.filter((p) => p.tags >= STUB_TAG_CEILING);

let selected = content;
if (filter) selected = selected.filter((p) => p.filePath.includes(filter));
selected = selected.slice(0, limit);

// ---- resume -----------------------------------------------------------

const done = new Set();
const records = [];
if (resume && existsSync(outPath)) {
  for (const line of readFileSync(outPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      done.add(r.label);
      records.push(r);
    } catch {
      // a torn final line from an interrupted run; drop it
    }
  }
}

// ---- sweep ------------------------------------------------------------

const matrix = [];
for (const viewport of viewports) {
  for (const theme of themes) {
    for (const p of selected) {
      const label = `${p.filePath} [${theme}, ${viewport}]`;
      if (done.has(label)) continue;
      matrix.push({ ...p, theme, viewport, label });
    }
  }
}

if (!reportOnly && matrix.length) {
  mkdirSync(dirname(outPath), { recursive: true });
  const axeSource = readAxeSource({
    minified: stockAxe,
    patches: stockAxe ? [] : AXE_PATCHES,
  });

  console.error(
    stockAxe
      ? `[sweep] axe-core ${axeVersion()} (stock)`
      : `[sweep] axe-core ${axeVersion()} + ${AXE_PATCHES.join(", ")}`
  );
  console.error(
    `[sweep] ${selected.length} pages of ${content.length} content ` +
      `(${stubs.length} redirect stubs excluded) x ${themes.length} theme(s) ` +
      `x ${viewports.length} viewport(s)`
  );
  console.error(`[sweep] ${matrix.length} audits to run, ${done.size} already recorded`);
  console.error(`[sweep] -> ${outPath}`);

  const browser = await launchBrowser();
  let page = await newAuditPage(browser);
  let currentViewport = null;
  const t0 = Date.now();

  try {
    for (let i = 0; i < matrix.length; i++) {
      const entry = matrix[i];

      // A single page object accumulates detached-document memory over
      // thousands of loads.  Recycling the tab (not the browser) keeps the
      // renderer flat without paying for a relaunch.
      if (i > 0 && i % recycleEvery === 0) {
        await page.close();
        page = await newAuditPage(browser);
        currentViewport = null;
      }
      if (entry.viewport !== currentViewport) {
        await page.setViewport(VIEWPORTS[entry.viewport]);
        currentViewport = entry.viewport;
      }

      await gotoPage(page, { rootDir, filePath: entry.filePath, theme: entry.theme });
      const { results, timings } = await runAxe(page, {
        axeSource,
        configure: PRODUCTION.configure,
        runOptions: PRODUCTION.runOptions,
      });
      const elements = await page.evaluate(
        () => document.getElementsByTagName("*").length
      );

      const rec = {
        label: entry.label,
        filePath: entry.filePath,
        theme: entry.theme,
        viewport: entry.viewport,
        elements,
        tags: entry.tags,
        runMs: timings.run,
        violations: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          sample: (v.nodes[0]?.html ?? "").slice(0, 200),
          target: v.nodes[0]?.target?.join(" ") ?? "",
        })),
        incomplete: results.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      };
      records.push(rec);
      appendFileSync(outPath, JSON.stringify(rec) + "\n");

      if (i % 25 === 0 || i === matrix.length - 1) {
        const elapsed = (Date.now() - t0) / 1000;
        const rate = (i + 1) / elapsed;
        const eta = (matrix.length - i - 1) / rate;
        console.error(
          `[sweep] ${String(i + 1).padStart(5)}/${matrix.length}  ` +
            `${elapsed.toFixed(0)}s elapsed, ETA ${(eta / 60).toFixed(1)}m  ` +
            `${rec.violations.length ? rec.violations.length + " viol" : "ok"}  ${entry.label}`
        );
      }
    }
  } finally {
    await browser.close();
  }
}

// ---- report -----------------------------------------------------------

const pad = (s, w) => String(s).padStart(w);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

console.log("");
console.log(`=== a11y sweep: ${records.length} audits ===`);
console.log("");

const byRule = new Map();
for (const r of records) {
  for (const v of r.violations) {
    if (!byRule.has(v.id)) {
      byRule.set(v.id, {
        impact: v.impact,
        audits: 0,
        nodes: 0,
        pages: new Set(),
        themes: new Set(),
        viewports: new Set(),
        sample: v.sample,
        target: v.target,
      });
    }
    const e = byRule.get(v.id);
    e.audits++;
    e.nodes += v.nodes;
    e.pages.add(r.filePath);
    e.themes.add(r.theme);
    e.viewports.add(r.viewport);
  }
}

if (byRule.size === 0) {
  console.log("VIOLATIONS: none.");
} else {
  console.log("VIOLATIONS by rule:");
  console.log(
    "  rule".padEnd(34) +
      pad("impact", 10) +
      pad("audits", 8) +
      pad("pages", 7) +
      pad("nodes", 8) +
      "  axes"
  );
  const sorted = [...byRule.entries()].sort((a, b) => b[1].nodes - a[1].nodes);
  for (const [id, e] of sorted) {
    console.log(
      "  " +
        id.padEnd(32) +
        pad(e.impact, 10) +
        pad(e.audits, 8) +
        pad(e.pages.size, 7) +
        pad(e.nodes, 8) +
        "  " +
        [...e.themes].join("+") +
        " / " +
        [...e.viewports].join("+")
    );
  }
  console.log("");
  console.log("  first offending node per rule:");
  for (const [id, e] of sorted) {
    console.log(`    ${id}  @ ${e.target}`);
    console.log(`      ${e.sample.replace(/\s+/g, " ").slice(0, 150)}`);
  }
}

console.log("");
const incRules = new Map();
for (const r of records) {
  for (const v of r.incomplete) incRules.set(v.id, (incRules.get(v.id) ?? 0) + v.nodes);
}
console.log(
  "INCOMPLETE by rule: " +
    ([...incRules.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${id}(${n})`)
      .join(", ") || "none")
);

console.log("");
const byPage = new Map();
for (const r of records) {
  if (!byPage.has(r.filePath)) byPage.set(r.filePath, { elements: 0, ms: [], viol: 0 });
  const e = byPage.get(r.filePath);
  e.elements = Math.max(e.elements, r.elements);
  e.ms.push(r.runMs);
  e.viol += r.violations.length;
}
const pageRows = [...byPage.entries()]
  .map(([filePath, e]) => ({
    filePath,
    elements: e.elements,
    ms: median(e.ms),
    viol: e.viol,
  }))
  .sort((a, b) => b.ms - a.ms);

console.log("COST -- 20 most expensive pages (median audit ms across the axes run):");
console.log("  page".padEnd(52) + pad("elems", 7) + pad("ms", 8));
for (const r of pageRows.slice(0, 20)) {
  console.log("  " + r.filePath.padEnd(50) + pad(r.elements, 7) + pad(r.ms.toFixed(0), 8));
}

const totalMs = pageRows.reduce((s, r) => s + r.ms, 0);
console.log("");
console.log(`  ${pageRows.length} pages, one audit each: ${(totalMs / 1000).toFixed(1)}s`);
console.log(
  `  median page ${median(pageRows.map((r) => r.ms)).toFixed(0)}ms, ` +
    `mean ${(totalMs / pageRows.length).toFixed(0)}ms`
);
const top20 = pageRows.slice(0, 20).reduce((s, r) => s + r.ms, 0);
console.log(
  `  the 20 most expensive account for ${((top20 / totalMs) * 100).toFixed(1)}% of that total`
);

console.log(`\nrecords: ${outPath}`);

// A survey, not the gate -- but a checker that finds violations and exits 0 is
// a trap for whoever wires it into something. check_a11y.mjs remains what
// check.bat runs; this is the occasional full pass behind it.
if (byRule.size > 0) process.exit(1);
