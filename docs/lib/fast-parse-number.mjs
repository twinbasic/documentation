// Replace pdf-lib's BaseParser.parseRawNumber with a direct-integer
// accumulator that skips per-byte string concatenation, charFromCode
// calls, and the trailing Number() string-parse round-trip.
//
// The upstream implementation
// ([BaseParser.js:33](node_modules/pdf-lib/cjs/core/parser/BaseParser.js:33))
// builds `value` one character at a time via `value += charFromCode(byte)`,
// then calls `Number(value)` to convert the string back to a number,
// then performs `isFinite` + MAX_SAFE_INTEGER guards on every call.
// Every numeric token in a PDF flows through this path
// (PDFObjectParser.parseNumberOrRef invokes it once per number, twice
// per indirect ref), so on the book it fires hundreds of thousands of
// times and allocates a throwaway string per call.
//
// The fast path accumulates the integer directly (n = n*10 + (byte -
// 0x30)) and only descends into decimal handling when a period appears.
// Falls back to the original for:
//   - Numbers with > 15 integer digits (where direct accumulation
//     could exceed Number.MAX_SAFE_INTEGER and lose precision).
//   - Empty-digit cases (e.g., "."), so upstream's NumberParsingError
//     keeps its diagnostic context.
// Both fallback paths are vanishingly rare on real PDFs.
//
// Mechanism: BaseParser isn't re-exported by pdf-lib's index, so we
// import it via the package's CJS internal path through createRequire.
// Mutating BaseParser.prototype affects every subclass (PDFParser,
// PDFObjectParser, PDFObjectStreamParser, PDFXRefStreamParser).
//
// Side-effecting import. Import once before PDFDocument.load runs:
//
//   import "./lib/fast-parse-number.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BaseParser = require('pdf-lib/cjs/core/parser/BaseParser.js').default;
const { IsDigit } = require('pdf-lib/cjs/core/syntax/Numeric.js');

const ZERO = 0x30;   // '0'
const PERIOD = 0x2E; // '.'
const PLUS = 0x2B;   // '+'
const MINUS = 0x2D;  // '-'

// Number.MAX_SAFE_INTEGER == 9007199254740991 (16 digits). 15-digit
// integers are guaranteed to accumulate exactly without precision loss.
const MAX_SAFE_INT_DIGITS = 15;

if (!BaseParser.__fastParseNumberInstalled) {
  const origParseRawNumber = BaseParser.prototype.parseRawNumber;

  BaseParser.prototype.parseRawNumber = function fastParseRawNumber() {
    const bytes = this.bytes;
    const start = bytes.offset();

    // Sign
    let byte = bytes.peek();
    let neg = false;
    if (byte === PLUS) {
      bytes.next();
      byte = bytes.peek();
    } else if (byte === MINUS) {
      neg = true;
      bytes.next();
      byte = bytes.peek();
    }

    // Integer part
    let intPart = 0;
    let intDigits = 0;
    while (!bytes.done() && IsDigit[byte]) {
      if (intDigits >= MAX_SAFE_INT_DIGITS) {
        // Precision risk -- rewind and delegate to upstream's Number()
        // path, which retains correctly-rounded double precision and
        // emits the spec-mandated warning above MAX_SAFE_INTEGER.
        bytes.moveTo(start);
        return origParseRawNumber.call(this);
      }
      intPart = intPart * 10 + (byte - ZERO);
      intDigits++;
      bytes.next();
      byte = bytes.peek();
    }

    if (byte !== PERIOD) {
      if (intDigits === 0) {
        // Empty number (e.g., bare sign with no digits). Rewind and
        // let upstream throw NumberParsingError with full context.
        bytes.moveTo(start);
        return origParseRawNumber.call(this);
      }
      return neg ? -intPart : intPart;
    }

    // Consume period
    bytes.next();
    byte = bytes.peek();

    // Decimal part
    let frac = 0;
    let scale = 1;
    while (!bytes.done() && IsDigit[byte]) {
      frac = frac * 10 + (byte - ZERO);
      scale *= 10;
      bytes.next();
      byte = bytes.peek();
    }

    if (intDigits === 0 && scale === 1) {
      // Lone "." with no digits on either side. Rewind to let upstream
      // throw NumberParsingError.
      bytes.moveTo(start);
      return origParseRawNumber.call(this);
    }

    const value = frac === 0 ? intPart : intPart + frac / scale;
    return neg ? -value : value;
  };

  BaseParser.__fastParseNumberInstalled = true;
}
