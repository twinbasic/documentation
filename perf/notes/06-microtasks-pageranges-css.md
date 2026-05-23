# RunMicrotasks down to zero, pageRanges, and CSS cost attribution

Following the `RunMicrotasks` row down to zero by converting the chunker's per-page loop fully sync; ruling out `pageRanges` sharding for `generate` (memory profile makes it impractical); and a CSS cost-attribution sweep showing print.css's individual sections are all below the noise floor.

## Following `RunMicrotasks` down to zero

The Blink-trace investigation in
[05-blink-trace.md](05-blink-trace.md) pinned the cpu
profile's `(program)` row to V8 running JS inside a
microtask continuation. With the WhiteSpaceFilter gone the
`--children RunMicrotasks` breakdown still showed one
`rm[4] = 6262 ms` event enveloping essentially the
whole render -- 15 hits total, 99 % concentrated in one
batched drain. That raised a sharper question: if the
per-page hot path is sync (Phase 1 + 2 of *Stripping
headless-irrelevant async machinery* in
[04-sync-and-inner-loop.md](04-sync-and-inner-loop.md)),
why is *any* of the render running inside a microtask scope?

### What was still async, and what it cost us

The *What's still async, and why* inventory in
[04-sync-and-inner-loop.md](04-sync-and-inner-loop.md) was
honest about the surviving await sites at
that point:

- `Chunker.flow()` -- async wrapper, awaited
  `beforeParsed` / `afterParsed` / `afterRendered` hook
  triggers, `loadFonts()`, and `chunker.render()`.
- `Chunker.render()` -- thin async wrapper around the
  sync `renderer.next()` loop, kept so `flow()` could
  `await` it.
- `Chunker.clonePage()` -- async, awaited three
  per-page hooks. Footnotes-only caller, dead path for
  our content but live in the bundle.
- `PagedPolyfill.preview()` -- async, awaited
  `beforePreview` / `afterPreview` hooks plus
  `polisher.add` and `chunker.flow`.
- `Polisher.add()` / `Polisher.convertViaSheet()` /
  `Sheet.parse()` -- async chain to fetch and parse
  external stylesheets. `Polisher.add` did
  `Promise.all` over the inputs.
- `Chunker.loadFonts()` -- returned `Promise.all` of
  `fontFace.load()` for any face not yet in state
  "loaded".
- `request()` -- async XHR + `Promise` wrapper, used by
  the polisher chain to fetch each `<link rel="stylesheet">`
  URL.

Cost of each: small. Cost of all of them together: V8
sees an unbroken await chain from `page.evaluate(async
() => { await PagedPolyfill.preview(); })` down to
`document.fonts.ready` (the one genuinely-async
dependency in the chain). When that promise resolves V8
schedules a microtask to resume `flow()`. Phase 1 + 2
of the async cleanup made the *body* of the resumed
function execute synchronously, so once it resumes it
runs ~6.2 s straight to the end of the render. V8
correctly attributes the whole continuation to the
`RunMicrotasks` host frame, since that's the C++ frame
on the stack while the resumed JS runs.

So `RunMicrotasks` self-time being 2.89 s wasn't a
sign of microtask overhead -- it was the bookkeeping
label V8 puts on continuation-style work. Every named
Blink event nested inside (`Document::UpdateStyleAndLayout`,
`recalcStyle`, `performLayout`, etc.) appeared in the
trace as a child of `RunMicrotasks`. Same shape applied
in the cpu profile: `(program)` is the catch-all bucket
V8 picks when no JS frame sits on top of the stack at
sample time, and a microtask continuation is exactly
that condition.

The bucket name was misleading, but the cost itself was
real -- the JS *running* inside the continuation
*was* paged.js doing its per-page work. No "microtask
plumbing overhead" to slim down. The only way to remove
the `RunMicrotasks` attribution was to stop wrapping the
render in a microtask continuation entirely -- i.e.,
make the whole chain synchronous so V8 has no async
scope to attribute to.

### Why this is OK for our pipeline (and not for upstream)

Upstream paged.js needs the async machinery. Its target
deployment is an interactive browser page: real
stylesheet fetches over HTTP (genuinely async), font
loads against the OS (genuinely async), user-registered
handlers that may load external resources or do
expensive work between page renders (async-friendly to
keep the page responsive). The await chain is the
canonical pattern for "yield to the browser between
expensive steps so the UI thread can paint."

