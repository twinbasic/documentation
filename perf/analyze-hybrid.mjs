// Bottom-up analyzer for a HYBRID Chrome trace.
//
// Reads a trace.json that contains BOTH Blink/V8 trace events AND an
// embedded V8 cpu sampling profile (delivered as Profile / ProfileChunk
// events when the trace is captured with the
// disabled-by-default-v8.cpu_profiler category, as `node measure.mjs
// --tracing` does). Produces a single bottom-up table that mixes
// JS function names with named Blink/V8 events -- the missing piece
// that neither analyze-profile.mjs (cpu profile alone, can't name
// `(program)`) nor analyze-trace.mjs (Blink events alone, can't see
// JS frames) can give on their own.
//
// Usage:
//   node analyze-hybrid.mjs <path/to/trace.json> [--top N] [--min-pct P]
//                           [--thread <name>] [--callees <label>]
//
// Defaults: --top 30, --min-pct 0.1, thread = CrRendererMain.
//
// The model: build a combined "hybrid stack" at each cpu sample as
//   [ JS frames root->leaf ]  ++  [ Blink events outer->inner, filtered ]
// where the JS frames come from the V8 cpu profile node lineage
// (filtering virtual frames -- (root), (program), (idle), (garbage
// collector)) and the Blink events come from the trace's X-event nest
// active at the sample's timestamp on the renderer main thread
// (filtering "JS-entry" wrappers -- RunTask, RunMicrotasks, FunctionCall,
// EvaluateScript, V8.Execute, V8.RunMicrotasks -- which aren't part of
// the per-page work the user cares about).
//
// JS is outer, real Blink work is inner. This matches the actual stack
// shape during a synchronous layout flush: a JS frame (e.g. findOverflow)
// calls into a V8 binding (e.g. getBoundingClientRect), the binding
// enters Blink, and Blink runs nested layout/style work (performLayout,
// recalcStyle, ...) before returning. The leaf of the combined stack is
// what's "actually running" at sample time: a JS function when V8 is
// executing JS, a Blink event when V8 is idle inside the binding.
//
// Default mode: aggregate self-time by combined-stack leaf and print
// top-N. Equivalent to bottom-up view in DevTools' Performance panel
// when grouped by event/function name.
//
// --callees <label> mode: for every sample whose combined stack contains
// <label>, attribute the next-deeper stack entry to <label> as a callee.
// If <label> matches both a JS function name and a Blink event name in
// the trace, both attributions are pooled (you're asking "what runs
// inside this label" regardless of which axis the label lives on). The
// synthetic "(self / unattributed)" row covers samples where <label> is
// the leaf of the combined stack.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let tracePath = null;
let topN = 30;
let minPct = 0.1;
let threadName = 'CrRendererMain';
let calleesOf = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--top') topN = parseInt(args[++i], 10);
  else if (a === '--min-pct') minPct = parseFloat(args[++i]);
  else if (a === '--thread') threadName = args[++i];
  else if (a === '--callees') calleesOf = args[++i];
  else if (!tracePath) tracePath = a;
}
if (!tracePath) {
  console.error('usage: node analyze-hybrid.mjs <path> [--top N] [--min-pct P] [--thread NAME] [--callees LABEL]');
  process.exit(2);
}
tracePath = resolve(process.cwd(), tracePath);

const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
const events = Array.isArray(trace) ? trace : (trace.traceEvents || []);

// --- Thread / process metadata ----------------------------------------
const threadKeyByName = new Map(); // name -> Set of `${pid}.${tid}`
const threadNames = new Map();     // `${pid}.${tid}` -> name
for (const e of events) {
  if (e.ph !== 'M' || !e.args) continue;
  if (e.name === 'thread_name' && e.args.name) {
    const tk = `${e.pid}.${e.tid}`;
    threadNames.set(tk, e.args.name);
    if (!threadKeyByName.has(e.args.name)) threadKeyByName.set(e.args.name, new Set());
    threadKeyByName.get(e.args.name).add(tk);
  }
}
const mainThreadKeys = threadKeyByName.get(threadName);
if (!mainThreadKeys || !mainThreadKeys.size) {
  console.error(`no thread named "${threadName}". Threads present:`);
  for (const [tk, name] of threadNames) console.error(`  ${name}  (${tk})`);
  process.exit(3);
}

