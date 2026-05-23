// Replace pako's pure-JS deflate with Node's zlib for the one path
// pdf-lib actually uses it on: PDFFlateStream.computeContents in
// node_modules/pdf-lib/cjs/core/structures/PDFFlateStream.js, which
// calls `pako.deflate(unencodedContents)` once per FlateStream during
// PDFDocument.save().
//
// PDF /FlateDecode (ISO 32000-1 §7.4.4) is the zlib format (RFC 1950):
// a 2-byte zlib header + a raw deflate body (RFC 1951) + a 4-byte
// Adler-32 trailer. Both pako.deflate and zlib.deflateSync produce that
// format with default level 6, so the swap is wire-compatible -- output
// bytes may differ by a small amount (different match choices in the
// compressor's inner loop) but every PDF viewer reads either.
//
// Mechanism: pdf-lib is CJS in node_modules and calls
// `require("pako").deflate(...)` at the call site, not at import time.
// Mutating the live pako exports object is enough; no fork required.
//
// Side-effecting import. Import once before PDFDocument.save() runs:
//
//   import "./lib/fast-deflate.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { deflateSync } from "node:zlib";
import pako from "pako";

if (!pako.__fastDeflateInstalled) {
  const original = pako.deflate;
  pako.deflate = function fastDeflate(data, options) {
    // pdf-lib's only caller passes no options. Anything fancier (dictionary,
    // raw, custom level) goes back to pako so we don't change behaviour
    // outside the one hot path we care about.
    if (options) return original.call(pako, data, options);
    return deflateSync(data);
  };
  pako.__fastDeflateInstalled = true;
}
