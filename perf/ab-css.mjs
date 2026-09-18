// CSS cost attribution: print.css extras + rouge.css.
//
// Renders the book per variant, capturing a hybrid trace and pulling
// on-CPU time from the embedded V8 cpu profile (NOT wall-clock, which
// is too noisy at single-run granularity). For each metric of interest
// (cpu_total, recalcStyle, performLayout, ...) the tool computes the
// mean paired difference (baseline - variant) across N pairs and its
// SD. Paired differencing + Windows /affinity pinning (auto-relaunch
// below) brings per-pair variance down to ~3 % of baseline.
//
// **Default variants** (always run):
//   baseline-full       = print.css (all sections) + rouge.css
//   drop-rouge          = print.css (all sections); no rouge.css
//   drop-print-extras   = print.css (always-kept sections only) + rouge.css
//   baseline-minimal    = print.css (always-kept sections only); no rouge.css
//
// "Always-kept" print.css sections (paged.js needs them to paginate at
// the right page count): preamble + "Page geometry, running header,
// page numbers" + "Chapter boundaries".
//
// With these four variants the pairwise differences reveal:
//   baseline-full - drop-rouge        = rouge.css contribution
//   baseline-full - drop-print-extras = print.css extras contribution
//   baseline-full - baseline-minimal  = total CSS contribution
//
// **Optional per-section print.css sweep** (`--per-print-section`):
// adds one drop-print-<section> variant per `/* ---- Section ---- */`
// divider in print.css. Slower; previous runs showed all per-section
// deltas below the noise floor for this book, so off by default.
//
// Usage:
//   node ab-css.mjs                       # 4 variants, 3 pairs each
//   node ab-css.mjs --runs 5              # tighter SD, longer wall time
//   node ab-css.mjs --per-print-section   # also sweep each print.css section
//   node ab-css.mjs --out my-run          # results folder (default: ab-css)
//   node ab-css.mjs --no-affinity         # skip Windows CPU pinning

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pinCpuIfWindows } from './pin-cpu.mjs';
import { cpuStatsFromTrace } from './trace-cpu-stats.mjs';

// On Windows, re-launch under `start /affinity 0x5500 /high` to stabilise
// CPU sample-time. See pin-cpu.mjs for the rationale; the default mask
// targets cores 4..7 on an 8C16T Ryzen 7.
pinCpuIfWindows({ toolName: 'ab-css' });
if (process.env.PERF_PINNED) console.error(`[ab-css] Running pinned (PERF_PINNED=1).`);

// ---- CLI -------------------------------------------------------------
let outRoot = 'ab-css';
let pairs = 3;
let perPrintSection = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outRoot = args[++i];
  else if (args[i] === '--runs') pairs = parseInt(args[++i], 10);
  else if (args[i] === '--per-print-section') perPrintSection = true;
  else if (args[i] === '--no-affinity') { /* handled in the relaunch shim above */ }
  else if (args[i] === '-h' || args[i] === '--help') {
    console.error('usage: node ab-css.mjs [--runs N] [--out DIR] [--per-print-section]');
    console.error('');
    console.error('  Default: 3 top-level variants per stylesheet (baseline-full,');
    console.error('  drop-rouge, drop-print-extras, baseline-minimal). Run with');
    console.error('  --per-print-section to additionally sweep each /* ---- ---- */');
    console.error('  section of print.css (slower; per-section deltas tend to be');
    console.error('  below the noise floor on this book).');
    process.exit(0);
  } else {
    console.error('unknown arg: ' + args[i]);
    process.exit(2);
  }
}
if (pairs < 1) { console.error('--runs must be >= 1'); process.exit(2); }

// ---- File paths ------------------------------------------------------
const SITE_PDF = resolve('../docs/_site-pdf');
const PRINT_CSS_PATH = join(SITE_PDF, 'assets/css/print.css');
const ROUGE_CSS_PATH = join(SITE_PDF, 'assets/css/rouge.css');
const BOOK_HTML_PATH = join(SITE_PDF, 'book.html');
// Single generated CSS that book-ab.html links to. Per-variant we write
// it with whatever combination of print.css sections + rouge.css we want
// to test; book-ab.html drops the rouge.css link, so the only stylesheet
// the document loads is print-ab.css.
const SWAP_CSS_PATH = join(SITE_PDF, 'assets/css/print-ab.css');
const SWAP_HTML_PATH = join(SITE_PDF, 'book-ab.html');

