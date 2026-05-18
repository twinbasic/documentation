// Apply outline + metadata to Chrome's PDF via an incremental update,
// without round-tripping the whole 52 MB body through pdf-lib.
//
// The PDF spec (7.5.6) lets us append:
//
//   <original bytes, untouched>
//   <new indirect objects for the outline tree>
//   <updated Catalog (adds /Outlines)>
//   <updated Info (overrides title / creator / dates / ...)>
//   xref
//     <subsections covering only the new + updated refs>
//   trailer
//     <</Size N /Root <orig> /Info <orig> /Prev <orig-startxref>>>
//   startxref <new-xref-offset>
//   %%EOF
//
// Readers chain backward via /Prev to the original xref to resolve any
// ref we didn't touch (pages, fonts, images, /Dests, ...). The original
// 52 MB stays byte-identical -- we just append a few KB.
//
// We use pdf-lib's primitives where they help (PDFParser to read just the
// xref + trailer + a couple of objects, PDFContext + PDFDict for object
// construction, PDFCrossRefSection for emitting the new xref) but never
// call PDFDocument.load -- that's the slow path we're eliminating.

import {
  PDFParser,
  PDFDict, PDFName, PDFNumber, PDFString, PDFHexString, PDFRef,
  PDFCrossRefSection, PDFTrailerDict,
} from 'pdf-lib';
import { decode as htmlEntitiesDecode } from 'html-entities';

// --- outline construction (mirrors pagedjs-cli/src/outline.js setOutline,
// but writes into a caller-supplied context and returns the outline-root
// ref instead of mutating a pdfDoc.catalog) -----------------------------

const SANITIZE_XML_RX = /<[^>]+>/g;
function sanitizeOutlineTitle(s) {
  if (s.includes('<')) s = s.replace(SANITIZE_XML_RX, '');
  return htmlEntitiesDecode(s);
}

function setRefsForOutlineItems(layer, context, parentRef) {
  for (const item of layer) {
    item.ref = context.nextRef();
    item.parentRef = parentRef;
    setRefsForOutlineItems(item.children, context, item.ref);
  }
}

function countChildrenOfOutline(layer) {
  let n = 0;
  for (const item of layer) {
    n += 1;
    n += countChildrenOfOutline(item.children);
  }
  return n;
}

function buildPdfObjectsForOutline(layer, context) {
  for (let i = 0; i < layer.length; i++) {
    const item = layer[i];
    const prev = layer[i - 1];
    const next = layer[i + 1];
    const entries = new Map([
      [PDFName.of('Title'),  PDFHexString.fromText(sanitizeOutlineTitle(item.title))],
      [PDFName.of('Dest'),   PDFName.of(item.destination)],
      [PDFName.of('Parent'), item.parentRef],
    ]);
    if (prev) entries.set(PDFName.of('Prev'), prev.ref);
    if (next) entries.set(PDFName.of('Next'), next.ref);
    if (item.children.length) {
      entries.set(PDFName.of('First'), item.children[0].ref);
      entries.set(PDFName.of('Last'),  item.children[item.children.length - 1].ref);
      entries.set(PDFName.of('Count'), PDFNumber.of(countChildrenOfOutline(item.children)));
    }
    context.assign(item.ref, PDFDict.fromMapWithContext(entries, context));
    buildPdfObjectsForOutline(item.children, context);
  }
}

function buildOutline(context, outline) {
  if (outline.length === 0) return null;
  const outlineRef = context.nextRef();
  setRefsForOutlineItems(outline, context, outlineRef);
  buildPdfObjectsForOutline(outline, context);
  const rootDict = PDFDict.fromMapWithContext(new Map([
    [PDFName.of('First'), outline[0].ref],
    [PDFName.of('Last'),  outline[outline.length - 1].ref],
    [PDFName.of('Count'), PDFNumber.of(countChildrenOfOutline(outline))],
  ]), context);
  context.assign(outlineRef, rootDict);
  return outlineRef;
}

