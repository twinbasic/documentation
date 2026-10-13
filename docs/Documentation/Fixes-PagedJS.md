---
title: Paged.js Patches
parent: Library Patches
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Fixes/PagedJS
---

# Paged.js Patches
{: .no_toc }

`book/lib/paged.browser.js` is a vendored, patched copy of paged.js v0.4.3 (MIT). Upstream paged.js is built for interactive browsers: it yields to the event loop to keep pages responsive, uses async functions throughout, and registers observation and resize callbacks. A headless Chromium process that only produces a PDF needs none of that. This page lists every patch and why it exists.

* TOC goes here
{:toc}

## Synchronous execution chain

**Problem.** Upstream paged.js is a chain of `async function`s. Its central yield, `waitForTick()`, runs every 100 laid-out objects inside the core `*layout` generator, which adds thousands of forced event-loop turns on a 1,651-page book. The async machinery also allocates a Promise per call (each function compiles to a tslib `__awaiter` + `__generator` state machine), even on paths that never yield.

In headless Chromium nothing else uses the event loop, so yielding gains nothing. An accidentally-async handler could also have its awaitable work silently dropped.

**Fix.** Fourteen methods were rewritten as synchronous equivalents, marked `[PATCH: sync-chain]` throughout the file.

| Method | Change |
|---|---|
| `*layout()` | Sync generator; `renderer.next()` returns synchronously. |
| `render()` | Plain sync; no more per-page async state machine. |
| `renderTo()` | `async` removed; returns synchronously. |
| `layout()` | `async` removed; calls `renderTo` and `handleBreaks` synchronously. |
| `handleBreaks()` | No longer awaits hook triggers; `Hook.trigger()` returns `undefined` on the all-sync path. |
| `flow()` | All five `await` sites removed; `beforeParsed`/`afterParsed`/`afterRendered` hooks are called synchronously and guarded by `_assertSync`. |
| `renderOnIdle()` / `renderAsync()` | Removed; both wrapped `renderer.next()` in unnecessary async machinery. |
| `clonePage()` | `async` removed; only reachable via the `Footnotes` handler, which disables itself when the document has no footnotes. |
| `loadFonts()` | Rewritten as a synchronous assertion. `waitUntil: "load"` in `render-book.mjs` settles the font faces of the stylesheets the book loads. The assertion rejects `loading` and `error`, not `unloaded`: a CSS-connected face is fetched only when the layout needs it, so a face `print.css` declares but this render never uses stays `unloaded`. `Polisher.add()` then replaces those stylesheets, and their faces load again: [Fonts before the flow](#fonts-before-the-flow) waits for them. |
| `parse()` | `async` removed; no registered handler in this pipeline is async for the hooks it fires. |
| `request()` | Replaced with synchronous XHR (`XMLHttpRequest` with `async=false`), returning `responseText` directly. |
| `add()` | `async` removed; all inputs are inline `{url: text}` objects that need no fetch. |
| `convertViaSheet()` | `async` removed; `request()` now returns text directly. |

`_assertSync(triggerResult, hookName)` is added at each call site that receives the sync sentinel from `Hook.trigger()`. If a handler returns a thenable, it throws at once and names the hook, rather than silently discarding the async work.

> [!NOTE]
> `await page.evaluate(...)` in `render-book.mjs` is a puppeteer requirement for the CDP round-trip. It does not mean `preview()` is async inside Chromium: the `await` resolves after Chromium's synchronous execution completes and the CDP response reaches Node.

## Hook dispatch fast-paths

**Problem.** `Hook.trigger()` always returned `Promise.all(promises)`, wrapping every sync handler result in a new Promise, so callers paid a microtask boundary even when no handler was async. `Hook.triggerSync()` (the per-page variant) always allocated a results array and called `.forEach`, even when `this.hooks` was empty. The `onOverflow` and `onBreakToken` hooks have no registered handlers in this pipeline, yet `triggerSync` still ran for them ~3300 times per render.

**Fix.** `[PATCH: hook-fast-path]` `trigger()` returns `undefined` (the sync sentinel) when all handlers complete without returning a thenable, instead of a resolved Promise. Callers are rewritten as:

```js
let p = hook.trigger(...);
if (p) await p;
```

`[PATCH: hook-fast-path-sync]` `triggerSync()` returns `undefined` immediately when `this.hooks` is empty, skipping the array allocation and the `.forEach`.

Each call site that receives the sync sentinel also calls `_assertSync(result, hookName)`, which throws if the result is thenable.

## DOM element lookup

### indexOfRefs dictionary

**Problem.** `findElement(ref, root)` looked up elements by `data-ref`. When the `indexOfRefs` dictionary was not populated, it fell through to `root.querySelector("[data-ref='X']")`, which scans the whole `root` subtree. On the book, the scans inside `createBreakToken` alone cost over one second.

**Fix.** `[PATCH: findRef fast-path]` The `addRefs()` walk records every element with a `data-ref` attribute in `root.indexOfRefs`. Later `findElement` calls hit the dictionary and skip the scan.

### Fragment merge

**Problem.** When `append()` rebuilt an ancestor and inserted it with `dest.appendChild(fragment)`, the rebuilt nodes' `data-ref` mappings did not reach `dest.indexOfRefs`. Later `findElement(rebuiltAncestor, dest)` calls missed the dictionary and fell back to `querySelector`.

**Fix.** `[PATCH: findRef fast-path]` After `dest.appendChild(fragment)`, `fragment.indexOfRefs` is merged into `dest.indexOfRefs` in one pass.

### Source indexOfRefs representation

**Problem.** The source content's `indexOfRefs` was a plain object (`{}`). V8 stores a large one as a hash map, at ~40--50 bytes per entry. The keys are decimal-string UUID counters, which translate to sequential integers.

**Fix.** `[PATCH: source-indexOfRefs-array]` The source `indexOfRefs` is a plain `Array`, which V8 stores as `PACKED_ELEMENTS` at ~8 bytes per slot. `[PATCH: source-indexOfRefs-presize]` The array is pre-sized from `HTMLCollection.length` before the walk, so the backing store does not reallocate as it grows.

## Parent node lookup cache

**Problem.** The inner loop of `append()` called `findElement(srcParent, dest)` for every source node to find its destination parent (`destParent`). Consecutive siblings share the same `srcParent` but each repeated the lookup.

**Fix.** `[PATCH: parent-lookup-cache]` A one-entry memo on the `Layout` instance stores the last `(srcParent, dest) → destParent` resolution, so consecutive siblings skip the lookup. The memo is cleared at the start of each `renderTo` call, because `removeOverflow` may have detached the cached `destParent` between calls.

## data-ref attribute caching

**Problem.** `element.dataset.ref` calls `getAttribute` internally and allocates a fresh string on every access. The `addRefs` walk and `append()` each read the same attribute twice: once to test it exists, once to write `indexOfRefs`.

**Fix.** `[PATCH: addRefs-uuid-local]` / `[PATCH: append-ref-local]` Read the attribute once via `getAttribute` into a local variable and reuse it. This saves one string allocation per element in the `addRefs` walk and per append call.

## Render queue scheduler

**Problem.** The internal render queue used `requestAnimationFrame` as its per-task tick. In headless puppeteer, `rAF` still waits for the next compositor frame, and on a 1,651-page book the per-page queue iterations accumulated ~700 ms of V8 idle time.

**Fix.** `[PATCH: queue-tick]` The per-task callback is scheduled with `queueMicrotask` and fires in the microtask checkpoint instead of waiting for a compositor frame.

## Page layout correctness

### maxChars freeze

**Problem.** Upstream updated the per-page `maxChars` estimate only while `!settings.maxChars`. The first non-empty page set `settings.maxChars`, which blocked every later update. When the opening pages are short (title page, part dividers), the estimate stayed too small and caused needless overflow checks on later full-text pages.

**Fix.** `[PATCH: maxChars-propagate]` The `!settings.maxChars` gate is removed, so the estimate is recalculated every page.

### maxChars estimation algorithm

**Problem.** The estimate was a rolling average over the last four page text lengths. Short pages (chapter ends, full-page images) pulled it down, so it underpredicted for the normal pages after them and triggered excess overflow checks.

**Fix.** `[PATCH: maxChars-running-max]` The rolling average is replaced by a running maximum: the largest page seen so far.

### Loop detection

**Problem.** Break-token loop detection used `tokens.lastIndexOf(breakToken)` on an Array, which scans up to N entries per page. Across a 1,651-page render that is O(n²).

**Fix.** `[PATCH: tokens-set]` The Array is replaced with a `Set`, so each lookup is O(1) instead of O(n).

### Fonts before the flow

**Problem.** `Polisher.add()` replaces the document's stylesheets with paged.js's processed copies, and every `@font-face` in them becomes a font face that has to load again. Upstream's async `preview()` waited for it; the synchronous chain went straight on to `chunker.flow()`, so the whole book was laid out while every face was still `loading`, in fallback fonts, and then printed in the real ones. Every page break was chosen for text of the wrong width. Where the real text took more room, as Cascadia Mono does against the 6.6 % narrower fallback on Windows, the lines that no longer fitted moved into the overflow column to the right of the page and were never printed: a render of 13 October 2026 left 476 code lines off its pages this way, two of them in the middle of the Interfaces and CoClasses example, and none once the fonts were loaded first. On Linux the fallbacks differ, and so did the faults.

**Fix.** `[PATCH: fonts-before-flow]` `preview()` is split into `prepare()`, everything up to and including `Polisher.add()`, and `flow()`, the layout. `render-book.mjs` calls `prepare()`, loads every face in `document.fonts` and waits for `document.fonts.ready`, then calls `flow()`; a face that still has not loaded is reported as `[fonts]`. `preview()` remains, as the two halves in one call.

### A break that cannot be avoided

**Problem.** `print.css` gives callouts `break-inside: avoid`, and CSS breaks such an element anyway when it fits on no page. paged.js lays a page out a part at a time, so Chromium saw only the part of a long callout that fitted in a column, honoured `avoid` and pushed it whole past the page; on the next page the same happened, and with a heading's `break-after: avoid` before the callout, the break went back to before the heading every time. paged.js gave up ("Unable to layout item"), and the first page's part of the callout was left in the overflow column: tsJson's "Known problems" warning, three pages long, lost its first page this way.

**Fix.** `[PATCH: avoid-when-it-fits]` Where `findBreakToken` finds a break at the point where the page began, before it removes anything, `relaxAvoid()` gives `break-inside: auto` to the first element with `break-inside: avoid` that lies wholly past the page, and the break is looked for again. An element that fits on a page is still moved whole to the next one: Chromium places it there, and the break is then not where the page began.

### An element no page can hold

**Problem.** When the chunker laid out a page and got back a break token it had seen before, it logged `Layout repeated at:` and *returned* an error rather than throwing it. That ended the flow as if the content were done: the book stopped at that element. `render-book.mjs` relayed only the progress lines from the page's console, so it saved the pages laid out so far and exited 0. From 12 October 2026 the JSON listings on the IDE's Panel Layouts page, whose deepest lines are indented by twelve tabs, did this on the Linux runner, and the published book stopped at page 461.

**Fix.** `[PATCH: layout-repeated-skip]` The chunker skips the rest of the block that holds the node --- the nearest `pre`, `table`, list, `p`, `div` or similar around it --- and goes on with the node after that block. The node after the node itself is not enough: a page laid out from inside a `<pre>` gives the same break again, and the render adds pages without end. A block whose next node has already been a break is not progress either, so the chunker climbs to the block around it. It still returns the error when nothing follows. `Layout.renderTo` upstream already skips to the node after one it reports as `Unable to layout item`. `render-book.mjs` relays both reports as warnings that name the element ([PDF Generation](../PDF-Generation#stalled-or-still-working)).

### Code split across pages

**Problem.** In a code block one text node often holds most of a listing, and paged.js does not split a text node that wraps over many lines reliably: on a page narrow enough, it picks the same break twice, which is the Panel Layouts case above, or a break further on than the content it moves off the page, and the lines between are lost without a report. (Most of the code the book of 12 October 2026 lacked, 490 of its 8,862 code lines of 25 characters or more, among them the end of the Call statement's page, went the way [Fonts before the flow](#fonts-before-the-flow) describes.)

**Fix.** The book build puts each line of a code block, with its newline, in an inline `<span class="code-line">` of its own (`codeLines` in `builder/book.mjs`): every line starts a node, and paged.js breaks code between two nodes. The spans are inline, so the block lays out exactly as before, page breaks included; block spans would break code as well, but a block of one line has no orphans or widows to keep. Each line's newline is in a `<span class="w">` of its own: after a page break inside a line, paged.js goes on with `nodeAfter()`, which passes over a text node that is all whitespace, and a bare newline there was lost, joining the line to the next one. `render-book.mjs` checks every code block: it numbers each `<pre>` before the render, puts the pieces paged.js split together again after it, and reports as `[code]` each block that lacks a line, counting only the lines that start inside a page's content box. `print.css` also sets `tab-size: 3` on code blocks, which keeps the Panel Layouts listings within the column.

## Margin group rendering

**Problem.** The `finalizePage` hook computed `grid-template-columns` and `grid-template-rows` for each page's margin groups by reading `getComputedStyle()` at layout time. This forced a layout flush on every page.

**Fix.** `[PATCH: emit static grid-template rules]` The grid-template decision tree moves to `AtPage.emitMarginGridTemplates()`, called once from `afterTreeWalk` during the CSS parse phase. It reads each margin cell's effective `hasContent` / `max-width` / `max-height` from the parsed `@page` AST (captured as strings during the CSS walk) and emits static `grid-template-columns` / `grid-template-rows` rules into the stylesheet. The browser applies them by cascade to every matching page class. `finalizePage` keeps only the cases that need a DOM inspection after layout.

## Content preparation

### innerHTML round-trip

**Problem.** `[PATCH: wrap-content-move]` Upstream moved the `<body>` content into paged.js's layout container by serialising the whole body to a string via `innerHTML` and reparsing it into a `<template>`. For a large book this is expensive, and it destroys the live DOM nodes.

**Fix.** Children are moved with `appendChild` into a plain `DocumentFragment` owned by the live document. The fragment is stored on a marker `<template>` element's `_pagedjsContent` expando, so a re-entrant call returns the fragment instead of trying to move nodes already detached.

### Whitespace filter

**Problem.** `[PATCH: whitespace-filter-opt-in]` The whitespace filter wraps inter-element whitespace text nodes in `<span class="w">` so paged.js does not discard them at page breaks. It ran on all documents by default.

**Fix.** The filter is off by default. The tbdocs build strips `book.html`'s inter-element whitespace before paged.js reads it, so the filter would find nothing to wrap.

## Handler self-disable

**Problem.** `Footnotes` and similar handlers register per-page hooks (`renderNode`, `afterPageLayout`, `beforePageLayout`, `afterOverflowRemoved`) at startup even when the document has no footnotes. The hooks then fire on every page with nothing to do.

**Fix.** `[PATCH: handler-self-disable]` Handlers record each `(hook, bound)` pair they register. `[PATCH: footnotes-self-disable]` In `afterParsed`, the `Footnotes` handler checks whether the parsed document has any `float: footnote` CSS rules or `data-note="footnote"` elements. If neither exists, it splices itself out of all per-page hooks before layout begins.

`[PATCH: extract-vs-delete]` guards `removed` in the `Footnotes` per-page handler. When `removeOverflow` took the `deleteContents` fast path (no footnotes in the rendered area), `removed` is `null`; the guard prevents an unchecked property access on it.

## ResizeObserver

**Problem.** `[PATCH: disable-resize-observer]` Upstream registered a `ResizeObserver` on the layout wrapper to detect reflow from late-loading resources (fonts, images). Here `waitUntil: "load"` guarantees every resource is loaded before paged.js runs, so the observer never fires.

**Fix.** `addResizeObserver()` is a no-op in this fork.

## See Also

- [pdf-lib Patches](PDFLib) -- the pdf-lib shims applied during the process phase.
- [PDF Generation](../PDF-Generation) -- how the paged.js bundle fits into the three-phase render pipeline.
