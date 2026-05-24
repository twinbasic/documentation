// One-buffer PDFDict: every committed entry lives in a single
// append-only array (main), kept for the document's lifetime. The
// parser uses a small per-instance temp array as a stack of recursion
// frames; each parseDict invocation appends to temp, commits its
// frame to main in one contiguous range, and pops temp back. After
// parseDocument completes, temp is released. PDFDict instances only
// ever read from main, so the bufIdx field disappears from the
// packed value -- frees up bits.
//
// 41-bit packed Number layout (well within Number.MAX_SAFE_INTEGER):
//   bits  0-22: start  (23 bits, max 8.4 M slots in main; mainLen ~2.3 M today)
//   bit     23: PDFPageLeaf `normalized` flag (zero on all other dict subtypes)
//   bit     24: PDFPageLeaf `autoNormalizeCTM` flag (zero on all other dict subtypes)
//   bits 25-40: length (16 bits, max 65 535 slots; max observed 8 706)
//   bits 41-52: spare (12 bits; unused, available headroom)
//
// V8 Smi (31-bit signed) covers values < 2^30. start + length*2^25 stays
// Smi iff length < 32 (the 2^30 boundary). Beyond that, `d` boxes to a
// HeapNumber but bit math via `& MASK_*` and `+`/`-` continues to work --
// reads still extract bits 0..30 correctly via Int32 coercion, writes
// use arithmetic so high bits survive.
//
// PDFPageLeaf collapses to the same single-`d` field as plain PDFDict;
// `normalized` and `autoNormalizeCTM` are gettters/setters that mask
// in/out of `d`'s bits 23 and 24. Heap floor matches `_FastDict` (no
// separate boolean property slots).
//
// Recursion. Outer parseDict pushes entries onto temp. Calling
// this.parseObject() to parse a value may recurse to inner
// parseDict, which appends ON TOP of outer's pending entries. Inner
// commits its frame to main in one append, then pops temp back to
// the level it started at -- outer's frame is intact at the top of
// temp again. Outer continues, eventually committing its (now
// contiguous in temp) entries to main in one append. Outer's and
// inner's ranges in main do not overlap; each was committed as a
// single contiguous block at distinct points in time.
//
// Mutations:
//   - set with existing key: in-place replace (safe; no shifts)
//   - set with new key, dict at main's high-water mark: in-place
//     push (extend the range)
//   - set with new key, dict NOT at high-water mark: COW (copy
//     range to main's tail, then push the new pair, update encoded
//     value to the new range)
//   - delete: COW (copy range minus deleted entry to tail)
// The at-HWM check fully determines whether extending is safe;
// each dict's range is unique to that dict (no slot sharing), so
// extending past the dict's end at HWM never disturbs anything.
// An earlier design tracked an owned/shared bit to gate this; it
// was redundant -- shared dicts at HWM extend just as safely as
// owned ones.
//
// Singleton PDFContext (one PDFDocument.load per process in our
// pipeline; throws if a second distinct context appears).
//
// Mutually exclusive with --fast-dict-double / --fast-dict-view /
// --fast-dict-array.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFDict         = require('pdf-lib/cjs/core/objects/PDFDict.js').default;
const PDFCatalog      = require('pdf-lib/cjs/core/structures/PDFCatalog.js').default;
const PDFPageTree     = require('pdf-lib/cjs/core/structures/PDFPageTree.js').default;
const PDFPageLeaf     = require('pdf-lib/cjs/core/structures/PDFPageLeaf.js').default;
const PDFName         = require('pdf-lib/cjs/core/objects/PDFName.js').default;
const PDFNull         = require('pdf-lib/cjs/core/objects/PDFNull.js').default;
const PDFObjectParser = require('pdf-lib/cjs/core/parser/PDFObjectParser.js').default;
const CharCodes       = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;

const TypeName    = PDFName.of('Type');
const CatalogName = PDFName.of('Catalog');
const PagesName   = PDFName.of('Pages');
const PageName    = PDFName.of('Page');

// ---- The single buffer + temp ---------------------------------------

// Pre-sized to total entries + slack measured on the book. Other
// workloads grow it naturally (V8-amortized array growth from this
// starting size). When the measure-pass shim runs first, it calls
// setExpectedDictSlots() before parse, which resizes `main` to exact
// measured demand via `main.length = N`.
const MAIN_INITIAL_CAP = 2400000;
const main = new Array(MAIN_INITIAL_CAP);
let mainLen = 0;