// --- metadata merge (mirrors pagedjs-cli/src/postprocesser.js setMetadata,
// but writes into a parsed Info dict instead of via PDFDocument.setX) ---

function applyMetadataToInfo(infoDict, meta) {
  let { creator, producer, creationDate } = meta;

  let keywords = meta.keywords;
  if (typeof keywords === 'string') keywords = keywords.split(',');
  if (!keywords) keywords = [];

  // Match the existing harness behaviour: always overwrite ModDate, default
  // CreationDate to now if missing, and append " + Paged.js" to whatever
  // creator Chrome wrote.
  if (!(creationDate instanceof Date)) creationDate = new Date();
  const modDate = new Date();

  // Read existing Creator/Producer directly from the dict. Chrome writes
  // them as direct (non-indirect) strings, so we don't need to dereference;
  // skipping the lookup also avoids depending on a fully-loaded context.
  const decodeIfString = (v) =>
    (v instanceof PDFString || v instanceof PDFHexString) ? v.decodeText() : null;
  if (!creator) {
    const existing = decodeIfString(infoDict.get(PDFName.of('Creator')));
    creator = (existing ?? '') + ' + Paged.js';
  }
  if (!producer) {
    producer = decodeIfString(infoDict.get(PDFName.of('Producer'))) ?? undefined;
  }

  if (meta.title)       infoDict.set(PDFName.of('Title'),    PDFHexString.fromText(meta.title));
  if (meta.subject)     infoDict.set(PDFName.of('Subject'),  PDFHexString.fromText(meta.subject));
  if (keywords.length)  infoDict.set(PDFName.of('Keywords'), PDFHexString.fromText(keywords.join(' ')));
  if (meta.author)      infoDict.set(PDFName.of('Author'),   PDFHexString.fromText(meta.author));
  if (creator)          infoDict.set(PDFName.of('Creator'),  PDFHexString.fromText(creator));
  if (producer)         infoDict.set(PDFName.of('Producer'), PDFHexString.fromText(producer));
  infoDict.set(PDFName.of('CreationDate'), PDFString.fromDate(creationDate));
  infoDict.set(PDFName.of('ModDate'),      PDFString.fromDate(modDate));
}

// --- raw byte parsing for trailer location ------------------------------

