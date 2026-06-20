// Count PDFParser.parseIndirectObjectHeader + matchIndirectObjectHeader
// calls per load of perf/raw.pdf, plus the kept-heap delta across load.
//
// Background: the heap profile attributed ~9 MB of self-allocations to
// parseIndirectObjectHeader -- enough to look like a real parser hot
// spot. This script answers the prerequisite questions before
// committing to an inline rewrite: how often is the function actually
// called, does the speculative matchIndirectObjectHeader path fire on
// the production shim stack (fast-sync-load's digit fast-path is
// supposed to short-circuit it), and does parseIndirectObjectHeader
// ever throw (recovery via matchIndirectObjectHeader's try/catch
// wrapper)?
//
// Output, on the book (raw.pdf) with the current production shim stack:
//   pioh calls:        226418
//   pioh throws:       0
//   mih  calls:        0           <- fast-sync-load short-circuit works
//   heap delta (kept): ~35 MB
//
// The ~9 MB heap attribution turned out to be a V8 inlining-attribution
// artifact (fastOf's PDFRef-construction bytes inlined into
// parseIndirectObjectHeader's frame), not anything the function itself
// allocates. Confirmed by re-profiling under `node --no-turbo-inlining`,
// see "Class-constructor shapes for PDFRef / PDFDict / PDFArray" in
// README.md. The fix wasn't in this function; it was in fast-refs's
// wrapper construction (-> fast-refs-class).
//
// Run: node --expose-gc perf/instrument-pioh.mjs

import '../book/lib/fast-refs-class.mjs';
import '../book/lib/fast-inflate.mjs';
import '../book/lib/fast-parse-number.mjs';
import '../book/lib/fast-decode-name.mjs';
import '../book/lib/fast-number-to-string.mjs';
import '../book/lib/fast-size-in-bytes.mjs';
import '../book/lib/fast-parse-object.mjs';
import '../book/lib/fast-sync-load.mjs';
import '../book/lib/fast-indirect-objects.mjs';
import '../book/lib/fast-pdfnumber-pool.mjs';
import { setExpectedDictSlots } from '../book/lib/fast-dict-onebuf.mjs';
import { setExpectedArraySlots } from '../book/lib/fast-array-onebuf.mjs';
import { measure as measureRawPdf } from '../book/lib/measure-pass.mjs';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const PDFParser = require('pdf-lib/cjs/core/parser/PDFParser.js').default;

const rawPdf = readFileSync(new URL('./raw.pdf', import.meta.url));

// Wrap parseIndirectObjectHeader + matchIndirectObjectHeader with
// counters. The throws counter tells us whether the function recovers
// via matchIndirectObjectHeader's try/catch (a non-zero value would
// mean speculation is firing on the production shim stack, which would
// invalidate the "fast-sync-load short-circuit works" claim).
let pioCalls = 0;
let mihCalls = 0;
let pioThrows = 0;
const origPioh = PDFParser.prototype.parseIndirectObjectHeader;
const origMih = PDFParser.prototype.matchIndirectObjectHeader;

PDFParser.prototype.parseIndirectObjectHeader = function () {
  pioCalls++;
  try {
    return origPioh.call(this);
  } catch (e) {
    pioThrows++;
    throw e;
  }
};

PDFParser.prototype.matchIndirectObjectHeader = function () {
  mihCalls++;
  return origMih.call(this);
};

// Warm up: do the measure pass + a single dry run to JIT.
const counts = measureRawPdf(rawPdf);
setExpectedDictSlots(counts.dictSlots);
setExpectedArraySlots(counts.arraySlots);

// Memory before.
if (global.gc) global.gc();
const heapBefore = process.memoryUsage().heapUsed;

const tBefore = Date.now();
const doc = await PDFDocument.load(rawPdf);
const tAfter = Date.now();

if (global.gc) global.gc();
const heapAfter = process.memoryUsage().heapUsed;

console.log('load time:        ', tAfter - tBefore, 'ms');
console.log('pioh calls:       ', pioCalls);
console.log('pioh throws:      ', pioThrows);
console.log('mih  calls:       ', mihCalls);
console.log('heap delta (kept):', ((heapAfter - heapBefore) / 1024 / 1024).toFixed(2), 'MB');
