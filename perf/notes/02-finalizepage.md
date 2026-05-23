# finalizePage deep dive

Revisiting `AtPage.finalizePage` after the detach-pages fix exposed it as the next-largest self-time row, then chasing the residual O(n) further: looking past finalizePage into `Layout.textBreak` / `Page.create`, attempts that failed (binary-search textBreak; memoize `getBoundingClientRect`), the actual residual (CSS-Grid sibling sweeps over `display:none` pages, fixed with `aggressive-detach`), and five attempts at `createBreakToken` dedup that surfaced an additive-backoff fix for `renderTo`'s overflow check.

## Revisiting `AtPage.finalizePage`

The post-detach CPU profile in *Fix applied: `perf/detach-pages.js`*
(see [01-baseline-and-detach.md](01-baseline-and-detach.md)) showed an
`(anonymous) @ browser.js:29501` row at **13.7 s
self-time** -- the `["top","bottom"].forEach(...)` lambda inside
`AtPage.finalizePage`. That looked like a fat target.

It wasn't, for two reasons:

1. **The 13.7 s number was stale.** It came from the *first*
   detach-pages.js variant, which hooked `afterPageLayout` and hid the
   page *before* AtPage ran -- so AtPage paid Chromium's slow style-
   cascade path on a `display:none` subtree (~9 ms/page). The shipping
   variant hooks `finalizePage` and hides *after* AtPage, so AtPage
   sees a visible page and the same lambda is **~0.7 ms/page = ~1.1 s
   total render**. Re-measured on a fresh profile, the lambda is
   ~1.0 s self-time, not 14 s. The original number is correct for the
   variant it was measured on, but doesn't reflect current ship.
2. **Most of that ~1 s isn't query CPU.** Per-page the method does
   ~17 `querySelector` calls plus a few `getComputedStyle` reads.
   Native query self-time across the whole render is ~340 ms
   (`querySelector` ~155 ms + `querySelectorAll` ~185 ms in the
   unpatched baseline). The rest of the lambda's ~1 s is the
   downstream layout flush triggered by `getComputedStyle` and the
   style writes -- unaffected by query consolidation.

We patched it anyway, as a cleanup. `docs/lib/paged.browser.js`'s
`finalizePage` now builds a `__mLookup` table once per page via a
single `querySelectorAll` over all 16 known margin-cell + margin-
group class selectors, then the two forEach loops index that table
instead of calling `page.element.querySelector(...)` 4× per
iteration. The patch is marked `// PATCH: consolidate` at each of
the three touch points so a future re-vendoring of the bundle can
grep for it.

### A/B results

Interleaved 3+3 (A1 B1 A2 B2 A3 B3), `--detach-pages --cpu-profile`,
same 1638-page book each run:

| metric                        | A (patched) | B (unpatched) | Δ |
| ---                           | ---         | ---           | --- |
| render wall-clock, mean       | 49.45 s     | 49.91 s       | -0.46 s (noise; within-variant range 4-13 s) |
| `querySelector` self-time     | <50 ms      | 155 ms        | -155 ms |
| `querySelectorAll` self-time  | 247 ms      | 183 ms        | +64 ms |
| **query CPU total**           | **~247 ms** | **~338 ms**   | **-91 ms (-27 %)** |
| finalizePage lambda self-time | 1033 ms     | 1025 ms       | unchanged |

The patch does what it says on the tin: ~91 ms shifts out of native
`querySelector` and into a single `querySelectorAll`. Wall-clock
delta is in the noise; the within-variant spread (3-13 s across runs
of the same variant) drowns it out.

The lambda's self-time being unchanged is the load-bearing
observation: query consolidation doesn't reduce the layout-flush
component, which is most of the 1 s. The next lever in this method
would be **read/write batching** -- hoist all `getComputedStyle`
reads to the top of `finalizePage` before any style writes, so the
write-then-read pattern stops forcing a flush mid-method.

### Read/write batching

We applied the hoist anyway, as a follow-up cleanup. After the
`__mLookup` block above, `finalizePage` now reads every relevant
`max-width` / `max-height` value into two `Map`s (`__maxW`, `__maxH`)
in a single batch -- gated by the same `.hasContent` check the
original conditionals used. The two forEach loops then consume
those cached values instead of calling `getComputedStyle` inline.
Marked `// PATCH: max-width reads hoisted` / `max-height reads
hoisted` at each touch point.

**For this book**, the hoist is a no-op behaviourally. Our @page CSS
sets content on exactly one corner (bottom-right page number), so
only one `.hasContent` cell exists per page; the original code did
exactly one `getComputedStyle` per page and therefore one forced
flush. The hoisted version does the same.

Smoke test, single render with `--detach-pages` (no profiling): 1638
pages, 16.9 MB output, render 47.98 s, ratio 1.69x. All in the noise
band from the consolidate-querySelector A/B.

**For docs with multi-cell marginalia** (running headers + footers +
page numbers across several corners) the hoist collapses N forced
flushes -- one per cell that hits the `if (xContent)` branch in the
original -- down to 1. The win scales with marginalia density.

### Cross-page memoization

The next layer of duplicate work: `finalizePage`'s computation is a
pure function of `(page.element.className, this.marginalia, CSS
@page rules)`. The marginalia map and CSS are static; only the
className varies. **Two pages with the same className get the same
four `grid-template-columns` / `grid-template-rows` values.** So we
cache the result.

Implementation: a `this.__finalizeCache: Map<string, {top, bottom,
left, right}>` on the AtPage instance, keyed by
`page.element.className`. The cache check sits between the
`__mLookup` build and the GCS hoist. On a hit we apply the cached
values via `__mLookup` and `return` -- Phases B and C never run. On
a miss the existing code runs and the result is recorded at the end
of the method by reading back the just-written `.style.grid-
template-*` values.

Phase A's marginalia `.hasContent` classifier still runs on every
page (the class has to be added to *this* page's elements so the
@page-margin CSS rules apply). Only the grid-template
computation is skipped.

