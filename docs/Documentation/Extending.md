---
title: Extending the Builder
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Extending
---

# Extending the Builder
{: .no_toc }

How to extend `tbdocs` --- a new pipeline task, a markdown-it plugin, a render-worker sub-stage, or a verification gate --- and how to change one that already exists. Read [tbdocs Builder](Builder) first for the architectural tour and [Pipeline Stages](Pipeline-Stages) for the data contracts each task operates on.

* TOC goes here
{:toc}

## The extension points

**Pipeline task** --- a new entry in the static `TASKS` graph in [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs). The task declares its predecessors and either runs on the main thread or dispatches to a worker handler. No plugin registry or hook system is involved.

**Markdown-it plugin** --- a function that configures the shared markdown-it instance. Registered in `createMarkdownIt` inside [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs). Each render worker builds its own markdown-it from the same factory, so the plugin runs on every page on every worker.

**Render-worker sub-stage** --- a transformation slotted into the per-chunk render handler in [`cpu-worker.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/cpu-worker.mjs), between two of the existing sub-stages (`renderPhase` → `computeChunkSeo` → `templatePhase` → offline → `deriveSearchEntries`). This is the right shape when the new work is per-page CPU compute that should run in parallel with the rest of the page render.

**Verification gate** --- a script under `scripts/`, run by `check.bat` after the build, that decides whether what the build produced is acceptable. Nothing in `TASKS` or the plugin chain changes for one. It is the only extension point here that is not part of rendering the site, and the conventions it has to follow are not the ones above; see [Adding a verification gate](#adding-a-verification-gate).

**Styling is not one of them.** A new component's CSS is not an extension point here at all: the site's own style rules live under `docs/_sass/`, are compiled into a single stylesheet by `scss.mjs`, and need no change to the task graph or the plugin chain. See [Project styling](Builder#project-styling) for where each rule belongs, the two-compilation model, and the dark-mode specificity trap: a rule that loses it applies in light mode and silently does not in dark.

> [!NOTE]
> Changes to task definitions, worker handlers, or markdown-it plugins are not hot-reloaded by serve mode. The worker pool is persistent: after editing any of these, stop `serve.bat` (Ctrl+C) and re-run to load the new code. SCSS and page content *are* watched and rebuilt.

---

## Changing what is already there

Most builder work is not an addition. The walkthroughs below are written forwards, from nothing to a working task, and a reader who arrives having already changed something should not have to read one of them backwards. This section is the index into them.

Find the row for what changed. The middle column is the step that explains the mechanism; the right-hand column is what else moves with it **in code**. What a change obliges in the *documentation* is a separate list and applies to every row alike --- see [What a change obliges in the documentation](#what-a-change-obliges-in-the-documentation).

| Changed | Mechanism | Also moves, in code |
|---|---|---|
| A task's `expected` list | [Pick the right flags](#2-pick-the-right-flags) | Nothing. The scheduler derives successor edges from `expected`, so a static edge is declared exactly once. The dynamic edges are the exception: `render:i` and `flush:i` are wired in `dispatch.submit`, not in `TASKS`. |
| A task's `execute()` or handler return shape | [Define the task in `TASKS`](#4-define-the-task-in-tasks) | The task's own `submit()`, and every downstream task that reads the field back off `state`. |
| Which thread a task runs on | [Decide where the work runs](#1-decide-where-the-work-runs) | Swap `runOnMain: true` + `execute` for `handler:` plus a `cpu-worker.mjs` entry, and add the name to `HANDLERS` in `sab-scheduler.mjs`. Moving a task onto a worker costs it direct access to `state`: everything it reads has to arrive through the payload SAB, and everything it produces has to come back through its return value. |
| Which Gantt section a task charts under | --- | **`GANTT_SECTION` in `tbdocs.mjs`**, not the task definition. A `ganttSection` on the definition does win where it is set, which is why the walkthroughs below set one --- but of the 31 static tasks only `dispatch` does, 28 are listed in the map, and the three that are in neither (`warmInit`, `renderEnvInit`, `vendorAssets`) fall back to `Other`, or to `Boot` for a `unique_per_worker` task's per-lane timings. |
| A field on the per-page render delta | [Worked example B](#6-worked-example-b-distributed-compute) | The `pages.map(…)` projection at the end of the render handler **and** the merge in `dispatch.submit`'s `render:i` callback. Both, or the field never reaches main at all. |
| What a markdown-it rule emits | [Write the plugin](#1-write-the-plugin) | Nothing in the chain, if the rule is self-contained. But changing the emitted HTML changes what the accessibility scan can see --- read the construct-family note at the end of [Verify](#3-verify). |

Two things are easy to miss from a changer's position.

**The worker pool is persistent, so an edit to a handler or a task definition does not reach a running `serve.bat`.** The NOTE at the top of this page says so, and it matters more when changing than when adding: a new task simply does not appear, which is obvious, while a changed one goes on running its old body, which looks like the change having no effect.

**An `expected` list says what must have *merged*, not what the body reads.** Removing a predecessor because `execute()` ignores its input is the way to reintroduce a race. `writePdf` lists `renderJoin` and never touches it, because the book is assembled from `page.renderedContent` and `renderJoin` is what guarantees every chunk's content has been merged into the master pages. A dependency count reaching zero does not mean the `submit()` calls that merge those results have run; the barrier's `expected` list is the only thing the scheduler checks before letting it proceed.

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
| Higher-number priority claims first when multiple tasks are READY. | `priority: N` |
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
      // A miss is a bug, not a condition to tolerate -- see below.
      if (!p) {
        throw new Error(
          `render:${i} returned a page the build does not know: ${r.destPath}`,
        );
      }
      p.renderedContent = r.renderedContent;
      if (r.offlineMisses !== undefined) p.offlineMisses = r.offlineMisses;
      if (r.wordCount !== undefined)     p.wordCount     = r.wordCount;   // ← new
    }
    state.searchChunks[i] = renderOut.searchEntries;
  },
});
```

> [!IMPORTANT]
> **Throw on the merge path; never skip.** `pageByDest` is built from the same page
> list the chunks were sliced from, so a page the callback cannot find means a chunk
> produced something the build never dispatched. Skipping it silently drops that
> page's `renderedContent`, and every consumer of that field --- the search index,
> the PDF book --- skips a page that has none rather than complaining. That is
> exactly how ~6 pages went missing from `search-data.json` on about one build in
> three, undetected. Every skip on the chunk-merge path has since been made loud;
> new fan-out code must keep it that way.

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

`createMarkdownIt` in `render.mjs` builds the configured markdown-it instance. Seventeen plugins are applied in a fixed order: three from npm (`markdown-it-attrs`, `markdown-it-deflist`, `markdown-it-footnote`) interleaved with fourteen defined in `render.mjs` itself. A new plugin becomes part of that order.

Those in-tree plugins cover token-stream transforms --- `svgInlinePlugin` embeds SVG diagrams, `headingLevelNormalizePlugin` repairs legacy pages that skip from `h1` to `h3` --- alongside link, slug, and typography helpers, most of them closing a behavioural gap between markdown-it and the kramdown dialect the content was authored against. [Pipeline Stages](Pipeline-Stages#the-plugin-chain) tabulates all seventeen in registration order, with what each one does.

The same factory is called twice on main (once for the shared site-level SEO instance via `markdownInit`, and once per dev-tooling harness that re-renders) and once per render worker (via `renderEnvInit`). Plugins that reach for module-scope state must therefore work across worker boundaries --- in practice, that means no mutable closure-captured state, since each worker has its own module-scope instance.

### 1. Write the plugin

A markdown-it plugin is a function that receives the `md` instance and mutates it. Two common shapes follow. The first is presented as it ships rather than as something to write: the pattern reads more clearly from a rule that is live in the tree and can be inspected on any page, and this particular rule must not be written a second time.

**Renderer override** --- replace the function markdown-it uses to emit one token type. The site's live example is the table wrapper. `createMarkdownIt` applies it inline rather than through `md.use()`, which is the right shape for a pair of rules that no other plugin has to be ordered against:

```js
// builder/render.mjs, inside createMarkdownIt

md.renderer.rules.table_open = (tokens, idx, opts, _env, slf) =>
  slf
    .renderToken(tokens, idx, opts)
    .replace(/<table>/, `<div class="table-wrapper" tabindex="0"><table>`);

md.renderer.rules.table_close = (tokens, idx, opts, _env, slf) =>
  `</table></div>` + slf.renderToken(tokens, idx, opts).replace(/<\/table>/, "");
```

Three decisions sit in those six lines, and a rewrite drops all three:

- **The default renderer runs first and its output is rewritten,** rather than the tag being built by hand. `renderToken` is what applies markdown-it's per-token block-prefix whitespace, so calling it keeps the leading newline the parser would have emitted when the table opens a list item, a definition, or a blockquote child. A wrapper concatenated around a literal `<table>` string loses it.
- **`tabindex="0"` is an accessibility fix.** just-the-docs's `tables.scss` gives `.table-wrapper` `overflow-x: auto`, and a scroll container that cannot take focus cannot be scrolled without a pointer; axe's `scrollable-region-focusable` rule keys on exactly that, and it failed across 44 pages before the attribute was added. It is unconditional for the same reason `highlight.mjs` marks every `div.highlight`: whether a table overflows depends on the viewport, so there is no answer at render time. `custom/custom.scss` gives the resulting focus a visible ring.
- **The wrapper exists because tbdocs renders no Liquid.** just-the-docs emitted it from an `_includes/table_wrappers.html` pass; the theme's vendored `_sass` still keys its table rules on `.table-wrapper`, so the div has to come from the renderer instead.

> [!IMPORTANT]
> **Every table the site publishes is already wrapped, and a plugin must not wrap them again.** A second `table_open` override does not replace the shipped rule --- it composes with it, because the "original" such a plugin captures *is* the rule above. Each table then comes out inside two `.table-wrapper` divs, which the stylesheet makes two nested scroll containers, the outer one with no `tabindex` on it. Write the markdown; the wrapper and its focusability are automatic.

**Block rule** --- a new fenced syntax that emits a `<div class="callout">`. This one is genuinely unbuilt: nothing in the tree registers a `md.block.ruler` rule today, and the GFM admonitions the pages use are a pre-render text rewrite rather than a block rule.

```js
// builder/callout-plugin.mjs

export function calloutPlugin(md) {
  md.block.ruler.before("fence", "callout", (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (state.src.slice(pos, pos + 3) !== ":::") return false;
    if (silent) return true;

    const label = state.src.slice(pos + 3, max).trim();

    // Locate the closing fence before emitting anything. An unterminated
    // callout runs to the end of the enclosing block, as an unclosed ``` does.
    let closeLine = startLine + 1;
    for (; closeLine < endLine; closeLine++) {
      const p = state.bMarks[closeLine] + state.tShift[closeLine];
      if (state.src.slice(p, state.eMarks[closeLine]).trim() === ":::") break;
    }

    state.push("callout_open", "div", 1).attrSet("class", `callout callout-${label}`);

    // Tokenize the body. Advancing state.line past those lines instead
    // consumes them: the div renders empty and the content is gone, with
    // nothing to report because no rule failed.
    const parentType = state.parentType;
    const lineMax = state.lineMax;
    state.parentType = "callout";
    state.lineMax = closeLine;
    state.md.block.tokenize(state, startLine + 1, closeLine);
    state.parentType = parentType;
    state.lineMax = lineMax;

    state.push("callout_close", "div", -1);
    state.line = closeLine + 1;
    return true;
  }, { alt: ["paragraph", "blockquote", "list"] });
}
```

The `alt` list names the parse modes the rule is also consulted in. Without `"paragraph"` in it, a `:::` line following a line of prose is absorbed into that paragraph as literal text instead of opening a callout.

For the full rule API see the [markdown-it documentation](https://markdown-it.github.io/markdown-it/) and the existing in-tree plugins in `render.mjs` as worked examples.

### 2. Register in `createMarkdownIt`

A plugin written as its own module is registered in two steps. A renderer override written inline, as the table rules above are, needs neither --- it is already in the factory body.

Add an import at the top of `render.mjs`:

```js
import { calloutPlugin } from "./callout-plugin.mjs";
```

Find `createMarkdownIt` and add `md.use(calloutPlugin)` in the plugin chain. **Order matters** --- place the new plugin after any plugin it depends on and before any plugin that could interfere with its token types. Note that registration order only decides execution order for a rule added with `md.core.ruler.push()`; `.before(name)` and `.after(name)` insert at a named position regardless of when the plugin was registered, which is how `headingLevelNormalizePlugin` runs ahead of `headerIdPlugin` while being registered after it.

```js
export function createMarkdownIt(ctx) {
  const md = new MarkdownIt({ /* ... */ });
  // ... existing npm plugins ...
  // ... existing in-tree plugins ...
  md.use(calloutPlugin);
  return md;
}
```

### 3. Verify

Run `build.bat` and open an affected page; for live feedback, use `serve.bat`. A plugin that traverses the full token stream on every page runs N+1 times per build (one main thread + N workers), so check the per-task render timing in the summary or the Gantt chart for any spike.

**If the plugin emits markup the site has not carried before --- a new wrapper element, a widget, a figure, a control --- register a construct family for it in [`scripts/pick_a11y_sample.mjs`](Tools#pick-a11y-sample) in the same change.** The accessibility scan audits thirteen sample pages out of ~1,160, and a construct no sample page carries is a construct no axe rule keyed on it ever runs against. Leaving it out is not neutral: the gate goes on reporting a clean pass while covering less than it did before, which is the failure mode the derived sample exists to prevent. `node scripts/pick_a11y_sample.mjs --census` shows what the existing families are and which pages carry them; `--check` names the gaps and the cheapest page that closes each. The same obligation applies to a new task or sub-stage that changes the emitted HTML, and to a template change.

---

## Adding a render-worker sub-stage

When the new work is per-page CPU compute, slotting it into the existing `render` handler is the most direct path. Skip the per-task overhead, ride the same fan-out.

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

## Adding a verification gate

A gate runs after the build and decides whether what the build produced is acceptable. `check.bat` runs six of them today. [Testing](#testing) lists them; [Tools and Scripts](Tools#checkbat) documents each one, and a new gate gets its entry there.

**First decide whether it is a gate at all.** The link and integrity check used to be one and now runs inside the build, because both trees' final HTML is already decoded in worker memory when `flush:i` runs --- checking it on disk meant writing ~270 MB out to read it straight back. The test is whether the check needs something the build does not already hold: a browser, a real font, a second implementation to compare against, a tree from an earlier run. If it needs none of those, it is a pipeline task, and the walkthroughs above apply instead.

### Conventions

**Exit codes.** Three values, used the same way by all six:

| Code | Means |
|---|---|
| `0` | The checked thing is fine. |
| `1` | The checked thing failed. This is the finding. |
| `2` | The harness or the environment failed --- an unknown argument, an absent tree, an unhandled throw. Nothing was checked. |

Separating 1 from 2 is what stops a broken gate reading as a clean site, and it has to hold at the top level too. End the script with `main().catch((err) => { console.error(err); process.exit(2); })`, the way `check_a11y.mjs` does, so a crash cannot fall through to node's default exit 1 and be mistaken for a finding.

**Say what a pass covered.** Five of the six print it: `check_dot_fit.mjs` gives the diagram count, `pick_a11y_sample.mjs --check` the number of construct families in use, `check_publish_policy.mjs` the probe counts on both sides, `check_a11y.mjs` the page × theme × viewport product it audited. A gate silent on success says nothing about whether it examined anything, which is the state a gate that has quietly stopped working also reports.

**Name the artifact and the remedy.** A gate's output is read by someone who was in the middle of something else. `check_dot_fit.mjs` names the failing diagram, then `builder/dot-metrics.mjs` and an `@hpcc-js/wasm-graphviz` bump as the usual cause, then `build.bat` as the fix. `check_tree_fresh.mjs` names the source file that is newer than the tree and says to run `build.bat`. `pick_a11y_sample.mjs --check` names the uncovered construct *and* the cheapest page that would cover it.

**Resolve paths from `import.meta.url`.** `resolve(fileURLToPath(new URL("..", import.meta.url)))` is what five of the six do, directly or through `axe-scan.mjs`'s `REPO_ROOT`, and it makes the gate work from any directory. `check_publish_policy.mjs` is the exception, with a working-directory-relative `docs` default, which is why the batch wrappers `pushd` to the repository root before running anything.

**Be explicit about what may already have run.** `check.bat` is ordered cheapest-first and stops at the first failure, so a gate's position decides what it can assume. Everything after step 2 may assume `_site-offline/` is current, because `check_tree_fresh.mjs` refuses a stale tree. Nothing may assume the build's own link check passed: a link failure sets the build's exit code without aborting the build, so a tree that failed it is still on disk and still fresh.

**Register it in three places** --- `check.bat`, `.github/workflows/checks.yml` and `.github/workflows/tbdocs-gh-pages.yml` --- each with a comment saying what the gate protects against, which is the convention already in all three. Leaving it out of the workflows is a decision, not an omission, and gets the same comment: `check_tree_fresh.mjs` is in neither, because CI builds in the same job and cannot have a stale tree.

### It must be able to fail

**A gate that silently checks less reports exactly what a clean site reports.** A green run is therefore not evidence about the site until something independent says the gate can still go red.

That is not a style note. The accessibility sample reported a clean pass over six hand-picked pages while 54 pages carried violations, every one in a construct no sample page had. Separately, blocking one more script during the scan looked like a 130 ms win and cut the colour-contrast node count on one page from 54 to 2 --- axe seeing less, reported as a pass. Both were green throughout.

So a new gate needs a second assertion of the opposite sign, and there are four shapes in the repository to copy:

- **Named probes on both sides.** `check_publish_policy.mjs` asserts that thirteen file types stay refused *and* that six stay published, because a policy that refuses everything also reports a clean sweep.
- **A deliberately corrupted side.** `check_links_diff.mjs --self-test` diffs the checker against a mutated copy of itself and fails unless the difference is reported.
- **A fixture that provokes one fault of each kind,** with the count asserted afterwards. The real site is clean, so without one every category compares empty against empty --- and a category that has stopped being checked looks identical to a category with nothing to find.
- **An A/A control.** Running `check_a11y_fingerprint.mjs` with the same scheme on both sides says whether the harness is stable, before any A/B result from it is believed.

When the gate cannot assert its own correctness from the inside, the proof goes in a sibling script and is named in the gate's header comment, so whoever changes the gate next finds it in the file they are already reading.

---

## What a change obliges in the documentation

Everything in [Verify](#7-verify) and [Testing](#testing) is a code gate. Not one of them reads a documentation page. So a contributor who follows this page exactly can ship a correct task, a green `build.bat`, a green `check.bat`, and a pipeline reference that describes a build which no longer exists --- and nothing anywhere will report it. Most of the defects two successive documentation audits turned up were made that way, which is why the obligation is written down here rather than left to be reconstructed.

Four files under `docs/` model the task graph: `Pipeline-Stages.md`, `Builder.md`, this page, and `scheduler-dag.dot`. None of them is generated from `TASKS`. Every surface below is maintained by hand.

### `Pipeline-Stages.md`

Three surfaces, and the second is the one that gets missed.

**The task's own section.** One `###` heading per task, under the numbered section matching its Gantt section, opening with a fenced block that gives its `expected` array --- and its `execute()` return shape where the return value matters --- followed by prose for what `submit()` merges into `SharedState`. A new predecessor, a new field on the returned delta, a new key written to `state`: each is an edit here.