Our pipeline has none of those constraints:

- `page.goto(url, { waitUntil: 'load' })` settles
  *before* paged.js is invoked. Every font, image, and
  stylesheet referenced by `<link>` / `@font-face` /
  `<img>` is already loaded by the time the render
  starts. The async checks are no-ops.
- The headless renderer has no compositor coordinating
  with us, no paint budget to respect, no user looking
  at the page. Blocking the main thread for 8 s is
  fine -- nobody's watching.
- All registered handlers in our build are synchronous.
  The `_assertSync` guard from the Phase 1/2 cleanup
  has been in place for the per-page hot path for a
  while; we just hadn't extended the pattern to the
  once-per-render hooks.
- The stylesheet fetches the polisher does are local
  `file://` URLs. Sync XHR resolves them in microseconds.

So the entire async surface in paged.js -- which
upstream needs -- is, for our specific use case, the
opposite of helpful: it pushes work into microtask
continuations that show up as `RunMicrotasks` in the
trace and `(program)` in the cpu profile, instead of
landing under honest names like `RunTask` and
`EvaluateScript`.

### The conversion

Nine functions in `docs/lib/paged.browser.js` switched
from `async` to plain sync, marked
`[PATCH: sync-chain]` at each site:

| function | what changed |
| --- | --- |
| `request()` | Async XHR + `new Promise` + `Response` wrapper → sync XHR (`open(...,false)`) returning body text directly. Both callers (`Polisher.add` / `convertViaSheet`) only ever consumed `response.text()` (itself async per spec), so returning text skips that boundary too. |
| `Sheet.parse()` | Three `await hook.trigger(...)` → `_assertSync(triggerSync(...))`. CSS-parser hooks all sync in our build. |
| `Polisher.convertViaSheet()` | Drop awaits on `sheet.parse` / `request` / recursive `convertViaSheet`. |
| `Polisher.add()` | Drop the `Promise.all` + then-chain entirely. Walks arguments once, feeds each through the sync pipeline. |
| `Chunker.loadFonts()` | `Promise.all(fontFace.load())` → sync walk of `document.fonts` that throws if any face's `status !== "loaded"`. The throw is a safety net; `page.goto({waitUntil:'load'})` settles fonts in practice. |
| `Chunker.clonePage()` | Three per-page hook awaits → `_assertSync`. Cold path (Footnotes-only). |
| `Chunker.render()` | Strip `async`. Body was already sync after the Phase 1/2 cleanup. |
| `Chunker.flow()` | Strip `async`; five await sites → sync calls / `_assertSync`. |
| `PagedPolyfill.preview()` | Strip `async`; two hook awaits → `_assertSync`; drop awaits on `polisher.add` / `chunker.flow`. |

Plus the two external callers in
[`perf/measure.mjs`](../measure.mjs) and
[`docs/render-book.mjs`](../../docs/render-book.mjs):
both did `page.evaluate(async () => { await
window.PagedPolyfill.preview(); })`. The inner IIFE is
now a plain sync arrow; the outer `await` is just the
CDP round-trip puppeteer needs to ferry control back.

The `_assertSync` helper (from the earlier
"sync chain end-to-end through the per-page hot path"
work) is the load-bearing safety net throughout: if any
future hook handler returns a thenable, the chain
throws with a useful error message instead of silently
swallowing async work. The contract is now:

> Every hook handler in this bundle is sync. Every
> external resource referenced by the document is
> loaded before `PagedPolyfill.preview()` runs.

If either invariant breaks, `_assertSync` or
`loadFonts`'s throw catches it loudly.

### Results

Paired `--detach-pages --no-timing --render-only
--tracing` run on the 1651-page book, comparing the
pre-conversion trace (results from *Inside RunMicrotasks*
in [05-blink-trace.md](05-blink-trace.md)) against
the post-:

