---
title: PDF Generation
parent: Documentation Development
nav_order: 8
permalink: /Documentation/Development/PDF-Generation
---

# PDF Generation
{: .no_toc }

Internals of the two-stage PDF pipeline: `tbdocs` Phase 8 assembles a sparse `_site-pdf/` source tree, then `book/render-book.mjs` renders it into `_pdf/twinBASIC Book.pdf` via headless Chromium + paged.js + pdf-lib. Read this when modifying the renderer, the print stylesheet, or the paged.js bundle.

* TOC goes here
{:toc}

## Data flow

![A flow chart running top to bottom through two boxed stages. The first, tbdocs writePdf, holds three steps side by side: assembleBook combining the chapter HTML, copyPdfCss copying the two stylesheets, and copyPdfImages copying the referenced images. Together they produce _site-pdf/book.html with its stylesheets and images. That file feeds the second stage, render-book.mjs, whose three phases run in sequence: Phase 1 lays the document out with puppeteer and paged.js into one element per output page, Phase 2 extracts the metadata and outline tree and calls page.pdf for a raw buffer, and Phase 3 reloads that buffer through the fast pdf-lib shims, sets the metadata and outline, and saves. The result is the finished PDF under _pdf.](/assets/images/dot/pdf-render-pipeline.svg)

The book runs to about 2,250 pages. `tbdocs` builds `_site-pdf/` as part of its normal run; `render-book.mjs` runs only when `book.bat` calls it, which keeps `puppeteer` and `pdf-lib` out of the site generator's dependency tree.

## Running the renderer

```
node book/render-book.mjs <input.html> -o <output.pdf>
                     [--outline-tags h1,h2,h3,h4]
                     [-t <timeout-ms>]
                     [--additional-script <path>]...
```

| Flag | Default | Description |
|---|---|---|
| `<input.html>` | required | Path to the assembled HTML file (usually `_site-pdf/book.html`). |
| `-o` / `--output` | required | Destination PDF path. |
| `--outline-tags` | `h1,h2,h3,h4` | Comma-separated heading tags to include in the PDF bookmark tree. |
| `-t` / `--timeout` | `0` (disabled) | Per-operation puppeteer timeout in milliseconds, a whole number from 0 to 2147483647. |
| `--additional-script` | --- | Inject an extra in-page script after the paged.js bundle. Repeatable. |

`book.bat` runs the standard production invocation:

```batch
node book\render-book.mjs docs\_site-pdf\book.html -o "docs\_pdf\twinBASIC Book.pdf" --outline-tags h1,h2,h3,h4 --additional-script perf\detach-pages.js
```

Paths are relative to the repository root.

