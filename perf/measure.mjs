// Per-page timing harness for the paged.js PDF render.
//
// Mirrors pagedjs-cli's full Printer.pdf() pipeline -- launch flags,
// media emulation, paged.js bundle, page.pdf() settings, and pdf-lib
// post-processing (outline + metadata via the same helpers pagedjs-cli
// uses) -- so phase numbers map directly onto book.bat's behaviour.
//
// Three phases are reported, matching the spinners in pagedjs-cli/cli.js:
//
//   render    page.evaluate(PagedPolyfill.preview()) -- per-page paged.js
//             layout. Per-page detail is recorded by timing-handler.js
//             on window.__pagedTiming.
//   generate  meta extraction + outline DOM walk + page.pdf().
//             page.pdf() (Chromium serializing the laid-out DOM into
//             PDF bytes) typically dominates.
//   process   PDFDocument.load + setMetadata + setOutline + save.
//
// Usage:
//   node measure.mjs [path/to/book.html] [--out <dir>] [--keep-open]
//                    [--cpu-profile] [--cpu-sampling <microseconds>]
//                    [--detach-pages]
//
// --detach-pages also injects detach-pages.js -- a Paged.Handler that
// hides each completed page from the layout tree -- to test whether
// the O(n^2) render hotspot disappears.
//
// Defaults:
//   input  : ../docs/_site-pdf/book.html (relative to this file)
//   output : perf/results/<ISO timestamp>/
//
// --cpu-profile wraps the render phase only (preview() through the
// .pagedjs_pages selector) in a V8 Profiler trace and writes it to
// render.cpuprofile in the results folder. Open it in Chrome DevTools
// via Performance -> "Load profile..." (or just drag onto the panel).
// --cpu-sampling sets the sampling interval in microseconds; default
// 1000 (1 ms). Raise it to keep the profile file smaller on long runs.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
// Deep-import the same outline + post-process helpers pagedjs-cli runs in
// its own pdf() pipeline. Going via a relative path bypasses the package's
// "exports" field, which only re-exports the Printer class.
import { parseOutline, setOutline } from './node_modules/pagedjs-cli/src/outline.js';
import { setMetadata }              from './node_modules/pagedjs-cli/src/postprocesser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let inputArg = null;
let outArg = null;
let keepOpen = false;
let cpuProfile = false;
let cpuSampling = 1000; // microseconds
let detachPages = false;
let instrument = false;
let timeHooks = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') outArg = args[++i];
  else if (a === '--keep-open') keepOpen = true;
  else if (a === '--cpu-profile') cpuProfile = true;
  else if (a === '--cpu-sampling') cpuSampling = parseInt(args[++i], 10);
  else if (a === '--detach-pages') detachPages = true;
  else if (a === '--instrument') instrument = true;
  else if (a === '--time-hooks') timeHooks = true;
  else if (!inputArg) inputArg = a;
  else { console.error(`unknown arg: ${a}`); process.exit(2); }
}

const inputPath = inputArg
  ? resolve(process.cwd(), inputArg)
  : resolve(__dirname, '..', 'docs', '_site-pdf', 'book.html');

if (!existsSync(inputPath)) {
  console.error(`book HTML not found: ${inputPath}`);
  console.error('Build it first with docs/build.bat.');
  process.exit(1);
}