| metric | pre-sync | post-sync | Δ |
| --- | --- | --- | --- |
| render wall | 8.13 s | 8.36 s | flat (within single-run noise) |
| trace event count | 250,376 | 255,949 | flat |
| `RunMicrotasks` self | 2890.66 ms (35.6 %) | **0.56 ms** (off top-30) | **-2890 ms (-99.98 %)** |
| `RunMicrotasks` total | 6333.18 ms | **0.56 ms** | **-6333 ms** |
| `RunMicrotasks` hits | 15 | 12 | -3 |
| `RunMicrotasks` rm[4] dur | 6262.34 ms | gone | -6262 ms |
| `RunTask` self (top-30) | (below threshold, ~16 ms) | **2984.11 ms (34.6 %)** | **+2968 ms** |
| `RunTask` hits | (~few hundred) | **1005** | re-attributed |
| `RunTask` total | (small) | **8630.80 ms** | the whole render |
| `Document::UpdateStyleAndLayout` total/hits | 3320 / 39675 | 3515 / 39675 | flat |
| `Document::recalcStyle` self | 1737 ms | 1877 ms | flat |
| `LocalFrameView::performLayout` self | 1737 ms | 1881 ms | flat |
| per-page ratio (last/first quarter) | 1.36x | 1.27x | slight improvement (noise band) |
| pages | 1651 | 1651 | identical |
| PDF size (full render, separate run) | 16.1 MB | **16.1 MB** | byte-equivalent |

The headline number is the **6333 → 0.56 ms collapse**
in `RunMicrotasks` total. The 12 surviving sub-ms hits
are pure puppeteer/CDP plumbing (one `AsyncTask Run`
child = 0.01 ms; the rest are V8 internal MT-checkpoint
runs). There is no remaining JS executing inside a
microtask continuation -- the render runs as a plain
synchronous task from start to end.

The work didn't disappear, it re-attributed. `RunTask`
self-time (2984 ms) almost exactly equals the old
`RunMicrotasks` self-time (2891 ms) plus single-run
noise. Per-call children counts are unchanged
(`Document::UpdateStyleAndLayout`: 39675 calls then,
39675 calls now). Same JS, same DOM mutations, same
layout flushes -- just no longer wrapped in a
continuation.

### What this buys

**Profile readability.** A reader opening
`render.cpuprofile` or `trace.json` after this change
sees:

- `(program)` in the cpu profile drops by the
  proportion that was V8 runtime overhead inside the
  continuation (the MT plumbing + dispatch glue
  between named natives). The remaining `(program)`
  is genuinely-unattributable V8 work (IC stubs,
  runtime helpers).
- `RunMicrotasks` no longer appears at the top of the
  trace's bottom-up table. The render lands under
  `RunTask` / `EvaluateScript` / `FunctionCall`, with
  Blink work (`performLayout`, `recalcStyle`,
  `rebuildLayoutTree`) as named children where it
  belongs.
- The cpu profile's `(idle)` row already collapsed in
  the earlier rAF→queueMicrotask fix; this change
  closes the symmetric gap on the JS side.

**Structural simplicity.** Nine functions in the bundle
lost the `async` keyword and the `await` site
discipline that went with it. The render call chain is
now top-to-bottom synchronous: `preview()` calls into
`flow()` calls into `render()` calls into `*layout()`,
plain returns all the way down. Anyone tracing through
the bundle for a perf investigation can read the
control flow without modeling promise resolution
ordering.

**Single contract.** The hook surface is now uniformly
sync via `_assertSync`. Before the conversion, the
per-page hooks (`beforePageLayout`, `afterPageLayout`,
`finalizePage`, etc.) were sync-asserted while the
once-per-render hooks (`beforeParsed`, `afterParsed`,
`afterRendered`, `beforePreview`, `afterPreview`) used
`await trigger(...)`. The split was historical, not
principled. Now every hook is sync-asserted, same
shape, same error message.

### What this doesn't buy

**Wall-clock.** Render goes 8.13 s → 8.36 s, which is
within the ±1 s single-run noise band for this machine
documented in earlier phases. CPU work
re-attributes but doesn't shrink: the chunker's JS
still runs the same way, DOM mutations still trigger
the same layout flushes, gBCR self-time still owns
~21 % of the trace. Phase 1's microtask-boundary
elimination cost (~850 ms) was real because there *were*
8 k boundaries to remove; this conversion eliminates a
handful of additional boundaries (the once-per-render
sites) whose per-boundary cost is small.

