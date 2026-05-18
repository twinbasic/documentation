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
    afterPageLayout(pageElement /* , page, breakToken */) {
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
  console.log('[detach-pages] handler registered');
})();
