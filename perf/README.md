# PDF render profiling

The book PDF is built by rendering `_site-pdf/book.html` through
paged.js + headless Chromium + pdf-lib (see `docs/book.bat`, which
invokes `docs/render-book.mjs`). The pipeline was historically driven
by `pagedjs-cli`; we replaced that with our own thin driver after the
investigations in this folder, so we control pdf-lib's parseSpeed
without patching upstream (see "Profiling pdf-lib's load" below).
As the book has grown we noticed **quadratic** wall-clock behaviour:
time-per-page goes up as later pages are laid out, so doubling the
page count roughly quadruples the total render time.

This folder holds the tools used to investigate that.

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
  where most remaining cost lives (see "Looking past `finalizePage`"
  and later sections). Larger profile file in return.

Drop `--render-only` whenever you need to also measure generate /
process (e.g. confirming a fix doesn't shift cost into `page.pdf()`
or pdf-lib), or to write `book.pdf` for behavioural verification.

The rest of this README is the long-form narrative -- baseline
findings, each landed optimisation, and the residual hotspots.

## The plan

The render pipeline has three phases, matching what `pagedjs-cli`
historically showed as its three spinners:

1. **Rendering** -- `PagedPolyfill.preview()` does all the per-page
   layout work inside headless Chromium.
2. **Generating** -- `page.pdf()` asks Chromium to serialize the
   laid-out DOM into PDF bytes, after a small `parseOutline` DOM
   walk.
3. **Processing** -- `pdf-lib` loads Chromium's PDF, attaches the
   outline and metadata, and re-serialises.

All three can grow super-linearly. So the harness times all three
separately and produces a phase breakdown.

Two-step investigation, cheapest first:

1. **Per-page timing + phase breakdown** -- the cheap pass. Hook
   paged.js's `beforePageLayout` / `afterPageLayout` for the
   per-page render curve, and wall-clock the generate and process
   phases from Node. If render's per-page cost grows with page index
   that's an `O(n^2)` render; if generate or process dominate, the
   bottleneck is downstream of paged.js.

2. **CPU profile of headless Chromium** -- the deep pass, only if
   step 1 doesn't already point at a culprit. Attach the Chrome
   DevTools Performance panel (or save a CPU profile via the CDP
   `Profiler` domain) and look for the hot function. Typical paged.js
   suspects in render: `Chunker`, `Layout`, cross-reference
   resolution, or a handler that walks the entire document on every
   page. Generate / process bottlenecks usually point at Chromium's
   PDF writer or `pdf-lib`'s outline / save path.

Step 1 is what's wired up here. Step 2 will reuse the same harness --
adding `page.tracing.start()` / `page.tracing.stop()` for a
DevTools-compatible trace is a few lines.

## What's in this folder

