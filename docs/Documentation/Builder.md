---
title: tbdocs Builder
parent: Documentation Development
nav_order: 5
has_children: true
has_toc: false
permalink: /Documentation/Development/Builder
---

# tbdocs Builder
{: .no_toc }

Detailed technical documentation for the `tbdocs` static site generator at [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). Read this when modifying the build pipeline itself. Content contributors who only build, preview and ship documentation need none of it, with one exception: anyone adding or changing a CSS rule needs [Project styling](#project-styling), the full account of where a rule goes and of why one that works in the light theme can silently do nothing in the dark one.

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

One entry point, ~34 modules, three output trees, N+1 threads.

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
| [`dot-metrics.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/dot-metrics.mjs) | Installs Inter's real advance widths into the Graphviz WASM module before any layout runs, so a diagram's boxes are sized for the font the browser will actually paint. See [Diagram geometry](#diagram-geometry). |
| [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs) | Dart Sass over the vendored just-the-docs SCSS. Split across `scssLight` + `scssDark` worker tasks, joined on main. |
| [`vendor-assets.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/vendor-assets.mjs) | Downloads any YouTube poster frame or GitHub user-attachment image the markdown references and that is not already committed, into `docs/assets/thumbnails/` or `docs/assets/attachments/`, and hands the new files to the static-file copy pass. Idempotent; the artifacts are committed like the generated DOT SVGs. CI never downloads --- a referenced but uncommitted asset is a hard error there. |

**Render hot path**

| File | Role |
|---|---|
| [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) | markdown-it configuration + plugin stack + `renderPhase`. Built once on main and once per worker. The plugins worth knowing by name: `svgInlinePlugin` (build-time SVG embedding), `videoLinkPlugin` (a `{: .video }` link becomes a locally vendored poster frame), `remoteImagePlugin` (a user-attachment URL becomes the vendored copy, in both markdown and raw `<img>` syntax), and `headingLevelNormalizePlugin` (renumbers a page that uses h1 and h3 but no h2, so the built page has no heading skip). |
| [`highlight.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) | Shiki bootstrap + the bundled twinBASIC grammar. Emits the just-the-docs wrapper structure. |
| [`highlight-theme.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) | Loads `Light.theme` + `Dark.theme`, emits `tb-highlight.css` + scope-to-class lookup. Clamps any token colour that falls below 4.5:1 against the code-block background --- moving lightness away from the background while preserving hue and saturation --- so highlighted code meets WCAG AA; the emitted rule includes a `raised to 4.5:1` comment naming the original colour. |
| [`template.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) | `templatePhase` (per-page layout wrap) + `buildInitConfig` + `renderSidebar`. JS template literals; no template engine. Also `injectAnchorHeadings(html, headingsOut)`, which adds the permalink icon to each heading and collects the heading list as it goes, and `renderSectionLinks`, which spends that list on the per-page disclosure at the top of the footer. |
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

**Verification**

| File | Role |
|---|---|
| [`link-check.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/link-check.mjs) | The pure core: HTML in, findings out. No filesystem traversal and no CLI, which is what lets the build's fused check and the standalone [`scripts/check_links.mjs`](Tools#check-links) share one implementation. |
| [`check.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/check.mjs) | Build-side plumbing: the `TREES` table, per-chunk `checkChunk`, the `joinChunks` merge, report formatting, and the `--check-audit-index` tree-index audit. |
| [`check-tree.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/check-tree.mjs) | `deriveTreeRels` --- every relative path the build believes it emitted into a tree. The check's existence oracle is built from this rather than from a `readdir`, which is why the audit exists to keep it honest. |
| [`counts.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/counts.mjs) | The registry behind `{{tbdocs:<name>}}` in prose. `deriveCounts(state)` computes every name from build state; `countPlugin` substitutes them as a core rule over the inline token stream, which is what makes code immune without a rule for it. `validateCountNames` rejects an unknown name on main before any worker renders, and `findSurvivingPlaceholder` rejects one that reached the output --- two checks because they fail differently. See [Authoring Pages](Authoring#counts). |
| [`page-baseline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/page-baseline.mjs) | The page-count drift guard, and the committed `page-baseline.json` it compares against. A rise rewrites the file, a fall fails the build, and neither CI nor `--serve` may write. See [Building and Deployment](Building#the-page-count-drift-guard). |
| [`publish-policy.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/publish-policy.mjs) | The allowlist of file types that may reach a published tree. Enforced twice, unconditionally: over the static-file inventory in `discover`, and over each tree's `deriveTreeRels` inventory in `dispatch`. A finding aborts the build. See [Drift guards](#drift-guards-and-failure-modes). |

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

A single `SharedArrayBuffer` contains every Int32 array the scheduler needs. The sizes are static: `MAX_TASKS = 512`, `MAX_LANES = 64`, `MAX_EDGES = 2048`, total 174,100 bytes (170 KB). The arrays a reader is most likely to care about:

- `status[i]` --- the task lifecycle enum above.
- `depCount[i]` --- remaining predecessor count. Decremented atomically on each predecessor's completion.
- `succOffset[i]` / `succCount[i]` / `succList` --- flat successor edge list. `dispatch.submit()` extends the edge list at runtime to wire the dynamic render and flush tasks.
- `perWorkerDone[i*MAX_LANES + lane]` --- per-lane done flag for `unique_per_worker` tasks.
- `flags[i]` --- bitmask of the flags above.
- `notify` --- generation counter for `Atomics.wait` / `notify`.
- `buildDone` --- terminal flag set to 1 (success) or 2 (error) by `Scheduler._finish()` / `_abort()`. Workers poll this at the top of each pull-loop iteration and exit when it transitions away from 0.

The complete layout, allocation helper, and the `readTaskMeta` / `writeTaskMeta` API live in [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs).

## Task DAG by section

The pipeline has 32 named static tasks plus 2N dynamic ones (N render chunks + N flush tasks). The Gantt chart groups them into five sections that also organise the discussion below:

- **Seeds**: `buildInfo`, `scssLight`, `scssDark`, `config`, `warmInit`, `highlighterInit`, `discover`, `loadData`, `vendorAssets`
- **Spine**: `nav`, `dot`, `buildInit`, `markdownInit`, `deriveSitemap`, `deriveRedirects`, `resolveBookChapters`
- **Render**: `dispatch`, `prepDest`, `prepPageDirs`, `renderEnvInit`, `render:i`, `renderJoin`
- **Write**: `scss`, `flush:i`, `flushJoin`, `writeAssets`, `searchData`, `symbolIndex`, `writeAux`, `writeOffline`, `writePdf`
- **Check**: `linkJoin`, `checkBook`, `checkReport` --- present on every ordinary build, because `build.bat` always passes `--check-audit-index`

The task DAG, with every static task and every dependency between them, follows:

![A top-to-bottom dependency graph of the build tasks. Seeds with no predecessor sit at the top; discover feeds the spine, the spine feeds dispatch, and dispatch fans out the per-chunk render and flush work that the write and check tasks then consume. Node colour and a one-letter tag say whether a task runs on the main thread or on a worker, and dashed arrows mark the per-lane and data-only dependencies.](/assets/images/dot/scheduler-dag.svg)

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
- `prepDest` (main) --- cleans and recreates the destination trees: all three for a build, `_serve/` alone in serve mode. Deferred to after `dispatch` so the wipe does not contend with `discover`'s reads.
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
         │   :        │   :       │
         ├→ render:N ─┴→ flush:N ─┤
         │                        │
         └→ renderJoin ←──────────┘
                ↓             ↓
            searchData    flushJoin
            symbolIndex
```

- `renderEnvInit` (worker, `on_demand` + `unique_per_worker`) --- per-lane render environment setup: unpack the shared SAB, reconstruct the link-table Maps, instantiate the worker's own markdown-it. Declared as a `perWorkerDeps` on every `render:i` so the first render claim per lane pulls it in.
- `render:i` (worker, dynamic) --- the per-chunk compute. Each one runs five sub-stages over its slice of `state.pages`: `renderPhase` (markdown-it body render) → `computeChunkSeo` (per-page SEO fields) → `templatePhase` (just-the-docs layout wrap) → `deriveOfflinePageCached` (offline HTML rewrite) → `deriveSearchEntries` (per-section search entries). Returns a delta containing `renderedContent` per page, plus the per-chunk search entries.
- `flush:i` (worker, dynamic, `pin_to_predecessor`) --- writes the chunk's page HTML to disk on the same worker that rendered it. Online tree always; offline tree too unless `skipOffline`. The pinning is what makes per-chunk flush correct: the worker stores a batch on its own `_pendingFlush` FIFO at the end of `render`, and only the matching `flush:i` ever drains it. **When `--check` is on, the link and integrity check runs here too**, over the chunk's just-written HTML --- both trees' final strings are already decoded and in worker memory at that moment, so the check never writes ~270 MB out to read it back.
- `renderJoin` (main, `on_demand`) --- barrier that unblocks `searchData`, `symbolIndex` and `writePdf`. `dispatch.submit()` sets its dep count to N *and* rewrites its `expected` list with every chunk name; the dep count alone is not a barrier over the submits. See [Pipeline Stages](Pipeline-Stages#renderjoin-main-on_demand).
- `flushJoin` (main, `on_demand`) --- barrier that aggregates per-chunk write stats and gates `writeAux` + `writePdf`.

### Write

Once `renderJoin` fires the auxiliary writers can run; once `flushJoin` fires the offline mirror and the PDF source tree can be assembled.

- `writeAssets` (main) --- writes generated CSS, copies vendored theme JS, copies the project's static files. Page HTML is *not* written here --- the per-chunk `flush:i` tasks already did that. Depends on `prepPageDirs` so the directory tree exists.
- `searchData` (main) --- concatenates `state.searchChunks` (already populated by each `render:i`'s `submit()`), renumbers the global `i` index, writes `search-data.json`. The heavy work (heading split, content sanitisation, URL encoding) ran on the workers; this task only consolidates.
- `symbolIndex` (main) --- writes `tB/symbols.json`, the [symbol index](Building#the-symbol-index) the IDE help add-in reads. Reads the heading ids out of every `/tB/` page's `renderedContent`, joins them with the committed `builder/package-api.json`, and returns the index's URLs for the drift guard that `runBuild` runs once the build is done. Depends on `renderJoin` and `prepDest`; `checkReport` waits for it, because the file is in the online tree's index.
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
| Write | `writeAssets`, `searchData`, `symbolIndex`, `writeAux`, `writeOffline`, `writePdf` | main | I/O bound; cooperative async concurrency. |

Three pieces of work newly distributed to render workers under the current design:

1. **Per-page SEO** (`computeChunkSeo`) --- was a single Phase 2 main-thread task; now runs per chunk inside `render:i`, between `renderPhase` and `templatePhase`. The values are written into the page objects on the worker and travel back as part of the render delta.
2. **Per-page offline HTML** (`deriveOfflinePageCached`) --- was a Phase 7 main-thread pass that re-read the online tree; now runs per chunk inside `render:i` after `templatePhase`. The resulting `offlineHtml` is stored on the page and written by the matching `flush:i` directly to `_site-offline/`.
3. **Per-chunk search entries** (`deriveSearchEntries`) --- was a Phase 6 main-thread task; now runs per chunk inside `render:i`. Each chunk's entries are stored at `state.searchChunks[i]` by the render `submit()`; the `searchData` task only flattens, renumbers, and writes the JSON.

Per-chunk page HTML writes were similarly pulled off the main thread: each `flush:i` writes its chunk's pages to disk on the same worker that rendered them, with the pinning enforced by `pin_to_predecessor`.

## Page deltas and shared state

The scheduler owns a `SharedState` instance. Five fields are declared on the class in `builder/scheduler.mjs`; five more are attached by tasks as the build runs, for ten in all --- though `checkTrees` appears only under `--check`:

| Field | Type | Filled by |
|---|---|---|
| `pages` | `Page[]` | `discover.submit()`. Never reassigned afterwards --- only mutated in place. |
| `staticFiles` | `StaticFile[]` | `discover.submit()`, plus appends from `dot.submit()` and `vendorAssets.submit()` for freshly-generated or freshly-downloaded files. |
| `site` | `object` | Populated progressively by every spine task's `submit()`. |
| `pageByDest` | `Map<destPath, Page>` | `discover.submit()`. Used by render `submit()` to merge deltas into the master `Page` objects. |
| `searchChunks` | `Array<Array<entry>>` | Pre-allocated to length N by `dispatch.submit()`; each `render:i.submit()` writes one slot. |
| `sitePaths` | `Set<string>` | `deriveSitemap.execute()`. Every path the offline rewrite may point at --- pages, static files, redirect stubs, vendored theme assets --- broadcast to the render workers in dispatch's shared payload. |
| `checkStubs` | `Stub[]` | `deriveRedirects.submit()`. The link check needs it because redirect stubs are excluded from the sitemap / search / canonical assertions. |
| `checkTrees` | `{ [tree]: { rels, baseurl } }` | `deriveSitemap.execute()`, and only under `--check`. `rels` is what each tree is about to receive, derived from the build's own records, and `treeIndexFor()` turns it into the existence oracle the link check resolves against; `--check-audit-index` additionally compares it with what landed on disk. |
| `checkChunks` | `Array<chunkFindings>` | Created empty by `dispatch.submit()`; each `flush:i.submit()` pushes its chunk's reduction, which rides back on the flush result rather than crossing the thread boundary as raw link occurrences. |
| `checkChunkCount` | `number` | `dispatch.submit()`, set to N. `linkJoin` compares `checkChunks.length` against it and reports a short chunk list as an error on every tree, which fails the exit code --- a chunk that never arrived would otherwise mean the check quietly examined fewer pages and still reported a clean pass. |

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

## Diagram geometry

Graphviz decides how wide a node box must be, and the browser then paints the label inside it. Those are two measurements of the same string, and they only agree if both use the same font.

They did not. The WASM Graphviz build carries no font machinery at all --- no pango, no fontconfig, no freetype --- only the built-in width tables for the core PostScript families, and it falls back to Times for anything else. `fontname="Inter"` therefore measured exactly the same as a font that does not exist. Times is far narrower than Inter through the lowercase (`a` is 444 against 557 per 1000 em), so every box came out about 11% too small, and 27 labels across the three diagrams that predate this were painted outside their boxes.

[`dot-metrics.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/dot-metrics.mjs)'s `applyInterMetrics()` fixes that before any layout runs. After `Graphviz.load()`, the family table lives in the module's linear memory, reachable through `_module.HEAPU8`, and it is read on every layout rather than cached --- so overwriting the Times family's four width arrays (regular, bold, italic, bold-italic) with Inter's advances is enough, and Inter's own fallback to Times is what routes the lookup there. The widths come from `builder/inter-metrics.json`, generated by `scripts/build_dot_metrics.mjs`. Measured against the site's diagram labels, this takes Graphviz from 11.4% under on average to 0.5% over.

Three things stop that from failing silently:

- `locateTimesFamily()` requires **exactly one** match against the published Times AFM widths, and spot-checks all four arrays. An `@hpcc-js/wasm-graphviz` bump that moves the table fails loudly rather than silently reverting to Times metrics.
- `assertMeasuresInter()` lays out a real string afterwards and checks the box came back Inter-sized, so the whole chain is proven rather than the byte-writing assumed.
- If either fails, `regenerateDot` emits nothing and flips the exit code. A stale but correct SVG beats a freshly wrong one.

The residual 0.5% is kerning, which a per-character table cannot express. It errs wide --- the table over-estimates --- so boxes come out slightly generous rather than slightly tight. `scripts/check_dot_fit.mjs`, run from `check.bat`, is what proves that stayed true: it renders every committed diagram with the real webface and fails if any label sits outside its box.

## Gantt chart and build introspection

Every build emits an inline-SVG Gantt chart of its task timeline. [`gantt.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/gantt.mjs)'s `renderGantt(grouped)` takes the `Map<section, taskTiming[]>` the scheduler accumulates and renders one SVG row per main-thread task plus one row per worker lane. Workers appear as a single row each with multiple coloured rectangles (one per task they ran, in completion order); the colour encodes the originating section. Boot timings (cold start, `warmInit`, `renderEnvInit`) appear as a distinct row group on the first build of a session.

The Gantt chart flows through the same SVG inlining pipeline as other diagrams. The [Build Info](BuildInfo) page contains a standard markdown image reference to a placeholder `gantt.svg`; during the render pass it becomes an inline SVG wrapper with zoom and export controls. After `writeOffline` completes, `tbdocs.mjs:injectGanttChart` locates the wrapper's `data-svg-src` marker in the rendered HTML and swaps the placeholder SVG content for the real Gantt chart. Both the online and offline copies of the page are patched; the on-disk `gantt.svg` file is also updated so the offline mirror's fallback stays current.

When adding a new task to `TASKS`, give it a `ganttSection` key matching one of `Seeds` / `Spine` / `Render` / `Write` so it lands in a coherent group. Tasks without a section fall into a generic "Other" bucket.

## Dependencies

A single `package.json` at the repo root contains everything --- the static site generator's deps, the PDF renderer's deps, the gates' deps, and the few packages several of them consume:

```json
{
  "devDependencies": {
    "@hpcc-js/wasm-graphviz": "^1.29.1",
    "acorn": "^8.0",
    "acorn-walk": "^8.0",
    "axe-core": "4.13.0",
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
    "recheck": "4.5.0",
    "sass": "^1.0",
    "shiki": "^1.0"
  }
}
```

No template engine, no framework, no bundler, no postinstall hooks. For the site generator, the `markdown-it-*` packages cover the dialect extensions the legacy parser supported; `gray-matter` splits off page frontmatter and `js-yaml` parses `_config.yml` and `_book.yml`; `fast-glob` finds the source files; `shiki` is the syntax highlighter; `@hpcc-js/wasm-graphviz` is the WASM build of Graphviz that renders `.dot` diagram sources; `sass` is Dart Sass for the SCSS compile; `acorn` + `acorn-walk` parse the upstream `just-the-docs.js` for the AST-based offline patcher; and `htmlparser2` is the SAX parser under the link and integrity check. `puppeteer` + `pdf-lib` + `html-entities` are the PDF renderer's toolchain: puppeteer controls headless Chromium for the paged.js layout pass, and `html-entities` decodes the entities in the PDF outline's entries. `axe-core` + `puppeteer` also back the standalone accessibility checker ([`scripts/check_a11y.mjs`](https://github.com/twinbasic/documentation/blob/main/scripts/check_a11y.mjs)), which runs the same headless Chromium over the built pages, and `recheck` + `acorn` back the regex-safety gate ([`scripts/check_regex_safety.mjs`](https://github.com/twinbasic/documentation/blob/main/scripts/check_regex_safety.mjs)). Neither `axe-core` nor `recheck` is used by `tbdocs` itself.

**Which packages are pinned.** A package is pinned to an exact version where a new release could change what the build produces or what a gate reports without anything failing to say so: where the code patches the package or relies on its internals with no guard that fails when they change, or where the package's own results are what a gate reports. Everything else takes a caret range. Four packages are exact:

- `axe-core` --- the scan injects a copy of its bundle patched at source level, and its rules decide the accessibility gate's verdict. [PLAN-axe-perf.md](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-axe-perf.md) records why the pin is exact.
- `pdf-lib` --- the shims under `book/lib/` are line-by-line ports of this release's source, and pdf-lib is no longer maintained; [08-pdf-lib.md](https://github.com/twinbasic/documentation/blob/main/perf/notes/08-pdf-lib.md) records the pin.
- `puppeteer` --- the book renderer and the accessibility gate measure what its Chromium renders, and the performance notes reason about that version at source level. It was pinned in the same change as `pdf-lib`.
- `recheck` --- the regex-safety gate reports its analysis, and finds its native backend itself, because this release cannot find it on Windows; [WIP.Build.md](https://github.com/twinbasic/documentation/blob/main/WIP.Build.md) records the workaround.

`@hpcc-js/wasm-graphviz` is patched too, and takes a caret range on purpose: [`dot-metrics.mjs`](#diagram-geometry) finds Graphviz's width table by an exact signature match and fails the build when a new release moves it, so an upgrade cannot change the diagrams silently. A change to `package.json` updates this section in the same commit.

Node 22+ is required: the SAB scheduler uses `Atomics.wait`, `Atomics.notify`, and `SharedArrayBuffer` --- all baseline in Node 22 without flags.

## Asset layout

The site's `/assets/` tree at deploy time is assembled from three sources:

| Source on disk | What lives there | Phase that delivers it |
|---|---|---|
| `docs/assets/` | Project-owned content: the two SCSS entry points, project JS (`theme-toggle.js`, `svg-inline.js`), hand-written stylesheets (`print.css`, `just-the-docs-head-nav.css`), Graphviz/DOT diagrams (`.dot` sources + `.svg` renders), the self-hosted webfaces under `fonts/` (subset `.woff2` plus their OFL licences), and any content images contributors add. | Discovered by [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs), copied by `writeAssets`. |
| `builder/vendor/just-the-docs/` | Vendored from the just-the-docs theme (v0.10.1), and patched in tree rather than held pristine: `_sass/` (the theme's SCSS sources, fed into the compilation --- 30 of its files differ from the v0.10.1 originals) and `assets/js/just-the-docs.js` (also patched) + `assets/js/vendor/lunr.min.js` (unmodified); both JS files are copied verbatim into the output. See [`builder/vendor/just-the-docs/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/vendor/just-the-docs/README.md) for the file-by-file inventory, the re-vendoring procedure, and the in-tree patches --- which cover `_sass/` as well as `just-the-docs.js`. | `_sass/` consumed by [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs); `assets/` copied by `writeAssets`. |
| Generated in-process | `just-the-docs-combined.css` (from `scss.mjs`, over the two entry points plus every partial under `docs/_sass/` --- see [Project styling](#project-styling)) and `tb-highlight.css` (from `highlight-theme.mjs`). Neither is committed; both are rebuilt every run. | Written by `scss` (combined CSS) and `writeAssets` (highlight CSS). |

The fonts are committed artifacts, like the DOT renders: `scripts/build_fonts.py` regenerates them from pinned upstream releases, and the build neither downloads nor subsets anything. The stylesheets reference them with a *relative* `url("../fonts/...")` rather than a root-absolute path, so the same compiled CSS resolves in the online tree, the `file://` offline mirror, a `--baseurl` deployment and the sparse PDF tree without any rewrite. `builder/pdf.mjs` copies the six faces `print.css` declares into `_site-pdf/` explicitly, since that tree is sparse and carries only what the book render needs.

CSS files in either copy path get a baseurl rewrite (`url("/path")` → `url("<baseurl>/path")`) when the deployment baseurl is non-empty; the same transform applies to generated CSS so the `url("/favicon.png")` the SCSS entry point emits resolves correctly under sub-path deployments.

The project JS is deliberately small. `theme-toggle.js` implements the three-state (system / light / dark) theme switch as a progressive enhancement over the no-JS `prefers-color-scheme` default: the correct palette renders even with scripting disabled, and the script only adds the manual override that persists a `data-theme` choice. `svg-inline.js` powers the click-to-zoom overlay and the download / copy controls on inlined diagrams. (An earlier `theme-switch.js` was replaced by `theme-toggle.js` when the two-state switch grew a system-follows-OS state.)

## Project styling

**Every hand-written style rule the project owns lives under `docs/_sass/`.** A CSS rule for a new component goes there --- not into the vendored theme sources under `builder/vendor/just-the-docs/_sass/`, and not into a new stylesheet of its own. Everything under `docs/_sass/` compiles into one asset, `assets/css/just-the-docs-combined.css`, which is the stylesheet every page loads.

**The vendored tree is not pristine upstream and must not be re-vendored wholesale.** 30 of its files differ from the v0.10.1 originals: 26 modified and 4 deleted. Most of that is a mechanical Sass `@import`-to-`@use` migration, which is repeated against the new upstream rather than ported. Six files are not mechanical --- `buttons.scss`, `code.scss`, `layout.scss`, `navigation.scss`, `search.scss` and `support/_variables.scss` hold accessibility fixes made against measured failures: `.btn-reset` at 1.39:1 on the dark background, the site footer moved from 2.82:1 to 7.20:1, three focus rings upstream ships without, and two palette variables raised to AAA. Overwriting the tree from a fresh tarball reverts all six at once. The build does not notice, and `check.bat` only half does: the axe scan reports the contrast regressions, but axe checks only that a control is reachable and named, not that its focus ring is visible, so the three ring patches would go back without a word. [`builder/vendor/just-the-docs/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/vendor/just-the-docs/README.md) is the procedure of record: it names every diverged file, the commit each patch came from, and the step order a re-vendor has to follow.

`.scss` is build input, never a published asset. `_config.yml`'s `exclude:` drops `**/*.scss` from the source walk, so a partial is compiled and its source is not copied out. Nothing under `docs/_sass/` reaches a deploy tree as a file.

| File | What it holds |
|---|---|
| `custom/custom.scss` | The bulk of the project's CSS: `.sr-only`, the inline-diagram controls and container, the table-wrapper focus ring, the page footer and its divider, the `.section-links` disclosure, `.site-logo`, the code-size overrides (as the `tb-code-overrides` mixin), the theme toggle, the aux-nav focus rings, `.video-link`, footnote back-links, `<summary>` target sizing, and in-heading links. Shadows the vendored theme's empty `custom/custom.scss` hook by load-path order. |
| `custom/_theme.scss` | The `dark-theme` mixin and nothing else. Every dark-mode rule in the project passes through it. |
| `custom/_fonts.scss` | The `@font-face` rules for the self-hosted faces, plus the `$tb-body-font-family` / `$tb-mono-font-family` stacks. The faces are wrapped in an `emit-font-faces` mixin so they are emitted exactly once, from the light compilation: the dark compilation re-emits its whole payload under two selectors, and an `@font-face` nested inside a selector is invalid. |
| `custom/admonitions.scss` | The GFM admonition palette, light and dark, ported out of the old Jekyll gem so the rules ship once in the site stylesheet instead of being inlined into every page's `<head>`. |
| `modules-dark.scss` | Not a partial anyone `@use`s directly: it is the dark **configuration** of the whole just-the-docs module tree --- one `@use "modules" with (…)` carrying the dark palette --- loaded only by `meta.load-css()` from inside the `dark-theme` mixin. It also re-passes the two font stacks, which are not dark-specific: omit them and the site renders Inter in light mode and the system stack in dark, for the specificity reason below. |

Two plain-CSS stylesheets sit outside the Sass pipeline and are copied verbatim: `docs/assets/css/print.css`, which is the book's complete design and loads no just-the-docs styles at all, and `docs/assets/css/just-the-docs-head-nav.css`. A web style change does not belong in either.

### Two compilations, one stylesheet

`scss.mjs` runs Dart Sass twice, on two worker tasks, over two entry points:

- `scssLight` compiles `docs/assets/css/just-the-docs-combined.scss` --- the light palette. This is where `custom/custom.scss` is `@use`d, so everything in it is emitted once, at root level, and where `emit-font-faces` is included.
- `scssDark` compiles `docs/assets/css/just-the-docs-dark.scss` --- the same module tree configured from `modules-dark.scss`, wrapped in the `dark-theme` mixin.
- `scss` (main) concatenates the two results and writes the single combined CSS asset to `_site/` and `_site-offline/`, applying the baseurl `url()` rewrite on the way.

Two compilations rather than one because **Dart Sass keeps one module cache per `compile()` call, and a module URL can be loaded once per compilation with one variable configuration.** The dark theme needs `modules.scss` with different variable values, which is only reachable from a fresh compilation with its own empty cache. `meta.load-css()`'s `$with` map writes to that same cache, so it is no escape hatch either --- which is why the light entry point loads `modules` exactly once and hardcodes the two literal colours it would otherwise read from a Sass variable.

The `dark-theme` mixin in `custom/_theme.scss` emits its content **twice**:

```scss
@mixin dark-theme {
  @media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) { @content; }
  }
  html[data-theme="dark"] { @content; }
}
```

The first copy is the no-JS system default, with `:not([data-theme="light"])` as the escape hatch for a reader who has forced light. The second is the explicit toggle choice, which wins even on a light OS because it is emitted last at equal specificity. The duplicated text compresses away over the wire. A single-source alternative --- a custom-properties token layer --- is tracked in `builder/FUTURE-WORK.md`.

### The specificity trap

**This is the one thing to know before writing any rule here.** The dark compilation re-emits *every* just-the-docs base rule inside that mixin, so a bare element selector in the theme reappears scoped to the theme root. Both dark selectors are (0,1,1), so:

| Rule | Light | Dark re-emission |
|---|---|---|
| `a { text-decoration: none }` (theme `base.scss`) | (0,0,1) | `html[data-theme="dark"] a` --- (0,1,2) |
| `hr { margin: $sp-6 0 }` (theme `base.scss`) | (0,0,1) | `html[data-theme="dark"] hr` --- (0,1,2) |
| `.main-content ul { margin-top: 0.5em }` (theme `content.scss`) | (0,1,1) | `html[data-theme="dark"] .main-content ul` --- (0,2,2) |

So a **single-class rule that overrides a bare element selector applies in light mode and silently does not in dark**. `.reversefootnote` at (0,1,0) loses to (0,1,2). The remedy is to prefix the selector with `.main-content`: `.main-content .reversefootnote` is (0,2,0) and wins in both themes.

That is the general rule, and it has two extensions:

- **`.main-content` is not always enough.** When the rule being overridden is itself scoped under `.main-content` upstream, the dark copy lands at (0,2,2) and a (0,2,1) override still loses --- which is what `.section-links > ul` hit. Either climb another level or emit a matching rule inside `dark-theme` yourself; `custom.scss` does the latter for that case.
- **Site chrome outside `<main>` has no `.main-content` to reach for.** An `<hr>` that is a direct child of the main-content element takes `#main-content > hr` at (1,0,1); the theme toggle has to beat `html[data-theme="dark"] .btn-reset:focus-visible` at (0,3,1), so `#theme-toggle:focus-visible` at (1,1,0) is what clears it. An id selector is the usual answer here.

**The trap has shipped at least three times** --- the footnote underline, the footer `hr` margins, and `.section-links > ul`, which had been silently inheriting the body-prose list margin since the day it landed. Each time the rule worked in light mode, so it looked correct to the person who wrote it.

Prefer a selector that wins on its own terms over one that wins by source order. Equal-specificity rules are decided by position in the concatenated output, and the light half always precedes the dark half.

### Verifying a style change

Run `serve.bat` and look at the page **in both themes**. This is not a formality: a dark-mode specificity revert is usually cosmetic, produces no error and no warning, and no gate catches it. Use the theme toggle rather than the OS setting, so the `[data-theme]` half is what gets exercised. Do not judge styling by opening a built page as a `file://` URL --- the online tree references its assets root-absolutely, so a `file://` page loads unstyled and any conclusion about colour or spacing drawn from it is worthless.

Then `build.bat && check.bat`. A malformed rule surfaces as an SCSS compile failure, which warns with the source location and flips the exit code rather than aborting --- so the previous build's CSS lingers in `_site/` and the site appears to still work; read the build output, do not judge by the page. `check.bat`'s accessibility scan covers every sample page in both themes for exactly the reason above, and its `target-size` and `color-contrast` rules are where a geometry or palette change lands. If the new component introduces markup the site has not used before, also add a construct family to `scripts/pick_a11y_sample.mjs` --- see [Tools and Scripts](Tools#pick-a11y-sample) --- or no axe rule keyed on it will run anywhere.

## Changing a typeface

This follows on from [Project styling](#project-styling). The site uses three faces --- Inter for text, Cascadia Mono for code, and Source Serif 4 for the body text of the PDF book --- and the build names them in far more places than the stylesheet. Only some of those places fail loudly when one is missed. In the order a change would go:

1. **The font files** (all three faces). [`scripts/build_fonts.py`](Tools#build-fonts) downloads each face's pinned release, verifies its SHA-256, subsets it, and writes the `.woff2` files and their licences into `docs/assets/fonts/`. A new face is an entry in its `SOURCES` table --- the release URL, the hash and the licence --- and one entry per file in `FACES`: the file inside the archive, the pinned axes, the Unicode ranges and the output name. Keep the output `.woff2`, which is the only font format the [publish allowlist](Building#what-the-build-refuses-to-publish) accepts.
2. **The web stylesheet** (Inter and Cascadia Mono). `docs/_sass/custom/_fonts.scss` holds the `@font-face` rules, inside the `emit-font-faces` mixin, and the `$tb-body-font-family` and `$tb-mono-font-family` stacks, which `docs/assets/css/just-the-docs-combined.scss` passes into the theme. `docs/_sass/modules-dark.scss` passes them again for the dark compilation, and `docs/assets/css/just-the-docs-dark.scss` uses the mono stack once more for `pre`, `kbd` and `samp`. All of these read the two variables, so replacing a face inside an existing stack changes nothing in them. A new stack has to be passed in both compilations, or the dark theme keeps the system fonts --- the [specificity trap](#the-specificity-trap) again.
3. **The preloads** (the two roman web faces). `fontPreloads()` in `builder/template.mjs` preloads `inter-variable.woff2` and `cascadia-mono-variable.woff2` by name, from its `PRELOAD_FONTS` list. It sets `crossorigin`, which a font preload needs even from the same origin: without it the browser downloads the file twice. A preload of a file that does not exist is a broken link on every page, and the build's link check reports it. The link-check fixture under `test/fixtures/check-src/assets/fonts/` holds stub files under the same two names, so renaming either file means renaming its stub too, or [`check_links_diff.mjs`](Tools#check-links-diff) fails on every pull request.
4. **The book** (all three faces). `docs/assets/css/print.css` is the whole design of the PDF and loads nothing from the Sass build, so it has its own `@font-face` block and its own stacks. `REQUIRED_FONTS` in `builder/pdf.mjs` names the same six files and copies them into the sparse `_site-pdf/` tree. Keep the two in step: the PDF pass aborts on a listed file that does not exist, and a face `print.css` uses that was not copied fails to load, which aborts the book render.
5. **Diagram exports** (Inter and Cascadia Mono). `FONT_FILES` in `docs/assets/js/svg-inline.js` maps each family name to its weight range and file names, and the Download and Copy buttons embed those files in an exported SVG or PNG. A family it does not list is exported without its face and without a message; a listed file that no longer exists costs one console warning.
6. **The Gantt chart** (Inter). `builder/gantt.mjs` writes a `<style>` of its own into the chart on the [Build Info](BuildInfo) page, with its own copy of the text stack.
7. **The diagram sources** (Inter). Every `.dot` source names the face in its `fontname` attributes, and the browser paints the rendered SVG in whatever those name. The new name must be one Graphviz does not recognise. The widths in the next step are written over the table Graphviz falls back to for an unknown name, so a name it does recognise --- one of its built-in PostScript families, such as Helvetica --- is measured from that family's own table instead.
8. **The diagram metrics** (Inter). Graphviz sizes the boxes from the width table in `builder/inter-metrics.json` --- see [Diagram geometry](#diagram-geometry) --- and the tools around that table are written for Inter by name. [`scripts/build_dot_metrics.mjs`](Tools#build-dot-metrics) measures the family `Inter` from Inter's two `.woff2` files, and [`scripts/check_dot_fit.mjs`](Tools#check-dot-fit) loads the same two files to paint what it measures, so a new face means editing both: rerunning the generator alone measures Inter again. `builder/dot-metrics.mjs` reads the table as `inter-metrics.json`, and `builder/dot.mjs` lists that file in `GENERATOR_FILES`, which is what makes a new table re-render every diagram; rename the file and both have to follow. Then run `check_dot_fit.mjs`.
9. **The accessibility sweep.** Run [`scripts/sweep_a11y.mjs`](Tools#sweep-a11y) over the whole site, not only `check.bat`'s sample. axe's `target-size` rule measures rendered boxes, and an inline element's height is its font's content area, so the results move with the face. Several rules in `custom/custom.scss` exist because of measured content-area heights, and their comments give the numbers for the current faces.

Pages under `docs/Documentation/` also name the faces in prose, and nothing checks them. Search for the old face's name before committing.

## What is NOT in builder/

Some build-adjacent code lives at the repo root rather than under `builder/`:

- **PDF rendering** --- `book/render-book.mjs` plus its `book/lib/*.mjs` helpers and the `paged.browser.js` bundle. `tbdocs` produces `_site-pdf/book.html`; the actual PDF render runs separately via `book.bat`. Both `pdf-lib` and `puppeteer` are used only at PDF time. See [PDF Generation](PDF-Generation) for the internals.
- **Standalone link checking** --- `scripts/check_links.mjs` reads a built tree from disk. The generator does its own link and integrity check under `--check`, over the HTML still in worker memory; the script remains the tool for a tree the build did not produce.
- **External link crawling** --- `scripts/crawl_check.mjs` reads from HTTP; not part of the generator.
- **Accessibility checking** --- `scripts/check_a11y.mjs` runs puppeteer + axe-core over the built offline tree after the build; not part of the generator.
- **Graphviz/DOT source files** --- a `.dot` anywhere under `docs/` is source and its `.svg` sibling is a build artifact that `tbdocs` regenerates as needed. Shared diagrams live in `docs/assets/images/dot/`; one that belongs to a single page sits beside it, as `docs/Tutorials/CEF/Images/MonacoArchitecture.dot` does.
- **Webfont generation** --- `scripts/build_fonts.py` downloads the pinned Inter, Cascadia Code and Source Serif 4 releases, verifies their SHA-256, pins the optical-size axis where a face has one, and subsets the faces into `docs/assets/fonts/`. The code face the site uses is Cascadia Mono, the ligature-free cut that ships inside the Cascadia Code release. Dev tooling only; the `.woff2` files are committed and the build never runs it. [Changing a typeface](#changing-a-typeface) lists everything else a new face touches.
- **Diagram font metrics** --- `scripts/build_dot_metrics.mjs` measures Inter's advance widths in a browser and writes `builder/inter-metrics.json`, which `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. Dev tooling; the JSON is committed and the build never runs the generator. See [Diagram geometry](#diagram-geometry).
- **Diagram fit checking** --- `scripts/check_dot_fit.mjs` renders every committed diagram with the real webface and asserts no label sits outside the box Graphviz drew for it. Runs from `check.bat`, not from the build.

## Drift guards and failure modes

The build aborts or flips the exit code under a handful of conditions:

- **Page-count drift.** `runBuild()` ends by comparing this build's inventory against `builder/page-baseline.json` --- a committed file holding the page and static-file counts of the last build anyone committed. A rise rewrites it and says so; a fall fails the build. `discover()` returns {{tbdocs:pages}} pages today --- every `.md` and `.html` under `docs/` with a parseable frontmatter block, after `_config.yml`'s `exclude:`. It used to be `if (pages.length < 836)`, a constant written when the site had 836 pages, which by then left a margin of more than seventy: a collapse alarm rather than a drift check, and one that would not have fired on a repeat of the 37-page `AppGlobalClassObject/_App/` loss that [Authoring](Authoring#what-may-live-in-docs) describes. See [the page-count drift guard](Building#the-page-count-drift-guard) for why the baseline is a file rather than a tighter constant. What reports a single page depends on how it went missing: a page that loses its frontmatter --- a UTF-8 BOM in front of the `---`, or any line before it --- is reclassified as a static file, and the publish-policy sweep below then aborts the build naming the path, because `.md` is in neither extension set; a page dropped by an `exclude:` pattern is never seen at all, and the only report is the link check flagging broken links into it, so a page nothing links to disappears without a message. Nav integrity covers the remaining case only indirectly --- it fires when a *parent* disappears and strands its children, not when a leaf does.
- **SAB structural validation.** `verifySchedulerSAB(TASKS, views, idMapping)` runs immediately after allocation. A misconfigured `expected`/`perWorkerDeps` list, a duplicate task name, or a successor edge to an unknown task aborts the build before any task runs.
- **DOT render failure.** Per-diagram failures retain the previous SVG and continue the batch so every broken diagram appears in one run; the orchestrator flips `process.exitCode = 1` based on the failure count.
- **SCSS compile failure.** The light/dark workers warn with the source location and continue with `failed: true`; the joiner sets `process.exitCode = 1`. Existing `_site/` CSS lingers.
- **Nav integrity.** Orphan or ambiguous `parent:` declarations throw inside `nav.execute()`, which aborts the build via `Scheduler._abort()`.
- **Unpublishable file type.** Every non-page under `docs/` is copied into the output verbatim, so `publish-policy.mjs` holds an allowlist of types that may be published and throws on anything else --- in `discover` over the static-file inventory, naming the source path before a byte is written, and again in `dispatch` over each tree's derived inventory, which is the only sweep that sees redirect stubs, vendored theme assets and the generated auxiliaries. Neither is behind `--check`: a build run with checks off is exactly when nothing else is looking. This one aborts rather than setting an exit code, on the opposite reasoning to the link check below --- a broken link leaves a tree worth inspecting, a tree carrying a private key does not. `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are separate sets so the build can emit `sitemap.xml` and `search-data.json` without blessing a stray `docs/secrets.json`; [`scripts/check_publish_policy.mjs`](Tools#check-publish-policy) asserts they stay separate.
- **Redirect collision.** A `redirect_from:` entry becomes a stub page at that URL, so two ways of claiming one URL are refused in `deriveRedirectStubs()`: an entry pointing at a URL some page already publishes at, and two pages declaring the same entry. Both name the source file on each side --- a stub silently overwriting a real page, or one of two stubs silently winning, would be invisible in the output.
- **Destination collision.** `assertNoDestinationCollisions()` runs before the write phase and throws if any static file's destination path equals a page's. The static-file copy and the page write run in parallel, so without the check which one survived would depend on I/O ordering.
- **Missing PDF input.** Phase 8 aborts on three things the book cannot be assembled without: no page (or more than one) carrying `layout: book-combined`, a font listed in `REQUIRED_FONTS` absent from the source tree (naming `scripts/build_fonts.py`), and any image `book.html` references that is not under the source tree. The last is the one that fires in practice, and `--tolerate-missing-images` downgrades only that one to a warning.
- **A page the book manifest does not mention.** Not a failure: the book is complete for the manifest it was given. `bookCoverage()` compares every page with `_book.yml`'s entries and its `left_out:` list, and the summary prints a `book:` warning for a page in neither, a page in both, an entry that matches no page, and a landing or foreword URL that names no page. It runs only when the book is built, and [`check_book_coverage.mjs`](Tools#check-book-coverage) holds each finding to a probe. See [Book Configuration](Book-Configuration#pages-left-out-of-the-book).
- **Worker crash.** A worker handler that throws posts `{ taskFailed, message, stack }` to main; the scheduler calls `_abort()`, the build rejects, and the orchestrator reports the error with the task name in the message.
- **A worker that never returns at all.** The one failure with no error to report: a handler stuck in an unbounded loop, an exponentially backtracking regex or a promise that never settles posts nothing, so its successors' dependency counts never fall, `_remaining` never reaches zero, and the scheduler's promise never settles. Nothing in the SAB protocol can see it --- the scheduler is waiting on a message that is not coming. `Scheduler` therefore runs a `setInterval` watchdog: if no task completes for `--stall-timeout` seconds (default 120, `0` disables), it aborts with `{ stalled: true }` and prints the outstanding tasks split three ways --- claimed by a worker that never returned (the cause), runnable but unclaimed (including an `F_PIN_TO_PRED` task whose lane is the wedged one), and blocked on a predecessor (the consequence). A `render:` or `flush:` chunk additionally prints its source pages, through an optional `describe()` on the task def that nothing else reads. `Worker.terminate()` does end a thread spinning inside a regex, so the abort really ends the process. Under `--serve` the pool outlives a rebuild, so `serve.mjs` replaces the whole pool when it sees the `stalled` flag rather than identifying the wedged lane --- the SAB records the lane a task *completed* on, not the one that claimed it. See [when a build stops instead of failing](Building#when-a-build-stops) for the reader-facing form.
- **Link and integrity check** (`--check`). Deliberately the one failure that does *not* abort: a broken link still produces a valid site you want on disk to inspect, unlike a nav ambiguity, where the output itself would be wrong. The check tasks collect findings and `runBuild()` sets the exit code afterwards --- 1 for link failures, 2 for integrity failures, 3 for both, OR'd into whatever the build's own failures already claimed.
- **Incomplete parallel results.** Six checks along the chunk-merge path refuse to carry on with a piece missing: `renderJoin` asserts that every page has rendered content, `render:i`'s merge rejects a page the build does not know, the search index refuses both a page without content and a chunk that never arrived, the book refuses a chapter whose content is absent (as opposed to empty, which is legitimate), and a link-check chunk that errored fails the run instead of printing and passing. None can fire while the task graph is wired correctly. They exist because when it *was* wrong, every one of those places quietly skipped instead --- see below.

### Dependency counts order the work, not the build state

A worker posts its result to the main thread and *then* decrements its successors' dependency counts in shared memory. The main thread reads those counts directly out of shared memory, without first processing its message queue. A barrier's count can therefore reach zero while results are still pending and the `submit()` calls that merge them into build state have not run.

The scheduler's input check is what prevents this. A main-thread task returns to the ready set if any name in its `expected` list is absent from the results map, and a result is recorded there immediately before its `submit()` runs. So a dynamic barrier must list every chunk task in `expected`, **even when its own `execute()` ignores the inputs**. `flushJoin` always did, because it sums the per-chunk write statistics and visibly needs them. `renderJoin` returns an empty object and needs nothing, so the omission looked harmless.

It was not. Results from `render:i` could arrive after the search index had already been written. That index is assembled by flattening an array created with `new Array(N)` --- holes, not `undefined` --- and `Array.prototype.flat()` skips holes without reporting anything. A late chunk therefore raised no error and logged nothing. About six pages were missing from `search-data.json`, on roughly one build in three, always as a contiguous run, because a chunk is a contiguous slice of the page list.

Two silent failures combining into one invisible one is the pattern to check for when adding a fan-out. Both halves are now fixed: the barriers list their chunk tasks, and every place on that path that used to skip a missing piece now refuses to continue instead.

Setup-class failures --- `@hpcc-js/wasm-graphviz` not installed, `sass` missing --- print a one-line recovery hint and continue with stale outputs. They do not flip the exit code; a fresh checkout still builds.
