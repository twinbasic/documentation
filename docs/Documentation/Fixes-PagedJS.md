---
title: Paged.js Patches
parent: Library Patches
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Fixes/PagedJS
---

# Paged.js Patches
{: .no_toc }

`docs/lib/paged.browser.js` is a vendored, patched copy of paged.js v0.4.3 (MIT). Upstream paged.js is designed for interactive browsers: it yields to the event loop to keep pages responsive during long renders, uses async functions throughout, and registers observation and resize callbacks. None of that is useful in a headless, non-interactive Chromium process where the only goal is to produce a PDF as fast as possible. This page documents every patch and its rationale.

* TOC goes here
{:toc}

## Synchronous execution chain

**Problem.** Upstream paged.js is built from a chain of `async function`s. The central yield mechanism is `waitForTick()`, called every 100 laid-out objects inside the core `*layout` generator. On a 1651-page book this adds thousands of forced event-loop turns. Beyond `waitForTick()`, the async machinery itself --- each function compiles to a tslib `__awaiter` + `__generator` state machine --- allocates a Promise per call even on paths that never actually yield.

In headless Chromium the event loop is not shared with any user-facing interaction; yielding to it adds latency with no benefit. `preview()` returning a Promise also complicated the per-page hook architecture: an accidentally-async handler could have its awaitable work silently dropped.

**Fix.** Fourteen methods were rewritten as synchronous equivalents, marked `[PATCH: sync-chain]` throughout the file.

| Method | Change |
|---|---|
| `*layout()` | Sync generator; `renderer.next()` returns synchronously. |
| `render()` | Plain sync; no more per-page async state machine. |
| `renderTo()` | `async` removed; `renderTo` returns synchronously. |
| `layout()` | `async` removed; calls `renderTo` and `handleBreaks` synchronously. |
| `handleBreaks()` | No longer awaits hook triggers; `Hook.trigger()` returns `undefined` on the all-sync path. |
| `flow()` | All five `await` sites removed; `beforeParsed`/`afterParsed`/`afterRendered` hooks are called synchronously and guarded by `_assertSync`. |
| `renderOnIdle()` / `renderAsync()` | Removed entirely; both wrapped `renderer.next()` in unnecessary async machinery. |
| `clonePage()` | `async` removed; only reachable via the `Footnotes` handler, which self-disables when the document has no footnotes. |
| `loadFonts()` | Rewritten as a synchronous assertion. `waitUntil: "load"` in `render-book.mjs` guarantees every `FontFace` is loaded before paged.js runs. |
| `parse()` | `async` removed; no registered handler in this pipeline is async for the hooks it fires. |
| `request()` | Replaced with synchronous XHR (`XMLHttpRequest` with `async=false`), returning `responseText` directly. |
| `add()` | `async` removed; all inputs are inline `{url: text}` objects requiring no fetch. |
| `convertViaSheet()` | `async` removed; `request()` now returns text directly. |

A guard function `_assertSync(triggerResult, hookName)` is added at each call site that receives the sync sentinel from `Hook.trigger()`. If a handler returns a thenable, `_assertSync` throws immediately with the hook name rather than silently discarding the async work.

> [!NOTE]
> `await page.evaluate(...)` in `render-book.mjs` is a puppeteer requirement for the CDP round-trip, not a sign that `preview()` is async inside Chromium. The `await` resolves only after Chromium's synchronous execution completes and the CDP response returns to Node.

## Hook dispatch fast-paths

**Problem.** `Hook.trigger()` always returned `Promise.all(promises)`, wrapping every sync handler result in `new Promise(resolve => resolve(...))`. Callers always awaited the result, paying a microtask boundary even when no handler was async. `Hook.triggerSync()` (the synchronous variant used for per-page hooks) always allocated a results array and called `.forEach` over it, even when `this.hooks` was empty. The `onOverflow` and `onBreakToken` hooks have zero registered handlers in this pipeline; `triggerSync` was called ~3300 times per render for pure dispatch overhead.

**Fix.** `[PATCH: hook-fast-path]` `trigger()` returns `undefined` (the sync sentinel) when all handlers complete without returning a thenable, rather than a resolved Promise. Callers are rewritten as:

```js
let p = hook.trigger(...);
if (p) await p;
```

