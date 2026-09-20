// A/B one variant across a page set, instead of across repeats of one page.
//
// The complement to ab-axe.mjs. That rig varies the rule set on a fixed page
// and reports on-CPU time from a trace; this one varies the *page* and reports
// interleaved wall-clock medians. Both have their place, and on this workload
// the second turned out to be the more trustworthy of the two:
//
//   ab-axe.mjs put `plain-color-fields` at -39 ms median (mean 49 +- 166) on
//   Select-Case and read it as a wash. Its baseline SD in the same run was 9.
//   A variant SD eighteen times the baseline's is not an effect size, it is a
//   broken measurement -- the tracer's overhead plus GC timing swamping a ~10 %
//   difference. This tool, untraced and interleaved, resolves the same page at
//   +10.6 % and the whole set at +26 %.
//
// Interleaving is per page per rep -- stock, patched, stock, patched -- so both
// sides see the same machine state, and each side gets its own fresh page load
// so neither inherits the other's JS context.
//
// Usage (run from perf/ or the repo root):
//   node ab-axe-pages.mjs --patch plain-color-fields
//   node ab-axe-pages.mjs --scheme config-only --reps 6
//   node ab-axe-pages.mjs --patch plain-color-fields --pages /a.html,/b.html
//
// Requires build.bat to have produced an up-to-date docs/_site-offline/.

import { resolve } from 'node:path';
import { pinCpuIfWindows } from './pin-cpu.mjs';
import {
  AXE_RUN_OPTIONS,
  DEFAULT_ROOT_DIR,
  SOURCE_PATCHES,
  SCHEMES,
  VIEWPORTS,
  axeVersion,
  getScheme,
  gotoPage,
  launchBrowser,
  newAuditPage,
  readAxeSource,
} from '../scripts/lib/axe-scan.mjs';

pinCpuIfWindows({ toolName: 'ab-axe-pages' });

// Ten real pages spanning the site's actual size range: five small ones around
// the original SAMPLE_PAGES cluster, and the four largest pages in the site.
//
// Deliberately not SAMPLE_PAGES. The gate's sample is chosen for construct
// coverage (scripts/pick_a11y_sample.mjs); this set is chosen to spread cost
// evenly across the size curve, which is what a cost A/B needs. They overlap on
// six pages and that is fine.
const DEFAULT_PAGES = [
  '/404.html',
  '/index.html',
  '/tB/Core/Dim.html',
  '/tB/Core/Select-Case.html',
  '/Documentation/Development/BuildInfo.html',
  '/tB/Modules/Interaction/index.html',
  '/tB/Packages/VB/PictureBox/index.html',
  '/tB/Packages/VB/Form/index.html',
  '/tB/Packages/VB/UserControl/index.html',
  '/Documentation/Development/Pipeline-Stages.html',
];

// ---- CLI -------------------------------------------------------------
let patchName = null;
let schemeName = null;
let pages = DEFAULT_PAGES;
let theme = 'light';
let viewport = 'desktop';
let reps = 4;
let iters = 2;
let rootDir = DEFAULT_ROOT_DIR;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--patch') patchName = args[++i];
  else if (a === '--scheme') schemeName = args[++i];
  else if (a === '--pages') pages = args[++i].split(',').map(s => s.trim()).filter(Boolean);
  else if (a === '--theme') theme = args[++i];
  else if (a === '--viewport') viewport = args[++i];
  else if (a === '--reps') reps = parseInt(args[++i], 10);
  else if (a === '--iters') iters = parseInt(args[++i], 10);
  else if (a === '--root-dir') rootDir = resolve(args[++i]);
  else if (a === '--no-affinity') { /* handled by the relaunch shim */ }
  else if (a === '-h' || a === '--help') {
    console.error('usage: node ab-axe-pages.mjs [--patch NAME | --scheme NAME]');
    console.error('                             [--pages P,P] [--reps N] [--iters N]');
    console.error('                             [--theme T] [--viewport V] [--no-affinity]');
    console.error('');
    console.error(`  patches: ${Object.keys(SOURCE_PATCHES).join(', ')}`);
    console.error(`  schemes: ${Object.keys(SCHEMES).join(', ')}`);
    process.exit(0);
  } else {
    console.error('unknown arg: ' + a);
    process.exit(2);
  }
}
if (!patchName && !schemeName) {
  console.error('nothing to compare: pass --patch NAME or --scheme NAME');
  process.exit(2);
}
if (patchName && schemeName) {
  console.error('--patch and --scheme are mutually exclusive');
  process.exit(2);
}

