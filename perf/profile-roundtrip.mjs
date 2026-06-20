// Profile the full pdf-lib roundtrip (load + save) with the tick-yield
// knobs cranked to their extremes. The defaults are alarmingly slow:
//
//   load: parseSpeed defaults to Slow = 100 objects/tick + await
//         waitForTick() between batches. For a ~50k-object book that's
//         ~500 yields, each ~10ms of pure idle.
//   save: objectsPerTick defaults to 50, with the same yield pattern.
//         Roughly 2x as many yields as load.
//
// Both knobs accept Infinity (Fastest) to disable yielding entirely.
// Compare against the harness's 39.7s "process" baseline.
//
// Usage:
//   node profile-roundtrip.mjs <pdf>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument, ParseSpeeds } from 'pdf-lib';
import { pinCpuIfWindows } from './pin-cpu.mjs';

// On Windows, re-launch under `start /affinity 0x5500 /high` to stabilise
// timing. See pin-cpu.mjs. Pass --no-affinity to skip.
pinCpuIfWindows({ toolName: 'profile-roundtrip' });

const pdfPath = resolve(process.cwd(), process.argv[2] || '');
if (!process.argv[2]) {
  console.error('usage: node profile-roundtrip.mjs <pdf>');
  process.exit(2);
}
const bytes = readFileSync(pdfPath);
console.log(`input: ${pdfPath}  (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);
console.log('');

const variants = [
  { name: 'default (Slow / 50)',     parseSpeed: ParseSpeeds.Slow,     objectsPerTick: 50 },
  { name: 'Fast / 1500',             parseSpeed: ParseSpeeds.Fast,     objectsPerTick: 1500 },
  { name: 'Fastest / Infinity',      parseSpeed: ParseSpeeds.Fastest,  objectsPerTick: Infinity },
];

for (const v of variants) {
  const tLoad0 = process.hrtime.bigint();
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, parseSpeed: v.parseSpeed });
  const loadMs = Number(process.hrtime.bigint() - tLoad0) / 1e6;

  const tSave0 = process.hrtime.bigint();
  const out = await doc.save({ objectsPerTick: v.objectsPerTick });
  const saveMs = Number(process.hrtime.bigint() - tSave0) / 1e6;

  const outMb = (out.length / 1024 / 1024).toFixed(1);
  console.log(`${v.name.padEnd(26)}  load=${loadMs.toFixed(0).padStart(6)}ms  save=${saveMs.toFixed(0).padStart(6)}ms  out=${outMb}MB`);
}
