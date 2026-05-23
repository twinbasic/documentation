// Replace pdf-lib's PDFRef.of pool lookup with a dense-array cache
// for the generation=0 case (the overwhelmingly common one).
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
// Shim: dense array indexed by objectNumber for the gen=0 branch.
// Plain array indexing, no string alloc, no Map hash. Cache-in-front
// of the original PDFRef.of so we don't need its module-private
// ENFORCER -- on miss we delegate, on hit we return our cached
// instance.
//
// gen != 0 calls (the other 18 %, pdf-lib's xref-stream bookkeeping
// where the "generation" field encodes an in-ObjStm index per
// PDF 1.5 spec, see PDFXRefStreamParser.js:74-80) pass through to
// the original unchanged.
//
// Side-effecting import. Import once before any pdf-lib operation.
// Idempotent.

import { PDFRef } from "pdf-lib";

if (!PDFRef.__fastPoolInstalled) {
  const original = PDFRef.of;
  const pool0 = [];
  PDFRef.of = function fastOf(objectNumber, generationNumber) {
    if (generationNumber === undefined || generationNumber === 0) {
      const existing = pool0[objectNumber];
      if (existing) return existing;
      const fresh = original.call(PDFRef, objectNumber, 0);
      pool0[objectNumber] = fresh;
      return fresh;
    }
    return original.call(PDFRef, objectNumber, generationNumber);
  };
  PDFRef.__fastPoolInstalled = true;
}
