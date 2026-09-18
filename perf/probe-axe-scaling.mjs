// Node-count scaling curve for one axe audit.
//
// Instrument 3 of builder/PLAN-axe-perf.md. Real pages cluster near 2.4k
// elements, so we have one point on an unknown curve. D2 (memoizee's
// reference-identity normalizer degrades to a linear scan) and D4
// (generateSelector queries the document per ancestor level) both predict
// super-linear growth; a large constant would not. This is the cheapest test
// that tells them apart.
//
// Method: take a real page, replicate the contents of #main-content until the
// element count hits each target, and audit each size. Replication keeps the
// DOM's character -- same stylesheets, same markup shapes, same ratio of code
// spans to prose -- which a hand-built synthetic page would not. `id` and
// same-page `href="#..."` are suffixed per copy so duplicated ids do not
// perturb the id-resolving ARIA rules.
//
// The generated pages are written NEXT TO the source page (relative asset
// paths must keep resolving) and are removed in a finally block. They are
// never left in the tree: check_links.mjs crawls _site-offline and would flag
// them.
//
// The probe records DOM operation counts alongside time, which is the part
// that actually discriminates. If the counts scale linearly while the time
// does not, the extra time is not work on the DOM -- it is axe's own
// bookkeeping, i.e. D2.
//
// Usage (run from perf/ or the repo root):
//   node probe-axe-scaling.mjs
//   node probe-axe-scaling.mjs --targets 2000,4000,8000,16000 --iters 3
//   node probe-axe-scaling.mjs --rules color-contrast      # curve for one rule
//   node probe-axe-scaling.mjs --json scaling.json
//
// Requires build.bat to have produced an up-to-date docs/_site-offline/.

import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinCpuIfWindows } from './pin-cpu.mjs';
import {
  AXE_RUN_OPTIONS,
  DEFAULT_ROOT_DIR,
  VIEWPORTS,
  axeVersion,
  gotoPage,
  launchBrowser,
  newAuditPage,
  readAxeSource,
} from '../scripts/lib/axe-scan.mjs';

pinCpuIfWindows({ toolName: 'probe-axe-scaling' });

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTRUMENT = readFileSync(join(HERE, 'instrument-axe-dom.js'), 'utf8');

// ---- CLI -------------------------------------------------------------
let sourcePage = '/tB/Core/Select-Case.html';
let targetsArg = '';
let theme = 'light';
let viewport = 'desktop';
let iters = 5;
let rulesArg = '';
let rootDir = DEFAULT_ROOT_DIR;
let jsonOut = null;
let keep = false;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--page') sourcePage = args[++i];
  else if (a === '--targets') targetsArg = args[++i];
  else if (a === '--theme') theme = args[++i];
  else if (a === '--viewport') viewport = args[++i];
  else if (a === '--iters') iters = parseInt(args[++i], 10);
  else if (a === '--rules') rulesArg = args[++i];
  else if (a === '--root-dir') rootDir = resolve(args[++i]);
  else if (a === '--json') jsonOut = args[++i];
  else if (a === '--keep') keep = true;
  else if (a === '--no-affinity') { /* handled by the relaunch shim */ }
  else if (a === '-h' || a === '--help') {
    console.error('usage: node probe-axe-scaling.mjs [--page P] [--targets N,N,N] [--iters N]');
    console.error('                                  [--rules a,b] [--theme T] [--viewport V]');
    console.error('                                  [--json FILE] [--keep] [--no-affinity]');
    process.exit(0);
  } else {
    console.error('unknown arg: ' + a);
    process.exit(2);
  }
}

const ruleIds = rulesArg ? rulesArg.split(',').map(s => s.trim()).filter(Boolean) : [];
const runOptions = ruleIds.length
  ? { runOnly: { type: 'rule', values: ruleIds } }
  : AXE_RUN_OPTIONS;

// ---- Setup -----------------------------------------------------------
const axeSource = readAxeSource({ minified: false });
const browser = await launchBrowser();
const page = await newAuditPage(browser);
await page.setViewport(VIEWPORTS[viewport]);

const sourceDir = posix.dirname(sourcePage);
const written = [];

function tempPath(label) {
  return posix.join(sourceDir, `_perf-synthetic-${label}.html`);
}

