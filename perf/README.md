# PDF render profiling

The book PDF is built by rendering `_site-pdf/book.html` through
paged.js + headless Chromium + pdf-lib (see `docs/book.bat`, which
invokes `docs/render-book.mjs`). The pipeline was historically driven
by `pagedjs-cli`; we replaced that with our own thin driver after the
investigations in this folder, so we control pdf-lib's parseSpeed
without patching upstream (see *Profiling pdf-lib's load* in
[notes/01-baseline-and-detach.md](notes/01-baseline-and-detach.md)).
As the book grew we found **quadratic** wall-clock behaviour --
time-per-page grew with page count -- and chased it through ~22
sub-investigations, recorded in [`notes/`](notes/).

This folder holds the tools used to investigate that. The README is
the operational reference: what each tool does, how to run it, and
what shape the output takes. The narrative -- baselines, each landed
optimisation, what was tried and failed -- lives split across the
seven phase files in [`notes/`](notes/). The current state is summarised
at the bottom of this file.

## Profiling `paged.browser.js`: canonical command

The command we reach for whenever CPU-profiling paged.js:

```
node measure.mjs --render-only --cpu-profile --cpu-sampling 100
```

(`run.bat` forwards the same args.) Two defaults match what most
profiling work needs:

- **detach-pages is on.** It's the shipping fix; matching production
  is the right baseline for any profiling work. Pass
  `--no-detach-pages` for an A/B against the original O(n²) quadratic.
- **timing is off.** The `timing-handler.js` per-page `console.log`
  relay costs ~2 % of render self-time on the 1638-page book and
  muddies bottom-up profile tables. Pass `--timing` when you want the
  per-page CSV + first/last-quartile summary; otherwise `timing.csv`
  is empty and `summary.txt` says so.

Flag rationale:

- `--render-only` -- bail out after `PagedPolyfill.preview()`
  returns. Skips meta extraction, `parseOutline`, `page.pdf`, and
  the pdf-lib roundtrip / incremental writer. ~47 s saved per run
  on the book (~55 s full -> ~8 s render-only), with no effect on
  what the `--cpu-profile` trace captures (it already covered only
  the render phase).
- `--cpu-profile` -- write `render.cpuprofile` (render phase only)
  into the timestamped `results/` folder. Open in Chrome DevTools via
  Performance -> "Load profile...", or interrogate from the terminal
  with `analyze-profile.mjs` / `find-callers.mjs` / `find-callees.mjs`
  / `grep-profile.mjs`.
- `--cpu-sampling 100` -- 100 us sampling, 10x denser than the 1 ms
  default. Resolves frames in paged.js's sub-millisecond inner loops
  where most remaining cost lives (see *Looking past `finalizePage`*
  in [notes/02-finalizepage.md](notes/02-finalizepage.md) and later
  phase files). Larger profile file in return.

Drop `--render-only` whenever you need to also measure generate /
process (e.g. confirming a fix doesn't shift cost into `page.pdf()`
or pdf-lib), or to write `book.pdf` for behavioural verification.

## Profiling pdf-lib (process phase): canonical command

The mirror command for CPU-profiling the pdf-lib roundtrip (run from
`perf/`):

```
node measure.mjs --fast-refs --parallel-deflate --fast-decode-name --fast-number-to-string --fast-size-in-bytes --fast-inflate --fast-parse-number --fast-dict-onebuf --fast-array-onebuf --measure-pass --fast-parse-object --fast-sync-load --fast-indirect-objects --fast-pdfnumber-pool --cpu-profile-process --cpu-sampling 100 --out results/<label>
```

`--out results/<label>` is optional but recommended: omit it and the
run lands in `results/<ISO-timestamp>/`, which is fine for one-off
captures but awkward to refer to later. For A/B work, label both
sides (`results/pre-foo`, `results/post-foo`).

Then read the bottom-up table:

```
node analyze-profile.mjs results/<label>/process.cpuprofile --top 15
```

Flag rationale:

- `--fast-refs` -- inject the
  [docs/lib/fast-refs.mjs](../docs/lib/fast-refs.mjs) shipping
  fix (dense-array cache for `PDFRef.of`'s gen=0 path). On miss,
  constructs the `PDFRef` directly via
  `Object.create(PDFRef.prototype)` + manual field init, bypassing
  the upstream `pool.set(tag, instance)` -- after
  `--fast-indirect-objects` shipped, that pool was the last hot
  `Map.set` in the heap profile. The `PDFRef.of` row drops out of
  the CPU top-15 and the `set` builtin row collapses from ~7.5 MB
  to ~0.5 MB (the residual is `PDFName` interning's
  `fastCache.set`, harmless). Production runs through it; the
  profile should too.
- `--parallel-deflate` -- swap `pdfDoc.save()` for `parallelSave`
  from [docs/lib/parallel-deflate.mjs](../docs/lib/parallel-deflate.mjs),
  which pre-deflates object streams in parallel on libuv's pool with
  `objectsPerStream: 500`. Production runs through it; same logic.
  Moves ~300 ms of zlib work off the main thread, and routes every
  deflate call through `node:zlib` (no pdf-lib pure-JS fallback).
- `--fast-decode-name` -- inject
  [docs/lib/fast-decode-name.mjs](../docs/lib/fast-decode-name.mjs), a
  parallel `Map<string, PDFName>` in front of `PDFName.of` that
  skips the `decodeName` regex scan when the raw name has no `#`
  hex escape (99.999 % of the ~2.8 M `PDFName.of` calls per load).
  Production runs through it; ~530 ms saved on process.
- `--fast-number-to-string` -- inject
  [docs/lib/fast-number-to-string.mjs](../docs/lib/fast-number-to-string.mjs),
  short-circuiting pdf-lib's `numberToString` when `String(num)`
  already lacks an `e` (i.e. for every PDF number that isn't in
  the exponential-notation tail -- 100 % of ~290 k calls on the
  book). Skips a redundant `toString` + `split` + `parseInt` per
  call. Production runs through it. Profile self-time on the
  function drops from ~45-50 ms (~2 % of process) to ~5-12 ms.
- `--fast-size-in-bytes` -- inject
  [docs/lib/fast-size-in-bytes.mjs](../docs/lib/fast-size-in-bytes.mjs),
  replacing pdf-lib's `utils.sizeInBytes` (which allocates
  `n.toString(2)` just to count its bit length) with a non-
  allocating short-circuit ladder. Called ~300 k times per save
  from `PDFCrossRefStream`'s xref writer; the dominant inputs
  are 1-2 byte values so a `n < 0x100 ? 1 : ...` ladder catches
  most calls in one compare. Production runs through it. ~60 ms
  saved on process.
- `--fast-inflate` -- inject
  [docs/lib/fast-inflate.mjs](../docs/lib/fast-inflate.mjs), swapping
  `pako.inflate` for `node:zlib.inflateSync` on the one path
  pdf-lib uses it (the compressed xref stream during load).
  Negligible wall-clock; flag exists so paired A/Bs against pure
  upstream pdf-lib can keep the rest of the perf set on while
  isolating this swap. Production runs through it.
