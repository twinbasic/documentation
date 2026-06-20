---
title: Pipeline Stages
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Pipeline-Stages
---

# Pipeline Stages
{: .no_toc }

Complete interface reference for `tbdocs`. The first half covers every task in the scheduler's DAG, grouped by the four Gantt sections (Seeds / Spine / Render / Write). The second half covers every module, with the full export table for each.

For design rationale and the narrative tour, see [tbdocs Builder](Builder). To add a new task or markdown-it plugin, see [Extending the Builder](Extending).

* TOC goes here
{:toc}

## Data model

The pipeline passes three pieces of mutable state through every task: the `pages[]` array, the `staticFiles[]` array, and the `site` object. All three live on a single `SharedState` instance owned by the scheduler.

### Page objects (`pages[]`)

`discover` creates one page object per `.md` or `.html` source file with parseable YAML frontmatter. Subsequent tasks add new fields; no task removes or renames a field set by an earlier one. Render workers receive structured-clone copies of their chunk, mutate the copies, and return a delta that the render task's `submit()` merges into the master page via `state.pageByDest`.

| Field | Added by | Type | Description |
|---|---|---|---|
| `srcPath` | `discover` | `string` | Absolute filesystem path of the source file. |
| `srcRel` | `discover` | `string` | POSIX-style path relative to `srcRoot`, e.g. `Reference/Core/Dim.md`. |
| `ext` | `discover` | `string` | Lowercase file extension: `.md` or `.html`. |
| `frontmatter` | `discover` | `object` | Parsed YAML frontmatter. |
| `rawContent` | `discover` | `string` | Body text after the frontmatter block. |
| `permalink` | `discover` | `string` | URL path, taken from `frontmatter.permalink` or derived from `srcRel`. |
| `destPath` | `discover` | `string` | Filesystem path within the output root, e.g. `Reference/Core/Dim.html`. |
| `layoutDefault` | `discover` | `boolean` | `true` when frontmatter has no explicit `layout:` key. |
| `imageScope` | `discover` | `boolean` | `true` when `srcRel` contains an `Images/` segment. Phase 3 uses this to validate image paths. |
| `navPath` | `nav` | `string` | Slash-joined nav chain: `grand_parent / parent / title`. Set only on pages with a non-empty title. |
| `navLevels` | `nav` | `object` | Positional indices in the sidebar tree. `templatePhase` uses this to generate per-page activation CSS. |
| `breadcrumbs` | `nav` | `Page[]` | Ancestor chain from the root to the current page, nearest-first. |
| `children` | `nav` | `Page[]` | Immediate child pages in nav order. |
| `renderedContent` | `render:i` | `string` | HTML body produced by markdown-it. Set on the worker, merged back into the master page via the render delta. |
| `seoTitle` | `render:i` (`computeChunkSeo`) | `string` | HTML-stripped, whitespace-collapsed page title for `<title>` and `og:title`. |
| `seoFullTitle` | `render:i` (`computeChunkSeo`) | `string` | `"<seoTitle> \| <siteTitle>"` for non-home pages; equals `seoTitle` on the home page. |
| `seoCanonical` | `render:i` (`computeChunkSeo`) | `string` | Absolute canonical URL. |
| `seoIsHome` | `render:i` (`computeChunkSeo`) | `boolean` | `true` when the page's permalink is a known home-page URL. |
| `html` | `render:i` (`templatePhase`) | `string` | Complete HTML document, ready to write to disk. Absent on `layout: book-combined` pages, which `writePdf` owns. |
| `offlineHtml` | `render:i` (`deriveOfflinePageCached`) | `string\|undefined` | Pre-computed offline HTML for the page, with every absolute URL rewritten to a page-relative path. Set after `templatePhase` when `!skipOffline`. |
| `hasSvg` | `render:i` (`svgInlinePlugin`) | `boolean\|undefined` | `true` when the page contains at least one inlined SVG. `templatePhase` uses this to conditionally include the `svg-inline.js` script. |
| `offlineMisses` | `render:i` (`deriveOfflinePageCached`) | `number\|undefined` | Count of URLs that could not be resolved during the per-page offline rewrite. Aggregated by `flushJoin`. |

### Site object (`site`)

Populated progressively. Each task's `execute()` or `submit()` stores its output on `state.site`; downstream tasks read from it directly.

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

In addition, `SharedState` itself contains two non-`site` fields that downstream tasks read directly:

| Field | Type | Set by | Description |
|---|---|---|---|
| `sitePaths` | `Set<string>` | `dispatch` | All site-relative paths reachable in the online tree (pages + statics + redirects + theme assets). Built once and reused by the offline rewrite in every render worker, by the `scss` task's offline rewrite, and by `writeOffline`. |
| `searchChunks` | `Array<Array<entry>>` | `dispatch` (allocated), `render:i.submit` (filled) | Per-chunk search entries collected from the render workers. Read by `searchData`. |

### Static files (`staticFiles[]`)

Also produced by `discover`. Every file that is not a page --- images, fonts, prebuilt CSS/JS, and any `.md`/`.html` file without frontmatter --- becomes a static file object. `dot.submit()` appends additional SVG descriptors for any freshly-regenerated diagrams.

