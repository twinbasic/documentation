// axe.run cost attribution: per-rule ablation + config-lever A/B.
//
// The sibling of ab-css.mjs, retargeted from CSS variants to axe rule sets.
// Same methodology, because this repo already settled it (see the header of
// ab-css.mjs and pin-cpu.mjs):
//
//   * on-CPU time from the embedded V8 profile, NOT wall clock, which is too
//     noisy at single-run granularity;
//   * Windows /affinity pinning, which takes single-run variance from 15-25 %
//     to ~3 % -- repeats without pinning just measure the noise more times;
//   * paired differencing against a baseline re-measured immediately before
//     each variant, reported as mean paired diff +- SD;
//   * plus one addition this rig needs and ab-css.mjs does not: warmup runs.
//     ab-css shells out to measure.mjs and so gets a fresh browser per run;
//     this rig drives one browser directly, and puppeteer reuses the renderer
//     across same-origin navigations, so V8 JIT state carries over.  --warmup
//     (default 3) discards the head of that curve.
//
// The measured region is ONE audit -- goto, theme, inject axe, then trace only
// `axe.run`.  Page load is deliberately outside the trace: after 78566d1 it is
// ~44 ms and axe.run is essentially everything else.
//
// **Variants.**  For each rule R named by --rules, two are generated:
//
//   drop-R   production rule set minus R
//   only-R   runOnly: { type: 'rule', values: [R] }
//
// `only-R` is exact: ruleShouldRun (axe.js:20569-20583) tests
// `runOnly.type === 'rule'` FIRST, before the explicit `rules[id].enabled`
// branch, so production's `heading-order: { enabled: true }` does not leak in.
//
// Having both halves is what separates a rule's own cost from the shared setup
// it gets billed for.  _createGrid, the VirtualNode caches and all 23 memo
// caches are lazy and are charged to whichever rule touches them first, so a
// single ablation cannot tell "contrast is expensive" from "contrast happens
// to be the rule that pays for the grid".  With both:
//
//   cost(R)  = baseline - drop-R          (R's marginal cost in a full run)
//   shared   = only-R   - cost(R)         (setup R pays for when alone)
//
// A `shared` that lands at roughly the same value for every R is the grid +
// tree + selector pre-pass, i.e. D1.  A `shared` that varies wildly by rule
// means the decomposition's additivity assumption does not hold and the
// numbers should not be cited.  Both outcomes are results.
//
// Named schemes from scripts/lib/axe-scan.mjs (no-html, no-selectors,
// no-autoplay-audio, config-only, ...) can be added as variants with
// --schemes, so the config-only landing option is measured by the same rig
// that measures the rules.
//
// Usage (run from perf/ or from the repo root):
//   node ab-axe.mjs                                  # baseline + 2-rule ablation
//   node ab-axe.mjs --runs 5                         # tighter SD, longer wall time
//   node ab-axe.mjs --rules color-contrast,link-name
//   node ab-axe.mjs --rules none --per-rule          # no ablation, just the timings
//   node ab-axe.mjs --schemes no-html,no-selectors,config-only
//   node ab-axe.mjs --per-rule                       # instrument 1 instead: per-rule
//                                                    # performance.measure table
//   node ab-axe.mjs --page /tB/Core/Dim.html --theme dark --viewport mobile
//   node ab-axe.mjs --light-trace                    # ~40 MB -> ~3 MB per trace
//   node ab-axe.mjs --warmup 0                       # measure the cold curve instead
//   node ab-axe.mjs --no-affinity                    # skip Windows CPU pinning
//
// Requires build.bat to have produced an up-to-date docs/_site-offline/.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pinCpuIfWindows } from './pin-cpu.mjs';
import { cpuStatsFromTrace, TRACE_CATEGORIES, TRACE_CATEGORIES_LIGHT } from './trace-cpu-stats.mjs';
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
  withRules,
} from '../scripts/lib/axe-scan.mjs';

// On Windows, re-launch under `start /affinity 0x5500 /high` to stabilise
// CPU sample-time. See pin-cpu.mjs for the rationale; the default mask
// targets cores 4..7 on an 8C16T Ryzen 7.
pinCpuIfWindows({ toolName: 'ab-axe' });
if (process.env.PERF_PINNED) console.error(`[ab-axe] Running pinned (PERF_PINNED=1).`);

