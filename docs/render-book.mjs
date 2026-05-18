// Render an HTML book to PDF via paged.js + headless Chromium + pdf-lib.
//
// Replaces the `npx pagedjs-cli ...` call in book.bat. Drives puppeteer
// directly so we have control over pdf-lib's parseSpeed (pagedjs-cli
// inherits the slow default and eats ~32 s of idle yielding per build
// on the 1638-page docs book -- see perf/README.md "Profiling pdf-lib's
// load" for the diagnosis).
//
// The flow mirrors pagedjs-cli/src/printer.js's render() + pdf() phases
// with the helpers (parseOutline, setOutline, setMetadata) copied
// verbatim into lib/. The paged.js bundle is vendored at
// lib/paged.browser.js.
//
// Usage:
//   node render-book.mjs <input.html> -o <output.pdf>
//                        [--outline-tags h1,h2,...] [-t <timeout-ms>]
//                        [--additional-script <path>]...
//
// Matches the pagedjs-cli CLI surface that book.bat used:
//   --outline-tags    : headings to include in the PDF outline.
//                       Defaults to h1,h2,h3,h4 if omitted.
//   -t / --timeout    : per-operation puppeteer timeout in ms. 0
//                       disables. Default 0 (we have no untrusted
//                       input; the 1638-page book takes ~100 s).
//   --additional-script
//                     : extra in-page script to inject after the
//                       paged.js bundle. Repeatable. Used by book.bat
//                       to inject ../perf/detach-pages.js.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, existsSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { PDFDocument, ParseSpeeds } from 'pdf-lib';
import { parseOutline, setOutline } from './lib/outline.mjs';
import { setMetadata }              from './lib/postprocesser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- arg parsing --------------------------------------------------------

const args = process.argv.slice(2);
let inputArg = null;
let outputArg = null;
let outlineTagsArg = 'h1,h2,h3,h4';
let timeoutMs = 0;
const additionalScripts = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-o' || a === '--output')              outputArg = args[++i];
  else if (a === '--outline-tags')                 outlineTagsArg = args[++i];
  else if (a === '-t' || a === '--timeout')        timeoutMs = parseInt(args[++i], 10);
  else if (a === '--additional-script')            additionalScripts.push(args[++i]);
  else if (!inputArg && !a.startsWith('-'))        inputArg = a;
  else {
    console.error(`unknown arg: ${a}`);
    process.exit(2);
  }
}
if (!inputArg || !outputArg) {
  console.error('usage: node render-book.mjs <input.html> -o <output.pdf> [--outline-tags ...] [-t ms] [--additional-script path]...');
  process.exit(2);
}

const inputPath  = resolve(process.cwd(), inputArg);
const outputPath = resolve(process.cwd(), outputArg);
const outlineTags = outlineTagsArg.split(',').map(s => s.trim()).filter(Boolean);

if (!existsSync(inputPath)) {
  console.error(`input not found: ${inputPath}`);
  process.exit(1);
}

const pagedScriptPath    = resolve(__dirname, 'lib', 'paged.browser.js');
const progressScriptPath = resolve(__dirname, 'lib', 'progress-handler.js');
for (const p of [pagedScriptPath, progressScriptPath]) {
  if (!existsSync(p)) {
    console.error(`required file not found: ${p}`);
    process.exit(1);
  }
}
for (const s of additionalScripts) {
  const p = resolve(process.cwd(), s);
  if (!existsSync(p)) {
    console.error(`additional script not found: ${p}`);
    process.exit(1);
  }
}

const t0 = Date.now();
const fmtMs = (ms) => (ms / 1000).toFixed(1) + 's';

// --- launch + render ---------------------------------------------------

const browser = await puppeteer.launch({
  headless: true,
  // --allow-file-access-from-files is critical: without it paged.js's
  // stylesheet fetch() rejects with ProgressEvent under file://. The
  // tagged-pdf and outline launch flags are added by puppeteer 22+
  // automatically in ChromeLauncher.defaultArgs(), so we don't repeat
  // them here.
  args: [
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
  ],
});

