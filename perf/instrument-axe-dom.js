// Counts the in-page DOM operations that PLAN-axe-perf.md's D1, D3 and D4
// each claim to be the mechanism behind their cost.
//
// Injected by probe-axe-dom.mjs before axe.run; exposes
// window.__axeDomStats.{reset, read}.
//
// What each counter tests:
//
//   D1 (_createGrid does ~14 computed-style reads per element).  The plan
//   frames this as "~34,000 style-property reads per audit", which invites
//   reading it as 34,000 style recalculations.  It is not:
//   VirtualNode.getComputedStylePropertyValue (axe.js:18853-18861) caches the
//   CSSStyleDeclaration per node AND the resolved value per property, so the
//   real shape is one window.getComputedStyle per element plus N cheap
//   getPropertyValue reads on the cached declaration -- each behind a
//   `'computedStyle_' + property` string concat and a hasOwnProperty lookup.
//   Counting the two separately is the only way to tell which of those three
//   things costs anything.
//
//   D3 (html is serialised eagerly for every result node).  outerHTML
//   serialises the element's entire subtree and axe then discards it above
//   300 chars.  Counting calls AND characters shows whether the waste is in
//   the call count or in a few enormous serialisations of large containers.
//
//   D4 (generateSelector runs a document query per ancestor level).
//   findSimilar is doc.querySelectorAll; the count is the claim.
//
// Per-call timing is deliberately NOT collected for the high-frequency
// counters.  performance.now() is clamped to ~5 us in Chrome, so timing
// ~34,000 getPropertyValue calls would measure the clock, not the call.
// Counts are exact and cheap; the ms attribution comes from ab-axe.mjs.

(() => {
  const stats = Object.create(null);

  function slot(name) {
    return (stats[name] = { count: 0, chars: 0 });
  }
  const gcs = slot('getComputedStyle');
  const gpv = slot('getPropertyValue');
  const gbcr = slot('getBoundingClientRect');
  const gcr = slot('getClientRects');
  const qsa = slot('querySelectorAll');
  const qs = slot('querySelector');
  const outer = slot('outerHTML');

  // --- D1: the two halves of a "style-property read" ---------------------
  const origGCS = window.getComputedStyle.bind(window);
  window.getComputedStyle = function (el, pseudo) {
    gcs.count++;
    return origGCS(el, pseudo);
  };

  const origGPV = CSSStyleDeclaration.prototype.getPropertyValue;
  CSSStyleDeclaration.prototype.getPropertyValue = function (prop) {
    gpv.count++;
    return origGPV.call(this, prop);
  };

  const origGBCR = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    gbcr.count++;
    return origGBCR.call(this);
  };

  const origGCR = Element.prototype.getClientRects;
  Element.prototype.getClientRects = function () {
    gcr.count++;
    return origGCR.call(this);
  };

  // --- D4: findSimilar -> doc.querySelectorAll ---------------------------
  // Patch on Document and Element separately; axe calls both, and Node does
  // not carry these.
  for (const [proto, label] of [
    [Document.prototype, 'Document'],
    [Element.prototype, 'Element'],
    [DocumentFragment.prototype, 'DocumentFragment'],
  ]) {
    const oQSA = proto.querySelectorAll;
    proto.querySelectorAll = function (sel) {
      qsa.count++;
      return oQSA.call(this, sel);
    };
    const oQS = proto.querySelector;
    proto.querySelector = function (sel) {
      qs.count++;
      return oQS.call(this, sel);
    };
    void label;
  }

  // --- D3: DqElement -> _getElementSource -> outerHTML -------------------
  const outerDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
  Object.defineProperty(Element.prototype, 'outerHTML', {
    configurable: true,
    enumerable: outerDesc.enumerable,
    set: outerDesc.set,
    get: function () {
      const s = outerDesc.get.call(this);
      outer.count++;
      outer.chars += s.length;
      return s;
    },
  });

  window.__axeDomStats = {
    reset() {
      for (const k of Object.keys(stats)) {
        stats[k].count = 0;
        stats[k].chars = 0;
      }
    },
    read() {
      const out = {};
      for (const k of Object.keys(stats)) {
        out[k] = { count: stats[k].count, chars: stats[k].chars };
      }
      return out;
    },
  };
})();
