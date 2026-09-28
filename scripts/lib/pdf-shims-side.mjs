// One side of check_pdf_shims_equiv.mjs: loads the fixture, changes it as
// book/render-book.mjs changes the book, and saves it, with the shims it is
// given and no others. Each side is a process of its own, because the onebuf
// shims allow one PDFContext per process and the stock side must load no shim.
//
//     node scripts/lib/pdf-shims-side.mjs <job as JSON>
//
// The job is { fixture, out, shims, parallel, coverage }: `shims` are absolute
// paths, imported in the order given; `parallel` saves through parallelSave, as
// the book does, and otherwise as stock pdf-lib's save would with the book's 500
// objects per stream; `coverage` records which of the shims ran a function
// during the load, change and save, their imports left out. The side writes the
// saved PDF to `out` and prints one JSON line, { streamCount, reached }.

import { readFileSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BOOK_LIB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "book", "lib");
const bookLib = (name) => pathToFileURL(path.join(BOOK_LIB, name)).href;

// A fixed date, so the Info dictionary is the same on both sides.
const WHEN = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));

// Two entries, the first closed: a closed entry's /Count is negative.
const OUTLINE = [
  {
    title: "First \u{00E9}ntry",
    destination: "sec-1",
    closed: true,
    children: [{ title: "Child (one)", destination: "sec-2", closed: false, children: [] }],
  },
  { title: "Second", destination: "sec-2", closed: false, children: [] },
];

const job = JSON.parse(process.argv[2]);

let session = null;
if (job.coverage) {
  session = new Session();
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: false });
}

const pdfLib = await import("pdf-lib");
const shims = [];
for (const file of job.shims) shims.push(await import(pathToFileURL(file).href));
const { measure } = await import(bookLib("measure-pass.mjs"));
const { setMetadata } = await import(bookLib("postprocesser.mjs"));
const { setOutline } = await import(bookLib("outline.mjs"));
const parallelSave = job.parallel ? (await import(bookLib("parallel-deflate.mjs"))).parallelSave : null;

// Taking the coverage resets its counts, so what the imports ran is not
// counted as reaching a shim.
if (session) await session.post("Profiler.takePreciseCoverage");

const { PDFDocument, PDFName, PDFNumber, PDFRef, PDFStreamWriter, PDFString, rgb } = pdfLib;
const raw = readFileSync(job.fixture);

// As render-book.mjs does: size the onebuf shims from a measure of the input.
const counts = measure(raw);
for (const shim of shims) {
  shim.setExpectedDictSlots?.(counts.dictSlots);
  shim.setExpectedArraySlots?.(counts.arraySlots);
}

const doc = await PDFDocument.load(raw);
setMetadata(doc, { title: "Fixture", subject: "check_pdf_shims_equiv", keywords: "one,two", creationDate: WHEN });
doc.setModificationDate(WHEN); // setMetadata stamps the time it runs
await setOutline(doc, OUTLINE, false);

// What the book's own change does not reach: a page drawn on, which
// normalizes its content streams; a page inserted and one removed, which edit
// /Kids; and dictionaries and an array parsed early, edited after the objects
// above were made.
const [first] = doc.getPages();
first.drawText("Drawn 0.5 over", { x: 72.25, y: 700.125, size: 11.5, color: rgb(0.25, 0.5, 0.75) });
doc.insertPage(1, [300.5, 400]);
doc.removePage(2);
const misc = doc.context.lookup(PDFRef.of(7));
misc.set(PDFName.of("Added"), PDFNumber.of(-0.001));
misc.set(PDFName.of("Int"), PDFString.of("replaced"));
misc.delete(PDFName.of("Nil"));
doc.context.lookup(PDFRef.of(12)).push(PDFNumber.of(1e-7));
doc.catalog.set(PDFName.of("Edited"), PDFNumber.of(2 ** 20));

let bytes;
let streamCount = null;
if (parallelSave) {
  ({ bytes, streamCount } = await parallelSave(doc, { objectsPerStream: 500 }));
} else {
  // Stock save() with object streams writes 50 objects to a stream, and the
  // book 500; these are save()'s own steps before it writes.
  if (doc.getPageCount() === 0) doc.addPage();
  doc.formCache.getValue()?.updateFieldAppearances();
  await doc.flush();
  bytes = await PDFStreamWriter.forContext(doc.context, Infinity, true, 500).serializeToBuffer();
}
writeFileSync(job.out, bytes);

let reached = null;
if (session) {
  const { result } = await session.post("Profiler.takePreciseCoverage");
  const ran = new Set(result.filter((s) => s.functions.some((f) => f.ranges[0].count > 0)).map((s) => s.url));
  reached = job.shims.filter((file) => ran.has(pathToFileURL(file).href));
  session.disconnect();
}
console.log(JSON.stringify({ streamCount, reached }));
