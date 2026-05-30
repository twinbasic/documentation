---
title: tbdocs Builder
parent: Documentation Development
nav_order: 4
has_children: true
has_toc: false
permalink: /Documentation/Development/Builder
---

# tbdocs Builder
{: .no_toc }

Detailed technical documentation for the `tbdocs` static site generator at [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). Read this when modifying the build pipeline itself; content contributors who only need to build, preview, and ship documentation should not need any of it.

Module-level documentation lives next to the code:

- [`builder/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/README.md) --- quickstart and the per-module map.
- [`builder/PLAN.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN.md) --- architecture overview and the full eleven-phase pipeline.
- [`builder/PLAN-1.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-1.md) through [`PLAN-11.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-11.md) --- per-phase specs: inputs, outputs, edge cases, acceptance checks.
- [`builder/FUTURE-WORK.md`](https://github.com/twinbasic/documentation/blob/main/builder/FUTURE-WORK.md) --- open follow-ups, grouped by divergence investigations / deferred enhancements.

Sub-pages:

- [Pipeline Stages](Pipeline-Stages) --- complete interface reference: function signatures, per-stage reads/writes, and every exported symbol.
- [Book Configuration](Book-Configuration) --- `_book.yml` key reference for the PDF chapter manifest.
- [Extending the Builder](Extending) --- tutorial for adding a new pipeline stage or a markdown-it plugin.

* TOC goes here
{:toc}

## Why tbdocs exists

The site was originally built with **Jekyll** + the **just-the-docs** theme. The eleven-phase port to Node.js + a tiny dependency set produces byte-equivalent output to Jekyll modulo a documented allow-list. The win is end-to-end build time (~11s → ~3s) and a 25x faster GENERATE phase --- ten Ruby plugins totalling ~1,460 lines collapsed into four JS modules of ~650 lines. The Ruby toolchain (Gemfile, `_plugins/`, `_includes/`, `_layouts/`, `_sass/`) was retained in tree for one release cycle as reference after the cutover, then dropped --- the project no longer depends on Ruby in any form.

## Architecture

One entry point, ~17 production modules. The content model is fixed (markdown + YAML frontmatter), the output structure is fixed (three trees), the template is one layout with variations.

| File | Role |
|---|---|
| [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs) | Entry point. Parses CLI flags, dispatches to `runBuild` or `runServe`, prints per-phase timings. |
| [`serve.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/serve.mjs) | Phase 12 dev server: HTTP static file server + recursive watcher + SSE live-reload. |
| [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs) | Phase 1. Traverses `docs/`, parses frontmatter, classifies each file as a page or a static file. |
| [`nav.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/nav.mjs) | Phase 2 nav substeps: nav-path, integrity check, nav tree, nav levels, breadcrumbs, children. |
| [`seo.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/seo.mjs) | Phase 2 SEO precompute: per-page title / canonical / og: tags. |
| [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) | Phase 2 book chapter resolution + Phase 8 book.html assembly. |
| [`build-info.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/build-info.mjs) | Phase 2 git commit hash + commit date capture. |
| [`data.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/data.mjs) | Phase 2 `_book.yml` loader. |
| [`mermaid.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/mermaid.mjs) | Phase 11 (B1) preprocess: `.mmd` → `.svg` regeneration. |
| [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs) | Phase 11 (B3) preprocess: compiles `docs/assets/css/just-the-docs-combined.scss` via Dart Sass into the just-the-docs stylesheet. |
| [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) | Phase 3 markdown-it pipeline: GFM admonitions, kramdown-style attributes, deflist, footnotes, header IDs, TOC, relative-link rewriting. |
| [`highlight.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) | Phase 3 Shiki bootstrap plus the twinBASIC grammar. Emits the just-the-docs wrapper structure. |
| [`highlight-theme.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) | Phase 11 (B2) theme loader: reads `themes/*.theme`, derives the palette, emits `tb-highlight.css` and the scope-to-class lookup. |
| [`template.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) | Phase 4 layout. Replaces ~13 Liquid includes with direct JS string concatenation. |
| [`compress.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) | Phase 4 HTML whitespace compression. |
| [`write.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs) | Phase 5 online tree writer. |
| [`paths.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/paths.mjs) | Shared permalink-to-destination-path helper. |
| [`redirects.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) | Phase 6 redirect-stub generator. |
| [`sitemap.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) | Phase 6 sitemap.xml + robots.txt. |
| [`search.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) | Phase 6 Lunr index emitter (`search-data.json`). |
| [`offline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) | Phase 7 offline tree: URL rewriting, JS patching for `file://` browsing. |
| [`pdf.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs) | Phase 8 sparse PDF source tree. |
| [`scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scheduler.mjs) | Task-graph scheduler: `Scheduler` class + `SharedState`. Tracks dependencies, dispatches tasks to the main thread or worker pool. |
| [`worker-pool.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/worker-pool.mjs) | `WorkerPool` --- minimal `node:worker_threads` pool with named dispatch and idle/busy bookkeeping. |
| [`cpu-worker.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/cpu-worker.mjs) | Worker harness: `parentPort` message dispatcher + four named handlers (`scss`, `mermaid`, `buildInfo`, `render`). |
| [`sab-broadcast.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-broadcast.mjs) | SharedArrayBuffer broadcast: `packShared` / `unpackShared` for the render fan-out's shared payload. |

`builder/` lives at the repo root (not under `docs/`) so it is not part of the Jekyll source tree the legacy renderer reads. The `build.bat` path writes to `docs/_site/`, `docs/_site-offline/`, and `docs/_site-pdf/` --- the same destinations Jekyll used, so deployment tooling stays unchanged. The `serve.bat` path writes to a separate `docs/_serve/` tree so a one-off `build.bat` run (refreshing the PDF, for example) never clobbers a running serve session's output.

## Build phases

| Phase | Module(s) | Job | Time |
|---|---|---|---|
| 1 | `discover.mjs` | Read `.md` / `.html` with frontmatter; enumerate static files | ~120 ms |
| 2 | `nav.mjs` / `seo.mjs` / `book.mjs` / `build-info.mjs` / `data.mjs` | Compute nav tree, SEO, book chapters, git commit info, `_book.yml` | ~60 ms |
| 3 | `render.mjs` + `highlight.mjs` | Markdown → HTML body | ~1-2 s |
| 4 | `template.mjs` + `compress.mjs` | Wrap in layout, anchor headings, compress whitespace | ~200 ms |
| 5 | `write.mjs` | Write `_site/` | ~400 ms |
| 6 | `redirects.mjs` / `sitemap.mjs` / `search.mjs` | Redirect stubs, sitemap.xml, search-data.json, robots.txt | ~100 ms |
| 7 | `offline.mjs` | URL-rewritten copy to `_site-offline/` | ~1,000 ms |
| 8 | `pdf.mjs` + `book.mjs` | Sparse `_site-pdf/` tree (book.html + CSS + images) | ~150 ms |

Phases 9, 10, and 11 are historical: Phase 9 was a no-output QoL pass, Phase 10 retired Jekyll, Phase 11 introduces the output-changing parity updates. None adds a runtime step. Phase 12 adds the `--serve` dev-server mode (a separate lifecycle, not a build phase; writes to `docs/_serve/` and skips the offline + PDF passes by default so the rebuild loop stays under one second). The per-phase `PLAN-N.md` files retain the implementation history.

## Scheduler and worker threads

The build pipeline is driven by a task-graph **scheduler** that models the pipeline as a DAG (directed acyclic graph) of tasks. Each task declares its predecessor task IDs, runs an `execute()` body, and routes its output to downstream tasks via a synchronous `submit()` callback. The scheduler dispatches tasks to either the main thread or a **worker pool** of `node:worker_threads`, depending on the task definition's `runOnMain` flag.

![Scheduler task DAG](/assets/images/mmd/scheduler-dag.svg)

**[M]** = runs on main thread; **[W]** = dispatched to a worker thread. Worker tasks overlap with the main-thread spine and with each other; main-thread tasks run serially within the main thread but can overlap with worker tasks.

Three structural wins over the earlier serial baseline:

1. **Seed tasks overlap with the main spine.** `scss` (~700 ms), `mermaid`, and `buildInfo` run on workers concurrently with the main-thread spine (discover → nav → markdownInit → seo → loadData → resolveBookChapters + buildInit). The spine takes ~250 ms total, so ~250 ms of `scss` hides behind it.
2. **Render + template fans out across CPUs.** The single-threaded render + template work (~3.5 s combined) splits into N page chunks, each dispatched to a worker that runs both `renderPhase` and `templatePhase` on its slice. On a 4-core machine this compresses to ~875 ms; on 8 cores, ~440 ms.
3. **`writeOffline` and `writePdf` overlap.** Both are `runOnMain` but their I/O-dominated `await` gaps interleave via cooperative async concurrency. The combined wall-clock equals `max(writeOffline, writePdf)` rather than their sum.

### Shared state and page deltas

The scheduler owns a `SharedState` instance that carries the master `pages[]`, `staticFiles[]`, `site` object, and a `pageByDest` lookup map. Main-thread tasks mutate `state.pages` directly --- no marshalling, no delta merge. Worker tasks receive structured-clone copies of their inputs and return **page deltas** (arrays of `{ destPath, renderedContent, html }`); the task's `submit()` runs on the main thread and merges each delta entry into the master page via `state.pageByDest`.

After `discover.submit()` builds the master `pages[]`, no task ever replaces the array --- only mutates it in place. This preserves object identity across phases, which is critical for `resolveBookChapters` (stores `Page` references into `bookData._chapters`) and `writePdf` (reads `renderedContent` from those same objects after the render fan-out fills them in).

### Render fan-out

The `dispatch` task slices `state.pages` into N chunks (one per available CPU), packs the shared per-build payload (site config, SEO metadata, pre-rendered sidebar HTML, serialized link tables, static file set, build info) into a **SharedArrayBuffer** via `sab-broadcast.mjs`'s `packShared()`, and dynamically registers N `render:i` worker tasks plus a `renderJoin` barrier. Each `render:i` receives the SAB reference (shared memory, not cloned) alongside its per-worker page chunk, deserializes the shared payload independently, initializes its own markdown-it + Shiki instance, runs `renderPhase` + `templatePhase` over its slice, and returns the per-page deltas. The `renderJoin` barrier waits for all N render tasks before unblocking `write`.

### Data transfer strategy

Small outputs (config, navTree, initData, buildInfo, scssResult) cross the worker boundary via structured clone at negligible cost. The link tables (~50 KB) are serialized once on main as `[key, permalink]` pairs and shipped to workers, which reconstruct minimal `{ permalink }` stubs. The render chunks (~860 KB per worker on a 4-core box) are the largest single transfer; the deltas returned are ~30 KB per worker. The SharedArrayBuffer broadcast avoids structured-cloning the ~286 KB shared payload once per worker, reducing fan-out overhead by ~55%.

## Dependencies

A single `package.json` at the repo root carries everything --- the static site generator's deps, the PDF renderer's deps, and the few packages both consume. There is no per-`builder/` `package.json` (an earlier split was consolidated; the previous arrangement required `npm ci --prefix builder` in CI and ended up dragging in a duplicate puppeteer-core via `@mermaid-js/mermaid-cli`):

```json
{
  "devDependencies": {
    "acorn": "^8.0",
    "acorn-walk": "^8.0",
    "fast-glob": "^3.3",
    "gray-matter": "^4.0",
    "html-entities": "^2.6.0",
    "htmlparser2": "^12.0.0",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "mermaid": "11.15.0",
    "pdf-lib": "1.17.1",
    "puppeteer": "25.0.4",
    "sass": "^1.0",
    "shiki": "^1.0"
  },
  "scripts": {
    "postinstall": "node builder/scripts/patch-dagre.mjs"
  }
}
```

No template engine, no framework, no bundler. `acorn` + `acorn-walk` parse the upstream `just-the-docs.js` so the offline patcher can target the AST instead of regex-matching strings; `markdown-it-{attrs,deflist,footnote}` cover the kramdown extensions the legacy renderer supported; `shiki` does the syntax highlighting; `lunr` powers the search index. `mermaid` and `puppeteer` together drive the `.mmd` → `.svg` pre-phase (one headless Chromium per batch, replacing the old per-diagram `npx mmdc` fork); `puppeteer` is shared with the PDF renderer (`book/render-book.mjs`). `sass` (Dart Sass) compiles the vendored just-the-docs SCSS plus our customizations into the site stylesheet on every build, replacing the Jekyll-Sass pre-compile step. `pdf-lib` + `html-entities` + `htmlparser2` are the PDF renderer's own toolchain. The `postinstall` runs `builder/scripts/patch-dagre.mjs`, which rewrites mermaid's bundled dagre adapter --- see [Mermaid Dagre Patches](Fixes/Dagre).

`mermaid` is **exact-pinned** (`"11.15.0"`, not `"^11.15.0"`). The dagre patches target a chunk filename whose hash component (`dagre-ZXKKJJHT.mjs`) is regenerated on each mermaid release, so a floated range could break the postinstall on a transparent patch bump.

## Per-module deep dive

Each subsection covers the design rationale and implementation details for one module. For function signatures, data contracts, and the complete export table of each module, see [Pipeline Stages](Pipeline-Stages). Modules are presented in pipeline order.

### [tbdocs.mjs](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs) --- entry point and orchestrator

`runBuild()` constructs a `WorkerPool` of `os.availableParallelism()` workers, instantiates a `Scheduler` with the static `TASKS` graph, and calls `scheduler.start(ctx)`. The scheduler dispatches all seed tasks immediately (`config`, `buildInfo`, `scss`, `mermaid`), chains the main-thread spine as each task's `submit()` emits to the next, dynamically registers the `render:0..N` fan-out from `dispatch.submit()`, and resolves when the two terminal tasks (`writeOffline`, `writePdf`) complete. After `start()` resolves, `runBuild()` reads results from the scheduler's `results` map, logs the build summary, and destroys the pool.

The `TASKS` object defines every task in the DAG as a plain object with `expected` (predecessor IDs), `execute()` (task body), and `submit()` (synchronous output router). Tasks without `runOnMain: true` are dispatched to the worker pool by handler name; the four worker handlers (`scss`, `mermaid`, `buildInfo`, `render`) live in `cpu-worker.mjs`.

The shared markdown-it instance is built once during the `markdownInit` task via `initHighlighter` + `createMarkdownIt` and stored on `state.site.markdown` so the `seo` task and each render worker use the same configured pipeline --- titles run through the same dash, quote, and footnote-stripping rules as page body text. Workers build their own independent markdown-it + Shiki instances from the serialized link tables and shared payload.

The drift guard at the end (`if (pages.length < 836)`) sets `process.exitCode = 1` when discover loses pages --- a discovery-rule regression that silently drops content appears as a non-zero exit even though the build itself "succeeded".

### [serve.mjs](https://github.com/twinbasic/documentation/blob/main/builder/serve.mjs) --- Phase 12 dev server

The worker pool is constructed once at `runServe()` startup and re-used across rebuilds; only the `Scheduler` instance (and its `SharedState`) is fresh per rebuild. Workers stay warm --- WASM caches, JIT state, and module caches all survive. The worker spawn cost (~100--200 ms) is paid once and amortizes to zero across rebuilds.

The 300 ms debounce coalesces rapid file changes into a single rebuild. A lightweight inject middleware splices the SSE client script before `</body>` at HTTP-response time so the on-disk `_serve/` stays byte-identical to what `runBuild --dest docs/_serve` would have produced outside of serve mode.

`shouldRebuild` filters watcher events along three axes: prefixes (`_site/`, `_site-offline/`, `_site-pdf/`, `_serve/`, `_pdf/`, `node_modules/`, `.git/`), basename patterns (dotfiles, editor swap files, the `4913` sentinel vim writes), and the specific `assets/images/mmd/*.svg` path. The last bit deserves a callout: those SVGs are emitted by the mermaid pre-phase back under `srcRoot`, so without the filter every `.mmd` edit fires the watcher twice (once on the `.mmd` save, once on the `.svg` write mid-rebuild) and the queued second rebuild is a no-op that triggers a redundant browser reload ~3 s later. The filter treats the `.mmd` as the source of truth and the `.svg` as a build artifact, matching how `_site/` writes are already excluded.

### [discover.mjs](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs) --- Phase 1

The `exclude:` list from `_config.yml` is passed in as the `ignore` parameter and forwarded directly to `fast-glob`. It skips every underscore-prefixed file and directory (`_config.yml`, `_book.yml`, `_site/`, `_site-offline/`, `_site-pdf/`, every `_Images/` at any depth), SCSS sources (`**/*.scss`, compiled separately by [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs)), Mermaid sources (`**/*.mmd`, the `.svg` siblings are kept), and the obvious cache dirs.

The final `pages.sort(byName)` mirrors Jekyll's `site.pages.sort_by!(&:name)` --- sort by basename, leaving fast-glob's input order to break ties (which `nav_order` then resolves deterministically in Phase 2).

### [nav.mjs](https://github.com/twinbasic/documentation/blob/main/builder/nav.mjs) --- Phase 2 navigation

The shared-state approach is what gives the JS port its 25x speedup over the Ruby plugins it replaces --- each Ruby plugin used to rebuild the same intermediate maps from scratch.

The integrity check is the only path that can abort the build mid-Phase-2. Two failure modes: **ambiguity** (multiple pages share the title declared in `parent:` and `grand_parent:` doesn't disambiguate) and **orphan** (no page has that title at all). Both report one error per offending page plus the `srcRel` path so the fix is obvious.

`sortPages` implements Jekyll's four-bucket sort: numeric `nav_order`, then string `nav_order`, then numeric `title`, then string `title`. `case_insensitive` is opt-in via `_config.yml`. The cycle defence in `buildNavNode` (the `chain.some` check) bounds tree depth at `NAV_TREE_MAX_DEPTH = 16` so a circular `parent:` chain caps out instead of recursing forever.

### [seo.mjs](https://github.com/twinbasic/documentation/blob/main/builder/seo.mjs) --- Phase 2 SEO precompute

The Liquid filter chain it replaces is `text | markdownify | strip_html | normalize_whitespace | escape_once` --- `renderTitle()` is the JS port (markdown-it render, then the `stripHtml` helper, then `\s+` collapse + trim, then escape only the five HTML-active characters via `HTML_ESCAPE_ONCE_REGEXP`).

834 of 836 page titles on the site are plain ASCII strings where the pipeline collapses to a one-character escape; the remaining two (`Concat.md` and `LineContinuation.md` --- titles containing `&` and `\`) exercise the wrap-and-strip path. The shared markdown-it instance is mandatory; Phase 2 fails fast if the orchestrator forgot to build it via `createMarkdownIt` first.

`stripHtml` and `absoluteUrl` are also exported for [`search.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) (search-index content sanitiser) and for [`sitemap.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) / [`redirects.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) (absolute URL composition) --- the same byte-for-byte URL helper used for canonical tags is shared with the Phase 6 auxiliary writers.

### [book.mjs](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) --- Phase 2 chapter resolution + Phase 8 assembly

The largest module by line count (~990 lines), split into two clearly-labelled halves by section comments.

**§A: Phase 2 chapter resolution.** `resolveBookChapters(bookData, pages)` iterates over every entry / part / chaptered-part-chapter in `_data/book.yml` and resolves its `page` / `pages` / `nav_page` / `nav_pages` / `no_descent` selector schema to a concrete `Array<Page>` stored as `_chapters` on the entry. `landing_page` / `foreword_page` are pre-resolved to their `Page` references in the same pass so Phase 8 has no pages-walk left to do. `sortByNavOrder` implements Jekyll's group-by-owning-index sort: each index page and its leaves stay together, group order by lead-item `[nav_order, title]`.

**§B--§F: Phase 8 book.html assembly.** `assembleBook(site, pages)` is the pure-compute walker --- emits the title page, then iterates over `bookData.front_matter` and `bookData.parts` in order, then runs `rewriteBookHrefs` (in-book `href="/X"` → `href="#ch-X"` for any page that contributes to the PDF), then `compressHtml`. The per-chapter body transform in `bookChapterTransform` runs five passes:

1. strip the `src="<baseurl>/"` prefix;
2. unwrap `<details>` / `<summary>` for print;
3. wrap inter-`<span>` whitespace in `<span class="w">` so pagedjs's page splitter doesn't collapse it at page breaks (12 patterns, longest first);
4. shift heading levels by `n in [0, 3]` capped at `h7-stub`;
5. prefix every heading id and intra-chapter `href="#"` with the chapter anchor.

Each part and chapter divider page contains the entry's title as an H1/H2 heading (or a silent `<p>` when `no_outline_entry:` is set), which becomes the PDF bookmark target. When `landing_is_target:` is set on an entry, the heading is instead injected directly into the landing-page article so the PDF bookmark navigates there rather than to the blank divider page; `rewriteBookHrefs`'s landing-H1 strip skips the injected heading via a `data-divider-heading` attribute. `outline_closed:` stamps `data-pdf-bookmark-closed` on the heading (or on the first content article for `no_outline_entry` entries), and `parseOutline` in `book/lib/outline.mjs` reads the attribute to write a negative PDF `/Count` for that bookmark node. Full schema is documented in the `_data/book.yml` file header.

`augmentWithRedirectStubs` synthesises virtual `Page` records from each real page's `redirect_from` so the cross-ref rewriter still captures legacy URLs the way Jekyll's `jekyll-redirect-from` did (its stubs appeared in `site.pages` and got swept into the lookup table). `chapterAnchorFromUrl` is the URL → `ch-…` slug helper that generates both `id="..."` and the `#…` href targets.

### [build-info.mjs](https://github.com/twinbasic/documentation/blob/main/builder/build-info.mjs) --- Phase 2 git capture

Runs on a worker thread as a seed task so the two `git` shell-outs overlap with the main-thread spine. Both fall back to `"unknown"` on failure so a tarball install or a sparse checkout never aborts the build.

### [data.mjs](https://github.com/twinbasic/documentation/blob/main/builder/data.mjs) --- Phase 2 data loader

Replaces the book-specific YAML load that originally lived in [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs); the latter retains `loadBookData` as a back-compat wrapper for harnesses that haven't migrated.

### [mermaid.mjs](https://github.com/twinbasic/documentation/blob/main/builder/mermaid.mjs) --- Phase 11 (B1) preprocessor

Runs on a worker thread as a seed task, concurrently with `discover` and the rest of the main-thread spine. Because the two tasks overlap, freshly-emitted SVGs may not appear in `discover`'s `staticFiles[]`; the `mermaid` task's `submit()` appends any new SVG descriptors (with full `{ srcPath, srcRel, destRel, size }` metadata, stat'd on the worker) into `state.staticFiles` synchronously on the main thread.

Drives `puppeteer` + the in-tree `mermaid` package directly. Earlier this module shelled out to `@mermaid-js/mermaid-cli` via `npx mmdc`, which forked a fresh node + Chrome process per diagram and shipped its own bundled puppeteer-core (forcing a duplicate Chrome download); the direct path collapses both costs into one browser launch for the whole batch and one entry in the dependency tree.

The render runs in a single `page.evaluate` that dynamic-imports `mermaid.esm.mjs` and calls `mermaid.render('my-svg', definition, container)`, then serialises the resulting `<svg>` via `XMLSerializer`. The SVG id matches mermaid-cli's default so any previously-committed SVG diffs cleanly against the new output. The bare HTML page is a `data:text/html` URL with one `<div id="container">`; nothing else is loaded.

**The intercept shim.** Chromium blocks the relative-`import()` chain that `mermaid.esm.mjs` triggers when the entry is loaded over `file://`, so requests are routed through a dummy origin `https://tbdocs-mermaid.invalid/*` and `page.setRequestInterception(true)` resolves them back to `node_modules/mermaid/dist/*` --- the same trick mermaid-cli's own `puppeteerIntercept.js` uses, stripped down to one root and one MIME type. The shim is necessary because the alternative (the IIFE bundle `mermaid.min.js`) inlines + minifies past the patched dagre chunk and would silently undo the layout fixes documented in [Mermaid Dagre Patches](Fixes/Dagre).

**Failure modes.** Two categories, handled distinctly:

- **Setup** (`puppeteer` import fails, mermaid not installed, `puppeteer.launch()` fails for lack of Chrome): warns once with the recovery command (`npm install` / `npx puppeteer browsers install chrome --install-deps`), retains every on-disk SVG, returns `{ ..., setupSkipped: true }`. The orchestrator does **not** flip the exit code --- a fresh checkout still builds, just without diagram updates.
- **Per-diagram render** (broken `.mmd` syntax, mermaid render throws inside `page.evaluate`): warns with the parser error including line + column + expected-token list, retains that diagram's previous SVG, **continues** processing the rest of the batch so every broken diagram surfaces in one run, and increments the returned `failed` count. The orchestrator flips `process.exitCode = 1` based on that count so CI catches the bad diagram.

### [scss.mjs](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs) --- Phase 11 (B3) SCSS compiler

Runs on a worker thread as a seed task so the ~700 ms Sass compilation overlaps with the main-thread spine. The compiled CSS result flows to the `write` task via `scss.submit()`.

Runs Dart Sass (the [`sass`](https://www.npmjs.com/package/sass) npm package) over `docs/assets/css/just-the-docs-combined.scss` and pushes the result onto `generatedAssets` as `assets/css/just-the-docs-combined.css`. Replaces the Jekyll-era pre-compiled CSS that used to live under `builder/assets/`; editing any SCSS partial now reflects on the next build instead of requiring a re-extraction.

Load paths are stacked, searched in order: `docs/_sass/` first (our customizations under `custom/`), then `builder/vendor/just-the-docs/_sass/` (the gem at v0.10.1). The same shadowing Jekyll relied on still applies --- `@import "custom/custom"` resolves to our `docs/_sass/custom/custom.scss` because the load-path order puts our `_sass/` first.

The entry point replicates the gem's `_includes/css/just-the-docs.scss.liquid` Liquid template as pure SCSS: it imports `support/support`, then `custom/setup`, then `color_schemes/light` (always), then `modules` --- emitting the full light-theme rule set at root. The same import block re-runs inside an `html.dark-mode { ... }` wrapper with `color_schemes/dark` instead so every module rule lands a second time with the dark palette, scoped under the dark-mode class.

Failure modes:

- **Setup** (`sass` not installed) is a hard error with a `npm install` hint --- there is no pre-compiled CSS fallback to fall back to.
- **Content** (syntax error in any SCSS partial) prints the source location, flips `process.exitCode = 1`, and continues the build with the previous `_site/` CSS lingering if any. CI catches the non-zero exit.

Upstream Dart Sass emits deprecation warnings against several gem-vendored constructs (`darken()`, root-`@import`); they're upstream noise, not actionable here without forking the gem.

### [render.mjs](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) --- Phase 3 markdown pipeline

The largest single module (~1,580 lines) and the runtime hot path. Under the scheduler, the render phase fans out across N worker threads (one `render:i` task per available CPU); each worker builds its own markdown-it + Shiki instance from the serialized link tables and shared payload, then runs `renderPhase` + `templatePhase` over its page chunk. The single-threaded ~3.5 s of combined render + template work compresses to ~3500/N ms wall-clock.

`createMarkdownIt(ctx)` is the configuration heart. The base options (`html: true`, `xhtmlOut: true`, `breaks: false`, `linkify: false`, `typographer: true`, `quotes: "“”‘’"`) match kramdown's defaults. Plugins layer on: `markdown-it-attrs` with the `{:` / `}` delimiters that kramdown uses, `markdown-it-deflist`, `markdown-it-footnote` with the kramdown render rules (`fnref:N` / `reversefootnote` / `<div class="footnotes">` shapes; see `configureFootnotes`), plus a stack of in-tree plugins:

- **`standaloneIalForwardPlugin`** --- kramdown attaches a standalone `{:...}` IAL to the next block, not the previous one; markdown-it-attrs gets that backwards.
- **`tightLooseListPlugin`** --- kramdown decides per-item whether a list item carries `<p>` wraps; markdown-it decides at list level. Post-pass hides `paragraph_open` / `paragraph_close` tokens to match.
- **`looseDeflistPlugin`** --- the same rule applied to `<dd>` bodies, with the narrower trigger (only the `dt` → `dd` blank-line gap counts).
- **`headerIdPlugin`** --- the `kramdownSlug` algorithm (lowercase, drop characters outside `\p{L}\p{N}\p{M}\p{Pc}\-`, replace spaces with `-`, deduplicate with `-1`, `-2`, ...).
- **`tocPlugin`** --- detects the `* TOC\n{:toc}` pattern (a bullet list whose token carries a `toc` attribute) and replaces it with the nested `<ul id="markdown-toc">`.
- **`relativeLinksPlugin`** --- the in-source `[X](Y.md)` → `[X](/permalink-of-Y)` rewrite via the `byPath` / `byUrl` / `byRedirect` link tables `buildLinkTables` produces.
- **`blockHtmlRecursionPlugin`** --- strips `markdown="1"` from html_blocks (markdown-it already recurses when blank lines separate body content), runs kramdown-style smart-quote conversion through `markdown="span"` bodies, normalises raw block HTML (bareword attrs expanded to `attr=""`, whitespace-only bodies collapsed), and wraps standalone inline elements like `<br>` / `<img>` in `<p>`.
- **`kramdownDashesPlugin`** --- `--` → en-dash, `---` → em-dash, `<<` / `>>` → guillemets, plus a possessive-apostrophe sweep and the cross-emphasis smart-quote rules kramdown applies that markdown-it's typographer can't reach because it's blind to token siblings.
- **`kramdownEllipsisPlugin`** --- recovers the `....` / `.....` patterns markdown-it would collapse to a single `…`.
- **`flattenAdjacentStrongPlugin`** --- forces left-to-right `**` pairing instead of CommonMark's preferred-nesting algorithm.

The render-rule overrides on `fence` / `code_block` / `code_inline` / `table_open` / `th_open` / `ordered_list_open` handle the smaller divergences (Rouge-shaped wrapper, table-wrap div, no `start` on `<ol>`, `style: text-align:` spacing). Five pre-render text passes (`stripLiquidRawTags`, `rewriteTripleAsteriskEmphasis`, `encodeSpacesInMediaUrls`, `rewriteListItemSetextHeadings`, `absorbTrailingHtmlComments`, `rewriteAdmonitions`) rewrite the source string before markdown-it sees it; two post-render passes (`normaliseVoidTags`, `padEmptyCells`) fix kramdown's `<br />`-style XHTML void output and the `<td> </td>` empty-cell quirk. The GFM admonition rewrite (`rewriteAdmonitions`) emits the same five SVG octicons (info, light-bulb, report, alert, stop) that jekyll-gfm-admonitions emits, with `class="markdown-alert markdown-alert-<type>" markdown="1"` so the inner body recurses through the markdown parser.

### [highlight.mjs](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) --- Phase 3 syntax highlighter

The wrapper structure --- `<div class="language-X highlighter-rouge"><div class="highlight"><pre class="highlight"><code>...</code></pre></div></div>` --- is what the just-the-docs chrome's CSS expects, so the wrapper class output and the palette CSS share a single source of truth. `TB_ALIASES` accepts `tb`, `twinbasic`, `vb`, `vba` (all routed to the bundled tB grammar); other fenced languages route to Shiki's bundled list (`js`, `json`, `ruby`, `html`, `yaml`, and a few more). An empty info string falls through to `language-plaintext`.

`renderThemedSpans` is the per-token-run coalescer: same-class adjacent tokens merge into one `<span>` so a multi-line block comment is a single coloured block, the line-continuation token (`_<whitespace>\n`) absorbs the next line's leading whitespace into the same span (mirroring the tB lexer's continuation handling), and trailing newlines on comment runs defer so a continuing comment on the next line merges in. Phase 11 (B5) added `COPY_BUTTON_HTML` to the wrapper output --- the runtime DOM-injection loop the upstream just-the-docs.js used to do is gone, the click handler binds to the pre-rendered button via `closest()`.

### [highlight-theme.mjs](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) --- Phase 11 (B2) theme loader

Replaces the two-step `scripts/extract_theme_colors.py` → SCSS-partial → Jekyll-Sass-compile indirection that lived in the Ruby era; the `.theme` source now feeds the renderer directly.

`SCOPE_TO_SYMBOL` is the TextMate-scope → tB-Symbol mapping (e.g. `keyword.declaration` → `Keyword`, `comment.line` → `Comment`, `constant.numeric` → `LiteralNumeric`). More-specific scopes precede their parents so the renderer's inner-out traversal of each token's scope chain stops at the right level. Symbols with no entry inherit the default `.highlight` text colour --- intentional, so plain punctuation and generic identifiers don't get a wrapping `<span>`.

`loadHighlightTheme()` groups Symbols by their (light props, dark props) tuple and assigns one CSS class per unique tuple --- so any two Symbols that share both palettes' properties collapse to a single class. Class IDs (`c1`, `c2`, ...) are tuple-derived and sort-stable; rebuilding with no theme changes produces byte-identical output. The CSS emits a light palette rule per class at root, then the same set under `html.dark-mode .highlight .cN` so the chrome's theme toggle flips the syntax highlight in lockstep with the rest of the page.

### [template.mjs](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) --- Phase 4 layout

The layout is direct JS template-literal concatenation --- no Liquid, no template engine. Sub-functions match the upstream just-the-docs include set one-to-one: `renderHead` (charset / dark-mode early script / CSS / activation-style / lunr / just-the-docs.js / viewport / SEO / favicon, in the upstream's exact order), `renderSidebar` + `renderNavTree` (recursive nav walker with cycle defence by title), `renderHeader` + `renderSearchInput` + `renderAuxNav`, `renderBreadcrumbs`, `injectAnchorHeadings` (regex pass adding `<a class="anchor-heading">` next to every heading with an id), `renderChildrenNav` (auto-generated child page list for index pages), `renderFooter` + `renderFooterCustom` + `renderEditAndOfflineBlock`.

`navActivationCss(page)` is the per-page `<style id="jtd-nav-activation">` block --- positional `:nth-child(N)` selectors derived from `page.navLevels` that bold the active leaf, rotate its expander chevron, expand the active sub-tree's `<ul>`, and turn off the background-image inheritance on every other link. The CSS structure mirrors the upstream `activation.scss.liquid` partial verbatim so the rendered style block byte-matches what Jekyll would have produced. `formatDate` implements the strftime tokens the project's `last_edit_time_format` actually uses (`%b %e %Y at %I:%M %p`) plus the common companions, throwing on unknown tokens so a future format change is detected immediately.

### [compress.mjs](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) --- Phase 4 whitespace compress

`collapseWhitespace` uses an explicit `[ \t\n\r\f\v]+` character class rather than JS's `\s` shorthand --- the latter would also match U+00A0 (no-break space) and a dozen other Unicode space characters, which would destroy the `&nbsp;`-based indentation kramdown emits in blockquote, footnote-backref, and `<kbd>` markup. The trailing newline is preserved when the input had one.

### [write.mjs](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs) --- Phase 5 online writer

The `mkdirRec` cache plus inflight-collapse skips ~76% of the otherwise-duplicated `fs.mkdir` calls on the current ~1,080-file inventory.

Two safety rails. `isUnderProject(destRoot)` (also exported and reused by [`offline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) and [`pdf.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs)) rejects any destination root that isn't a descendant of the project tree, so `--dest ~` can never `rm -rf` an entire home directory by accident. `assertNoDestinationCollisions` throws when a static file's `destRel` would overwrite a page's `destPath` --- a content-tree typo that drops a `.html` next to a real page would otherwise silently win. Several utilities are exported for the Phase 6/7/8 substep writers to share: `mkdirRec`, `runLimited` (concurrency-limited per-item runner, `LIMIT = 64`), `safeWrite` (error-wrapping write helper that includes the `dest` path in the message), `writeFileMkdirp`.

### [paths.mjs](https://github.com/twinbasic/documentation/blob/main/builder/paths.mjs) --- shared permalink-to-destination helper

Twenty-three lines. Shared by Phase 1 and Phase 6; see [Pipeline Stages](Pipeline-Stages#pathsmjs) for the four rules.

### [redirects.mjs](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) --- Phase 6 redirect stubs

`deriveRedirectStubs` is the pure-compute derivation (exported so the offline pass can read the stub list without re-deriving). It guards against two collision shapes: a `redirect_from` URL that would overwrite a real page (clear error with both source paths), and two different pages claiming the same redirect destination. Either fails the build immediately rather than letting the second writer silently clobber the first.

### [sitemap.mjs](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) --- Phase 6 sitemap + robots.txt

Absolute URLs are sorted alphabetically so re-runs produce byte-identical output. A source-tree `permalink: /robots.txt` would shadow the generated one --- defensive check, no current page sets that.

### [search.mjs](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) --- Phase 6 Lunr index emitter

`sanitiseContent` is the kramdown-parity content normaliser --- 14 string replaces insert ` . ` / ` | ` separators between block boundaries (so the search snippet shows logical breaks instead of glued-together prose), then `stripHtml`, then a "Table of contents" removal, then a collapse-runs-of-ASCII-whitespace pass (narrow set, mirroring Ruby's `String#strip` semantics so `&nbsp;`-based indentation isn't destroyed --- the same issue the [`compress.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) compress pass guards against). The order is essential for byte parity with the just-the-docs Liquid template; rearranging the steps would change the output.

### [offline.mjs](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) --- Phase 7 offline mirror

The second-largest module (~950 lines). Internal sections are labelled `§A` through `§I` in the source.

`computeRelative` is the URL resolver core: absolute URL → page-relative path that resolves on disk. It runs `resolveRaw` (peels the baseurl, picks among `<path>` / `<path>.html` / `<path>/index.html` candidates against the `sitePaths` Set), then ascends `../`s to the longest common prefix with the page's own segments, then re-appends the descend plus the encoded tail. `computeRelUrl` handles already-page-relative inputs similarly. The result caches (`rawResolution`, `seg`, per-fileDir `result`) collapse the per-build cost to near-linear in unique-URL count.

The per-page sidebar nav block is byte-identical across every page (it doesn't depend on the per-page `page` object; the active highlight lives in the head-style block, not as inline `class=` attributes), so `writeOfflinePages` runs a pre-pass that renders the first page in each destination dir, slices out the nav, and caches the `{input, output}` pair. Subsequent pages in the same destination dir substitute the input slice with a placeholder, run the rewriter over the ~80 KB-smaller string, then splice the cached output back in. ~200 ms saved on each build (Phase 9 §5.3, B7). The fallback to full-rewrite-with-warning when the cache misses keeps it as pure optimisation, never a correctness dependency.

The just-the-docs.js patcher is AST-based as of Phase 11 (B11): `deriveOfflineJtdJs` parses the upstream source with `acorn`, scans for `FunctionDeclaration` nodes named `navLink` and `initSearch`, and slices in the two replacement implementations (`JTD_NAVLINK_REPLACEMENT`, `JTD_INITSEARCH_FN_REPLACEMENT`). The non-patched regions stay byte-identical to the upstream source, and cosmetic upstream edits (variable renames, whitespace inside the patched bodies) survive --- the prior anchored-regex patcher would have broken on either. A parse error at build time is a clear signal that re-extraction produced something acorn can't read; no defensive fallback ships because just-the-docs.js is only re-extracted on deliberate gem-bump operations.

`deriveOfflineSearchDataJs` wraps `search-data.json` as `window.SEARCH_DATA = {...}` (a `<script src=>` can't fetch JSON under `file://`) and minifies via `JSON.parse + JSON.stringify` without indentation --- Phase 11 (B10) shaved ~1.1 MB off the offline asset footprint. The raw `search-data.json` is listed in `offline_exclude` in `_config.yml` and is absent from the offline tree; the `.js` wrapper is the only search asset the offline site carries. `copyOfflineThemeAssets` applies `offline_exclude` to all theme-asset files, not just the specially-patched `just-the-docs.js`.

### [pdf.mjs](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs) --- Phase 8 PDF source tree

The image-path collector folds into `assembleBook`'s per-chapter emit (Phase 9 §5.9); a post-pass regex scan of the assembled HTML is retained as the exported `extractImagePaths` helper for the diff tools but no longer runs in the writer. `resolveBookPage` enforces exactly one `layout: book-combined` page in the source tree (throws on zero or multiple --- both are unambiguous misconfigurations).

`reportMissingImages` implements pdfify.rb's strict mode: per-path error log, then throw if `!tolerateMissingImages`. Every Phase 8 invocation runs in strict mode by default --- a missing image in the assembled book is a build-fail rather than a warning, since the alternative is a PDF with broken-image placeholders nobody notices until publication. The `--tolerate-missing-images` flag (renamed from `--serving` in Phase 12) downgrades the throw to a warning for iterative work.

### [scheduler.mjs](https://github.com/twinbasic/documentation/blob/main/builder/scheduler.mjs) --- task-graph scheduler

~110 lines. Two exports: `Scheduler` and `SharedState`.

`SharedState` carries the master `pages[]`, `staticFiles[]`, `site` object, and the `pageByDest` lookup map. The `Scheduler` constructor takes a `WorkerPool` instance and a `tasks` map; `start(ctx)` queues all seed tasks (those with `expected: []`) and returns a promise that resolves when every task has completed. The scheduler is a thin coordinator --- it tracks pending dependency counts, maintains a ready queue, and dispatches tasks to either the main thread (via `Promise.resolve(task.execute(...))`) or the pool (via `pool.run()`). Task completion invokes the task's synchronous `submit()` callback, which calls `emit(targetId, data)` to route output slices to downstream tasks.

`register(id, def)` and `seed(id, inputs)` support dynamic task creation: `dispatch.submit()` calls `register` for each `render:i` task and the `renderJoin` barrier at fan-out time, then `seed` to immediately enqueue each render task with its chunk. `summary()` returns the per-task timing string (e.g. `config=1ms discover=98ms scss=1041ms ...`).

### [worker-pool.mjs](https://github.com/twinbasic/documentation/blob/main/builder/worker-pool.mjs) --- worker thread pool

~55 lines. Spawns `size` workers eagerly at construction (so Shiki WASM warmup overlaps with seed-task work) and routes named tasks to whichever worker is idle. No dynamic scaling, no recycling, no abort signals --- each feature is real complexity the project does not need. The pool's only public methods are `run(payload, { name })` (returns a promise that resolves with the worker's result) and `destroy()` (terminates all workers). Worker crashes are not recovered --- the dead worker stays out of the idle list and the pool degrades by one for the rest of the run; for a one-shot `runBuild`, the resulting task rejection aborts via the scheduler's error path.

### [cpu-worker.mjs](https://github.com/twinbasic/documentation/blob/main/builder/cpu-worker.mjs) --- worker harness

~80 lines. A `parentPort.on("message")` dispatcher routes `{ name, ...payload }` messages to one of four named handlers:

- **`scss`** --- calls `compileScss(ctx.srcRoot)`.
- **`mermaid`** --- calls `regenerateMermaid(ctx.srcRoot)`.
- **`buildInfo`** --- calls `captureBuildInfo()`.
- **`render`** --- the render + template hot path. Deserializes the shared payload from the SharedArrayBuffer, awaits the module-scope Shiki WASM init (started eagerly at import time, before any message arrives), builds a fresh markdown-it instance from the serialized link tables, runs `renderPhase` + `templatePhase` over the page chunk, and returns per-page deltas (`{ destPath, renderedContent, html }`).

Each worker starts its own `initHighlighter()` call at module scope without awaiting it, so the WASM init overlaps with worker spawn and the main-thread spine. Only the `render` handler awaits the result; the other three handlers service tasks while Shiki is still loading.

### [sab-broadcast.mjs](https://github.com/twinbasic/documentation/blob/main/builder/sab-broadcast.mjs) --- SharedArrayBuffer broadcast

~15 lines. `packShared(obj)` JSON-serializes an object, encodes to UTF-8, and copies into a `SharedArrayBuffer`. `unpackShared(sab)` reverses the process. The render fan-out's shared payload (~286 KB of site config, pre-rendered sidebar HTML, serialized link tables, static file set, and build info) is packed once on the main thread; each worker receives the SAB reference (shared memory, not cloned) and deserializes independently. Measured saving: ~55% reduction in fan-out overhead (~8 ms per build).

## Asset layout

The site's `/assets/` tree at deploy time is assembled from three sources:

| Source on disk | What lives there | Phase that delivers it |
|---|---|---|
| `docs/assets/` | Project-owned content: the SCSS entry point, project JS (`theme-switch.js`), hand-written stylesheets (`print.css`, `just-the-docs-head-nav.css`), Mermaid diagrams (`.mmd` sources + `.svg` renders), and any content images contributors add. | Discovered by [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs), copied by [`write.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs)'s `copyStaticFiles`. |
| `builder/vendor/just-the-docs/` | Vendored from the just-the-docs gem (v0.10.1): `_sass/` (the theme's SCSS sources, fed into the compilation) and `assets/js/just-the-docs.js` + `assets/js/vendor/lunr.min.js` (the chrome runtime, copied verbatim). See [`builder/vendor/just-the-docs/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/vendor/just-the-docs/README.md) for the inventory, re-vendoring procedure, and the in-tree patches applied to `just-the-docs.js`. | `_sass/` consumed by [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs); `assets/` copied by `write.mjs`'s `copyTheme`. |
| Generated in-process | `just-the-docs-combined.css` (from [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs)) and `tb-highlight.css` (from [`highlight-theme.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs)). Neither is committed; both are rebuilt every run. | Pushed onto `generatedAssets` in [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs); written by `write.mjs`'s `writeGeneratedAssets` after `copyTheme` so the generated content wins any collision. |

CSS files in either copy path get a baseurl rewrite (`url("/path")` → `url("<baseurl>/path")`) when the deployment baseurl is non-empty; the same transform applies to generated CSS, so the `url("/favicon.png")` the SCSS entry point emits resolves correctly under sub-path deployments.

There is no theme re-extraction step any more --- the SCSS sources live in tree, the build compiles them on every run via Dart Sass. Bumping just-the-docs is a matter of re-vendoring `_sass/` and `assets/js/` from the new gem tag (procedure in the vendor README), re-applying the `just-the-docs.js` patches if upstream changed them, and rebuilding.

## Verification

Site integrity after a build is asserted by `check.bat`, which runs `scripts/check_links.mjs` against `_site/` and `_site-offline/`. The CI workflow runs the same passes plus the `crawl_check.mjs` post-deploy check.

The build itself includes a small guard at the end of `tbdocs.mjs`:

```js
if (pages.length < 836) {
  console.error(`WARN: page count ${pages.length} below baseline 836`);
  process.exitCode = 1;
}
```

so an accidental discovery-rule regression that silently drops pages appears as a non-zero exit code.

## What is NOT in builder/

Some build-adjacent code lives at the repo root rather than under `builder/`:

- **PDF rendering** --- `book/render-book.mjs` plus its `book/lib/*.mjs` helpers and the `paged.browser.js` bundle. `tbdocs` produces `_site-pdf/book.html`; the actual PDF render runs separately via `book.bat`. The driver is intentionally not part of the site generator: `pdf-lib` is a heavy dep used only at PDF time. `puppeteer` is shared between `render-book.mjs` and `builder/mermaid.mjs` (one Chromium binary, two consumers). See [PDF Generation](PDF-Generation) for the full internals.
- **Link checking** --- `scripts/check_links.mjs` reads from disk after the build; not part of the generator.
- **External link crawling** --- `scripts/crawl_check.mjs` reads from HTTP; not part of the generator.
- **Mermaid source files** --- `docs/assets/images/mmd/*.mmd` are source, `*.svg` are build artifacts that `tbdocs` regenerates as needed.