**The reverse edges.** A task's position in the graph is stated once in its own section and again in the `expected` line of every task that depends on it. Add `myTask` to `writeAux.expected` in the code and `writeAux`'s section goes on printing the old list, because nothing connects the two. `Pipeline-Stages.md` names `renderJoin` on nine lines; two of them are the `expected` declarations belonging to `searchData` and `writePdf`. Grep the task name across the whole file rather than editing only the section that carries its name.

**The module export table.** [Module export tables](Pipeline-Stages#module-export-tables) gives the signature of the function each task calls, return shape included --- so a return shape is documented twice on one page, and the two copies go stale independently.

### `Builder.md`

Four surfaces, none derived from `TASKS`:

- The **static-task count** in [Task DAG by section](Builder#task-dag-by-section) --- the literal number in *"The pipeline has N named static tasks plus 2N dynamic ones"*.
- The **section-membership lists** immediately below it, one line per Gantt section.
- The **per-task bullet** under the matching `### Seeds` / `### Spine` / `### Render` / `### Write` subsection, plus the task's row in [What runs where](Builder#what-runs-where).
- The **two ASCII DAG sketches**, one under Spine and one under Render.

Those four are not kept in step with each other either: a task can be named in a membership list and absent from both the per-task bullets and the "What runs where" table. So do not treat a neighbouring task's coverage as proof of what the full set is. Take the union of two, which is what the completeness test below does.

### `scheduler-dag.dot`

`docs/assets/images/dot/scheduler-dag.dot` is the DAG rendered on `Builder.md`, and it is **written by hand** --- node by node and edge by edge, against two-letter aliases declared at the top of the file. A new task needs a node (fill `#fef7e0` with stroke `#f9ab00` for main-thread, `#e8f0fe` with `#4285f4` for worker), one outgoing edge per entry in its `expected`, and one new incoming edge on every task that now depends on it.

`check_dot_fit.mjs` is not a guard against getting this wrong. It renders each committed `.svg` in a browser and asks whether every label still sits inside the box Graphviz drew for it, which is a geometry question. A diagram whose edges contradict `TASKS` passes that check, passes the build, and renders cleanly on the page. Nothing in the repository compares the diagram against the graph, so it has to be read against `TASKS` by eye.

### What not to update

A grep for a task name also hits `builder/`, which holds design documents at three different life stages. [`builder/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/README.md)'s Documentation list is the authority on which is which, and it marks two classes as not maintained reference:

- **`REVIEW-*.md` and `PLAN-REVIEW-*.md`** --- frozen audit snapshots of a commit range. Their whole value is that they record what was true at that commit; editing one to match a later change destroys it.
- **`PLAN-scheduler.md`** --- the superseded push-based scheduler design, kept for its reasoning rather than as a description of the build. `PLAN-sab-pull-scheduler.md` is the current one, and it does need updating.

Read the README entry for a `builder/` file before editing it.

### The completeness test

There is no drift gate. Nothing fails when a task's documentation goes stale, so the honest test is a grep, run before committing:

    grep -rn "myTask" docs/ builder/

Then triage every hit by the file it is in. Under `docs/` the legitimate homes are the four above; a hit anywhere else is either a page that has grown a dependency on the task graph or an ordinary English word, and both `dispatch` and `render` collide that way. Expect one more diagram in the results if the task is `writePdf`: `pdf-render-pipeline.dot` names it in a cluster label without modelling the graph.

The more useful half is the inverse, and it is worth running before writing anything. Grep **two** existing tasks you did not touch, and take the union of the files they appear in:

    grep -rl "searchData" docs/ builder/
    grep -rl "writePdf"   docs/ builder/

One task is not a template, because an existing task can itself be missing from a surface. Two are a much better one: where they agree is the obligatory set, and where they disagree is worth reading before deciding which of the two is wrong.

---

## Testing

Four commands cover the loop:

1. **`build.bat`** --- full pipeline, including the link and integrity check over both trees while their HTML is still in worker memory. A clean exit and a sensible Gantt placement is the bar.
2. **`serve.bat`** --- live-reload dev server for visual checks. Remember the persistent pool: Ctrl+C and restart after handler-code or task-graph changes. Check both themes if the change touches anything visible.
3. **`check.bat`** --- the gates that need a browser or a second pass over the built tree: the publish allowlist, tree freshness, diagram fit, the axe patch equivalence check, the accessibility sample-coverage check, and the accessibility scan itself.
4. **`book.bat`** --- re-renders the PDF if your change affects `_site-pdf/` or any chapter body.

A clean run of all four is the bar for "ready to commit".

Two of `check.bat`'s gates are the ones a builder change is most likely to trip, and both fail for a reason worth reading rather than working around. `pick_a11y_sample.mjs --check` fails when the change introduced a construct the sample does not cover --- the fix is a new construct family, not a wider sample. `check_publish_policy.mjs` fails when a new emitted file type is not on the allowlist in `builder/publish-policy.mjs`; add it to `BUILD_EXTENSIONS`, which is deliberately a separate set from `SOURCE_EXTENSIONS` so blessing a generated type does not also bless a stray one a contributor drops into `docs/`.

> [!NOTE]
> `check.bat` requires `build.bat` to have run first; `check_tree_fresh.mjs` refuses a tree older than the sources that produced it rather than letting the later gates report on stale output.

---

## See Also

- [Pipeline Stages](Pipeline-Stages) -- full data model, per-task interface reference, per-module export tables, and the [markdown-it plugin chain](Pipeline-Stages#the-plugin-chain) in registration order.
- [Project styling](Builder#project-styling) -- where a CSS rule goes, the light/dark two-compilation model, and the specificity trap that makes a dark-mode override silently do nothing.
- [tbdocs Builder](Builder) -- architectural tour and design rationale.
- [Tools and Scripts](Tools) -- every gate `check.bat` runs, and what each one is protecting.
- [Building and Deployment](Building) -- the day-to-day build workflow for content contributors.
