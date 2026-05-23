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
// Plain array indexing, no string alloc, no Map hash.
//
// On a gen=0 cache miss we construct the PDFRef directly via
// `Object.create(PDFRef.prototype)` plus manual field init, skipping
// both the ENFORCER check and the upstream `pool.set(tag, instance)`.
// The upstream pool was the last remaining hot Map.set in the heap
// profile after fast-indirect-objects shipped (~7 MB of `set` from
// the once-per-unique-objectNumber miss), all of which becomes dead
// arena allocation once the dense array is the authoritative cache.
// PDFRef's super (PDFObject) has a no-op constructor; the only
// instance fields the prototype methods read are `objectNumber`,
// `generationNumber`, and `tag` (used by toString / sizeInBytes /
// copyBytesInto), so direct construction is safe.
//
// gen != 0 calls (the other ~18 %, pdf-lib's xref-stream bookkeeping
// where "generation" encodes an in-ObjStm index per PDF 1.5 spec,
// see PDFXRefStreamParser.js:74-80) still pass through the original
// PDFRef.of -- their Map pool is harmless at gen!=0's volume.
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
      // Direct construction -- skip ENFORCER check, skip upstream pool.set.
      const fresh = Object.create(PDFRef.prototype);
      fresh.objectNumber = objectNumber;
      fresh.generationNumber = 0;
      fresh.tag = objectNumber + ' 0 R';
      pool0[objectNumber] = fresh;
      return fresh;
    }
    return original.call(PDFRef, objectNumber, generationNumber);
  };
  PDFRef.__fastPoolInstalled = true;
}
