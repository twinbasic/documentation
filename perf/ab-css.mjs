// Per-section CSS cost attribution.
//
// Parses docs/_site-pdf/assets/css/print.css into themed sections by its
// existing `/* ---- Section name ---- */` dividers, then renders the book
// once per variant (full CSS, minimal-required CSS, and full minus each
// individual section in turn -- or minimal plus each section in turn).
// For each render we capture a hybrid trace and pull on-CPU time from
// the embedded V8 cpu profile -- NOT wall-clock, which is too noisy at
// single-run granularity. CPU sample-time is machine-load-independent
// (preempted intervals don't sample), so one run per variant is enough.
//
// Output is a table of per-section deltas:
//
//   cpu_total_ms = sum of all V8 cpu sample deltas (whole render)
//   recalc_ms    = sum of deltas where Document::recalcStyle is in the
//                  hybrid stack (V8 lineage + Blink event nest)
//   layout_ms    = same for LocalFrameView::performLayout
//   Δ*           = baseline-full minus variant (subtract) or variant
//                  minus baseline-minimal (add)
//
// Usage:
//   node ab-css.mjs                # subtractive sweep, 1 run/variant
//   node ab-css.mjs --mode add     # additive (minimal + 1 section)
//   node ab-css.mjs --only typography,headings  # filter variants
//   node ab-css.mjs --out my-run   # results folder name (default: ab-css)
//
// Always-kept sections (not dropped/added; required for paged.js to
// paginate at roughly the right page count): preamble, "Page geometry,
// running header, page numbers", "Chapter boundaries".

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

// ---- CLI -------------------------------------------------------------
let mode = 'subtract';
let outRoot = 'ab-css';
let onlyFilter = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode') mode = args[++i];
  else if (args[i] === '--out') outRoot = args[++i];
  else if (args[i] === '--only') onlyFilter = args[++i].split(',').map(s => s.trim().toLowerCase());
  else if (args[i] === '-h' || args[i] === '--help') {
    console.error('usage: node ab-css.mjs [--mode subtract|add] [--out DIR] [--only NAME[,NAME...]]');
    process.exit(0);
  } else {
    console.error('unknown arg: ' + args[i]);
    process.exit(2);
  }
}
if (mode !== 'subtract' && mode !== 'add') {
  console.error('--mode must be "subtract" or "add"');
  process.exit(2);
}

// ---- File paths ------------------------------------------------------
const SITE_PDF = resolve('../docs/_site-pdf');
const PRINT_CSS_PATH = join(SITE_PDF, 'assets/css/print.css');
const BOOK_HTML_PATH = join(SITE_PDF, 'book.html');
const SWAP_CSS_PATH = join(SITE_PDF, 'assets/css/print-ab.css');
const SWAP_HTML_PATH = join(SITE_PDF, 'book-ab.html');

const PRINT_CSS = readFileSync(PRINT_CSS_PATH, 'utf8');
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
// "baseline-full" + "baseline-minimal" run unconditionally for comparison.
// Then, for each non-kept section, either drop it (subtract) or add it on
// top of minimal (add).
const variants = [];
variants.push({ label: 'baseline-full',    keep: () => sections.map(s => s.name) });
variants.push({ label: 'baseline-minimal', keep: () => sections.filter(s => ALWAYS_KEEP.has(s.name)).map(s => s.name) });
for (const s of sections) {
  if (ALWAYS_KEEP.has(s.name)) continue;
  if (onlyFilter && !onlyFilter.some(f => s.name.toLowerCase().includes(f))) continue;
  if (mode === 'subtract') {
    variants.push({
      label: 'drop-' + slug(s.name),
      keep: () => sections.filter(x => x.name !== s.name).map(x => x.name),
    });
  } else {
    variants.push({
      label: 'add-' + slug(s.name),
      keep: () => [...sections.filter(x => ALWAYS_KEEP.has(x.name)).map(x => x.name), s.name],
    });
  }
}