function lastIndexOfSeq(buf, needle, fromEnd) {
  // Search backwards from buf.length-1 for `needle` within the last
  // `fromEnd` bytes. Returns -1 if not found.
  const start = Math.max(0, buf.length - fromEnd);
  for (let i = buf.length - needle.length; i >= start; i--) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (buf[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

function findStartxrefOffset(buf) {
  // The trailer area is conventionally in the last <1KB. Compliant PDFs
  // have `%%EOF` at end; tolerate up to 2KB of trailing junk just in case.
  const SEARCH = 2048;
  const EOF = Buffer.from('%%EOF');
  const SXR = Buffer.from('startxref');
  const eofIdx = lastIndexOfSeq(buf, EOF, SEARCH);
  if (eofIdx < 0) throw new Error('incremental-pdf: no %%EOF in trailing 2KB');
  const sxrIdx = lastIndexOfSeq(buf.subarray(0, eofIdx), SXR, 128);
  if (sxrIdx < 0) throw new Error('incremental-pdf: no startxref keyword before %%EOF');
  const between = buf.subarray(sxrIdx + SXR.length, eofIdx).toString('binary').trim();
  const m = between.match(/^(\d+)/);
  if (!m) throw new Error('incremental-pdf: could not parse startxref offset');
  return { xrefOffset: parseInt(m[1], 10), startxrefKeywordOffset: sxrIdx };
}

// --- main entry point ---------------------------------------------------

export async function applyOutlineAndMetadataIncremental(rawPdf, outline, meta) {
  // page.pdf() can return either a Buffer or a Uint8Array depending on
  // puppeteer version. Buffer is a subclass of Uint8Array, so the
  // wrapping is cheap when it's already a Buffer.
  const buf = Buffer.isBuffer(rawPdf) ? rawPdf : Buffer.from(rawPdf);

  // 1. Find the original xref offset.
  const { xrefOffset: oldXrefOffset } = findStartxrefOffset(buf);

  // 2. Parse just the xref + trailer dict using PDFParser positioned at
  // the xref. parseHeader() advances bytes past the %PDF-1.x line so
  // that subsequent moveTo() calls work in absolute file offsets.
  const parser = PDFParser.forBytesWithOptions(buf);
  parser.parseHeader();
  parser.bytes.moveTo(oldXrefOffset);
  const xrefSection = parser.maybeParseCrossRefSection();
  if (!xrefSection) {
    throw new Error('incremental-pdf: classic xref table not found at startxref offset. ' +
      'Chrome\'s PDFs use classic tables; an xref stream here means the input is ' +
      'not from Chrome and is not supported by this writer.');
  }
  // maybeParseTrailerDict() throws away /Size and discards the dict
  // (it only saves Root/Info/Encrypt/ID onto context.trailerInfo). We
  // need /Size too, so consume `trailer` by hand and call parseDict()
  // directly. matchKeyword takes a byte sequence and rolls back on
  // mismatch, so the error path leaves the cursor where the dict would
  // have started -- handy for the message.
  parser.skipWhitespaceAndComments();
  if (!parser.matchKeyword(Buffer.from('trailer'))) {
    throw new Error(`incremental-pdf: expected 'trailer' keyword after xref at ${oldXrefOffset}`);
  }
  parser.skipWhitespaceAndComments();
  const trailerDict = parser.parseDict();
  const rootRef = trailerDict.get(PDFName.of('Root'));
  const infoRef = trailerDict.get(PDFName.of('Info'));
  const sizeNum = trailerDict.get(PDFName.of('Size'));
  if (!(rootRef instanceof PDFRef)) throw new Error('incremental-pdf: trailer /Root is not a ref');
  if (!(infoRef instanceof PDFRef)) throw new Error('incremental-pdf: trailer /Info is not a ref (Chrome should always emit one)');
  if (!(sizeNum instanceof PDFNumber)) throw new Error('incremental-pdf: trailer /Size is not a number');
  const oldSize = sizeNum.asNumber();

  // 3. Find the byte offsets of Catalog and Info in the xref.
  const findOffset = (ref) => {
    for (const sub of xrefSection.subsections) {
      for (const entry of sub) {
        if (!entry.deleted &&
            entry.ref.objectNumber === ref.objectNumber &&
            entry.ref.generationNumber === ref.generationNumber) {
          return entry.offset;
        }
      }
    }
    return -1;
  };
  const catalogOffset = findOffset(rootRef);
  const infoOffset    = findOffset(infoRef);
  if (catalogOffset < 0) throw new Error(`incremental-pdf: catalog ref ${rootRef.toString()} not in xref`);
  if (infoOffset    < 0) throw new Error(`incremental-pdf: info ref ${infoRef.toString()} not in xref`);

  // 4. Parse just those two indirect objects into a fresh writing context.
  // The parser will set context.indirectObjects[ref] for each.
  const writingContext = parser.context; // already populated by parseHeader; reuse.
  parser.bytes.moveTo(catalogOffset);
  await parser.parseIndirectObject();
  parser.bytes.moveTo(infoOffset);
  await parser.parseIndirectObject();

  const catalogDict = writingContext.lookup(rootRef);
  const infoDict    = writingContext.lookup(infoRef);
  if (!(catalogDict instanceof PDFDict)) throw new Error('incremental-pdf: parsed catalog is not a dict');
  if (!(infoDict    instanceof PDFDict)) throw new Error('incremental-pdf: parsed info is not a dict');

  // 5. Allocate refs for new outline objects starting at oldSize. The
  // parser bumped largestObjectNumber while assigning Catalog/Info; reset
  // it so nextRef() returns PDFRef.of(oldSize, 0) first.
  writingContext.largestObjectNumber = oldSize - 1;
  const outlineRootRef = buildOutline(writingContext, outline);

  // 6. Update Catalog + Info in place. Both are now in writingContext,
  // keyed by their original refs; serialize() will emit them with those
  // refs, overriding the original objects via xref offset.
  if (outlineRootRef) catalogDict.set(PDFName.of('Outlines'), outlineRootRef);
  if (meta.lang)      catalogDict.set(PDFName.of('Lang'), PDFString.of(meta.lang));
  applyMetadataToInfo(infoDict, meta);

  // 7. Serialize each indirect object in ascending object-number order,
  // recording absolute byte offsets so we can build the new xref.
  const chunks = [buf];
  let offset = buf.length;
  // Per PDF 1.7 §7.5.6, an incremental update must begin on a new line.
  // Most %%EOF lines end with newline already; if not, add one.
  if (buf[buf.length - 1] !== 0x0A) {
    const nl = Buffer.from('\n');
    chunks.push(nl);
    offset += nl.length;
  }

  const xrefEntries = [];
  for (const [ref, obj] of writingContext.enumerateIndirectObjects()) {
    const header = Buffer.from(`${ref.objectNumber} ${ref.generationNumber} obj\n`);
    const body   = Buffer.alloc(obj.sizeInBytes());
    obj.copyBytesInto(body, 0);
    const tail   = Buffer.from('\nendobj\n');
    xrefEntries.push({ ref, offset });
    chunks.push(header, body, tail);
    offset += header.length + body.length + tail.length;
  }

  // 8. New xref section. PDFCrossRefSection.addEntry auto-groups
  // contiguous ascending object numbers into subsections. The subsection
  // covering object 0 -- the mandatory "0 65535 f" free entry -- already
  // exists in the *original* xref, which readers reach via /Prev. We do
  // not repeat it here.
  const newXrefOffset = offset;
  const xref = PDFCrossRefSection.createEmpty();
  for (const { ref, offset: off } of xrefEntries) {
    xref.addEntry(ref, off);
  }
  const xrefBuf = Buffer.alloc(xref.sizeInBytes());
  xref.copyBytesInto(xrefBuf, 0);
  chunks.push(xrefBuf, Buffer.from('\n'));

  // 9. New trailer dict. /Size must cover the highest object number we
  // emitted; that's writingContext.largestObjectNumber + 1. /Prev points
  // at the original xref so readers chain back through it. Preserve /ID
  // from the original trailer when present -- Acrobat warns on its absence
  // and some readers use it as a file fingerprint.
  const trailerSpec = {
    Size: writingContext.largestObjectNumber + 1,
    Root: rootRef,
    Info: infoRef,
    Prev: oldXrefOffset,
  };
  const oldId = trailerDict.get(PDFName.of('ID'));
  if (oldId) trailerSpec.ID = oldId;
  const newTrailerDict = writingContext.obj(trailerSpec);
  const trailerWrapper = PDFTrailerDict.of(newTrailerDict);
  const trailerBuf = Buffer.alloc(trailerWrapper.sizeInBytes());
  trailerWrapper.copyBytesInto(trailerBuf, 0);
  chunks.push(trailerBuf, Buffer.from('\n'));

  // 10. startxref + %%EOF
  chunks.push(Buffer.from(`startxref\n${newXrefOffset}\n%%EOF\n`));

  const out = Buffer.concat(chunks);
  return {
    bytes: out,
    stats: {
      originalBytes:  buf.length,
      appendedBytes:  out.length - buf.length,
      newObjectCount: xrefEntries.length,
      newXrefOffset,
      oldXrefOffset,
      oldSize,
      newSize: writingContext.largestObjectNumber + 1,
    },
  };
}
