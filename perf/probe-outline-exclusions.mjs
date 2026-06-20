// Probe which per-element attributes / styles make Chrome's
// generateDocumentOutline skip a heading.
//
// Chrome's outline is built from the accessibility tree (puppeteer
// enforces tagged:true alongside outline:true for this reason). Anything
// that hides the element from a11y *should* exclude it. We test each
// theory by rendering a doc with labelled headings and checking which
// titles survive into the /Outlines tree.
//
// The labels in each <h*> are what we'll look for in the resulting
// outline -- they're unique per row, so if an entry is present we know
// which one it is.

import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { PDFDocument, PDFName, PDFRef, PDFDict, PDFArray, PDFString, PDFHexString, ParseSpeeds } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, 'results', 'outline-exclusions');
mkdirSync(outDir, { recursive: true });

// Each row has a unique label so we can detect inclusion/exclusion by
// title match. All headings are h3 except where noted -- normalises
// nesting and lets us see whether Chrome's depth-tracking changes when
// some headings are skipped (e.g. does it "see through" an excluded h3
// and treat the next sibling as the same level?).
const ROWS = [
  { label: 'A baseline plain h3',              html: '<h3>A baseline plain h3</h3>' },
  { label: 'B aria-hidden true on h3',         html: '<h3 aria-hidden="true">B aria-hidden true on h3</h3>' },
  { label: 'C role presentation on h3',        html: '<h3 role="presentation">C role presentation on h3</h3>' },
  { label: 'D role none on h3',                html: '<h3 role="none">D role none on h3</h3>' },
  { label: 'E h3 inside aria-hidden parent',   html: '<div aria-hidden="true"><h3>E h3 inside aria-hidden parent</h3></div>' },
  { label: 'F h3 with hidden attribute',       html: '<h3 hidden>F h3 with hidden attribute</h3>' },
  { label: 'G h3 with display none',           html: '<h3 style="display:none">G h3 with display none</h3>' },
  { label: 'H h3 with visibility hidden',      html: '<h3 style="visibility:hidden">H h3 with visibility hidden</h3>' },
  { label: 'I div role heading aria-level 3',  html: '<div role="heading" aria-level="3">I div role heading aria-level 3</div>' },
  { label: 'J h3 with bookmark-level none',    html: '<h3 style="bookmark-level:none">J h3 with bookmark-level none</h3>' },
  { label: 'K h3 inside hidden parent',        html: '<div hidden><h3>K h3 inside hidden parent</h3></div>' },
  { label: 'L h3 with role generic',           html: '<h3 role="generic">L h3 with role generic</h3>' },
  { label: 'M plain h3 trailing baseline',     html: '<h3>M plain h3 trailing baseline</h3>' },
];

const body = ROWS.map(r => `${r.html}<p>${r.label} body</p>`).join('\n');
const html = `<!doctype html><html lang="en"><head>
  <meta charset="utf-8">
  <title>Outline exclusion probe</title>
  <style>body{font-family:sans-serif} h3{page-break-before:always; margin-top:0}</style>
</head><body>${body}</body></html>`;

const browser = await puppeteer.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.emulateMediaType('print');
  await page.setContent(html);

  const pdf = await page.pdf({
    printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    outline: true, tagged: true,
  });
  writeFileSync(join(outDir, 'probe.pdf'), Buffer.from(pdf));
  console.log(`pdf: ${pdf.length} bytes`);

  // Collect what Chrome put in /Outlines.
  const doc = await PDFDocument.load(pdf, { updateMetadata: false, parseSpeed: ParseSpeeds.Fastest });
  const outlinesRef = doc.catalog.get(PDFName.of('Outlines'));
  const found = [];
  if (outlinesRef instanceof PDFRef) {
    const root = doc.context.lookup(outlinesRef, PDFDict);
    const walk = (firstRef, depth) => {
      let cur = firstRef;
      while (cur instanceof PDFRef) {
        const node = doc.context.lookup(cur, PDFDict);
        const titleObj = node.get(PDFName.of('Title'));
        const title = titleObj instanceof PDFHexString || titleObj instanceof PDFString
          ? titleObj.decodeText() : '?';
        found.push({ depth, title });
        const child = node.get(PDFName.of('First'));
        if (child instanceof PDFRef) walk(child, depth + 1);
        cur = node.get(PDFName.of('Next'));
      }
    };
    walk(root.get(PDFName.of('First')), 0);
  }

  // Report per-row: included or excluded.
  console.log('');
  console.log('row                                              included?  depth');
  console.log('--- --- --- --- --- --- --- --- --- --- --- --- ---');
  for (const r of ROWS) {
    const hit = found.find(f => f.title === r.label);
    const status = hit ? '   yes' : 'NO';
    const depth = hit ? `d=${hit.depth}` : '';
    console.log(`${r.label.padEnd(48)}  ${status}      ${depth}`);
  }
  console.log('');
  console.log(`total outline entries: ${found.length}`);
} finally {
  await browser.close();
}