// Exposed for measurement-only consumers (perf/instrument-*.mjs).
// The encoded `d` values held by PDFDict instances reference main by
// (start, length); reading the slots requires access to main itself.
export { main };
export function getMainLen() { return mainLen; }

// Replace `main` with an exact-sized backing array. Must be called
// before any parseDict / withContext / fromMapWithContext (i.e. while
// mainLen is still 0). `slack` is a multiplier on `slots`; default 1.0
// (exact). Use a small slack only if the measure pass is approximate.
export function setExpectedDictSlots(slots, slack = 1.0) {
  if (mainLen > 0) {
    throw new Error(
      `fast-dict-onebuf: setExpectedDictSlots called after parse started (mainLen=${mainLen})`,
    );
  }
  const sized = Math.ceil(slots * slack);
  // Resize in place rather than reassigning. Reassigning the module-
  // level `main` binding invalidates V8's inline-cache slots in every
  // closure that reads it -- the closures get deopted on first call
  // and recompile against the new array, with a parse-time allocation
  // spike attributed to _appendEntries (~27 MB sampled on the book).
  // `main.length = N` keeps the same Array identity; ICs stay valid.
  main.length = sized;
}

// ---- Bit-packing helpers --------------------------------------------

const POW_23  = 1 << 23;            // 8 388 608  -- gap-bit base / start ceiling
const POW_25  = 1 << 25;            // 33 554 432 -- length multiplier
const MASK_23 = 0x7FFFFF;           // 23-bit start mask
const MASK_16 = 0xFFFF;             // 16-bit length mask

const NORM_BIT = POW_23;            // bit 23: PDFPageLeaf `normalized`
const AUTO_BIT = POW_23 * 2;        // bit 24: PDFPageLeaf `autoNormalizeCTM`
const GAP_MASK = NORM_BIT | AUTO_BIT;

const MAX_START  = POW_23;          // exclusive
const MAX_LENGTH = 1 << 16;         // 65536, exclusive

function pack(start, length) {
  if (start  >= MAX_START)  throw new Error(`fast-dict-onebuf: start ${start} exceeds 23-bit budget`);
  if (length >= MAX_LENGTH) throw new Error(`fast-dict-onebuf: length ${length} exceeds 16-bit budget`);
  return start + length * POW_25;
}

// Read start (bits 0-22) and length (bits 25-40). Both work on
// HeapNumber'd d: `& MASK_23` lives in low 32 bits (Int32 coercion
// reads it correctly); `Math.floor(d / POW_25)` operates on the full
// Number range before the `& MASK_16` truncates.
function _start(d)  { return d & MASK_23; }
function _length(d) { return Math.floor(d / POW_25) & MASK_16; }

// ---- Singleton context ---------------------------------------------

let _singletonContext = null;

function _registerContext(ctx) {
  if (_singletonContext === null) {
    _singletonContext = ctx;
  } else if (_singletonContext !== ctx) {
    throw new Error('fast-dict-onebuf: expected a singleton PDFContext, got a second distinct one.');
  }
}

// ---- Append helpers ------------------------------------------------

function _appendEntries(entries, fromOffset, lenSlots) {
  for (let i = 0; i < lenSlots; i++) {
    main[mainLen + i] = entries[fromOffset + i];
  }
  mainLen += lenSlots;
}

function _appendArray(arr) {
  const len = arr.length;
  for (let i = 0; i < len; i++) main[mainLen + i] = arr[i];
  mainLen += len;
}

// COW: copy this dict's range to main's tail, return the new packed
// value anchored at the new range. If we're already at the HWM,
// nothing to copy -- return d unchanged.
//
// Gap bits (bits 23-24, used by PDFPageLeaf for normalized /
// autoNormalizeCTM) are preserved across the repack. For non-PageLeaf
// dicts the mask is zero, so `+ (d & GAP_MASK)` is a no-op. Addition
// is used instead of `|` so the high bits of HeapNumber'd d survive.
function _cow(pd) {
  const d = pd.d;
  const start = _start(d);
  const length = _length(d);
  if (start + length === mainLen) return d;   // at HWM, extend in place
  const newStart = mainLen;
  for (let i = 0; i < length; i++) main[mainLen + i] = main[start + i];
  mainLen += length;
  return pack(newStart, length) + (d & GAP_MASK);
}

