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
//   process   default: PDFDocument.load + setMetadata + setOutline + save.
//             --incremental: applyOutlineAndMetadataIncremental() -- skip
//             the full pdf-lib parse and append an incremental update
//             (outline objects + updated Catalog/Info + new xref +
//             /Prev pointer) on top of Chrome's bytes.
//
// Usage:
//   node measure.mjs [path/to/book.html] [--out <dir>] [--keep-open]
//                    [--cpu-profile] [--cpu-profile-process]
//                    [--cpu-sampling <microseconds>]
//                    [--heap-profile] [--heap-sampling <bytes>]
//                    [--tracing]
//                    [--no-detach-pages] [--instrument] [--time-hooks]
//                    [--incremental] [--chrome-outline] [--timing]
//                    [--clone-count] [--render-only]
//                    [--fast-refs] [--parallel-deflate]
//                    [--fast-decode-name] [--fast-number-to-string]
//                    [--fast-size-in-bytes] [--fast-inflate]
//                    [--fast-parse-number] [--fast-parse-dict]
//                    [--fast-sync-load]
//
// --render-only bails out after the render phase. Skips meta extraction,
// parseOutline, page.pdf, and the pdf-lib roundtrip / incremental writer.
// Useful for cpu-profile / instrumentation runs where only the render
// phase matters; trims ~45s off the full ~55s book run. No book.pdf is
// written, and the timing.json / summary.txt omit generate/process.
//
// --timing injects timing-handler.js. The handler records per-page wall
// time + heap to window.__pagedTiming (so the harness can emit
// timing.csv and the first/last-quartile summary) and streams a per-page
// console.log relayed via CDP. The relay costs ~2 % of render self-time
// on the 1638-page book, which is why the handler isn't on by default --
// profile-clean runs and most A/B comparisons don't need it. Pass it
// when you want the per-page CSV.
//
// detach-pages.js is injected by default -- a Paged.Handler that hides
// each completed page from the layout tree. This is the shipping fix
// for the O(n^2) render hotspot (see notes/01-baseline-and-detach.md);
// matching it in the harness keeps measurements aligned with what
// production renders. Pass --no-detach-pages to measure the pre-fix
// O(n^2) baseline.
//
// --incremental switches the process phase from a pdf-lib roundtrip to
// an incremental update against Chrome's bytes. Massively faster (sub-
// second), but the resulting file is the size of Chrome's raw PDF +
// outline (~3x bigger than the pdf-lib output, which deflate-compresses
// content streams during its full re-emit).
//
// --chrome-outline asks Chrome itself to emit the /Outlines tree (CDP's
// generateDocumentOutline, M122+, requires --generate-pdf-document-outline
// at launch -- the harness always passes it). Skips the parseOutline DOM
// walk and the downstream setOutline injection; both pdf-lib and the
// incremental path see outline=[] and write nothing, leaving Chrome's
// outline intact. Chrome walks h1..h6 unconditionally -- no equivalent
// of our --outline-tags h1..h4 filter.
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
//
// --tracing wraps the render phase in a Chrome trace via CDP's Tracing
// domain (page.tracing.start) and writes trace.json to the results
// folder. The trace categorises Blink work as Layout / UpdateLayoutTree
// / ParseHTML / Composite / FunctionCall / V8.* etc -- the named buckets
// hiding inside the cpu profile's (program) frame. Load the file in
// chrome://tracing or perfetto.dev, or run analyze-trace.mjs against it
// for a top-N self-time table grouped by event name. Composable with
// --cpu-profile; uses an independent CDP domain.
//
// --cpu-profile-process wraps the process phase only (pdf-lib roundtrip
// or incremental writer) in a V8 Profiler trace via Node's inspector
// module -- the process phase runs in Node, not Chromium, so CDP's
// Profiler can't see it. Writes process.cpuprofile alongside render's.
// Honours --cpu-sampling. Composable with --cpu-profile when you want
// both phases captured in one run.
//
// --fast-refs replaces PDFRef.of's string-keyed Map lookup with a
// dense-array cache for the gen=0 case (82 % of ~1.2 M calls on the
// book). Eliminates the per-call `<obj> <gen> R` string allocation
// and Map hash. gen != 0 calls (pdf-lib's xref-stream bookkeeping
// for compressed objects) pass through unchanged.
//
// --parallel-deflate replaces pdfDoc.save() with parallelSave from
// docs/lib/parallel-deflate.mjs: object streams are pre-deflated in
// parallel on libuv's thread pool with objectsPerStream=500 (vs
// pdf-lib's serial save with default 50). Moves ~300 ms of zlib work
// off the main thread on the book.
//
// --fast-decode-name installs a parallel cache in front of PDFName.of
// that skips the decodeName regex scan when the raw name contains
// no `#` hex escape (which is 99.999 % of the ~2.8 M PDFName.of
// calls per load on the book). ~150 ms saved on process load.
//
// --fast-number-to-string short-circuits pdf-lib's numberToString
// when String(num) already lacks an `e`. Skips a redundant toString,
// split, and parseInt per call; only the rare exponential-notation
// tail still falls through to the original implementation.
//
// --fast-size-in-bytes replaces pdf-lib's utils.sizeInBytes -- which
// allocates `n.toString(2)` just to count its bit length -- with a
// non-allocating short-circuit ladder. Called ~300 k times per save
// from PDFCrossRefStream's xref writer; the dominant inputs are
// 1-2 byte values (type, gen, index, small obj-stream refs) so a
// `n < 0x100 ? 1 : ...` ladder is the right shape.
//
// --fast-inflate swaps pako.inflate for node:zlib.inflateSync on
// pdf-lib's one remaining pako call site (PDFCrossRefStreamParser
// inflating the compressed cross-reference stream during
// PDFDocument.load). One call per load, negligible wall-clock; flag
// exists so paired A/Bs can compare against pure-pdf-lib behaviour.
// Production runs through it.
//
// --fast-parse-number replaces pdf-lib's BaseParser.parseRawNumber
// and parseRawInt with direct-integer accumulators (n = n*10 +
// (byte - 0x30)) that skip per-byte string concatenation and the
// trailing Number() round-trip. Every numeric token in a parsed
// PDF flows through these; hundreds of thousands of calls per load
// on the book. Production runs through it.
//
// --fast-parse-dict hoists the four sentinel PDFName.of calls
// (Type / Catalog / Pages / Page) out of the type-dispatch tail
// in PDFObjectParser.prototype.parseDict. The dispatch fires
// per-dict (tens of thousands on the book) and even with
// --fast-decode-name each lookup is still a Map.get on fastCache.
// Pool-dedup makes the canonical PDFNames reference-stable, so
// captured constants replace the four calls verbatim.
//
// --fast-sync-load rips pdf-lib's parseSpeed / objectsPerTick /
// shouldWaitForTick / waitForTick machinery out of both the load
// path (PDFDocument.load + PDFParser.parseDocument / parseDocumentSection
// / parseIndirectObjects / parseIndirectObject +
// PDFObjectStreamParser.parseIntoContext) and the save path
// (PDFWriter.serializeToBuffer / computeBufferSize +
// PDFStreamWriter.computeBufferSize). pdf-lib's TS downlevel wraps
// each in tslib __awaiter / __generator so on browsers they can
// `await waitForTick()` every `objectsPerTick` objects; with
// objectsPerTick: Infinity (or the load path's parseSpeed: Fastest)
// the gate never fires, but every indirect object still pays the
// generator state-machine + Promise allocation. The shim removes
// the scaffolding and the waitForTick yields entirely. Production
// runs through it; the parseSpeed / objectsPerTick options are
// dropped from PDFDocument.load / parallelSave / pdfDoc.save call
// sites in step with this shim.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
// Shared with docs/render-book.mjs -- the helpers and the paged.js
// bundle live under docs/lib/ now that we've dropped the pagedjs-cli
// dependency. Importing from there guarantees the harness measures the
// same code that production runs.
import { parseOutline, setOutline } from '../docs/lib/outline.mjs';
import { setMetadata }              from '../docs/lib/postprocesser.mjs';
import { applyOutlineAndMetadataIncremental } from './incremental-pdf.mjs';
import { pinCpuIfWindows } from './pin-cpu.mjs';
import { parallelSave } from '../docs/lib/parallel-deflate.mjs';