Run `build.bat` first to populate `_site-pdf/`. `book.bat` refuses a source tree that is absent or older than its sources, before it starts Chromium --- see [When the render fails](#render-troubleshooting).

## When the render fails
{: #render-troubleshooting }

`book.bat` takes around two minutes. To find the cause of a failure, ask which of the three phases stopped, and whether the run failed or is still working.

### Which phase stopped

Each phase prints one summary line as it completes:

    render:   <elapsed>  (<n> pages)
    generate: <elapsed>  (raw <n> MB)
    process:  <elapsed>
    saved:    <output path>  (<n> MB)
    total:    <elapsed>

The failure is in the phase after the last line printed:

- No `render:` line: [Phase 1](#phase-1-render), or the run never reached it (a refused source tree, a [missing Chromium](#chromium-is-not-installed)).
- `render:` but no `generate:`: [Phase 2](#phase-2-generate).
- `generate:` but no `process:`: [Phase 3](#phase-3-process).
- `process:` but no `saved:`: the PDF was built and the write to disk failed.

`render-book.mjs` does not create the output's directory, so an absent `docs/_pdf/` raises `ENOENT`. `book.bat` creates it; a hand-written invocation must do so itself. The other common cause on Windows is the output file being open in a PDF viewer.

### Stalled, or still working

`-t` defaults to `0`, which disables the timeout: a stalled render stays stalled until you interrupt it. Pass `-t 600000` to get an error instead of a hang.

Live progress separates a stall from slowness. It differs per phase, and by whether stdout is a terminal:

| Phase | Live output | What silence means |
|---|---|---|
| Render | `rendering: <n> pages (<elapsed>s)`, rewritten in place on a terminal; one line per 100 pages when stdout is piped | A count that has stopped advancing is a layout stall. No count at all means the stop came before `PagedPolyfill.preview()` finished its first page. |
| Generate | `generating: <elapsed>s`, a heartbeat every 500 ms, **on a terminal only** | Nothing is wrong. `page.pdf()` returns only at the end, so a piped run prints nothing meanwhile. |
| Process | none | Nothing is wrong. The phase reports only when it finishes. |

The renderer relays three kinds of in-browser fault, each with its own prefix:

- **`[request failed] <url> <errorText>`** --- Chromium could not load a resource. A file missing from `_site-pdf/` appears as `net::ERR_FILE_NOT_FOUND` with its path, which points to an incomplete Phase 8 tree.
- **`[page error] <message>`** --- an uncaught exception inside the page.
- **`[render-book] error: <error>`** --- the top-level catch. It closes the browser and sets the exit code to 2.

A paged.js stylesheet fetch that fails arrives as `error on LINK: <url>`.

### Most of these failures belong to `build.bat`

`_site-pdf/` is `build.bat`'s output, so a render that stops before Chromium starts is reporting on the previous command.

`book.bat` first runs [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) over `docs/_site-pdf`. It refuses two states before the renderer starts.

**The tree is absent.** Exit code 2:

    check_tree_fresh: docs/_site-pdf/book.html does not exist.
      Run build.bat first -- there is no built tree to check.

Causes: the build never ran; `build.bat --no-pdf`; `also_build_pdf: false` in `_config.yml`; only `serve.bat` ran (it skips the PDF pass); or Phase 8 aborted. Phase 8 aborts on three things:

- **``Phase 8: no page with `layout: book-combined` found``** --- or `multiple pages with ... found`, naming them. Exactly one page must carry that layout, and `docs/book.html` is it.
- **`pdf: required font <path> is not in the source tree`** --- names `scripts/build_fonts.py`. All six faces `print.css` declares must be copied into the tree, so a regenerated but uncommitted subset fails here.
- **`pdf: missing image <path> (referenced from book.html, not present under source tree)`** --- one line per path, then a count. This is the usual one. `--tolerate-missing-images` downgrades it to a warning.

**The tree is older than the sources that produced it.** Exit code 1, naming the file that is newer:

    check_tree_fresh: docs/_site-pdf is 424s older than docs/Documentation/Extending.md.
      Run build.bat first. Scanning a stale tree reports a pass for the
      previous build, which is the one thing these gates must never do.

Without the gate, `book.bat` would spend two minutes rendering the previous book and report success. The mechanism, including the option the PDF source tree needs, is under [`book.bat`](Tools#bookbat).

The gate compares against everything under `docs/` and `builder/`, including files the build never reads, so editing a `builder/PLAN-*.md` also marks the tree stale. Rebuild.

### Chromium is not installed

`book.bat` needs the Chromium that `npx puppeteer browsers install chrome` downloads, the same one `check.bat` and `test.bat` use. Without it the run stops before any phase starts, with a bare Node error and no `[render-book]` prefix:

    Error: Could not find Chrome (ver. <version>). This can occur if either
     1. you did not perform an installation before running the script (e.g. `npx puppeteer browsers install chrome`) or
     2. your cache path is incorrectly configured (which is: <cache path>).
    For (2), check out our guide on configuring puppeteer at https://pptr.dev/guides/configuration.

`<version>` is the Chrome build the installed `puppeteer` pins and `<cache path>` is the machine's own. The exit code is 2.

**`book.bat`'s `npm install` does not fix this.** It runs only when `node_modules\puppeteer\package.json` is absent. `puppeteer`'s postinstall script downloads Chromium, so an install with `--ignore-scripts` or `PUPPETEER_SKIP_DOWNLOAD` set, or a cleared puppeteer cache, leaves the package in place and the browser missing. Install the browser yourself; see [Building and Deployment](Building#requirements).

### Images

Images abort two different commands.

**`pdf: missing image <path>` aborts Phase 8**, inside `build.bat`. The usual cause is a raw `<img>` tag with a page-relative `src`: the book flattens every page into one document, so `Images/x.png` resolves against the book root, not the page's folder. The markdown form is rewritten to a section-qualified path; the raw tag is not. See [Images](Authoring#images) in the authoring guide. Spaces in the file name are not a cause.

**`paged.js (forked): image not loaded at render time` aborts Phase 1**, inside `book.bat`:

    paged.js (forked): image not loaded at render time. This branch
    dropped async image-loading support; the render pipeline must finish
    loading all images before calling paged.js. Image: <src>

The fork has no async image loading, so every image must finish loading before `PagedPolyfill.preview()` runs. The render waits for that only for files inside `_site-pdf/`, not for anything fetched over the network. For that reason the build refuses a remote `<img src>`.

The fork checks fonts the same way:

    paged.js (forked): font-face '<family>' is not ready (status=loading)

Only the `loading` and `error` states are rejected. A face `print.css` declares but the render never uses stays `unloaded`, which is not a fault.

### Exit codes

`render-book.mjs` has two, and no 1:

| Code | Meaning |
|---|---|
| `0` | The PDF was written. |
| `2` | The run could not produce the PDF: a refused command line (an unknown flag, a flag without its value or with an empty one, a `-t` that is not a whole number of milliseconds from 0 to 2147483647, a second input file, or a missing `<input.html>` or `-o`), a file the run needs that does not exist (the input HTML, `lib/paged.browser.js`, `lib/progress-handler.js`, or an `--additional-script` path), a render that threw, or a crash. |

`node book/render-book.mjs --help` ends with the same codes.

**`book.bat` passes the renderer's exit code on**, so a script can check it directly. So can reading `render-book.mjs`'s exit code or watching for the `saved:` line.

**`book.bat`'s own pre-flight refusals never reach the renderer, and they share its 2.** [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) exits 2 for an absent `_site-pdf/` and 1 for a stale one, and a failed `npm install` exits 1. A script sees from `book.bat`:

| Code | Sources |
|---|---|
| `0` | The PDF was written. |
| `1` | A stale `_site-pdf/`, or a failed `npm install`. |
| `2` | `_site-pdf/` is absent, or the render failed. |

Code 1 is unambiguous, because the renderer has no 1. For code 2, stderr tells the cases apart: a pre-flight refusal prints one message beginning `check_tree_fresh:` and nothing after it.

**`build.bat && book.bat` skips the render whenever the link and integrity check reports anything.** That check sets a non-zero exit code while still writing a complete tree, so `&&` suppresses the book over an unrelated broken link. Run the two as separate statements.

## render-book.mjs

`book/render-book.mjs` runs the three phases. Its helpers live in `book/lib/`.

### Phase 1: Render

Opens a headless Chromium instance, loads `book.html` under `file://`, and calls `PagedPolyfill.preview()` to run the CSS Paged Media layout engine. When it returns, the DOM contains one `.pagedjs_page` element per output PDF page.

**Chromium launch flags:**

| Flag | Why |
|---|---|
| `--allow-file-access-from-files` | paged.js fetches `print.css` via XHR from a `file://` URL; without the flag Chrome rejects the request. |
| `--disable-gpu` + `--disable-software-rasterizer` | Shrinks the GPU process from ~100 MB to ~16 MB and cuts ~5 s off the generate phase. |

After `page.goto()` and before loading any scripts, the driver injects:

```js
window.PagedConfig = { auto: false };
```

This stops paged.js running automatically when its bundle loads. The driver then injects scripts in order via `page.addScriptTag()`:

1. `lib/paged.browser.js` --- the paged.js CSS Paged Media polyfill.
2. `lib/progress-handler.js` --- logs `[render-progress] page=N elapsed=Xs` to the browser console after each page is laid out.
3. Any `--additional-script` paths (production adds `perf/detach-pages.js`).

`PagedPolyfill.preview()` is then called via `page.evaluate()`. The call is synchronous; the `await` is only the CDP round-trip.

`perf/detach-pages.js` removes each finalised page from the DOM right after layout and restores all pages in order at `afterRendered`. This keeps `getBoundingClientRect` (which paged.js calls per page) at ~0.7 ms/page instead of climbing towards ~8 ms/page by the last chapters. CSS counters break across detached pages, so `print.css` uses `var(--page-num)` (a custom property paged.js writes per page) instead of `counter(page)` for running page numbers.

### Phase 2: Generate

Extracts document metadata and builds the outline tree, then calls `page.pdf()` to generate the raw PDF from Chromium's internal writer.

**Meta extraction** via `page.evaluate()` returns:

```js
{
  title:  string,   // <title> text content
  lang:   string,   // <html lang="..."> value
  [name]: string,   // one entry per <meta name="..."> tag
}
```

**Outline extraction** via `parseOutline(page, outlineTags)` (see [`outline.mjs`](#outlinemjs)) returns a nested `OutlineNode[]` tree.

**PDF generation** via `page.pdf()`:

```js
page.pdf({
  printBackground:     true,
  displayHeaderFooter: false,
  preferCSSPageSize:   true,   // use the A4 size from print.css @page rules
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
})
```

`preferCSSPageSize: true` makes Chromium use the dimensions declared in `print.css`. The call returns only when the whole document is done; a 500 ms heartbeat writes an elapsed counter to stdout on TTYs during the ~50 s call.

### Phase 3: Process

Adds a bookmark tree and document metadata to the raw PDF from Chromium, then saves the final output. The raw buffer has no `/Outlines` entry and carries Chromium's default metadata. Four operations run in sequence:

1. **`measureRawPdf(rawPdf)`** --- traverses the raw bytes without allocating objects. Returns `dictSlots` and `arraySlots` counts used to pre-size two shim backing arrays (see [`measure-pass.mjs`](#measure-passmjs)).

2. **`PDFDocument.load(rawPdf)`** --- parses the raw PDF into pdf-lib's in-memory model, using the fast-* shims (see [pdf-lib Patches](Fixes/PDFLib)).

3. **`setMetadata(pdfDoc, meta)`** and **`setOutline(pdfDoc, outline)`** --- write the `/Info` dict and the `/Outlines` tree (see [`postprocesser.mjs`](#postprocessermjs) and [`outline.mjs`](#outlinemjs)).

4. **`parallelSave(pdfDoc, { objectsPerStream: 500 })`** --- serialises the document, running deflate concurrently on libuv's thread pool (see [`parallel-deflate.mjs`](#parallel-deflatemjs)).

## lib/ reference

### outline.mjs

Two exports: `parseOutline` runs inside the browser via puppeteer; `setOutline` runs in Node against a pdf-lib document.

**`parseOutline(page, tags)`** --- queries `document.querySelectorAll(tags.join(','))`, traverses the results in document order, and builds a nested tree. Each node:

```js
// OutlineNode
{
  title:       string,        // heading innerText, HTML-stripped
  destination: string,        // percent-encoded heading id (# → #25)
  children:    OutlineNode[],
  closed?:     true,          // present when the heading or its ancestor
                               // article carries data-pdf-bookmark-closed
}
```

The function also injects a hidden `<div>` of `<a href="#id">` links for every heading before `<body>`. Without them Chromium's PDF writer registers no named destinations, and the outline's `/Dest` entries resolve nowhere.

`closed` nodes produce a negative `/Count`, which PDF readers show as a collapsed bookmark.

**`setOutline(pdfDoc, outline, enableWarnings?)`** --- writes a linked `PDFDict` per outline node and sets `pdfDoc.catalog.Outlines` to the root reference. Each node's `Dest` is a PDF name that Chromium's `/Dests` catalog maps to a page number and coordinates.

### postprocesser.mjs

**`setMetadata(pdfDoc, meta)`** --- writes the `/Info` dict entries from the meta object collected in Phase 2. Sets `ModDate` to the current time, appends `" + Paged.js"` to Chromium's `Creator` string and keeps Chromium's `"Skia/PDF mXX"` `Producer`.

**`setTrimBoxes(pdfDoc, pages)`** --- sets per-page `/TrimBox` entries from the box data `PagedPolyfill` exposes. The production pipeline does not call it (pages have no bleed).

### measure-pass.mjs

**`measure(bytes)`** --- walks a raw PDF buffer, parsing the PDF grammar (indirect objects, dicts, arrays, streams, embedded ObjStms) without instantiating any PDFObject. Returns:

```js
{
  indirectObjects:    number,
  dicts:              number,
  dictSlots:          number,   // total key + value slots across all dicts
  arrays:             number,
  arraySlots:         number,   // total element slots across all arrays
  refs:               number,
  names:              number,
  numbers:            number,
  strings:            number,
  hexStrings:         number,
  streams:            number,
  objStms:            number,
  objStmInner:        number,
  maxDictSlots:       number,
  maxArraySlots:      number,
  maxRecursion:       number,
  totalStreamBytes:   number,
  totalInflatedBytes: number,
}
```

`dictSlots` and `arraySlots` are passed to `setExpectedDictSlots()` and `setExpectedArraySlots()` on the fast-dict-onebuf and fast-array-onebuf shims before `PDFDocument.load()`, so each shim pre-allocates its backing array and V8 never resizes it during parse.

The internal `Measurer` class keeps per-dict state (`/Length`, `/Type`, `/N`, `/First`) on depth-indexed `Int32Array` / `Uint8Array` stacks. Stack depth is 64; the book reaches 4.

### parallel-deflate.mjs

**`parallelSave(pdfDoc, opts?)`** --- replacement for `pdfDoc.save({ useObjectStreams: true })`. Runs the same pre-serialize steps as `PDFDocument.save()` (`flush`, `updateFieldAppearances`), then a custom `ParallelStreamWriter` splits the save into three phases:

1. **Classify** --- same logic as pdf-lib's `PDFStreamWriter.computeBufferSize`. Partitions indirect objects into `uncompressedObjects` (PDF streams, encrypted refs, gen-number ≠ 0) and `compressedChunks` (everything else, in chunks of `objectsPerStream`).

2. **Parallel deflate** --- instantiates all `PDFObjectStream` objects, then runs `Promise.all(streams.map(s => deflateAsync(s.getUnencodedContents())))` on libuv's thread pool. Results go into each stream's `contentsCache.value`, so phase 3 finds only cache hits.

3. **Size and emit** --- same as upstream. The xref stream, which depends on byte offsets pinned in this phase, is deflated synchronously with `deflateSync` once its content is final.

Default options and their production values:

```js
{
  objectsPerStream: 50,          // production: 500
  encodeStreams:    true,
  parallel:         true,
  addDefaultPage:   true,
  updateFieldAppearances: true,
}
```

`objectsPerStream: 500` (the production value) produces ~5% smaller PDFs than the pdf-lib default of 50, because larger groups share more repeated strings.

Returns `{ bytes: Uint8Array, streamCount: number }`.

### progress-handler.js

A minimal in-browser script that registers a `Paged.Handler` subclass with one hook:

```js
class ProgressHandler extends Paged.Handler {
  afterPageLayout(_pageElement, _page, _breakToken) {
    this.count++;
    const elapsed = ((performance.now() - start) / 1000).toFixed(1);
    console.log(`[render-progress] page=${this.count} elapsed=${elapsed}`);
  }
}
Paged.registerHandlers(ProgressHandler);
```

`render-book.mjs` intercepts these console messages via `page.on('console', ...)` and writes a `\r`-overwriting progress line to stdout on TTYs, or one line per 100 pages when stdout is piped.

## paged.browser.js

`book/lib/paged.browser.js` is a vendored, patched copy of [Paged.js](https://pagedjs.org/) v0.4.3 (MIT), a CSS Paged Media polyfill. It reads `@page` rules from the linked stylesheet, breaks the document into DOM pages, resolves CSS counters, and copies running headers and footers from `string-set` declarations into each page's margin boxes. Chromium then renders the resulting DOM into a PDF.

### Global API

Two globals control the polyfill:

**`window.PagedConfig`** --- configuration object read at load time.

| Key | Type | Description |
|---|---|---|
| `auto` | `boolean` | When `false`, paged.js does not run automatically when the bundle loads. The driver sets this before injecting the bundle. |

**`window.PagedPolyfill`** --- the main polyfill object, available after the bundle loads.

| Member | Description |
|---|---|
| `PagedPolyfill.preview()` | Runs the full layout pipeline. In the vendored bundle this is fully synchronous. |

### Handler system

A handler is a class that extends `Paged.Handler`, registered with `Paged.registerHandlers()` before `preview()` is called, to observe or intercept layout.

```js
class MyHandler extends Paged.Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
  }
  afterPageLayout(pageElement, page, breakToken) {
    // fires after each page is fully laid out
  }
}
Paged.registerHandlers(MyHandler);
```

Key lifecycle hooks (all optional overrides):

| Hook | Signature | When it fires |
|---|---|---|
| `beforeParsed` | `(content)` | Before the source document is processed. |
| `afterParsed` | `(parsed)` | After the source document has been processed, before layout begins. |
| `beforePageLayout` | `(page)` | Before a new page is laid out. |
| `afterPageLayout` | `(pageElement, page, breakToken)` | After each page is fully laid out. `pageElement` is the `.pagedjs_page` DOM node; `breakToken` holds the position where the next page starts. |
| `finalizePage` | `(pageElement, page, breakToken)` | After a page is finalised. Called slightly later than `afterPageLayout`; used by `detach-pages.js` to remove the previous page from the DOM. |
| `afterRendered` | `(pages)` | After all pages have been rendered, before `page.pdf()` runs. Used by `detach-pages.js` to restore pages in document order. |

### DOM output

After `preview()` completes, the document contains:

- A `.pagedjs_pages` container added to `<body>`, wrapping all pages.
- One `.pagedjs_page` per output PDF page. Each page contains `.pagedjs_area > .pagedjs_content` with the sliced chapter content.
- Margin boxes rendered from `@page` margin rules (`@top-right`, `@bottom-right`, etc.) carrying `string-set`-tracked running headers and footer page numbers.

`render-book.mjs` reads the page count after `preview()`:

```js
document.querySelectorAll('.pagedjs_pages > .pagedjs_page').length
```

### Synchronous rendering

Upstream paged.js yields to the browser event loop every 100 objects. The vendored bundle removes these yields, making `preview()` a single synchronous call. The `await page.evaluate(...)` in the driver is only the CDP round-trip.

### CSS interop

Paged.js fetches the linked stylesheet via XHR to extract `@page` rules. Under `file://`, Chrome blocks this unless Chromium is launched with `--allow-file-access-from-files`.

The key `@page` rules in `docs/assets/css/print.css` that paged.js acts on:

| Rule | Effect |
|---|---|
| `@page { size: A4; margin: 22mm; }` | Base page size and margins. |
| `@page { @bottom-right { content: string(part-title) " - " var(--page-num); } }` | Footer: part name and page number. |
| `@page { @top-right { content: string(chapter-title); } }` | Running header: current chapter title. |

`string(chapter-title)` is populated by the hidden `.header-string` `<span>` at the start of each `<article class="page">`, where `print.css` sets `string-set: chapter-title content(text)`. `var(--page-num)` is a custom property paged.js writes to each `.pagedjs_page` element during layout; `counter(page)` breaks when `detach-pages.js` removes finalised pages.

## See Also

- [Book Configuration](Book-Configuration) -- the `_book.yml` manifest that controls what goes into `book.html`.
- [Pipeline Stages](Pipeline-Stages) -- the `pdf.mjs` and `book.mjs` interface contracts for Phase 8.
- [tbdocs Builder](Builder) -- design rationale for Phase 8 in the tbdocs pipeline.
- [pdf-lib Patches](Fixes/PDFLib) -- detailed description of each `fast-*.mjs` shim: upstream problem, fix, and mechanism.
- [Paged.js Patches](Fixes/PagedJS) -- detailed description of every patch to `paged.browser.js`.
