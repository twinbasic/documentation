---
title: Extending the Builder
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Extending
---

# Extending the Builder
{: .no_toc }

How to add a new pipeline task or a custom markdown-it plugin to `tbdocs`. Read [tbdocs Builder](Builder) first for the architectural tour and [Pipeline Stages](Pipeline-Stages) for the data contracts each task operates on.

* TOC goes here
{:toc}

## Three extension points

**Pipeline task** --- a new entry in the static `TASKS` graph in [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs). The task declares its predecessors and either runs on the main thread or dispatches to a worker handler. No plugin registry or hook system is involved.

**Markdown-it plugin** --- a function that configures the shared markdown-it instance. Registered in `createMarkdownIt` inside [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs). Each render worker builds its own markdown-it from the same factory, so the plugin runs on every page on every worker.

**Render-worker sub-stage** --- a transformation slotted into the per-chunk render handler in [`cpu-worker.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/cpu-worker.mjs), between two of the existing sub-stages (`renderPhase` → `computeChunkSeo` → `templatePhase` → offline → `deriveSearchEntries`). This is the right shape when the new work is per-page CPU compute that should run in parallel with the rest of the page render.

> [!NOTE]
> Changes to task definitions, worker handlers, or markdown-it plugins are not hot-reloaded by serve mode. The worker pool is persistent: after editing any of these, stop `serve.bat` (Ctrl+C) and re-run to load the new code.

---

## Adding a pipeline task

### 1. Decide where the work runs

The first question is whether the task body needs the main thread.

| Pick `runOnMain` when… | Pick a worker handler when… |
|---|---|
| The body mutates `state.pages` or `state.site` and other tasks must see the result. | The body is pure compute. |
| The body coordinates filesystem layout (a `mkdir` race or a sequenced clean). | The body reads files but does not coordinate destination layout. |
| The output is small and downstream tasks consume it via the inputs object. | The output is per-page and you want to fan out across cores. |
| The task should join multiple worker outputs together. | The task should run multiple times in parallel (`render:i`, `flush:i`). |

If the work is per-page CPU compute, prefer adding a sub-stage inside the existing render handler over creating a new task --- the render fan-out already runs at full parallelism, and a sub-stage avoids the extra postMessage round-trip. The render-worker sub-stage walkthrough below covers that case.

### 2. Pick the right flags

Past the main-vs-worker decision, the scheduling primitives compose. The common patterns:

| You want… | Set |
|---|---|
| A regular dependency. | `expected: ["predName"]` |
| A seed that does not auto-start; runs when a successor needs it. | `on_demand: true` |
| Per-worker setup that must run on each lane before another task is claimable on that lane. | `unique_per_worker: true`, declared as a `perWorkerDeps` on the dependent task. |
| Speculative execution during idle time (e.g. warmup that overlaps the main spine). | `run_when_idle: true` |
| Must run on the lane that ran a specific predecessor. | `pinnedTo` set by `submit()` via the SAB `pinnedTo` array (see `dispatch.submit` for the pattern). |
| Per-lane done flags survive serve-mode rebuilds. | `survives_reset: true` (`unique_per_worker` tasks only). |
| Lower-number priority claims first when multiple tasks are READY. | `priority: N` |
| Combine per-lane timings into one Gantt swimlane. | `consolidate: true` |

The full reference is in the [Scheduler-level concepts](Pipeline-Stages#scheduler-level-concepts) section of Pipeline Stages.

### 3. Write the worker handler (if worker-resident)

Worker handlers live in `cpu-worker.mjs`. Two edits:

**Step 3a.** Add an entry to `HANDLERS` in `sab-scheduler.mjs` (the IDs are arbitrary integers, just pick the next free one):

```js
// builder/sab-scheduler.mjs
export const HANDLERS = {
  warmInit: 0, renderEnvInit: 1, flush: 2,
  scssLight: 3, scssDark: 4, dot: 5,
  buildInfo: 6, render: 7,
  myHandler: 8,                          // ← new
};
```

**Step 3b.** Add the handler function in the `handlers` object in `cpu-worker.mjs`:

```js
// builder/cpu-worker.mjs
const handlers = {
  // ... existing handlers ...

  async myHandler(taskIdx) {
    // taskIdx is the SAB slot index for this task; useful when reading
    // per-task payload via _payloadSAB + payloadOffset/payloadLength.
    // For a parameterless task you can ignore it.

    // Workers have access to ctx (srcRoot, destRoot, opts, workerCount),
    // _sharedSAB (from dispatch.broadcastDynamicData), and any module-scope
    // state previous handlers stashed (e.g. _renderEnv from renderEnvInit).
    const { srcRoot } = ctx;
    const result = await someComputation(srcRoot);
    return { result };
  },
};
```

The handler's return value is the message body. It comes back to main as `{ done: taskIdx, output, timing, lane }`; the scheduler stores `output` in `results` and passes it to your task's `submit()`.

### 4. Define the task in `TASKS`

Edit the `TASKS` object in `tbdocs.mjs`:

```js
// builder/tbdocs.mjs
const TASKS = {
  // ... existing tasks ...

  myTask: {
    expected: ["write"],                 // run after the main write pass
    handler: "myHandler",                // worker dispatch (omit + add runOnMain for a main task)
    ganttSection: "Write",               // appears under "Write" in the chart
    submit(out, state) {
      // Merge the worker's output into shared state, or pass it to
      // downstream tasks via state.site / state.<custom>. For a
      // terminal task you can leave this as a no-op.
      state.site.myResult = out.result;
    },
  },
};
```

For a main-thread task, drop `handler` and add `runOnMain: true` plus an `execute`:

```js
myMainTask: {
  expected: ["renderJoin", "prepDest"],
  runOnMain: true,
  ganttSection: "Write",
  async execute({ renderJoin: _ }, ctx, state) {
    // inputs is { [predName]: predOutput } for every predecessor in expected.
    // ctx carries srcRoot, destRoot, opts, workerCount.
    // state is the SharedState (pages, staticFiles, site, pageByDest, …).
    const manifest = state.pages.map(p => ({ url: p.permalink, title: p.frontmatter.title }));
    if (!ctx.opts.dryRun) {
      const dest = path.join(ctx.destRoot, "pages-manifest.json");
      await writeFileMkdirp(dest, JSON.stringify(manifest));
    }
    return { entries: manifest.length };
  },
  submit() {},
},
```

> [!IMPORTANT]
> If the task writes to disk, check `ctx.opts.dryRun` and skip the writes when it is `true`. The flag is honoured by every existing task and contributors lean on it for fast iteration.

### 5. Worked example A: main-thread auxiliary task

End-to-end: a task that emits `pages-manifest.json` listing every page's URL and title. The task depends on `flushJoin` (so the in-memory page set is fully populated) and `prepDest` (so the destination tree exists).

```js
// builder/tbdocs.mjs

import { writeFileMkdirp } from "./write.mjs";

const TASKS = {
  // ... existing tasks ...

  pagesManifest: {
    expected: ["flushJoin", "prepDest"],
    runOnMain: true,
    ganttSection: "Write",
    async execute(_, ctx, state) {
      if (ctx.opts.dryRun) return { entries: 0 };
      const manifest = state.pages.map(p => ({
        url:   p.permalink,
        title: p.frontmatter.title ?? null,
      }));
      const dest = path.join(ctx.destRoot, "pages-manifest.json");
      await writeFileMkdirp(dest, JSON.stringify(manifest, null, 2));
      return { entries: manifest.length };
    },
    submit() {},
  },
};
```

No other edits needed. The scheduler picks up the new entry on the next build; the task appears under "Write" in the Gantt chart with its timing label.

### 6. Worked example B: distributed compute

End-to-end: per-page word count, with the count itself computed inside the render fan-out (so it scales with cores) and the consolidated result written by a main-thread task. This mirrors how `searchData` and per-page SEO are wired.

**Step 6a.** Compute the word count per page on the worker. The cleanest place is inside the existing `render` handler in `cpu-worker.mjs`, between `templatePhase` and the offline rewrite:

```js
// builder/cpu-worker.mjs, inside the render handler

await templatePhase(chunk, env.site, env.initData);

// ── New: per-page word count over the rendered body ──
for (const p of chunk) {
  if (p.renderedContent) {
    p.wordCount = p.renderedContent
      .replace(/<[^>]+>/g, " ")        // strip tags
      .split(/\s+/)
      .filter(Boolean)
      .length;
  }
}
```

**Step 6b.** Add `wordCount` to the per-page delta the handler returns, so it travels back to main:

```js
return {
  pages: chunk.map(p => ({
    destPath:        p.destPath,
    renderedContent: p.renderedContent,
    offlineMisses:   p.offlineMisses,
    wordCount:       p.wordCount,           // ← new
  })),
  searchEntries,
};
```

**Step 6c.** Merge the new field into the master `Page` objects in `dispatch.submit`. Find the `submit(renderOut, state)` callback `dispatch` registers on each `render:i` and extend it:

```js
// builder/tbdocs.mjs, in dispatch.submit's render:i registration

scheduler.tasks.set(rName, {
  expected: [],
  consolidate: true,
  ganttSection: "Render",
  submit(renderOut, state) {
    for (const r of renderOut.pages) {
      const p = state.pageByDest.get(r.destPath);
      if (!p) continue;
      p.renderedContent = r.renderedContent;
      if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
      if (r.wordCount !== undefined)     p.wordCount     = r.wordCount;   // ← new
    }
    state.searchChunks[i] = renderOut.searchEntries;
  },
});
```

**Step 6d.** Write a consolidator task that runs after `renderJoin`:

```js
// builder/tbdocs.mjs, in TASKS

writeWordCounts: {
  expected: ["renderJoin", "prepDest"],
  runOnMain: true,
  ganttSection: "Write",
  async execute(_, ctx, state) {
    if (ctx.opts.dryRun) return { entries: 0 };
    const data = state.pages
      .filter(p => p.wordCount !== undefined)
      .map(p => ({ url: p.permalink, words: p.wordCount }));
    const dest = path.join(ctx.destRoot, "assets/js/word-counts.json");
    await writeFileMkdirp(dest, JSON.stringify(data));
    return { entries: data.length };
  },
  submit() {},
},
```

That is the full pattern: per-chunk compute on the render workers, merge into the master pages in the render `submit()`, consolidate in a main-thread task after `renderJoin`.

### 7. Verify

`build.bat` shows the new task in the timing summary line and in the Gantt chart on the [Build Info](BuildInfo) page. `check.bat` confirms nothing else broke. Watch the chart to make sure the new task fits inside its expected section: a "Write" task that runs during the spine usually means a missing predecessor.

---

## Adding a markdown-it plugin

### Background

`createMarkdownIt` in `render.mjs` builds the configured markdown-it instance. Plugins are applied in a fixed order: `markdown-it-attrs`, `markdown-it-deflist`, `markdown-it-footnote`, then roughly ten in-tree plugins. A new plugin becomes part of that order.

The same factory is called twice on main (once for the shared site-level SEO instance via `markdownInit`, and once per dev-tooling harness that re-renders) and once per render worker (via `renderEnvInit`). Plugins that reach for module-scope state must therefore work across worker boundaries --- in practice, that means no mutable closure-captured state, since each worker has its own module-scope instance.

### 1. Write the plugin

A markdown-it plugin is a function that receives the `md` instance and mutates it. Two common shapes:

**Renderer override** --- wrap every `<table>` in a scrollable container:

```js
// builder/table-wrap-plugin.mjs

export function tableWrapPlugin(md) {
  const originalOpen = md.renderer.rules.table_open
    ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  const originalClose = md.renderer.rules.table_close
    ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    `<div class="table-wrapper">${originalOpen(tokens, idx, options, env, self)}`;

  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    `${originalClose(tokens, idx, options, env, self)}</div>`;
}
```

**Block rule** --- a new fenced syntax that emits a `<div class="callout">`:

```js
// builder/callout-plugin.mjs

export function calloutPlugin(md) {
  md.block.ruler.before("fence", "callout", (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (state.src.slice(pos, pos + 3) !== ":::") return false;
    if (silent) return true;

    const label = state.src.slice(pos + 3, max).trim();
    state.push("callout_open", "div", 1).attrSet("class", `callout callout-${label}`);
    state.line = startLine + 1;

    while (state.line < endLine) {
      const line = state.src.slice(
        state.bMarks[state.line] + state.tShift[state.line],
        state.eMarks[state.line],
      );
      if (line === ":::") { state.line++; break; }
      state.line++;
    }
    state.push("callout_close", "div", -1);
    return true;
  });
}
```

For the full rule API see the [markdown-it documentation](https://markdown-it.github.io/markdown-it/) and the existing in-tree plugins in `render.mjs` as worked examples.

### 2. Register in `createMarkdownIt`

Add an import at the top of `render.mjs`:

```js
import { tableWrapPlugin } from "./table-wrap-plugin.mjs";
```

Find `createMarkdownIt` and add `md.use(tableWrapPlugin)` in the plugin chain. **Order matters** --- place the new plugin after any plugin it depends on and before any plugin that could interfere with its token types:

```js
export function createMarkdownIt(ctx) {
  const md = new MarkdownIt({ /* ... */ });
  // ... existing npm plugins ...
  // ... existing in-tree plugins ...
  md.use(tableWrapPlugin);
  return md;
}
```

### 3. Verify

Run `build.bat` and open an affected page; for live feedback, use `serve.bat`. A plugin that walks the full token stream on every page runs N+1 times per build (one main thread + N workers), so check the per-task render timing in the summary or the Gantt chart for any spike.

---

## Adding a render-worker sub-stage

When the new work is per-page CPU compute, slotting it into the existing `render` handler is the cleanest path. Skip the per-task overhead, ride the same fan-out.

### Where to plug in

The handler in `cpu-worker.mjs` runs five sub-stages in order:

```
chunk = parseFromPayloadSAB(taskIdx)
await renderPhase(chunk, env.site)              // markdown-it body render
computeChunkSeo(chunk, ...)                     // per-page SEO fields
await templatePhase(chunk, env.site, ...)       // layout wrap
if (env.offlineBase) { … deriveOfflinePageCached per page … }
searchEntries = deriveSearchEntries(chunk, env.site)
return { pages: chunk.map(…), searchEntries }
```

A new transformation goes between two existing sub-stages, depending on what it reads and writes:

| Insertion point | Use when… |
|---|---|
| Between `renderPhase` and `computeChunkSeo` | The transformation needs `renderedContent` but not `seoTitle`. |
| Between `computeChunkSeo` and `templatePhase` | The transformation needs SEO fields but should run before the layout wrap. |
| Between `templatePhase` and the offline pass | The transformation needs the final `html` (e.g. extracting outbound links from the wrapped page). |
| After the offline pass | The transformation needs both `html` and `offlineHtml`. |
| Inside the chunk-mapping `return` | Per-page output to thread back to main (extend the `pages.map(…)` projection). |

### Worked example: per-page outbound link count

After `templatePhase` has run, count outbound links per page and emit them in the delta:

```js
// builder/cpu-worker.mjs, inside the render handler

await templatePhase(chunk, env.site, env.initData);

for (const p of chunk) {
  if (p.html) {
    const matches = p.html.match(/href="https?:\/\//g);
    p.outboundLinks = matches ? matches.length : 0;
  }
}

// ... offline pass ...

return {
  pages: chunk.map(p => ({
    destPath:        p.destPath,
    renderedContent: p.renderedContent,
    offlineMisses:   p.offlineMisses,
    outboundLinks:   p.outboundLinks,    // ← new
  })),
  searchEntries,
};
```

Then extend `dispatch.submit`'s `render:i` callback to merge the new field, exactly as the [worked example B](#6-worked-example-b-distributed-compute) above does.

> [!NOTE]
> Anything you mutate on a worker's chunk page must travel back through the delta to be visible on main. The worker's `chunk` is a structured-clone copy; main never sees those copies directly. The `pages.map(…)` projection at the end of the render handler is the single channel.

---

## Testing

Four commands cover the loop:

1. **`build.bat`** --- full pipeline. A clean exit and a sensible Gantt placement is the bar.
2. **`serve.bat`** --- live-reload dev server for visual checks. Remember the persistent pool: Ctrl+C and restart after handler-code or task-graph changes.
3. **`check.bat`** --- offline link and integrity check. Catches broken links and missing pages introduced by the change.
4. **`book.bat`** --- re-renders the PDF if your change affects `_site-pdf/` or any chapter body.

A clean run of all four is the bar for "ready to commit".

> [!NOTE]
> `check.bat` requires `build.bat` to have run first; it reads from `_site/` and `_site-offline/`.

---

## See Also

- [Pipeline Stages](Pipeline-Stages) -- full data model, per-task interface reference, per-module export tables.
- [tbdocs Builder](Builder) -- architectural tour and design rationale.
- [Building and Deployment](Building) -- the day-to-day build workflow for content contributors.