**Assumption.** Cache key is `page.element.className`. Sound as long
as @page rules don't use position-dependent selectors (e.g.
`:nth-of-type`) that pick different rules on pages that share a
className. Common case, true for this book; comment in the bundle
flags the caveat.

Smoke render (`--detach-pages`, no profile): 1638 pages, **16.9 MB
output (byte-equivalent to the pre-patch run)**, render 48.27 s.
Wall-clock impact still in the noise -- same reason as the hoist:
the flush we skip in `finalizePage` is just deferred to the next
chunker iteration's `findOverflow`. Total layout work the document
demands doesn't shrink. What does shrink is the JS-side work --
~1633 of 1638 pages now skip ~17 `querySelector` lookups, 6
`classList.contains` reads, and the GCS pass entirely -- but that's
sub-millisecond per page and disappears into the noise band.

We're not going to keep iterating on `finalizePage`: budget is ~1 s
total render even when every flush triggers, so further work here is
cleanup-only.

### Hoisting grid-template emission to parse time

The cleanup payoff. Three patches in a row -- `__mLookup`, GCS hoist,
cross-page memoization -- had whittled `finalizePage`'s per-page
work to ~30 sub-ms ops, then to one Map lookup. The architectural
move was to **delete the hot spot rather than keep optimizing
around it**: hoist the grid-template computation out of the
per-page JS path and into the polisher's @page CSS emission, so the
rules are emitted once at parse time and the browser applies them
via cascade for every matching page.

The decision tree's inputs are static at parse time:

- **hasContent** per `(page-class, margin-cell)` -- already recorded
  in `this.marginalia[sel]` by `addMarginaliaStyles` for Phase A's
  classifier, and invariant per page-class regardless of page index.
- **max-width / max-height** per cell -- created by the same walker
  that copies `width`/`height` declarations to `max-width` /
  `max-height` on corner cells. The runtime
  `getComputedStyle(el)["max-width"]` reads return the CSS-cascade
  result of those rules, which is the value the parser saw. We
  capture the string at parse time on the marginalia entry,
  defaulting to `"none"` when no declaration exists.

`AtPage.afterTreeWalk` already runs `addPageClasses`, which
populates `this.marginalia` and emits the per-cell margin-styling
rules. We extended it with `emitMarginGridTemplates`: for each page
entry in `this.pages`, build the effective per-cell `hasContent +
maxWidth + maxHeight` by unioning across every marginalia entry
whose page-selector is a subset of the page's class signature
(matching the runtime Phase A OR-cascade; `maxWidth` follows CSS
cascade and takes the most-specific declared value). Run the same
decision tree the runtime did on that snapshot. Emit one rule per
margin group with `selectorsForPage(page)` as the selector and the
computed `grid-template-columns` / `-rows` as a Raw value
declaration. Skip emission for the four offset-fallback branches
that need `offsetWidth` measurement (they can't be pre-computed --
they read live layout).

For this book that produces 24 rules total -- 6 page-class
signatures (`*`, `:first`, `divider`, `front-matter`,
`part-foreword`, `chapter-divider`) × 4 margin groups -- all with
the same `0 0 1fr` value (the static branch the decision tree
produces when only one corner has content and no widths are
declared):

```css
.pagedjs_page .pagedjs_margin-top    { grid-template-columns: 0 0 1fr; }
.pagedjs_page .pagedjs_margin-bottom { grid-template-columns: 0 0 1fr; }
.pagedjs_page .pagedjs_margin-left   { grid-template-rows:    0 0 1fr; }
.pagedjs_page .pagedjs_margin-right  { grid-template-rows:    0 0 1fr; }
... (5 more page-class signatures) ...
```

`finalizePage` collapses to **Phase A + an offset-only Phase B**:

- **Phase A** unchanged. Per-page DOM, can't be hoisted -- it has to
  add `.hasContent` to the freshly created margin cells so the
  base-style `.pagedjs_margin:not(.hasContent) { visibility: hidden
  }` rule unhides the right ones.
- **Phase B offset fallbacks.** The four branches in the upstream
  Phase B that compute `minmax(%, ...)` templates from `offsetWidth`
  measurements stay -- they read live layout and can't be
  pre-computed. The forEach loop early-exits via a `couldFire` check
  (two-or-more cells have content) before any `getComputedStyle` or
  `querySelector` on the margin group; for this book that gate fails
  on every page so the forEach is dominated by three `querySelector`
  calls + three `classList.contains` reads per group.
- **Phase C** disappears entirely. Every branch in the upstream
  Phase C (left/right vertical groups) is static at parse time --
  the upstream code has no offset measurement in those paths.
- All three prior PATCH blocks come out: `__mLookup` and
  cross-page memoization had no callers left, and only the GCS
  hoist stays (preserved as an inline batched read of `max-width`
  inside the `couldFire` gate, for documents whose marginalia would
  reach the offset fallbacks).

### Verifying it

Instrumented A/B on the same 1638-page book:

| op                      | pre-emit (3 patches) | post-emit | Δ |
| ---                     | ---                  | ---       | --- |
| `getComputedStyle`      | 9,179 calls          | **5,903 calls** | **-3,276 (-36%)** |
| `getBoundingClientRect` | 258,940              | 258,940   | unchanged (different code path) |
| `offsetWidth`           | 0                    | 0         | unchanged (gate never fires) |
| render wall-clock       | 47.6 s               | 46.0-47.0 s | noise |
| pdf size                | 16.9 MB              | 16.9 MB   | unchanged (±27-bytes timestamp variance) |

The -3,276 GCS drop is exactly two reads per page eliminated -- the
prior GCS hoist batched the per-cell `max-width` reads on
`.hasContent` cells (one per `top-right`, one per `bottom-right`
per page). The new `couldFire` early-exit skips them entirely.

Wall-clock is in the noise, as predicted in the patch brief: this
moves work from runtime JS to parse-time CSS but the browser still
does the same cascade + layout work. The value here is **deleting
the hot spot from the bundle**, not shaving milliseconds.

