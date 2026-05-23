// Drop-in async replacement for `pdfDoc.save({ useObjectStreams: true })`
// that parallelises the per-object-stream deflate work onto libuv's
// thread pool. Sole exported entry point: `parallelSave(pdfDoc, opts)`.
//
// Why: pdf-lib's PDFStreamWriter.computeBufferSize creates one
// PDFObjectStream per 50-object chunk, then immediately calls
// computeIndirectObjectSize on each. sizeInBytes() walks the Cache,
// which lazy-populates via pako.deflate(unencodedContents). The whole
// pass is synchronous, so ~1000 chunks × ~0.3 ms of zlib work runs
// serially -- accounts for ~30 % of save() wall time on the book.
//
// What: same construction logic as PDFStreamWriter, split into three
// phases:
//   1. classify uncompressed vs compressed (same as upstream)
//   2. instantiate every PDFObjectStream up-front, then `await
//      Promise.all` an async zlib.deflate per stream so libuv's thread
//      pool (default 4) runs them concurrently
//   3. size + emit (same as upstream, but every cache.access() is a hit)
// The xrefStream itself is one more PDFFlateStream; we deflate it
// serially in phase 3 since its contents depend on phase-3 offsets.
//
// Output: byte-near-equivalent to pdfDoc.save({ useObjectStreams: true }).
// zlib vs pako deflate may pick different LZ77 matches → 1-byte-level
// stream diffs and matching /Length deltas; viewer-invisible.
//
// Parallelism is bounded by UV_THREADPOOL_SIZE (default 4). Bump it via
// `process.env.UV_THREADPOOL_SIZE = '8'` before any libuv work fires
// if you want more concurrency.

import { deflate } from 'node:zlib';
import { promisify } from 'node:util';
import {
  PDFStreamWriter,
  PDFObjectStream,
  PDFCrossRefStream,
  PDFRef,
  PDFName,
  PDFNumber,
  PDFInvalidObject,
  PDFStream,
  PDFHeader,
  PDFTrailer,
} from 'pdf-lib';

const deflateAsync = promisify(deflate);

class ParallelStreamWriter extends PDFStreamWriter {
  constructor(context, objectsPerTick, encodeStreams, objectsPerStream, parallel) {
    super(context, objectsPerTick, encodeStreams, objectsPerStream);
    this._lastPrecompressed = 0;
    this._parallel = parallel;
  }

  async computeBufferSize() {
    let objectNumber = this.context.largestObjectNumber + 1;
    const header = PDFHeader.forVersion(1, 7);
    let size = header.sizeInBytes() + 2;
    const xrefStream = PDFCrossRefStream.create(
      this.createTrailerDict(),
      this.encodeStreams,
    );

    const uncompressedObjects = [];
    const compressedChunks = [];
    const objectStreamRefs = [];

    // ----- Phase 1: classify -----
    const indirectObjects = this.context.enumerateIndirectObjects();
    for (let i = 0; i < indirectObjects.length; i++) {
      const indirectObject = indirectObjects[i];
      const [ref, object] = indirectObject;
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
        let chunk = compressedChunks.length === 0 ? null : compressedChunks[compressedChunks.length - 1];
        let objectStreamRef = objectStreamRefs.length === 0 ? null : objectStreamRefs[objectStreamRefs.length - 1];
        if (!chunk || chunk.length % this.objectsPerStream === 0) {
          chunk = [];
          compressedChunks.push(chunk);
          objectStreamRef = PDFRef.of(objectNumber++);
          objectStreamRefs.push(objectStreamRef);
        }
        xrefStream.addCompressedEntry(ref, objectStreamRef, chunk.length);
        chunk.push(indirectObject);
      }
    }

    // ----- Phase 2: instantiate object streams and parallel-deflate -----
    const objectStreams = compressedChunks.map(chunk =>
      PDFObjectStream.withContextAndObjects(this.context, chunk, this.encodeStreams),
    );

    if (this._parallel && this.encodeStreams && objectStreams.length > 0) {
      const unencoded = objectStreams.map(os => os.getUnencodedContents());
      const deflated = await Promise.all(unencoded.map(buf => deflateAsync(buf)));
      for (let i = 0; i < objectStreams.length; i++) {
        objectStreams[i].contentsCache.value = deflated[i];
      }
      this._lastPrecompressed = objectStreams.length;
    } else {
      this._lastPrecompressed = 0;
    }

    // ----- Phase 3: size object streams (cache hits) -----
    for (let i = 0; i < objectStreams.length; i++) {
      const ref = objectStreamRefs[i];
      const objectStream = objectStreams[i];
      xrefStream.addUncompressedEntry(ref, size);
      size += this.computeIndirectObjectSize([ref, objectStream]);
      uncompressedObjects.push([ref, objectStream]);
    }

    // ----- xrefStream wrap-up (serial deflate; contents depend on offsets above) -----
    const xrefStreamRef = PDFRef.of(objectNumber++);
    xrefStream.dict.set(PDFName.of('Size'), PDFNumber.of(objectNumber));
    xrefStream.addUncompressedEntry(xrefStreamRef, size);
    const xrefOffset = size;
    size += this.computeIndirectObjectSize([xrefStreamRef, xrefStream]);
    uncompressedObjects.push([xrefStreamRef, xrefStream]);

    const trailer = PDFTrailer.forLastCrossRefSectionOffset(xrefOffset);
    size += trailer.sizeInBytes();

    return { size, header, indirectObjects: uncompressedObjects, trailer };
  }
}

/**
 * Replacement for `pdfDoc.save({ useObjectStreams: true })` with parallel
 * deflate. Mirrors PDFDocument.save's pre-serialize steps (addDefaultPage,
 * updateFieldAppearances, flush) before invoking the patched writer.
 *
 * Returns { bytes: Uint8Array, streamCount: number }.
 */
export async function parallelSave(pdfDoc, options = {}) {
  const {
    objectsPerTick = Infinity,
    addDefaultPage = true,
    updateFieldAppearances = true,
    objectsPerStream = 50,
    encodeStreams = true,
    parallel = true,
  } = options;

  if (addDefaultPage && pdfDoc.getPageCount() === 0) pdfDoc.addPage();
  if (updateFieldAppearances) {
    const form = pdfDoc.formCache.getValue();
    if (form) form.updateFieldAppearances();
  }
  await pdfDoc.flush();

  const writer = new ParallelStreamWriter(
    pdfDoc.context,
    objectsPerTick,
    encodeStreams,
    objectsPerStream,
    parallel,
  );
  const bytes = await writer.serializeToBuffer();
  return { bytes, streamCount: writer._lastPrecompressed };
}
