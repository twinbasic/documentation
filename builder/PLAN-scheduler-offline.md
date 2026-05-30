# Move offline HTML rewrite into render workers

Companion to [PLAN-scheduler.md](PLAN-scheduler.md). Covers moving
the CPU-bound per-page offline URL rewrite from `writeOffline` (main
thread, ~700 ms) into the render worker fan-out, so it parallelises
across all CPUs and `writeOffline` becomes I/O-only (~200 ms).

## Motivation

`writeOffline` is the longest single task after `write`. Profiling
shows the time is dominated by `deriveOfflinePage` — a pure-compute
function that strips SEO metadata, rewrites every URL from absolute
to page-relative, and injects the offline search setup script. The
function reads only `page.html`, `page.destPath`, a `sitePaths` Set,
resolution caches, and `baseurl`. All of these can be made available
to workers before dispatch, without reading from `_site/`.

The `sitePaths` set's current dependency on `_site/assets/` (theme
file enumeration in `buildSitePaths`) is artificial — the files come
from `builder/vendor/just-the-docs/assets/` (known statically) plus
two generated CSS paths that are deterministic.

## Model assignments

| Phase | Model  | Rationale |
|-------|--------|-----------|
| I     | Sonnet | Mechanical move-and-re-export. |
| II    | Sonnet | Straightforward wiring with clear instructions. |
| III   | Opus   | Most judgement: SAB state reconstruction, nav-cache pre-pass, render handler integration. |
| IV    | Sonnet | Small, well-specified signature changes. |
| V     | Sonnet | Documentation updates. |

## Phase I: Extract `offline-rewrite.mjs`

Create `builder/offline-rewrite.mjs` with all pure-compute rewrite
functions extracted from `offline.mjs`. This isolates worker-safe
code from the I/O + acorn-dependent code that stays on main.

### Exports from `offline-rewrite.mjs`

- `deriveOfflinePage`, `deriveOfflinePageCached`, `sliceNavBlock`
- `deriveOfflineCss` (used by `copyOfflineThemeAssets` on main)
- `deriveOfflineRedirect` (used by `writeOfflineRedirects` on main)
- `normalizeBaseurl`, `posixDirname`, `fileDirSegsFromRel`
- `offlineExcluded`, `fnmatchPathname`
- All internal helpers: `stripSeo`, `rewriteHtml`,
  `injectSearchSetup`, `rewriteCss`, `computeRelative`,
  `resolveRaw`, `buildSegs`, `decode`, `computeRelUrl`,
  `getPageCache`, `escapeRegExp`, regex constants

### New function: `buildSitePathsSync`

Synchronous version of `buildSitePaths` that takes an explicit
`themeAssetRels` array instead of walking `_site/assets/`.

```js
function buildSitePathsSync(pages, staticFiles, excludePatterns, stubs, themeAssetRels) {
  const paths = new Set();
  for (const p of pages) {
    if (p.frontmatter?.layout === "book-combined") continue;
    const rel = p.destPath.replaceAll("\\", "/");
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  for (const s of staticFiles) {
    const rel = s.destRel.replaceAll("\\", "/");
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  for (const stub of stubs) {
    const rel = stub.destPath.replaceAll("\\", "/");
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  for (const rel of themeAssetRels) {
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  return paths;
}
```

### New function: `enumerateVendoredThemeAssets`

Sync `readdirSync` walk of `builder/vendor/just-the-docs/assets/`.
Returns paths like `["assets/js/just-the-docs.js",
"assets/js/vendor/lunr.min.js"]`. Lives in `offline.mjs` (not
`offline-rewrite.mjs`) to keep the worker-imported module free of
`node:fs` dependencies. `dispatch.execute` imports it from
`offline.mjs`.

### `offline.mjs` changes

- Remove moved functions, import and re-export from
  `offline-rewrite.mjs`.
- Keep all I/O functions: `writeOffline`, `buildOfflineState`,
  `writeOfflinePages`, `writeOfflineRedirects`,
  `copyOfflineStatics`, `copyOfflineThemeAssets`,
  `setupOfflineDest`, `patchJustTheDocsJs`, `writeSearchDataJs`,
  `collectThemeFiles`.
