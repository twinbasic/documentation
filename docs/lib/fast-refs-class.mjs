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
// from the first instance.
//
// Two-shape variant: most PDFRefs on fresh-Chrome workloads are gen=0
// and don't need to carry generationNumber at all. We allocate them via
// _FastRef (single `objectNumber` inline slot) and let the prototype
// supply a default `generationNumber = 0`. The rare gen!=0 path (PDF
// spec allows it; our workload only hits it for the xref "free" entry
// at object 0) uses _FastRefGen with both fields as own data properties.
// V8 sees a bounded 2-shape polymorphism on PDFRef.prototype, and the
// monomorphic hot path (gen=0 instances) keeps inline-field-read speed
// for `.objectNumber` and `.generationNumber` reads -- no accessor-
// property boundary to break inlining at upstream pdf-lib call sites
// (PDFCrossRefSection.append, PDFCrossRefStream entry tuples,
// PDFWriter.serializeToBuffer, our fast-indirect-objects shim, ...).
//
// Expected per-gen=0 instance: header (8 B) + 1 inline slot (4 B) = 12 B
// raw, aligned to 16 B by V8 -- versus 12 + 2*4 = 20 B raw, aligned to
// 24 B for a 2-slot instance. Saves 8 B per gen=0 PDFRef * ~226 k unique
// = ~1.8 MB heap on the book.
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

// ---- the constructor-based fast PDFRef shapes --------------------------

// gen=0 instances: single inline `objectNumber` slot. `generationNumber`
// is supplied as a data-property default on PDFRef.prototype (set below),
// so reads return 0 without any accessor dispatch.
function _FastRef(objectNumber) {
  this.objectNumber = objectNumber;
}
_FastRef.prototype = PDFRef.prototype;

// gen!=0 instances: both fields as own data properties, shadowing the
// prototype default. V8 sees a second hidden class -- bounded 2-shape
// polymorphism, well-handled by inline caches.
function _FastRefGen(objectNumber, generationNumber) {
  this.objectNumber = objectNumber;
  this.generationNumber = generationNumber;
}
_FastRefGen.prototype = PDFRef.prototype;

if (!PDFRef.__fastRefsClassInstalled) {
  const pool0 = [];                // dense gen=0 cache, indexed by objectNumber
  const poolGenN = new Map();      // gen!=0 cache, keyed by "N M" string

  PDFRef.of = function fastClassOf(objectNumber, generationNumber) {
    if (generationNumber === undefined || generationNumber === 0) {
      const existing = pool0[objectNumber];
      if (existing) return existing;
      const fresh = new _FastRef(objectNumber);
      pool0[objectNumber] = fresh;
      return fresh;
    }
    // gen != 0: this path is dead on fresh-Chrome workloads except for
    // the xref "free" entry at object 0. Kept for spec correctness.
    const key = objectNumber + ' ' + generationNumber;
    const existing = poolGenN.get(key);
    if (existing) return existing;
    const fresh = new _FastRefGen(objectNumber, generationNumber);
    poolGenN.set(key, fresh);
    return fresh;
  };

  // Default generationNumber on the prototype. _FastRef instances inherit
  // this (no own property); _FastRefGen instances shadow it with their
  // own data property. Both look like data-property reads to V8's IC.
  PDFRef.prototype.generationNumber = 0;

  // Hot prototype methods read `objectNumber` / `generationNumber` as
  // regular data properties. The upstream `tag` string is gone -- no
  // instance carries it any more.
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
