// Drop-in async replacement for `pdfDoc.save({ useObjectStreams: true })`
// that parallelises the per-object-stream deflate work onto libuv's
// thread pool. Sole exported entry point: `parallelSave(pdfDoc, opts)`.
//
// Why: pdf-lib's PDFStreamWriter.computeBufferSize creates one
// PDFObjectStream per chunk, then immediately calls
// computeIndirectObjectSize on each. sizeInBytes() walks the Cache,
// which lazy-populates via a deflate of the unencoded contents. The
// whole pass is synchronous, so the per-chunk zlib work runs serially
// -- accounted for ~30 % of save() wall time on the book before this.
//
// What: same construction logic as PDFStreamWriter, split into three
// phases:
//   1. classify uncompressed vs compressed (same as upstream)
//   2. instantiate every PDFObjectStream up-front, then `await
//      Promise.all` an async node:zlib.deflate per stream so libuv's
//      thread pool (default 4) runs them concurrently
//   3. size + emit (same as upstream, but every cache.access() is a hit)
// The xrefStream is one more PDFFlateStream whose contents depend on
// the offsets computed in phase 3; we pre-deflate it once via
// node:zlib.deflateSync right after those offsets are pinned, so even
// that final stream never falls back to pdf-lib's pure-JS deflate.
//
// Output: byte-near-equivalent to pdfDoc.save({ useObjectStreams: true }).
// node:zlib's match choices in the LZ77 inner loop may differ from
// pdf-lib's default deflate library, producing 1-byte-level stream
// content and matching /Length deltas; viewer-invisible.
//
// Parallelism is bounded by UV_THREADPOOL_SIZE (default 4). Bump it via
// `process.env.UV_THREADPOOL_SIZE = '8'` before any libuv work fires
// if you want more concurrency.

import { deflate, deflateSync } from 'node:zlib';
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
  constructor(context, encodeStreams, objectsPerStream, parallel) {
    // PDFWriter's second ctor param is objectsPerTick -- the yield knob
    // that drives shouldWaitForTick. fast-sync-load.mjs rips out every
    // caller of shouldWaitForTick on both the parser and writer sides,
    // so the value here is vestigial. Pass Infinity for explicitness.
    super(context, Infinity, encodeStreams, objectsPerStream);
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
      // Fire each deflate onto libuv as soon as its buffer is built,
      // so deflate of stream N runs concurrently with the build of
      // N+1..453 instead of after all 453 builds finish. Saves the
      // main-thread idle wait at the Promise.all (~30 ms on the book).
      const deflated = await Promise.all(
        objectStreams.map(os => deflateAsync(os.getUnencodedContents())),
      );
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

    // ----- xrefStream wrap-up -----
    // Its contents depend on the offsets computed above, so we can only
    // populate them now. One stream -- deflate sync via node:zlib and
    // pre-populate the cache so the subsequent computeIndirectObjectSize
    // is a cache hit (otherwise pdf-lib's lazy populate would run its
    // own deflate library on the main thread).
    const xrefStreamRef = PDFRef.of(objectNumber++);
    xrefStream.dict.set(PDFName.of('Size'), PDFNumber.of(objectNumber));
    xrefStream.addUncompressedEntry(xrefStreamRef, size);
    const xrefOffset = size;
    if (this.encodeStreams) {
      xrefStream.contentsCache.value = deflateSync(xrefStream.getUnencodedContents());
    }
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
    encodeStreams,
    objectsPerStream,
    parallel,
  );
  const bytes = await writer.serializeToBuffer();
  return { bytes, streamCount: writer._lastPrecompressed };
}
