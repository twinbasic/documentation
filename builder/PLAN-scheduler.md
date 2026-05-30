# Task-graph scheduler -- design sketch

## Current state

The build pipeline lives in `builder/`. The orchestrator is
`tbdocs.mjs`'s `runBuild()`, which today is a mostly-linear sequence of
awaited async calls on the main thread, with a sprinkling of
cooperative concurrency (`Promise.all` barriers and one background
`buildInfoPromise`). There are **no worker threads**; every CPU-bound
phase blocks the main thread.

An earlier round of parallelization work (a `CheckPool` of persistent
link-checker workers and a bespoke `render-worker.mjs` driven by a
hand-coded message protocol) was reverted; this plan replaces both
with one task-graph abstraction.

### Key files

| File | Role |
|---|---|
| `tbdocs.mjs` | Orchestrator: `runBuild()`, CLI parsing, summary output |
| `template.mjs` | `templatePhase()`, internal `buildInit()` |
| `render.mjs` | `renderPhase()`, `createMarkdownIt()`, `buildLinkTables()` |
| `highlight.mjs` | `initHighlighter()` -- Shiki WASM init |
| `discover.mjs` | `discover()` -- walk source tree, parse frontmatter |
| `nav.mjs` | `computeNav()` -- build nav tree from pages |
| `seo.mjs` | `precomputeSeo()` -- derive SEO titles/URLs |
| `book.mjs` | `resolveBookChapters()` -- resolve book chapter list |
| `build-info.mjs` | `captureBuildInfo()` -- git rev-parse/log |
| `scss.mjs` | `compileScss()` -- sass compilation |
| `mermaid.mjs` | `regenerateMermaid()` -- stale SVG regen via puppeteer |
| `data.mjs` | `loadData()` -- load `_book.yml` |
| `write.mjs` | `writePhase()` -- write pages + static files to `_site/` |
| `redirects.mjs` | `deriveRedirectStubs()`, `writeRedirects()` |
| `sitemap.mjs` | `deriveSitemapUrls()`, `writeSitemap()` |
| `search.mjs` | `writeSearchData()` |
| `offline.mjs` | `writeOffline()` -- produce `_site-offline/` |
| `pdf.mjs` | `writePdf()` -- produce `_site-pdf/` |
| `serve.mjs` | `runServe()` -- dev server with watcher + rebuild |

There is no `render-worker.mjs`, no `cpu-worker.mjs`, no `CheckPool`,
no `createRenderPool()`. The build is single-threaded except for I/O.

### Current dataflow

`runBuild()` reads top-to-bottom; the only off-main-thread work is the
git shell-outs inside `captureBuildInfo()` (launched as a background
promise and awaited later). Approximate wall-clock numbers from a
recent clean build are noted in parentheses:

```
mermaid (~2 ms; ~150 ms when SVGs regenerate)
   ↓
scss (~700 ms — CPU-bound on main thread)
   ↓
load _config.yml + apply CLI overrides
   ↓
buildInfoPromise = captureBuildInfo()    (background: git shell-outs)
   ↓
discover (~135 ms — fs traversal + frontmatter parse)
   ↓
nav (~8 ms)
   ↓
initHighlighter (~50–100 ms — Shiki WASM init; overlaps with buildInfo)
   ↓
buildLinkTables + createMarkdownIt + precomputeSeo + loadData
+ resolveBookChapters (~110 ms together — "markdown-init" + "seo" + "book")
   ↓
await buildInfoPromise (~0 ms; usually already settled)
   ↓
renderPhase (~2700 ms — CPU-bound; cooperative Promise.all over pages)
   ↓
templatePhase (~800 ms — CPU-bound; same shape)
   ↓
writePhase
   ├─ Promise.all { writePages | copyTheme | copyStaticFiles }
   └─ writeGeneratedAssets    (~625 ms total)
   ↓
Promise.all { writeRedirects, writeSitemap, writeSearchData }  (~200 ms)
   ↓
writeOffline (~1100 ms)
   ↓
writePdf (~240 ms)
```

Wall-clock total is roughly **6.7 seconds**. The dominant terms are
`render` (~2.7 s), `writeOffline` (~1.1 s), `template` (~0.8 s),
`scss` (~0.7 s), and `write` (~0.6 s).

Visible idle time on the main thread:

- `scss` and `mermaid` run before `discover`, both serially. Neither
  depends on `discover`'s output.
- `buildInfo`'s git shell-outs already overlap with the
  discover/nav/markdown-init/seo chain, but everything *else* in that
  chain runs serially even though `discover` → `nav` →
  `markdown-init` → `seo` → `book` is the only true dependency edge.
- `writeOffline` and `writePdf` are independent of each other; both
  read `_site/` (already written by `writePhase`) and write into
  independent output trees. They run sequentially today.
- `renderPhase` and `templatePhase` are CPU-bound and block the main
  thread completely. `Promise.all(pages.map(...))` is cooperative
  concurrency only -- it interleaves on a single thread.

### Data shapes and in-place mutation

The two large structures that flow through the pipeline:

**`pages[]`** -- array of ~857 page objects. After discover, each has:
```
{ srcPath, srcRel, ext, frontmatter, rawContent, permalink, destPath,
  layoutDefault, imageScope }
```
Later phases mutate **in place**, adding: `navPath`, `breadcrumbs`,
`children`, `navLevels` (nav); `seoTitle`, `seoFullTitle`,
`seoCanonical`, `seoIsHome` (seo); `renderedContent` (render);
`html` (template). The current pipeline relies on this in-place
enrichment -- every consumer assumes the same page object accumulates
fields as it flows through phases.

**`staticFiles[]`** -- array of ~214 static file descriptors:
```
{ srcPath, srcRel, destRel, size }
```

**`config`** -- the parsed `_config.yml` object. Small, ~30 keys.
Read-only after initial CLI override merges.

**`navTree`** -- array of `NavNode` objects (recursive tree). ~857
nodes total. Only consumed by `buildInit()` → `renderSidebar()`.

The mutation-in-place pattern matters for the scheduler design:
mutations performed on a worker's structured-clone copy do not reach
the main-thread master unless explicitly merged. See §Page deltas
below.

## Setup

No new runtime dependencies. The scheduler, the worker pool, and the
worker dispatcher are all in-tree code -- ~150 LOC for the scheduler,
~50 LOC for `WorkerPool`, ~30 LOC for the worker dispatcher and its
handler table. A general-purpose pool library like **piscina** was
considered but the project's use is narrow enough (fixed pool size,
one task per worker at a time, no recycling, no dynamic scaling, no
abort signals) that the dependency cost outweighs the saved code, and
an added dep widens the supply-chain attack surface.

## Model

The build is a DAG of **tasks**. Each task has a unique string ID,
takes an input map `{ [predecessorId]: output }`, produces an immutable
output, and declares which downstream tasks receive (slices of) that
output.

The **scheduler** lives on the main thread. It tracks task
dependencies, decides what's ready, and dispatches. The worker pool
(`WorkerPool` -- a ~50 LOC in-tree class wrapping
`node:worker_threads`) handles everything below the task-graph layer:
spawning workers at construction, named dispatch, idle/busy
bookkeeping, lifecycle.

Each task carries a `runOnMain: true` flag if it must execute on the
main thread -- for tasks that own the master `pages[]` merge, mutate
state in place, or do I/O that coordinates with main-thread state.
All other tasks run on a worker, dispatched by name.

