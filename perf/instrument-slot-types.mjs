// Slot-type instrumentation for fast-dict-onebuf's `main` buffer.
//
// Walks main[0..mainLen) after the process phase is "done writing"
// (i.e. after PDFDocument.load + setOutline; save reads but doesn't
// write) and classifies each slot by its PDFObject subtype. main's
// invariant is even-position = key, odd-position = value (each
// committed frame is even-length, and mainLen always advances by an
// even amount). So the histogram is broken into key-side and
// value-side -- keys should be 100 % PDFName; values are the mixed
// distribution Phase 2's encoding has to handle.
//
// Measurement-only. Imported when --instrument-slot-types is passed
// to perf/measure.mjs (requires --fast-dict-onebuf since main lives
// in that shim).

import { createRequire } from 'node:module';
import { main, getMainLen } from '../book/lib/fast-dict-onebuf.mjs';

const require = createRequire(import.meta.url);
const PDFName      = require('pdf-lib/cjs/core/objects/PDFName.js').default;
const PDFRef       = require('pdf-lib/cjs/core/objects/PDFRef.js').default;
const PDFNumber    = require('pdf-lib/cjs/core/objects/PDFNumber.js').default;
const PDFDict      = require('pdf-lib/cjs/core/objects/PDFDict.js').default;
const PDFArray     = require('pdf-lib/cjs/core/objects/PDFArray.js').default;
const PDFString    = require('pdf-lib/cjs/core/objects/PDFString.js').default;
const PDFHexString = require('pdf-lib/cjs/core/objects/PDFHexString.js').default;
const PDFBool      = require('pdf-lib/cjs/core/objects/PDFBool.js').default;
const PDFNull      = require('pdf-lib/cjs/core/objects/PDFNull.js').default;
const PDFRawStream = require('pdf-lib/cjs/core/objects/PDFRawStream.js').default;
const PDFInvalid   = require('pdf-lib/cjs/core/objects/PDFInvalidObject.js').default;

// Classify a single slot. Returns a string tag.
// Order matters: subtypes before supertypes (PDFCatalog/PageTree/PageLeaf
// extend PDFDict, so the PDFDict check catches them; PDFRawStream extends
// PDFDict too but we check it first).
function classify(v) {
  if (v === undefined)        return 'undefined';
  if (v === null)             return 'null';
  if (v === PDFNull)          return 'PDFNull';
  if (v === PDFBool.True)     return 'PDFBool.True';
  if (v === PDFBool.False)    return 'PDFBool.False';
  if (v instanceof PDFRef)         return 'PDFRef';
  if (v instanceof PDFName)        return 'PDFName';
  if (v instanceof PDFNumber)      return 'PDFNumber';
  if (v instanceof PDFRawStream)   return 'PDFRawStream';
  if (v instanceof PDFInvalid)     return 'PDFInvalidObject';
  if (v instanceof PDFDict)        return 'PDFDict';
  if (v instanceof PDFArray)       return 'PDFArray';
  if (v instanceof PDFHexString)   return 'PDFHexString';
  if (v instanceof PDFString)      return 'PDFString';
  if (typeof v === 'number')  return 'number(raw)';
  if (typeof v === 'string')  return 'string(raw)';
  const ctor = v && v.constructor && v.constructor.name;
  return `OTHER(${ctor || typeof v})`;
}

// Walk main, classify each slot. Returns {keys, values, total, keyTotal, valueTotal}.
export function classifySlots() {
  const mainLen = getMainLen();
  const keys   = Object.create(null);
  const values = Object.create(null);
  let keyTotal = 0, valueTotal = 0;

  for (let i = 0; i < mainLen; i++) {
    const t = classify(main[i]);
    if ((i & 1) === 0) {
      keys[t] = (keys[t] || 0) + 1;
      keyTotal++;
    } else {
      values[t] = (values[t] || 0) + 1;
      valueTotal++;
    }
  }
  return { keys, values, total: mainLen, keyTotal, valueTotal };
}

// Pretty-print, sorted by combined count descending.
export function printHistogram(counts, label = '') {
  const heading = label ? `[${label}] ` : '';
  console.log(`${heading}slot classification: total=${counts.total}  keys=${counts.keyTotal}  values=${counts.valueTotal}`);
  console.log('');

  const allTypes = new Set([...Object.keys(counts.keys), ...Object.keys(counts.values)]);
  const rows = [...allTypes].map(t => ({
    type:    t,
    keys:    counts.keys[t]   || 0,
    values:  counts.values[t] || 0,
    total:   (counts.keys[t] || 0) + (counts.values[t] || 0),
  })).sort((a, b) => b.total - a.total);

  console.log('  type               keys       key%       values     value%     total      total%');
  console.log('  -----------------------------------------------------------------------------------');
  const pct = (n, d) => d ? (100 * n / d).toFixed(2) : '0.00';
  for (const r of rows) {
    const kp = pct(r.keys, counts.keyTotal);
    const vp = pct(r.values, counts.valueTotal);
    const tp = pct(r.total, counts.total);
    console.log(
      `  ${r.type.padEnd(18)} ${r.keys.toString().padStart(8)}  ${kp.padStart(7)}%  ${r.values.toString().padStart(8)}  ${vp.padStart(7)}%  ${r.total.toString().padStart(8)}  ${tp.padStart(6)}%`
    );
  }
}
