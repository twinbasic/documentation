// Per-allocator memory breakdown for the renderer process during a
// book-PDF render. Drives Chromium's memory-infra tracing system to
// capture detailed process memory dumps (PMDs) at three points:
// post-render, mid-generate, post-generate. Reports the dominant
// allocator buckets per dump so we can see where the renderer's
// ~1.9 GB goes beyond the V8 heap.
//
// Dumps come from MemoryDumpManager inside Chromium. Categories cover
// V8 heap, Blink GC (Oilpan), partition_alloc pools, Skia caches,
// discardable memory, malloc, IPC channel buffers, etc. -- the same
// data chrome://memory-internals would show if we weren't headless.
//
// --gc-passes N inserts an extra dump point between post-render and the
// generate phase: triggers N V8 gc() calls (requires
// --js-flags=--expose-gc, added automatically) plus CDP
// Memory.simulatePressureNotification to coax Chromium into freeing
// caches, then dumps. Tests whether the ~272 MB blink_gc growth
// during generate can be pre-released. N=0 skips explicit gc() and
// only fires the pressure notification. --gc is shorthand for
// --gc-passes 5.
//
// Usage:
//   node probe-renderer-mem.mjs [path/to/book.html]
//                               [--gc | --gc-passes N]

import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let inputArg = null;
let gcPasses = -1;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--gc') gcPasses = 5;
  else if (a === '--gc-passes') gcPasses = parseInt(args[++i], 10);
  else if (!inputArg && !a.startsWith('-')) inputArg = a;
  else { console.error(`unknown arg: ${a}`); process.exit(2); }
}
const forceGc = gcPasses >= 0;
if (forceGc && !Number.isFinite(gcPasses)) {
  console.error(`--gc-passes requires a non-negative integer, got ${args[args.indexOf('--gc-passes')+1]}`);
  process.exit(2);
}

const inputPath = inputArg
  ? resolve(process.cwd(), inputArg)
  : resolve(__dirname, '..', 'docs', '_site-pdf', 'book.html');
if (!existsSync(inputPath)) {
  console.error(`book HTML not found: ${inputPath}`);
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
const outDir = resolve(__dirname, 'results', `probe-renderer-mem-${stamp}`);
mkdirSync(outDir, { recursive: true });

const fmtMB = (b) => {
  if (b === null || b === undefined || Number.isNaN(b)) return '   ? MB';
  return (b / 1024 / 1024).toFixed(0).padStart(5) + ' MB';
};

console.log(`[probe] input    : ${inputPath}`);
console.log(`[probe] output   : ${outDir}`);
console.log(`[probe] gc-passes: ${forceGc ? gcPasses : '(off)'}`);

// Match production launch args (docs/render-book.mjs). --expose-gc
// is added when --gc is set so window.gc() inside the page works;
// pinning V8 to that flag has no measurable cost on render or generate.
const chromeArgs = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--allow-file-access-from-files',
  '--disable-gpu',
  '--disable-software-rasterizer',
];
if (forceGc) chromeArgs.push('--js-flags=--expose-gc');

const browser = await puppeteer.launch({
  headless: true,
  args: chromeArgs,
});

