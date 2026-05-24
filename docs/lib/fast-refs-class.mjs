// fast-refs variant: use a class-style constructor for stable hidden class.
//
// fast-refs.mjs builds PDFRef instances with
// `Object.create(PDFRef.prototype) + fresh.objectNumber = ... + fresh.gen = ...`.
// V8 treats objects built that way as transitioning through intermediate
// hidden-class maps as each property is added, and the result is roughly
// twice as large per instance as a `new`-built object with the same
// fields. Empirically on the book, PDFRef sits at ~60 B/instance via
// fast-refs whereas PDFName (built via `new PDFName(...)`) sits at ~31 B.
//
// This shim swaps the `Object.create + writes` pattern for a constructor
// that sets both fields in one shot, giving V8 a stable hidden class
// from the first instance. Same external behaviour (pool semantics,
// prototype methods, instanceof checks all work) -- the only change is
// the construction style.
//
// Expected win: ~6 MB heap reduction on the book (226 k PDFRef instances
// × ~30 B saved by skipping the slow-property path).
//
// Mutually exclusive with --fast-refs in the harness.

import { PDFRef } from 'pdf-lib';

// ---- helpers (same as fast-refs.mjs, see commentary there) -------------

function _writeUint(buffer, offset, n) {
  if (n < 10) { buffer[offset] = 0x30 + n; return 1; }
  let m = n, d = 0;
  while (m > 0) { d++; m = (m / 10) | 0; }
  for (let i = d - 1; i >= 0; i--) {
    buffer[offset + i] = 0x30 + (n % 10);
    n = (n / 10) | 0;
  }
  return d;
}

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

// ---- the constructor-based fast PDFRef shape ---------------------------

// Plain function used as a constructor (V8 gives `new`-built instances a
// stable hidden class derived from the assignment order in the body).
// Aliasing the prototype to PDFRef.prototype keeps `instanceof PDFRef`
// satisfied AND means method dispatch resolves on the shared prototype
// (no extra proto-chain hop).
function _FastRef(objectNumber, generationNumber) {
  this.objectNumber = objectNumber;
  this.generationNumber = generationNumber;
}
_FastRef.prototype = PDFRef.prototype;

if (!PDFRef.__fastRefsClassInstalled) {
  const original = PDFRef.of;
  const pool0 = [];

  PDFRef.of = function fastClassOf(objectNumber, generationNumber) {
    if (generationNumber === undefined || generationNumber === 0) {
      const existing = pool0[objectNumber];
      if (existing) return existing;
      const fresh = new _FastRef(objectNumber, 0);
      pool0[objectNumber] = fresh;
      return fresh;
    }
    // gen != 0: fall back to upstream PDFRef.of (its Map-based pool).
    return original.call(PDFRef, objectNumber, generationNumber);
  };

  // Replace prototype methods to ignore the upstream `tag` field (the
  // gen != 0 fallback path still sets it, but our overrides recompute
  // from objectNumber / generationNumber so the tag is unused).
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

  PDFRef.__fastRefsClassInstalled = true;
}