```
┌─────────────────────────────────────────────────┐
│  Main thread (scheduler)                        │
│                                                 │
│  tasks:    Map<taskId, TaskDef>                 │
│  pending:  Map<taskId, {expected, received}>    │
│  ready:    TaskDef[]                            │
│  results:  Map<taskId, output>                  │
│  state:    SharedState   (§Shared state)        │
│                                                 │
│  on task complete:                              │
│    store result, run task.submit() to route     │
│    output to downstream tasks, check newly      │
│    ready, dispatch each to pool or main         │
└────────────┬────────────────────────────────────┘
             │
             ▼  WorkerPool ── named handlers in cpu-worker.mjs
```

## Task placement (main vs worker)

Mutating a worker's local `pages[]` doesn't reach `state.pages` unless
the mutation is explicitly shipped back as a delta. The current code
mutates pages in place across nav / seo / render / template, so every
mutating step must be modeled deliberately. The cheap way out is:
**keep small mutating steps on the main thread** and only ship pages
across the boundary when there's a real CPU win to amortize the copy.

The split:

| Task | Placement | Why |
|---|---|---|
| `config` | M | Trivial fs read, no benefit to round-trip |
| `discover` | M | ~135 ms; output mutates pages[] in place |
| `nav` | M | ~8 ms; mutates pages with navPath/navLevels/breadcrumbs/children |
| `markdownInit` | M | ~63 ms; produces an `md` instance (NOT serializable -- can't cross boundary) |
| `seo` | M | ~34 ms; mutates pages with seoXxx fields |
| `loadData` | M | Trivial fs read |
| `resolveBookChapters` | M | Mutates `state.site.bookData._chapters` with refs into `state.pages` -- identity-critical |
| `buildInit` | M | Tiny; consumes navTree, produces ~50 KB of html strings |
| `deriveRedirects` | M | Pure compute, ~ms |
| `deriveSitemap` | M | Pure compute, ~ms |
| `dispatch` | M | Slices `state.pages` into render chunks; no benefit on a worker |
| `renderJoin` | M | Pure barrier |
| `write` | M | Owns `state.pages` + `state.staticFiles` reads; I/O dominated |
| `searchData` | M | ~40 ms; owns pages read |
| `writeAux` | M | Owns pages + bookData reads |
| `writeOffline` | M | I/O dominated (~1.1 s); see §Post-write tasks for the workerize-or-not call |
| `writePdf` | M | I/O dominated (~240 ms); ditto |
| `buildInfo` | **W** | Free overlap with the main spine |
| `scss` | **W** | ~700 ms -- the biggest seed-task parallelism win |
| `mermaid` | **W** | ~2 ms idle, ~150 ms when SVGs regen; runs concurrently with discover |
| `render:i` | **W** | The big win -- ~2.7 s of CPU work fans out across N cores |

The worker side ships with four handlers: `scss`, `mermaid`,
`buildInfo`, `render`. Plus the parentPort dispatcher (~15 LOC).
Everything else is plain main-thread code wrapped in a task envelope.

This keeps `pages[]` from crossing the worker boundary except for the
render fan-out (which only ships per-page slices, not the master).
The seo / nav / markdown-init mutations stay on the main-thread
master directly -- no delta merge needed.

## Target dataflow

`[W]` = pool worker; `[M]` = main thread (`runOnMain: true`).

```
Seeds (concurrent):
  buildInfo  [W] ──────────────────────────────────────────┐
  scss       [W] ──────────────────────────────────────────┤
  mermaid    [W] ──────────────────────────────────────────┤
  prepDest   [M] ──────────────────────────────────────────┤
                                                           │
Main spine (sequential, on M):                             │
  config                                                   │
    └─→ discover ──┬─→ deriveRedirects ─────────────────┐  │
                   ├─→ deriveSitemap   ─────────────────┤  │
                   └─→ nav                              │  │
                         └─→ markdownInit               │  │
                               ├─→ seo                  │  │
                               │     └─→ loadData       │  │
                               │           └─→ resolveBookChapters
                               │                  ↓     │  │
                               └─→ buildInit      │     │  │
                                       ↓          │     │  │
                                       └──────────┴─→ dispatch  ◄── buildInfo joins here
                                                       │
Render fan-out (workers, concurrent):                  │
  ┌────────────────────────────────────────────────────┘
  │
  render:0 [W]    render:1 [W]   ...   render:N-1 [W]
                          │
                          ▼
                 renderJoin [M]  ◄── waits for all render:i
                          │
Write fence:              │     scss [W], mermaid [W], prepDest [M] join here too
                          ▼
                       write [M]                      ◄── reads state.pages, state.staticFiles
                          │
                          ▼
                    searchData [M]
                          │
                          ▼
                     writeAux [M]                     ◄── derived redirects + sitemap join here
                          │
                          ▼
                   writeOffline [M]

              (in parallel with write → ... → writeOffline:)

                 renderJoin + mermaid
                          │
                          ▼
                     writePdf [M]
            │                           │
            └─────────────┬─────────────┘
                          ▼
                        done
```

Edges into `dispatch`: `buildInit`, `resolveBookChapters`,
`buildInfo`.  
Edges into `write`: `renderJoin`, `scss`, `mermaid`, `prepDest`.  
Edges out of `write`: `searchData`.  
Edges into `writePdf`: `renderJoin`, `mermaid`.  
Edges into `writeAux`: `searchData`, `deriveRedirects`, `deriveSitemap`.

Three structural wins over the serial baseline:

1. **`scss`, `mermaid`, `buildInfo` overlap with the main spine.** The
   main spine (discover → nav → markdownInit → seo → loadData →
   resolveBookChapters + buildInit) takes ~250 ms total. `scss` takes
   ~700 ms. The overlap saves ~250 ms of `scss` from the critical path
   (not the full ~700 ms -- after the spine finishes, ~450 ms of scss
   is still on the critical path until `write` runs).
2. **`render:0..N` fans out across CPUs.** Today's ~2.7 s of cooperative
   render + ~0.8 s template = ~3.5 s of CPU work, all on one thread.
   Across N workers this compresses to ~`3500 / N + dispatch overhead`.
   On a 4-core box, ~875 ms wall-clock (saving ~2.6 s). On an 8-core
   box, ~440 ms (saving ~3 s). Dispatch overhead is ~50 ms.
3. **`writeOffline` and `writePdf` overlap on async I/O.** Both stay
   `runOnMain` initially -- they share the main thread for their CPU
   sections but `await fs.writeFile`-style I/O windows interleave. The
   gain is the shorter of their two CPU sections (~240 ms). See
   §Post-write tasks for the case to workerize one of them later.

**Mermaid → staticFiles ordering.** Under the scheduler `mermaid` and
`discover` run in parallel, so freshly-emitted SVGs aren't in
`state.staticFiles` after discover. The mermaid task's `execute()`
(running on a worker) does the full `fs.stat` for each managed SVG
and returns a list of `{ srcPath, srcRel, destRel, size }` descriptors;
the `submit()` does only a **synchronous** push into
`state.staticFiles`. Putting the stat in `submit()` would race with
downstream consumers since `submit` is called synchronously by the
scheduler and cannot await.

## Page deltas (mutation merge pattern)

The render fan-out is the only place where pages cross the worker
boundary. The pattern:

- Each `render:i` task receives a chunk of pages (worker's clone).
- The worker mutates its local pages with `renderedContent` and `html`.
- The task returns a **delta**: an array of
  `[{ destPath, renderedContent, html }]` -- only the changed fields,
  keyed by `destPath`.
- `render:i.submit()` walks the delta on the main thread, looks up
  each page via `state.pageByDest`, and assigns the fields onto the
  master page object.

The full pages array never crosses back across the boundary; only the
output deltas do. `state.pageByDest` is built once in
`discover.submit()`:

```js
discover.submit(out, emit, state) {
  state.pages       = out.pages;
  state.staticFiles = out.staticFiles;
  state.site.config = out.config;
  for (const p of out.pages) state.pageByDest.set(p.destPath, p);
  emit("nav", out);
  emit("deriveRedirects", out);
  emit("deriveSitemap",   out);
}
```

After this initial assignment, `state.pages` is mutated in place;
no task ever replaces it. `state.pageByDest` stays valid for the
whole build.

For tasks that run on `[M]` (nav, seo, etc.), the mutation is direct
on `state.pages` -- no delta needed.

## Task definition

Each task is a plain object:

- **`expected`**: array of predecessor task IDs. The scheduler runs
  the task only when every expected ID has submitted its output. An
  empty array means a seed task (dispatchable immediately).
- **`handler`** *(optional, worker tasks)*: the worker dispatcher's
  named handler. Defaults to the task's own ID. Used so multiple task
  IDs can share one worker function
  (e.g. `render:0`, `render:1`, ... → `"render"`).
- **`runOnMain: true`** *(optional)*: execute on the main thread
  instead of dispatching to the pool. The `execute()` function
  receives `(inputs, ctx, state)` -- where `state` is the
  `SharedState` instance -- and may mutate it.
- **`execute(inputs, ctx [, state])`**: runs the task body. On a
  worker, runs as the dispatch table's named handler. On main, runs
  synchronously through the scheduler. Returns an output value.
- **`submit(output, emit [, state, scheduler])`**: runs **synchronously**
  on the main thread after `execute` resolves. Calls
  `emit(targetTaskId, dataSlice)` to route (slices of) the output to
  downstream tasks. May mutate `state`. May not perform async work --
  see §Scheduler core. The optional `scheduler` arg is used only by
  tasks that dynamically register downstream tasks (see `dispatch`).

Representative task defs:

```js
const TASKS = {
  config: {
    expected: [],
    runOnMain: true,
    async execute(_, ctx) {
      const text = await fs.readFile(
        path.join(ctx.srcRoot, "_config.yml"), "utf8");
      const config = yaml.load(text);
      if (ctx.opts.baseurl != null) config.baseurl = ctx.opts.baseurl;
      if (ctx.opts.url != null) config.url = ctx.opts.url;
      return { config };
    },
    submit(out, emit) { emit("discover", out); },
  },

  buildInfo: {
    expected: [],
    async execute() { return { buildInfo: await captureBuildInfo() }; },
    submit(out, emit) { emit("dispatch", out); },
  },

  scss: {
    expected: [],
    async execute(_, ctx) { return { scssResult: await compileScss(ctx.srcRoot) }; },
    submit(out, emit) { emit("write", out); },
  },

  mermaid: {
    expected: [],
    async execute(_, ctx) {
      // The worker stats every managed SVG and returns full descriptors.
      // Stat-in-submit on main would race with downstream readers.
      const stats = await regenerateMermaid(ctx.srcRoot);
      // stats.svgFiles: [{ srcPath, srcRel, destRel, size }, ...]
      return { mermaidStats: stats };
    },
    submit(out, emit, state) {
      const known = new Set(state.staticFiles.map((f) => f.srcRel));
      for (const f of out.mermaidStats.svgFiles ?? []) {
        if (!known.has(f.srcRel)) state.staticFiles.push(f);
      }
      emit("write", out);
    },
  },

  discover: {
    expected: ["config"],
    runOnMain: true,
    async execute({ config: { config } }, ctx) {
      const { pages, staticFiles } = await discover(
        ctx.srcRoot, config.exclude ?? []);
      return { pages, staticFiles, config };
    },
    submit(out, emit, state) {
      state.pages       = out.pages;
      state.staticFiles = out.staticFiles;
      state.site.config = out.config;
      for (const p of out.pages) state.pageByDest.set(p.destPath, p);
      emit("nav",             out);
      emit("deriveRedirects", out);
      emit("deriveSitemap",   out);
    },
  },

  nav: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      const { navTree } = computeNav(state.pages, state.site.config);
      state.site.navTree = navTree;
      return {};                              // mutates state in place
    },
    submit(_, emit) {
      emit("markdownInit", {});
      emit("buildInit",    {});
    },
  },

  buildInit: {
    expected: ["nav"],
    runOnMain: true,
    execute(_, ctx, state) {
      // buildInit() takes site.config + site.navTree; returns the
      // ~50 KB of pre-rendered sidebar + header + svg-sprite HTML used
      // by templatePhase.
      return { initData: buildInitFn(state.site) };
    },
    submit(out, emit) { emit("dispatch", out); },
  },

  markdownInit: {
    expected: ["nav"],
    runOnMain: true,
    async execute(_, ctx, state) {
      // Main's own initHighlighter cache -- workers maintain theirs
      // independently. Both call paths converge on the same Shiki
      // initialisation work, but the singletons are per-thread.
      const highlighter = await initHighlighter();
      const linkTables  = buildLinkTables(state.pages);
      const baseurl     = String(state.site.config.baseurl || "");
      const staticFileSet = new Set(state.staticFiles.map(s => s.srcRel));
      state.site.highlighter = highlighter;        // write reads .themeCss from here
      state.site.markdown    = createMarkdownIt({
        highlighter, linkTables, baseurl, staticFiles: staticFileSet,
      });
      // linkTables travels to render workers as a serialized payload.
      state.site.linkTablesSerialized = serializeLinkTables(linkTables);
      return {};
    },
    submit(_, emit) {
      emit("seo",      {});
      emit("loadData", {});
    },
  },

  seo: {
    expected: ["markdownInit"],
    runOnMain: true,
    execute(_, ctx, state) {
      const { seoSiteTitle, seoLogoUrl } = precomputeSeo(
        state.pages, state.site.config, state.site.markdown);
      state.site.seoSiteTitle = seoSiteTitle;
      state.site.seoLogoUrl   = seoLogoUrl;
      return {};
    },
    submit(_, emit) { emit("resolveBookChapters", {}); },
  },

  loadData: {
    expected: ["markdownInit"],
    runOnMain: true,
    async execute(_, ctx, state) {
      const data = await loadData(ctx.srcRoot);
      state.site.data     = data;
      state.site.bookData = data.book ?? null;
      return {};
    },
    submit(_, emit) { emit("resolveBookChapters", {}); },
  },

  resolveBookChapters: {
    expected: ["seo", "loadData"],
    runOnMain: true,
    execute(_, ctx, state) {
      // Mutates state.site.bookData with _chapters arrays whose
      // entries are refs into state.pages. Identity-critical:
      // render:i.submit() merges renderedContent into those same
      // page objects, so writePdf later sees the rendered bodies
      // via bookData._chapters[i].renderedContent.
      resolveBookChapters(state.site.bookData, state.pages);
      return {};
    },
    submit(_, emit) { emit("dispatch", {}); },
  },

  deriveRedirects: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      // redirects.mjs's deriveRedirectStubs uses a layout-based
      // filter (layout !== "book-combined") rather than checking
      // page.html, so the derive can run before template.
      return { stubs: deriveRedirectStubs(state.pages, state.site) };
    },
    submit(out, emit) { emit("writeAux", out); },
  },

  deriveSitemap: {
    expected: ["discover"],
    runOnMain: true,
    execute(_, ctx, state) {
      return { urls: deriveSitemapUrls(state.pages, state.site) };
    },
    submit(out, emit) { emit("writeAux", out); },
  },

  dispatch: {
    expected: ["buildInit", "resolveBookChapters", "buildInfo"],
    runOnMain: true,
    execute({ buildInit: { initData }, buildInfo: { buildInfo } }, ctx, state) {
      // Read pages directly from state.pages -- main-thread access,
      // no need to ship them through the input map.
      const chunks = chunkPages(state.pages, ctx.workerCount);
      const shared = {
        siteData: {
          config:       state.site.config,
          seoSiteTitle: state.site.seoSiteTitle,
          seoLogoUrl:   state.site.seoLogoUrl,
        },
        initData, buildInfo,
        linkTablesData: state.site.linkTablesSerialized,
        staticFilesArr: state.staticFiles.map(f => f.srcRel),
        baseurl:        String(state.site.config.baseurl || ""),
      };
      // Pack the shared payload into a SharedArrayBuffer so each
      // postMessage sends a SAB reference (shared memory) instead of
      // structured-cloning ~286 KB per worker.
      const sharedSAB = packShared(shared);
      return { chunks, sharedSAB };
    },
    submit(out, emit, _state, scheduler) {
      const N = out.chunks.length;

      // Register the barrier with the dynamic predecessor count.
      // write declares "renderJoin" statically; emit() looks up
      // pending entries by id, not by source, so the static
      // declaration is satisfied as soon as renderJoin submits.
      scheduler.register("renderJoin", {
        expected: Array.from({ length: N }, (_, i) => `render:${i}`),
        runOnMain: true,
        execute() { return {}; },
        submit(_, emit) { emit("write", {}); },
      });

      for (let i = 0; i < N; i++) {
        const id = `render:${i}`;
        scheduler.register(id, {
          expected: [],
          handler:  "render",
          submit(renderOut, emit, state) {
            for (const r of renderOut) {
              const p = state.pageByDest.get(r.destPath);
              if (!p) continue;
              p.renderedContent = r.renderedContent;
              if (r.html !== undefined) p.html = r.html;
            }
            emit("renderJoin", renderOut);
          },
        });
        scheduler.seed(id, {
          sharedSAB: out.sharedSAB,
          chunk:     out.chunks[i],
        });
      }
    },
  },
};
```

`chunkPages` rounds up to keep all chunks non-empty when there are
fewer pages than workers (e.g. dry-run paths or future incremental
builds):

```js
function chunkPages(pages, workers) {
  const n = Math.min(workers, pages.length);    // never more chunks than pages
  if (n === 0) return [];
  const size = Math.ceil(pages.length / n);
  const chunks = [];
  for (let i = 0; i < pages.length; i += size) chunks.push(pages.slice(i, i + size));
  return chunks;
}
```

Two non-obvious bits in `dispatch.submit`:

1. **Dynamic registration.** `dispatch` doesn't know N at definition
   time, so it calls `scheduler.register(taskId, def)` per chunk plus
   one for `renderJoin`.
2. **Why `renderJoin` exists at all.** Each `render:i.submit()` already
   emits into the page-deltas merge, and could emit directly to
   `write`. But `write.expected` is declared statically with
   `["renderJoin", "scss", "mermaid", "prepDest"]` -- mutating it from
   `dispatch.submit` to add the N dynamic render predecessors would be
   awkward. The barrier is the cleaner expression: register it once
   with the right count, let write keep its static `expected`.

## Shared state

```js
class SharedState {
  pages        = [];        // master copy; mutated in place by [M] tasks and by render delta merges
  staticFiles  = [];        // master copy; mermaid.submit appends new SVG descriptors
  site         = {};        // config, navTree, seoSiteTitle, seoLogoUrl, bookData, data, markdown, ...
  pageByDest   = new Map(); // destPath → page; built once in discover.submit
}
```

**After the initial discover.submit assignment, `state.pages` is
never replaced** -- only mutated in place. Every phase that adds
fields to pages does so on the same object identities, which is what
keeps `bookData._chapters` refs (set by `resolveBookChapters`)
pointing at the rendered pages by the time `writePdf` walks them.

Worker tasks receive structured-clone snapshots of whatever input they
need -- they cannot see the master and cannot mutate it. Their
`submit()` runs on the main thread, where it merges the worker's
output (a delta keyed by `destPath` for page mutations) into `state`.

This is the explicit form of what today's `runBuild` does implicitly
through closure mutation. Making it explicit lets `serve.mjs` re-use
the scheduler across rebuilds without leaking state, and gives
post-write tasks a clean read path.

## Scheduler core

The scheduler is a thin coordinator. The pool is constructed externally
and passed in.

```js
class Scheduler {
  constructor({ pool, tasks }) {
    this.pool     = pool;                       // WorkerPool instance
    this.tasks    = new Map(Object.entries(tasks));
    this.pending  = new Map();
    this.ready    = [];
    this.results  = new Map();
    this.timings  = new Map();
    this.state    = new SharedState();
    this.inFlight = 0;
    [this._doneP, this._doneResolve, this._doneReject] = deferred();
    for (const [id, def] of this.tasks) this._initPending(id, def);
  }

  _initPending(id, def) {
    this.pending.set(id, { expected: def.expected.length, received: new Map() });
  }

  register(id, def) { this.tasks.set(id, def); this._initPending(id, def); }

  // Seed a freshly-registered task directly (used by dispatch.submit
  // to feed each render:i its chunk without going through emit()).
  seed(id, inputs) {
    const def = this.tasks.get(id);
    this.pending.delete(id);
    this.ready.push({ id, def, inputs });
    this._flush();
  }

  emit(targetId, data, sourceId) {
    const entry = this.pending.get(targetId);
    if (!entry) throw new Error(`unknown or already-dispatched task: ${targetId}`);
    entry.received.set(sourceId, data);
    if (entry.received.size === entry.expected) {
      this.pending.delete(targetId);
      const def = this.tasks.get(targetId);
      this.ready.push({ id: targetId, def, inputs: Object.fromEntries(entry.received) });
      this._flush();
    }
  }

  async start(ctx) {
    this._ctx = ctx;
    for (const [id, def] of this.tasks) {
      if (def.expected.length === 0) this.ready.push({ id, def, inputs: {} });
    }
    this._flush();
    return this._doneP;
  }

  _flush() {
    while (this.ready.length > 0) this._run(this.ready.shift());
  }

  _run(task) {
    const start = Date.now();
    this.inFlight++;
    const p = task.def.runOnMain
      ? Promise.resolve(task.def.execute(task.inputs, this._ctx, this.state))
      : this.pool.run({ inputs: task.inputs, ctx: this._ctx },
                      { name: task.def.handler ?? task.id });
    p.then(
      (output) => this._onDone(task, output, start),
      (err)    => this._onError(task, err),
    );
  }

  _onDone(task, output, start) {
    this.timings.set(task.id, { start, end: Date.now() });
    this.results.set(task.id, output);
    this.inFlight--;
    // submit() is invoked synchronously. It must not return a Promise
    // (or, if it does, must not race with the emits it makes). Async
    // work belongs in execute().
    task.def.submit(
      output,
      (tgt, data) => this.emit(tgt, data, task.id),
      this.state,
      this,
    );
    if (this.inFlight === 0 && this.ready.length === 0 && this.pending.size === 0) {
      this._doneResolve(this.results);
    }
  }

  _onError(task, err) {
    this._doneReject(new Error(`task ${task.id} failed`, { cause: err }));
  }

  summary() {
    return [...this.timings.entries()]
      .sort((a, b) => a[1].start - b[1].start)
      .map(([id, { start, end }]) => `${id}=${end - start}ms`)
      .join(" ");
  }
}

function deferred() {
  let res, rej;
  const p = new Promise((r1, r2) => { res = r1; rej = r2; });
  return [p, res, rej];
}
```

The `WorkerPool` instance is constructed by `runBuild()` and injected
into the scheduler; the scheduler never sees `worker_threads`
directly.

## Worker pool

A minimal pool over `node:worker_threads`. One file, ~50 LOC. Spawns
`size` workers eagerly at construction (so WASM warmup overlaps with
seed-task work; see §Boot sequence), routes named tasks to whichever
worker is idle, queues the rest. No dynamic scaling, no recycling.

```js
// builder/worker-pool.mjs

import { Worker } from "node:worker_threads";

export class WorkerPool {
  constructor(size, workerUrl) {
    this._workerUrl = workerUrl;
    this._idle  = [];                       // Worker[]
    this._busy  = new Map();                // Worker → { resolve, reject }
    this._queue = [];                       // pending { message, transferList, resolve, reject }
    this._workers = Array.from({ length: size }, () => this._spawn());
  }

  _spawn() {
    const w = new Worker(this._workerUrl);
    w.on("message", (msg) => {
      const entry = this._busy.get(w);
      if (!entry) return;                   // ignore late messages
      this._busy.delete(w);
      this._idle.push(w);
      if (msg.error) entry.reject(Object.assign(new Error(msg.error), { stack: msg.stack }));
      else            entry.resolve(msg.result);
      this._drain();
    });
    w.on("error", (err) => {
      // Worker crash: reject the in-flight task. The dead worker
      // stays in this._workers (won't respawn -- see §Worker death
      // policy) so the pool degrades to size-1 for the rest of the
      // run. For a one-shot build, the resulting task rejection
      // aborts via the scheduler's _onError path.
      const entry = this._busy.get(w);
      if (entry) { this._busy.delete(w); entry.reject(err); }
    });
    this._idle.push(w);
    return w;
  }

  run(payload, { name, transferList } = {}) {
    return new Promise((resolve, reject) => {
      this._queue.push({
        message:      { name, ...payload },
        transferList,
        resolve, reject,
      });
      this._drain();
    });
  }

  _drain() {
    while (this._queue.length && this._idle.length) {
      const w = this._idle.shift();
      const { message, transferList, resolve, reject } = this._queue.shift();
      this._busy.set(w, { resolve, reject });
      w.postMessage(message, transferList);
    }
  }

  destroy() {
    return Promise.all(this._workers.map(w => w.terminate()));
  }
}
```

What we explicitly do **not** support, vs. a general-purpose pool:
dynamic resizing, per-worker concurrency above 1, worker recycling
after N tasks, abort signals, task-priority queues, utilization
histograms. Each is real complexity we don't need.

### Worker death policy

If a worker crashes mid-task, `w.on("error")` rejects the in-flight
task and removes it from `_busy`. The crashed worker is NOT
respawned; `_workers[]` still lists it for `destroy()` (terminate is
idempotent on a dead worker), but it never returns to `_idle`. The
pool effectively shrinks by one for the remainder of the run.

For a one-shot `runBuild`, the rejected task surfaces through the
scheduler's `_onError` → `_doneP.reject` and `runBuild` aborts. Fine
as-is.

For `serve` mode, a crash permanently degrades the long-lived pool.
The current policy is "tell the user to restart serve"; respawn-on-
error is a follow-up if it ever happens in practice.

### Worker spawn cost

`new Worker(url)` costs ~50-100 ms per worker. We spawn
`os.availableParallelism()` of them at construction; they spawn
concurrently but Node's process model adds contention -- realistically
~100-200 ms before any task can `postMessage` to a free worker. This
is a one-shot cost in `runBuild`; for `serve` mode it amortizes to
zero across rebuilds. It's worth noting against Phase 1's expected
savings (~250 ms scss overlap is partly eaten by the ~100-200 ms
worker boot).

## Worker

Single file with named handlers in a dispatch table. The pool sends
`{ name, ...payload }`; the worker routes to the right handler and
posts back `{ result }` or `{ error, stack }`. Four handlers total
(`scss`, `mermaid`, `buildInfo`, `render`) plus the ~15 LOC dispatcher.

```js
// builder/cpu-worker.mjs

import { parentPort } from "node:worker_threads";

import { initHighlighter }      from "./highlight.mjs";
import { compileScss }          from "./scss.mjs";
import { regenerateMermaid }    from "./mermaid.mjs";
import { captureBuildInfo }     from "./build-info.mjs";
import {
  createMarkdownIt,
  buildLinkTables,
  renderPhase,
} from "./render.mjs";
import { templatePhase }        from "./template.mjs";
import { unpackShared }         from "./sab-broadcast.mjs";

// Start WASM init immediately, do NOT await. The module finishes
// loading synchronously so the parentPort.on('message') dispatcher is
// installed before the pool sends any work. Only the `render` handler
// awaits highlighterP.
const highlighterP = initHighlighter();

const handlers = {
  async scss({ ctx }) {
    return { scssResult: await compileScss(ctx.srcRoot) };
  },

  async mermaid({ ctx }) {
    return { mermaidStats: await regenerateMermaid(ctx.srcRoot) };
  },

  async buildInfo() {
    return { buildInfo: await captureBuildInfo() };
  },

  async render({ inputs }) {
    const { sharedSAB, chunk } = inputs;
    const { siteData, initData, linkTablesData, staticFilesArr,
            baseurl, buildInfo } = unpackShared(sharedSAB);

    const highlighter = await highlighterP;
    const linkTables  = reconstructLinkTables(linkTablesData);
    const staticFiles = new Set(staticFilesArr);
    const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles });

    const site = { ...siteData, markdown, buildInfo };
    await renderPhase(chunk, site);
    await templatePhase(chunk, site, initData);

    // book-combined pages have renderedContent but no html (Phase 8
    // handles them from renderedContent); send html: undefined for those.
    return chunk.map(p => ({
      destPath:        p.destPath,
      renderedContent: p.renderedContent,
      html:            p.html,
    }));
  },
};

parentPort.on("message", async (msg) => {
  const { name, ...payload } = msg;
  const handler = handlers[name];
  if (!handler) {
    parentPort.postMessage({ error: `unknown task: ${name}` });
    return;
  }
  try {
    const result = await handler(payload);
    parentPort.postMessage({ result });
  } catch (err) {
    parentPort.postMessage({ error: err.message, stack: err.stack });
  }
});

// linkTables values are page objects in the main pipeline, but
// resolveLink() in the relative-links plugin only reads .permalink.
// The serialized form ships [key, permalink] pairs; we reconstruct
// minimal { permalink } stubs in the worker.
function reconstructLinkTables({ byPath, byUrl, byRedirect }) {
  const make = (pairs) => new Map(pairs.map(([k, pl]) => [k, { permalink: pl }]));
  return { byPath: make(byPath), byUrl: make(byUrl), byRedirect: make(byRedirect) };
}
```

The matching `serializeLinkTables` lives in `render.mjs` next to
`buildLinkTables` and is called from `markdownInit.execute()` on main:

```js
// builder/render.mjs
export function serializeLinkTables(lt) {
  const pairs = (m) => [...m.entries()].map(([k, p]) => [k, p.permalink]);
  return { byPath: pairs(lt.byPath), byUrl: pairs(lt.byUrl), byRedirect: pairs(lt.byRedirect) };
}
```

**`buildInit` export from template.mjs.** The `markdownInit` /
`buildInit` tasks both run on main; they call `template.mjs`'s
internal `buildInit()` helper, which is currently file-local. Phase 0
of the migration re-exports it as `buildInitFn` (renamed to avoid
shadowing the task ID inside `tbdocs.mjs`). Today's `templatePhase()`
still calls the local function directly; the export adds no overhead.

## Boot sequence (WASM init)

Two independent `initHighlighter()` invocations:

- **Main thread.** `markdownInit.execute()` awaits `initHighlighter()`
  to build the shared markdown-it instance used by seo and (indirectly)
  by `book.mjs`'s subtitle/intro rendering during `assembleBook`. The
  cached singleton lives in `highlight.mjs`'s `cached` module-level
  variable on the main thread.
- **Each worker.** `cpu-worker.mjs` calls `initHighlighter()` at module
  scope without awaiting. Module evaluation finishes synchronously, so
  `parentPort.on("message")` is installed before the pool dispatches.
  Only the `render` handler awaits the promise. The `scss`, `mermaid`,
  `buildInfo` handlers don't need a highlighter -- their workers can
  service tasks while Shiki is still loading.

The two contexts each have their own cached singleton. Total WASM
init cost is paid once per thread (main + N workers), all in parallel,
overlapping with worker spawn and the main spine.

## Data transfer strategy

### Small outputs (config, navTree, initData, buildInfo, scssResult)
Structured clone via `postMessage`. Negligible cost (< 1 ms).

### `linkTables` (medium, ~857 entries × ~3 keys)
Serialized once on main inside `markdownInit.execute()` to
`linkTablesData` ([key, permalink] pairs, ~50 KB). Shipped to each
render worker via `dispatch`'s output; each worker reconstructs
minimal `{ permalink }` stubs.

### Render chunk (medium-large, ~857/N pages including `rawContent`)
The biggest single transfer. The `dispatch` output's `chunks[i]`
contains roughly `pages.length / N` page objects with `rawContent`
attached. On a 4-worker box: ~215 pages × ~4 KB raw + frontmatter =
~860 KB per chunk × 4 workers = ~3.4 MB total ship-out. The deltas
returned are ~30 KB per worker (just destPath + renderedContent +
html). Two crossings per chunk; one-way ~3.4 MB total at chunk send,
much smaller at delta return.

### Mutations that stay on the main thread
nav / seo / loadData / resolveBookChapters / buildInit run on main
against `state.pages` directly. No marshalling, no delta merge --
mutations are immediately visible to downstream main-thread tasks.

### SharedArrayBuffer broadcast (Phase 4)
The render fan-out's shared payload (`siteData + initData +
linkTablesData + staticFilesArr + baseurl + buildInfo`, ~286 KB) is
JSON-serialized once on the main thread into a SharedArrayBuffer via
`sab-broadcast.mjs`'s `packShared()`. Each render task receives the
SAB reference (shared memory, not cloned) alongside its per-worker
chunk. Workers call `unpackShared()` to deserialize independently and
in parallel. Measured saving: ~8 ms per build (fan-out drops from
~19 ms to ~9 ms).

## Error handling

Three severity levels:

1. **Fatal** (task throws): `_onError` rejects `_doneP`. The
   orchestrator catches, prints, exits 1. Matches today's behavior
   for nav integrity failures, unsupported layouts, redirect
   collisions. The pool's outstanding work is implicitly cancelled
   when the orchestrator calls `pool.destroy()` during shutdown.

2. **Degraded** (task sets a flag): the task returns normally with a
   `{ failed: true }` field in its output. Downstream tasks receive
   the output (write still needs `scssResult` even if compilation
   failed -- it just skips emitting the generated asset). After
   `_doneP` resolves, the orchestrator checks results for degraded
   flags and sets `process.exitCode`. Matches today's mermaid / scss
   behavior. Applies symmetrically to both seed tasks: a sass
   compile error sets `scssResult.failed`, a mermaid render error
   sets `mermaidStats.failed`.

3. **Setup skip** (puppeteer / sass missing): task returns
   `{ setupSkipped: true }`. Downstream tasks see existing-on-disk
   artifacts (mermaid: prior SVGs; scss: nothing emitted, but the
   theme tree's hand-extracted CSS still applies). Not an error.

4. **Worker death** (worker crashes, OOM, native segfault): the
   pool's `w.on("error")` rejects the in-flight task; the rejection
   surfaces through `_onError` as Fatal above. The dead worker is
   not respawned (see §Worker death policy).

## Serve / watch mode

The pool is constructed in `serve.mjs`'s long-lived process and
re-used across rebuilds; only the `Scheduler` instance (and its
`SharedState`) is fresh per rebuild. Workers stay warm -- WASM, JIT,
module cache all survive. The worker spawn cost is paid once, at
`runServe()` startup.

```js
// serve.mjs (sketch)
const pool = new WorkerPool(os.availableParallelism(), CPU_WORKER_URL);

watcher.on("change", debounce(async () => {
  const scheduler = new Scheduler({ pool, tasks: TASKS });
  await scheduler.start(ctx);
}, 100));
```

Incremental invalidation (rebuild only changed tasks) is a much later
phase; defer.

## Link checks (out of scope)

The link-checker passes (`scripts/check_links.mjs`) currently run
**outside** the build, via `check.bat`. The earlier `CheckPool`
worker_threads integration in `tbdocs.mjs` has been removed; this plan
inherits that decision and does **not** re-integrate link-checking
into the scheduler.

The scheduler design accommodates checks cleanly as `runOnMain: true`
tasks that delegate to a `CheckPool` instance passed in via `ctx`, so
the integration can be re-added as a follow-up phase if desired. The
shape would be:

```js
checkOnline: {
  expected: ["writeAux"],          // _site/ must be fully written
  runOnMain: true,
  async execute(_, ctx) {
    const r = await ctx.checkPool.run(buildCheckArgv("online", ctx.destRoot, ...));
    return { name: "online", ...r };
  },
  submit() { /* terminal */ },
},
```

But the initial scheduler migration treats `check.bat` as the
canonical post-build verifier and lands without touching it.

## Post-write tasks

The DAG nodes downstream of `render` and `scss`/`mermaid`. All
`write`-family tasks are `runOnMain: true` -- they own the master
`pages[]` and `state.site` reads; their CPU sections are short
relative to their I/O.

```js
writePdf: {
  expected: ["renderJoin", "mermaid"],
  runOnMain: true,
  // Sources CSS directly: tb-highlight.css from state.site.highlighter,
  // print.css from staticFiles. No dependency on write or _site/.
},

write: {
  expected: ["renderJoin", "scss", "mermaid", "prepDest"],
  runOnMain: true,
  async execute({ scss: { scssResult }, mermaid: { mermaidStats } }, ctx, state) {
    // render delta merges already happened in each render:i.submit().
    // mermaid.submit() already appended new SVG descriptors to
    // state.staticFiles synchronously.
    const generatedAssets = [];
    if (state.site.highlighter?.themeCss) generatedAssets.push(/* tb-highlight.css */);
    if (scssResult.compiled)              generatedAssets.push(/* just-the-docs-combined.css */);
    return writePhase(state.pages, state.staticFiles, {
      destRoot:  ctx.destRoot,
      generatedAssets,
      baseurl:   String(state.site.config.baseurl || ""),
      dryRun:    ctx.opts.dryRun,
    });
  },
  submit(out, emit) { emit("searchData", out); },
},

searchData: {
  expected: ["write"],
  runOnMain: true,
  async execute(_, ctx, state) {
    return writeSearchData(state.pages, state.site, ctx.destRoot);
  },
  submit(out, emit) { emit("writeAux", out); },
},

writeAux: {
  expected: ["searchData", "deriveRedirects", "deriveSitemap"],
  runOnMain: true,
  async execute({ deriveRedirects, deriveSitemap }, ctx, state) {
    await Promise.all([
      writeRedirects(state.pages, state.site, ctx.destRoot, deriveRedirects.stubs),
      writeSitemap  (state.pages, state.site, ctx.destRoot, deriveSitemap.urls),
    ]);
  },
  submit(out, emit) {
    emit("writeOffline", out);
  },
},

writeOffline: {
  expected: ["writeAux"],
  runOnMain: true,
  async execute(_, ctx, state) {
    return writeOffline(state.pages, state.staticFiles, state.site,
                        ctx.destRoot, { /* ... */ });
  },
  submit() { /* terminal */ },
},

// writePdf depends on renderJoin + mermaid (CSS sourced directly).
// It runs in parallel with write → searchData → writeAux → writeOffline.
```

**Restoring the derive-time exports.** `redirects.mjs` /
`sitemap.mjs` regain the `precomputedStubs` / `precomputedUrls`
passthrough parameters so the derive tasks' outputs can flow into the
write calls without re-deriving.

**`deriveRedirectStubs` filter change.** The current filter
(`p.html !== undefined`) is set after template runs. Under the
scheduler, `deriveRedirects` runs concurrently with the main spine
and well before render+template. Change the filter in `redirects.mjs`
to `p.frontmatter.layout !== "book-combined"` (the property that
determines whether `html` will be set; known after discover) so the
derive can run at any point after discover.

**Workerizing writeOffline or writePdf (measured, declined).** Both
phases have non-trivial CPU sections: writeOffline rewrites URLs
across all 856 HTML files; writePdf assembles `book.html` via
`assembleBook`. `writePdf` now depends only on `renderJoin` + `mermaid`
(CSS is sourced directly, not from `_site/`), so it runs in parallel
with the entire `write → searchData → writeAux → writeOffline` chain.
Cooperative async concurrency on the main thread interleaves their I/O
gaps. The structured-clone cost of shipping `pages[]` across the worker
boundary (~37–65 ms) would be pure overhead. See §Phase 3-follow-up
for the full measurement.

## Timing / profiling

The scheduler records `{ start, end }` per task. The summary is
formatted to match the current `t.lap()` output style:

```
config=1ms discover=98ms scss=1041ms mermaid=2ms buildInfo=8ms
nav=9ms buildInit=1ms markdownInit=63ms seo=34ms loadData=4ms
resolveBookChapters=7ms render:0=312ms render:1=298ms ...
write=542ms searchData=41ms writeAux=12ms
writeOffline=1210ms writePdf=352ms
```

## Entry point

```js
// tbdocs.mjs

import os from "node:os";
import { WorkerPool } from "./worker-pool.mjs";
import { Scheduler }  from "./scheduler.mjs";

const CPU_WORKER_URL = new URL("./cpu-worker.mjs", import.meta.url);

export async function runBuild(opts) {
  const srcRoot  = path.resolve(process.cwd(), opts.src);
  const destRoot = path.resolve(opts.dest ?? path.join(srcRoot, "_site"));

  const workerCount = os.availableParallelism();
  const pool = new WorkerPool(workerCount, CPU_WORKER_URL);

  const scheduler = new Scheduler({ pool, tasks: TASKS });
  const ctx = { srcRoot, destRoot, opts, workerCount };

  try {
    const results = await scheduler.start(ctx);
    console.log(scheduler.summary());
    // ... existing summary output using results + scheduler.state ...
    return { pages: scheduler.state.pages,
             staticFiles: scheduler.state.staticFiles,
             site: scheduler.state.site,
             destRoot };
  } finally {
    await pool.destroy();
  }
}
```

## Migration path

The current code is the simple serial baseline -- there is no
scaffolding to delete, only new pieces to add. Each phase keeps the
build working end-to-end and produces byte-identical output.

**Where to start.** Implement the phases in order, beginning with
Phase 0. Commit after each phase. The verification gate at the end
of each phase block below is the done-signal -- if it doesn't pass
cleanly, the phase isn't done.

**Historical context (cited inline below).** Some refactors restore
small carriers (function parameters, return-value fields) that
existed in an earlier WIP iteration of the parallelisation work --
commit `5736fee4` ("WIP dataflow parallelization work") -- and were
reverted along with the threading shape they served. Where this plan
refers to "restoring" something, `git show 5736fee4 -- <file>` shows
the prior form for reference; do not re-introduce the whole reverted
shape, only the small pieces noted.

### Suggested Claude model per phase

To reduce session cost, the phases are labelled with the model that
fits each phase's nature. Sonnet is preferred when the spec is
precise enough that the implementation is a translation; Opus is
preferred when correctness depends on reasoning about concurrency,
data lifetime across the worker boundary, or low-level serialisation.

| Phase | Model | Why |
|---|---|---|
| 0. Skeleton + small refactors | Sonnet | Code is given verbatim in §Worker pool / §Scheduler core. The five refactors are precisely-bounded edits to existing modules. No design judgement needed. |
| 1. Seeds + main-thread spine | Sonnet | Each task body is a thin wrapper around an existing phase function. The scheduler core is copy-from-plan. All mutation is on the main thread (no cross-worker identity yet). |
| 2. Render fan-out | Opus | Cross-thread structured-clone semantics, module-scope initialisation order, dynamic task registration, per-page delta-merge identity. Debugging concurrency bugs needs depth. |
| 3. Post-write tasks | Sonnet | All `runOnMain`; thin wrappers around existing write functions. No new concurrency surface beyond the already-built scheduler. |
| 3-follow-up. Workerize writeOffline | Opus (decided) | Profiled: zero CPU contention; cooperative async overlap is already optimal. Declined — no implementation needed. |
| 4. SAB broadcast | Opus | JSON + SAB approach; measured ~55% fan-out reduction (~8 ms saving). |

Escalate to Opus mid-phase if a Sonnet session hits a debugging block
it can't reason through.

### Verification gate (applies to every phase)

After each phase, run:

```sh
build.bat && check.bat
```

The phase is done iff:

- `build.bat` exits 0; no new warnings vs. the prior phase.
- The summary line shows `pages.length` at the current baseline
  (857 today; the drift guard in `tbdocs.mjs` warns if it slips
  below 836).
- All three `check.bat` passes return `0 issue(s)` for online and
  offline, and the PDF pass's pre-existing broken-link count
  matches the baseline (8 today; unrelated to the scheduler work).
- The scheduler's timing summary shows the **expected concurrency
  pattern** for the phase (each phase block notes what to look for).

The site is the regression bar; there is no separate unit-test
harness for builder/ to satisfy.

### Phase 0: skeleton + small refactors

**Suggested model:** Sonnet.

Create three new modules:

- `builder/worker-pool.mjs` -- the `WorkerPool` class (~50 LOC, see
  §Worker pool).
- `builder/scheduler.mjs` -- the `Scheduler` class + `SharedState`
  (~150 LOC, see §Scheduler core).
- `builder/cpu-worker.mjs` -- the worker harness (`parentPort` message
  dispatcher + empty handlers map for now, ~15 LOC).

Refactors needed (each is small and lands cleanly under today's serial
`runBuild`):

- Re-export `buildInit` from `template.mjs` (currently file-local) as
  `buildInitFn`. Today's `templatePhase()` still calls the local
  function; the export is for the upcoming main-thread `buildInit`
  task.
- Export `serializeLinkTables` from `render.mjs`. Today nothing calls
  it; Phase 2 wires it up.
- Change the filter in `redirects.mjs`'s `deriveRedirectStubs` from
  `p.html !== undefined` to `p.frontmatter.layout !== "book-combined"`.
  Behaviour is identical under the current serial pipeline (template
  has already run by the time writeRedirects fires), but the new
  filter lets the derive step run before template under the scheduler.
- Restore the `precomputedStubs` / `precomputedUrls` passthrough
  parameters on `writeRedirects` / `writeSitemap` (these were in commit
  `5736fee4` and removed in the revert).
- Add `svgFiles: [{ srcPath, srcRel, destRel, size }, ...]` to
  `regenerateMermaid`'s return value (this field was in `5736fee4`
  and removed; the stat happens inside the existing
  `regenerateMermaid` call).

The build still runs from the existing `runBuild()` exactly as today.
No new runtime dependencies.

**Deliverable:** new modules compile, refactors land under the serial
pipeline, build output unchanged.

**Verification.** `build.bat && check.bat` clean. Output and timing
summary unchanged vs. before Phase 0 -- no scheduler is wired up
yet, so the build must look identical.

### Phase 1: Seeds + main-thread spine

**Suggested model:** Sonnet.

Wire `runBuild()` to construct the pool, instantiate the scheduler,
and call `scheduler.start(ctx)`. Port:

- **Seeds:** `config`, `buildInfo`, `scss`, `mermaid`, `prepDest`.
- **Main-thread spine:** `discover`, `nav`, `markdownInit`, `seo`,
  `loadData`, `resolveBookChapters`, `buildInit`, `deriveRedirects`,
  `deriveSitemap`.

The existing `renderPhase` → `templatePhase` → `writePhase` →
post-write code stays in `runBuild()` as a trailing block that
consumes `scheduler.state` after `scheduler.start()` resolves.

`config` runs on main as a `runOnMain` task; `discover` ditto for
identity reasons (it builds `state.pages` and `state.pageByDest`).

**`serve.mjs` is untouched.** `serve.mjs` imports `runBuild` from
`tbdocs.mjs` and calls it per change. As long as `runBuild`'s
signature stays stable (it does), `serve.mjs` needs no changes
through Phases 0-3. The dev-server flow keeps working end-to-end
without scheduler-aware code in `serve.mjs`.

**Expected savings:** ~150 ms wall-clock. The main spine takes
~250 ms; `scss` (~700 ms) overlaps roughly half of it. Worker spawn
(~100-200 ms one-shot) eats a chunk of that. Honest end-to-end
estimate: 6.7 s → ~6.55 s. Most of the value here is structural --
the DAG is now explicit -- not raw wall-clock.

**Verification.** `build.bat && check.bat` clean. The timing summary
should show `scss=...ms` starting at t=0 alongside the main-thread
spine entries (`discover`, `nav`, ...), not after them. `render` /
`template` / `write` / `writeOffline` / `writePdf` still appear in
the summary at roughly their current durations -- they haven't been
moved to the scheduler yet.

### Phase 2: Render fan-out

**Suggested model:** Opus.

Wire up the `render` named handler in `cpu-worker.mjs` (`renderPhase`
+ `templatePhase` over a chunk, return per-page deltas). Add the
`dispatch` task + dynamic `render:0..N` registration. Drop the serial
`renderPhase` / `templatePhase` calls from `runBuild()`.

This is the largest single win: ~3.5 s of CPU compresses to
~`3500 / N` ms.

**Expected savings:** on 4 cores, ~2.6 s saved (6.55 s → ~4.0 s).
On 8 cores, ~3 s saved (~3.6 s). Dispatch overhead is ~50 ms.

**Verification.** `build.bat && check.bat` clean. The timing summary
should show N `render:i` entries (one per worker) whose individual
durations sum to roughly today's combined `render` + `template` time,
not today's per-page renders. Wall-clock drop should match the
expected savings above within ±20%.

### Phase 3: Post-write tasks

**Suggested model:** Sonnet.

Port `write`, `searchData`, `writeAux`, `writeOffline`, `writePdf` as
`runOnMain` tasks. `writeOffline` and `writePdf` run in parallel on
the main thread; the gain is the shorter of their two CPU sections
(~240 ms) plus interleaved I/O.

`runBuild()` shrinks to: pool construction + `scheduler.start(ctx)` +
summary output + `pool.destroy()`.

**Expected savings:** ~240 ms (4.0 s → ~3.75 s on 4 cores).

**Verification.** `build.bat && check.bat` clean. `writeOffline` and
`writePdf` should overlap in the timing summary -- their `start`
timestamps should be within a few ms of each other.

### Phase 3-follow-up: workerize writeOffline (optional) — DECLINED

**Decision:** do not workerize. Profiling shows zero CPU contention.

Two independent measurement runs confirmed that `writeOffline` and
`writePdf` already achieve perfect overlap via cooperative async
concurrency on the main thread. In both runs the combined wall-clock
equalled `max(writeOffline, writePdf)` — the "wasted (CPU contention)"
metric was 0 ms. `writePdf`'s `assembleBook` synchronous section
(~150 ms) runs entirely inside `writeOffline`'s I/O await gaps.

Structured-clone cost for shipping `pages[]` across the worker
boundary was measured at ~37–65 ms (depending on per-page HTML size),
which would be pure overhead against a 0 ms contention baseline.
Adding the `offline` handler to `cpu-worker.mjs` would also increase
worker spawn time (acorn import), complicate the worker's module
surface, and add a result-merge path — all for no measurable gain.

The overlap already saves ~260 ms vs. sequential execution (the full
duration of `writePdf`). No further action needed.

### Phase 4: SharedArrayBuffer broadcast

**Suggested model:** Opus.

For the render fan-out, serialize `siteData + initData + linkTables +
staticFilesArr + baseurl + buildInfo` once into a SharedArrayBuffer
and pass it to all render tasks. The SAB is shared memory --- each
worker deserializes its own copy from the same buffer instead of the
main thread structured-cloning the ~286 KB shared payload 16 times.

**Implementation.** Three files:

- `builder/sab-broadcast.mjs` (~15 LOC): `packShared(obj)` serializes
  an object to JSON, encodes to UTF-8, and copies into a SAB;
  `unpackShared(sab)` reverses the process.
- `tbdocs.mjs` `dispatch.execute()`: packs the shared payload into a
  SAB and returns `{ chunks, sharedSAB }` instead of the flat fields.
- `cpu-worker.mjs` `render` handler: calls `unpackShared(sharedSAB)`
  to reconstruct the shared fields before rendering.

**Measurements** (16 workers, ~286 KB shared payload, 857 pages):

| | Run 1 | Run 2 | Run 3 | Median |
|---|---|---|---|---|
| Baseline (structured-clone) | 18.1 ms | 35.0 ms | 19.5 ms | ~19 ms |
| SAB broadcast | 9.2 ms | 7.3 ms | 10.2 ms | ~9 ms |

SAB packing cost (in `dispatch.execute()`): ~2 ms (visible as
`dispatch=2ms` vs. prior `dispatch=0ms`). Net saving: ~8 ms per build,
a ~55% reduction in fan-out overhead. The saving is modest in absolute
terms (~0.2% of a ~4 s build) but the implementation is small and the
pattern moves redundant serialization work off the main thread ---
each worker independently deserializes from shared memory in parallel
instead of the main thread serializing 16 identical copies
sequentially.

**Verification.** `build.bat && check.bat` clean. `dispatch` now
shows ~2 ms (SAB packing) vs. 0 ms before.