let exitCode = 0;
const dumpRequests = [];

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

  await page.evaluate(() => {
    window.PagedConfig = window.PagedConfig || {};
    window.PagedConfig.auto = false;
  });
  await page.addScriptTag({ path: pagedScriptPath });
  await page.addScriptTag({ path: detachPagesPath });

  const tracePath = join(outDir, 'trace.json');
  await page.tracing.start({
    path: tracePath,
    screenshots: false,
    categories: ['disabled-by-default-memory-infra'],
  });

  const cdp = await page.createCDPSession();

  const tRender = Date.now();
  await page.evaluate(() => {
    if (!window.PagedPolyfill) throw new Error('paged.js bundle missing');
    window.PagedPolyfill.preview();
  });
  await page.waitForSelector('.pagedjs_pages');
  console.log(`render: ${((Date.now() - tRender) / 1000).toFixed(2)}s`);

  const dumpAt = async (label) => {
    const r = await cdp.send('Tracing.requestMemoryDump', { levelOfDetail: 'detailed' });
    console.log(`  ${label}: guid=${r.dumpGuid} success=${r.success}`);
    dumpRequests.push({ label, guid: r.dumpGuid });
  };

  await dumpAt('post-render');

  if (forceGc) {
    const tGc = Date.now();
    // V8 GC (Oilpan finalizers run in stages; repeated calls progress
    // further through the heap). N=0 skips explicit gc() and tests
    // whether the pressure notification alone is enough.
    const passes = gcPasses;
    await page.evaluate((n) => {
      if (n === 0) return;
      if (typeof gc !== 'function') {
        console.warn('gc() not exposed; --expose-gc missing?');
        return;
      }
      for (let i = 0; i < n; i++) gc();
    }, passes);
    const tAfterGc = Date.now();
    // Coax Chromium into dropping caches across all heaps.
    await cdp.send('Memory.simulatePressureNotification', { level: 'critical' });
    // Chromium GC finalizers are async; give them a beat.
    await new Promise((r) => setTimeout(r, 500));
    console.log(`gc-pass(${passes}): ${((tAfterGc - tGc) / 1000).toFixed(2)}s  total(+pressure): ${((Date.now() - tGc) / 1000).toFixed(2)}s`);
    await dumpAt('post-gc');
  }

  const midTimer = setTimeout(() => { dumpAt('mid-generate').catch(() => {}); }, 25000);

  const tGen = Date.now();
  const pdfBytes = await page.pdf({
    printBackground:     true,
    displayHeaderFooter: false,
    preferCSSPageSize:   true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  clearTimeout(midTimer);
  console.log(`generate: ${((Date.now() - tGen) / 1000).toFixed(2)}s`);

  await dumpAt('post-generate');

  const pdfPath = join(outDir, 'output.pdf');
  writeFileSync(pdfPath, pdfBytes);
  const sha = createHash('sha256').update(pdfBytes).digest('hex');
  console.log(`pdf: ${pdfBytes.length} bytes  sha256=${sha}`);

  await page.tracing.stop();
  console.log(`trace written: ${tracePath}`);

  reportDumps(tracePath, dumpRequests);
} catch (err) {
  console.error('[probe error]', err);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);

function reportDumps(tracePath, requests) {
  const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
  const events = Array.isArray(trace) ? trace : (trace.traceEvents ?? []);

  // In modern Chromium both light and detailed PMDs are ph='v' (lowercase);
  // detailed dumps carry args.dumps.allocators, light ones only
  // process_totals. We want detailed.
  const detailed = events.filter((e) => e.ph === 'v' && e.args?.dumps?.allocators);

  // Group by event id (dump GUID), then order by min timestamp so the
  // dumps in the trace map onto the requested labels by insertion order
  // (Chromium renumbers GUIDs per-trace-session, so the CDP-returned
  // GUID won't match the trace event id; we line them up by order).
  const byId = new Map();
  for (const e of detailed) {
    const k = String(e.id);
    if (!byId.has(k)) byId.set(k, []);
    byId.get(k).push(e);
  }
  const groups = Array.from(byId.entries())
    .map(([id, procs]) => ({ id, ts: Math.min(...procs.map((e) => e.ts)), procs }))
    .sort((a, b) => a.ts - b.ts);

  // Resolve pid -> process_name from metadata events.
  const procName = new Map();
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'process_name' && e.args?.name) {
      procName.set(e.pid, e.args.name);
    }
  }

  console.log(`\nfound ${groups.length} detailed dumps in trace`);
  for (const g of groups) console.log(`  dump ${g.id} @ t=${g.ts}us  (${g.procs.length} processes)`);

  // Match by insertion order: first requested label -> first dump, etc.
  const n = Math.min(requests.length, groups.length);
  for (let i = 0; i < n; i++) {
    reportDump(requests[i].label, groups[i].id, groups[i].procs, procName, events);
  }
  if (groups.length < requests.length) {
    console.log(`\n(only ${groups.length} dumps in trace, expected ${requests.length}; some may have been dropped)`);
  }
}