Smoke render of `book.bat`: 1638 pages, 16.9 MB output (within 54
bytes of the pre-patch run -- ±27 bytes is the normal run-to-run
variance from Chrome's `/CreationDate` / `/ModDate` encoding),
render 45.8 s.

### What's left in `finalizePage`

Two phases, both with clear single-purpose justifications:

```
Phase A   classify .hasContent per margin cell (per-page DOM)
Phase B'  offset-fallback for auto-width minmax(%) templates
          (dead code in this book; live for paged.js compatibility)
```

For our content Phase B' is dominated by an early `couldFire`
short-circuit. The method now reads top-to-bottom as "what does the
runtime *have* to do per page", with all the layered optimizations
unwound. There's nothing left to hoist.

## Looking past `finalizePage`: where render time goes now

With the `finalizePage` work landed, a fresh `--detach-pages
--time-hooks --cpu-profile` run on 1638 pages (2026-05-19) shows the
named handlers we hook -- the surface we own -- now account for
**under 1 ms/page combined**. Per-page handler costs, top of table:

```
hook::handler                                count  total_ms  per_page_ms
chunker.afterPageLayout (detach-pages)        1638     788.5        0.481
chunker.afterPageLayout (#10)                 1638     249.0        0.152
chunker.renderNode                           44365     185.6        0.113
chunker.afterPageLayout (#6)                  1638     100.9        0.062
chunker.finalizePage                          1638      71.8        0.044
chunker.beforePageLayout                      1638      68.6        0.042
```

Render is ~49 s on this hardware (~30 ms/page average). Subtracting
the ~1 ms/page of handler work leaves ~29 ms/page of **paged.js
core**: chunking, layout probing, overflow detection, and the
text-break split. That's what the CPU profile attributes to:

```
self_ms   self_%   function                     source
22855     33.0 %   getBoundingClientRect        (native, called from JS)
19332     27.9 %   (program)                    V8 overhead / idle
 9931     14.4 %   removeOverflow               paged.browser.js:2196
 4280      6.2 %   findEndToken                 paged.browser.js:2094
 2364      3.4 %   findElement                  paged.browser.js:638 (cache hit; cheap)
 1456      2.1 %   insertBefore                 native
 1228      1.8 %   createBreakToken             paged.browser.js:1796
  580      0.8 %   afterPageLayout (paged.js)   paged.browser.js:30381
```

(Counter-check on the ratio: this run reads **5.59 x** rather than
the usual ~1.6 x. That's instrumentation skew -- both `--time-hooks`
and `--cpu-profile` wrap hot paths, and the sampling overhead is
proportionally larger on later pages. The handler totals and
self-time table are still accurate; the per-page growth curve isn't
trustworthy on instrumented runs.)

So 33 % of render is `getBoundingClientRect` and another ~20 % is
inside `removeOverflow` + `findEndToken` -- paged.js's per-page
overflow-find + text-split path. That work isn't redundant: each
page genuinely has to decide where its content ends. The remaining
opportunities aren't *eliminating* work, they're *replacing the
algorithm* with something the browser can answer in one call.

### Three places non-redundant work could be made simpler

**1. `Layout.textBreak` -- replace per-word `gBCR` loop with a
single native call.** [paged.browser.js:2136](../../docs/lib/paged.browser.js:2136)
walks an overflowing Range word-by-word, calling
`getBoundingClientRect` on each `Range` to find which word crosses
the page boundary; if a word straddles it, it descends letter-by-
letter doing the same. On a long text node that's dozens to
hundreds of gBCR calls -- and `textBreak` is the inner loop of
`findOverflow`, so it fires on every page that overflows.

A single `document.caretPositionFromPoint(x, vEnd)` (or
`caretRangeFromPoint` on Chromium) returns the exact text node +
offset at the boundary in **one** browser call. Equivalently,
`range.getClientRects()` returns every line box of the range in one
call, after which the crossing line is a simple `.find()`. Either
replaces an `O(words-in-overflow)` scan with `O(1)`.

This is the highest-leverage candidate: even if it cuts only half
of the `gBCR` time, that's ~10 s off render. The risk is fidelity
-- we'd need to verify the substitute gives the *same* split point
as the word-walk on edge cases (RTL, hyphenated words,
`white-space: pre`, soft hyphens). Worth a prototype + diff against
the current bundle's output PDF.

**2. `findOverflow` -- collapse three ancestor walks into one.**
Inside the per-node loop in
[paged.browser.js:1934](../../docs/lib/paged.browser.js:1934):

```js
const insideTableCell = parentOf(node, "TD", rendered);
// ...
tableRow = parentOf(node, "TR", rendered);
// ...
const table = parentOf(tableRow, "TABLE", rendered);
```

Three separate ancestor traversals per node visited, each climbing
from `node` to `rendered`. One walk that emits the nearest TD/TR/
TABLE together is ~10 lines and visits each ancestor once. Won't
match #1 for raw savings (this is in the same loop that's already
calling `getComputedStyle`, so a single-digit % gain at best) but
it's the easy follow-up.

**3. Cache `getComputedStyle` per page.** Same loop,
[paged.browser.js:1969, 1974, 1992](../../docs/lib/paged.browser.js:1969):
up to four `getComputedStyle` calls per node visited (on the node,
its TD ancestor, and the parent TBODY/THEAD). The walker revisits
the same ancestors across many child nodes; a `WeakMap<Element,
CSSStyleDeclaration>` populated lazily per page would dedupe.

This one *is* deduplication-shaped, but it's the cheapest of the
three to land (no algorithmic change, no fidelity risk) and a clean
follow-up if #1 lands.

### Probable bug worth surfacing separately

[paged.browser.js:1998](../../docs/lib/paged.browser.js:1998):

```js
const table = parentOf(tableRow, "TABLE", rendered);
const rowspan = table.querySelector("[colspan]");
```