// --- Trace X-events on the target thread ------------------------------
// We collect them as flat (ts, dur, name) records; the timeline walk
// below reconstructs nesting via start/end ordering. "JS-entry" wrapper
// events are dropped so they don't appear in the combined stack -- they
// surround JS execution but aren't part of the work we want to attribute.
const JS_WRAPPER_NAMES = new Set([
  'RunTask',
  'RunMicrotasks',
  'FunctionCall',
  'EvaluateScript',
  'V8.Execute',
  'V8.RunMicrotasks',
  'Task',
  'ThreadControllerImpl::RunTask',
]);
const mainEvents = [];
for (const e of events) {
  if (e.ph !== 'X' || typeof e.dur !== 'number' || e.dur <= 0) continue;
  if (!mainThreadKeys.has(`${e.pid}.${e.tid}`)) continue;
  if (JS_WRAPPER_NAMES.has(e.name)) continue;
  mainEvents.push({ ts: e.ts, dur: e.dur, end: e.ts + e.dur, name: e.name });
}

// --- V8 cpu profile reconstruction ------------------------------------
// Collect every Profile + ProfileChunk; pair by `id`. nodes accumulate
// across chunks; samples and timeDeltas concatenate. Sample absolute
// timestamps are Profile.startTime + cumulative sum of timeDeltas.
const profilesById = new Map(); // id -> { startTime, nodes:Map(id->node), samples:[nodeId], deltas:[us] }
for (const e of events) {
  if (e.name !== 'Profile' && e.name !== 'ProfileChunk') continue;
  const id = e.id || (e.args && e.args.id) || '0x1';
  if (!profilesById.has(id)) {
    profilesById.set(id, { startTime: null, nodes: new Map(), samples: [], deltas: [] });
  }
  const p = profilesById.get(id);
  if (e.name === 'Profile') {
    const d = e.args && e.args.data;
    if (d && typeof d.startTime === 'number') p.startTime = d.startTime;
    continue;
  }
  // ProfileChunk
  const d = e.args && e.args.data;
  if (!d) continue;
  if (d.cpuProfile) {
    if (Array.isArray(d.cpuProfile.nodes)) {
      for (const n of d.cpuProfile.nodes) p.nodes.set(n.id, n);
    }
    if (Array.isArray(d.cpuProfile.samples)) {
      for (const sid of d.cpuProfile.samples) p.samples.push(sid);
    }
  }
  if (Array.isArray(d.timeDeltas)) {
    for (const dt of d.timeDeltas) p.deltas.push(dt);
  }
}

// Pick the largest profile (in practice always one). Anything else gets
// folded in for completeness.
const allSamples = []; // { ts, nodeId, deltaUs }
let nodes = new Map();
for (const p of profilesById.values()) {
  for (const [k, v] of p.nodes) nodes.set(k, v);
  if (p.startTime == null) continue;
  let t = p.startTime;
  for (let i = 0; i < p.samples.length; i++) {
    const dt = p.deltas[i] || 0;
    t += dt;
    allSamples.push({ ts: t, nodeId: p.samples[i], deltaUs: dt });
  }
}
allSamples.sort((a, b) => a.ts - b.ts);
if (!allSamples.length) {
  console.error('no cpu samples found in trace (was the disabled-by-default-v8.cpu_profiler category enabled at capture time?)');
  process.exit(3);
}