let exitCode = 0;
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('pageerror',     (err) => console.error('[page error]', err.message));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    console.error('[request failed]', req.url(), f && f.errorText);
  });

  // Live render progress. progress-handler.js emits one line per page;
  // we re-render that as an in-place `\r`-overwritten status on a TTY,
  // or every 100 pages on its own line when stdout is piped (CI, logs).
  // Cleared before the final `render: ...` summary is printed.
  const isTty = !!process.stdout.isTTY;
  let progressLineLen = 0;
  const clearProgress = () => {
    if (isTty && progressLineLen > 0) {
      process.stdout.write('\r' + ' '.repeat(progressLineLen) + '\r');
      progressLineLen = 0;
    }
  };
  page.on('console', (msg) => {
    const t = msg.text();
    if (!t.startsWith('[render-progress]')) return;
    const m = t.match(/page=(\d+)\s+elapsed=([\d.]+)/);
    if (!m) return;
    const line = `rendering: ${m[1]} pages (${m[2]}s)`;
    if (isTty) {
      process.stdout.write('\r' + line.padEnd(progressLineLen, ' '));
      progressLineLen = line.length;
    } else if (parseInt(m[1], 10) % 100 === 0) {
      process.stdout.write(line + '\n');
    }
  });

  await page.emulateMediaType('print');
  await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'load' });
  await page.evaluate(() => {
    window.PagedConfig = window.PagedConfig || {};
    window.PagedConfig.auto = false;
  });

  await page.addScriptTag({ path: pagedScriptPath });
  await page.addScriptTag({ path: progressScriptPath });
  for (const s of additionalScripts) {
    await page.addScriptTag({ path: resolve(process.cwd(), s) });
  }

  // Render -- paged.js per-page layout.
  const tRender = Date.now();
  await page.evaluate(async () => {
    if (!window.PagedPolyfill) {
      throw new Error('paged.js bundle did not expose window.PagedPolyfill');
    }
    try {
      await window.PagedPolyfill.preview();
    } catch (err) {
      // Unwrap the undecorated ProgressEvent paged.js throws on fetch
      // failures so the message includes the offending URL.
      const e = err && err.target
        ? new Error(`${err.type || 'event'} on ${err.target.tagName || '?'}: ${err.target.src || err.target.href || ''}`)
        : err;
      throw e;
    }
  });
  await page.waitForSelector('.pagedjs_pages');
  const pageCount = await page.evaluate(() => document.querySelectorAll('.pagedjs_pages > .pagedjs_page').length);
  clearProgress();
  console.log(`render:   ${fmtMs(Date.now() - tRender)}  (${pageCount} pages)`);

  // Generate -- meta extraction, outline walk, page.pdf().
  const tGenerate = Date.now();
  const meta = await page.evaluate(() => {
    const m = {};
    const t = document.querySelector('title');
    if (t) m.title = t.textContent.trim();
    const lang = document.querySelector('html').getAttribute('lang');
    if (lang) m.lang = lang;
    for (const tag of document.querySelectorAll('meta')) {
      if (tag.name) m[tag.name] = tag.content;
    }
    return m;
  });
  const outline = await parseOutline(page, outlineTags);
  const rawPdf = await page.pdf({
    printBackground:     true,
    displayHeaderFooter: false,
    preferCSSPageSize:   true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log(`generate: ${fmtMs(Date.now() - tGenerate)}  (raw ${(rawPdf.length / 1024 / 1024).toFixed(1)} MB)`);

  // Process -- pdf-lib roundtrip with outline + metadata attached.
  // parseSpeed: Fastest and objectsPerTick: Infinity are critical:
  // pdf-lib's defaults yield to the event loop between every 100/50
  // objects, turning a ~5 s round-trip into ~40 s on a 50 MB PDF
  // (~35 s of which is pure V8 idle). See perf/README.md.
  const tProcess = Date.now();
  const pdfDoc = await PDFDocument.load(rawPdf, { parseSpeed: ParseSpeeds.Fastest });
  setMetadata(pdfDoc, meta);
  await setOutline(pdfDoc, outline, false);
  const finalPdf = await pdfDoc.save({ objectsPerTick: Infinity });
  console.log(`process:  ${fmtMs(Date.now() - tProcess)}`);

  writeFileSync(outputPath, Buffer.from(finalPdf));
  console.log(`saved:    ${outputPath}  (${(finalPdf.length / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`total:    ${fmtMs(Date.now() - t0)}`);
} catch (err) {
  console.error('[render-book] error:', err);
  exitCode = 1;
} finally {
  await browser.close();
}
process.exit(exitCode);