| Field | Type | Description |
|---|---|---|
| `srcPath` | `string` | Absolute source path. |
| `srcRel` | `string` | POSIX path relative to `srcRoot`. |
| `destRel` | `string` | Relative path within the output root. |
| `size` | `number` | File size in bytes at discovery time. |

## Scheduler-level concepts

Every task is declared as an entry in the static `TASKS` object in [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs). The scheduler infrastructure in [`scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/scheduler.mjs) and [`sab-scheduler.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sab-scheduler.mjs) reads these definitions both at startup (to lay out the SAB) and at runtime (to dispatch task bodies).

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
| `priority` | `number` | no | When multiple tasks are READY, lower priority numbers claim first. |
| `consolidate` | `boolean` | no | Combine timings across lanes into one Gantt swimlane (used by `render:i` / `flush:i`). |
| `ganttSection` | `string` | no | Section header for the Gantt chart row (`Seeds` / `Spine` / `Render` / `Write`). |

### Handler IDs

Each worker handler is registered in `HANDLERS` (in `sab-scheduler.mjs`) as a name → integer mapping. The SAB stores the handler ID per task; the worker looks it up to dispatch the call:

```js
export const HANDLERS = {
  warmInit: 0, renderEnvInit: 1, flush: 2,
  scssLight: 3, scssDark: 4, dot: 5,
  buildInfo: 6, render: 7,
};
```

The reverse table (`handlerById`) is built at worker module-load time from the imported `HANDLERS` constant.

### Static vs dynamic tasks

The `TASKS` object enumerates the **static** tasks --- the ones whose presence and edges are known before the build starts. **Dynamic** tasks (`render:i`, `flush:i`) are allocated at runtime by `dispatch.submit()` once the page count is known. Both kinds share the same SAB infrastructure; `sab-scheduler.mjs:allocDynamicSlots` reserves slot indices from the same pool, and `wireDynamicEdges` plus `appendDynamicSuccessors` extend the successor edge list.

---

## Section 1 --- Seed tasks

Tasks with no predecessors. They become claimable as soon as the build starts, with the exception of `on_demand` seeds that wait for a successor to request them.

### `config` (main)

```js
config.execute({}, ctx) → { config }
```

Reads `<srcRoot>/_config.yml`, applies `ctx.opts.baseurl` and `ctx.opts.url` overrides, returns the parsed object. Output flows into `discover` directly.

### `buildInfo` (worker)

Handler in `cpu-worker.mjs`: calls `captureBuildInfo()` from `build-info.mjs`. Two parallel `git` shell-outs (`rev-parse --short HEAD` + `log -1 --format=%cs`). Falls back to `"unknown"` on failure. Output written to `state.site.buildInfo`.

### `scssLight` (worker), `scssDark` (worker)

Handlers call `compileLightScss(srcRoot)` and `compileDarkScss(srcRoot)` respectively. Each compiles the vendored just-the-docs SCSS plus customisations against one palette. Returned CSS strings flow into the `scss` task.

### `scss` (main)

```js
scss.expected = ["scssLight", "scssDark", "prepDest"]
```

Joins the two CSS strings, writes `assets/css/just-the-docs-combined.css` to both `_site/` and `_site-offline/` (the offline copy includes the page-relative URL rewrite via `deriveOfflineCss`). Depends on `prepDest` so the destination directories exist.

### `dot` (worker)

Handler calls `regenerateDot(srcRoot)`. Traverses `<srcRoot>/assets/images/dot/*.dot`, compares mtimes against `.svg` siblings, calls `Graphviz.load()` once then `gv.dot(src)` per stale source. Returns `dotStats` (`processed`, `regenerated`, `failed`, `setupSkipped?`, `svgFiles[]`); `submit()` appends new SVG descriptors to `state.staticFiles`. The WASM render is fast (sub-millisecond per diagram after the ~50 ms one-time `Graphviz.load()`); runs on a worker so the init hides behind the main spine.

### `highlighterInit` (main)

Calls `loadHighlightTheme()` from `highlight-theme.mjs`. Loads `Light.theme` + `Dark.theme`, derives the palette, returns the generated `tb-highlight.css`. Does **not** initialise Shiki on main; only workers actually need a Shiki instance, and each builds its own via `warmInit`.

### `warmInit` (worker, `on_demand` + `unique_per_worker` + `run_when_idle` + `survives_reset`)

Per-lane Shiki bootstrap (`initHighlighter()` from `highlight.mjs`). The flag combination is essential: `unique_per_worker` means every lane that runs a render task needs its own warmup; `on_demand` keeps it off the auto-start list; `run_when_idle` lets workers fire it speculatively during the main spine; `survives_reset` keeps the per-lane done flag across serve-mode rebuilds, since the worker's module-scope Shiki state survives even though the SAB is fresh.

### `prepDest` (main, deferred)

```js
prepDest.expected = ["dispatch"]
```