// --- V8 node lineage cache --------------------------------------------
// For each node id, the chain leaf->root of callFrames, filtered to drop
// virtual frames so they don't appear as JS callees / leaves.
const VIRTUAL_NAMES = new Set(['(root)', '(program)', '(idle)', '(garbage collector)', '']);
const lineageCache = new Map(); // nodeId -> { jsFrames:[name leaf->root], rawLeaf:string }
function lineageOf(id) {
  if (lineageCache.has(id)) return lineageCache.get(id);
  const frames = [];
  let leafName = null;
  let cur = id;
  let guard = 0;
  while (cur != null && guard++ < 4096) {
    const n = nodes.get(cur);
    if (!n) break;
    const cf = n.callFrame || {};
    const fn = cf.functionName || '';
    if (leafName == null) leafName = fn || '(anonymous)';
    if (!VIRTUAL_NAMES.has(fn)) frames.push(fn || '(anonymous)');
    cur = n.parent;
  }
  const out = { jsFrames: frames, rawLeaf: leafName || '(unknown)' };
  lineageCache.set(id, out);
  return out;
}

// --- Build per-sample enclosing event-stack ---------------------------
// Walk a timeline of (start, end, sample) markers sorted by (ts, type)
// where type order is end < start < sample within ties. The active stack
// at each sample marker is the chain of enclosing events outer->inner;
// store as a snapshot. Snapshots share suffix arrays where possible
// (not done here -- memory is fine, ~20k samples * ~8 events = ~160k
// refs, all small).
const TIMELINE_END = 0, TIMELINE_START = 1, TIMELINE_SAMPLE = 2;
const timeline = new Array(mainEvents.length * 2 + allSamples.length);
let wi = 0;
for (const ev of mainEvents) {
  timeline[wi++] = { ts: ev.ts, type: TIMELINE_START, ev };
  timeline[wi++] = { ts: ev.end, type: TIMELINE_END, ev };
}
for (const s of allSamples) {
  timeline[wi++] = { ts: s.ts, type: TIMELINE_SAMPLE, s };
}
timeline.sort((a, b) => a.ts - b.ts || a.type - b.type);

const activeStack = [];
for (const item of timeline) {
  if (item.type === TIMELINE_START) {
    activeStack.push(item.ev);
  } else if (item.type === TIMELINE_END) {
    // Usually the top; if not (e.g. degenerate trace), pop by ref.
    const top = activeStack[activeStack.length - 1];
    if (top === item.ev) activeStack.pop();
    else {
      const idx = activeStack.lastIndexOf(item.ev);
      if (idx >= 0) activeStack.splice(idx, 1);
    }
  } else {
    // sample: snapshot stack (event name chain, outer->inner)
    item.s.eventStack = activeStack.length
      ? activeStack.map(e => e.name)
      : null;
  }
}

// --- Build combined hybrid stack per sample ---------------------------
// hybridStack[i] = jsFrames (root->leaf) ++ eventStack (outer->inner)
// All entries are plain strings. The leaf of this combined stack is
// what self-time gets attributed to.
function hybridStackFor(s) {
  const evStack = s.eventStack || [];
  const lin = lineageOf(s.nodeId);
  const jsRootToLeaf = lin.jsFrames.slice().reverse();
  if (!evStack.length && !jsRootToLeaf.length) {
    // Pure virtual sample with no enclosing non-wrapper event -- attribute
    // to the raw leaf so (idle) / (program) still show up honestly.
    return [lin.rawLeaf];
  }
  return jsRootToLeaf.concat(evStack);
}

// --- Mode dispatch ----------------------------------------------------
const fmt = (n, w) => n.toFixed(2).padStart(w);

