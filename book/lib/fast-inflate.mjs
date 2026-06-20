// Replace pako's pure-JS inflate with Node's zlib for the one path
// pdf-lib actually uses it on: PDFCrossRefStreamParser inflating the
// compressed cross-reference stream during PDFDocument.load. Exactly
// one call per load on Chrome-emitted PDFs (PDF 1.5+ xref-stream
// format), ~4.5 KB input. Negligible wall-clock, but it's the last
// remaining pdf-lib -> pako call site once parallelSave has taken
// over the deflate side -- this brings the runtime pako call count
// to zero.
//
// PDF /FlateDecode (ISO 32000-1 §7.4.4) is the zlib format (RFC 1950):
// 2-byte zlib header + raw deflate body (RFC 1951) + 4-byte Adler-32
// trailer. Both pako.inflate and zlib.inflateSync consume that
// format, so the swap is wire-compatible.
//
// Mechanism: pdf-lib is CJS in node_modules and calls
// `require("pako").inflate(...)` at the call site, not at import
// time. Mutating the live pako exports object is enough; no fork
// required.
//
// Side-effecting import. Import once before PDFDocument.load runs:
//
//   import "./lib/fast-inflate.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { inflateSync } from "node:zlib";
import pako from "pako";

if (!pako.__fastInflateInstalled) {
  const original = pako.inflate;
  pako.inflate = function fastInflate(data, options) {
    // pdf-lib's only caller passes no options. Anything fancier
    // (dictionary, raw, custom windowBits) goes back to pako so we
    // don't change behaviour outside the one path we care about.
    if (options) return original.call(pako, data, options);
    return inflateSync(data);
  };
  pako.__fastInflateInstalled = true;
}
