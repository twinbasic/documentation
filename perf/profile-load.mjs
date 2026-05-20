// One-shot: profile PDFDocument.load on a given PDF.
//
// We've measured load at ~35 s on a 52 MB Chrome PDF. That's an order
// of magnitude slower than reading the bytes (~250 ms for 52 MB SSD).
// If most of it is in a single hot path -- string concatenation in
// parseName/parseString, a slow xref scan, repeated context lookups --
// we'd want to know before deciding whether to push more work onto
// pdf-lib or write our own minimal parser.
//
// Usage:
//   node --cpu-prof --cpu-prof-name=load.cpuprofile profile-load.mjs <pdf>
//
// The .cpuprofile lands in the current directory. Open it in Chrome
// DevTools -> Performance -> Load profile, or run analyze-profile.mjs
// against it for a terminal bottom-up self-time view.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument, ParseSpeeds } from 'pdf-lib';

const arg = process.argv[2];
if (!arg) {
  console.error('usage: node --cpu-prof profile-load.mjs <pdf> [--speed slow|medium|fast|fastest]');
  process.exit(2);
}
const speedArg = process.argv[3] === '--speed' ? process.argv[4] : 'slow';
const speedMap = {
  slow:    ParseSpeeds.Slow,
  medium:  ParseSpeeds.Medium,
  fast:    ParseSpeeds.Fast,
  fastest: ParseSpeeds.Fastest,
};
if (!(speedArg in speedMap)) {
  console.error(`unknown --speed: ${speedArg}`);
  process.exit(2);
}
const parseSpeed = speedMap[speedArg];

const pdfPath = resolve(process.cwd(), arg);
const bytes = readFileSync(pdfPath);
console.log(`input: ${pdfPath}  (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);
console.log(`parseSpeed: ${speedArg} (objects/tick = ${parseSpeed})`);

// Warm-up read, so the cost of streaming the file off disk doesn't
// dominate the small-PDF case.
const _warm = bytes[0] + bytes[bytes.length - 1];

const t0 = process.hrtime.bigint();
const doc = await PDFDocument.load(bytes, { updateMetadata: false, parseSpeed });
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6;
console.log(`load: ${ms.toFixed(0)} ms`);
console.log(`pages parsed: ${doc.getPageCount()}`);
