// Counts the DOM operations one axe audit performs, per rule.
//
// The companion to ab-axe.mjs: that one answers "how many milliseconds", this
// one answers "doing what". Between them, D1 / D3 / D4 in
// builder/PLAN-axe-perf.md stop being source-reading and become measurements.
//
// Counts are deterministic, so one run per variant is enough -- the ms column
// is printed for orientation only. Use ab-axe.mjs for timings.
//
// Usage (run from perf/ or the repo root):
//   node probe-axe-dom.mjs                        # baseline + the named rules
//   node probe-axe-dom.mjs --all-rules            # only-R for every rule that runs
//   node probe-axe-dom.mjs --rules color-contrast,target-size
//   node probe-axe-dom.mjs --schemes no-html,no-selectors
//   node probe-axe-dom.mjs --page /tB/Core/Dim.html --theme dark
//   node probe-axe-dom.mjs --json out.json
//
// Requires build.bat to have produced an up-to-date docs/_site-offline/.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AXE_RUN_OPTIONS,
  DEFAULT_ROOT_DIR,
  SCHEMES,
  VIEWPORTS,
  axeVersion,
  getScheme,
  gotoPage,
  launchBrowser,
  newAuditPage,
  readAxeSource,
} from '../scripts/lib/axe-scan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTRUMENT = readFileSync(join(HERE, 'instrument-axe-dom.js'), 'utf8');

// ---- CLI -------------------------------------------------------------
let pagePath = '/tB/Core/Select-Case.html';
let theme = 'light';
let viewport = 'desktop';
let rulesArg = 'color-contrast,target-size,link-in-text-block,aria-allowed-attr,no-autoplay-audio';
let schemesArg = '';
let allRules = false;
let rootDir = DEFAULT_ROOT_DIR;
let jsonOut = null;
let top = 0;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--page') pagePath = args[++i];
  else if (a === '--theme') theme = args[++i];
  else if (a === '--viewport') viewport = args[++i];
  else if (a === '--rules') rulesArg = args[++i];
  else if (a === '--schemes') schemesArg = args[++i];
  else if (a === '--all-rules') allRules = true;
  else if (a === '--root-dir') rootDir = resolve(args[++i]);
  else if (a === '--json') jsonOut = args[++i];
  else if (a === '--top') top = parseInt(args[++i], 10);
  else if (a === '-h' || a === '--help') {
    console.error('usage: node probe-axe-dom.mjs [--page P] [--theme T] [--viewport V]');
    console.error('                              [--rules a,b | --all-rules] [--schemes a,b]');
    console.error('                              [--top N] [--json FILE] [--root-dir DIR]');
    console.error('');
    console.error(`  schemes: ${Object.keys(SCHEMES).join(', ')}`);
    process.exit(0);
  } else {
    console.error('unknown arg: ' + a);
    process.exit(2);
  }
}
if (!VIEWPORTS[viewport]) {
  console.error(`unknown viewport "${viewport}"`);
  process.exit(2);
}

const namedRules = (!rulesArg || rulesArg === 'none')
  ? []
  : rulesArg.split(',').map(s => s.trim()).filter(Boolean);
const schemeIds = schemesArg ? schemesArg.split(',').map(s => s.trim()).filter(Boolean) : [];

// ---- Run -------------------------------------------------------------
const axeSource = readAxeSource({ minified: false });
const browser = await launchBrowser();
const page = await newAuditPage(browser);
await page.setViewport(VIEWPORTS[viewport]);

await gotoPage(page, { rootDir, filePath: pagePath, theme });
await page.evaluate(INSTRUMENT);
await page.evaluate(axeSource);

// Which rules actually run under the production configuration?  Ask axe
// rather than hardcoding: the list moves with the tag set and with upgrades.
const { ranRules, elementCount } = await page.evaluate(async (opts) => {
  const res = await axe.run(document, opts);
  const ids = new Set();
  for (const group of [res.violations, res.incomplete, res.passes, res.inapplicable]) {
    for (const g of group) ids.add(g.id);
  }
  return {
    ranRules: [...ids].sort(),
    elementCount: document.getElementsByTagName('*').length,
  };
}, AXE_RUN_OPTIONS);

const ruleIds = allRules ? ranRules : namedRules;
const unknown = ruleIds.filter(r => !ranRules.includes(r));
if (unknown.length) {
  console.error(`warning: not in the production rule set, will report zeros: ${unknown.join(', ')}`);
}

