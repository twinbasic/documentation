// Count instances of each PDF* class touched by a load on the book.
//
// Two views of "how many":
//
//   1. "Counted by .of()" -- every call to ClassName.of(...) regardless
//      of whether the pool returned an existing instance. Tells you call
//      frequency. Useful for spotting "PDFRef.of fires 1.4 M times per
//      load" vs "only 226 k of those are unique" (the rest are pool
//      hits).
//   2. "Observed in indirectObjects after load" -- walks the loaded
//      PDFContext.enumerateIndirectObjects() and bumps a counter per
//      top-level object's runtime class. Inline (nested) PDFDict /
//      PDFArray instances don't show up here; for those, use the
//      heap-profile rows directly.
//
// Wired up to inform the class-constructor shape work in
// fast-refs-class / fast-dict-onebuf / fast-array-onebuf. Output on
// the book:
//
//   Counted by .of():
//     PDFRef               1429034   (~226 k unique, rest pool hits)
//     PDFNumber             284105   (~16 k unique)
//     PDFName              1681225   (~4.8 k unique)
//     PDFString               7375
//     PDFRawStream            2061
//
//   Observed in indirectObjects after load:
//     PDFCatalog                  1
//     PDFPageTree               238
//     PDFPageLeaf              1651
//     PDFRawStream            2061
//     PDFDict                220815   (top-level only; ~261 k incl. nested)
//     PDFArray                1651   (top-level only; ~80 k incl. nested)
//
// To get unique counts on the pooled classes, see the throwaway snippet
// in the "Class-constructor shapes" section of README.md (wraps PDFRef.of
// / PDFName.of / PDFNumber.of with a Set-based dedupe).
//
// Run: node perf/instrument-objclasses.mjs

import '../docs/lib/fast-refs-class.mjs';
import '../docs/lib/fast-inflate.mjs';
import '../docs/lib/fast-parse-number.mjs';
import '../docs/lib/fast-decode-name.mjs';
import '../docs/lib/fast-number-to-string.mjs';
import '../docs/lib/fast-size-in-bytes.mjs';
import '../docs/lib/fast-parse-object.mjs';
import '../docs/lib/fast-sync-load.mjs';
import '../docs/lib/fast-indirect-objects.mjs';
import '../docs/lib/fast-pdfnumber-pool.mjs';
import { setExpectedDictSlots } from '../docs/lib/fast-dict-onebuf.mjs';
import { setExpectedArraySlots } from '../docs/lib/fast-array-onebuf.mjs';
import { measure as measureRawPdf } from '../docs/lib/measure-pass.mjs';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const PDFRef        = require('pdf-lib/cjs/core/objects/PDFRef.js').default;
const PDFName       = require('pdf-lib/cjs/core/objects/PDFName.js').default;
const PDFNumber     = require('pdf-lib/cjs/core/objects/PDFNumber.js').default;
const PDFString     = require('pdf-lib/cjs/core/objects/PDFString.js').default;
const PDFHexString  = require('pdf-lib/cjs/core/objects/PDFHexString.js').default;
const PDFDict       = require('pdf-lib/cjs/core/objects/PDFDict.js').default;
const PDFArray      = require('pdf-lib/cjs/core/objects/PDFArray.js').default;
const PDFStream     = require('pdf-lib/cjs/core/objects/PDFStream.js').default;
const PDFRawStream  = require('pdf-lib/cjs/core/objects/PDFRawStream.js').default;
const PDFBool       = require('pdf-lib/cjs/core/objects/PDFBool.js').default;
const PDFCatalog    = require('pdf-lib/cjs/core/structures/PDFCatalog.js').default;
const PDFPageTree   = require('pdf-lib/cjs/core/structures/PDFPageTree.js').default;
const PDFPageLeaf   = require('pdf-lib/cjs/core/structures/PDFPageLeaf.js').default;
const PDFObjectStream    = require('pdf-lib/cjs/core/structures/PDFObjectStream.js').default;
const PDFCrossRefStream  = require('pdf-lib/cjs/core/structures/PDFCrossRefStream.js').default;
const PDFFlateStream     = require('pdf-lib/cjs/core/structures/PDFFlateStream.js').default;
const PDFContentStream   = require('pdf-lib/cjs/core/structures/PDFContentStream.js').default;

const counts = new Map();
function track(name, Cls) {
  counts.set(name, 0);
  const origOf = Cls.of;
  if (typeof origOf === 'function') {
    Cls.of = function (...args) {
      const r = origOf.apply(this, args);
      counts.set(name, counts.get(name) + 1);
      return r;
    };
  }
}

// Counting via .of for the pooled / factory-method classes. PDFDict
// / PDFArray / PDFPageLeaf are constructed via the fast-dict-onebuf
// and fast-array-onebuf factory paths; for those, the post-load walk
// below scans PDFContext.enumerateIndirectObjects() instead.
track('PDFRef',        PDFRef);
track('PDFNumber',     PDFNumber);
track('PDFName',       PDFName);
track('PDFString',     PDFString);
track('PDFHexString',  PDFHexString);
track('PDFRawStream',  PDFRawStream);
track('PDFObjectStream', PDFObjectStream);

const rawPdf = readFileSync(new URL('./raw.pdf', import.meta.url));

const dictCounts = measureRawPdf(rawPdf);
setExpectedDictSlots(dictCounts.dictSlots);
setExpectedArraySlots(dictCounts.arraySlots);

const tBefore = Date.now();
const doc = await PDFDocument.load(rawPdf);
console.log('load:    ', Date.now() - tBefore, 'ms');

// After-load count: scan indirectObjects for each class.
const seen = new Map();
function bump(name) { seen.set(name, (seen.get(name) || 0) + 1); }
function walk(obj, depth = 0) {
  if (obj == null) return;
  // Identify class.
  if (obj instanceof PDFCatalog)         bump('PDFCatalog');
  else if (obj instanceof PDFPageTree)   bump('PDFPageTree');
  else if (obj instanceof PDFPageLeaf)   bump('PDFPageLeaf');
  else if (obj instanceof PDFObjectStream) bump('PDFObjectStream');
  else if (obj instanceof PDFCrossRefStream) bump('PDFCrossRefStream');
  else if (obj instanceof PDFFlateStream) bump('PDFFlateStream');
  else if (obj instanceof PDFContentStream) bump('PDFContentStream');
  else if (obj instanceof PDFRawStream)  bump('PDFRawStream');
  else if (obj instanceof PDFStream)     bump('PDFStream');
  else if (obj instanceof PDFDict)       bump('PDFDict');
  else if (obj instanceof PDFArray)      bump('PDFArray');
  else if (obj instanceof PDFName)       bump('PDFName');
  else if (obj instanceof PDFNumber)     bump('PDFNumber');
  else if (obj instanceof PDFString)     bump('PDFString');
  else if (obj instanceof PDFHexString)  bump('PDFHexString');
  else if (obj instanceof PDFBool)       bump('PDFBool');
}
for (const [, obj] of doc.context.enumerateIndirectObjects()) walk(obj);

console.log('\nCounted by .of():');
for (const [k, v] of counts) console.log('  ' + k.padEnd(20), v);

console.log('\nObserved in indirectObjects after load:');
const names = ['PDFCatalog','PDFPageTree','PDFPageLeaf','PDFObjectStream',
  'PDFCrossRefStream','PDFFlateStream','PDFContentStream','PDFRawStream',
  'PDFStream','PDFDict','PDFArray','PDFName','PDFNumber','PDFString',
  'PDFHexString','PDFBool'];
for (const n of names) console.log('  ' + n.padEnd(20), seen.get(n) || 0);
