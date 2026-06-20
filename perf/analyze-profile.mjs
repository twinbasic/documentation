// Bottom-up CPU profile analyzer.
//
// Reads a V8 .cpuprofile (the JSON returned by CDP's Profiler.stop)
// and prints the top functions by self-time, aggregated by
// (function name + source location). Same shape as Chrome DevTools'
// Performance tab "Bottom-Up" view, but in the terminal.
//
// Usage:
//   node analyze-profile.mjs <path/to/render.cpuprofile> [--top N] [--min-pct P]
//
// Defaults: --top 30, --min-pct 0.1 (hide rows under 0.1% self-time).

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
  console.error('usage: node analyze-profile.mjs <path> [--top N] [--min-pct P]');
  process.exit(2);
}
profilePath = resolve(process.cwd(), profilePath);

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
// .cpuprofile schema:
//   nodes[]: { id, callFrame: { functionName, url, lineNumber, columnNumber },
//              hitCount, children?: [ids] }
//   samples[]: nodeId-per-sample
//   timeDeltas[]: us-since-prev-sample
//   startTime, endTime: us

const totalUs = profile.endTime - profile.startTime;
const totalSamples = profile.samples.length;
const usPerSample = totalUs / totalSamples;

// Sum hitCounts by (function-name + url:line). hitCount on a node IS
// the number of samples whose top frame was this node, i.e. self-time.
const byKey = new Map();
let totalHits = 0;
for (const n of profile.nodes) {
  const cf = n.callFrame || {};
  const fn = cf.functionName || '(anonymous)';
  const url = cf.url || '';
  const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?';
  const key = `${fn}  @  ${url || '(no url)'}:${line}`;
  const cur = byKey.get(key) || { hits: 0, fn, url, line };
  cur.hits += n.hitCount || 0;
  byKey.set(key, cur);
  totalHits += n.hitCount || 0;
}

const rows = [...byKey.values()]
  .map(r => ({
    ...r,
    selfMs: r.hits * usPerSample / 1000,
    pct: 100 * r.hits / totalHits,
  }))
  .sort((a, b) => b.hits - a.hits)
  .filter(r => r.pct >= minPct)
  .slice(0, topN);

const fmt = (n, w) => n.toFixed(2).padStart(w);
console.log(`profile: ${profilePath}`);
console.log(`samples: ${totalSamples}  duration: ${(totalUs / 1e6).toFixed(2)}s  us/sample: ${usPerSample.toFixed(1)}`);
console.log(`top ${topN} by self-time (min ${minPct}%):`);
console.log('');
console.log('   self_ms   self_%   function  @  source');
console.log('   -------   ------   ----------------------------------------------');
for (const r of rows) {
  const where = `${r.url ? r.url.replace(/^file:\/\/\//, '') : '(no url)'}:${r.line}`;
  const fn = r.fn || '(anonymous)';
  console.log(`  ${fmt(r.selfMs, 8)}   ${fmt(r.pct, 5)}%   ${fn}  @  ${where}`);
}