// ---- CLI -------------------------------------------------------------
let outRoot = 'ab-axe';
let pairs = 3;
let rulesArg = 'color-contrast,no-autoplay-audio';
let schemesArg = '';
let pagePath = '/tB/Core/Select-Case.html';
let theme = 'light';
let viewport = 'desktop';
let rootDir = DEFAULT_ROOT_DIR;
let jsonOut = null;
let top = 0;
let perRule = false;
let noOnly = false;
let warmup = null;      // defaults per browser mode; see below
let freshBrowser = true;
let iters = 5;          // axe.run calls inside one traced window
let inPageWarmup = 1;   // axe.run calls before the trace starts
let minified = false;   // profile against axe.js: axe.min.js frames are single letters
let lightTrace = false; // drop the Blink categories; keeps only cpu_total

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') outRoot = args[++i];
  else if (a === '--runs') pairs = parseInt(args[++i], 10);
  else if (a === '--rules') rulesArg = args[++i];
  else if (a === '--schemes') schemesArg = args[++i];
  else if (a === '--page') pagePath = args[++i];
  else if (a === '--theme') theme = args[++i];
  else if (a === '--viewport') viewport = args[++i];
  else if (a === '--root-dir') rootDir = resolve(args[++i]);
  else if (a === '--json') jsonOut = args[++i];
  else if (a === '--per-rule') perRule = true;
  else if (a === '--top') top = parseInt(args[++i], 10);
  else if (a === '--no-only') noOnly = true;
  else if (a === '--warmup') warmup = parseInt(args[++i], 10);
  else if (a === '--iters') iters = parseInt(args[++i], 10);
  else if (a === '--in-page-warmup') inPageWarmup = parseInt(args[++i], 10);
  else if (a === '--reuse-browser') freshBrowser = false;
  else if (a === '--fresh-browser') freshBrowser = true;
  else if (a === '--minified') minified = true;
  else if (a === '--light-trace') lightTrace = true;
  else if (a === '--no-affinity') { /* handled in the relaunch shim above */ }
  else if (a === '-h' || a === '--help') {
    console.error('usage: node ab-axe.mjs [--runs N] [--out DIR] [--rules a,b] [--schemes a,b]');
    console.error('                       [--page PATH] [--theme T] [--viewport V] [--root-dir DIR]');
    console.error('                       [--per-rule] [--top N] [--no-only] [--iters N]');
    console.error('                       [--in-page-warmup N]');
    console.error('                       [--warmup N] [--reuse-browser] [--json FILE]');
    console.error('                       [--light-trace]   # ~40 MB -> ~3 MB per trace; no Blink columns');
    console.error('                       [--minified] [--no-affinity]');
    console.error('');
    console.error('  Default: baseline + drop-/only- variants for color-contrast and');
    console.error('  no-autoplay-audio, 3 pairs each, on Select-Case (light, desktop).');
    console.error('  --per-rule switches to instrument 1 (performanceTimer measures)');
    console.error('  instead of the ablation.');
    console.error('');
    console.error(`  schemes: ${Object.keys(SCHEMES).join(', ')}`);
    process.exit(0);
  } else {
    console.error('unknown arg: ' + a);
    process.exit(2);
  }
}
if (pairs < 1) { console.error('--runs must be >= 1'); process.exit(2); }
if (iters < 1) { console.error('--iters must be >= 1'); process.exit(2); }
if (!VIEWPORTS[viewport]) {
  console.error(`unknown viewport "${viewport}"; known: ${Object.keys(VIEWPORTS).join(', ')}`);
  process.exit(2);
}

// A fresh browser per run makes every run equally cold, so there is nothing
// to warm up.  Reusing one browser needs the head of the JIT curve discarded.
if (warmup === null) warmup = freshBrowser ? 0 : 3;

const ruleIds = (!rulesArg || rulesArg === 'none')
  ? []
  : rulesArg.split(',').map(s => s.trim()).filter(Boolean);
const schemeIds = schemesArg ? schemesArg.split(',').map(s => s.trim()).filter(Boolean) : [];

// ---- Variant list ----------------------------------------------------
// Each variant carries the axe.configure() spec (or null) and the axe.run()
// options for that run -- the direct analogue of ab-css.mjs's `build()`
// returning a stylesheet.
const BASELINE_LABEL = 'baseline';
const variants = [
  { label: BASELINE_LABEL, configure: null, runOptions: AXE_RUN_OPTIONS },
];