const PRINT_CSS = readFileSync(PRINT_CSS_PATH, 'utf8');
const ROUGE_CSS = readFileSync(ROUGE_CSS_PATH, 'utf8');
const BOOK_HTML = readFileSync(BOOK_HTML_PATH, 'utf8');

// ---- Parse print.css into sections -----------------------------------
// Section divider: a comment whose body is `---- Name ----` (any number
// of dashes on each side, name in between). Handles both single-line and
// multi-line divider comments by anchoring on the `/* ----` prefix.
const dividerRe = /\/\*\s*-{3,}\s*([^\-\n*][^\n*]*?)\s*-{3,}/g;
const dividers = [];
let m;
while ((m = dividerRe.exec(PRINT_CSS))) dividers.push({ idx: m.index, name: m[1].trim() });
if (dividers.length < 2) {
  console.error('expected multiple `/* ---- Section ---- */` dividers in print.css; found ' + dividers.length);
  process.exit(3);
}
const sections = [];
if (dividers[0].idx > 0) sections.push({ name: '(preamble)', text: PRINT_CSS.slice(0, dividers[0].idx) });
for (let i = 0; i < dividers.length; i++) {
  const end = dividers[i + 1]?.idx ?? PRINT_CSS.length;
  sections.push({ name: dividers[i].name, text: PRINT_CSS.slice(dividers[i].idx, end) });
}
console.error(`parsed ${sections.length} sections (${PRINT_CSS.length} bytes total):`);
for (const s of sections) console.error(`  ${String(s.text.length).padStart(6)} bytes  ${s.name}`);
console.error('');

// Sections that are always kept (paged.js depends on them for pagination).
const ALWAYS_KEEP = new Set([
  '(preamble)',
  'Page geometry, running header, page numbers',
  'Chapter boundaries',
]);

// Slug for output dir naming.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'unnamed';

// ---- Variant list ----------------------------------------------------
// Each variant carries a `build()` that returns the full CSS string to
// be written into print-ab.css for that run. Always-kept print.css
// sections come from `sections.filter(s => ALWAYS_KEEP.has(s.name))`;
// "extras" means print.css minus always-kept.
const printAll       = sections.map(s => s.text).join('\n');
const printMinimal   = sections.filter(s => ALWAYS_KEEP.has(s.name)).map(s => s.text).join('\n');
const ROUGE_HEADER   = '\n/* ---- rouge.css inlined (concatenated by ab-css.mjs) ---- */\n';

const variants = [];
// Top-level variants -- always run.
variants.push({ label: 'baseline-full',       build: () => printAll     + ROUGE_HEADER + ROUGE_CSS });
variants.push({ label: 'drop-rouge',          build: () => printAll });
variants.push({ label: 'drop-print-extras',   build: () => printMinimal + ROUGE_HEADER + ROUGE_CSS });
variants.push({ label: 'baseline-minimal',    build: () => printMinimal });

// Optional per-section print.css sweep (opt-in via --per-print-section).
// Each drop-<section> keeps full rouge.css and full print.css minus the
// named section.
if (perPrintSection) {
  for (const s of sections) {
    if (ALWAYS_KEEP.has(s.name)) continue;
    variants.push({
      label: 'drop-print-' + slug(s.name),
      build: () => sections.filter(x => x.name !== s.name).map(x => x.text).join('\n') + ROUGE_HEADER + ROUGE_CSS,
    });
  }
}

// Swap book.html: replace the print.css link with print-ab.css, and
// drop the rouge.css link (its content is inlined into print-ab.css
// when the variant calls for it).
let swappedHtml = BOOK_HTML
  .replace('<link rel="stylesheet" href="assets/css/print.css">',
           '<link rel="stylesheet" href="assets/css/print-ab.css">')
  .replace(/\s*<link rel="stylesheet" href="assets\/css\/rouge\.css">/, '');
