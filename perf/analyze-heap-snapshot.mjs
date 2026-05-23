// Analyse a Chrome DevTools heap snapshot (.heapsnapshot JSON).
//
// In "single" mode reports per-type×name aggregate counts and sizes:
// who holds the V8-visible memory in this snapshot, in descending
// order of total bytes. In "diff" mode reports the per-key delta
// between two snapshots: positive = retained more in B, negative =
// freed between A and B. Used to identify which object categories
// the GC freed (and by extension, which the JS-side retention is
// keeping alive in the no-GC baseline).
//
// Self_size is the shallow size of each node (not retained size --
// computing retained size requires a dominator-tree pass over the
// graph, which DevTools does interactively but we don't here). For
// figuring out where the renderer's memory goes, the type×name
// distribution is the actionable view.
//
// Usage:
//   node analyze-heap-snapshot.mjs <snap.heapsnapshot>
//   node analyze-heap-snapshot.mjs <before.heapsnapshot> <after.heapsnapshot>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
if (argv.length < 1 || argv.length > 2) {
  console.error('usage: node analyze-heap-snapshot.mjs <snap> [<after-snap-for-diff>]');
  process.exit(2);
}
const pathA = resolve(process.cwd(), argv[0]);
const pathB = argv[1] ? resolve(process.cwd(), argv[1]) : null;

const fmtMB = (b) => (b / 1024 / 1024).toFixed(1).padStart(8) + ' MB';
const fmtN  = (n) => n.toLocaleString().padStart(10);

