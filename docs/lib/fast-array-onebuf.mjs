// One-buffer PDFArray: every committed element lives in a single
// append-only JS Array (arrayMain), kept for the document's lifetime.
// Mirror of fast-dict-onebuf's strategy applied to PDFArray. Backing
// is a plain heterogeneous JS Array -- slots hold the original
// PDFObject references directly. No encoding, no decode on read; the
// hot path is `arrayMain[start + i]`.
//
// Phase 3 of fast-dict-encoded did the same range-view refactor on
// PDFArray but used a Float64Array + encoded slots (mirroring its
// dict shape). The encoded backing cost ~300 ms of decodeValue
// dispatch during save (PDFArray.copyBytesInto iterates ~500 k
// elements). This shim keeps the heap win (~19 MB on the book by
// removing each PDFArray's per-instance `this.array = []`) without
// paying the decode cost: slots are JS references, reads are direct.
//
// 40-bit packed Number layout (well within Number.MAX_SAFE_INTEGER):
//   bits  0-23: start  (24 bits, max 16 M slots in arrayMain)
//   bits 24-39: length (16 bits, max 65 536 elements; max observed
//                       ~25 k on the book)
//   bits 40-52: spare (13 bits)
//
// Recursion. parseArray pushes elements onto a per-parser _arrayTemp;
// inner parseArray invocations append on top, commit their frame to
// arrayMain in one append, and pop temp back. Inner / outer ranges
// in arrayMain do not overlap. _arrayTemp is independent of
// fast-dict-onebuf's _dictTemp so dict <-> array recursion is fine.
//
// Mutations:
//   - set(i, v): in-place replace (safe; no length change)
//   - push(v) at HWM:    in-place extend (no other arrays follow)
//   - push(v) not at HWM: COW the range to tail, then push
//   - insert / remove:   always COW (shifts would corrupt neighbours)
// Same at-HWM-determines-safety logic as fast-dict-onebuf; no owned
// bit needed (see fast-dict-onebuf commit 7e8b1f7).
//
// Singleton PDFContext (one PDFDocument.load per process in our
// pipeline). The singleton is duplicated rather than shared with
// fast-dict-onebuf -- the mechanism is ten lines and keeping each
// shim independently injectable is worth more than dedup'ing it.
// Both shims end up holding references to the same PDFContext.
//
// Composes with --fast-dict-onebuf. Mutually exclusive with
// --fast-dict-encoded (which subsumes both via its own encoded shape).

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFArray        = require('pdf-lib/cjs/core/objects/PDFArray.js').default;
const PDFObjectParser = require('pdf-lib/cjs/core/parser/PDFObjectParser.js').default;
const CharCodes       = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;

// ---- The single buffer ---------------------------------------------

// Pre-sized to total array slots + slack on the book. Other workloads
// grow it naturally from this starting size. When the measure-pass
// shim runs first, it calls setExpectedArraySlots() before parse,
// which resizes `arrayMain` to exact measured demand via
// `arrayMain.length = N`.
const ARRAY_MAIN_INITIAL_CAP = 800000;
const arrayMain = new Array(ARRAY_MAIN_INITIAL_CAP);
let arrayMainLen = 0;

export { arrayMain };
export function getArrayMainLen() { return arrayMainLen; }

// Resize arrayMain in place. Must be called before any parseArray /
// withContext (i.e. while arrayMainLen is still 0). `slack` is a
// multiplier on `slots`; default 1.0 (exact). Same in-place-resize
// rationale as fast-dict-onebuf's setExpectedDictSlots: reassigning
// the module-level binding invalidates V8's inline-cache slots in
// every closure that reads it, and the deopt + recompile shows up as
// a parse-time allocation spike.
export function setExpectedArraySlots(slots, slack = 1.0) {
  if (arrayMainLen > 0) {
    throw new Error(
      `fast-array-onebuf: setExpectedArraySlots called after parse started (arrayMainLen=${arrayMainLen})`,
    );
  }
  arrayMain.length = Math.ceil(slots * slack);
}

// ---- Bit-packing helpers -------------------------------------------

const POW_24 = 16777216;          // 2^24
const MASK_24 = 0xFFFFFF;
const MASK_16 = 0xFFFF;

