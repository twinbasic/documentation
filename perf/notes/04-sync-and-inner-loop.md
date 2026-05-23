# Stripping async machinery and shrinking `Layout.append`

Removing headless-irrelevant async coordination from paged.js (hook fast-path, sync chain end-to-end through the per-page hot path), then a sequence of small wins inside `Layout.append`: footnote NodeList fast-path, parent-lookup cache, `Hook.triggerSync` empty-handlers fast-path, footnotes self-disable; finally skipping `wrapContent`'s innerHTML round-trip and fixing two bugs in the adaptive `maxChars` overflow-check rhythm.

## Stripping headless-irrelevant async machinery

paged.js was designed to be fully usable in interactive browser
work. The async coordination patterns it carries -- always
returning Promises from hook triggers, awaiting microtask
boundaries between every phase, deferring tasks via animation
frames -- pay off when the same engine is rendering inside a
visible page that needs to stay responsive, coordinate with the
compositor, and tolerate handlers that load external resources.

In our headless puppeteer pipeline, none of that is true:

- The page is offscreen; no compositor to coordinate with.
- We don't care if any individual page-render blocks for tens of
  milliseconds, because the browser isn't trying to repaint.
- Every handler we register is synchronous. No hook needs to
  await anything.
- The book HTML is loaded before render starts (`page.goto(url,
  { waitUntil: "load" })`), so every image's `.complete` flag is
  already true. No image-loading awaits ever actually wait.

Each remaining async wrapper is overhead we pay for a flexibility
we never use. We're maintaining a task-specific fork; we can keep
peeling layers as long as the simplifications don't change observed
output.

### Phase 1: hook fast-path

`Hook.trigger()` upstream always wraps sync handler results in
`new Promise(resolve => resolve(executing))` and returns
`Promise.all(promises)`. The chunker's per-page loop awaits each
of `beforePageLayout`, `afterPageLayout`, and `finalizePage`. With
all six of our registered handlers running synchronously,
`await trigger(...)` was a no-work microtask boundary per call.

Patch: `Hook.trigger()` returns `undefined` when no handler
returned a thenable. Callers in the per-page hot path become:

```js
let _p = this.hooks.X.trigger(...);
if (_p) await _p;
```

The microtask boundary is skipped entirely on the sync fast
path. Patched at six per-page sites (three in `chunker.layout`,
three in `chunker.handleBreaks`).

CPU profile comparison (post-queue-tick + drop-queue baseline vs
post-Phase-1):

| metric | baseline | Phase 1 | Δ |
| ------ | -------- | ------- | --- |
| samples | 7,353 | 6,902 | -451 |
| profile duration | 13.07 s | 12.22 s | **-0.85 s (-6.5 %)** |
| `getBoundingClientRect` self | 4,622 ms | 4,273 ms | -349 ms |
| `(program)` self | 1,873 ms | 1,874 ms | flat |
| `removeChild` self | 1,885 ms | 1,913 ms | flat |
| `removeOverflow` self | 592 ms | 579 ms | flat |
| `(idle)` self | n/a (< 130 ms) | n/a (< 130 ms) | flat |

The 451 fewer samples account for ~800 ms of saved CPU work.
`getBoundingClientRect`'s self-time dropped by ~350 ms; the rest
is distributed across many small hot spots that all shrank
slightly because they were each preceded by fewer microtask
yields. No new hot spot appeared.

> [!NOTE]
> We compare CPU-profile sample counts and self-times here, not
> wall-clock. Wall-clock includes I/O variance and system load on
> the dev machine; CPU profile sample times are independent of
> those and more reliable for "did this actually change CPU work."
> Wall-clock numbers from these runs are noted where useful for
> sanity-checking but aren't the primary signal.

Shipped. The fix is small (one helper change + six call-site
edits) and removes about 8k microtask boundaries from the
per-page hot loop on a 1651-page render.

### Phase 2: sync chain end-to-end through the per-page hot path

With Phase 1 in place, every per-page `await` in the chunker is
unconditional on a function that returned a Promise even when
nothing was actually awaitable. The structural answer is to make
those functions plain sync functions.

The chain, top to bottom of the per-page call tree:

```
chunker.*layout()              (async generator → sync generator)
  chunker.handleBreaks()       (async → sync)
  page.layout()                (async → sync)
    Layout.renderTo()          (async → sync)
      Layout.waitForImages()   (async → sync, throws if not preloaded)
chunker.render() loop          (still async at the outer edge;
                                renderer.next() now sync)
```

Phase 2 converts each step. The only function that *could* have
been genuinely async -- `waitForImages` -- is now a synchronous
check: it walks the supplied `<img>` nodes and throws if any
isn't `.complete`. In our pipeline,
`page.goto(url, { waitUntil: "load" })` settles before paged.js
is invoked, so every image is already loaded; the throw is a
safety net for pipeline bugs, not a runtime path we expect to
take.