const pagedScriptPath  = resolve(__dirname, 'node_modules', 'pagedjs-cli', 'dist', 'browser.js');
const handlerPath      = resolve(__dirname, 'timing-handler.js');
const detachPagesPath  = resolve(__dirname, 'detach-pages.js');
const instrumentPath   = resolve(__dirname, 'instrument-flush-ops.js');
const timeHooksPath    = resolve(__dirname, 'time-hooks.js');
const required = [pagedScriptPath, handlerPath];
if (detachPages) required.push(detachPagesPath);
if (instrument)  required.push(instrumentPath);
if (timeHooks)   required.push(timeHooksPath);
for (const p of required) {
  if (!existsSync(p)) {
    console.error(`missing required file: ${p}`);
    console.error('Run "npm install" inside perf/ first.');
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = outArg
  ? resolve(process.cwd(), outArg)
  : resolve(__dirname, 'results', stamp);
mkdirSync(outDir, { recursive: true });

const outlineTags = ['h1', 'h2', 'h3', 'h4']; // matches docs/book.bat

const fmtMs = (ms) => (ms / 1000).toFixed(2) + 's';

console.log(`[harness] input : ${inputPath}`);
console.log(`[harness] output: ${outDir}`);

const browser = await puppeteer.launch({
  headless: true,
  // Match pagedjs-cli's launch args (printer.js). --allow-file-access-from-files
  // is critical: without it paged.js's stylesheet fetch() rejects with
  // ProgressEvent under file://. pagedjs-cli sets it via cli.js:67.
  args: [
    '--disable-dev-shm-usage',
    '--export-tagged-pdf',
    '--allow-file-access-from-files',
    '--enable-precise-memory-info',
  ],
});

let exitCode = 0;
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);

  page.on('console', (msg) => {
    const t = msg.text();
    if (t.startsWith('[paged-timing]') || t.startsWith('[detach-pages]') ||
        t.startsWith('[instrument]') || t.startsWith('  ')) {
      console.log(t);
    }
  });
  page.on('pageerror',     (err) => console.error('[page error]', err.message));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    console.error('[request failed]', req.url(), f && f.errorText);
  });

  await page.emulateMediaType('print');

  const url = pathToFileURL(inputPath).href;
  const navStart = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  console.log(`[harness] page loaded in ${Date.now() - navStart}ms`);

  await page.evaluate(() => {
    window.PagedConfig = window.PagedConfig || {};
    window.PagedConfig.auto = false;
  });

  await page.addScriptTag({ path: pagedScriptPath });
  await page.addScriptTag({ path: handlerPath });
  if (detachPages) {
    await page.addScriptTag({ path: detachPagesPath });
  }
  if (instrument) {
    await page.addScriptTag({ path: instrumentPath });
  }
  if (timeHooks) {
    await page.addScriptTag({ path: timeHooksPath });
  }

  // RENDER ----------------------------------------------------------
  // Optionally wrap just this phase in a V8 CPU profile. CDP Profiler
  // attaches to the renderer for this page; we stop before the generate
  // phase so the trace stays focused on paged.js layout work.
  let cdp = null;
  if (cpuProfile) {
    cdp = await page.createCDPSession();
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: cpuSampling });
    await cdp.send('Profiler.start');
    console.log(`[harness] cpu profile: sampling every ${cpuSampling}us`);
  }

  const tRenderStart = Date.now();
  await page.evaluate(async () => {
    if (!window.PagedPolyfill) {
      throw new Error('paged.js bundle did not expose window.PagedPolyfill');
    }
    try {
      await window.PagedPolyfill.preview();
    } catch (err) {
      const e = err && err.target
        ? new Error(`${err.type || 'event'} on ${err.target.tagName || '?'}: ${err.target.src || err.target.href || ''}`)
        : err;
      throw e;
    }
  });
  await page.waitForSelector('.pagedjs_pages');
  const tRenderEnd = Date.now();
  const renderMs = tRenderEnd - tRenderStart;

  let profilePath = null;
  if (cdp) {
    const { profile } = await cdp.send('Profiler.stop');
    await cdp.detach();
    profilePath = join(outDir, 'render.cpuprofile');
    const profileJson = JSON.stringify(profile);
    writeFileSync(profilePath, profileJson);
    console.log(`[harness] cpu profile: ${profilePath} (${(profileJson.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log(`[harness] render   ${fmtMs(renderMs)}`);

  // GENERATE --------------------------------------------------------
  // meta extraction + outline DOM walk + Chromium DOM->PDF.
  const tGenStart = Date.now();

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

  const tParseOutlineStart = Date.now();
  const outline = await parseOutline(page, outlineTags);
  const parseOutlineMs = Date.now() - tParseOutlineStart;

  const tPdfStart = Date.now();
  const rawPdf = await page.pdf({
    printBackground:     true,
    displayHeaderFooter: false,
    preferCSSPageSize:   true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const pdfMs = Date.now() - tPdfStart;

  const tGenEnd = Date.now();
  const generateMs = tGenEnd - tGenStart;
  console.log(`[harness] generate ${fmtMs(generateMs)}  (parseOutline=${fmtMs(parseOutlineMs)}, page.pdf=${fmtMs(pdfMs)}, ${(rawPdf.length / 1024 / 1024).toFixed(1)}MB)`);

  // PROCESS ---------------------------------------------------------
  // pdf-lib roundtrip: parse Chromium's PDF, attach outline + metadata,
  // re-serialise. setTrimBoxes is omitted -- our pages have no bleed,
  // and capturing the page-array from in-browser would need extra wiring
  // for what is essentially a no-op here.
  const tProcStart = Date.now();

  const tLoadStart = Date.now();
  const pdfDoc = await PDFDocument.load(rawPdf);
  const loadMs = Date.now() - tLoadStart;

  setMetadata(pdfDoc, meta);

  const tSetOutlineStart = Date.now();
  setOutline(pdfDoc, outline, false);
  const setOutlineMs = Date.now() - tSetOutlineStart;

  const tSaveStart = Date.now();
  const finalPdf = await pdfDoc.save();
  const saveMs = Date.now() - tSaveStart;

  const tProcEnd = Date.now();
  const processMs = tProcEnd - tProcStart;
  console.log(`[harness] process  ${fmtMs(processMs)}  (load=${fmtMs(loadMs)}, setOutline=${fmtMs(setOutlineMs)}, save=${fmtMs(saveMs)})`);

  const totalMs = tProcEnd - tRenderStart;
  console.log(`[harness] total    ${fmtMs(totalMs)}`);

  // Persist results -------------------------------------------------
  const timing = await page.evaluate(() => window.__pagedTiming);
  const pdfPath = join(outDir, 'book.pdf');
  writeFileSync(pdfPath, Buffer.from(finalPdf));

  const record = {
    input: inputPath,
    pageCount: timing.pageCount,
    pdfBytes: finalPdf.length,
    cpuProfile: profilePath,
    phases: {
      render: {
        ms: renderMs,
        perPage: timing.pages,
        phaseMarks: timing.phases,
      },
      generate: {
        ms: generateMs,
        parseOutlineMs,
        pagePdfMs: pdfMs,
        rawPdfBytes: rawPdf.length,
      },
      process: {
        ms: processMs,
        loadMs,
        setOutlineMs,
        saveMs,
      },
    },
    totalMs,
  };
  writeFileSync(join(outDir, 'timing.json'), JSON.stringify(record, null, 2));

  const csv = ['page,dur_ms,heap_start_mb,heap_end_mb,elapsed_s'];
  for (const p of timing.pages) {
    csv.push([
      p.idx,
      p.dur.toFixed(2),
      (p.heapStart / 1024 / 1024).toFixed(2),
      (p.heapEnd   / 1024 / 1024).toFixed(2),
      (p.elapsed   / 1000).toFixed(3),
    ].join(','));
  }
  writeFileSync(join(outDir, 'timing.csv'), csv.join('\n'));

  const pages = timing.pages;
  const summary = [];
  summary.push(`input        : ${inputPath}`);
  summary.push(`pages        : ${pages.length}`);
  summary.push(`pdf size     : ${(finalPdf.length / 1024 / 1024).toFixed(1)} MB`);
  summary.push('');
  summary.push(`render       : ${fmtMs(renderMs)}    (per-page layout via paged.js)`);
  summary.push(`generate     : ${fmtMs(generateMs)}    (parseOutline + page.pdf)`);
  summary.push(`process      : ${fmtMs(processMs)}    (pdf-lib load + setOutline + save)`);
  summary.push(`total        : ${fmtMs(totalMs)}`);
  summary.push('');
  if (pages.length >= 4) {
    const q = Math.max(1, Math.floor(pages.length / 4));
    const avg = (a) => a.reduce((s, p) => s + p.dur, 0) / a.length;
    const first = avg(pages.slice(0, q));
    const last  = avg(pages.slice(-q));
    summary.push(`render: first ${q}-page avg per-page: ${first.toFixed(1)}ms`);
    summary.push(`render: last  ${q}-page avg per-page: ${last.toFixed(1)}ms`);
    summary.push(`render: ratio (last / first)         : ${(last / first).toFixed(2)}x`);
    summary.push('');
    summary.push('A ratio near 1.0 means flat per-page cost (linear total).');
    summary.push('A ratio that scales roughly with pages_total / pages_first');
    summary.push('means per-page cost is O(n), i.e. total cost is O(n^2).');
  }
  const summaryStr = summary.join('\n');
  writeFileSync(join(outDir, 'summary.txt'), summaryStr + '\n');
  console.log('---');
  console.log(summaryStr);

  if (keepOpen) {
    console.log('---');
    console.log('[harness] --keep-open: browser left running. Ctrl+C to exit.');
    await new Promise(() => {});
  }
} catch (err) {
  console.error('[harness] error:', err);
  exitCode = 1;
} finally {
  if (!keepOpen) await browser.close();
}

process.exit(exitCode);