// On Windows, re-launch under `start /affinity 0x5500 /high` to stabilise
// CPU sample-time. See pin-cpu.mjs. Cuts run-to-run variance from
// ~15-25 % to ~3 % on this Ryzen 7 dev box. Pass --no-affinity to skip.
pinCpuIfWindows({ toolName: 'measure.mjs' });

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let inputArg = null;
let outArg = null;
let keepOpen = false;
let cpuProfile = false;
let cpuProfileProcess = false;
let cpuSampling = 1000; // microseconds
let heapProfile = false;
let heapSampling = 32768; // bytes between samples (CDP default)
let detachPages = true;
let instrument = false;
let timeHooks = false;
let incremental = false;
let chromeOutline = false;
let timing = false;
let cloneCount = false;
let renderOnly = false;
let tracing = false;
let fastRefs = false;
let parallelDeflate = false;
let fastDecodeName = false;
let fastNumberToString = false;
let fastSizeInBytes = false;
let fastInflate = false;
let fastParseNumber = false;
let fastDictIter = false;
let fastParseDict = false;
let fastSyncLoad = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') outArg = args[++i];
  else if (a === '--keep-open') keepOpen = true;
  else if (a === '--cpu-profile') cpuProfile = true;
  else if (a === '--cpu-profile-process') cpuProfileProcess = true;
  else if (a === '--cpu-sampling') cpuSampling = parseInt(args[++i], 10);
  else if (a === '--heap-profile') heapProfile = true;
  else if (a === '--heap-sampling') heapSampling = parseInt(args[++i], 10);
  else if (a === '--detach-pages') detachPages = true;       // accepted for backwards compat; default since the fix landed
  else if (a === '--no-detach-pages') detachPages = false;
  else if (a === '--instrument') instrument = true;
  else if (a === '--time-hooks') timeHooks = true;
  else if (a === '--incremental') incremental = true;
  else if (a === '--chrome-outline') chromeOutline = true;
  else if (a === '--timing') timing = true;
  else if (a === '--no-timing') timing = false;             // accepted for backwards compat; default since the relay cost was measured
  else if (a === '--clone-count') cloneCount = true;
  else if (a === '--render-only') renderOnly = true;
  else if (a === '--tracing') tracing = true;
  else if (a === '--no-affinity') { /* handled in pin-cpu.mjs */ }
  else if (a === '--fast-refs') fastRefs = true;
  else if (a === '--parallel-deflate') parallelDeflate = true;
  else if (a === '--fast-decode-name') fastDecodeName = true;
  else if (a === '--fast-number-to-string') fastNumberToString = true;
  else if (a === '--fast-size-in-bytes') fastSizeInBytes = true;
  else if (a === '--fast-inflate') fastInflate = true;
  else if (a === '--fast-parse-number') fastParseNumber = true;
  else if (a === '--fast-dict-iter') fastDictIter = true;
  else if (a === '--fast-parse-dict') fastParseDict = true;
  else if (a === '--fast-sync-load') fastSyncLoad = true;
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