The hook triggers in the per-page hot path keep the Phase 1
fast-path semantics but switch from
`let _p = hook.trigger(...); if (_p) await _p;` to
`_assertSync(hook.trigger(...), "hook-name")`. The helper throws
if a handler ever returns a thenable -- the same safety pattern
as `waitForImages`. None of our shipping handlers do.

Dead code removed in the same pass: `Chunker.renderAsync` and
`Chunker.renderOnIdle`, both unreachable since the drop-queue
change above stripped their only caller. Together ~30 lines of
async machinery that existed only to wrap the (now sync)
`renderer.next()` call.

CPU profile (Phase 1 baseline vs Phase 2):

| metric | Phase 1 | Phase 2 | Δ |
| ------ | -------- | ------- | --- |
| samples | 6,902 | 6,948 | +46 |
| profile duration | 12.22 s | 12.35 s | +0.13 s (noise) |
| `getBoundingClientRect` self | 4,273 ms | 4,524 ms | +251 ms (noise) |
| `(program)` self | 1,874 ms | 1,909 ms | +35 ms |
| `removeChild` self | 1,913 ms | 1,883 ms | -30 ms |
| `removeOverflow` self | 579 ms | 523 ms | -56 ms |

Phase 2 sits inside the run-to-run noise band on CPU time --
the per-call CPU cost of an `await` on an already-settled Promise
is small (a handful of microseconds), and Phase 1 already
eliminated most of the boundary count. **What Phase 2 buys is
not measurable CPU time -- it's structural simplicity.**

Code shape, before and after:

- 6 fewer `async` keywords on hot-path methods.
- 13 fewer `await` keywords removed from the bodies of those
  methods (the per-page chain no longer threads `await` through
  any of its layers).
- One async generator (`async *layout`) → sync generator
  (`*layout`).
- Two dead methods removed (`renderAsync`, `renderOnIdle`).
- Two `_assertSync` guards added at the chunker's hook call
  sites + one at `waitForImages` -- the contract we now rely on
  (per-page handlers all synchronous, every `<img>` preloaded)
  is enforced at runtime with a useful error message.

PDF output is **byte-identical** to the Phase 1 build on this
content (`async-phase1/book.pdf` and `async-phase2/book.pdf`
both 16,893,546 bytes -- a rare 0-byte timestamp drift, but
the structural content is identical regardless).

This is the kind of cleanup that's only worth doing because
we maintain a task-specific fork of the bundle. Upstream
paged.js has to support handlers that await fetches or image
loads or font measurements -- our pipeline never registers one.
Removing the async machinery in our copy shrinks the surface to
reason about and makes the data-flow direct: a render is a
plain function call that produces a plain return value.

### What's still async, and why

> **Update.** All four survivors listed below were
> subsequently stripped -- see *Following `RunMicrotasks`
> down to zero* in
> [06-microtasks-pageranges-css.md](06-microtasks-pageranges-css.md).
> The reasoning
> here ("once-per-render, overhead irrelevant") was
> correct as a per-call cost argument but missed that
> the unbroken await chain forced V8 to attribute the
> entire post-`loadFonts` render to a microtask
> continuation (`RunMicrotasks` in the trace,
> `(program)` in the cpu profile). Re-attribution alone
> was worth the conversion; wall-clock is unchanged.
> The list below is preserved for chronological accuracy.

The async machinery that survives this audit is now at the
once-per-render layer, where it's load-bearing:

- `Chunker.flow()` is async because `loadFonts()` waits on the
  CSS font-face descriptor's load promise, which is actually
  async and OS-level.
- `Chunker.render()` stays `async` as a thin wrapper so callers
  in `flow()` can `await` it (the alternative would be to
  remove `async` and have `flow()` not await it, but the call
  site reads more clearly with the `await` retained).
- `beforeParsed`, `afterParsed`, `afterRendered` hooks are still
  awaited with the `await hook.trigger(...)` form because they
  fire once per render and the overhead is irrelevant.
- The `onOverflow` recovery path (`Chunker.q.enqueue(async ...)`)
  re-renders the document if any page overflows after paint. In
  practice this never fires for our content, but keeping the
  recovery code intact costs nothing and preserves behaviour for
  edge cases.

The hot per-page path is now `function`, `function*`, plain
return values, and a `while` loop. Future work that touches
this code can reason about it as straight-line synchronous
flow.

## Doing less work in `Layout.append()`

Picking the next hotspot after the async cleanup, BreakToken
JSON, gBCR wrapper inline, and UUID-counter changes had all
landed. Fresh profile from a clean baseline at 100us sampling
(V8 effectively clamped this to ~543us/sample on this Node/
Chromium build), `--no-timing --detach-pages`, render-only:

