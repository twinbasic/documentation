// Bottom-up Chrome trace analyzer.
//
// Reads a trace.json produced by `node measure.mjs --tracing` (or any
// other source -- the trace format is Chrome's standard "JSON Object
// Format", https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU)
// and prints the top events on the renderer's main thread by self-time,
// aggregated by event name. Use it to break the cpu profile's (program)
// frame down into named Blink/V8 work (Layout, UpdateLayoutTree, ParseHTML,
// V8.CompileCode, V8.RunMicrotasks, etc.).
//
// Usage:
//   node analyze-trace.mjs <path/to/trace.json> [--top N] [--min-pct P]
//                          [--thread <name>] [--all-threads]
//
// Defaults: --top 30, --min-pct 0.1 (hide rows under 0.1% self-time),
//           thread = CrRendererMain (the V8 / DOM / Blink layout thread).
//
// Self-time is computed by walking 'X' (complete) events in ts order on
// each thread independently, subtracting nested children from each
// parent's duration. Matches the "Bottom-Up" view in chrome://tracing
// and DevTools' Performance panel when grouped by event name.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let tracePath = null;
let topN = 30;
let minPct = 0.1;
let threadName = 'CrRendererMain';
let allThreads = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--top') topN = parseInt(args[++i], 10);
  else if (a === '--min-pct') minPct = parseFloat(args[++i]);
  else if (a === '--thread') threadName = args[++i];
  else if (a === '--all-threads') allThreads = true;
  else if (!tracePath) tracePath = a;
}
if (!tracePath) {
  console.error('usage: node analyze-trace.mjs <path> [--top N] [--min-pct P] [--thread NAME] [--all-threads]');
  process.exit(2);
}
tracePath = resolve(process.cwd(), tracePath);

const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
const events = Array.isArray(trace) ? trace : (trace.traceEvents || []);

// Thread/process metadata events declare human-readable names. We use
// these to identify the main renderer thread (default CrRendererMain).
const threadNames = new Map(); // key=`${pid}.${tid}` -> name
const processNames = new Map(); // key=pid -> name
for (const e of events) {
  if (e.ph !== 'M') continue;
  if (e.name === 'thread_name' && e.args && e.args.name) {
    threadNames.set(`${e.pid}.${e.tid}`, e.args.name);
  } else if (e.name === 'process_name' && e.args && e.args.name) {
    processNames.set(e.pid, e.args.name);
  }
}

// Bucket non-metadata 'X' events (complete events with dur) by thread.
// 'B'/'E' pairs are rare in devtools.timeline + v8 categories but we
// fold them in for robustness: a 'B' is matched with the next 'E' of
// the same name on the same thread.
const byThread = new Map();
const openBE = new Map(); // key=`${pid}.${tid}.${name}` -> stack of B events
for (const e of events) {
  if (!e.ph || !e.pid) continue;
  const tk = `${e.pid}.${e.tid}`;
  if (e.ph === 'X') {
    if (typeof e.dur !== 'number' || e.dur < 0) continue;
    if (!byThread.has(tk)) byThread.set(tk, []);
    byThread.get(tk).push({ ts: e.ts, dur: e.dur, name: e.name, cat: e.cat });
  } else if (e.ph === 'B') {
    const k = `${tk}.${e.name}`;
    if (!openBE.has(k)) openBE.set(k, []);
    openBE.get(k).push(e);
  } else if (e.ph === 'E') {
    const k = `${tk}.${e.name}`;
    const stack = openBE.get(k);
    if (stack && stack.length) {
      const b = stack.pop();
      const dur = e.ts - b.ts;
      if (dur >= 0) {
        if (!byThread.has(tk)) byThread.set(tk, []);
        byThread.get(tk).push({ ts: b.ts, dur, name: e.name, cat: e.cat || b.cat });
      }
    }
  }
}

// Pick the thread(s) to report.
const targetThreads = [];
for (const [tk, name] of threadNames) {
  if (allThreads || name === threadName) {
    targetThreads.push({ tk, name, pid: parseInt(tk.split('.')[0], 10) });
  }
}
if (!targetThreads.length) {
  console.error(`no thread matched --thread "${threadName}". Threads present:`);
  for (const [tk, name] of threadNames) console.error(`  ${name}  (${tk})`);
  console.error('Pass --all-threads to aggregate across every thread, or --thread NAME to pick one.');
  process.exit(3);
}

// Per-thread self-time computation via depth-walk over X events.
// Sort by ts ascending; on tie, longer dur first so a containing
// event lands on the stack before its child.
const selfByName = new Map(); // name -> { self_us, cat }
let totalEvents = 0;
let traceMinTs = Infinity, traceMaxTs = -Infinity;
for (const { tk, name: tname } of targetThreads) {
  const list = byThread.get(tk);
  if (!list || !list.length) continue;
  list.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  totalEvents += list.length;
  const stack = [];
  const flush = (top) => {
    const self = top.dur - top.childTime;
    if (self <= 0) return;
    const cur = selfByName.get(top.name) || { self_us: 0, cat: top.cat || '' };
    cur.self_us += self;
    if (!cur.cat && top.cat) cur.cat = top.cat;
    selfByName.set(top.name, cur);
  };
  for (const e of list) {
    if (e.ts < traceMinTs) traceMinTs = e.ts;
    if (e.ts + e.dur > traceMaxTs) traceMaxTs = e.ts + e.dur;
    while (stack.length && stack[stack.length - 1].endTs <= e.ts) {
      flush(stack.pop());
    }
    if (stack.length) stack[stack.length - 1].childTime += e.dur;
    stack.push({ name: e.name, cat: e.cat, dur: e.dur, endTs: e.ts + e.dur, childTime: 0 });
  }
  while (stack.length) flush(stack.pop());
}

const traceDurUs = (traceMaxTs > traceMinTs) ? (traceMaxTs - traceMinTs) : 0;

const totalSelfUs = [...selfByName.values()].reduce((s, x) => s + x.self_us, 0);
const rows = [...selfByName.entries()]
  .map(([name, v]) => ({
    name,
    cat: v.cat,
    self_ms: v.self_us / 1000,
    pct: 100 * v.self_us / (totalSelfUs || 1),
  }))
  .sort((a, b) => b.self_ms - a.self_ms)
  .filter(r => r.pct >= minPct)
  .slice(0, topN);

const fmt = (n, w) => n.toFixed(2).padStart(w);
console.log(`trace:   ${tracePath}`);
console.log(`events:  ${totalEvents}  thread${allThreads ? 's' : ''}: ${allThreads ? 'all' : threadName}  span: ${(traceDurUs / 1e6).toFixed(2)}s`);
console.log(`total self: ${(totalSelfUs / 1000).toFixed(2)}ms across ${selfByName.size} distinct event names`);
console.log(`top ${topN} by self-time (min ${minPct}%):`);
console.log('');
console.log('   self_ms   self_%   event  @  category');
console.log('   -------   ------   ----------------------------------------------');
for (const r of rows) {
  console.log(`  ${fmt(r.self_ms, 8)}   ${fmt(r.pct, 5)}%   ${r.name}  @  ${r.cat || '(no cat)'}`);
}