Cleans and recreates `<destRoot>`, `<destRoot>-offline`, and `<destRoot>-pdf`. Deferred to after `dispatch` so the wipe does not contend with `discover`'s reads on small machines.

### `prepPageDirs` (main)

```js
prepPageDirs.expected = ["prepDest"]
```

Pre-creates every page output directory (online + offline). Lets `flush:i` skip `mkdir` and call `writeFile` directly.

---

## Section 2 --- Spine tasks

Main-thread tasks fed by `discover`. They build the `site` object, derive the auxiliary data structures, and prepare the fan-out.

### `discover` (main)

```js
discover.expected = ["config"]
discover.execute({ config: { config } }, ctx) →
  { pages, staticFiles, config }
```

Calls `discover(srcRoot, config.exclude ?? [])` from `discover.mjs`. `submit()` writes the three fields to `SharedState` and populates `state.pageByDest`.

### `nav` (main)

```js
nav.expected = ["discover"]
nav.execute() → { sidebar }
```

Calls `computeNav(state.pages, state.site.config)` from `nav.mjs`, then `renderSidebar(state.site)` from `template.mjs`. The nav-integrity check runs inside `computeNav` and throws on orphan or ambiguous `parent:` declarations. Returns the pre-rendered sidebar HTML for `dispatch` to fold into the shared payload.

### `buildInit` (main)

```js
buildInit.expected = ["discover"]
buildInit.execute() → { initData }
```

Calls `buildInitConfig(state.site)` from `template.mjs`. Pre-renders the config-only chrome (SVG sprites, header, search footer, favicon, GA). Runs in parallel with `nav`; `dispatch` merges the two outputs.

### `markdownInit` (main)

```js
markdownInit.expected = ["discover"]
```

Builds the link tables (`buildLinkTables(state.pages)`), instantiates the shared markdown-it (`createMarkdownIt({ highlighter: null, linkTables, baseurl, staticFiles })`), serializes the link tables (`serializeLinkTables(linkTables)`) for transfer to workers, and computes site-level SEO (`computeSiteSeo(state.site.config, state.site.markdown)`). Writes `markdown`, `linkTablesSerialized`, `seoSiteTitle`, `seoLogoUrl` to `state.site`. Per-page SEO is **not** computed here --- that runs inside each render worker via `computeChunkSeo`.

### `loadData` (main)

```js
loadData.expected = ["highlighterInit"]
```

Calls `loadData(srcRoot)` from `data.mjs`. Writes `state.site.data` and `state.site.bookData`. Sequenced behind `highlighterInit` to fit into the spine's I/O window without contention.

### `deriveRedirects` (main)

```js
deriveRedirects.expected = ["discover"]
deriveRedirects.execute() → { stubs }
```

Pure derivation via `deriveRedirectStubs(state.pages, state.site)` from `redirects.mjs`. Output feeds both `dispatch` (folded into `sitePaths`) and `writeAux`.

### `deriveSitemap` (main, deferred)

```js
deriveSitemap.expected = ["dispatch"]
deriveSitemap.execute() → { urls }
```

`deriveSitemapUrls(state.pages, state.site)` from `sitemap.mjs`. Deferred to `dispatch` so it runs while the main thread would otherwise be idle waiting on render workers.

### `resolveBookChapters` (main)

```js
resolveBookChapters.expected = ["deriveSitemap"]
```

Calls `resolveBookChapters(state.site.bookData, state.pages)` from `book.mjs`. Mutates `bookData._chapters` with `Page[]` references. Identity-critical: the same `Page` objects must be visible to `writePdf` after the render fan-out has populated `renderedContent` on them.

### `dispatch` (main)

```js
dispatch.expected = [
  "nav", "buildInit", "buildInfo", "dot",
  "deriveRedirects", "markdownInit",
]
dispatch.execute() → { chunks, sharedSAB }
```

The fan-out point. `execute`:

1. Slices `state.pages` into `workerCount × SLICES_PER_WORKER` chunks (capped at one chunk per worker for small page counts).
2. Computes the `sitePaths` set via `buildSitePathsSync` from `offline-rewrite.mjs`, using the vendored theme asset list from `enumerateVendoredThemeAssets()` rather than traversing `_site/assets/`.
3. Builds the shared payload (config, site-level SEO, pre-rendered chrome + sidebar, serialized link tables, static-file relative-path set, baseurl, site-paths array, offline-exclude patterns, skip-offline flag, build info) and packs it into one SAB via `packShared` from `sab-broadcast.mjs`.

`submit` allocates 2N dynamic SAB slots, writes their handler IDs, wires `render:i → [renderJoin, flush:i]` and `flush:i → [flushJoin]`, sets the per-worker dep on `render:i → renderEnvInit`, pins each `flush:i` to its `render:i`, packs the per-chunk page data into a payload SAB, registers `render:i` / `flush:i` task definitions on the scheduler (so `submit()` callbacks resolve), broadcasts the two SABs to every worker via `pool.broadcastDynamicData`, and finally activates the `render:i` slots.

---

## Section 3 --- Render fan-out

The N render and N flush tasks, plus the per-worker init and the two barriers.