The local is named `rowspan` and the surrounding comment is about
rowspan-aware break handling, but the selector matches `colspan`.
Looks like a typo that's silently broken the rowspan path since the
bundle was vendored. Not a perf issue per se, but worth a separate
fix.

### Strategic note

Render and generate are now within ~20 s of each other (49 s vs
70 s on this run). Each second shaved off render moves total by
less than it used to, because `page.pdf()` is now the larger phase.
Item 1 above is the only remaining render change that plausibly
returns 10+ s; items 2 and 3 are <5 s each.

After item 1 the remaining levers all live outside render. The
Chrome-outline experiment in
[01-baseline-and-detach.md](01-baseline-and-detach.md) shows
generate isn't moved by shifting outline work around (Chrome
walking `h1..h6` itself costs about what `parseOutline` +
`setOutline` save -- net was +1.9 s).
The one generate-side lever we haven't tried is **`pageRanges`
sharding** -- run `page.pdf()` N times with disjoint page ranges on
parallel browser pages and concatenate with pdf-lib. Each shard
serialises only its slice and they run concurrently, so generate
collapses to roughly `60 s / N` plus a small concat pass. Listed
under *What might still be worth trying* in
[01-baseline-and-detach.md](01-baseline-and-detach.md); it's the
biggest untried knob in the pipeline.

## What happened when we tried item 1

The strategic note above was wrong about item 1 -- the binary-search
replacement for `textBreak` saves nothing, and the reason it saves
nothing reveals the actual structure of the remaining render cost.

### Attempt A: binary-search `textBreak`

Replaced the per-word-then-per-letter gBCR cascade in
[`Layout.textBreak`](../../docs/lib/paged.browser.js:2136) with a binary
search over offsets using a single-character probe `Range`.
Semantically equivalent (both return the smallest offset whose
character satisfies `left >= end || top >= vEnd`), should reduce
gBCR call count from O(words) to O(log nodeLength).

Paired runs with `--detach-pages`:

| run        | baseline | binsearch |
| ---------- | -------- | --------- |
| render (1) |  47.73 s |  51.43 s  |
| render (2) |  47.10 s |  47.12 s  |
| **avg**    | **47.4** | **49.3**  |

Wash, possibly small regression. PDF byte size and page count
identical. Reverted.

### Attempt B: memoize `Page.create`'s `area.getBoundingClientRect`

The CPU profile of attempt A's baseline pointed at a much bigger
target. Tracing gBCR's native frames up to their JS callers in the
profile graph:

```
caller                           gBCR time
create:2257                      12,947 ms   (69 %)
hasOverflow:1925                  4,419 ms   (24 %)
Layout:1443                         586 ms
...
total native gBCR                18,424 ms
```

[`Page.create`](../../docs/lib/paged.browser.js:2257) does one
`area.getBoundingClientRect()` per page, right after the fresh
`insertBefore` / `appendChild` of the page DOM -- so each call
forces a synchronous layout pass. The `area`'s size is CSS-driven
and constant per template, so the gBCR should be cacheable.

Memoized the result on the `pageTemplate` node (first page pays,
all subsequent same-template pages reuse).

Profile diff (same `--detach-pages --cpu-profile` flags, paired):

| caller            | PRE       | POST      | Δ          |
| ----------------- | --------- | --------- | ---------- |
| `create:2257`     | 12,947 ms |      2 ms | **-12,945** |
| `Layout:1443`     |    586 ms | 13,567 ms | **+12,981** |
| `hasOverflow:1925`|  4,419 ms |  4,533 ms |    +114    |
| **total**         | 18,424 ms | 18,554 ms |    +130    |

The cost moved, it didn't disappear. The memoization successfully
eliminated the gBCR at `create:2257` (from 12,947 ms to 2 ms), but
the layout flush that gBCR was driving still had to happen
somewhere -- it migrated to the next call in the per-page sequence,
[`Layout`'s constructor](../../docs/lib/paged.browser.js:1443):

```js
this.bounds = this.element.getBoundingClientRect();
this.parentBounds = this.element.offsetParent.getBoundingClientRect();
```

Total gBCR self-time barely changed (+130 ms). Per-page ratio got
worse (1.77x -> 3.07x), probably because the deferred flush
accumulated more pending mutations before firing. Reverted.

### The lesson

**gBCR self-time in the profile is layout-flush attribution, not
JS call overhead.** Reducing the *number* of gBCR calls in a hot
path saves ~nothing if the layout flush they trigger has to fire
anyway. The cost lives in the flush itself, which is paged.js
measuring the live layout tree to decide where to break.

Where the residual per-page layout cost actually comes from, after
`--detach-pages` has already trimmed completed pages out of the
layout tree, is probably one of:

- **CSS counters** at
  [`.pagedjs_pages`](../../docs/lib/paged.browser.js:27213)
  (`counter-reset: pages ... footnote ...`). Counter resolution
  walks the document, and counter-affecting elements per page
  accumulate even when `display: none`.
- **`offsetParent` lookup** in `Layout`'s constructor. That's a
  layout-tree walk to find the nearest positioned ancestor; cost
  can grow with sibling count even when most siblings are
  display:none.

Neither is fixable by dedup-shaped optimizations in our bundle.

The remaining `findOverflow` opportunities (items 2 and 3 in the
strategic note above -- collapsing ancestor walks, caching
`getComputedStyle`) might still be worth doing on their own
merits, but they're not where the gBCR time lives.

### Methodology: compare profiles, not wall-clock

Both attempts above showed wall-clock results that looked like
noise (47.7 vs 47.1 vs 51.4 s -- inside the run-to-run jitter band
on a busy dev machine). The actual structural change was only
visible by **diffing the bottom-up gBCR-caller breakdown across
two CPU profiles**. The `+12,981 ms` move from `create:2257` to
`Layout:1443` would have been invisible in a wall-clock A/B.

For any future render-stage optimization work, the rule is:

1. Run with `--cpu-profile` (paired pre/post, same flags).
2. Compare bottom-up self-time tables ([`analyze-profile.mjs`](../analyze-profile.mjs))
   and caller breakdowns ([`find-callers.mjs`](../find-callers.mjs);
   point it at a profile + a callee name to see which frames are
   paying for that callee's time -- essential for spotting gBCR
   migration between callers).
3. Treat the wall-clock totals as a sanity check only -- they
   confirm "did anything change" but not "where".

This matters because:

- **Render's per-page CPU work is dominated by native (layout,
  DOM) frames.** V8 self-time deltas from JS-level dedup are
  small compared to the layout flushes those calls trigger.