- `--fast-parse-number` -- inject
  [docs/lib/fast-parse-number.mjs](../docs/lib/fast-parse-number.mjs),
  replacing `BaseParser.parseRawNumber` / `parseRawInt` with
  direct-integer accumulators (`n = n*10 + (byte - 0x30)`) that
  skip per-byte string concat and the trailing `Number()` round-
  trip. Every numeric token parsed during `PDFDocument.load`
  flows through these -- hundreds of thousands of calls per load
  on the book. Production runs through it.
- `--fast-dict-array` -- inject
  [docs/lib/fast-dict-array.mjs](../docs/lib/fast-dict-array.mjs),
  replacing `PDFDict`'s backing `Map` with a flat alternating
  `[k0, v0, k1, v1, ...]` array allocated per-dict (pre-sized to 10
  slots, the median). Was production before `--fast-dict-onebuf`
  superseded it; kept as an A/B baseline. See "Replace PDFDict's
  backing Map with a flat array" in
  [notes/08-pdf-lib.md](notes/08-pdf-lib.md).
- `--fast-dict-onebuf` -- inject
  [docs/lib/fast-dict-onebuf.mjs](../docs/lib/fast-dict-onebuf.mjs).
  One long-lived buffer for every committed PDFDict entry across
  the whole document. Parser uses a small per-parser temp array as
  a stack of recursion frames; each parseDict invocation appends
  to temp, commits its frame to main in one contiguous append,
  and pops temp back. PDFDicts only ever read from main, so the
  whole instance state packs into one 53-bit Number (24-bit start
  + 14-bit length + 1-bit owned). Owned dicts (factory-created
  post-parse, COW results) also append to main. Mutations:
  in-place replace for existing keys, COW (copy range to tail,
  append new pair, update encoded range) for new keys or delete.
  Mutually exclusive with the other dict-shape shims. ~57 %
  cumulative heap reduction since the original Map-backed PDFDict
  (152 -> 66 MB). Production runs through it. See
  [notes/08-pdf-lib.md "One-buffer PDFDict"](notes/08-pdf-lib.md).
- `--fast-array-onebuf` -- inject
  [docs/lib/fast-array-onebuf.mjs](../docs/lib/fast-array-onebuf.mjs).
  Same range-view pattern as `--fast-dict-onebuf` applied to
  PDFArray: every committed element lives in a single append-only
  `arrayMain` JS Array, each PDFArray is a view via packed
  `(start, length)` in `d`. Backing is a plain heterogeneous JS
  Array -- slots hold the original PDFObject references, reads are
  `arrayMain[start + i]` with no decode. This is the explored-but-
  didn't-ship Phase 3 encoded approach minus the Float64Array
  encoding (which cost ~300 ms on save's `copyBytesInto` from
  per-slot `decodeValue` dispatch). Per-parser `_arrayTemp` for
  the recursion stack, independent of fast-dict-onebuf's
  `_dictTemp`. Mutations: in-place replace for `set`, in-place
  extend at HWM for `push`, COW for everything else. Singleton
  context is duplicated (10 lines) rather than shared so each shim
  stays independently injectable. ~19 MB process-phase heap traffic
  drops -- collapses parseArray's `this.array = []` + grow doublings
  across ~79 k PDFArrays. Composes with `--fast-dict-onebuf`.
  Production runs through it. See
  [notes/08-pdf-lib.md "One-buffer PDFArray"](notes/08-pdf-lib.md).
- `--measure-pass` -- inject
  [docs/lib/measure-pass.mjs](../docs/lib/measure-pass.mjs), the
  no-allocate byte walker. Runs in front of `PDFDocument.load` on
  rawPdf, counts dictSlots + arraySlots, hands them to
  `setExpectedDictSlots()` on `fast-dict-onebuf` and (when on)
  `setExpectedArraySlots()` on `fast-array-onebuf`, pre-sizing each
  shim's backing Array to the exact slot count. Eliminates V8
  growth resizes during load. Net wall-clock ~+40 ms on the book
  (walker ~60 ms, load saves ~20). Production runs through it -- the
  bound on mainBuf isn't material on its own (~60 K slots out of
  2.4 M) but commits the two-pass shape; Phases 2/3/3β (Float64Array
  mainBuf + encoded slots) were explored and didn't ship. Requires
  `--fast-dict-onebuf` (mutex-checked). See "Phase 1: pre-size mainBuf
  via measure-pass" in
  [notes/08-pdf-lib.md](notes/08-pdf-lib.md).
- `--fast-parse-object` -- inject
  [docs/lib/fast-parse-object.mjs](../docs/lib/fast-parse-object.mjs),
  replacing `PDFObjectParser.prototype.parseObject` with a
  first-byte-dispatch version that gates the three speculative
  `matchKeyword` calls (`true` / `false` / `null`) behind a byte
  check. The upstream `parseObject` pays three `matchKeyword`
  fail-and-rewind costs per dispatch (`bytes.offset()` +
  `bytes.next()` + comparison + `bytes.moveTo(initialOffset)`)
  before peeking the dispatch byte, on every call -- and the
  three keywords are extraordinarily rare in real PDFs. The shim
  peeks first and only enters `matchKeyword` when the byte could
  plausibly start a keyword (`t` / `f` / `n`); dispatch order is
  reshuffled by observed frequency in dict-value position (numbers
  / refs first, then `<<`, names, arrays, strings). Same
  semantics. Pulls `parseObject` self-time from ~82 ms (5.2 %)
  to ~40 ms (3.1 %). Production runs through it.
- `--fast-sync-load` -- inject
  [docs/lib/fast-sync-load.mjs](../docs/lib/fast-sync-load.mjs),
  replacing nine `__awaiter`-wrapped methods across pdf-lib's load
  and save paths with awaiterless twins. Each upstream method is
  wrapped in tslib `__awaiter` / `__generator` so on browsers it
  can `await waitForTick()` every `objectsPerTick` objects; in
  Node the yield gate never fires (objectsPerTick: Infinity), but
  every indirect object still pays the generator state-machine
  dispatch + Promise allocation. The shim removes the scaffolding
  entirely. The `parseSpeed` / `objectsPerTick` options drop off
  `PDFDocument.load`, `parallelSave`, and `pdfDoc.save` call sites
  in step. Production runs through it.
- `--fast-indirect-objects` -- inject
  [docs/lib/fast-indirect-objects.mjs](../docs/lib/fast-indirect-objects.mjs),
  replacing `PDFContext.indirectObjects` (`Map<PDFRef, PDFObject>`)
  with a dense array indexed by `objectNumber` for the gen=0 path.
  Mirror of `--fast-refs` on the value side. After `--fast-dict-array`
  landed, `PDFContext.assign`'s
  `this.indirectObjects.set(ref, object)` was the only hot
  `Map.set` left in the heap profile (~7 MB of `set` traffic,
  fired once per indirect object during load). Patches `assign` /
  `lookup` / `lookupMaybe` / `delete` / `getObjectRef` /
  `enumerateIndirectObjects` to consult the dense array first,
  Map as gen!=0 fallback (rare on freshly-parsed PDFs). As a side
  benefit `enumerateIndirectObjects` skips its sort when the
  gen!=0 Map is empty -- dense-array iteration is already in
  objectNumber order. Drops `PDFContext.assign` out of the CPU
  top-15 and halves the remaining `set` heap traffic. Production
  runs through it.
