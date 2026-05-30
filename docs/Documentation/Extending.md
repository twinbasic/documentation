---
title: Extending the Builder
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Extending
---

# Extending the Builder
{: .no_toc }

How to add a new pipeline stage or a custom markdown-it plugin to `tbdocs`. This guide assumes working knowledge of modern JavaScript (async/await, ES modules) but not of the build pipeline internals. Read [Pipeline Stages](Pipeline-Stages) first for the data contracts each stage operates on.

* TOC goes here
{:toc}

## Two extension points

**New pipeline stage** --- a new `.mjs` module that reads from the `pages` array or `site` object and writes output to disk or to page fields. The module exports one async function. The orchestrator in `tbdocs.mjs` registers it as a task in the scheduler's DAG, with declared predecessor dependencies that determine when it runs. No plugin registry or hook system is involved.

**New markdown-it plugin** --- a function that configures the shared markdown-it instance with additional parsing or rendering rules. Registered in `createMarkdownIt` inside `render.mjs`. Both Phase 2's SEO title extraction and Phase 3's body render use the same instance, so the plugin runs on every page.

> [!NOTE]
> Stage module changes are not hot-reloaded. After editing a stage module, stop and restart `serve.bat` (Ctrl+C, then re-run) to load the change.

---

## Adding a pipeline stage

### 1. Write the module

Create `builder/my-stage.mjs`. Export one async function. The standard signature takes the `pages` array, the `site` object, and any additional context the stage needs (typically `destRoot`), and returns a stats object for logging:

```js
// builder/my-stage.mjs

import { writeFileMkdirp } from "./write.mjs";
import path from "node:path";

export async function myStage(pages, site, destRoot) {
  const manifest = pages.map(p => ({
    url: p.permalink,
    title: p.frontmatter.title ?? null,
  }));

  const dest = path.join(destRoot, "pages-manifest.json");
  await writeFileMkdirp(dest, JSON.stringify(manifest, null, 2));

  return { entries: manifest.length };
}
```

Use the I/O utilities exported by `write.mjs` --- `writeFileMkdirp`, `mkdirRec`, `runLimited`, `safeWrite` --- rather than raw `fs.writeFile` calls. They handle directory creation and include the destination path in error messages.

> [!IMPORTANT]
> If the stage writes to disk, check `opts.dryRun` and skip all filesystem writes when it is `true`. The `dryRun` flag is passed through the same `opts` object the orchestrator receives and must propagate to all I/O operations.

