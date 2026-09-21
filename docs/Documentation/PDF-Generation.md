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

The book currently runs to a little under 2,000 pages. Page counts quoted in the performance notes --- [paged.js Fixes](Fixes/PagedJS) and [pdf-lib Fixes](Fixes/PDFLib) --- are the size of the book when that measurement was taken, not its size now.

The two stages are decoupled: `tbdocs` builds `_site-pdf/` as part of its normal run; `render-book.mjs` runs only when `book.bat` calls it explicitly. This keeps `puppeteer` and `pdf-lib` --- both large --- out of the site generator's dependency tree.

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
| `-t` / `--timeout` | `0` (disabled) | Per-operation puppeteer timeout in milliseconds. |
| `--additional-script` | --- | Inject an extra in-page script after the paged.js bundle. Repeatable. |

`book.bat` runs the standard production invocation:

```batch
node book\render-book.mjs docs\_site-pdf\book.html -o "docs\_pdf\twinBASIC Book.pdf" --outline-tags h1,h2,h3,h4 --additional-script perf\detach-pages.js
```

Every path there is relative to the repository root, which is where `book.bat` lives and what its `@pushd "%~dp0"` selects.

Always run `build.bat` first to populate `_site-pdf/`.

## When the render fails
{: #render-troubleshooting }

`book.bat` takes around two minutes and has more ways to stop than anything else in the repository. Two questions get you to the cause: which of the three phases stopped, and whether the run failed or is still working.

### Which phase stopped

Each phase prints one summary line as it completes, all aligned to the same column:

    render:   <elapsed>  (<n> pages)
    generate: <elapsed>  (raw <n> MB)
    process:  <elapsed>
    saved:    <output path>  (<n> MB)
    total:    <elapsed>

The last line printed is the last phase that finished, so the failure is in the one after it. No `render:` line means [Phase 1](#phase-1-render); `render:` but no `generate:` means [Phase 2](#phase-2-generate); `generate:` but no `process:` means [Phase 3](#phase-3-process). `process:` with no `saved:` means the PDF was built and the write to disk failed, after every expensive phase has already run. `render-book.mjs` writes the file directly and never creates the directory above it, so an absent `docs/_pdf/` raises `ENOENT` here --- which is what `book.bat`'s `mkdir` exists to prevent, and what a hand-written invocation has to do for itself. On Windows the other common cause is the output file being open in a PDF viewer.

### Stalled, or still working

`-t` defaults to `0`, which the driver passes straight to `page.setDefaultTimeout()`, and `0` disables it. Navigation and element waits therefore never give up, so a stalled render stalls until you interrupt it. Pass `-t 600000` to get an error instead of a hang.

Live progress is what separates a stall from ordinary slowness. It differs per phase, and per whether stdout is a terminal:

| Phase | Live output | What silence means |
|---|---|---|
| Render | `rendering: <n> pages (<elapsed>s)`, rewritten in place on a terminal; one line per 100 pages when stdout is piped | A count that has stopped advancing is a layout stall. A run that never printed a count stopped earlier than that --- before `PagedPolyfill.preview()` finished its first page. |
| Generate | `generating: <elapsed>s`, a heartbeat every 500 ms, **on a terminal only** | Nothing is wrong. `page.pdf()` buffers the whole document internally and returns it at the end, so a piped run has no output at all for the length of the call. |
| Process | none | Nothing is wrong. The pdf-lib round trip reports only when it finishes. |

The renderer relays three kinds of in-browser fault, each with its own prefix:

- **`[request failed] <url> <errorText>`** --- Chromium could not load a resource. Under `file://` a file missing from `_site-pdf/` appears here as `net::ERR_FILE_NOT_FOUND` with its path, which is the quickest way to spot an incomplete Phase 8 tree.
- **`[page error] <message>`** --- an uncaught exception inside the page.
- **`[render-book] error: <error>`** --- the top-level catch. It closes the browser and sets the exit code to 1.

A paged.js stylesheet fetch that fails arrives as `error on LINK: <url>`. paged.js throws an undecorated `ProgressEvent` there; the driver unwraps it so the message carries the URL.

### Most of these failures belong to `build.bat`

`_site-pdf/` is `build.bat`'s output, so a render that stops before Chromium starts is reporting on the previous command.

`book.bat` refuses to run at all when the assembled HTML is absent:

    docs\_site-pdf\book.html not found. Run build.bat first.

Besides never having run the build, four things produce that: `build.bat --no-pdf`, `also_build_pdf: false` in `_config.yml`, a session where only `serve.bat` ran (it writes `docs/_serve/` and skips the PDF pass), and a Phase 8 that aborted. Phase 8 aborts on three things:

- **``Phase 8: no page with `layout: book-combined` found``** --- or `multiple pages with ... found`, naming them. Exactly one page must carry that layout, and `docs/book.html` is it.
- **`pdf: required font <path> is not in the source tree`** --- names `scripts/build_fonts.py`. `print.css` declares six faces and all six are copied into the sparse tree, so a subset regenerated but not committed fails here.
- **`pdf: missing image <path> (referenced from book.html, not present under source tree)`** --- one line per path, then a summary naming the count. This is the one that fires in practice. `--tolerate-missing-images` downgrades it to a warning.

Nothing checks that `_site-pdf/` is *current*. `book.bat` tests only that `book.html` exists, and [`check_tree_fresh.mjs`](Tools#check-tree-fresh) --- the gate that refuses a stale tree --- reads `_site-offline/`. Render after a content edit without rebuilding and you get the previous build's book, with nothing said about it.

### Images

Images abort two different commands for two different reasons.

**`pdf: missing image <path>` aborts Phase 8**, inside `build.bat`. The usual cause is a raw `<img>` tag with a page-relative `src`: the book flattens every page into one document, so `Images/x.png` resolves against the book root rather than the page's folder. The markdown form is rewritten to a section-qualified path; the raw tag is not. See [Images](Authoring#images) in the authoring guide.

**`paged.js (forked): image not loaded at render time` aborts Phase 1**, inside `book.bat`:

    paged.js (forked): image not loaded at render time. This branch
    dropped async image-loading support; the render pipeline must finish
    loading all images before calling paged.js. Image: <src>

The fork removed async image loading to keep the layout chain synchronous, so every image must have finished loading before `PagedPolyfill.preview()` runs. `page.goto(..., { waitUntil: 'load' })` guarantees that for files inside `_site-pdf/` and cannot guarantee it for anything fetched over the network. That is why the build refuses a remote `<img src>` unconditionally rather than letting the book discover it: the render raises instead of degrading to a missing picture.

The same fork checks fonts on the same principle:

    paged.js (forked): font-face '<family>' is not ready (status=loading)

`loadFonts()` rejects `loading` and `error` only. A face `print.css` declares but this render never sets any text in stays at `unloaded` forever, which is the browser correctly declining to download something nothing needs, and is not a fault.

### Exit codes

`render-book.mjs` has three:

| Code | Meaning |
|---|---|
| `0` | The PDF was written. |
| `1` | A file the run needs is missing --- the input HTML, `lib/paged.browser.js`, `lib/progress-handler.js`, or an `--additional-script` path --- or the render threw. |
| `2` | Bad arguments: an unrecognised flag, or a missing `<input.html>` or `-o`. |

**`book.bat` propagates all three.** It copies `%ERRORLEVEL%` into a variable immediately after the renderer runs and exits with that variable once `popd` has restored the caller's directory --- the same pattern `build.bat` and `check.bat` already used. A batch file's exit code is otherwise its last command's, and an unguarded `popd` resets `ERRORLEVEL` to `0`; `book.bat` used to end on a bare `popd`, so a failed render always reported success to whatever launched it. A script can check `book.bat`'s own exit code directly now. Calling `node book\render-book.mjs` directly and reading its exit code, or watching for the `saved:` line, remain equally valid.

One case runs the other way and is worth stating on its own: **`build.bat && book.bat` skips the render whenever the link and integrity check reports anything.** That check sets a non-zero exit code while still writing a complete tree, so `&&` suppresses the book over a broken link that has no bearing on it. Run the two as separate statements.

## render-book.mjs

`book/render-book.mjs` runs the three phases. Its helpers live in `book/lib/`.

### Phase 1: Render

Opens a headless Chromium instance, loads `book.html` under `file://`, and calls `PagedPolyfill.preview()` to run the CSS Paged Media layout engine. When it returns, the DOM contains one `.pagedjs_page` element per output PDF page.

**Chromium launch flags:**

| Flag | Why |
|---|---|
| `--allow-file-access-from-files` | paged.js fetches `print.css` via XHR from a `file://` URL. Without this flag Chrome rejects the request. |
| `--disable-gpu` + `--disable-software-rasterizer` | Shrinks the GPU process from ~100 MB to ~16 MB and cuts ~5 s off the generate phase by letting Skia skip a GPU init path. |

After `page.goto()` and before loading any scripts, the driver injects:

```js
window.PagedConfig = { auto: false };
```

This prevents paged.js from running automatically when its bundle loads. Then it injects scripts in order via `page.addScriptTag()`:

1. `lib/paged.browser.js` --- the paged.js CSS Paged Media polyfill.
2. `lib/progress-handler.js` --- registers a handler that logs `[render-progress] page=N elapsed=Xs` to the browser console after each page is laid out.
3. Any `--additional-script` paths (production adds `perf/detach-pages.js`).

`PagedPolyfill.preview()` is called next via `page.evaluate()`. In the vendored bundle the call is fully synchronous; the `await` on `page.evaluate()` is just the CDP round-trip puppeteer needs to bring the result back to Node.

`perf/detach-pages.js` implements the aggressive-detach optimisation: it physically removes each finalised page from the DOM immediately after layout, then restores all pages in order at `afterRendered`. This keeps `getBoundingClientRect` (which paged.js calls per page) at ~0.7 ms/page flat instead of climbing towards ~8 ms/page by the last chapters of a book this long. CSS counters break across detached pages, so `print.css` uses `var(--page-num)` (a custom property paged.js writes per page) rather than `counter(page)` for running page numbers.

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

`preferCSSPageSize: true` makes Chromium use the dimensions declared in `print.css` rather than a hardcoded default. The call buffers the entire document internally before returning --- there is no intermediate progress signal. A 500 ms heartbeat writes an elapsed counter to stdout on TTYs while the ~50 s call runs.

### Phase 3: Process

Augments the raw PDF from Chromium with a bookmark tree and document metadata, then saves the final output.

The raw buffer from `page.pdf()` is a valid but minimal PDF: it has no `/Outlines` entry and contains Chromium's default metadata. The process phase runs four operations in sequence:

1. **`measureRawPdf(rawPdf)`** --- traverses the raw bytes without allocating any objects. Returns `dictSlots` and `arraySlots` counts used to pre-size two shim backing arrays before the load (see [`measure-pass.mjs`](#measure-passmjs)).

2. **`PDFDocument.load(rawPdf)`** --- parses the raw PDF into pdf-lib's in-memory model. The fast-* shims (see [pdf-lib Patches](Fixes/PDFLib)) are already active from the import block; this call uses their optimised data structures.

3. **`setMetadata(pdfDoc, meta)`** and **`setOutline(pdfDoc, outline)`** --- write the `/Info` dict and the `/Outlines` tree into the document (see [`postprocesser.mjs`](#postprocessermjs) and [`outline.mjs`](#outlinemjs)).

4. **`parallelSave(pdfDoc, { objectsPerStream: 500 })`** --- serialises the modified document to bytes, running deflate concurrently on libuv's thread pool (see [`parallel-deflate.mjs`](#parallel-deflatemjs)).

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

The function also injects a hidden `<div>` of `<a href="#id">` links before `<body>` for every heading. Without these, Chromium's PDF writer does not register named destinations, so the `/Dest` entries in the outline would resolve nowhere.

`closed` nodes produce a negative `/Count` in the PDF `/Outlines` tree, which PDF readers use to display the bookmark collapsed.

**`setOutline(pdfDoc, outline, enableWarnings?)`** --- allocates a PDF reference for each outline node via `pdfDoc.context.nextRef()`, writes a linked `PDFDict` per node, and sets `pdfDoc.catalog.Outlines` to the root reference. Each node's `Dest` is a PDF name that Chromium's `/Dests` catalog maps to a page number and coordinates.

### postprocesser.mjs

**`setMetadata(pdfDoc, meta)`** --- writes standard `/Info` dict entries from the meta object collected in Phase 2. Always sets `ModDate` to the current time. Appends `" + Paged.js"` to the `Creator` string inherited from Chromium and retains Chromium's `"Skia/PDF mXX"` `Producer` string.

**`setTrimBoxes(pdfDoc, pages)`** --- sets per-page `/TrimBox` entries from the box data `PagedPolyfill` exposes. Not called in the production pipeline (pages have no bleed), but available for print-ready output with crop marks.

### measure-pass.mjs

**`measure(bytes)`** --- a no-allocate byte walker over a raw PDF buffer. Parses the PDF grammar (indirect objects, dicts, arrays, streams, embedded ObjStms) without instantiating any PDFObject. Returns:

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

`dictSlots` and `arraySlots` are passed to `setExpectedDictSlots()` and `setExpectedArraySlots()` on the fast-dict-onebuf and fast-array-onebuf shims. Calling these before `PDFDocument.load()` lets each shim pre-allocate its backing array to the measured size, eliminating V8 growth resizes during parse.

The internal `Measurer` class keeps per-dict state (`/Length`, `/Type`, `/N`, `/First`) on depth-indexed `Int32Array` / `Uint8Array` stacks rather than per-object heap records. Stack depth is 64; maximum observed on the book is 4.

### parallel-deflate.mjs

**`parallelSave(pdfDoc, opts?)`** --- replacement for `pdfDoc.save({ useObjectStreams: true })`. Runs the same pre-serialize steps as `PDFDocument.save()` (`flush`, `updateFieldAppearances`), then invokes a custom `ParallelStreamWriter` that splits the save into three phases:

1. **Classify** --- same logic as pdf-lib's `PDFStreamWriter.computeBufferSize`. Partitions indirect objects into `uncompressedObjects` (PDF streams, encrypted refs, gen-number ≠ 0) and `compressedChunks` (everything else, grouped into chunks of `objectsPerStream`).

2. **Parallel deflate** --- instantiates all `PDFObjectStream` objects, then fires `Promise.all(streams.map(s => deflateAsync(s.getUnencodedContents())))`. Each deflate runs on libuv's thread pool. Results are written directly into each stream's `contentsCache.value` so Phase 3 finds only cache hits.

3. **Size and emit** --- same as upstream. Every `computeIndirectObjectSize` call is a Phase 2 cache hit. The xref stream (which depends on byte offsets pinned in Phase 3) is deflated synchronously via `deflateSync` immediately after its content is finalised.

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

`objectsPerStream: 500` (the production value) produces ~5% smaller PDFs than the pdf-lib default of 50 because a larger deflate window captures more repeated strings across grouped objects.

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

`book/lib/paged.browser.js` is a vendored, lightly patched copy of [Paged.js](https://pagedjs.org/) v0.4.3 (MIT). Paged.js is a CSS Paged Media polyfill: it reads `@page` rules from the linked stylesheet, breaks the document into discrete DOM pages, resolves CSS counters, and copies running headers and footers from `string-set` declarations into each page's margin boxes. Chromium then renders the resulting DOM into a PDF.

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

Paged.js provides a plugin API for observing and intercepting the layout process. A handler is a class that extends `Paged.Handler` and is registered via `Paged.registerHandlers()` before `preview()` is called.

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

In upstream paged.js, the layout process yields to the browser event loop every 100 objects. The vendored bundle removes these yield gates, making `preview()` a single synchronous call. Since the renderer runs inside headless Chromium where browser responsiveness is irrelevant, this is safe.

The `await page.evaluate(...)` wrapper in the driver is a puppeteer requirement for the CDP round-trip --- not a sign that `preview()` is async. The CDP response arrives only after the synchronous execution inside Chromium is fully complete.

### CSS interop

Paged.js fetches the linked stylesheet via XHR to extract `@page` rules. Under `file://`, Chrome blocks this unless `--allow-file-access-from-files` is passed to Chromium at launch.

The key `@page` rules in `docs/assets/css/print.css` that paged.js acts on:

| Rule | Effect |
|---|---|
| `@page { size: A4; margin: 22mm; }` | Base page size and margins. |
| `@page { @bottom-right { content: string(part-title) " - " var(--page-num); } }` | Footer: part name and page number. |
| `@page { @top-right { content: string(chapter-title); } }` | Running header: current chapter title. |

`string(chapter-title)` is populated by the hidden `.header-string` `<span>` at the start of each `<article class="page">`, where `print.css` sets `string-set: chapter-title content(text)`. `var(--page-num)` is a CSS custom property that paged.js writes to each `.pagedjs_page` element during layout; `counter(page)` would be the natural choice but breaks when `detach-pages.js` removes finalised pages from the DOM, so the custom property is used instead.

## See Also

- [Book Configuration](Book-Configuration) -- the `_book.yml` manifest that controls what goes into `book.html`.
- [Pipeline Stages](Pipeline-Stages) -- the `pdf.mjs` and `book.mjs` interface contracts for Phase 8.
- [tbdocs Builder](Builder) -- design rationale for Phase 8 in the tbdocs pipeline.
- [pdf-lib Patches](Fixes/PDFLib) -- detailed description of each `fast-*.mjs` shim: upstream problem, fix, and mechanism.
- [Paged.js Patches](Fixes/PagedJS) -- detailed description of every patch to `paged.browser.js`.