const pagedScriptPath  = resolve(__dirname, '..', 'docs', 'lib', 'paged.browser.js');
const handlerPath      = resolve(__dirname, 'timing-handler.js');
const detachPagesPath  = resolve(__dirname, 'detach-pages.js');
const instrumentPath   = resolve(__dirname, 'instrument-flush-ops.js');
const timeHooksPath    = resolve(__dirname, 'time-hooks.js');
const cloneCountPath   = resolve(__dirname, 'instrument-clones.js');
const required = [pagedScriptPath];
if (timing)     required.push(handlerPath);
if (detachPages) required.push(detachPagesPath);
if (instrument)  required.push(instrumentPath);
if (timeHooks)   required.push(timeHooksPath);
if (cloneCount)  required.push(cloneCountPath);
for (const p of required) {
  if (!existsSync(p)) {
    console.error(`missing required file: ${p}`);
    console.error('Run "npm install" at the repo root first (run.bat does this automatically).');
    process.exit(1);
  }
}

if (cpuProfileProcess && renderOnly) {
  console.error('--cpu-profile-process is incompatible with --render-only (the process phase is skipped).');
  process.exit(2);
}

// Install the dense-array cache for PDFRef.of's gen=0 path before any
// pdf-lib operation. Side-effecting import; idempotent.
if (fastRefs) {
  await import('../docs/lib/fast-refs.mjs');
  console.log('[harness] fast-refs: PDFRef.of dense-array cache for gen=0');
}
if (fastDecodeName) {
  await import('../docs/lib/fast-decode-name.mjs');
  console.log('[harness] fast-decode-name: skip decodeName regex when name has no #');
}
if (fastNumberToString) {
  await import('../docs/lib/fast-number-to-string.mjs');
  console.log('[harness] fast-number-to-string: skip redundant toString/split when no exponential');
}
if (fastSizeInBytes) {
  await import('../docs/lib/fast-size-in-bytes.mjs');
  console.log('[harness] fast-size-in-bytes: non-allocating ladder for xref byte-width');
}
if (fastInflate) {
  await import('../docs/lib/fast-inflate.mjs');
  console.log('[harness] fast-inflate: swap pako.inflate for node:zlib.inflateSync');
}
if (fastParseNumber) {
  await import('../docs/lib/fast-parse-number.mjs');
  console.log('[harness] fast-parse-number: direct-integer accumulator for parseRawNumber/parseRawInt');
}
if (fastDictIter) {
  await import('../docs/lib/fast-dict-iter.mjs');
  console.log('[harness] fast-dict-iter: in-place Map.forEach for PDFDict.sizeInBytes/copyBytesInto');
}
if (fastParseDict) {
  await import('../docs/lib/fast-parse-dict.mjs');
  console.log('[harness] fast-parse-dict: hoist Type/Catalog/Pages/Page sentinel PDFNames out of parseDict');
}
if (fastSyncLoad) {
  await import('../docs/lib/fast-sync-load.mjs');
  console.log('[harness] fast-sync-load: synchronify PDFParser load path, strip waitForTick machinery');
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
  //
  // --export-tagged-pdf and --generate-pdf-document-outline are added by
  // puppeteer 22+ unconditionally in ChromeLauncher.defaultArgs(), so
  // we don't need to repeat them here. --chrome-outline below relies on
  // the latter being present at launch.
  //
  // --disable-gpu + --disable-software-rasterizer mirror production
  // (docs/render-book.mjs). Shrinks the GPU process from ~100 MB to
  // ~16 MB and the renderer ~120 MB; generate ~5 s faster; PDF byte-
  // identical. See perf/README.md "Disabling the GPU process".
  args: [
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--enable-precise-memory-info',
    '--disable-gpu',
    '--disable-software-rasterizer',
  ],
});

