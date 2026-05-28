// Replace PDFDict's backing Map with a flat alternating array
// [k0, v0, k1, v1, ...].
//
// Motivation. The sampling heap profile of the process phase (see
// "Profiling pdf-lib heap allocation" in perf/README.md) put `Map`
// constructors and `Map.prototype.set` at 50 % of total allocations
// -- ~63 MB combined -- with ~80 % of that traffic coming from one
// site: fastParseDict's per-dict accumulator
// ([fast-parse-dict.mjs:62](docs/lib/fast-parse-dict.mjs:62)).
//
//     const dict = new Map();          // 24 MB of Map() constructors
//     while (...) {
//       const key = this.parseName();
//       const value = this.parseObject();
//       dict.set(key, value);          // 38 MB of Map.set entries
//     }
//     ... PDFDict.fromMapWithContext(dict, this.context);
//
// Each parsed dict pays for one Map header + one hash-table backing
// arena + one bucket allocation per entry. PDF dicts are tiny (typical
// has <= 10 entries, often 2-3), so the hash-table overhead is pure
// loss vs a linear scan -- and the Map's amortized O(1) lookup buys
// nothing because nobody iterates a parsed dict enough times for the
// hash to pay back.
//
// The fix: store entries in a flat array. One allocation per dict
// (the array itself; the inline alternating layout avoids any per-
// entry bucket alloc). Lookup is a linear scan, which beats Map.get
// at this size class on every V8 microbench I've seen.
//
// Mechanism. We do three things:
//
// 1. Patch PDFDict.prototype.{keys, values, entries, set, get, has,
//    delete, asMap, clone, toString, sizeInBytes, copyBytesInto} so
//    `this.dict` is read as a flat array instead of a Map.
//    sizeInBytes / copyBytesInto subsume fast-dict-iter.mjs (no
//    Map.forEach + thisArg context object needed; iteration is just
//    `for (let i = 0; i < arr.length; i += 2)`).
//
// 2. Patch PDFDict.withContext, PDFDict.fromMapWithContext, and the
//    parallel fromMapWithContext / withContextAndPages helpers on
//    PDFCatalog / PDFPageTree / PDFPageLeaf, plus PDFPageLeaf's
//    clone() which constructs `new Map()` directly. Each of these is
//    rewritten to produce / accept a flat array; the Map argument is
//    converted at the seam (rare-path cost, only a few dicts per
//    document hit these factories).
//
// 3. Patch PDFObjectParser.prototype.parseDict so the parser's hot
//    inner loop accumulates into a flat array directly (no Map(), no
//    Map.set). The Type-sentinel dispatch at the tail becomes a
//    short linear scan over the array; on dicts that have a /Type
//    entry it's the first or second key (PDF convention), so the
//    scan is effectively O(1). This subsumes fast-parse-dict.mjs.
//
// Compatibility. Every consumer of `dict.dict.X` inside pdf-lib
// (ViewerPreferences, AppearanceCharacteristics, PDFAcroField,
// PDFAcroChoice, PDFAcroText, PDFAcroForm, PDFAnnotation,
// PDFWidgetAnnotation, BorderStyle, PDFStreamWriter, PDFCrossRefStream,
// PDFObjectCopier, PDFXRefStreamParser, etc.) goes through
// PDFDict.prototype methods (.set / .get / .has / .delete / .entries /
// .lookup), all of which we re-implement to read the array. Nobody in
// the codebase touches `dict.dict` expecting a Map iterator -- grep
// confirmed. `asMap()` still returns a fresh `new Map(...)` for any
// caller that genuinely wants a Map view.
//
// This shim is mutually exclusive with --fast-parse-dict and
// --fast-dict-iter: both are subsumed and would re-install the
// Map-based methods if loaded afterwards. measure.mjs enforces this.
//
// Side-effecting import. Import once before any pdf-lib operation:
//
//   import "./lib/fast-dict-array.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

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

// Captured canonical PDFNames for the parser's Type-dispatch tail.
// Pool-dedup ([PDFName.js:18,100]) guarantees reference equality with
// whatever the parser sees inside the dict.
const TypeName    = PDFName.of('Type');
const CatalogName = PDFName.of('Catalog');
const PagesName   = PDFName.of('Pages');
const PageName    = PDFName.of('Page');

