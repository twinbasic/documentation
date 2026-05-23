// Diff per-Blink-class object counts and sizes between two memory-infra
// dumps in the same trace, for the renderer process. Useful for
// understanding what a forced GC freed at the typed-object level
// (which the V8 heap snapshot can't see because the freed objects
// have no V8 wrappers).
//
// Usage:
//   node diff-blink-classes.mjs <trace.json> [<dump-index-a>] [<dump-index-b>]
//
// Default: index 0 (post-render) and index 1 (post-gc when --gc-passes
// was used; mid-generate otherwise).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('usage: node diff-blink-classes.mjs <trace.json> [a] [b]');
  process.exit(2);
}
const tracePath = resolve(process.cwd(), argv[0]);
const idxA = parseInt(argv[1] ?? '0', 10);
const idxB = parseInt(argv[2] ?? '1', 10);

const trace  = JSON.parse(readFileSync(tracePath, 'utf8'));
const events = trace.traceEvents;
const detailed = events.filter((e) => e.ph === 'v' && e.args?.dumps?.allocators);

const byId = new Map();
for (const e of detailed) {
  const k = String(e.id);
  if (!byId.has(k)) byId.set(k, []);
  byId.get(k).push(e);
}
const groups = [...byId.entries()]
  .map(([id, p]) => ({ id, ts: Math.min(...p.map((x) => x.ts)), procs: p }))
  .sort((a, b) => a.ts - b.ts);

console.log(`dumps in trace, in order:`);
groups.forEach((g, i) => console.log(`  ${i}: id=${g.id}, ${g.procs.length} processes`));

if (idxA >= groups.length || idxB >= groups.length) {
  console.error(`requested indices ${idxA},${idxB} but only ${groups.length} dumps in trace`);
  process.exit(1);
}

function findRenderer(procs, id) {
  const findTotals = (pid, eDetail) => {
    const t = eDetail.args?.dumps?.process_totals;
    if (t?.private_footprint_bytes) return t;
    const light = events.find((x) =>
      x.ph === 'v' && String(x.id) === id && x.pid === pid && x.args?.dumps?.process_totals
    );
    return light?.args.dumps.process_totals ?? {};
  };
  let best = null;
  for (const e of procs) {
    const t = findTotals(e.pid, e);
    const priv = t.private_footprint_bytes ? parseInt(t.private_footprint_bytes, 16) : 0;
    if (!best || priv > best.priv) best = { e, priv };
  }
  return best;
}

const rA = findRenderer(groups[idxA].procs, groups[idxA].id);
const rB = findRenderer(groups[idxB].procs, groups[idxB].id);
const fmtMB = (b) => (b / 1024 / 1024).toFixed(1).padStart(7);
console.log(`\nA (dump ${idxA}) renderer: pid=${rA.e.pid}, priv=${fmtMB(rA.priv)} MB`);
console.log(`B (dump ${idxB}) renderer: pid=${rB.e.pid}, priv=${fmtMB(rB.priv)} MB`);

function blinkClasses(allocators) {
  // The typed-class breakdown lives under blink_objects/blink_gc/main/
  // (not blink_gc/main/, which is a hashed-page namespace). Each entry
  // is "blink::ClassName (0xNNN)" or "DOMTypeName (0xNNN)". The (0xNNN)
  // suffix is a per-dump GUID -- the SAME class gets a different GUID
  // in each dump -- so it must be stripped before comparing across
  // dumps.
  const out = new Map();
  for (const [name, info] of Object.entries(allocators)) {
    const m = name.match(/^blink_objects\/blink_gc\/main\/(.+)$/);
    if (!m) continue;
    const cls = m[1].replace(/\s*\(0x[0-9a-fA-F]+\)\s*$/, '');
    const size  = parseInt(info?.attrs?.size?.value ?? '0', 16);
    const count = parseInt(info?.attrs?.object_count?.value ?? '0', 16);
    const prev = out.get(cls);
    if (prev) {
      out.set(cls, { size: prev.size + size, count: prev.count + count });
    } else {
      out.set(cls, { size, count });
    }
  }
  return out;
}

const cA = blinkClasses(rA.e.args.dumps.allocators);
const cB = blinkClasses(rB.e.args.dumps.allocators);
const allClasses = new Set([...cA.keys(), ...cB.keys()]);
const rows = [];
for (const cls of allClasses) {
  const a = cA.get(cls) ?? { size: 0, count: 0 };
  const b = cB.get(cls) ?? { size: 0, count: 0 };
  rows.push({ cls, aCount: a.count, aSize: a.size, bCount: b.count, bSize: b.size,
              dCount: b.count - a.count, dSize: b.size - a.size });
}

const fmtN = (n) => n.toLocaleString().padStart(9);

const freed = rows.filter((r) => r.dSize < 0).sort((a, b) => a.dSize - b.dSize);
console.log(`\ntop 30 Blink classes FREED in B (sorted by |Δ bytes|):`);
console.log(`  ${'class'.padEnd(58)}  a_count    a_MB   b_count    b_MB   d_count    d_MB`);
for (const r of freed.slice(0, 30)) {
  console.log(`  ${r.cls.padEnd(58)} ${fmtN(r.aCount)} ${fmtMB(r.aSize)} ${fmtN(r.bCount)} ${fmtMB(r.bSize)} ${fmtN(r.dCount)} ${fmtMB(r.dSize)}`);
}
const totalFreed = freed.reduce((s, r) => s + r.dSize, 0);
console.log(`\ntotal freed bytes across all blink_gc/main/* classes: ${fmtMB(totalFreed)} MB`);

const grown = rows.filter((r) => r.dSize > 0).sort((a, b) => b.dSize - a.dSize);
if (grown.length > 0) {
  console.log(`\ntop 10 classes that GREW in B (B alloc'd more than A):`);
  for (const r of grown.slice(0, 10)) {
    console.log(`  ${r.cls.padEnd(58)} d_count=${fmtN(r.dCount)} d_MB=${fmtMB(r.dSize)}`);
  }
}
