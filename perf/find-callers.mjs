// Attribute a callee's self+descendant time to each direct caller.
//
// Reads a V8 .cpuprofile and, for every node whose `callFrame.functionName`
// matches the given target, walks down its subtree to sum self-time +
// descendant samples, then attributes that total to each parent frame.
//
// Companion to analyze-profile.mjs: that one answers "where is cost",
// this one answers "who is paying for the cost". Used throughout the
// perf README's post-mortems to detect gBCR migration between callers
// (Page.create memoize, Footnotes-handler skip) and dead-call patterns
// (findEndToken -> checkUnderflowAfterResize -> empty onUnderflow).
//
// Usage:
//   node perf/find-callers.mjs <profile> <calleeName>
//
// Example:
//   node perf/find-callers.mjs after/render.cpuprofile getBoundingClientRect
//   node perf/find-callers.mjs after/render.cpuprofile findEndToken
//
// Caveats: hitCount is samples-on-stack, not invocations -- this script
// reports time, not call counts. For call counts use --instrument with
// perf/instrument-flush-ops.js.

import { readFileSync } from 'node:fs';

const [profilePath, targetName] = process.argv.slice(2);
if (!profilePath || !targetName) {
  console.error('usage: node find-callers.mjs <profile> <calleeName>');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const totalUs = profile.endTime - profile.startTime;
const usPerSample = totalUs / profile.samples.length;

const byId = new Map();
for (const n of profile.nodes) byId.set(n.id, n);

const parentOf = new Map();
for (const n of profile.nodes) {
  for (const c of n.children || []) {
    if (!parentOf.has(c)) parentOf.set(c, []);
    parentOf.get(c).push(n.id);
  }
}

const callerHits = new Map();
let targetSelfHits = 0;
let targetTotalHits = 0;
for (const n of profile.nodes) {
  const fn = n.callFrame?.functionName || '';
  if (fn !== targetName) continue;
  targetSelfHits += n.hitCount || 0;
  // total = self + all descendants
  const stack = [n.id];
  let totalHits = 0;
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    totalHits += node.hitCount || 0;
    for (const c of node.children || []) stack.push(c);
  }
  targetTotalHits += totalHits;
  const parents = parentOf.get(n.id) || [];
  for (const pid of parents) {
    const p = byId.get(pid);
    const pkey = `${p.callFrame?.functionName || '(anon)'}@${p.callFrame?.url || ''}:${p.callFrame?.lineNumber ?? '?'}`;
    callerHits.set(pkey, (callerHits.get(pkey) || 0) + totalHits);
  }
}

console.log(`${targetName}: self=${(targetSelfHits * usPerSample / 1000).toFixed(2)}ms, total=${(targetTotalHits * usPerSample / 1000).toFixed(2)}ms`);
console.log('callers (attributed total ms):');
const rows = [...callerHits.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, hits] of rows) {
  const ms = hits * usPerSample / 1000;
  if (ms < 1) continue;
  console.log(`  ${ms.toFixed(2).padStart(8)} ms   ${k}`);
}
