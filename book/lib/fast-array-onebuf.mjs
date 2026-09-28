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
//
// The range machinery -- packing, appends, copy-on-write and the
// singleton PDFContext -- is onebuf-range.mjs's, shared with
// fast-dict-onebuf. The buffer and the context are this shim's own, so
// it loads without that one.
//
// Composes with --fast-dict-onebuf. Mutually exclusive with
// --fast-dict-encoded (which subsumes both via its own encoded shape).

import { PDFArray, PDFObjectParser, CharCodes } from './pdf-lib-internals.mjs';
import { onebufRange } from './onebuf-range.mjs';

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

function _construct(_ProtoClass, d) {
  return new _FastArray(d);
}

// ---- The single buffer ---------------------------------------------

// Pre-sized to total array slots + slack on the book. Other workloads
// grow it naturally from this starting size. When the measure-pass
// shim runs first, it calls setExpectedArraySlots() before parse,
// which resizes `arrayMain` to exact measured demand.
const ranges = onebufRange({
  name: 'fast-array-onebuf',
  capacity: 800000,
  startBits: 24,
  construct: _construct,
});
const arrayMain = ranges.slots;
const _start = ranges.startOf;
const _length = ranges.lengthOf;

export { arrayMain };
export function getArrayMainLen() { return ranges.used(); }

// Must be called before any parseArray / withContext. `slack` is a
// multiplier on `slots`; default 1.0 (exact).
export function setExpectedArraySlots(slots, slack = 1.0) {
  ranges.reserve(slots, slack);
}

if (!PDFArray.prototype.__fastArrayOnebufInstalled) {

  // ---- PDFArray.prototype -----------------------------------------

  PDFArray.prototype.size = function () {
    return _length(this.d);
  };

  PDFArray.prototype.push = function (object) {
    ranges.push(this, object);
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
    ranges.insert(this, index, object);
  };

  PDFArray.prototype.remove = function (index) {
    ranges.cut(this, index, 1);
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
    return ranges.clone(this, PDFArray, context);
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
    get() { return ranges.context(); },
    set(_ctx) { /* singleton is source of truth */ },
    configurable: true,
  });

  // ---- PDFArray factory -------------------------------------------

  PDFArray.withContext = function (context) {
    return ranges.viewOf(PDFArray, [], context);
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
    const start = ranges.append(temp, frameStart, frameLen);
    this._arrayTempLen = frameStart;

    return ranges.view(PDFArray, start, frameLen, this.context);
  };

  PDFArray.prototype.__fastArrayOnebufInstalled = true;
}