**A path to fewer flushes.** The remaining gBCR-driven
layout work is intrinsic to paged.js's per-page
break-and-resume algorithm. The earlier attempts (B, D from
*What happened when we tried `createBreakToken` dedup* in
[02-finalizepage.md](02-finalizepage.md); the
move-not-clone experiment in
[05-blink-trace.md](05-blink-trace.md))
confirmed that gBCR re-attributes if you elide one site, and
that mutations are the structural source. Synchronising
the chain doesn't change any of that.

### Verification

The 1651-page book renders identically pre- and
post-conversion -- same page count, same 16.1 MB PDF.
The PDF differs from the previous build only by the
expected timestamp drift (the `/CreationDate` /
`/ModDate` entries Chrome writes per run). No content
changes; the bundle does the same work in the same
order.

The trace's `RunTask` -> `Document::UpdateStyleAndLayout`
hit count (39 675) matches the previous run exactly,
confirming the per-page chunker iteration count is
preserved through the conversion. `RunTask` ->
`WebFrameWidgetImpl::UpdateLifecycle` at 1950 ms / 1
hit is Chromium's final-frame lifecycle work after the
last page is laid out, same as before -- it just shows
up under `RunTask` instead of being attributed to a
post-render microtask, which is also why `RunTask` self
includes it.

### What's still async, post-conversion

Two surfaces remain async-shaped, both intentionally:

1. **The auto-run block at [paged.browser.js:33153](../../docs/lib/paged.browser.js:33153).**
   `ready.then(async function () { ... })` fires once at
   `DOMContentLoaded` and is gated by `config.auto !==
   false` -- our pipeline always sets `config.auto =
   false` before invoking `preview()`, so this branch
   never runs. Leaving it async-shaped costs one
   microtask scheduling at startup, sub-microsecond,
   and preserves byte-for-byte compatibility with
   upstream paged.js's auto-init semantic for anyone
   running this bundle in a configuration we don't.
2. **External `page.evaluate(...)` callers.** The
   wrapper around `window.PagedPolyfill.preview()` in
   `perf/measure.mjs` and `docs/render-book.mjs` is a
   sync arrow, but `page.evaluate` itself returns a
   Promise (CDP roundtrip). Node-side code awaits that
   Promise. Cost is the CDP round-trip, not the JS we
   execute.

Neither contributes to the renderer's main-thread
profile.

### Cumulative trace shape

For reference, the post-conversion top-of-table on
`CrRendererMain` reads:

```
   self_ms   self_%   event                                       category
   -------   ------   ----------------------------------------------
   2984.11   34.58%   RunTask                                     devtools.timeline
   1880.79   21.79%   LocalFrameView::performLayout               blink
   1876.53   21.74%   Document::recalcStyle                       blink
    540.06    6.26%   InlineNode::ShapeTextIncludingFirstLine     blink
    503.09    5.83%   Document::rebuildLayoutTree                 blink
    128.90    1.49%   Blink.CompositingInputs.UpdateTime          blink
    123.41    1.43%   Blink.PrePaint.UpdateTime                   blink
     99.60    1.15%   Document::updateStyle                       blink
     76.83    0.89%   V8.GC_MC_INCREMENTAL_EMBEDDER_TRACING       v8.gc
     43.20    0.50%   Layout                                      devtools.timeline
     ...
```

`RunMicrotasks` no longer appears. `(self /
unattributed)` time inside `RunTask` is 2984 ms across
1005 hits -- average ~3 ms per task, consistent with
"each render task does ~one page's worth of work" plus
some longer tasks for setup / teardown. The dominant
named children are unchanged: `UpdateStyleAndLayout`,
`recalcStyle`, `performLayout`, `ShapeText`,
`rebuildLayoutTree`. Same work, honest labels.

Shipped.

## `pageRanges` sharding: off the table for now

Several earlier phase notes flag `pageRanges` sharding as
"the biggest untried lever" for the `generate` phase --
run `page.pdf()` N times over disjoint page ranges in
parallel headless browsers, concatenate the resulting
PDFs with pdf-lib, divide generate's ~43 s wall-clock by
N. The arithmetic is appealing; the engineering isn't.

A separate investigation (not in this repo) found enough
pitfalls to make the work not worth pursuing at current
scale. Sketch of what bit:

- Each shard re-loads `book.html` and re-runs `paged.js`
  rendering for *its* range, which means the per-shard
  render is **not** 1/N of the original render -- paged.js
  has to lay out all preceding pages to position the slice
  correctly (named strings, counters, footnote numbering,
  cross-references). Several "fixes" (skip-to-page hooks,
  pre-rendered state injection) each broke in subtle ways
  on the book's actual content.
- PDF concatenation via pdf-lib reintroduces the full
  `PDFDocument.load` cost the incremental writer avoided
  -- need a streaming concatenator or qpdf binary
  dependency to keep the process phase cheap.
- Page numbers, named strings (`string(chapter-title)`),
  and the running header rely on per-page state that the
  Counters handler and `addEnvFunctions` rebuild from
  document order. Sharding loses that order and breaks
  the header on every shard boundary unless the per-shard
  paged.js render is given the right starting state, which
  is itself a research project.
- Outline injection has to know cross-shard page numbers,
  so either Chrome's native outline (which we don't ship)
  or a post-concat outline rebuild is required.

Net: even with aggressive engineering, the realistic win
on a 1651-page book at N=4 shards is ~15-25 s of
`generate` saved -- not the 32 s / 75 % the naive math
suggests -- against a maintenance cost of a sharding
harness that wraps puppeteer launch + IPC + pdf concat
+ per-shard state setup. Below the cost/benefit bar.

The lever is documented here because it *is*
the largest remaining target if priorities change (e.g.
the book grows past 3000 pages, or a CI runtime cap
forces it). It's just not the next thing to build.

### Probe results (later session)

A two-shard probe in [perf/probe-parallel.mjs](../probe-parallel.mjs)
was run after the render-side speedups to see what the
actual wall-clock floor looks like with current numbers.
N=2, equal page-count split, no concatenation -- just
two browsers in parallel each printing their `pageRanges`
slice:

| shard | launch | load | render | generate | total |
| --- | --- | --- | --- | --- | --- |
| 0 (pp 1-826)   | 1.00 s | 1.61 s | 10.37 s | 24.02 s | 35.54 s |
| 1 (pp 827-1651)| 0.97 s | 1.61 s | 10.12 s | 24.46 s | 35.74 s |

Wall clock for `Promise.all` of both: **35.94 s**. Both
slices open via pdf-lib and the page counts add up
exactly (826 + 825 = 1,651). Vs the ~53 s single-process
render+generate, parallel N=2 saves ~17 s wall clock.

The probe also confirms two browsers really do run in
parallel at the OS level: generate dropped from ~43 s to
~24 s per shard (roughly linear with a ~2-3 s per-call
fixed overhead), which would only happen if the Skia +
PrintCompositor workloads in the two browser trees
weren't serialised by a shared kernel resource. So the
"single-threaded Skia per page" finding from
*Chromium `Page.printToPDF` knob survey* in
[01-baseline-and-detach.md](01-baseline-and-detach.md) is
per-process -- not a machine-wide lock.

**Still not shipped.** Reasons unchanged:

- Each shard re-renders the whole book to maintain
  per-shard layout state (named strings, counters,
  footnotes). With render at ~10 s that's now cheap CPU-
  wise, but the memory cost is the blocker -- see
  [07-memory.md](07-memory.md). N=2 ≈ 5 GB peak,
  N=4 ≈ 10 GB peak; the CI runner doesn't have that
  headroom.
- Concat + outline page-number remap still needs to be
  built. The incremental-pdf.mjs pattern extends to it
  but it's nontrivial.

Probe stays available as `node perf/probe-parallel.mjs
[--shards N]` for re-evaluation if either constraint
changes (CI machine grows, or book size forces it).

## CSS cost attribution

Render is at ~10 s on a 1651-page book, down from ~104 s
in the original baseline. The bottom-up profile after
all of the above changes shows no individual JS body
above ~250 ms self-time; the dominant rows are native
Blink work (`recalcStyle` 2.4 s, `performLayout` 2.2 s,
`removeChild` 1.7 s) that's intrinsic to laying out and
detaching 1651 pages of content. The remaining question:
is any of that recalcStyle work *avoidable* via CSS
pruning?

