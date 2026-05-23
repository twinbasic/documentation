// Pull the per-allocator memory breakdown out of a memory-infra trace.
//
// Reads a Chrome trace.json (memory-infra category) and prints, for each
// detailed memory dump, the largest process's top-level allocator
// buckets plus sub-breakdowns of the dominant ones.
//
// Usage:
//   node analyze-mem-trace.mjs <path/to/trace.json>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('usage: node analyze-mem-trace.mjs <trace.json>');
  process.exit(2);
}
const tracePath = resolve(process.cwd(), argv[0]);

const fmtMB = (b) => {
  if (b == null || Number.isNaN(b)) return '   ? MB';
  return (b / 1024 / 1024).toFixed(0).padStart(5) + ' MB';
};

const parseHexBytes = (s) => {
  if (s == null) return null;
  const n = parseInt(String(s), 16);
  return Number.isFinite(n) ? n : null;
};

console.log(`reading ${tracePath} ...`);
const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
const events = trace.traceEvents;
console.log(`total events: ${events.length}`);

// memory-infra puts both light and detailed dumps under ph='v'.
// Detailed dumps carry args.dumps.allocators; light dumps only have
// args.dumps.process_totals. We want detailed.
const detailed = events.filter((e) => e.ph === 'v' && e.args?.dumps?.allocators);

// Group by id and sort dump groups by min timestamp (insertion order).
const byId = new Map();
for (const e of detailed) {
  const k = String(e.id);
  if (!byId.has(k)) byId.set(k, []);
  byId.get(k).push(e);
}
const groups = Array.from(byId.entries())
  .map(([id, procs]) => ({
    id,
    ts: Math.min(...procs.map((e) => e.ts)),
    procs,
  }))
  .sort((a, b) => a.ts - b.ts);

// Resolve pid -> process_name from the metadata events (ph='M', name='process_name').
const procName = new Map();
for (const e of events) {
  if (e.ph === 'M' && e.name === 'process_name' && e.args?.name) {
    procName.set(e.pid, e.args.name);
  }
}

console.log(`detailed dumps: ${groups.length}`);
for (const g of groups) {
  console.log(`  dump ${g.id} @ t=${g.ts}us  (${g.procs.length} processes)`);
}

for (let gi = 0; gi < groups.length; gi++) {
  const g = groups[gi];
  console.log();
  console.log(`=== dump ${gi} (id=${g.id}) ===`);

  const rows = g.procs.map((e) => {
    // Light counterpart with same id+pid carries process_totals; the
    // detailed event sometimes does too -- pull from whichever has it.
    const totals = e.args?.dumps?.process_totals
      ?? events.find((x) =>
        x.ph === 'v' && String(x.id) === g.id && x.pid === e.pid &&
        x.args?.dumps?.process_totals
      )?.args.dumps.process_totals
      ?? {};
    const priv     = parseHexBytes(totals.private_footprint_bytes);
    const resident = parseHexBytes(totals.peak_resident_set_size);
    return {
      pid:        e.pid,
      name:       procName.get(e.pid) ?? '(unknown)',
      priv,
      resident,
      allocators: e.args.dumps.allocators,
    };
  }).sort((a, b) => (b.priv ?? 0) - (a.priv ?? 0));

  // Process table
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const star = i === 0 ? '*' : ' ';
    console.log(`  ${star} pid=${String(r.pid).padEnd(6)} ${r.name.padEnd(20)} private ${fmtMB(r.priv)}`);
  }

  // Deep-dive on the biggest process (the renderer).
  const top = rows[0];
  if (!top) continue;

  console.log();
  console.log(`  top process pid=${top.pid} (${top.name}) top-level allocators >= 1 MB:`);
  const topLevel = [];
  for (const [name, info] of Object.entries(top.allocators)) {
    if (name.includes('/')) continue;
    const size = parseHexBytes(info?.attrs?.size?.value);
    if (size == null || size < 1024 * 1024) continue;
    topLevel.push({ name, size });
  }
  topLevel.sort((a, b) => b.size - a.size);
  let sum = 0;
  for (const r of topLevel) {
    sum += r.size;
    console.log(`    ${r.name.padEnd(36)} ${fmtMB(r.size)}`);
  }
  console.log(`    ${'(sum of top-level >= 1 MB)'.padEnd(36)} ${fmtMB(sum)}`);

  // Sub-breakdown of the top 4 dominant top-level allocators.
  for (const big of topLevel.slice(0, 4)) {
    const prefix = big.name + '/';
    const subs = [];
    for (const [name, info] of Object.entries(top.allocators)) {
      if (!name.startsWith(prefix)) continue;
      const rest = name.slice(prefix.length);
      if (rest.includes('/')) continue; // only one level deeper
      const size = parseHexBytes(info?.attrs?.size?.value);
      if (size == null || size < 1024 * 256) continue; // 0.25 MB cut-off
      subs.push({ name: rest, size });
    }
    if (subs.length === 0) continue;
    subs.sort((a, b) => b.size - a.size);
    console.log();
    console.log(`    ${big.name}/ sub-breakdown:`);
    for (const s of subs.slice(0, 15)) {
      console.log(`      ${s.name.padEnd(34)} ${fmtMB(s.size)}`);
    }
  }
}
