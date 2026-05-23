// One-shot aggregator for the 3+3 paired cpu-profile A/B (ab-A1..A3 / ab-B1..B3).
// Computes per-row self_ms mean across the 3 A runs and 3 B runs, plus the difference.
// Also prints total samples / duration per run so we can sanity-check variance.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runs = ['A1','A2','A3','B1','B2','B3'].map(tag => ({
  tag,
  path: resolve(__dirname, `ab-${tag}.cpuprofile`),
}));

for (const r of runs) {
  if (!existsSync(r.path)) { console.error('missing:', r.path); process.exit(1); }
}

// Same hit-counting + self_ms computation as analyze-profile.mjs.
function summarise(path) {
  const p = JSON.parse(readFileSync(path, 'utf8'));
  const totalUs = p.endTime - p.startTime;
  const totalSamples = p.samples.length;
  const us = totalUs / totalSamples;
  const byKey = new Map();
  let totalHits = 0;
  for (const n of p.nodes) {
    const cf = n.callFrame || {};
    const fn = cf.functionName || '(anonymous)';
    const url = cf.url || '';
    const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?';
    const key = `${fn}  @  ${url || '(no url)'}:${line}`;
    const cur = byKey.get(key) || { hits: 0 };
    cur.hits += n.hitCount || 0;
    byKey.set(key, cur);
    totalHits += n.hitCount || 0;
  }
  const rows = new Map();
  for (const [key, v] of byKey) {
    rows.set(key, v.hits * us / 1000);  // self_ms
  }
  return { totalSamples, durationS: totalUs / 1e6, usPerSample: us, rows };
}

const summaries = runs.map(r => ({ tag: r.tag, ...summarise(r.path) }));

console.log('per-run totals');
console.log('  tag      samples  dur(s)  us/sample');
for (const s of summaries) {
  console.log(`  ${s.tag}      ${String(s.totalSamples).padStart(6)}  ${s.durationS.toFixed(2).padStart(6)}    ${s.usPerSample.toFixed(1)}`);
}
console.log('');

// Union of row keys across all 6 runs.
const keys = new Set();
for (const s of summaries) for (const k of s.rows.keys()) keys.add(k);

// Compute A-mean / A-stddev / B-mean / B-stddev per row.
function statsFor(group, key) {
  const vals = group.map(s => s.rows.get(key) || 0);
  const mean = vals.reduce((a,b)=>a+b,0) / vals.length;
  const variance = vals.reduce((a,b)=>a+(b-mean)*(b-mean),0) / vals.length;
  return { mean, sd: Math.sqrt(variance), vals };
}

const A = summaries.filter(s => s.tag.startsWith('A'));
const B = summaries.filter(s => s.tag.startsWith('B'));

const rows = [...keys].map(k => {
  const sa = statsFor(A, k);
  const sb = statsFor(B, k);
  return { key: k, aMean: sa.mean, aSd: sa.sd, bMean: sb.mean, bSd: sb.sd, delta: sb.mean - sa.mean };
});

// Sort by max(|A|, |B|) so the biggest rows surface regardless of which side they're on.
rows.sort((x,y) => Math.max(y.aMean, y.bMean) - Math.max(x.aMean, x.bMean));

const fmt = (n, w) => n.toFixed(1).padStart(w);
console.log('top 25 rows by max(A mean, B mean), self_ms:');
console.log('');
console.log('   A_mean   A_sd    B_mean   B_sd     delta    function');
console.log('   ------   ----    ------   ----     -----    --------');
for (const r of rows.slice(0, 25)) {
  // Strip the long URL prefix for readability.
  const short = r.key.replace(/D:\\\\OCP\\\\wc\\\\twinBASIC-documentation\\\\docs\\\\lib\\\\paged\.browser\.js/, 'paged.browser.js')
                    .replace(/D:\\OCP\\wc\\twinBASIC-documentation\\docs\\lib\\paged.browser.js/, 'paged.browser.js');
  console.log(`  ${fmt(r.aMean,7)}  ${fmt(r.aSd,5)}   ${fmt(r.bMean,7)}  ${fmt(r.bSd,5)}   ${fmt(r.delta,7)}    ${short}`);
}

// Total CPU work across all rows.
const aTotal = A.reduce((s,r)=>s+r.totalSamples*r.usPerSample,0)/A.length / 1000;
const bTotal = B.reduce((s,r)=>s+r.totalSamples*r.usPerSample,0)/B.length / 1000;
console.log('');
console.log(`A mean total CPU: ${aTotal.toFixed(0)} ms  (${A.map(r => (r.totalSamples*r.usPerSample/1000).toFixed(0)).join(' / ')})`);
console.log(`B mean total CPU: ${bTotal.toFixed(0)} ms  (${B.map(r => (r.totalSamples*r.usPerSample/1000).toFixed(0)).join(' / ')})`);
console.log(`delta (B-A):     ${(bTotal-aTotal).toFixed(0)} ms`);
