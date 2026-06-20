// Replace PDFContext.indirectObjects (Map<PDFRef, PDFObject>) with a
// dense array keyed by objectNumber for the gen=0 path.
//
// Motivation. After fast-dict-array shipped, the only remaining hot
// Map.set in the process-phase heap profile was
// PDFContext.assign's `this.indirectObjects.set(ref, object)`:
//
//     $ node find-heap-callers.mjs <post-ship>.heapprofile set
//     set: total=14.49 MB
//       7168.04 KB   PDFParser.parseIndirectObjectHeader
//       7168.04 KB   parseIndirectObjectSync @ fast-sync-load.mjs:140
//        ...
//
// (Both ~7 MB rows are V8 inline-attribution duplicates of the same
// logical call.) That's 14.5 MB of Map traffic for one Map -- one
// `set` per indirect object during load, with the hash table
// rebuilding through ~14 doubling steps to fit the book's ~9 k
// indirect objects, discarding each intermediate arena to GC.
//
// PDFRefs are overwhelmingly gen=0 (revisions / incremental updates
// are the only gen!=0 producers, and they're rare). fast-refs.mjs
// already exploits this on the key side -- a dense array indexed by
// objectNumber for the PDFRef pool, Map fallback for gen!=0. This
// shim does the same on the value side for PDFContext.indirectObjects.
//
// Mechanism. Patch PDFContext.prototype.assign / lookup / lookupMaybe
// / delete / getObjectRef / enumerateIndirectObjects to consult an
// auxiliary `this._objArr` (dense array indexed by objectNumber) for
// gen=0 PDFRefs first, falling back to the original Map for gen!=0.
// The dense array is created lazily on first assign so we don't need
// to touch the constructor.
//
// The original `this.indirectObjects` Map is left in place for two
// reasons: (a) gen!=0 entries actually need it, and (b) external code
// that reads `pdfContext.indirectObjects` directly (none in our
// pipeline, but reasonable to defensive-preserve) continues to see a
// Map-shaped object -- just usually empty.
//
// As a side benefit, `enumerateIndirectObjects` no longer needs to
// sort: dense-array iteration is already in ascending objectNumber
// order. (The Map-sourced gen!=0 entries are merged in sorted.)
//
// Side-effecting import. Import once before any PDFDocument.load:
//
//   import "./lib/fast-indirect-objects.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFContext = require('pdf-lib/cjs/core/PDFContext.js').default;
const PDFRef     = require('pdf-lib/cjs/core/objects/PDFRef.js').default;
const PDFNull    = require('pdf-lib/cjs/core/objects/PDFNull.js').default;
const UnexpectedObjectTypeError = require('pdf-lib/cjs/core/errors.js').UnexpectedObjectTypeError;

const byAscendingObjectNumber = ([a], [b]) => a.objectNumber - b.objectNumber;

if (!PDFContext.prototype.__fastIndirectObjectsInstalled) {

  // ---- assign -------------------------------------------------------
  // Hot path. gen=0 → dense array store; gen!=0 → Map. Maintains
  // largestObjectNumber as before.

  PDFContext.prototype.assign = function (ref, object) {
    if (ref.generationNumber === 0) {
      if (!this._objArr) this._objArr = [];
      this._objArr[ref.objectNumber] = object;
    } else {
      this.indirectObjects.set(ref, object);
    }
    if (ref.objectNumber > this.largestObjectNumber) {
      this.largestObjectNumber = ref.objectNumber;
    }
  };

  // ---- delete -------------------------------------------------------
  // Returns true iff something was removed. Dense slots are nulled
  // (not spliced) so subsequent objectNumbers retain their slots.

  PDFContext.prototype.delete = function (ref) {
    if (ref.generationNumber === 0 && this._objArr) {
      const slot = this._objArr[ref.objectNumber];
      if (slot !== undefined) {
        this._objArr[ref.objectNumber] = undefined;
        return true;
      }
      return false;
    }
    return this.indirectObjects.delete(ref);
  };

  // ---- lookup / lookupMaybe -----------------------------------------
  // Resolve the ref to an object via the dense array (gen=0) or Map
  // (gen!=0), then run the original type-check tail verbatim.

  function _resolve(ctx, ref) {
    if (!(ref instanceof PDFRef)) return ref;
    if (ref.generationNumber === 0 && ctx._objArr) {
      return ctx._objArr[ref.objectNumber];
    }
    return ctx.indirectObjects.get(ref);
  }

  PDFContext.prototype.lookupMaybe = function (ref) {
    const types = [];
    for (let i = 1, len = arguments.length; i < len; i++) types[i - 1] = arguments[i];
    const preservePDFNull = types.includes(PDFNull);
    const result = _resolve(this, ref);
    if (!result || (result === PDFNull && !preservePDFNull)) return undefined;
    for (let idx = 0, len = types.length; idx < len; idx++) {
      const type = types[idx];
      if (type === PDFNull) {
        if (result === PDFNull) return result;
      } else {
        if (result instanceof type) return result;
      }
    }
    throw new UnexpectedObjectTypeError(types, result);
  };

  PDFContext.prototype.lookup = function (ref) {
    const types = [];
    for (let i = 1, len = arguments.length; i < len; i++) types[i - 1] = arguments[i];
    const result = _resolve(this, ref);
    if (types.length === 0) return result;
    for (let idx = 0, len = types.length; idx < len; idx++) {
      const type = types[idx];
      if (type === PDFNull) {
        if (result === PDFNull) return result;
      } else {
        if (result instanceof type) return result;
      }
    }
    throw new UnexpectedObjectTypeError(types, result);
  };

  // ---- getObjectRef -------------------------------------------------
  // Linear scan. Dense array first (gen=0 PDFRef reconstructed from
  // objectNumber via PDFRef.of, which fast-refs has cached). Fall
  // back to Map for any gen!=0 candidates.

  PDFContext.prototype.getObjectRef = function (pdfObject) {
    if (this._objArr) {
      for (let i = 0, len = this._objArr.length; i < len; i++) {
        if (this._objArr[i] === pdfObject) return PDFRef.of(i, 0);
      }
    }
    for (const entry of this.indirectObjects) {
      if (entry[1] === pdfObject) return entry[0];
    }
    return undefined;
  };

  // ---- enumerateIndirectObjects -------------------------------------
  // Dense array is already iterable in objectNumber order. Merge in
  // any gen!=0 entries from the Map and sort once -- but only if the
  // Map is non-empty (the common case for parsed PDFs is empty).

  PDFContext.prototype.enumerateIndirectObjects = function () {
    const out = [];
    if (this._objArr) {
      for (let i = 0, len = this._objArr.length; i < len; i++) {
        const obj = this._objArr[i];
        if (obj !== undefined) out.push([PDFRef.of(i, 0), obj]);
      }
    }
    if (this.indirectObjects.size === 0) return out;
    for (const entry of this.indirectObjects) out.push(entry);
    return out.sort(byAscendingObjectNumber);
  };

  PDFContext.prototype.__fastIndirectObjectsInstalled = true;
}