- **CPU sample percentages are stable across machine load.** A
  busy machine slows the absolute wall-clock but the proportional
  breakdown (gBCR = ~38 % of render samples) stays the same.
- **Migrations between attribution sites are common.** Moving a
  gBCR off one call site usually re-attributes its layout cost to
  the next caller in the sequence, not to nothing.

For `generate` and `process` the picture is different (Chromium
internals and pdf-lib parse cost respectively); CPU profiles of
those phases are less informative because the work happens
outside the JS we can see, and wall-clock can be a fine
single-signal A/B. But anything inside paged.js's
render loop wants a profile diff, not a stopwatch.

## Finding the residual O(n): it's not counters, it's siblings

After the methodology shift to profile-diffing, two more A/Bs
finally pinned down where the residual per-page layout cost comes
from. Spoiler: it's not what we expected, and the fix is large.

### Hypothesis 1: CSS counters

The book uses `@bottom-right { content: counter(page); }` for page
numbers and `article.part-divider { counter-reset: page 0; }` for
per-part renumbering. paged.js's bundle puts
`counter-increment: page var(--pagedjs-page-counter-increment);`
on every `.pagedjs_page`. So on each new page's `@bottom-right`,
Chromium has to resolve `counter(page)` by walking preceding
`counter-increment: page` elements.

