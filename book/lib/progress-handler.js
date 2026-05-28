// Per-page progress handler for the paged.js render phase. Emits a
// `[render-progress] page=N elapsed=Ns` line on each afterPageLayout so
// render-book.mjs can show a live page counter -- restoring the visible
// progress pagedjs-cli used to show via its ora spinner, without taking
// on a spinner dependency.
//
// Kept deliberately minimal: this is the production path, not the perf
// harness. perf/timing-handler.js does the same hook but also retains
// per-page detail on window.__pagedTiming for offline analysis; we
// don't need any of that here.
(() => {
  const start = performance.now();
  class ProgressHandler extends Paged.Handler {
    constructor(chunker, polisher, caller) {
      super(chunker, polisher, caller);
      this.count = 0;
    }
    afterPageLayout(_pageElement, _page, _breakToken) {
      this.count++;
      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      console.log(`[render-progress] page=${this.count} elapsed=${elapsed}`);
    }
  }
  Paged.registerHandlers(ProgressHandler);
})();