- Keep `buildSitePaths` (async, for diff-tool backward compat).

### Verification

`build.bat && check.bat` — byte-identical output, no behaviour
change.

---

## Phase II: Expand `dispatch` and SAB payload

### `dispatch.expected`

Add `"mermaid"` and `"deriveRedirects"`.

- `mermaid` ensures `state.staticFiles` includes freshly-generated
  SVGs (appended in `mermaid.submit`).
- `deriveRedirects` provides the redirect stubs for `sitePaths`.
- Neither adds latency — both complete well before
  `resolveBookChapters` (~600 ms into the build).

### Emitter updates

The scheduler requires every expected predecessor to emit to the
waiting task:

- `mermaid.submit`: add `emit("dispatch", out)`
- `deriveRedirects.submit`: add `emit("dispatch", out)`

### `dispatch.execute`

After receiving `deriveRedirects: { stubs }`:

1. Enumerate vendored theme assets via
   `enumerateVendoredThemeAssets()`.
2. Append the two known generated-CSS paths
   (`assets/css/tb-highlight.css`,
   `assets/css/just-the-docs-combined.css`).
3. Call `buildSitePathsSync(state.pages, state.staticFiles,
   excludePatterns, stubs, themeAssetRels)`.
4. Stash `sitePaths` on `state` for later use by `writeOffline`.
5. Compute `skipOffline` from config / CLI opts.

### SAB payload

Three new fields in the `shared` object:

```js
{
  ...existing,
  sitePathsArr:           [...sitePaths],   // ~1080 strings, ~30-50 KB
  offlineExcludePatterns: [...],            // from config
  skipOffline:            Boolean,          // from --no-offline / config
}
```

### Verification

