// Replace pdf-lib's PDFDict.sizeInBytes and PDFDict.copyBytesInto -- both of
// which materialize a fresh Array of [key, value] tuples via this.entries()
// on every call -- with versions that iterate the underlying Map in place.
//
// The upstream entries() helper
// ([PDFDict.js:22](node_modules/pdf-lib/cjs/core/objects/PDFDict.js:22)) is:
//
//   PDFDict.prototype.entries = function () {
//       return Array.from(this.dict.entries());
//   };
//
// Per call that is: one MapIterator + one outer Array + one fresh
// [key, value] tuple per entry (allocated by the iterator itself). The save
// path fires both consumers on every dict (sizeInBytes to measure first,
// then copyBytesInto to write), so on the book that's ~100 k Array.from
// calls feeding the GC; PDFDict.entries was the largest non-GC row in the
// process profile (~10 % of process self-time) and (garbage collector) sat
// at the top.
//
// Map.prototype.forEach((value, key) => ...) calls back with positional
// arguments and never allocates a tuple. The two consumers don't need the
// tuple form -- they immediately destructure -- so swapping is local.
//
// We do NOT touch PDFDict.prototype.entries itself: clone() and toString()
// still call it and rely on the Array-of-tuples contract. Those paths fire
// rarely (clone on incremental updates only, toString in debug output) and
// aren't worth the contract churn.
//
// Side-effecting import. Import once before any pdf-lib save:
//
//   import "./lib/fast-dict-iter.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { createRequire } from 'node:module';

const require    = createRequire(import.meta.url);
const PDFDict    = require('pdf-lib/cjs/core/objects/PDFDict.js').default;
const CharCodes  = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;

// Callbacks are module-level (not closures) so Map.forEach reuses the same
// function reference on every call instead of allocating a fresh context
// per invocation. Per-call state is threaded through forEach's `thisArg`
// (one small object alloc per call, instead of one closure context plus
// one heap cell for the captured `offset` mutation).
function _sizeInBytesEntry(value, key) {
  this.s += key.sizeInBytes() + value.sizeInBytes() + 2;
}

function _copyBytesIntoEntry(value, key) {
  const buf = this.buf;
  let off = this.off;
  off += key.copyBytesInto(buf, off);
  buf[off++] = CharCodes.Space;
  off += value.copyBytesInto(buf, off);
  buf[off++] = CharCodes.Newline;
  this.off = off;
}

if (!PDFDict.prototype.__fastDictIterInstalled) {
  PDFDict.prototype.sizeInBytes = function () {
    const ctx = { s: 5 };
    this.dict.forEach(_sizeInBytesEntry, ctx);
    return ctx.s;
  };

  PDFDict.prototype.copyBytesInto = function (buffer, offset) {
    const initialOffset = offset;
    buffer[offset++] = CharCodes.LessThan;
    buffer[offset++] = CharCodes.LessThan;
    buffer[offset++] = CharCodes.Newline;
    const ctx = { buf: buffer, off: offset };
    this.dict.forEach(_copyBytesIntoEntry, ctx);
    offset = ctx.off;
    buffer[offset++] = CharCodes.GreaterThan;
    buffer[offset++] = CharCodes.GreaterThan;
    return offset - initialOffset;
  };

  PDFDict.prototype.__fastDictIterInstalled = true;
}
