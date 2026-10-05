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
//   bits  0-22: start  (23 bits, max 8.4 M slots in main; ~2.3 M used on the book)
//   bit     23: PDFPageLeaf `normalized` flag (zero on all other dict subtypes)
//   bit     24: PDFPageLeaf `autoNormalizeCTM` flag (zero on all other dict subtypes)
//   bits 25-40: length (16 bits, max 65 535 slots; max observed 8 706)
//   bits 41-52: spare (12 bits; unused, available headroom)
//
// `d` stays a Smi iff length < 32; past that it is a HeapNumber, which
// onebuf-range.mjs's packing handles.
//
// PDFPageLeaf collapses to the same single-`d` field as plain PDFDict;
// `normalized` and `autoNormalizeCTM` are getters/setters that mask
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
//
// The range machinery -- packing, appends, copy-on-write and the
// singleton PDFContext (a second distinct context throws) -- is
// onebuf-range.mjs's, shared with fast-array-onebuf. The buffer and the
// context are this shim's own, so it loads without that one.
//
// At load it checks that what it replaces is as in pdf-lib 1.17.1 (see
// shim-targets.mjs), the constructors of PDFDict and its three subclasses
// included, since no instance is built with them; and throws otherwise. It
// goes when pdf-lib is replaced; when a release changes what it patches, it
// is re-derived or removed.

import {
  PDFDict,
  PDFCatalog,
  PDFPageTree,
  PDFPageLeaf,
  PDFName,
  PDFNull,
  PDFObjectParser,
  CharCodes,
} from "./pdf-lib-internals.mjs";
import { onebufRange } from "./onebuf-range.mjs";
import { checkTargets, ABSENT } from "./shim-targets.mjs";

const TypeName = PDFName.of("Type");
const CatalogName = PDFName.of("Catalog");
const PagesName = PDFName.of("Pages");
const PageName = PDFName.of("Page");

// ---- Gap bits -------------------------------------------------------

// The two bits onebuf-range.mjs leaves between a 23-bit start and the
// length. Every repack carries them over; they are zero on every dict
// but a PDFPageLeaf.
const NORM_BIT = 1 << 23; // bit 23: PDFPageLeaf `normalized`
const AUTO_BIT = 1 << 24; // bit 24: PDFPageLeaf `autoNormalizeCTM`

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

function _FastDict(d) {
  this.d = d;
}
_FastDict.prototype = PDFDict.prototype;

function _FastCatalog(d) {
  this.d = d;
}
_FastCatalog.prototype = PDFCatalog.prototype;

function _FastPageTree(d) {
  this.d = d;
}
_FastPageTree.prototype = PDFPageTree.prototype;

// d arrives from onebuf-range.mjs's pack(start, length), so bits 23-24
// are zero; `+ AUTO_BIT` sets bit 24 unconditionally (autoNormalizeCTM
// = true default). Use addition not `|`: if length >= 32, d > 2^30 (HeapNumber)
// and `|` would truncate to Int32 losing high bits.
function _FastPageLeaf(d) {
  this.d = d + AUTO_BIT;
}
_FastPageLeaf.prototype = PDFPageLeaf.prototype;

function _construct(ProtoClass, d) {
  if (ProtoClass === PDFDict) return new _FastDict(d);
  if (ProtoClass === PDFPageLeaf) return new _FastPageLeaf(d);
  if (ProtoClass === PDFCatalog) return new _FastCatalog(d);
  if (ProtoClass === PDFPageTree) return new _FastPageTree(d);
  // Defensive fallback for any unknown subclass.
  const pd = Object.create(ProtoClass.prototype);
  pd.d = d;
  return pd;
}

// ---- The single buffer ----------------------------------------------

// Pre-sized to total entries + slack measured on the book. Other
// workloads grow it naturally (V8-amortized array growth from this
// starting size). When the measure-pass shim runs first, it calls
// setExpectedDictSlots() before parse, which resizes `main` to exact
// measured demand.
const ranges = onebufRange({
  name: "fast-dict-onebuf",
  capacity: 2400000,
  startBits: 23,
  gapBits: 2,
  construct: _construct,
});
const main = ranges.slots;
const _start = ranges.startOf;
const _length = ranges.lengthOf;