### `renderEnvInit` (worker, `on_demand` + `unique_per_worker`)

```js
renderEnvInit.expected = ["dispatch"]
renderEnvInit.perWorkerDeps = ["warmInit"]
```

Per-lane render environment setup. Handler:

1. Awaits `_sharedSAB` to be set by the `dynamicData` message (which `dispatch` broadcasts before activating any `render:i`).
2. Unpacks the shared payload via `unpackShared(_sharedSAB)`.
3. Awaits `initHighlighter()`.
4. Reconstructs the link-table `Map`s from the serialized pair arrays.
5. Builds the worker's own markdown-it via `createMarkdownIt({...})`.
6. Builds the offline base state (site-paths set, normalised baseurl) when `!skipOffline`.
7. Stores the result in the worker's module-scope `_renderEnv`.

### `render:i` (worker, dynamic)

Handler (`render` in `cpu-worker.mjs`):

1. Reads the chunk JSON from `_payloadSAB` using `payloadOffset[taskIdx]` / `payloadLength[taskIdx]`.
2. `await renderPhase(chunk, env.site)` --- markdown-it body render.
3. `computeChunkSeo(chunk, env.site.seoSiteTitle, env.site.config, env.site.markdown)` --- per-page SEO fields.
4. `await templatePhase(chunk, env.site, env.initData)` --- just-the-docs layout wrap.
5. When `env.offlineBase` is set: per-destination-directory, render the first page through `deriveOfflinePage` and slice the nav block via `sliceNavBlock`; cache the input/output nav slices keyed by directory; for each writable page, call `deriveOfflinePageCached` which substitutes the cached nav, runs the rewriter over the smaller string, and splices the output back in. Saves ~200 ms of repeated nav rewriting.
6. Store `{ destPath, html, offlineHtml, offlineMisses }` on the worker's `_pendingFlush` FIFO so the matching `flush:i` can drain it.
7. `deriveSearchEntries(chunk, env.site)` --- per-section search entries. Trim `sourcePage` and the chunk-local `i` before returning (main reassigns global indices).

Returns `{ pages, searchEntries }`. The `submit()` callback (registered on the scheduler by `dispatch.submit`) merges `renderedContent` / `offlineMisses` into the master `Page` objects via `state.pageByDest`, and writes `searchEntries` into `state.searchChunks[i]`.

### `flush:i` (worker, dynamic, `pin_to_predecessor`)

```js
flush:i.expected = ["render:i"]    // depCount: 2 — render:i + prepPageDirs
flush:i.pinnedTo = render:i        // F_PIN_TO_PRED
```

Handler (`flush` in `cpu-worker.mjs`): pops the next batch from `_pendingFlush`, writes each page's `.html` to `<destRoot>/p.destPath` and (when `offlineHtml !== undefined`) `<destRoot>-offline/p.destPath`. Concurrency bounded at 64 via a small worker-of-workers loop. Returns `{ written, offlineWritten, offlineMisses }`. The pinning is what guarantees the FIFO drain happens on the right lane.

### `renderJoin` (main, `on_demand`)

```js
renderJoin.expected = []   // depCount set to N by dispatch.submit
renderJoin.execute() → {}
```

Barrier. Becomes ready when every `render:i` has completed (each `render:i → renderJoin` edge decrements the count via `sab-scheduler.mjs:onTaskDone`). Unblocks `searchData`.

### `flushJoin` (main, `on_demand`)

```js
flushJoin.expected = []    // populated by dispatch.submit with ["flush:0", ..., "flush:N-1"]
flushJoin.execute(inputs) → { written, offlineWritten, offlineMisses }
```

Aggregates per-chunk write stats. Unblocks `writeAux` and `writePdf`.

---

## Section 4 --- Write and post-write

Main-thread tasks that materialise the rest of the output after the render fan-out completes.

### `writeAssets` (main)

```js
writeAssets.expected = ["dot", "prepPageDirs", "highlighterInit"]
```

Calls `writePhase(state.pages, state.staticFiles, { destRoot, dryRun, generatedAssets, baseurl, skipPages: true })` from `write.mjs`. Copies vendored theme JS, copies project static files, writes generated CSS (`tb-highlight.css` from `state.site.highlightCss`). **Does not** write page HTML --- the per-chunk `flush:i` tasks already did that. The CSS baseurl rewrite (`url("/path")` → `url("<baseurl>/path")`) applies to both copy paths and to generated assets.

### `searchData` (main)

```js
searchData.expected = ["renderJoin", "prepDest"]
```

Calls `writeSearchDataFromChunks(state.searchChunks, destRoot)` from `search.mjs`. Flattens the per-chunk entry arrays, renumbers the global `i` index sequentially, writes `assets/js/search-data.json`. Returns `{ entries, json }`. The heavy work (heading split, content sanitisation, URL encoding) ran on the workers; this task only concatenates.

### `writeAux` (main)

```js
writeAux.expected = ["writeAssets", "searchData", "flushJoin", "deriveRedirects", "deriveSitemap"]
```

In parallel:

- `writeRedirects(state.pages, state.site, destRoot, stubs)` from `redirects.mjs` --- one HTML stub per `redirect_from:` entry, each with `<script>location=…</script>` + `<meta http-equiv="refresh">` + `<link rel="canonical">` + a noscript `<a>` fallback.
- `writeSitemap(state.pages, state.site, destRoot, urls)` from `sitemap.mjs` --- `sitemap.xml` + `robots.txt` with a `Sitemap:` reference.

Returns `{ redirectStats, sitemapStats, searchStats }` (the search stats pass through from the `searchData` input).

### `writeOffline` (main, terminal)

```js
writeOffline.expected = ["writeAux", "writeAssets"]
```

Calls `writeOffline(state.pages, state.staticFiles, state.site, destRoot, { auxStats, precomputed: true, sitePaths, profileOffline })` from `offline.mjs`. With `precomputed: true`, the per-page HTML rewrite is skipped --- it was already done inside `render:i` and written by `flush:i`. This task handles the cross-cutting work: CSS `url()` rewriting, the `just-the-docs.js` AST patch (`deriveOfflineJtdJs`), the `search-data.js` wrapper (`deriveOfflineSearchDataJs`), theme assets, redirect stubs. Reads `sitePaths` from `state.sitePaths` (computed by `dispatch`).

### `writePdf` (main, terminal)

```js
writePdf.expected = ["flushJoin", "dot", "resolveBookChapters"]
```

Calls `writePdf(state.pages, state.staticFiles, state.site, destRoot, { tolerateMissingImages, highlightCss })` from `pdf.mjs`. Internally calls `assembleBook(site, pages)` from `book.mjs` for the `book.html` HTML string, writes `tb-highlight.css` from the highlight string passed in, copies `print.css` via the `staticFiles` inventory, copies every image referenced in `book.html`. Missing images throw by default; `--tolerate-missing-images` downgrades to a warning.

---

## Module export tables

The same modules as above, with the full export list per file.

### `discover.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `discover` | `(srcRoot, ignore) → Promise<{ pages, staticFiles }>` | Traverses the source tree, classifies pages vs static files, returns the two sorted arrays. |

### `nav.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `computeNav` | `(pages, config) → { navTree }` | Builds the sidebar tree, runs the integrity check (throws on orphan / ambiguous `parent:`), populates `navPath` / `navLevels` / `breadcrumbs` / `children` on each page. |

### `seo.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `computeSiteSeo` | `(config, markdown) → { seoSiteTitle, seoLogoUrl }` | Site-level SEO constants. Called by `markdownInit` on main. Requires a built markdown-it instance. |
| `computeChunkSeo` | `(pages, seoSiteTitle, config, markdown) → void` | Per-page SEO (`seoTitle` / `seoFullTitle` / `seoCanonical` / `seoIsHome`). Mutates pages in place. Called by each render worker between `renderPhase` and `templatePhase`. |
| `precomputeSeo` | `(pages, config, markdown) → { seoSiteTitle, seoLogoUrl }` | Convenience wrapper that runs both halves on the main thread. Used by dev tooling. |
| `renderTitle` | `(text, markdown) → string` | Runs one title through `markdownify → strip_html → normalize_whitespace → escape_once`. |
| `stripHtml` | `(s) → string` | Drops `<script>` / `<style>` / HTML comments, then strips remaining tag delimiters. Re-exported for `search.mjs`. |
| `absoluteUrl` | `(input, config) → string` | Composes an absolute URL from a root-relative path. |
| `relativeUrl` | `(input, config) → string` | Prepends `config.baseurl` to a root-relative path. |

### `book.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `loadBookData` | `(srcRoot) → Promise<object\|null>` | Back-compat wrapper around the `data.mjs` loader. |
| `resolveBookChapters` | `(bookData, pages) → void` | Resolves `_book.yml` chapter selectors to `Page[]` references; sets `_chapters` / `_landing` / `_foreword` in place. |
| `sortByNavOrder` | `(input) → Page[]` | Group-by-owning-index sort: index pages first, then by `nav_order` ascending with title tie-breaker. |
| `chapterAnchorFromUrl` | `(url, fallbackTitle?) → string` | Page URL → `ch-…` anchor slug. |
| `bookChapterTransform` | `(body, baseurl, headingShiftN, chapterAnchor) → string` | Five per-chapter body transforms: baseurl-strip, `<details>` unwrap, whitespace-`<span>` wrap for pagedjs, heading shift, chapter-anchor prefixing. |
| `assembleBook` | `(site, pages) → string` | Phase 8 entry. Returns the assembled `book.html` string. |
| `rewriteBookHrefs` | `(html, site, pages) → string` | Rewrites intra-book absolute `href="/X"` references to `href="#ch-X"` fragment anchors. |

### `build-info.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `captureBuildInfo` | `() → Promise<{ commit, commitDate }>` | Two parallel `git` shell-outs. Returns `"unknown"` on failure. |

### `data.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `loadData` | `(srcRoot) → Promise<object>` | Returns `{ book: <parsed YAML> }`, or `{}` when `_book.yml` is absent. |