// ---- Construction ---------------------------------------------------
//
// Use plain-function constructors with the prototype aliased to the
// upstream PDFDict / PDFCatalog / PDFPageTree / PDFPageLeaf prototypes
// instead of `Object.create(proto) + property writes`. V8 gives
// `new`-built instances a stable hidden class derived from the
// assignment order in the constructor body, and per-instance heap cost
// drops materially vs the slow-property path taken by Object.create +
// later writes (the same shape change that fast-refs-class made for
// PDFRef: ~60 B/instance -> ~44 B). For the 260 k+ dicts on the book
// the per-instance gap × instance count is the dominant remaining heap
// row.
//
// One constructor per subclass so V8 sees a single fixed shape per
// kind. PDFPageLeaf collapses to the same single-`d` shape as plain
// PDFDict; `normalized` defaults to false (gap bit 23 clear) and
// `autoNormalizeCTM` defaults to true (gap bit 24 set) -- the bit
// is OR'd in by the constructor below via addition (so HeapNumber'd
// d doesn't lose high bits to Int32 coercion). Both flags become
// prototype getters/setters that mask in/out of bits 23-24.
// Any unknown PDFDict subclass falls back to the original
// Object.create path so the shim doesn't crash on downstream
// extensions (none in our pipeline; defensive only).

function _FastDict(d) { this.d = d; }
_FastDict.prototype = PDFDict.prototype;

function _FastCatalog(d) { this.d = d; }
_FastCatalog.prototype = PDFCatalog.prototype;

function _FastPageTree(d) { this.d = d; }
_FastPageTree.prototype = PDFPageTree.prototype;

// d arrives from pack(start, length) so bits 23-24 are zero;
// `+ AUTO_BIT` sets bit 24 unconditionally (autoNormalizeCTM = true
// default). Use addition not `|`: if length >= 32, d > 2^30 (HeapNumber)
// and `|` would truncate to Int32 losing high bits.
function _FastPageLeaf(d) { this.d = d + AUTO_BIT; }
_FastPageLeaf.prototype = PDFPageLeaf.prototype;

function _makeFromRange(ProtoClass, start, length, ctx) {
  _registerContext(ctx);
  const d = pack(start, length);
  if (ProtoClass === PDFDict)      return new _FastDict(d);
  if (ProtoClass === PDFPageLeaf)  return new _FastPageLeaf(d);
  if (ProtoClass === PDFCatalog)   return new _FastCatalog(d);
  if (ProtoClass === PDFPageTree)  return new _FastPageTree(d);
  // Defensive fallback for any unknown subclass.
  const pd = Object.create(ProtoClass.prototype);
  pd.d = d;
  return pd;
}

function _makeFromAppend(ProtoClass, arr, ctx) {
  const start = mainLen;
  _appendArray(arr);
  return _makeFromRange(ProtoClass, start, arr.length, ctx);
}

function mapToArray(map) {
  const arr = new Array(map.size * 2);
  let i = 0;
  for (const [k, v] of map) { arr[i++] = k; arr[i++] = v; }
  return arr;
}

