// Memory footprint of one Chromium browser process tree during a single
// book-PDF render. Runs the full pipeline (load + render + generate)
// against the same paged.js + detach-pages setup probe-parallel.mjs uses,
// then walks the chrome.exe process tree (browser + renderer + GPU +
// utility) at 500 ms intervals via sample-mem.ps1 and reports the peak
// and phase-aligned snapshots.
//
// "Private bytes" is the per-process counter for everything writable that
// isn't file-backed: heap (V8, Blink, native, Skia buffers), stacks, BSS,
// copy-on-write dirty pages from DLLs. It excludes DLL .text segments and
// read-only const data -- exactly what the question asked for. It also
// misses inter-process shared memory regions (GPU buffers, IPC ring
// buffers), so the real OS commitment is moderately larger; the working-
// set column is included as a cross-check.
//
// Usage:
//   node probe-memory.mjs [path/to/book.html]
//                         [--no-gpu] [--in-process-gpu] [--single-process]
//
// --no-gpu adds `--disable-gpu --disable-software-rasterizer` to the
// Chromium launch args, to test whether the GPU process can be killed
// in headless and whether the PDF output stays the same.
//
// --in-process-gpu folds the GPU work into the browser process instead
// of a separate one. Less aggressive than --single-process; compatible
// with normal rendering.
//
// --single-process collapses all Chromium subprocesses (renderer, GPU,
// utility, PrintCompositor) into the browser process. Drops the
// sandbox; only safe with trusted input (which is our case: we render
// local, generated HTML). Known to be unstable in modern headless.

import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let inputArg = null;
let disableGpu = false;
let inProcessGpu = false;
let singleProcess = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--no-gpu') disableGpu = true;
  else if (a === '--in-process-gpu') inProcessGpu = true;
  else if (a === '--single-process') singleProcess = true;
  else if (!inputArg && !a.startsWith('-')) inputArg = a;
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

const pagedScriptPath = resolve(__dirname, '..', 'docs', 'lib', 'paged.browser.js');
const detachPagesPath = resolve(__dirname, 'detach-pages.js');
const samplerPath     = resolve(__dirname, 'sample-mem.ps1');
for (const p of [pagedScriptPath, detachPagesPath, samplerPath]) {
  if (!existsSync(p)) {
    console.error(`missing required file: ${p}`);
    process.exit(1);
  }
}

const tagParts = [];
if (singleProcess) tagParts.push('single');
if (inProcessGpu)  tagParts.push('ipgpu');
if (disableGpu)    tagParts.push('nogpu');
const tag = tagParts.length ? tagParts.join('-') : 'baseline';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = resolve(__dirname, 'results', `probe-memory-${tag}-${stamp}`);
mkdirSync(outDir, { recursive: true });

const fmtMs = (ms) => (ms / 1000).toFixed(2) + 's';
const fmtMB = (b) => (b / 1024 / 1024).toFixed(0).padStart(5) + ' MB';

const chromeArgs = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--allow-file-access-from-files',
];
if (disableGpu)    chromeArgs.push('--disable-gpu', '--disable-software-rasterizer');
if (inProcessGpu)  chromeArgs.push('--in-process-gpu');
if (singleProcess) chromeArgs.push('--single-process');

console.log(`[probe] input         : ${inputPath}`);
console.log(`[probe] output        : ${outDir}`);
console.log(`[probe] disable-gpu   : ${disableGpu}`);
console.log(`[probe] in-process-gpu: ${inProcessGpu}`);
console.log(`[probe] single-process: ${singleProcess}`);

const t0 = Date.now();

const browser = await puppeteer.launch({
  headless: true,
  args: chromeArgs,
});
const browserPid = browser.process().pid;
console.log(`[probe] browser pid: ${browserPid}`);

