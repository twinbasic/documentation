# Memory: where the renderer's 1.9 GB goes

Process-tree footprint, per-allocator breakdown inside the renderer, the `--disable-gpu` + `--in-process-gpu` pair that saves ~200 MB, and a GC-pass probe that showed 180 MB of unswept Oilpan garbage but determined the cost-to-fix exceeds the headroom it would buy.

CI runs the book build with limited RAM headroom -- the
1651-page book is the largest job on the machine and the
budget matters. These notes measure one render's peak
memory and break it down by allocator, so we know what
levers exist if the book grows.

> **Note.** Approaches that involve Chromium internals --
> patching the binary, intercepting the SkPicture stream
> via Frida, spawning standalone PrintCompositors via
> Mojo, building a Chromium-linked helper binary -- were
> researched but not shipped. They're documented
> separately in [CHROMIUM.md](../CHROMIUM.md). What
> follows covers only what's measurable from the outside
> through public APIs.

`perf/probe-memory.mjs` is the harness. It runs the full
pipeline (load + render + generate) in a single browser
and watches the chrome.exe process tree at 500 ms
intervals via `sample-mem.ps1`, reporting per-process
private bytes + working set. `perf/probe-renderer-mem.mjs`
goes deeper -- it drives Chromium's memory-infra tracing
to capture detailed per-allocator dumps from inside the
renderer at three points (post-render, mid-generate,
post-generate). `perf/analyze-mem-trace.mjs` reads the
resulting trace.json and prints the breakdown.

## Process-tree footprint

Peak across the whole tree on the 1651-page book:

```
renderer (main)                 ~1,880 MB private
utility:PrintCompositor           ~290-450 MB  (high variance)
browser                         ~70-1,100 MB   (PDF IPC buffer; very high variance)
gpu-process                       ~100 MB
renderer (about:blank etc.)        ~25 MB total
utility:network/storage            ~30 MB total
crashpad-handler                    ~2 MB
                                ------------
total peak                      ~2.5-3.5 GB private
                                ~2.7-2.9 GB working set
```

The browser-process number is the wildest -- across
runs it ranged from 72 MB to 1.1 GB. That's the IPC
buffer the PDF travels through on its way from the
renderer back to puppeteer; how much accumulates depends
on timing between Mojo write and Node read. The
PrintCompositor utility process appears only during
generate; it's the Chromium service that turns the
renderer's Skia commands into PDF bytes for `page.pdf()`.

## Inside the renderer

memory-infra dump at post-generate, renderer process,
top-level allocators (`blink_gc` and `blink_objects`
overlap by design -- they're two views of the same
Oilpan heap, raw pages vs typed object counts):

| allocator         | size      | notes |
| ----------------- | --------- | ----- |
| `blink_gc`        | 1,350 MB  | C++ DOM, layout, render objects (Oilpan) |
| `malloc`          |   332 MB  | Skia raster buffers + small native allocations |
| `partition_alloc` |   114 MB  | String buffers, ArrayBuffers |
| `v8`              |    34 MB  | JS heap (paged.js + page JS); tiny |
| other             |   ~22 MB  | web_cache, shared_memory, cc, gpu stub |

V8 is only ~2 % of the renderer. Blink is ~80 %. That
matches the structural picture: the renderer holds the
laid-out state of 1651 pages of typeset content, and
that state is C++ objects, not JS.

Top Blink object classes (the `blink_objects` view of
the Oilpan heap, post-generate):

| class                                  | size    | count       |
| -------------------------------------- | ------- | ----------- |
| `GridSizingTrackCollection`            | 132 MB  | 79,246      |
| `ComputedStyle`                        |  74 MB  | 1,074,537   |
| `ConstraintSpace::RareData`            |  71 MB  | 617,415     |
| `PhysicalBoxFragment`                  |  42 MB  | 516,289     |
| `LogicalLineItems`                     |  42 MB  | 24,118      |
| `Text` (DOM nodes)                     |  42 MB  | 498,077     |
| `LayoutResult`                         |  41 MB  | 540,447     |
| `AXNodeObject`                         |  41 MB  | 411,760     |
| `GridItemData`                         |  30 MB  | 162,443     |
| `ComputedStyleBase::StyleBoxData`      |  30 MB  | 176,479     |
| `InlineItem`                           |  28 MB  | 737,744     |
| `LayoutResult::RareData`               |  28 MB  | 229,056     |
| `ElementRareDataVector`                |  24 MB  | 613,629     |
| `CachedMatchedProperties`              |  23 MB  | 226,679     |
| `ShapeResultView`                      |  21 MB  | 306,762     |
| `HeapVectorBacking<FragmentItem>`      |  21 MB  | 72,175      |
| `HeapVectorBacking<HarfBuzzRunGlyphData>` | 20 MB | 165,957  |
| `LayoutText`                           |  14 MB  | 129,056     |
| `HTMLDivElement`                       |  12 MB  | 118,877     |
| `HTMLSpanElement`                      |  10 MB  | 104,266     |