function loadSnapshot(path) {
  const t0 = Date.now();
  const bytes = readFileSync(path, 'utf8');
  const snap  = JSON.parse(bytes);
  console.log(`loaded ${path}  (${(bytes.length / 1024 / 1024).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  return snap;
}

function decodeAggregate(snap) {
  const meta = snap.snapshot.meta;
  const nodes   = snap.nodes;
  const strings = snap.strings;
  const fields  = meta.node_fields;          // e.g. ["type","name","id","self_size","edge_count","detachedness"]
  const types   = meta.node_types[0];        // the enum for the 'type' field
  const F = fields.length;
  const typeIdx     = fields.indexOf('type');
  const nameIdx     = fields.indexOf('name');
  const selfSizeIdx = fields.indexOf('self_size');
  const detachIdx   = fields.indexOf('detachedness');

  const byKey = new Map();
  const detachedByKey = new Map();
  const nodeCount = nodes.length / F;
  for (let i = 0; i < nodeCount; i++) {
    const base   = i * F;
    const t      = types[nodes[base + typeIdx]];
    const name   = strings[nodes[base + nameIdx]];
    const size   = nodes[base + selfSizeIdx];
    const det    = detachIdx >= 0 ? nodes[base + detachIdx] : 0;
    const key    = `${t}:${name}`;
    let cur = byKey.get(key);
    if (!cur) { cur = { count: 0, bytes: 0 }; byKey.set(key, cur); }
    cur.count += 1;
    cur.bytes += size;
    // V8 DetachednessV8 enum: 0=Unknown, 1=Attached, 2=Detached.
    // Only 2 is "this DOM node is no longer reachable through the
    // document tree".
    if (det === 2) {
      let dCur = detachedByKey.get(key);
      if (!dCur) { dCur = { count: 0, bytes: 0 }; detachedByKey.set(key, dCur); }
      dCur.count += 1;
      dCur.bytes += size;
    }
  }
  return { byKey, detachedByKey, nodeCount };
}

function topN(map, n, by = 'bytes') {
  return Array.from(map, ([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b[by] - a[by])
    .slice(0, n);
}

const snapA = loadSnapshot(pathA);
const aggA  = decodeAggregate(snapA);

if (!pathB) {
  const total = Array.from(aggA.byKey.values()).reduce((s, v) => s + v.bytes, 0);
  console.log(`\nnodes: ${aggA.nodeCount.toLocaleString()}`);
  console.log(`self_size total: ${fmtMB(total)}`);

  console.log(`\ntop 30 type:name by aggregate bytes:`);
  for (const r of topN(aggA.byKey, 30)) {
    console.log(`  ${r.key.padEnd(48)} ${fmtN(r.count)} x  ${fmtMB(r.bytes)}`);
  }

  if (aggA.detachedByKey.size > 0) {
    const dTotal = Array.from(aggA.detachedByKey.values()).reduce((s, v) => s + v.bytes, 0);
    console.log(`\ndetached nodes (detachedness in {1,2}): ${dTotal === 0 ? '0' : fmtMB(dTotal)}`);
    console.log(`top 20 detached type:name by bytes:`);
    for (const r of topN(aggA.detachedByKey, 20)) {
      console.log(`  ${r.key.padEnd(48)} ${fmtN(r.count)} x  ${fmtMB(r.bytes)}`);
    }
  }
  process.exit(0);
}

// Diff mode
const snapB = loadSnapshot(pathB);
const aggB  = decodeAggregate(snapB);

const allKeys = new Set([...aggA.byKey.keys(), ...aggB.byKey.keys()]);
const diffRows = [];
for (const k of allKeys) {
  const a = aggA.byKey.get(k) ?? { count: 0, bytes: 0 };
  const b = aggB.byKey.get(k) ?? { count: 0, bytes: 0 };
  diffRows.push({
    key:        k,
    countA:     a.count,
    bytesA:     a.bytes,
    countB:     b.count,
    bytesB:     b.bytes,
    countDelta: b.count - a.count,
    bytesDelta: b.bytes - a.bytes,
  });
}

const totalA = Array.from(aggA.byKey.values()).reduce((s, v) => s + v.bytes, 0);
const totalB = Array.from(aggB.byKey.values()).reduce((s, v) => s + v.bytes, 0);
console.log(`\nA total self_size: ${fmtMB(totalA)}  (${aggA.nodeCount.toLocaleString()} nodes)`);
console.log(`B total self_size: ${fmtMB(totalB)}  (${aggB.nodeCount.toLocaleString()} nodes)`);
console.log(`Δ self_size:       ${fmtMB(totalB - totalA)}  (${(aggB.nodeCount - aggA.nodeCount).toLocaleString()} nodes)`);

const freed = diffRows.filter((r) => r.bytesDelta < 0).sort((a, b) => a.bytesDelta - b.bytesDelta);
console.log(`\ntop 30 categories FREED in B (bytesDelta < 0):`);
console.log(`  ${'type:name'.padEnd(48)} ${'A count'.padStart(10)} ${'A bytes'.padStart(11)}  ${'B count'.padStart(10)} ${'B bytes'.padStart(11)}  ${'Δ count'.padStart(10)} ${'Δ bytes'.padStart(11)}`);
for (const r of freed.slice(0, 30)) {
  console.log(`  ${r.key.padEnd(48)} ${fmtN(r.countA)} ${fmtMB(r.bytesA)} ${fmtN(r.countB)} ${fmtMB(r.bytesB)} ${fmtN(r.countDelta)} ${fmtMB(r.bytesDelta)}`);
}

const grown = diffRows.filter((r) => r.bytesDelta > 0).sort((a, b) => b.bytesDelta - a.bytesDelta);
console.log(`\ntop 15 categories GROWN in B (bytesDelta > 0):`);
console.log(`  ${'type:name'.padEnd(48)} ${'Δ count'.padStart(10)} ${'Δ bytes'.padStart(11)}`);
for (const r of grown.slice(0, 15)) {
  console.log(`  ${r.key.padEnd(48)} ${fmtN(r.countDelta)} ${fmtMB(r.bytesDelta)}`);
}

// Detached diff
const allDetachedKeys = new Set([...aggA.detachedByKey.keys(), ...aggB.detachedByKey.keys()]);
if (allDetachedKeys.size > 0) {
  const dRows = [];
  for (const k of allDetachedKeys) {
    const a = aggA.detachedByKey.get(k) ?? { count: 0, bytes: 0 };
    const b = aggB.detachedByKey.get(k) ?? { count: 0, bytes: 0 };
    dRows.push({ key: k, countA: a.count, bytesA: a.bytes, countB: b.count, bytesB: b.bytes,
                 countDelta: b.count - a.count, bytesDelta: b.bytes - a.bytes });
  }
  const dTotalA = Array.from(aggA.detachedByKey.values()).reduce((s, v) => s + v.bytes, 0);
  const dTotalB = Array.from(aggB.detachedByKey.values()).reduce((s, v) => s + v.bytes, 0);
  console.log(`\nDetached nodes:`);
  console.log(`  A: ${fmtMB(dTotalA)}   B: ${fmtMB(dTotalB)}   Δ: ${fmtMB(dTotalB - dTotalA)}`);
  console.log(`top 20 detached type:name by |Δ bytes|:`);
  dRows.sort((a, b) => Math.abs(b.bytesDelta) - Math.abs(a.bytesDelta));
  for (const r of dRows.slice(0, 20)) {
    const tag = r.bytesDelta < 0 ? 'freed' : 'grew ';
    console.log(`  ${tag} ${r.key.padEnd(44)} ${fmtN(r.countA)} -> ${fmtN(r.countB)}  Δ ${fmtN(r.countDelta)}  Δ ${fmtMB(r.bytesDelta)}`);
  }
}
