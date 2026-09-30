// Replace pdf-lib's utils.sizeInBytes -- which allocates a base-2 string
// just to count its bit length -- with a non-allocating short-circuit
// ladder.
//
// The upstream sizeInBytes
// ([numbers.js:37](node_modules/pdf-lib/cjs/utils/numbers.js:37)) is:
//
//   exports.sizeInBytes = function (n) {
//       return Math.ceil(n.toString(2).length / 8);
//   };
//
// It's called from PDFCrossRefStream.computeMaxEntryByteWidths (three
// calls per xref entry, ~50 k entries on the book) and from
// utils.bytesFor (to size the Uint8Array before filling it byte-by-
// byte, called from PDFCrossRefStream.getUnencodedContents). Both
// paths are part of writing the cross-reference stream.
//
// For the xref values the distribution is heavily skewed small: type
// is always 0/1/2 (1 byte), generationNumber is always 0 (1 byte),
// object-stream indices are small (1-2 bytes), and file offsets are
// 3-4 bytes for any sub-4GB PDF. A short-circuit ladder catches the
// dominant cases in one compare; the rare 5+ byte tail falls through
// to a Math.clz32-based fallback that's still allocation-free.
//
// Why patch three places (and why bytesFor isn't on the list):
// pdf-lib ships compiled against tslib 1.x, whose `__exportStar`
// does a value-copy (`exports[p] = m[p]`) rather than installing a
// live getter. So consumers that read sizeInBytes through a barrel
// (`utils_1.sizeInBytes(...)` from PDFCrossRefStream) hold a
// captured reference and won't see a mutation of `numbers.sizeInBytes`
// alone. Patch all three barrel layers (utils/numbers, utils/index,
// top-level index) to cover every observed call site. utils.bytesFor
// reads `exports.sizeInBytes` at call time from the same module
// object we mutate first, so it picks up the fast path without a
// separate patch.
//
// At load it checks that what it replaces is as in pdf-lib 1.17.1 (see
// shim-targets.mjs), and throws otherwise. It goes when pdf-lib is replaced;
// when a release changes what it patches, it is re-derived or removed.
//
// Side-effecting import. Import once before any pdf-lib operation:
//
//   import "./lib/fast-size-in-bytes.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { numbers, utilsBarrel, topBarrel } from './pdf-lib-internals.mjs';
import { checkTargets } from './shim-targets.mjs';

if (!numbers.__fastSizeInBytesInstalled) {
  checkTargets(import.meta.url, { numbers, utilsBarrel, topBarrel }, {
    'numbers.sizeInBytes':     [1, '9d66145407d5'],
    'utilsBarrel.sizeInBytes': [1, '9d66145407d5'],
    'topBarrel.sizeInBytes':   [1, '9d66145407d5'],
  });
  const fastSizeInBytes = function fastSizeInBytes(n) {
    if (n < 0x100) return 1;
    if (n < 0x10000) return 2;
    if (n < 0x1000000) return 3;
    if (n < 0x100000000) return 4;
    return 4 + Math.ceil((32 - Math.clz32(Math.floor(n / 0x100000000))) / 8);
  };
  numbers.sizeInBytes     = fastSizeInBytes;
  utilsBarrel.sizeInBytes = fastSizeInBytes;
  topBarrel.sizeInBytes   = fastSizeInBytes;
  numbers.__fastSizeInBytesInstalled = true;
}