for (const id of ruleIds) {
  variants.push({
    label: `drop-${id}`,
    kind: 'drop', rule: id,
    configure: null,
    runOptions: { ...AXE_RUN_OPTIONS, rules: withRules({ [id]: { enabled: false } }) },
  });
  if (!noOnly) {
    variants.push({
      label: `only-${id}`,
      kind: 'only', rule: id,
      configure: null,
      // No `rules` map: runOnly.type === 'rule' short-circuits ruleShouldRun
      // before the explicit-enabled branch, so passing one would be inert at
      // best and misleading to read.
      runOptions: { runOnly: { type: 'rule', values: [id] } },
    });
  }
}

for (const id of schemeIds) {
  const s = getScheme(id);
  variants.push({
    label: s.label,
    kind: 'scheme',
    configure: s.configure,
    runOptions: s.runOptions,
    gates: s.gates,
  });
}

// ---- Browser ---------------------------------------------------------
const axeSource = readAxeSource({ minified });

// Browser lifecycle.
//
// Default is a fresh browser per measured run -- but note WHY, because the
// obvious reason is wrong and was tried first.
//
// Reusing one browser drifted badly (415 -> 596 ms over fifteen runs, SD 79 ms
// on a 467 ms mean -- 17 %, unpinned-grade, while pinned), and the natural
// conclusion was that the renderer accumulates state across same-origin
// navigations.  So: a fresh browser per run.  That made it WORSE, 461-780 ms on
// identical configurations, because a fresh context re-pays V8's lazy
// compilation of 1.3 MB of axe.js inside the measured window.
//
// The two real causes were the in-page warmup below and deferring trace
// parsing out of the run loop.  With those fixed the mode barely matters
// (SD ~2 %); fresh-per-run is kept as the default only because it starts from
// a known state.  --reuse-browser is the faster option for iteration, and
// wants a non-zero --warmup to discard the head of the JIT curve.
let browser = null;
let page = null;

async function openBrowser() {
  browser = await launchBrowser();
  page = await newAuditPage(browser);
  await page.setViewport(VIEWPORTS[viewport]);
}

async function closeBrowser() {
  if (!browser) return;
  await browser.close();
  browser = null;
  page = null;
}

/**
 * One measured audit.  Page load, theme application and axe injection all
 * happen before tracing starts, so the trace covers axe.run and nothing else.
 */
async function runOnce(v, outDir) {
  if (!browser) await openBrowser();
  await gotoPage(page, { rootDir, filePath: pagePath, theme });
  await page.evaluate(axeSource);

  // Pay V8's lazy compilation of axe.js BEFORE the trace starts.
  //
  // page.evaluate(axeSource) only runs axe's top level; V8 compiles function
  // bodies lazily, so the first axe.run in a context compiles most of the
  // library.  Leaving that inside the measured window was the whole noise
  // problem: a fresh browser per run put a full lazy-compile in every sample,
  // and cpu_total swung 461-780 ms on identical configurations.  One discarded
  // in-page run moves it out.  axe.teardown() (axe.js:30001-30010) clears
  // every memoized function, the cache and axe._tree between runs, so the
  // discarded run leaves no axe-side state behind -- only compiled code.
  if (inPageWarmup > 0) {
    await page.evaluate(
      async (cfg, opts, n) => {
        if (cfg) axe.configure(cfg);
        for (let i = 0; i < n; i++) await axe.run(document, opts);
      },
      v.configure, v.runOptions, inPageWarmup
    );
  }

  const tracePath = join(outDir, 'trace.json');
  await page.tracing.start({
    path: tracePath,
    screenshots: false,
    categories: lightTrace ? TRACE_CATEGORIES_LIGHT : TRACE_CATEGORIES,
  });

  const t0 = Date.now();
  const { nodeCount, measures } = await page.evaluate(
    async (cfg, opts, wantMeasures, n) => {
      if (cfg) axe.configure(cfg);
      for (let i = 0; i < n; i++) {
        await axe.run(document, wantMeasures ? { ...opts, performanceTimer: true } : opts);
      }
      return {
        nodeCount: document.getElementsByTagName('*').length,
        measures: wantMeasures
          ? performance.getEntriesByType('measure').map(e => ({ name: e.name, dur: e.duration }))
          : null,
      };
    },
    v.configure, v.runOptions, perRule, iters
  );
  const wallMs = Date.now() - t0;

  await page.tracing.stop();
  if (freshBrowser) await closeBrowser();

  // Trace parsing is deferred to after every run has been captured.  Doing it
  // here -- a synchronous JSON.parse of a multi-MB trace, on a four-core
  // affinity mask, immediately before the next browser launch -- put a large
  // and variable CPU burst between consecutive measurements.
  return { tracePath, wallMs: wallMs / iters, nodeCount, measures };
}