if (!PDFDict.prototype.__fastDictOnebufInstalled) {

  // ---- PDFDict.prototype --------------------------------------------

  PDFDict.prototype.keys = function () {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    const out = new Array(length >> 1);
    for (let i = 0, j = 0; i < length; i += 2, j++) out[j] = main[start + i];
    return out;
  };

  PDFDict.prototype.values = function () {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    const out = new Array(length >> 1);
    for (let i = 0, j = 0; i < length; i += 2, j++) out[j] = main[start + i + 1];
    return out;
  };

  PDFDict.prototype.entries = function () {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    const out = new Array(length >> 1);
    for (let i = 0, j = 0; i < length; i += 2, j++) {
      out[j] = [main[start + i], main[start + i + 1]];
    }
    return out;
  };

  PDFDict.prototype.set = function (key, value) {
    const d0 = this.d;
    const start0 = _start(d0);
    const length0 = _length(d0);
    // Try in-place replace
    for (let i = 0; i < length0; i += 2) {
      if (main[start0 + i] === key) { main[start0 + i + 1] = value; return; }
    }
    // Append: requires the dict to be at main's high-water mark, OR we COW.
    let dNow = d0;
    if (start0 + length0 !== mainLen) {
      dNow = _cow(this);
    }
    // After _cow (or if we were already at HWM), we abut the tail.
    main[mainLen++] = key;
    main[mainLen++] = value;
    const start = _start(dNow);
    // Preserve gap bits (PageLeaf flags) from dNow into the freshly
    // packed value. Zero for non-PageLeaf dicts.
    this.d = pack(start, length0 + 2) + (dNow & GAP_MASK);
  };

  PDFDict.prototype.get = function (key, preservePDFNull) {
    if (preservePDFNull === undefined) preservePDFNull = false;
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    for (let i = start; i < end; i += 2) {
      if (main[i] === key) {
        const value = main[i + 1];
        if (value === PDFNull && !preservePDFNull) return undefined;
        return value;
      }
    }
    return undefined;
  };

  PDFDict.prototype.has = function (key) {
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    for (let i = start; i < end; i += 2) {
      if (main[i] === key) {
        const value = main[i + 1];
        return value !== undefined && value !== PDFNull;
      }
    }
    return false;
  };

  PDFDict.prototype.delete = function (key) {
    // Always COW for delete: shifting slots in main would corrupt
    // other dicts that point into the affected region.
    const d0 = this.d;
    const start0 = _start(d0);
    const length0 = _length(d0);
    let foundIdx = -1;
    for (let i = 0; i < length0; i += 2) {
      if (main[start0 + i] === key) { foundIdx = i; break; }
    }
    if (foundIdx < 0) return false;
    const newStart = mainLen;
    for (let i = 0; i < length0; i++) {
      if (i === foundIdx || i === foundIdx + 1) continue;
      main[mainLen++] = main[start0 + i];
    }
    // Preserve gap bits (PageLeaf flags); zero for non-PageLeaf dicts.
    this.d = pack(newStart, length0 - 2) + (d0 & GAP_MASK);
    return true;
  };

  PDFDict.prototype.asMap = function () {
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    const m = new Map();
    for (let i = start; i < end; i += 2) m.set(main[i], main[i + 1]);
    return m;
  };

  PDFDict.prototype.clone = function (context) {
    const d = this.d;
    const start = _start(d);
    const length = _length(d);
    const newStart = mainLen;
    for (let i = 0; i < length; i++) main[mainLen + i] = main[start + i];
    mainLen += length;
    _registerContext(context || _singletonContext);
    return new _FastDict(pack(newStart, length));
  };

  PDFDict.prototype.toString = function () {
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    let s = '<<\n';
    for (let i = start; i < end; i += 2) {
      s += main[i].toString() + ' ' + main[i + 1].toString() + '\n';
    }
    return s + '>>';
  };

  PDFDict.prototype.sizeInBytes = function () {
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    let size = 5;
    for (let i = start; i < end; i += 2) {
      size += main[i].sizeInBytes() + main[i + 1].sizeInBytes() + 2;
    }
    return size;
  };

  PDFDict.prototype.copyBytesInto = function (buffer, offset) {
    const initialOffset = offset;
    buffer[offset++] = CharCodes.LessThan;
    buffer[offset++] = CharCodes.LessThan;
    buffer[offset++] = CharCodes.Newline;
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    for (let i = start; i < end; i += 2) {
      offset += main[i].copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Space;
      offset += main[i + 1].copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Newline;
    }
    buffer[offset++] = CharCodes.GreaterThan;
    buffer[offset++] = CharCodes.GreaterThan;
    return offset - initialOffset;
  };

  Object.defineProperty(PDFDict.prototype, 'context', {
    get() { return _singletonContext; },
    set(_ctx) { /* singleton is source of truth */ },
    configurable: true,
  });

  // ---- PDFPageLeaf flag accessors -----------------------------------
  //
  // `normalized` and `autoNormalizeCTM` live in bits 23 and 24 of
  // `d`. Reads use `& BIT` -- safe on HeapNumber'd d because both
  // bits are in the low 32 (Int32 coercion reads them correctly).
  // Writes use arithmetic (`d + BIT` / `d - BIT`) gated on the
  // current bit state, so high bits of HeapNumber'd d survive.
  // No-ops when the flag is already in the requested state.

  Object.defineProperty(PDFPageLeaf.prototype, 'normalized', {
    get() { return (this.d & NORM_BIT) !== 0; },
    set(v) {
      const d = this.d;
      const has = (d & NORM_BIT) !== 0;
      if (v && !has)      this.d = d + NORM_BIT;
      else if (!v && has) this.d = d - NORM_BIT;
    },
    configurable: true,
  });

  Object.defineProperty(PDFPageLeaf.prototype, 'autoNormalizeCTM', {
    get() { return (this.d & AUTO_BIT) !== 0; },
    set(v) {
      const d = this.d;
      const has = (d & AUTO_BIT) !== 0;
      if (v && !has)      this.d = d + AUTO_BIT;
      else if (!v && has) this.d = d - AUTO_BIT;
    },
    configurable: true,
  });

  // ---- PDFDict factories --------------------------------------------

  PDFDict.withContext = function (context) {
    return _makeFromAppend(PDFDict, [], context);
  };
  PDFDict.fromMapWithContext = function (map, context) {
    return _makeFromAppend(PDFDict, mapToArray(map), context);
  };

  PDFCatalog.withContextAndPages = function (context, pages) {
    return _makeFromAppend(
      PDFCatalog,
      [PDFName.of('Type'), CatalogName, PagesName, pages],
      context,
    );
  };
  PDFCatalog.fromMapWithContext = function (map, context) {
    return _makeFromAppend(PDFCatalog, mapToArray(map), context);
  };

  PDFPageTree.fromMapWithContext = function (map, context) {
    return _makeFromAppend(PDFPageTree, mapToArray(map), context);
  };

  PDFPageLeaf.fromMapWithContext = function (map, context, autoNormalizeCTM) {
    const d = _makeFromAppend(PDFPageLeaf, mapToArray(map), context);
    if (autoNormalizeCTM !== undefined) d.autoNormalizeCTM = autoNormalizeCTM;
    return d;
  };

  // ---- PDFObjectParser.prototype.parseDict --------------------------
  //
  // Each parser instance carries its own temp array (small; sized to
  // peak recursion-depth-stack of entries) plus a length cursor.
  // parseDict pushes entries onto temp's tail; on completion, commits
  // its frame to main in one contiguous append, pops temp back to
  // frameStart, and returns a PDFDict view into main.

  PDFObjectParser.prototype.parseDict = function fastParseDictOneBuf() {
    const bytes = this.bytes;
    bytes.assertNext(CharCodes.LessThan);
    bytes.assertNext(CharCodes.LessThan);
    this.skipWhitespaceAndComments();

    if (this._dictTemp === undefined) {
      this._dictTemp = new Array(64);   // grows naturally if needed
      this._dictTempLen = 0;
    }
    const temp = this._dictTemp;
    const frameStart = this._dictTempLen;

    while (!bytes.done() &&
           bytes.peek() !== CharCodes.GreaterThan &&
           bytes.peekAhead(1) !== CharCodes.GreaterThan) {
      const key = this.parseName();
      const value = this.parseObject();    // may recurse; temp grows / shrinks
      const len = this._dictTempLen;
      temp[len]     = key;
      temp[len + 1] = value;
      this._dictTempLen = len + 2;
      this.skipWhitespaceAndComments();
    }
    this.skipWhitespaceAndComments();
    bytes.assertNext(CharCodes.GreaterThan);
    bytes.assertNext(CharCodes.GreaterThan);

    const frameLen = this._dictTempLen - frameStart;
    // Commit this frame to main in one contiguous append
    const start = mainLen;
    _appendEntries(temp, frameStart, frameLen);
    // Pop our frame off temp
    this._dictTempLen = frameStart;

    // Type-sentinel dispatch (scan the frame we just committed)
    let Type;
    const end = start + frameLen;
    for (let i = start; i < end; i += 2) {
      if (main[i] === TypeName) { Type = main[i + 1]; break; }
    }
    if (Type === CatalogName) return _makeFromRange(PDFCatalog,  start, frameLen, this.context);
    if (Type === PagesName)   return _makeFromRange(PDFPageTree, start, frameLen, this.context);
    if (Type === PageName)    return _makeFromRange(PDFPageLeaf, start, frameLen, this.context);
    return _makeFromRange(PDFDict, start, frameLen, this.context);
  };

  PDFDict.prototype.__fastDictOnebufInstalled = true;
  // Mark subsumed shims as installed.
  PDFDict.prototype.__fastDictDoubleInstalled = true;
  PDFDict.prototype.__fastDictViewInstalled = true;
  PDFDict.prototype.__fastDictArrayInstalled = true;
  PDFDict.prototype.__fastDictIterInstalled = true;
  PDFObjectParser.prototype.__fastParseDictInstalled = true;
}