const MAX_START  = POW_24;          // exclusive
const MAX_LENGTH = 1 << 16;         // 65 536, exclusive

function pack(start, length) {
  if (start  >= MAX_START)  throw new Error(`fast-array-onebuf: start ${start} exceeds 24-bit budget`);
  if (length >= MAX_LENGTH) throw new Error(`fast-array-onebuf: length ${length} exceeds 16-bit budget`);
  return start + length * POW_24;
}

function _start(d)  { return d & MASK_24; }
function _length(d) { return Math.floor(d / POW_24) & MASK_16; }

// ---- Singleton context ---------------------------------------------

let _singletonContext = null;

function _registerContext(ctx) {
  if (_singletonContext === null) {
    _singletonContext = ctx;
  } else if (_singletonContext !== ctx) {
    throw new Error('fast-array-onebuf: expected a singleton PDFContext, got a second distinct one.');
  }
}

// ---- Append + COW helpers ------------------------------------------

function _appendFromTemp(temp, fromOffset, lenSlots) {
  for (let i = 0; i < lenSlots; i++) {
    arrayMain[arrayMainLen + i] = temp[fromOffset + i];
  }
  arrayMainLen += lenSlots;
}

function _appendArray(arr) {
  const len = arr.length;
  for (let i = 0; i < len; i++) arrayMain[arrayMainLen + i] = arr[i];
  arrayMainLen += len;
}

// COW: copy this array's range to arrayMain's tail. If already at
// the HWM, nothing to copy -- return d unchanged.
function _cow(pa) {
  const d = pa.d;
  const start = _start(d);
  const length = _length(d);
  if (start + length === arrayMainLen) return d;   // at HWM
  const newStart = arrayMainLen;
  for (let i = 0; i < length; i++) arrayMain[arrayMainLen + i] = arrayMain[start + i];
  arrayMainLen += length;
  return pack(newStart, length);
}

// ---- Construction --------------------------------------------------
//
// Use a plain-function constructor (`_FastArray`) with the prototype
// aliased to PDFArray.prototype instead of `Object.create + writes`.
// Same shape change fast-refs-class and fast-dict-onebuf made: V8
// gives `new`-built instances a stable hidden class from the first
// instance and drops per-instance cost vs the slow-property path
// taken by Object.create + later property writes.
//
// No subclass dispatch needed -- PDFArray has no subclasses in
// pdf-lib (unlike PDFDict's PDFCatalog / PDFPageTree / PDFPageLeaf).

function _FastArray(d) { this.d = d; }
_FastArray.prototype = PDFArray.prototype;

function _makeFromRange(start, length, ctx) {
  _registerContext(ctx);
  return new _FastArray(pack(start, length));
}

function _makeFromAppend(arr, ctx) {
  const start = arrayMainLen;
  _appendArray(arr);
  return _makeFromRange(start, arr.length, ctx);
}