// Map -> flat array. Called at the seam from the factories below; not
// on the hot parse path.
function mapToArray(map) {
  const arr = new Array(map.size * 2);
  let i = 0;
  for (const [k, v] of map) { arr[i++] = k; arr[i++] = v; }
  return arr;
}

// Linear scan for the index of `key` in [k0, v0, k1, v1, ...]; returns
// the key-slot index, or -1 if absent.
function indexOfKey(arr, key) {
  for (let i = 0, len = arr.length; i < len; i += 2) {
    if (arr[i] === key) return i;
  }
  return -1;
}

if (!PDFDict.prototype.__fastDictArrayInstalled) {

  // ---- PDFDict.prototype --------------------------------------------

  PDFDict.prototype.keys = function () {
    const arr = this.dict;
    const out = new Array(arr.length >> 1);
    for (let i = 0, j = 0, len = arr.length; i < len; i += 2, j++) out[j] = arr[i];
    return out;
  };

  PDFDict.prototype.values = function () {
    const arr = this.dict;
    const out = new Array(arr.length >> 1);
    for (let i = 1, j = 0, len = arr.length; i < len; i += 2, j++) out[j] = arr[i];
    return out;
  };

  PDFDict.prototype.entries = function () {
    const arr = this.dict;
    const out = new Array(arr.length >> 1);
    for (let i = 0, j = 0, len = arr.length; i < len; i += 2, j++) {
      out[j] = [arr[i], arr[i + 1]];
    }
    return out;
  };

  PDFDict.prototype.set = function (key, value) {
    const arr = this.dict;
    const idx = indexOfKey(arr, key);
    if (idx >= 0) {
      arr[idx + 1] = value;
    } else {
      arr.push(key, value);
    }
  };

  PDFDict.prototype.get = function (key, preservePDFNull) {
    if (preservePDFNull === undefined) preservePDFNull = false;
    const arr = this.dict;
    const idx = indexOfKey(arr, key);
    if (idx < 0) return undefined;
    const value = arr[idx + 1];
    if (value === PDFNull && !preservePDFNull) return undefined;
    return value;
  };

  PDFDict.prototype.has = function (key) {
    const arr = this.dict;
    const idx = indexOfKey(arr, key);
    if (idx < 0) return false;
    const value = arr[idx + 1];
    return value !== undefined && value !== PDFNull;
  };

  PDFDict.prototype.delete = function (key) {
    const arr = this.dict;
    const idx = indexOfKey(arr, key);
    if (idx < 0) return false;
    arr.splice(idx, 2);
    return true;
  };

  PDFDict.prototype.asMap = function () {
    const arr = this.dict;
    const m = new Map();
    for (let i = 0, len = arr.length; i < len; i += 2) m.set(arr[i], arr[i + 1]);
    return m;
  };

  PDFDict.prototype.clone = function (context) {
    const ctx = context || this.context;
    const cloned = this.dict.slice();
    return new PDFDict(cloned, ctx);
  };

  PDFDict.prototype.toString = function () {
    const arr = this.dict;
    let s = '<<\n';
    for (let i = 0, len = arr.length; i < len; i += 2) {
      s += arr[i].toString() + ' ' + arr[i + 1].toString() + '\n';
    }
    return s + '>>';
  };

  PDFDict.prototype.sizeInBytes = function () {
    const arr = this.dict;
    let size = 5;
    for (let i = 0, len = arr.length; i < len; i += 2) {
      size += arr[i].sizeInBytes() + arr[i + 1].sizeInBytes() + 2;
    }
    return size;
  };

  PDFDict.prototype.copyBytesInto = function (buffer, offset) {
    const initialOffset = offset;
    buffer[offset++] = CharCodes.LessThan;
    buffer[offset++] = CharCodes.LessThan;
    buffer[offset++] = CharCodes.Newline;
    const arr = this.dict;
    for (let i = 0, len = arr.length; i < len; i += 2) {
      offset += arr[i].copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Space;
      offset += arr[i + 1].copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Newline;
    }
    buffer[offset++] = CharCodes.GreaterThan;
    buffer[offset++] = CharCodes.GreaterThan;
    return offset - initialOffset;
  };

  // ---- PDFDict factories --------------------------------------------

  PDFDict.withContext = function (context) {
    return new PDFDict([], context);
  };
  PDFDict.fromMapWithContext = function (map, context) {
    return new PDFDict(mapToArray(map), context);
  };

  // ---- Subclass factories -------------------------------------------
  // PDFCatalog.withContextAndPages builds a fresh 2-entry Map; just
  // hand it the equivalent 2-entry array.

  PDFCatalog.withContextAndPages = function (context, pages) {
    return new PDFCatalog(
      [PDFName.of('Type'), CatalogName, PagesName, pages],
      context,
    );
  };
  PDFCatalog.fromMapWithContext = function (map, context) {
    return new PDFCatalog(mapToArray(map), context);
  };

  PDFPageTree.fromMapWithContext = function (map, context) {
    return new PDFPageTree(mapToArray(map), context);
  };

  PDFPageLeaf.fromMapWithContext = function (map, context, autoNormalizeCTM) {
    return new PDFPageLeaf(mapToArray(map), context, autoNormalizeCTM);
  };
  // PDFPageLeaf.prototype.clone constructs `new Map()` explicitly,
  // then copies via this.entries() + clone.set(); since clone.set is
  // PDFDict.prototype.set (now array-aware), it works as long as
  // fromMapWithContext receives an empty Map and converts it.
  // mapToArray(new Map()) yields []; nothing to patch here.

  // ---- PDFObjectParser.prototype.parseDict --------------------------
  // Subsumes fast-parse-dict.mjs: no `new Map()`, no `dict.set(...)`
  // in the hot inner loop. The Type-sentinel dispatch at the tail is
  // a short linear scan; PDF convention places /Type first, so it's
  // effectively O(1) per dict.

  // Initial capacity for the per-dict accumulator. NOT a scratch
  // buffer (the array isn't reused across calls -- it's allocated
  // fresh each dict, filled with parsed entries, and handed to the
  // PDFDict constructor where it lives as `pdfDict.dict` for the
  // document's lifetime). Just a pre-sized initial capacity that
  // skips push-grow's reallocation chain.
  //
  // Histogram from the book parse (see instrument-parsedict.mjs):
  // 5-entry dicts dominate (52 %, exactly 10 push slots), 4-entry
  // next (28 %, 8 slots), long tail to 7-8 entries. INITIAL_SLOTS =
  // 10 is exact-fit for the median case; smaller dicts (2/3/4
  // entries) waste a few slots, larger ones (7+) take one growth
  // via push. Cuts ~70 bytes of FixedArray-header allocation per
  // dict vs INITIAL_SLOTS=16 -- on 261 k dict invocations that
  // adds up.
  const INITIAL_SLOTS = 10;
  PDFObjectParser.prototype.parseDict = function fastParseDictArray() {
    const bytes = this.bytes;
    bytes.assertNext(CharCodes.LessThan);
    bytes.assertNext(CharCodes.LessThan);
    this.skipWhitespaceAndComments();
    const arr = new Array(INITIAL_SLOTS);
    let len = 0;
    while (!bytes.done() &&
           bytes.peek() !== CharCodes.GreaterThan &&
           bytes.peekAhead(1) !== CharCodes.GreaterThan) {
      const key = this.parseName();
      const value = this.parseObject();
      if (len < INITIAL_SLOTS) {
        arr[len]     = key;
        arr[len + 1] = value;
      } else {
        // Rare overflow path: set length to current len so push
        // appends at the right offset, then grow naturally.
        arr.length = len;
        arr.push(key, value);
      }
      len += 2;
      this.skipWhitespaceAndComments();
    }
    this.skipWhitespaceAndComments();
    bytes.assertNext(CharCodes.GreaterThan);
    bytes.assertNext(CharCodes.GreaterThan);
    arr.length = len;

    // Type-sentinel dispatch. Inline-scan for TypeName; in practice
    // it's at arr[0] or arr[2].
    let Type;
    for (let i = 0; i < len; i += 2) {
      if (arr[i] === TypeName) { Type = arr[i + 1]; break; }
    }
    if (Type === CatalogName) return new PDFCatalog(arr, this.context);
    if (Type === PagesName)   return new PDFPageTree(arr, this.context);
    if (Type === PageName)    return new PDFPageLeaf(arr, this.context);
    return new PDFDict(arr, this.context);
  };

  PDFDict.prototype.__fastDictArrayInstalled = true;
  // Mark the subsumed shims as installed so a redundant load is a no-op.
  PDFDict.prototype.__fastDictIterInstalled = true;
  PDFObjectParser.prototype.__fastParseDictInstalled = true;
}
