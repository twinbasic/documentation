// Paged.Handler that physically removes each finalized page from the
// layout tree as soon as paged.js finishes laying it out, then restores
// them in original order at afterRendered before page.pdf() runs.
//
// The hot path in render is Page.create's getBoundingClientRect on the
// freshly-inserted page area. That call forces a synchronous layout
// flush which, even with display:none on previous pages, scales with
// the .pagedjs_pages sibling count because Chromium's per-page
// style/selector resolution walks the sibling list regardless of
// display state. On a 1638-page book this is the dominant O(n)
// per-page cost.
//
// `display: none` removes the subtree from layout but NOT from style
// resolution. Physically detaching the previous pages from the DOM
// collapses the layout flush from ~8 ms/page (growing) to ~0.7 ms/page
// (flat). See perf/README.md "Finding the residual O(n)" for the
// supporting profile diff.
//
// Implementation notes:
// - The chunker passes `lastPage.element` to Page.create for ordered
//   insertion (paged.browser.js:3201). That element has to stay in
//   the DOM, so we detach one page behind: when page N+1 finalizes,
//   we remove page N (the previous _pendingDetach) and stash page N+1
//   as the new pending one.
// - At afterRendered we also detach the last-in-DOM page, then
//   re-append everyone in original index order so page.pdf() reads a
//   correctly-ordered document.
// - CSS counters do not accumulate across detached pages, so the
//   book's @bottom-right page numbers can no longer use
//   `content: counter(page)`. We piggyback on the Counters handler
//   in the vendored paged.js bundle: it writes a `--page-num`
//   custom property to each page wrapper as part of afterPageLayout,
//   and print.css reads it via `content: var(--page-num)`.
// - Named strings (string-set / string()) survive because Chromium
//   tracks named-string state at the chunker level, not by re-walking
//   the DOM. Verified empirically -- chapter titles in @top-right
//   render correctly after detach.

(() => {
  class DetachPagesHandler extends Paged.Handler {
    constructor(chunker, polisher, caller) {
      super(chunker, polisher, caller);
      this._detached = [];        // pages removed from DOM, in finalize order
      this._pendingDetach = null; // most recent finalized page, still in DOM
      this._pagesArea = null;     // captured at first finalizePage
    }
    finalizePage(pageElement /* , page, breakToken, chunker */) {
      if (this._pendingDetach) {
        const page = this._pendingDetach;
        if (page.parentNode) {
          page.parentNode.removeChild(page);
          this._detached.push(page);
        }
      }
      this._pendingDetach = pageElement;
      if (!this._pagesArea) {
        this._pagesArea = pageElement.parentNode;
      }
    }
    afterRendered(/* pages */) {
      // Detach the last keeper too so we can rebuild order from scratch.
      if (this._pendingDetach && this._pendingDetach.parentNode) {
        this._detached.push(this._pendingDetach);
        this._pendingDetach.parentNode.removeChild(this._pendingDetach);
      }
      // Re-append in finalize order, which is document order.
      if (this._pagesArea) {
        for (const page of this._detached) {
          this._pagesArea.appendChild(page);
        }
      }
      this._detached.length = 0;
      this._pendingDetach = null;
      this._pagesArea = null;
    }
  }
  Paged.registerHandlers(DetachPagesHandler);
  console.log('[detach-pages] handler registered (aggressive-detach variant)');
})();