`ab-css.mjs` automates the answer. It renders the book
under four variants -- baseline-full (print.css +
rouge.css), drop-rouge, drop-print-extras (only the
always-kept Page-geometry + Chapter-boundaries sections
of print.css), and baseline-minimal (both stripped) --
then reports the **paired difference** of CPU sample-time
(`Document::recalcStyle` total in particular) between
baseline-full and each variant. Pairing immediately
interleaves baseline + variant runs so machine-state
drift cancels across the diff. On Windows the harness
auto-relaunches itself under `start /affinity 0x5500
/high` to pin to a fixed subset of cores, which on a
Ryzen 7 cuts run-to-run variance from ~15-25 % to ~3 %.

### Methodology calibration

We learned the variance story the hard way. The first
sweep used single runs per variant and CPU sample-time,
on the theory that profile time would be machine-load-
independent. It wasn't on this Windows dev box: four
identical-content runs of baseline-full spanned
9.47-16.89 s (the 16.89 was an outlier; even excluding
it, the remaining three varied by ~12 %). At that noise
floor, the per-section "drop-X saves N ms" rankings the
tool was emitting were ~75 % noise. The fix had two
parts:

1. **CPU pinning via `start /affinity`** -- shipped as
   the auto-relaunch shim in `ab-css.mjs`. Reduced
   baseline SD on recalcStyle total from ~12-25 % to
   ~3 %.
2. **Paired interleaved measurement** -- run baseline
   immediately before each variant, pair the two, take
   the difference. Mean paired difference and SD across
   N pairs let noise-floor rows show themselves honestly
   (mean within ~2 σ of zero). Default N=3 pairs; bump
   to `--runs 5` for tighter SD at the cost of wall
   time.

The original "stripping CSS saves ~740 ms" finding from
a single manual A/B turned out to be partly real, partly
noise, and partly confounded by what "minimal" meant.
The manual A/B's "minimal" was just `@page` +
`article{break-before:page}`; the tool's "baseline-
minimal" keeps the preamble + Page-geometry +
Chapter-boundaries sections (paged.js needs the
string-set / @top-right / @bottom-right machinery for
running headers and page numbers). The earlier signal
was real, but spread across pieces the tool can and
can't isolate.

### Findings

With pinning + paired diffs (3 pairs per variant):

| variant | Δrecalc ms | ± SD | mean/SD | verdict |
| --- | --- | --- | --- | --- |
| **drop-print-extras** | **237** | **60** | **3.95** | **real signal** |
| baseline-minimal | 193 | 246 | 0.78 | noise |
| drop-rouge | 66 | 124 | 0.53 | noise |
| (baseline-full mean) | 2038 | 108 SD | -- | reference |

Read this as:

- **print.css extras (everything beyond the always-kept
  Page-geometry + Chapter-boundaries sections) contribute
  ~237 ms of recalcStyle**: ~11 % of recalcStyle, ~2.4 %
  of render. All three pairs gave Δrecalc 202, 307, 202 --
  consistent direction and magnitude, ~4 σ from zero.
- **rouge.css contribution is at the noise floor**
  (66 ± 124 ms). The earlier hypothesis ("rouge.css is
  the big spender via per-span cascade work in code
  blocks") was wrong; the per-pair Δrecalc values were
  38, 202, -42 -- variance too high to claim signal at
  N=3.
- **baseline-minimal** stripping both still lands inside
  the noise band on this tool's run. The original manual
  A/B's larger delta came from removing more than this
  tool removes -- specifically the Page-geometry section
  that the tool keeps.

The per-section sweep behind `--per-print-section`
confirmed the methodology lesson the hard way: when each
print.css section is dropped individually, every Δrecalc
lands within ~2 σ of zero. The 237 ms of print.css cost
is structurally non-additive -- selectors interact in
the cascade, the style sharing cache hits differently
when rule count drops, and Blink's invalidation walks
change shape based on what rules exist. Any single
section's marginal contribution is too small to surface
above ~60 ms of paired-diff noise; the sum-of-extras
effect is the only real signal.

### Where this leaves render

Render is structurally near its floor. The biggest
plausible CSS prune (drop-print-extras) saves ~240 ms of
recalcStyle ≈ ~2.4 % of render, but would mean losing
the typography that makes the PDF look like a book. The
remaining levers all live outside render:

- `pageRanges` sharding (~5-20 s in generate): off the
  table for now (see previous section).
- Chrome's `outline: true` (~5 s in process): one
  `role="presentation"` preprocessor pass away from
  shipping, but not pursued.

No structurally promising next target inside render.