function reportDump(label, id, procs, procName, allEvents) {
  console.log(`\n=== ${label}  (dump ${id}, ${procs.length} processes) ===`);

  // Detailed dumps in modern Chromium typically don't carry
  // process_totals -- those live in the matching light dump event
  // (same id + pid). Fall back when missing.
  const findTotals = (id, pid, eDetailed) => {
    const t = eDetailed.args?.dumps?.process_totals;
    if (t && (t.private_footprint_bytes || t.peak_resident_set_size)) return t;
    const light = allEvents.find((x) =>
      x.ph === 'v' && String(x.id) === id && x.pid === pid &&
      x.args?.dumps?.process_totals
    );
    return light?.args.dumps.process_totals ?? {};
  };

  const procRows = procs.map((e) => {
    const totals     = findTotals(id, e.pid, e);
    const allocators = e.args?.dumps?.allocators ?? {};
    const resident   = parseHexBytes(totals.peak_resident_set_size);
    const priv       = parseHexBytes(totals.private_footprint_bytes);
    return {
      pid:        e.pid,
      procName:   procName.get(e.pid) ?? '(unknown)',
      resident,
      priv,
      allocators,
    };
  });
  procRows.sort((a, b) => (b.priv ?? 0) - (a.priv ?? 0));

  // Show top processes, deep-dive on the largest.
  for (let i = 0; i < procRows.length; i++) {
    const r = procRows[i];
    const tag = i === 0 ? '*' : ' ';
    console.log(`  ${tag} pid=${String(r.pid).padEnd(6)} ${r.procName.padEnd(20)} private ${fmtMB(r.priv)}  resident ${fmtMB(r.resident)}`);
  }

  // Deep-dive on the renderer with the largest footprint.
  const top = procRows[0];
  if (!top) return;
  console.log(`\n  top process (pid=${top.pid}) allocator breakdown (>= 1 MB):`);
  const rows = [];
  for (const [name, info] of Object.entries(top.allocators)) {
    if (name.includes('/')) continue; // top-level only
    const size = parseHexBytes(info?.attrs?.size?.value);
    if (size == null || size < 1024 * 1024) continue;
    rows.push({ name, size });
  }
  rows.sort((a, b) => b.size - a.size);
  let sum = 0;
  for (const r of rows) {
    sum += r.size;
    console.log(`    ${r.name.padEnd(36)} ${fmtMB(r.size)}`);
  }
  console.log(`    ${'(sum of >=1 MB top-level)'.padEnd(36)} ${fmtMB(sum)}`);

  // Sub-breakdown of the biggest top-level entries (typical: blink_gc, malloc).
  for (const big of rows.slice(0, 3)) {
    const subs = [];
    for (const [name, info] of Object.entries(top.allocators)) {
      if (!name.startsWith(big.name + '/')) continue;
      // Only one level below the parent.
      const sub = name.slice(big.name.length + 1);
      if (sub.includes('/')) continue;
      const size = parseHexBytes(info?.attrs?.size?.value);
      if (size == null || size < 1024 * 512) continue; // 0.5 MB cut-off for subs
      subs.push({ name: sub, size });
    }
    if (subs.length === 0) continue;
    subs.sort((a, b) => b.size - a.size);
    console.log(`\n    ${big.name} sub-breakdown:`);
    for (const s of subs.slice(0, 12)) {
      console.log(`      ${s.name.padEnd(34)} ${fmtMB(s.size)}`);
    }
  }
}

function parseHexBytes(s) {
  if (s == null) return null;
  // memory-infra sizes are hex strings, sometimes with a leading 0x.
  const n = parseInt(String(s), 16);
  return Number.isFinite(n) ? n : null;
}