### `dot.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `regenerateDot` | `(srcRoot) → Promise<{ processed, regenerated, failed, setupSkipped?, svgFiles }>` | Regenerates stale `.dot` → `.svg` via the WASM build of Graphviz (`@hpcc-js/wasm-graphviz`). `svgFiles` is the appendable static-file descriptor list. |

### `scss.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `compileLightScss` | `(srcRoot) → Promise<{ css? , failed? }>` | Compiles the SCSS entry against the light palette. |
| `compileDarkScss` | `(srcRoot) → Promise<{ css? , failed? }>` | Compiles against the dark palette. Run in parallel with `compileLightScss`. |

### `render.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `renderPhase` | `(pages, site, staticFiles?) → Promise<void>` | Renders each page's `rawContent` to `renderedContent` via the supplied site's markdown-it. Skips `layout: book-combined`. |
| `createMarkdownIt` | `({ highlighter, linkTables, baseurl, staticFiles, svgContents? }) → MarkdownIt` | Builds the configured markdown-it instance. `svgContents` is a `Map<srcRel, string>` of pre-read SVG file contents; when present, the `svgInlinePlugin` replaces `<img>` tags for matching `.svg` sources with inline SVG wrappers. See [Extending](Extending) for the plugin list and ordering. |
| `initHighlighter` | (re-export from `highlight.mjs`) | `() → Promise<object>`. Initialises Shiki with the bundled twinBASIC grammar. |
| `buildLinkTables` | `(pages) → { byPath, byUrl, byRedirect }` | Map lookups keyed by `srcRel`, `permalink`, and `redirect_from` entries. |
| `serializeLinkTables` | `(lt) → { byPath, byUrl, byRedirect }` | Serializes the Maps to `[key, permalink]` pair arrays for structured-clone transfer to workers. |
| `kramdownSlug` | `(text) → string` | Header-id slugify: lowercase, drop characters outside `\p{L}\p{N}\p{M}\p{Pc}\-`, replace spaces with `-`, deduplicate. |
| `svgInlinePlugin` | `(md, ctx) → void` | markdown-it plugin. Overrides the image renderer: when the `src` ends in `.svg` and its content exists in `ctx.svgContents`, replaces the `<img>` with an inline SVG wrapper (via `buildSvgWrapper`) and sets `page.hasSvg = true`. Non-matching images fall through to the default renderer. Registered last in the plugin chain. |
| `buildSvgWrapper` | `(svgContent, alt, stem, srcRel) → string` | Returns the `<div class="svg-inline-wrap">` HTML structure containing the SVG controls (download/copy SVG and PNG) and the `<div class="svg-container">` with the raw SVG content. |
| `rewriteAdmonitions` | `(src) → string` | GFM admonition rewrite to the `markdown-alert markdown-alert-<type>` class structure with the five SVG octicons. |

### `highlight.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `initHighlighter` | `() → Promise<{ render, themeCss }>` | Initialises Shiki, loads the bundled twinBASIC grammar, returns a `render(code, lang)` function plus the loaded theme CSS. |

### `highlight-theme.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `loadHighlightTheme` | `(themesDir?) → Promise<{ scopeToClass, css }>` | Reads the `.theme` files, groups TextMate-scope tokens by their (light-props, dark-props) pair, assigns one CSS class per unique pair, returns the scope-to-class lookup + generated CSS. |

### `template.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `templatePhase` | `(pages, site, initData) → Promise<void>` | Wraps each page's `renderedContent` in the just-the-docs layout, runs `compressHtml`, stores the result in `page.html`. Skips `layout: book-combined`. |
| `buildInitConfig` | `(site) → object` | Pre-renders the config-only chrome (SVG sprites, header, search footer, favicon, GA). Called by the `buildInit` task. |
| `buildInitFn` | (alias of internal `buildInit`) | Available for harnesses; combines `buildInitConfig` + `renderSidebar` in one call. |
| `renderSidebar` | `(site) → string` | Pre-renders the sidebar HTML. Called by the `nav` task; the output is folded into the shared payload by `dispatch`. |
| `navActivationCss` | `(page) → string` | Per-page `<style id="jtd-nav-activation">` block. |
| `injectAnchorHeadings` | `(html) → string` | Adds `<a class="anchor-heading">` next to every heading with an `id`. |

### `compress.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `compressHtml` | `(html) → string` | Whitespace compression outside `<pre>` blocks. Uses the explicit `[ \t\n\r\f\v]+` class to preserve `&nbsp;`-based indentation. |