const samples = [];
const sampler = spawn('powershell', [
  '-NoProfile', '-NonInteractive',
  '-ExecutionPolicy', 'Bypass',
  '-File', samplerPath,
  '-RootPid', String(browserPid),
  '-IntervalMs', '500',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let samplerBuf = '';
sampler.stdout.on('data', (chunk) => {
  samplerBuf += chunk.toString('utf8');
  let nl;
  while ((nl = samplerBuf.indexOf('\n')) !== -1) {
    const line = samplerBuf.slice(0, nl).trim();
    samplerBuf = samplerBuf.slice(nl + 1);
    if (!line) continue;
    try {
      const s = JSON.parse(line);
      if (!s.done) samples.push({ ...s, t_elapsed: Date.now() - t0 });
    } catch {
      console.error('[probe] bad sampler line:', line.slice(0, 100));
    }
  }
});
sampler.stderr.on('data', (d) => process.stderr.write(`[sampler-err] ${d}`));

let exitCode = 0;
const phase = {};
const pdfInfo = {};
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  page.on('pageerror',     (e) => console.error('[page error]', e.message));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    console.error('[request failed]', r.url(), f && f.errorText);
  });

  await page.emulateMediaType('print');

  await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'load' });
  phase.afterLoad = Date.now() - t0;

  await page.evaluate(() => {
    window.PagedConfig = window.PagedConfig || {};
    window.PagedConfig.auto = false;
  });
  await page.addScriptTag({ path: pagedScriptPath });
  await page.addScriptTag({ path: detachPagesPath });

  await page.evaluate(() => {
    if (!window.PagedPolyfill) throw new Error('paged.js bundle missing');
    window.PagedPolyfill.preview();
  });
  await page.waitForSelector('.pagedjs_pages');
  phase.afterRender = Date.now() - t0;

  const pdfBytes = await page.pdf({
    printBackground:     true,
    displayHeaderFooter: false,
    preferCSSPageSize:   true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  phase.afterGenerate = Date.now() - t0;
  pdfInfo.bytes  = pdfBytes.length;
  pdfInfo.sha256 = createHash('sha256').update(pdfBytes).digest('hex');
  pdfInfo.path   = join(outDir, 'output.pdf');
  writeFileSync(pdfInfo.path, pdfBytes);
} catch (err) {
  console.error('[probe error]', err);
  exitCode = 1;
} finally {
  // Give the sampler one more tick to capture the post-generate peak
  // before we tear the browser down (process exit collapses memory).
  await new Promise((r) => setTimeout(r, 700));
  sampler.kill();
  await browser.close();
}

const total = Date.now() - t0;

console.log();
console.log('phase stamps:');
console.log(`  after load    : +${fmtMs(phase.afterLoad     ?? 0)}`);
console.log(`  after render  : +${fmtMs(phase.afterRender   ?? 0)}`);
console.log(`  after generate: +${fmtMs(phase.afterGenerate ?? 0)}`);
console.log(`  total         : +${fmtMs(total)}`);

if (samples.length === 0) {
  console.error('[probe] no samples captured -- sampler may have failed.');
  process.exit(exitCode || 1);
}

writeFileSync(join(outDir, 'samples.json'), JSON.stringify(samples, null, 2));

const snapshotAt = (elapsedMs) => {
  let last = null;
  for (const s of samples) {
    if (s.t_elapsed > elapsedMs) break;
    last = s;
  }
  return last;
};

const snapLoad     = snapshotAt(phase.afterLoad);
const snapRender   = snapshotAt(phase.afterRender);
const snapGenerate = snapshotAt(phase.afterGenerate);

let peak = samples[0];
for (const s of samples) if (s.total_private > peak.total_private) peak = s;

const reportSnap = (label, s) => {
  if (!s) { console.log(`  ${label}: (no sample)`); return; }
  console.log(`  ${label}: ${fmtMB(s.total_private)} private  ${fmtMB(s.total_ws)} ws  (${s.n} procs, +${fmtMs(s.t_elapsed)})`);
};

console.log();
console.log('phase-aligned memory snapshots (whole process tree):');
reportSnap('after load    ', snapLoad);
reportSnap('after render  ', snapRender);
reportSnap('after generate', snapGenerate);
console.log();
console.log('peak:');
reportSnap('              ', peak);

const top = peak.rows.slice().sort((a, b) => b.private - a.private);
console.log();
console.log('top processes at peak:');
for (const r of top) {
  const role = r.role.padEnd(20);
  console.log(`  ${role} pid=${String(r.pid).padEnd(6)} ${fmtMB(r.private)} private  ${fmtMB(r.ws)} ws`);
}

// Did a gpu-process ever appear across all samples?
const gpuSeen = samples.some((s) => s.rows.some((r) => r.role === 'gpu-process'));
console.log();
console.log(`gpu-process seen in any sample: ${gpuSeen ? 'YES' : 'NO'}`);

console.log();
console.log('pdf output:');
console.log(`  path  : ${pdfInfo.path ?? '(not written)'}`);
console.log(`  bytes : ${pdfInfo.bytes ?? 0}`);
console.log(`  sha256: ${pdfInfo.sha256 ?? '(n/a)'}`);

process.exit(exitCode);