Three patterns visible:

1. **Page-template grid is expensive.** paged.js renders
   each `@page` as a CSS grid (so `@top-right`,
   `@bottom-right`, etc. resolve correctly). 79,246
   `GridSizingTrackCollection` ≈ 48 per page × 1651
   pages, plus 162k `GridItemData`. Combined ~162 MB just
   for the running header/footer geometry.
2. **Style explosion.** 1,074,537 `ComputedStyle`
   objects across 1651 pages is ~650 per page, which
   matches roughly one per leaf element after style
   sharing. `CachedMatchedProperties` (23 MB, 227k)
   shows the sharing cache is active; without it the
   number would be much worse.
3. **LayoutNG fragment tree.** `PhysicalBoxFragment`
   (42 MB), `LogicalLineItems` (42 MB), `LayoutResult`
   (41 MB), various `RareData` (98 MB combined),
   `InlineItem` (28 MB) -- the modern Blink layout tree
   is fragment-based and the fragments add up across
   half a million layout objects.

The render→generate transition adds about 500 MB:
~272 MB to `blink_gc` (print-preview snapshot retention)
and ~219 MB to `malloc` (Skia content-stream allocations
during PDF emit, visible as a million-ish small
allocations in the bucket-size profile).

## Disabling the GPU process

The GPU process at ~100 MB looked like easy win. It
isn't, quite -- in headless Chromium still spawns a
GPU process to host SwiftShader (software raster) for
canvas / WebGL emulation, even when no canvas / WebGL
is in use. Three variants tested:

| variant                                       | render | generate | total | gpu-process | renderer | PDF bytes |
| --------------------------------------------- | ------ | -------- | ----- | ----------- | -------- | --------- |
| baseline                                      | 10-11s | 44-50s   | 51-56s |  100 MB    | 1,880 MB | 41,076,362 |
| `--disable-gpu --disable-software-rasterizer` | 10s    | 45s      | 45s   |  16 MB      | 1,761 MB | 41,076,362 |
| above + `--in-process-gpu`                    | 15s    | 61s      | 62s   |  (gone)     | 1,748 MB | 41,076,362 |
| `--single-process`                            | crash  | -        | -     | -           | -        | -         |

`--single-process` is documented as debug-only in
Chromium; the renderer crashes shortly after page load
in modern headless. Also doesn't actually collapse to
one process -- crashpad-handler always runs separately
and a Mojo broker stays alive too.

`--in-process-gpu` does kill the GPU process entirely
but folds the GPU work onto the same thread as JS +
layout. Render slows by ~5 s and generate by ~15 s --
a 25 % total slowdown bought for ~100 MB of saved
process overhead. Bad trade.

The disable pair alone (`--disable-gpu
--disable-software-rasterizer`) is the sweet spot:

- GPU process shrinks from ~100 MB to ~16 MB (Chromium
  keeps a stub for command handling)
- Renderer ~120 MB lighter (consistent across runs;
  exact cause is some GPU-context init path Skia skips)
- Generate runs ~5 s faster (Skia presumably skips the
  same GPU init path)
- PDF output is byte-identical: same 41,076,362 bytes,
  same content streams. SHA differs only because of
  per-run /CreationDate, /ModDate, and /ID -- 0.018 %
  of bytes differ, all inside the tagged-PDF tree's
  hash-derived element IDs.

Shipped in both [docs/render-book.mjs](../../docs/render-book.mjs)
and [perf/measure.mjs](../measure.mjs).

## What's not addressable

Accessibility tagging accounts for ~41 MB of
`AXNodeObject` instances (411k of them, one per DOM
element for the PDF/UA structure tree). Disabling
`--export-tagged-pdf` would free this, but the PDF
loses its structure tree -- screen readers see a flat
glyph stream, search highlighting and copy-paste break
reading order in the multi-column layout, and the PDF
falls out of Section 508 / PDF-UA / EN 301 549
compliance. Off the table; the cost buys real
accessibility for a docs site that aims to be readable.

## Where this leaves memory

End-state on the 1651-page book with the shipped flag
pair:

```
renderer (main)                 ~1,760 MB private
PrintCompositor (utility)         ~350 MB
browser                           ~70-1,100 MB  (IPC buffer; high variance)
gpu-process (stub)                 ~16 MB
other (renderers, network, etc.)   ~80 MB
                                ------------
peak                            ~2.3-3.3 GB private
                                ~2.5-2.9 GB working set
```

Inside the renderer, the dominant buckets are
intrinsic to laying out 1651 pages of typeset content:

- `GridSizingTrackCollection` (132 MB) is paged.js's
  per-page template grid. The grid drives `@top-right`
  / `@bottom-right` / margin-box positioning; replacing
  it with absolute positioning would save the 132 MB
  but is a paged.js architectural change.
- `ComputedStyle` (74 MB across 1M objects) and the
  LayoutNG fragment tree (~200 MB combined) scale with
  DOM size. The biggest knob here is the DOM the book
  feeds in: fewer wrapper elements would directly
  shrink everything downstream.
- The render→generate +500 MB is Chromium-internal
  (print-preview retention + Skia raster prep) and not
  reachable without recompiling.

Next memory targets, in rough order of effort vs payoff:

1. **DOM shape audit.** 1.07 M `ComputedStyle`, 498 k
   `Text` nodes, 118 k `HTMLDivElement`, 104 k
   `HTMLSpanElement` -- the input shape drives all of
   this. Just-the-docs and the markdown converters add
   wrapper elements that may not be needed in the PDF
   layout. A pre-render DOM-simplification pass (strip
   inert wrappers, collapse nested spans) is the most
   accessible lever; we own the Jekyll pipeline end to
   end.
2. **Layout-intermediate garbage** that Oilpan doesn't
   sweep during the synchronous render loop. ~75-225
   MB of `CachedMatchedProperties`, sub-`ComputedStyle`
   data, `GridItemData`, text-shape intermediates --
   not retained by anything, just unswept. See the
   "GC-pass probe" subsection for the per-class
   breakdown; the only direct mitigation is forcing
   GC (rejected, costs ~1 s), and the indirect lever
   is upstream DOM size (item 1 above).
3. **Page-template grid replacement** in vendored
   paged.js -- ~132 MB potential. Largest single target
   but an invasive rewrite of paged.js's `@page` area
   handler.

## GC-pass probe: 180 MB of unswept Oilpan garbage

Forcing a `window.gc()` pass between render and generate
frees ~180 MB of `blink_objects` (the typed view of the
Oilpan heap) without touching anything user-visible.
Initial framing: "dangling references somewhere in the
paged.js / detach-pages chain". Investigation (see "What
the GC actually freed" subsection below) shows the
framing was wrong -- there is no JS-side retention.
What the GC frees is per-page layout intermediate state
(style sharing caches, `ComputedStyle` sub-data, grid
item data, text-shape views) that's already unreachable
from anything but stays in Oilpan because nothing forces
a major GC during the synchronous render loop.

Probe: `perf/probe-renderer-mem.mjs --gc-passes N`.
Launches with `--js-flags=--expose-gc`, runs N V8
`gc()` calls between the post-render and pre-generate
memory dumps, then fires
`Memory.simulatePressureNotification` to coax Chromium
into dropping caches. Sweep across N=0,1,2,3,5 on the
1651-page book (single run each; absolute numbers carry
run-to-run noise but the deltas vs same-run baseline
are stable):

| N | gc time | +pressure | post-render | post-gc | mid-gen renderer | Δ vs no-gc baseline |
| --- | --- | --- | --- | --- | --- | --- |
| (off, baseline)| --     | --     |  1,229 MB | --     | **1,941 MB** | -- |
| 0 (pressure only) | 0.00s | 0.52s |  1,358 MB | 1,358 MB | 1,869 MB | ~noise |
| **1** | **0.44s** | **0.96s** | 1,329 MB | **1,275 MB** | **1,754 MB** | **-187 MB** |
| 2 | 0.82s | 1.33s |  1,337 MB | 1,293 MB | 1,758 MB | -183 MB |
| 3 | 1.46s | 1.97s |  1,316 MB | 1,277 MB | 1,757 MB | -184 MB |
| 5 | 2.11s | 2.61s |  1,553 MB* | 1,498 MB* | 1,841 MB* | (high-side outlier run) |

Three takeaways:

1. **`Memory.simulatePressureNotification` alone does
   nothing in headless.** N=0 mid-gen is within
   run-to-run noise of the no-gc baseline.
2. **One `gc()` call does ~90 % of the work.** 1 pass +
   pressure: ~1 s cost, ~187 MB peak savings. Passes
   2 and 3 match it (~185 MB) without further
   improvement.