const variants = [
  { label: 'baseline (all rules)', configure: null, runOptions: AXE_RUN_OPTIONS },
  ...ruleIds.map(id => ({
    label: `only-${id}`,
    configure: null,
    runOptions: { runOnly: { type: 'rule', values: [id] } },
  })),
  ...schemeIds.map(id => {
    const s = getScheme(id);
    return { label: s.label, configure: s.configure, runOptions: s.runOptions };
  }),
];

console.error(`[probe-axe-dom] axe-core ${axeVersion()}`);
console.error(`[probe-axe-dom] ${pagePath} [${theme}, ${viewport}] -- ${elementCount} elements, ${ranRules.length} rules run`);
console.error(`[probe-axe-dom] ${variants.length} variants`);
console.error('');

const rows = [];
for (const v of variants) {
  // A fresh context per variant: axe.configure() is global and sticky, and a
  // scheme that sets noHtml must not leak into the next variant.
  await gotoPage(page, { rootDir, filePath: pagePath, theme });
  await page.evaluate(INSTRUMENT);
  await page.evaluate(axeSource);

  const r = await page.evaluate(async (cfg, opts) => {
    if (cfg) axe.configure(cfg);
    // Discard run: pays V8's lazy compilation and warms Blink's caches, so
    // the counted run measures steady state. Counters are reset after it.
    await axe.run(document, opts);
    window.__axeDomStats.reset();
    const t0 = performance.now();
    await axe.run(document, opts);
    const ms = performance.now() - t0;
    return { ms, stats: window.__axeDomStats.read() };
  }, v.configure, v.runOptions);

  rows.push({ label: v.label, ms: r.ms, stats: r.stats });
  console.error(`  ${v.label.padEnd(36)} ${r.ms.toFixed(0).padStart(5)} ms`);
}

await browser.close();

// ---- Report ----------------------------------------------------------
const COLS = [
  ['getComputedStyle', 'gCS'],
  ['getPropertyValue', 'gPV'],
  ['getBoundingClientRect', 'gBCR'],
  ['getClientRects', 'gCR'],
  ['querySelectorAll', 'qSA'],
  ['querySelector', 'qS'],
];

const n = (x) => x.toLocaleString('en-US');
const W = 38, NW = 12;
const pad = (s, w = NW) => String(s).padStart(w);

console.log('');
console.log(`${pagePath} [${theme}, ${viewport}] -- ${elementCount} elements, axe-core ${axeVersion()}`);
console.log('DOM operation counts for one axe.run. Counts are exact; ms is indicative.');
console.log('');
console.log(
  'variant'.padEnd(W) + pad('ms', 7) +
  COLS.map(([, s]) => pad(s)).join('') + pad('outerHTML') + pad('oHTML KB')
);
console.log('-'.repeat(W + 7 + NW * (COLS.length + 2)));
for (const r of rows) {
  console.log(
    r.label.padEnd(W) + pad(r.ms.toFixed(0), 7) +
    COLS.map(([k]) => pad(n(r.stats[k].count))).join('') +
    pad(n(r.stats.outerHTML.count)) +
    pad(n(Math.round(r.stats.outerHTML.chars / 1024)))
  );
}

// Per-element ratios for the baseline: this is what D1's "~14 computed-style
// reads per element" is actually claiming.
const base = rows[0];
console.log('');
console.log(`Per element (${n(elementCount)} elements), baseline:`);
for (const [k, short] of COLS) {
  const per = base.stats[k].count / elementCount;
  console.log(`  ${short.padEnd(6)} ${short === 'gPV' ? '' : ''}${per.toFixed(2).padStart(8)} per element   (${n(base.stats[k].count)} total)`);
}

if (top && rows.length > 1) {
  const ranked = rows.slice(1)
    .filter(r => r.label.startsWith('only-'))
    .sort((a, b) => b.stats.getPropertyValue.count - a.stats.getPropertyValue.count)
    .slice(0, top);
  console.log('');
  console.log(`Top ${ranked.length} rules by getPropertyValue:`);
  for (const r of ranked) {
    console.log(`  ${r.label.replace('only-', '').padEnd(34)} ${pad(n(r.stats.getPropertyValue.count))} gPV  ${pad(n(r.stats.getComputedStyle.count))} gCS`);
  }
}

if (jsonOut) {
  writeFileSync(resolve(jsonOut), JSON.stringify({
    axeCore: axeVersion(), page: pagePath, theme, viewport, elementCount, ranRules, rows,
  }, null, 2));
  console.log('');
  console.log(`raw: ${resolve(jsonOut)}`);
}