```
   self_ms   self_%   function  @  source
   -------   ------   --------------------------------------------------
   4825.28   38.22%   getBoundingClientRect       (native)
   2021.89   16.02%   (program)                   (native)
   1954.01   15.48%   removeChild                 (native)
    635.95    5.04%   removeOverflow              paged.browser.js
    288.38    2.28%   wrapContent                 paged.browser.js
    255.25    2.02%   insertBefore                (native)
    227.01    1.80%   appendChild                 (native)
    164.01    1.30%   findOverflow                paged.browser.js
    140.66    1.11%   (garbage collector)         (native)
    138.49    1.10%   afterPageLayout             paged.browser.js (Splits)
    129.25    1.02%   cloneNode                   (native)
    125.99    1.00%   addRefs                     paged.browser.js
     90.15    0.71%   renderTo                    paged.browser.js
     81.46    0.65%   filterTree                  paged.browser.js
     80.92    0.64%   importNode                  (native)
     80.38    0.64%   setAttribute                (native)
     72.77    0.58%   append                      paged.browser.js
     ...
```

The four heavy hitters are unchanged from earlier reports.
`Layout.append` itself shows only 73 ms of self-time, but
inclusively it owns a large fraction of the per-source-node
work: `cloneNode`, `appendChild`/`insertBefore`, the
`findElement` chain (`querySelector` + `getAttribute`), the
`renderNode` hook dispatch, and `rebuildAncestors` at page
boundaries all flow through it. With ~100k+ source-node
clones per render, anything per-call adds up.

Reading the body of `append()`, three things stood out as
potentially-reducible:

1. The `renderNode` hook dispatch fires for every cloned
   node. Even if no handler is registered, `triggerSync`
   still allocates a results array, runs `this.hooks.forEach`
   over zero entries, and returns the empty array; the
   caller then runs its own `.forEach` over that empty array.
2. The `findElement(node.parentNode, dest)` lookup goes
   through `getAttribute("data-ref")` on the parent. The
   ref is also set on every source element at decoration
   time, so the value could be stashed on a plain JS expando.
3. `clone.dataset.ref` is read a second time at the end of
   `append()` to register the clone in `dest.indexOfRefs`.
   Same expando trick applies.

Following the (1) thread first uncovered two separable wins:
a bug inside the only registered `renderNode` handler, and
the broader empty-handlers dispatch overhead.

### `Footnotes.renderNode`: always-truthy NodeList condition