`[PATCH: hook-fast-path-sync]` `triggerSync()` returns `undefined` immediately when `this.hooks` is empty, skipping both the array allocation and the `.forEach`.

At each call site that now receives the sync sentinel, `_assertSync(result, hookName)` throws if the result is thenable, converting a silent correctness risk into a diagnosable error.

## DOM element lookup

### indexOfRefs dictionary

**Problem.** `findElement(ref, root)` looked up elements by their `data-ref` attribute. When the `indexOfRefs` fast-path dictionary was not populated, it fell through to `root.querySelector("[data-ref='X']")`, which scanned the entire `root` subtree. On a 1651-page book, 848 + 42 such scans inside `createBreakToken` alone accounted for over one second of render time.

**Fix.** `[PATCH: findRef fast-path]` During the `addRefs()` walk, every element with a `data-ref` attribute is recorded in `root.indexOfRefs`. Subsequent `findElement` calls hit the dictionary and skip the `querySelector` scan entirely.

### Fragment merge

**Problem.** When `append()` rebuilt an ancestor and inserted it via `dest.appendChild(fragment)`, the rebuilt nodes' `data-ref` mappings were not carried into `dest.indexOfRefs`. Subsequent `findElement(rebuiltAncestor, dest)` calls missed the dictionary and fell back to `querySelector`.

**Fix.** `[PATCH: findRef fast-path]` After `dest.appendChild(fragment)`, `fragment.indexOfRefs` is merged into `dest.indexOfRefs` in a single pass.

### Source indexOfRefs representation

**Problem.** The source content's `indexOfRefs` was a plain JavaScript object (`{}`). V8 represents such objects as a hash map when the key count is large: ~40--50 bytes per entry. The keys are decimal-string UUID counters that translate to sequential integers.

**Fix.** `[PATCH: source-indexOfRefs-array]` The source `indexOfRefs` is now a plain `Array`. V8 stores it as `PACKED_ELEMENTS` (dense array mode): ~8 bytes per slot. `[PATCH: source-indexOfRefs-presize]` The array is pre-sized from `HTMLCollection.length` before the walk, eliminating geometric-growth backing-store reallocations during the traversal.

## Parent node lookup cache

**Problem.** The inner loop of `append()` resolved the destination parent (`destParent`) for each source node by calling `findElement(srcParent, dest)`. Consecutive siblings in the source tree share the same `srcParent`; each sibling called `findElement` independently.

**Fix.** `[PATCH: parent-lookup-cache]` A one-entry memo on the `Layout` instance stores the last `(srcParent, dest) → destParent` resolution. Consecutive siblings hit the cache and skip the dictionary lookup. The memo is invalidated at the start of each `renderTo` call because `removeOverflow` may have detached the cached `destParent` between calls.

## data-ref attribute caching

**Problem.** `element.dataset.ref` calls `getAttribute` internally and allocates a fresh JS string on every access. The `addRefs` walk and `append()` each read the same attribute value twice: once for the existence check and once for the `indexOfRefs` write.

**Fix.** `[PATCH: addRefs-uuid-local]` / `[PATCH: append-ref-local]` Read the attribute once via `getAttribute` into a local variable and reuse it for both operations. This saves one string allocation per element in the `addRefs` walk and per append call --- roughly 50 000 calls on the book, measured at ~1.5 MB heap reduction per A/B sampling pair.

## Render queue scheduler

**Problem.** The internal render queue used `requestAnimationFrame` as its per-task tick. In headless puppeteer renders, `rAF` still waits for the next compositor frame even with no visual output and no interaction. On a 1651-page book, the per-page queue iterations accumulated ~700 ms of V8 idle time from `rAF` deferred callbacks.

**Fix.** `[PATCH: queue-tick]` The per-task callback is scheduled with `queueMicrotask` instead of `requestAnimationFrame`. It fires in the microtask checkpoint rather than waiting for a compositor frame.

## Page layout correctness

### maxChars freeze

**Problem.** Upstream gated the per-page `maxChars` estimate update on `!settings.maxChars`. On the first pass with a non-empty page, `settings.maxChars` was set and the gate prevented any further updates. On a book whose opening pages are short (title page, part dividers), the estimate was permanently too small, causing unnecessary overflow checks on subsequent full-text pages.

