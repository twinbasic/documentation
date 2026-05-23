// Show what a target frame allocates under itself.
//
// Reads a V8 .heapprofile (tree of { callFrame, selfSize, children }
// rooted at `head`) and, for every node whose callFrame.functionName
// matches the given target, lists its direct child frames with their
// (self + subtree) byte totals. Answers "what does function X
// actually allocate?".
//
// Companion to find-heap-callers.mjs. Where find-heap-callers walks
// up (target's parents), this walks down (target's children).
//
// Usage:
//   node perf/find-heap-callees.mjs <profile> <calleeName>
//
// Example:
//   node perf/find-heap-callees.mjs results/<run>/process.heapprofile fastParseDictArray

import { readFileSync } from 'node:fs';

const [profilePath, targetName] = process.argv.slice(2);
if (!profilePath || !targetName) {
  console.error('usage: node find-heap-callees.mjs <profile> <calleeName>');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));

function subtreeBytes(n) {
  let total = n.selfSize || 0;
  for (const c of n.children || []) total += subtreeBytes(c);
  return total;
}

const childTotals = new Map();
const childSelfs = new Map();
let targetSelf = 0;
let targetSubtree = 0;

function walk(n) {
  const name = n.callFrame?.functionName || '';
  if (name === targetName) {
    targetSelf += n.selfSize || 0;
    targetSubtree += subtreeBytes(n);
    for (const c of n.children || []) {
      const cf = c.callFrame || {};
      const cname = cf.functionName || '(anonymous)';
      const url = cf.url || '';
      const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?';
      const key = `${cname} @ ${url ? url.replace(/^file:\/\/\//, '') : '(no url)'}:${line}`;
      const subtree = subtreeBytes(c);
      const self = c.selfSize || 0;
      childTotals.set(key, (childTotals.get(key) || 0) + subtree);
      childSelfs.set(key, (childSelfs.get(key) || 0) + self);
    }
  }
  for (const c of n.children || []) walk(c);
}
walk(profile.head);

console.log(`${targetName}: self=${(targetSelf / 1024).toFixed(2)} KB, subtree=${(targetSubtree / 1024 / 1024).toFixed(2)} MB`);
console.log('direct children (subtree KB / self KB):');
const rows = [...childTotals.entries()]
  .map(([k, subtree]) => ({ k, subtree, self: childSelfs.get(k) || 0 }))
  .sort((a, b) => b.subtree - a.subtree);
for (const r of rows) {
  const subKb = r.subtree / 1024;
  if (subKb < 10) continue;
  const selfKb = r.self / 1024;
  console.log(`  ${subKb.toFixed(2).padStart(10)} KB  (self ${selfKb.toFixed(2).padStart(8)} KB)   ${r.k}`);
}
