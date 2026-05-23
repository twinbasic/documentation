// One-buffer PDFDict: every committed entry lives in a single
// append-only array (main), kept for the document's lifetime. The
// parser uses a small per-instance temp array as a stack of recursion
// frames; each parseDict invocation appends to temp, commits its
// frame to main in one contiguous range, and pops temp back. After
// parseDocument completes, temp is released. PDFDict instances only
// ever read from main, so the bufIdx field disappears from the
// packed value -- frees up bits.
//
// 53-bit packed Number layout (within Number.MAX_SAFE_INTEGER):
//   bits  0-23: start  (24 bits, max 16 M slots in main)
//   bits 24-37: length (14 bits, max 16 384 slots; max observed 8 706)
//   bit  38   : owned flag
//   bits 39-52: spare (14 bits)
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
// Mutations. The shared range is read-only after parse. First
// mutation:
//   - set with existing key: in-place replace (safe; doesn't shift slots)
//   - set with new key, dict at main's high-water mark: in-place push (extend the range)
//   - set with new key, dict NOT at high-water mark: COW (copy
//     range to main's tail, then push the new pair, update encoded
//     value to the new range)
//   - delete: COW (copy range minus deleted entry to tail)
// On second+ mutations the dict is already 'owned'; same rules
// apply but the COW step is skipped when we're at the high-water
// mark.
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

const POW_24 = 16777216;          // 2^24
const POW_38 = 274877906944;      // 2^38
const MASK_24 = 0xFFFFFF;
const MASK_14 = 0x3FFF;

const MAX_START  = POW_24;          // exclusive
const MAX_LENGTH = 1 << 14;         // 16384, exclusive

function pack(start, length, owned) {
  if (start  >= MAX_START)  throw new Error(`fast-dict-onebuf: start ${start} exceeds 24-bit budget`);
  if (length >= MAX_LENGTH) throw new Error(`fast-dict-onebuf: length ${length} exceeds 14-bit budget`);
  return start
    + length * POW_24
    + (owned ? POW_38 : 0);
}

function _start(d)  { return d & MASK_24; }
function _length(d) { return Math.floor(d / POW_24) & MASK_14; }
function _owned(d)  { return Math.floor(d / POW_38) & 1; }

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
// value (now owned, anchored at the new range).
function _cow(pd) {
  const d = pd.d;
  if (_owned(d)) {
    // Already owned and somewhere in main. If we're at the high-water
    // mark we can mutate in place; otherwise we need to COW (the
    // dict was created earlier, other dicts have been appended
    // since, so we no longer abut the tail).
    const start = _start(d);
    const length = _length(d);
    if (start + length === mainLen) return d;   // at HWM
    const newStart = mainLen;
    for (let i = 0; i < length; i++) main[mainLen + i] = main[start + i];
    mainLen += length;
    return pack(newStart, length, 1);
  } else {
    // Shared range. COW to tail.
    const start = _start(d);
    const length = _length(d);
    const newStart = mainLen;
    for (let i = 0; i < length; i++) main[mainLen + i] = main[start + i];
    mainLen += length;
    return pack(newStart, length, 1);
  }
}

// ---- Construction ---------------------------------------------------

function _makeFromRange(ProtoClass, start, length, owned, ctx) {
  _registerContext(ctx);
  const pd = Object.create(ProtoClass.prototype);
  pd.d = pack(start, length, owned ? 1 : 0);
  if (ProtoClass === PDFPageLeaf) {
    pd.normalized = false;
    pd.autoNormalizeCTM = true;
  }
  return pd;
}

function _ownedFromArray(ProtoClass, arr, ctx) {
  const start = mainLen;
  _appendArray(arr);
  return _makeFromRange(ProtoClass, start, arr.length, true, ctx);
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
    if (!_owned(d0) || start0 + length0 !== mainLen) {
      dNow = _cow(this);
    }
    // After _cow (or if we were already at HWM owned), we abut the tail.
    main[mainLen++] = key;
    main[mainLen++] = value;
    const start = _start(dNow);
    this.d = pack(start, length0 + 2, 1);
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
    this.d = pack(newStart, length0 - 2, 1);
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
    const c = Object.create(PDFDict.prototype);
    c.d = pack(newStart, length, 1);
    return c;
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

  // ---- PDFDict factories --------------------------------------------

  PDFDict.withContext = function (context) {
    return _ownedFromArray(PDFDict, [], context);
  };
  PDFDict.fromMapWithContext = function (map, context) {
    return _ownedFromArray(PDFDict, mapToArray(map), context);
  };

  PDFCatalog.withContextAndPages = function (context, pages) {
    return _ownedFromArray(
      PDFCatalog,
      [PDFName.of('Type'), CatalogName, PagesName, pages],
      context,
    );
  };
  PDFCatalog.fromMapWithContext = function (map, context) {
    return _ownedFromArray(PDFCatalog, mapToArray(map), context);
  };

  PDFPageTree.fromMapWithContext = function (map, context) {
    return _ownedFromArray(PDFPageTree, mapToArray(map), context);
  };

  PDFPageLeaf.fromMapWithContext = function (map, context, autoNormalizeCTM) {
    const d = _ownedFromArray(PDFPageLeaf, mapToArray(map), context);
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
    if (Type === CatalogName) return _makeFromRange(PDFCatalog,  start, frameLen, false, this.context);
    if (Type === PagesName)   return _makeFromRange(PDFPageTree, start, frameLen, false, this.context);
    if (Type === PageName)    return _makeFromRange(PDFPageLeaf, start, frameLen, false, this.context);
    return _makeFromRange(PDFDict, start, frameLen, false, this.context);
  };

  PDFDict.prototype.__fastDictOnebufInstalled = true;
  // Mark subsumed shims as installed.
  PDFDict.prototype.__fastDictDoubleInstalled = true;
  PDFDict.prototype.__fastDictViewInstalled = true;
  PDFDict.prototype.__fastDictArrayInstalled = true;
  PDFDict.prototype.__fastDictIterInstalled = true;
  PDFObjectParser.prototype.__fastParseDictInstalled = true;
}