3. **Each `gc()` pass costs ~0.4-0.5 s** of wall clock
   on the 1651-page book (the V8 + Oilpan major-GC
   pause walking ~1 GB of heap).

Inside the renderer at post-gc (1 pass), the breakdown
shows where the freed space went:

| allocator      | baseline | post-gc | Δ |
| -------------- | -------- | ------- | --- |
| `blink_objects` (typed Oilpan view) |  698 MB |  472 MB | **-226 MB** |
| `blink_gc` (raw pages)              |  973 MB |  940 MB |  -33 MB |
| `malloc`                            |  120 MB |   93 MB |  -27 MB |
| `v8`                                |   28 MB |   19 MB |   -9 MB |

GC freed ~226 MB of typed Blink objects, but Oilpan
only returned 33 MB of underlying pages to the OS
immediately -- empty pages are recycled lazily. The
visible peak win shows up at mid-generate (-187 MB)
because Chromium reuses the freed object slots for the
print-preview snapshot instead of growing fresh.

PDF output is byte-identical across all variants
(41,076,362 bytes; SHA differs only in metadata).

**Not shipped.** 1 second per render is meaningful when
multiplied across CI builds, and after investigating
what the GC actually freed (below) it's clear there's
no underlying defect to fix -- this is Blink's normal
allocation behaviour, with Oilpan's normal sweep
behaviour, just observed in a workload that doesn't
give Oilpan an idle moment to sweep.

The probe and the `--gc-passes` flag stay in
[probe-renderer-mem.mjs](../probe-renderer-mem.mjs) for
future use -- either as a measurement baseline if a
future bigger book ever hits a CI memory ceiling, or as
an A/B reference if Blink's allocation pattern changes
with a Chromium upgrade.

### What the GC actually freed

Two analyses, both negative for the "dangling references"
hypothesis, both positive for "Oilpan didn't sweep":

**V8 heap snapshot diff (pre-gc vs post-gc):** byte-
identical. Same 2,938,992 nodes, same 108.9 MB self_size,
same per-category counts. The diff is zero across every
node category in V8. Whatever the GC freed was invisible
to V8's snapshot, which means it had no V8 wrapper --
which means no JS reference can be holding it. Probe:
[analyze-heap-snapshot.mjs](../analyze-heap-snapshot.mjs)
in single-snapshot or diff mode.

**Per-Blink-class diff (memory-infra dumps):** the
freed memory is concentrated in style-system caches and
layout intermediates. Top freed classes between dump 0
(post-render) and dump 1 (post-gc), 1-pass GC run:

| class                                            | a_count | a_MB | b_count | b_MB | freed |
| ------------------------------------------------ | ------- | ---- | ------- | ---- | ----- |
| `CachedMatchedProperties`                        | 122,110 | 12.1 |     355 |  0.0 | **-12.1 MB** (~100%) |
| `ComputedStyle`                                  | 380,974 | 26.2 | 244,772 | 16.8 |  -9.4 MB (~36%)      |
| `ComputedStyleBase::StyleMisc2Data`              |  24,649 |  8.3 |   6,911 |  2.3 |  -6.0 MB             |
| `ComputedStyleBase::StyleBoxData`                |  94,867 | 15.9 |  63,937 | 10.7 |  -5.2 MB             |
| `ComputedStyleBase::StyleSurroundData`           |  32,350 |  9.6 |  15,101 |  4.5 |  -5.1 MB             |
| `GridItemData`                                   |  27,508 |  5.0 |       0 |  0.0 | **-5.0 MB** (~100%)  |
| `ShapeResultView`                                | 225,299 | 15.5 | 170,366 | 11.7 |  -3.8 MB             |
| `HeapVectorBacking<HarfBuzzRunGlyphData>`        | 163,864 | 19.2 | 149,993 | 16.4 |  -2.9 MB             |
| `LayoutResult::RareData`                         |  71,960 |  8.8 |  48,955 |  6.0 |  -2.8 MB             |
| `ConstraintSpace::RareData`                      |  79,445 |  9.1 |  55,209 |  6.3 |  -2.8 MB             |
| `ComputedStyleBase::StyleMisc1Data`              |  19,034 |  3.0 |   1,958 |  0.3 |  -2.7 MB             |
| `ComputedStyleBase::StyleMiscData`               |  64,838 |  5.4 |  39,653 |  3.3 |  -2.1 MB             |
| `LayoutResult`                                   | 179,728 | 13.7 | 155,052 | 11.8 |  -1.9 MB             |
| ... (smaller)                                    |         |      |         |      |  -16  MB             |
| **total**                                        |         |      |         |      | **-76 MB** (this run; -226 MB on a different run -- noisy) |

