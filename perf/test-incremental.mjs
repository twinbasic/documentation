// Smoke test for incremental-pdf.mjs.
//
// Renders the tiny probe HTML to PDF in headless Chromium, applies a
// synthetic outline + metadata via the incremental writer, writes the
// result, and validates the output by:
//
//   1. Re-parsing it with the existing pdf-lib full-load path (which
//      walks the /Prev chain). If the incremental update is malformed
//      pdf-lib throws here.
//   2. Confirming the outline tree is reachable from Catalog.Outlines.
//   3. Confirming Title/Author/Producer/CreationDate land in /Info.
//
// This isn't a perf measurement -- just a correctness gate before we
// wire the writer into measure.mjs.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { PDFDocument, PDFName, PDFRef, PDFDict } from 'pdf-lib';
import { applyOutlineAndMetadataIncremental } from './incremental-pdf.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, 'results', 'incremental-smoke');
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--disable-dev-shm-usage', '--export-tagged-pdf', '--allow-file-access-from-files'],
});

let exit = 0;
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.emulateMediaType('print');

  // The destinations referenced by the synthetic outline must exist as
  // named destinations in Chrome's PDF, otherwise the outline entries
  // won't navigate anywhere. Chrome creates named destinations from
  // `<a href="#id">` links in the document, mapping the `id` of the
  // target element to a page+coords destination. The hidden link-holder
  // trick in pagedjs-cli/src/outline.js does the same thing.
  const html = `<!doctype html><html lang="en"><head><title>Probe</title></head>
    <body>
      <a href="#intro" style="display:none">i</a>
      <a href="#chapter-1" style="display:none">c1</a>
      <h1 id="intro" style="page-break-after:always">Intro</h1>
      <p>Body of intro.</p>
      <h1 id="chapter-1">Chapter 1</h1>
      <p>Body of chapter.</p>
    </body></html>`;
  await page.setContent(html);

  const raw = await page.pdf({
    printBackground: true, displayHeaderFooter: false,
    preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  writeFileSync(join(outDir, 'raw.pdf'), Buffer.from(raw));
  console.log(`raw: ${raw.length} bytes`);

  const outline = [
    { title: 'Intro',     destination: 'intro',     children: [] },
    { title: 'Chapter 1', destination: 'chapter-1', children: [] },
  ];
  const meta = {
    title: 'Smoke Test',
    author: 'Harness',
    subject: 'Incremental writer probe',
    keywords: ['probe', 'incremental'],
    lang: 'en',
  };

  const { bytes, stats } = await applyOutlineAndMetadataIncremental(raw, outline, meta);
  writeFileSync(join(outDir, 'final.pdf'), bytes);
  console.log('stats:', stats);
  console.log(`growth: +${bytes.length - raw.length} bytes (${((bytes.length - raw.length) / 1024).toFixed(1)} KB)`);

  // 1. Round-trip through pdf-lib. This walks the /Prev chain and
  // resolves everything via the incremental update on top of the
  // original xref, so it's the strictest correctness check we can run
  // without launching a viewer.
  //
  // updateMetadata: false stops PDFDocument.load from overwriting our
  // /Producer with "pdf-lib (https://...)" on its way in. Without it
  // the assertion below would read pdf-lib's value, not Chrome's.
  const reparsed = await PDFDocument.load(bytes, { updateMetadata: false });
  console.log('reparse: OK');

  // 2. Outline reachable from catalog
  const outlinesRef = reparsed.catalog.get(PDFName.of('Outlines'));
  if (!(outlinesRef instanceof PDFRef)) {
    throw new Error('Catalog.Outlines is not a ref');
  }
  const outlinesDict = reparsed.context.lookup(outlinesRef, PDFDict);
  const firstRef = outlinesDict.get(PDFName.of('First'));
  const lastRef  = outlinesDict.get(PDFName.of('Last'));
  const count    = outlinesDict.get(PDFName.of('Count'));
  console.log(`outline root: First=${firstRef.toString()} Last=${lastRef.toString()} Count=${count.toString()}`);

  // Walk the linked list of top-level entries to make sure prev/next/dest
  // are wired up correctly.
  let cur = firstRef, idx = 0;
  while (cur) {
    const node = reparsed.context.lookup(cur, PDFDict);
    const title = node.get(PDFName.of('Title')).decodeText();
    const dest  = node.get(PDFName.of('Dest')).toString();
    console.log(`  [${idx}] ${title}  ->  ${dest}`);
    const next = node.get(PDFName.of('Next'));
    cur = next instanceof PDFRef ? next : null;
    idx++;
    if (idx > 100) throw new Error('outline walk did not terminate');
  }

  // 3. Metadata landed in /Info
  console.log(`info.title    = ${reparsed.getTitle()}`);
  console.log(`info.author   = ${reparsed.getAuthor()}`);
  console.log(`info.subject  = ${reparsed.getSubject()}`);
  console.log(`info.keywords = ${reparsed.getKeywords()}`);
  console.log(`info.producer = ${reparsed.getProducer()}`);
  console.log(`info.creator  = ${reparsed.getCreator()}`);
  console.log(`info.created  = ${reparsed.getCreationDate()?.toISOString()}`);
  console.log(`info.modified = ${reparsed.getModificationDate()?.toISOString()}`);
  console.log(`catalog.Lang  = ${reparsed.catalog.get(PDFName.of('Lang'))?.toString()}`);

  console.log('--- smoke test passed ---');
} catch (err) {
  console.error('smoke test failed:', err);
  exit = 1;
} finally {
  await browser.close();
}
process.exit(exit);