If the stage writes new fields to page objects, add them at the point in `runBuild` where they first appear, and list them in the [data model table](Pipeline-Stages#page-objects-pages) in Pipeline Stages so other developers know which phase sets each field.

### 2. Register the stage in `tbdocs.mjs`

Add an import at the top of `builder/tbdocs.mjs`:

```js
import { myStage } from "./my-stage.mjs";
```

Then add a task definition in the `TASKS` object. Each task declares its predecessor IDs in `expected`, runs its work in `execute()`, and routes its output to downstream tasks in `submit()`. Most auxiliary stages depend on `write` (so the online tree is complete) and emit into `writeAux` or a similar downstream task:

```js
myStage: {
  expected: ["write"],
  runOnMain: true,
  async execute(_, ctx, state) {
    return myStage(state.pages, state.site, ctx.destRoot);
  },
  submit(out, emit) { emit("writeAux", out); },
},
```

Set `runOnMain: true` for stages that read from `state.pages` or `state.site` directly. The scheduler records per-task wall-clock timings automatically; the label in the timing summary is the task's key in the `TASKS` object.

### 3. Handle the `dryRun` flag

When `dryRun` is `true`, the stage should log what it would do without touching the filesystem. The flag is available as `ctx.opts.dryRun` inside `execute()`:

```js
export async function myStage(pages, site, destRoot, { dryRun = false } = {}) {
  const manifest = pages.map(p => ({ url: p.permalink, title: p.frontmatter.title ?? null }));

  if (dryRun) {
    console.log(`[dry-run] my-stage: would write ${manifest.length} entries`);
    return { entries: manifest.length };
  }

  const dest = path.join(destRoot, "pages-manifest.json");
  await writeFileMkdirp(dest, JSON.stringify(manifest, null, 2));
  return { entries: manifest.length };
}
```

### 4. Verify

Run `build.bat` and look for the timing label in the output. Then run `check.bat` to confirm the new output does not break existing link resolution or the page-count guard.

---

## Adding a markdown-it plugin

### Background

`createMarkdownIt` in `render.mjs` builds the single markdown-it instance the entire pipeline uses. It applies `markdown-it-attrs`, `markdown-it-deflist`, `markdown-it-footnote`, and roughly ten in-tree plugins in a fixed order. A new plugin becomes part of that order.

The same instance is used for Phase 2's SEO title extraction (via `renderTitle`) and Phase 3's body render (via `renderPhase`). A plugin that changes how inline content renders affects both passes. A block-level plugin that adds new tokens generally affects only Phase 3, since `renderTitle` strips all HTML.

### 1. Write the plugin

A markdown-it plugin is a function that receives the `md` instance (and an optional options object) and mutates it by adding rules, overriding renderer functions, or adjusting options.

**Renderer override example** --- wrap every `<table>` in a scrollable container:

```js
// builder/table-wrap-plugin.mjs

export function tableWrapPlugin(md) {
  const originalOpen = md.renderer.rules.table_open
    ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  const originalClose = md.renderer.rules.table_close
    ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    "<div class=\"table-wrapper\">" + originalOpen(tokens, idx, options, env, self);

  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    originalClose(tokens, idx, options, env, self) + "</div>";
}
```

**Block rule example** --- a new fenced syntax that emits a `<div class="callout">`:

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
      if (state.src.slice(state.bMarks[state.line] + state.tShift[state.line], state.eMarks[state.line]) === ":::") {
        state.line++;
        break;
      }
      state.line++;
    }
    state.push("callout_close", "div", -1);
    return true;
  });
}
```

For the full markdown-it rule API --- block rules, inline rules, core rules, renderer rule overrides --- see the [markdown-it documentation](https://markdown-it.github.io/markdown-it/) and the existing in-tree plugins in `render.mjs` as worked examples.

### 2. Register in `render.mjs`

Open `builder/render.mjs`. Add an import near the top of the file (alongside the other in-tree plugin imports):

```js
import { tableWrapPlugin } from "./table-wrap-plugin.mjs";
```

Find `createMarkdownIt` and add `md.use(tableWrapPlugin)` in the plugin chain. **Order matters** --- place the new plugin after any plugins it depends on, and before any plugins that may conflict with its token types:

```js
export function createMarkdownIt(ctx) {
  const md = new MarkdownIt({ ... });
  // ... existing npm plugins ...
  // ... existing in-tree plugins ...
  md.use(tableWrapPlugin);   // new plugin, appended after existing ones
  return md;
}
```

### 3. Verify

Run `build.bat` and open one of the affected pages in the browser (or use `serve.bat` for live reload). Then run `check.bat` to confirm no links are broken and the build exits cleanly. Watch Phase 3 timing in the console output --- a block rule that traverses the full token stream on every page can add measurable time to the ~1--2 s hot path.

---

## Testing both extension types

The same four-step workflow applies to any change to the builder:

1. **`build.bat`** --- runs the full pipeline; a clean exit means no build-time errors.
2. **`serve.bat`** --- live-reload server; navigate to affected pages in the browser to spot visual regressions.
3. **`check.bat`** --- offline link and integrity check; catches broken links and missing pages introduced by the change.
4. **`book.bat`** --- re-runs the PDF build; required if the stage or plugin affects Phase 8 or the `book.html` output.

A clean run of all four is the bar for "ready to commit".

> [!NOTE]
> `check.bat` requires `build.bat` to have run first; it reads from `_site/` and `_site-offline/`.

---

## See Also

- [Pipeline Stages](Pipeline-Stages) -- full data model and export reference for every stage.
- [tbdocs Builder](Builder) -- narrative design rationale for the pipeline.
- [Building and Deployment](Building) -- the day-to-day build workflow for content contributors.