const scheme = schemeName ? getScheme(schemeName) : null;
const label = patchName ? `patch ${patchName}` : `scheme ${scheme.label}`;

// Both sides run the unminified bundle so the only difference is the variant
// itself -- comparing a patched axe.js against a stock axe.min.js would fold
// the parse-cost difference into the result.
const baseSource = readAxeSource({ minified: false });
const variantSource = patchName
  ? readAxeSource({ minified: false, patches: [patchName] })
  : baseSource;
const variantConfigure = scheme ? scheme.configure : null;
const variantOptions = scheme ? scheme.runOptions : AXE_RUN_OPTIONS;

// ---- Measure ---------------------------------------------------------
const browser = await launchBrowser();
const page = await newAuditPage(browser);
await page.setViewport(VIEWPORTS[viewport]);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

async function timeOne(src, filePath, configure, runOptions) {
  await gotoPage(page, { rootDir, filePath, theme });
  await page.evaluate(src);
  return page.evaluate(async (cfg, opts, n) => {
    if (cfg) axe.configure(cfg);
    await axe.run(document, opts);        // discard: lazy compile + warm caches
    const t0 = performance.now();
    for (let i = 0; i < n; i++) await axe.run(document, opts);
    return {
      ms: (performance.now() - t0) / n,
      elements: document.getElementsByTagName('*').length,
    };
  }, configure, runOptions, iters);
}

console.error(`[ab-axe-pages] axe-core ${axeVersion()}  ${label}`);
console.error(`[ab-axe-pages] ${pages.length} pages x ${reps} reps x ${iters} iters [${theme}, ${viewport}]`);
console.error('');

const rows = [];
try {
  for (const f of pages) {
    const baseMs = [], varMs = [];
    let elements = 0;
    for (let r = 0; r < reps; r++) {
      const b = await timeOne(baseSource, f, null, AXE_RUN_OPTIONS);
      const v = await timeOne(variantSource, f, variantConfigure, variantOptions);
      baseMs.push(b.ms);
      varMs.push(v.ms);
      elements = b.elements;
    }
    const mb = median(baseMs), mv = median(varMs);
    rows.push({ f, elements, base: mb, variant: mv });
    console.error(`  ${f.padEnd(48)} ${mb.toFixed(0).padStart(6)} -> ${mv.toFixed(0).padStart(6)} ms`);
  }
} finally {
  await browser.close();
}

// ---- Report ----------------------------------------------------------
const W = 48;
const pad = (s, w) => String(s).padStart(w);
const pct = (b, v) => (((b - v) / b) * 100).toFixed(1);

console.log('');
console.log(`${label}   reps=${reps} iters=${iters} [${theme}, ${viewport}]   axe-core ${axeVersion()}`);
console.log('Per-page median of interleaved baseline/variant pairs; wall clock, untraced.');
console.log('');
console.log('page'.padEnd(W) + pad('elems', 7) + pad('base', 9) + pad('variant', 9) + pad('delta', 8) + pad('pct', 7));
console.log('-'.repeat(W + 40));
for (const r of rows) {
  console.log(
    r.f.padEnd(W) + pad(r.elements, 7) +
    pad(r.base.toFixed(0), 9) + pad(r.variant.toFixed(0), 9) +
    pad((r.base - r.variant).toFixed(0), 8) + pad(pct(r.base, r.variant), 7)
  );
}

const sum = (rs, k) => rs.reduce((s, r) => s + r[k], 0);
const band = (name, rs) => {
  if (!rs.length) return;
  const b = sum(rs, 'base'), v = sum(rs, 'variant');
  console.log(
    ('  ' + name).padEnd(W + 7) + pad(b.toFixed(0), 9) + pad(v.toFixed(0), 9) +
    pad((b - v).toFixed(0), 8) + pad(pct(b, v), 7)
  );
};
console.log('-'.repeat(W + 40));
const tb = sum(rows, 'base'), tv = sum(rows, 'variant');
console.log(
  'TOTAL (one audit each)'.padEnd(W + 7) + pad(tb.toFixed(0), 9) + pad(tv.toFixed(0), 9) +
  pad((tb - tv).toFixed(0), 8) + pad(pct(tb, tv), 7)
);
band('small (<3k elements)', rows.filter(r => r.elements < 3000));
band('large (>=3k elements)', rows.filter(r => r.elements >= 3000));

console.log('');
console.log('Cost is super-linear in element count (k = 2.73 on real pages), so the large');
console.log('band dominates any total and the small band understates what a widened scan');
console.log('would see. Read the two bands, not just the total.');
