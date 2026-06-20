// Bottom-up heap sampling profile analyzer.
//
// Reads a V8 .heapprofile (the JSON returned by CDP's
// HeapProfiler.stopSampling) and prints the top allocation sites by
// self-bytes, aggregated by (function name + source location). Same
// shape as Chrome DevTools' Memory tab "Allocation sampling"
// bottom-up view, but in the terminal.
//
// Usage:
//   node analyze-heap-profile.mjs <path/to/render.heapprofile> [--top N] [--min-pct P]
//
// Defaults: --top 30, --min-pct 0.1 (hide rows under 0.1% self-bytes).
//
// .heapprofile schema:
//   head: { callFrame, selfSize, id, children: [...] }       (tree of nodes)
//   samples: [{ size, nodeId, ordinal }]                     (allocation events)
// Each node's `selfSize` is the sum of bytes from samples whose
// nodeId targeted that node directly (i.e. that node was the top of
// the allocation stack). Same shape as cpuprofile self-time.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let profilePath = null;
let topN = 30;
let minPct = 0.1;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--top') topN = parseInt(args[++i], 10);
  else if (a === '--min-pct') minPct = parseFloat(args[++i]);
  else if (!profilePath) profilePath = a;
}
if (!profilePath) {
  console.error('usage: node analyze-heap-profile.mjs <path> [--top N] [--min-pct P]');
  process.exit(2);
}
profilePath = resolve(process.cwd(), profilePath);

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));

// Flatten the tree into a list of nodes, keyed by call-frame.
const byKey = new Map();
let totalBytes = 0;
const walk = (node) => {
  const cf = node.callFrame || {};
  const fn = cf.functionName || '(anonymous)';
  const url = cf.url || '';
  const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?';
  const key = `${fn}  @  ${url || '(no url)'}:${line}`;
  const cur = byKey.get(key) || { bytes: 0, fn, url, line };
  cur.bytes += node.selfSize || 0;
  byKey.set(key, cur);
  totalBytes += node.selfSize || 0;
  for (const c of node.children || []) walk(c);
};
walk(profile.head);

const rows = [...byKey.values()]
  .map(r => ({
    ...r,
    pct: 100 * r.bytes / totalBytes,
  }))
  .sort((a, b) => b.bytes - a.bytes)
  .filter(r => r.pct >= minPct)
  .slice(0, topN);

const fmtBytes = (n) => {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
};
const fmtPct = (n, w) => n.toFixed(2).padStart(w);
console.log(`profile: ${profilePath}`);
console.log(`samples: ${profile.samples ? profile.samples.length : '?'}  total selfSize: ${fmtBytes(totalBytes)}`);
console.log(`top ${topN} by self-bytes (min ${minPct}%):`);
console.log('');
console.log('   self_bytes   self_%   function  @  source');
console.log('   ----------   ------   ----------------------------------------------');
for (const r of rows) {
  const where = `${r.url ? r.url.replace(/^file:\/\/\//, '') : '(no url)'}:${r.line}`;
  const fn = r.fn || '(anonymous)';
  console.log(`  ${fmtBytes(r.bytes).padStart(11)}   ${fmtPct(r.pct, 5)}%   ${fn}  @  ${where}`);
}
