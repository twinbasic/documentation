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

Technical documentation for the `tbdocs` static site generator at [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). Read it when you change the build pipeline. Content contributors who only build, preview and ship documentation can skip it, except for [Project styling](#project-styling): read that before adding or changing a CSS rule, because a rule that works in the light theme can silently do nothing in the dark one.

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

tbdocs is a Node.js replacement for the just-the-docs Jekyll theme. It keeps the same content model and output structure and needs no Ruby toolchain. It has a fixed dependency set, builds in around 2--3 seconds on a modern laptop, and writes all three output trees from one process.

The scheduler is a SAB-based pull scheduler: workers read shared task state and claim work themselves, and the main thread takes part on equal terms. Offline rewrite, per-page SEO and search-index derivation run inside the render workers, not serially on the main thread.

## Architecture at a glance

One entry point, [dozens of modules](#module-map), three output trees, N+1 threads.

`runBuild()` allocates a `SharedArrayBuffer` holding the scheduling state (task status, dependency counts, successor edges), spawns one worker per available CPU and gives each a reference to the SAB. Workers and the main thread then compete for ready tasks. There is no central dispatcher: each thread scans the SAB, claims a task it may run, executes it, and updates the SAB so the next task becomes claimable. The main thread runs the tasks marked `runOnMain`, mostly those that mutate the master `pages[]` array or coordinate the filesystem layout.

The build writes three output trees:

| Tree | Purpose | Phase |
|---|---|---|
| `_site/` | Online tree deployed to `docs.twinbasic.com`. | Render fan-out + write |
| `_site-offline/` | `file://`-browsable mirror with every URL rewritten to a page-relative path. | Per-page rewrite folded into render workers |
| `_site-pdf/` | Sparse source tree (`book.html` + CSS + images) the PDF renderer consumes. | Assembled after all pages have rendered |

`builder/` lives at the repo root, outside the content tree it reads. Outputs go to `docs/_site/`, `docs/_site-offline/` and `docs/_site-pdf/`. The serve-mode dev server writes to a separate `docs/_serve/`, so a one-off `build.bat` never overwrites a running serve session.

## Module map

Modules grouped by role. [Pipeline Stages](Pipeline-Stages) covers each in depth.

**Orchestration and scheduling**

| File | Role |
|---|---|
| [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs) | Entry point. Defines the static `TASKS` graph, allocates the SAB, spawns the pool, runs the build, injects the Gantt chart. |
| [`command-line.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/command-line.mjs) | `tbdocs`'s option table and defaults, and `parseCommandLine`, which reads the command line through `lib/cli.mjs` and applies the flags in order. |
| [`scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scheduler.mjs) | Main-thread side of the pull scheduler: claim loop, results map, completion detection, summary printer. |
| [`worker-pool.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/worker-pool.mjs) | Worker lifecycle wrapper: spawn, send the SAB, forward messages to the scheduler, terminate. No dispatch logic. |
| [`cpu-worker.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/cpu-worker.mjs) | Worker harness. Runs the pull loop, holds the eight named handlers, handles speculative idle execution. |
| [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs) | SAB layout, allocation, task-metadata API. Constants and atomics primitives consumed by both the scheduler and the workers. |
| [`sab-broadcast.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-broadcast.mjs) | JSON-over-SAB pack/unpack for the shared payload (config, link tables, sidebar HTML, the nav tree when the offline tree is built, etc.) broadcast to every render worker. |

**Discovery and compute**

| File | Role |
|---|---|
| [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs) | Source tree walk; parses frontmatter and classifies each file as a page or a static file. |
| [`nav.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/nav.mjs) | Sidebar tree, integrity check, breadcrumbs, per-page `navLevels`. |
| [`seo.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/seo.mjs) | Site-level SEO on main (`computeSiteSeo`); per-page SEO on workers (`computeChunkSeo`). |
| [`url.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/url.mjs) | The URL helpers every other module shares: `absoluteUrl` and `relativeUrl` (ports of Jekyll's two URL filters), `normalizeBaseurl`, `encodeSpaces`, `splitFragment`. |
| [`escape.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/escape.mjs) | The escapers every other module shares: `escapeMarkup` (`&`, `<`, `>`), `escapeMarkupAndQuotes` (those and both quotes), `escapeRegExp`. |
| [`code-guard.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/code-guard.mjs) | The code guard for a rewrite of rendered HTML: `CODE_OR_PRE`, which consumes a `<code>` or `<pre>` element whole, and `replaceOutsideCode`. |
| [`theme-pictures.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/theme-pictures.mjs) | Pictures in both themes (`X.png` with `X.light.png` beside it): the two class names the stylesheet hides by theme, `lightSiblingOf`, `unpairedLightPictures` (which `discover` refuses), and `lightOnly`, which reduces each pair to its light picture for the book. Pictures also drawn as SVG (`X.svg` beside `X.png`): `svgOf`, `isPictureSvg` (an `.svg` with its `.png` beside it is never inlined as a diagram), `pictureSvgOutputs` (which outputs show the SVGs, from `picture_svg` in `_config.yml`) and `pngPictures`, which turns each SVG name back into its PNG in an output that shows PNGs. See [A picture as SVG](Authoring#a-picture-as-svg). |
| [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) | Chapter selector resolution (Phase 2 half) + `book.html` assembly (Phase 8 half). |
| [`build-info.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/build-info.mjs) | Git commit hash and date. Runs on a worker. |
| [`data.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/data.mjs) | Loads `_book.yml`. |

**Preprocessing**

| File | Role |
|---|---|
| [`dot.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/dot.mjs) | Regenerates stale `.dot` → `.svg` via the WASM build of Graphviz (`@hpcc-js/wasm-graphviz`). |
| [`dot-metrics.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/dot-metrics.mjs) | Installs Inter's advance widths into the Graphviz WASM module before any layout runs, so diagram boxes fit the font the browser paints. See [Diagram geometry](#diagram-geometry). |
| [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs) | Dart Sass over the vendored just-the-docs SCSS. Split across `scssLight` + `scssDark` worker tasks, joined on main. |
| [`vendor-assets.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/vendor-assets.mjs) | Downloads any YouTube poster frame or GitHub user-attachment image the markdown references and that is not yet committed, into `docs/assets/thumbnails/` or `docs/assets/attachments/`. The downloads are committed, like the generated DOT SVGs. CI never downloads: a referenced but uncommitted asset is a hard error there. |

**Render hot path**

| File | Role |
|---|---|
| [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) | markdown-it configuration, plugin stack and `renderPhase`. Built once on main and once per worker. The plugins to know by name: `figurePlugin` (an image alone in its paragraph becomes a figure with a bar of download, copy and zoom buttons; a diagram's SVG is embedded at build time), `videoLinkPlugin` (a `{: .video }` link becomes a locally vendored poster frame), `remoteImagePlugin` (a user-attachment URL becomes the vendored copy, in markdown and in raw `<img>`), `themePairPlugin` (an image or link whose `X.png` has an `X.light.png` beside it becomes two, shown in the light and dark theme respectively, each using its theme's SVG where there is one and the attribute block does not say `png`; see [A picture in both themes](Authoring#a-picture-in-both-themes)) and `headingLevelNormalizePlugin` (renumbers a page that uses h1 and h3 but no h2, so the built page has no heading skip). |
| [`highlight.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) | Shiki bootstrap + the bundled twinBASIC grammar. Emits the just-the-docs wrapper structure. |
| [`highlight-theme.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) | Loads `Light.theme` + `Dark.theme`, emits `tb-highlight.css` + scope-to-class lookup. Raises any token colour below 4.5:1 against the code-block background (moving lightness, keeping hue and saturation) so highlighted code meets WCAG AA; the emitted rule has a `raised to 4.5:1` comment naming the original colour. |
| [`template.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) | `templatePhase` (per-page layout wrap), `buildInitConfig`, `renderSidebar`, `withPartialNav` (cuts an offline page's nav down to the part of the tree the page opens with) and `navScript` (the text of the offline tree's `assets/js/nav.js`, which holds the whole tree). JS template literals; no template engine. Also `injectAnchorHeadings(html, headingsOut)`, which adds the permalink icon to each heading and collects the heading list, and `renderSectionLinks`, which builds the per-page disclosure at the top of the footer from that list. |
| [`strftime.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/strftime.mjs) | `formatDate`, the strftime formatter for the footer's "Page last modified" line, written only for a page that sets `last_modified_date`. |
| [`compress.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) | Whitespace compression outside `<pre>` blocks. |

**Write phase**

| File | Role |
|---|---|
| [`write.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs) | Asset / static-file writer + shared I/O helpers (`mkdirRec`, `runLimited`, `writeFileMkdirp`). |
| [`paths.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/paths.mjs) | Permalink → destination-path helper. |
| [`redirects.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) | `redirect_from:` stub generator. |
| [`sitemap.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) | `sitemap.xml` + `robots.txt`. |
| [`search.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) | `deriveSearchEntries` (per-chunk, on workers) + `writeSearchDataFromChunks` (consolidator, on main). |
| [`symbols.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/symbols.mjs) | The symbol index, `tB/symbols.json`, for the IDE help add-in: every name the reference pages document, and the page or heading that documents it. The entries come from the pages; `builder/package-api.json` only annotates them. See [Building and Deployment](Building#the-symbol-index). |

**Offline and PDF**

| File | Role |
|---|---|
| [`offline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) | Offline-tree writer + just-the-docs.js AST patcher + `search-data.js` wrapper. |
| [`offline-rewrite.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline-rewrite.mjs) | Pure rewrite helpers (`deriveOfflinePage`, CSS url() rewrite, site-path set construction). Safe on workers; no node:fs dependency. |
| [`pdf.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs) | `_site-pdf/` writer: `book.html` + `tb-highlight.css` + `print.css` + referenced images. A picture in both themes is its light picture alone in the book (`lightOnly` in `theme-pictures.mjs`, applied by `book.mjs`). |

**Verification**

| File | Role |
|---|---|
| [`link-check.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/link-check.mjs) | The pure core: HTML in, findings out, with no filesystem traversal and no CLI. The build's check and the standalone [`scripts/check_links.mjs`](Tools-Site-Checks#check-links) share it. |
| [`check.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/check.mjs) | The check over rendered pages, which `scripts/check_links.mjs` runs too: per-chunk `checkChunk`, the `joinChunks` merge and `findingsFor`. Also the build's `TREES` table, report formatting, and the `--check-audit-index` tree-index audit. |
| [`check-tree.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/check-tree.mjs) | `deriveTreeRels` --- every relative path the build believes it emitted into a tree. The check's existence oracle comes from this, not from a `readdir`; the audit verifies it against the disk. |
| [`counts.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/counts.mjs) | The registry behind `{{tbdocs:<name>}}` in prose. `deriveCounts(state)` computes every name from build state; `countPlugin` substitutes them as a core rule over the inline token stream, so code is never touched. `checkPlaceholders` rejects an unknown name on main before any worker renders, and `findSurvivingPlaceholder` rejects a placeholder that reached the output. `{{tbdocs:size:<site path>}}` and `{{tbdocs:packageTestRows}}` are not numbers but text for the Downloads page: `deriveDownloads` settles the sizes of the static files and the packed package test projects, and `expandDownloadPlaceholders` expands them in the page source, where the inline rule cannot reach. See [Authoring Pages](Authoring#counts). |
| [`page-baseline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/page-baseline.mjs) | The page-count drift guard, and the committed `page-baseline.json` it compares against. A rise rewrites the file, a fall fails the build, and neither CI nor `--serve` may write. See [Building and Deployment](Building#the-page-count-drift-guard). |
| [`symbol-baseline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/symbol-baseline.mjs) | The symbol index's drift guard, and the committed `symbol-baseline.json`, every URL `tB/symbols.json` has published. A new URL rewrites the file, a lost one fails the build. |
| [`addin-index.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/addin-index.mjs) | The help add-in's committed copy of the index, `add-in/Resources/SYMBOLS/symbols.json`: a local build rewrites it when it differs from `tB/symbols.json`, and CI and `--serve` only say so. |
| [`addin-project.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/addin-project.mjs) | The help add-in's project file, a published download: packs the files git tracks in `add-in/`, with this build's symbol index, through `importProject` from `scripts/impexp.mjs` (the one `scripts/` module the builder may import). See [Build and Generation Tools](Tools-Build#the-help-add-ins-project-file). |
| [`baseline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/baseline.mjs) | The read, the write and the comparison the two drift guards share; `GUARDED_SRC`, the one source tree they have figures for; and `baselineWrites`, which lets only a build into `docs/_site` rewrite a committed file. |
| [`publish-policy.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/publish-policy.mjs) | The allowlist of file types that may reach a published tree, enforced in `discover` (static-file inventory) and in `dispatch` (each tree's `deriveTreeRels` inventory). A finding aborts the build. See [Drift guards](#drift-guards-and-failure-modes). |

**Dev mode and reporting**

| File | Role |
|---|---|
| [`serve.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/serve.mjs) | Long-lived dev server: HTTP, recursive watcher, SSE reload, persistent worker pool. |
| [`static-files.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/static-files.mjs) | The static file handler `serve.mjs` answers with, serving folders as GitHub Pages does. The help add-in's test lane uses it too. |
| [`gantt.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/gantt.mjs) | Inline SVG Gantt chart of the build timeline, and the section each task is charted in. Injected into the [Build Info](BuildInfo) page at the end of each build. |

**Shared modules in `lib/`**

`lib/` at the repo root holds modules that `builder/`, `scripts/`, `book/`, `eval/`, `wisdom/`, `indexer/` and `test/` may all import. A module there imports none of those folders, only Node's own modules and installed packages. The builder imports these five. [`lib/README.md`](https://github.com/twinbasic/documentation/blob/main/lib/README.md) describes the folder.

| File | Role | Imported by the builder in |
|---|---|---|
| [`lib/cli.mjs`](https://github.com/twinbasic/documentation/blob/main/lib/cli.mjs) | The strict command-line reader every Node tool uses: `parseCli` and `CliError`, the value readers (`numberOption`, `choiceOption`, `regexOption`, `urlOption`, `dateOption`), `refuseTogether`, and the help, exit and crash handlers (`withUsageError`, `printHelpAndExit`, `die`, `exitOnCrash`). | `tbdocs.mjs`, `command-line.mjs` |
| [`lib/markdown.mjs`](https://github.com/twinbasic/documentation/blob/main/lib/markdown.mjs) | Says what in a page's source is code, from a markdown-it block parse: `blockRegions`, `maskCode` (hides the code from a rewrite and restores it), `splitCodeSpans`, `splitOnMarker`, `mapLines`. | `render.mjs`, `counts.mjs` |
| [`lib/frontmatter.mjs`](https://github.com/twinbasic/documentation/blob/main/lib/frontmatter.mjs) | `parseFrontmatter` splits off and parses a page's YAML frontmatter, stripping a leading BOM; `unquotedHashValues` lists values left unquoted that end in `#`. | `discover.mjs` |
| [`lib/markdown-files.mjs`](https://github.com/twinbasic/documentation/blob/main/lib/markdown-files.mjs) | `isOutputTree` and `OUTPUT_TREES` say which folders under `docs/` are the build's output trees; `markdownFiles` (used by the gates, not the builder) lists the markdown under a root without entering them. | `write.mjs`, `serve.mjs` |
| [`lib/repo-paths.mjs`](https://github.com/twinbasic/documentation/blob/main/lib/repo-paths.mjs) | `REPO_ROOT` and `DOCS_DIR`, so each tool runs the same from any folder. | `tbdocs.mjs`, `write.mjs` |

## The pull-based SAB scheduler

The scheduler models the build as a directed acyclic graph of tasks. Each task has predecessors (`expected`), a body (`execute` on main, or a named `handler` on a worker), and an output router (`submit`) that merges its result into the shared `SharedState`.

Workers read task state directly from a `SharedArrayBuffer`, claim tasks with `Atomics.compareExchange`, and wake siblings with `Atomics.notify` when they finish. No thread waits for the main thread to dispatch work, so a long `runOnMain` task does not leave the workers idle.

### Task lifecycle

Each task slot in the SAB has a status:

| Status | Meaning |
|---|---|
| `NOT_READY` (0) | One or more predecessors not yet done. |
| `READY` (1) | All predecessors done. Eligible to be claimed. |
| `CLAIMED` (2) | A thread has CAS-claimed the slot and is running it. |
| `DONE` (3) | Body has run; the thread's `submit()` has merged the output into `SharedState`. |
| `FAILED` (4) | Body threw. The scheduler aborts the build. |

The transitions are atomic: `READY → CLAIMED` through `Atomics.compareExchange` (two threads cannot claim the same task), and `CLAIMED → DONE` after the executor's `submit()` runs. When a task becomes `DONE`, its successors' `depCount` is decremented; any that reaches zero flips to `READY`, and `Atomics.notify` wakes any thread sleeping on the notify generation counter.

### Task flags

Bit flags on each task encode the scheduling primitives. They compose:

| Flag | Meaning | Used by |
|---|---|---|
| `runOnMain` | Body runs on the main thread. The main loop claims; workers skip. | `discover`, `nav`, `markdownInit`, every `submit`-only task. |
| `on_demand` | Seed task (no predecessors) that is **not** auto-started. Becomes claimable only when a successor would otherwise be runnable. | `warmInit`, `renderEnvInit`, `renderJoin`, `flushJoin`. |
| `unique_per_worker` | The "done" state is per-lane: lane W's instance counts only for lane W's perspective. | `warmInit`, `renderEnvInit`. |
| `run_when_idle` | When a worker has no claimable work, it may run this task speculatively. | `warmInit` (overlaps Shiki WASM init with the main spine). |
| `pin_to_predecessor` | Must run on the same lane that ran a named predecessor. | `flush:i` (pinned to `render:i`). |
| `survives_reset` | The `perWorkerDone` flag survives an SAB reset between builds in serve mode. | `warmInit` (Shiki stays loaded). |

A task can also declare `perWorkerDeps`: `unique_per_worker` tasks that must have run on **this** lane before the task is claimable. `render:i` uses it to require `renderEnvInit` on whichever lane picks it up.

### Notify protocol

The SAB holds one `notify` Int32 used as a generation counter. A worker that finds no claimable work reads the counter, scans once more to close the race window, then calls `Atomics.wait(notify, gen, 50)`. The 50 ms timeout is also a safety net against missed wakeups. Every state transition that could make a task claimable bumps the counter and calls `Atomics.notify`, so a worker sleeping on the old generation returns at once.

## SAB memory layout

One `SharedArrayBuffer` holds every Int32 array the scheduler needs, at static sizes: `MAX_TASKS = 512`, `MAX_LANES = 64`, `MAX_EDGES = 2048`, total 174,100 bytes (170 KB). The main arrays:

- `status[i]` --- the task lifecycle enum above.
- `depCount[i]` --- remaining predecessor count. Decremented atomically on each predecessor's completion.
- `succOffset[i]` / `succCount[i]` / `succList` --- flat successor edge list. `dispatch.submit()` extends it at runtime for the dynamic render and flush tasks.
- `perWorkerDone[i*MAX_LANES + lane]` --- per-lane done flag for `unique_per_worker` tasks.
- `flags[i]` --- bitmask of the flags above.
- `notify` --- generation counter for `Atomics.wait` / `notify`.
- `buildDone` --- terminal flag, set to 1 (success) or 2 (error) by `Scheduler._finish()` / `_abort()`. Workers poll it at the top of each pull-loop iteration and exit when it leaves 0.

The full layout, the allocation helper and the `readTaskMeta` / `writeTaskMeta` API are in [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs).

## Task DAG by section

The pipeline has 37 named static tasks plus 2N dynamic ones (N render chunks + N flush tasks). The Gantt chart groups them into five sections, and so does the rest of this page:

- **Seeds**: `config`, `buildInfo`, `scssLight`, `scssDark`, `highlighterInit`, `loadData`
- **Spine**: `discover`, `vendorAssets`, `nav`, `dot`, `buildInit`, `markdownInit`, `deriveRedirects`, `deriveSitemap`, `resolveBookChapters`, `packTests`
- **Render**: `dispatch`, `prepDest`, `prepPageDirs`, `render:i`, `renderJoin`
- **Write**: `scss`, `flush:i`, `flushJoin`, `writeAssets`, `searchData`, `symbolIndex`, `helpArchive`, `addinProject`, `packageTests`, `writeAux`, `writeOffline`, `bookPayload`, `writePdf`
- **Check**: `linkJoin`, `checkBook`, `checkReport` --- present on every ordinary build, because `build.bat` always passes `--check-audit-index`

`warmInit` and `renderEnvInit` belong to none of the five; the chart draws them as start-up bars in the worker rows, and they are described under Render. The chart does not draw the three `Join` barriers.

Every static task and dependency:

![A top-to-bottom dependency graph of the build tasks. Seeds with no predecessor sit at the top; discover feeds the spine, the spine feeds dispatch, and dispatch fans out the per-chunk render and flush work that the write and check tasks then consume. Node colour and a one-letter tag say whether a task runs on the main thread or on a worker, and dashed arrows mark the per-lane and data-only dependencies.](/assets/images/dot/scheduler-dag.svg)

**[M]** runs on the main thread; **[W]** runs on a worker. Solid arrows are normal predecessor edges (`expected`); dotted arrows are per-lane dependencies (`perWorkerDeps`) or implicit data dependencies between tasks that share state through `SharedState`.

### Seeds

`config`, `buildInfo`, `scssLight` and `scssDark` have no predecessors and start at once; `highlighterInit` waits for `config`, and `loadData` for `highlighterInit`. The three worker tasks run while the main thread traverses the source tree.

- `config` (main) --- reads `_config.yml` and applies CLI overrides.
- `buildInfo` (worker) --- two `git` shell-outs. Falls back to `"unknown"` on failure.
- `scssLight` (worker) --- compiles `just-the-docs-combined.scss` against the light palette.
- `scssDark` (worker) --- the same against the dark palette.
- `highlighterInit` (main) --- loads the `Light.theme` + `Dark.theme` palette and emits `tb-highlight.css`. Each worker initialises its own Shiki.
- `loadData` (main) --- reads `_book.yml`.

### Spine

`discover` and the main-thread tasks it feeds, with `dot` running on a worker beside them. They are cheap; the aim is to fork into independent streams as soon as the source tree is known. `deriveSitemap` and `resolveBookChapters` wait for `dispatch`, described under Render.

```
config ┬→ highlighterInit → loadData
       └→ discover ┬→ nav ──────────────────────────────┐
                   ├→ buildInit ────────────────────────┤
                   ├→ vendorAssets ────┐                │
                   └→ deriveRedirects ─┴→ markdownInit ─┼→ dispatch → deriveSitemap → resolveBookChapters
                              buildInfo, dot (workers) ─┘
```

- `discover` --- traverses `docs/`, classifies pages and static files, builds `state.pageByDest`.
- `vendorAssets` --- finds the YouTube video markers and GitHub user-attachment URLs in the pages, downloads any file not already in `docs/assets/thumbnails/` or `docs/assets/attachments/`, and adds the new files to the static-file copy. `markdownInit` and `writeAssets` depend on it.
- `nav` --- builds the sidebar tree, runs the integrity check (an orphan or ambiguous `parent:` aborts the build here) and pre-renders the sidebar HTML.
- `dot` (worker) --- regenerates stale `.dot` → `.svg` with the WASM build of Graphviz. WASM init takes ~50 ms and overlaps the main spine; each diagram then renders synchronously.
- `buildInit` --- pre-renders the config-only chrome (SVG sprites, header, search footer, favicon). It does not need the nav tree and runs in parallel with `nav`.
- `markdownInit` --- builds the link tables, instantiates the shared markdown-it and computes site-level SEO. The link tables and SEO constants reach the render workers in the shared SAB payload.
- `deriveRedirects` --- derives the redirect stubs.
- `deriveSitemap` --- the absolute-URL list for `sitemap.xml`. Deferred to `dispatch` so it runs while the main thread would otherwise wait on the render workers.
- `resolveBookChapters` --- resolves the `_book.yml` chapter selectors to `Page` references. `bookPayload` must see the same `Page` objects after the render fan-out has filled in `renderedContent`.

### Render

`dispatch` is the fan-out point. It chunks `state.pages` into `workerCount × 10` slices (`SLICES_PER_WORKER = 10`) and allocates 2N dynamic task slots in the SAB. It links each `render:i` → `[renderJoin, flush:i]` and each `flush:i` → `[flushJoin]`, packs the per-chunk page data and the per-build shared payload into two SABs, broadcasts both to every worker, and activates the `render:i` tasks.

```
dispatch ┬→ render:0 ┬→ flush:0 ┐
         ├→ render:1 ┼→ flush:1 ┤
         │    :      │    :     │
         └→ render:N ┼→ flush:N ┤
                     ↓          ↓
                renderJoin  flushJoin
                     ↓
               symbolIndex ─→ addinProject
                     ↓
                searchData
```

- `prepDest` (main) --- cleans and recreates the destination trees the run writes: the online tree, and the offline and PDF trees when their passes run. A build removes a tree whose pass it skips; serve mode prepares `_serve/` alone. Deferred until after `dispatch` so the wipe does not contend with `discover`'s reads.
- `prepPageDirs` (main) --- creates every page output directory, so `flush:i` needs no `mkdir`.
- `warmInit` (worker, `on_demand` + `unique_per_worker` + `run_when_idle` + `survives_reset`) --- per-lane Shiki bootstrap. A worker with nothing else claimable runs it during the main-thread spine, every render worker needs it on its own lane, and in serve mode the per-lane done flag survives rebuilds, so later builds skip it.
- `renderEnvInit` (worker, `on_demand` + `unique_per_worker`) --- per-lane render environment: unpacks the shared SAB, rebuilds the link-table Maps and instantiates the worker's own markdown-it. Every `render:i` lists it in `perWorkerDeps`, so the first render claim on a lane pulls it in.
- `render:i` (worker, dynamic) --- the per-chunk compute, in the five sub-stages listed under "Render fan-out in detail". Returns a delta with `renderedContent` per page and the chunk's search entries.
- `renderJoin` (main, `on_demand`) --- barrier that unblocks `searchData`, `symbolIndex` and `bookPayload`. `dispatch.submit()` sets its dep count to N *and* rewrites its `expected` list with every chunk name; the dep count alone is not a barrier over the submits. See [Pipeline Stages](Pipeline-Stages#renderjoin-main-on_demand).

### Write

`scss` joins the two SCSS halves once `prepDest` has run. Each `flush:i` writes its chunk once its render has finished and `prepPageDirs` has run. `renderJoin` releases the auxiliary writers; `flushJoin` releases the offline mirror and the PDF source tree.

- `scss` (main) --- joins both halves and writes the combined CSS to `_site/` and `_site-offline/`. Waits for `prepDest`.
- `flush:i` (worker, dynamic, `pin_to_predecessor`) --- writes the chunk's page HTML on the worker that rendered it: the online tree always, the offline tree unless `skipOffline`. The pinning matters because the worker keeps the batch on its own `_pendingFlush` FIFO at the end of `render`, and only the matching `flush:i` drains it. **With `--check`, the link and integrity check runs here too**, over the chunk's just-written HTML, which is already decoded and in worker memory, so the check never writes ~270 MB out to read it back.
- `flushJoin` (main, `on_demand`) --- barrier that aggregates per-chunk write stats and gates `writeAux` + `bookPayload`.
- `writeAssets` (main) --- writes generated CSS, copies vendored theme JS and the project's static files. It does not write page HTML; `flush:i` did. Depends on `prepPageDirs`.
- `searchData` (main) --- concatenates `state.searchChunks` (filled by each `render:i`'s `submit()`), joins `symbolIndex`'s symbols onto the matching entries by URL (adding the `names` / `qualified` / `primary` fields; see [Site search](Pipeline-Stages#searchdata-main) and `WIP.Search.md`'s "Design" §2), renumbers the global `i` index and writes `search-data.json`. The workers already did the heavy work (heading split, content sanitisation, URL encoding). Depends on `renderJoin`, `prepDest` and `symbolIndex`.
- `symbolIndex` (main) --- writes `tB/symbols.json`, the [symbol index](Building#the-symbol-index) the IDE help add-in reads, and passes its `symbols` array to `searchData`'s join. It reads the heading ids from every `/tB/` page's `renderedContent`, joins them with the committed `builder/package-api.json`, and returns the index's URLs for the drift guard that `runBuild` runs at the end. Depends on `renderJoin` and `prepDest`. `checkReport`, `searchData` and `addinProject` wait for it.
- `helpArchive` (worker) --- writes `add-in/Resources/HELP/site.zip`, the archive of the offline tree that the IDE help add-in embeds (see [Build and Generation Tools](Tools-Build#the-help-archive)). Depends on `flushJoin`, `scss` and `writeOffline`, which between them write the whole offline tree. It runs before the Gantt chart is injected, so the archive holds `BuildInfo.html` without the chart. It runs only for a `docs` build into the default `--dest`, `docs/_site`, with an offline tree, and not under `--serve`, `--dry-run` or `--no-help-archive`. After the chart is injected, `runBuild` checks that the offline tree still lists the archive's files and differs from it in `BuildInfo.html` and `assets/images/gantt.svg` alone.
- `addinProject` (main) --- packs the help add-in's source folder, `add-in/`, into `tbDocsHelp.twinproj` and writes it into the online tree at the path `_config.yml`'s `addin_project` names (see [Build and Generation Tools](Tools-Build#the-help-add-ins-project-file)). The files are those git tracks there, the symbol index is the one `symbolIndex` wrote, and `Resources/HELP/site.zip` is the archive `helpArchive` wrote, if any. The zip comes back from the worker as a plain byte array, which `helpArchive`'s `submit` wraps again as a `Buffer` without copying it. Depends on `symbolIndex`, `prepDest` and `helpArchive`; `checkReport` waits for it. Does nothing under `--dry-run` or for a config that declares no download.
- `writeAux` (main) --- writes redirect stubs, the sitemap and robots.txt. Depends on `writeAssets`, `searchData`, `flushJoin`, `deriveRedirects`, `deriveSitemap`.
- `writeOffline` (main) --- produces `_site-offline/`. `render:i` and `flush:i` already computed and wrote the per-page HTML, so this task does the cross-cutting work: CSS url() rewriting, the just-the-docs.js AST patch, the `search-data.js` wrapper, the offline `nav.js`, theme assets and redirect stubs.
- `bookPayload` (main) --- packs what the book needs into one shared buffer and broadcasts it to every worker. It renders each part's subtitle and intro first, because markdown-it cannot cross to a worker, and replaces every page reference in `bookData` with the page's index in the page list, so the worker resolves it back to the same object. Depends on `flushJoin` (`renderedContent` is filled), `renderJoin`, `resolveBookChapters` (`bookData._chapters` is set) and `dot` (diagram SVGs are in `staticFiles`). The broadcast is posted before the task is marked done, so it is queued on every lane before any lane can claim `writePdf`. Under `--dry-run`, or when the build writes no PDF tree, it packs a marker that tells `writePdf` there is nothing to write.
- `writePdf` (worker) --- unpacks that payload, assembles `_site-pdf/book.html` and copies the images it references. It waits on the lane for the broadcast to arrive. With `--check` it keeps the book on its lane for `checkBook` and returns only the counters.

## What runs where

Every task and where it runs:

| Section | Task | Locus | Notes |
|---|---|---|---|
| Seeds | `config` | main | Trivial read; output feeds `discover` directly. |
| Seeds | `buildInfo` | worker | Two `git` shell-outs in parallel. |
| Seeds | `scssLight`, `scssDark` | workers | Light + dark palettes compile concurrently. |
| Seeds | `highlighterInit` | main | Palette CSS only. |
| Seeds | `loadData` | main | Reads `_book.yml`. |
| Spine | `discover`, `vendorAssets`, `nav`, `buildInit`, `markdownInit`, `deriveRedirects`, `deriveSitemap`, `resolveBookChapters` | main | Single-threaded. |
| Spine | `dot` | worker | WASM Graphviz; init hides behind the main spine. |
| Render | `dispatch`, `prepDest`, `prepPageDirs` | main | `prepDest` and `prepPageDirs` are deferred to after `dispatch`. |
| Render | `render:i` | worker | Body + SEO + template + offline + search per chunk. |
| Render | `renderJoin` | main | Barrier. |
| none | `warmInit` | worker (per lane) | Per-worker Shiki bootstrap. `on_demand` + `run_when_idle`. A start-up bar on the chart. |
| none | `renderEnvInit` | worker (per lane) | First-render-claim cost on each lane. A start-up bar on the chart. |
| Write | `scss` | main | Joins light + dark; writes online + offline CSS. |
| Write | `flush:i` | worker (pinned) | Page HTML write, online + offline. |
| Write | `flushJoin` | main | Barrier. |
| Write | `writeAssets`, `searchData`, `symbolIndex`, `addinProject`, `writeAux`, `writeOffline`, `bookPayload` | main | One at a time, in declaration order: the main thread finishes a task before it claims the next, and the tail is CPU-bound there. |
| Write | `helpArchive`, `writePdf` | worker | Run beside the main-thread writers. `writePdf` follows `bookPayload`. |
| Check | `linkJoin`, `checkReport` | main | No-ops without `--check`. |
| Check | `checkBook` | worker (pinned) | Runs on the lane that wrote the book, so the book never crosses back. Returns null without `--check`. |

Per-page SEO (`computeChunkSeo`), per-page offline HTML (`deriveOfflinePage`) and per-chunk search entries (`deriveSearchEntries`) all run inside `render:i`, not on the main thread. The SEO values return in the render delta. `offlineHtml` is stored on the page for the matching `flush:i` to write to `_site-offline/`. The render `submit()` stores each chunk's search entries at `state.searchChunks[i]`.

## Page deltas and shared state

The scheduler owns a `SharedState` instance. Five fields are declared on the class in `builder/scheduler.mjs`; tasks attach five more as the build runs. `checkTrees` exists only under `--check`.

| Field | Type | Filled by |
|---|---|---|
| `pages` | `Page[]` | `discover.submit()`. Never reassigned afterwards --- only mutated in place. |
| `staticFiles` | `StaticFile[]` | `discover.submit()`, plus appends from `dot.submit()` and `vendorAssets.submit()` for freshly-generated or freshly-downloaded files. |
| `site` | `object` | Populated progressively by every spine task's `submit()`. |
| `pageByDest` | `Map<destPath, Page>` | `discover.submit()`. Used by render `submit()` to merge deltas into the master `Page` objects. |
| `searchChunks` | `Array<Array<entry>>` | Pre-allocated to length N by `dispatch.submit()`; each `render:i.submit()` writes one slot. |
| `sitePaths` | `Set<string>` | `deriveSitemap.execute()`. Every path the offline rewrite may point at --- pages, static files, redirect stubs, vendored theme assets --- broadcast to the render workers in dispatch's shared payload. |
| `checkStubs` | `Stub[]` | `deriveRedirects.submit()`. The link check needs it because redirect stubs are excluded from the sitemap / search / canonical assertions. |
| `checkTrees` | `{ [tree]: { rels, baseurl } }` | `deriveSitemap.execute()`, only under `--check`. `rels` is what each tree is about to receive, derived from the build's own records; `treeIndexFor()` turns it into the existence oracle the link check resolves against, and `--check-audit-index` compares it with what landed on disk. |
| `checkChunks` | `Array<chunkFindings>` | Created empty by `dispatch.submit()`; each `flush:i.submit()` pushes its chunk's reduced findings, which return on the flush result. |
| `checkChunkCount` | `number` | `dispatch.submit()`, set to N. `linkJoin` compares `checkChunks.length` with it and reports a short list as an error on every tree, so a missing chunk cannot pass as a clean check. |

Worker output flow: a worker posts `{ done: taskIdx, output, timing, lane }` to the main thread. The pool callback passes it to `Scheduler._onWorkerDone()`, and the task's `submit()` merges the delta into the master `pages[]` through `pageByDest`. Only then does the worker run `onTaskDone()` to set the SAB status to `DONE` and wake siblings. This order matters: otherwise a downstream main-thread task could be claimed before its predecessor's output arrived.

`render:i.submit()` mutates the master `Page` objects in place (`renderedContent`, `offlineMisses`) and writes the chunk's search entries into `state.searchChunks[i]`. The objects stay the same: `resolveBookChapters` stores `Page` references in `bookData._chapters`, and `bookPayload` reads `renderedContent` from those objects after the fan-out, packing it for `writePdf`'s worker.

## Render fan-out in detail

`dispatch.execute()` runs on the main thread and assembles two SAB payloads:

- **Per-task payload SAB** --- one JSON blob per `render:i`, each containing the chunk's `Page` objects. `chunkOffset[i]` / `chunkLength[i]` index into the buffer.
- **Shared payload SAB** --- one JSON blob broadcast to every worker, containing the site config, site-level SEO constants, the pre-rendered sidebar + chrome (`initData`), the nav tree when the offline tree is built, serialized link tables (`[key, permalink]` pair arrays), the static-file relative-path set, the baseurl, the site-paths set for offline rewriting, the `offline_exclude` patterns, and the `skipOffline` flag.

`dispatch.submit()` allocates 2N dynamic slots from the generic pool in `sab-scheduler.mjs`, writes their handler IDs and per-worker dep lists, adds the successor edges, pins each `flush:i` to its `render:i`, calls `broadcastDynamicData(payloadSAB, sharedSAB)` (one `postMessage` per worker carrying the two SAB references, shared and not cloned), and sets the `render:i` slots to `READY`. Workers see the new tasks on their next scan.

When a worker claims its first `render:i`, the per-worker dep on `renderEnvInit` is unsatisfied. The pull loop sees that it is an `on_demand` worker task and runs it inline on the same lane. `renderEnvInit` has `warmInit` as its own per-worker dep; if `warmInit` has not run on this lane (the lane never had idle time during the spine), the pull loop runs `warmInit`, then `renderEnvInit`, then claims a fresh `render:i`. The nesting is one level deep.

Each `render:i` runs five sub-stages over its chunk:

1. `renderPhase(chunk, env.site)` --- the markdown-it body render.
2. `computeChunkSeo(chunk, env.site.seoSiteTitle, env.site.config, env.site.markdown)` --- per-page SEO fields.
3. `templatePhase(chunk, env.site, env.initData)` --- just-the-docs layout wrap. `env.initData` is the pre-rendered chrome from `dispatch`.
4. Offline rewrite (when `!skipOffline`) --- each page's nav cut to its part of the tree (`withPartialNav`), then the page through `deriveOfflinePage`.
5. `deriveSearchEntries(chunk, env.site)` --- per-section search-index entries.

In the offline tree, the whole nav tree is in `assets/js/nav.js`, which `writeOffline` writes. An offline page holds only the part that shows when it opens: the top level, and the children of the page and of each of its ancestors. The full tree would otherwise be most of every page's bytes. `nav.js` loads right after the nav and puts the whole tree in place before the theme's script marks the current page. Without scripting, the page still shows its part. The tree's links are relative to the site's root, and the script prefixes each with the page's path to the root. In the help add-in's pane, which hides the sidebar, it does nothing. Online pages hold the whole nav tree and have no `nav.js`.

The worker puts the writable pages on its own `_pendingFlush` FIFO and returns the deltas. The matching `flush:i`, pinned to this lane, claims later, pops the batch and writes the HTML. The pinning puts the batch on the right worker; the FIFO covers a worker that starts a second `render:i` before its first `flush:i` claims.

## Persistent worker pool and serve mode

A one-shot build creates the pool at the top of `runBuild()` and destroys it at the bottom. In serve mode, `runServe()` creates the pool once and reuses it for every rebuild: each `runBuild()` allocates a fresh SAB, sends it to the live workers in a new `init` message, and waits for the build to finish.

Three details make the reuse work:

- **Per-lane Shiki survives.** `warmInit` has `survives_reset`, so the per-lane done flags are pre-filled when later builds allocate the SAB. Workers keep the highlighter in module scope, so `warmInit` never re-runs; `render:i` goes straight to `renderEnvInit`, which must re-run because it reads config and link tables from the new shared SAB.
- **`_buildCount`** tells the first build from later ones. `runBuild` tests `pool._buildCount > 0` to decide whether to skip injecting boot timings into the Gantt chart.
- **Boot timings are emitted once.** Workers post a `coldBoot` message on their first init only.

## Figures

An image that is the only content of its paragraph becomes a *figure*: a wrapper holding the image and a bar of icon buttons for downloading, copying and zooming it. Three kinds of image qualify: a diagram, a picture in two themes (the light and dark pair that `themePairPlugin` writes), and any other image (PNG, JPEG, GIF, WebP, or a picture's SVG). An image with text beside it in its paragraph, or inside a link, stays a plain `<img>`.

A diagram is a build-local `.svg` with no `.png` beside it. Its SVG is inlined in the HTML, so no separate file is fetched and the page's fonts and colours reach its text. A picture keeps its `<img>` (two for a light and dark pair).

The pipeline:

1. **`dispatch.execute()`** reads every `.svg` static file into a `svgContentsMap` keyed by `srcRel`, except a picture's SVG (one with its `.png` beside it is a screenshot, shown as an image; see [A picture as SVG](Authoring#a-picture-as-svg)). The map is packed into the shared SAB and broadcast to every render worker.
2. **`renderEnvInit`** on each worker unpacks `svgContentsMap` and passes it as `svgContents` to `createMarkdownIt`.
3. **`figurePlugin`** in `render.mjs` adds a core rule named `figures`. For each paragraph whose only content is an image (or the two images of a light and dark pair), the rule hides the paragraph tokens and wraps the image or images in `figure_open` and `figure_close` tokens, whose renderer rules write the wrapper. For a diagram (an image whose `src` ends in `.svg`, has no `.png` beside it and has its content in `ctx.svgContents`), `figure_open` also writes the SVG, and the image renderer returns an empty string for that image. The plugin sets `page.hasFigure = true`.
4. **`templatePhase`** writes the sprite of button glyphs (`FIGURE_SPRITE`, the `fig-*` symbols: download, copy, copied, zoom, close, vector, raster) into the page and includes `<script defer src="/assets/js/figure.js">` where `page.hasFigure` is true.

The wrapper for a diagram, abbreviated:

```html
<div class="fig-wrap" data-kind="diagram">
  <div class="fig-controls">
    <span class="fig-group" data-format="vector">
      <svg><use href="#fig-vector"/></svg>
      <button type="button" class="btn-reset" data-action="download-svg" aria-label="Download SVG" title="Download SVG">
        <svg><use href="#fig-download"/></svg>
      </button>
      <button type="button" class="btn-reset" data-action="copy-svg" aria-label="Copy SVG" title="Copy SVG">...</button>
    </span>
    <span class="fig-group" data-format="raster">
      <svg><use href="#fig-raster"/></svg>
      <button type="button" class="btn-reset" data-action="download-png" ...>...</button>
      <button type="button" class="btn-reset" data-action="copy-png" ...>...</button>
    </span>
    <button type="button" class="btn-reset" data-action="zoom" aria-label="Zoom" title="Zoom">...</button>
  </div>
  <div class="fig-container" data-svg-src="..." role="img" aria-label="...">
    <svg>...</svg>
  </div>
</div>
```

`role` and `aria-label` are emitted only when the image has alt text. An image without any logs a build warning, since a diagram is never decorative.

A picture's wrapper has `data-kind="picture"`, and its container holds the `<img>` (two for a light and dark pair) in place of the SVG. A picture drawn as SVG offers the same five buttons as a diagram. A raster image offers its raster group (Download PNG, JPEG or GIF by its type, and Copy PNG, or "Copy as PNG" for a type other than PNG) and Zoom.

**`data-tall` is decided at build time**, so nothing moves after the page loads. The wrapper gets `data-tall` when the figure, as shown in the 736 px content column, is at least as tall as its bar stood on end: 220 px with both groups, 126 px with the raster group only. The size comes from the `{:width height}` of the picture, or from the width and height (in points) on the root `<svg>` of a diagram. A picture with no stated size counts as short. From a window 1120 px wide, the stylesheet stands the bar of a `data-tall` figure on end beside it and makes it sticky, so it stays in view while the figure scrolls past. Otherwise the bar lies flat at the figure's top right when the column has room for both on one line, and above the figure against the column's right edge when it has not.

`figure.js` (no dependencies) handles the buttons on the client. For a diagram, it serialises the inline `<svg>` to XML with Inter and Cascadia Mono embedded for Download SVG and Copy SVG, and renders it to a 2048 px-wide canvas via `Image` + `toBlob` for Download PNG and Copy PNG. For a picture, Download links to the file of the theme being shown (its `.svg`, or the `.png` beside it), Copy SVG copies that file's text, and Copy PNG copies the PNG's bytes (for a raster of another type, the image drawn on a canvas and encoded as PNG). A successful copy swaps the clipboard glyph for a ticked one for 1.5 seconds and announces the copy through a `role="status"` element, `#fig-export-status`.

Zoom turns the container into a fixed overlay over the window, in the body's background colour, with a close button (`.fig-zoom-close`). Escape, a click on the figure or the close button ends it, and focus returns to what opened it. The figure appears at twice its size on the page, fitted to the window's width and never smaller than on the page. A raster is never stretched past its own pixels, and a figure taller than the window scrolls.

On a page opened from disk (`file://`, as the offline copy is), the browser can neither fetch a `file://` URL for the clipboard nor honour `download` on a `file://` link, so a picture's bar keeps only Zoom. A diagram's buttons work offline, because they serialise the SVG already in the page. In print the bar is hidden (`print.css`).

A diagram needs its content in `svgContents`: an external URL or a missing file falls through to the default `<img>` renderer. The markdown-it instance built on the main thread has no `svgContents` and never inlines a diagram.

## Diagram geometry

Graphviz decides how wide a node box must be, and the browser then paints the label inside it. The two measurements of the same string agree only if both use the same font.

The WASM Graphviz build has no font machinery (no pango, fontconfig or freetype), only built-in width tables for the core PostScript families, and it falls back to Times for anything else. `fontname="Inter"` therefore measures like a font that does not exist. Times is far narrower than Inter in the lowercase (`a` is 444 against 557 per 1000 em), so unpatched boxes come out about 11% too small and labels are painted outside them.

[`dot-metrics.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/dot-metrics.mjs)'s `applyInterMetrics()` fixes that before any layout runs. After `Graphviz.load()`, the family table lives in the module's linear memory, reachable through `_module.HEAPU8`, and is read on every layout, not cached. Overwriting the Times family's four width arrays (regular, bold, italic, bold-italic) with Inter's advances is therefore enough, because Inter's own fallback to Times routes the lookup there. The widths come from `builder/inter-metrics.json`, generated by `scripts/build_dot_metrics.mjs`. Against the site's diagram labels, this takes Graphviz from 11.4% under on average to 0.5% over.

Three guards stop the patch from failing silently:

- `locateTimesFamily()` requires **exactly one** match against the published Times AFM widths and spot-checks all four arrays. An `@hpcc-js/wasm-graphviz` bump that moves the table fails loudly.
- `assertMeasuresInter()` lays out a real string afterwards and checks that the box came back Inter-sized.
- If either fails, `regenerateDot` emits nothing and flips the exit code. A stale but correct SVG beats a freshly wrong one.

The residual 0.5% is kerning, which a per-character table cannot express. The table over-estimates, so boxes come out slightly generous. `scripts/check_dot_fit.mjs`, run from `check.bat`, renders every committed diagram with the real webface and fails if any label sits outside its box.

## Gantt chart and build introspection

Every build emits an inline-SVG Gantt chart of its task timeline. [`gantt.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/gantt.mjs)'s `groupGanttTimings` sorts the scheduler's timings into a `Map<section, taskTiming[]>`, and `renderGantt(grouped)` draws one SVG row per main-thread task plus one row per worker lane. The main-thread rows form four bands --- Seeds, Spine, Write and Check --- with Render's main-thread tasks in the Spine band and the worker rows between Spine and Write. The `Join` barriers are not drawn. Each worker row has one rectangle per task it ran, in start order, coloured by the task's section. The start-up bars share that row, labelled `cold` (the worker's cold start, drawn on the first build only), `warm` (`warmInit`) and `env` (`renderEnvInit`).

The chart goes through the same figure pipeline as other diagrams. The [Build Info](BuildInfo) page contains a markdown image reference to a placeholder `gantt.svg`, which the render pass turns into a figure with an inline SVG. After `writeOffline` completes, `tbdocs.mjs:injectGanttChart` finds the wrapper's `data-svg-src` marker in the rendered HTML and replaces the placeholder with the real chart. It patches the online and offline copies of the page, and updates the on-disk `gantt.svg` for the offline mirror's fallback. The help archive and the help add-in's project file are made before the injection and hold the placeholder, because the chart holds the build's own timings and would make every download differ.

When adding a new task to `TASKS`, give it a section in `GANTT_SECTION` in `gantt.mjs`: `Seeds`, `Spine`, `Render`, `Write` or `Check`. The build fails, naming the task, if a task has no section or one the chart does not draw. Only a `unique_per_worker` task needs none: its timings are drawn in each worker's lane.

## Dependencies

One `package.json` at the repo root lists the dependencies of the site generator, the PDF renderer and the gates:

```json
{
  "devDependencies": {
    "@biomejs/biome": "2.5.14",
    "@hpcc-js/wasm-graphviz": "^1.29.1",
    "acorn": "^8.0",
    "acorn-walk": "^8.0",
    "axe-core": "4.13.0",
    "fast-glob": "^3.3",
    "html-entities": "^2.6.0",
    "htmlparser2": "^12.0.0",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "pdf-lib": "1.17.1",
    "picocolors": "^1.1.1",
    "puppeteer": "25.0.4",
    "recheck": "4.5.0",
    "sass": "^1.0",
    "shiki": "^1.0"
  }
}
```

There is no template engine, framework, bundler or postinstall hook. What each package does:

- **Site generator.** The `markdown-it-*` packages cover the dialect extensions the legacy parser supported. `js-yaml` parses `_config.yml`, `_book.yml` and the frontmatter that `lib/frontmatter.mjs` splits off. `fast-glob` finds the source files. `shiki` highlights syntax. `@hpcc-js/wasm-graphviz` renders `.dot` sources. `sass` compiles the SCSS. `acorn` + `acorn-walk` parse the upstream `just-the-docs.js` for the AST-based offline patcher. `htmlparser2` is the parser under the link and integrity check. `picocolors` colours terminal output.
- **PDF renderer.** `puppeteer` controls headless Chromium for the paged.js layout pass, `pdf-lib` writes the PDF, and `html-entities` decodes the entities in the outline's entries.
- **Gates.** `axe-core` + `puppeteer` back the accessibility checker ([`scripts/check_a11y.mjs`](https://github.com/twinbasic/documentation/blob/main/scripts/check_a11y.mjs)). `recheck` + `acorn` back the regex-safety gate ([`scripts/check_regex_safety.mjs`](https://github.com/twinbasic/documentation/blob/main/scripts/check_regex_safety.mjs)). `@biomejs/biome` is the linter and formatter: `biome.jsonc` limits the linter to its correctness and suspicious rules and sets the formatter's style, and the lint gate ([`scripts/check_lint.mjs`](https://github.com/twinbasic/documentation/blob/main/scripts/check_lint.mjs)) runs it.

`tbdocs` itself uses none of `axe-core`, `recheck` and `@biomejs/biome`.

**Which packages are pinned.** A package is pinned to an exact version where a new release could change what the build produces or what a gate reports with nothing failing to say so: the code patches the package or relies on its internals with no guard, or the package's own results are what a gate reports. Everything else takes a caret range. Five packages are exact:

- `@biomejs/biome` --- a new release can add or change a rule, or lay code out differently, changing the verdict on code nobody touched. [PLAN-TOOLING-REVIEW.md](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-TOOLING-REVIEW.md), decision 4, records the reasoning.
- `axe-core` --- the scan injects a copy of its bundle patched at source level, and its rules decide the accessibility gate's verdict. [PLAN-axe-perf.md](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-axe-perf.md) records the reasoning.
- `pdf-lib` --- the shims under `book/lib/` are line-by-line ports of this release's source, and pdf-lib is no longer maintained. Each shim checks at load that what it replaces is this release's, so another release stops the book instead of changing it; [08-pdf-lib.md](https://github.com/twinbasic/documentation/blob/main/perf/notes/08-pdf-lib.md) records the pin.
- `puppeteer` --- the book renderer and the accessibility gate measure what its Chromium renders, and the performance notes reason about that version at source level.
- `recheck` --- the regex-safety gate reports its analysis and finds its native backend itself, because this release cannot find it on Windows; [WIP.Build.md](https://github.com/twinbasic/documentation/blob/main/WIP.Build.md) records the workaround.

`@hpcc-js/wasm-graphviz` is patched too but takes a caret range: [`dot-metrics.mjs`](#diagram-geometry) finds Graphviz's width table by an exact signature match and fails the build when a new release moves it. A change to `package.json` updates this section in the same commit.

Node 22+ is required: the SAB scheduler uses `Atomics.wait`, `Atomics.notify` and `SharedArrayBuffer`, all available in Node 22 without flags.

## Asset layout

The deployed `/assets/` tree has three sources:

| Source on disk | What lives there | Phase that delivers it |
|---|---|---|
| `docs/assets/` | Project-owned content: the two SCSS entry points, project JS (`theme-toggle.js`, `figure.js`), hand-written stylesheets (`print.css`, `just-the-docs-head-nav.css`), Graphviz/DOT diagrams (`.dot` sources + `.svg` renders), the self-hosted webfaces under `fonts/` (subset `.woff2` plus their OFL licences), and any content images contributors add. | Discovered by [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs), copied by `writeAssets`. |
| `builder/vendor/just-the-docs/` | Vendored from the just-the-docs theme (v0.10.1) and patched in tree: `_sass/` (the theme's SCSS sources, fed into the compilation; 30 of its files differ from the v0.10.1 originals), `assets/js/just-the-docs.js` (patched) and `assets/js/vendor/lunr.min.js` (unmodified). Both JS files are copied verbatim into the output. [`builder/vendor/just-the-docs/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/vendor/just-the-docs/README.md) has the file-by-file inventory, the re-vendoring procedure and the in-tree patches. | `_sass/` consumed by [`scss.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scss.mjs); `assets/` copied by `writeAssets`. |
| Generated in-process | `just-the-docs-combined.css` (from `scss.mjs`, over the two entry points plus every partial under `docs/_sass/` --- see [Project styling](#project-styling)) and `tb-highlight.css` (from `highlight-theme.mjs`). Neither is committed; both are rebuilt every run. | Written by `scss` (combined CSS) and `writeAssets` (highlight CSS). |

The fonts are committed artifacts, like the DOT renders: `scripts/build_fonts.py` regenerates them from pinned upstream releases, and the build downloads and subsets nothing. The stylesheets reference them with a *relative* `url("../fonts/...")`, so the same compiled CSS resolves in the online tree, the `file://` offline mirror, a `--baseurl` deployment and the sparse PDF tree without a rewrite. `builder/pdf.mjs` copies the six faces `print.css` declares into `_site-pdf/`, since that tree holds only what the book render needs.

CSS files in either copy path, and generated CSS, get a baseurl rewrite (`url("/path")` → `url("<baseurl>/path")`) when the deployment baseurl is non-empty, so the `url("/favicon.png")` the SCSS entry point emits resolves under sub-path deployments.

`theme-toggle.js` implements the three-state (system / light / dark) theme switch as a progressive enhancement over the no-JS `prefers-color-scheme` default: the correct palette renders without scripting, and the script adds only the manual override, which persists a `data-theme` choice. A page opened with `?theme=light` or `?theme=dark` takes that theme instead, as do the pages reached from it in the same tab, without changing the reader's stored choice. The IDE's help add-in passes the IDE's theme this way, and also `?pane=1`, which the same early script keeps for the tab and which hides the sidebar and the header so the narrow pane shows the page alone. Where the browser refuses the page its storage, as it does to the frame in the add-in's detached window, the early script keeps both parameters in the frame's `window.name`, and `theme-toggle.js` takes the theme from the page rather than from storage. `figure.js` powers the zoom overlay and the download / copy controls of every figure.

## Project styling

**Every hand-written style rule the project owns lives under `docs/_sass/`.** A CSS rule for a new component goes there, not into the vendored theme sources under `builder/vendor/just-the-docs/_sass/` and not into a new stylesheet. Everything under `docs/_sass/` compiles into one asset, `assets/css/just-the-docs-combined.css`, which every page loads.

**The vendored tree is patched and must not be re-vendored wholesale.** 30 of its files differ from the v0.10.1 originals: 26 modified and 4 deleted. Most of that is a mechanical Sass `@import`-to-`@use` migration, which you repeat against the new upstream. Six files are not mechanical --- `buttons.scss`, `code.scss`, `layout.scss`, `navigation.scss`, `search.scss` and `support/_variables.scss` --- and hold accessibility fixes: `.btn-reset` at 1.39:1 on the dark background, the site footer moved from 2.82:1 to 7.20:1, three focus rings upstream ships without, and two palette variables raised to AAA. Overwriting the tree from a fresh tarball reverts all six. The build does not notice, and `check.bat` only half does: the axe scan reports the contrast regressions but cannot see a missing focus ring, so the three ring patches would go back without a word. [`builder/vendor/just-the-docs/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/vendor/just-the-docs/README.md) names every diverged file, the commit each patch came from, and the order of steps for a re-vendor.

`.scss` is build input, never a published asset. `_config.yml`'s `exclude:` drops `**/*.scss` from the source walk, so a partial is compiled and its source is not copied out.

| File | What it holds |
|---|---|
| `custom/custom.scss` | The bulk of the project's CSS: `.sr-only`, the inline-diagram controls and container, the table-wrapper focus ring, the page footer and its divider, the `.section-links` disclosure, `.site-logo`, the code-size overrides (as the `tb-code-overrides` mixin), the theme toggle, the aux-nav focus rings, `.video-link`, footnote back-links, `<summary>` target sizing, and in-heading links. Shadows the vendored theme's empty `custom/custom.scss` hook by load-path order. |
| `custom/_theme.scss` | The `dark-theme` mixin and nothing else. Every dark-mode rule in the project passes through it. |
| `custom/_fonts.scss` | The `@font-face` rules for the self-hosted faces, plus the `$tb-body-font-family` / `$tb-mono-font-family` stacks. The faces sit in an `emit-font-faces` mixin so they are emitted once, from the light compilation: the dark compilation re-emits its whole payload under two selectors, and an `@font-face` inside a selector is invalid. |
| `custom/admonitions.scss` | The GFM admonition palette, light and dark. |
| `modules-dark.scss` | Not a partial to `@use` directly: it is the dark **configuration** of the whole just-the-docs module tree (one `@use "modules" with (…)` carrying the dark palette), loaded only by `meta.load-css()` from inside the `dark-theme` mixin. It also re-passes the two font stacks, which are not dark-specific: omit them and the site renders Inter in light mode and the system stack in dark, for the specificity reason below. |

Two plain-CSS stylesheets sit outside the Sass pipeline and are copied verbatim: `docs/assets/css/print.css`, the book's complete design, which loads no just-the-docs styles, and `docs/assets/css/just-the-docs-head-nav.css`. Put no web style change in either.

### Two compilations, one stylesheet

`scss.mjs` runs Dart Sass twice, on two worker tasks, over two entry points:

- `scssLight` compiles `docs/assets/css/just-the-docs-combined.scss` --- the light palette. This is where `custom/custom.scss` is `@use`d, so everything in it is emitted once, at root level, and where `emit-font-faces` is included.
- `scssDark` compiles `docs/assets/css/just-the-docs-dark.scss` --- the same module tree configured from `modules-dark.scss`, wrapped in the `dark-theme` mixin.
- `scss` (main) concatenates the two results and writes the single combined CSS asset to `_site/` and `_site-offline/`, applying the baseurl `url()` rewrite on the way.

There are two compilations because **Dart Sass keeps one module cache per `compile()` call, and a module URL can be loaded once per compilation with one variable configuration.** The dark theme needs `modules.scss` with different variable values, so it needs a fresh compilation with an empty cache. `meta.load-css()`'s `$with` map writes to the same cache, so it is no way around this. The light entry point therefore loads `modules` exactly once and hardcodes the two literal colours it would otherwise read from a Sass variable.

The `dark-theme` mixin in `custom/_theme.scss` emits its content **twice**:

```scss
@mixin dark-theme {
  @media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) { @content; }
  }
  html[data-theme="dark"] { @content; }
}
```

The first copy is the no-JS system default, with `:not([data-theme="light"])` as the escape hatch for a reader who has forced light. The second is the explicit toggle choice, which wins even on a light OS because it is emitted last at equal specificity. `builder/FUTURE-WORK.md` tracks a single-source alternative, a custom-properties token layer.

### The specificity trap

**Read this before writing any rule here.** The dark compilation re-emits *every* just-the-docs base rule inside that mixin, so a bare element selector in the theme reappears scoped to the theme root. Both dark selectors are (0,1,1), so:

| Rule | Light | Dark re-emission |
|---|---|---|
| `a { text-decoration: none }` (theme `base.scss`) | (0,0,1) | `html[data-theme="dark"] a` --- (0,1,2) |
| `hr { margin: $sp-6 0 }` (theme `base.scss`) | (0,0,1) | `html[data-theme="dark"] hr` --- (0,1,2) |
| `.main-content ul { margin-top: 0.5em }` (theme `content.scss`) | (0,1,1) | `html[data-theme="dark"] .main-content ul` --- (0,2,2) |

So a **single-class rule that overrides a bare element selector applies in light mode and silently does not in dark**. `.reversefootnote` at (0,1,0) loses to (0,1,2). The remedy is to prefix the selector with `.main-content`: `.main-content .reversefootnote` is (0,2,0) and wins in both themes.

Two extensions of the rule:

- **`.main-content` is not always enough.** When the overridden rule is itself scoped under `.main-content` upstream, the dark copy lands at (0,2,2) and a (0,2,1) override still loses, as `.section-links > ul` found. Either climb another level or emit a matching rule inside `dark-theme`; `custom.scss` does the latter for that case.
- **Site chrome outside `<main>` has no `.main-content` to use.** An `<hr>` that is a direct child of the main-content element takes `#main-content > hr` at (1,0,1). The theme toggle has to beat `html[data-theme="dark"] .btn-reset:focus-visible` at (0,3,1), so `#theme-toggle:focus-visible` at (1,1,0) is used. An id selector is the usual answer here.

The trap is easy to miss because the rule works in light mode. The footnote underline, the footer `hr` margins and `.section-links > ul` all hit it.

Prefer a selector that wins on specificity over one that wins by source order: equal-specificity rules are decided by position in the concatenated output, and the light half always precedes the dark half.

### Verifying a style change

Run `serve.bat` and look at the page **in both themes**. A dark-mode specificity failure is cosmetic, raises no error or warning, and no gate catches it. Use the theme toggle, not the OS setting, so the `[data-theme]` half is exercised. Do not judge styling by opening a built page as a `file://` URL: the online tree references its assets root-absolutely, so the page loads unstyled.

Then run `build.bat && check.bat`. A malformed rule is an SCSS compile failure, which warns with the source location and flips the exit code without aborting, so the previous build's CSS stays in `_site/` and the site appears to work. Read the build output, not the page. `check.bat`'s accessibility scan covers every sample page in both themes, and its `target-size` and `color-contrast` rules are where a geometry or palette change shows up. If the new component uses markup the site has not used before, also add a construct family to `scripts/pick_a11y_sample.mjs` (see [Site Checks](Tools-Site-Checks#pick-a11y-sample)), or no axe rule keyed on it runs anywhere.

## Changing a typeface

The site uses three faces --- Inter for text, Cascadia Mono for code, and Source Serif 4 for the body text of the PDF book --- and the build names them in many places besides the stylesheet. Only some of those fail loudly when missed. In the order a change goes:

1. **The font files** (all three faces). [`scripts/build_fonts.py`](Tools-Build#build-fonts) downloads each face's pinned release, verifies its SHA-256, subsets it, and writes the `.woff2` files and their licences into `docs/assets/fonts/`. A new face is an entry in its `SOURCES` table --- the release URL, the hash and the licence --- and one entry per file in `FACES`: the file inside the archive, the pinned axes, the Unicode ranges and the output name. Keep the output `.woff2`, which is the only font format the [publish allowlist](Building#what-the-build-refuses-to-publish) accepts.
2. **The web stylesheet** (Inter and Cascadia Mono). `docs/_sass/custom/_fonts.scss` holds the `@font-face` rules, inside the `emit-font-faces` mixin, and the `$tb-body-font-family` and `$tb-mono-font-family` stacks, which `docs/assets/css/just-the-docs-combined.scss` passes into the theme. `docs/_sass/modules-dark.scss` passes them again for the dark compilation, and `docs/assets/css/just-the-docs-dark.scss` uses the mono stack once more for `pre`, `kbd` and `samp`. All of these read the two variables, so replacing a face inside an existing stack changes nothing in them. A new stack must be passed in both compilations, or the dark theme keeps the system fonts (the [specificity trap](#the-specificity-trap) again).
3. **The preloads** (the two roman web faces). `fontPreloads()` in `builder/template.mjs` preloads `inter-variable.woff2` and `cascadia-mono-variable.woff2` by name, from its `PRELOAD_FONTS` list. It sets `crossorigin`, which a font preload needs even from the same origin; without it the browser downloads the file twice. A preload of a missing file is a broken link on every page, which the link check reports. The link-check fixture under `test/fixtures/check-src/assets/fonts/` holds stub files under the same two names, so renaming either file means renaming its stub, or [`check_links_diff.mjs`](Tools-Site-Checks#check-links-diff) fails on every pull request.
4. **The book** (all three faces). `docs/assets/css/print.css` is the whole design of the PDF and loads nothing from the Sass build, so it has its own `@font-face` block and stacks. `builder/pdf.mjs` reads that block for every file named as `url("../fonts/...")` and copies each into `_site-pdf/`. The PDF pass aborts on a named file that does not exist.
5. **Diagram exports** (Inter and Cascadia Mono). `FONT_FILES` in `docs/assets/js/figure.js` maps each family name to its weight range and file names, and the Download and Copy buttons embed those files in an exported SVG or PNG. A family it does not list is exported without its face and without a message; a listed file that no longer exists costs one console warning.
6. **The Gantt chart** (Inter). `builder/gantt.mjs` writes its own `<style>`, with its own copy of the text stack, into the chart on the [Build Info](BuildInfo) page.
7. **The diagram sources** (Inter). Every `.dot` source names the face in its `fontname` attributes, and the browser paints the rendered SVG in that face. The new name must be one Graphviz does not recognise. The widths in the next step are written over the table Graphviz falls back to for an unknown name, so a name it does recognise (a built-in PostScript family such as Helvetica) is measured from that family's own table instead.
8. **The diagram metrics** (Inter). Graphviz sizes the boxes from the width table in `builder/inter-metrics.json` (see [Diagram geometry](#diagram-geometry)), and the tools around that table name Inter. [`scripts/build_dot_metrics.mjs`](Tools-Build#build-dot-metrics) measures the family `Inter` from Inter's two `.woff2` files, and [`scripts/check_dot_fit.mjs`](Tools-Site-Checks#check-dot-fit) loads the same two files to paint what it measures. Edit both for a new face; rerunning the generator alone measures Inter again. `builder/dot-metrics.mjs` reads the table as `inter-metrics.json`, and `builder/dot.mjs` lists that file in `GENERATOR_FILES`, so a new table re-renders every diagram; rename the file and both must follow. Then run `check_dot_fit.mjs`.
9. **The accessibility sweep.** Run [`scripts/sweep_a11y.mjs`](Tools-Site-Checks#sweep-a11y) over the whole site, not only `check.bat`'s sample. axe's `target-size` rule measures rendered boxes, and an inline element's height is its font's content area, so results move with the face. Several rules in `custom/custom.scss` exist because of measured content-area heights, and their comments give the numbers for the current faces.

Pages under `docs/Documentation/` also name the faces in prose, and nothing checks them. Search for the old face's name before committing.

## What is NOT in builder/

Some build-adjacent code lives at the repo root rather than under `builder/`:

- **PDF rendering** --- `book/render-book.mjs` plus its `book/lib/*.mjs` helpers and the `paged.browser.js` bundle. `tbdocs` produces `_site-pdf/book.html`; `book.bat` renders the PDF separately. `pdf-lib` is used only at PDF time; `puppeteer` is also loaded by the accessibility scripts, through `scripts/lib/browser.mjs`, and never by `tbdocs`. See [PDF Generation](PDF-Generation).
- **Standalone link checking** --- `scripts/check_links.mjs` reads a built tree from disk. The generator does its own check under `--check`, over the HTML still in worker memory; use the script for a tree the build did not produce.
- **External link crawling** --- `scripts/crawl_check.mjs` reads from HTTP.
- **Accessibility checking** --- `scripts/check_a11y.mjs` runs puppeteer + axe-core over the built offline tree after the build.
- **Graphviz/DOT source files** --- a `.dot` anywhere under `docs/` is source, and its `.svg` sibling is a build artifact that `tbdocs` regenerates as needed. Shared diagrams live in `docs/assets/images/dot/`; one that belongs to a single page sits beside it, as `docs/Tutorials/CEF/Images/MonacoArchitecture.dot` does.
- **Webfont generation** --- `scripts/build_fonts.py` downloads the pinned Inter, Cascadia Code and Source Serif 4 releases, verifies their SHA-256, pins the optical-size axis where a face has one, and subsets the faces into `docs/assets/fonts/`. The site's code face is Cascadia Mono, the ligature-free cut inside the Cascadia Code release. The `.woff2` files are committed and the build never runs the script. [Changing a typeface](#changing-a-typeface) lists everything else a new face touches.
- **Diagram font metrics** --- `scripts/build_dot_metrics.mjs` measures Inter's advance widths in a browser and writes `builder/inter-metrics.json`, which `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. The JSON is committed and the build never runs the generator. See [Diagram geometry](#diagram-geometry).
- **Diagram fit checking** --- `scripts/check_dot_fit.mjs` renders every committed diagram with the real webface and asserts no label sits outside its box. It runs from `check.bat`, not from the build.

## Drift guards and failure modes

The build aborts or flips the exit code in these cases:

- **Page-count drift.** `runBuild()` ends by comparing this build's inventory with `builder/page-baseline.json`, a committed file holding the page and static-file counts of the last committed build. A rise rewrites it and says so (only in a build into `docs/_site`; another `--dest` reports it); a fall fails the build. `discover()` returns {{tbdocs:pages}} pages today: every `.md` and `.html` under `docs/` with a parseable frontmatter block, after `_config.yml`'s `exclude:`. The baseline is a file, not a fixed minimum, because a minimum would miss a loss smaller than its margin, such as the 37 pages of `AppGlobalClassObject/_App/` that [Authoring](Authoring#what-may-live-in-docs) describes. See [the page-count drift guard](Building#the-page-count-drift-guard). How a single missing page is reported depends on how it went missing. A page that loses its frontmatter (a UTF-8 BOM in front of the `---`, or any line before it) is reclassified as a static file, and the publish-policy sweep below aborts the build naming the path, because `.md` is in neither extension set. A page dropped by an `exclude:` pattern is never seen; only the link check flags broken links into it, so a page nothing links to disappears silently. Nav integrity fires when a *parent* disappears and strands its children, not when a leaf does.
- **SAB structural validation.** `verifySchedulerSAB(TASKS, views, idMapping)` runs right after allocation. A misconfigured `expected`/`perWorkerDeps` list, a duplicate task name or a successor edge to an unknown task aborts the build before any task runs.
- **DOT render failure.** A failed diagram keeps its previous SVG and the batch continues, so every broken diagram appears in one run; the orchestrator sets exit code 1 (`EXIT_FOUND`) from the failure count.
- **SCSS compile failure.** The light/dark workers warn with the source location and continue with `failed: true`; the joiner sets exit code 1 (`EXIT_FOUND`). The existing `_site/` CSS stays.
- **Nav integrity.** An orphan or ambiguous `parent:` throws inside `nav.execute()`, which aborts the build through `Scheduler._abort()`.
- **Unpublishable file type.** Every non-page under `docs/` is copied into the output verbatim, so `publish-policy.mjs` holds an allowlist of publishable types and throws on anything else. It runs in `discover` over the static-file inventory, naming the source path before a byte is written, and again in `dispatch` over each tree's derived inventory, the only sweep that sees redirect stubs, vendored theme assets and generated auxiliaries. Neither depends on `--check`. This failure aborts instead of setting an exit code: a broken link leaves a tree worth inspecting, a tree carrying a private key does not. `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are separate sets so the build can emit `sitemap.xml` and `search-data.json` without allowing a stray `docs/secrets.json`; [`scripts/check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy) asserts they stay separate.
- **Redirect collision.** A `redirect_from:` entry becomes a stub page at that URL, so `deriveRedirectStubs()` refuses an entry pointing at a URL some page already publishes, and two pages declaring the same entry. Both name the source file on each side.
- **Destination collision.** `assertNoDestinationCollisions()` runs before the write phase and throws if a static file's destination path equals a page's. The static-file copy and the page write run in parallel, so the survivor would otherwise depend on I/O ordering.
- **Missing PDF input.** Phase 8 aborts when the book cannot be assembled: no page (or more than one) has `layout: book-combined`, a font `print.css` names is absent from the source tree (the message names `scripts/build_fonts.py`), or an image `book.html` references is not under the source tree. The last is the one that fires in practice; `--tolerate-missing-images` downgrades only that one to a warning.
- **A page the book manifest does not mention.** Not a failure. `bookCoverage()` compares every page with `_book.yml`'s entries and its `left_out:` list, and the summary prints a `book:` warning for a page in neither, a page in both, an entry that matches no page, and a landing or foreword URL that names no page. It runs only when the book is built, and [`check_book_coverage.mjs`](Tools-Toolchain-Tests#check-book-coverage) holds each finding to a probe. See [Book Configuration](Book-Configuration#pages-left-out-of-the-book).
- **Worker crash.** A worker handler that throws posts `{ taskFailed, message, stack }` to main; the scheduler calls `_abort()`, the build rejects, and the orchestrator reports the error with the task name.
- **A worker that never returns.** A handler stuck in an unbounded loop, an exponentially backtracking regex or a promise that never settles posts nothing, so its successors' dependency counts never fall and the scheduler's promise never settles. Nothing in the SAB protocol can see this. `Scheduler` therefore runs a `setInterval` watchdog: if no task completes for `--stall-timeout` seconds (default 120, `0` disables), it aborts with `{ stalled: true }` and prints the outstanding tasks in three groups: claimed by a worker that never returned (the cause), runnable but unclaimed (including an `F_PIN_TO_PRED` task whose lane is the wedged one), and blocked on a predecessor (the consequence). A `render:` or `flush:` chunk also prints its source pages, through an optional `describe()` on the task def. `Worker.terminate()` ends a thread spinning inside a regex, so the abort ends the process. Under `--serve` the pool outlives a rebuild, so `serve.mjs` replaces the whole pool on the `stalled` flag instead of identifying the wedged lane, because the SAB records the lane a task *completed* on, not the one that claimed it. See [when a build stops instead of failing](Building#when-a-build-stops) for the reader-facing form.
- **Link and integrity check** (`--check`). The one failure that does *not* abort: a broken link still produces a valid site worth inspecting, unlike a nav ambiguity, where the output itself would be wrong. The check tasks collect findings and `runBuild()` sets the exit code afterwards: 1 for any link or integrity failure, the same code as every other failed step. A refused command line or a crash exits 2.
- **Incomplete parallel results.** Six checks along the chunk-merge path refuse to continue with a piece missing: `renderJoin` asserts that every page has rendered content; `render:i`'s merge rejects a page the build does not know; the search index refuses both a page without content and a chunk that never arrived; the book refuses a chapter whose content is absent (empty is legitimate); and a link-check chunk that errored fails the run. None can fire while the task graph is wired correctly. They exist because a wrongly wired graph would otherwise be skipped silently, as the next section explains.

### Dependency counts order the work, not the build state

A worker posts its result to the main thread and *then* decrements its successors' dependency counts in shared memory. The main thread reads those counts directly from shared memory, without first processing its message queue. A barrier's count can therefore reach zero while results are still pending and the `submit()` calls that merge them into build state have not run.

The scheduler's input check prevents this. A main-thread task returns to the ready set if any name in its `expected` list is missing from the results map, and a result is recorded there just before its `submit()` runs. So a dynamic barrier must list every chunk task in `expected`, **even when its own `execute()` ignores the inputs**. `flushJoin` needs them because it sums the per-chunk write statistics; `renderJoin` returns an empty object and needs no input, but lists them too.

The reason is the search index. It is assembled by flattening an array created with `new Array(N)` (holes, not `undefined`), and `Array.prototype.flat()` skips holes silently. If a `render:i` result arrives after the index is written, no error is raised, and the pages of that chunk, a contiguous run, are missing from `search-data.json`.

When you add a fan-out, check for two silent failures combining into one invisible one: list the chunk tasks in the barrier's `expected`, and make every place on the path refuse to continue when a piece is missing.

Setup failures (`@hpcc-js/wasm-graphviz` not installed, `sass` missing) print a one-line recovery hint and continue with stale outputs. They do not flip the exit code, so a fresh checkout still builds.