- `--fast-pdfnumber-pool` -- inject
  [docs/lib/fast-pdfnumber-pool.mjs](../docs/lib/fast-pdfnumber-pool.mjs),
  a value-keyed cache in front of `PDFNumber.of`. Dense array for
  non-negative integers in `[0, 16384)`, Map fallback for floats
  / negatives / out-of-range. PDFs reuse the same numeric values
  (page indices, `/Count`, `/N`, `/MediaBox` dimensions, font
  sizes) tens-to-hundreds of thousands of times against only a
  few thousand unique values. `PDFNumber` is immutable so sharing
  is safe. Collapses `parseNumberOrRef`'s ~15 MB of self-size to
  ~0.8 MB (just the unique values); drops total process-phase
  heap traffic by ~13 % (123 MB -> 107 MB). Production runs
  through it.
- `--cpu-profile-process` -- attach Node's `inspector/promises`
  Profiler around the process phase only (skips render and generate).
  Writes `process.cpuprofile` into the timestamped `results/` folder.
  The render-phase `--cpu-profile` is CDP / Chromium; this one is
  Node / Node's V8 -- different runtimes, same `.cpuprofile` JSON
  shape, so `analyze-profile.mjs` / `find-callers.mjs` /
  `find-callees.mjs` / `grep-profile.mjs` work against either.
- `--cpu-sampling 100` -- 100 us sampling. The process phase is now
  ~2.3 s; at 1 ms default sampling that's only ~2300 samples and the
  bottom-up table runs noisy. 100 us is the right resolution for
  this length.

The command intentionally **does not** pass `--cpu-profile`. There's
no rule against running both at once -- they attach to different V8s
and don't interfere -- but the render profile dilutes the bottom-up
view of "what's left in pdf-lib," and the trace files are large.
Profile one phase at a time.

Why no `--render-only`? `--cpu-profile-process` requires the process
phase to run; the harness errors out if you combine them.

upstream), drop every `--fast-*` flag and `--parallel-deflate`.
Caveat for A/B work: profiler-on attribution overstates the cost
of hot functions called millions of times (`PDFRef.of` in
particular). For "did this wall-clock change," do a paired
no-profile A/B as a sanity check.

## Profiling pdf-lib heap allocation (process phase): canonical command

The companion command for the **sampling heap profile** of the
process phase -- "where is pdf-lib allocating bytes?" rather than
"where is it spending cycles?" (run from `perf/`):

```
node measure.mjs --fast-refs --parallel-deflate --fast-decode-name --fast-number-to-string --fast-size-in-bytes --fast-inflate --fast-parse-number --fast-dict-onebuf --fast-array-onebuf --measure-pass --fast-parse-object --fast-sync-load --fast-indirect-objects --fast-pdfnumber-pool --heap-profile-process --heap-sampling 512 --out results/<label>
```

Same `--out` / labelling note as the CPU command above: omit it for a
timestamped folder, pass it for a stable name.

Then read the bottom-up table:

```
node analyze-heap-profile.mjs results/<label>/process.heapprofile --top 15
```

Same `--fast-*` set as the CPU command (production is the baseline
we care about); the new flags:

- `--heap-profile-process` -- attach Node's `inspector/promises`
  `HeapProfiler` around the process phase only. Writes
  `process.heapprofile` into the timestamped `results/` folder.
  Output is V8's sampling-heap-profile JSON (a tree of
  `{ callFrame, selfSize, children }` rooted at `head`), not the
  flat-nodes shape that `.cpuprofile` uses, so the cpu analyzers
  don't apply. Use `analyze-heap-profile.mjs` instead, which walks
  the tree and aggregates `selfSize` by `(functionName + url:line)`:
  `node analyze-heap-profile.mjs results/<run>/process.heapprofile --top 10`.
- `--heap-sampling 512` -- 512-byte sampling interval. V8's default
  is 32768 (32 KB); on the ~150 MB process-phase allocation total
  that's only ~5 k samples and the bottom-up table runs coarse.
  512 B yields ~250 k samples on the book, plenty of resolution
  for "which frame allocated this Map?". Caveat: 512 B sampling
  inflates process wall-clock substantially (the sampler's
  per-allocation bookkeeping fires 64x more often). Read the
  attribution, not the timing, from heap-profiled runs.

`--heap-profile-process` composes with `--cpu-profile-process` --
both attach to the same inspector session, so you can capture cpu
and heap in a single run if you want. The same `--render-only`
incompatibility applies (no process phase to profile).

See [notes/08-pdf-lib.md](notes/08-pdf-lib.md) for the process-phase
investigations these flags enabled.

## What's in this folder

The harness and core probes:

| File | Role |
| --- | --- |
| `measure.mjs` | Puppeteer harness. Drives the same flow as `docs/render-book.mjs` (loads the vendored paged.js bundle, runs `PagedPolyfill.preview()`, calls `page.pdf()`, then either the pdf-lib roundtrip or the incremental writer), with optional CPU profiling, in-page handler injection, and DOM-accessor instrumentation. Auto-pins to a fixed core mask on Windows via `pin-cpu.mjs` (see below) for stable measurements; pass `--no-affinity` to opt out. |
| `pin-cpu.mjs` | Shared shim used by `measure.mjs`, `profile-load.mjs`, `profile-roundtrip.mjs`, and `ab-css.mjs`. On Windows, auto-relaunches the parent Node process under `start /affinity 0x5500 /high` (cores 4-7 physical, thread 0 each, on an 8C16T AMD Ryzen 7) so puppeteer's Chromium children inherit the mask + priority at spawn time. Reduces single-run CPU sample-time variance from ~15-25 % on a stock dev box to ~3 %. No-op on non-Windows; opt out per-invocation with `--no-affinity` or `PERF_PINNED=1`; override mask with `PERF_AFFINITY=<hex>`. |
| `timing-handler.js` | `Paged.Handler` that records per-page wall time + heap into `window.__pagedTiming` and streams a line per page to the console. Injected when `--timing` is passed; off by default because the per-page console relay costs ~2 % of render self-time. |
| `detach-pages.js` | `Paged.Handler` that hides each completed page from the layout tree (registered against `finalizePage`). The shipping fix. Injected by default (both by `measure.mjs` and by `docs/book.bat`); pass `--no-detach-pages` to measure the pre-fix baseline. |
| `instrument-flush-ops.js` | Wraps `getComputedStyle`, `getBoundingClientRect`, and the `offsetWidth` / `clientWidth` / `scrollWidth` family with counters + per-call timing. Injected by `--instrument`. |
| `instrument-detach.js` | Counters around `detach-pages.js`'s removeChild / restore cycle. |
| `time-hooks.js` | Wraps every task registered to `chunker.hooks.*` and `polisher.hooks.*` with a wall-clock timer. Tells you which handler's hook method is eating render time, per page. Injected by `--time-hooks`. |
| `instrument-clones.js` | Wraps `Layout.prototype.append` to tag every source-walker clone, then walks each finalized page at `finalizePage` counting tagged survivors. Reports total appendCalls vs. survivors and the per-page overshoot distribution -- the share of clones rolled back by `removeOverflow`. Requires a one-line `window.PagedLayout = Layout` patch near the bottom of `docs/lib/paged.browser.js` (it's a private class otherwise). Injected by `--clone-count`. |
| `incremental-pdf.mjs` | Replaces the pdf-lib load+save roundtrip with a PDF 1.7 §7.5.6 incremental update appended to Chrome's bytes. Used by `--incremental`. |
| `test-incremental.mjs` | Smoke test for `incremental-pdf.mjs`: renders a tiny probe page, runs the writer, verifies the result parses (via pdf-lib re-load) and that outline + metadata land correctly. |
| `run.bat` | Windows wrapper. On first run, runs `npm install` against the repo-root `package.json` (which pins `puppeteer` / `pdf-lib` / `html-entities` -- the same direct deps `docs/` uses; consolidated to repo root in commit `3da85e8`, May 2026, so `node_modules` is shared). Then invokes `node measure.mjs`. |
| `results/` | Output, one timestamped subfolder per run. Git-ignored. |

Profile / trace analysis (point at files produced by `--cpu-profile`
or `--tracing`):

| File | Role |
| --- | --- |
| `analyze-profile.mjs` | Bottom-up self-time analyzer for `.cpuprofile` files. Same shape as DevTools' Performance bottom-up view, in the terminal. |
| `analyze-trace.mjs` | Bottom-up self-time analyzer for Chrome traces (`trace.json` from `--tracing`). Computes per-event self-time on the renderer's main thread (`CrRendererMain` by default) by walking nested `X`-phase events. Cracks the cpu profile's `(program)` bucket open into named Blink / V8 events (`Layout`, `RecalcStyle`, `RunMicrotasks`, `V8.GC_*`, ...). Operates on the Blink trace events only -- ignores any embedded V8 cpu samples (`Profile` / `ProfileChunk`). |
| `analyze-hybrid.mjs` | Bottom-up analyzer that *combines* the V8 cpu samples and the Blink trace events from a hybrid `trace.json`. Builds a `[JS root..leaf] ++ [Blink outer..inner]` stack at each sample (filtering V8's virtual frames and JS-entry wrapper events) and prints either top-N self-time mixing JS function names with Blink/V8 event names, or `--callees <label>` direct-callees for any name on either axis. Lets you walk a single causation chain from a JS function down through the Blink layout / style work it triggered via gBCR (`hasOverflow -> getBoundingClientRect -> Document::UpdateStyleAndLayout -> Blink.ForcedStyleAndLayout.UpdateTime -> ...`). |
| `find-callers.mjs` | "Who paid for this callee's time?" -- walks a `.cpuprofile` and attributes a target function's total time back to each direct caller. Used throughout the post-mortems to detect gBCR migration between callers. |
| `find-heap-callers.mjs` | Heap-profile companion to `find-callers.mjs`. Walks a `.heapprofile` tree and attributes a target allocator's (e.g. `set`, `Map`, `String`) self+descendant bytes back to each direct caller. Useful for "where do all these Map.set calls come from?" questions. |
| `find-heap-callees.mjs` | Other direction: walks a `.heapprofile` tree and lists a target frame's direct children with their (self + subtree) byte totals. Used to crack open mystery rows like "fastParseDictArray has 58 MB of self-size -- what's it actually allocating?". |
| `find-callees.mjs` | The other direction of `find-callers.mjs`: splits a function's self+descendant time across its direct callees. Surfaces the cases where V8 has rolled native DOM work back into the calling JS frame (Range deletion in `removeOverflow`, HTML parser in `wrapContent`). |
| `grep-profile.mjs` | Lists every node in a `.cpuprofile` whose `functionName` matches a regex, with self-time and location. Quick check for "is this frame in the profile at all, and what's it called?" |
| `ab-css.mjs` | CSS cost attribution for `docs/_site-pdf/assets/css/print.css` + `rouge.css`. Renders the book per variant (full / drop-rouge / drop-print-extras / baseline-minimal) and reports **paired-difference** CPU sample-time across N pairs (default 3), with the baseline re-measured immediately before each variant pair to cancel machine-state drift. Pulls per-`Document::recalcStyle` / `LocalFrameView::performLayout` / `rebuildLayoutTree` / `ShapeText` total time from the embedded V8 cpu profile in the hybrid trace; prints mean ± SD per variant so noise-floor rows are visible. Auto-pins on Windows via `pin-cpu.mjs`. Optional `--per-print-section` adds one drop-print-`<section>` variant per `/* ---- ---- */` divider in print.css; individual sections of print.css turned out to be below the noise floor on this book, so off by default. |
| `ab-aggregate.mjs` | Per-row mean + SD aggregator across 6 paired cpu profiles (`ab-A1..A3.cpuprofile` and `ab-B1..B3.cpuprofile`). Use when wall-clock noise drowns a structural change: capture 3+3 interleaved profiles via `measure.mjs --cpu-profile` with the change toggled on/off between runs, then point this at the 6 files for a mean-with-SD table that surfaces deltas wall-clock can't see (e.g. ~6 σ shifts on rows that move from 88 ms to 2 ms). See *Disabling the filter outright* in [notes/05-blink-trace.md](notes/05-blink-trace.md) for the methodology. |

Memory probes (added during the phase-7 investigation):

| File | Role |
| --- | --- |
| `probe-renderer-mem.mjs` | Per-allocator + per-Blink-class memory breakdown of the renderer via Chromium's memory-infra tracing. Captures process memory dumps at three points by default (post-render, mid-generate, post-generate). `--gc-passes N` inserts an extra post-gc dump between post-render and the generate phase (triggers V8 `gc()` + `Memory.simulatePressureNotification`; auto-adds `--js-flags=--expose-gc`); `--heap-snapshot` additionally captures V8 snapshots via CDP `HeapProfiler.takeHeapSnapshot`. |
| `probe-memory.mjs` | Generic memory probe: dumps a memory-infra trace at the end of one render. |
| `analyze-heap-snapshot.mjs` | Single-snapshot summary (top type × name by aggregate bytes, detached subset) and pairwise diff between two snapshots. |
| `analyze-heap-profile.mjs` | Bottom-up size analyzer for V8 `.heapprofile` files. |
| `analyze-mem-trace.mjs` | Per-process / per-allocator extractor for memory-infra traces. |
| `diff-blink-classes.mjs` | Per-Blink-class diff between two memory-infra dumps in the same trace. Strips the per-dump GUID suffix from class names so the diff lines up. |
| `diff-heap-profile.mjs` | Pairwise diff between two `.heapprofile` files. |

Side experiments / one-shot probes:

| File | Role |
| --- | --- |
| `profile-load.mjs` | Standalone profiler for `PDFDocument.load`. Runs the load on a chosen PDF with a chosen `parseSpeed`; intended to be run under `node --cpu-prof`. Auto-pins on Windows via `pin-cpu.mjs`. |
| `profile-roundtrip.mjs` | Times the full pdf-lib `load + save` roundtrip across the three `parseSpeed` / `objectsPerTick` settings on a chosen PDF. Auto-pins on Windows via `pin-cpu.mjs`. |
| `probe-chrome-outline.mjs` | Renders a synthetic multi-level h1..h6 document via Chrome's `outline: true` and dumps the resulting `/Outlines` tree. Quick check that the CDP flag is wired correctly in the local Chromium / puppeteer combo. |
| `compare-outlines.mjs` | Diffs two PDFs' `/Outlines` trees by `(depth, title, target page)`. Used to verify whether Chrome's native outline matches the injected one. |
| `probe-outline-exclusions.mjs` | Tests which per-element attributes / styles (aria-hidden, role=presentation, hidden, display:none, CSS bookmark-level, ...) make Chrome drop a heading from its outline. |
| `probe-parallel.mjs` | Two-shard `Promise.all` `page.pdf()` probe -- the cost-of-`pageRanges`-sharding measurement (see *`pageRanges` sharding: off the table for now* in [notes/06-microtasks-pageranges-css.md](notes/06-microtasks-pageranges-css.md)). |
| `probe-idle-browser.mjs` | Standalone probe: launches a headless browser and measures steady-state idle memory + sample-time, for separating render cost from browser-fixed overhead. |
| `phase0-measure.mjs` | No-allocate byte walker over a raw PDF: recognises the grammar (indirect objects, dicts, arrays, names, numbers, refs, strings, streams, ObjStms) and produces counts only, without instantiating any PDFObject. Viability gate for the two-pass measure-allocate-work architecture that ships as `measure-pass.mjs`. Run with `node perf/phase0-measure.mjs <input.pdf> --runs N`; defaults to the most recent `perf/results/*/book.pdf`. Companion to `--dump-raw-pdf <path>` on `measure.mjs`, which captures the canonical 39 MB Chrome-output input once. |
| `instrument-slot-types.mjs` | Walks `fast-dict-onebuf`'s `main` buffer after setOutline and classifies each slot by PDFObject subtype, printing key/value counts and percentages. Used to scope the Phase 2 / Phase 3 encoding work -- how many slot-marks would a Float64Array mainBuf actually eliminate, and what's the side-pool fallback rate. Invoked via `--instrument-slot-types` on `measure.mjs` (requires `--fast-dict-onebuf`; mutex with `--incremental` / `--render-only`). |

Documentation:

| File | Role |
| --- | --- |
| `CHROMIUM.md` | Chromium-internal PDF-generation paths investigated separately (out-of-process print compositor, SkPDF, alternative drivers). |
| `notes/` | The seven phase-by-phase investigation files. See *Investigation log* at the bottom of this README. |

The harness is structurally a copy of `pagedjs-cli/src/printer.js`'s
`render()` flow, now living in our own code:

- same `puppeteer.launch({ args: [...] })` flags, including
  **`--allow-file-access-from-files`** -- without it, paged.js's
  stylesheet `fetch()` calls fail with `net::ERR_FAILED` and the
  outer `preview()` rejects with an undecorated `ProgressEvent`.
  pagedjs-cli adds this flag automatically for any file (non-URL)
  input via `allowLocal = !options.blockLocal` in `cli.js:67`. Easy
  to miss when rolling your own driver.
- same `page.emulateMediaType('print')` before navigation.
- same `window.PagedConfig.auto = false` set **after** navigation
  via `page.evaluate()`, not via `evaluateOnNewDocument`.
- same paged.js bundle: we vendor `docs/lib/paged.browser.js`, taken
  from `pagedjs-cli@0.4.3/dist/browser.js`. The npm `pagedjs`
  package's `paged.polyfill.js` is a close cousin (~33k lines each,
  ~120 lines of divergence) but at 0.4.3 only the cli bundle is
  reliable inside this flow.
- same outline + metadata helpers: `docs/lib/outline.mjs` and
  `docs/lib/postprocesser.mjs` are MIT-licensed copies of
  `pagedjs-cli/src/outline.js` and `src/postprocesser.js`, ESM-ified.

Why vendor rather than depend on `pagedjs-cli`? Two reasons:
pagedjs-cli's `Printer.pdf()` calls `PDFDocument.load(pdf)` and
`pdfDoc.save()` with no options and therefore inherits pdf-lib's
default `parseSpeed: Slow`, which adds ~32 s of pure idle yielding
to every build (see *Profiling pdf-lib's load* in
[notes/01-baseline-and-detach.md](notes/01-baseline-and-detach.md) for
the full investigation); also, it doesn't forward in-page `console.log`
to its own stdout, and we have no way to call `page.evaluate()` from
outside to pull out the timing data at the end. Driving Puppeteer
ourselves gets both.

The net effect: what we measure tracks what production renders --
`docs/render-book.mjs` and `perf/measure.mjs` share the same helpers
and bundle. If profiling shows a hot spot, fixing it will move the
real `book.bat` number too.

## How to run

```
# from this folder
run.bat                                   # defaults to ..\docs\_site-pdf\book.html
run.bat path\to\some-other.html           # explicit input
run.bat --out my-run                      # explicit output directory
run.bat --no-detach-pages                 # opt out of the detach-pages fix (measure pre-fix O(n²) baseline)
run.bat --timing                          # collect per-page wall time + heap (writes timing.csv + quartile summary)
run.bat --cpu-profile                     # CPU-profile the render phase (CDP, Chromium-side)
run.bat --cpu-profile-process             # CPU-profile the process phase (Node inspector, Node-side)
run.bat --heap-profile-process            # sampling heap-profile the process phase (Node inspector HeapProfiler); pair with --heap-sampling 512 for fine attribution
run.bat --render-only                     # bail out after render (skip generate + process, ~47s saved)
run.bat --clone-count                     # report Layout.append clones appended vs survivors per page
run.bat --instrument                      # count + time DOM-accessor calls
run.bat --time-hooks                      # per-task timing of every chunker/polisher hook
run.bat --incremental                     # process via incremental update instead of pdf-lib roundtrip
run.bat --chrome-outline                  # let Chrome emit /Outlines (skip parseOutline + setOutline)
run.bat --tracing                         # capture a hybrid Chrome trace (Blink events + embedded V8 cpu samples)
run.bat --fast-refs                       # dense-array cache for PDFRef.of's gen=0 path (ships in render-book.mjs by default; opt-in here for A/B)
run.bat --parallel-deflate                # parallelSave with objectsPerStream=500 (also ships; opt-in here for A/B)
run.bat --fast-decode-name                # skip decodeName regex when name has no # (also ships; opt-in here for A/B)
run.bat --fast-number-to-string           # skip numberToString redundant toString/split when no exponential (also ships; opt-in here for A/B)
run.bat --fast-size-in-bytes              # non-allocating ladder for xref byte-width (also ships; opt-in here for A/B)
run.bat --fast-inflate                    # swap pako.inflate for node:zlib.inflateSync (also ships; opt-in here for A/B)
run.bat --fast-parse-number               # direct-integer accumulator for parseRawNumber/parseRawInt (also ships; opt-in here for A/B)
run.bat --fast-dict-iter                  # in-place Map.forEach for PDFDict.sizeInBytes/copyBytesInto (Map-shape baseline; production now runs --fast-dict-onebuf)
run.bat --fast-parse-dict                 # hoist Type/Catalog/Pages/Page sentinel PDFNames out of parseDict (Map-shape baseline; production now runs --fast-dict-onebuf)
run.bat --fast-dict-array                 # replace PDFDict's backing Map with a per-dict flat [k,v,k,v,...] array; subsumes --fast-dict-iter + --fast-parse-dict (A/B baseline; production now runs --fast-dict-onebuf)
run.bat --fast-dict-onebuf                # ONE long-lived buffer for all PDFDict entries + small per-parser temp (also ships; opt-in here for A/B)
run.bat --fast-array-onebuf               # ONE long-lived buffer for all PDFArray elements + small per-parser temp; composes with --fast-dict-onebuf (also ships; opt-in here for A/B)
run.bat --measure-pass --fast-dict-onebuf # walk rawPdf with the no-allocate measure pass and pre-size --fast-dict-onebuf's mainBuf to the exact dict-slot count (Phase 1 of the two-pass architecture; mutex with --incremental and --render-only)
run.bat --fast-indirect-objects           # dense-array cache for PDFContext.indirectObjects (gen=0 path); mirror of --fast-refs on the value side (also ships; opt-in here for A/B)
run.bat --fast-pdfnumber-pool             # value-keyed cache in front of PDFNumber.of; dense array for small ints, Map for the rest (also ships; opt-in here for A/B)
run.bat --fast-parse-object               # first-byte dispatch in parseObject; gate true/false/null matchKeyword behind byte check (also ships; opt-in here for A/B)
run.bat --fast-sync-load                  # synchronify PDFDocument.load + parser; strip waitForTick machinery (also ships; opt-in here for A/B)
```

Flags compose. The CPU profile lands as `render.cpuprofile`
(loadable in Chrome DevTools -> Performance -> "Load profile...");
`--cpu-profile-process` writes `process.cpuprofile` alongside it;
`--heap-profile-process` writes `process.heapprofile` (loadable in
Chrome DevTools -> Memory -> "Load profile..."); `--instrument`
prints a per-op table at end-of-render.

You need `_site-pdf\book.html` to exist first -- run `docs\build.bat`
(which is `bundle exec jekyll build`) if you haven't already.

Outputs land in `perf/results/<ISO-timestamp>/`:

- `book.pdf`    -- the rendered PDF, byte-equivalent to what
  `book.bat` produces.
- `timing.json` -- phase totals + sub-phase breakdowns
  (`parseOutline`, `page.pdf`, pdf-lib load / setOutline / save).
  Per-page render entries are populated only when `--timing` is set.
- `timing.csv`  -- one row per page, `page,dur_ms,heap_start_mb,
  heap_end_mb,elapsed_s`. Empty (header only) without `--timing`.
- `summary.txt` -- the three phase totals; with `--timing` also adds
  first-quarter vs last-quarter average per-page render cost + ratio.

## Reading the output

With `--timing`, the summary prints something like:

```
pages        : 1638
pdf size     : 7.4 MB

render       : 110.5s    (per-page layout via paged.js)
generate     :  47.2s    (parseOutline + page.pdf)
process      :   3.1s    (pdf-lib load + setOutline + save)
total        : 160.8s

render: first 409-page avg per-page: 7.0ms
render: last  409-page avg per-page: 32.1ms
render: ratio (last / first)        : 4.56x
```

The ratio at the bottom is the headline render number. Interpretation:

- **ratio ~ 1.0** -- flat per-page cost. Total is `O(n)`. The
  quadratic feeling was probably warm-up + GC pressure, not algorithmic.
- **ratio scales roughly with `pages_last / pages_first`** -- per-page
  cost is `O(n)`, total is `O(n^2)`. Move to step 2.
- **ratio in between** -- partial quadratic component, e.g. one phase
  is `O(n)` per page but the rest is flat. Look at `phases` in the JSON
  to see whether the growth is in layout or in `afterRendered`.

A useful follow-up is to chart `dur_ms` vs `page` from the CSV. A
clean upward straight line says `O(n)` per page; a flat line with
spikes points at content variance (big tables, code blocks) rather
than algorithmic growth.

The CSV also includes heap size at the start and end of each page. If
heap grows roughly linearly with page index, the layout phase is
retaining per-page state -- a common cause of quadratic cost (every
new page walks all previously-retained nodes).

## Current state

End-to-end on the 1651-page book, `book.bat` path, after all shipped
optimisations:

```
render   :   ~8 s    (was ~104 s in the original baseline)
generate :  ~32-43 s (was ~64 s; Chromium-version-bump sensitive)
process  :   ~5 s    (was ~40 s; pdf-lib parseSpeed:Fastest)
total    :  ~45-60 s (was 207 s -- 3.5-4x speedup)
```

Renderer memory peaks at ~1.76 GB; full process tree peaks at ~2.3-3.3
GB private working set (see [notes/07-memory.md](notes/07-memory.md)).
The render hot path is structurally near its floor; the largest
remaining untried lever is `pageRanges` sharding for `generate`, but
the per-shard memory cost makes it impractical at current scale.
Chrome's native `outline: true` could trim another ~5 s off `process`
but requires a `role="presentation"` preprocessor pass on h5/h6
headings; not pursued yet.

What shipped, in chronological order, with attribution to the phase
file documenting each:

| Fix | Phase | Saved |
| --- | --- | --- |
| `detach-pages` handler | [01](notes/01-baseline-and-detach.md) | ~55 s render |
| Incremental PDF writer | [01](notes/01-baseline-and-detach.md) | ~32 s process |
| pdf-lib `parseSpeed: Fastest` | [01](notes/01-baseline-and-detach.md) | ~3 s process |
| Drop `pagedjs-cli` dependency | [01](notes/01-baseline-and-detach.md) | (cleanup) |
| `finalizePage` micro-opts | [02](notes/02-finalizepage.md) | ~3 s render |
| Aggressive detach (`removeChild`) | [02](notes/02-finalizepage.md) | ~22 s render |
| Skip dead `findEndToken` path | [02](notes/02-finalizepage.md) | ~3.5 s render |
| `renderTo` additive backoff | [02](notes/02-finalizepage.md) | ~4.25 s render |
| Puppeteer 22→25 bump | [03](notes/03-puppeteer-bump-findref.md) | ~20-30 s generate |
| `findRef` fast-path fix | [03](notes/03-puppeteer-bump-findref.md) | ~2.4 s render |
| `requestAnimationFrame` → microtask | [03](notes/03-puppeteer-bump-findref.md) | small but unblocks more |
| Strip async machinery (Phase 1+2) | [04](notes/04-sync-and-inner-loop.md) | re-attribution + small |
| `Layout.append` parent-lookup cache | [04](notes/04-sync-and-inner-loop.md) | ~0.3 s render |
| `Hook.triggerSync` empty fast-path | [04](notes/04-sync-and-inner-loop.md) | small |
| Footnotes self-disable when none | [04](notes/04-sync-and-inner-loop.md) | small |
| Skip `wrapContent` innerHTML roundtrip | [04](notes/04-sync-and-inner-loop.md) | ~0.9 s render |
| Adaptive `maxChars` bug fixes | [04](notes/04-sync-and-inner-loop.md) | ~1 s render |
| Disable WhiteSpaceFilter | [05](notes/05-blink-trace.md) | ~0.7 s render |
| Full sync chain (RunMicrotasks → 0) | [06](notes/06-microtasks-pageranges-css.md) | re-attribution |
| `--disable-gpu` + `--in-process-gpu` | [07](notes/07-memory.md) | ~200 MB memory |
| `pako.deflate` → `node:zlib.deflateSync` | [08](notes/08-pdf-lib.md) | ~1.5 s process (save -58 %) |
| `PDFRef.of` dense-array cache (gen=0) | [08](notes/08-pdf-lib.md) | ~0.2 s process (load -16 %) |
| Parallel deflate + `objectsPerStream: 500` | [08](notes/08-pdf-lib.md) | ~0.3 s process (zlib off-thread; PDF -5 %) |
| `PDFName.of` no-`#` cache (skip `decodeName` regex) | [08](notes/08-pdf-lib.md) | ~0.5 s process (load -17 %, GC -101 ms) |
| `numberToString` no-`e` short-circuit | [08](notes/08-pdf-lib.md) | ~40 ms profile, below wall-clock noise |
| `sizeInBytes` short-circuit ladder (no base-2 string) | [08](notes/08-pdf-lib.md) | ~60 ms process (save -70 ms) |
| `PDFDict` iter (Map.forEach with hoisted callbacks) | [08](notes/08-pdf-lib.md) | ~80 ms process (dict path -6 pp) |
| `parseDict` sentinel-PDFName hoist (Type/Catalog/Pages/Page) | [08](notes/08-pdf-lib.md) | ~17 ms profile (fastOf -22 %) |
| Synchronify pdf-lib load + save (strip `__awaiter` scaffolding) | [08](notes/08-pdf-lib.md) | ~0.36 s process (load -26 %, GC -53 ms) |
| `parseObject` first-byte dispatch + gated keyword scans | [08](notes/08-pdf-lib.md) | ~42 ms profile (parseObject -51 %) |
| `PDFDict` flat-array storage (subsumes iter + parseDict shims) | [08](notes/08-pdf-lib.md) | ~48 ms process (Map+set heap -80 %, GC -20 %) |
| `PDFContext.indirectObjects` dense gen=0 array | [08](notes/08-pdf-lib.md) | `assign` off CPU top-15; remaining `set` heap -48 % |
| `PDFRef.of` direct-construct on cache miss (skip upstream `pool.set`) | [08](notes/08-pdf-lib.md) | `PDFRef.of` off CPU top-15 (~93 ms); `set` heap 7.7 MB → 0.5 MB |
| `PDFNumber.of` value-pool (dense int + Map fallback) | [08](notes/08-pdf-lib.md) | `parseNumberOrRef` off heap top-10; total process heap 123 MB → 107 MB (-13 %) |
| Pre-size `parseDict` accumulator (`new Array(10)` median) | [08](notes/08-pdf-lib.md) | `fastParseDictArray` heap row -25 %; total process heap 107 MB → 92 MB (-14 %) |
| One-buffer `PDFDict` (single mainBuf + packed 53-bit instance) | [08](notes/08-pdf-lib.md) | total process heap 92 MB → 66 MB (-28 %); cumulative -57 % since Map-backed PDFDict |
| `measure-pass` (Phase 1) wired into production via `setExpectedDictSlots()` | [08](notes/08-pdf-lib.md) | byte-identical output; mainBuf pre-sized exact (no V8 growth resizes); ~+40 ms net process |
| One-buffer `PDFArray` (single arrayMain + packed (start, length) view) | [08](notes/08-pdf-lib.md) | total process heap 66 MB → 52 MB (-21 %); parseArray off top 15; cumulative -66 % since Map-backed PDFDict |

What was tried and didn't ship:

- Binary-search `Layout.textBreak` ([02](notes/02-finalizepage.md))
- Memoize `Page.create`'s `getBoundingClientRect` ([02](notes/02-finalizepage.md))
- Four of five `createBreakToken` dedup attempts ([02](notes/02-finalizepage.md)) -- Attempt E shipped as the `renderTo` additive backoff above
- Six cheaper-`removeChild` variants ([03](notes/03-puppeteer-bump-findref.md))
- Move-not-clone instead of clone+detach ([05](notes/05-blink-trace.md))
- `pageRanges` sharding for `generate` ([06](notes/06-microtasks-pageranges-css.md))
- Forced GC between render and generate ([07](notes/07-memory.md))

## Investigation log

The phase files in [`notes/`](notes/) cover the full investigation
narrative. Each is self-contained but they're written in chronological
order; later ones reference earlier ones for context.

| File | Covers |
| --- | --- |
| [01-baseline-and-detach.md](notes/01-baseline-and-detach.md) | Confirming the quadratic; detach-pages; incremental writer; pdf-lib parseSpeed; Chromium `Page.printToPDF` knob survey; dropping `pagedjs-cli`; restoring live progress. |
| [02-finalizepage.md](notes/02-finalizepage.md) | Revisiting `AtPage.finalizePage`; looking past it; the failed binary-search and gBCR-memo attempts; finding the residual O(n) was CSS-Grid sibling sweeps over `display:none` pages (aggressive-detach fix); five `createBreakToken` dedup attempts (Attempt E shipped the `renderTo` additive backoff). |
| [03-puppeteer-bump-findref.md](notes/03-puppeteer-bump-findref.md) | Rebaselining after puppeteer 22→25; the `findRef` fast-path miss (39 % of calls were falling through, ~2.4 s win); six cheaper-`removeChild` variants (none shipped); chasing the residual `(idle)` time down to `requestAnimationFrame`. |
| [04-sync-and-inner-loop.md](notes/04-sync-and-inner-loop.md) | Stripping headless-irrelevant async machinery (hook fast-path; sync chain end-to-end); shrinking `Layout.append` (footnote fast-path, parent-lookup cache, `triggerSync` empty-handlers); skipping `wrapContent`'s innerHTML round-trip; fixing two bugs in the adaptive `maxChars` overflow-check rhythm. |
| [05-blink-trace.md](notes/05-blink-trace.md) | What happened when we tried move-not-clone (a `previousLeaf` cache shipped instead of move); cracking the cpu profile's `(program)` row open with a Blink-category trace; the WhiteSpaceFilter paired-A/B that found it wasn't worth its layout cost in our pipeline. |
| [06-microtasks-pageranges-css.md](notes/06-microtasks-pageranges-css.md) | Following `RunMicrotasks` down to zero (chunker fully sync); why `pageRanges` sharding is off the table; CSS cost attribution showing print.css's individual sections are all below the noise floor. |
| [07-memory.md](notes/07-memory.md) | Where the renderer's 1.9 GB goes -- process-tree footprint, per-allocator + per-Blink-class breakdown, `--disable-gpu` + `--in-process-gpu` saving ~200 MB, a GC-pass probe finding 180 MB of unswept Oilpan garbage. |
| [08-pdf-lib.md](notes/08-pdf-lib.md) | Profiling the process phase via `--cpu-profile-process`; pako's per-stream init dominates with ~4 500 small streams (routing pdf-lib's `deflate` + `inflate` through `node:zlib` saves ~1.5 s); `PDFRef.of`'s string-keyed Map lookup at 1.2 M calls per load (dense-array gen=0 cache saves ~0.2 s); parallelising save's per-stream deflate on libuv's pool with `objectsPerStream: 500` (~0.3 s off the main thread; PDF -5 %); `decodeName`'s regex scan on 2.76 M `PDFName.of` calls per load with a 0.0001 % hit rate (no-`#` cache saves ~0.5 s); `numberToString`'s redundant `toString`/`split`/`parseInt` on the 100 % no-`e` path; `sizeInBytes` allocating `n.toString(2)` on ~300 k xref-writer calls (short-circuit ladder saves ~60 ms); `PDFDict.entries` allocating `Array.from(map.entries())` on every dict serialisation (`Map.forEach` with hoisted callbacks saves ~80 ms); `parseDict`'s type-dispatch tail re-running `PDFName.of('Type'/'Catalog'/'Pages'/'Page')` per dict (hoisted sentinel constants drop `fastOf` self-time by 22 %); pdf-lib's `__awaiter`/`__generator` scaffolding on nine load + save methods costing ~135 ms of attributed self-time + ~50 ms GC (synchronified twins save 0.36 s of process); `parseObject`'s three speculative `matchKeyword(true/false/null)` scans on every dispatch (first-byte peek + gated keyword scans halve `parseObject` self-time); the sampling heap profile pointing at `new Map()` + `Map.prototype.set` at ~50 % of process-phase allocations (replacing `PDFDict`'s backing `Map` with a flat alternating `[k,v,k,v,...]` array drops Map+set heap traffic ~80 % and subsumes the earlier `fast-dict-iter` + `fast-parse-dict` shims); the only hot `Map.set` left being `PDFContext.assign`'s `indirectObjects.set(ref, object)` (replacing the Map with a dense gen=0 array indexed by `objectNumber` drops `assign` out of the CPU top-15 and halves the remaining `set` heap traffic); the residual `set` after that being the upstream `PDFRef.of` pool.set on cache miss (directly constructing the `PDFRef` via `Object.create(PDFRef.prototype)` on the gen=0 miss path bypasses the redundant upstream pool entirely, dropping `set` heap traffic from 7.7 MB to 0.5 MB and saving another ~93 ms on `PDFRef.of` CPU); `parseNumberOrRef` as the next-largest heap row at 15 MB of inlined `new PDFNumber(value)` calls -- PDFs reuse a few thousand unique numeric values hundreds of thousands of times (page indices, `/Count`, `/MediaBox` dimensions, font sizes), so pooling `PDFNumber` by value drops `parseNumberOrRef` off the top 10 and total process heap by ~13 %; `fastParseDictArray` at ~85 % FixedArray-growth garbage on 261 k dicts with a 5-entry median (pre-sizing the accumulator at `new Array(10)` collapses the per-call growth chain, dropping the row -25 % and total heap another -14 %); the next layer being the irreducible "one `new Array(10)` + one PDFDict instance per parsed dict" floor with ~1780 backing arrays still in flight after `--fast-dict-array` (collapse them into one long-lived mainBuf where every committed PDFDict entry lives, a per-parser temp stack handles parseDict recursion, owned dicts append to main and mutate in-place / COW-to-tail, and the whole PDFDict instance state packs into one 53-bit Number -- 24-bit start + 14-bit length + 1-bit owned -- so the per-dict object header collapses to a single field; total process heap drops 92 MB → 66 MB (-28 %), cumulative -57 % since the Map-backed baseline); GC self-time still ~150 ms / 15 % of process after fast-dict-onebuf (V8-flag knobs don't move it -- mark cost is dominated by walking the ~2.4 M Object-ref slots in mainBuf), so the next attack surface is shrinking the *live set* V8 has to mark by encoding slots as Numbers in a Float64Array mainBuf instead of Object references; that needs exact pool sizing, which is best done by a separate measure-allocate-work pass (Phase 0 viability gate: a no-allocate byte walker prototype clocks 135 ms vs PDFDocument.load at 1238 ms on the 39 MB Chrome-output PDF, ~9x cheaper, so even an 80 %-of-current work pass would land net-positive on CPU before any GC reduction; the prototype lives in `perf/phase0-measure.mjs` with `--dump-raw-pdf` on `measure.mjs` for capturing the canonical input); Phase 1 productionises that walker as `docs/lib/measure-pass.mjs` and adds `setExpectedDictSlots()` to fast-dict-onebuf so the harness's `--measure-pass` flag pre-sizes mainBuf exact (byte-identical output, +40 ms net process on the book) -- pipeline shape committed for Phase 2 to layer on, even though Phase 1 alone doesn't move the heap; a V8 IC-invalidation gotcha worth recording: rebinding the module-level `main` (rather than resizing it in place via `main.length = N`) made `_appendEntries` deopt and the heap jump 65 → 92 MB despite the resized Array being shape-identical; post-Phase-1 cleanup: the One-buffer `owned` bit was over-cautious -- `start + length === mainLen` is enough to know slots past mainLen are claimable regardless of whether the range came from the parser or a factory call, so the bit drops out of the packed value entirely (set's COW gate simplifies, _cow collapses to one branch, bit 38 becomes spare; byte-identical output, heap flat); slot-type histogram on `main[0..mainLen)` confirms keys are 100 % PDFName and the four big pools (Name / Ref / Number / Dict) cover 96.4 % of all slots, so a Float64Array mainBuf with a side `Object[]` for the residual ~3.5 % (Array / String / HexString) would collapse ~96 % of GC slot-marks at the price of a side-pool indirection -- `perf/instrument-slot-types.mjs` does the classification in 39 ms via `--instrument-slot-types`; built the Float64Array mainBuf with 4-bit tag + 49-bit payload encoding (subsuming fast-refs and fast-pdfnumber-pool's pool IDs, adding new pools for PDFArray / PDFString / PDFHexString) and confirmed byte-identical output -- but the measured win was a wash: pointer-array marks turn out to be fast in V8, encoding overhead at parse + decode at save roughly cancels the savings, and the new pool Maps cost ~3 MB heap, so the architecture stays on the shelf rather than shipping; mirroring the same shape to PDFArray (each instance as a view into a shared arrayBuf Float64Array via `this.d = (start, length)`, same temp-then-commit parser pattern) lands the expected heap win of -7.6 MB / -12 % and pulls parseArray's 19.6 MB attribution row off the top 10 entirely, but introduces a +360 ms wall-clock regression at save -- ~3 M per-slot `decodeValue` calls across copyBytesInto, ~100 ns each, V8 can't inline across the prototype boundary -- so the architecture stays off staging too; the natural follow-up is to hand-inline decodeValue's 10-case switch into all four hot save methods (Phase 3β), which recovers the function-call overhead and lands net wins on GC (-19 ms) and parseName (-17 ms, a downstream V8 re-optimization once the call sites became monomorphic per case branch) -- but the inlined switch body itself adds +23 ms at encode-at-parse and +22 ms at copyBytesInto, and the net of all of Phase 2 + 3 + β is "real heap+GC win, ~+200 ms wall-clock loss across many frames", so the architecture stays off staging on the simpler conclusion that V8 marks pointer arrays faster than expected and the original polymorphic `main[i].copyBytesInto()` was fine; Phase 1 wires into production via a `setExpectedDictSlots()` call in `docs/render-book.mjs` that runs the measure walker on rawPdf and hands the exact dictSlot count to fast-dict-onebuf -- the bound on mainBuf isn't material on its own (~60 K slots out of 2.4 M of slack) but commits the two-pass shape so any future shim swap doesn't have to re-do the wiring; finally, mirroring fast-dict-onebuf's range-view shape onto PDFArray (every committed element in a single append-only `arrayMain`, each PDFArray a view via packed `(start, length)`) is the lever the encoded approach was reaching for, with plain Object[] storage skipping the per-slot decode cost that killed Phase 3 -- ~19.6 MB `parseArray` allocation row drops off the top 15, total process heap 66 MB → 52 MB (-21 %), cumulative -66 % since the Map-backed baseline. |