const cssFor = (keepNames) => sections.filter(s => keepNames.includes(s.name)).map(s => s.text).join('\n');
const swappedHtml = BOOK_HTML.replace(
  '<link rel="stylesheet" href="assets/css/print.css">',
  '<link rel="stylesheet" href="assets/css/print-ab.css">',
);
if (swappedHtml === BOOK_HTML) {
  console.error('failed to swap <link href=print.css> in book.html; aborting');
  process.exit(3);
}

// ---- Render + measure ------------------------------------------------
function runOnce(outDir) {
  const r = spawnSync('node', [
    'measure.mjs', SWAP_HTML_PATH,
    '--detach-pages', '--no-timing', '--render-only', '--tracing',
    '--out', outDir,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const err = r.stderr?.toString() ?? '';
  if (r.status !== 0) {
    console.error(r.stdout?.toString() || '');
    console.error(err);
    throw new Error('measure.mjs failed with status ' + r.status);
  }
}

// Wrapper events that surround V8 execution; filtered from event-nest
// reconstruction so they don't pollute "inner work" attribution.
const JS_WRAPPER_NAMES = new Set([
  'RunTask', 'RunMicrotasks', 'FunctionCall', 'EvaluateScript',
  'V8.Execute', 'V8.RunMicrotasks', 'Task', 'ThreadControllerImpl::RunTask',
]);
// V8 virtual frames; filtered from JS lineage so they don't shadow named
// Blink work in the hybrid stack.
const V8_VIRTUAL = new Set(['(root)', '(program)', '(idle)', '(garbage collector)', '']);
// Labels we want CPU-attribution for (any appearance in the hybrid stack
// counts the sample for total-time semantics).
const WANT_LABELS = new Set([
  'Document::recalcStyle',
  'LocalFrameView::performLayout',
  'Document::UpdateStyleAndLayout',
  'Document::rebuildLayoutTree',
  'InlineNode::ShapeTextIncludingFirstLine',
  'Blink.Style.UpdateTime',
  'Blink.Layout.UpdateTime',
]);

function cpuStatsFromTrace(tracePath) {
  const t = JSON.parse(readFileSync(tracePath, 'utf8'));
  const events = Array.isArray(t) ? t : t.traceEvents;

  // CrRendererMain thread key(s).
  const mainKeys = new Set();
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain') {
      mainKeys.add(e.pid + '.' + e.tid);
    }
  }

  // Main-thread X-events, minus JS-entry wrappers.
  const mainEvents = [];
  for (const e of events) {
    if (e.ph !== 'X' || typeof e.dur !== 'number' || e.dur <= 0) continue;
    if (!mainKeys.has(e.pid + '.' + e.tid)) continue;
    if (JS_WRAPPER_NAMES.has(e.name)) continue;
    mainEvents.push({ ts: e.ts, end: e.ts + e.dur, name: e.name });
  }

  // V8 cpu profile reconstruction.
  const profiles = new Map();
  for (const e of events) {
    if (e.name !== 'Profile' && e.name !== 'ProfileChunk') continue;
    const id = e.id || (e.args?.id) || '0x1';
    if (!profiles.has(id)) profiles.set(id, { startTime: null, nodes: new Map(), samples: [], deltas: [] });
    const p = profiles.get(id);
    if (e.name === 'Profile') {
      const d = e.args?.data;
      if (d && typeof d.startTime === 'number') p.startTime = d.startTime;
      continue;
    }
    const d = e.args?.data;
    if (!d) continue;
    if (d.cpuProfile?.nodes) for (const n of d.cpuProfile.nodes) p.nodes.set(n.id, n);
    if (d.cpuProfile?.samples) for (const sid of d.cpuProfile.samples) p.samples.push(sid);
    if (d.timeDeltas) for (const dt of d.timeDeltas) p.deltas.push(dt);
  }
  const allSamples = [];
  const nodes = new Map();
  for (const p of profiles.values()) {
    for (const [k, v] of p.nodes) nodes.set(k, v);
    if (p.startTime == null) continue;
    let tcur = p.startTime;
    for (let i = 0; i < p.samples.length; i++) {
      const dt = p.deltas[i] || 0;
      tcur += dt;
      allSamples.push({ ts: tcur, nodeId: p.samples[i], deltaUs: dt });
    }
  }
  allSamples.sort((a, b) => a.ts - b.ts);
  if (!allSamples.length) throw new Error('no V8 cpu samples in trace (cpu_profiler category missing?)');

  // Event-nest snapshot per sample via timeline merge: end < start < sample.
  const TYPE_END = 0, TYPE_START = 1, TYPE_SAMPLE = 2;
  const timeline = new Array(mainEvents.length * 2 + allSamples.length);
  let wi = 0;
  for (const ev of mainEvents) {
    timeline[wi++] = { ts: ev.ts, type: TYPE_START, ev };
    timeline[wi++] = { ts: ev.end, type: TYPE_END, ev };
  }
  for (const s of allSamples) timeline[wi++] = { ts: s.ts, type: TYPE_SAMPLE, s };
  timeline.sort((a, b) => a.ts - b.ts || a.type - b.type);
  const active = [];
  for (const item of timeline) {
    if (item.type === TYPE_START) active.push(item.ev);
    else if (item.type === TYPE_END) {
      const top = active[active.length - 1];
      if (top === item.ev) active.pop();
      else { const i = active.lastIndexOf(item.ev); if (i >= 0) active.splice(i, 1); }
    } else {
      item.s.eventStackNames = active.length ? active.map(e => e.name) : null;
    }
  }

  // V8 lineage per node (filter virtual frames). Cached.
  const lineageCache = new Map();
  function lineageNamesOf(id) {
    if (lineageCache.has(id)) return lineageCache.get(id);
    const out = [];
    let cur = id, g = 0;
    while (cur != null && g++ < 4096) {
      const n = nodes.get(cur);
      if (!n) break;
      const fn = n.callFrame?.functionName || '';
      if (!V8_VIRTUAL.has(fn)) out.push(fn || '(anonymous)');
      cur = n.parent;
    }
    lineageCache.set(id, out);
    return out;
  }

  // Aggregate per-sample: total cpu + per-WANT_LABEL totals (total-time
  // semantics: count once per sample if the label appears anywhere in
  // the hybrid stack).
  let totalUs = 0;
  const labelUs = new Map();
  for (const s of allSamples) {
    totalUs += s.deltaUs;
    const jsLineage = lineageNamesOf(s.nodeId);
    const evStack = s.eventStackNames || [];
    // hybrid stack = jsRootToLeaf ++ eventOuterToInner (we don't care
    // about order for total-time semantics; just need set membership).
    const seen = new Set();
    for (const name of jsLineage) {
      if (WANT_LABELS.has(name) && !seen.has(name)) {
        seen.add(name);
        labelUs.set(name, (labelUs.get(name) || 0) + s.deltaUs);
      }
    }
    for (const name of evStack) {
      if (WANT_LABELS.has(name) && !seen.has(name)) {
        seen.add(name);
        labelUs.set(name, (labelUs.get(name) || 0) + s.deltaUs);
      }
    }
  }

  return {
    totalCpuUs: totalUs,
    labelUs,
    nSamples: allSamples.length,
  };
}

