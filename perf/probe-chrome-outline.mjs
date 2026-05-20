// Test Chrome's built-in outline generation via Page.printToPDF's
// generateDocumentOutline parameter (Puppeteer's `outline: true`).
//
// Chrome walks the rendered DOM's <h1>...<h6> tree once and emits a
// /Outlines tree directly in the PDF. If this works for our content,
// we can drop the outline-injection step entirely -- no parseOutline,
// no setOutline, no incremental writer outline objects.
//
// Constraints (per the M122+ implementation):
//   - Requires --generate-pdf-document-outline launch flag (puppeteer
//     adds it for `outline: true`).
//   - Implicitly requires generateTaggedPDF (puppeteer sets it).
//   - Walks h1-h6 unconditionally; no per-tag opt-out like our
//     --outline-tags filter.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { PDFDocument, PDFName, PDFRef, PDFDict } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, 'results', 'chrome-outline');
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--disable-dev-shm-usage',
    '--export-tagged-pdf',
    '--generate-pdf-document-outline',
    '--allow-file-access-from-files',
  ],
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.emulateMediaType('print');

  // Multi-level outline structure to confirm Chrome handles nesting.
  const html = `<!doctype html><html lang="en"><head><title>Outline Probe</title></head>
    <body>
      <h1 id="chap-1" style="page-break-after:always">Chapter 1</h1>
      <h2 id="sec-1-1">Section 1.1</h2>
      <p>Body.</p>
      <h2 id="sec-1-2">Section 1.2</h2>
      <h3 id="sub-1-2-1">Subsection 1.2.1</h3>
      <h1 id="chap-2" style="page-break-before:always">Chapter 2</h1>
      <h2 id="sec-2-1">Section 2.1</h2>
      <h4 id="deep">Deep heading (h4)</h4>
      <h5 id="deeper">Deeper (h5 -- might still show)</h5>
      <h6 id="deepest">Deepest (h6 -- might still show)</h6>
    </body></html>`;
  await page.setContent(html);

  const pdf = await page.pdf({
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    outline: true,   // <-- the new flag (puppeteer 22.x+)
    tagged: true,    // implied by outline:true, but explicit for clarity
  });
  writeFileSync(join(outDir, 'probe.pdf'), Buffer.from(pdf));
  console.log(`pdf: ${pdf.length} bytes`);

  // Inspect the resulting outline. Walk the /Outlines tree depth-first
  // and print each title + dest at its level so we can see what Chrome
  // emitted.
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  const outlinesRef = doc.catalog.get(PDFName.of('Outlines'));
  if (!(outlinesRef instanceof PDFRef)) {
    console.log('no /Outlines in catalog -- Chrome did not emit one');
  } else {
    const root = doc.context.lookup(outlinesRef, PDFDict);
    const count = root.get(PDFName.of('Count'));
    console.log(`/Outlines Count = ${count.toString()}`);

    const walk = (firstRef, depth) => {
      let cur = firstRef;
      while (cur instanceof PDFRef) {
        const node = doc.context.lookup(cur, PDFDict);
        const title = node.get(PDFName.of('Title'))?.decodeText();
        const dest  = node.get(PDFName.of('Dest'))?.toString() ?? node.get(PDFName.of('A'))?.toString();
        console.log(`${'  '.repeat(depth)}- ${title}  ->  ${dest}`);
        const childFirst = node.get(PDFName.of('First'));
        if (childFirst instanceof PDFRef) walk(childFirst, depth + 1);
        cur = node.get(PDFName.of('Next'));
      }
    };
    walk(root.get(PDFName.of('First')), 0);
  }
} finally {
  await browser.close();
}