if (calleesOf) {
  // Callees of `calleesOf`: for each sample whose hybrid stack contains
  // calleesOf, find the next entry deeper in the stack and attribute
  // sample's deltaUs to that name. If calleesOf is the leaf, attribute
  // to (self / unattributed).
  const byCallee = new Map(); // name -> { us, hits }
  let parentUs = 0, parentHits = 0, parentSelfUs = 0;
  for (const s of allSamples) {
    const stack = hybridStackFor(s);
    const idx = stack.lastIndexOf(calleesOf);
    if (idx < 0) continue;
    parentUs += s.deltaUs;
    parentHits++;
    if (idx === stack.length - 1) {
      parentSelfUs += s.deltaUs;
      continue;
    }
    const callee = stack[idx + 1];
    const cur = byCallee.get(callee) || { us: 0, hits: 0 };
    cur.us += s.deltaUs;
    cur.hits++;
    byCallee.set(callee, cur);
  }
  if (!parentHits) {
    console.error(`no hybrid-stack frames matched "${calleesOf}". Try the default mode first to find label names.`);
    process.exit(3);
  }
  const rows = [...byCallee.entries()].map(([name, v]) => ({
    name, hits: v.hits, ms: v.us / 1000, pct: 100 * v.us / parentUs,
  }));
  rows.push({
    name: '(self / unattributed)',
    hits: parentHits,
    ms: parentSelfUs / 1000,
    pct: 100 * parentSelfUs / parentUs,
  });
  rows.sort((a, b) => b.ms - a.ms);
  console.log(`trace:   ${tracePath}`);
  console.log(`samples: ${allSamples.length}  events(${threadName}): ${mainEvents.length}`);
  console.log(`parent:  ${calleesOf}  hits: ${parentHits}  total: ${(parentUs/1000).toFixed(2)}ms  self: ${(parentSelfUs/1000).toFixed(2)}ms (${(100*parentSelfUs/parentUs).toFixed(1)}%)`);
  console.log(`direct callees, top ${topN} by total time (min ${minPct}% of parent total):`);
  console.log('');
  console.log('   total_ms  total_%     hits   callee');
  console.log('   --------  -------   ------   ----------------------------------------------');
  for (const r of rows.filter(r => r.pct >= minPct).slice(0, topN)) {
    console.log(`  ${fmt(r.ms, 8)}   ${fmt(r.pct, 5)}%   ${String(r.hits).padStart(6)}   ${r.name}`);
  }
  process.exit(0);
}

// Default mode: bottom-up self-time by combined-stack leaf.
const selfByLabel = new Map(); // name -> { us, kind: 'js' | 'event' | 'virtual' }
let totalUs = 0;
for (const s of allSamples) {
  const stack = hybridStackFor(s);
  const leaf = stack[stack.length - 1];
  totalUs += s.deltaUs;
  // Under [JS-root..leaf] ++ [Blink-outer..inner] ordering, the leaf came
  // from event stack iff event stack is non-empty (events nest inside JS).
  // Otherwise it's a pure JS leaf, or (if both are empty) the raw virtual.
  let kind;
  if (s.eventStack && s.eventStack.length) kind = 'event';
  else if (lineageOf(s.nodeId).jsFrames.length) kind = 'js';
  else kind = 'virtual';
  const cur = selfByLabel.get(leaf) || { us: 0, kind };
  cur.us += s.deltaUs;
  // If we ever see js attribution for this label, prefer js (event names
  // can coincidentally collide with JS function names, though it's rare).
  if (kind === 'js' && cur.kind !== 'js') cur.kind = 'js';
  selfByLabel.set(leaf, cur);
}

const rows = [...selfByLabel.entries()]
  .map(([name, v]) => ({ name, ms: v.us / 1000, pct: 100 * v.us / totalUs, kind: v.kind }))
  .sort((a, b) => b.ms - a.ms)
  .filter(r => r.pct >= minPct)
  .slice(0, topN);

console.log(`trace:   ${tracePath}`);
console.log(`samples: ${allSamples.length}  events(${threadName}): ${mainEvents.length}  span: ${((allSamples[allSamples.length-1].ts - allSamples[0].ts)/1e6).toFixed(2)}s`);
console.log(`total self: ${(totalUs/1000).toFixed(2)}ms across ${selfByLabel.size} distinct labels`);
console.log(`top ${topN} by self-time (min ${minPct}%):  [js]=JS function, [ev]=Blink/V8 event, [..]=virtual leaf`);
console.log('');
console.log('   self_ms   self_%   kind   label');
console.log('   -------   ------   ----   ----------------------------------------------');
for (const r of rows) {
  const k = r.kind === 'js' ? '[js]' : r.kind === 'event' ? '[ev]' : '[..]';
  console.log(`  ${fmt(r.ms, 8)}   ${fmt(r.pct, 5)}%   ${k}   ${r.name}`);
}
