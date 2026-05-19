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
| `incremental-pdf.mjs` | Replaces the pdf-lib load+save roundtrip with a PDF 1.7 §7.5.6 incremental update appended to Chrome's bytes. Used by `--incremental`. |
| `test-incremental.mjs` | Smoke test for `incremental-pdf.mjs`: renders a tiny probe page, runs the writer, verifies the result parses (via pdf-lib re-load) and that outline + metadata land correctly. |
| `profile-load.mjs` | Standalone profiler for `PDFDocument.load`. Runs the load on a chosen PDF with a chosen `parseSpeed`; intended to be run under `node --cpu-prof`. |
| `profile-roundtrip.mjs` | Times the full pdf-lib `load + save` roundtrip across the three `parseSpeed` / `objectsPerTick` settings on a chosen PDF. |
| `probe-chrome-outline.mjs` | Renders a synthetic multi-level h1..h6 document via Chrome's `outline: true` and dumps the resulting `/Outlines` tree. Quick check that the CDP flag is wired correctly in the local Chromium / puppeteer combo. |
| `compare-outlines.mjs` | Diffs two PDFs' `/Outlines` trees by `(depth, title, target page)`. Used to verify whether Chrome's native outline matches the injected one. |
| `probe-outline-exclusions.mjs` | Tests which per-element attributes / styles (aria-hidden, role=presentation, hidden, display:none, CSS bookmark-level, ...) make Chrome drop a heading from its outline. |
| `analyze-profile.mjs` | Bottom-up self-time analyzer for `.cpuprofile` files. Same shape as DevTools' Performance bottom-up view, in the terminal. |
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
run.bat --instrument                      # count + time DOM-accessor calls
run.bat --time-hooks                      # per-task timing of every chunker/polisher hook
run.bat --incremental                     # process via incremental update instead of pdf-lib roundtrip
run.bat --chrome-outline                  # let Chrome emit /Outlines (skip parseOutline + setOutline)
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
2. Compare bottom-up self-time tables (`analyze-profile.mjs`) and
   caller breakdowns (the gBCR-callers script under
   `time-hooks-current` in the repo notes).
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
| pageRanges sharding (generate)      |    -         |  10-40 s    | no      |

Render is now ~22 s on a 1638-page book, down from ~104 s in the
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

### The lesson (again)

Attempt A asked "can this be faster?" and got 162 ms.
Attempt B asked the same question of an adjacent function and got
nothing measurable. Attempt C asked "does this need to run at
all?" and got 22x more savings than A and B combined. Once
self-time is profile-attributed, the next move isn't always
"optimize the body" -- sometimes the cheapest path is up the call
chain to the caller, then to the *caller's* caller, until you can
ask "what does the value being computed actually do?" Here the
answer was "nothing," and the optimization was deletion.

In hindsight the textBreak and Page.create-memoize attempts both
failed for the same reason in the opposite direction: they tried
to make work cheaper that was structurally unavoidable. The wins
in this investigation -- aggressive-detach and now skip-findEndToken
-- both came from eliminating work, not from speeding it up.

### Where this leaves the picture

With `findEndToken` no longer firing, the JS-body profile flattens
out:

```
findElement     self 1314 ms ( 5.9 %)
createBreakToken self 1016 ms ( 4.6 %)
removeOverflow  self  471 ms ( 2.1 %)
afterPageLayout self  221 ms ( 1.0 %)
```

None of these are individually addressable in the same "delete the
caller" sense; they're load-bearing work in the per-page break
loop. `findElement` already takes the dictionary fast path. The
last sub-second JS body worth a profile look would be
`removeOverflow`'s `extractContents`, but its work is genuinely
required.

`pageRanges` sharding of `generate` (~60-70 s of `page.pdf()`)
remains the only knob with a profile target large enough to move
the wall-clock total meaningfully. Render is now ~22 s and the
per-page-ratio is 1.50x (vs 1.43x pre-onUnderflow-skip -- the
extra resize-observer firings had been slightly flattening the
curve, ironically).
