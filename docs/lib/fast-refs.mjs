// Replace pdf-lib's PDFRef.of pool lookup with a dense-array cache
// for the generation=0 case (the overwhelmingly common one), AND
// drop the per-instance `tag` string entirely.
//
// The upstream implementation
// (node_modules/pdf-lib/cjs/core/objects/PDFRef.js) keys its pool by
// a freshly-built string `<obj> <gen> R` on every call:
//
//   var tag = objectNumber + " " + generationNumber + " R";
//   var instance = pool.get(tag);
//
// On the book we see ~1.2 M PDFRef.of calls per load, 82 % of them
// with gen=0; each call allocates the tag string before Map.get can
// hash it. That's ~330 ms of self-time on the process-phase profile
// plus measurable GC pressure.
//
// Shim part 1: dense array indexed by objectNumber for the gen=0 branch.
// Plain array indexing, no string alloc, no Map hash. On a gen=0 cache
// miss we construct the PDFRef directly via
// `Object.create(PDFRef.prototype)` plus manual field init, skipping
// both the ENFORCER check and the upstream `pool.set(tag, instance)`.
//
// Shim part 2: drop the per-instance `tag` field. Upstream caches
// `<obj> <gen> R` on each PDFRef so toString / sizeInBytes /
// copyBytesInto can read it back. After fast-array-onebuf shipped,
// the heap profile showed PDFParser.parseIndirectObjectHeader sitting
// at 13.7 MB (25 % of total). The attribution chain (via
// perf/find-heap-callers.mjs):
//
//   parseIndirectObjectHeader  → skipJibberish (14.2 MB)
//     → matchIndirectObjectHeader (try/catch wrapper)
//       → parseIndirectObjectHeader → fastOf
//
// skipJibberish runs after every successful indirect object parse and
// speculatively calls matchIndirectObjectHeader to detect the next
// `N M obj` header. On valid PDFs the speculation always succeeds, so
// fastOf fires once per indirect-object boundary, populating the
// dense-array cache. The subsequent "real" parseIndirectObject then
// hits the cache. V8 inlines fastOf at this call site (small + hot
// from speculation) so the attribution lands on the caller -- 13.7 MB
// of which was the tag-string allocation (`objectNumber + ' 0 R'`):
// V8 builds 1-2 intermediate concat strings + the final ~25-35 B
// tag, ~150 k times.
//
// Eliminating the `tag` field collapses all of that. The prototype
// methods now compute their results from objectNumber / generationNumber
// directly. copyBytesInto writes digits straight into the output buffer
// with a no-allocation _writeUint helper; sizeInBytes returns
// digitCount(obj) + digitCount(gen) + 3 (for " " + " R"); toString
// builds on demand (only used for debug, no caching needed).
//
// gen != 0 PDFRefs constructed via the upstream path still have `tag`
// set by the upstream constructor -- our overrides ignore the field,
// so the tag string is allocated-then-wasted. gen != 0 is ~18 % of refs
// at ~50 K instances; the waste is bounded and not worth patching the
// constructor for.
//
// gen != 0 cache lookups (pdf-lib's xref-stream bookkeeping where
// "generation" encodes an in-ObjStm index per PDF 1.5 spec, see
// PDFXRefStreamParser.js:74-80) still pass through the original
// PDFRef.of -- their Map pool is harmless at gen!=0's volume.
//
// Side-effecting import. Import once before any pdf-lib operation.
// Idempotent.

import { PDFRef } from "pdf-lib";

// Write n's decimal representation into buffer starting at offset.
// No allocations. Returns the number of bytes written. n must be a
// non-negative integer.
function _writeUint(buffer, offset, n) {
  if (n < 10) { buffer[offset] = 0x30 + n; return 1; }
  // Count digits.
  let m = n, d = 0;
  while (m > 0) { d++; m = (m / 10) | 0; }
  // Write digits backwards.
  for (let i = d - 1; i >= 0; i--) {
    buffer[offset + i] = 0x30 + (n % 10);
    n = (n / 10) | 0;
  }
  return d;
}

// Non-allocating decimal digit count for non-negative integers.
// Ladder catches the common small-number cases without arithmetic.
function _digitCount(n) {
  if (n < 10)      return 1;
  if (n < 100)     return 2;
  if (n < 1000)    return 3;
  if (n < 10000)   return 4;
  if (n < 100000)  return 5;
  if (n < 1000000) return 6;
  let d = 0;
  while (n > 0) { d++; n = (n / 10) | 0; }
  return d;
}

if (!PDFRef.__fastPoolInstalled) {
  const original = PDFRef.of;
  const pool0 = [];
  PDFRef.of = function fastOf(objectNumber, generationNumber) {
    if (generationNumber === undefined || generationNumber === 0) {
      const existing = pool0[objectNumber];
      if (existing) return existing;
      // Direct construction -- skip ENFORCER check, skip upstream pool.set,
      // skip the per-instance `tag` string (the prototype methods now
      // compute their results from objectNumber / generationNumber).
      const fresh = Object.create(PDFRef.prototype);
      fresh.objectNumber = objectNumber;
      fresh.generationNumber = 0;
      pool0[objectNumber] = fresh;
      return fresh;
    }
    return original.call(PDFRef, objectNumber, generationNumber);
  };

  // Replace the upstream prototype methods to ignore `tag` entirely.
  // Works for both gen=0 (tag is absent) and gen!=0 (tag is set by
  // upstream's constructor but ignored).

  PDFRef.prototype.toString = function () {
    return this.objectNumber + ' ' + this.generationNumber + ' R';
  };

  PDFRef.prototype.sizeInBytes = function () {
    return _digitCount(this.objectNumber) + _digitCount(this.generationNumber) + 3;
  };

  PDFRef.prototype.copyBytesInto = function (buffer, offset) {
    const start = offset;
    offset += _writeUint(buffer, offset, this.objectNumber);
    buffer[offset++] = 0x20;  // ' '
    offset += _writeUint(buffer, offset, this.generationNumber);
    buffer[offset++] = 0x20;  // ' '
    buffer[offset++] = 0x52;  // 'R'
    return offset - start;
  };

  PDFRef.__fastPoolInstalled = true;
}
