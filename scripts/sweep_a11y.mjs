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
// Also parsed, and not shown above because they are rarely needed:
//   --root-dir DIR       tree to scan       (default docs/_site-offline)
//   --out FILE           JSONL destination  (default perf/results/a11y-sweep.jsonl)
//   --stock-axe          inject the unmodified bundle, bypassing SOURCE_PATCHES
//   --recycle-every N    open a fresh tab every N audits, to cap memory growth
//
// Requires build.bat to have produced an up-to-date docs/_site-offline/.

import {
  readFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import {
  axeVersion,
  DEFAULT_ROOT_DIR,
  REPO_ROOT,
  THEMES,
  VIEWPORTS,
  discoverPages,
  getScheme,
  gotoPage,
  median,
  newAuditPage,
  pad,
  pick,
  readAxeSource,
  runAxe,
  splitStubs,
} from "./lib/axe-scan.mjs";
import { withBrowser } from "./lib/browser.mjs";
import { parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";

// The production scheme, read from the one registry check_a11y.mjs reads --
// same bundle, same patches, same run options.  A survey run against a
// different axe than the gate runs would be reporting on a configuration
// nobody ships.
const PRODUCTION = getScheme("production");
const AXE_PATCHES = PRODUCTION.patches;

const cli = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        "root-dir": { type: "string", default: DEFAULT_ROOT_DIR },
        theme: { type: "string", default: "both" },
        viewport: { type: "string", default: "both" },
        filter: { type: "string" },
        limit: { type: "string" },
        out: { type: "string" },
        resume: { type: "boolean", default: false },
        report: { type: "boolean", default: false },
        "stock-axe": { type: "boolean", default: false },
        "recycle-every": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      acceptsValue: Boolean,
      stopAt: ["help"],
    }),
  { format: (err) => `unknown arg: ${err.arg}` },
);
if (cli.stopped === "help") {
  printHelpAndExit(
    "usage: node scripts/sweep_a11y.mjs [--theme T] [--viewport V] [--filter SUBSTR]\n"
      + "                                   [--limit N] [--out FILE] [--resume] [--report]\n"
      + "                                   [--stock-axe] [--root-dir DIR] [--recycle-every N]\n"
      + "                                   [-h, --help]",
  );
}

let rootDir = cli.values.rootDir;
let themeArg = cli.values.theme;
let viewportArg = cli.values.viewport;
let filter = cli.values.filter ?? null;
let limit = cli.values.limit !== undefined ? parseInt(cli.values.limit, 10) : Infinity;
let outPath = cli.values.out ?? null;
let resume = cli.values.resume;
let reportOnly = cli.values.report;
if (reportOnly) resume = true;
let stockAxe = cli.values.stockAxe;
let recycleEvery = cli.values.recycleEvery !== undefined ? parseInt(cli.values.recycleEvery, 10) : 100;

rootDir = resolve(rootDir);
outPath = resolve(outPath ?? join(REPO_ROOT, "perf/results/a11y-sweep.jsonl"));

const themes = pick("theme", themeArg, THEMES);
const viewports = pick("viewport", viewportArg, Object.keys(VIEWPORTS));

// ---- page discovery ---------------------------------------------------

// Redirect stubs are left out, for a better reason than cost: they cannot be
// audited (STUB_TAG_CEILING in axe-scan.mjs says why).
const { content, stubs } = splitStubs(discoverPages(rootDir));

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

  await withBrowser(async (browser) => {
    let page = await newAuditPage(browser);
    let currentViewport = null;
    const t0 = Date.now();

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
  });
}

// ---- report -----------------------------------------------------------

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
