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
//                          [--children <event-name>]
//
// Defaults: --top 30, --min-pct 0.1 (hide rows under 0.1% self-time),
//           thread = CrRendererMain (the V8 / DOM / Blink layout thread).
//
// Self-time is computed by walking 'X' (complete) events in ts order on
// each thread independently, subtracting nested children from each
// parent's duration. Matches the "Bottom-Up" view in chrome://tracing
// and DevTools' Performance panel when grouped by event name.
//
// --children <name> switches the report from "top events by self-time"
// to "what runs directly inside <name>?". For every X-event whose name
// matches, aggregate the total time of each direct child by child name
// (this is total-time / inclusive cost from the parent's POV, the same
// shape as find-callees.mjs for cpuprofiles). Plus a synthetic
// "(self / unattributed)" row capturing parent dur minus the sum of
// direct children -- i.e. work attributed to the parent frame itself.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let tracePath = null;
let topN = 30;
let minPct = 0.1;
let threadName = 'CrRendererMain';
let allThreads = false;
let childrenOf = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--top') topN = parseInt(args[++i], 10);
  else if (a === '--min-pct') minPct = parseFloat(args[++i]);
  else if (a === '--thread') threadName = args[++i];
  else if (a === '--all-threads') allThreads = true;
  else if (a === '--children') childrenOf = args[++i];
  else if (!tracePath) tracePath = a;
}
if (!tracePath) {
  console.error('usage: node analyze-trace.mjs <path> [--top N] [--min-pct P] [--thread NAME] [--all-threads] [--children NAME]');
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

// Per-thread depth-walk over X events. Sort by ts ascending; on tie,
// longer dur first so a containing event lands on the stack before its
// child.
//
// Two output modes:
//   default        --> top-N events by self-time (bottom-up view).
//   --children X   --> direct callees of every X-event named X,
//                      aggregated by child name + a (self) row.
const selfByName = new Map(); // name -> { self_us, cat }
const childrenAcc = childrenOf ? new Map() : null; // child name -> { total_us, cat, hits }
let childrenParentTotal_us = 0;
let childrenParentSelf_us = 0;
let childrenParentHits = 0;
let childrenParentCat = '';
let totalEvents = 0;
let traceMinTs = Infinity, traceMaxTs = -Infinity;
for (const { tk } of targetThreads) {
  const list = byThread.get(tk);
  if (!list || !list.length) continue;
  list.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  totalEvents += list.length;
  const stack = [];
  const flush = (top) => {
    const self = top.dur - top.childTime;
    if (self > 0) {
      const cur = selfByName.get(top.name) || { self_us: 0, cat: top.cat || '' };
      cur.self_us += self;
      if (!cur.cat && top.cat) cur.cat = top.cat;
      selfByName.set(top.name, cur);
    }
    if (childrenOf && top.name === childrenOf) {
      childrenParentTotal_us += top.dur;
      childrenParentSelf_us += Math.max(0, top.dur - top.childTime);
      childrenParentHits += 1;
      if (!childrenParentCat && top.cat) childrenParentCat = top.cat;
    }
  };
  for (const e of list) {
    if (e.ts < traceMinTs) traceMinTs = e.ts;
    if (e.ts + e.dur > traceMaxTs) traceMaxTs = e.ts + e.dur;
    while (stack.length && stack[stack.length - 1].endTs <= e.ts) {
      flush(stack.pop());
    }
    const parent = stack.length ? stack[stack.length - 1] : null;
    if (parent) parent.childTime += e.dur;
    if (childrenOf && parent && parent.name === childrenOf) {
      const cur = childrenAcc.get(e.name) || { total_us: 0, cat: e.cat || '', hits: 0 };
      cur.total_us += e.dur;
      cur.hits += 1;
      if (!cur.cat && e.cat) cur.cat = e.cat;
      childrenAcc.set(e.name, cur);
    }
    stack.push({ name: e.name, cat: e.cat, dur: e.dur, endTs: e.ts + e.dur, childTime: 0 });
  }
  while (stack.length) flush(stack.pop());
}

const traceDurUs = (traceMaxTs > traceMinTs) ? (traceMaxTs - traceMinTs) : 0;

const fmt = (n, w) => n.toFixed(2).padStart(w);

if (childrenOf) {
  if (!childrenParentHits) {
    console.error(`no X events named "${childrenOf}" found on ${allThreads ? 'any thread' : threadName}`);
    process.exit(3);
  }
  const rows = [...childrenAcc.entries()]
    .map(([name, v]) => ({
      name,
      cat: v.cat,
      hits: v.hits,
      total_ms: v.total_us / 1000,
      pct: 100 * v.total_us / childrenParentTotal_us,
    }));
  rows.push({
    name: '(self / unattributed)',
    cat: childrenParentCat,
    hits: childrenParentHits,
    total_ms: childrenParentSelf_us / 1000,
    pct: 100 * childrenParentSelf_us / childrenParentTotal_us,
  });
  rows.sort((a, b) => b.total_ms - a.total_ms);
  console.log(`trace:   ${tracePath}`);
  console.log(`thread${allThreads ? 's' : ''}: ${allThreads ? 'all' : threadName}  span: ${(traceDurUs / 1e6).toFixed(2)}s`);
  console.log(`parent: ${childrenOf}  hits: ${childrenParentHits}  total: ${(childrenParentTotal_us / 1000).toFixed(2)}ms  self: ${(childrenParentSelf_us / 1000).toFixed(2)}ms (${(100*childrenParentSelf_us/childrenParentTotal_us).toFixed(1)}%)`);
  console.log(`direct children, top ${topN} by total time (min ${minPct}% of parent total):`);
  console.log('');
  console.log('   total_ms  total_%     hits   child  @  category');
  console.log('   --------  -------   ------   --------------------------------------');
  for (const r of rows.filter(r => r.pct >= minPct).slice(0, topN)) {
    console.log(`  ${fmt(r.total_ms, 8)}   ${fmt(r.pct, 5)}%   ${String(r.hits).padStart(6)}   ${r.name}  @  ${r.cat || '(no cat)'}`);
  }
  process.exit(0);
}

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
