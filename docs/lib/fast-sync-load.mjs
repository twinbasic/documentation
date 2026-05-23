// Strip pdf-lib's parseSpeed / objectsPerTick / shouldWaitForTick /
// waitForTick machinery entirely. Synchronify everywhere the conditional
// yield was the only async thing in the method.
//
// pdf-lib's parser and writers are downlevel-compiled from TypeScript
// `async function` to tslib's __awaiter + __generator state machine,
// so on browsers they can yield to the event loop every
// `objectsPerTick` objects via `await waitForTick()`. In Node with
// objectsPerTick: Infinity (which parseSpeed: Fastest historically
// set on the load side) the gate never fires -- the entire generator
// runs in one tick -- yet every indirect object (~50 k on the book)
// still pays the state-machine dispatch + Promise allocation for a
// single fall-through `case 0`.
//
// Eight methods participate in this pattern; this shim replaces all
// of them with synchronous (or, where a legitimate await remains,
// awaiterless `async`) twins:
//
//   Load side (parser):
//     PDFParser.prototype.parseDocument
//     PDFParser.prototype.parseDocumentSection
//     PDFParser.prototype.parseIndirectObjects
//     PDFParser.prototype.parseIndirectObject
//     PDFObjectStreamParser.prototype.parseIntoContext
//     PDFDocument.load   (static; only awaited parseDocument)
//
//   Save side (writers):
//     PDFWriter.prototype.serializeToBuffer
//       (kept `async` because the inherited path awaits the
//        ParallelStreamWriter override of computeBufferSize, which
//        does genuine Promise.all-driven libuv-pool concurrency)
//     PDFWriter.prototype.computeBufferSize
//     PDFStreamWriter.prototype.computeBufferSize
//
// The load-side patches have to land together: each method awaits
// the next one down, so desugaring any one in isolation still leaves
// a Promise chain dangling.
//
// PDFDocument.load's signature is preserved (still callable as
// `await PDFDocument.load(bytes)`; awaiting a non-Promise resolves
// to the value), so existing call sites need no change. The
// parseSpeed option is silently ignored. parallel-deflate.mjs's
// parallelSave drops `objectsPerTick` from its public API in step
// with this shim.
//
// Side-effecting import. Import once before any pdf-lib operation:
//
//   import "./lib/fast-sync-load.mjs";
//
// Idempotent -- repeated imports do nothing after the first.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFParser              = require('pdf-lib/cjs/core/parser/PDFParser.js').default;
const PDFObjectStreamParser  = require('pdf-lib/cjs/core/parser/PDFObjectStreamParser.js').default;
const PDFXRefStreamParser    = require('pdf-lib/cjs/core/parser/PDFXRefStreamParser.js').default;
const PDFRawStream           = require('pdf-lib/cjs/core/objects/PDFRawStream.js').default;
const PDFRef                 = require('pdf-lib/cjs/core/objects/PDFRef.js').default;
const PDFName                = require('pdf-lib/cjs/core/objects/PDFName.js').default;
const PDFNumber              = require('pdf-lib/cjs/core/objects/PDFNumber.js').default;
const PDFStream              = require('pdf-lib/cjs/core/objects/PDFStream.js').default;
const PDFInvalidObject       = require('pdf-lib/cjs/core/objects/PDFInvalidObject.js').default;
const PDFDocument            = require('pdf-lib/cjs/api/PDFDocument.js').default;
const PDFWriter              = require('pdf-lib/cjs/core/writers/PDFWriter.js').default;
const PDFStreamWriter        = require('pdf-lib/cjs/core/writers/PDFStreamWriter.js').default;
const PDFHeader              = require('pdf-lib/cjs/core/document/PDFHeader.js').default;
const PDFTrailer             = require('pdf-lib/cjs/core/document/PDFTrailer.js').default;
const PDFTrailerDict         = require('pdf-lib/cjs/core/document/PDFTrailerDict.js').default;
const PDFCrossRefSection     = require('pdf-lib/cjs/core/document/PDFCrossRefSection.js').default;
const PDFCrossRefStream      = require('pdf-lib/cjs/core/structures/PDFCrossRefStream.js').default;
const PDFObjectStream        = require('pdf-lib/cjs/core/structures/PDFObjectStream.js').default;
const CharCodes              = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;
const { ReparseError, StalledParserError } = require('pdf-lib/cjs/core/errors.js');
const { IsDigit }            = require('pdf-lib/cjs/core/syntax/Numeric.js');
const { Keywords }           = require('pdf-lib/cjs/core/syntax/Keywords.js');
const { toUint8Array, copyStringIntoBuffer, last } = require('pdf-lib/cjs/utils/index.js');