const pending = [];

/** Parse one deferred trace and fold its stats into the record, in place. */
function resolveStats(rec) {
  // Normalise to one audit so the numbers stay comparable with the per-page
  // tables in PLAN-axe-perf.md.
  const stats = cpuStatsFromTrace(rec.tracePath);
  rec.totalCpuUs = stats.totalCpuUs / iters;
  rec.nSamples = stats.nSamples;
  rec.labelUs = new Map();
  for (const [k, v] of stats.labelUs) rec.labelUs.set(k, v / iters);
  return rec;
}

async function runVariant(v, pairIdx) {
  const isWarmup = pairIdx < 0;
  const dirName = isWarmup ? `warmup-r${-pairIdx}`
    : pairs > 1 ? `${v.label}-r${pairIdx + 1}`
    : v.label;
  const outDir = resolve(outRoot, dirName);
  mkdirSync(outDir, { recursive: true });
  const rec = await runOnce(v, outDir);
  // A warmup run's trace is never read, so don't queue it for parsing.
  if (!isWarmup) pending.push(rec);
  return rec;
}

// ---- Main loop -------------------------------------------------------
// Paired interleaving, as in ab-css.mjs: for each variant, capture N
// (baseline, variant) pairs back-to-back.  Paired differences cancel
// machine-state drift far better than averaging independent runs.
const baseline = variants[0];
const others = variants.slice(1);

const ms = (us) => (us || 0) / 1000;
const metricMs = (stats, name) =>
  name === 'cpu_total' ? ms(stats.totalCpuUs)
  : name === 'wall' ? stats.wallMs
  : ms(stats.labelUs.get(name));

const METRICS = [
  ['cpu_total',                     'cpu'],
  ['Document::recalcStyle',         'recalc'],
  ['LocalFrameView::performLayout', 'layout'],
  ['Document::UpdateStyleAndLayout', 'upd'],
  ['wall',                          'wall'],
];

console.error(`[ab-axe] axe-core ${axeVersion()} (${minified ? 'axe.min.js' : 'axe.js'})`);
console.error(`[ab-axe] ${pagePath} [${theme}, ${viewport}]  root ${rootDir}`);
console.error(`[ab-axe] ${variants.length} variants x ${pairs} pair(s) x ${iters} iter(s), ` +
  `${inPageWarmup} in-page warmup, ${warmup} run warmup, ` +
  `${freshBrowser ? 'fresh browser per run' : 'one reused browser'}`);
console.error('');

// Run-level warmup: discarded whole runs, for --reuse-browser only.
//
// Not to be confused with --in-page-warmup, which is the one that matters.
// This knob exists because a reused browser carries V8 JIT state across
// same-origin navigations, so an unwarmed sequence drifts; the in-page warmup
// cannot absorb that because it happens inside each run. Default 0 under
// fresh-browser mode, 3 under --reuse-browser.
const results = [];
const perRuleMeasures = [];
try {
  for (let w = 0; w < warmup; w++) {
    const stats = await runVariant(baseline, -1 - w);
    console.error(`  [warmup ${w + 1}/${warmup}] wall=${stats.wallMs.toFixed(0)}ms/audit (discarded)`);
  }

  const baselineRuns = [];
  for (let p = 0; p < pairs; p++) {
    const stats = await runVariant(baseline, p);
    baselineRuns.push(stats);
    if (perRule && stats.measures) perRuleMeasures.push(stats.measures);
    console.error(`  ${baseline.label} pair${p + 1}: wall=${stats.wallMs.toFixed(0)}ms/audit (${stats.nodeCount} elements)`);
  }
  results.push({ label: baseline.label, baselineRuns, isBaseline: true });

  for (const v of others) {
    const pairsData = [];
    for (let p = 0; p < pairs; p++) {
      // Re-measure baseline immediately before each variant pair to pair the
      // two against the same machine state.
      const statsBase = await runVariant(baseline, p + pairs);   // separate dir
      const statsVar = await runVariant(v, p);
      pairsData.push({ statsBase, statsVariant: statsVar });
      console.error(`  ${v.label} pair${p + 1}: baseline wall=${statsBase.wallMs.toFixed(0)}  variant wall=${statsVar.wallMs.toFixed(0)}  Δwall=${(statsBase.wallMs - statsVar.wallMs).toFixed(0)}`);
    }
    results.push({ label: v.label, kind: v.kind, rule: v.rule, pairsData });
  }
} finally {
  await closeBrowser();
}