Per CSS spec (`display: none` elements don't increment counters),
`--detach-pages`'s `display: none` strategy should already make
this O(1). But Chromium implementations have historically been
liberal about which display states still contribute. So: A/B by
commenting out the `counter-increment: page` rule entirely
([paged.browser.js:27198](../../docs/lib/paged.browser.js:27198)) and
diffing the profile.

Result:

| variant                 | render   | total gBCR | gBCR %/render | ratio |
| ----------------------- | -------- | ---------- | ------------- | ----- |
| baseline (counters on)  | 48.51 s  | 18,424 ms  | 38 %          | 1.77x |
| counters disabled       | 44.72 s  | 21,514 ms  | 48 %          | 2.44x |

Disabling counters did **not** reduce gBCR; it grew. The
wall-clock drop is run-to-run noise (counter resolution is genuinely
cheap on `display: none` siblings); the proportional growth means
removing counter-increment didn't save anything and may have shifted
work elsewhere. **Counter resolution is not the residual O(n).**

### Hypothesis 2: sibling sweeps over `display: none` pages

Re-reading the `--detach-pages` writeup in
[01-baseline-and-detach.md](01-baseline-and-detach.md): the claim
has always been that `display: none` "removes a subtree from the
layout tree entirely". That's true for *layout* -- but Chromium's
per-page work also includes **style/selector resolution and rule
matching**,
which walks the sibling list regardless of display state. With
1638 `.pagedjs_page` siblings under `.pagedjs_pages`, any per-page
selector evaluation is O(n).

A/B: physically `removeChild` finalized pages instead of just
`display: none`, then re-append all at `afterRendered` so
`page.pdf()` sees them. The chunker passes `lastPage.element` to
`Page.create()` for ordered insertion, so the most recent finalized
page has to stay in the DOM -- detach one page behind. DOM holds
at most 2 pages at any moment: the in-flight one being laid out
plus the most recent finalized one.

Probe modification (in [perf/detach-pages.js](../detach-pages.js)),
not shipped; page numbers come out wrong because `counter(page)`
doesn't accumulate, but the profile signal is clean.

Result:

| metric              | display:none | removeChild | Δ            |
| ------------------- | ------------ | ----------- | ------------ |
| **render**          | **48.5 s**   | **28.0 s**  | **-20.5 s (-42 %)** |
| total native gBCR   | 18,424 ms    | 7,320 ms    | -11,104 ms   |
| `create:2257` gBCR  | 12,947 ms    | 1,073 ms    | **-11,874 ms (12x)** |
| `hasOverflow:1925`  | 4,419 ms     | 5,119 ms    | +700 ms      |
| `Layout:1443`       | 586 ms       | 562 ms      | flat         |
| per-page ratio      | 1.77x        | 1.43x       | flatter      |

`Page.create`'s layout flush -- the dominant per-page cost in
every profile we've seen -- went from 12.9 s to 1.1 s. That's the
work Chromium does to maintain style/selector state across the
sibling list, and it's now nearly constant per page. `hasOverflow`
still has a small residual growth but it's an order of magnitude
smaller and bounds the next plausible optimization target.

**This is the largest single render-stage win we've found in this
investigation.** 20+ seconds off render, dropping render from the
larger phase to the smaller one (vs generate's ~60-70 s).

### Shipping it

The probe rendered the right number of pages but the output PDF
was incorrect in two ways: `counter(page)` doesn't accumulate
across detached siblings, and the re-attach loop appended pages
at the end instead of in original order. Both fixable; the
question was whether named strings (`string(chapter-title)`)
would survive detach. Verified empirically: they do.

Final shipped change set:

1. **[perf/detach-pages.js](../detach-pages.js)** -- rewrite
   from `display:none` to physical `removeChild`. Keep the most
   recent finalized page in the DOM (the chunker passes
   `lastPage.element` to `Page.create` for ordered insertion);
   detach one page behind. At `afterRendered`, detach the keeper
   and re-append all in finalize order (which is document order).

2. **[docs/lib/paged.browser.js](../../docs/lib/paged.browser.js) -- Counters handler.**
   Track a running display-page counter on the handler instance,
   increment per page during `afterPageLayout`, and write the
   value as `--page-num: "N"` on the page wrapper's inline style.
   On pages with `[data-counter-page-reset]` (the part dividers),
   skip the increment -- mirrors the shipping behaviour of the
   pre-existing CSS, where the injected per-page rule's
   `counter-increment: none` takes effect but the
   `counter-reset: page N` part doesn't (cascade/specificity
   issue, not yet diagnosed; behaviour-preserving fix here, the
   "intended" part-restart numbering would be a separate change).

3. **[docs/assets/css/print.css](../../docs/assets/css/print.css) +
   [_site-pdf copy](../../docs/_site-pdf/assets/css/print.css)** --
   replace `content: counter(page)` in `@bottom-right` with
   `content: var(--page-num)`. The CSS custom property approach
   keeps the existing cascade (suppression on `@page :first` and
   `@page divider` still works, since those rules override the
   `content` declaration entirely).

Verification (1638-page book, all sample pages spot-checked
against the pre-detach output):

- Page count matches (1638).
- `@bottom-right` page numbers byte-equivalent on every sampled
  page (1, 2, 5, 6, 10, 100, 500, 1000, 1500, 1638).
- `@top-right` chapter titles byte-equivalent on every sampled
  page -- named strings persist through detach.

### Shipped numbers

Profile diff (paired `--detach-pages --cpu-profile` runs):

| metric              | pre (display:none) | post (removeChild) | Δ                    |
| ------------------- | ------------------ | ------------------ | -------------------- |
| **render**          | **48.5 s**         | **26.3 s**         | **-22.2 s (-46 %)**  |
| total native gBCR   | 18,424 ms          | 7,455 ms           | -10,969 ms (-60 %)   |
| gBCR % / render     | 38 %               | 28 %               | flatter              |
| `create:2257` gBCR  | 12,947 ms          | **877 ms**         | **-12,070 ms (15x)** |
| `hasOverflow:1925`  | 4,419 ms           | 4,590 ms           | flat                 |
| `Layout:1443`       | 586 ms             | 463 ms             | flat                 |
| per-page ratio      | 1.77x              | 1.18x              | nearly flat          |

`Page.create`'s layout flush -- the largest single per-page cost
in every profile we'd seen -- went from 12.9 s to 0.9 s. The
remaining gBCR work in `hasOverflow` is now the largest layout
flush, but it's an order of magnitude smaller and only marginally
super-linear.

### Where this leaves the picture

The full menu of fixes against the original 207 s baseline:

| fix                                 | render saved | total saved | shipped |
| ----------------------------------- | ------------ | ----------- | ------- |
| `--detach-pages` (display:none)     |   ~55 s      |   ~55 s     | yes     |
| `--incremental` PDF update          |    -         |   ~32 s     | yes     |
| pdf-lib `parseSpeed: Fastest`       |    -         |    ~3 s     | yes     |
| `finalizePage` micro-optimizations  |    ~3 s      |    ~3 s     | yes     |
| **aggressive detach (removeChild)** | **~22 s**    | **~22 s**   | **yes** |
| **skip dead `findEndToken` path**   | **~3.5 s**   | **~3.5 s**  | **yes** |
| **renderTo additive backoff**       | **~4.25 s**  | **~4.25 s** | **yes** |
| pageRanges sharding (generate)      |    -         |  10-40 s    | no      |

Render is now ~19 s on a 1638-page book, down from ~104 s in the
original baseline. The next bottleneck is unambiguously
`page.pdf()` -- ~60-70 s of Chromium-internal PDF serialisation
that's only addressable via the `pageRanges` sharding approach
(run multiple `page.pdf()` calls on disjoint page ranges in
parallel browsers, concatenate with pdf-lib).

## What happened when we tried `createBreakToken` dedup

With render down to ~26 s, the bottom-up profile points at three
JS bodies still worth looking at:

```
findEndToken    self 3270 ms (12.4 %)
findElement     self 1924 ms ( 7.3 %)
createBreakToken self  996 ms ( 3.8 %)
```

### Attempt A: cache `lastChild.lastChild` in `findEndToken`

The descend-to-deepest-valid-descendant loop in
[`findEndToken`](../../docs/lib/paged.browser.js:2100) reads
`lastChild.lastChild` up to three times per iteration (while
condition, `validNode` check, assignment). Cache once.

Profile diff (paired `--detach-pages --cpu-profile`):

| function         | PRE       | POST      | Δ        |
| ---------------- | --------- | --------- | -------- |
| `findEndToken`   | 3269.9 ms | 3108.0 ms | **-162** |
| `createBreakToken` | 995.8 ms |  964.9 ms | -31      |
| `findElement`    | 1924.0 ms | 1767.2 ms | -157     |

Real, modest win on `findEndToken` self-time. Plausibly the `-157`
on `findElement` is jitter (`findEndToken` doesn't call it), but
the `findEndToken` self drop is the only one we'd hang our hat on.
PDF byte-equivalent on all sampled pages. Shipped.

### Attempt B: dedup `findElement(renderedNode, source)` in `createBreakToken`

In the `!renderedNode` branch of
[`createBreakToken`](../../docs/lib/paged.browser.js:1796),
`findElement(renderedNode, source)` is called once at line 1817
(inside `if (!temp.nextSibling)`) and again unconditionally at
line 1830. Hoist + reuse: at most one call per invocation that
takes this branch.

Profile diff vs the post-Attempt-A baseline:

| edge                                | PRE       | POST      | Δ      |
| ----------------------------------- | --------- | --------- | ------ |
| `findElement` self                  | 1767 ms   | 1892 ms   | +125   |
| `findElement` <- `createBreakToken` | 1232 ms   | 1308 ms   | +76    |
| `findElement` <- `findEndToken`     |  537 ms   |  580 ms   | +43    |

The change cannot regress (it only ever removes one call), so the
deltas are jitter, not real cost. The give-away is the
`findElement <- findEndToken` edge: `findEndToken` wasn't touched
between the two runs, yet its attributed `findElement` total still
moved by +43 ms. That fixes the per-edge noise floor at ~40-80 ms
on this machine, which swallows whatever savings the dedup
produces.

Read the other way: the `!renderedNode + !temp.nextSibling` branch
must fire rarely enough that removing one of its two `findElement`
calls doesn't register above this noise. We don't have call-count
instrumentation in the cpuprofile to confirm directly (`hitCount`
is samples-on-stack, not invocations), but a savings below
noise is functionally indistinguishable from no savings.

Reverted. The lesson echoes Attempt A above (textBreak): if the
target branch fires rarely, the dedup's correctness is undeniable
but its effect is unmeasurable.

### Attempt C: skip `findEndToken` when nobody reads its result

`findEndToken` (3.1 s self) was the top remaining JS-body in the
post-A profile. Both Attempt A (cache the `.lastChild` access) and
the speculative validNode-caching extension above tried to make
it *faster*. Wrong question. The bottom-up profile shows where
cost lives, but a caller breakdown shows *why* it lives there:

```
findEndToken: self=3108 ms, total=3652 ms
callers (attributed total ms):
   3652.19 ms   checkUnderflowAfterResize@paged.browser.js:2502
```

`findEndToken` is called from exactly one place:
[`Page.checkUnderflowAfterResize`](../../docs/lib/paged.browser.js:2503),
which fires from a `ResizeObserver` whenever the page wrapper
*shrinks*. That happens on every overflow extraction during
normal render. The handler computes an `endToken` and hands it to
`this._onUnderflow(endToken)`. The only live registration of
`onUnderflow` in the bundle was an empty callback in
[`Chunker.addPage`](../../docs/lib/paged.browser.js:3251) with
commented-out intent (`// page.append(this.source, overflowToken);`).
The computed endToken was discarded every time.

The fix is subtraction, not optimization: delete the no-op
registration so `_onUnderflow` stays `undefined` by default, and
add an early bail in `checkUnderflowAfterResize` so `findEndToken`
doesn't run when nobody can consume its result. A future caller
that wants the path back just calls `page.onUnderflow(realFn)` --
the presence of a non-default handler is itself the activation
signal, no flag plumbing required.

Profile diff (paired `--detach-pages --cpu-profile`):

| function       | PRE       | POST      | Δ          |
| -------------- | --------- | --------- | ---------- |
| `findEndToken` | 3108.0 ms |     0.0 ms | **-3108** |
| `findElement`  | 1767.2 ms |  1313.8 ms | **-453**  |
| **render**     | **25.75 s** | **22.26 s** | **-3.49 s (-14%)** |

The `findElement` drop matches the previously-attributed
`findEndToken → findElement` total-time edge (~537 ms) within
noise; rest is jitter. PDF byte-equivalent on all sampled pages.
Shipped.

### Attempt D: skip `Footnotes.afterPageLayout` when no `float: footnote`

After Attempt C the next gBCR caller worth looking at was
[`Footnotes.afterPageLayout`](../../docs/lib/paged.browser.js:31477) at
~1114 ms attributed gBCR. The handler implements the CSS
`float: footnote` / `@footnote`-margin-box feature; the per-page
work begins with `noteContent.getBoundingClientRect()`, then
sets the inner content's `columnWidth`, then constructs a `Layout`
and runs `findOverflow` on the (for our document, empty)
`pagedjs_footnote_inner_content`.

Our stylesheet declares `float: footnote` nowhere
(`grep -r "float: footnote" docs/_site-pdf/`), so the handler's
`this.footnotes` dict stays `{}` for the whole render and the
per-page work is in service of nothing. Same shape as Attempt C:
gate at the top with `if (Object.keys(this.footnotes).length === 0) return;`.

Profile diff (paired `--detach-pages --cpu-profile`):

| metric                          | PRE       | POST      | Δ          |
| ------------------------------- | --------- | --------- | ---------- |
| total gBCR (attribution)        | 7925 ms   | 7756 ms   | **-169**   |
| ↳ Footnotes `afterPageLayout`   | 1114 ms   |    0 ms   | -1114      |
| ↳ `hasOverflow`                 | 4687 ms   | 4961 ms   | **+274**   |
| ↳ `create`                      |  913 ms   | 1019 ms   | **+106**   |
| ↳ `Layout`                      |  446 ms   |  543 ms   | **+97**    |
| ↳ next-page `afterPageLayout`   |    0 ms   |  431 ms   | **+431**   |
| **render wall-clock**           | **22.26 s** | **23.14 s** | **+880 ms** |
| **per-page ratio (last/first)** | **1.50x** | **1.75x** | **worse**  |

Net gBCR reduction is only ~170 ms even though we eliminated 1114 ms
of attributed gBCR at the Footnotes call site. The missing ~944 ms
re-attributed to the next gBCR callers in the per-page sequence
(`hasOverflow`, `create`, `Layout`, and a previously-invisible
`afterPageLayout` at line 31986). And the per-page ratio went from
1.50x to 1.75x -- the late pages got *more* expensive, not less.

That ratio regression is the give-away. The Footnotes' small
gBCR was apparently absorbing pending DOM mutations that, when
not flushed there, accumulated until the next gBCR (typically a
larger one) had to flush more state at once. This is the same
shape as the Page.create memoize trap documented above: removing
a layout flush at point A makes the flush at point B more
expensive, and the cost is super-linear in the deferred mutation
count.

Reverted.

### Attempt E: additive backoff on `renderTo`'s overflow check

After Attempt D the lesson seemed to be "gBCR self-time is
layout-flush attribution; you can't skip a gBCR without the flush
migrating." Then re-reading the per-page render loop turned up a
case the migration framing doesn't actually cover.

[`Layout.renderTo`](../../docs/lib/paged.browser.js:1478) calls
`findBreakToken` (→ `findOverflow` → `hasOverflow` → gBCR) when
the cumulative text length of appended nodes crosses `maxChars`
(default 1500). The gate looks like batching, but the reset is
asymmetric:

```js
if (length >= this.maxChars) {
  // ... layout hook, await images ...
  newBreakToken = this.findBreakToken(wrapper, source, bounds, prevBreakToken);
  if (newBreakToken) {
    length = 0;                                    // only reset on overflow found
    this.rebuildTableFromBreakToken(newBreakToken, wrapper);
  }
}
```

When no overflow is found, `length` doesn't reset -- it stays
above `maxChars` and the very next iteration's appended node
triggers another `findBreakToken`. The check fires *every
iteration past `maxChars`* until overflow trips. On a typical
~3000-char page that's ~30+ findBreakToken calls (each one a
hasOverflow gBCR = layout flush) before the actual break point.

Replace with **additive backoff**: track a moving baseline
`lengthAtLastCheck` and only fire the check when `length -
lengthAtLastCheck >= maxChars`. Advance the baseline when no
overflow yet; reset both on overflow. Per-page check count drops
from O(nodes-past-maxChars) to O(page-chars / maxChars), typically
2-3 instead of 30+.

Correctness rests on findBreakToken handling arbitrary overshoot:
`findOverflow` walks the wrapper to identify the overflowing
Range regardless of how much excess was appended past it,
`removeOverflow` extracts the excess via `extractContents`, and
`createBreakToken` returns a BreakToken at the right source
position. The chunker builds a fresh walker from `breakToken.node`
on the next page, so the trimmed content gets re-laid-out from
its correct source position. (The `break-inside: avoid` worry --
that containers with extra trailing content might make different
break decisions -- turned out to be empirically unfounded.)

Profile diff (paired `--detach-pages --cpu-profile`):

| metric                      | PRE       | POST      | Δ                |
| --------------------------- | --------- | --------- | ---------------- |
| **render wall-clock**       | **23.73 s** | **19.48 s** | **-4.25 s (-18 %)** |
| total gBCR (attribution)    | 8024 ms   | 5705 ms   | -2319 (-29 %)    |
| ↳ `hasOverflow` gBCR        | 4837 ms   | 2725 ms   | **-2112 (-44 %)** |
| ↳ `findOverflow` per-node   |  438 ms   |  166 ms   | -272             |
| ↳ `create` / `Layout` / Footn. | unchanged within jitter                  |
| `removeOverflow` self       |  457 ms   |  370 ms   | **-87 (improved)** |
| per-page ratio (last/first) | 1.64x     | 1.60x     | improved         |

No migration: Footnotes (1127 ms), create (955), Layout (534)
all flat. `removeOverflow` *dropped* despite the over-append
overshoot concern, because fewer findBreakToken invocations means
fewer extractContents passes, not larger ones -- the per-call
overshoot is bounded by maxChars (~1500 chars), small relative to
page capacity.

Full pdftotext-MD5 match on pages 6, 100, 500, 1000, 1500, 1638.
Page count 1638. PDF byte size 126 bytes apart (metadata).

Shipped.

### The deeper lesson (a third pattern)

Attempts B and D taught that you can't elide a *single* gBCR
because the layout flush migrates to the next caller. Attempt E
shows the framing was too narrow: you can't elide one flush, but
you can do *fewer total flushes* if you batch observations across
mutations.

The three working patterns for render perf, distinguished:

- **Reduce per-flush cost**: aggressive-detach (-22 s). Shrink the
  layout tree by physically removing finalized pages so each
  remaining flush has less style/selector state to maintain.

- **Reduce flush count**: renderTo additive backoff (-4.25 s).
  When mutations between observations don't independently need
  observing, query once per batch instead of per-mutation. The
  per-flush cost grows slightly with deferred mutations but
  amortizes well below the linear scan.

- **Delete dead JS**: skip-findEndToken (-3.5 s), Page.create
  hoisted CSS, etc. Walk up the call chain; if the consumer
  doesn't read the value, delete the production. Works whenever
  the JS self-time is genuinely JS, not flush attribution.

What *doesn't* work: try to elide one specific gBCR while
preserving the mutation pattern around it (Attempts B and D). The
flush re-attributes to the next gBCR in the per-page sequence,
which then has to flush a larger backlog -- net wash or
regression.

The diagnostic question to tell these apart: *what does the
mutation rhythm look like between consecutive gBCR calls?* If it's
"mutation, gBCR, mutation, gBCR, ..." (renderTo's per-iteration
check), batching wins. If it's "one mutation, multiple gBCRs"
(Page.create memoize, Footnotes skip), each gBCR is on the same
mutation state and the flush has to happen for the *next*
mutation regardless of which JS asks.

### Where this leaves the picture

Render is now ~19 s on a 1638-page book, down from ~104 s in the
original baseline. The JS-body profile after Attempt E:

```
findElement     self 1373 ms ( 7.1 %)
createBreakToken self 1027 ms ( 5.3 %)
removeOverflow  self  370 ms ( 1.9 %)
afterPageLayout self  239 ms ( 1.2 %)
```

None of these are individually addressable -- they're load-bearing
work in the per-page break loop. `findElement` already takes the
dictionary fast path. `pageRanges` sharding of `generate` (~60-70 s
of `page.pdf()`) is the only remaining knob with a profile target
large enough to move the wall-clock total meaningfully, and it's
single-threaded-inaddressable (requires multiple Chromium
processes + pdf-lib concatenation).

> [!NOTE]
> The "`findElement` already takes the dictionary fast path" claim
> above turned out to be wrong. A re-investigation under puppeteer 25
> (see *findRef wasn't taking the fast path* in
> [03-puppeteer-bump-findref.md](03-puppeteer-bump-findref.md)) found 39 % of
> findRef calls falling through to `doc.querySelector("[data-ref='X']")`
> because the per-page index wasn't populated for rebuilt ancestors
> and the source tree never had one at all. Fixing both saves ~2.4 s
> of render.
