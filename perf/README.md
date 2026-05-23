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
node measure.mjs --detach-pages --no-timing --render-only --cpu-profile --cpu-sampling 100
```

(`run.bat` forwards the same args.) Flag rationale:

- `--detach-pages` -- inject the shipping fix. The profile reflects
  what production actually pays, not the old O(n^2) baseline.
- `--no-timing` -- skip the per-page `console.log` relay from
  `timing-handler.js`. The relay costs ~2 % of render self-time on
  the 1638-page book and muddies the bottom-up view.
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

## What's in this folder

The harness and core probes:

| File | Role |
| --- | --- |
| `measure.mjs` | Puppeteer harness. Drives the same flow as `docs/render-book.mjs` (loads the vendored paged.js bundle, runs `PagedPolyfill.preview()`, calls `page.pdf()`, then either the pdf-lib roundtrip or the incremental writer), with optional CPU profiling, in-page handler injection, and DOM-accessor instrumentation. Auto-pins to a fixed core mask on Windows via `pin-cpu.mjs` (see below) for stable measurements; pass `--no-affinity` to opt out. |
| `pin-cpu.mjs` | Shared shim used by `measure.mjs`, `profile-load.mjs`, `profile-roundtrip.mjs`, and `ab-css.mjs`. On Windows, auto-relaunches the parent Node process under `start /affinity 0x5500 /high` (cores 4-7 physical, thread 0 each, on an 8C16T AMD Ryzen 7) so puppeteer's Chromium children inherit the mask + priority at spawn time. Reduces single-run CPU sample-time variance from ~15-25 % on a stock dev box to ~3 %. No-op on non-Windows; opt out per-invocation with `--no-affinity` or `PERF_PINNED=1`; override mask with `PERF_AFFINITY=<hex>`. |
| `timing-handler.js` | `Paged.Handler` that records per-page wall time + heap into `window.__pagedTiming` and streams a line per page to the console. Always injected. |
| `detach-pages.js` | `Paged.Handler` that hides each completed page from the layout tree (registered against `finalizePage`). The fix. Injected by `--detach-pages` and by `docs/book.bat`. |
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
run.bat --detach-pages                    # inject the detach-pages fix
run.bat --cpu-profile                     # CPU-profile the render phase
run.bat --render-only                     # bail out after render (skip generate + process, ~47s saved)
run.bat --clone-count                     # report Layout.append clones appended vs survivors per page
run.bat --instrument                      # count + time DOM-accessor calls
run.bat --time-hooks                      # per-task timing of every chunker/polisher hook
run.bat --incremental                     # process via incremental update instead of pdf-lib roundtrip
run.bat --chrome-outline                  # let Chrome emit /Outlines (skip parseOutline + setOutline)
run.bat --tracing                         # capture a hybrid Chrome trace (Blink events + embedded V8 cpu samples)
```

Flags compose. The CPU profile lands as `render.cpuprofile`
(loadable in Chrome DevTools -> Performance -> "Load profile...");
`--instrument` prints a per-op table at end-of-render.

You need `_site-pdf\book.html` to exist first -- run `docs\build.bat`
(which is `bundle exec jekyll build`) if you haven't already.

Outputs land in `perf/results/<ISO-timestamp>/`:

- `book.pdf`    -- the rendered PDF, byte-equivalent to what
  `book.bat` produces.
- `timing.json` -- full record: phase totals, sub-phase breakdowns
  (`parseOutline`, `page.pdf`, pdf-lib load / setOutline / save),
  and the per-page render entries.
- `timing.csv`  -- one row per page,
  `page,dur_ms,heap_start_mb,heap_end_mb,elapsed_s`.
- `summary.txt` -- the three phase totals, plus first-quarter vs
  last-quarter average per-page render cost and ratio.

## Reading the output

The summary prints something like:

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

What was tried and didn't ship:

- Binary-search `Layout.textBreak` ([02](notes/02-finalizepage.md))
- Memoize `Page.create`'s `getBoundingClientRect` ([02](notes/02-finalizepage.md))
- Four of five `createBreakToken` dedup attempts ([02](notes/02-finalizepage.md)) -- Attempt E shipped as the `renderTo` additive backoff above
- Six cheaper-`removeChild` variants ([03](notes/03-puppeteer-bump-findref.md))
- Move-not-clone instead of clone+detach ([05](notes/05-blink-trace.md))
- `pageRanges` sharding for `generate` ([06](notes/06-microtasks-pageranges-css.md))
- Forced GC between render and generate ([07](notes/07-memory.md))

## Investigation log

The seven phase files in [`notes/`](notes/) cover the full investigation
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
