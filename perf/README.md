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
| `package.json` | Pins `puppeteer` + `pagedjs-cli`. |
| `measure.mjs` | Puppeteer harness. Mirrors pagedjs-cli's own `Printer.render()` flow, with our timing handler injected as an extra script. |
| `timing-handler.js` | The "patch". A `Paged.Handler` subclass that records per-page wall time + heap into `window.__pagedTiming` and streams a line per page to the console. |
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
```

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

## Step 2, when we get there

To take a CPU profile, the plan is to add a `--cpu-profile` flag to
`measure.mjs` that:

1. Connects to the page's CDP session.
2. Calls `Profiler.enable` and `Profiler.start` right before
   `PagedPolyfill.preview()`.
3. Calls `Profiler.stop` in the `afterRendered` hook and writes the
   returned profile as `cpuprofile.json` in the results folder.

The resulting `.cpuprofile` opens directly in Chrome DevTools
(Performance tab -> "Load profile..."). The self-time flame graph
should pin the offending function within a few minutes of staring.

If the bottleneck turns out to be in paged.js itself, the next step
is to either patch our vendored copy or move to one of the active
forks (e.g. `@sutty/pagedjs`, `pagedjs-fork`) which have already
fixed several `O(n^2)` issues in the upstream.
