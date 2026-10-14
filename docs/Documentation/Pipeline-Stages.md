---
title: Pipeline Stages
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Pipeline-Stages
---

# Pipeline Stages
{: .no_toc }

Interface reference for `tbdocs`. The first half covers every task in the scheduler's DAG, grouped by the five Gantt sections (Seeds / Spine / Render / Write / Check). The second half covers every module and its exports.

For design rationale and a tour, see [tbdocs Builder](Builder). To add a task or markdown-it plugin, see [Extending the Builder](Extending).

* TOC goes here
{:toc}

## Data model

Every task shares three pieces of mutable state: the `pages[]` array, the `staticFiles[]` array, and the `site` object. All three live on one `SharedState` instance owned by the scheduler.

### Page objects (`pages[]`)

`discover` creates one page object per `.md` or `.html` source file with parseable YAML frontmatter. Later tasks add fields; none removes or renames a field set earlier. Render workers receive structured-clone copies of their chunk, mutate the copies, and return a delta that the render task's `submit()` merges into the master page via `state.pageByDest`.

| Field | Added by | Type | Description |
|---|---|---|---|
| `srcPath` | `discover` | `string` | Absolute filesystem path of the source file. |
| `srcRel` | `discover` | `string` | POSIX-style path relative to `srcRoot`, e.g. `Reference/Core/Dim.md`. |
| `ext` | `discover` | `string` | Lowercase file extension: `.md` or `.html`. |
| `frontmatter` | `discover` | `object` | Parsed YAML frontmatter. A leading UTF-8 BOM is stripped first (it would otherwise hide the frontmatter and file the page as a static asset). An unquoted value that ends in `#` gets a `discover:` warning naming its file and line, since YAML reads `#` after a space as a comment. Only named keys are read, so an unrecognised key such as a package page's `indexed_from` is inert. |
| `rawContent` | `discover` | `string` | Body text after the frontmatter block. |
| `contentLine` | `discover` | `number` | The 1-based line of the source file on which `rawContent` starts. `validateCountNames` adds it to a line of `rawContent`, so its messages name the line of the file. |
| `permalink` | `discover` | `string` | URL path from `frontmatter.permalink`. `computePermalink` falls back to `/<srcRel>.html`, but `nav`'s `validatePermalinks` aborts the build first: the file tree does not mirror the URL tree. |
| `destPath` | `discover` | `string` | Filesystem path within the output root, e.g. `Reference/Core/Dim.html`. |
| `layoutDefault` | `discover` | `boolean` | `true` when frontmatter has no explicit `layout:` key. |
| `imageScope` | `discover` | `boolean` | `true` when `srcRel` contains an `Images/` segment. Phase 3 uses this to validate image paths. |
| `navPath` | `nav` | `string` | Slash-joined nav chain: `grand_parent / parent / title`. Set only on pages with a non-empty title. |
| `navLevels` | `nav` | `object` | Positional indices in the sidebar tree. `templatePhase` uses this to generate per-page activation CSS, and `withPartialNav` to choose the part of the nav tree an offline page holds. |
| `breadcrumbs` | `nav` | `Page[]` | Ancestor chain from the root to the current page, nearest-first. |
| `children` | `nav` | `Page[]` | Immediate child pages in nav order. |
| `renderedContent` | `render:i` | `string` | HTML body produced by markdown-it. Set on the worker, merged back into the master page via the render delta. |
| `searchIndexMarks` | `render:i` (`searchIndexMarksPlugin`) | `object[]\|undefined` | The [index entries](Authoring#index-entries-for-the-site-search) on the page's headings, each `{ id, index, index_also }` with the raw attribute values, removed from the heading before the HTML is written. Set only on a page that has any. Read by `deriveSearchEntries` on the same worker; never merged back to main. |
| `seoTitle` | `render:i` (`computeChunkSeo`) | `string` | HTML-stripped, whitespace-collapsed page title for `<title>` and `og:title`. |
| `seoFullTitle` | `render:i` (`computeChunkSeo`) | `string` | `"<seoTitle> \| <siteTitle>"` for non-home pages; equals `seoTitle` on the home page. |
| `seoCanonical` | `render:i` (`computeChunkSeo`) | `string` | Absolute canonical URL. |
| `seoIsHome` | `render:i` (`computeChunkSeo`) | `boolean` | `true` when the page's permalink is a known home-page URL. |
| `html` | `render:i` (`templatePhase`) | `string` | Complete HTML document, ready to write to disk. Absent on `layout: book-combined` pages, which `writePdf` owns. |
| `offlineHtml` | `render:i` (`deriveOfflinePage`) | `string\|undefined` | Pre-computed offline HTML for the page, with every absolute URL rewritten to a page-relative path. Set after `templatePhase` when `!skipOffline`. |
| `hasFigure` | `render:i` (`figurePlugin`, in the `figure_open` renderer) | `boolean\|undefined` | `true` when the page contains at least one figure. `templatePhase` uses this to write the figure sprite into the page and to conditionally include the `figure.js` script. |
| `offlineMisses` | `render:i` (`deriveOfflinePage`) | `number\|undefined` | Count of URLs that could not be resolved during the per-page offline rewrite. Aggregated by `flushJoin`. |

### Site object (`site`)

Each task's `execute()` or `submit()` stores its output on `state.site`; downstream tasks read it from there.

| Field | Type | Set by | Description |
|---|---|---|---|
| `config` | `object` | `discover` | Parsed `_config.yml`, with CLI overrides (`--baseurl`, `--url`) already applied. |
| `navTree` | `object` | `nav` | Top-level nav hierarchy. |
| `buildInfo` | `object` | `buildInfo` | `{ commit: string, commitDate: string }` from git. Both fall back to `"unknown"` outside a git repository. |
| `data` | `object` | `loadData` | `_book.yml` loaded as `{ book: … }`, or `{}` when absent. |
| `bookData` | `object\|null` | `loadData` | Shortcut for `data.book`. After `resolveBookChapters`, each entry holds `_chapters` (`Page[]`) plus `_landing` / `_foreword` if declared. |
| `markdown` | `MarkdownIt` | `markdownInit` | Main-thread markdown-it instance. Used only for site-level SEO; render workers build their own. |
| `linkTablesSerialized` | `object` | `markdownInit` | `{ byPath, byUrl, byRedirect }` of `[key, permalink]` pair arrays for structured-clone transfer to render workers. |
| `seoSiteTitle` | `string` | `markdownInit` (via `computeSiteSeo`) | Rendered site title from `config.title`. |
| `seoLogoUrl` | `string\|null` | `markdownInit` (via `computeSiteSeo`) | Absolute URL of the site logo. |
| `highlightCss` | `string\|null` | `highlighterInit` | Generated `tb-highlight.css` content. Read by `writeAssets` and `writePdf`. |

`SharedState` also holds fields outside `site`:

| Field | Type | Set by | Description |
|---|---|---|---|
| `sitePaths` | `Set<string>` | `dispatch` | All site-relative paths reachable in the online tree (pages + statics + redirects + theme assets). Used by the offline rewrite in every render worker, by `scss` and by `writeOffline`. |
| `searchChunks` | `Array<Array<entry>>` | `dispatch` (allocated), `render:i.submit` (filled) | Per-chunk search entries collected from the render workers. Read by `searchData`. |
| `checkTrees` | `object\|null` | `dispatch` | Per-tree `{ rels, baseurl }` for each tree being checked, or `null` when `--check` is off. Broadcast to the workers so each lane can build its own tree index. When non-null, the check runs everywhere downstream. |
| `checkChunks` | `Array<object>` | `dispatch` (created empty), `flush:i.submit` (appended) | Per-chunk findings, keyed by tree, in arrival order. Read by `linkJoin`. |
| `checkChunkCount` | `number` | `dispatch` | How many chunks `linkJoin` must see. A short list is an error: the check examined less than the whole site. |
| `checkStubs` | `Array<{destPath, html}>` | `writeAux` | Redirect stubs, which never go through `flush`. `linkJoin` checks them on the main thread as one extra chunk per tree. |

### Static files (`staticFiles[]`)

Also produced by `discover`. Every file that is not a page --- images, fonts, prebuilt CSS/JS, and any `.md`/`.html` file without frontmatter --- becomes a static file object and is copied into the output verbatim. `discover` then runs the [publish allowlist](#publish-policymjs) over the inventory and throws on any file that is not a publishable type, so a frontmatter-less `.md` is never served as raw markdown. `dot.submit()` appends descriptors for regenerated diagrams, and `vendorAssets.submit()` for downloaded images.

| Field | Type | Description |
|---|---|---|
| `srcPath` | `string` | Absolute source path. |
| `srcRel` | `string` | POSIX path relative to `srcRoot`. |
| `destRel` | `string` | Relative path within the output root. |
| `size` | `number` | File size in bytes at discovery time. |

## Scheduler-level concepts

Every task is an entry in the static `TASKS` object in [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs). [`scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scheduler.mjs) and [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs) read these definitions at startup (to lay out the SAB) and at runtime (to dispatch task bodies).

### Task definition fields

| Field | Type | Required | Description |
|---|---|---|---|
| `expected` | `string[]` | yes | Names of predecessor tasks. The scheduler builds successor edges from this list. |
| `execute` | `(inputs, ctx, state, scheduler?) → result` | for main tasks | Body. `inputs` is a `{ [predName]: predOutput }` object; `ctx` holds `srcRoot`, `destRoot`, `opts`, `workerCount`; `state` is the `SharedState`. |
| `handler` | `string` | for worker tasks | Name of the handler function in `cpu-worker.mjs`. Must appear in the `HANDLERS` map in `sab-scheduler.mjs`. |
| `submit` | `(out, state, scheduler) → void` | yes | Synchronous output router. Runs on the main thread after `execute` (or after the worker message arrives). Merges the delta into `state` and may register dynamic tasks (e.g. `dispatch.submit`). |
| `runOnMain` | `boolean` | no | Task body runs on the main thread. The main loop claims; workers skip. Default `false` for tasks with `handler:`. |
| `on_demand` | `boolean` | no | Seed task that is **not** auto-started. Becomes claimable only when a successor would otherwise be runnable. |
| `unique_per_worker` | `boolean` | no | The "done" state is per-lane. Worker tasks only. |
| `run_when_idle` | `boolean` | no | Worker may run this task speculatively when no other task is claimable. |
| `survives_reset` | `boolean` | no | The per-lane done flags survive an SAB reset between builds in serve mode. |
| `perWorkerDeps` | `string[]` | no | Names of `unique_per_worker` tasks that must have run on the claiming lane. |
| `pinnedTo` / `F_PIN_TO_PRED` | (dynamic) | no | Must run on the same lane that ran the named predecessor. Set via the `pinnedTo` array, not in the task def directly. |
| `priority` | `number` | no | When several tasks are READY, the **highest** value claims first. Default `0`; `dispatch.submit` gives each `flush:i` `priority: 1`, so a pending flush outranks a fresh render. |
| `consolidate` | `boolean` | no | Combine timings across lanes into one Gantt swimlane (`render:i` / `flush:i`). |
| `ganttSection` | `string` | no | Section header for the Gantt chart row (`Seeds` / `Spine` / `Render` / `Write` / `Check`). |

### Handler IDs

`HANDLERS` in `sab-scheduler.mjs` maps each worker handler's name to an integer. The SAB stores the ID per task, and the worker looks it up to dispatch the call:

```js
export const HANDLERS = {
  warmInit: 0, renderEnvInit: 1, flush: 2,
  scssLight: 3, scssDark: 4, dot: 5,
  buildInfo: 6, render: 7,
};
```

The reverse table (`handlerById`) is built when the worker module loads.

### Static vs dynamic tasks

`TASKS` lists the **static** tasks, whose presence and edges are known before the build starts. **Dynamic** tasks (`render:i`, `flush:i`) are allocated at runtime by `dispatch.submit()` once the page count is known. Both kinds share the SAB: `sab-scheduler.mjs:allocDynamicSlots` reserves slots from the same pool, and `wireDynamicEdges` plus `appendDynamicSuccessors` extend the successor edges.

---

## Section 1 --- Seed tasks

The tasks that start the build. `config`, `buildInfo`, `scssLight` and `scssDark` have no predecessors and are claimable as soon as the build starts; `highlighterInit` waits for `config`, and `loadData` for `highlighterInit`.

### `config` (main)

```js
config.execute({}, ctx) → { config }
```

Reads `<srcRoot>/_config.yml`, applies the `ctx.opts.baseurl` and `ctx.opts.url` overrides, and returns the parsed object to `discover`.

### `buildInfo` (worker)

Handler in `cpu-worker.mjs`: calls `captureBuildInfo()` from `build-info.mjs`, which runs two parallel `git` commands (`rev-parse --short HEAD` and `log -1 --format=%cs`). Falls back to `"unknown"` on failure. The result goes to `state.site.buildInfo`.

### `scssLight` (worker), `scssDark` (worker)

Handlers call `compileLightScss(srcRoot)` and `compileDarkScss(srcRoot)`. Each compiles the vendored just-the-docs SCSS plus customisations against one palette. The CSS strings go to the `scss` task.

### `highlighterInit` (main)

```js
highlighterInit.expected = ["config"]
```

Calls `loadHighlightTheme()` from `highlight-theme.mjs`: loads `Light.theme` and `Dark.theme`, derives the palette, returns the generated `tb-highlight.css`. Does **not** initialise Shiki on main; each worker builds its own via `warmInit`.

### `loadData` (main)

```js
loadData.expected = ["highlighterInit"]
```

Calls `loadData(srcRoot)` from `data.mjs`. Writes `state.site.data` and `state.site.bookData`. It runs behind `highlighterInit` to avoid I/O contention.

---

## Section 2 --- Spine tasks

`discover` and the main-thread tasks fed by it, with `dot` (no predecessors) running on a worker beside them. They build the `site` object, derive auxiliary data and prepare the fan-out. `deriveSitemap` and `resolveBookChapters` wait for `dispatch`, in Section 3.

### `discover` (main)

```js
discover.expected = ["config"]
discover.execute({ config: { config } }, ctx) →
  { pages, staticFiles, config }
```

Calls `discover(srcRoot, config.exclude ?? [])` from `discover.mjs`, appends each `bundle_extra` entry to `staticFiles`, then runs `unpublishableSourceFiles` from `publish-policy.mjs` over the result and **throws** if anything is not a publishable type, before any write. `submit()` writes the three fields to `SharedState` and populates `state.pageByDest`.

### `vendorAssets` (main)

```js
vendorAssets.expected = ["discover"]
vendorAssets.execute() → { videos, images, files, fetched, failed }
```

Calls `vendorAssets(srcRoot, pages, { baseurl, allowFetch })` from `vendor-assets.mjs`. Scans the discovered markdown for YouTube video markers and GitHub user-attachment URLs, downloads anything not already committed into `docs/assets/thumbnails/` or `docs/assets/attachments/`, and passes the new files to the static-file copy pass. A file already present is never re-fetched. `submit()` puts the two lookup maps on `state.site` (`dispatch` passes them to the render workers), appends new descriptors to `state.staticFiles`, and sets exit code 1 (`EXIT_FOUND`) if any fetch failed.

`markdownInit` and `writeAssets` depend on this task: the render plugins need the maps to rewrite a marker into a local poster frame, and the copy pass needs the files.

> [!IMPORTANT]
> **CI never downloads.** `allowFetch` is `opts.fetchAssets ?? !process.env.CI`, and in offline mode a referenced-but-uncommitted asset **throws**. Otherwise an author who forgot to commit an image would get a green build while the published site still hotlinked a third party. A fetch *failure* on a development box only warns, keeps building and sets the exit code.

### `nav` (main)

```js
nav.expected = ["discover"]
nav.execute() → { sidebar }
```

Calls `computeNav(state.pages, state.site.config)` from `nav.mjs`, then `renderSidebar(state.site)` from `template.mjs`. The nav-integrity check runs inside `computeNav` and throws on orphan or ambiguous `parent:` declarations. Returns the sidebar HTML for `dispatch` to add to the shared payload.

### `dot` (worker)

Handler calls `regenerateDot(srcRoot)`. It finds `*.dot` files at any depth under `<srcRoot>` (skipping underscore-prefixed directories, which hold build output), compares mtimes against the `.svg` siblings, calls `Graphviz.load()` once, installs Inter's width table via `applyInterMetrics()`, then runs `gv.dot(src)` per stale source. Returns `dotStats` (`processed`, `regenerated`, `failed`, `setupSkipped?`, `svgFiles[]`); `submit()` appends the new SVG descriptors to `state.staticFiles`. Rendering takes under a millisecond per diagram after a one-time `Graphviz.load()` of about 50 ms.

### `buildInit` (main)

```js
buildInit.expected = ["discover"]
buildInit.execute() → { initData }
```

Calls `buildInitConfig(state.site)` from `template.mjs` to pre-render the config-only chrome (SVG sprites, header, search footer, favicon, GA). Runs in parallel with `nav`; `dispatch` merges the two outputs.

### `markdownInit` (main)

```js
markdownInit.expected = ["discover", "vendorAssets", "deriveRedirects", "packTests"]
```

Builds the link tables (`buildLinkTables(state.pages)`) and derives the `{{tbdocs:<name>}}` counts registry (`deriveCounts(state, { redirectStubs: stubs.length })` from `counts.mjs`), throwing if a page names a count that does not exist. The redirect-stub count is why `deriveRedirects` is a predecessor.

It also settles the downloads that `{{tbdocs:size:<site path>}}` and `{{tbdocs:packageTestRows}}` state (`deriveDownloads`, then `checkPlaceholders`, which throws on a path the build does not publish or cannot size). `packTests`, a task of its own that follows `config`, packs the contributed packages' test projects in memory so that their sizes are known; `packageTests` writes those same bytes. Only the sizes the pages ask for travel to the workers, as `state.site.downloads`.

It then instantiates the shared markdown-it (`createMarkdownIt({ highlighter: null, linkTables, baseurl, staticFiles, vendoredVideos, vendoredImages, counts })`), serializes the link tables (`serializeLinkTables(linkTables)`) for the workers, and computes site-level SEO (`computeSiteSeo(state.site.config, state.site.markdown)`). It writes `counts`, `markdown`, `linkTablesSerialized`, `seoSiteTitle` and `seoLogoUrl` to `state.site`. Per-page SEO is **not** computed here; each render worker does it via `computeChunkSeo`.

### `deriveRedirects` (main)

```js
deriveRedirects.expected = ["discover"]
deriveRedirects.execute() → { stubs }
```

A pure derivation via `deriveRedirectStubs(state.pages, state.site)` from `redirects.mjs`. The output feeds `markdownInit` (the stub count), `dispatch` (added to `sitePaths`) and `writeAux`.

### `deriveSitemap` (main, deferred)

```js
deriveSitemap.expected = ["dispatch"]
deriveSitemap.execute() → { urls }
```

`deriveSitemapUrls(state.pages, state.site)` from `sitemap.mjs`. It waits for `dispatch` so that it runs while the main thread would otherwise idle waiting for render workers.

### `resolveBookChapters` (main)

```js
resolveBookChapters.expected = ["deriveSitemap"]
```

Calls `resolveBookChapters(state.site.bookData, state.pages)` from `book.mjs`, which sets `bookData._chapters` to `Page[]` references. These must be the same `Page` objects `writePdf` sees after the render fan-out fills in `renderedContent`.

---

## Section 3 --- Render fan-out

`dispatch`, the fan-out point, and the N render tasks it starts, with their barrier, the per-worker init they need, and the two tasks that prepare the destination trees. The chart draws `warmInit` and `renderEnvInit` in the worker rows as start-up bars, not in a section; they are described here. The N flush tasks and their barrier are in Section 4.

### `dispatch` (main)

```js
dispatch.expected = [
  "nav", "buildInit", "buildInfo", "dot",
  "deriveRedirects", "markdownInit",
]
dispatch.execute() → { chunks, sharedSAB }
```

`execute`:

1. Slices `state.pages` into `workerCount × SLICES_PER_WORKER` chunks (one chunk per worker at most, for small page counts).
2. Computes the `sitePaths` set via `buildSitePathsSync` from `offline-rewrite.mjs`, using the vendored theme asset list from `enumerateVendoredThemeAssets()` rather than reading `_site/assets/`. The list also holds the path of the help add-in's project file when `_config.yml` declares one (`addinProjectOf`), since [`addinProject`](#addinproject-main) writes it only after the render.
3. Derives each output tree's inventory with `deriveTreeRels` and runs `unpublishableTreePaths` from `publish-policy.mjs` over it, **throwing** on anything that is not a publishable type. This sweep sees what `discover`'s cannot: redirect stubs, vendored theme assets, and the generated `sitemap.xml` and `search-data.json`. The inventory is shared with `checkTrees` below.
4. Builds the shared payload and packs it into one SAB via `packShared` from `sab-broadcast.mjs`: config, site-level SEO, pre-rendered chrome + sidebar, serialized link tables, static-file relative-path set, baseurl, site-paths array, offline-exclude patterns, skip-offline flag, build info, the inlined `svgContents`, the `vendoredVideos` / `vendoredImages` maps from `vendorAssets`, and `checkTrees` (per-tree `rels` + `baseurl`, or absent when `--check` is off).

`submit` allocates 2N dynamic SAB slots and writes their handler IDs. It wires `render:i → [renderJoin, flush:i]` and `flush:i → [flushJoin]`, sets the per-worker dependency `render:i → renderEnvInit`, and pins each `flush:i` to its `render:i`. It packs the per-chunk page data into a payload SAB, registers the `render:i` / `flush:i` task definitions on the scheduler (so `submit()` callbacks resolve), broadcasts the two SABs to every worker via `pool.broadcastDynamicData`, and activates the `render:i` slots.

### `prepDest` (main, deferred)

```js
prepDest.expected = ["dispatch"]
```

Cleans and recreates the trees the run writes: `<destRoot>`, and `<destRoot>-offline` and `<destRoot>-pdf` when their passes run. A build removes a sibling whose pass it skips (`--no-offline`, `--no-pdf`, or `also_build_offline` / `also_build_pdf` set to `false`) and does not recreate it, so no tree from an earlier build survives beside the new one and none is left empty. Serve mode skips both passes and owns `<destRoot>` alone, so it removes nothing beside it. `destinationTrees` in `write.mjs` makes that decision from the same `skipsOffline` and `skipsPdf` every other task asks. It runs after `dispatch` so the wipe does not contend with `discover`'s reads on small machines.

### `prepPageDirs` (main)

```js
prepPageDirs.expected = ["prepDest"]
```

Pre-creates every page output directory (online + offline), so `flush:i` can call `writeFile` without `mkdir`.

### `warmInit` (worker, `on_demand` + `unique_per_worker` + `run_when_idle` + `survives_reset`)

Per-lane Shiki bootstrap (`initHighlighter()` from `highlight.mjs`). The flags:

- `unique_per_worker`: every lane that runs a render task needs its own warmup.
- `on_demand`: keeps it off the auto-start list.
- `run_when_idle`: workers may run it speculatively during the main spine.
- `survives_reset`: keeps the per-lane done flag across serve-mode rebuilds, since the worker's module-scope Shiki state survives although the SAB is fresh.

### `renderEnvInit` (worker, `on_demand` + `unique_per_worker`)

```js
renderEnvInit.expected = ["dispatch"]
renderEnvInit.perWorkerDeps = ["warmInit"]
```

Per-lane render environment setup. Handler:

1. Waits for `_sharedSAB` to be set by the `dynamicData` message (`dispatch` broadcasts it before activating any `render:i`).
2. Unpacks the shared payload via `unpackShared(_sharedSAB)`.
3. Awaits `initHighlighter()`.
4. Rebuilds the link-table `Map`s from the serialized pair arrays, and the `svgContents`, `vendoredVideos` and `vendoredImages` `Map`s from their serialized objects.
5. Builds the worker's own markdown-it via `createMarkdownIt({...})`, passing those maps in. They let `figurePlugin`, `videoLinkPlugin` and `remoteImagePlugin` resolve a reference without touching the filesystem.
6. Builds the offline base state (site-paths set, normalised baseurl) when `!skipOffline`.
7. When `checkTrees` is set, imports `check.mjs` dynamically (`htmlparser2` costs ~23 ms, which a build without `--check` should not pay on every lane) and builds this lane's per-tree check environment (`root`, `tree`, `basePath`, and a `treeIndexFor` index per tree) into `_checkEnv`.
8. Stores the result in the worker's module-scope `_renderEnv`.

### `render:i` (worker, dynamic)

Handler (`render` in `cpu-worker.mjs`):

1. Reads the chunk JSON from `_payloadSAB` using `payloadOffset[taskIdx]` / `payloadLength[taskIdx]`.
2. `await renderPhase(chunk, env.site)` --- markdown-it body render.
3. `computeChunkSeo(chunk, env.site.seoSiteTitle, env.site.config, env.site.markdown)` --- per-page SEO fields.
4. `await templatePhase(chunk, env.site, env.initData)` --- just-the-docs layout wrap.
5. When `env.offlineBase` is set: for each writable page, call `withPartialNav` to cut the page's nav down to its part of the tree, then `deriveOfflinePage`.
6. Store `{ destPath, html, offlineHtml, offlineMisses }` on the worker's `_pendingFlush` FIFO for the matching `flush:i`.
7. `deriveSearchEntries(chunk, env.site)` --- per-section search entries, with any [index entries](Authoring#index-entries-for-the-site-search) the page's frontmatter or headings name. Remove `sourcePage` and the chunk-local `i` before returning (main assigns global indices).

Returns `{ pages, searchEntries }`. The `submit()` callback (registered by `dispatch.submit`) merges `renderedContent` / `offlineMisses` into the master `Page` objects via `state.pageByDest`, and writes `searchEntries` into `state.searchChunks[i]`.

### `renderJoin` (main, `on_demand`)

```js
renderJoin.expected = []                       // in the static TASKS table…
// …replaced by dispatch.submit via registerBarrier():
renderJoin.expected = ["render:0", …, "render:N-1"]   // and depCount set to N
renderJoin.execute() → {}
```

Barrier over every `render:i`. Unblocks `searchData`, `symbolIndex` and `writePdf`.

> [!IMPORTANT]
> **A dependency count of zero does not mean the submits have run**, so the `expected`
> list is required. A worker posts its result and *then* decrements its successors'
> counts in shared memory, so the count can reach zero while results are still queued
> and the `submit()` calls that merge them into `state.pages` have not run.
> `registerBarrier` (`tbdocs.mjs`) therefore rewrites this task's `expected` with every
> chunk name before the fan-out starts: `_assembleInputs` releases a task back to READY
> if any `expected` name has no result yet, and that list is the only thing the
> scheduler checks.
>
> Without it, `renderJoin` silently dropped ~6 pages from `search-data.json` on about
> one build in three. Its `execute()` now asserts that every page has `renderedContent`.
> **A dynamic barrier must list every chunk task in `expected`, even when its own
> `execute()` ignores the inputs.** See
> [PLAN-sab-pull-scheduler.md](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-sab-pull-scheduler.md).

---

## Section 4 --- Write and post-write

The tasks that write the output. `scss` joins the two stylesheets after `prepDest`; each `flush:i` writes its chunk's pages after its `render:i` and `prepPageDirs`; the main-thread writers produce the rest, all but `writeAssets` behind `renderJoin` or `flushJoin`.

### `scss` (main)

```js
scss.expected = ["scssLight", "scssDark", "prepDest"]
```

Joins the two CSS strings and writes `assets/css/just-the-docs-combined.css` to both `_site/` and `_site-offline/` (the offline copy gets the page-relative URL rewrite via `deriveOfflineCss`). It waits for `prepDest` so the destination directories exist.

### `flush:i` (worker, dynamic, `pin_to_predecessor`)

```js
flush:i.expected = ["render:i"]    // depCount: 2 — render:i + prepPageDirs
flush:i.pinnedTo = render:i        // F_PIN_TO_PRED
```

Handler (`flush` in `cpu-worker.mjs`): pops the next batch from `_pendingFlush` and writes each page's `.html` to `<destRoot>/p.destPath` and (when `offlineHtml !== undefined`) `<destRoot>-offline/p.destPath`. Concurrency is bounded at 64. The pinning guarantees the FIFO drain happens on the right lane.

When `--check` is on, the **link and integrity check runs here**, after the writes: `runChunkCheck(items)` checks this chunk's final HTML for every tree it was written to, and the result is returned with the write stats as `{ written, offlineWritten, offlineMisses, check }`. `submit` appends `check` to `state.checkChunks` with an unindexed `push`, so the array holds chunks in arrival order.

This differs from `render:i.submit`'s indexed `state.searchChunks[i]` write, and the two are not interchangeable. Findings are merged per tree, so nothing downstream indexes by lane. The append also gives `checkChunks.length` its meaning: [`linkJoin`](#linkjoin-main) asserts completeness by comparing it with `checkChunkCount`, which a pre-allocated array would defeat.

The check runs here because both trees' final strings are already in worker memory; a standalone pass would write ~270 MB out only to read it back and re-parse it. The check cannot abort the build, so a chunk that throws returns `{ error }` and [`checkReport`](#checkreport-main-terminal) decides what to do with it.

### `flushJoin` (main, `on_demand`)

```js
flushJoin.expected = []    // populated by dispatch.submit with ["flush:0", ..., "flush:N-1"]
flushJoin.execute(inputs) → { written, offlineWritten, offlineMisses }
```

Aggregates per-chunk write stats. Unblocks `writeAux`, `writePdf` and `linkJoin`.

### `writeAssets` (main)

```js
writeAssets.expected = ["dot", "vendorAssets", "prepPageDirs", "highlighterInit"]
```

Calls `writePhase(state.pages, state.staticFiles, { destRoot, dryRun, generatedAssets, baseurl, skipPages: true })` from `write.mjs`. Copies vendored theme JS and project static files, and writes generated CSS (`tb-highlight.css` from `state.site.highlightCss`). **Does not** write page HTML; the `flush:i` tasks do. The CSS baseurl rewrite (`url("/path")` → `url("<baseurl>/path")`) applies to copied files and generated assets.

### `searchData` (main)

```js
searchData.expected = ["renderJoin", "prepDest", "symbolIndex"]
```

Calls `writeSearchDataFromChunks(state.searchChunks, destRoot, symbolIndex.symbols)` from `search.mjs`. It flattens the per-chunk entry arrays and joins `symbolIndex`'s symbols onto the matching entries by URL (`joinSymbolsToEntries`, adding the `names` / `qualified` / `primary` fields -- see `WIP.Search.md`'s "Design" §2). It then renumbers the global `i` index, checks that no index term is the main entry (`index`) of two entries (`checkIndexTerms`, which throws naming them), and writes `assets/js/search-data.json`. Returns `{ entries, json }`. The workers did the heavy work (heading split, content sanitisation, URL encoding); this task only joins and concatenates. It depends on `symbolIndex` for the `symbols` array.

### `symbolIndex` (main)

```js
symbolIndex.expected = ["renderJoin", "prepDest"]
symbolIndex.execute() → { entries, urls, gaps, unplaced, symbols }
```

Writes `tB/symbols.json`, the [symbol index](Building#the-symbol-index). Reads `builder/package-api.json` (the build fails, naming `node indexer/twin-index.mjs derive`, if it is missing), then calls `symbolPages(state.pages)`, `deriveSymbolIndex({ pages, api })` and `serializeSymbolIndex(...)` from `symbols.mjs`. It depends on `renderJoin` because an entry's anchor is the id the render gave its heading, read from `renderedContent`. Takes ~50 ms. With `--symbol-gaps <path>` it also writes `reportableGaps(...)` there as JSON.

The result fields:

- `urls`: every distinct URL in the index. `runBuild` passes it to `checkSymbolBaseline` from `symbol-baseline.mjs` after the check report, beside the page-count guard.
- `unplaced`: the package pages that gave no entry; the summary prints them.
- `symbols`: the array `deriveSymbolIndex` returned, each `{ name, container, url, ... }`. Only `searchData` uses it.
- `json`: the text of `tB/symbols.json`. `runBuild` passes it to `syncAddinIndex` from `addin-index.mjs` for the help add-in's copy, and `addinProject` packs it into the add-in's project file.

`checkReport` waits for this task, since `tB/symbols.json` is in the online tree's index and `--check-audit-index` must not look for it early.

### `addinProject` (main)

```js
addinProject.expected = ["symbolIndex", "prepDest"]
addinProject.execute({ symbolIndex }) → { rel, bytes, files, untracked, roots, ms } | { failed, rel, error } | null
```

Writes the help add-in's project file, the download [Help Add-In](../../tB/IDE/AddIns/Help) offers (see [Build and Generation Tools](Tools-Build#the-help-add-ins-project-file)). Reads `addin_project` from the config with `addinProjectOf`, and returns `null` when the config declares none or under `--dry-run`. Otherwise calls `writeAddinProject` from `addin-project.mjs` with the add-in's folder (`src`, resolved against the source root), `symbolIndex.json` and the trees to write: the online tree, and the offline tree unless the build has none or `offline_exclude` leaves the file out of it. `dispatch` has already put `dest` in both trees' indexes and in `sitePaths`, so links to the file resolve. `checkReport` waits for this task. A failure (`git` missing, an unreadable file) is returned, not thrown, so the trees are still written; `runBuild` prints the result and fails the build on `failed`. Takes ~100 ms.

### `writeAux` (main)

```js
writeAux.expected = ["writeAssets", "searchData", "flushJoin", "deriveRedirects", "deriveSitemap"]
```

In parallel:

- `writeRedirects(state.pages, state.site, destRoot, stubs)` from `redirects.mjs` --- one HTML stub per `redirect_from:` entry, each with `<script>location=…</script>`, `<meta http-equiv="refresh">`, `<link rel="canonical">` and a noscript `<a>` fallback.
- `writeSitemap(state.pages, state.site, destRoot, urls)` from `sitemap.mjs` --- `sitemap.xml` and `robots.txt` with a `Sitemap:` reference.

Returns `{ redirectStats, sitemapStats, searchStats }` (the search stats come from the `searchData` input).

### `writeOffline` (main)

```js
writeOffline.expected = ["writeAux", "writeAssets"]
```

Calls `writeOffline(state.staticFiles, state.site, destRoot, { auxStats, sitePaths, profileOffline })` from `offline.mjs`. `render:i` / `flush:i` have already rewritten and written the per-page HTML. This task does the rest: CSS `url()` rewriting, the `just-the-docs.js` AST patch (`deriveOfflineJtdJs`), the `search-data.js` wrapper (`deriveOfflineSearchDataJs`), the offline `nav.js` (the whole nav tree with its links relative to the site's root), theme assets and redirect stubs. `sitePaths` comes from `state.sitePaths`.

### `writePdf` (main)

```js
writePdf.expected = ["flushJoin", "renderJoin", "dot", "resolveBookChapters"]
```

Calls `writePdf(state.pages, state.staticFiles, state.site, destRoot, { tolerateMissingImages, highlightCss })` from `pdf.mjs`. It calls `assembleBook(site, pages)` from `book.mjs` for the `book.html` string, writes `tb-highlight.css`, copies `print.css` via the `staticFiles` inventory, and copies every image referenced in `book.html`. Missing images throw; `--tolerate-missing-images` downgrades that to a warning. It also runs `bookCoverage` and returns its `formatBookCoverage` lines as `coverage`, which the build prints under a `book:` heading --- warnings about pages `_book.yml` does not mention, never a failure.

`renderJoin` is listed although `execute()` ignores it: `expected` says what must have *merged*, and the book is assembled from `page.renderedContent`.

---

## Section 5 --- Check and report

Three main-thread tasks that run only when `--check` is on. The per-chunk findings came back with each `flush:i`, so these tasks join, audit and report without parsing anything again.

Two invariants hold for all three. **A failing check never aborts the build**: failures are returned as data and become an exit code at the end. And **a check that examined less than the whole site is reported as a failure**: a short chunk list, a missing per-tree result or an errored chunk is never skipped silently.

### `linkJoin` (main)

```js
linkJoin.expected = ["flushJoin", "writeAux", "writeOffline"]
linkJoin.execute() → { [tree]: joinedResult } | null
```

Joins the per-chunk findings into one result per tree. Returns `null` immediately when `state.checkTrees` is unset, which is how a `--no-check` build skips the section.

Four things happen here that a worker cannot do:

- **Redirect stubs are checked.** They never go through `flush` (`writeRedirects` and `writeOfflineRedirects` emit them), so they are checked here as one extra chunk per tree. {{tbdocs:redirectStubs}} tiny files.
- **The generators' opt-out predicates are applied.** The cross-file checks enforce "every page the generator was asked to emit", so they need `sitemapIncludes` and `searchIncludes`. Otherwise a page with `sitemap: false` or `search_exclude: true` would fail the build.
- **Chunk completeness is asserted.** A count mismatch against `state.checkChunkCount` becomes an error on every tree. A chunk with no entry for a tree is named, since every lane builds the same tree keys.
- **`book-combined` pages are excluded** from the page list; `writePdf` owns them and `checkBook` covers them.

### `checkBook` (main)

```js
checkBook.expected = ["writePdf"]
checkBook.execute({ writePdf }) → joinedResult | null
```

Checks `_site-pdf/book.html` as a one-document chunk against a tree index built from the sparse PDF tree. **Informational**: the book's cross-page links legitimately do not resolve within that tree, so its findings are printed but do not set the exit code. The `_site` pass enforces every page the book contains.

### `checkReport` (main, terminal)

```js
checkReport.expected = ["linkJoin", "checkBook", "scss", "symbolIndex", "addinProject"]
checkReport.execute({ linkJoin, checkBook }) → void
```

Formats every tree's result, decides the exit code, and optionally writes the machine-readable findings.

- **Exit code** follows `check_links.mjs`: `1` when the check found a link or an integrity failure; the summary lines say which. Set through `failBuild`, which marks the build failed in `process.exitCode` and never throws.
- **`--check-findings <path>`** writes the findings as JSON for [`check_links_diff.mjs`](Tools-Site-Checks#check-links-diff) to diff against the standalone script's. It is written *before* the exit code is decided, so a failing check still produces the file.
- **`--check-audit-index`** also diffs the tree index the build derived from its own records against what landed on disk. It catches a *spurious* index entry, which makes the checker treat a path as existing when it 404s in production; the findings comparison cannot see this. Cost is one `readdir` per tree.

`scss`, `symbolIndex` and `addinProject` are in `expected` because their output files are in the tree index from the moment `dispatch` builds it, and `--check-audit-index` reads the tree off disk. Without the edge, the audit can run first and report a file as "indexed but not on disk" on a small fixture.

---

## Module export tables

The same modules as above, with the exports of each file.

### `check.mjs`

The link and integrity check over rendered pages, which the standalone [`scripts/check_links.mjs`](Tools-Site-Checks#check-links) also runs, over a tree it reads from disk. The build imports it dynamically --- on the workers in `renderEnvInit`, on main in `linkJoin` / `checkBook` / `checkReport` --- because `htmlparser2` costs ~23 ms to import and a build without `--check` should not pay it on sixteen lanes.

| Symbol | Signature | Description |
|---|---|---|
| `TREES` | `object` | Per-tree configuration: `suffix`, `label`, the `checkOpts` that tree enables, and its `forbid` prefixes. `online` and `offline` always set `checkRemoteAssets: true`. |
| `FALLBACK_EXTS` | `string[]` | Extensions appended when a target does not exist as-is (`["html"]`, mirroring Pages' extensionless URLs). |
| `INDEX_FILES` | `string[]` | Filenames tried when a URL resolves to a directory. |
| `checkChunk` | `(docs, env) → chunkResult` | Checks one chunk of `{ destPath, html }` against one tree. Runs inside `flush:i`; `check_links.mjs` runs it once over a whole tree. |
| `joinChunks` | `(chunks, opts) → treeResult` | Merges per-chunk results into one per-tree result, settling cross-chunk fragment references. |
| `formatReport` | `(r) → { text, linksFailed, integrityFailed }` | Human-readable report plus the two booleans `checkReport` turns into an exit code. |
| `findingsFor` | `(r) → object` | The machine-readable view, written by `--check-findings` and returned by `check_links.mjs`'s structured mode for `check_links_diff.mjs`. |
| `treeIndexFor` | `(root, rels) → treeIndex` | Builds the existence oracle a tree is checked against, from the build's own records rather than a `readdir`. |
| `auditIndex` | `(root, rels) → Promise<{ missing, spurious }>` | Diffs that derived index against what is on disk. `--check-audit-index` only. |
| `deriveTreeRels` | re-exported from `check-tree.mjs` | --- |
| `normalizeBasePath` | re-exported from `link-check.mjs` | --- |

### `check-tree.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `deriveTreeRels` | `(which, …) → string[]` | Every relative path the build believes it emitted into a given tree: pages, redirect stubs, auxiliaries, static files, theme assets, generated DOT SVGs, minus offline exclusions. The check's oracle uses it instead of the filesystem; `auditIndex` verifies it. |
| `posix` | `(p) → string` | Backslash-to-slash path normalisation. |

### `link-check.mjs`

The pure core shared by the build's check and the standalone [`scripts/check_links.mjs`](Tools-Site-Checks#check-links). It does no filesystem traversal and has no CLI: it takes HTML and an oracle and returns findings. **The two front ends read the tree differently, and a checker that silently checks less reports a clean pass, so run [`check_links_diff.mjs`](Tools-Site-Checks#check-links-diff) whenever this file, `check.mjs` or `check_links.mjs` changes.**

| Symbol | Signature | Description |
|---|---|---|
| `extractFromHtml` | `(html, captureIds, forbidPrefixes, checkOpts) → occurrences` | One SAX pass that yields link occurrences, ids, canonical URLs and every integrity finding. `captureIds` takes ids from *every* element, so anchor icons and the section-links disclosure are checked against post-dedup ids. |
| `resolve` | `(href, sourceDir, sourcePath, rootStr, basePath) → target` | URL-to-filesystem-path resolution, including base-path stripping. |
| `checkPath` | `(target, isDirLink, fallbackExts, indexFiles, oracle) → verdict` | Existence check for one resolved target. |
| `resolveOccurrences` | `(occurrences, oracle, …) → { broken, pendingFragments }` | Deduped resolution of a chunk's occurrences. Each unique `(target, fragment)` is checked once, however many pages link to it. |
| `settleFragments` | `(pendingFragments, idsByTarget) → broken[]` | Settles the fragment references a chunked run could not decide locally, making per-chunk checking equivalent to a whole-tree pass. |
| `buildTreeIndex` | `(rootStr, relFiles) → treeIndex` | Index built from a known file list. |
| `FsOracle` / `IndexOracle` | `() → oracle` | The two existence backends: real `stat` calls, or the derived index. |
| `checkSitemap` | `(xml, relFiles, basePath, optOut) → findings` | Every page the generator was asked to emit is present. `optOut` carries `sitemapIncludes`'s verdict. |
| `checkSearch` | `(searchData, relFiles, basePath, optOut) → findings` | Same, for the search index; `optOut` carries `searchIncludes`'s verdict. |
| `checkCanonical` | `(canonicalByRel, basePath) → findings` | Each page's canonical URL matches its location. |
| `deriveUrlPath`, `normalizeBasePath`, `stripBasePath`, `isOutsideBasePath` | --- | Path helpers. `OUTSIDE_BASEPATH_MARKER` tags a target that resolved outside the configured base path. |
| `formatLinkReport`, `formatIntegrityReport` | `(…) → string` | Report rendering, shared by both front ends. |

### `vendor-assets.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `vendorAssets` | `(srcRoot, pages, { baseurl, allowFetch }) → Promise<{ videos, images, files, fetched, failed }>` | The `vendorAssets` task body. With `allowFetch: false` a referenced-but-uncommitted asset throws rather than fetching. |
| `scanSources` | `(pages) → { videos, images }` | Finds YouTube markers and user-attachment URLs in the discovered markdown. |
| `THUMB_DIR_REL` / `ATTACH_DIR_REL` | `string` | `assets/thumbnails` / `assets/attachments`. |

### `dot-metrics.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `applyInterMetrics` | `(graphviz) → void` | Overwrites the Times family's four width arrays in the Graphviz WASM module's memory with Inter's advances from `builder/inter-metrics.json`, so `fontname="Inter"` is measured with Inter's metrics. Idempotent: it keeps a `WeakSet` of patched instances and re-verifies instead of re-writing, because `Graphviz.load()` memoises its module and serve mode reuses the instance on every rebuild. It finds the table by an exact signature match against the published Times AFM widths and verifies the patch by laying out a real string. On failure `regenerateDot` emits nothing and flips the exit code, since a stale but correct SVG beats a freshly wrong one. |
| `DotMetricsError` | `class` | Thrown when the table cannot be located or the patch cannot be verified --- the expected symptom of an `@hpcc-js/wasm-graphviz` bump that moves it. |

### `discover.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `discover` | `(srcRoot, ignore) → Promise<{ pages, staticFiles }>` | Traverses the source tree, classifies pages vs static files, returns the two sorted arrays. |

### `publish-policy.mjs`

The allowlist of file types that may reach a published tree. Every non-page under `docs/` is copied into the output verbatim, so `_config.yml`'s `exclude:` only refuses what somebody named in advance; this names what may ship. It is enforced at two points --- `discover` over the static-file inventory, `dispatch` over each tree's derived inventory --- and a finding **aborts** the build. `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are disjoint: the build emits `.xml` and `.json`, but a stray `docs/secrets.json` must still fail. `.md` is in neither, so a page whose frontmatter did not parse is refused instead of served as raw markdown.

| Symbol | Signature | Description |
|---|---|---|
| `SOURCE_EXTENSIONS` | `Set<string>` | Extensions a file discovered under `docs/` may carry. |
| `BUILD_EXTENSIONS` | `Set<string>` | Extensions the build itself emits, additionally allowed in a tree inventory. |
| `EXTENSIONLESS_FILENAMES` | `Set<string>` | Exact basenames allowed with no extension (`CNAME`). |
| `publishPolicyFor` | `(config) → { declared, generated }` | Reads `bundle_extra` into `declared`, the set of individually declared published paths, which are exempt by path rather than by extension on both surfaces; and `addin_project`'s `dest` into `generated`, a path the build writes itself, exempt on the tree surface only. |
| `unpublishableSourceFiles` | `(staticFiles, policy) → findings[]` | Source sweep. Each finding has `rel`, `from` (the path on disk) and `why`. |
| `unpublishableTreePaths` | `(rels, policy) → findings[]` | Tree sweep over a `deriveTreeRels` inventory. |
| `formatPublishRefusal` | `(findings, { surface, label }) → string` | The abort message: every finding named, plus the fix appropriate to the surface. |

### `nav.mjs`

Runs two build-aborting integrity checks before building the tree: `validatePermalinks` (every page declares its own URL) and `validateNavIntegrity` (every `parent:` resolves to exactly one page). Both failures would otherwise be silent: a page at a URL nobody chose, or a page missing from the sidebar.

| Symbol | Signature | Description |
|---|---|---|
| `computeNav` | `(pages, config) → { navTree }` | Builds the sidebar tree, runs the integrity check (throws on orphan / ambiguous `parent:`), populates `navPath` / `navLevels` / `breadcrumbs` / `children` on each page. |
| `isNonEmpty` | `(value) → boolean` | `false` for `null` / `undefined` or the empty string, `true` for anything else. Imported by `seo.mjs`. |

### `seo.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `computeSiteSeo` | `(config, markdown) → { seoSiteTitle, seoLogoUrl }` | Site-level SEO constants. Called by `markdownInit` on main; needs a built markdown-it instance. |
| `computeChunkSeo` | `(pages, seoSiteTitle, config, markdown) → void` | Per-page SEO (`seoTitle` / `seoFullTitle` / `seoCanonical` / `seoIsHome`), set in place. Called by each render worker between `renderPhase` and `templatePhase`. |
| `renderTitle` | `(text, markdown) → string` | Runs one title through `markdownify → strip_html → normalize_whitespace → escape_once`. |
| `stripHtml` | `(s) → string` | Drops `<script>` / `<style>` / HTML comments, then strips remaining tag delimiters. Re-exported for `search.mjs`. |

### `url.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `absoluteUrl` | `(url, config) → string` | The URL a path has on the deployed site: `config.url`, the normalised `config.baseurl`, then the path, read from the site root whether or not it starts with `/`. An absolute URL (a scheme, or a network-path reference `//host`) is returned unchanged; with no `config.url`, the root-relative path is. A non-string gives `""`. Used by `seo.mjs` for canonicals and the logo, `redirects.mjs`, `sitemap.mjs`, and `template.mjs` for external nav links. |
| `relativeUrl` | `(url, baseurl) → string` | Puts `baseurl`, as given, in front of a root-relative path and encodes its spaces. Anything else (an absolute URL, a relative path, a bare fragment) is returned unchanged, and a non-string gives `""`. Used by `template.mjs` for links and asset references. |
| `normalizeBaseurl` | `(raw) → string` | A base URL as `""` or `/prefix`: a leading slash added if missing, trailing slashes removed. |
| `encodeSpaces` | `(s) → string` | Each space as `%20`, the only character in this site's paths that needs encoding. `search.mjs`'s entry URLs. |
| `splitFragment` | `(href) → [string, string \| null]` | Splits at the first `#`. `render.mjs`'s link rewrite, and `scripts/crawl_check.mjs`. |

### `escape.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `escapeMarkup` | `(s) → string` | Escapes `&`, `<` and `>` and leaves quotes literal, as Rouge and kramdown's code spans do. Used for code blocks and code spans (`highlight.mjs`, `render.mjs`), table-of-contents entries, and the Gantt chart's labels. |
| `escapeMarkupAndQuotes` | `(s) → string` | Escapes `&`, `<`, `>`, `"` and `'`, so the result is safe in an attribute value under either quote. Used by `template.mjs` (attributes and text), `render.mjs` (diagram and video markup) and `sitemap.mjs` (URLs). |
| `escapeRegExp` | `(s) → string` | Escapes every character a RegExp reads as an operator, so the result matches `s` literally. Used by `render.mjs`, `book.mjs` and `offline-rewrite.mjs`; `scripts/lib/regex-fold.mjs` recognises its shape. |

Both HTML escapers convert a value that is not a string with `String` first.

### `code-guard.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `CODE_OR_PRE` | `RegExp` | Matches a whole `<code>` or `<pre>` element. A pattern that rewrites rendered HTML starts with it as a leading alternative, so the rest of the pattern never matches inside code. Used by `offline-rewrite.mjs`'s `HTML_COMBINED_RE`, `book.mjs`'s image-path collector and `counts.mjs`'s surviving-placeholder check. |
| `replaceOutsideCode` | `(html, pattern, replacer) → string` | `html` with every match of `pattern` outside `<code>` and `<pre>` replaced by `replacer`, called as `String.prototype.replace` calls it. The guard takes `pattern`'s flags, so under `i` it also skips `<PRE>`. Used by `book.mjs`'s chapter transforms and link rewrite, `render.mjs`'s `applyPostRenderRewrites` and `template.mjs`'s `injectAnchorHeadings`. |

### `book.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `resolveBookChapters` | `(bookData, pages) → void` | Resolves `_book.yml` chapter selectors to `Page[]` references; sets `_chapters` / `_landing` / `_foreword` in place. |
| `sortByNavOrder` | `(input) → Page[]` | Group-by-owning-index sort: index pages first, then by `nav_order` ascending with title tie-breaker. |
| `chapterAnchorFromUrl` | `(url, fallbackTitle?) → string` | Page URL → `ch-…` anchor slug. |
| `bookChapterTransform` | `(body, baseurl, headingShiftN, chapterAnchor) → string` | The per-chapter body transforms: a picture in two themes reduced to its light one, baseurl-strip, `<details>` unwrap, table-wrapper strip, whitespace-`<span>` wrap for pagedjs, heading shift, chapter-anchor prefixing, and each line of a code block put in a `<span class="code-line">` of its own, so that paged.js breaks code between lines. |
| `assembleBook` | `(site, pages) → string` | Phase 8 entry. Returns the assembled `book.html` string. |
| `rewriteBookHrefs` | `(html, site, pages) → string` | Rewrites a link to a page in the book to that page's `href="#ch-X"` anchor, and a link to any other site page to its absolute URL under `site.config.url` (a site path is dead in a PDF). |
| `bookCoverage` | `(bookData, pages) → { unlisted, both, emptyEntries, emptyLeftOut, missingUrls }` | Runs after `resolveBookChapters`. Reports pages in no book entry and no `left_out:` entry, pages in both, entries that match no page, and landing or foreword URLs that name no page. Every list is empty on a consistent manifest. |
| `formatBookCoverage` | `(coverage) → string[]` | The `book:` warning lines for a `bookCoverage` result; `[]` when there is nothing to report. |

### `build-info.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `captureBuildInfo` | `() → Promise<{ commit, commitDate }>` | Runs two parallel `git` commands. Returns `"unknown"` on failure. |

### `data.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `loadData` | `(srcRoot) → Promise<object>` | Returns `{ book: <parsed YAML> }`, or `{}` when `_book.yml` is absent. |

### `dot.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `regenerateDot` | `(srcRoot) → Promise<{ processed, regenerated, failed, setupSkipped?, svgFiles }>` | Regenerates stale `.dot` → `.svg` via the WASM build of Graphviz (`@hpcc-js/wasm-graphviz`). `svgFiles` is the appendable static-file descriptor list. |
| `listDotSources` | `(srcRoot) → Promise<string[]>` | Every `.dot` under `srcRoot` at any depth, sorted, each path joined onto `srcRoot`, skipping entries whose names start with `_` or `.`. `scripts/check_dot_fit.mjs` uses it to find diagrams. |

### `scss.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `compileLightScss` | `(srcRoot) → Promise<{ css? , failed? }>` | Compiles the SCSS entry against the light palette. |
| `compileDarkScss` | `(srcRoot) → Promise<{ css? , failed? }>` | Compiles against the dark palette. Run in parallel with `compileLightScss`. |

### `render.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `renderPhase` | `(pages, site, staticFiles?) → Promise<void>` | Renders each page's `rawContent` to `renderedContent` via the supplied site's markdown-it. Skips `layout: book-combined`. |
| `applyPreRenderRewrites` | `(rawContent, md) → string` | The pre-render source rewrite chain the render stage applies to each page before parsing: normalises line endings to LF, masks code with `maskCode` from `lib/markdown.mjs` using the site's markdown-it instance `md`, runs the four kramdown-parity rewrites, restores the code, then runs `rewriteAdmonitions` with the same instance. Throws a `TypeError` when `md` is omitted. Exported so `check_code_regions.mjs` and `check_examples.mjs` test the real chain. |
| `applyPostRenderRewrites` | `(html) → string` | The rewrites over a page's rendered HTML after parsing: `normaliseVoidTags` writes each void tag self-closed and in lower case (`<BR>` becomes `<br />`), then `padEmptyCells` puts a no-break space in each empty table cell. Both go through `replaceOutsideCode`. Exported for `scripts/check_code_regions.mjs`. |
| `createMarkdownIt` | `({ highlighter, linkTables, baseurl, staticFiles, svgContents?, vendoredVideos?, vendoredImages?, counts? }) → MarkdownIt` | Builds the configured markdown-it instance: the twenty plugins tabulated below, in their fixed order, plus eight renderer-rule overrides. `svgContents` is a `Map<srcRel, string>` of pre-read SVG file contents; when present, `figurePlugin` replaces a diagram (a lone `.svg` image) with a figure holding the inline SVG. `vendoredVideos` and `vendoredImages` are the maps `videoLinkPlugin` and `remoteImagePlugin` resolve against, and `counts` is the registry `countPlugin` substitutes from. See [Extending](Extending#adding-a-markdown-it-plugin) for how to add a plugin. |
| `initHighlighter` | (re-export from `highlight.mjs`) | `() → Promise<object>`. Initialises Shiki with the bundled twinBASIC grammar. |
| `buildLinkTables` | `(pages) → { byPath, byUrl, byRedirect }` | Map lookups keyed by `srcRel`, `permalink`, and `redirect_from` entries. |
| `serializeLinkTables` | `(lt) → { byPath, byUrl, byRedirect }` | Serializes the Maps to `[key, permalink]` pair arrays for structured-clone transfer to workers. |
| `rewriteAdmonitions` | `(src, md) → string` | GFM admonition rewrite to the `markdown-alert markdown-alert-<type>` class structure with the five SVG octicons. Leaves an admonition alone when its `[!TYPE]` line is inside a region that `blockRegions` from `lib/markdown.mjs` reports with the site's markdown-it instance `md`; a fence inside an admonition is part of its body. Throws a `TypeError` when `md` is omitted. |
#### The plugin chain

`createMarkdownIt` applies twenty plugins in a fixed order: three from npm, sixteen defined in `render.mjs`, and `countPlugin` from `counts.mjs`. Most of the in-tree ones close a behavioural gap between markdown-it and kramdown, which rendered this content under Jekyll. The site's ~870 pages were authored against kramdown's dialect, so matching it is a requirement.

The table lists the plugin chain only. The renderer rules `createMarkdownIt` replaces directly, among them the one that wraps every table, are under [Renderer overrides](#renderer-overrides).

| # | Plugin | Source | What it does |
|---:|---|---|---|
| 1 | `markdown-it-attrs` | npm | kramdown's `{: … }` attribute syntax. Delimiters are overridden to `{:` / `}` so a bare `{` is not an attribute block. |
| 2 | `standaloneIalForwardPlugin` | in-tree | A block IAL occupying a whole paragraph attaches to the **following** block, as kramdown does, not to the paragraph itself. |
| 3 | `tightLooseListPlugin` | in-tree | kramdown decides list tightness **per item**; markdown-it decides it per list. Unwraps the `<p>` markdown-it adds to an item that holds only inline content plus a nested list. |
| 4 | `markdown-it-deflist` | npm | Definition lists --- the `term` + `: definition` shape every parameter list in the reference uses. |
| 5 | `looseDeflistPlugin` | in-tree | The same per-item tightness rule applied to `<dd>`. |
| 6 | `markdown-it-footnote` | npm | Footnotes. `configureFootnotes(md)` then overrides five renderer rules to match kramdown's markup. |
| 7 | `headerIdPlugin` | in-tree | kramdown-compatible heading ids via `kramdownSlug`: lowercase, keep only characters in `\p{L}\p{N}\p{M}\p{Pc}`, hyphens and spaces, then replace each space with `-`; an empty result becomes `section`. A repeated id on the same page gets `-1`, `-2`, … appended. |
| 8 | `searchIndexMarksPlugin` | in-tree | Moves a heading's `{: index="..." }` and `{: index_also="..." }` into `env.searchIndexMarks`, so they never reach the HTML; `search.mjs` attaches them to the search entry holding that heading. Runs `after("header-id")` because it records the heading's id. On any other element the attribute fails the build. |
| 9 | `headingLevelNormalizePlugin` | in-tree | Repairs the legacy "h1 straight to h3" style. On a page with `h1` and `h3` headings but no `h2` (a raw HTML `<h2>` counts), it renumbers each markdown heading to one level deeper than its parent heading: `h1`, `h3`, `h5` become `h1`, `h2`, `h3`. A page that already uses `h2` is untouched. Inserted `before("header-id")`, so ids are slugged from the corrected levels. |
| 10 | `tocPlugin` | in-tree | The `* TOC` + `{:toc}` marker becomes a nested `<ul id="markdown-toc">`. Runs `after("header-id")` because it links to the ids that rule assigned. |
| 11 | `relativeLinksPlugin` | in-tree | Resolves every relative and root-absolute `href` / `src` against the link tables, so a link written as a file path ends up at the target page's canonical permalink. Static assets resolve to root-absolute paths. |
| 12 | `themePairPlugin` | in-tree | A picture in two themes: an image or a link naming `X.png`, with `X.light.png` beside it among the static files, becomes two, the light one first, classed `pic-light` and `pic-dark` for the stylesheet to show one per theme, both `loading="lazy"`. Each names its theme's SVG (`X.svg`, `X.light.svg`) in place of the PNG where there is one, unless the attribute block says `png`. A page that names a light picture itself fails the build. Runs after `relativeLinksPlugin`, since it matches the root-absolute paths that plugin wrote; the book keeps the light picture alone (`lightOnly`, `theme-pictures.mjs`). |
| 13 | `blockHtmlRecursionPlugin` | in-tree | Four rules over raw HTML: strip `markdown="1"`, tag admonition fences, wrap standalone inline HTML, normalise block HTML. |
| 14 | `kramdownDashesPlugin` | in-tree | Three typographer repairs: `--` → en-dash and `---` → em-dash even when whitespace is adjacent (markdown-it requires a word on both sides), plus possessive and quote-near-emphasis fixes. Code spans and fences are separate token types and are untouched. |
| 15 | `kramdownEllipsisPlugin` | in-tree | markdown-it collapses any run of 2+ dots to one ellipsis; kramdown converts exactly three and leaves the rest. Restores the dropped dots. |
| 16 | `flattenAdjacentStrongPlugin` | in-tree | kramdown pairs adjacent `**` markers left to right; CommonMark prefers nesting. Flattens the nested shape back to two siblings. |
| 17 | `figurePlugin` | in-tree | Makes a figure of an image that is its paragraph's only content: a diagram, a picture in two themes (the pair `themePairPlugin` wrote), or any other image. Its core rule `figures` hides the `<p>` around the image (the wrapper is a `<div>`) and wraps the image or images in `figure_open` and `figure_close` tokens. The `figure_open` renderer writes a `<div class="fig-wrap">` holding a `<div class="fig-controls">` bar of icon buttons (download and copy by format, and zoom) and a `<div class="fig-container">`, and sets `page.hasFigure`. A diagram, whose `src` names a site `.svg` with no `.png` beside it and whose content is in `ctx.svgContents`, is written into the container as the SVG itself, labelled with the alt text; with no alt text it logs a warning and gets no `role`. Any other image stays an `<img>` in the container. An image with text beside it, or inside a link, gets no figure. The wrapper carries `data-tall` when the figure is at least as tall as its bar stood on end. |
| 18 | `videoLinkPlugin` | in-tree | A link marked `{: .video }` becomes a locally vendored poster frame linking out to the video page. The thumbnail `src` is **root-absolute**, because the PDF book flattens every page into one document and a page-relative `src` would resolve against the book root. |
| 19 | `remoteImagePlugin` | in-tree | A `github.com/user-attachments/…` image becomes the copy [`vendor-assets.mjs`](#vendor-assetsmjs) downloaded, in both markdown `![…]()` and raw `<img>` syntax. Also root-absolute, for the same reason. |
| 20 | `countPlugin` | `counts.mjs` | Substitutes each `{{tbdocs:<name>}}` in prose, and in image alt text, with the count the build derived under that name. Its core rule is pushed last, so it runs after `replacements` and sees the text the reader will. Code spans and fences are untouched. Does nothing when `ctx.counts` is absent. |

**Registration order is not execution order**, in two ways. Both matter when inserting a plugin.

For **core rules**, only `md.core.ruler.push()` runs at the position its `md.use()` call implies. `.before(name)` and `.after(name)` insert at a named rule regardless of when the plugin was registered. That is how `headingLevelNormalizePlugin` runs ahead of `headerIdPlugin` although registered after it, and how the typographer repairs (14, 15) run `after("replacements")` and `after("smartquotes")`.

For **renderer rules**, order inverts. Both image plugins capture the current `md.renderer.rules.image` as `orig` and install a wrapper that delegates to it, so the chain runs **outermost first**: `remoteImagePlugin` (19, the later of the two) rewrites the `src` and passes on to `figurePlugin` (17), which passes on to markdown-it's own image renderer. A third image plugin registered after these would run before both. `videoLinkPlugin` (18) is not part of that chain; it transforms a marked *link*, from a core rule.

#### Renderer overrides

`createMarkdownIt` also replaces eight of markdown-it's renderer rules, assigning them onto `md.renderer.rules` instead of registering a plugin. They take no part in the registration order above; each replaces the default output for one token type. Most exist to match kramdown. Some also emit accessibility markup that nothing in the source asks for: the `tabindex` that makes a scrollable wrapper reachable from the keyboard, and `scope="col"` on every table header cell.

| Rule | What it emits instead of the default |
|---|---|
| `fence` | The highlight callback's wrapper HTML verbatim. The wrapper opens with a `<div>`, so markdown-it's own fence rule would enclose it in a second `<pre><code>`. A fence nested in a list item, admonition or other block container also gets a newline between the two closing `</div>` tags, as kramdown's indented-block pretty-printing does. |
| `code_block` | The same Rouge wrapper for an indented (4-space) block, which has no language info --- `<div class="language-plaintext highlighter-rouge"><div class="highlight" tabindex="0">`, against markdown-it's bare `<pre><code>`. |
| `code_inline` | An inline `<code>` tagged with the Rouge wrapper class, so one set of CSS rules styles block and inline code. Escapes `&`, `<` and `>` only, matching kramdown's code-span escape. |
| `table_open` / `table_close` | Every table, wrapped in `<div class="table-wrapper" tabindex="0">`. Detailed below. |
| `th_open` | `scope="col"` on every header cell, and a space after the colon in `style="text-align: left"` --- kramdown emits the spaced form, markdown-it the compact one. |
| `td_open` | The same colon spacing, without the `scope`. |
| `ordered_list_open` | An `<ol>` with no `start` attribute, even where the source numbering does not begin at 1. kramdown ignores source numbering entirely; markdown-it preserves it. |

**The table wrapper is automatic.** Every table on the site gets it from a plain markdown table. A plugin that wraps tables would add a second wrapper around the shipped one, whose outer `<div>` has no `tabindex`. Two things depend on the rule:

- just-the-docs wraps every table the same way, through its `_includes/table_wrappers.html` Liquid pass. Mirroring it keeps the vendored CSS rules keyed on `.table-wrapper > table` working.
- `tabindex="0"` is the `scrollable-region-focusable` fix. The wrapper is `overflow-x: auto` (just-the-docs `tables.scss:11`), and a scroll container that cannot take focus cannot be scrolled without a pointer. It is unconditional, as `highlight.mjs` sets the attribute on `div.highlight`, because whether a table overflows depends on the reader's viewport. `custom.scss` gives the focus a visible ring.

`table_open` calls the default `renderToken` and rewrites its output. That keeps markdown-it's per-token block-prefix whitespace handling, which produces the leading newline when a table is the first child of a list item, a `<dd>`, or a blockquote.

### `counts.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `PLACEHOLDER_RE` | `RegExp` | Matches a `{{tbdocs:<name>}}` or `{{tbdocs:<name>:<argument>}}` placeholder and captures the name and the argument. Used by the `substitute` helper that `countPlugin` calls, and by `findCountRefs` to locate placeholders in a page's raw markdown. |
| `deriveCounts` | `(state, extra) → Record<string, number>` | Derives every named count from build state: page, static-file, reference-page and documentation-page totals, folder-style reference indexes and how many of them have a permalink ending in a slash, packages (total, default, built-in), attribute anchors, enumerations, and `extra.redirectStubs`. Called by `markdownInit` to build `state.site.counts`, whose keys are the names a page may use. |
| `countPlugin` | `(md, ctx) → void` | A markdown-it plugin, the last one `createMarkdownIt` applies. Substitutes each `{{tbdocs:<name>}}` placeholder in prose and image alt text with the value `ctx.counts` holds under that name, and leaves an unknown name as written; code spans and fences are untouched. Its core rule is pushed last, so it runs after `replacements`. Does nothing when `ctx.counts` is absent. |
| `findCountRefs` | `(rawContent, md) → { name, arg, line }[]` | Finds every `{{tbdocs:...}}` reference outside code in a page's raw source, masking code with `maskCode` from `lib/markdown.mjs` and the site's markdown-it instance `md`, as the pre-render rewrites do. `line` is 1-based in `rawContent`, counted with the code put back (a masked fence is one line). Called by `validateCountNames` for each page. |
| `checkPlaceholders` | `(pages, counts, downloads, md) → { problems, sizes }` | `validateCountNames` for all placeholders: also refuses a `size` whose path the build does not publish or cannot size before render (`downloads.refused`, which names the help add-in's project, stylesheets and SVGs), a `size` without a path, an argument on a name that takes none, and either download placeholder when `downloads` is `null`. `sizes` holds the bytes of each file named, which is all the workers are sent. |
| `deriveDownloads` | `(state, { tests, addinDest }) → { files, refused, tests }` | The sizes known before render: the static files discover found (the `bundle_extra` files among them) and the packed package test projects (`tests`, from `packTests`), and the paths that are published but cannot be sized, each with its reason. |
| `expandDownloadPlaceholders` | `(src, downloads, permalink) → string` | Expands `{{tbdocs:size:<site path>}}` as `43 KB` or `1.2 MB`, and `{{tbdocs:packageTestRows}}` as one table row for each package test project, with links relative to `permalink`. `applyPreRenderRewrites` calls it on the source with code masked, using the `downloads` the page's `md` carries. |
| `formatSize` | `(bytes) → string` | Whole KB (1024-based, at least 1) below a mebibyte, MB with one decimal from there. |
| `validateCountNames` | `(pages, counts, md) → string[]` | Checks every page's count references against the known `counts` names via `findCountRefs`. Returns one message per unknown reference, giving the file and line (the reference's line in `rawContent`, moved down by the page's `contentLine`), the nearest known name when one is within an edit distance of three, and every known name. Empty when every reference is known. `markdownInit` throws when the result is non-empty. |
| `findSurvivingPlaceholder` | `(html) → string\|null` | Scans rendered HTML, outside `<code>` and `<pre>`, for a `{{tbdocs:...}}` placeholder that survived rendering; returns the first or `null`. `renderPhase` in `render.mjs` calls it after each page renders and throws on a survivor. |

### `highlight.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `initHighlighter` | `() → Promise<{ render, themeCss }>` | Initialises Shiki, loads the bundled twinBASIC grammar, returns a `render(code, lang)` function plus the loaded theme CSS. |

### `highlight-theme.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `loadHighlightTheme` | `(themesDir?) → Promise<{ scopeToClass, css }>` | Reads the `.theme` files, groups TextMate-scope tokens by their (light-props, dark-props) pair, assigns one CSS class per unique pair, and returns the scope-to-class lookup plus the generated CSS. A token colour below 4.5:1 against the code-block background is raised to meet WCAG AA (lightness moved away from the background, hue and saturation preserved), and the emitted rule has a `raised to 4.5:1` comment naming the original colour. |

### `template.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `templatePhase` | `(pages, site, initData) → Promise<void>` | Wraps each page's `renderedContent` in the just-the-docs layout, runs `compressHtml`, stores the result in `page.html`. Skips `layout: book-combined`. |
| `buildInitConfig` | `(site) → object` | Pre-renders the config-only chrome (SVG sprites, header, search footer, favicon, GA). Called by the `buildInit` task. |
| `buildInitFn` | (alias of internal `buildInit`) | Available for harnesses; combines `buildInitConfig` + `renderSidebar` in one call. |
| `renderSidebar` | `(site) → string` | Pre-renders the sidebar HTML. Called by the `nav` task; `dispatch` adds the output to the shared payload. |
| `renderFullNav` | `(site) → string` | The whole nav tree's list, compressed as a page is. |
| `withPartialNav` | `(html, page, site, fullNav) → string` | An offline page's HTML before its rewrite: the whole nav tree swapped for the page's part of it, and `nav.js` loaded after the nav. |
| `navScript` | `(navHtml) → string` | The text of the offline tree's `assets/js/nav.js`, which puts the whole tree in place of a page's part of it. |
| `navActivationCss` | `(page) → string` | Per-page `<style id="jtd-nav-activation">` block. |
| `injectAnchorHeadings` | `(html, headingsOut) → string` | Adds `<a class="anchor-heading">` next to every heading with an `id` outside `<code>` and `<pre>`, and pushes each heading onto `headingsOut`. The icon is `aria-hidden="true" tabindex="-1"`; the keyboard and screen-reader equivalent is the per-page `<details class="section-links">` block that `renderFooter` builds from `headingsOut`. |

### `compress.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `compressHtml` | `(html) → string` | Whitespace compression outside `<pre>` blocks. Uses the explicit `[ \t\n\r\f\v]+` class so `&nbsp;`-based indentation survives. |

### `write.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writePhase` | `(pages, staticFiles, { destRoot, dryRun?, generatedAssets?, baseurl?, skipPages? }) → Promise<stats>` | Writes the page set, vendored theme, project static files and generated CSS. `writeAssets` passes `skipPages: true`, since `flush:i` writes the pages. |
| `destinationTrees` | `(destRoot, { skipOffline, skipPdf, serve? }) → { roots, gone }` | The trees `prepDest` prepares. `roots` is `destRoot`, with `destRoot+"-offline"` and `destRoot+"-pdf"` when their passes run; `gone` is the siblings whose passes are skipped, empty in serve mode. Probed by `scripts/check_cli.mjs`. |
| `prepareDestinations` | `(roots, dryRun, gone?) → Promise<void>` | Deletes and recreates each path in `roots`, and deletes each path in `gone`. Refuses any path outside the project before deleting anything. |
| `preparePageDirs` | `(pages, staticFiles, destRoot, offlineRoot) → Promise<void>` | Pre-creates every page output directory on both trees. Called by `prepPageDirs`. |
| `WRITE_LIMIT` | `64` | Concurrency ceiling for `runLimited`. |
| `isUnderProject` | `(destRoot) → boolean` | Guard against destructive `--dest` values. Used by `writeOffline` and `writePdf`. |
| `assertDestinationClearOfSource` | `(srcRoot, destRoot) → void` | Throws when `destRoot` is or contains the source tree, or lies inside it anywhere but in a folder directly under it that `isOutputTree` names. Called by `runBuild` before any task runs. |
| `assertNoDestinationCollisions` | `(pages, staticFiles) → void` | Throws when a static file's `destRel` would overwrite a page's `destPath`. |
| `mkdirRec` | `(dir) → Promise<void>` | Recursive `mkdir` with in-flight deduplication cache. |
| `runLimited` | `(items, limit, fn) → Promise<void>` | Concurrency-limited per-item runner. |
| `writeFileMkdirp` | `(filePath, content) → Promise<void>` | Writes a file, creating parent directories as needed. |
| `safeWrite` | `(dest, fn) → Promise<void>` | Wraps a write callback and re-throws with `dest` in the error message. |

### `paths.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `posix` | `(p) → string` | Backslashes to forward slashes, for a rel/destPath that must match the forward-slash form of a URL or tree-manifest comparison. Imported by `offline.mjs`, `offline-rewrite.mjs` and `publish-policy.mjs`; `check-tree.mjs` keeps its own copy to stay off the render fan-out's import cost. |
| `permalinkToDestPath` | `(permalink) → string` | Permalink → destination file path. `/` → `index.html`; `/foo/` → `foo/index.html`; `.html`/`.htm`/`.xml` extensions are kept as-is; all other paths get `.html` appended. |

### `redirects.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writeRedirects` | `(pages, site, destRoot, stubs?) → Promise<{ written }>` | Writes the redirect stubs. Accepts the pre-computed stub list from `deriveRedirects`. |
| `deriveRedirectStubs` | `(pages, site) → Array<{ from, to, destPath }>` | Pure derivation. Guards against `redirect_from` URLs that would overwrite real pages or two pages claiming the same destination. |

### `sitemap.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writeSitemap` | `(pages, site, destRoot, urls?) → Promise<{ entries }>` | Writes `sitemap.xml` + `robots.txt`. Accepts pre-computed URL list from `deriveSitemap`. |
| `deriveSitemapUrls` | `(pages, site) → string[]` | Sorted absolute URL list. Filters `sitemap: false` and `/404.html`. |
| `sitemapIncludes` | `(page) → boolean` | The opt-out predicate on its own: `frontmatter.sitemap !== false && permalink !== "/404.html"`. Exported so `linkJoin` exempts the same pages the generator skipped. |

### `search.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writeSearchDataFromChunks` | `(searchChunks, destRoot, symbols) → Promise<{ entries, json }>` | Per-chunk consolidator. Flattens, joins `symbols` onto the matching entries by URL (`joinSymbolsToEntries`), renumbers global `i`, writes `assets/js/search-data.json`. Used by the `searchData` task. |
| `joinSymbolsToEntries` | `(entries, symbols) → entries` | Attaches `names` / `qualified` / `primary` (the names that are types or language elements) to each entry whose `relUrl` matches a symbol's `url`, after normalising both (strip a trailing `/index` or `/index.html`, then a trailing slash; the `#fragment`, if any, is compared as-is). Mutates and returns `entries`. |
| `deriveSearchEntries` | `(pages, site) → object[]` | Pure compute. One entry per heading-bounded section of each titled page. Each entry: `{ i, doc, title, content, url, relUrl, sourcePage }`. Called by render workers, which drop `sourcePage` and the chunk-local `i` before posting back. |
| `renderEntryString` | `(entry) → string` | Per-entry JSON shape matching the upstream template output byte for byte. |
| `searchIncludes` | `(page) → boolean` | The opt-out predicate: a page is indexed when it has a `title` and does not set `search_exclude: true`. Exported for `linkJoin`, as `sitemapIncludes` is. |

### `symbols.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `symbolPages` | `(pages) → object[]` | The pages under `/tB/`, each as `{ src, url, title, parent, symbols, excludeFromDocs, headings }`, `headings` read from `renderedContent`. |
| `headingsOf` | `(html) → { level, id, text }[]` | Every heading of a rendered page, in order, with the id the render gave it. A scan for `<hN`, not a regex over the page. |
| `deriveSymbolIndex` | `({ pages, api }) → { symbols, interfaces, packages, gaps, unplaced }` | Pure compute. The entries, the interface-to-class and package-name maps, the public symbols no page documents, and the package pages that gave no entry. |
| `serializeSymbolIndex` | `(result, api) → string` | The published file: a header, then one entry to a line. |
| `reportableGaps` | `(result, pages, api) → object[]` | `gaps` less what a package's `exclude_from_docs:` names and the types inside a non-public one. What `--symbol-gaps` writes. |
| `PACKAGE_FOLDERS` | `{ folder, projects }[]` | Each package folder under `Reference/`, and the project names it documents. |
| `SYMBOL_INDEX_REL`, `SYMBOL_INDEX_FORMAT` | `string`, `number` | `tB/symbols.json`, and the `format` it declares. |

### `baseline.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `GUARDED_SRC` | `string` | The repo-relative, forward-slashed source root the baselines describe: `"docs"`. `checkBaseline` skips any other source root; `scripts/check_page_baseline.mjs` and `scripts/check_symbol_index.mjs` pass it in their probes. |
| `GUARDED_DEST` | `string` | The absolute path of `docs/_site`, the online tree `build.bat` writes. |
| `baselineWrites` | `({ destRoot, ci?, serve?, dryRun? }) → { write, heldBack }` | Whether this build may rewrite the committed files it compares with: the two baselines and the help add-in's copy of the index. `write` is set only for a build into `GUARDED_DEST` outside CI, `--serve` and `--dry-run`. `heldBack` names the destination (`built into .claude/my-site`) when it is the reason, and is `""` otherwise. Called by `runBuild`, and probed by `scripts/check_page_baseline.mjs`. |
| `checkBaseline` | `(guard, { record, write, heldBack, force, file }) → Promise<{ failed, text }>` | The drift guard `checkPageBaseline` and `checkSymbolBaseline` share. `guard` names the file (`"page"` or `"symbol"`) and says what a loss and a gain are; `record` is what this build publishes, as the file holds it. Does nothing unless `record.src` is `GUARDED_SRC`. With `force` it writes `record` to `file`. Otherwise a missing file fails, or is created when `write` is set; a loss fails; and a gain rewrites `file` when `write` is set, or is reported as not raised when `heldBack` says why. The file is `record` as JSON, indented two spaces, with a closing newline. |

### `symbol-baseline.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `checkSymbolBaseline` | `({ src, urls, write, heldBack, force, file }) → Promise<{ failed, text }>` | The symbol index's drift guard: fails on a URL `builder/symbol-baseline.json` has and `urls` does not, rewrites the file when `urls` adds one and `write` is set (or says it did not, when `heldBack` says why), and does nothing for a source root other than `docs`. |
| `SYMBOL_BASELINE_PATH` | `URL` | `builder/symbol-baseline.json`. |

### `addin-index.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `syncAddinIndex` | `({ src, json, write, heldBack, file }) → Promise<string>` | Compares `json`, the `tB/symbols.json` this build wrote, with the help add-in's committed copy, and rewrites the copy when they differ and `write` is set; otherwise it says that they differ, and names the destination when `heldBack` does. Does nothing for a source root other than `GUARDED_SRC`, or when `json` is empty (`--dry-run`). Returns the line to print, `""` when the copy is current; a difference never fails the build. Called by `runBuild` after the symbol index's drift guard. |
| `ADDIN_INDEX_REL` | `string` | `"add-in/Resources/SYMBOLS/symbols.json"`, the default `file` under the repository root. |

### `addin-project.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `addinProjectOf` | `(config) → { src, dest } \| null` | The download `_config.yml`'s `addin_project` declares, `dest` without a leading slash; `null` unless both ends are given. |
| `packAddinProject` | `({ dir, symbols }) → Promise<{ bytes, files, untracked }>` | Packs the files `git ls-files` lists in `dir`, as the working folder holds them, less `Resources/HELP/`, with CRLF made LF outside `Resources/`, and `symbols` in place of `Resources/SYMBOLS/symbols.json` when given. Stages them in a temporary folder and packs it with `importProject` from `scripts/impexp.mjs`. `untracked` lists the files git does not track that were left out. Throws when git fails or tracks no `Settings`. |
| `writeAddinProject` | `({ dir, symbols, roots, rel }) → Promise<{ rel, bytes, files, untracked, roots, ms }>` | Packs once and writes the file at `rel` in each of `roots`. |
| `formatAddinProject` | `(result, dirLabel, indent) → string` | The line `runBuild` prints, and a second naming any untracked file left out. |

### `page-baseline.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `BASELINE_PATH` | `URL` | `builder/page-baseline.json`, the default `file` of `checkPageBaseline`. |
| `checkPageBaseline` | `({ src, pages, staticFiles, write, heldBack, force, file }) → Promise<{ failed, text }>` | The page-count drift guard, which does nothing unless `src` is `GUARDED_SRC`. With `force` it writes this build's counts to `file`, up or down. Otherwise a missing baseline fails, or is created when `write` is set; a page or static-file count below the baseline fails; and a count above it rewrites `file` when `write` is set, or is reported as not raised when `heldBack` says why. Called by `runBuild` in `tbdocs.mjs`, and by the probes in `scripts/check_page_baseline.mjs`. |

### `offline.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writeOffline` | `(staticFiles, site, destRoot, { auxStats?, profileOffline?, sitePaths }) → Promise<stats>` | Offline tree writer. Render workers have already written the per-page HTML from `page.offlineHtml`; `sitePaths` is the set `dispatch` built with `buildSitePathsSync`. |
| `enumerateVendoredThemeAssets` | `() → string[]` | Lists the relative paths under `builder/vendor/just-the-docs/assets/`. `dispatch` uses it to build the site-paths set without reading `_site/`. |
| `deriveOfflineJtdJs` | `(src) → string` | AST-based patcher: uses `acorn` to replace `navLink` and `initSearch` in `just-the-docs.js` with offline-compatible implementations. A parse failure means the re-extracted file is something acorn cannot read. |
| `deriveOfflineSearchDataJs` | `(jsonBytes) → string` | Wraps `search-data.json` as `window.SEARCH_DATA = …` and minifies. `<script src=>` cannot fetch JSON under `file://`. |
| `deriveOfflinePage`, `deriveOfflineRedirect`, `deriveOfflineCss` | (re-exported from `offline-rewrite.mjs`) | Pure-compute helpers used by both the offline writer and the worker render handler. |

### `offline-rewrite.mjs`

Pure-compute rewrite helpers, split from `offline.mjs` so `cpu-worker.mjs` can import them without `node:fs` or `acorn`.

| Symbol | Signature | Description |
|---|---|---|
| `buildSitePathsSync` | `(pages, staticFiles, excludePatterns, stubs, themeAssetRels) → Set<string>` | Builds the URL resolver's site-paths Set synchronously, from an explicit theme-asset list rather than reading `_site/assets/`. Used by `dispatch`. |
| `deriveOfflinePage` | `(page, state) → { html, misses }` | Rewrites one page's HTML for offline use: strips SEO metadata, rewrites every absolute URL to a page-relative path, injects the offline search setup script. |
| `deriveOfflineCss` | `(cssIn, themeRel, state) → { css, misses }` | Rewrites `url()` references in a CSS file to page-relative paths. |
| `deriveOfflineRedirect` | `(stub, state) → string` | Rewrites a redirect stub's HTML for offline use. |
| `offlineExcluded` | `(rel, patterns) → boolean` | Returns `true` when a site-relative path matches any `offline_exclude` glob from `_config.yml`. |
| `stripFontPreloads` | `(html) → string` | Removes the `<link rel="preload" as="font">` tags from the offline tree only. A font preload is a CORS-mode fetch; under `file://` there is no origin to match, so Chrome fails it with `ERR_FAILED` while the `@font-face` fetch succeeds. The preload gains nothing offline and adds two red lines to the console. |
| `posixDirname` | `(rel) → string` | POSIX directory component of a relative path. |
| `fileDirSegsFromRel` | `(rel) → string[]` | Splits a destination path into directory segments. |
| `fnmatchPathname` | `(pattern, path) → boolean` | Glob-style pathname match. |
| `computeRelative`, `resolveRaw`, `computeRelUrl`, `buildSegs`, `decode`, `getPageCache`, `stripSeo`, `rewriteHtml`, `rewriteCss`, `injectSearchSetup` | various | Internal helpers; see [`offline-rewrite.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline-rewrite.mjs) for the per-symbol descriptions. |

### `pdf.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writePdf` | `(pages, staticFiles, site, destRoot, { tolerateMissingImages?, highlightCss }) → Promise<stats>` | Writes the `_site-pdf/` source tree: `book.html` + `tb-highlight.css` + `print.css` + referenced images. |

### `scheduler.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `SharedState` | class | `pages[]`, `staticFiles[]`, `site`, `pageByDest`, `searchChunks`. Created by the `Scheduler` constructor. |
| `Scheduler` | class | Main-thread side of the pull scheduler. Constructor: `{ pool, tasks, views, idMapping, ganttSections }`. Methods: `start(ctx)` (returns the results promise), `addDynamicTasks(count)`, `summary()`. The orchestrator sets the event hooks (`_onWorkerDone`, `_onWorkerError`, `_onPerWorkerTiming`, `_onMainTaskReady`). |

### `worker-pool.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `WorkerPool` | class | Constructor: `(size, workerUrl)`. Methods: `sendInit(sab, ctx)` (broadcasts the init message; increments `_buildCount`), `broadcastDynamicData(payloadSAB, sharedSAB)`, `destroy()`. Public fields: `bootTimings[]`, `_buildCount` (read by `runBuild` to detect serve-mode rebuilds). The caller sets the callbacks (`onWorkerDone`, `onWorkerError`, `onPerWorkerTiming`, `onMainTaskReady`). |

### `cpu-worker.mjs`

Worker harness; no exports. Runs the pull loop in module scope.

The handler table is built from the imported `HANDLERS` constant:

| Handler | Source | Description |
|---|---|---|
| `warmInit` | inline | Awaits `initHighlighter()`. |
| `renderEnvInit` | inline | Unpacks shared SAB, awaits highlighter, reconstructs link tables, builds markdown-it, stores `_renderEnv`. |
| `flush` | inline | Drains the next `_pendingFlush` batch to disk. |
| `scssLight` / `scssDark` | `scss.mjs` | Light/dark palette compile. |
| `dot` | `dot.mjs` | `regenerateDot` over `srcRoot`. |
| `buildInfo` | `build-info.mjs` | `captureBuildInfo`. |
| `render` | inline | Five-stage chunk render: `renderPhase` → `computeChunkSeo` → `templatePhase` → offline → `deriveSearchEntries`. |

### `sab-scheduler.mjs`

| Symbol | Signature | Description |
|---|---|---|
| Constants | `MAX_TASKS`, `MAX_LANES`, `MAX_EDGES`, `SLICES_PER_WORKER`, `NOT_READY` / `READY` / `CLAIMED` / `DONE` / `FAILED`, `F_ON_DEMAND` / `F_UNIQUE_PER_WORKER` / `F_RUN_ON_MAIN` / `F_PIN_TO_PRED` / `F_RUN_WHEN_IDLE` | The SAB layout's static sizes, status enum, and flag bits. |
| `HANDLERS` | object | Handler-name → integer-ID mapping. Workers build the reverse `handlerById` table at module-load. |
| `SAB_BYTE_LENGTH` | `number` | Byte size of the allocated SAB. |
| `createViews` | `(sab) → object` | Returns an object of `Int32Array` views into the SAB, one per array slice. |
| `allocSchedulerSAB` | `(taskDefs, workerCount, opts?) → { sab, views, idMapping }` | Allocates the SAB and writes the static task metadata. `opts.rebuild: true` pre-fills `survives_reset` per-lane done flags. |
| `verifySchedulerSAB` | `(taskDefs, views, idMapping) → void` | Validates the laid-out task graph. Throws on duplicate names, unknown predecessors, or unsatisfiable flag combinations. |
| `writeTaskMeta` | `(views, idx, meta) → void` | Writes `handlerIdx` / `perWorkerDeps` / `priority` / etc. into the SAB for one task slot. |
| `readTaskMeta` | `(views, idx) → object` | Reads the same fields out. |
| `scanAndClaim` | `(views, lane) → number` | Worker-side ready-task scan + CAS-claim. Returns the task index or `-1`. |
| `onTaskDone` | `(views, taskIdx, lane) → { readyCount, wakeMain }` | Marks `DONE`, decrements successor dep counts, returns how many became `READY` and whether any of them is a main task. |
| `advanceFirstReady` | `(views, taskIdx) → void` | Advances a low-water mark so later scans skip the prefix of `DONE` slots. |
| `allocDynamicSlots` | `(views, idMapping, count) → number` | Reserves `count` consecutive slot indices from the dynamic pool. Returns the base index. |
| `wireDynamicEdges` | `(views, edges) → void` | Writes successor edges for dynamic tasks. Each `edges[i]` is `{ from, to: [taskIdx, ...] }`. |
| `appendDynamicSuccessors` | `(views, edges) → void` | Appends successor edges to *existing* tasks. Used for `prepPageDirs → flush:0..N-1`, keeping `prepPageDirs`'s static successors. |
| `setDepCount` | `(views, idx, count) → void` | Writes a task's dep count. |
| `activateDynamicTasks` | `(views, base, count) → void` | Flips `count` task slots starting at `base` from `NOT_READY` to `READY`. |
| `packPayloads` | `(views, base, payloads) → SharedArrayBuffer` | Concatenates per-task JSON payloads into one SAB and writes `payloadOffset` / `payloadLength` per slot. |

### `sab-broadcast.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `packShared` | `(obj) → SharedArrayBuffer` | JSON-serialises `obj`, encodes to UTF-8, copies into a `SharedArrayBuffer`. |
| `unpackShared` | `(sab) → object` | Decodes and parses the content of a `SharedArrayBuffer`. |

### `gantt.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `renderGantt` | `(grouped) → string` | Inline SVG Gantt chart from a `Map<section, taskTiming[]>`. A lane row combines all worker tasks of one lane; a section row shows one task per row. Light and dark palettes. Throws, naming the task, on a task it has no row or colour for. |

### `serve.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `runServe` | `(opts) → Promise<void>` | Long-lived dev server: an initial build, then HTTP, a recursive watcher and SSE reload. The worker pool is created once and reused across rebuilds. Writes to `<srcRoot>/_serve/`. Skips the offline and PDF passes by default. |

### `static-files.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `createStaticHandler` | `(destRoot, { transformHtml? }) → (req, res) => Promise<void>` | An HTTP handler serving the files under `destRoot` as GitHub Pages does: a folder's URL without its trailing slash redirects to the slash form, and a path with no extension also finds `<path>.html`. Nothing is cached. `transformHtml(html, file)`, when given, rewrites each `.html` file before it is sent: `serve.mjs` adds its reload script with it to every page but `book.html`. Logs a 404 or a 500 to stderr. |

### `command-line.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `OPTIONS` | `{ [flag]: { type, empty? } }` | `tbdocs`'s flags, in the table shape `lib/cli.mjs`'s `parseCli` reads: `"string"` for a flag that takes a value, `"boolean"` for the rest. `--baseurl` alone has `empty: true`, since an empty base URL is the site root. `--no-check`, `--no-offline`, `--no-pdf` and `--no-fetch-assets` are flags of their own, not negations. |
| `DEFAULTS` | frozen `BuildOpts` | The options a build takes with no flags given --- the defaults in the `BuildOpts` table below. `fetchAssets` is left out. |
| `parseCommandLine` | `(argv) → BuildOpts` | Reads `argv` (without Node's own two entries) through `parseCli`, then applies the flags in the order given, so a `--no-check` undoes only the check flags before it. Throws a `CliError` whose message `main()` prints before it exits 2: `unknown option: <arg>`, `unexpected argument: <arg>`, `<flag> takes no value`, `<flag> needs a value`, `<flag> needs a non-empty value`, a `--port` or `--stall-timeout` value that is not a number in its range (`--port expects a whole number from 1 to 65535, got: <value>`), or a `--url` that is not an absolute `http` or `https` URL. |

### `tbdocs.mjs` orchestrator

| Symbol | Signature | Description |
|---|---|---|
| `runBuild` | `(opts) → Promise<{ pages, staticFiles, site, destRoot }>` | Runs the full pipeline: allocates the SAB, creates or reuses the pool, sends `init` to every worker, awaits `scheduler.start(ctx)`, logs the summary, injects the Gantt chart and returns the final state. |
| `EXIT_FOUND`, `EXIT_ERROR` | `number` | `1` and `2`: the exit code for a problem the build reports (a link or integrity failure, or any other failed step), and the one for a command-line error or a crash. `runBuild` marks the build failed through a private `failBuild()`, which sets `process.exitCode` to `EXIT_FOUND`. `serve.mjs` exits with `EXIT_ERROR` when its initial build throws or its port is in use. |
| `createWorkerPool` | `() → WorkerPool` | Factory for `serve.mjs`, which creates one pool at startup and passes it to every `runBuild()` call. |

`BuildOpts` fields:

| Field | Default | Description |
|---|---|---|
| `src` | `"docs"` | Source root, relative to `cwd`. |
| `dest` | `null` | Destination root. Defaults to `<src>/_site`. |
| `baseurl` | `null` | Overrides `config.baseurl`. |
| `url` | `null` | Overrides `config.url`. |
| `dryRun` | `false` | Skip all filesystem writes. |
| `skipOffline` | `null` | Skip the offline pass. `null` reads `also_build_offline` from `_config.yml`. |
| `skipPdf` | `null` | Skip the PDF pass. `null` reads `also_build_pdf` from `_config.yml`. |
| `tolerateMissingImages` | `false` | Downgrade missing-image errors to warnings in `writePdf`. |
| `profileOffline` | `false` | Emit per-substep timings for `writeOffline`. |
| `check` | `false` | Run the link and integrity check over the HTML the build holds in memory. Sets `state.checkTrees`, which turns the check on in the workers and the Section 5 tasks. |
| `auditIndex` | `false` | Implies `check`. Additionally diff the derived tree index against what landed on disk. |
| `checkFindings` | `null` | Implies `check`. Path to write the findings JSON to. |
| `fetchAssets` | `null` | Force remote-asset vendoring on or off. `null` means "download unless `$CI` is set". |
| `updatePageBaseline` | `false` | Record this build's page and static-file counts in `builder/page-baseline.json` whichever way they moved. |
| `updateSymbolBaseline` | `false` | Record this build's symbol-index URLs in `builder/symbol-baseline.json` whichever left it. |
| `symbolGaps` | `null` | Path to write the public symbols no page documents to, as JSON. |
| `serve` | `false` | Start the dev server instead of the one-shot build. |
| `port` | `4000` | HTTP port for serve mode. |
| `stallTimeoutMs` | `120000` | How long the build waits with no task completing before it fails, naming what was outstanding. `0` disables the watchdog. |
| `pool` | `null` | Optional external `WorkerPool`. Set by `serve.mjs` to reuse the pool across rebuilds. |

## See Also

- [tbdocs Builder](Builder) -- architecture overview and narrative design rationale.
- [Book Configuration](Book-Configuration) -- `_book.yml` key reference.
- [Extending the Builder](Extending) -- tutorial for adding a new task or markdown-it plugin.
