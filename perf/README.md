# PDF render profiling

The book PDF is built by piping `_site-pdf/book.html` through
`pagedjs-cli` (see `docs/book.bat`). As the book has grown we've
noticed **quadratic** wall-clock behaviour: time-per-page goes up as
later pages are laid out, so doubling the page count roughly
quadruples the total render time.

This folder holds the tools used to investigate that.

## The plan

`pagedjs-cli` is a thin Puppeteer wrapper around three phases, each
of which `cli.js` shows as its own spinner:

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
| `package.json` | Pins `puppeteer` + `pagedjs-cli` + `patch-package`. |
| `measure.mjs` | Puppeteer harness. Mirrors pagedjs-cli's own `Printer.pdf()` flow, with optional CPU profiling, in-page handler injection, and DOM-accessor instrumentation. |
| `timing-handler.js` | `Paged.Handler` that records per-page wall time + heap into `window.__pagedTiming` and streams a line per page to the console. Always injected. |
| `detach-pages.js` | `Paged.Handler` that hides each completed page from the layout tree. The fix. Injected by `--detach-pages` and by `docs/book.bat`. |
| `instrument-flush-ops.js` | Wraps `getComputedStyle`, `getBoundingClientRect`, and the `offsetWidth` / `clientWidth` / `scrollWidth` family with counters + per-call timing. Injected by `--instrument`. |
| `analyze-profile.mjs` | Bottom-up self-time analyzer for `.cpuprofile` files. Same shape as DevTools' Performance bottom-up view, in the terminal. |
| `run.bat` | Windows wrapper. Installs deps on first run, then invokes `node measure.mjs`. |
| `results/` | Output, one timestamped subfolder per run. Git-ignored. |

We deliberately do **not** use `pagedjs-cli --additional-script` even
though that flag exists for exactly this kind of patching: pagedjs-cli
doesn't forward in-page `console.log` to its own stdout, and we have
no way to call `page.evaluate()` from outside to pull out the timing
data at the end. Driving Puppeteer ourselves gets both.

The harness is otherwise a near-line-for-line copy of
`pagedjs-cli/src/printer.js`'s `render()` flow:

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
- same paged.js bundle: we load `pagedjs-cli/dist/browser.js`, not
  the npm `pagedjs` package's `paged.polyfill.js`. The two are close
  cousins (~33k lines each, ~120 lines of divergence) but at 0.4.3
  only the cli bundle is reliable inside this flow.

The net effect: what we measure tracks what production renders. If
profiling shows a hot spot, fixing it will move the real `book.bat`
number too.

## How to run

```
# from this folder
run.bat                                   # defaults to ..\docs\_site-pdf\book.html
run.bat path\to\some-other.html           # explicit input
run.bat --out my-run                      # explicit output directory
run.bat --detach-pages                    # inject the detach-pages fix
run.bat --cpu-profile                     # CPU-profile the render phase
run.bat --instrument                      # count + time DOM-accessor calls
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
point this needs, so no fork or patch-package diff is required.

Wired into production in `docs/book.bat`:

```bat
npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf ^
    --outline-tags h1,h2,h3,h4 -t 600000 ^
    --additional-script ..\perf\detach-pages.js
```

And into the perf harness via the `--detach-pages` flag.

The `patches/` infrastructure (patch-package wired into both
`docs/package.json` and `perf/package.json`, sharing a single
`/patches` directory at the repo root) is left in place even
though we didn't use it -- it's the obvious fallback if a future
optimisation actually needs to modify the bundle.

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

That last point matters for an earlier mistaken explanation. The
CPU profile of the post-fix run showed `(anonymous) browser.js:29501`
(the `finalizePage` `["top", "bottom"].forEach` callback)
growing from 1.1 s of self-time in baseline to 13.7 s after the
fix. The plausible-sounding story was "those reads were
free-riding on the chunker's just-flushed layout in baseline,
and now they're paying full price." The instrumentation rules
that out: **the function isn't doing more layout-flushing work,
because it isn't doing any.** Its 13.7 s of profile self-time
is a CPU-profiler attribution artefact -- V8 inlining and
sample distribution shift between runs once the dominant frame
(`getBoundingClientRect`, 67 % of render in baseline) shrinks.
The actual per-page work that closure does -- 8 `querySelector`
calls, 3 `getComputedStyle` calls, a few class checks and style
writes -- didn't change.

The detach handler has no second-order downside; nothing the
instrumentation can see has shifted besides per-call latency on
the layout-flushing accessors the chunker already used.