The grep for `renderNode` method definitions in the bundle
returns exactly one match: `Footnotes.renderNode` (in the
package's footnotes-handling class). Every `append()` call
goes through it. Its body:

```js
renderNode(node) {
    if (node.nodeType == 1) {
        let notes;
        if (!node.dataset) return;

        if (node.dataset.note === "footnote") {
            notes = [node];
        } else if (node.dataset.hasNotes ||
                   node.querySelectorAll("[data-note='footnote']")) {
            notes = node.querySelectorAll("[data-note='footnote']");
        }

        if (notes && notes.length) {
            this.findVisibleFootnotes(notes, node);
        }
    }
}
```

The `else if` condition has an upstream bug: a `NodeList` is
always truthy (even an empty one -- it's an object), so when
`dataset.hasNotes` is undefined the right arm of the `||`
runs `querySelectorAll`, the condition evaluates true, and
the next line then runs `querySelectorAll` **a second time**.
Two subtree scans per element-node clone, for any document
that doesn't author `data-note='footnote'` directly.

`grep -c 'data-note' docs/_site-pdf/book.html` returns 0 --
every one of those scans on every clone of every page of
the book was dead work.

The fix narrows the `else if` to the original intent:

```js
} else if (node.dataset.hasNotes) {
    notes = node.querySelectorAll("[data-note='footnote']");
}
```

Profile delta (post-tojson baseline vs surgical fix):

| metric | baseline | post-fix | Δ |
| ------ | -------- | -------- | --- |
| render wall | 12.63 s | 12.63 s | flat (within noise) |
| `querySelectorAll` self | 67.9 ms | 52.8 ms | -15 ms |
| samples | 23,313 | 23,250 | -63 |

A small saving in absolute terms: most of the eliminated
`querySelectorAll` calls were against tiny leaf subtrees
that terminate in microseconds when no matches are present.
The bug fix is upstream-clean and correct; the perf-relevant
takeaway was that *most* of the work `append()` pays for the
`renderNode` hook is in the dispatch wrapping the handler,
not in the handler's body. That motivated (2).

### `Hook.triggerSync` empty-handlers fast-path

Mirrors the earlier *Phase 1: hook fast-path* (in
*Stripping headless-irrelevant async machinery* above) for
the async `trigger()` path. `Hook.triggerSync` previously:

```js
triggerSync() {
    var args = arguments;
    var context = this.context;
    var results = [];
    this.hooks.forEach(function (task) {
        var executing = task.apply(context, args);
        results.push(executing);
    });
    return results;
}
```

…and the four reducer call sites in `Layout` always did:

```js
let r = this.hooks.X.triggerSync(...);
r.forEach((newVal) => { if (newVal !== undefined) target = newVal; });
```

Walking the bundle to see which of those four hook arrays
are actually populated in our build:

| call site | hook | handlers registered |
| --------- | ---- | ------------------- |
| `breakAt` (line 1551) | `onBreakToken` | 0 |
| `append` (line 1640) | `renderNode` | 1 (`Footnotes`) |
| `findBreakToken` (line 1805) | `onOverflow` | 0 |
| `findBreakToken` (line 1815) | `onBreakToken` | 0 |
| `Chunker.flow` (line 2910) | `filter` | 4 |

Three of the four hot sites are dispatching against an empty
handler array every call. `onOverflow` and the two
`onBreakToken` sites all fire from the per-page break-
detection path, which can run more than once per page when
overflow-and-retry happens.

Patch: `triggerSync` returns `undefined` on the empty path,
callers guard their reducer `forEach` with a truthy check.

```js
triggerSync() {
    if (this.hooks.length === 0) return undefined;
    // ...existing body
}
```

```js
let r = this.hooks.X.triggerSync(...);
if (r) r.forEach((newVal) => { ... });
```

Profile delta (post-surgical vs post-fast-path):

| metric | post-surgical | post-fast-path | Δ |
| ------ | ------------- | -------------- | --- |
| render wall | 12.63 s | **12.14 s** | **-0.49 s** |
| samples | 23,250 | 22,433 | -817 |
| `getBoundingClientRect` self | 4,819 ms | 4,714 ms | -105 ms |
| `removeChild` self | 1,962 ms | 1,902 ms | -60 ms |
| `removeOverflow` self | 634 ms | 552 ms | -82 ms |
| `querySelectorAll` self | 52.8 ms | 43.4 ms | -10 ms |

The wall-clock drop (~490 ms) and sample drop (817 × 542 us
≈ 443 ms) line up cleanly, so the saving is real, not run-
to-run noise. The reductions spread across rows because the
per-call cost of an empty `triggerSync` -- an array alloc, a
forEach over zero entries, a return, and the caller's own
forEach over the returned `[]` -- creates pressure on the
allocator and the V8 inliner that compounds on the per-page
hot path even though no single line attributes the cost.

The `renderNode` site at line 1640 does **not** hit the fast
path in this build -- `Footnotes` still occupies it with one
handler, so `hooks.length === 1` and the body runs as
before. The savings come entirely from the three zero-
handler sites.

### `Footnotes` self-disables when no footnotes are in source

That left the per-element `Footnotes.renderNode` dispatch
still firing on every cloned node, plus four other hook
methods `Footnotes` registers via the `Handler` base auto-
wiring. Inventory of what `Footnotes` is doing on a render
with zero footnote-marked nodes:

| method | fires | what it does on a footnote-free doc |
| ------ | ----- | ----------------------------------- |
| `onDeclaration` | per CSS declaration | quick property-name checks. Cheap. |
| `renderNode` | per element-node clone | short-circuits after surgical fix. |
| `beforePageLayout` | once per page | checks `this.needsLayout.length` (always 0). Cheap. |
| `afterPageLayout` | once per page | **3 `querySelector`s + `getBoundingClientRect` + `new Layout(...)` (which does 2 more `getBoundingClientRect`s + `getComputedStyle` in its constructor) + `findOverflow()` on the footnote-inner-content area.** Real work. |
| `afterOverflowRemoved` | per overflow detection | `querySelectorAll` returning empty. Cheap-ish. |

The big hidden cost was `afterPageLayout` -- ~1,650 calls per
render, each measuring an empty footnote area through several
DOM ops and constructing a transient `Layout` instance whose
constructor itself does multiple gBCRs.

The detect-and-disable plan:

1. Footnotes is the *only* registrant for each of its hook
   methods (`onDeclaration` aside -- it's a polisher-time
   hook with other registrants, but it's also cheap).
2. By the time `afterParsed` fires, both the CSS-driven
   selectors (populated by `onDeclaration` calls into
   `this.footnotes`) and any source-HTML `data-note` markers
   are accounted for. `Footnotes.afterParsed` already runs
   `processFootnotes(parsed, this.footnotes)` which writes
   `data-note='footnote'` on any element matching a CSS
   selector. So a single `parsed.querySelector(
   "[data-note='footnote']")` at the end of that pass is
   conclusive.
3. If null, splice `Footnotes`'s bound functions back out
   of each hook array. With the empty-handlers fast-path
   from (2) already landed, the per-page and per-node
   dispatches then return `undefined` immediately and
   callers skip their reducer `forEach`.

To enable (3), the `Handler` base class gets a small
addition: each `(hook, bound)` pair from auto-registration
is stashed under its hook name on `this._registered`, and a
new `_unregisterAll(except)` method splices each entry back
out. The `except` argument lets the caller skip the hook
it's currently inside (`afterParsed` in this case) --
splicing the array we're iterating would cause the
surrounding `trigger()` loop to skip a sibling handler.
The skipped entry stays in `this._registered` forever, but
it's a one-shot anyway: harmless.

`Footnotes.afterParsed` then becomes:

```js
afterParsed(parsed) {
    this.processFootnotes(parsed, this.footnotes);
    if (!parsed.querySelector("[data-note='footnote']")) {
        this._unregisterAll("afterParsed");
    }
}
```

Profile delta (post-fast-path vs post-self-disable):

| metric | post-fast-path | post-self-disable | Δ |
| ------ | -------------- | ----------------- | --- |
| render wall | 12.14 s | **11.77 s** | **-0.37 s** |
| samples | 22,433 | 21,809 | -624 |
| **`getBoundingClientRect` self** | **4,714 ms** | **4,198 ms** | **-516 ms** |
| `removeChild` self | 1,902 ms | 1,898 ms | flat |
| `(program)` self | 2,022 ms | 2,198 ms | +176 ms |
| `append` self | 76 ms | 69 ms | -7 ms |

The 516 ms `getBoundingClientRect` drop is exactly the
`Footnotes.afterPageLayout` cost that the inventory
predicted -- one gBCR on `noteContent` plus two more in
the `new Layout(noteArea, ...)` constructor plus internal
gBCRs from `findOverflow()`, multiplied by ~1,650 pages.
The `(program)` row growing by 176 ms is V8 reattributing
work between native and self-time as the dispatch pattern
changes; not new work, just a different breakdown.

PDF output remained byte-identical to the previous build
on this content (16.1 MB, same checksum on the raw
Chromium output).

### `Layout.append` parent-lookup cache

When the source walker emits consecutive children of the
same parent, `findElement(node.parentNode, dest)` in
`append()` gets called repeatedly with the same input.
For a parent with N children that's N - 1 redundant
lookups -- each one cheap (`getAttribute("data-ref")` +
`dest.indexOfRefs[ref]` is an O(1) dict hit on the fast
path), but the call count is north of 100k per render.

Patch: a three-property memo on `Layout` -- last
`srcParent`, last `dest`, last `destParent`. Hit check at
the top of `append`, writeback at the bottom after the
parent is resolved (whether via direct lookup or via the
rebuild-ancestors branch, since the rebuild attaches the
cloned ancestor into `dest`).

Invalidation: reset all three at the top of every
`renderTo`. The cache is safe within a single `renderTo`
loop because `append()` never detaches DOM from `dest`,
and `removeOverflow` (the one thing that does) only fires
at loop exit. Across `renderTo` calls on the same `Layout`
instance the previous run's `removeOverflow` may have
detached the cached parent, so the explicit reset is the
correctness guard.

Profile delta (post-self-disable vs post-parent-cache):

| metric | post-self-disable | post-parent-cache | Δ |
| ------ | ----------------- | ----------------- | --- |
| render wall | 11.77 s | 11.72 s | flat (within noise) |
| samples | 21,809 | 21,688 | -121 (~65 ms) |
| `(program)` self | 2,198 ms | 2,169 ms | -29 ms |
| `getAttribute` (native) | 43 ms | off-list (<40 ms) | -3 ms+ |
| `querySelector` (native) | 63 ms | 59 ms | -4 ms |
| `Layout.append` self | 69 ms | 70 ms | flat |

Order ~50-100 ms saved depending on the row chosen, fully
below the run-to-run wall-clock noise band but visible in
the cpuprofile rows. The math checks: ~100k append calls
× ~80 % sibling-cache-hit rate × ~1 us per skipped
findElement ≈ 80 ms.

PDF output byte-identical.

### What didn't land: the `_ref` expando

One sibling candidate to the parent-lookup cache was
tried and reverted. The idea: mirror `data-ref` onto a
plain JS property `_ref` at decoration time (in
`ContentParser.addRefs`), propagate via the `cloneNode`
helper, and read it in `findElement` and `append`'s
postlude instead of `getAttribute("data-ref")` /
`clone.dataset.ref`. Both reads in the hot path become
plain JS property loads instead of going through C++ DOM
attribute fetches or the `DOMStringMap` proxy.

Measured win on the per-row breakdown:

- `Layout.append` self 69 -> 47 ms (-22 ms).
- `getAttribute` native 43 ms -> off-list (-3+ ms).

About 25 ms of real per-call work removed. Reverted: the
saving is genuinely smaller than the diff's surface --
`cloneNode` helper has to propagate an extra property,
the `data-ref` attribute has to stay for CSS selectors
and the `querySelector` fallback in `findRef`, `findElement`
needs a `||` fallback to keep direct `.cloneNode()`
callers in `rebuildAncestors` working unchanged, and any
future code that wants the ref has two places it could
read from. Not worth maintaining for a saving that
doesn't move single-run wall-clock.

Lesson worth carrying forward: at this point in the
codebase, per-call findElement / `dataset.ref` work has
been ground down close enough to its floor that any
further shave produces savings in the 20-50 ms band, well
below the run-to-run wall-clock noise on this machine.
Reading the cpuprofile per-row deltas is the only way to
tell whether such a change is genuine; reading wall-clock
isn't. And the bar for landing scales with the size of
the diff -- the parent-cache landed because it's three
property writes and one branch; the expando didn't
because it's a propagation pattern that ripples through
the bundle.

### Cumulative effect

Across all four landings:

| metric | pre-investigation | post-parent-cache | Δ |
| ------ | ----------------- | ----------------- | --- |
| render wall | 12.63 s | 11.72 s | **-0.91 s (-7.2 %)** |
| samples | 23,313 | 21,688 | -1,625 |
| `getBoundingClientRect` self | 4,825 ms | 4,194 ms | -631 ms |
| `removeChild` self | 1,954 ms | 1,897 ms | -57 ms |
| `removeOverflow` self | 636 ms | 583 ms | -53 ms |
| `getAttribute` (native) | ~125 ms* | off-list (<40 ms) | -85 ms+ |

\* Inferred from the post-tojson baseline rank; not
explicitly tabulated in the top-25 cut at that time.

The `Handler._registered` + `_unregisterAll(except)` plumbing
is reusable: any future handler that determines at
parse/decoration time that it has nothing to do for a given
render can self-disable the same way, and the
empty-handlers fast-path will swallow the per-call dispatch
cost for free. That's the pattern this work leaves behind --
combine "detect once at a known-quiet point" with "remove
yourself from the dispatch chain" and you pay zero
ongoing cost for inactive handlers.

## Skipping the `wrapContent` innerHTML round-trip

The post-append-cache profile's 5th-largest JS row was
`wrapContent` at 260 ms. It's called once per render, right
at the top of `Chunker.flow`, so unlike the previous fixes it
has no per-page hot path -- the absolute size is the whole
story.

`Layout.wrapContent` lifts the entire `<body>` into a
`<template data-ref='pagedjs-content'>` so the chunker can
iterate the source without disturbing the live DOM. Original:

```js
template.innerHTML = body.innerHTML;
body.innerHTML = "";
body.appendChild(template);
```

Two heavy halves, both linear in document size:

1. **`body.innerHTML` getter**: walks every node in the body
   and serialises the entire subtree to one HTML string.
2. **`template.innerHTML = ...` setter**: hands the string to
   the HTML parser, which reparses it into a fresh tree
   inside the template's contents-owner document.

On our 5.5 MB book, the round-trip is exactly 260 ms.
`find-callees.mjs` confirms 99 % of that lives in the JS frame
itself (the C++ serialiser/parser get attributed back to the
calling frame, same trick `removeOverflow`'s `Range`
deletion uses):

```
wrapContent: self=259.97ms, total=262.15ms (callees=2.18ms)
per direct callee (subtree total ms):
      2.18 ms   querySelector  @  (native):0
```

The fix moves children directly into a plain
`DocumentFragment`, no string round-trip:

```js
let fragment = document.createDocumentFragment();
while (body.firstChild) fragment.appendChild(body.firstChild);
template = document.createElement("template");
template.dataset.ref = "pagedjs-content";
template._pagedjsContent = fragment;  // re-entrancy stash
body.appendChild(template);
return fragment;
```

### Why a plain fragment, not `template.content`

The first cut moved children into the template's content,
which is the obvious shape since `wrapContent` was already
returning `template.content`. It crashed on the first page:

```
paged.js (forked): image not loaded at render time.
Image: file:///.../Features/Images/b0724fe2-....png
   at Layout.waitForImages
   at Layout.renderTo
```

The reason is in the spec. A `<template>`'s `content` fragment
is owned by a separate "template contents owner document"
that has no browsing context -- resources inside it never
load. Moving a live `<img>` into `template.content` triggers
`adoptNode` to that inert document, which then runs the
"update the image data" algorithm, creates a fresh request
in state "unavailable", and flips `.complete` to false. The
source image is now stuck in that state; clones into the live
page wrappers inherit it without the synchronous cache-hit
path firing in time for the sync `[PATCH: assert-sync]`
`waitForImages` check.

The `innerHTML` round-trip avoids this incidentally: the
freshly-parsed `<img>` elements in `template.content` are
brand new (never live), they have no prior load state to
disturb, and when their clones land in the live page wrappers
Chromium's file:// cache lookup resolves them synchronously.

A plain `DocumentFragment` is owned by the live document.
Moving children into it is a same-document append -- no
adoption, no "update the image data", no `.complete` reset.
Clones from the fragment into the live page wrappers then
take the same fast cache path the round-trip's parsed images
did.

### Re-entrancy

The original returned `template.content`, so a second call
finding the existing template just returned that same
fragment. Under the move strategy `template.content` is
empty (the children live in the plain fragment we returned),
so the re-entrant branch reads the fragment back off a
`template._pagedjsContent` expando on the marker template.
Functionally equivalent for the one-call-per-render case
that's actually exercised; preserves the multi-call contract
in case anyone leans on it later.

### Results

Paired A/B, 2 runs each, `--detach-pages --no-timing
--cpu-profile --cpu-sampling 100`:

| run | pre | post |
| --- | --- | --- |
| 1 | 11.92 s | 10.72 s |
| 2 | 11.60 s | 11.06 s |
| **avg** | **11.76 s** | **10.89 s** |

**Δ = -0.87 s render (-7.4 %).** Larger than the 260 ms the
profile attributed to `wrapContent` itself -- the round-trip
also allocated a transient 5.5 MB string that pushed GC and
distributed sample noise into the surrounding rows; removing
the allocation relieves pressure across the whole per-page
hot path. The cpuprofile rows breakdown:

| function | pre | post | Δ |
| -------- | --- | ---- | --- |
| `wrapContent` self | 260 ms | off-list (<25 ms) | **-260 ms+** |
| `getBoundingClientRect` self | 4,281 ms | 4,036 ms | -245 ms |
| `removeOverflow` self | 560 ms | 353 ms | -207 ms |
| `removeChild` self | 1,871 ms | 1,730 ms | -141 ms |
| `(program)` self | 2,298 ms | 2,152 ms | -146 ms |

The `wrapContent` row is the only one outside the single-run
noise band (*Methodology: compare profiles, not wall-clock*
in [02-finalizepage.md](02-finalizepage.md) pins
that at 50-150 ms for sub-1 % rows on this machine). The
others are plausibly real but inseparable from noise without
more runs; the sample-count delta (-2,100 samples × 542 us
= ~1,135 ms) matches the wall-clock delta closely enough that
the distributed component is probably real GC-pressure
relief, not just sampler jitter.

PDF byte-equivalent to the pre-fix build (16.1 MB).

### What the pattern leaves behind

`removeOverflow` and `wrapContent` are both cases where V8
rolled native DOM work (`Range.deleteContents`,
HTML serialiser+parser) into the calling JS frame's
self-time. The diagnostic move is the same one we used for
gBCR attribution: `find-callees.mjs` on the suspect frame.
If self-time is ~100 % of total, the work is happening
inside a native callee the sampler didn't name -- read the
JS body to find which DOM API is doing the work and whether
it can be replaced with a cheaper equivalent.

`find-callees.mjs` was added for this investigation and
sits alongside `find-callers.mjs`; the two together cover
both directions of the V8 attribution edge.

## The per-page overflow-check rhythm: two bugs in the adaptive `maxChars`

*Attempt E: additive backoff* in
[02-finalizepage.md](02-finalizepage.md) describes
the per-page rhythm of `renderTo`'s overflow checks: append
nodes, fire `findBreakToken` every `maxChars` chars of
appended content, break out when it returns a non-null
breakToken. `maxChars` defaults to 1500 and is meant to
adapt up or down based on observed page capacity.

The post-wrapContent profile showed `findOverflow` total
2.24 s, almost all of it (1.96 s) in `hasOverflow`'s single
gate gBCR -- one call per `findBreakToken`. Was the call
count high because the page actually needs that many
probes, or was the rhythm wrong?

Instrumenting with `window.__breakCheckStats` and
`window.__layoutMaxChars` answered it:

```
findBreakToken checks: 7,764  hits: 862  nulls: 6,902
renderTo calls: 1651  checks/call avg: 4.70
Layout.maxChars: first=1500  median=177  last=177  min=177  max=1500
```

Four findings:

1. **89 % of checks (6,902 / 7,764) return null.** They're
   "no overflow yet, keep appending" probes. Each is still
   a full layout-flush gBCR. The actual overflow detections
   are 862, slightly more than half of the 1651 pages
   (the rest end naturally, or via CSS-driven breaks).

2. **`Layout.maxChars` was locked at 177 for the entire
   render** after page 1. That's an order of magnitude
   below a typical page's capacity (which the @page CSS,
   font size, and content density determine -- closer to
   4000-4500 chars of body text on this book). Page 1 ran
   with the default 1500; pages 2-1651 ran with 177.

3. The reason was a propagation gate in `Page.layout`:
   ```js
   if (!settings.maxChars && maxChars) {
       settings.maxChars = maxChars;
   }
   ```
   `settings` is shared across all pages (one object, set
   by reference in the Chunker constructor). The chunker
   maintains a running estimate in `this.maxChars` via
   `recordCharLength` and passes it into each page's
   `layout(..., maxChars)`. But `!settings.maxChars` is
   only truthy on the first page that gets a defined value
   -- the rest see settings.maxChars already populated and
   skip the update. Whatever value page 2 picked up (177,
   from a freak short page 1 that had been recorded as
   capacity), every subsequent page kept.

4. The recording itself is biased. `recordCharLength` pushes
   `page.wrapper.textContent.length` after every layout and
   averages the last 4 values. Short pages -- chapter
   endings, part dividers -- get recorded alongside full
   pages, dragging the average well below true capacity.
   Even with propagation fixed, the average would land
   around 1200, not 4500.

### The fix

Two patches in `docs/lib/paged.browser.js`, marked
`// [PATCH: maxChars-propagate]` and `// [PATCH: maxChars-
running-max]`:

1. **`Page.layout`'s gate drops the staleness check**:
   `if (maxChars) settings.maxChars = maxChars;`. Each page
   now picks up the chunker's current estimate.

2. **`Chunker.recordCharLength` tracks the running max over
   the last 16 pages** instead of the running average over
   4. Max biases toward "the largest page recently seen,"
   which approximates true capacity for our content. Short
   pages still get pushed into the window but don't pull
   the estimate down. The window of 16 is wide enough that
   a transient stretch of short pages doesn't collapse the
   estimate before a full page restores it.

### Results

Paired A/B, 2 runs each, `--detach-pages --no-timing`, no
profiling:

| run | pre | post |
| --- | --- | --- |
| 1 | 10.08 s | 8.15 s |
| 2 | 11.86 s | 7.98 s |
| **avg** | **10.97 s** | **8.07 s** |

**Δ = -2.90 s render (-26 %).** CPU profile (single run,
within noise band on the smaller rows):

| metric                   | pre        | post       | Δ |
| ------------------------ | ---------- | ---------- | --- |
| `findOverflow` total     | 2,236 ms   | 1,690 ms   | **-546 ms** |
| ↳ `hasOverflow` total    | 1,957 ms   | 1,597 ms   | -360 ms |
| ↳ ↳ `gBCR` native        | 1,945 ms   | 1,587 ms   | -358 ms |
| ↳ `findOverflow` self    | 142 ms     | 47 ms      | -95 ms |
| ↳ walker-loop callees    | ~135 ms    | ~46 ms     | -89 ms |
| `removeOverflow` self    | 353 ms     | 122 ms     | **-231 ms** |
| `removeChild` self       | 1,731 ms   | 1,637 ms   | flat (noise) |
| `(program)` self         | 2,152 ms   | 2,215 ms   | flat (noise) |

The `removeOverflow` drop was the surprise. Going in, the
concern was that bigger `maxChars` (now ~4500 instead of
177) would mean larger overshoot when overflow fired -- so
`extractContents` / `deleteContents` would have more nodes
to detach. The opposite happened: `removeOverflow` self
dropped two-thirds. The reason is the call count, not the
per-call size. With `maxChars=177` the renderTo loop
checked at every 177-char interval, but many of those
checks were *near* the page boundary, where the walker in
`findOverflow` did real work even when returning null
(walking nodes to test text-break candidates that don't
quite fit). With `maxChars=4500`, the very first check on
most pages fires right at the overflow point; the walker
runs once per page instead of several times, and the per-
call work it does is roughly the same as before.

PDF output is byte-identical to the pre-fix build
(16.1 MB, same checksum on the raw Chromium output).

### Why the average was the wrong statistic

The textbook reason to track a running average is to
estimate a stationary quantity in the presence of noise.
The thing being estimated here -- "how many chars fit on a
full page" -- is a tight ceiling, not a noisy reading: each
page's textContent.length either equals page capacity
(because the page broke for overflow) or is well below it
(because content ran out / a CSS break fired). The
distribution is bimodal, and the average sits between the
modes -- exactly where it's worst as an estimator of
either.

The running max, by contrast, finds the upper mode and
sticks to it. It only moves down if the entire window is
sub-capacity pages, which means the document genuinely
doesn't have full pages anymore (end of book, perhaps), at
which point the estimate doesn't matter much.

### Where this leaves the picture

Render is now ~8 s on the 1651-page book, down from ~11 s
post-wrapContent, down from ~104 s in the original
baseline. Updated cumulative table:

| fix                                 | render saved | shipped |
| ----------------------------------- | ------------ | ------- |
| `--detach-pages` (display:none)     |   ~55 s      | yes     |
| aggressive detach (`removeChild`)   |   ~22 s      | yes     |
| `renderTo` additive backoff         |   ~4.25 s    | yes     |
| skip dead `findEndToken` path       |   ~3.5 s     | yes     |
| `findRef` fast-path                 |   ~2.4 s     | yes     |
| queue-tick: rAF -> queueMicrotask   |   ~2.6 s     | yes     |
| `finalizePage` micro-optimisations  |   ~3 s       | yes     |
| `wrapContent` move (skip innerHTML) |   ~0.9 s     | yes     |
| **`maxChars` propagation + max**    | **~2.9 s**   | **yes** |
| (others, smaller)                   |   ~3 s       | yes     |

The strategic conclusion at the bottom of "Where this
leaves the picture" updates accordingly: render is now
roughly half the size of generate (~8 s vs ~32 s wall on
the production build), and `pageRanges` sharding remains
the only knob with a profile target large enough to move
the wall-clock total meaningfully -- and that target is
generate, not render.
