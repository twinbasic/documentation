// Skip pdf-lib's decodeName regex scan when the input has no `#`.
//
// The upstream PDFName.of
// ([PDFName.js:100](node_modules/pdf-lib/cjs/core/objects/PDFName.js:100))
// is the gatekeeper for every PDFName instance the parser builds:
//
//   PDFName.of = function (name) {
//       var decodedValue = decodeName(name);   // <-- always runs
//       var instance = pool.get(decodedValue);
//       if (!instance) { ... }
//       return instance;
//   };
//
// and decodeName at line 9 is:
//
//   name.replace(/#([\dABCDEF]{2})/g, function (_, hex) { ... })
//
// PDF spec (ISO 32000-1 §7.3.5) requires `#XX` hex-escape for any
// byte outside printable-ASCII or for delimiters / whitespace. In
// real PDFs almost no names use it. Instrumenting on the book:
//
//   PDFName.of calls       : 2,759,635
//     raw input has # char : 2 (0.000%)
//
// So decodeName runs a regex scan against 2.76 M strings to find a
// `#` that's only there twice in the whole load. Profile attributes
// ~168 ms (7 %) of process self-time to this function.
//
// Shim: a parallel Map<string, PDFName> keyed by the raw `name`
// argument. When `name` contains no `#`, decoded form equals raw
// form, so our key matches pdf-lib's internal pool key and a hit
// returns the deduped instance with zero regex work. Misses
// delegate to the original (which does the regex scan once and
// stores the instance in pdf-lib's pool); we cache the result so
// every subsequent occurrence of the same name hits our fast path.
//
// Names containing `#` fall through to the original unchanged --
// the correctness path (e.g. uppercase-only regex, lowercase escapes
// silently un-decoded) is preserved exactly.
//
// Mechanism: PDFName is re-exported from pdf-lib's index, so we can
// patch PDFName.of directly without reaching into CJS internals.
// Static initializers (PDFName.Length, .FlateDecode, ...) ran when
// pdf-lib's module body executed -- before this shim imports -- so
// pdf-lib's pool is already populated with the canonical instances
// the parser will see.
//
// Side-effecting import. Import once before any pdf-lib operation:
//
//   import "./lib/fast-decode-name.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { PDFName } from "pdf-lib";

if (!PDFName.__fastDecodeNameInstalled) {
  const original = PDFName.of;
  const fastCache = new Map();
  PDFName.of = function fastOf(name) {
    if (name.indexOf("#") === -1) {
      const cached = fastCache.get(name);
      if (cached) return cached;
      const instance = original.call(PDFName, name);
      fastCache.set(name, instance);
      return instance;
    }
    return original.call(PDFName, name);
  };
  PDFName.__fastDecodeNameInstalled = true;
}