// Exposed for measurement-only consumers (perf/instrument-*.mjs).
// The encoded `d` values held by PDFDict instances reference main by
// (start, length); reading the slots requires access to main itself.
export { main };
export function getMainLen() {
  return ranges.used();
}

// Must be called before any parseDict / withContext /
// fromMapWithContext. `slack` is a multiplier on `slots`; default 1.0
// (exact). Use a small slack only if the measure pass is approximate.
export function setExpectedDictSlots(slots, slack = 1.0) {
  ranges.reserve(slots, slack);
}

function mapToArray(map) {
  const arr = new Array(map.size * 2);
  let i = 0;
  for (const [k, v] of map) {
    arr[i++] = k;
    arr[i++] = v;
  }
  return arr;
}

if (!PDFDict.prototype.__fastDictOnebufInstalled) {
  checkTargets(
    import.meta.url,
    { PDFDict, PDFCatalog, PDFPageTree, PDFPageLeaf, PDFObjectParser },
    {
      PDFDict: [2, "60eaf0675cb7"],
      "PDFDict.withContext": [1, "b79783f2d4dd"],
      "PDFDict.fromMapWithContext": [2, "dc931ea57734"],
      "PDFDict.prototype.context": ABSENT,
      "PDFDict.prototype.keys": [0, "91d41cc6de06"],
      "PDFDict.prototype.values": [0, "b00e6e0e9a70"],
      "PDFDict.prototype.entries": [0, "c7d0666742c0"],
      "PDFDict.prototype.set": [2, "8f7998a17fbe"],
      "PDFDict.prototype.get": [2, "f2fc35be96de"],
      "PDFDict.prototype.has": [1, "c0f455563c27"],
      "PDFDict.prototype.delete": [1, "ed89c9b2480e"],
      "PDFDict.prototype.asMap": [0, "2406d1634030"],
      "PDFDict.prototype.clone": [1, "42c1d3265d15"],
      "PDFDict.prototype.toString": [0, "a718a21ad3b3"],
      "PDFDict.prototype.sizeInBytes": [0, "ad72e2c097c3"],
      "PDFDict.prototype.copyBytesInto": [2, "8b0e4be9ce23"],
      PDFCatalog: [0, "f30b610c8906"],
      "PDFCatalog.withContextAndPages": [2, "feba5de98084"],
      "PDFCatalog.fromMapWithContext": [2, "de86988a4da7"],
      PDFPageTree: [0, "f90f91df0873"],
      "PDFPageTree.withContext": [2, "adff8ad3530b"],
      "PDFPageTree.fromMapWithContext": [2, "3a685cbe77d3"],
      PDFPageLeaf: [3, "6af6b6fbd5e3"],
      "PDFPageLeaf.withContextAndParent": [2, "37706c20ca6b"],
      "PDFPageLeaf.fromMapWithContext": [3, "291ad87437e0"],
      "PDFPageLeaf.prototype.normalized": ABSENT,
      "PDFPageLeaf.prototype.autoNormalizeCTM": ABSENT,
      "PDFObjectParser.prototype.parseDict": [0, "8056773f38fb"],
    },
  );

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
      if (main[start0 + i] === key) {
        main[start0 + i + 1] = value;
        return;
      }
    }
    // Append in place at main's high-water mark, else COW first.
    ranges.pushPair(this, key, value);
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
    for (let i = 0; i < length0; i += 2) {
      if (main[start0 + i] === key) {
        ranges.cut(this, i, 2);
        return true;
      }
    }
    return false;
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
    return ranges.clone(this, PDFDict, context);
  };

  PDFDict.prototype.toString = function () {
    const d = this.d;
    const start = _start(d);
    const end = start + _length(d);
    let s = "<<\n";
    for (let i = start; i < end; i += 2) {
      s += main[i].toString() + " " + main[i + 1].toString() + "\n";
    }
    return s + ">>";
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

  Object.defineProperty(PDFDict.prototype, "context", {
    get() {
      return ranges.context();
    },
    set(_ctx) {
      /* singleton is source of truth */
    },
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

  Object.defineProperty(PDFPageLeaf.prototype, "normalized", {
    get() {
      return (this.d & NORM_BIT) !== 0;
    },
    set(v) {
      const d = this.d;
      const has = (d & NORM_BIT) !== 0;
      if (v && !has) this.d = d + NORM_BIT;
      else if (!v && has) this.d = d - NORM_BIT;
    },
    configurable: true,
  });

  Object.defineProperty(PDFPageLeaf.prototype, "autoNormalizeCTM", {
    get() {
      return (this.d & AUTO_BIT) !== 0;
    },
    set(v) {
      const d = this.d;
      const has = (d & AUTO_BIT) !== 0;
      if (v && !has) this.d = d + AUTO_BIT;
      else if (!v && has) this.d = d - AUTO_BIT;
    },
    configurable: true,
  });

  // ---- PDFDict factories --------------------------------------------

  PDFDict.withContext = function (context) {
    return ranges.viewOf(PDFDict, [], context);
  };
  PDFDict.fromMapWithContext = function (map, context) {
    return ranges.viewOf(PDFDict, mapToArray(map), context);
  };

  PDFCatalog.withContextAndPages = function (context, pages) {
    return ranges.viewOf(PDFCatalog, [PDFName.of("Type"), CatalogName, PagesName, pages], context);
  };
  PDFCatalog.fromMapWithContext = function (map, context) {
    return ranges.viewOf(PDFCatalog, mapToArray(map), context);
  };

  PDFPageTree.fromMapWithContext = function (map, context) {
    return ranges.viewOf(PDFPageTree, mapToArray(map), context);
  };

  PDFPageLeaf.fromMapWithContext = function (map, context, autoNormalizeCTM) {
    const d = ranges.viewOf(PDFPageLeaf, mapToArray(map), context);
    if (autoNormalizeCTM !== undefined) d.autoNormalizeCTM = autoNormalizeCTM;
    return d;
  };

  // pdf-lib's own versions of these two build on a Map, with `new`, and
  // the methods above cannot read such a dict: addPage, insertPage and
  // PDFDocument.create would fail. The entries are pdf-lib's, in its order.
  PDFPageTree.withContext = function (context, parent) {
    const map = new Map([
      [PDFName.of("Type"), PDFName.of("Pages")],
      [PDFName.of("Kids"), context.obj([])],
      [PDFName.of("Count"), context.obj(0)],
    ]);
    if (parent) map.set(PDFName.of("Parent"), parent);
    return PDFPageTree.fromMapWithContext(map, context);
  };

  PDFPageLeaf.withContextAndParent = function (context, parent) {
    const map = new Map([
      [PDFName.of("Type"), PDFName.of("Page")],
      [PDFName.of("Parent"), parent],
      [PDFName.of("Resources"), context.obj({})],
      [PDFName.of("MediaBox"), context.obj([0, 0, 612, 792])],
    ]);
    return PDFPageLeaf.fromMapWithContext(map, context, false);
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
      this._dictTemp = new Array(64); // grows naturally if needed
      this._dictTempLen = 0;
    }
    const temp = this._dictTemp;
    const frameStart = this._dictTempLen;

    while (!bytes.done() && bytes.peek() !== CharCodes.GreaterThan && bytes.peekAhead(1) !== CharCodes.GreaterThan) {
      const key = this.parseName();
      const value = this.parseObject(); // may recurse; temp grows / shrinks
      const len = this._dictTempLen;
      temp[len] = key;
      temp[len + 1] = value;
      this._dictTempLen = len + 2;
      this.skipWhitespaceAndComments();
    }
    this.skipWhitespaceAndComments();
    bytes.assertNext(CharCodes.GreaterThan);
    bytes.assertNext(CharCodes.GreaterThan);

    const frameLen = this._dictTempLen - frameStart;
    // Commit this frame to main in one contiguous append
    const start = ranges.append(temp, frameStart, frameLen);
    // Pop our frame off temp
    this._dictTempLen = frameStart;

    // Type-sentinel dispatch (scan the frame we just committed)
    let Type;
    const end = start + frameLen;
    for (let i = start; i < end; i += 2) {
      if (main[i] === TypeName) {
        Type = main[i + 1];
        break;
      }
    }
    if (Type === CatalogName) return ranges.view(PDFCatalog, start, frameLen, this.context);
    if (Type === PagesName) return ranges.view(PDFPageTree, start, frameLen, this.context);
    if (Type === PageName) return ranges.view(PDFPageLeaf, start, frameLen, this.context);
    return ranges.view(PDFDict, start, frameLen, this.context);
  };

  PDFDict.prototype.__fastDictOnebufInstalled = true;
}
