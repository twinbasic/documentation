// Paged.Handler that hides each page from the layout tree as soon as
// paged.js finishes laying it out, then restores them all at
// afterRendered before page.pdf() runs.
//
// The hot path in render is Layout.findOverflow walking the just-rendered
// fragment with getBoundingClientRect on every node. Each call forces a
// synchronous layout, and the layout cost scales with the live layout
// tree -- every previously-rendered page, all still attached. That's the
// O(n) per-page that produces the O(n^2) total.
//
// `display: none` removes a subtree from the layout tree entirely (not
// just visually hidden -- the browser skips it during layout). After
// hiding each completed page, the next page's overflow walk only flushes
// layout for the current page's fragment.

(() => {
  class DetachPagesHandler extends Paged.Handler {
    constructor(chunker, polisher, caller) {
      super(chunker, polisher, caller);
      this._hidden = [];
    }
    // Hook into finalizePage rather than afterPageLayout. The chunker
    // fires beforePageLayout -> afterPageLayout -> finalizePage per
    // page; AtPage's own finalizePage handler does getComputedStyle
    // reads and `el.style["grid-template-columns"] = ...` writes on
    // the page's margin-box children. Doing that on a display:none
    // subtree takes ~8 ms/page in Chromium (no cached layout box,
    // style resolution re-cascades). Hiding in finalizePage instead
    // means we run *after* AtPage on the same page (because our
    // handler registers last via --additional-script), so AtPage
    // touches visible elements; the page is hidden immediately after
    // for the next chunker.findOverflow.
    finalizePage(pageElement /* , page, breakToken, chunker */) {
      pageElement.style.display = 'none';
      this._hidden.push(pageElement);
    }
    afterRendered(/* pages */) {
      for (const el of this._hidden) {
        el.style.display = '';
      }
      this._hidden.length = 0;
    }
  }
  Paged.registerHandlers(DetachPagesHandler);
  console.log('[detach-pages] handler registered (finalizePage variant)');
})();
