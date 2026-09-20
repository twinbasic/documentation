// Browser-topology probe: does one browser with N tabs parallelise
// page.pdf() as well as N separate browsers?
//
// Answer, measured on the 1982-page book (two runs each, N=4):
//
//   topology          generate wall   per-shard spread   PrintCompositors
//   1 browser, 4 tabs  36.1 / 34.9 s    9.30 / 9.25 s      3 for 4 shards
//   4 browsers         27.6 / 26.2 s    1.40 / 1.11 s      4 for 4 shards
//
// A single browser process pools the PrintCompositor utility below the
// shard count, and the SkPDF step is single-threaded per compositor, so
// the surplus shard queues -- that is the ~9 s spread. Tabs also reclaim
// no memory: each tab gets its own renderer process regardless, so the
// ~1.8 GB of paged.js layout per shard is unavoidable either way and
// only the browser / GPU / network / storage processes are shared.
//
// This is why probe-parallel.mjs launches one browser per shard.
//
// Usage:
//   node probe-tabs-vs-procs.mjs tabs|procs [--shards N]
//
// Set PROD_ARGS=1 to add production's --disable-gpu pair (see
// book/render-book.mjs). Defaults to N=2 shards.
//
// Requires docs/_site-pdf/book.html -- build it first with build.bat.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
if (mode !== 'tabs' && mode !== 'procs') {
  console.error('usage: node perf/probe-tabs-vs-procs.mjs tabs|procs [--shards N]');
  process.exit(2);
}
let shardCount = 2;
const si = process.argv.indexOf('--shards');
if (si !== -1) shardCount = parseInt(process.argv[si + 1], 10);
if (!Number.isFinite(shardCount) || shardCount < 1) {
  console.error('--shards must be >= 1');
  process.exit(2);
}

const inputPath       = resolve(__dirname, '..', 'docs', '_site-pdf', 'book.html');
const pagedScriptPath = resolve(__dirname, '..', 'book', 'lib', 'paged.browser.js');
const detachPagesPath = resolve(__dirname, 'detach-pages.js');
for (const p of [inputPath, pagedScriptPath, detachPagesPath]) {
  if (!existsSync(p)) { console.error(`missing: ${p}`); process.exit(1); }
}

// Probe's current args (NOT production's -- production adds the --disable-gpu pair).
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'];
if (process.env.PROD_ARGS === '1') ARGS.push('--disable-gpu', '--disable-software-rasterizer');
const fmt = (ms) => (ms / 1000).toFixed(2) + 's';

// Async sampler -- execSync would block Node's event loop and stall CDP reads.
const PS = 'powershell -NoProfile -Command "Get-CimInstance Win32_Process '
         + '-Filter \\"Name=\'chrome.exe\'\\" | Select-Object -ExpandProperty CommandLine"';
const RE = /utility-sub-type=printing\.mojom\.PrintCompositor/;
let maxCompositors = 0, samples = 0, sampling = false;
function sampleCompositors() {
  if (sampling) return;
  sampling = true;
  exec(PS, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (err, raw) => {
    sampling = false;
    if (err) return;
    const n = raw.split(/\r?\n/).filter((l) => RE.test(l)).length;
    samples++;
    if (n > maxCompositors) maxCompositors = n;
  });
}

async function prepare(page, label) {
  page.setDefaultTimeout(0);
  page.on('pageerror', (e) => console.error(`[${label} pageerror]`, e.message));
  await page.emulateMediaType('print');
  const t0 = Date.now();
  await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'load' });
  const tLoaded = Date.now();
  await page.evaluate(() => { window.PagedConfig = window.PagedConfig || {}; window.PagedConfig.auto = false; });
  await page.addScriptTag({ path: pagedScriptPath });
  await page.addScriptTag({ path: detachPagesPath });
  await page.evaluate(() => { window.PagedPolyfill.preview(); });
  await page.waitForSelector('.pagedjs_pages');
  const tRendered = Date.now();
  const pageCount = await page.evaluate(
    () => document.querySelectorAll('.pagedjs_pages > .pagedjs_page').length);
  console.log(`  [${label}] load ${fmt(tLoaded - t0)}, render ${fmt(tRendered - tLoaded)}, ${pageCount} pages`);
  return pageCount;
}

async function generate(page, range, label) {
  const t0 = Date.now();
  const buf = await page.pdf({
    printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: range,
  });
  const ms = Date.now() - t0;
  console.log(`  [${label}] generate ${fmt(ms)} (${range}), ${(buf.length / 1048576).toFixed(1)} MB`);
  return ms;
}

console.log(`=== mode: ${mode}, shards: ${shardCount} ===`);
const browsers = [];
let pages = [];
if (mode === 'tabs') {
  const b = await puppeteer.launch({ headless: true, args: ARGS });
  browsers.push(b);
  for (let i = 0; i < shardCount; i++) pages.push(await b.newPage());
} else {
  const launched = await Promise.all(
    Array.from({ length: shardCount }, () => puppeteer.launch({ headless: true, args: ARGS })));
  browsers.push(...launched);
  for (const b of launched) pages.push(await b.newPage());
}

const counts = await Promise.all(pages.map((p, i) => prepare(p, `shard ${i}`)));
const total = counts[0];
const slice = Math.ceil(total / shardCount);
const ranges = Array.from({ length: shardCount }, (_, i) =>
  `${i * slice + 1}-${Math.min((i + 1) * slice, total)}`);

const sampler = setInterval(sampleCompositors, 400);
const tWall = Date.now();
const gens = await Promise.all(pages.map((p, i) => generate(p, ranges[i], `shard ${i}`)));
const wall = Date.now() - tWall;
clearInterval(sampler);

const slowest = Math.max(...gens);
const fastest = Math.min(...gens);
console.log(`\n  generate wall clock (all shards)  : ${fmt(wall)}`);
console.log(`  per-shard generate spread        : ${fmt(fastest)} .. ${fmt(slowest)}  (spread ${fmt(slowest - fastest)})`);
console.log(`  peak concurrent PrintCompositors : ${maxCompositors} for ${shardCount} shards (${samples} samples)`);

for (const b of browsers) await b.close();
