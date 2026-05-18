// Wraps the in-page DOM accessors that can force a synchronous layout
// or style recalculation, so we can count how many times each one is
// called over a render and how long each call takes on average. The
// idea: a single call's wall-clock time tells us whether the call
// actually triggered a recompute (millisecond range) or hit cached
// state (sub-microsecond).
//
// Loaded as an --additional-script BEFORE the paged.js bundle would
// ideally be cleanest, but the harness loads paged.js first; we then
// register a Paged.Handler so we can dump results at afterRendered.
//
// Run with: node measure.mjs --instrument [--detach-pages]
// Compare runs with and without --detach-pages to see whether the
// detach handler changed the count of layout-flushing calls, the
// per-call cost, or both.

(() => {
  const stats = {};
  const props = [
    'getComputedStyle',
    'getBoundingClientRect',
    'offsetWidth',
    'offsetHeight',
    'offsetTop',
    'offsetLeft',
    'clientWidth',
    'clientHeight',
    'scrollWidth',
    'scrollHeight',
  ];
  for (const p of props) stats[p] = { count: 0, totalNs: 0, maxNs: 0 };

  function record(name, ns) {
    const s = stats[name];
    s.count++;
    s.totalNs += ns;
    if (ns > s.maxNs) s.maxNs = ns;
  }

  // performance.now() returns milliseconds with sub-ms precision (Chrome
  // clamps to ~5us by default; precise-memory flag also raises clock).
  const now = () => performance.now();

  // window.getComputedStyle
  const origGCS = window.getComputedStyle.bind(window);
  window.getComputedStyle = function (el, pseudo) {
    const t = now();
    const r = origGCS(el, pseudo);
    record('getComputedStyle', (now() - t) * 1e6);
    return r;
  };

  // Element.prototype.getBoundingClientRect
  const origGBCR = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const t = now();
    const r = origGBCR.call(this);
    record('getBoundingClientRect', (now() - t) * 1e6);
    return r;
  };

  // offsetWidth/Height/Top/Left and clientWidth/Height and scrollWidth/Height
  // live as getters on HTMLElement.prototype (or Element.prototype for
  // some). Wrap each one.
  function wrapGetter(proto, prop) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc || !desc.get) return false;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        const t = now();
        const r = desc.get.call(this);
        record(prop, (now() - t) * 1e6);
        return r;
      },
    });
    return true;
  }
  for (const p of ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft']) {
    if (!wrapGetter(HTMLElement.prototype, p)) wrapGetter(Element.prototype, p);
  }
  for (const p of ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight']) {
    if (!wrapGetter(Element.prototype, p)) wrapGetter(HTMLElement.prototype, p);
  }

  window.__flushOpStats = stats;

  class InstrumentHandler extends Paged.Handler {
    afterRendered(pages) {
      const total = pages.length;
      const rows = Object.entries(stats)
        .map(([name, s]) => ({
          name,
          count: s.count,
          totalMs: s.totalNs / 1e6,
          perPage: s.count / total,
          avgUs: s.count ? (s.totalNs / s.count) / 1000 : 0,
          maxUs: s.maxNs / 1000,
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
      console.log(`[instrument] flush-op stats over ${total} pages:`);
      console.log('  op                          count   total_ms   per_page   avg_us   max_us');
      console.log('  --                          -----   --------   --------   ------   ------');
      for (const r of rows) {
        console.log(
          '  ' + r.name.padEnd(24) +
          r.count.toString().padStart(10) +
          r.totalMs.toFixed(1).padStart(11) +
          r.perPage.toFixed(2).padStart(11) +
          r.avgUs.toFixed(2).padStart(9) +
          r.maxUs.toFixed(2).padStart(9)
        );
      }
      // also stash on window in JSON form for the harness to pull
      window.__flushOpReport = rows;
    }
  }
  Paged.registerHandlers(InstrumentHandler);
  console.log('[instrument] flush-op accessors wrapped');
})();
