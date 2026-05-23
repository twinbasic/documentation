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
import { PDFDocument } from 'pdf-lib';
// Side-effecting imports. Mutate pdf-lib's live module exports
// before any pdf-lib operation -- order doesn't matter. See
// perf/notes/08-pdf-lib.md.
//
//   fast-refs         -- dense-array cache in front of PDFRef.of for
//     the gen=0 case (82 % of ~1.2 M calls per load). ~0.2 s saved
//     on load.
//   fast-inflate      -- swaps pako.inflate for node:zlib.inflateSync
//     on the one pdf-lib call site that uses it
//     (PDFCrossRefStreamParser during load). Negligible cost shift,
//     but eliminates the last pdf-lib -> pako call at runtime.
//   fast-parse-number -- direct-integer accumulators in front of
//     BaseParser.parseRawNumber + parseRawInt, skipping per-byte
//     string concat and the trailing Number() round-trip. Touches
//     every numeric token parsed during PDFDocument.load.
//   fast-decode-name -- cache in front of PDFName.of that skips
//     the decodeName regex scan when the input has no `#` (which
//     is 99.999 % of the ~2.8 M PDFName.of calls per load).
//   fast-number-to-string -- short-circuit numberToString when
//     `String(num)` already lacks an `e` (i.e. for every PDF number
//     that's not in the exponential-notation tail). Skips a
//     redundant toString + split + parseInt per call.
//   fast-size-in-bytes -- replace utils.sizeInBytes (which allocates
//     `n.toString(2)` just to count its bit length) with a non-
//     allocating short-circuit ladder. Called ~300 k times per save
//     from PDFCrossRefStream's xref writer.
//   fast-dict-onebuf -- one long-lived buffer for every committed
//     PDFDict entry across the whole document. Parser uses a small
//     per-instance temp array as a stack of recursion frames; each
//     parseDict invocation appends to temp, commits its frame to
//     main in one contiguous append, and pops temp back. PDFDicts
//     only ever read from main, so a packed (start, length, owned)
//     Number is the whole instance state -- no separate bufIdx.
//     Owned dicts (factory-created post-parse) also append to main.
//     Mutations: in-place replace for existing keys, COW (copy
//     range to tail, push new pair) for new keys or delete.
//     PDFContext is a singleton -- one PDFDocument.load per
//     process; a second distinct context throws. Subsumes
//     fast-dict-array. Process-phase heap traffic drops from the
//     Map-backed baseline of ~152 MB down to ~66 MB (-57%); -22%
//     beyond fast-dict-array. See "One-buffer PDFDict" in
//     perf/notes/08-pdf-lib.md.
//
//     Earlier dict-shape shims (fast-dict-array, fast-dict-iter,
//     fast-parse-dict) stay in the tree as A/B baselines but are
//     mutually exclusive with --fast-dict-onebuf in measure.mjs.
//   fast-parse-object -- replace PDFObjectParser.prototype.parseObject
//     with a first-byte-dispatch version that gates the three
//     matchKeyword (true / false / null) scans behind a byte check.
//     parseObject fires per dict value / array element / indirect
//     object body; the upstream version pays three speculative
//     matchKeyword fail-and-rewind costs on every invocation. Same
//     semantics, dispatch reordered by observed frequency.
//   fast-sync-load -- rip the parseSpeed / objectsPerTick /
//     shouldWaitForTick / waitForTick machinery out of both pdf-lib's
//     load path (PDFDocument.load + five PDFParser /
//     PDFObjectStreamParser methods underneath it) and its save path
//     (PDFWriter.serializeToBuffer + computeBufferSize, plus the
//     unreachable PDFStreamWriter.computeBufferSize patched for
//     consistency). Each upstream method is wrapped in __awaiter so
//     on browsers it can yield to the event loop every objectsPerTick
//     objects; in Node the gate never fires but every indirect object
//     still paid for the generator state machine + Promise
//     allocation. ~135 ms of attributed parser self-time + ~40 ms
//     writer + an unknowable chunk of the GC row removed; the
//     parseSpeed / objectsPerTick options drop off all our call sites
//     in step with this shim.
//   fast-indirect-objects -- replace PDFContext.indirectObjects
//     (Map<PDFRef, PDFObject>) with a dense array indexed by
//     objectNumber for the gen=0 path. After fast-dict-array shipped,
//     PDFContext.assign's `this.indirectObjects.set(ref, object)` was
//     the only hot Map.set left in the heap profile (~7 MB of set
//     traffic from the parser's once-per-indirect-object assign).
//     Mirror of the fast-refs trick on the value side: dense array
//     for gen=0, Map fallback for gen!=0. enumerateIndirectObjects
//     skips its sort when the gen!=0 Map is empty (the common case).
//     Drops PDFContext.assign out of the CPU top-15 and halves the
//     remaining set heap traffic.
//   fast-pdfnumber-pool -- value-keyed cache in front of PDFNumber.of.
//     Dense array for non-negative integers in [0, 16384), Map
//     fallback for floats / negatives / out-of-range. PDFs reuse the
//     same numeric values (page indices, /Count, /N, /MediaBox
//     dimensions) hundreds of thousands of times against only a few
//     thousand unique values; pooling collapses parseNumberOrRef's
//     ~15 MB of PDFNumber allocations to ~0.8 MB. Total process-phase
//     heap traffic drops ~13 % (123 MB -> 107 MB). PDFNumber is
//     immutable so sharing is safe.
//   measure-pass (Phase 1) -- no-allocate byte walker
//     (docs/lib/measure-pass.mjs) that runs in front of
//     PDFDocument.load on the raw Chrome PDF and counts dictSlots.
//     The count drives setExpectedDictSlots() on fast-dict-onebuf,
//     which pre-sizes the module-level main Array to the exact
//     slot count (no V8 growth resizes during load). Net wall-clock
//     is ~+40 ms on the book (walker costs ~60 ms; load saves ~20).
//     The bound on mainBuf isn't material on its own (~60 K slots
//     out of 2.4 M) but commits the two-pass shape. Phase 2/3/3β
//     (Float64Array mainBuf + encoded slots) were explored and
//     didn't ship -- per-slot encode/decode cost exceeded the
//     mark-phase savings. See "Phase 1: pre-size mainBuf via
//     measure-pass" in perf/notes/08-pdf-lib.md.
import './lib/fast-refs.mjs';
import './lib/fast-inflate.mjs';
import './lib/fast-parse-number.mjs';
import './lib/fast-decode-name.mjs';
import './lib/fast-number-to-string.mjs';
import './lib/fast-size-in-bytes.mjs';
import { setExpectedDictSlots }     from './lib/fast-dict-onebuf.mjs';
import './lib/fast-parse-object.mjs';
import './lib/fast-sync-load.mjs';
import './lib/fast-indirect-objects.mjs';
import './lib/fast-pdfnumber-pool.mjs';
import { measure as measureRawPdf } from './lib/measure-pass.mjs';
import { parseOutline, setOutline } from './lib/outline.mjs';
import { setMetadata }              from './lib/postprocesser.mjs';
import { parallelSave }             from './lib/parallel-deflate.mjs';

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
  //
  // --disable-gpu + --disable-software-rasterizer: shrinks the GPU
  // process from ~100 MB to ~16 MB (Chromium keeps a stub even with
  // these flags -- only --in-process-gpu kills it entirely, but that
  // serialises GPU work onto the main thread and costs ~15 s on the
  // render+generate wall clock). With just the disable pair the
  // renderer is also ~120 MB lighter and generate runs ~5 s faster
  // (Skia skips a GPU init path). PDF output is byte-identical.
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--disable-gpu',
    '--disable-software-rasterizer',
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

  // Live progress. Render and generate both write a per-phase status to
  // stdout: a `\r`-overwritten line on a TTY, or sparser line-per-N
  // output when stdout is piped (CI / log files). clearProgress() wipes
  // the live line before the next phase's summary is printed.
  const isTty = !!process.stdout.isTTY;
  let progressLineLen = 0;
  const clearProgress = () => {
    if (isTty && progressLineLen > 0) {
      process.stdout.write('\r' + ' '.repeat(progressLineLen) + '\r');
      progressLineLen = 0;
    }
  };
  // Render phase: progress-handler.js (loaded via addScriptTag below)
  // emits `[render-progress] page=N elapsed=Ns` from afterPageLayout.
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
  // PagedPolyfill.preview() is fully synchronous in our forked bundle
  // (the entire chain preview -> chunker.flow -> render -> *layout is
  // now sync; loadFonts is a sync assertion that page.goto's
  // waitUntil:'load' already satisfied; stylesheets are loaded via
  // synchronous XHR). Inner IIFE is a plain sync arrow; outer await
  // is just the CDP round-trip puppeteer needs to ferry the result.
  const tRender = Date.now();
  await page.evaluate(() => {
    if (!window.PagedPolyfill) {
      throw new Error('paged.js bundle did not expose window.PagedPolyfill');
    }
    try {
      window.PagedPolyfill.preview();
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

  // Generate -- meta extraction, outline walk, then Chromium DOM->PDF.
  //
  // page.pdf() returns a single buffer with no progress signal: on the
  // Chromium we ship with, the PDF writer buffers the whole document
  // internally and dumps it at the very end (verified by streaming the
  // result via CDP IO.read and watching the chunks pile up only at the
  // last tick). A 500 ms wall-clock heartbeat keeps an elapsed counter
  // visible during the ~50 s wait so the terminal doesn't look hung.
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

  const renderGenerateProgress = () => {
    const elapsed = ((Date.now() - tGenerate) / 1000).toFixed(1);
    const line = `generating: ${elapsed}s`;
    if (isTty) {
      process.stdout.write('\r' + line.padEnd(progressLineLen, ' '));
      progressLineLen = line.length;
    }
  };
  let heartbeat = null;
  if (isTty) {
    renderGenerateProgress();
    heartbeat = setInterval(renderGenerateProgress, 500);
  }
  let rawPdf;
  try {
    rawPdf = await page.pdf({
      printBackground:     true,
      displayHeaderFooter: false,
      preferCSSPageSize:   true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    clearProgress();
  }
  console.log(`generate: ${fmtMs(Date.now() - tGenerate)}  (raw ${(rawPdf.length / 1024 / 1024).toFixed(1)} MB)`);

  // Process -- pdf-lib roundtrip with outline + metadata attached.
  // fast-sync-load strips the waitForTick yield gates on both load
  // and save sides entirely (load was ~40 s under pdf-lib's Slow
  // default that yields every 100 objects; ~5 s on Fastest; now
  // ~1 s with the gates ripped out -- so parseSpeed / objectsPerTick
  // no longer matter and drop from the call sites).
  //
  // parallelSave (vs the default pdfDoc.save):
  //  - objectsPerStream: 500 -- larger object-stream chunks compress
  //    better (shared deflate window), 5 % smaller output PDF, and
  //    cuts the per-chunk dispatch overhead 10x.
  //  - dispatches every chunk's deflate to libuv's thread pool via
  //    async zlib.deflate instead of running serially on the main
  //    thread. Moves ~300 ms of zlib work off-CPU on the book.
  //
  // measureRawPdf walks rawPdf once with no allocations and hands
  // the exact dictSlot count to fast-dict-onebuf so its main Array
  // is pre-sized; eliminates V8 growth resizes during load.
  // See perf/notes/08-pdf-lib.md.
  const tProcess = Date.now();
  setExpectedDictSlots(measureRawPdf(rawPdf).dictSlots);
  const pdfDoc = await PDFDocument.load(rawPdf);
  setMetadata(pdfDoc, meta);
  await setOutline(pdfDoc, outline, false);
  const { bytes: finalPdf } = await parallelSave(pdfDoc, { objectsPerStream: 500 });
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
