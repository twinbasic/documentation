// Attribute a heap allocator's self+descendant bytes to each direct caller.
//
// Reads a V8 .heapprofile (tree of { callFrame, selfSize, children }
// rooted at `head`) and, for every node whose callFrame.functionName
// matches the given target, attributes its self+descendant selfSize back
// to its immediate parent frame.
//
// Companion to find-callers.mjs (which does the same for .cpuprofile).
// The tree shape means each occurrence has exactly one parent, so this
// is straightforward depth-first attribution -- no need for the
// parent-of map that find-callers.mjs builds.
//
// Usage:
//   node perf/find-heap-callers.mjs <profile> <calleeName>
//
// Example:
//   node perf/find-heap-callers.mjs results/<run>/process.heapprofile set
//   node perf/find-heap-callers.mjs results/<run>/process.heapprofile Map
//
// `set` and `Map` show up as bare V8 builtins (no url, no line), so the
// useful question is "who called them"; this script answers it.

import { readFileSync } from 'node:fs';

const [profilePath, targetName] = process.argv.slice(2);
if (!profilePath || !targetName) {
  console.error('usage: node find-heap-callers.mjs <profile> <calleeName>');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));

function subtreeBytes(n) {
  let total = n.selfSize || 0;
  for (const c of n.children || []) total += subtreeBytes(c);
  return total;
}

const callerBytes = new Map();
let targetSelf = 0;
let targetTotal = 0;

function walk(n, parent) {
  const name = n.callFrame?.functionName || '';
  if (name === targetName) {
    targetSelf += n.selfSize || 0;
    const total = subtreeBytes(n);
    targetTotal += total;
    if (parent) {
      const cf = parent.callFrame || {};
      const fn = cf.functionName || '(anon)';
      const url = cf.url || '';
      const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?';
      const pkey = `${fn} @ ${url ? url.replace(/^file:\/\/\//, '') : '(no url)'}:${line}`;
      callerBytes.set(pkey, (callerBytes.get(pkey) || 0) + total);
    }
  }
  for (const c of n.children || []) walk(c, n);
}
walk(profile.head, null);

console.log(`${targetName}: self=${(targetSelf / 1024).toFixed(2)} KB, total=${(targetTotal / 1024).toFixed(2)} KB (${(targetTotal / 1024 / 1024).toFixed(2)} MB)`);
console.log('callers (attributed total KB):');
const rows = [...callerBytes.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, bytes] of rows) {
  const kb = bytes / 1024;
  if (kb < 1) continue;
  console.log(`  ${kb.toFixed(2).padStart(10)} KB   ${k}`);
}