// Pool-deduped PDFName instances are reference-stable for the whole
// load (see fast-parse-dict.mjs for the same trick). Capture the three
// sentinels parseIndirectObject's Type-dispatch needs.
const TypeName   = PDFName.of('Type');
const ObjStmName = PDFName.of('ObjStm');
const XRefName   = PDFName.of('XRef');
const RefZero    = PDFRef.of(0);
const SizeName   = PDFName.of('Size');

if (!PDFParser.prototype.__fastSyncLoadInstalled) {

  // ----- Load side ---------------------------------------------------

  PDFParser.prototype.parseDocument = function parseDocumentSync() {
    if (this.alreadyParsed) {
      throw new ReparseError('PDFParser', 'parseDocument');
    }
    this.alreadyParsed = true;
    this.context.header = this.parseHeader();

    let prevOffset;
    while (!this.bytes.done()) {
      this.parseDocumentSection();
      const offset = this.bytes.offset();
      if (offset === prevOffset) {
        throw new StalledParserError(this.bytes.position());
      }
      prevOffset = offset;
    }

    this.maybeRecoverRoot();
    if (this.context.lookup(RefZero)) {
      console.warn('Removing parsed object: 0 0 R');
      this.context.delete(RefZero);
    }
    return this.context;
  };

  PDFParser.prototype.parseDocumentSection = function parseDocumentSectionSync() {
    this.parseIndirectObjects();
    this.maybeParseCrossRefSection();
    this.maybeParseTrailerDict();
    this.maybeParseTrailer();
    this.skipJibberish();
  };

  PDFParser.prototype.parseIndirectObjects = function parseIndirectObjectsSync() {
    this.skipWhitespaceAndComments();
    while (!this.bytes.done() && IsDigit[this.bytes.peek()]) {
      const initialOffset = this.bytes.offset();
      try {
        this.parseIndirectObject();
      } catch (e) {
        this.bytes.moveTo(initialOffset);
        this.tryToParseInvalidIndirectObject();
      }
      this.skipWhitespaceAndComments();
      this.skipJibberish();
    }
  };

  PDFParser.prototype.parseIndirectObject = function parseIndirectObjectSync() {
    const ref = this.parseIndirectObjectHeader();
    this.skipWhitespaceAndComments();
    const object = this.parseObject();
    this.skipWhitespaceAndComments();
    this.matchKeyword(Keywords.endobj);
    if (object instanceof PDFRawStream &&
        object.dict.lookup(TypeName) === ObjStmName) {
      PDFObjectStreamParser.forStream(object).parseIntoContext();
    } else if (object instanceof PDFRawStream &&
               object.dict.lookup(TypeName) === XRefName) {
      PDFXRefStreamParser.forStream(object).parseIntoContext();
    } else {
      this.context.assign(ref, object);
    }
    return ref;
  };

  PDFObjectStreamParser.prototype.parseIntoContext = function parseIntoContextSync() {
    if (this.alreadyParsed) {
      throw new ReparseError('PDFObjectStreamParser', 'parseIntoContext');
    }
    this.alreadyParsed = true;
    const offsetsAndObjectNumbers = this.parseOffsetsAndObjectNumbers();
    for (let i = 0, len = offsetsAndObjectNumbers.length; i < len; i++) {
      const entry = offsetsAndObjectNumbers[i];
      this.bytes.moveTo(this.firstOffset + entry.offset);
      const object = this.parseObject();
      const ref = PDFRef.of(entry.objectNumber, 0);
      this.context.assign(ref, object);
    }
  };

  // PDFDocument.load only awaited parseDocument(); now that's sync, the
  // outer __awaiter is wasted too. Drop it. Signature unchanged --
  // `await PDFDocument.load(...)` on a non-Promise resolves to the value.
  // The parseSpeed option is silently ignored (no more yield gate to tune).
  PDFDocument.load = function loadSync(pdf, options) {
    if (options === undefined) options = {};
    const ignoreEncryption      = options.ignoreEncryption      === undefined ? false : options.ignoreEncryption;
    const throwOnInvalidObject  = options.throwOnInvalidObject  === undefined ? false : options.throwOnInvalidObject;
    const updateMetadata        = options.updateMetadata        === undefined ? true  : options.updateMetadata;
    const capNumbers            = options.capNumbers            === undefined ? false : options.capNumbers;
    const bytes = toUint8Array(pdf);
    const context = PDFParser.forBytesWithOptions(
      bytes, Infinity, throwOnInvalidObject, capNumbers,
    ).parseDocument();
    return new PDFDocument(context, ignoreEncryption, updateMetadata);
  };

  // ----- Save side ---------------------------------------------------

  // PDFWriter.serializeToBuffer awaits computeBufferSize, which in our
  // pipeline is the ParallelStreamWriter override -- genuinely async
  // because of `await Promise.all(deflated)` over libuv's thread pool.
  // So the wrapper stays async. The conditional waitForTick yield in
  // its main loop is the only piece we strip.
  PDFWriter.prototype.serializeToBuffer = async function serializeToBufferSync() {
    const { size, header, indirectObjects, xref, trailerDict, trailer } =
      await this.computeBufferSize();
    const buffer = new Uint8Array(size);
    let offset = 0;
    offset += header.copyBytesInto(buffer, offset);
    buffer[offset++] = CharCodes.Newline;
    buffer[offset++] = CharCodes.Newline;
    for (let idx = 0, len = indirectObjects.length; idx < len; idx++) {
      const indirectObject = indirectObjects[idx];
      const ref = indirectObject[0];
      const object = indirectObject[1];
      offset += copyStringIntoBuffer(String(ref.objectNumber), buffer, offset);
      buffer[offset++] = CharCodes.Space;
      offset += copyStringIntoBuffer(String(ref.generationNumber), buffer, offset);
      buffer[offset++] = CharCodes.Space;
      buffer[offset++] = CharCodes.o;
      buffer[offset++] = CharCodes.b;
      buffer[offset++] = CharCodes.j;
      buffer[offset++] = CharCodes.Newline;
      offset += object.copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Newline;
      buffer[offset++] = CharCodes.e;
      buffer[offset++] = CharCodes.n;
      buffer[offset++] = CharCodes.d;
      buffer[offset++] = CharCodes.o;
      buffer[offset++] = CharCodes.b;
      buffer[offset++] = CharCodes.j;
      buffer[offset++] = CharCodes.Newline;
      buffer[offset++] = CharCodes.Newline;
    }
    if (xref) {
      offset += xref.copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Newline;
    }
    if (trailerDict) {
      offset += trailerDict.copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Newline;
      buffer[offset++] = CharCodes.Newline;
    }
    offset += trailer.copyBytesInto(buffer, offset);
    return buffer;
  };

  // PDFWriter.computeBufferSize -- the basic (non-stream) writer's
  // sizing pass. Not on our pipeline's hot path (we route through
  // PDFStreamWriter via ParallelStreamWriter, both of which override
  // this method) but patched for consistency: the only async thing
  // upstream is the conditional waitForTick yield in its loop.
  PDFWriter.prototype.computeBufferSize = function computeBufferSizeBaseSync() {
    const header = PDFHeader.forVersion(1, 7);
    let size = header.sizeInBytes() + 2;
    const xref = PDFCrossRefSection.create();
    const indirectObjects = this.context.enumerateIndirectObjects();
    for (let idx = 0, len = indirectObjects.length; idx < len; idx++) {
      const indirectObject = indirectObjects[idx];
      const ref = indirectObject[0];
      xref.addEntry(ref, size);
      size += this.computeIndirectObjectSize(indirectObject);
    }
    const xrefOffset = size;
    size += xref.sizeInBytes() + 1;
    const trailerDict = PDFTrailerDict.of(this.createTrailerDict());
    size += trailerDict.sizeInBytes() + 2;
    const trailer = PDFTrailer.forLastCrossRefSectionOffset(xrefOffset);
    size += trailer.sizeInBytes();
    return { size, header, indirectObjects, xref, trailerDict, trailer };
  };

  // PDFStreamWriter.computeBufferSize -- the upstream stream writer's
  // sizing pass with two waitForTick gates (one per loop). Not on our
  // pipeline's hot path (ParallelStreamWriter overrides this with its
  // own three-phase parallel-deflate version) but patched for
  // consistency. Logic mirrors the upstream method body exactly.
  PDFStreamWriter.prototype.computeBufferSize = function computeBufferSizeStreamSync() {
    let objectNumber = this.context.largestObjectNumber + 1;
    const header = PDFHeader.forVersion(1, 7);
    let size = header.sizeInBytes() + 2;
    const xrefStream = PDFCrossRefStream.create(this.createTrailerDict(), this.encodeStreams);

    const uncompressedObjects = [];
    const compressedObjects = [];
    const objectStreamRefs = [];

    const indirectObjects = this.context.enumerateIndirectObjects();
    for (let idx = 0, len = indirectObjects.length; idx < len; idx++) {
      const indirectObject = indirectObjects[idx];
      const ref = indirectObject[0];
      const object = indirectObject[1];
      const shouldNotCompress =
        ref === this.context.trailerInfo.Encrypt ||
        object instanceof PDFStream ||
        object instanceof PDFInvalidObject ||
        ref.generationNumber !== 0;
      if (shouldNotCompress) {
        uncompressedObjects.push(indirectObject);
        xrefStream.addUncompressedEntry(ref, size);
        size += this.computeIndirectObjectSize(indirectObject);
      } else {
        let chunk = last(compressedObjects);
        let objectStreamRef = last(objectStreamRefs);
        if (!chunk || chunk.length % this.objectsPerStream === 0) {
          chunk = [];
          compressedObjects.push(chunk);
          objectStreamRef = PDFRef.of(objectNumber++);
          objectStreamRefs.push(objectStreamRef);
        }
        xrefStream.addCompressedEntry(ref, objectStreamRef, chunk.length);
        chunk.push(indirectObject);
      }
    }

    for (let idx = 0, len = compressedObjects.length; idx < len; idx++) {
      const chunk = compressedObjects[idx];
      const ref = objectStreamRefs[idx];
      const objectStream = PDFObjectStream.withContextAndObjects(this.context, chunk, this.encodeStreams);
      xrefStream.addUncompressedEntry(ref, size);
      size += this.computeIndirectObjectSize([ref, objectStream]);
      uncompressedObjects.push([ref, objectStream]);
    }

    const xrefStreamRef = PDFRef.of(objectNumber++);
    xrefStream.dict.set(SizeName, PDFNumber.of(objectNumber));
    xrefStream.addUncompressedEntry(xrefStreamRef, size);
    const xrefOffset = size;
    size += this.computeIndirectObjectSize([xrefStreamRef, xrefStream]);
    uncompressedObjects.push([xrefStreamRef, xrefStream]);

    const trailer = PDFTrailer.forLastCrossRefSectionOffset(xrefOffset);
    size += trailer.sizeInBytes();
    return { size, header, indirectObjects: uncompressedObjects, trailer };
  };

  PDFParser.prototype.__fastSyncLoadInstalled = true;
}
