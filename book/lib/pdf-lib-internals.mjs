// The pdf-lib objects the book's shims patch or call, required in one place.
//
// Each is required by its CommonJS path under pdf-lib/cjs, and a shim imports
// what it needs by name. Most are the same objects pdf-lib's index exports.
// BaseParser and the syntax tables (Keywords, IsDigit, IsNumeric, IsWhitespace,
// IsDelimiter) are not in the index at all, and the three utility modules are
// exported whole because the shims that replace numberToString and sizeInBytes
// assign into each of them. 'pdf-lib' resolves to cjs/index.js, the package's
// `main` (it has no `exports` map), so each of these is the instance pdf-lib
// itself uses, and a patch applied to it reaches the library, not a copy.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const PDFDocument           = require('pdf-lib/cjs/api/PDFDocument.js').default;
export const PDFContext            = require('pdf-lib/cjs/core/PDFContext.js').default;

export const PDFCrossRefSection    = require('pdf-lib/cjs/core/document/PDFCrossRefSection.js').default;
export const PDFHeader             = require('pdf-lib/cjs/core/document/PDFHeader.js').default;
export const PDFTrailer            = require('pdf-lib/cjs/core/document/PDFTrailer.js').default;
export const PDFTrailerDict        = require('pdf-lib/cjs/core/document/PDFTrailerDict.js').default;

export const PDFArray              = require('pdf-lib/cjs/core/objects/PDFArray.js').default;
export const PDFBool               = require('pdf-lib/cjs/core/objects/PDFBool.js').default;
export const PDFDict               = require('pdf-lib/cjs/core/objects/PDFDict.js').default;
export const PDFInvalidObject      = require('pdf-lib/cjs/core/objects/PDFInvalidObject.js').default;
export const PDFName               = require('pdf-lib/cjs/core/objects/PDFName.js').default;
export const PDFNull               = require('pdf-lib/cjs/core/objects/PDFNull.js').default;
export const PDFNumber             = require('pdf-lib/cjs/core/objects/PDFNumber.js').default;
export const PDFRawStream          = require('pdf-lib/cjs/core/objects/PDFRawStream.js').default;
export const PDFRef                = require('pdf-lib/cjs/core/objects/PDFRef.js').default;
export const PDFStream             = require('pdf-lib/cjs/core/objects/PDFStream.js').default;

export const BaseParser            = require('pdf-lib/cjs/core/parser/BaseParser.js').default;
export const PDFObjectParser       = require('pdf-lib/cjs/core/parser/PDFObjectParser.js').default;
export const PDFObjectStreamParser = require('pdf-lib/cjs/core/parser/PDFObjectStreamParser.js').default;
export const PDFParser             = require('pdf-lib/cjs/core/parser/PDFParser.js').default;
export const PDFXRefStreamParser   = require('pdf-lib/cjs/core/parser/PDFXRefStreamParser.js').default;

export const PDFCatalog            = require('pdf-lib/cjs/core/structures/PDFCatalog.js').default;
export const PDFCrossRefStream     = require('pdf-lib/cjs/core/structures/PDFCrossRefStream.js').default;
export const PDFObjectStream       = require('pdf-lib/cjs/core/structures/PDFObjectStream.js').default;
export const PDFPageLeaf           = require('pdf-lib/cjs/core/structures/PDFPageLeaf.js').default;
export const PDFPageTree           = require('pdf-lib/cjs/core/structures/PDFPageTree.js').default;

export const CharCodes             = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;
export const { IsDelimiter }       = require('pdf-lib/cjs/core/syntax/Delimiters.js');
export const { Keywords }          = require('pdf-lib/cjs/core/syntax/Keywords.js');
export const { IsDigit, IsNumeric } = require('pdf-lib/cjs/core/syntax/Numeric.js');
export const { IsWhitespace }      = require('pdf-lib/cjs/core/syntax/Whitespace.js');

export const PDFStreamWriter       = require('pdf-lib/cjs/core/writers/PDFStreamWriter.js').default;
export const PDFWriter             = require('pdf-lib/cjs/core/writers/PDFWriter.js').default;

export const {
  PDFObjectParsingError,
  ReparseError,
  StalledParserError,
  UnexpectedObjectTypeError,
} = require('pdf-lib/cjs/core/errors.js');

export const numbers     = require('pdf-lib/cjs/utils/numbers.js');
export const utilsBarrel = require('pdf-lib/cjs/utils/index.js');
export const topBarrel   = require('pdf-lib/cjs/index.js');
export const { copyStringIntoBuffer, last, toUint8Array } = utilsBarrel;