Build succeeds, workers receive the expanded SAB, offline output
unchanged (workers don't use the new data yet).

---

## Phase III: Worker offline rewrite

### `cpu-worker.mjs` render handler

Import from `offline-rewrite.mjs`: `deriveOfflinePage`,
`deriveOfflinePageCached`, `sliceNavBlock`, `normalizeBaseurl`,
`posixDirname`.

After `templatePhase`, if `!skipOffline`:

1. Build per-worker offline state: `new Set(sitePathsArr)`, fresh
   caches, normalized baseurl.
2. Run the nav-cache pre-pass (group chunk pages by dest dir, derive
   the first page per dir, cache nav block slices) — same logic as
   current `writeOfflinePages` lines 207-223.
3. Set `offlineState.navCache = navCache` so
   `deriveOfflinePageCached` can find it via `deps.navCache`.
4. Call `deriveOfflinePageCached` per writable page, storing
   `offlineHtml` and `offlineMisses` on the page object.

Return delta gains two fields:

```js
{ destPath, renderedContent, html, offlineHtml, offlineMisses }
```

When `skipOffline` is true, the entire offline pass is skipped — no
Set construction, no rewriting, `offlineHtml` is `undefined`.

### `render:i.submit` in `tbdocs.mjs`

Merge `offlineHtml` and `offlineMisses` onto master pages alongside
the existing fields.

### Nav-cache and cross-chunk dedup cost

Works per-chunk. Pages in the same directory within a chunk share the
cache. Cross-chunk directories build their cache independently —
correct but slightly less efficient. The cache is an optimization,
not a correctness dependency.

Two cache systems are affected by per-worker isolation:

**Nav-cache** (per-directory sidebar substitution). The sidebar nav
block is ~80 KB, byte-identical across every page before rewrite.
The nav-cache runs `deriveOfflinePage` on the first page per
destination directory, stashes the pre/post-rewrite nav block, and
substitutes it directly for subsequent pages — avoiding re-running
the regex over 80 KB per page. With per-worker caches, a directory
that spans a chunk boundary gets its first-page rewrite done
independently in both chunks. Cost per extra rewrite: ~0.24 ms
(~200 ms / 837 pages, from the comment at `offline.mjs:189`). With
16 workers there are 15 chunk boundaries; worst case 15 directories
are split — 15 extra nav-block rewrites at 0.24 ms = ~4 ms total.
There are ~200 unique destination directories. Current single-
threaded nav-cache: 200 full rewrites. Per-worker: 200 + 15 = 215.

**URL resolution caches** (`rawResolution`, `seg`, `result`). These
cache the resolved form of each unique URL so it isn't re-resolved
for a later page. With per-worker caches, each worker resolves URLs
independently. But the nav-cache already eliminates the dominant
source of shared URLs — the ~800 sidebar links are cached as a
block, not resolved individually. The remaining per-page body URLs
are ~5-20 links per page, many unique to that page. The common ones
(links to frequently-referenced symbols) might total ~2,000 unique
URLs across the site. Each resolution is a Set lookup + string
manipulation — ~1 us. Even if every worker re-resolves all 2,000:
16 workers x 2,000 x 1 us = ~32 ms total, spread across workers
running in parallel.

**Net impact:** ~35 ms of redundant work total, spread across 16
parallel workers — ~2 ms added wall-clock. Noise against the
~500 ms saved by parallelisation.

### Transfer cost

Roughly doubles the render delta size (adding `offlineHtml` per
page). Estimated +40 ms per worker at structured-clone throughput.
Bounded and acceptable.

### Verification

`page.offlineHtml` is populated on all pages. Existing `writeOffline`
still runs its own CPU path (redundant but correct). Output
identical.

---

## Phase IV: Switch `writeOffline` to pre-computed HTML

### `writeOfflinePages` in `offline.mjs`

Add a `precomputed` option:

- When true: skip `deriveOfflinePage` / nav-cache entirely, write
  `page.offlineHtml` directly (I/O only).
- When false: existing CPU-bound path (kept for diff tools).

### `buildOfflineState`

Add optional `sitePaths` parameter:

- When provided: skip the async `buildSitePaths` call (avoids the
  `_site/assets/` walk).
- When absent: existing async path (for diff tools).

### `writeOffline` task in `tbdocs.mjs`

Pass both options:

```js
return writeOffline(state.pages, state.staticFiles, state.site, ctx.destRoot, {
  auxStats,
  precomputed: true,
  sitePaths: state.sitePaths,
});
```

### Verification

`build.bat && check.bat` — byte-identical offline output.

Compare `_site-offline/` output byte-for-byte against a baseline
built before Phase I. The offline tree must be identical.

Timing: `writeOffline` should drop from ~700 ms to ~200-300 ms. The
render worker times will increase modestly (~50-100 ms each) to
absorb the rewrite work.

---

## Phase V: Documentation

Update:

- `builder/PLAN-scheduler.md` — dispatch dependencies, dataflow
  diagram, render delta shape.
- `docs/Documentation/Builder.md` — offline build timing, structural
  win description.
- `docs/Documentation/Pipeline-Stages.md` — `writeOffline` signature,
  `offline-rewrite.mjs` exports.
- `docs/assets/images/mmd/scheduler-dag.mmd` — edges from
  `mermaid` / `deriveRedirects` to `dispatch`.
- `offline.mjs` header comment — note the extraction to
  `offline-rewrite.mjs`.

---

## Files to modify

| File | Changes |
|------|---------|
| `builder/offline-rewrite.mjs` | **New.** Pure-compute rewrite functions + `buildSitePathsSync` + `enumerateVendoredThemeAssets`. |
| `builder/offline.mjs` | Remove moved functions, re-export from `offline-rewrite.mjs`. Add `precomputed` path to `writeOfflinePages`. Add `sitePaths` option to `buildOfflineState`. |
| `builder/cpu-worker.mjs` | Import from `offline-rewrite.mjs`. Add offline rewrite pass after `templatePhase`. Expand return delta. |
| `builder/tbdocs.mjs` | `dispatch`: add deps, compute sitePaths, expand SAB. `render:i.submit`: merge offlineHtml. `writeOffline` task: pass `precomputed` + `sitePaths`. Emitter updates for `mermaid.submit` and `deriveRedirects.submit`. |
| `builder/sab-broadcast.mjs` | No changes — existing JSON serialize/deserialize handles the expanded payload. |