try {
  // Measure the source page: how many elements are chrome (nav, header,
  // footer) and how many come from one copy of the content.
  await gotoPage(page, { rootDir, filePath: sourcePage, theme });
  const shape = await page.evaluate(() => {
    const host = document.querySelector('#main-content');
    if (!host) throw new Error('no #main-content on this page');
    return {
      total: document.getElementsByTagName('*').length,
      content: host.getElementsByTagName('*').length,
      template: host.innerHTML,
    };
  });
  const chrome = shape.total - shape.content;

  console.error(`[scaling] axe-core ${axeVersion()}  ${sourcePage} [${theme}, ${viewport}]`);
  console.error(`[scaling] source: ${shape.total} elements = ${chrome} chrome + ${shape.content} content`);

  // Default targets: the source page's own size, then doublings. Anything
  // below `chrome` is unreachable by replication, so the low end is bounded
  // by the theme's nav sidebar, not by choice.
  const targets = targetsArg
    ? targetsArg.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean)
    : [shape.total, shape.total * 2, shape.total * 4, shape.total * 8]
        .map(n => Math.round(n));
  const reachable = targets.filter(t => t > chrome);
  if (reachable.length < targets.length) {
    console.error(`[scaling] dropping targets at or below the ${chrome}-element page chrome: ` +
      targets.filter(t => t <= chrome).join(', '));
  }
  console.error(`[scaling] targets: ${reachable.join(', ')}  (${iters} iters each)`);
  console.error('');

  const rows = [];
  for (const target of reachable) {
    const copies = Math.max(1, Math.round((target - chrome) / shape.content));

    // Build the page in the DOM rather than by string-splicing the file:
    // locating the #main-content element's closing tag textually is exactly
    // the kind of thing that silently produces malformed HTML.
    const html = await page.evaluate((template, n) => {
      const host = document.querySelector('#main-content');
      let out = '';
      for (let i = 0; i < n; i++) {
        out += template
          .replace(/\bid="([^"]+)"/g, (_m, id) => `id="${id}--c${i}"`)
          .replace(/\bhref="#([^"]+)"/g, (_m, id) => `href="#${id}--c${i}"`);
      }
      host.innerHTML = out;
      return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    }, shape.template, copies);

    const rel = tempPath(String(target));
    const abs = join(rootDir, rel);
    writeFileSync(abs, html);
    written.push(abs);

    await gotoPage(page, { rootDir, filePath: rel, theme });
    await page.evaluate(INSTRUMENT);
    await page.evaluate(axeSource);

    const r = await page.evaluate(async (opts, n) => {
      await axe.run(document, opts);           // discard: lazy compile + warm caches
      window.__axeDomStats.reset();
      const t0 = performance.now();
      for (let i = 0; i < n; i++) await axe.run(document, opts);
      const ms = (performance.now() - t0) / n;
      const s = window.__axeDomStats.read();
      for (const k of Object.keys(s)) {
        s[k].count = Math.round(s[k].count / n);
        s[k].chars = Math.round(s[k].chars / n);
      }
      return { ms, stats: s, elements: document.getElementsByTagName('*').length };
    }, runOptions, iters);

    rows.push({ target, copies, elements: r.elements, ms: r.ms, stats: r.stats });
    console.error(`  ${String(r.elements).padStart(7)} elements (${String(copies).padStart(3)} copies)  ${r.ms.toFixed(1).padStart(8)} ms`);
  }

  // ---- Report --------------------------------------------------------
  // Least-squares fit of log(ms) = k*log(n) + c. k is the exponent: ~1.0
  // linear, ~2.0 quadratic. Reported with R^2 so a bad fit is visible rather
  // than quietly producing a confident-looking number.
  function fitExponent(xs, ys) {
    const lx = xs.map(Math.log), ly = ys.map(Math.log);
    const n = lx.length;
    const mx = lx.reduce((a, b) => a + b, 0) / n;
    const my = ly.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (lx[i] - mx) * (ly[i] - my);
      sxx += (lx[i] - mx) ** 2;
      syy += (ly[i] - my) ** 2;
    }
    const k = sxy / sxx;
    const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
    return { k, r2 };
  }

  const els = rows.map(r => r.elements);
  const METRICS = [
    ['ms', r => r.ms],
    ['gCS', r => r.stats.getComputedStyle.count],
    ['gPV', r => r.stats.getPropertyValue.count],
    ['gBCR', r => r.stats.getBoundingClientRect.count],
    ['qSA', r => r.stats.querySelectorAll.count],
    ['oHTML KB', r => r.stats.outerHTML.chars / 1024],
  ];

  const pad = (s, w = 12) => String(s).padStart(w);
  console.log('');
  console.log(`${sourcePage} replicated [${theme}, ${viewport}] -- axe-core ${axeVersion()}`);
  console.log(ruleIds.length ? `rules: ${ruleIds.join(', ')}` : 'rules: production set');
  console.log('');
  console.log('elements'.padStart(10) + METRICS.map(([n]) => pad(n)).join('') + pad('us/element'));
  console.log('-'.repeat(10 + 12 * (METRICS.length + 1)));
  for (const r of rows) {
    console.log(
      pad(r.elements, 10) +
      METRICS.map(([n, f]) => pad(n === 'ms' || n === 'oHTML KB' ? f(r).toFixed(1) : Math.round(f(r)))).join('') +
      pad(((r.ms * 1000) / r.elements).toFixed(1))
    );
  }

  console.log('');
  console.log('Fitted exponent k in  metric = a * elements^k   (1.0 = linear, 2.0 = quadratic)');
  console.log('');
  console.log('metric'.padEnd(12) + pad('k') + pad('R^2'));
  console.log('-'.repeat(12 + 24));
  const fits = {};
  for (const [name, f] of METRICS) {
    const ys = rows.map(f);
    if (ys.some(y => y <= 0)) { console.log(name.padEnd(12) + pad('--') + pad('(zero)')); continue; }
    const { k, r2 } = fitExponent(els, ys);
    fits[name] = { k, r2 };
    console.log(name.padEnd(12) + pad(k.toFixed(3)) + pad(r2.toFixed(4)));
  }

  console.log('');
  console.log('Read the ms row against the operation rows. Operations linear (k~1) with ms');
  console.log('super-linear (k>1) means the extra cost is not DOM work -- it is axe\'s own');
  console.log('bookkeeping, which is what D2 predicts. Both super-linear points at D4.');

  if (jsonOut) {
    writeFileSync(resolve(jsonOut), JSON.stringify({
      axeCore: axeVersion(), sourcePage, theme, viewport, iters,
      chrome, contentPerCopy: shape.content, rules: ruleIds, rows, fits,
    }, null, 2));
    console.log('');
    console.log(`raw: ${resolve(jsonOut)}`);
  }
} finally {
  await browser.close();
  if (!keep) {
    for (const f of written) {
      try { rmSync(f, { force: true }); } catch { /* best effort */ }
    }
  } else {
    console.error(`[scaling] --keep: left ${written.length} generated page(s) in the tree.`);
    console.error('[scaling] Remove them before running check.bat -- check_links.mjs crawls this tree.');
  }
}