// Every run captured; now pay the trace parsing, where it cannot perturb a
// measurement.
console.error('');
console.error(`[ab-axe] parsing ${pending.length} traces...`);
for (const rec of pending) resolveStats(rec);

// ---- Report ----------------------------------------------------------
// Mean, SD and median.  The median is not decoration: even pinned, this
// workload throws the occasional run 30 % high (the audit is ~0.4 s, short
// enough that one stray scheduling event moves the whole number), and a
// three-pair mean is defenceless against that.  Cite the median; read the SD
// to decide whether the mean is trustworthy.
function meanSD(xs) {
  const n = xs.length;
  if (!n) return { mean: 0, sd: 0, median: 0 };
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const sorted = [...xs].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  if (n < 2) return { mean, sd: 0, median };
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  return { mean, sd, median };
}

// Paired diff is (baseline - variant). Positive Δ means dropping the thing
// saved time, i.e. that thing was costly.
function diffStats(v) {
  const diffs = new Map();
  for (const [metric] of METRICS) {
    diffs.set(metric, meanSD(
      v.pairsData.map(p => metricMs(p.statsBase, metric) - metricMs(p.statsVariant, metric))
    ));
  }
  const own = new Map();
  for (const [metric] of METRICS) {
    own.set(metric, meanSD(v.pairsData.map(p => metricMs(p.statsVariant, metric))));
  }
  return { diffs, own };
}

const variantRows = results.filter(r => !r.isBaseline);
const variantStats = new Map(variantRows.map(v => [v.label, diffStats(v)]));

const baselineResult = results.find(r => r.isBaseline);
const baselineOwn = new Map();
for (const [metric] of METRICS) {
  baselineOwn.set(metric, meanSD(baselineResult.baselineRuns.map(s => metricMs(s, metric))));
}

const H_LABEL = 30, H_NUM = 10;
const hdr = (s, w) => String(s).padStart(w);

console.log('');
console.log(`pairs=${pairs} iters=${iters}  page=${pagePath} [${theme}, ${viewport}]  (CPU sample-time from embedded V8 profile)`);
console.log('Δ = paired (baseline − variant); the headline number is the MEDIAN of the pairs.');
console.log('');
console.log(
  'variant'.padEnd(H_LABEL) +
  METRICS.map(([, short]) => hdr('Δ' + short, H_NUM)).join('') +
  hdr('cpu mean', H_NUM) + hdr('± SD', H_NUM)
);
console.log('-'.repeat(H_LABEL + H_NUM * (METRICS.length + 2)));
console.log(
  (baselineResult.label + ' (median)').padEnd(H_LABEL) +
  METRICS.map(([metric]) => hdr(baselineOwn.get(metric).median.toFixed(0), H_NUM)).join('') +
  hdr(baselineOwn.get('cpu_total').mean.toFixed(0), H_NUM) +
  hdr(baselineOwn.get('cpu_total').sd.toFixed(0), H_NUM)
);
for (const v of variantRows) {
  const st = variantStats.get(v.label);
  console.log(
    v.label.padEnd(H_LABEL) +
    METRICS.map(([metric]) => hdr(st.diffs.get(metric).median.toFixed(0), H_NUM)).join('') +
    hdr(st.diffs.get('cpu_total').mean.toFixed(0), H_NUM) +
    hdr('± ' + st.diffs.get('cpu_total').sd.toFixed(0), H_NUM)
  );
}

// ---- Decomposition ---------------------------------------------------
// cost(R) = baseline - drop-R;  shared = only-R - cost(R).  Reported only
// where both halves ran.
const decomposable = ruleIds.filter(
  id => variantStats.has(`drop-${id}`) && variantStats.has(`only-${id}`)
);
if (decomposable.length) {
  console.log('');
  console.log('Shared-setup decomposition (cpu_total):');
  console.log('  cost(R) = Δcpu of drop-R    -- R\'s marginal cost inside a full run');
  console.log('  shared  = only-R − cost(R)  -- setup R pays for when it runs alone');
  console.log('');
  console.log(
    'rule'.padEnd(H_LABEL) + hdr('cost(R)', 12) + hdr('only-R', 12) + hdr('shared', 12)
  );
  console.log('-'.repeat(H_LABEL + 36));
  for (const id of decomposable) {
    const cost = variantStats.get(`drop-${id}`).diffs.get('cpu_total').median;
    const only = variantStats.get(`only-${id}`).own.get('cpu_total').median;
    console.log(
      id.padEnd(H_LABEL) +
      hdr(cost.toFixed(0), 12) + hdr(only.toFixed(0), 12) + hdr((only - cost).toFixed(0), 12)
    );
  }
  console.log('');
  console.log('A `shared` that is roughly equal across rules is the flat tree + selector');
  console.log('pre-pass + _createGrid (D1).  One that varies wildly means the additive');
  console.log('model does not hold here and these numbers should not be cited.');
}

