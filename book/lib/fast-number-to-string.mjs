// Skip pdf-lib's numberToString redundant work when the input doesn't
// stringify to exponential notation.
//
// The upstream numberToString
// ([numbers.js:13](node_modules/pdf-lib/cjs/utils/numbers.js:13)) is:
//
//   exports.numberToString = function (num) {
//       var numStr = String(num);
//       if (Math.abs(num) < 1.0) {
//           var e = parseInt(num.toString().split('e-')[1]);
//           if (e) { ... }
//       } else {
//           var e = parseInt(num.toString().split('+')[1]);
//           if (e > 20) { ... }
//       }
//       return numStr;
//   };
//
// It always computes `numStr = String(num)` up front -- but then
// re-calls `num.toString()`, allocates a `.split(...)` array, and
// runs parseInt on the result, even though `numStr` is already what
// `.toString()` returns. Exponential notation in `String(num)` only
// appears for |num| < 1e-6 or |num| >= 1e21, neither of which real
// PDFs emit: object refs, generations, byte offsets, content-stream
// coordinates, /Size, /Length, etc. all stringify to plain decimal.
//
// Shim: short-circuit when `String(num)` contains no `'e'` and return
// it immediately. The rare exponential cases fall through to the
// original so the spec-compliant expansion logic is preserved.
//
// Why three patches and not one: pdf-lib ships compiled against
// tslib 1.x, whose `__exportStar` does a value-copy (`exports[p] =
// m[p]`) rather than installing a live getter. So by the time
// PDFNumber.js's `index_1.numberToString(value)` runs, `index_1` (the
// utils/index barrel) holds a captured reference to the original
// function, and mutating `numbers.numberToString` alone is invisible
// to the call site. We patch the captured copies along the re-export
// chain: utils/numbers (source), utils/index (the barrel PDFNumber
// reads from), and pdf-lib's top-level index (the public surface).
//
// At load it checks that what it replaces is as in pdf-lib 1.17.1 (see
// shim-targets.mjs), and throws otherwise. It goes when pdf-lib is replaced;
// when a release changes what it patches, it is re-derived or removed.
//
// Side-effecting import. Import once before any pdf-lib operation:
//
//   import "./lib/fast-number-to-string.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { numbers, utilsBarrel, topBarrel } from './pdf-lib-internals.mjs';
import { checkTargets } from './shim-targets.mjs';

if (!numbers.__fastNumberToStringInstalled) {
  checkTargets(import.meta.url, { numbers, utilsBarrel, topBarrel }, {
    'numbers.numberToString':     [1, 'cffe79177032'],
    'utilsBarrel.numberToString': [1, 'cffe79177032'],
    'topBarrel.numberToString':   [1, 'cffe79177032'],
  });
  const original = numbers.numberToString;
  const fastNumberToString = function fastNumberToString(num) {
    const numStr = String(num);
    if (numStr.indexOf('e') === -1) return numStr;
    return original(num);
  };
  numbers.numberToString     = fastNumberToString;
  utilsBarrel.numberToString = fastNumberToString;
  topBarrel.numberToString   = fastNumberToString;
  numbers.__fastNumberToStringInstalled = true;
}