| File | Role |
| --- | --- |
| `package.json` | Pins `puppeteer` + `pdf-lib` + `html-entities` (the same direct deps `docs/` uses). |
| `measure.mjs` | Puppeteer harness. Drives the same flow as `docs/render-book.mjs` (loads the vendored paged.js bundle, runs `PagedPolyfill.preview()`, calls `page.pdf()`, then either the pdf-lib roundtrip or the incremental writer), with optional CPU profiling, in-page handler injection, and DOM-accessor instrumentation. |
| `timing-handler.js` | `Paged.Handler` that records per-page wall time + heap into `window.__pagedTiming` and streams a line per page to the console. Always injected. |
| `detach-pages.js` | `Paged.Handler` that hides each completed page from the layout tree (registered against `finalizePage`). The fix. Injected by `--detach-pages` and by `docs/book.bat`. |
| `instrument-flush-ops.js` | Wraps `getComputedStyle`, `getBoundingClientRect`, and the `offsetWidth` / `clientWidth` / `scrollWidth` family with counters + per-call timing. Injected by `--instrument`. |
| `time-hooks.js` | Wraps every task registered to `chunker.hooks.*` and `polisher.hooks.*` with a wall-clock timer. Tells you which handler's hook method is eating render time, per page. Injected by `--time-hooks`. |
| `instrument-clones.js` | Wraps `Layout.prototype.append` to tag every source-walker clone, then walks each finalized page at `finalizePage` counting tagged survivors. Reports total appendCalls vs. survivors and the per-page overshoot distribution -- the share of clones rolled back by `removeOverflow`. Requires a one-line `window.PagedLayout = Layout` patch near the bottom of `docs/lib/paged.browser.js` (it's a private class otherwise). Injected by `--clone-count`. |
| `incremental-pdf.mjs` | Replaces the pdf-lib load+save roundtrip with a PDF 1.7 §7.5.6 incremental update appended to Chrome's bytes. Used by `--incremental`. |
| `test-incremental.mjs` | Smoke test for `incremental-pdf.mjs`: renders a tiny probe page, runs the writer, verifies the result parses (via pdf-lib re-load) and that outline + metadata land correctly. |
| `profile-load.mjs` | Standalone profiler for `PDFDocument.load`. Runs the load on a chosen PDF with a chosen `parseSpeed`; intended to be run under `node --cpu-prof`. |
| `profile-roundtrip.mjs` | Times the full pdf-lib `load + save` roundtrip across the three `parseSpeed` / `objectsPerTick` settings on a chosen PDF. |
| `probe-chrome-outline.mjs` | Renders a synthetic multi-level h1..h6 document via Chrome's `outline: true` and dumps the resulting `/Outlines` tree. Quick check that the CDP flag is wired correctly in the local Chromium / puppeteer combo. |
| `compare-outlines.mjs` | Diffs two PDFs' `/Outlines` trees by `(depth, title, target page)`. Used to verify whether Chrome's native outline matches the injected one. |
| `probe-outline-exclusions.mjs` | Tests which per-element attributes / styles (aria-hidden, role=presentation, hidden, display:none, CSS bookmark-level, ...) make Chrome drop a heading from its outline. |
| `analyze-profile.mjs` | Bottom-up self-time analyzer for `.cpuprofile` files. Same shape as DevTools' Performance bottom-up view, in the terminal. |
| `analyze-trace.mjs` | Bottom-up self-time analyzer for Chrome traces (`trace.json` from `--tracing`). Computes per-event self-time on the renderer's main thread (`CrRendererMain` by default) by walking nested `X`-phase events. Cracks the cpu profile's `(program)` bucket open into named Blink / V8 events (`Layout`, `RecalcStyle`, `RunMicrotasks`, `V8.GC_*`, ...). |
| `find-callers.mjs` | "Who paid for this callee's time?" -- walks a `.cpuprofile` and attributes a target function's total time back to each direct caller. Used throughout the post-mortems to detect gBCR migration between callers. |
| `find-callees.mjs` | The other direction of `find-callers.mjs`: splits a function's self+descendant time across its direct callees. Surfaces the cases where V8 has rolled native DOM work back into the calling JS frame (Range deletion in `removeOverflow`, HTML parser in `wrapContent`). |
| `grep-profile.mjs` | Lists every node in a `.cpuprofile` whose `functionName` matches a regex, with self-time and location. Quick check for "is this frame in the profile at all, and what's it called?" |
| `run.bat` | Windows wrapper. Installs deps on first run, then invokes `node measure.mjs`. |
| `results/` | Output, one timestamped subfolder per run. Git-ignored. |

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
to every build (the "Profiling pdf-lib's load" section explains why);
also, it doesn't forward in-page `console.log` to its own stdout, and
we have no way to call `page.evaluate()` from outside to pull out the
timing data at the end. Driving Puppeteer ourselves gets both.

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
run.bat --tracing                         # capture a Chrome trace of the render phase
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

## Findings (initial run)

A single run on `docs/_site-pdf/book.html` (1638 pages, May 2026,
clean checkout, headless Chromium 122):

| Phase    | Time      | % of total | Notes |
| -------- | --------- | ---------- | ---   |
| render   | 103.8 s   | 50 %       | paged.js layout. Per-page cost grows ~5x start-to-end. |
| generate |  63.6 s   | 31 %       | 99.9% of it is `page.pdf()`. Raw Chrome output: 52 MB. |
| process  |  39.6 s   | 19 %       | 90% of it is `PDFDocument.load`. Final PDF: 17 MB. |
| **total**|**207.0 s**|            |       |

### Render: super-linear, ~5x growth (confirms the suspicion)

Per-page render cost, bucketed by 100 pages:

```
pages    0-  99   avg=  3.4 ms
pages  100- 499   avg=  7-9 ms
pages  500- 799   avg= 12-15 ms
pages  800-1099   avg= 23-25 ms
pages 1100-1599   avg= 27-39 ms
pages 1600-1637   avg= 35 ms
```

The first-quarter / last-quarter ratio is **5.09x** with a
position ratio of 4.0x. That's a clean linear-in-`n` per-page
growth pattern, i.e. **total render time is roughly O(n^2)** with
content variance overlaid. The single biggest outlier is
pages 1100-1199 (37 ms) -- one chapter that's heavier than its
neighbours.

JS heap stays bounded around 10-25 MB throughout. So whatever's
making later pages expensive is **CPU work that scales with `n`,
not retained DOM**. Likely candidates: a `querySelectorAll` over
the whole rendered tree on each page, cross-reference / named-flow
resolution, or a handler walking already-laid-out content. The CPU
profile in step 2 should pin which.

### Generate: opaque Chrome PDF writer, large raw output

`parseOutline` is 30 ms -- irrelevant. The whole 63-second phase
is `page.pdf()`, i.e. Chromium serialising the laid-out DOM into
52 MB of raw PDF bytes. This is the part we have least control
over -- it's Chromium internals.

What stands out is the **52 MB raw size**. After pdf-lib's
`save()` re-emits it, the final file is **17 MB**. A 3x shrink
from a re-serialise alone suggests Chrome isn't compressing
streams aggressively (probably writing `/FlateDecode`-able streams
uncompressed). Worth a follow-up sanity check, but not the
priority.

### Process: pdf-lib roundtrip overhead

```
load        : 35.62 s   parse the 52 MB raw PDF
setOutline  :  0.01 s   write outline tree into the doc
save        :  3.97 s   re-serialise (the 52 -> 17 MB shrink)
```

The actual outline / metadata mutations are basically free. **The
whole 40-second phase is the cost of a load + save roundtrip on
the big raw PDF that Chrome produced**, just so we can attach an
outline that Chrome can't generate itself.

This is a clear optimisation target: drop the pdf-lib roundtrip in
favour of a streaming outline-injection tool (`qpdf`, `pdftk`,
something hand-rolled with `pdf-lib`'s lower-level API) and the
process phase could collapse to seconds. Tractable on its own
without touching paged.js.

### Where to focus

- **Render** is the largest phase **and** the only super-linear
  one. Step 2's CPU profile goes here first.
- **Process** is purely linear-in-PDF-size overhead with a clean
  fix path (skip pdf-lib's full parse). Independent of the
  quadratic story.
- **Generate** is Chrome's PDF writer. Not actionable from our
  side without a Chromium patch; the 52 MB raw size deserves a
  glance, but later.

The user-perceived quadratic behaviour is real and lives in the
render phase. Fixing it would knock 50-80 s off a 200 s build.
Fixing process is independent and could knock off another 30 s.

## Step 2: CPU profile of the render phase

`measure.mjs --cpu-profile` wraps the render phase only (preview()
through the `.pagedjs_pages` selector) in a V8 CPU profile via the
CDP `Profiler` domain, and writes it to `render.cpuprofile` in the
results folder:

```
run.bat --cpu-profile                          # default 1ms sampling
run.bat --cpu-profile --cpu-sampling 5000      # 5ms sampling, smaller file
```

The profile covers only the render phase deliberately -- generate is
opaque Chrome internals and process has a clean non-profiling fix, so
both would dilute the signal.

To view: open Chrome (or Edge) -> DevTools -> **Performance** tab ->
click **Load profile...** (folder icon) and pick the `.cpuprofile`
file. Or drag it onto the panel. The bottom-up view sorted by
self-time pins the hot function fastest.

What to look for, given the heap stayed bounded and per-page cost
scales linearly with `n`:

- A function whose self-time grows roughly with page index. The
  bottom-up view aggregates across the whole phase, so a per-page
  `O(n)` scan shows up as a fat self-time bar.
- DOM-query hot spots: paged.js calling `querySelectorAll`,
  `getElementsByTagName`, or `closest` against the whole rendered
  tree on each new page.
- Cross-reference / named-flow / footnote resolution that re-walks
  prior pages.

A 1 ms sampling interval over a 100 s render produces a profile around
20-50 MB. The render phase itself runs ~5-15% slower while sampling.

If the bottleneck turns out to be in paged.js itself, the next step
is to patch our vendored copy. There is no widely-known maintained
fork with the detach-pages optimisation at time of writing -- the
named "performance forks" of paged.js that turn up in casual
searches mostly don't exist or haven't shipped a fix. Worth checking
the upstream issue tracker at
[pagedjs/pagedjs on GitHub](https://github.com/pagedjs/pagedjs/issues)
(currently the active home; older threads may still live on
[Coko's GitLab](https://gitlab.coko.foundation/pagedjs/pagedjs/-/issues))
before reinventing the fix.

## Findings (CPU profile of render phase)

A profiled run (`--cpu-profile`, 1 ms sampling) over the same
1638-page book:

```
samples: 52314   duration: 95.18 s   us/sample: 1819

   self_ms   self_%   function  @  source
   -------   ------   ----------------------------------------------
  63525.42   66.82%   getBoundingClientRect   (browser native)
  19075.46   20.07%   (program)               (V8/Blink native)
   1941.39    2.04%   findElement             browser.js:638
   1497.43    1.58%   removeOverflow          browser.js:2196
   1106.25    1.16%   (anonymous)             browser.js:29501
   1002.54    1.05%   createBreakToken        browser.js:1796
    580.42    0.61%   findEndToken            browser.js:2094
    527.65    0.56%   create                  browser.js:2257
    442.13    0.47%   afterPageLayout         browser.js:30184
    ... rest sub-0.5% ...
```

**67% of render is `getBoundingClientRect`. Another 20% is V8/Blink
native code -- almost certainly the synchronous layout passes those
`getBoundingClientRect` calls force.** Together 87% of render is the
browser doing layout work driven by paged.js measurement calls.

> **Terminology**: this doc abbreviates `getBoundingClientRect` as
> **gBCR** below. It's the DOM method that returns an element's
> viewport-relative position and size; calling it forces Chromium
> to synchronously flush any pending layout work before answering,
> so "gBCR self-time" in a CPU profile is layout-flush attribution
> charged to the JS frame that asked, not JS computation. The
> same applies to other layout-reading APIs (`offsetTop`,
> `clientHeight`, `getComputedStyle`, etc.) -- they're collectively
> the *layout-flush surface* in the profile.

### Why this is `O(n^2)`

The hot caller is `Chunker.findOverflow` at `browser.js:1934`. Its
loop:

```js
findOverflow(rendered, bounds, gap) {
  if (!this.hasOverflow(rendered, bounds)) return;
  ...
  let walker = walk(rendered.firstChild, rendered);
  while (!done) {
    next = walker.next();
    node = next.value;
    if (node) {
      let pos = getBoundingClientRect(node);   // <-- line 1957
      ...
    }
  }
}
```

Per page, paged.js walks the just-rendered fragment node-by-node
calling `getBoundingClientRect` to find where the content overflows
the page box. `findOverflow` itself only touches the new fragment, so
in isolation it should be `O(page_content)`.

The catch: `getBoundingClientRect` is **synchronous**. If the DOM has
been mutated since the last layout (and paged.js mutates constantly
-- appending pages, splitting nodes, retrying overflow), each call
forces Chromium to flush layout. **The cost of that flush scales
with the live DOM tree**, which is every previously-laid-out page,
all still attached to the document. Page `n`'s overflow walk pays
`O(n)` layout cost. Total cost is `O(n^2)`.

This matches everything else we saw:

- Heap stays bounded (10-25 MB): no JS-level retention, just Blink's
  layout tree growing with page count.
- Per-page render cost grows ~10x from page 0 to page 1638: the
  layout-flush cost grows linearly with `n`.
- Content-driven spikes (the 1100-1199 chapter at 37 ms avg): pages
  with heavier content do more walker iterations, multiplying the
  per-iteration sync-layout cost.

### Fix paths, in order of effort

1. **Detach (or `display: none`) finalised pages.** Once a page's
   layout is committed, take it out of the live document (or hide it
   via `display: none` / `content-visibility: hidden`) so subsequent
   sync layouts don't traverse it. Re-attach all pages at
   `afterRendered` before `page.pdf()` runs. The idea is
   well-understood and the patch is small (it lives in the chunker /
   layout glue); collapses the render to roughly `O(n)`.

2. **Batch the walker.** `findOverflow` reads
   `getBoundingClientRect` on every node and Chromium can't batch
   reads if they're interleaved with DOM writes. Splitting overflow
   detection into a write-then-read-then-write phased pass would
   reduce the number of forced layouts per page, even without
   detaching previous pages. Smaller win than (1) but compatible
   with it.

For our pipeline, fix (1) would knock 60-80 seconds off the
100-second render. Combined with skipping the pdf-lib roundtrip in
Process (the easy win from the previous findings section), the
total drops from ~207 s to roughly 90 s.

## Fix applied: `perf/detach-pages.js`

We went with fix (1) above, **as a paged.js handler rather than a
bundle patch** -- a 20-line `Paged.Handler` subclass that sets
`pageElement.style.display = 'none'` in `afterPageLayout` and
restores them at `afterRendered` before `page.pdf()` runs. The
existing `--additional-script` mechanism is exactly the extension
point this needs, so no fork required.

Wired into production in `docs/book.bat`. Originally:

```bat
npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf ^
    --outline-tags h1,h2,h3,h4 -t 600000 ^
    --additional-script ..\perf\detach-pages.js
```

After the later `pagedjs-cli` removal (see "Dropping pagedjs-cli"
below) the same `--additional-script` flag carries over to
`render-book.mjs`:

```bat
node render-book.mjs _site-pdf\book.html -o _pdf\book.pdf ^
    --outline-tags h1,h2,h3,h4 ^
    --additional-script ..\perf\detach-pages.js
```

And into the perf harness via the `--detach-pages` flag.

### Results

Three-phase numbers, same 1638-page book, measured via the harness:

| Phase    | Baseline | + handler | Δ |
| -------- | -------- | --------- | --- |
| render   | 103.8 s  |  50.9 s   | **-52.9 s (-51%)** |
| generate |  63.6 s  |  60.2 s   | -3.4 s |
| process  |  39.6 s  |  39.7 s   | unchanged |
| **total**| **207.0 s** | **150.7 s** | **-56.3 s (-27%)** |

Render last-quarter / first-quarter ratio: **4.56x -> 1.65x**.
The remaining 1.65x is content variance (chapter 1100-1199 has
dense tables / code blocks). No `n`-driven component remains.

Per-page render curve, bucketed:

```
                  baseline    +handler
pages 0-99      :   3.4 ms      6.1 ms
pages 500-799   : 12-17 ms      5-6 ms       <- now flat
pages 1100-1199 :  36.7 ms     13.4 ms       <- heaviest chapter, ~3x faster
pages 1600-1637 :  37.7 ms     10.7 ms       <- ~3.5x faster
```

CPU profile shift (self-ms):

```
                                            baseline   +handler
getBoundingClientRect      (native)            63525      19459
(program)                  (V8/Blink)          19075       3676
```

`getBoundingClientRect` self-time dropped 3.3x and `(program)`
(V8/Blink-internal layout) dropped 5.2x. Both are still in the top
slots because layout work doesn't go to zero -- but they're now
in line with the *current* page's content, not the entire growing
document.

### Production confirmation

`docs/book.bat` (the real production path) reports:

```
✔ Rendering 1638 pages took 49,547 ms.
✔ Generated
✔ Processed
✔ Saved to docs\_pdf\book.pdf            (10.5 MB)
total elapsed: 185 s
```

The render number is within 3% of the harness measurement, no
errors, PDF written. (The harness's PDF lands at 16.9 MB rather
than 10.5 MB -- that's an artefact of the harness's slightly
different post-processing flow, not the handler.)

### What this didn't fix (independent follow-ups)

The handler closes the quadratic-render hole. Remaining costs are
linear-in-`n` and don't shrink with this change:

1. **Process: 40 s of pdf-lib roundtrip on a 52 MB raw PDF.** Out
   of that, `setOutline` is 11 ms; the other 39+ seconds is
   `PDFDocument.load` + `pdfDoc.save` on the big Chrome output.
   Replacing the load+save with a streaming outline-injection
   tool (`qpdf`, hand-rolled with pdf-lib's lower-level API)
   could cut another ~30 s.
2. **Generate: 60 s in `page.pdf()`.** Chromium internals; mostly
   opaque. The 52 MB raw size hints at uncompressed streams in
   Chrome's writer -- worth a glance but not a quick fix.

## Confirming the mechanism (instrumentation A/B)

The CPU profile said `getBoundingClientRect` self-time dropped
3.3x; the wall-clock measurement said render dropped 2x. To
double-check that's actually due to the smaller layout tree (and
not a profile-attribution coincidence, or paged.js silently
skipping work, or new costs appearing elsewhere) the harness has
an `--instrument` flag that wraps every in-page DOM accessor
that *can* force a synchronous layout -- `getComputedStyle`,
`getBoundingClientRect`, the `offsetWidth` / `offsetHeight` /
`offsetTop` / `offsetLeft` family, and the `clientWidth` /
`clientHeight` / `scrollWidth` / `scrollHeight` getters -- with
counters and per-call timing.

Same wrapper overhead in both runs, so absolute totals are
inflated but the comparison is apples-to-apples.

Two runs, same content, only difference is `--detach-pages`:

| op                      | baseline                  | + detach                  |
| ---                     | ---                       | ---                       |
| `getBoundingClientRect` | 260,668 calls, **208 us** avg | 258,940 calls, **70 us** avg |
| `scrollWidth`           |  37,911 calls,   1.4 us   |  37,047 calls,   1.1 us   |
| `scrollHeight`          |  37,911 calls,   0.7 us   |  37,047 calls,   0.6 us   |
| `getComputedStyle`      |   9,179 calls,   1.7 us   |   9,179 calls,   1.8 us   |
| `offset*` / `client*`   |       **0 calls**         |       **0 calls**         |

Instrumented render wall-clock: 82.1 s baseline -> 47.7 s with
detach. Same shape as the un-instrumented runs.

What the numbers say:

1. **Call counts are essentially identical.** The detach handler
   isn't getting paged.js to skip any work -- 260,668 vs 258,940
   `getBoundingClientRect` calls is a rounding error. The fix
   makes each call cheaper, not the number of calls smaller.

2. **`getBoundingClientRect` per-call cost dropped 66 %**,
   208 us -> 70 us. Smaller live layout tree, less to recompute
   on each forced flush. Total cost on this op alone: 54.3 s ->
   18.2 s, which is most of the wall-clock render savings.

3. **`offsetWidth` / `offsetHeight` / `offsetTop` / `offsetLeft`
   / `clientWidth` / `clientHeight` are called zero times** on
   our content. The auto-width branches inside `finalizePage`'s
   margin-box `forEach` (where those accesses live) never fire
   on the kind of margin content we have (bottom-right page
   number, nothing else).

## Why detach-pages.js hooks `finalizePage`, not `afterPageLayout`

The chunker's per-page hook order is:

```
beforePageLayout  ->  afterPageLayout  ->  finalizePage
```

`AtPage.finalizePage` (built into paged.js) reads `getComputedStyle`
on margin-box children and writes `el.style["grid-template-columns"]`
on them. `time-hooks.js` measurements show this method is **11x
slower per call when run on a `display:none` page**:

| Variant | `chunker.finalizePage::finalizePage` per call |
| --- | --- |
| Baseline (no detach) | 0.82 ms |
| Detach hooked on `afterPageLayout` (hide *before* AtPage) | **9.24 ms** |
| Detach hooked on `finalizePage` (hide *after* AtPage) | 0.67 ms |

Chromium has fast paths for style reads/writes on visible elements;
on hidden subtrees the same operations re-cascade each call. So
hiding the page before AtPage runs makes AtPage pay a slow path
worth ~8 ms/page over the whole render.

`detach-pages.js` therefore hooks `finalizePage`, registering after
AtPage so its method runs second. AtPage works on a visible page;
we hide immediately after. The next chunker iteration sees pages
0..N-1 hidden, so the original `getBoundingClientRect` saving in
the chunker is preserved.

**Wall-clock impact: none measurable.** A 4+4 interleaved A/B
between the two variants showed render medians within ~1 s of
each other (48.70 s vs 49.83 s un-instrumented; 50.78 s vs 50.90 s
with `--time-hooks`), well inside the 3-7 s within-variant noise.
The `finalizePage` hook is the variant we ship because it makes
the CPU profile read honestly (no mystery cost inside AtPage) and
gives AtPage the visible page it expects, not because of a
measurable speedup.

## Fix applied: `perf/incremental-pdf.mjs`

The direct follow-up from the previous section's "What this didn't
fix" list: kill the pdf-lib roundtrip that owned the 40 s process
phase. 99 % of that was `PDFDocument.load` + `pdfDoc.save` on the
52 MB raw PDF -- just so we can attach an outline tree and override a
handful of `/Info` fields.

Approach: a **PDF incremental update** (PDF 1.7 §7.5.6). We never
call `PDFDocument.load`. Instead:

1. Parse only the trailer, xref, Catalog, and Info objects -- using
   `PDFParser` positioned at known byte offsets. Three small dicts,
   ~50 ms.
2. Build outline objects in a fresh `PDFContext`, allocating refs
   starting from the original `/Size`.
3. Mutate the parsed Catalog (add `/Outlines`, `/Lang`) and Info
   (override `/Title`, `/Creator`, dates, ...) **in place**, keeping
   their original refs.
4. Append to the original bytes:
   - The new and updated indirect objects.
   - A new xref section whose subsections cover only those refs.
   - A new trailer dict with `/Prev` pointing at the original xref.
   - `startxref <new-offset>` + `%%EOF`.

Readers chain backward through `/Prev` to resolve any ref we didn't
touch (`/Pages`, `/Dests`, every font / image / content stream). The
original 52 MB stays byte-identical; we just append a few hundred KB.

The writer is built on pdf-lib's low-level primitives -- `PDFParser`
for the few objects we read, `PDFContext` + `PDFDict` for object
construction, `PDFCrossRefSection` + `PDFTrailerDict` for emitting
the new xref / trailer. The expensive `PDFDocument.load` (which
parses every indirect object in the file) is bypassed entirely.

### Results

Same 1638-page book, `--detach-pages` already in effect for both runs:

| Phase    | pdf-lib roundtrip | + incremental | Δ |
| -------- | ----------------- | ------------- | --- |
| render   |  50.9 s   |  49.2 s   | unchanged (noise) |
| generate |  60.2 s   |  60.9 s   | unchanged (noise) |
| process  |  39.7 s   |   0.25 s  | **-39.4 s (-99%)** |
| **total**| **150.7 s** | **110.3 s** | **-40.4 s (-27%)** |

Combined with the detach-pages fix, the build is now **110 s vs
207 s baseline (-47 %)**.

Process-phase breakdown for the incremental path:

```
incremental    : 250 ms total
appended       : ~410 KB (vs 52 MB raw Chrome PDF, untouched)
new objects    : 1776 (outline root + 1773 outline items + Catalog + Info)
```

The output reparses cleanly under both pdf-lib's full
`PDFDocument.load` and poppler's `pdfinfo` (PDF 1.4, 1638 pages,
A4, all metadata intact). Outline navigation works in the viewer.

### The size tradeoff

`pdf-lib`'s `save()` quietly deflate-compresses content streams as a
side effect of full re-emission. That's why the old output was 17 MB
even though Chrome's raw PDF is 52 MB. The incremental writer keeps
Chrome's bytes verbatim, so the final file is essentially "52 MB +
outline":

| Output mode       | Final PDF size |
| ---               | --- |
| pdf-lib roundtrip | 16.9 MB |
| incremental       | 52.7 MB |

This is the same uncompressed-streams problem the initial findings
section flagged ("Chrome isn't compressing streams aggressively").
Two ways to claw the size back without going back to a full parse,
both independent follow-ups:

1. **qpdf post-pass** -- `qpdf --object-streams=generate
   --compress-streams=y in.pdf out.pdf` re-emits the file with deflate
   on every stream, without reifying document semantics. C++,
   skips object-by-object reconstruction; should be much faster than
   pdf-lib's load. Adds a binary dependency.
2. **Deflate inside the writer** -- detect raw streams without
   `/Filter` in the parsed objects and rewrite them with
   `/Filter /FlateDecode` + a pako-deflated body. Same engineering
   shape as qpdf but in JS, and lets the incremental update stay
   self-contained. Requires walking the full body of the original
   PDF, which puts back some of the cost we just removed.

The incremental writer ships as-is; pick a size strategy when /
if file size becomes a concern.

### Production integration

`measure.mjs --incremental` exercises the writer for measurement.
`docs/book.bat` doesn't ship it: production goes through the pdf-lib
roundtrip path (with `parseSpeed: Fastest`, now ~5 s and gives the
17 MB compressed output). Switching production to the incremental
writer is a one-line change in `docs/render-book.mjs` (call
`applyOutlineAndMetadataIncremental` from `../perf/incremental-pdf.mjs`
instead of `PDFDocument.load + ... + save`), gated behind whether the
larger output is acceptable for that pipeline.

## Profiling pdf-lib's load: 79 % was idle yielding

The "Fix applied: detach-pages" section above showed the pdf-lib
roundtrip at 39.7 s for the process phase. After profiling, **most
of that wasn't pdf-lib doing work -- it was pdf-lib yielding to the
event loop**.

`PDFDocument.load` defaults to `parseSpeed: ParseSpeeds.Slow = 100`
objects per tick, with an `await waitForTick()` between batches.
`pdfDoc.save` does the same with `objectsPerTick: 50`. For our
~50k-object PDF that's ~500 yields during load, ~1000 during save,
each costing ~5-10 ms of pure idle on a quiet system.

A CPU profile of `PDFDocument.load` running standalone on the 52 MB
Chrome output (`node --cpu-prof`, fresh process, no concurrent work):

```
samples: 3441   duration: 6.09s   us/sample: 1770

   self_ms   self_%   function  @  source
   -------   ------   ----------------------------------------------
   4766.25   78.92%   (idle)                  (V8 idle wait)
    251.41    4.16%   PDFRef.of               PDFRef.js:34
    196.53    3.25%   (garbage collector)
    116.85    1.93%   (program)
     63.74    1.06%   PDFObjectParser.parseString
     46.03    0.76%   BaseParser.parseRawInt
     38.95    0.64%   BaseParser.parseRawNumber
     35.41    0.59%   PDFObjectParser.parseNumberOrRef
```

On a 6 s load, **4.77 s is V8 sitting on its hands** between
scheduled batches. Actual parsing self-time is well under a second;
the rest is GC and V8 internals.

Why such a cautious default? pdf-lib targets the browser too, where
locking the main thread for 30+ s to parse a big PDF would freeze the
page. In Node, with the harness having no other work to do, yielding
is pure overhead.

### Wins from `parseSpeed: Fastest` (objects/tick = Infinity)

Three-variant roundtrip on the same 52 MB PDF, fresh process each
time (`profile-roundtrip.mjs`):

| parseSpeed / objectsPerTick | load   | save  | total   |
| ---                         | ---    | ---   | ---     |
| **Slow / 50 (default)**     | 36.7 s | 3.8 s | 40.5 s  |
| Fast / 1500                 | 3.0 s  | 2.6 s | 5.6 s   |
| **Fastest / Infinity**      | **2.0 s** | **2.7 s** | **4.7 s** |

`save` is barely affected by `objectsPerTick` -- its CPU work
dominates the yield overhead -- but `load` collapses by **18x**.

### Wired into the harness

`measure.mjs`'s default pdf-lib roundtrip path now passes
`parseSpeed: ParseSpeeds.Fastest` and `objectsPerTick: Infinity`.
End-to-end on the book (`--detach-pages`, default = pdf-lib path,
no `--incremental`):

| Phase    | Old pdf-lib defaults | Fast knobs | Δ |
| -------- | -------------------- | ---------- | --- |
| render   |  50.9 s   |  45.7 s   | noise |
| generate |  60.2 s   |  52.4 s   | noise (Chrome variance) |
| process  |  39.7 s   |   7.8 s   | **-31.9 s (-80 %)** |
| **total**| **150.7 s** | **105.9 s** | **-44.8 s (-30 %)** |

Result: the pdf-lib roundtrip is now **competitive with the
incremental writer** (105.9 s vs 110.3 s total) **while still
producing a 17 MB output** (vs 53 MB for incremental, because
`save()` flate-compresses content streams as it re-emits them).

### What this reinterprets

The "Fix applied: detach-pages" table is still accurate, but its
39.7 s process column reflects pdf-lib's default tick-yielding, not
its actual work. A reader benchmarking pdf-lib on its merits should
compare against the **7.8 s** number, not 40 s.

The incremental writer (above) still produces the fastest process
phase by far (0.25 s) and remains useful when sub-second matters
more than file size. But for the common case the single-line
`parseSpeed: Fastest` tweak is the immediate win.

## Chromium `Page.printToPDF` knob survey

While we were here, we audited which Chromium / CDP options affect
PDF output. Partly to confirm "is there something Chrome could
compress for us?" (no), partly because one option turned out to be
a real win: `outline: true`.

Verified against `devtools-protocol@0.0.1312386` and
`puppeteer-core@22.15.0` (both shipped under `perf/node_modules`).

### `outline: true` -- Chrome can emit /Outlines itself

CDP's `Page.printToPDF` accepts `generateDocumentOutline: true` since
Chrome M122 (Feb 2024). Puppeteer exposes it as `outline: true` since
v22.x. Behaviour:

- Chrome walks the rendered DOM's `<h1>..<h6>` once and emits a
  /Outlines tree with **page+coords destinations** (`[N 0 R /XYZ x y z]`)
  instead of named destinations.
- Implies `tagged: true` (the outline is built from the accessibility
  tree). Puppeteer enforces this in `util.ts:395`.
- Requires the launch flag `--generate-pdf-document-outline`.
  Puppeteer 22+ adds it automatically in `ChromeLauncher.defaultArgs()`,
  so both `measure.mjs` and `docs/render-book.mjs` get it for free.
- **No tag-level filter**: walks `h1..h6` unconditionally. There is
  no equivalent of our `--outline-tags h1,h2,h3,h4` knob.

Measured cost on the 1638-page book with `--chrome-outline --detach-pages`:

| Phase    | injected outline | Chrome outline | Δ |
| -------- | ---------------- | -------------- | --- |
| generate |  52.4 s   |  53.8 s   | +1.4 s (Chrome walking the headings) |
| process  |   7.8 s   |   5.3 s   | -2.5 s (no outline objects to save) |
| **total**| **105.9 s** | **107.8 s** | +1.9 s |

Total is roughly a wash -- one cost shifts to another. The real
benefit is **fewer moving parts**: no `parseOutline`, no
`setOutline`, no incremental-writer outline objects, just metadata.

### Does Chrome's outline match the injected one?

We diffed the two outputs on the 1638-page book (`compare-outlines.mjs`):
`results/pdf-lib-fastest/book.pdf` (injected, 1773 entries from
`--outline-tags h1..h4`) versus `results/chrome-outline-on/book.pdf`
(Chrome's, 6023 entries total).

Naïvely filtering Chrome's tree to "depth ≤ 3" to approximate our
h1..h4 view gives 1820 entries -- close to 1773 in count, but **not
equivalent** structurally. Two reasons:

1. **Chrome walks all h1..h6 unconditionally.** First concrete
   divergence is at the "Alias Types" section: the source
   ([book.html:302](docs/_site-pdf/book.html:302)) has
   `<h5 id="ch-Features-Language-Alias-Types-example">Example</h5>`
   immediately after the h3 "Alias Types". Our `--outline-tags`
   filter correctly drops it; Chrome includes it. Every such
   insertion shifts the rest of the pre-order walk.
2. **Chrome's tree depth ≠ HTML heading level.** Chrome collapses
   skipped levels: an `<h5>` directly under an `<h3>` becomes
   depth+1 (not depth+2). So "filter to depth ≤ 3" does *not*
   extract "h1..h4 only" -- it extracts the first four levels of
   *nesting*, which can be any mix of h1..h6 depending on context.

Numerical summary:

| metric                                  | value |
| ---                                     | --- |
| injected entries                        | 1773 |
| Chrome entries (h1..h6, all depths)     | 6023 |
| Chrome entries filtered to depth ≤ 3    | 1820 |
| pre-order matches (vs injected)         | 27 / 1820 |
| same title+depth, different page        | 10 |

The 10 "page-only mismatches" are the smoking gun for structural
drift: same heading title in both outlines but pointing at different
sections of the book. The deltas grow as the walk progresses --
e.g. "Properties" at A=p956 vs B=p883 (Δ = -73 pages), and similar
near the end of the book. By that point Chrome and our outline are
literally talking about different headings that happen to share a
name (every class in the reference docs has its own "Properties"
sub-heading).

### Selectively excluding headings from Chrome's outline

Chrome's outline is built from the accessibility tree (puppeteer
enforces `tagged: true` alongside `outline: true` for this reason).
Anything that hides a heading from a11y excludes it from the outline.
Tested matrix (`probe-outline-exclusions.mjs`):

**Excluded** -- the heading is dropped from `/Outlines`:

| attribute on the heading or an ancestor | clean? | notes |
| --- | --- | --- |
| `role="presentation"`     | yes | Removes heading semantic only. Visual rendering, DOM, anchor `#id` targets all unchanged. **The cleanest knob.** |
| `role="none"`             | yes | Alias of `presentation`. |
| `role="generic"`          | yes | Any non-heading role works. |
| `aria-hidden="true"`      | -   | Excludes the whole subtree from a11y. Heavier -- also affects screen readers. |
| `hidden` attribute        | no  | Also visually hides. |
| `display: none`           | no  | Same. |
| `visibility: hidden`      | no  | Same. |

**No effect** -- Chrome ignores these:

| attribute            | why |
| ---                  | --- |
| `bookmark-level: none` (CSS GCPM) | Chrome doesn't implement GCPM. |

**Reverse direction.** `<div role="heading" aria-level="3">Foo</div>`
*adds* an h3-level entry to Chrome's outline despite not being an
HTML heading. Useful if you ever want an outline entry that doesn't
look like a heading on screen.

**Implication for our pipeline.** The "Chrome's outline is too
noisy" objection above isn't actually structural -- it's one CSS
selector away from being fixed. A preprocessor step that adds
`role="presentation"` to every `<h5>` and `<h6>` in the Jekyll
build would let Chrome's `outline: true` produce the same h1..h4
view we want today. We haven't done that step yet, so we still
ship the injected outline -- but the path from "Chrome's outline
works for measurement only" to "Chrome's outline ships in
production" is now ~5 lines of Jekyll plugin code, not a
fundamental redesign.

### Did pagedjs-cli ever try Chrome's outline?

No. Searched (`gh api search/issues`, `gh api search/code`, and
web search):

- `repo:pagedjs/pagedjs-cli outline` -- 2 hits, both unrelated
  (TOC page-number bug, rowspan/colspan).
- `org:pagedjs chromium outline` -- 1 hit (the same TOC bug).
- `"pagedjs printToPDF outline"` -- 0 hits.
- `generateDocumentOutline org:pagedjs` (code search) -- 0 hits.
- `"--generate-pdf-document-outline" org:pagedjs` -- 0 hits.

Timing: Chrome's `generateDocumentOutline` shipped M122 (Feb 2024);
[pagedjs-cli](https://github.com/pagedjs/pagedjs-cli)'s last
meaningful change is May 2024 (Docker hyphenation). The project
is in near-maintenance mode (21 stars). The feature post-dates
active development, and the unfilterable-outline regression
(without the `role="presentation"` workaround above) would have
been a real concern for existing `--outline-tags` users -- so
even a casual look would probably have ended in "we'll keep
injecting for now". Nobody appears to have looked.

### What's not exposed in CDP (we checked)

- **No stream-compression flag.** Chromium uses Skia's `SkPDF`,
  which writes content streams uncompressed. There's a C++-only
  `SkPDF::Metadata::fPDFA` setting; no CDP plumbing for it. This is
  *why* `save()` re-emission shrinks 52 MB → 17 MB.
- **No object-streams flag, no font subsetting / image downsampling
  knobs, no PDF/A mode.** Skia subsets fonts automatically per face.
- **No parallelism knob.** Generate's 60 s in `page.pdf()` is
  single-threaded Skia walking the layout tree.

### What might still be worth trying

- **`tagged: false`** -- drops the StructTreeRoot, saving ~10-20 %
  of generate time and file size. Loses accessibility *and* the
  Chrome outline (tagging is a prerequisite). Probably a no for
  our use; documenting for completeness.
- **`pageRanges` sharding** -- run `page.pdf()` N times with
  disjoint ranges on parallel browser pages. Each shard serialises
  only its slice and they run concurrently. Biggest unused lever
  for the 60 s generate phase, but requires a PDF concatenation
  post-pass (pdf-lib can do it).
- **`transferMode: 'ReturnAsStream'`** -- puppeteer already
  hard-codes it. Without it Chrome buffers + base64-encodes the
  whole PDF into one JSON message; very slow and memory-heavy.

## Where this leaves us

The full menu of fixes, all measured against the original 207 s
baseline:

| Configuration                          | render | generate | process | total | size |
| ---                                    | ---    | ---      | ---     | ---   | ---  |
| original                               | 103.8s | 63.6s    | 39.6s   | 207.0s | 17 MB |
| + detach-pages                         |  50.9s | 60.2s    | 39.7s   | 150.7s | 17 MB |
| + detach + **parseSpeed:Fastest**      |  45.7s | 52.4s    |  7.8s   | **105.9s** | **17 MB** |
| + detach + incremental writer          |  49.2s | 60.9s    |  0.25s  | 110.3s | 53 MB |
| + detach + Chrome outline              |  48.7s | 53.8s    |  5.3s   | 107.8s | 17 MB |

**Practical winner: `+ detach + parseSpeed:Fastest`.** Half the
original wall time, same output size, one-line change. Ship this
first regardless of what else gets layered on top.

The incremental writer is still the fastest process phase (0.25 s)
and remains the right answer if file size doesn't matter and
sub-second process does.

Chrome's outline is the simplest *architecture* (no parseOutline,
no setOutline, no incremental outline objects -- just metadata),
and the "unfilterable h1..h6" objection turns out to be a
preprocessor change away from being solved: tag every `<h5>` /
`<h6>` in the Jekyll build with `role="presentation"` and Chrome's
outline collapses to the same h1..h4 view we want today. With that
change, the totals look like:

| Configuration                                     | render | generate | process | total | size |
| ---                                               | ---    | ---      | ---     | ---   | ---  |
| + detach + parseSpeed:Fastest *(today)*           |  45.7s | 52.4s    |  7.8s   | 105.9s | 17 MB |
| + detach + parseSpeed:Fastest + Chrome outline    |  48.7s | 53.8s    |  5.3s   | 107.8s | 17 MB |
| *(latter, with role="presentation" on h5/h6 -- pending)* | | | | | |

The compound win isn't in wall time -- it's in deleting code:
`parseOutline`, `setOutline`, and the entire outline branch of the
incremental writer all go away. Worth it if/when someone wants to
trim the surface area.

## Dropping `pagedjs-cli`

`pagedjs-cli` did three useful things for us and one harmful one. On
the useful side: it shipped the paged.js browser bundle in
`dist/browser.js`, the outline + metadata helpers in
`src/outline.js` and `src/postprocesser.js` (~250 LOC total), and a
CLI wrapper for the pdf pipeline. On the harmful side, the wrapper
calls `PDFDocument.load(pdf)` and `pdfDoc.save()` with no options
and therefore inherits the slow defaults that wasted ~32 s per build
(see "Profiling pdf-lib's load" above). Patching upstream to fix
that is plumbing for plumbing's sake; the rest of pagedjs-cli is
already mostly duplicated by our harness.

So we vendored what we needed and dropped the dep:

- `docs/lib/paged.browser.js` -- `pagedjs-cli@0.4.3/dist/browser.js`,
  byte-for-byte. MIT-licensed; license header preserved at top of file.
- `docs/lib/outline.mjs`  -- `src/outline.js`, ESM-ified, attribution
  in the file header.
- `docs/lib/postprocesser.mjs` -- `src/postprocesser.js`, same.
- `docs/render-book.mjs` -- the production driver. Argv-compatible
  with the subset of `pagedjs-cli` flags `book.bat` actually used
  (`-o`, `--outline-tags`, `-t`, `--additional-script`). Calls
  pdf-lib with `parseSpeed: Fastest` + `objectsPerTick: Infinity`
  inline, no patching required.
- `docs/book.bat` -- swapped `npx pagedjs-cli ...` for
  `node render-book.mjs ...`. Same CLI, ~32 s faster (pdf-lib idle
  yielding gone), one fewer transitive dependency tree.

Both `docs/package.json` and `perf/package.json` now depend directly
on `puppeteer` + `pdf-lib` + `html-entities` instead of inheriting
them via `pagedjs-cli`. `perf/measure.mjs` imports from `docs/lib/`
so the harness and production share the exact same code path through
the helpers and bundle -- whatever production renders, the harness
measures.

End-to-end on the 1638-page book through the new driver:

```
render:   53.5s  (1638 pages)
generate: 68.8s  (raw 52.3 MB)
process:  5.1s
saved:    docs\_pdf\book.pdf  (16.9 MB)
total:    130.4s
```

(The total includes puppeteer launch + page nav overhead the
harness elides, so it reads a few seconds higher than the harness's
105 s headline.)

## Restoring live progress

Dropping `pagedjs-cli` (above) quietly dropped its ora spinners
along with the rest of the CLI. The terminal goes silent for the
~50 s render and ~60 s generate phases -- on a 130 s build, most
of the wall time looks like the process is hung.

Render phase: restored via `docs/lib/progress-handler.js`, a small
`Paged.Handler` subclass that emits a `[render-progress] page=N
elapsed=Ns` line from `afterPageLayout`. `render-book.mjs` listens
on `page.on('console')` and re-renders the line as a
`\r`-overwritten TTY status (`rendering: 234 pages (12.4s)`), or
every 100 pages on its own line when stdout is piped (CI / log
files). The live line is cleared just before the final
`render: 53.5s (1638 pages)` summary is printed.

The handler is a separate in-page script rather than inlined into
`render-book.mjs` because `addScriptTag({ path })` loads it via
file:// into the headless page -- it has to be a real file. It's
structurally parallel to `perf/timing-handler.js`, which uses the
same hook but additionally retains per-page detail on
`window.__pagedTiming` for offline analysis. The production version
stays minimal -- just the log line.

Generate phase: a 500 ms wall-clock heartbeat in `render-book.mjs`
writes `generating: 23.4s` to a `\r`-overwritten TTY line during
the `page.pdf()` wait. Elapsed time only; no byte- or page-count
signal. The line is cleared before the final
`generate: 68.8s (raw 52.3 MB)` summary, same shape as the render
phase.

We initially tried byte-level progress -- drive `page.pdf()` at the
CDP level with `transferMode: 'ReturnAsStream'` + chunked `IO.read`.
On the Chromium we ship with, the bytes don't actually stream:
Chrome's SkPDF writer buffers the whole document internally and
emits all 52 MB in one tick at the end. The wrapper showed `0.0 MB`
for ~50 s then flickered `52 MB` for one frame before the summary
-- the heartbeat was doing all the visible work. Dropped the CDP
code; the buffer-then-dump finding is preserved in a comment above
the heartbeat so the next person doesn't re-investigate.

The process phase stays silent. At ~5 s with the fast pdf-lib knobs
(`parseSpeed: Fastest`) it's not worth a progress signal of its own.

## Revisiting `AtPage.finalizePage`

The post-detach CPU profile in the "Fix applied: `perf/detach-pages.js`"
section above showed an `(anonymous) @ browser.js:29501` row at **13.7 s
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
single native call.** [paged.browser.js:2136](docs/lib/paged.browser.js:2136)
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
[paged.browser.js:1934](docs/lib/paged.browser.js:1934):

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
[paged.browser.js:1969, 1974, 1992](docs/lib/paged.browser.js:1969):
up to four `getComputedStyle` calls per node visited (on the node,
its TD ancestor, and the parent TBODY/THEAD). The walker revisits
the same ancestors across many child nodes; a `WeakMap<Element,
CSSStyleDeclaration>` populated lazily per page would dedupe.

This one *is* deduplication-shaped, but it's the cheapest of the
three to land (no algorithmic change, no fidelity risk) and a clean
follow-up if #1 lands.

### Probable bug worth surfacing separately

[paged.browser.js:1998](docs/lib/paged.browser.js:1998):

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
Chrome-outline experiment above shows generate isn't moved by
shifting outline work around (Chrome walking `h1..h6` itself costs
about what `parseOutline` + `setOutline` save -- net was +1.9 s).
The one generate-side lever we haven't tried is **`pageRanges`
sharding** -- run `page.pdf()` N times with disjoint page ranges on
parallel browser pages and concatenate with pdf-lib. Each shard
serialises only its slice and they run concurrently, so generate
collapses to roughly `60 s / N` plus a small concat pass. Listed
under "What might still be worth trying" above; it's the biggest
untried knob in the pipeline.

## What happened when we tried item 1

The strategic note above was wrong about item 1 -- the binary-search
replacement for `textBreak` saves nothing, and the reason it saves
nothing reveals the actual structure of the remaining render cost.

### Attempt A: binary-search `textBreak`

Replaced the per-word-then-per-letter gBCR cascade in
[`Layout.textBreak`](docs/lib/paged.browser.js:2136) with a binary
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

[`Page.create`](docs/lib/paged.browser.js:2257) does one
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
[`Layout`'s constructor](docs/lib/paged.browser.js:1443):

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
  [`.pagedjs_pages`](docs/lib/paged.browser.js:27213)
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
2. Compare bottom-up self-time tables ([`analyze-profile.mjs`](perf/analyze-profile.mjs))
   and caller breakdowns ([`find-callers.mjs`](perf/find-callers.mjs);
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
([paged.browser.js:27198](docs/lib/paged.browser.js:27198)) and
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

Re-reading the README on `--detach-pages`: the claim has always
been that `display: none` "removes a subtree from the layout tree
entirely". That's true for *layout* -- but Chromium's per-page
work also includes **style/selector resolution and rule matching**,
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

Probe modification (in [perf/detach-pages.js](perf/detach-pages.js)),
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

1. **[perf/detach-pages.js](perf/detach-pages.js)** -- rewrite
   from `display:none` to physical `removeChild`. Keep the most
   recent finalized page in the DOM (the chunker passes
   `lastPage.element` to `Page.create` for ordered insertion);
   detach one page behind. At `afterRendered`, detach the keeper
   and re-append all in finalize order (which is document order).

2. **[docs/lib/paged.browser.js](docs/lib/paged.browser.js) -- Counters handler.**
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

3. **[docs/assets/css/print.css](docs/assets/css/print.css) +
   [_site-pdf copy](docs/_site-pdf/assets/css/print.css)** --
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
[`findEndToken`](docs/lib/paged.browser.js:2100) reads
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
[`createBreakToken`](docs/lib/paged.browser.js:1796),
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
[`Page.checkUnderflowAfterResize`](docs/lib/paged.browser.js:2503),
which fires from a `ResizeObserver` whenever the page wrapper
*shrinks*. That happens on every overflow extraction during
normal render. The handler computes an `endToken` and hands it to
`this._onUnderflow(endToken)`. The only live registration of
`onUnderflow` in the bundle was an empty callback in
[`Chunker.addPage`](docs/lib/paged.browser.js:3251) with
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
[`Footnotes.afterPageLayout`](docs/lib/paged.browser.js:31477) at
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

[`Layout.renderTo`](docs/lib/paged.browser.js:1478) calls
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
> (see "findRef wasn't taking the fast path" below) found 39 % of
> findRef calls falling through to `doc.querySelector("[data-ref='X']")`
> because the per-page index wasn't populated for rebuilt ancestors
> and the source tree never had one at all. Fixing both saves ~2.4 s
> of render.

## Rebaselining after the puppeteer 22 -> 25 bump

`docs/package.json` was bumped from `puppeteer ^22.x` to `^25.0.4`,
which pulled in a newer bundled Chromium. Same harness, same book
(now 1651 pages after a small content addition vs the 1638 the
prior baseline measured), `--detach-pages --cpu-profile`:

| Phase    | Prior (puppeteer 22, post-Attempt-E) | New (puppeteer 25) | Δ |
| -------- | ------------------------------------ | ------------------ | --- |
| render   | ~19 s   | 22.0 s | flat (run-to-run noise) |
| generate | ~60-70 s | **42.7 s** | **-20 to -28 s** |
| process  | ~5 s    | 4.9 s | flat |
| **total**| ~95-100 s | **69.6 s** | **-25 to -35 s** |
| raw Chrome PDF size | 52 MB | **39.3 MB** | -12 MB |
| render ratio (last/first quarter) | 1.60x | 1.36x | flatter |

The whole wall-clock win is in `generate`. Chrome's PDF writer got
meaningfully faster, and is now emitting something more compact --
a 25 % drop in the raw byte stream that previously needed pdf-lib's
re-emit pass to shrink. The "Chromium `Page.printToPDF` knob survey"
above noted Skia wrote streams uncompressed; whatever changed at
the SkPDF level closes part of that gap automatically. The
final PDF after pdf-lib's `save()` is still ~17 MB either way --
the re-emit's deflate step was already doing most of the work.

Render itself is unchanged in shape. The same hot paths
(`hasOverflow`, `Footnotes.afterPageLayout`, `Page.create`,
`findRef`) sit at roughly the same self-times. Nothing that was
cheap got expensive; nothing that was expensive got cheap.

Notable side-effect: with `generate` no longer dominating, the
strategic note at the end of "Where this leaves the picture" above
("`pageRanges` sharding of `generate` is the only remaining knob
with a profile target large enough to move the wall-clock total
meaningfully") is now less true. The shard target shrunk from
~60 s to ~43 s, so the upper bound on what sharding can save
shrunk with it. Still the biggest untried knob, but the urgency
is lower.

The re-baselined bottom-up render profile also surfaced something
that *was* always there but had been mis-attributed: see the next
section.

## findRef wasn't taking the fast path

The new-baseline cpu profile's top entries:

```
   self_ms   self_%   function  @  source
   5872.93   26.84%   (program)             (V8/Blink internal)
   4831.83   22.08%   getBoundingClientRect (native)
   2530.25   11.56%   findRef               paged.browser.js:643
   2426.14   11.09%   removeChild           (native, called by detach-pages)
   1007.64    4.60%   (idle)
    565.17    2.58%   removeOverflow
```

`findRef` at **11.6 % of render self-time** is the second-largest
non-native bucket after gBCR. The prior README state's "JS-body
profile after Attempt E" reported `findElement self 1373 ms (7.1 %)`
and concluded `findElement` was already fast. Both numbers refer
to the same call chain -- V8 just attributes time differently
between the two-line forwarder and its called helper:

```js
function findElement(node, doc, forceQuery) {
    const ref = node.getAttribute("data-ref");
    return findRef(ref, doc, forceQuery);
}

function findRef(ref, doc, forceQuery) {
    if (!forceQuery && doc.indexOfRefs && doc.indexOfRefs[ref]) {
        return doc.indexOfRefs[ref];                              // fast
    } else {
        return doc.querySelector(`[data-ref='${ref}']`);          // slow
    }
}
```

The "post-Attempt-E" profile's `findElement` charge was its
forwarder cost; the actual body work has always been inside
`findRef`. The new V8 profile splits the attribution honestly,
with `findElement` reading `self=0.00 ms` and `findRef` carrying
the 2.5 s.

### Instrumenting per-branch call counts

Wrapped `findRef` with counters keyed by which branch it took:
fast-path (dict hit), `forceQuery` (caller explicitly asked for
querySelector), `noDict` (the doc didn't have `indexOfRefs` at all),
and `dictMiss` (the doc had a dict but no entry for the ref). The
caller of each branch was captured from `new Error().stack`.

A single instrumented run on the 1651-page book:

```
findRef.calls         = 47,867
findRef.fastPath      = 29,300   (8.4 ms total, 0.29 us/call)
findRef.fallback total = 18,567  (2585.5 ms total)
  forceQuery          =      2
  noDict              =  2,739
  dictMiss            = 15,826
  fallbackReturnedNull =    892

byCallerLine (top, all attributed to docs/lib/paged.browser.js):
   15,767  dictMiss   <- Layout.append, `findElement(node.parentNode, dest)`
      955  noDict     <- Layout.append, same call
      892  noDict     <- Layout.append, `findElement(node.parentNode, fragment)`
      848  noDict     <- Layout.createBreakToken, `findElement(*, source)`
       58  dictMiss   <- Layout.createBreakToken (an `*, rendered` site)
       42  noDict     <- Layout.createBreakToken, another `*, source` site
        2  forceQuery <- Layout.rebuildTableFromBreakToken
```

The fast path is essentially free (0.29 us/call -- a hashed object
lookup). **The entire 2.5 s lives in the 18,567 fallback calls**.
Two structural reasons:

### Root cause 1: rebuilt ancestors aren't indexed in `dest`

`Layout.append(node, dest, ...)` writes each leaf clone into
`dest.indexOfRefs` near the end of the function. But when the
leaf's parent isn't already in `dest`, `append` calls
`rebuildAncestors(node)` to clone the source ancestor chain into
a fresh `DocumentFragment` and appends the fragment to `dest`:

```js
let fragment = rebuildAncestors(node);
parent = findElement(node.parentNode, fragment);
// ... attach clone ...
dest.appendChild(fragment);   // <-- ancestors now live in dest's DOM
                              //     but dest.indexOfRefs wasn't updated
```

The rebuilt ancestors are now in `dest`'s DOM tree, findable by
`dest.querySelector("[data-ref='X']")`. They are **not** in
`dest.indexOfRefs`. Every subsequent `append` whose `node`
descends from one of those rebuilt ancestors hits dictMiss on
that ancestor and falls through to `dest.querySelector`. With
~15.7 k such calls per book at ~140 us each -- a small per-page
wrapper, so querySelector is fast even when it walks -- that's
about 2.2 s.

The 892 `noDict <- Layout.append, findElement(*, fragment)` calls
in the byCallerLine table are a related symptom: the second
`findElement` call inside the rebuild branch -- which looks the
parent up in the *fragment* before it gets appended to `dest` --
hits a fragment whose `indexOfRefs` was never created.

### Root cause 2: the source tree never has an index

Six call sites in `Layout.createBreakToken` use
`findElement(*, source)` to map a rendered node back to its
position in the original document. `source` is the
`ContentParser`-wrapped result of the initial document walk in
`ContentParser.addRefs` -- which walks every element, assigns a
`data-ref`, and **stops**. No `indexOfRefs` is ever populated.
Every `findElement(*, source)` therefore falls through to
`source.querySelector("[data-ref='X']")` against the whole
~10 k-element source tree.

There are only ~890 such calls per render (they only fire on
pages where the break landed mid-element), but at ~1.3 ms each
that's ~1.2 s.

### The fix

Three small patches in `docs/lib/paged.browser.js`, all marked
`// [PATCH: findRef fast-path]`:

1. **`rebuildAncestors`** -- initialise `fragment.indexOfRefs = {}`
   at the top, and write each rebuilt clone into it as the loop
   builds the chain. The second `findElement(*, fragment)` call in
   `Layout.append`'s rebuild branch then hits the fast path.

2. **`Layout.append`'s rebuild branch** -- after
   `dest.appendChild(fragment)`, merge `fragment.indexOfRefs` into
   `dest.indexOfRefs`. Subsequent `findElement(*, dest)` calls on
   any rebuilt ancestor now hit the fast path too.

3. **`ContentParser.addRefs`** -- initialise `content.indexOfRefs = {}`
   on entry and write `content.indexOfRefs[ref] = node` inside the
   tree-walk loop. Every `findElement(*, source)` call site now hits
   the fast path.

### Results

Instrumented A/B (call counts pre/post on the same 1651-page book):

| metric | pre-fix | post-fix | Δ |
| ------ | ------- | -------- | --- |
| findRef calls (total) | 47,867 | 47,867 | (same; this is a per-call cost change, not a count change) |
| fast path | 29,300 | **46,914** | **+17,614** |
| fallback total calls | 18,567 | **953** | **-17,614 (-95 %)** |
| dictMiss | 15,826 | 59 | -15,767 |
| noDict (`findElement(*, fragment)` in rebuild branch) | 892 | 0 | -892 |
| noDict (createBreakToken vs source) | 848 + 42 | 0 + 0 | -890 |
| fallback total time | 2,585 ms | **6.9 ms** | **-2,578 ms** |
| fallbackReturnedNull | 892 | 892 | unchanged (these are the genuine "no such ref" misses) |

The 892 residual fallbacks are all `findElement(node.parentNode, dest)`
on a *fresh* per-page `dest` whose dict was just created and only
contains its own leaf clones, so the parent lookup correctly returns
null (the parent's first appearance on this page will be in the
next call's rebuilt fragment). 7 ms total; not worth a third patch.

Wall-clock A/B, paired runs, no instrumentation, no cpu-profile
(stash the fix, run twice; pop, run twice):

| run | BEFORE render | AFTER render |
| --- | --- | --- |
| 1 | 20.73 s | 18.17 s |
| 2 | 20.54 s | 18.22 s |
| **avg** | **20.64 s** | **18.20 s** |

**Δ = -2.44 s render (-12 %).**

Profile diff (`--detach-pages --cpu-profile`, single run each --
between-run noise on cpu-profile self-time is in the 50-150 ms band
for sub-1 % rows):

| function | PRE | POST | Δ |
| --- | --- | --- | --- |
| `findRef`   | 2530 ms (11.56 %) | undetectable (<130 ms) | **-2400 ms** |
| `findElement` self | 0 ms (forwarder) | 0 ms | unchanged |
| `addRefs`  | not in top 20 | **157 ms (0.80 %)** | +157 ms (new dict-population cost) |
| `removeChild` (detach handler) | 2426 ms | 2320 ms | -106 ms (noise) |
| `getBoundingClientRect` | 4832 ms | 4632 ms | -200 ms (noise) |
| total render | 22.0 s | 19.8 s | -2.2 s |

PDF byte size is 16-47 bytes apart between any two runs (well inside
the standard `/CreationDate` / `/ModDate` timestamp drift); content
is functionally byte-identical.

Shipped.

### Was it the headers/footers change?

A reasonable initial hypothesis was that the recent
"Get the details of page headers/footers out of paged.js"
(`c70b83d`) or its precursor "Add the part name as a prefix to
the page number" (`71aea3d`) had introduced the cost. Neither
did:

- `71aea3d` added a per-page
  `pageElement.querySelector("article.part-divider")` in the
  Counters handler, which would have shown up as extra querySelector
  work, but it's unrelated to `findRef`'s call path.
- `c70b83d` removed that querySelector again, moving the part-title
  capture from per-page JS to a CSS `string-set` / `string()` rule.
  Net per-page work went *down*, not up.

`findRef`'s slow path was always there -- the README's prior
post-Attempt-E profile reported the same call chain as
`findElement self 1373 ms (7.1 %)`. Two things happened to make it
worth a fresh look:

- **V8's attribution split.** The new V8 charges `findElement` 0 ms
  and `findRef` 2530 ms instead of attributing the helper's body
  to its forwarder. Same call chain, different bucket label, much
  more visible in the bottom-up view.
- **The cost itself may have grown.** 1.4 s → 2.5 s is more than a
  V8 attribution shift can explain on a +0.8 % content change. The
  branch counters above don't tell us the pre-puppeteer-25 split;
  the most we can claim is "the fallback was clearly the dominant
  branch by the time we measured." Either way, the fix removes it.

### Methodology

This one had two of the recurring lessons baked in:

1. **Instrument to understand the workload, not just the time.**
   The CPU profile showed `findRef` at 2.5 s self-time; that's
   *what*. It needed branch-counting (fast-path vs dictMiss vs
   noDict, with caller attribution) to find out *why*. Wall-clock
   A/B alone would have detected the regression; only the per-branch
   counters explained it.

2. **`new Error().stack` is the cheap way to attribute hot-function
   calls back to their callers in-browser**, when you can't
   instrument the call sites individually. The harness already had
   `find-callers.mjs` for post-hoc cpu-profile attribution, but
   that aggregates by sample, not by call. Per-call attribution
   needed the in-page stack walk. Cost ~5 us per call, OK for
   1-shot diagnostic runs, not OK to ship.

## Where this leaves the picture

Updated cumulative table, all measured against the original 207 s
puppeteer-22 baseline:

| fix                                 | render saved | total saved | shipped |
| ----------------------------------- | ------------ | ----------- | ------- |
| `--detach-pages` (display:none)     |   ~55 s      |   ~55 s     | yes     |
| `--incremental` PDF update          |    -         |   ~32 s     | yes     |
| pdf-lib `parseSpeed: Fastest`       |    -         |    ~3 s     | yes     |
| `finalizePage` micro-optimizations  |    ~3 s      |    ~3 s     | yes     |
| aggressive detach (`removeChild`)   |   ~22 s      |   ~22 s     | yes     |
| skip dead `findEndToken` path       |   ~3.5 s     |   ~3.5 s    | yes     |
| `renderTo` additive backoff         |   ~4.25 s    |   ~4.25 s   | yes     |
| **puppeteer 22 -> 25 (Chromium bump)** | **-**     | **~20-30 s** *(generate)* | **yes** |
| **findRef fast-path** (this section) | **~2.4 s** | **~2.4 s**  | **yes** |
| `pageRanges` sharding (generate)    |    -         |  ~5-20 s    | no      |

Current end-to-end on the 1651-page book, `book.bat` path:

```
render   :  ~18 s    (was ~104 s in the original baseline)
generate :  ~43-48 s (was ~64 s; mostly the puppeteer 25 bump)
process  :  ~5 s
total    : ~70 s     (was ~207 s, a 3x speedup)
```

The remaining JS-body profile after the findRef fix:

```
self_ms   self_%   function                    source
  ~500    ~2.5 %   removeOverflow              paged.browser.js
  ~320    ~1.6 %   wrapContent
  ~200    ~1.0 %   afterPageLayout (paged.js)
  ~187    ~1.0 %   afterPageLayout (Footnotes)
  ~157    ~0.8 %   addRefs                     (new -- the fix above)
  ~130    ~0.7 %   renderTo
```

None of those individually clear the noise band; the largest
remaining JS-body bucket is the same scale as the `addRefs` cost
we just added. Native frames (`getBoundingClientRect` ~23 %,
`(program)` ~30 %, `removeChild` ~12 %) are now the dominant
contributors to render, and gBCR's caller breakdown is the same
flat-per-page shape it's had since aggressive detach landed.

The single biggest untried lever remains `pageRanges` sharding for
generate. After the puppeteer 25 bump it would save less than the
earlier estimate (the 64 s -> 43 s gain made the target smaller),
but it's still the only knob with a profile target large enough to
move the wall-clock total by 5+ s.

## Can we make `removeChild` cheaper?

After the findRef fix, `removeChild` sits at ~12 % of render
self-time. The detach-pages handler attribution is clean -- 1651
detaches for 1651 pages, exactly one per page, with the only
other removeChild callers being `filterTree` at startup (9,192
ignorable-text-node strips totalling 2.3 ms; not a hot path).

Per-call cost on the 1651-page book, with `Element.prototype.removeChild`
wrapped to measure each call:

```
[instrument] page-detach avg:      1.009 ms/call
[instrument] page-detach median:   0.900 ms/call
[instrument] page-detach p90:      2.000 ms/call
[instrument] page-detach p99:      3.000 ms/call
[instrument] avg descendants/page: 147.7
```

That's ~5-7 us per descendant LayoutObject torn down, multiplied
by ~150 descendants per page, multiplied by ~1651 pages = ~1.7 s
total. The distribution is tight and scales linearly with
descendant count -- this looks like ordinary Blink teardown work
rather than a pathological slow path.

To verify, two structural variants both tested at the same
instrumentation harness:

### Variant B: graveyard DocumentFragment

Replace `parent.removeChild(page)` with
`graveyard.appendChild(page)`, where `graveyard` is a fresh
`DocumentFragment` held by the handler. Hypothesis: the
move-to-out-of-document-fragment path might skip some
LayoutObject teardown work because the destination is itself
disconnected.

| metric | A (removeChild) | B (graveyard) |
| ------ | --------------- | ------------- |
| avg per call | **1.009 ms** | 1.082 ms (+7 %) |
| median | 0.900 ms | 0.900 ms |
| p90 | 2.000 ms | 2.200 ms |
| p99 | 3.000 ms | 3.100 ms |
| total page wall | 1666 ms | 1785 ms |
| render wall-clock | ~16.1 s | ~15.2 s (run-to-run noise) |

The graveyard move is **slightly slower** per call. Blink tears
down the LayoutObjects regardless of where the node lands; there's
no fast-path for "moved to a detached parent". No win.

### Variant C: `contain: layout style` on `.pagedjs_page`

Inject `<style>.pagedjs_page { contain: layout style; }</style>`
into the document before render. Hypothesis: removing a contained
subtree might skip style/layout invalidation propagation because
Blink already knows the subtree didn't influence its siblings or
parent.

Also tested `contain: strict` (which adds `paint` and `size`
containment -- pages already have explicit dimensions via @page
CSS so this is safe).

| metric | A (no contain) | C (layout style) | C-strict |
| ------ | -------------- | ---------------- | -------- |
| avg per call | **1.009 ms** | 1.017 ms | 0.991 ms |
| median | 0.900 ms | 0.900 ms | 0.900 ms |
| p90 | 2.000 ms | 1.900 ms | 1.900 ms |
| total page wall | 1666 ms | 1678 ms | 1634 ms |
| render wall-clock | ~16.1 s | ~15.0 s | ~14.8 s |

All four runs are within ~5 % of each other on per-call cost --
well inside the run-to-run noise band. Containment doesn't unlock
a faster removeChild path either.

### Conclusion (variants B + C)

The 1.7 s of `removeChild` is intrinsic Blink LayoutObject
teardown work. The math checks out at ~5-7 us per descendant ×
~150 descendants × 1651 pages, and three different framings
(plain removeChild, move-to-fragment, contain + removeChild) all
land within ~10 % of each other. The destination of the move and
the containment metadata don't change Blink's teardown rate.

The one thing we *don't* do is "remove less per page" -- removing
a page's content as N individual leaf removals would be strictly
worse (N × overhead instead of 1 × overhead, same teardown total).
Each removeChild call carries DOM-mutation, style-invalidation,
and notify overhead beyond the per-descendant cost, so consolidating
to one removal per page is already the optimal framing.

### Variant D: don't detach at all, just `contain: strict`

A natural follow-up: if the per-page cost of having siblings
around really comes from style/selector traversal, maybe Blink
will skip a *contained* sibling subtree even when it can't skip
a `display: none` one. Containment is a stronger signal -- it
explicitly tells the engine "no observable interaction crosses
this boundary" -- so the renderer ought to be able to short-circuit
sibling-walks more aggressively.

Implementation: replace the detach handler with one that sets
`pageElement.style.contain = 'strict'` at finalizePage and clears
the property for every page at afterRendered (so `page.pdf()`
serializes the right paint state).

Result:

| metric | current detach | variant D (contain:strict, no detach) |
| ------ | -------------- | --------------------------------------- |
| **render wall-clock** | **~16 s** | **89.3 s** |
| `Page.create` gBCR | ~764 ms | **31,142 ms** |
| `hasOverflow` gBCR | ~2,478 ms | 10,922 ms |
| total gBCR | ~4,832 ms | 45,413 ms |
| per-page ratio (last/first) | 1.36x | 4.11x |

Worse than the README's display:none baseline (`Page.create`
gBCR 12,947 ms / render 48.5 s). Containment metadata adds work
to per-sibling evaluation rather than removing it. **Definitive
no.** Containment is a hint about what's inside the box; it
doesn't make the box invisible to neighbours.

### Variant E: empty the wrapper, leave it in place

A second framing of the same idea: keep the page wrapper as a
sibling, but move its children to a stash so the wrapper itself
is a leaf (no descendants for Blink to walk through). Restore
the children at afterRendered. This isolates the "what costs
what" question: does sibling-walk cost depend on descendant
count, or just on sibling count?

Implementation: at finalizePage, for the previous-finalized page
(one behind, mirroring the keep-one-back pattern), move each
child into an array via `wrapper.removeChild(wrapper.firstChild)`,
set `min-height: 297mm` so the wrapper still occupies its slot,
and stash the children. At afterRendered, restore.

Result:

| metric | current detach | variant E (empty wrapper) |
| ------ | -------------- | --------------------------- |
| **render wall-clock** | **~16 s** | **21.9 s** |
| `Page.create` gBCR | ~764 ms | 2,628 ms (+1,864) |
| `hasOverflow` gBCR | ~2,478 ms | 5,024 ms (+2,546) |
| `Layout` gBCR | ~294 ms | 937 ms |
| total gBCR | ~4,832 ms | **10,127 ms (+5,295)** |
| `removeChild` self | 2,426 ms | **854 ms (-1,572)** |
| per-page ratio (last/first) | 1.36x | 2.93x |

The removeChild *savings* are real -- with no wrapper to tear
down, just ~150 child removals per page at sub-microsecond each.
But the gBCR *cost* roughly doubles because the wrappers are
still siblings, and gBCR firings have to walk them. Net is +5 s
render, *worse* than the current detach.

This experiment yields a clean cost-model decomposition. Pulling
the gBCR deltas apart against the wrapper-vs-content split:

```
display:none baseline (full content):       gBCR(Page.create) ≈ 12,947 ms
variant E (empty wrappers, n=1651):         gBCR(Page.create) ≈  2,628 ms
current detach (no siblings):               gBCR(Page.create) ≈    764 ms
```

Subtracting:

- (variant E - current detach) = 1,864 ms for 1,651 sibling wrappers
  → ~1.1 us per wrapper-sibling per `Page.create` gBCR call
- (display:none - variant E) = 10,319 ms for 1,651 × 150 ≈
  247,650 sibling descendants
  → ~42 us per sibling-descendant per `Page.create` gBCR call

Both wrappers and their descendants contribute to the per-call
cost. Removing the descendants helps -- variant E really is
substantially cheaper than display:none -- but the wrapper cost
alone is enough to lose. To zero out both contributions you have
to take both the wrapper and its descendants out of the sibling
list, which is exactly what the current detach does.

### Variant F: `content-visibility: hidden`, no detach

The CSS spec's `content-visibility: hidden` is the closest
property to "freeze in place without disposing" -- per spec,
rendering work is "skipped" but cached state is preserved for
cheap restoration. Conceptually nearer to a freeze than
`display: none` or `contain: strict` were.

Implementation: at finalizePage, set
`pageElement.style.contentVisibility = 'hidden'` and
`containIntrinsicSize = '210mm 297mm'` (the size hint Blink uses
when content-visibility skips a subtree). At afterRendered,
clear both.

Result:

| metric | current detach | variant F (cv:hidden) |
| ------ | -------------- | ----------------------- |
| **render wall-clock** | **~16 s** | **95.2 s** |
| `Page.create` gBCR | ~764 ms | **29,656 ms** |
| `hasOverflow` gBCR | ~2,478 ms | 17,558 ms |
| total gBCR | ~4,832 ms | 52,899 ms |
| per-page ratio (last/first) | 1.36x | 5.12x |

Worse than every other variant. The spec's "skip rendering work"
clause covers painting and composition; it does **not** make the
subtree invisible to sibling-walks during style and selector
matching that gBCR forces. Three "leave in place" properties
(`display: none`, `contain: strict`, `content-visibility: hidden`)
have now been tested and none of them short-circuit the
sibling-walk.

### Conclusion across all six variants

| variant | render | net vs current |
| ------- | ------ | -------------- |
| A current (removeChild, no contain) | ~16.1 s | (baseline) |
| B graveyard fragment | ~15.2 s | flat (noise) |
| C `contain: layout style` + removeChild | ~15.0 s | flat (noise) |
| C-strict `contain: strict` + removeChild | ~14.8 s | flat (noise) |
| **D `contain: strict`, no detach** | **89.3 s** | **+73 s** |
| **E empty wrappers, no detach** | **21.9 s** | **+5.9 s** |
| **F `content-visibility: hidden`, no detach** | **95.2 s** | **+79 s** |

The flat band (A/B/C/C-strict) is the cost-of-doing-business --
~1 ms × 1651 pages = ~1.7 s of intrinsic Blink LayoutObject
teardown. Variations on the framing don't move it. The
catastrophic band (D, E) confirms that any path where the page
wrapper stays in the live sibling list pays meaningfully more
than the teardown cost would have been -- ~1.1 us per
wrapper-sibling × 1651 wrappers × several gBCR call sites per
page comes out to several seconds of extra render even when the
wrapper is otherwise empty and contained.

The 1.7 s is the bill we pay for shrinking the live DOM from
~150 × 1651 ≈ 250k nodes back down to 2 nodes (in-flight page +
keeper), which is what kept `Page.create`'s gBCR flat per page
(see "Hypothesis 2: sibling sweeps over `display: none` pages"
above). Net savings vs the display:none variant was ~22 s render;
the 1.7 s removeChild cost is roughly 8 % of that win paid back
to Blink for cleanup. Worth keeping.

### Aside: it's not GC, and JS references don't help

A reasonable follow-up question to all of this is "can we just
hold a reference to the detached children to avoid disposal,
or turn off GC to skip the cleanup?" Neither applies to what
we're measuring.

Chromium maintains two trees:

- **DOM tree** -- `Node` objects, JS-visible, referenceable.
- **Render tree** -- `LayoutObject` / `LayoutBox` / `LayoutText`
  etc., Blink-internal, NOT JS-visible.

`removeChild` keeps the DOM Node alive (JS reference holders --
including the handler's `this._detached` array -- prevent
collection). But the corresponding LayoutObject in the render
tree is **destroyed immediately**, synchronously, at the
removeChild call. Re-attaching via appendChild later builds a
new LayoutObject from scratch.

There is no JS-level API to keep a LayoutObject alive across
detach + reattach. Holding DOM references doesn't change the
render-tree lifecycle. The 1.7 s lives entirely in
LayoutObject teardown -- which is Blink-internal C++ work
attributed to the `removeChild` native frame in the profile,
not to GC.

V8's GC is a separate concern and isn't the bottleneck. The
profile reads:

```
   self_ms   self_%   function
    195.21    0.89%   (garbage collector)
```

~200 ms over a ~22 s render. Even if it could be disabled
(it can't -- Node would OOM), it would barely register.

The asymmetry between variants B and E makes this concrete.
Variant B (graveyard fragment) moves the page from
`.pagedjs_pages` to a detached DocumentFragment; variant E
(empty wrapper) keeps the page in `.pagedjs_pages` but moves
its children out. The fragment-move path *does* trigger
LayoutObject teardown (you can see the 1.08 ms / call in
variant B's instrumentation) even though the DOM Node lives on
in a JS-visible fragment -- because the destination is itself
not attached to the document, so there's no live render-tree
parent. Conversely, variant E's wrapper stays in
`.pagedjs_pages` with a live LayoutObject the whole time, so
the wrapper's render-tree slot doesn't get torn down; only
its child LayoutObjects do (as the children move out). The
"keep render objects alive" idea would have to mean keeping
the wrapper in `.pagedjs_pages` with all its children, which
is the display:none baseline -- ~48 s render.

The trade-off is therefore not "keep things alive vs. let GC
collect them"; it's "be a live render-tree sibling vs. not".
Anything that keeps the wrapper as a live sibling pays the
~1.1 us per wrapper-sibling per gBCR call shown above, and the
gBCR firings compound that into seconds across 1651 pages.

## Chasing the residual `(idle)` to requestAnimationFrame

A second axis of the same investigation. The post-findRef-fix
profile showed `(idle) 735 ms (4.6 %)` -- not huge, but non-zero
and worth understanding. `(idle)` in a V8 CPU profile means
samples taken while the main thread had nothing scheduled --
waiting on async/await, microtask queue settling, requestAnimationFrame
ticks, or other browser-internal yields.

### Hypothesis 1: microtask boundaries from `await Hook.trigger(...)`

The chunker's per-page loop has 5-6 `await this.hooks.X.trigger(...)`
calls per page. `Hook.trigger()` wraps every sync handler in a fresh
Promise and returns `Promise.all(promises)`, so the caller always
awaits a thenable -- a microtask boundary per await even when every
handler resolved synchronously. 5 boundaries × 1651 pages ≈ 8,255
yields; if each yield is ~85 us in V8 it lines up with the 735 ms.

Patched it: `Hook.trigger()` returns `undefined` when no handler
returned a thenable, callers do
`let p = hook.trigger(...); if (p) await p;` to skip the await on
the sync fast path. Patched at four hot per-page sites (3 in
`chunker.layout`, 3 in `chunker.handleBreaks`).

Result: render went **up** by ~0.35 s on a 2-run paired A/B
(14.57 s -> 14.92 s avg). `(idle)` in the profile went **up too**
(735 ms -> 1223 ms in absolute terms). Microtask boundaries are
~30 us each at the JIT level; the V8 sampler at 1 ms intervals
hardly catches them, so they show up as `(program)` rather than
`(idle)`. The patch shaved microtask scheduling cost in the
single-digit percent range but added a branch on every Hook.trigger
call -- net wash, slight regression. **Reverted.**

### Hypothesis 2: ResizeObserver firing per page

Per page, `Page.addResizeObserver` creates a fresh `ResizeObserver`
that fires its callback asynchronously from the compositor thread
back to main. The callback wraps work in `requestAnimationFrame`,
so each RO firing schedules a frame-tick wait. 1651 pages × ~0.5 ms
per RO-rAF round-trip ≈ ~800 ms. Plausible.

Two-step probe:
1. **Skip the rAF wrap inside the RO callback**, run synchronously.
   Result: `(idle) 902 ms`. No improvement, possibly slightly worse.
2. **Disable the ResizeObserver entirely** (early-return in
   `addResizeObserver`). Result: `(idle) 1,074 ms`. Still no
   improvement.

Neither helped. The RO isn't the source -- the per-page
`addResizeObserver` overhead is real, but it doesn't show up in
the `(idle)` bucket. Restored upstream behaviour.

### Hypothesis 3: the chunker's `Queue.tick` is `requestAnimationFrame`

The chunker drives its per-page work through a `Queue` class
(`paged.browser.js:2666`). The queue's constructor sets:

```js
this.tick = requestAnimationFrame;
```

and `Queue.run()` schedules each iteration via
`this.tick.call(window, () => { ... });`. Chunker's `render()`
loops over `this.q.enqueue(() => this.renderAsync(renderer))`
once per page. Every per-page iteration therefore waits one rAF
tick before processing.

`requestAnimationFrame` waits for the next animation frame. In
headless puppeteer with no display, rAF still delivers callbacks
on a regular cadence (Chromium's headless mode default is around
60 Hz off-screen / ~16 ms per frame, with the scheduler often
batching tighter than that). Either way, per-page rAF waits
across 1651 pages add up to several hundred milliseconds of pure
main-thread idle.

The fix is one line:

```js
this.tick = (cb) => queueMicrotask(cb);
```

`queueMicrotask` schedules the callback on the microtask queue --
runs before returning to the event loop, microsecond-scale latency
instead of millisecond-scale. The `Queue` doesn't depend on rAF
semantics (no paint coordination, no frame-budget yielding --
it's just a serializer that wants to run tasks back-to-back).

Verification (paired 2-run A/B, `--detach-pages`, no
instrumentation, no cpu-profile):

| run | BEFORE render | AFTER render |
| --- | --- | --- |
| 1 | 14.62 s | 11.86 s |
| 2 | 14.51 s | 12.12 s |
| **avg** | **14.57 s** | **11.99 s** |

**Δ = -2.58 s render (-18 %).** Larger than the 735 ms `(idle)`
that prompted the look -- because rAF was costing real (program)
work too (V8 scheduler, microtask queue draining around the rAF
boundary), not just idle wait. CPU profile of the fixed render:

```
   self_ms   self_%   function
   -------   ------   ----------------------------------------------
   4355.74   34.75%   getBoundingClientRect
   1935.89   15.45%   removeChild
   1934.11   15.43%   (program)             (was 5872 -- down ~4 s)
    636.43    5.08%   removeOverflow
    -- (idle) absent from the top 10, < 130 ms (1 %)
```

`(idle)` dropped out of the top 10 (< 130 ms / 1 %), `(program)`
dropped from 5872 ms to 1934 ms (-4 s), `removeChild` dropped
slightly (2426 ms -> 1935 ms; smaller render = same per-call cost
× same call count, so this is sampling artefact, not a real
change). PDF byte size unchanged (within standard timestamp
drift). Shipped.

### What the three hypotheses together teach

`(idle)` in a V8 CPU profile attribution table is **not** primarily
microtask scheduling -- those are too fast to sample. It's
genuinely-waiting time, where the main thread had no V8 work to do.
The dominant source of waiting in our render was not async/await,
not ResizeObserver coalescing, but a `requestAnimationFrame`
buried in the chunker's task queue. Replacing it with
`queueMicrotask` collapses the per-page wait, and additionally
shrinks the surrounding V8 scheduler work because each rAF
callback came with its own setup / teardown overhead.

The pattern to remember: if a profile shows non-trivial `(idle)`
in a render-style workload, hunt for explicit `requestAnimationFrame`
/ `setTimeout` / `requestIdleCallback` calls in the hot path before
investigating microtask machinery. The frame-paced scheduler is a
much bigger lever than the microtask scheduler.

### Follow-up: the `Queue` itself was unnecessary indirection

The chunker's `render()` routes each per-page iteration through
`this.q.enqueue(() => this.renderAsync(renderer))`. The queue's
job is to serialize tasks -- but an async generator is already
inherently serial (you can't call `.next()` twice in parallel).
With the rAF-tick fix above, the queue was reduced to a
`queueMicrotask` hop plus a Promise/deferred allocation per page,
for no purpose.

Dropped the indirection: `render()` now iterates `renderer.next()`
directly. The `Queue` class still exists in the bundle for the
`onOverflow` re-render path (which is rare in practice), but the
hot per-page loop bypasses it.

This is a structural simplification more than a measurable speedup
-- the queueMicrotask hop was already cheap and the deferred
allocation amortizes. But it removes a layer that was doing
nothing useful for our use case, which is the point of
maintaining a fork.

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

Mirrors the README's earlier "Phase 1: hook fast-path" for
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
noise band (the README's earlier methodology section pins
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

The "Attempt E: additive backoff" section above describes
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

## What happened when we tried move-not-clone

A fresh `--detach-pages --no-timing --cpu-profile
--cpu-sampling 100` baseline run showed `cloneNode` at
~146 ms self-time, all of it inside `Layout.append`'s per-
source-node clone path. `Layout.append`'s body for the
`!shallow` (deep-cloned leaf) yields was:

```js
let clone = cloneNode(node, !shallow);  // deep clone
// ... attach clone to dest ...
return clone;
```

The user's question: source's read-only-template contract
is just an artifact of paged.js's break-and-resume model.
We're doing offline layout -- nothing reads source after
the render finishes. Could we MOVE the source node into
dest instead of cloning it, and avoid the allocation cost
entirely? Best-case ceiling estimated at ~300-450 ms /
~3-5 % of render (the cloneNode self plus distributed GC-
pressure relief from not allocating ~250 k duplicate DOM
nodes).

### What the refactor required

Three load-bearing assumptions in the chunker break the
moment source is mutated:

1. The walker traverses via live links
   (`node.firstChild` / `nextSibling` / `parentNode`).
   After a leaf yield, `walker = walk$2(nodeAfter(node,
   source), source)` reads `nodeAfter` AFTER `append` has
   moved `node` into dest -- the reads now go into dest's
   tree, not source's. Fix: capture `nodeAfter(node,
   source)` BEFORE the append call and pass it to the
   walker reset.

2. `BreakToken.node` stores a source-tree reference for
   the next page's `getStart(source, breakToken)` to
   resume from. `createBreakToken`'s four
   `findElement(*, source)` call sites map rendered
   (clone) nodes back to source via shared `data-ref`.
   With moves, source has lost the leaves and findElement
   returns the moved node now living in dest. Fix:
   bypass `createBreakToken` entirely. Compute the
   resume point from the extract-and-restore step
   instead (see `restoreOverflow` below).

3. `removeOverflow`'s `deleteContents` would drop the
   moved content forever. In the clone model that was
   fine -- source still held a pristine copy. In the
   move model, source needs the overflow content back so
   the next page can render it. Fix: replace with
   `restoreOverflow` -- `extractContents` the overflow
   range, walk the fragment depth-first collecting leaf
   elements, and reinsert each leaf at its stashed
   `_srcParent` / `_srcNextSibling` position. For the
   boundary leaf that's partially overflowing,
   `extractContents` produces a shallow clone of the
   leaf in the fragment; we inherit its source position
   via `source.indexOfRefs[ref]` (which still points at
   the original-now-in-dest, which carries the stash).
   Reverse-order iteration so each leaf's `_srcNextSibling`
   target is back in source by the time we insert.

### The bug that taught the real story

First pass rendered the book to 1740 pages -- 89 more
than the 1651-page baseline. Content was byte-identical
modulo timestamps. Per-page char counts in the FAQ
section showed pages 127+ with only ~50-500 chars each:

```
[BL p127] 3045 chars      [EX p127] 438 chars
[BL p128] 3732 chars      [EX p128] 185 chars
```

Some FAQ pages had a single short paragraph. Instrumenting
`shouldBreak` revealed it was returning true on every
non-first yield inside the FAQ article:

```
[instrument] shouldBreak true: tag=P  ref=6bv pba=- prevNode=ARTICLE
[instrument] shouldBreak true: tag=B  ref=6bx pba=- prevNode=ARTICLE
[instrument] shouldBreak true: tag=P  ref=6by pba=- prevNode=ARTICLE
... (one per FAQ paragraph)
```

The `<p>` elements have no `data-break-before` and no
`data-previous-break-after`, so the fire is via
`needsPageBreak(node, previousNode)` -- which checks
whether `node`'s effective `data-page` differs from
`previousNode`'s.

`previousNode` is computed via
`nodeBefore(node, limiter)`, which walks
`node.previousSibling` then climbs via `parentNode` if
no significant sibling exists. In the move model, after
the previous yield was moved out of source, the current
yield's `previousSibling` is `null` (the previous one no
longer lives in source). The climb continues up:
FAQ article (no `data-page`) -> looks at its previous
sibling -> finds the **part-divider article** sitting
right before the FAQ article in source, which DOES carry
`data-page="divider"` (set by processBreaks for the CSS
`page: divider;` rule on `article.part-divider`).

So `needsPageBreak` saw a transition from
`page="divider"` to (effectively) no page, fired true,
and the chunker started a fresh page for every paragraph
in the FAQ section. The chapter article's normal
"siblings share the same effective page-name" property
broke because the sibling-walk now escapes the chapter
into the prior part-divider.

### Fix: track previousLeaf in renderTo

The chunker already knows the right answer: the last
leaf it actually appended this page. Threaded through
`shouldBreak` as a third argument, used by the
`needsPageBreak` branch only (`needsBreakBefore` and the
`parentBreakBefore` logic still use `nodeBefore`):

```js
let _moveLastLeaf = null;
// ... in the loop ...
if (hasRenderedContent &&
    this.shouldBreak(node, start, _moveLastLeaf)) { ... }
// ... after append ...
if (!shallow) _moveLastLeaf = node;
```

In `shouldBreak`:

```js
let pageBreakRef = previousLeaf || nodeBefore(node, limiter);
return ... || needsPageBreak(node, pageBreakRef);
```

With that, page count went 1740 -> 1653 (within 2 of
baseline) and per-page content matched. PDF
byte-equivalent to baseline within timestamp drift.

### Profile diff

Both runs `--detach-pages --cpu-profile --cpu-sampling
100`, sample-time absolute, single run each (wall-clock
on this machine is too noisy to be a useful signal --
see "Methodology: compare profiles, not wall-clock"
above):

| function | baseline | move | Δ |
| --- | --- | --- | --- |
| `getBoundingClientRect` | 3539 ms | 4036 ms | **+497** |
| `appendChild` | 137 ms | 390 ms | **+253** |
| `restoreOverflow` (new) | -- | 168 ms | +168 |
| `removeChild` | 1536 ms | 1635 ms | +99 |
| `insertBefore` | <50 ms | 87 ms | ~+87 |
| `getNodeWithNamedPage` | <50 ms | 108 ms | ~+85 |
| `afterPageLayout` (AtPage) | 105 ms | 182 ms | +77 |
| `(program)` | 2196 ms | 2266 ms | +70 |
| `Layout` ctor | 23 ms | 31 ms | +8 |
| `cloneNode` | 146 ms | <130 ms | **-146** |
| `removeOverflow` | 124 ms | -- (replaced) | -124 |
| **samples** | **17,481** | **19,590** | **+2,109** |
| **CPU work** | **9.48 s** | **10.74 s** | **+1.26 s** |

Net **+1.26 s of CPU work** -- the change is a clear
regression in the opposite direction from the prediction.

### Why the prediction was wrong

The cloneNode self-time saving (-146 ms) shows up as
expected, but three structural costs dwarf it:

1. **`appendChild` on an attached node is roughly 2x
   the cost of `appendChild` on a fresh clone (+253 ms).**
   A move is internally detach-from-source-parent +
   attach-to-dest-parent; both touch Blink's child-list
   bookkeeping. cloneNode produces an unparented node,
   so the subsequent attach is one-sided. Intrinsic to
   any move-based design -- no implementation choice
   avoids it.

2. **Each move dirties Blink's layout state more than
   each clone does, distributing cost into gBCR
   (+497 ms).** The increase is spread across every
   gBCR call site -- `Page.create` (+225 ms),
   `hasOverflow` (+152 ms), `Layout` ctor (+58 ms),
   `afterPageLayout` (+31 ms), `addResizeObserver`
   (+31 ms) -- not localized to any new code. Each
   gBCR call flushes pending mutations; with every move
   counting as two mutations vs one for clone+append,
   each flush has more to do. Same migration pattern
   the README's "Attempt B: memoize `Page.create`'s gBCR"
   documented above -- DOM mutation cost doesn't go
   away by elimination, it migrates to whichever frame
   next forces a layout flush.

3. **The extract-and-restore cycle adds ~340 ms of new
   JS work.** `restoreOverflow` (168 ms) builds an
   `extractContents` fragment + walks it for leaves +
   inserts each back into source. `previousLeaf` makes
   `shouldBreak` call `getNodeWithNamedPage` (108 ms)
   on every leaf yield (it climbs parent chains looking
   for `data-page`). `insertBefore` (87 ms) is the
   per-restore reinsertion.

The deeper structural reason: paged.js's break-and-
resume model touches each source leaf O(pages-spanning-
that-leaf) times in the move model -- moved into page N,
extracted to the fragment, reinserted into source,
moved into page N+1. Each touch is a DOM mutation. The
clone model touches each node O(1) times -- allocated
once, attached, thrown away with the page. Cumulative
mutation count is structurally higher under moves.

The cloneNode time the profile attributes to its native
frame is just the *allocator* portion of cloning work --
not the total cost of "duplicating a subtree". The rest
hides in V8 / Blink native frames not labeled
`cloneNode`, and that rest doesn't disappear when you
switch to moves; it shows up as appendChild +
invalidation cost instead.

### Where this leaves the picture

Reverted. The cumulative table from the previous
section is unchanged. No row added.

The pattern this attempt taught is the inverse of the
"distributed savings often exceed direct estimates"
heuristic the README documents elsewhere: sometimes a
change with a direct cost saving has bigger distributed
*regressions* that aren't visible until you measure.
The cloneNode saving was real; the appendChild + gBCR +
restoreOverflow overhead was bigger.

The only design that would avoid all three costs is one
that never re-moves the same node -- a single-pass
paginator with no break-and-resume. That's not paged.js;
it's a different algorithm. Not a small refactor.

The buffer variant (pre-clone source once at startup,
move from buffer to dest) was considered and not
prototyped: it'd shift the cloneNode allocation cost to
one big startup call but every per-page move would
still hit the same appendChild + gBCR dynamic that ate
the savings here. No structural win.

This experiment also clarifies why the "Profiling
pdf-lib's load" and "Findings: removeChild" sections
saw allocation savings show up as wall-clock gains:
those operations didn't have a Blink layout-tree
mutation step downstream. Mutations are where the cost
that *looks* like JS allocation actually lives in this
codebase.