// ---- Per-rule measures (instrument 1) --------------------------------
if (perRule && perRuleMeasures.length) {
  // performance.getEntriesByType('measure') accumulates across the whole
  // traced window -- performanceTimer clears the marks (axe.js:20071-20073)
  // but not the measures -- so with --iters N each name appears N times and
  // has to be divided back down to one audit.
  const perRun = perRuleMeasures.map((measures) => {
    const byName = new Map();
    for (const m of measures) byName.set(m.name, (byName.get(m.name) || 0) + m.dur);
    for (const [k, v] of byName) byName.set(k, v / iters);
    return byName;
  });

  const names = new Set();
  for (const m of perRun) for (const k of m.keys()) names.add(k);
  const stat = (name) => meanSD(perRun.map((m) => m.get(name) || 0));

  console.log('');
  console.log(`Per-rule timing -- performanceTimer: true, ${perRun.length} baseline run(s) x ${iters} iter(s)`);
  console.log('');
  console.log('  phases:');
  for (const ph of ['axe', 'audit_start_to_end', 'audit.after', 'reporter']) {
    if (!names.has(ph)) continue;
    const st = stat(ph);
    console.log(`    ${ph.padEnd(22)} ${st.mean.toFixed(1).padStart(8)} ms  ± ${st.sd.toFixed(1)}`);
  }

  const rules = [...names]
    .filter((n) => n.startsWith('rule_') && !n.includes('#'))
    .map((n) => ({ id: n.slice('rule_'.length), st: stat(n) }))
    .sort((a, b) => b.st.mean - a.st.mean);

  console.log('');
  console.log(`  ${rules.length} rules ran:`);
  console.log(
    '    ' + 'rule'.padEnd(32) + 'total'.padStart(9) + '± SD'.padStart(8) +
    'gather'.padStart(9) + 'matches'.padStart(9) + 'checks'.padStart(9)
  );
  const shown = top > 0 ? rules.slice(0, top) : rules;
  for (const { id, st } of shown) {
    const g = stat(`rule_${id}#gather`).mean;
    const m = stat(`rule_${id}#matches`).mean;
    const c = stat(`runchecks_${id}`).mean;
    console.log(
      '    ' + id.padEnd(32) +
      st.mean.toFixed(1).padStart(9) + st.sd.toFixed(1).padStart(8) +
      g.toFixed(1).padStart(9) + m.toFixed(1).padStart(9) + c.toFixed(1).padStart(9)
    );
  }
  if (shown.length < rules.length) {
    console.log(`    ... ${rules.length - shown.length} more (raise --top)`);
  }

  console.log('');
  console.log('  CAVEAT: mark_rule_start_<id> / mark_rule_end_<id> are correct per rule,');
  console.log('  but _createGrid, the VirtualNode caches and all 23 memo caches are billed');
  console.log('  to whichever rule touches them FIRST. Cross-check the top row against the');
  console.log("  decomposition above before calling it that rule's cost.");
  console.log('  performanceTimer itself inflates the total; read the ranking, not absolutes.');

  writeFileSync(
    resolve(outRoot, 'per-rule-measures.json'),
    JSON.stringify({ iters, runs: perRuleMeasures }, null, 2)
  );
}

console.log('');
console.log('All numbers are per-audit CPU sample-time in ms (sum of V8 sample timeDeltas),');
console.log('except Δwall.  Variant Δcpu < 2*SD is consistent with zero -- below the noise');
console.log('floor.  Δrecalc / Δlayout sitting at 0 is the expected result, not a broken');
console.log('metric: PLAN-axe-perf.md predicts the grid build is the single layout flush.');
console.log('For a citable number use --runs 7 --iters 10; the defaults are for iteration.');
console.log(`Per-variant traces saved under: ${resolve(outRoot)}/`);