if (swappedHtml === BOOK_HTML) {
  console.error('failed to swap <link href=print.css> in book.html; aborting');
  process.exit(3);
}

// ---- Render + measure ------------------------------------------------
function runOnce(outDir) {
  const r = spawnSync('node', [
    'measure.mjs', SWAP_HTML_PATH,
    '--render-only', '--tracing',
    '--out', outDir,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const err = r.stderr?.toString() ?? '';
  if (r.status !== 0) {
    console.error(r.stdout?.toString() || '');
    console.error(err);
    throw new Error('measure.mjs failed with status ' + r.status);
  }
}

// Trace parsing lives in trace-cpu-stats.mjs, shared with ab-axe.mjs: the
// CrRendererMain filter, the JS-wrapper / V8-virtual frame exclusions, the
// Profile / ProfileChunk reconstruction and the per-sample Blink event-nest
// snapshot are identical for both rigs.  BLINK_LABELS is the default set of
// labels CPU time is attributed to (any appearance in the hybrid stack counts
// the sample, i.e. total-time semantics).

// ---- Main loop -------------------------------------------------------
// Paired interleaving: for each variant, capture N (A, variant) pairs
// back-to-back (baseline render, then variant render). Paired
// differences cancel machine-state drift far better than averaging
// independent runs.
const baselineLabel = 'baseline-full';
const baseline = variants.find(v => v.label === baselineLabel);
const others = variants.filter(v => v.label !== baselineLabel);
// Hold the baseline's stats per pair-index; baseline is sampled once
// per variant per pair (so it's re-measured under similar machine
// state to each variant). This costs more runs but yields paired data.
function runVariant(v, pairIdx) {
  const dirName = pairs > 1 ? `${v.label}-r${pairIdx + 1}` : v.label;
  const outDir = resolve(outRoot, dirName);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(SWAP_CSS_PATH, v.build());
  writeFileSync(SWAP_HTML_PATH, swappedHtml);
  runOnce(outDir);
  return cpuStatsFromTrace(join(outDir, 'trace.json'));
}

const results = []; // { label, perPair: [{statsBase, statsVariant} or {stats}] }
try {
  // Run the baselines separately first (no pairing for baselines vs themselves).
  const baselineRuns = [];
  for (let p = 0; p < pairs; p++) {
    const stats = runVariant(baseline, p);
    baselineRuns.push(stats);
    console.error(`  ${baseline.label} pair${p + 1}: cpu=${(stats.totalCpuUs/1000).toFixed(0)}ms recalc=${((stats.labelUs.get('Document::recalcStyle')||0)/1000).toFixed(0)}ms`);
  }
  results.push({ label: baseline.label, baselineRuns, isBaseline: true });

  for (const v of others) {
    const pairsData = [];
    for (let p = 0; p < pairs; p++) {
      // Re-measure baseline immediately before each variant pair to
      // pair the two against the same machine state.
      const statsBase = runVariant(baseline, p + pairs);  // separate dir
      const statsVar  = runVariant(v, p);
      pairsData.push({ statsBase, statsVariant: statsVar });
      const dB = statsBase.totalCpuUs / 1000;
      const dV = statsVar.totalCpuUs / 1000;
      const rB = (statsBase.labelUs.get('Document::recalcStyle') || 0) / 1000;
      const rV = (statsVar.labelUs.get('Document::recalcStyle') || 0) / 1000;
      console.error(`  ${v.label} pair${p + 1}: baseline cpu=${dB.toFixed(0)}/recalc=${rB.toFixed(0)}  variant cpu=${dV.toFixed(0)}/recalc=${rV.toFixed(0)}  Δcpu=${(dB-dV).toFixed(0)} Δrecalc=${(rB-rV).toFixed(0)}`);
    }
    results.push({ label: v.label, pairsData });
  }
} finally {
  for (const p of [SWAP_CSS_PATH, SWAP_HTML_PATH]) {
    try { rmSync(p, { force: true }); } catch {}
  }
}

// ---- Report ----------------------------------------------------------
const ms = (us) => (us || 0) / 1000;
const metricMs = (stats, name) => name === 'cpu_total' ? ms(stats.totalCpuUs) : ms(stats.labelUs.get(name));
const METRICS = [
  ['cpu_total',                              'cpu'],
  ['Document::recalcStyle',                  'recalc'],
  ['LocalFrameView::performLayout',          'layout'],
  ['Document::rebuildLayoutTree',            'rebuild'],
  ['InlineNode::ShapeTextIncludingFirstLine','shape'],
];
function meanSD(xs) {
  const n = xs.length;
  if (!n) return { mean: 0, sd: 0 };
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return { mean, sd: 0 };
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  return { mean, sd };
}

// Paired diff is (baseline - variant). Positive Δ means dropping the
// thing saved time, i.e. that thing was costly.

const H_LABEL = 36, H_NUM = 11;
const hdr = (s, w) => String(s).padStart(w);

console.log('');
console.log(`pairs=${pairs}  per-print-section=${perPrintSection}  (CPU sample-time from embedded V8 profile)`);
console.log('Δ = mean of paired (baseline − variant) across N pairs, ± SD');
console.log('');

const variantRows = results.filter(r => !r.isBaseline);
// Compute paired diffs per variant per metric.
function diffStats(v) {
  const out = new Map();
  for (const [metric] of METRICS) {
    const diffs = v.pairsData.map(p => metricMs(p.statsBase, metric) - metricMs(p.statsVariant, metric));
    out.set(metric, meanSD(diffs));
  }
  // Also store mean of variant's own metric across pairs (informational).
  const variantOwn = new Map();
  for (const [metric] of METRICS) {
    variantOwn.set(metric, meanSD(v.pairsData.map(p => metricMs(p.statsVariant, metric))));
  }
  return { diffs: out, own: variantOwn };
}
const variantStats = new Map(variantRows.map(v => [v.label, diffStats(v)]));

// Sort by mean Δrecalc descending (largest claimed cost first).
variantRows.sort((a, b) => {
  const da = variantStats.get(a.label).diffs.get('Document::recalcStyle').mean;
  const db = variantStats.get(b.label).diffs.get('Document::recalcStyle').mean;
  return db - da;
});

// Baseline row first (for context).
const baselineResult = results.find(r => r.isBaseline);
const baselineOwn = new Map();
for (const [metric] of METRICS) {
  baselineOwn.set(metric, meanSD(baselineResult.baselineRuns.map(s => metricMs(s, metric))));
}

console.log(
  'variant'.padEnd(H_LABEL) +
  METRICS.map(([_, short]) => hdr('Δ' + short, H_NUM)).join('') +
  hdr('  ± Δrecalc SD', 16)
);
console.log('-'.repeat(H_LABEL + H_NUM * METRICS.length + 16));

// Baseline row: own values, no Δ.
console.log(
  (baselineResult.label + ' (mean)').padEnd(H_LABEL) +
  METRICS.map(([metric]) => hdr(baselineOwn.get(metric).mean.toFixed(0), H_NUM)).join('') +
  ''
);
console.log(
  (baselineResult.label + ' (SD)').padEnd(H_LABEL) +
  METRICS.map(([metric]) => hdr(baselineOwn.get(metric).sd.toFixed(0), H_NUM)).join('') +
  ''
);

for (const v of variantRows) {
  const s = variantStats.get(v.label);
  const recalcSD = s.diffs.get('Document::recalcStyle').sd;
  console.log(
    v.label.padEnd(H_LABEL) +
    METRICS.map(([metric]) => hdr(s.diffs.get(metric).mean.toFixed(0), H_NUM)).join('') +
    hdr('± ' + recalcSD.toFixed(0), 16)
  );
}

console.log('');
console.log(`All numbers are CPU sample-time in ms (sum of V8 sample timeDeltas).`);
console.log(`Variant Δrecalc < 2*SD is consistent with zero -- below the noise floor.`);
console.log(`Per-variant traces saved under: ${resolve(outRoot)}/`);