**Fix.** `[PATCH: maxChars-propagate]` The `!settings.maxChars` gate is removed. The estimate is recalculated every page.

### maxChars estimation algorithm

**Problem.** The updated `maxChars` estimate was a rolling average over the last four page text-content lengths. A rolling average is pulled down by short pages (chapter ends, full-page images), causing the estimate to underpredict for the normal pages that follow, triggering excess overflow checks.

**Fix.** `[PATCH: maxChars-running-max]` The rolling average is replaced by a running maximum. The estimate tracks the largest page seen so far rather than the recent mean.

### Loop detection

**Problem.** Break-token loop detection used `tokens.lastIndexOf(breakToken)` on an Array, which scanned up to N entries per page. Across a 1651-page render this was O(n²).

**Fix.** `[PATCH: tokens-set]` The Array is replaced with a `Set`, reducing the per-lookup cost from O(n) to O(1).

## Margin group rendering

**Problem.** The `finalizePage` hook computed `grid-template-columns` and `grid-template-rows` values for each page's margin groups by reading `getComputedStyle()` at layout time. This triggered layout flushes and ran once per page.

**Fix.** `[PATCH: emit static grid-template rules]` The grid-template decision tree is hoisted to `AtPage.emitMarginGridTemplates()`, called once from `afterTreeWalk` during the CSS parse phase. It reads the effective `hasContent` / `max-width` / `max-height` per margin cell from the parsed `@page` AST --- captured as strings during the CSS walk --- and emits static `grid-template-columns` / `grid-template-rows` rules into the stylesheet. The browser applies them via cascade for every matching page class. Per-page `finalizePage` retains only the cases that genuinely require a DOM inspection after layout.

## Content preparation

### innerHTML round-trip

**Problem.** `[PATCH: wrap-content-move]` Upstream moved the `<body>` content into paged.js's layout container by serialising the entire body to a string via `innerHTML` and reparsing it into a `<template>`. For a large book this serialisation is expensive and destroys the live DOM nodes, requiring a full reparse.

**Fix.** Children are moved directly into a plain `DocumentFragment` owned by the live document via `appendChild`. The fragment is stashed on a marker `<template>` element's `_pagedjsContent` expando so re-entrant calls return the already-moved fragment rather than attempting to move already-detached nodes.

### Whitespace filter

**Problem.** `[PATCH: whitespace-filter-opt-in]` The whitespace filter --- which wraps inter-element whitespace text nodes in `<span class="w">` to prevent paged.js from discarding them at page breaks --- ran on all documents by default.

**Fix.** The filter is disabled by default. `book.html` has its inter-element whitespace stripped by the tbdocs build pipeline before the file is read by paged.js, so the filter would find nothing to wrap.

## Handler self-disable

**Problem.** `Footnotes` and similar handlers register per-page hooks (`renderNode`, `afterPageLayout`, `beforePageLayout`, `afterOverflowRemoved`) unconditionally at startup, even when the document contains no footnotes. These hooks fire on every page with nothing to do.

**Fix.** `[PATCH: handler-self-disable]` Handlers track each `(hook, bound)` pair they register. `[PATCH: footnotes-self-disable]` The `Footnotes` handler checks in `afterParsed` whether any `float: footnote` CSS rules or `data-note="footnote"` elements exist in the parsed document. If neither is present, it splices itself out of all per-page hooks before layout begins.

The related `[PATCH: extract-vs-delete]` guards `removed` access in the `Footnotes` per-page handler: when `removeOverflow` took the `deleteContents` fast path (no footnotes in the rendered area), `removed` is `null`. The guard prevents an unchecked property access on `null` in that path.

## ResizeObserver

**Problem.** `[PATCH: disable-resize-observer]` Upstream registered a `ResizeObserver` on the layout wrapper to detect post-layout reflow from late-loading resources (fonts, images). In the headless pipeline, `waitUntil: "load"` guarantees all resources are present and loaded before paged.js runs; the observer never fires.

**Fix.** `addResizeObserver()` is a no-op in this fork.

## See Also

- [pdf-lib Patches](PDFLib) -- the pdf-lib shims applied during the process phase.
- [PDF Generation](../PDF-Generation) -- how the paged.js bundle fits into the three-phase render pipeline.
