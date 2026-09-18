// On-CPU time extraction from a hybrid Chrome trace.
//
// Shared by ab-css.mjs (book render, CSS variants) and ab-axe.mjs (a11y scan,
// rule variants).  Both need the same thing: the sum of V8 sample timeDeltas
// on the renderer main thread, optionally split by which Blink event was on
// the stack when each sample landed.
//
// Why sample-time and not wall clock: perf/ab-css.mjs's header says it
// plainly -- wall clock is too noisy at single-run granularity.  On-CPU time
// from the embedded V8 profile plus paired differencing plus pin-cpu.mjs's
// /affinity mask brings per-pair variance to ~3 %.
//
// A "hybrid" trace is one captured with TRACE_CATEGORIES below: Blink events
// AND, via disabled-by-default-v8.cpu_profiler, the V8 sampling profile
// inlined as Profile / ProfileChunk events.  That is what lets a sample be
// attributed to the Blink work it was nested inside.

import { readFileSync } from 'node:fs';

// Copied verbatim from measure.mjs's tracing block.  Categories chosen to
// crack open the cpu profile's (program) bucket: devtools.timeline gives
// Layout / RecalcStyles / ParseHTML / FunctionCall / EvaluateScript;
// disabled-by-default-devtools.timeline adds UpdateLayoutTree /
// InvalidateLayout / ScheduleStyleRecalc / HitTest; blink covers internal
// Blink events; v8 + v8.execute cover V8.GC* / V8.CompileCode /
// V8.RunMicrotasks / V8.Execute.  disabled-by-default-v8.cpu_profiler embeds
// V8 sampling-profile data as Profile / ProfileChunk events inline with the
// trace, giving JS call stacks aligned with Blink events when loaded in
// Chrome DevTools Performance or perfetto.dev (the hybrid view).
export const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'blink',
  'v8',
  'v8.execute',
  'disabled-by-default-v8.cpu_profiler',
];

// Wrapper events that surround V8 execution; filtered from event-nest
// reconstruction so they don't pollute "inner work" attribution.
export const JS_WRAPPER_NAMES = new Set([
  'RunTask', 'RunMicrotasks', 'FunctionCall', 'EvaluateScript',
  'V8.Execute', 'V8.RunMicrotasks', 'Task', 'ThreadControllerImpl::RunTask',
]);

// V8 virtual frames; filtered from JS lineage so they don't shadow named
// Blink work in the hybrid stack.
export const V8_VIRTUAL = new Set(['(root)', '(program)', '(idle)', '(garbage collector)', '']);

// Default labels we want CPU-attribution for.  The DevTools *display* names
// (Layout, UpdateLayoutTree, RecalcStyles) do not appear in these traces --
// these are the C++ symbols that do.
export const BLINK_LABELS = new Set([
  'Document::recalcStyle',
  'LocalFrameView::performLayout',
  'Document::UpdateStyleAndLayout',
  'Document::rebuildLayoutTree',
  'InlineNode::ShapeTextIncludingFirstLine',
  'Blink.Style.UpdateTime',
  'Blink.Layout.UpdateTime',
]);

/**
 * @param {string} tracePath  trace.json written by page.tracing.stop()
 * @param {Set<string>} [wantLabels]  labels to attribute time to
 * @returns {{totalCpuUs: number, labelUs: Map<string, number>, nSamples: number}}
 */
export function cpuStatsFromTrace(tracePath, wantLabels = BLINK_LABELS) {
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

  // Aggregate per-sample: total cpu + per-wantLabels totals (total-time
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
      if (wantLabels.has(name) && !seen.has(name)) {
        seen.add(name);
        labelUs.set(name, (labelUs.get(name) || 0) + s.deltaUs);
      }
    }
    for (const name of evStack) {
      if (wantLabels.has(name) && !seen.has(name)) {
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
