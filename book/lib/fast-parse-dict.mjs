// Hoist the four sentinel PDFName.of calls out of
// PDFObjectParser.prototype.parseDict.
//
// The upstream parseDict
// ([PDFObjectParser.js:141](node_modules/pdf-lib/cjs/core/parser/PDFObjectParser.js:141))
// ends every dict it parses with a Type-dispatch tail:
//
//   var Type = dict.get(PDFName.of('Type'));
//   if (Type === PDFName.of('Catalog')) return PDFCatalog.fromMapWithContext(...);
//   else if (Type === PDFName.of('Pages')) return PDFPageTree.fromMapWithContext(...);
//   else if (Type === PDFName.of('Page'))  return PDFPageLeaf.fromMapWithContext(...);
//   else                                   return PDFDict.fromMapWithContext(...);
//
// That's 4 PDFName.of calls per dict, even on the overwhelming
// majority (resource dicts, font descriptors, content-stream dicts)
// that have no /Type entry at all. With --fast-decode-name in
// effect each call collapses to a Map.get on fastCache, but
// fastOf is still the #4 row in process.cpuprofile (~80 ms,
// 5.2 %).
//
// PDFName instances are pool-deduped
// ([PDFName.js:18,100](node_modules/pdf-lib/cjs/core/objects/PDFName.js:18))
// so the sentinel "Type" / "Catalog" / "Pages" / "Page" PDFNames
// are reference-stable for the entire load. Capture them once at
// shim-load time and substitute direct constants for the four
// PDFName.of calls inside parseDict. The rest of the function
// body is preserved verbatim -- same loop, same dict.set, same
// dispatch shape.
//
// Mechanism: PDFObjectParser isn't re-exported by pdf-lib's index,
// so we reach in through the CJS internals via createRequire (same
// shape as fast-parse-number.mjs / fast-dict-iter.mjs). Mutating
// PDFObjectParser.prototype.parseDict is global -- every parser
// instance created after this shim loads picks it up.
//
// Side-effecting import. Import once before PDFDocument.load runs:
//
//   import "./lib/fast-parse-dict.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFObjectParser = require('pdf-lib/cjs/core/parser/PDFObjectParser.js').default;
const PDFName         = require('pdf-lib/cjs/core/objects/PDFName.js').default;
const PDFDict         = require('pdf-lib/cjs/core/objects/PDFDict.js').default;
const PDFCatalog      = require('pdf-lib/cjs/core/structures/PDFCatalog.js').default;
const PDFPageTree     = require('pdf-lib/cjs/core/structures/PDFPageTree.js').default;
const PDFPageLeaf     = require('pdf-lib/cjs/core/structures/PDFPageLeaf.js').default;
const CharCodes       = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;

// Capture canonical PDFName instances. Pool-dedup guarantees the
// parser would have built === these even if the original parseDict
// were still in play.
const TypeName    = PDFName.of('Type');
const CatalogName = PDFName.of('Catalog');
const PagesName   = PDFName.of('Pages');
const PageName    = PDFName.of('Page');

if (!PDFObjectParser.prototype.__fastParseDictInstalled) {
  PDFObjectParser.prototype.parseDict = function fastParseDict() {
    const bytes = this.bytes;
    bytes.assertNext(CharCodes.LessThan);
    bytes.assertNext(CharCodes.LessThan);
    this.skipWhitespaceAndComments();
    const dict = new Map();
    while (!bytes.done() &&
           bytes.peek() !== CharCodes.GreaterThan &&
           bytes.peekAhead(1) !== CharCodes.GreaterThan) {
      const key = this.parseName();
      const value = this.parseObject();
      dict.set(key, value);
      this.skipWhitespaceAndComments();
    }
    this.skipWhitespaceAndComments();
    bytes.assertNext(CharCodes.GreaterThan);
    bytes.assertNext(CharCodes.GreaterThan);
    const Type = dict.get(TypeName);
    if (Type === CatalogName) return PDFCatalog.fromMapWithContext(dict, this.context);
    if (Type === PagesName)   return PDFPageTree.fromMapWithContext(dict, this.context);
    if (Type === PageName)    return PDFPageLeaf.fromMapWithContext(dict, this.context);
    return PDFDict.fromMapWithContext(dict, this.context);
  };

  PDFObjectParser.prototype.__fastParseDictInstalled = true;
}