### `write.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writePhase` | `(pages, staticFiles, { destRoot, dryRun?, generatedAssets?, baseurl?, skipPages? }) → Promise<stats>` | Materialises the page set, vendored theme, project static files, and generated CSS. `skipPages: true` for `writeAssets`, since `flush:i` already wrote the pages. |
| `prepareDestinations` | `(roots, dryRun) → Promise<void>` | Deletes and recreates each path in `roots`. Called by `prepDest` over `[destRoot, destRoot+"-offline", destRoot+"-pdf"]`. |
| `preparePageDirs` | `(pages, staticFiles, destRoot, offlineRoot) → Promise<void>` | Pre-creates every page output directory on both trees. Called by `prepPageDirs` so `flush:i` skips `mkdir`. |
| `WRITE_LIMIT` | `64` | Concurrency ceiling for `runLimited`. |
| `isUnderProject` | `(destRoot) → boolean` | Guard against destructive `--dest` values. Used by `writeOffline` and `writePdf`. |
| `assertNoDestinationCollisions` | `(pages, staticFiles) → void` | Throws when a static file's `destRel` would overwrite a page's `destPath`. |
| `mkdirRec` | `(dir) → Promise<void>` | Recursive `mkdir` with in-flight deduplication cache. |
| `runLimited` | `(items, limit, fn) → Promise<void>` | Concurrency-limited per-item runner. |
| `writeFileMkdirp` | `(filePath, content) → Promise<void>` | Writes a file, creating parent directories as needed. |
| `safeWrite` | `(dest, fn) → Promise<void>` | Wraps a write callback and re-throws with `dest` in the error message. |

### `paths.mjs`

| Symbol | Signature | Description |
|---|---|---|
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
| `extractSitemapUrls` | `(xml) → string[]` | Parses an existing `sitemap.xml` string. Useful for diffing two builds. |
| `renderRobotsTxt` | `(config) → string` | Returns the `robots.txt` content string. |

### `search.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writeSearchData` | `(pages, site, destRoot) → Promise<{ entries, json }>` | Main-thread single-pass derivation + write. Used by dev tooling. |
| `writeSearchDataFromChunks` | `(searchChunks, destRoot) → Promise<{ entries, json }>` | Per-chunk consolidator. Flattens, renumbers global `i`, writes `assets/js/search-data.json`. Used by the `searchData` task. |
| `deriveSearchEntries` | `(pages, site) → object[]` | Pure compute. One entry per heading-bounded section of each titled page. Each entry: `{ i, doc, title, content, url, relUrl, sourcePage }`. Called by render workers; the worker drops `sourcePage` and chunk-local `i` from the returned objects before posting back. |
| `renderEntryString` | `(entry) → string` | Per-entry JSON shape matching the upstream template output byte-for-byte. |

### `offline.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writeOffline` | `(pages, staticFiles, site, destRoot, { auxStats?, profileOffline?, precomputed?, sitePaths? }) → Promise<stats>` | Offline tree writer. `precomputed: true` skips per-page HTML rewriting (use the pre-computed `page.offlineHtml` from render workers); `sitePaths` skips the `_site/assets/` walk. |
| `buildOfflineState` | `(pages, staticFiles, site, destRoot, { stubs?, sitePaths? }) → Promise<OfflineState>` | Constructs the rewrite-state object (site-path set, resolution caches, per-directory nav caches). |
| `enumerateVendoredThemeAssets` | `() → string[]` | Lists the relative paths under `builder/vendor/just-the-docs/assets/`. Used by `dispatch` to build the site-paths set without traversing `_site/`. |
| `deriveOfflineJtdJs` | `(src) → string` | AST-based patcher: replaces `navLink` and `initSearch` in `just-the-docs.js` with offline-compatible implementations via `acorn`. A parse failure at build time signals that re-extraction produced something acorn cannot read. |
| `deriveOfflineSearchDataJs` | `(jsonBytes) → string` | Wraps `search-data.json` as `window.SEARCH_DATA = …` and minifies. `<script src=>` cannot fetch JSON under `file://`. |
| `deriveOfflinePage`, `deriveOfflineRedirect`, `deriveOfflineCss` | (re-exported from `offline-rewrite.mjs`) | Pure-compute helpers used by both the offline writer and the worker render handler. |

### `offline-rewrite.mjs`

Pure-compute rewrite helpers extracted from `offline.mjs` so they can be imported by `cpu-worker.mjs` without pulling in `node:fs` or `acorn`.