if (!PDFArray.prototype.__fastArrayOnebufInstalled) {

  // ---- PDFArray.prototype -----------------------------------------

  PDFArray.prototype.size = function () {
    return _length(this.d);
  };

  PDFArray.prototype.push = function (object) {
    const d0 = this.d;
    const start0 = _start(d0);
    const length0 = _length(d0);
    let dNow = d0;
    if (start0 + length0 !== arrayMainLen) {
      dNow = _cow(this);
    }
    arrayMain[arrayMainLen++] = object;
    const start = _start(dNow);
    this.d = pack(start, length0 + 1);
  };

  PDFArray.prototype.get = function (index) {
    return arrayMain[_start(this.d) + index];
  };

  PDFArray.prototype.set = function (index, object) {
    arrayMain[_start(this.d) + index] = object;
  };

  PDFArray.prototype.indexOf = function (object) {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    for (let i = 0; i < length; i++) {
      if (arrayMain[start + i] === object) return i;
    }
    return undefined;
  };

  PDFArray.prototype.insert = function (index, object) {
    // Always COW -- shifting elements in place would corrupt other
    // arrays' ranges past this one.
    const d0 = this.d;
    const start0 = _start(d0);
    const length0 = _length(d0);
    const newStart = arrayMainLen;
    for (let i = 0; i < index; i++) {
      arrayMain[arrayMainLen++] = arrayMain[start0 + i];
    }
    arrayMain[arrayMainLen++] = object;
    for (let i = index; i < length0; i++) {
      arrayMain[arrayMainLen++] = arrayMain[start0 + i];
    }
    this.d = pack(newStart, length0 + 1);
  };

  PDFArray.prototype.remove = function (index) {
    // Always COW (same reason as insert).
    const d0 = this.d;
    const start0 = _start(d0);
    const length0 = _length(d0);
    const newStart = arrayMainLen;
    for (let i = 0; i < length0; i++) {
      if (i === index) continue;
      arrayMain[arrayMainLen++] = arrayMain[start0 + i];
    }
    this.d = pack(newStart, length0 - 1);
  };

  PDFArray.prototype.asArray = function () {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    const out = new Array(length);
    for (let i = 0; i < length; i++) out[i] = arrayMain[start + i];
    return out;
  };

  PDFArray.prototype.clone = function (context) {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    const newStart = arrayMainLen;
    for (let i = 0; i < length; i++) arrayMain[arrayMainLen + i] = arrayMain[start + i];
    arrayMainLen += length;
    _registerContext(context || _singletonContext);
    return new _FastArray(pack(newStart, length));
  };

  PDFArray.prototype.toString = function () {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    let s = '[ ';
    for (let i = 0; i < length; i++) s += arrayMain[start + i].toString() + ' ';
    return s + ']';
  };

  PDFArray.prototype.sizeInBytes = function () {
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    let size = 3;
    for (let i = start; i < end; i++) size += arrayMain[i].sizeInBytes() + 1;
    return size;
  };

  PDFArray.prototype.copyBytesInto = function (buffer, offset) {
    const initialOffset = offset;
    buffer[offset++] = CharCodes.LeftSquareBracket;
    buffer[offset++] = CharCodes.Space;
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    for (let i = start; i < end; i++) {
      offset += arrayMain[i].copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Space;
    }
    buffer[offset++] = CharCodes.RightSquareBracket;
    return offset - initialOffset;
  };

  // lookup, lookupMaybe, asRectangle, scalePDFNumbers stay on the
  // upstream prototype -- they call this.get / this.size / this.set
  // and dispatch through our overrides.

  Object.defineProperty(PDFArray.prototype, 'context', {
    get() { return _singletonContext; },
    set(_ctx) { /* singleton is source of truth */ },
    configurable: true,
  });

  // ---- PDFArray factory -------------------------------------------

  PDFArray.withContext = function (context) {
    return _makeFromAppend([], context);
  };

  // ---- PDFObjectParser.prototype.parseArray -----------------------
  //
  // Same temp/commit pattern as fast-dict-onebuf's parseDict:
  // each parser instance carries its own _arrayTemp + length cursor;
  // parseArray pushes elements onto temp's tail, commits the frame
  // to arrayMain in one contiguous append, pops temp back to
  // frameStart, returns a PDFArray view into arrayMain.

  PDFObjectParser.prototype.parseArray = function fastParseArrayOneBuf() {
    const bytes = this.bytes;
    bytes.assertNext(CharCodes.LeftSquareBracket);
    this.skipWhitespaceAndComments();

    if (this._arrayTemp === undefined) {
      this._arrayTemp = new Array(64);   // grows naturally if needed
      this._arrayTempLen = 0;
    }
    const temp = this._arrayTemp;
    const frameStart = this._arrayTempLen;

    while (bytes.peek() !== CharCodes.RightSquareBracket) {
      const element = this.parseObject();   // may recurse
      temp[this._arrayTempLen++] = element;
      this.skipWhitespaceAndComments();
    }
    bytes.assertNext(CharCodes.RightSquareBracket);

    const frameLen = this._arrayTempLen - frameStart;
    const start = arrayMainLen;
    _appendFromTemp(temp, frameStart, frameLen);
    this._arrayTempLen = frameStart;

    return _makeFromRange(start, frameLen, this.context);
  };

  PDFArray.prototype.__fastArrayOnebufInstalled = true;
}
