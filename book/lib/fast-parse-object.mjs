// Dispatch PDFObjectParser.parseObject by first byte; gate the three
// keyword scans behind a byte check.
//
// The upstream parseObject
// ([PDFObjectParser.js:36](node_modules/pdf-lib/cjs/core/parser/PDFObjectParser.js:36))
// runs three speculative matchKeyword calls (true / false / null)
// before peeking the dispatch byte:
//
//   parseObject() {
//     this.skipWhitespaceAndComments();
//     if (this.matchKeyword(Keywords.true))  return PDFBool.True;
//     if (this.matchKeyword(Keywords.false)) return PDFBool.False;
//     if (this.matchKeyword(Keywords.null))  return PDFNull;
//     var byte = this.bytes.peek();
//     ...
//   }
//
// parseObject is called for every dict value, array element, and
// indirect-object body -- same call density as fastParseDict, which
// is the #2 row in the process profile. true / false / null are
// extraordinarily rare in real PDFs (boolean / null entries on
// individual dict values, mostly), so the three matchKeyword calls
// fail-and-rewind on essentially every invocation. Each failure
// still pays bytes.offset() + bytes.next() + comparison +
// bytes.moveTo(initialOffset).
//
// This shim flips the dispatch: peek the first byte, branch by byte
// for the structural tokens, and only enter matchKeyword when the
// byte is `t` / `f` / `n` (i.e. could plausibly start the keyword).
// Dispatch order is by observed frequency in dict-value position:
// numbers / refs first (digits + sign + period), then dicts (<<),
// names (/), arrays ([), strings ((), hex strings (<). Same
// semantics -- a value starting with `t`/`f`/`n` that isn't a
// keyword still falls through to the same PDFObjectParsingError
// throw.
//
// Mechanism: PDFObjectParser comes from pdf-lib-internals.mjs.
// Mutating PDFObjectParser.prototype.parseObject is global -- every
// parser instance created after this shim loads picks it up.
//
// Side-effecting import. Import once before PDFDocument.load runs:
//
//   import "./lib/fast-parse-object.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import {
  PDFObjectParser, PDFBool, PDFNull, CharCodes, Keywords, IsNumeric, PDFObjectParsingError,
} from './pdf-lib-internals.mjs';

const KwTrue  = Keywords.true;
const KwFalse = Keywords.false;
const KwNull  = Keywords.null;

const LessThan          = CharCodes.LessThan;
const ForwardSlash      = CharCodes.ForwardSlash;
const LeftSquareBracket = CharCodes.LeftSquareBracket;
const LeftParen         = CharCodes.LeftParen;
const t_code            = CharCodes.t;
const f_code            = CharCodes.f;
const n_code            = CharCodes.n;

if (!PDFObjectParser.prototype.__fastParseObjectInstalled) {
  PDFObjectParser.prototype.parseObject = function fastParseObject() {
    this.skipWhitespaceAndComments();
    const bytes = this.bytes;
    const byte = bytes.peek();
    if (IsNumeric[byte]) return this.parseNumberOrRef();
    if (byte === LessThan) {
      if (bytes.peekAhead(1) === LessThan) return this.parseDictOrStream();
      return this.parseHexString();
    }
    if (byte === ForwardSlash)      return this.parseName();
    if (byte === LeftSquareBracket) return this.parseArray();
    if (byte === LeftParen)         return this.parseString();
    if (byte === t_code && this.matchKeyword(KwTrue))  return PDFBool.True;
    if (byte === f_code && this.matchKeyword(KwFalse)) return PDFBool.False;
    if (byte === n_code && this.matchKeyword(KwNull))  return PDFNull;
    throw new PDFObjectParsingError(bytes.position(), byte);
  };

  PDFObjectParser.prototype.__fastParseObjectInstalled = true;
}