let exitCode = 0;
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);

  page.on('console', (msg) => {
    const t = msg.text();
    if (t.startsWith('[paged-timing]') || t.startsWith('[detach-pages]') ||
        t.startsWith('[instrument]') || t.startsWith('[clone-count]') ||
        t.startsWith('  ')) {
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
  if (timing) {
    await page.addScriptTag({ path: handlerPath });
  }
  if (detachPages) {
    await page.addScriptTag({ path: detachPagesPath });
  }
  if (instrument) {
    await page.addScriptTag({ path: instrumentPath });
  }
  if (timeHooks) {
    await page.addScriptTag({ path: timeHooksPath });
  }
  if (cloneCount) {
    await page.addScriptTag({ path: cloneCountPath });
  }

  // RENDER ----------------------------------------------------------
  // Optionally wrap just this phase in a V8 CPU and/or heap sampling
  // profile. CDP attaches to the renderer for this page; we stop
  // before the generate phase so the traces stay focused on paged.js
  // layout work.
  let cdp = null;
  if (cpuProfile || heapProfile) {
    cdp = await page.createCDPSession();
  }
  if (cpuProfile) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: cpuSampling });
    await cdp.send('Profiler.start');
    console.log(`[harness] cpu profile: sampling every ${cpuSampling}us`);
  }
  if (heapProfile) {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: heapSampling });
    console.log(`[harness] heap profile: sampling every ${heapSampling} bytes`);
  }
  let tracePath = null;
  if (tracing) {
    // Independent of Profiler / HeapProfiler -- different CDP domain.
    // Categories chosen to crack open the cpu profile's (program) bucket:
    // devtools.timeline gives Layout / RecalcStyles / ParseHTML /
    // FunctionCall / EvaluateScript; disabled-by-default-devtools.timeline
    // adds UpdateLayoutTree / InvalidateLayout / ScheduleStyleRecalc /
    // HitTest; blink covers internal Blink events; v8 + v8.execute cover
    // V8.GC* / V8.CompileCode / V8.RunMicrotasks / V8.Execute.
    // disabled-by-default-v8.cpu_profiler embeds V8 sampling-profile data
    // as Profile / ProfileChunk events inline with the trace, giving JS
    // call stacks aligned with Blink events when loaded in Chrome
    // DevTools Performance or perfetto.dev (the hybrid view).
    tracePath = join(outDir, 'trace.json');
    await page.tracing.start({
      path: tracePath,
      screenshots: false,
      categories: [
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'blink',
        'v8',
        'v8.execute',
        'disabled-by-default-v8.cpu_profiler',
      ],
    });
    console.log(`[harness] tracing: ${tracePath}`);
  }

  const tRenderStart = Date.now();
  // [PATCH: sync-chain] PagedPolyfill.preview() is fully synchronous in
  // our forked bundle, so the IIFE here is a plain sync arrow. Outer
  // `await` is for puppeteer's CDP round-trip back from page.evaluate.
  await page.evaluate(() => {
    if (!window.PagedPolyfill) {
      throw new Error('paged.js bundle did not expose window.PagedPolyfill');
    }
    try {
      window.PagedPolyfill.preview();
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

  if (tracing) {
    await page.tracing.stop();
    try {
      const { statSync } = await import('node:fs');
      const sz = statSync(tracePath).size;
      console.log(`[harness] tracing: ${tracePath} (${(sz / 1024 / 1024).toFixed(1)} MB)`);
    } catch { /* size reporting is best-effort */ }
  }

  let profilePath = null;
  let heapProfilePath = null;
  if (cdp) {
    if (cpuProfile) {
      const { profile } = await cdp.send('Profiler.stop');
      profilePath = join(outDir, 'render.cpuprofile');
      const profileJson = JSON.stringify(profile);
      writeFileSync(profilePath, profileJson);
      console.log(`[harness] cpu profile: ${profilePath} (${(profileJson.length / 1024 / 1024).toFixed(1)} MB)`);
    }
    if (heapProfile) {
      const { profile } = await cdp.send('HeapProfiler.stopSampling');
      heapProfilePath = join(outDir, 'render.heapprofile');
      const profileJson = JSON.stringify(profile);
      writeFileSync(heapProfilePath, profileJson);
      const totalBytes = profile.samples.reduce((s, x) => s + x.size, 0);
      console.log(`[harness] heap profile: ${heapProfilePath} (${(profileJson.length / 1024 / 1024).toFixed(1)} MB, ${profile.samples.length} samples, ${(totalBytes / 1024 / 1024).toFixed(1)} MB allocated)`);
    }
    await cdp.detach();
  }

  console.log(`[harness] render   ${fmtMs(renderMs)}`);

  // Declared outside the generate/process blocks so the persistence /
  // summary code can read them either way. --render-only leaves them null.
  let generateMs = null;
  let parseOutlineMs = null;
  let pdfMs = null;
  let rawPdfBytes = null;
  let processMs = null;
  let processBreakdown = null;
  let processProfilePath = null;
  let finalPdf = null;

  if (!renderOnly) {
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

  // Skip the parseOutline DOM walk when Chrome's about to emit the
  // outline itself -- we'd just be doing redundant work whose result
  // would get overwritten by Chrome's /Outlines anyway.
  const tParseOutlineStart = Date.now();
  const outline = chromeOutline ? [] : await parseOutline(page, outlineTags);
  parseOutlineMs = Date.now() - tParseOutlineStart;

  const tPdfStart = Date.now();
  const rawPdf = await page.pdf({
    printBackground:     true,
    displayHeaderFooter: false,
    preferCSSPageSize:   true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    // outline:true makes Chrome walk h1..h6 once and emit a /Outlines
    // tree with page-coord destinations. Implies tagged:true (puppeteer
    // enforces this) and requires --generate-pdf-document-outline at
    // launch (set above). When on we skip the parseOutline+setOutline
    // injection below -- that's the whole point of the flag, and leaving
    // both on would have our setOutline overwrite Chrome's /Outlines.
    ...(chromeOutline ? { outline: true, tagged: true } : {}),
  });
  pdfMs = Date.now() - tPdfStart;
  rawPdfBytes = rawPdf.length;

  const tGenEnd = Date.now();
  generateMs = tGenEnd - tGenStart;
  console.log(`[harness] generate ${fmtMs(generateMs)}  (parseOutline=${fmtMs(parseOutlineMs)}, page.pdf=${fmtMs(pdfMs)}, ${(rawPdf.length / 1024 / 1024).toFixed(1)}MB)`);

  // PROCESS ---------------------------------------------------------
  // Two paths:
  //   default       : pdf-lib roundtrip -- load + setMetadata + setOutline
  //                   + save. The whole 52 MB Chrome PDF gets parsed and
  //                   re-emitted just so we can attach an outline.
  //   --incremental : applyOutlineAndMetadataIncremental -- parse only the
  //                   trailer, xref, Catalog and Info objects; append a
  //                   few KB containing the outline tree + updated Catalog
  //                   and Info + a new xref subsection whose /Prev points
  //                   at Chrome's original xref. Original bytes untouched.
  //
  // Either way we time the full phase plus the meaningful sub-steps so the
  // breakdown matches across runs.
  //
  // --cpu-profile-process attaches Node's inspector Profiler around this
  // block. The render phase profiles via CDP because the work happens in
  // Chromium; the process phase profiles via Node's inspector because
  // pdf-lib runs locally. Output file shape (V8 .cpuprofile JSON) is the
  // same either way.
  let inspectorSession = null;
  if (cpuProfileProcess) {
    inspectorSession = new Session();
    inspectorSession.connect();
    await inspectorSession.post('Profiler.enable');
    await inspectorSession.post('Profiler.setSamplingInterval', { interval: cpuSampling });
    await inspectorSession.post('Profiler.start');
    console.log(`[harness] process cpu profile: sampling every ${cpuSampling}us`);
  }

  const tProcStart = Date.now();
  if (incremental) {
    const tIncStart = Date.now();
    const { bytes, stats } = await applyOutlineAndMetadataIncremental(rawPdf, outline, meta);
    const incMs = Date.now() - tIncStart;
    finalPdf = bytes;
    processBreakdown = { incrementalMs: incMs, ...stats };
  } else {
    // Upstream pdf-lib's load yields to the event loop every
    // `parseSpeed` objects via `await waitForTick()`; the save side
    // does the same every `objectsPerTick`. With --fast-sync-load on
    // (the production default) both yield gates are ripped out -- the
    // option arguments are silently ignored, so we don't bother
    // passing them. Without --fast-sync-load, the run measures pdf-lib's
    // cautious defaults (parseSpeed: Slow, objectsPerTick: 50) which
    // yield ~500 / ~1000 times per phase on the book; that's pdf-lib's
    // out-of-the-box behaviour, useful as a baseline for A/B work.
    const tLoadStart = Date.now();
    const pdfDoc = await PDFDocument.load(rawPdf);
    const loadMs = Date.now() - tLoadStart;

    setMetadata(pdfDoc, meta);

    const tSetOutlineStart = Date.now();
    setOutline(pdfDoc, outline, false);
    const setOutlineMs = Date.now() - tSetOutlineStart;

    const tSaveStart = Date.now();
    let parallelStreamCount = 0;
    if (parallelDeflate) {
      const { bytes, streamCount } = await parallelSave(pdfDoc, { objectsPerStream: 500 });
      finalPdf = bytes;
      parallelStreamCount = streamCount;
    } else {
      finalPdf = await pdfDoc.save();
    }
    const saveMs = Date.now() - tSaveStart;

    processBreakdown = { loadMs, setOutlineMs, saveMs, parallelStreamCount };
  }
  const tProcEnd  = Date.now();
  processMs = tProcEnd - tProcStart;
  if (inspectorSession) {
    const { profile } = await inspectorSession.post('Profiler.stop');
    await inspectorSession.post('Profiler.disable');
    inspectorSession.disconnect();
    processProfilePath = join(outDir, 'process.cpuprofile');
    const profileJson = JSON.stringify(profile);
    writeFileSync(processProfilePath, profileJson);
    console.log(`[harness] process cpu profile: ${processProfilePath} (${(profileJson.length / 1024 / 1024).toFixed(1)} MB)`);
  }
  if (incremental) {
    console.log(`[harness] process  ${fmtMs(processMs)}  (incremental=${fmtMs(processBreakdown.incrementalMs)}, +${processBreakdown.appendedBytes}B, ${processBreakdown.newObjectCount} new objs)`);
  } else {
    const parTag = processBreakdown.parallelStreamCount
      ? ` (parallel-deflate: ${processBreakdown.parallelStreamCount} streams)`
      : '';
    console.log(`[harness] process  ${fmtMs(processMs)}  (load=${fmtMs(processBreakdown.loadMs)}, setOutline=${fmtMs(processBreakdown.setOutlineMs)}, save=${fmtMs(processBreakdown.saveMs)}${parTag})`);
  }
  }  // end if (!renderOnly)

  const totalMs = Date.now() - tRenderStart;
  console.log(`[harness] total    ${fmtMs(totalMs)}`);

  // Persist results -------------------------------------------------
  const timingData = timing
    ? await page.evaluate(() => window.__pagedTiming)
    : { pages: [], phases: {}, pageCount: null };
  if (finalPdf) {
    const pdfPath = join(outDir, 'book.pdf');
    writeFileSync(pdfPath, Buffer.from(finalPdf));
  }

  const record = {
    input: inputPath,
    pageCount: timingData.pageCount,
    pdfBytes: finalPdf ? finalPdf.length : null,
    cpuProfile: profilePath,
    phases: {
      render: {
        ms: renderMs,
        perPage: timingData.pages,
        phaseMarks: timingData.phases,
      },
    },
    totalMs,
  };
  if (!renderOnly) {
    record.phases.generate = {
      ms: generateMs,
      parseOutlineMs,
      pagePdfMs: pdfMs,
      rawPdfBytes,
    };
    record.phases.process = {
      ms: processMs,
      mode: incremental ? 'incremental' : 'pdf-lib-roundtrip',
      cpuProfile: processProfilePath,
      ...processBreakdown,
    };
  }
  writeFileSync(join(outDir, 'timing.json'), JSON.stringify(record, null, 2));

  const csv = ['page,dur_ms,heap_start_mb,heap_end_mb,elapsed_s'];
  for (const p of timingData.pages) {
    csv.push([
      p.idx,
      p.dur.toFixed(2),
      (p.heapStart / 1024 / 1024).toFixed(2),
      (p.heapEnd   / 1024 / 1024).toFixed(2),
      (p.elapsed   / 1000).toFixed(3),
    ].join(','));
  }
  writeFileSync(join(outDir, 'timing.csv'), csv.join('\n'));

  const pages = timingData.pages;
  const summary = [];
  summary.push(`input        : ${inputPath}`);
  if (timing) {
    summary.push(`pages        : ${pages.length}`);
  } else {
    summary.push(`pages        : (per-page timing not collected; pass --timing for the CSV)`);
  }
  if (finalPdf) {
    summary.push(`pdf size     : ${(finalPdf.length / 1024 / 1024).toFixed(1)} MB`);
  }
  summary.push('');
  summary.push(`render       : ${fmtMs(renderMs)}    (per-page layout via paged.js)`);
  if (!renderOnly) {
    summary.push(`generate     : ${fmtMs(generateMs)}    (parseOutline + page.pdf)`);
    summary.push(`process      : ${fmtMs(processMs)}    (${incremental ? 'incremental update (append outline + updated catalog/info)' : 'pdf-lib load + setOutline + save'})`);
  } else {
    summary.push(`(generate + process skipped: --render-only)`);
  }
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
