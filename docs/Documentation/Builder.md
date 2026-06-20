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
- [`builder/PLAN.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN.md) --- the original architecture overview from the port.
- [`builder/PLAN-sab-pull-scheduler.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-sab-pull-scheduler.md) --- the current scheduler design: pull model, SAB layout, per-phase rollout notes.
- [`builder/FUTURE-WORK.md`](https://github.com/twinbasic/documentation/blob/main/builder/FUTURE-WORK.md) --- open follow-ups.

Sub-pages:

- [Pipeline Stages](Pipeline-Stages) --- complete interface reference: per-task signatures, per-module export tables, scheduler-level concepts.
- [Book Configuration](Book-Configuration) --- `_book.yml` key reference for the PDF chapter manifest.
- [Extending the Builder](Extending) --- tutorial for adding a new task or markdown-it plugin.

* TOC goes here
{:toc}

## Why tbdocs exists

The site was originally built with the just-the-docs Jekyll theme; tbdocs is the Node.js replacement that follows the same content model and the same output structure without a Ruby toolchain. The win once the port was settled is mostly internal: a fixed dependency set, end-to-end build time around 2--3 seconds on a modern laptop, and one process for all three output trees.

The rework documented here is internal. The build moved from a push-style scheduler (the main thread decides what is ready and passes work to workers) to a SAB-based pull scheduler (workers read shared task state and claim work themselves) and three pieces of per-page work that used to run serially on the main thread --- offline rewrite, per-page SEO, and search-index derivation --- now run inside the render workers. The output is byte-equivalent to the previous scheduler; the change is in how the time is spent.

## Architecture at a glance

One entry point, ~28 modules, three output trees, N+1 threads.

`runBuild()` allocates a `SharedArrayBuffer` holding the scheduling state (task status, dependency counts, successor edges), spawns one worker per available CPU, sends each worker a reference to the SAB, and lets the workers and the main thread compete for ready tasks. There is no central dispatcher; each thread scans the SAB, claims a task it is eligible to run, executes it, and updates the SAB so the next task becomes claimable. The main thread participates on equal footing for tasks marked `runOnMain` --- mostly the ones that mutate the master `pages[]` array or coordinate filesystem layout.

The three output trees are unchanged from the earlier design:

| Tree | Purpose | Phase |
|---|---|---|
| `_site/` | Online tree deployed to `docs.twinbasic.com`. | Render fan-out + write |
| `_site-offline/` | `file://`-browsable mirror with every URL rewritten to a page-relative path. | Per-page rewrite folded into render workers |
| `_site-pdf/` | Sparse source tree (`book.html` + CSS + images) the PDF renderer consumes. | Assembled after all pages have rendered |

`builder/` lives at the repo root, not under `docs/`, so the generator source is not part of the content tree it reads. Build outputs go to `docs/_site/`, `docs/_site-offline/`, and `docs/_site-pdf/`; the serve-mode dev server writes to a separate `docs/_serve/` tree so a one-off `build.bat` invocation never clobbers a running serve session's output.

## Module map

Modules grouped by role. Each entry has one line; deep-dive in [Pipeline Stages](Pipeline-Stages).

**Orchestration and scheduling**

| File | Role |
|---|---|
| [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs) | Entry point. Defines the static `TASKS` graph, allocates the SAB, spawns the pool, runs the build, injects the Gantt chart. |
| [`scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scheduler.mjs) | Main-thread side of the pull scheduler: claim loop, results map, completion detection, summary printer. |
| [`worker-pool.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/worker-pool.mjs) | Worker lifecycle wrapper: spawn, send the SAB, forward messages to the scheduler, terminate. No dispatch logic. |
| [`cpu-worker.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/cpu-worker.mjs) | Worker harness. Runs the pull loop, holds the eight named handlers, handles speculative idle execution. |
| [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs) | SAB layout, allocation, task-metadata API. Constants and atomics primitives consumed by both the scheduler and the workers. |
| [`sab-broadcast.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-broadcast.mjs) | JSON-over-SAB pack/unpack for the shared payload (config, link tables, sidebar HTML, etc.) broadcast to every render worker. |

**Discovery and compute**

| File | Role |
|---|---|
| [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs) | Source tree walk; parses frontmatter and classifies each file as a page or a static file. |
| [`nav.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/nav.mjs) | Sidebar tree, integrity check, breadcrumbs, per-page `navLevels`. |
| [`seo.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/seo.mjs) | Site-level SEO on main (`computeSiteSeo`); per-page SEO on workers (`computeChunkSeo`). |
| [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) | Chapter selector resolution (Phase 2 half) + `book.html` assembly (Phase 8 half). |
| [`build-info.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/build-info.mjs) | Git commit hash + date capture. Runs on a worker so the shell-outs hide behind the main spine. |
| [`data.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/data.mjs) | Loads `_book.yml`. |

**Preprocessing**

| File | Role |
|---|---|
| [`dot.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/dot.mjs) | Regenerates stale `.dot` → `.svg` via the WASM build of Graphviz (`@hpcc-js/wasm-graphviz`). |
| [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs) | Dart Sass over the vendored just-the-docs SCSS. Split across `scssLight` + `scssDark` worker tasks, joined on main. |

**Render hot path**

| File | Role |
|---|---|
| [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) | markdown-it configuration + plugin stack (including `svgInlinePlugin` for build-time SVG embedding) + `renderPhase`. Built once on main and once per worker. |
| [`highlight.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) | Shiki bootstrap + the bundled twinBASIC grammar. Emits the just-the-docs wrapper structure. |
| [`highlight-theme.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) | Loads `Light.theme` + `Dark.theme`, emits `tb-highlight.css` + scope-to-class lookup. |
| [`template.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) | `templatePhase` (per-page layout wrap) + `buildInitConfig` + `renderSidebar`. JS template literals; no template engine. |
| [`compress.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) | Whitespace compression outside `<pre>` blocks. |

**Write phase**

| File | Role |
|---|---|
| [`write.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs) | Asset / static-file writer + shared I/O helpers (`mkdirRec`, `runLimited`, `writeFileMkdirp`). |
| [`paths.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/paths.mjs) | Permalink → destination-path helper. |
| [`redirects.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) | `redirect_from:` stub generator. |
| [`sitemap.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) | `sitemap.xml` + `robots.txt`. |
| [`search.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) | `deriveSearchEntries` (per-chunk, on workers) + `writeSearchDataFromChunks` (consolidator, on main). |

**Offline and PDF**

| File | Role |
|---|---|
| [`offline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) | Offline-tree writer + just-the-docs.js AST patcher + `search-data.js` wrapper. |
| [`offline-rewrite.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline-rewrite.mjs) | Pure rewrite helpers (`deriveOfflinePageCached`, CSS url() rewrite, site-path set construction). Worker-safe; no node:fs dependency. |
| [`pdf.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs) | `_site-pdf/` writer: `book.html` + `tb-highlight.css` + `print.css` + referenced images. |

**Dev mode and reporting**

| File | Role |
|---|---|
| [`serve.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/serve.mjs) | Long-lived dev server: HTTP, recursive watcher, SSE reload, persistent worker pool. |
| [`gantt.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/gantt.mjs) | Inline SVG Gantt chart of the build timeline. Injected into the [Build Info](BuildInfo) page at the end of each build. |

## The pull-based SAB scheduler

The scheduler models the build as a directed acyclic graph of tasks. Each task has predecessors (`expected`), a body (`execute` on main, or a named `handler` on a worker), and an output router (`submit`) that merges its result into the shared `SharedState`.

In the previous push-style design the main thread held the ready queue. While a `runOnMain` task body was running, the event loop was blocked: worker completion messages waited in the message queue, no new tasks were dispatched, and on a 16-core machine the idle time across all threads added up to roughly a second --- significant against a sub-two-second build. The current pull design eliminates that round-trip: workers read task state directly from a `SharedArrayBuffer`, claim tasks via `Atomics.compareExchange`, and wake siblings via `Atomics.notify` when they finish.

### Task lifecycle

Each task slot in the SAB has a status:

| Status | Meaning |
|---|---|
| `NOT_READY` (0) | One or more predecessors not yet done. |
| `READY` (1) | All predecessors done. Eligible to be claimed. |
| `CLAIMED` (2) | A thread has CAS-claimed the slot and is running it. |
| `DONE` (3) | Body has run; the thread's `submit()` has merged the output into `SharedState`. |
| `FAILED` (4) | Body threw. The scheduler aborts the build. |

The transitions are atomic: `READY → CLAIMED` via `Atomics.compareExchange` (so two threads cannot claim the same task), and `CLAIMED → DONE` after the executor's `submit()` runs. When a task transitions to `DONE`, its successors get their `depCount` decremented; any whose count hits zero flip to `READY` and the executor's `Atomics.notify` wakes any thread that was sleeping on the notify generation counter.

### Task flags

A handful of bit flags on each task encode the scheduling primitives the build needs. They compose:

| Flag | Meaning | Used by |
|---|---|---|
| `runOnMain` | Body runs on the main thread. The main loop claims; workers skip. | `discover`, `nav`, `markdownInit`, every `submit`-only task. |
| `on_demand` | Seed task (no predecessors) that is **not** auto-started. Becomes claimable only when a successor would otherwise be runnable. | `warmInit`, `renderEnvInit`, `renderJoin`, `flushJoin`. |
| `unique_per_worker` | The "done" state is per-lane: lane W's instance counts only for lane W's perspective. | `warmInit`, `renderEnvInit`. |
| `run_when_idle` | When a worker has no claimable work, it may run this task speculatively. | `warmInit` (overlaps Shiki WASM init with the main spine). |
| `pin_to_predecessor` | Must run on the same lane that ran a named predecessor. | `flush:i` (pinned to `render:i`). |
| `survives_reset` | The `perWorkerDone` flag survives an SAB reset between builds in serve mode. | `warmInit` (Shiki stays loaded). |

A task can also declare `perWorkerDeps` --- a list of `unique_per_worker` tasks that must have run on **this** lane before the task is claimable. That is how `render:i` declares it needs `renderEnvInit` to have run on whatever lane picks it up.

### Notify protocol

The SAB holds a single `notify` Int32 used as a generation counter. Workers that find no claimable work read the counter, perform one more scan to close the race window, then `Atomics.wait(notify, gen, 50)` --- a fifty-millisecond timeout that also serves as a safety net against missed wakeups. Every state transition that could make a task claimable bumps the counter and calls `Atomics.notify`, so any worker sleeping on the old generation returns immediately.

## SAB memory layout

A single `SharedArrayBuffer` contains every Int32 array the scheduler needs. The sizes are static: `MAX_TASKS = 512`, `MAX_LANES = 64`, `MAX_EDGES = 2048`, total roughly 140 KB. The arrays a reader is most likely to care about:

- `status[i]` --- the task lifecycle enum above.
- `depCount[i]` --- remaining predecessor count. Decremented atomically on each predecessor's completion.
- `succOffset[i]` / `succCount[i]` / `succList` --- flat successor edge list. `dispatch.submit()` extends the edge list at runtime to wire the dynamic render and flush tasks.
- `perWorkerDone[i*MAX_LANES + lane]` --- per-lane done flag for `unique_per_worker` tasks.
- `flags[i]` --- bitmask of the flags above.
- `notify` --- generation counter for `Atomics.wait` / `notify`.
- `buildDone` --- terminal flag set to 1 (success) or 2 (error) by `Scheduler._finish()` / `_abort()`. Workers poll this at the top of each pull-loop iteration and exit when it transitions away from 0.

The complete layout, allocation helper, and the `readTaskMeta` / `writeTaskMeta` API live in [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs).

## Task DAG by section

The pipeline has 28 named static tasks plus 2N dynamic ones (N render chunks + N flush tasks). The Gantt chart groups them into four sections that also organise the discussion below:

- **Seeds**: `buildInfo`, `scssLight`, `scssDark`, `config`, `warmInit`, `highlighterInit`, `discover`, `loadData`
- **Spine**: `nav`, `dot`, `buildInit`, `markdownInit`, `deriveSitemap`, `deriveRedirects`, `resolveBookChapters`
- **Render**: `dispatch`, `prepDest`, `prepPageDirs`, `renderEnvInit`, `render:i`, `renderJoin`
- **Write**: `scss`, `flush:i`, `flushJoin`, `writeAssets`, `searchData`, `writeAux`, `writeOffline`, `writePdf`

The full task DAG, with every cross-section edge, follows:

![Task DAG of the SAB pull scheduler](/assets/images/dot/scheduler-dag.svg)

**[M]** runs on the main thread; **[W]** runs on a worker. Solid arrows are normal predecessor edges (`expected`); dotted arrows are per-lane dependencies (`perWorkerDeps`) or implicit data dependencies between tasks that share state through `SharedState`.

### Seeds

Seeds have no predecessors and become claimable as soon as the build starts (with the exception of `on_demand` seeds that wait for a successor). They saturate the worker pool while the main thread is still traversing the source tree.

- `config` (main) --- reads `_config.yml` + applies CLI overrides.
- `buildInfo` (worker) --- two `git` shell-outs. Falls back to `"unknown"` on failure.
- `scssLight` (worker) --- compiles `just-the-docs-combined.scss` against the light palette.
- `scssDark` (worker) --- same against the dark palette. The two halves were one ~700 ms compile in the old design; splitting them saves about 200 ms.
- `scss` (main) --- joins both halves, writes the combined CSS to `_site/` and `_site-offline/`.
- `dot` (worker) --- regenerates stale `.dot` → `.svg` via the WASM build of Graphviz. WASM init (~50 ms) hides behind the main spine; per-diagram render is synchronous after that.
- `highlighterInit` (main) --- loads the `Light.theme` + `Dark.theme` palette, emits `tb-highlight.css`. Does not bring up Shiki on main --- workers each init their own.
- `warmInit` (worker, `on_demand` + `unique_per_worker` + `run_when_idle` + `survives_reset`) --- per-lane Shiki bootstrap. The flag combination means workers run it during the main-thread spine if they have no other claimable work, every render-worker needs it on its own lane, and in serve mode the per-lane done flag survives across rebuilds so the second build skips warmup entirely.
- `prepDest` (main) --- cleans and recreates the three destination trees. Deferred to after `dispatch` so the wipe does not contend with `discover`'s reads.
- `prepPageDirs` (main) --- pre-creates every page output directory. Lets `flush:i` skip `mkdir` entirely.

### Spine

Main-thread tasks fed by `discover`. They are mostly cheap; the point is to fork out into independent compute streams as fast as possible after the source tree is known.

```
config → discover ┬→ nav            ┐
                  ├→ buildInit      ├→ dispatch
                  ├→ markdownInit   ┘
                  ├→ deriveRedirects
                  ├→ loadData → highlighterInit (already running)
                  ├→ deriveSitemap (deferred)
                  └→ resolveBookChapters (after deriveSitemap)
```

- `discover` --- traverses `docs/`, classifies pages vs static files, builds `state.pageByDest`.
- `nav` --- builds the sidebar tree, runs the integrity check (orphan / ambiguous `parent:` aborts the build here), pre-renders the sidebar HTML.
- `buildInit` --- pre-renders the config-only chrome (SVG sprites, header, search footer, favicon). No nav-tree dependency; runs in parallel with `nav`.
- `markdownInit` --- builds the link tables, instantiates the shared markdown-it, computes site-level SEO. The serialized link tables and site-level SEO constants travel to render workers as part of the shared SAB payload.
- `loadData` --- reads `_book.yml`.
- `deriveRedirects` --- pure derivation of redirect stubs. Forks off `discover` directly.
- `deriveSitemap` --- absolute-URL list for `sitemap.xml`. Deferred to `dispatch` so it runs while the main thread would otherwise be idle waiting on render workers.
- `resolveBookChapters` --- resolves the `_book.yml` chapter selectors to `Page` references. Identity-critical: the same `Page` objects must be visible to `writePdf` after the render fan-out has populated `renderedContent`.

### Render

`dispatch` is the fan-out point. It chunks `state.pages` into `workerCount × 10` slices (`SLICES_PER_WORKER = 10`), allocates 2N dynamic task slots in the SAB, wires each `render:i` → `[renderJoin, flush:i]` and each `flush:i` → `[flushJoin]`, packs the per-chunk page data into a payload SAB and the per-build shared payload into a second SAB, broadcasts both to every worker, and activates the `render:i` tasks.

```
dispatch ┬→ render:0 ─┬→ flush:0 ─┐
         ├→ render:1 ─┼→ flush:1 ─┤
         │   ⋮        │   ⋮       │
         ├→ render:N ─┴→ flush:N ─┤
         │                        │
         └→ renderJoin ←──────────┘
                ↓             ↓
            searchData    flushJoin
```

- `renderEnvInit` (worker, `on_demand` + `unique_per_worker`) --- per-lane render environment setup: unpack the shared SAB, reconstruct the link-table Maps, instantiate the worker's own markdown-it. Declared as a `perWorkerDeps` on every `render:i` so the first render claim per lane pulls it in.
- `render:i` (worker, dynamic) --- the per-chunk compute. Each one runs five sub-stages over its slice of `state.pages`: `renderPhase` (markdown-it body render) → `computeChunkSeo` (per-page SEO fields) → `templatePhase` (just-the-docs layout wrap) → `deriveOfflinePageCached` (offline HTML rewrite) → `deriveSearchEntries` (per-section search entries). Returns a delta containing `renderedContent` per page, plus the per-chunk search entries.
- `flush:i` (worker, dynamic, `pin_to_predecessor`) --- writes the chunk's page HTML to disk on the same worker that rendered it. Online tree always; offline tree too unless `skipOffline`. The pinning is what makes per-chunk flush correct: the worker stores a batch on its own `_pendingFlush` FIFO at the end of `render`, and only the matching `flush:i` ever drains it.
- `renderJoin` (main, `on_demand`) --- barrier that unblocks `searchData`. Its dep count is set to N by `dispatch.submit()`.
- `flushJoin` (main, `on_demand`) --- barrier that aggregates per-chunk write stats and gates `writeAux` + `writePdf`.

### Write

Once `renderJoin` fires the auxiliary writers can run; once `flushJoin` fires the offline mirror and the PDF source tree can be assembled.

- `writeAssets` (main) --- writes generated CSS, copies vendored theme JS, copies the project's static files. Page HTML is *not* written here --- the per-chunk `flush:i` tasks already did that. Depends on `prepPageDirs` so the directory tree exists.
- `searchData` (main) --- concatenates `state.searchChunks` (already populated by each `render:i`'s `submit()`), renumbers the global `i` index, writes `search-data.json`. The heavy work (heading split, content sanitisation, URL encoding) ran on the workers; this task only consolidates.
- `writeAux` (main) --- writes redirect stubs + sitemap + robots.txt. Depends on `writeAssets`, `searchData`, `flushJoin`, `deriveRedirects`, `deriveSitemap`.
- `writeOffline` (main) --- produces `_site-offline/`. The per-page offline HTML was already computed inside `render:i` and written by `flush:i`, so this task only handles the cross-cutting work: CSS url() rewriting, the just-the-docs.js AST patch, the `search-data.js` wrapper, theme assets, redirect stubs.
- `writePdf` (main) --- assembles `_site-pdf/book.html` and copies the images it references. Depends on `flushJoin` (so `renderedContent` is filled), `resolveBookChapters` (so `bookData._chapters` is wired), and `dot` (so diagram SVGs are in `staticFiles`).

## What runs where

For a one-page reference, every task and its execution locus:

| Section | Task | Locus | Notes |
|---|---|---|---|
| Seeds | `config` | main | Trivial read; output feeds `discover` directly. |
| Seeds | `buildInfo` | worker | Two `git` shell-outs in parallel. |
| Seeds | `scssLight`, `scssDark` | workers | Light + dark palettes compile concurrently. |
| Seeds | `scss` | main | Joins light + dark; writes online + offline CSS. |
| Seeds | `dot` | worker | WASM Graphviz; init hides behind the main spine. |
| Seeds | `highlighterInit` | main | Palette CSS only. |
| Seeds | `warmInit` | worker (per lane) | Per-worker Shiki bootstrap. `on_demand` + `run_when_idle`. |
| Seeds | `prepDest`, `prepPageDirs` | main | Deferred to after `dispatch`. |
| Spine | `discover`, `nav`, `buildInit`, `markdownInit`, `loadData`, `deriveRedirects`, `deriveSitemap`, `resolveBookChapters`, `dispatch` | main | Spine is single-threaded by design. |
| Render | `renderEnvInit` | worker (per lane) | First-render-claim cost on each lane. |
| Render | `render:i` | worker | Body + SEO + template + offline + search per chunk. |
| Render | `flush:i` | worker (pinned) | Page HTML write, online + offline. |
| Render | `renderJoin`, `flushJoin` | main | Barriers. |
| Write | `writeAssets`, `searchData`, `writeAux`, `writeOffline`, `writePdf` | main | I/O bound; cooperative async concurrency. |

Three pieces of work newly distributed to render workers under the current design:

1. **Per-page SEO** (`computeChunkSeo`) --- was a single Phase 2 main-thread task; now runs per chunk inside `render:i`, between `renderPhase` and `templatePhase`. The values are written into the page objects on the worker and travel back as part of the render delta.
2. **Per-page offline HTML** (`deriveOfflinePageCached`) --- was a Phase 7 main-thread pass that re-read the online tree; now runs per chunk inside `render:i` after `templatePhase`. The resulting `offlineHtml` is stored on the page and written by the matching `flush:i` directly to `_site-offline/`.
3. **Per-chunk search entries** (`deriveSearchEntries`) --- was a Phase 6 main-thread task; now runs per chunk inside `render:i`. Each chunk's entries are stored at `state.searchChunks[i]` by the render `submit()`; the `searchData` task only flattens, renumbers, and writes the JSON.

Per-chunk page HTML writes were similarly pulled off the main thread: each `flush:i` writes its chunk's pages to disk on the same worker that rendered them, with the pinning enforced by `pin_to_predecessor`.

## Page deltas and shared state

The scheduler owns a `SharedState` instance with five fields:

| Field | Type | Filled by |
|---|---|---|
| `pages` | `Page[]` | `discover.submit()`. Never reassigned afterwards --- only mutated in place. |
| `staticFiles` | `StaticFile[]` | `discover.submit()`, plus appends from `dot.submit()` for freshly-regenerated SVGs. |
| `site` | `object` | Populated progressively by every spine task's `submit()`. |
| `pageByDest` | `Map<destPath, Page>` | `discover.submit()`. Used by render `submit()` to merge deltas into the master `Page` objects. |
| `searchChunks` | `Array<Array<entry>>` | Pre-allocated to length N by `dispatch.submit()`; each `render:i.submit()` writes one slot. |

Worker output flow: a worker posts `{ done: taskIdx, output, timing, lane }` to the main thread → the pool callback hands it to `Scheduler._onWorkerDone()` → the task's `submit()` runs on the main thread and merges the delta into the master `pages[]` via `pageByDest` → the worker then runs `onTaskDone()` to flip the SAB status to `DONE` and wake any sibling that was waiting on this task. The message-then-SAB ordering matters: a downstream main-thread task could otherwise be claimed before its predecessor's output had arrived.

`render:i.submit()` mutates the master `Page` objects in place (`renderedContent`, `offlineMisses`) and writes the chunk's search entries into `state.searchChunks[i]`. Identity is preserved: `resolveBookChapters` stores `Page` references into `bookData._chapters` during the spine, and `writePdf` reads `renderedContent` from those same objects after the render fan-out has filled them in.

## Render fan-out in detail

`dispatch.execute()` runs on the main thread and assembles two SAB payloads:

- **Per-task payload SAB** --- one JSON blob per `render:i`, each containing the chunk's `Page` objects. `chunkOffset[i]` / `chunkLength[i]` index into the buffer.
- **Shared payload SAB** --- one JSON blob broadcast to every worker, containing the site config, site-level SEO constants, pre-rendered sidebar + chrome (`initData`), serialized link tables (`[key, permalink]` pair arrays), the static-file relative-path set, the baseurl, the site-paths set for offline rewriting, the `offline_exclude` patterns, and the `skipOffline` flag.

`dispatch.submit()` allocates 2N dynamic slots from the generic pool in `sab-scheduler.mjs`, writes their handler IDs and per-worker dep lists, wires the successor edges, pins each `flush:i` to its `render:i`, calls `broadcastDynamicData(payloadSAB, sharedSAB)` (one `postMessage` per worker carrying the two SAB references --- shared memory, not cloned), and finally flips the `render:i` slots to `READY`. Workers see the new tasks on their next scan.

When a worker claims its first `render:i`, the per-worker dep on `renderEnvInit` is unsatisfied. The pull loop detects that the unsatisfied dep is an `on_demand` worker task and runs it inline, on the same lane, before continuing. `renderEnvInit` in turn has `warmInit` as its own per-worker dep --- if `warmInit` has not yet run on this lane (e.g. the lane never got idle time during the spine), the pull loop recurses: run `warmInit`, then `renderEnvInit`, then claim a fresh `render:i`. The nesting depth is bounded at one level.

Each `render:i` runs five sub-stages over its chunk:

1. `renderPhase(chunk, env.site)` --- the markdown-it body render.
2. `computeChunkSeo(chunk, env.site.seoSiteTitle, env.site.config, env.site.markdown)` --- per-page SEO fields.
3. `templatePhase(chunk, env.site, env.initData)` --- just-the-docs layout wrap. `env.initData` is the pre-rendered chrome from `dispatch`.
4. Offline rewrite (when `!skipOffline`) --- per destination directory, render the first page through `deriveOfflinePage` and slice out the nav block. Subsequent pages in the same directory substitute the sliced nav with a cached output, run the rewriter over the smaller string, and splice the output back in. Saves ~200 ms across the build.
5. `deriveSearchEntries(chunk, env.site)` --- per-section search-index entries.

The worker stores the writable pages on its own `_pendingFlush` FIFO and returns the deltas. The matching `flush:i` --- pinned to this lane --- claims later, pops the batch, and writes the page HTML to disk. The pinning is what guarantees the batch lands on the right worker; the FIFO is what handles the case where a worker has already started a second `render:i` before its first `flush:i` claims.

## Persistent worker pool and serve mode

In one-shot build mode, the pool is constructed at the top of `runBuild()` and destroyed at the bottom. In serve mode, `runServe()` constructs the pool once and reuses it across every rebuild: each `runBuild()` call allocates a fresh SAB, sends it to the workers via a new `init` message, and waits for the build to complete --- but the workers themselves are alive throughout.

Three flags on the pool make the reuse safe:

- **Per-lane Shiki survives.** `warmInit` has `survives_reset`, so the per-lane done flags are pre-filled when the SAB is allocated on the second-and-later builds. Workers still hold the highlighter in module scope, so the per-lane `warmInit` body is never re-run; `render:i` proceeds straight to `renderEnvInit`, which does need to re-run since it pulls config and link tables out of the new shared SAB.
- **Pool's `_buildCount` distinguishes first from subsequent builds.** `runBuild` reads it via `pool._buildCount > 0` to know whether to skip injecting boot timings into the Gantt chart.
- **Boot timings are emitted once.** Workers post a `coldBoot` message on their first init; subsequent inits do not.

`serve.mjs` writes to `docs/_serve/` --- disjoint from `build.bat`'s `_site/` family. A one-off `build.bat` run during a serve session never touches the tree the live preview is showing.

## SVG inlining

Markdown `![alt](/assets/images/foo.svg)` references to build-local SVGs are replaced at render time with the SVG content inlined directly in the HTML. The feature removes the browser round-trip for separate SVG files and adds interactive controls (zoom, download, clipboard copy) to every inlined diagram.

The pipeline:

1. **`dispatch.execute()`** reads every `.svg` static file into a `svgContentsMap` keyed by `srcRel`. The map is packed into the shared SAB and broadcast to every render worker.
2. **`renderEnvInit`** on each worker unpacks `svgContentsMap` and passes it as `svgContents` to `createMarkdownIt`.
3. **`svgInlinePlugin`** in `render.mjs` overrides the markdown-it image renderer. When the `src` ends in `.svg` and the file's content exists in `ctx.svgContents`, the plugin replaces the `<img>` tag with a wrapper structure containing the raw SVG, four control links (Download SVG, Copy SVG, Download PNG, Copy PNG), and a click-to-zoom container. The plugin also sets `page.hasSvg = true`.
4. **`templatePhase`** conditionally includes `<script defer src="/assets/js/svg-inline.js">` on pages where `page.hasSvg` is true.

The wrapper HTML emitted by `buildSvgWrapper`:

```html
<div class="svg-inline-wrap">
  <div class="svg-controls">
    <a href="#" data-action="download-svg" data-filename="...">Download SVG</a>
    <a href="#" data-action="copy-svg">Copy SVG</a>
    <a href="#" data-action="download-png" data-filename="...">Download PNG</a>
    <a href="#" data-action="copy-png" data-filename="...">Copy PNG</a>
  </div>
  <div class="svg-container" data-svg-src="..." role="img" aria-label="...">
    <svg>...</svg>
  </div>
</div>
```

`svg-inline.js` (~80 lines, no dependencies) handles four client-side behaviours: click-to-zoom (fullscreen overlay, Escape to close), SVG download (serialises the `<svg>` to XML), SVG clipboard copy, and PNG export (renders the SVG to a 2048 px-wide canvas via `Image` + `toBlob`). The controls are hidden in print CSS.

Only SVGs whose content is present in `svgContents` are inlined; external URLs and missing files fall through to the default `<img>` renderer. The main-thread markdown-it instance (used only for site-level SEO) passes an empty map --- no SVG content needed there.

## Gantt chart and build introspection

Every build emits an inline-SVG Gantt chart of its task timeline. [`gantt.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/gantt.mjs)'s `renderGantt(grouped)` takes the `Map<section, taskTiming[]>` the scheduler accumulates and renders one SVG row per main-thread task plus one row per worker lane. Workers appear as a single row each with multiple coloured rectangles (one per task they ran, in completion order); the colour encodes the originating section. Boot timings (cold start, `warmInit`, `renderEnvInit`) appear as a distinct row group on the first build of a session.

The Gantt chart flows through the same SVG inlining pipeline as other diagrams. The [Build Info](BuildInfo) page contains a standard markdown image reference to a placeholder `gantt.svg`; during the render pass it becomes an inline SVG wrapper with zoom and export controls. After `writeOffline` completes, `tbdocs.mjs:injectGanttChart` locates the wrapper's `data-svg-src` marker in the rendered HTML and swaps the placeholder SVG content for the real Gantt chart. Both the online and offline copies of the page are patched; the on-disk `gantt.svg` file is also updated so the offline mirror's fallback stays current.

When adding a new task to `TASKS`, give it a `ganttSection` key matching one of `Seeds` / `Spine` / `Render` / `Write` so it lands in a coherent group. Tasks without a section fall into a generic "Other" bucket.

## Dependencies

A single `package.json` at the repo root contains everything --- the static site generator's deps, the PDF renderer's deps, and the few packages both consume:

```json
{
  "devDependencies": {
    "@hpcc-js/wasm-graphviz": "^1.21",
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
    "pdf-lib": "1.17.1",
    "puppeteer": "25.0.4",
    "sass": "^1.0",
    "shiki": "^1.0"
  }
}
```

No template engine, no framework, no bundler, no postinstall hooks. `acorn` + `acorn-walk` parse the upstream `just-the-docs.js` for the AST-based offline patcher; the `markdown-it-*` packages cover the dialect extensions the legacy parser supported; `shiki` is the syntax highlighter; `@hpcc-js/wasm-graphviz` is the WASM build of Graphviz that renders `.dot` diagram sources; `sass` is Dart Sass for the SCSS compile. `pdf-lib` + `html-entities` + `htmlparser2` + `puppeteer` are the PDF renderer's toolchain (puppeteer controls headless Chromium for the paged.js layout pass).

Node 22+ is required: the SAB scheduler uses `Atomics.wait`, `Atomics.notify`, and `SharedArrayBuffer` --- all baseline in Node 22 without flags.

## Asset layout

The site's `/assets/` tree at deploy time is assembled from three sources:

| Source on disk | What lives there | Phase that delivers it |
|---|---|---|
| `docs/assets/` | Project-owned content: the SCSS entry point, project JS (`theme-switch.js`, `svg-inline.js`), hand-written stylesheets (`print.css`, `just-the-docs-head-nav.css`), Graphviz/DOT diagrams (`.dot` sources + `.svg` renders), and any content images contributors add. | Discovered by [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs), copied by `writeAssets`. |
| `builder/vendor/just-the-docs/` | Vendored from the just-the-docs theme (v0.10.1): `_sass/` (the theme's SCSS sources, fed into the compilation) and `assets/js/just-the-docs.js` + `assets/js/vendor/lunr.min.js` (the chrome runtime, copied verbatim). See [`builder/vendor/just-the-docs/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/vendor/just-the-docs/README.md) for the inventory, re-vendoring procedure, and the in-tree patches applied to `just-the-docs.js`. | `_sass/` consumed by [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs); `assets/` copied by `writeAssets`. |
| Generated in-process | `just-the-docs-combined.css` (from `scss.mjs`) and `tb-highlight.css` (from `highlight-theme.mjs`). Neither is committed; both are rebuilt every run. | Written by `scss` (combined CSS) and `writeAssets` (highlight CSS). |

CSS files in either copy path get a baseurl rewrite (`url("/path")` → `url("<baseurl>/path")`) when the deployment baseurl is non-empty; the same transform applies to generated CSS so the `url("/favicon.png")` the SCSS entry point emits resolves correctly under sub-path deployments.

## What is NOT in builder/

Some build-adjacent code lives at the repo root rather than under `builder/`:

- **PDF rendering** --- `book/render-book.mjs` plus its `book/lib/*.mjs` helpers and the `paged.browser.js` bundle. `tbdocs` produces `_site-pdf/book.html`; the actual PDF render runs separately via `book.bat`. Both `pdf-lib` and `puppeteer` are used only at PDF time. See [PDF Generation](PDF-Generation) for the internals.
- **Link checking** --- `scripts/check_links.mjs` reads from disk after the build; not part of the generator.
- **External link crawling** --- `scripts/crawl_check.mjs` reads from HTTP; not part of the generator.
- **Graphviz/DOT source files** --- `docs/assets/images/dot/*.dot` are source, `*.svg` are build artifacts that `tbdocs` regenerates as needed.

## Drift guards and failure modes

The build aborts or flips the exit code under a handful of conditions:

- **Page-count drift.** `runBuild()` ends with `if (pages.length < 836) process.exitCode = 1` so a discover-rule regression that silently drops content appears as a non-zero exit even though the build itself completed.
- **SAB structural validation.** `verifySchedulerSAB(TASKS, views, idMapping)` runs immediately after allocation. A misconfigured `expected`/`perWorkerDeps` list, a duplicate task name, or a successor edge to an unknown task aborts the build before any task runs.
- **DOT render failure.** Per-diagram failures retain the previous SVG and continue the batch so every broken diagram appears in one run; the orchestrator flips `process.exitCode = 1` based on the failure count.
- **SCSS compile failure.** The light/dark workers warn with the source location and continue with `failed: true`; the joiner sets `process.exitCode = 1`. Existing `_site/` CSS lingers.
- **Nav integrity.** Orphan or ambiguous `parent:` declarations throw inside `nav.execute()`, which aborts the build via `Scheduler._abort()`.
- **Worker crash.** A worker handler that throws posts `{ taskFailed, message, stack }` to main; the scheduler calls `_abort()`, the build rejects, and the orchestrator reports the error with the task name in the message.

Setup-class failures --- `@hpcc-js/wasm-graphviz` not installed, `sass` missing --- print a one-line recovery hint and continue with stale outputs. They do not flip the exit code; a fresh checkout still builds.
