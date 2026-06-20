// Pool PDFNumber instances by value.
//
// After fast-refs / fast-indirect-objects / fast-dict-array shipped,
// the residual heap profile attributed ~15 MB of self-size to
// PDFObjectParser.parseNumberOrRef -- mostly inlined `new
// PDFNumber(value)` calls (each of which also allocates a fresh
// stringValue via `numberToString(value)`):
//
//     function PDFNumber(value) {
//         var _this = _super.call(this) || this;
//         _this.numberValue = value;
//         _this.stringValue = numberToString(value);   // allocs
//         return _this;
//     }
//     PDFNumber.of = function (value) { return new PDFNumber(value); };
//
// No pool. Every PDFNumber.of(N) returns a fresh instance, even
// though PDFs are packed with repeated numeric values: page indices
// 0..1651, /Count totals, /N object-stream lengths, common
// /MediaBox dimensions (612, 792, 595, 842), font sizes, bit
// widths. The book parses hundreds of thousands of PDFNumber.of
// calls against a few thousand unique values.
//
// Shim. Dense array indexed by `value` for non-negative small
// integers (0..POOL_SIZE-1, currently 16384 -- covers all observed
// integer values in the book by a wide margin). Map fallback for
// floats, negatives, and out-of-range integers. Same shape as
// fast-refs on the PDFRef side. PDFNumber is immutable
// (numberValue and stringValue are set in the constructor and never
// mutated), so sharing instances is safe.
//
// Side-effecting import. Import once before any pdf-lib operation.
// Idempotent.

import { PDFNumber } from "pdf-lib";

const POOL_SIZE = 16384;

if (!PDFNumber.__fastPoolInstalled) {
  const original = PDFNumber.of;
  const intPool = new Array(POOL_SIZE);   // sparse, holes for unused slots
  const otherPool = new Map();             // floats / negatives / large ints

  PDFNumber.of = function fastNumberOf(value) {
    // Hot path: non-negative integer within pool range.
    if (value >= 0 && value < POOL_SIZE && (value | 0) === value) {
      let pn = intPool[value];
      if (pn !== undefined) return pn;
      pn = original.call(PDFNumber, value);
      intPool[value] = pn;
      return pn;
    }
    // Cold path: Map cache. SameValueZero handles NaN / -0 correctly.
    let pn = otherPool.get(value);
    if (pn !== undefined) return pn;
    pn = original.call(PDFNumber, value);
    otherPool.set(value, pn);
    return pn;
  };
  PDFNumber.__fastPoolInstalled = true;
}