The two ~100% freed categories tell the cleanest story:

- **`CachedMatchedProperties`** is Blink's style-sharing
  cache -- "which CSS rules matched element X, so that
  similar element Y can reuse the resolved style". After
  layout completes, it's dead state. Only useful if the
  document gets relaid out, which our pipeline never
  does.
- **`GridItemData`** is per-item layout state for CSS
  Grid. Paged.js puts each `@page` area inside a grid
  to position the running headers / footers / margin
  boxes; once the page is laid out, the `GridItemData`
  for that page's items is dead.

Everything else is style sub-structures
(`ComputedStyleBase::Style*Data`) and text-shape
intermediates (`ShapeResultView`, `HarfBuzzRunGlyphData`,
`ShapeResultRun`) that get freed when their owning
`ComputedStyle` or layout fragment becomes unreachable.
All Blink-internal allocations driven by layout.

What this means for the leak question:

- **Not a leak.** Nothing holds these objects after
  layout. They're unreachable from the moment their
  page is finalised; they sit in Oilpan because
  Chromium doesn't run a major GC during the
  synchronous render loop.
- **Not a JS-side retention.** detach-pages.js,
  paged.js's chunker, hook chains, and event listeners
  were the suspect list. The V8 snapshot diff rules
  them all out -- if any of them held the layout state,
  the snapshot would change between pre-gc and post-gc.
- **It's a real over-allocation in the sense that we
  hold ~75-225 MB longer than necessary**, but the cost
  to fix it (force a GC: 1 s wall clock) exceeds the
  CI memory headroom it would buy at our current book
  size.

The indirect lever still works: reducing the input DOM
size reduces both peak working set AND this garbage
fraction proportionally. That's the DOM-shape audit
item in "Next memory targets".

Tooling produced by this investigation, kept in
[perf/](..) for re-use:

- [analyze-heap-snapshot.mjs](../analyze-heap-snapshot.mjs)
  -- single-snapshot summary (top type x name by
  aggregate bytes, detached subset) and pairwise diff
  between two snapshots.
- [diff-blink-classes.mjs](../diff-blink-classes.mjs) --
  per-Blink-class diff between two memory-infra dumps
  in the same trace. Strips the per-dump GUID suffix
  from class names so the diff lines up across dumps.

### `--heap-snapshot`: V8 visibility check

`probe-renderer-mem.mjs --heap-snapshot` captures a V8
heap snapshot at post-render via CDP
`HeapProfiler.takeHeapSnapshot` and writes it as
`outDir/post-render.heapsnapshot` (~200 MB on the
1651-page book). Combined with `--gc-passes N`, a
second snapshot `post-gc.heapsnapshot` is taken right
after the GC pass.

The original intent was a retainer-chain investigation
to find what JS-side state was holding the Blink
objects the GC frees. The result of that investigation
(see "What the GC actually freed" above) is that
**nothing on the V8 side holds them** -- the snapshot
diff is byte-identical pre-gc vs post-gc, ruling out
JS retention entirely. The freed memory is Oilpan-only,
invisible to V8's snapshot.

The snapshot tooling is still useful as a visibility
check -- "is the renderer holding what I expect?" --
and for finding any actual JS-side retention if one
ever surfaces. CLI analysis:

- `node perf/analyze-heap-snapshot.mjs <snap>` --
  single-snapshot summary (top type x name by aggregate
  bytes, plus actually-detached subset).
- `node perf/analyze-heap-snapshot.mjs <a> <b>` --
  pairwise diff: what categories grew or shrank.

DevTools workflow (more interactive, for following
specific retention chains):

1. Open Chrome DevTools (any tab) -> Memory tab.
2. Load `<...>.heapsnapshot` (the "Load profile" icon).
   Browse the **Summary** view for the largest object
   categories.
3. For any object of interest, the **Retainers** pane
   shows the chain of JS references holding it. Filter
   by name (e.g. `Detached HTMLDivElement`) or by class.

Oilpan-only objects (`CachedMatchedProperties`,
`ComputedStyleBase::*Data`, `GridItemData`,
`ShapeResultView`, layout fragments, etc.) do not appear
in the V8 snapshot -- they have no V8 wrapper. The
memory-infra dump + `diff-blink-classes.mjs` is the
right tool for those. The complete picture is
heap-snapshot (V8 reachability) + memory-infra dump
(per-allocator + per-Blink-class sizes) = "what JS sees"
+ "what's actually in the renderer".