// ---- Main loop -------------------------------------------------------
const results = [];
try {
  for (const v of variants) {
    const keep = v.keep();
    const cssText = cssFor(keep);
    const outDir = resolve(outRoot, v.label);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(SWAP_CSS_PATH, cssText);
    writeFileSync(SWAP_HTML_PATH, swappedHtml);
    runOnce(outDir);
    const stats = cpuStatsFromTrace(join(outDir, 'trace.json'));
    results.push({ label: v.label, kept: keep, stats });
    const totalMs = stats.totalCpuUs / 1000;
    const recMs = (stats.labelUs.get('Document::recalcStyle') || 0) / 1000;
    const layMs = (stats.labelUs.get('LocalFrameView::performLayout') || 0) / 1000;
    console.error(`  ${v.label}: cpu_total=${totalMs.toFixed(0)}ms  recalc=${recMs.toFixed(0)}ms  layout=${layMs.toFixed(0)}ms  (${stats.nSamples} samples)`);
  }
} finally {
  for (const p of [SWAP_CSS_PATH, SWAP_HTML_PATH]) {
    try { rmSync(p, { force: true }); } catch {}
  }
}

// ---- Report ----------------------------------------------------------
const baseFull = results.find(r => r.label === 'baseline-full');
const baseMin  = results.find(r => r.label === 'baseline-minimal');
const baseFor  = mode === 'subtract' ? baseFull : baseMin;

