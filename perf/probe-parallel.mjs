// Two-shard `pageRanges` parallel-generate probe.
//
// Launches N puppeteer browsers in parallel. Each loads book.html, runs
// paged.js + detach-pages, then calls page.pdf({ pageRanges: ... }) over
// its slice of the document. Reports per-shard launch/load/render/
// generate timings and the Promise.all wall clock so we can compare
// against the single-process ~58 s (render ~10 s + generate ~43 s) the
// README cites for the current pipeline.
//
// The probe does not concatenate slices or remap outlines -- the point
// is just to see (a) what the wall-clock floor of parallel generate
// looks like on this machine, and (b) whether the per-shard slices look
// structurally sane (each opens via pdf-lib; page counts add up).
//
// Usage:
//   node probe-parallel.mjs [path/to/book.html] [--shards N]
//
// Defaults to ../docs/_site-pdf/book.html and N=2 shards.

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { PDFDocument, ParseSpeeds } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let inputArg = null;
let shardCount = 2;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--shards') shardCount = parseInt(args[++i], 10);
  else if (!inputArg && !a.startsWith('-')) inputArg = a;
  else { console.error(`unknown arg: ${a}`); process.exit(2); }
}
if (!Number.isFinite(shardCount) || shardCount < 1) {
  console.error(`--shards must be >= 1, got ${shardCount}`);
  process.exit(2);
}

const inputPath = inputArg
  ? resolve(process.cwd(), inputArg)
  : resolve(__dirname, '..', 'docs', '_site-pdf', 'book.html');
if (!existsSync(inputPath)) {
  console.error(`book HTML not found: ${inputPath}`);
  console.error('Build it first with docs/build.bat.');
  process.exit(1);
}

const pagedScriptPath = resolve(__dirname, '..', 'docs', 'lib', 'paged.browser.js');
const detachPagesPath = resolve(__dirname, 'detach-pages.js');
for (const p of [pagedScriptPath, detachPagesPath]) {
  if (!existsSync(p)) {
    console.error(`missing required file: ${p}`);
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = resolve(__dirname, 'results', `probe-parallel-${stamp}`);
mkdirSync(outDir, { recursive: true });

const fmtMs = (ms) => (ms / 1000).toFixed(2) + 's';

console.log(`[probe] input  : ${inputPath}`);
console.log(`[probe] output : ${outDir}`);
console.log(`[probe] shards : ${shardCount}`);

async function runShard(shardIndex) {
  const tStart = Date.now();
  const browser = await puppeteer.launch({
    // Matches docs/render-book.mjs (production path).
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
    ],
  });
  const tLaunched = Date.now();

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.on('pageerror',     (err) => console.error(`[shard ${shardIndex} pageerror]`, err.message));
    page.on('requestfailed', (req) => {
      const f = req.failure();
      console.error(`[shard ${shardIndex} requestfailed]`, req.url(), f && f.errorText);
    });

    await page.emulateMediaType('print');

    const tLoad = Date.now();
    await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'load' });
    const tLoaded = Date.now();

    await page.evaluate(() => {
      window.PagedConfig = window.PagedConfig || {};
      window.PagedConfig.auto = false;
    });
    await page.addScriptTag({ path: pagedScriptPath });
    await page.addScriptTag({ path: detachPagesPath });

    const tRender = Date.now();
    await page.evaluate(() => {
      if (!window.PagedPolyfill) {
        throw new Error('paged.js bundle did not expose window.PagedPolyfill');
      }
      window.PagedPolyfill.preview();
    });
    await page.waitForSelector('.pagedjs_pages');
    const tRendered = Date.now();
    const pageCount = await page.evaluate(
      () => document.querySelectorAll('.pagedjs_pages > .pagedjs_page').length
    );

    // Compute this shard's slice. Equal-ish split by page count: shard i
    // covers pages [i*ceil(N/S)+1, min((i+1)*ceil(N/S), N)].
    const slice = Math.ceil(pageCount / shardCount);
    const first = shardIndex * slice + 1;
    const last  = Math.min((shardIndex + 1) * slice, pageCount);
    const pageRange = `${first}-${last}`;

    const tGenerate = Date.now();
    const pdfBuffer = await page.pdf({
      printBackground:     true,
      displayHeaderFooter: false,
      preferCSSPageSize:   true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      pageRanges:          pageRange,
    });
    const tGenerated = Date.now();

    const shardPath = join(outDir, `shard-${shardIndex}.pdf`);
    writeFileSync(shardPath, pdfBuffer);

    return {
      shard:     shardIndex,
      pageCount,
      pageRange,
      bytes:     pdfBuffer.length,
      outputPath: shardPath,
      launch:    tLaunched   - tStart,
      load:      tLoaded     - tLaunched,
      render:    tRendered   - tLoad,
      generate:  tGenerated  - tGenerate,
      total:     tGenerated  - tStart,
    };
  } finally {
    await browser.close();
  }
}

const tWall = Date.now();
const shards = await Promise.all(
  Array.from({ length: shardCount }, (_, i) => runShard(i))
);
const wallClock = Date.now() - tWall;

console.log();
console.log('per-shard timings:');
for (const s of shards) {
  console.log(
    `  shard ${s.shard} (range ${s.pageRange} of ${s.pageCount}): ` +
    `launch ${fmtMs(s.launch)}, load ${fmtMs(s.load)}, ` +
    `render ${fmtMs(s.render)}, generate ${fmtMs(s.generate)}, ` +
    `${(s.bytes / 1024 / 1024).toFixed(1)} MB, total ${fmtMs(s.total)}`
  );
}
console.log();
console.log(`wall clock (Promise.all): ${fmtMs(wallClock)}`);

console.log();
console.log('verification (pdf-lib load + page count):');
let okAll = true;
let totalPagesOut = 0;
for (const s of shards) {
  try {
    const t0 = Date.now();
    const doc = await PDFDocument.load(readFileSync(s.outputPath), {
      parseSpeed: ParseSpeeds.Fastest,
    });
    const n = doc.getPageCount();
    totalPagesOut += n;
    console.log(`  shard ${s.shard}: ${n} pages, load ${fmtMs(Date.now() - t0)} -- ok`);
  } catch (err) {
    okAll = false;
    console.error(`  shard ${s.shard}: load failed -- ${err.message}`);
  }
}
const expected = shards[0]?.pageCount ?? 0;
console.log();
console.log(`output total pages: ${totalPagesOut}`);
console.log(`expected:           ${expected}`);
console.log(`coverage:           ${totalPagesOut === expected ? 'OK' : 'MISMATCH'}`);

process.exit(okAll && totalPagesOut === expected ? 0 : 1);