| Symbol | Signature | Description |
|---|---|---|
| `buildSitePathsSync` | `(pages, staticFiles, excludePatterns, stubs, themeAssetRels) → Set<string>` | Synchronous version of `buildSitePaths`. Takes an explicit theme-asset list instead of traversing `_site/assets/`. Used by `dispatch`. |
| `deriveOfflinePage` | `(page, state) → { html, misses }` | Rewrites one page's HTML for offline use: strips SEO metadata, rewrites every absolute URL to a page-relative path, injects the offline search setup script. |
| `deriveOfflinePageCached` | `(page, deps) → { html, misses }` | Cached variant. Uses `state.navCache` to substitute the pre-rewritten sidebar nav block, avoiding a full regex pass over the ~80 KB sidebar on each page. |
| `sliceNavBlock` | `(html) → { before, nav, after } \| null` | Splits a page's HTML into the segments before, within, and after the sidebar nav block. |
| `deriveOfflineCss` | `(cssIn, themeRel, state) → { css, misses }` | Rewrites `url()` references in a CSS file to page-relative paths. |
| `deriveOfflineRedirect` | `(stub, state) → string` | Rewrites a redirect stub's HTML for offline use. |
| `offlineExcluded` | `(rel, patterns) → boolean` | Returns `true` when a site-relative path matches any `offline_exclude` glob from `_config.yml`. |
| `normalizeBaseurl` | `(raw) → string` | Normalises a baseurl string to the canonical trailing-slash form. |
| `posixDirname` | `(rel) → string` | POSIX directory component of a relative path. |
| `fileDirSegsFromRel` | `(rel) → string[]` | Splits a destination path into directory segments. |
| `fnmatchPathname` | `(pattern, path) → boolean` | Glob-style pathname match. |
| `computeRelative`, `resolveRaw`, `computeRelUrl`, `buildSegs`, `decode`, `escapeRegExp`, `getPageCache`, `stripSeo`, `rewriteHtml`, `rewriteCss`, `injectSearchSetup` | various | Internal helpers; see [`offline-rewrite.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline-rewrite.mjs) for the per-symbol descriptions. |

### `pdf.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `writePdf` | `(pages, staticFiles, site, destRoot, { tolerateMissingImages?, highlightCss }) → Promise<stats>` | Writes the `_site-pdf/` source tree: `book.html` + `tb-highlight.css` + `print.css` + referenced images. |
| `deriveBookOutputs` | `(pages, site) → { bookHtml, images }` | Pure compute. Returns the assembled HTML and image-path list. |
| `extractImagePaths` | `(html) → string[]` | Extracts all `src` / `href` paths from an HTML string. |

### `scheduler.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `SharedState` | class | `pages[]`, `staticFiles[]`, `site`, `pageByDest`, `searchChunks`. Created by the `Scheduler` constructor. |
| `Scheduler` | class | Main-thread side of the pull scheduler. Constructor: `{ pool, tasks, views, idMapping, ganttSections }`. Methods: `start(ctx)` (returns the results promise), `addDynamicTasks(count)`, `summary()`. Event hooks (`_onWorkerDone`, `_onWorkerError`, `_onPerWorkerTiming`, `_onMainTaskReady`) are wired by the orchestrator. |

### `worker-pool.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `WorkerPool` | class | Constructor: `(size, workerUrl)`. Methods: `sendInit(sab, ctx, idMapping)` (broadcasts the init message; increments `_buildCount`), `broadcastDynamicData(payloadSAB, sharedSAB)`, `destroy()`. Public fields: `bootTimings[]`, `_buildCount` (read by `runBuild` to detect serve-mode rebuilds). Callbacks (`onWorkerDone`, `onWorkerError`, `onPerWorkerTiming`, `onMainTaskReady`) are wired by the caller. |

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
| `advanceFirstReady` | `(views, taskIdx) → void` | Optimisation: low-water-mark advance so subsequent scans skip the prefix of `DONE` slots. |
| `allocDynamicSlots` | `(views, idMapping, count) → number` | Reserves `count` consecutive slot indices from the dynamic pool. Returns the base index. |
| `wireDynamicEdges` | `(views, edges) → void` | Writes successor edges for dynamic tasks. Each `edges[i]` is `{ from, to: [taskIdx, ...] }`. |
| `appendDynamicSuccessors` | `(views, edges) → void` | Appends successor edges to *existing* tasks. Used to wire `prepPageDirs → flush:0..N-1` without disturbing `prepPageDirs`'s static successors. |
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
| `renderGantt` | `(grouped) → string` | Inline SVG Gantt chart from a `Map<section, taskTiming[]>`. Lane rows compress all worker tasks for one lane into a single row; section rows show one task per row. Theme-aware (light + dark palettes). |

### `serve.mjs`

| Symbol | Signature | Description |
|---|---|---|
| `runServe` | `(opts) → Promise<void>` | Long-lived dev server. Initial one-shot build, then HTTP + recursive watcher + SSE reload. The worker pool is constructed once and reused across rebuilds. Writes to `<srcRoot>/_serve/`. Skips the offline + PDF passes by default. |

### `tbdocs.mjs` orchestrator

| Symbol | Signature | Description |
|---|---|---|
| `runBuild` | `(opts) → Promise<{ pages, staticFiles, site, destRoot }>` | Runs the full pipeline. Allocates the SAB, spawns or reuses the pool, sends `init` to every worker, awaits `scheduler.start(ctx)`, logs the summary, injects the Gantt chart, returns the final state. |
| `createWorkerPool` | `() → WorkerPool` | Factory for `serve.mjs`. Lets the dev server construct one pool at startup and pass it to every `runBuild()` call without importing `WorkerPool` itself. |
| `makeTimer` | `() → { lap(label), summary() }` | Lightweight lap timer. |

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
| `serve` | `false` | Start the dev server instead of the one-shot build. |
| `port` | `4000` | HTTP port for serve mode. |
| `pool` | `null` | Optional external `WorkerPool`. Set by `serve.mjs` to reuse the pool across rebuilds. |

## See Also

- [tbdocs Builder](Builder) -- architecture overview and narrative design rationale.
- [Book Configuration](Book-Configuration) -- `_book.yml` key reference.
- [Extending the Builder](Extending) -- tutorial for adding a new task or markdown-it plugin.