const ms = (us) => (us || 0) / 1000;
const labelMs = (r, name) => ms(r.stats.labelUs.get(name));

const H_LABEL = 38, H_NUM = 10;
const hdr = (s, w) => String(s).padStart(w);

console.log('');
console.log(`mode=${mode}  delta-baseline=${baseFor?.label || 'none'}  (CPU sample-time from embedded V8 profile)`);
console.log('');
console.log(
  'variant'.padEnd(H_LABEL) +
  hdr('cpu_total', H_NUM) +
  hdr('recalc', H_NUM) +
  hdr('layout', H_NUM) +
  hdr('rebuild', H_NUM) +
  hdr('shape', H_NUM) +
  hdr('Δtotal', H_NUM) +
  hdr('Δrecalc', H_NUM)
);
console.log('-'.repeat(H_LABEL + H_NUM * 7));

const sign = mode === 'subtract' ? -1 : 1;
const baseTotal  = baseFor ? ms(baseFor.stats.totalCpuUs) : 0;
const baseRecalc = baseFor ? labelMs(baseFor, 'Document::recalcStyle') : 0;
const variantRows = results.filter(r => r !== baseFull && r !== baseMin);
variantRows.sort((a, b) => {
  const da = sign * (ms(a.stats.totalCpuUs) - baseTotal);
  const db = sign * (ms(b.stats.totalCpuUs) - baseTotal);
  return db - da;
});
const display = [baseFull, baseMin, ...variantRows].filter(Boolean);

for (const r of display) {
  const total  = ms(r.stats.totalCpuUs);
  const recalc = labelMs(r, 'Document::recalcStyle');
  const layout = labelMs(r, 'LocalFrameView::performLayout');
  const rebuild = labelMs(r, 'Document::rebuildLayoutTree');
  const shape   = labelMs(r, 'InlineNode::ShapeTextIncludingFirstLine');
  let dTotal = '-', dRecalc = '-';
  if (baseFor && r !== baseFor) {
    dTotal  = (sign * (total - baseTotal)).toFixed(0);
    dRecalc = (sign * (recalc - baseRecalc)).toFixed(0);
  }
  console.log(
    r.label.padEnd(H_LABEL) +
    hdr(total.toFixed(0), H_NUM) +
    hdr(recalc.toFixed(0), H_NUM) +
    hdr(layout.toFixed(0), H_NUM) +
    hdr(rebuild.toFixed(0), H_NUM) +
    hdr(shape.toFixed(0), H_NUM) +
    hdr(dTotal, H_NUM) +
    hdr(dRecalc, H_NUM)
  );
}

console.log('');
console.log(`All columns are CPU sample-time in ms (sum of V8 sample timeDeltas).`);
console.log(`recalc / layout / rebuild / shape = total-time of each Blink event`);
console.log(`  (any sample whose hybrid stack contains the label).`);
console.log(`Δ columns = ${mode === 'subtract'
  ? 'baseline-full MINUS variant  (positive = "this section costs about this much")'
  : 'variant MINUS baseline-minimal  (positive = "adding this section adds about this much")'}`);
console.log(`Always-kept sections: preamble + Page geometry + Chapter boundaries.`);
console.log(`Per-variant traces saved under: ${resolve(outRoot)}/`);
