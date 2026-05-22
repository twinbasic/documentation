// Companion to find-callers.mjs: shows where a function spends its time
// across direct callees. Reports self-time + per-callee subtree totals so
// you can see whether the cost lives in the function body or in what it
// calls.
//
// Usage:
//   node perf/find-callees.mjs <profile> <calleeName>
//
// Example:
//   node perf/find-callees.mjs results/.../render.cpuprofile removeOverflow

import { readFileSync } from 'node:fs';

const [profilePath, targetName] = process.argv.slice(2);
if (!profilePath || !targetName) {
  console.error('usage: node find-callees.mjs <profile> <calleeName>');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const usPerSample = (profile.endTime - profile.startTime) / profile.samples.length;

const byId = new Map();
for (const n of profile.nodes) byId.set(n.id, n);

const subtreeHits = (rootId) => {
  const stack = [rootId];
  const seen = new Set();
  let hits = 0;
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const n = byId.get(id);
    hits += n.hitCount || 0;
    for (const c of n.children || []) stack.push(c);
  }
  return hits;
};

let selfHits = 0;
let totalHits = 0;
const calleeHits = new Map();

for (const n of profile.nodes) {
  const fn = n.callFrame?.functionName || '';
  if (fn !== targetName) continue;
  selfHits += n.hitCount || 0;
  totalHits += subtreeHits(n.id);
  for (const cid of n.children || []) {
    const c = byId.get(cid);
    const fnC = c.callFrame?.functionName || '(anon)';
    const url = (c.callFrame?.url || '').replace(/^file:\/\/\//, '');
    const line = (c.callFrame?.lineNumber ?? -1) + 1;
    const key = `${fnC}  @  ${url || '(native)'}:${line}`;
    calleeHits.set(key, (calleeHits.get(key) || 0) + subtreeHits(cid));
  }
}

const ms = (hits) => (hits * usPerSample / 1000).toFixed(2);

console.log(`${targetName}: self=${ms(selfHits)}ms, total=${ms(totalHits)}ms (callees combined=${ms(totalHits - selfHits)}ms)`);
console.log('per direct callee (subtree total ms):');
[...calleeHits.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, h]) => {
    const v = h * usPerSample / 1000;
    if (v >= 0.5) console.log(`  ${ms(h).padStart(8)} ms   ${k}`);
  });
