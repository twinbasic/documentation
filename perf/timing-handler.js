// In-page paged.js handler that records per-page timings on
// window.__pagedTiming. Loaded by measure.mjs after paged.polyfill.js
// and before PagedPolyfill.preview() is invoked.
(() => {
  window.__pagedTiming = {
    renderStart: performance.now(),
    pages: [],
    phases: {},
  };

  const mark = (name) => {
    window.__pagedTiming.phases[name] = performance.now() - window.__pagedTiming.renderStart;
  };
  const heap = () =>
    (performance.memory && performance.memory.usedJSHeapSize) || 0;

  class TimingHandler extends Paged.Handler {
    constructor(chunker, polisher, caller) {
      super(chunker, polisher, caller);
    }
    beforeParsed(_content) { mark('beforeParsed'); }
    afterParsed(_parsed)   { mark('afterParsed'); }
    beforePageLayout(_page) {
      this._tStart = performance.now();
      this._heapStart = heap();
    }
    afterPageLayout(_pageElement, _page, _breakToken) {
      const now = performance.now();
      const dur = now - this._tStart;
      const heapEnd = heap();
      const idx = window.__pagedTiming.pages.length;
      const elapsed = now - window.__pagedTiming.renderStart;
      window.__pagedTiming.pages.push({
        idx,
        dur,
        heapStart: this._heapStart,
        heapEnd,
        elapsed,
      });
      // Stream each page out so it shows up live during long renders.
      console.log(
        `[paged-timing] page=${idx} dur=${dur.toFixed(1)}ms ` +
        `heap=${(heapEnd / 1024 / 1024).toFixed(1)}MB ` +
        `elapsed=${(elapsed / 1000).toFixed(2)}s`
      );
    }
    afterRendered(pages) {
      const total = performance.now() - window.__pagedTiming.renderStart;
      window.__pagedTiming.totalMs = total;
      window.__pagedTiming.pageCount = pages.length;
      mark('afterRendered');
      console.log(
        `[paged-timing] DONE pages=${pages.length} total=${(total / 1000).toFixed(2)}s`
      );
    }
  }
  Paged.registerHandlers(TimingHandler);
})();
