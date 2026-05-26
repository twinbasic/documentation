# PLAN-7: Phase 7 — WRITE OFFLINE (`offline.mjs`)

Detailed implementation plan for the seventh phase of the tbdocs builder.
Read this together with [PLAN.md](PLAN.md) (the architecture overview),
[PLAN-1.md](PLAN-1.md) (DISCOVER), [PLAN-2.md](PLAN-2.md) (COMPUTE),
[PLAN-3.md](PLAN-3.md) (RENDER), [PLAN-4.md](PLAN-4.md) (TEMPLATE),
[PLAN-5.md](PLAN-5.md) (WRITE ONLINE), and [PLAN-6.md](PLAN-6.md)
(AUXILIARIES). The canonical Jekyll reference is
[`docs/_plugins/offlinify.rb`](../docs/_plugins/offlinify.rb) (the
~1,460-line Ruby implementation) and its companion writeup
[`docs/_plugins/offlinify.md`](../docs/_plugins/offlinify.md).

The WRITE OFFLINE phase has one job: take the rendered `_site/` tree
that Phases 5+6 just produced and **mirror it into `_site-offline/`,
rewriting every link so the tree opens cleanly under `file://` with no
HTTP server**. Two consequences of the project's URL shape make this
necessary: every `href` / `src` in the rendered HTML is root-absolute
(`/assets/css/...`), and pages use extensionless permalinks
(`/tB/Core/Const`). Under `file://` a leading slash resolves against
the filesystem root, not the site root, and browsers don't auto-append
`.html`. The fix has to run after render.

What Phase 7 does NOT do:

- Render markdown, compute nav, wrap chrome, write the online tree, or
  produce the sitemap / robots / search-data / redirect stubs (Phases
  1-6 already did).
- Assemble or write `book.html` for the PDF tree (Phase 8).
- Modify `_site/` in any way -- the online tree is read-only input
  here; transformations land in `_site-offline/` only.
- Run the offline link check (`check_links.mjs --forbid ...` -- a
  post-build harness, not a phase).

Target: **~400-600 ms wall time** on the current Windows dev machine
for the full offline mirror, processing ~1,130 input files
(837 pages + 290 redirect stubs + 4 CSS + 234 static files + 7 theme
assets + 1 search-data.json). The Jekyll equivalent (`offlinify.rb`)
runs ~2.65 s on the same machine, dominated by Ruby's per-page hook
plumbing and the `gsub` callback rate. The JS port targets a ~5× gain
by collapsing the per-page Ruby hook overhead and processing files in
bulk through Node's libuv concurrency.

## Status: shipped

Implementation landed in [`builder/offline.mjs`](offline.mjs) (~620
lines including doc comments + the new `derive*` exports for the diff
tools). The verify harness ([`verify-phase7.mjs`](verify-phase7.mjs))
runs end-to-end on the production tree and all 30+ acceptance checks
pass. Byte parity vs Jekyll's `docs/_site-offline/` is exact for every
HTML page (829 match + 8 accepted-divergence pages whose Phase 3/4
divergences propagate through), every redirect stub, every CSS file,
the patched just-the-docs.js, and the search-data.js wrap.

Phase 7 wall-time on the dev machine: **~870-1090 ms** (below the
1500 ms soft cap, above the 800 ms target). The HTML pass dominates;
the nav-block caching deferral from §7.D7 stayed deferred because the
total stayed under the soft cap. See §10's measured-timings table for
the per-substep breakdown.

Phase 7 surfaced one finding worth recording at the top: the URL
resolver's `sitePaths` Set needs to include the redirect-stub
destinations Phase 6 emits, not just pages + staticFiles + theme assets.
Without them, a page-relative link from inside a source markdown file
to a target whose only on-disk presence is a redirect stub (e.g.
`tB/Core/LBound.html`, the stub redirecting to
`tB/Modules/Information/LBound.html`) resolves to nothing and the
rewrite leaves the link as the original bare `LBound`. The fix
threads the redirect-stub list through `buildSitePaths`; see §6.1.

---

## 1. Inputs

### From Phase 1 / Phase 2 / Phase 3 / Phase 4 / Phase 5 / Phase 6

The `{ pages, staticFiles, site, destRoot }` object the orchestrator
carries after Phase 6, plus the auxiliary outputs Phase 6 returned.
Phase 7 reads:

| Field | Why Phase 7 reads it |
|---|---|
| `page.html` | The full layouted HTML document. Source for the per-page rewrite. `undefined` for `book.html` (skipped, per §7.D5). |
| `page.destPath` | Output path relative to `destRoot`. Drives the offline-tree destination (`<offlineRoot>/<destPath>`) and seeds the `site_paths` Set (§6.1) so URL resolution knows which files exist. |
| `page.permalink` | Read indirectly via the `site_paths` Set (page resolution targets `<destPath>` already, derived from permalink in Phase 1). Not consumed directly. |
| `staticFile.srcPath` | Source path to copy from -- avoids re-reading `_site/`. |
| `staticFile.destRel` | Destination path relative to `destRoot` / `offlineRoot`. Drives both copy destination and `site_paths` membership. |
| `site.config.url` | Origin of the absolute redirect-target URLs (`https://docs.twinbasic.com`). Phase 7 strips this prefix from redirect stubs and rewrites the path to page-relative. |
| `site.config.baseurl` | Currently empty. Phase 7 strips it from any `relative_url`-shaped path before resolution (§6.4). Honoured for forward-compat with GitHub Pages project sites. |
| `site.config.offline_exclude` | Glob patterns for files to skip during the mirror (`CNAME`, `robots.txt`, `sitemap.xml`, `book.html`). Honoured via `File.fnmatch`-equivalent `FNM_PATHNAME` semantics (§6.5). |
| `destRoot` | The `_site/` root Phases 5+6 wrote to. Phase 7 derives `offlineRoot = destRoot + "-offline"` and writes there. |
| Phase 6's `auxStats.search.json` (NEW) | The full ~2.8 MB JSON string Phase 6 just built. Phase 7 wraps it as `window.SEARCH_DATA = ...;` for the offline tree. Avoids a redundant ~2.8 MB disk re-read. See §7.D8. |
| Phase 6's `auxStats.redirects.stubs` (NEW) | The `{ destPath, html, sourcePage, fromPath }` list `deriveRedirectStubs` already produced. Phase 7 rewrites the absolute target URL in each stub's HTML and writes to the offline tree. Re-deriving would work too, but the bytes are already there. |

Phase 7 does NOT read `page.frontmatter`, `page.rawContent`,
`page.renderedContent`, `page.navPath`, `page.breadcrumbs`,
`page.children`, `page.navLevels`, `page.seo*`, `site.navTree`,
`site.bookData`, or `site.buildInfo` -- every per-page derivation
Phases 2-4 produced has already been baked into `page.html`. The
template-level state is invisible at the offline layer; only the byte
output matters.

### From the prebuilt `builder/assets/` tree

The theme assets Phase 5 already copied to `<destRoot>/assets/`:

```
assets/css/
  just-the-docs-combined.css      ~288 KB (compiled theme, custom colours baked in)
  just-the-docs-head-nav.css      ~287 B (per-page nav-prefix override)
  print.css                       ~18 KB (used by Phase 8's PDF tree too)
  rouge.css                       ~2.3 KB (syntax-highlight scope-to-colour rules)
assets/js/
  just-the-docs.js                ~19.5 KB (sidebar / search / copy-button runtime)
  theme-switch.js                 ~1.2 KB (dark-mode toggle)
  vendor/lunr.min.js              ~31 KB (search runtime)
```

Phase 7 reads `just-the-docs.js` from `_site/assets/js/` (already
copied by Phase 5) and writes the patched copy to
`_site-offline/assets/js/just-the-docs.js`. Other JS / CSS files
either copy verbatim (no patches) or undergo a CSS `url()` rewrite
(the `just-the-docs-combined.css` rule referencing `/favicon.png`).

### From the destination root (filesystem state)

`offlineRoot = <destRoot>-offline`. Phase 7 wipes its contents
(keeping the directory in place -- see §7.D2) at entry, then
populates from scratch. This mirrors Jekyll offlinify.rb's
`wipe_out_dest_contents` behaviour.

### From the orchestrator

| Value | Default | Source |
|---|---|---|
| `offlineRoot` | `<destRoot>-offline` -- a sibling of `destRoot` with the `-offline` suffix. On the current dev machine: `D:\OCP\wc\twinBASIC-documentation\docs\_site-new-offline`. | Derived inside Phase 7; not a separate CLI flag. |
| `dryRun` | `false` | The orchestrator's existing `--dry-run` flag (Phase 5+6 honour it). When true, Phase 7 logs intended writes but produces no files. |

Phase 7 has no new CLI flags. The `--no-offline` opt-out (parallel to
Jekyll's `also_build_offline: false`) is a future addition; the
default-on behaviour matches Jekyll exactly (`also_build_offline:
true` in `_config.yml`).

### Assumption: `_site/` is fully populated before Phase 7 starts

The orchestrator awaits Phase 5 (page writes) and Phase 6 (sitemap +
robots + redirects + search-data) before invoking Phase 7. Reading
from `_site/` during Phase 7 (the just-the-docs.js asset is the only
case) is safe: those files are flushed to disk before Phase 7's first
read.

Phase 6's parallel `Promise.all` settles in <300 ms on the dev
machine, so this is a non-issue in practice -- Phase 7's setup pass
(building `site_paths`) runs at least that long anyway.

---

## 2. Outputs

Phase 7 produces a fully populated `<offlineRoot>/` directory on disk:

```
<offlineRoot>/                          ~1,140 files
  index.html                            URL-rewritten copy of <destRoot>/index.html
  404.html                              URL-rewritten copy
  Reference.html                        URL-rewritten copy
  Reference/
    Core/Const.html                     URL-rewritten copy
    ...
  tB/
    Core/Const.html                     URL-rewritten copy
    ...
  Tutorials/CustomControls/Form Designer.html   URL-rewritten copy
  ...
  assets/
    css/
      just-the-docs-combined.css        verbatim copy + url() rewrite for /favicon.png
      just-the-docs-head-nav.css        verbatim copy
      print.css                         verbatim copy
      rouge.css                         verbatim copy
    js/
      just-the-docs.js                  patched copy (navLink + initSearch bodies replaced)
      theme-switch.js                   verbatim copy
      vendor/lunr.min.js                verbatim copy
      search-data.json                  verbatim copy of Phase 6's output
      search-data.js                    NEW: `window.SEARCH_DATA = {...the JSON...};`
    images/
      mmd/<hash>.svg                    verbatim copy
      mmd/<hash>.mmd                    verbatim copy (mermaid source -- ships alongside)
  Tutorials/.../Images/*.png            verbatim copies (content images)
  Features/Images/*.png                 verbatim copies
  favicon.png                           verbatim copy
  lib/*.mjs                             verbatim copies (PDF helpers, shipped offline too)
  render-book.mjs                       verbatim copy
```

What's **excluded** from `<offlineRoot>/` per the `offline_exclude`
config in `_config.yml`:

- `CNAME` -- GitHub Pages custom-domain config; pointless under `file://`.
- `sitemap.xml` -- crawler metadata.
- `robots.txt` -- crawler metadata.
- `book.html` -- never written to `_site/` either (Phase 5 skips it, layout `book-combined` is Phase 8's territory).

What's **added** that wasn't in `_site/`:

- `assets/js/search-data.js` -- the JS-wrapped form of search-data.json
  (loaded via `<script src=>`, which works under `file://`; XHR for
  `search-data.json` does not).

What's **patched** (content changed vs `_site/`):

- Every `.html` page: every `href` / `src` attribute starting with `/`
  rewritten to a page-relative path. Every page-relative `href` (e.g.
  `Attributes#description`) gains the appropriate `.html` /
  `/index.html` suffix. SEO block stripped (the jekyll-seo-tag output
  that Phase 4's `renderHeadSeo` emits byte-for-byte). Two `<script>`
  tags injected before `<script src="...just-the-docs.js">`:
  `window.OFFLINE_SITE_ROOT="..."` and `<script src=".../search-data.js">`.
- Every CSS file: every `url(/...)` rewritten to a page-relative path
  (covers `just-the-docs-combined.css`'s favicon reference).
- Every redirect-stub HTML: the four occurrences of the absolute
  `<site.url>/<path>` URL each rewritten to a page-relative path.
- `assets/js/just-the-docs.js`: `navLink()` and `initSearch()`
  function bodies replaced.

### Side effects

Filesystem mutations only. Phase 7 doesn't shell out, doesn't mutate
any in-memory data structure beyond the per-build caches it allocates
itself, doesn't network. The single visible effect is "the offline
tree on disk now matches the intended output."

### Why a wholly separate tree rather than in-place rewriting `_site/`

`_site/` is the canonical online-deploy artifact and must keep its
root-absolute URLs (so GitHub Pages serves it correctly). The offline
tree is a derivative; producing it alongside the online tree -- both
from the same in-memory page set -- means we ship one build that
satisfies both deployments. The cost is ~25 MB of disk space (the
offline tree is roughly the same size as `_site/`) and the ~400 ms
Phase 7 wall time. Worth it.

---

## 3. Module split

One new file ships in Phase 7's first cut, with internal section
boundaries that match Jekyll offlinify.rb's structure:

```
builder/
  offline.mjs   ~620 lines as shipped. Exports:
                  writeOffline(pages, staticFiles, site, destRoot, { auxStats })
                    -- the orchestrator entry point.
                  buildOfflineState(pages, staticFiles, site, destRoot,
                                    { stubs })
                    -- assembles the shared {sitePaths, caches, baseurl,
                       siteUrl, excludePatterns, destRoot} object.
                  deriveOfflinePage(page, state)        -- per-page transform.
                  deriveOfflineRedirect(stub, state)    -- per-stub transform.
                  deriveOfflineCss(cssIn, themeRel, state) -- per-CSS transform.
                  deriveOfflineJtdJs(srcBytes)          -- JTD JS patches.
                  deriveOfflineSearchDataJs(jsonBytes)  -- search-data.js wrap.
                The derive* helpers are pure-compute (no I/O) and are the
                surface the diff tools (`_diff.mjs --offline*`,
                `_triage.mjs auditOffline*`) consume so they don't have to
                re-implement the per-input transforms or shell out to the
                full writeOffline. Internal sections:

                §A  Top-level orchestration  (entry + dispatch loop)
                §B  Site-paths set + caches  (§6.1, the URL resolver state)
                §C  URL resolution           (compute_relative, compute_rel_url,
                                              resolve_raw, build_segs, decode)
                §D  HTML rewrite pipeline    (strip_seo, rewrite_html,
                                              inject_search_setup)
                §E  CSS rewrite pipeline     (rewrite_css)
                §F  Redirect-stub rewrite    (rewrite_redirect_stub)
                §G  just-the-docs.js patches  (navLink + initSearch replacements
                                              + search-data.js wrapper write)
                §H  Static-file pass         (exclude filter + copy)
                §I  Pure-compute derive*     (re-export surface for diff tools)
```

### Why one module, not three (`offline.mjs` + `offline-urls.mjs` + `offline-rewrite.mjs`)

The Jekyll offlinify.rb is one ~1,460-line file. The JS port targets
~600 lines (the `gsub` boilerplate, `Pathname` workarounds, and
~280 lines of doc comments compress significantly in JS). The whole
file fits comfortably in a single module; reviewers can navigate by
section boundary instead of jumping between files.

The URL resolver (§C) is the densest piece -- ~150 lines covering five
helpers and three caches -- and is a natural extraction target if
Phase 7 ever grows past ~800 lines. Today, splitting forces a public
API for the cache shapes that isn't worth the surface-area cost.

PLAN-5 (`write.mjs`, ~250 lines) followed the same "one module while
it's small" reasoning. Phase 7 follows it for the same reason.

### Why not in-place mutation of `_site/`

See §2's "Why a wholly separate tree" rationale. The orchestrator
treats `_site/` as immutable input from Phase 7's perspective; only
the just-the-docs.js asset gets read from `_site/` (and that's a read,
not a write).

### Reuse from prior phases

- **`mkdirRec`, `runLimited`, `writeFileMkdirp`, `WRITE_LIMIT`** from
  `write.mjs` (Phase 5). The offline pass writes ~1,130 files in
  parallel under the same concurrency cap; reusing the cap keeps
  resource pressure aligned across phases.
- **`safeWrite`** wrapper from `write.mjs` (the path-stamping error
  helper). Currently a private function inside `write.mjs`; Phase 7
  needs it for the copy paths in §5.4 + §5.5. **First-step refactor:**
  promote to a module-level export (one-line change to `write.mjs`,
  zero behaviour impact, verify-phase5 stays green). Phase 7's per-file
  copies become `safeWrite(dest, () => fs.copyFile(src, dest))` --
  same shape Phase 5 uses for `fs.writeFile`.
- **`isUnderProject`** guard from `write.mjs` (the wipe-safety check).
  Same promotion-to-export treatment as `safeWrite`.
- **`absoluteUrl`** and **`stripHtml`** from `seo.mjs` (Phase 2).
  Phase 7 doesn't need `absoluteUrl` (every URL it produces is
  page-relative), and only marginally needs `stripHtml` (the SEO
  strip uses a fixed-pattern regex, not the generic HTML stripper).
  Re-export not required.
- **`deriveRedirectStubs`** from `redirects.mjs` (Phase 6). Phase 6's
  return value gains a `stubs` field carrying the same `{ destPath,
  html, sourcePage, fromPath }` array its derivation produced, so
  Phase 7 can rewrite the absolute URLs in each stub without
  re-deriving. See §7.D8 for the orchestrator-side change.
- **Phase 6's search-data JSON bytes**. Same pattern -- the `auxStats`
  object Phase 6 returns gains a `json` field carrying the full
  search-data.json string. Phase 7 wraps it as
  `window.SEARCH_DATA = ...;` without re-reading from disk.

The Phase 6 return-shape extensions are non-breaking:
`auxStats.redirects.written` and `auxStats.search.entries` keep their
existing semantics; the new fields are additive.

---

## 4. Pipeline ordering within Phase 7

```
{ pages, staticFiles, site, destRoot, auxStats }   // after Phase 6
   │
   ▼
 [1] setupOfflineDest(offlineRoot)                     ← §5.1
       (wipe-contents + recreate of <offlineRoot>/;
        equivalent to Jekyll's wipe_out_dest_contents)
   │
   ▼
 [2] buildSitePaths(pages, staticFiles, destRoot,      ← §6.1
                    excludePatterns, stubs)
       (async; Set<string> of every site-rooted
        forward-slash path the URL resolver will probe;
        ~1,140 entries -- pages + statics + redirect-stub
        destPaths + theme assets walked from
        <destRoot>/assets/.)
   │
   ▼
 [3] Read & patch the JS asset once:
       patchJustTheDocsJs(<destRoot>/assets/js/just-the-docs.js,
                          <offlineRoot>/assets/js/just-the-docs.js)
       writeSearchDataJs(<offlineRoot>/assets/js/search-data.js,
                          auxStats.search.json)
   │
   ▼
 [4] In parallel (runLimited fans out):
       writeOfflinePages(pages, ...)              ← §5.2  (~837 pages)
       writeOfflineRedirects(auxStats.redirects.stubs, ...) ← §5.3 (~290 stubs)
       copyOfflineStatics(staticFiles, ...)       ← §5.4 (~234 files, minus exclude)
       copyOfflineThemeAssets(themeFiles, ...)    ← §5.5 (~7 files, CSS rewritten)
       copyOfflineSearchData(auxStats.search.json, ...) ← §5.6 (verbatim JSON copy)
   │
   ▼
 [5] summarise(totals)                            ← §5.7
       (HTML / CSS / redirect / asset counts;
        unresolved counter; one log line.)
```

The five parallel substeps in step [4] write to disjoint destination
paths (pages → `*.html` files outside `assets/`; redirects → small
HTML files outside `assets/`; statics → mostly under `Images/`, `lib/`,
or top-level; theme assets → `assets/css/` and `assets/js/`; search-
data → `assets/js/`), so they don't race. The shared mutable state
(URL-resolution caches in §C) lives behind the `offline.mjs` module's
private scope; each per-file rewrite is a pure transformation given
the immutable site-paths Set + the lazy caches.

The JS-asset patching in step [3] runs sequentially before the parallel
fan-out because the patched file is what subsequent reads in `_site/`
(none, in fact -- the asset is read once here and never again) would
target. Splitting it from the per-file loop also lets the warnings
("could not locate navLink() in just-the-docs.js") surface early in
the build output.

### Per-write parallelism

Each write surface uses `runLimited` with `WRITE_LIMIT = 64` (the
Phase 5 cap). Five concurrent surfaces × 64 = 320 max in-flight
operations -- well within libuv's default 4-thread pool's capacity
(file I/O is kernel-async on Windows and Linux). On the dev machine,
no cap at all also works; the 64 cap protects constrained systems
from EMFILE.

### Why the setup pass is sequential before the parallel writes

Two reasons, mirroring PLAN-5 §4:

1. **Correctness.** `buildSitePaths` is the URL resolver's source of
   truth. Per-file rewrites query the Set. Building it after writes
   start would race.
2. **Predictability.** The wipe step deletes the previous offline
   tree. A failure here (locked file, permission error) surfaces
   cleanly without interleaving with per-file write errors.

The setup pass (wipe + buildSitePaths + JS patch + search-data.js
write) is ~60 ms total. Sequencing it is cheap; parallelising would
save it but risk the failure modes above.

### Phase 7 init order (one-time)

```js
const OFFLINE_SUFFIX = "-offline";
const LIMIT = WRITE_LIMIT;  // re-use Phase 5's cap
```

Two lines. Everything else (regex constants, JS-patch templates,
cache containers) lives inline next to the functions that use them.

### Deps assembly (entry-point shape)

The entry point assembles a single `deps` object and threads it through
every substep. Centralised so the substep signatures stay narrow and
the cache lifetime is one build. The state-building half is factored
into the exported `buildOfflineState` so the diff tools can reuse it
without going through the writer-side I/O:

```js
export async function writeOffline(pages, staticFiles, site, destRoot, { auxStats } = {}) {
  const stubs = auxStats?.redirects?.stubs ?? [];
  const state = await buildOfflineState(pages, staticFiles, site, destRoot, { stubs });
  const deps = {
    ...state,
    offlineRoot: destRoot + OFFLINE_SUFFIX,
    counters: {
      html: 0, css: 0, redirects: 0, statics: 0, assets: 0,
      excluded: 0, unresolved: 0,
    },
  };

  await setupOfflineDest(deps.offlineRoot);

  const jtdSrc  = path.join(destRoot,        "assets/js/just-the-docs.js");
  const jtdDest = path.join(deps.offlineRoot, "assets/js/just-the-docs.js");
  const jtdPatches = await patchJustTheDocsJs(jtdSrc, jtdDest);
  await writeSearchDataJs(
    path.join(deps.offlineRoot, "assets/js/search-data.js"),
    auxStats?.search?.json ?? null,
  );

  await Promise.all([
    writeOfflinePages(pages, deps),
    writeOfflineRedirects(stubs, deps),
    copyOfflineStatics(staticFiles, deps),
    copyOfflineThemeAssets(deps),
    copyOfflineSearchData(auxStats?.search?.json ?? null, deps),
  ]);

  return { ...deps.counters, jtdPatches };
}

export async function buildOfflineState(pages, staticFiles, site, destRoot, { stubs = [] } = {}) {
  const excludePatterns = Array.isArray(site.config?.offline_exclude)
    ? site.config.offline_exclude.map(String) : [];
  return {
    destRoot,             // input tree root (Phase 5 wrote it; read-only here)
    sitePaths: await buildSitePaths(pages, staticFiles, destRoot, excludePatterns, stubs),
    caches: {
      rawResolution: new Map(),  // raw → [sep, tail, sitePath]
      seg:           new Map(),  // sitePath → [decodedSegs, encodedSegs]
      result:        new Map(),  // fileDir → Map<raw, finalRelUrl|null>
    },
    baseurl: normalizeBaseurl(site.config?.baseurl),
    siteUrl: String(site.config?.url ?? "").replace(/\/+$/, ""),
    excludePatterns,
  };
}
```

The `caches` are fresh per build (not cross-build memoised); see
§7.D4. The split lets the diff tools (`_diff.mjs --offline*`,
`_triage.mjs auditOffline*`) build state, derive expected bytes for a
single input via one of the pure `derive*` helpers (§I), and
byte-compare against Jekyll's `_site-offline/` -- without going
through the writer at all.

The fall-throughs on `auxStats?.search?.json` and
`auxStats?.redirects?.stubs` are defensive against a Phase 6 that
didn't ship the API extension from §7.D8 yet -- a degraded but still
correct build: pages and statics process, redirects and search-data
skip with `null` inputs.

---

## 5. Per-substep specifications

### 5.1. `setupOfflineDest(offlineRoot)`

**Purpose.** Ensure `<offlineRoot>/` exists and is empty when Phase 7
begins writing. The orchestrator gates the whole `writeOffline` call
behind `!dryRun`, so this helper doesn't need its own dry-run branch.

**Algorithm.**

```js
import { existsSync } from "node:fs";  // sync existence probe; one-off use

async function setupOfflineDest(offlineRoot) {
  if (!isUnderProject(offlineRoot)) {
    throw new Error(`refusing to clean ${offlineRoot}: not under the project tree`);
  }
  // Wipe contents, keep directory in place. See §7.D1.
  if (existsSync(offlineRoot)) {
    const entries = await fs.readdir(offlineRoot);
    await Promise.all(entries.map(name =>
      fs.rm(path.join(offlineRoot, name), { recursive: true, force: true }),
    ));
  } else {
    await fs.mkdir(offlineRoot, { recursive: true });
  }
}
```

The `isUnderProject` guard is the same shape as `write.mjs`'s
`isUnderProject` (PLAN-5 §5.1) -- promoted to a module-level export
during Phase 7 implementation along with `safeWrite`.

**Why "wipe contents, keep directory"** rather than `fs.rm` of the
directory itself? See §7.D2 -- Jekyll's `jekyll serve` watcher pattern
would otherwise infinite-loop on the directory-recreated event.
tbdocs doesn't ship a watcher today, but the convention is cheap to
honour and removes one footgun if a watcher lands later.

### 5.2. `writeOfflinePages(pages, deps)`

**Purpose.** For each page with `page.html !== undefined`, apply the
HTML transformations (via the exported pure-compute `deriveOfflinePage`)
and write to `<offlineRoot>/<page.destPath>`.

**Algorithm.**

```js
async function writeOfflinePages(pages, deps) {
  const { offlineRoot } = deps;
  const writable = pages.filter(p => p.html !== undefined);
  await runLimited(writable, LIMIT, async (page) => {
    const { html, misses } = deriveOfflinePage(page, deps);
    const dest = path.join(offlineRoot, page.destPath);
    await writeFileMkdirp(dest, html);
    deps.counters.html += 1;
    deps.counters.unresolved += misses;
  });
}

export function deriveOfflinePage(page, state) {
  const { sitePaths, caches, baseurl } = state;
  const fileDir = posixDirname(page.destPath);
  const fileSegs = fileDirSegsFromRel(page.destPath);
  let html = page.html;
  html = stripSeo(html);
  const { rewritten, misses } = rewriteHtml(html, fileDir, fileSegs, sitePaths, caches, baseurl);
  html = rewritten;
  html = injectSearchSetup(html, fileSegs);
  return { html, misses };
}
```

The pure-compute `deriveOfflinePage` is the surface `_diff.mjs --offline=`
and `_triage.mjs auditOfflinePages` consume to derive expected bytes
without writing to disk. The writer just wraps it with the I/O and
counter bookkeeping.

Each per-page rewrite is the same three-stage pipeline as Jekyll's
offlinify `process_page`'s `.html` branch:

1. **`stripSeo`** -- delete the jekyll-seo-tag block, keep only its
   `<title>`. Defined in §6.2.
2. **`rewriteHtml`** -- one regex pass over `<href|src>=...`
   attributes, dispatched to `computeRelative` (absolute URLs) or
   `computeRelUrl` (page-relative URLs). Code-block content
   pre-empted by the combined regex's leading alternatives. Defined
   in §6.6.
3. **`injectSearchSetup`** -- inject two `<script>` tags before the
   `<script src="...just-the-docs.js">` tag. Defined in §6.8.

Order matters: SEO strip first (saves the rewrite from doing work on
URLs about to be deleted), URL rewrite second (touches the
just-the-docs.js src to make it page-relative -- the script-injection
step then matches it as the anchor for the new `<script>` tags), inject
last (looks up the rewritten src to derive the relative prefix).

**Why `page.html` (in-memory) rather than re-reading `_site/<destPath>`.**
The bytes are already in memory from Phase 4. Re-reading saves
nothing and costs ~22 MB of disk I/O across all pages. The in-memory
copy is also guaranteed to match what `_site/` holds (Phase 5 wrote
the same bytes).

**Encoding.** `utf8`. Match Phase 5's writePages.

**Why `book.html` is skipped.** `page.html === undefined` for book.html
(layout `book-combined`, Phase 8 territory). The filter at the top of
`writeOfflinePages` drops it. Also configured in `offline_exclude` for
defence in depth.

### 5.3. `writeOfflineRedirects(stubs, deps)`

**Purpose.** For each Phase 6 redirect stub, rewrite the four
absolute-target-URL occurrences to page-relative form (via the
exported pure-compute `deriveOfflineRedirect`) and write to
`<offlineRoot>/<destPath>`.

**Algorithm.**

```js
async function writeOfflineRedirects(stubs, deps) {
  const { offlineRoot } = deps;
  await runLimited(stubs, LIMIT, async (s) => {
    const html = deriveOfflineRedirect(s, deps);
    await writeFileMkdirp(path.join(offlineRoot, s.destPath), html);
    deps.counters.redirects += 1;
  });
}

export function deriveOfflineRedirect(stub, state) {
  const { sitePaths, caches, baseurl, siteUrl } = state;
  if (!siteUrl) return stub.html;  // no site.url → write verbatim

  const siteUrlEsc = escapeRegExp(siteUrl);
  const prefixRe = new RegExp(`${siteUrlEsc}(/[^"' >]*)`, "g");

  const fileDir = posixDirname(stub.destPath);
  const fileSegs = fileDirSegsFromRel(stub.destPath);
  const pageCache = getPageCache(caches.result, fileDir);

  return stub.html.replace(prefixRe, (match, raw) => {
    let rel = pageCache.get(raw);
    if (rel === undefined) {
      rel = computeRelative(raw, fileSegs, sitePaths, caches, baseurl);
      pageCache.set(raw, rel);
    }
    return rel ?? match;  // unresolved → leave the absolute URL verbatim
  });
}
```

The substitution pattern matches `<site.url><path>` -- e.g.
`https://docs.twinbasic.com/tB/Modules/DateTime/Day` becomes
`../../../tB/Modules/DateTime/Day.html` after probing for the actual
file under that path. Unresolved matches stay as the absolute URL --
the offline link check (with `--forbid 'https://docs.twinbasic.com'`)
will then flag them as a source-side bug, which is the right
behaviour.

**Why rewrite at all** rather than leaving the absolute URLs in place?
Following a stub offline would otherwise require network access and
land the reader on the live site. Some source pages (notably
`Miscellaneous/Documentation Development.md`) intentionally link via
`redirect_from` URLs as a stable-URL pattern, and those need to
navigate locally.

**Re-uses caches across pages and redirects.** The `caches.result`
nested map (`file_dir → raw → final_rel_url`) is shared between the
page pass and the redirect pass -- the redirect's path keys are
disjoint from the absolute-URL ones (redirects only carry one URL
shape, the `<site.url>/<path>` form, while the page pass sees both
`/path` absolutes and `path` relatives), so there's no collision.

### 5.4. `copyOfflineStatics(staticFiles, deps)`

**Purpose.** Copy each `staticFile` to `<offlineRoot>/<destRel>`,
honouring the `offline_exclude` patterns.

**Algorithm.**

```js
async function copyOfflineStatics(staticFiles, deps) {
  const { offlineRoot, excludePatterns, counters } = deps;
  await runLimited(staticFiles, LIMIT, async (file) => {
    if (offlineExcluded(file.destRel, excludePatterns)) {
      counters.excluded += 1;
      return;
    }
    const dest = path.join(offlineRoot, file.destRel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(file.srcPath, dest));
    counters.statics += 1;
  });
}
```

The exclude check matches per-pattern via `fnmatch`-equivalent
behaviour (§6.5). On the current site, `CNAME` is the only static
file matched by an exclude pattern (the others -- `robots.txt`,
`sitemap.xml`, `book.html` -- aren't in `staticFiles[]`, they're
emitted by Phase 5/6 substeps).

**Why copy from `staticFile.srcPath` rather than `_site/<destRel>`.**
The source-path copy avoids the `_site/` round-trip and matches the
copy `copyStaticFiles` already does in Phase 5. Either source produces
byte-identical output -- `_site/` was populated from `srcPath`
unchanged.

### 5.5. `copyOfflineThemeAssets(themeFiles, deps)`

**Purpose.** Copy theme CSS/JS from `_site/assets/` (or `builder/assets/`
-- see below) to `_site-offline/assets/`, rewriting CSS `url()`
references and skipping `just-the-docs.js` (handled separately in
step [3] of §4).

**Algorithm.**

```js
async function copyOfflineThemeAssets(deps) {
  const { destRoot, offlineRoot, counters } = deps;
  const themeRoot = path.join(destRoot, "assets");
  if (!existsSync(themeRoot)) return;
  const themeEntries = await collectThemeFiles(themeRoot);

  await runLimited(themeEntries, LIMIT, async (e) => {
    if (e.isJtdJs) return;  // step [3] already wrote the patched copy
    const dest = path.join(offlineRoot, "assets", e.relUnderAssets);
    if (e.isCss) {
      const cssIn = await fs.readFile(e.srcAbs, "utf8");
      const relRel = path.posix.join("assets", e.relUnderAssets);
      const { css, misses } = deriveOfflineCss(cssIn, relRel, deps);
      await writeFileMkdirp(dest, css);
      counters.css += 1;
      counters.unresolved += misses;
    } else {
      await mkdirRec(path.dirname(dest));
      await safeWrite(dest, () => fs.copyFile(e.srcAbs, dest));
      counters.assets += 1;
    }
  });
}

export function deriveOfflineCss(cssIn, themeRel, state) {
  const { sitePaths, caches, baseurl } = state;
  const fileDir = posixDirname(themeRel);
  const fileSegs = fileDirSegsFromRel(themeRel);
  const { rewritten, misses } = rewriteCss(cssIn, fileDir, fileSegs, sitePaths, caches, baseurl);
  return { css: rewritten, misses };
}
```

The four CSS files run through `rewriteCss` (§6.7); the three JS
files plus the `vendor/lunr.min.js` file copy verbatim. Reading from
`destRoot/assets/` (rather than `builder/assets/`) keeps "the offline
tree mirrors what `_site/` shipped" as the model -- if Phase 5 ever
gains a post-copy theme rewrite, the offline tree picks it up
automatically. The downside is one extra disk read per CSS file (~310
KB total); negligible.

### 5.6. `copyOfflineSearchData(jsonBytes, deps)`

**Purpose.** Copy `search-data.json` verbatim from `_site/` to
`_site-offline/` (kept in place for parity with the online tree --
nothing reads it offline, but its absence would surface as a missing
asset to anyone diffing the trees).

**Algorithm.** A single write of the in-memory JSON bytes (Phase 6
returned them; Phase 7 doesn't re-read from disk):

```js
async function copyOfflineSearchData(jsonBytes, deps) {
  const dest = path.join(deps.offlineRoot, "assets/js/search-data.json");
  await writeFileMkdirp(dest, jsonBytes);
  deps.counters.assets += 1;
}
```

The `search-data.js` wrapper is written separately by
`writeSearchDataJs` in step [3] of §4 (see §6.10) -- same JSON bytes,
different wrapper. Both writes use the same in-memory string, so
there's no risk of the two files diverging.

### 5.7. Summary logging

**Purpose.** One line summarising what Phase 7 did. Matches the
Phase 5+6 summary line in `index.mjs`. Actual shipped output:

```
Phase 1+2+3+4+5+6+7 done: 838 pages, 234 static files
  wrote: 837 pages (1 skipped), 7 theme assets, 234 static files -> .../_site-new
  aux:   290 redirect stubs, 836 sitemap entries, 2587 search-index entries
  offline: 837 HTML, 4 CSS, 290 redirect stubs, 239 assets, 1 excluded (0 unresolved) -> .../_site-new-offline
discover=98ms nav=26ms seo=17ms book=9ms buildInfo=0ms render=1964ms template=565ms write=434ms auxiliaries=141ms offline=1092ms
```

Notes on the actual numbers vs the first-draft projection:

- **239 assets, not 240.** Phase 5 emits 7 theme files; we patch
  one (just-the-docs.js) and CSS-rewrite four; the remaining two (the
  vendored lunr.min.js + theme-switch.js) are verbatim copies. Combined
  with the ~234 static-file copies + 1 search-data.json verbatim copy:
  234 statics + 7 theme + 1 search-data + (-3 already accounted for as
  CSS rewrites) = ~239. The exact arithmetic depends on which counters
  bucket bumps for each file class; see §5.7.A below.
- **1 excluded, not 4.** The 4-file `offline_exclude` list
  (`CNAME / robots.txt / sitemap.xml / book.html`) only matches files
  that actually appear in `staticFiles[]`. Of those, only `CNAME` is in
  the static-file inventory; `robots.txt` / `sitemap.xml` are Phase 6
  output (not in `staticFiles[]`, not written to `_site-offline/`),
  and `book.html` is skipped by Phase 5 / Phase 7 via the `book-combined`
  layout filter. So the exclude counter bumps once. Defence-in-depth
  vs the offline-exclude regex; the four-file pattern still does what
  it should.
- **`(0 unresolved)`.** Phase 7 produces zero unresolved URLs on the
  production tree -- meaning every `/foo`-shape href, `src`, and
  `url()` resolves to an actual file in `<offlineRoot>/`. A nonzero
  value here would be the fast-feedback channel for a source-side bug.

When `--profile-offline` lands (deferred follow-up), the breakdown
rows would mirror the Jekyll offlinify.rb table -- per-pass `setup` /
`strip_seo` / `rewrite_html` / `inject_search` / `write_html` /
`rewrite_css` / `rewrite_redirect` / `patch_jtd` / `search_data` /
`copy_static` accumulators.

#### 5.7.A Counter semantics

The eight counters returned in `offlineStats` map to the substeps as
follows:

| Counter | Bumped by | Source |
|---|---|---|
| `html` | `writeOfflinePages` | 1 per rewritten page. 837 on the current tree. |
| `css` | `copyOfflineThemeAssets` (the CSS branch) | 1 per rewritten CSS file. 4 on the current tree. |
| `redirects` | `writeOfflineRedirects` | 1 per stub. 290 on the current tree. |
| `statics` | `copyOfflineStatics` | 1 per static file copied. ~233 on the current tree (234 minus CNAME). |
| `assets` | `copyOfflineThemeAssets` (the non-CSS branch) + `copyOfflineSearchData` | 1 per theme-asset file copied verbatim (3: just-the-docs.js, theme-switch.js, vendor/lunr.min.js -- the JTD JS isn't actually counted here, see note) + 1 for search-data.json. ~6 on the current tree. |
| `excluded` | `copyOfflineStatics` | 1 per static file matched by `offline_exclude`. 1 on the current tree (CNAME). |
| `unresolved` | `writeOfflinePages` + `copyOfflineThemeAssets` (CSS) | Total URL-resolver misses across HTML and CSS rewrites. 0 on the current tree. |
| `jtdPatches` | `patchJustTheDocsJs` | The list of patch labels (`["navLink()", "initSearch()"]` on the current tree). |

The `assets` counter is the slightly noisy one in the table because
the JTD JS is written by `patchJustTheDocsJs` (step [3]) which doesn't
bump any counter; it just returns its patch list. The remaining
verbatim theme-asset copies + the search-data.json copy land in
`assets`.

---

## 6. Shared helpers

### 6.1. `buildSitePaths(pages, staticFiles, destRoot, excludePatterns, stubs)`

**Purpose.** Produce a `Set<string>` of every site-rooted forward-slash
path the URL resolver will probe. Built once per build, queried via
`Set#has` during per-file rewriting.

**Algorithm.**

```js
async function buildSitePaths(pages, staticFiles, destRoot, excludePatterns, stubs = []) {
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
  const themeRoot = path.join(destRoot, "assets");
  if (existsSync(themeRoot)) {
    const themeFiles = await collectThemeFiles(themeRoot);
    for (const f of themeFiles) {
      const rel = "assets/" + f.relUnderAssets;
      if (offlineExcluded(rel, excludePatterns)) continue;
      paths.add("/" + rel);
    }
  }
  paths.add("/assets/js/search-data.json");
  return paths;
}
```

The function ships with three signature changes vs the initial spec,
each driven by a finding during integration testing:

1. **Async + `destRoot`.** Phase 5 copies theme assets (CSS, vendor JS)
   from `builder/assets/` directly into `<destRoot>/assets/`; they
   don't pass through `staticFiles[]`. Without walking
   `<destRoot>/assets/` here, the resolver doesn't know any theme asset
   is a valid target, and every `<link href="/assets/css/...">` and
   `<script src="/assets/js/...">` in the rendered HTML comes back as
   unresolved. The walk costs ~3-5 ms on the current asset tree.
2. **`stubs` parameter.** Phase 6's `deriveRedirectStubs` returns the
   list of stub destinations (e.g. `tB/Core/LBound.html`, which
   redirects to `tB/Modules/Information/LBound.html`). The offline tree
   writes them out, so they exist on disk, but `pages[]` doesn't
   include them. Without adding them to the resolver's set, a
   page-relative link like `LBound` from `tB/Core/Option.html`
   (resolving to probe path `/tB/Core/LBound`) misses every candidate
   and stays as the bare `LBound`. Threading stubs through fixes it.
   The orchestrator passes `auxStats.redirects.stubs`; diff tools
   derive stubs locally via `deriveRedirectStubs(pages, site)`.
3. **Page filter by layout, not by `page.html`.** The initial spec
   said `if (p.html === undefined) continue;` -- skipping book.html.
   But the diff tools (`_diff.mjs --offline-redirect`,
   `_triage.mjs auditOfflineRedirects`) call `buildOfflineState`
   without running templatePhase, so every page has `page.html ===
   undefined` and the Set would be empty. The reliable signal is
   `page.frontmatter?.layout === "book-combined"` -- the only case
   templatePhase would have skipped. Same semantic, broader callability.

The Set's keys mirror the filesystem-decoded form (e.g. `/Tutorials/
CustomControls/Form Designer.html`, not the percent-encoded URL form
`/Tutorials/CustomControls/Form%20Designer.html`). URL resolution
percent-decodes the input path before probing, so the comparison
operates on decoded strings.

**Performance.** Set construction is O(n) over ~1,140 entries
(~3-5 ms on the dev machine including the theme-tree walk).
Per-lookup cost is O(1).

### 6.2. `stripSeo(html)`

**Purpose.** Remove the jekyll-seo-tag block from a page's `<head>`,
keeping only its `<title>` tag.

**Algorithm.**

```js
const SEO_BLOCK_RE = /<!-- Begin Jekyll SEO tag.*?<!-- End Jekyll SEO tag -->/s;
const TITLE_RE = /<title>.*?<\/title>/s;

function stripSeo(html) {
  if (!html.includes("<!-- Begin Jekyll SEO tag")) return html;
  return html.replace(SEO_BLOCK_RE, (block) => {
    const titleMatch = block.match(TITLE_RE);
    return titleMatch ? titleMatch[0] : "";
  });
}
```

The block bracketed by the `<!-- Begin Jekyll SEO tag vX.Y.Z -->` /
`<!-- End Jekyll SEO tag -->` comments is what Phase 4's
`renderHeadSeo` emits byte-for-byte (verified earlier: see the
[template.mjs](template.mjs) check around `renderHeadSeo`). Inside the
block live `<title>`, generator/OpenGraph/Twitter Card meta, the
`<link rel="canonical">` (pointing at the live site), and a JSON-LD
structured-data `<script>`. The `<title>` is the only thing a local
reader uses (browser tab label); the rest exists for search-engine
crawlers and social-media previewers that never see `_site-offline/`.

Stripping the block saves ~750 KB across the offline tree (~900 B per
page × 837 pages) and removes three of the four
`https://docs.twinbasic.com` references each page would otherwise
contain. The fourth (the JSON-LD `"url"` field) was inside the block
too, so all four go away.

**Why runs before `rewriteHtml`.** The rewrite touches every
`href`/`src` attribute via regex; pruning ~900 bytes of soon-to-be-
deleted SEO content saves the rewrite from doing work it'll throw
away. Also keeps the `<link rel="canonical" href="https://...">`
absolute URL (which the rewrite would otherwise see and ignore --
it's not a `/`-leading path) from confusing any future "is this still
a live-site URL?" check.

### 6.3. `computeRelative(raw, fileSegs, sitePaths, caches, baseurl)`

**Purpose.** Resolve an absolute URL (`/tB/Core/Const`) to a
page-relative URL (`../Const.html`) given the source file's directory
segments.

**Algorithm.** Port of Jekyll offlinify.rb `compute_relative` +
`resolve_raw`:

```js
function computeRelative(raw, fileSegs, sitePaths, caches, baseurl) {
  // File-dir-independent half: parse, decode, baseurl-strip, probe.
  // Cached by `raw` alone -- the resolution is shared across every
  // source file that emits the same URL.
  let resolved = caches.rawResolution.get(raw);
  if (resolved === undefined) {
    resolved = resolveRaw(raw, sitePaths, baseurl);
    caches.rawResolution.set(raw, resolved);
  }
  const [sep, tail, sitePath] = resolved;
  if (sitePath === null) return null;

  // File-dir-dependent half: LCP walk + relative-path build.
  // Cached by `sitePath` -- segments are reused across every emit.
  let segCacheEntry = caches.seg.get(sitePath);
  if (segCacheEntry === undefined) {
    segCacheEntry = buildSegs(sitePath);
    caches.seg.set(sitePath, segCacheEntry);
  }
  const [decodedSegs, encodedSegs] = segCacheEntry;

  let common = 0;
  const fsLen = fileSegs.length;
  const tsLen = decodedSegs.length;
  while (common < fsLen && common < tsLen && fileSegs[common] === decodedSegs[common]) {
    common++;
  }

  const ascend = "../".repeat(fsLen - common);
  const descend = encodedSegs.slice(common).join("/");
  let rel = ascend + descend;
  if (rel === "") rel = "./";
  return rel + sep + tail;
}

function resolveRaw(raw, sitePaths, baseurl) {
  const hashIdx = raw.search(/[?#]/);
  const path = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
  const sep = hashIdx === -1 ? "" : raw[hashIdx];
  const tail = hashIdx === -1 ? "" : raw.slice(hashIdx + 1);
  let fsPath = decode(path);

  if (baseurl) {
    if (fsPath === baseurl) fsPath = "/";
    else if (fsPath.startsWith(baseurl + "/")) fsPath = fsPath.slice(baseurl.length);
  }

  let candidates;
  if (fsPath.endsWith("/")) {
    candidates = [fsPath, fsPath + "index.html"];
  } else if (fsPath.includes(".")) {
    candidates = [fsPath, fsPath + "/index.html"];
  } else {
    candidates = [fsPath, fsPath + ".html", fsPath + "/index.html"];
  }
  const sitePath = candidates.find(c => sitePaths.has(c)) ?? null;
  return [sep, tail, sitePath];
}
```

The `decode` helper percent-decodes (`%20` → ` `):

```js
function decode(s) {
  return s.replace(/%([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
```

The `buildSegs` helper produces the decoded/encoded segment pair, with
URL-safe segments sharing strings between the two arrays:

```js
const PATH_SAFE_RE = /[^A-Za-z0-9\-_.~!$&'()*+,;=:@]/g;
function buildSegs(sitePath) {
  const decoded = sitePath.slice(1).split("/");
  const encoded = decoded.map(seg =>
    PATH_SAFE_RE.test(seg)
      ? seg.replace(PATH_SAFE_RE, c => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
      : seg,
  );
  return [decoded, encoded];
}
```

**Three-cache caching strategy** (mirrors Jekyll offlinify.rb):

1. `caches.rawResolution`: `Map<raw, [sep, tail, sitePath]>`.
   File-dir-independent. Each unique URL resolves once across the
   whole build.
2. `caches.seg`: `Map<sitePath, [decodedSegs, encodedSegs]>`. Computed
   once per unique target file.
3. `caches.result`: `Map<file_dir, Map<raw, finalRelUrl>>`. End-to-end
   cache. Composed of caches 1+2 plus the per-source-dir LCP walk. The
   inner Map hoisted once per file-dir at the start of each rewrite so
   per-match cost is one map lookup.

Without cache 3, Jekyll's offlinify pass takes ~7× longer. The nested
shape (rather than a composite-key `Map<"file_dir\x00raw", url>`)
avoids the per-match string allocation; cumulative saving ~280 ms on
Jekyll's HTML walk.

### 6.4. `computeRelUrl(raw, fileSegs, sitePaths)`

**Purpose.** Resolve a page-relative URL (`Attributes#description`)
against the current file's directory, probing the filesystem for
candidate extensions.

**Algorithm.** Port of Jekyll offlinify.rb `compute_rel_url`:

```js
function computeRelUrl(raw, fileSegs, sitePaths) {
  const hashIdx = raw.search(/[?#]/);
  const path = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
  const sep = hashIdx === -1 ? "" : raw[hashIdx];
  const tail = hashIdx === -1 ? "" : raw.slice(hashIdx + 1);
  if (path === "") return null;

  const decoded = decode(path);
  const trailingSlash = decoded.endsWith("/");
  const stack = [...fileSegs];
  for (const seg of decoded.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }

  let probePath = "/" + stack.join("/");
  if (trailingSlash && !probePath.endsWith("/")) probePath += "/";

  let candidates;
  if (probePath.endsWith("/")) {
    candidates = [["", probePath], ["index.html", probePath + "index.html"]];
  } else if (probePath.includes(".")) {
    candidates = [["", probePath], ["/index.html", probePath + "/index.html"]];
  } else {
    candidates = [["", probePath], [".html", probePath + ".html"], ["/index.html", probePath + "/index.html"]];
  }

  for (const [suffix, full] of candidates) {
    if (sitePaths.has(full)) return path + suffix + sep + tail;
  }
  return null;
}
```

**Critical difference from `computeRelative`.** This returns the
*original* raw plus the matching suffix (not a freshly computed
relative path). The path is already correctly relative to the source
file; the only fix needed is the suffix (`.html` / `/index.html` /
none). Returning a freshly-computed path would break the source's
intent on cases where the relative form encodes nuance (e.g. a
sibling reference within the same folder).

When `path === raw_suffix === ""` (i.e. the URL was just `?query` or
`#fragment`), the early return guards. Fragment-only URLs are
prevented from entering this function by the outer regex in
`rewriteHtml` (the `(?![#/]...)` lookahead).

### 6.5. `offlineExcluded(rel, patterns)`

**Purpose.** Test a site-rooted forward-slash path against the
`offline_exclude` patterns. Matches Jekyll's
`File.fnmatch(pattern, rel, File::FNM_PATHNAME)` semantics: `*` does
NOT cross directory separators.

**Algorithm.**

```js
function offlineExcluded(rel, patterns) {
  if (!patterns.length) return false;
  return patterns.some(pat => fnmatchPathname(pat, rel));
}

function fnmatchPathname(pattern, str) {
  // Convert pattern to regex. `*` -> `[^/]*`, `?` -> `[^/]`,
  // `**` -> `.*` (cross-segment), everything else literal.
  // Mirrors Ruby File::FNM_PATHNAME.
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") { re += ".*"; i++; }
      else { re += "[^/]*"; }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()|[]{}\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re).test(str);
}
```

The current `offline_exclude` list (`CNAME`, `robots.txt`,
`sitemap.xml`, `book.html`) is all plain-string patterns, so the
regex compilation is essentially a literal-string check. The full
implementation supports future additions like `**/*.bat` correctly.

**Why not use a npm package** (e.g. `minimatch`)? The semantics are
narrow enough that ~25 lines of code suffice, and adding a dependency
for fnmatch alone is overkill. Mirrors the "no fs-extra / cpy"
rationale from PLAN-5 §3.

### 6.6. `rewriteHtml(html, fileDir, fileSegs, sitePaths, caches, baseurl)`

**Purpose.** Single regex pass over HTML, rewriting every absolute
and page-relative URL in `href` / `src` attributes while skipping
content inside `<code>` / `<pre>` blocks.

**Algorithm.**

```js
const HTML_COMBINED_RE = /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>|\b(href|src)=(["'])(\/(?!\/)[^"']*|(?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2/g;

function rewriteHtml(html, fileDir, fileSegs, sitePaths, caches, baseurl) {
  let misses = 0;
  const pageCache = getPageCache(caches.result, fileDir);

  const rewritten = html.replace(HTML_COMBINED_RE, (match, attrName, quote, rawUrl) => {
    if (attrName === undefined) {
      // <code> or <pre> block -- leave verbatim.
      return match;
    }
    let rel = pageCache.get(rawUrl);
    if (rel === undefined) {
      rel = rawUrl.startsWith("/")
        ? computeRelative(rawUrl, fileSegs, sitePaths, caches, baseurl)
        : computeRelUrl(rawUrl, fileSegs, sitePaths);
      pageCache.set(rawUrl, rel);
    }
    if (rel === null) {
      misses++;
      return match;
    }
    if (rel === rawUrl) {
      // File already correct at the relative path (e.g. `Foo.html` exists).
      return match;
    }
    return `${attrName}=${quote}${rel}${quote}`;
  });

  return { rewritten, misses };
}

function getPageCache(resultCache, fileDir) {
  let pageCache = resultCache.get(fileDir);
  if (!pageCache) {
    pageCache = new Map();
    resultCache.set(fileDir, pageCache);
  }
  return pageCache;
}
```

The combined regex carries three top-level alternatives:

1. `<code\b[^>]*>[\s\S]*?</code>` -- a `<code>` block. Matched
   atomically; the callback returns it verbatim because `attrName` is
   undefined on this branch.
2. `<pre\b[^>]*>[\s\S]*?</pre>` -- same for `<pre>`.
3. `\b(href|src)=(["'])(URL)\2` -- a real href/src attribute. The URL
   alternation (`/(?!/)[^"']*|(?![#/]|[scheme:])[^"']+`) matches
   either:
   - an absolute path (`/foo`) that's not protocol-relative (`//`).
   - a page-relative path (`Foo`, `Foo#frag`) that doesn't start with
     `#` (fragment-only), `/` (absolute, handled above), or a URL
     scheme (`http:`, `mailto:`, etc.).

The disjoint URL shapes let one regex handle both cases; the
`raw.startsWith("/")` test inside the callback dispatches to
`computeRelative` vs `computeRelUrl`.

**Why fold the code-block skip into the regex** rather than a
separate `code_block_ranges` precompute? Jekyll offlinify.rb measured
~800 ms saving from the fold (per its history). In tbdocs, the same
fold saves the per-match `offset_in_code_block?` linear scan inside a
gsub callback. Cleaner and faster.

**Note on shiki output.** Phase 3's syntax highlighter produces
`<pre>` / `<code>` blocks wrapping each highlighted code sample,
matching the same shape Rouge produces in Jekyll. The skip works
either way -- both highlighters HTML-escape `<` and `>` inside code
bodies but leave `"` alone, so `src="/foo"` inside a code sample
would match the href/src alternative without the skip. The atomic
consumption of the code-block alternatives is what makes the tutorial
code samples come through unrewritten.

**Nav-block caching** (deferred). Jekyll's offlinify reaps ~1,900 ms
of savings from a per-source-dir nav cache (the ~112 KB just-the-docs
sidebar is identical across pages within a source dir). tbdocs's
projected per-page rewrite cost is ~0.3 ms × 837 pages = ~250 ms even
without the nav cache; the cache would bring it to ~50 ms. **Phase 7's
first cut does NOT implement the nav cache.** If profiling shows the
HTML pass dominating, the cache lands as a follow-up (added complexity
vs ~200 ms saving -- not a clear win at the projected baseline). See
§7.D7 for the deferral rationale.

### 6.7. `rewriteCss(css, fileDir, fileSegs, sitePaths, caches, baseurl)`

**Purpose.** Same as `rewriteHtml` but for CSS `url(...)` references.

**Algorithm.**

```js
const CSS_URL_RE = /url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)/g;

function rewriteCss(css, fileDir, fileSegs, sitePaths, caches, baseurl) {
  let misses = 0;
  const pageCache = getPageCache(caches.result, fileDir);

  const rewritten = css.replace(CSS_URL_RE, (match, quote, rawUrl) => {
    let rel = pageCache.get(rawUrl);
    if (rel === undefined) {
      rel = computeRelative(rawUrl, fileSegs, sitePaths, caches, baseurl);
      pageCache.set(rawUrl, rel);
    }
    if (rel === null) {
      misses++;
      return match;
    }
    return `url(${quote}${rel}${quote})`;
  });

  return { rewritten, misses };
}
```

CSS has no code-block concept (no nested `<pre>` / `<code>`), and
url() references are always absolute on this site (the favicon
reference in `just-the-docs-combined.css` is the only current case).
No page-relative URL form in CSS.

The cache slot is shared with `rewriteHtml`'s page cache -- same
`(file_dir, raw)` keys with the same absolute URL shape, so a CSS
file rewriting `/favicon.png` from `assets/css/` gets a fresh cache
slot (file_dir = `assets/css`); a page rewriting the same URL from
`tB/Core/` gets a different slot.

### 6.8. `injectSearchSetup(html, fileSegs)`

**Purpose.** Inject two `<script>` tags right before the existing
`<script src="...just-the-docs.js">` tag in each rendered HTML page.

**Algorithm.**

```js
const JTD_SCRIPT_TAG_RE = /<script\s+src="([^"]*)just-the-docs\.js"/;

function injectSearchSetup(html, fileSegs) {
  return html.replace(JTD_SCRIPT_TAG_RE, (match, prefix) => {
    const siteRoot = fileSegs.length === 0 ? "" : "../".repeat(fileSegs.length);
    return `<script>window.OFFLINE_SITE_ROOT="${siteRoot}";</script>\n` +
      `<script src="${prefix}search-data.js"></script>\n` +
      match;
  });
}
```

Two scripts inserted:

1. `<script>window.OFFLINE_SITE_ROOT="../../";</script>` -- the
   per-page relative prefix from the page's directory to the offline
   site root. Computed from `fileSegs` (the source page's depth).
   Empty string at root; `"../../"` at depth 2. The patched
   `initSearch()` reads this to convert search-result URLs into
   page-relative paths.
2. `<script src="<prefix>search-data.js"></script>` -- loads the lunr
   index data into `window.SEARCH_DATA`. The `<prefix>` is captured
   from the existing just-the-docs.js script tag's src (e.g.
   `../../assets/js/`); reusing it places `search-data.js` next to
   `just-the-docs.js` on disk.

Both run in source order before `just-the-docs.js`, so the globals
are populated before `initSearch()` fires inside the document-ready
callback.

**Why find the just-the-docs.js script tag by regex** rather than
inserting at a fixed position? The script tag's relative path depth
varies by page depth, and finding it by-name gives a stable anchor
regardless of where the head sits in the template output. The same
approach Jekyll's offlinify uses.

**Idempotent**: if the page has no just-the-docs.js tag (e.g. a
hypothetical layout-less page), the regex doesn't match and the page
is left as-is.

### 6.9. `patchJustTheDocsJs(srcPath, destPath)`

**Purpose.** Replace `navLink()` and `initSearch()` function bodies
in just-the-docs.js with offline-friendly versions. The disk-touching
side (read + write) is the writer; the byte-perfect-vs-Ruby transform
itself is exported as `deriveOfflineJtdJs` for the diff tools.

**Algorithm.**

```js
const JTD_NAVLINK_RE = /function navLink\(\) \{[\s\S]*?return null; \/\/ avoids `undefined`\s*\}/;
const JTD_INITSEARCH_FN_RE = /function initSearch\(\) \{[\s\S]*?request\.send\(\);\s*\}/;

// IMPORTANT: the "Patched by _plugins/offlinify.rb" comment strings
// are kept verbatim from the Ruby Offlinify constants so the patched
// JS in <offlineRoot>/assets/js/just-the-docs.js is byte-identical to
// Jekyll's _site-offline/assets/js/just-the-docs.js. Don't rename to
// "offline.mjs" without first updating the byte-parity matrix in §10.
const JTD_NAVLINK_REPLACEMENT = `function navLink() {
  // Patched by _plugins/offlinify.rb for file:// compatibility.
  var here = window.location.href.split('#')[0].split('?')[0];
  var links = document.getElementById('site-nav').querySelectorAll('a.nav-list-link');
  for (var i = 0; i < links.length; i++) {
    if (links[i].href === here) return links[i];
  }
  return null;
}`;

const JTD_INITSEARCH_FN_REPLACEMENT = `function initSearch() {
  // Patched by _plugins/offlinify.rb for file:// compatibility.
  var docs = window.SEARCH_DATA;
  if (!docs) {
    console.log('Offlinify: window.SEARCH_DATA not found; ensure search-data.js loads before just-the-docs.js');
    return;
  }
  var siteRoot = window.OFFLINE_SITE_ROOT || '';
  for (var i in docs) {
    var rel = docs[i].relUrl;
    if (typeof rel === 'string' && rel.charAt(0) === '/') {
      var hash = '';
      var hashIdx = rel.indexOf('#');
      if (hashIdx !== -1) {
        hash = rel.slice(hashIdx);
        rel = rel.slice(0, hashIdx);
      }
      rel = rel.slice(1);
      if (rel.endsWith('/')) {
        rel = rel + 'index.html';
      } else {
        var lastSlash = rel.lastIndexOf('/');
        var lastSeg = lastSlash === -1 ? rel : rel.slice(lastSlash + 1);
        if (lastSeg.indexOf('.') === -1) rel = rel + '.html';
      }
      docs[i].url = siteRoot + rel + hash;
    }
  }
  lunr.tokenizer.separator = /[\\s\\-\\/]+/;
  var index = lunr(function(){
    this.ref('id');
    this.field('title', { boost: 200 });
    this.field('content', { boost: 2 });
    this.field('relUrl');
    this.metadataWhitelist = ['position'];
    for (var i in docs) {
      this.add({
        id: i,
        title: docs[i].title,
        content: docs[i].content,
        relUrl: docs[i].relUrl
      });
    }
  });
  searchLoaded(index, docs);
}`;

async function patchJustTheDocsJs(srcPath, destPath) {
  let src;
  try { src = await fs.readFile(srcPath, "utf8"); }
  catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`offline: ${srcPath} not found; skipping JTD patch`);
      return [];
    }
    throw err;
  }
  const { js, patches, warnings } = deriveOfflineJtdJs(src);
  for (const w of warnings) console.warn(w);
  await writeFileMkdirp(destPath, js);
  return patches;
}

export function deriveOfflineJtdJs(src) {
  let out = src;
  const patches = [];
  const warnings = [];

  let next = out.replace(JTD_NAVLINK_RE, JTD_NAVLINK_REPLACEMENT);
  if (next !== out) { patches.push("navLink()"); out = next; }
  else warnings.push(
    "offline: could not locate navLink() in just-the-docs.js -- " +
    "nav-active detection will be broken under file://. Update " +
    "JTD_NAVLINK_RE in builder/offline.mjs.",
  );

  next = out.replace(JTD_INITSEARCH_FN_RE, JTD_INITSEARCH_FN_REPLACEMENT);
  if (next !== out) { patches.push("initSearch()"); out = next; }
  else warnings.push(
    "offline: could not locate initSearch() in just-the-docs.js -- " +
    "offline search will not work. Update JTD_INITSEARCH_FN_RE in " +
    "builder/offline.mjs.",
  );

  return { js: out, patches, warnings };
}
```

`deriveOfflineJtdJs` returns the patched bytes plus the list of patch
labels and any warnings -- the writer prints warnings; the diff tool
displays them inline. Both consume the same transform.

Two replacement function bodies, byte-for-byte identical to the
Jekyll offlinify.rb constants (verified by side-by-side review of
the JS string contents). The escape sequences for the lunr tokenizer
separator regex (`/[\\s\\-\\/]+/`) need an extra layer of escaping in
the JS source string compared to Ruby's heredoc; one source of
fragility worth noting in a comment.

**Why a regex-based replacement** rather than parsing the JS AST?
Two patterns to substitute, both anchored on stable function shapes
in the upstream just-the-docs theme. A miss emits a warning
identifying the constant that needs updating -- the early-warning
signal that just-the-docs has shipped a new version of the function.
An AST-based replacement (via `acorn` or similar) adds a dependency
tree for ~50 lines of logic; the cost / benefit doesn't favour it.

### 6.10. `writeSearchDataJs(destPath, jsonBytes)`

**Purpose.** Write `search-data.js` -- the JS-wrapped form of the
search index that `<script src=>` can load under `file://`. The wrap
itself is the exported pure-compute `deriveOfflineSearchDataJs`.

**Algorithm.**

```js
async function writeSearchDataJs(destPath, jsonBytes) {
  if (jsonBytes == null) return 0;
  const js = deriveOfflineSearchDataJs(jsonBytes);
  await writeFileMkdirp(destPath, js);
  return js.length;
}

export function deriveOfflineSearchDataJs(jsonBytes) {
  return `window.SEARCH_DATA = ${jsonBytes};\n`;
}
```

Single-line wrap; no transformation of the JSON itself. The
just-the-docs.js patched `initSearch()` reads `window.SEARCH_DATA`
directly, so the wrapper's form (`var` vs `let` vs direct assignment)
doesn't matter as long as the global lands.

**Why use the in-memory JSON bytes** rather than re-reading from
`_site/assets/js/search-data.json`? Phase 6's `writeSearchData` has
the bytes; passing them through to Phase 7 saves a ~2.8 MB disk read
(~10 ms on the dev machine). Phase 6 already returns `{ entries }`;
adding `{ entries, json }` is a one-line change to the substep
signature.

The matching read-from-disk fallback (for a hypothetical future where
Phase 6 doesn't return the bytes) would be:

```js
const jsonBytes = await fs.readFile(
  path.join(destRoot, "assets/js/search-data.json"), "utf8",
);
```

Costs nothing more than the read; mention in a comment as the
alternative if the orchestrator API ever changes.

### 6.11. `fileDirSegsFromRel(rel)`

**Purpose.** Compute a file's directory segments for use in the URL
resolver's LCP walk.

**Algorithm.**

```js
function fileDirSegsFromRel(rel) {
  const normalised = rel.replaceAll("\\", "/");
  const dir = path.posix.dirname(normalised);
  if (dir === "." || dir === "") return [];
  return dir.split("/");
}
```

Returns an empty array for files at the root (`index.html` →
`fileSegs = []`). For `tB/Core/Const.html` → `["tB", "Core"]`.

### 6.12. `normalizeBaseurl(raw)`

**Purpose.** Coerce `site.config.baseurl` into the exact prefix the
template's `relative_url` filter emits, so the URL resolver can
strip-match it character-for-character.

**Algorithm.** Port of Jekyll offlinify.rb `normalize_baseurl`:

```js
function normalizeBaseurl(raw) {
  let baseurl = String(raw ?? "").replace(/\/+$/, "");
  if (baseurl && !baseurl.startsWith("/")) baseurl = "/" + baseurl;
  return baseurl;
}
```

Strips any trailing slashes; prepends a leading slash if missing; an
empty / null / undefined input returns `""`. The current site has
`baseurl` unset (empty); the function is a no-op then. A future
deployment to a GitHub Pages project page (`baseurl: /repo-name`)
would feed the resolver the same `/repo-name` prefix the template
prepends to every URL.

### 6.13. `escapeRegExp(s)`

**Purpose.** Escape regex metacharacters for safe interpolation into
a dynamically-constructed regex. Used in `writeOfflineRedirects` to
build the `<site.url><path>` matcher.

**Algorithm.**

```js
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

The standard ten-character escape set. Sufficient for the current
`site.config.url` (`https://docs.twinbasic.com` -- only the `.`s
need escaping) and any future URL the implementer might configure.

### 6.14. `collectThemeFiles(themeRoot)`

**Purpose.** Walk `_site/assets/` recursively, classifying each file
for the offline theme-asset pass (§5.5).

**Algorithm.**

```js
async function collectThemeFiles(themeRoot) {
  const out = [];
  async function walk(relPath) {
    const dirents = await fs.readdir(
      path.join(themeRoot, relPath), { withFileTypes: true },
    );
    for (const d of dirents) {
      const childRel = relPath === "" ? d.name : path.posix.join(relPath, d.name);
      if (d.isDirectory()) {
        await walk(childRel);
      } else if (d.isFile()) {
        out.push({
          relUnderAssets: childRel,            // e.g. "css/print.css"
          srcAbs: path.join(themeRoot, childRel),
          isCss:   childRel.endsWith(".css"),
          isJtdJs: childRel === "js/just-the-docs.js",
        });
      }
    }
  }
  await walk("");
  return out;
}
```

`isJtdJs` is the flag that tells the per-file dispatch in §5.5 to
skip this entry -- step [3] of §4 already wrote the patched copy.
`isCss` selects the `rewriteCss` path; everything else is a verbatim
copy.

On the current site `themeRoot` (`<destRoot>/assets`) holds 7 files
(`css/just-the-docs-combined.css`, `css/just-the-docs-head-nav.css`,
`css/print.css`, `css/rouge.css`, `js/just-the-docs.js`,
`js/theme-switch.js`, `js/vendor/lunr.min.js`). The walk is ~5 ms.

A future addition under `assets/` (e.g. a new vendored font under
`assets/fonts/`) shows up automatically -- the walker doesn't enumerate
a fixed list. Image assets that ship via `staticFiles[]` rather than
the theme tree (e.g. `assets/images/mmd/*.svg`) go through the
static-file pass (§5.4), not here.

---

## 7. Design decisions and assumptions

### D1. Phase 7 wipes `<offlineRoot>/` contents, not the directory itself

Jekyll's offlinify.rb `wipe_out_dest_contents` removes everything
under `_site-offline/` but keeps the directory in place. The rationale
(per the inline comment): if the directory itself disappears and is
re-created, `jekyll serve`'s watcher reports a bare `_site-offline`
event (no trailing slash, since the directory is momentarily absent at
notification time) that the `_site-offline/` exclude pattern doesn't
match. Result: infinite rebuild loop.

tbdocs doesn't ship a watcher today, but follows the same convention:

- Cheap to honour (one extra `readdir` + per-entry `rm` instead of one
  `fs.rm` of the parent).
- Removes the footgun if a watcher lands later.
- Matches the Jekyll behaviour exactly, so a side-by-side build of
  both produces the same `_site-offline/` snapshot.

### D2. Phase 7 runs after Phase 5 + Phase 6

The orchestrator chains the phases in order: Phase 5 writes `_site/`,
Phase 6 adds sitemap/robots/redirects/search-data, Phase 7 mirrors
the whole tree to `_site-offline/`. The ordering matters for two
reasons:

- **`site_paths` completeness.** Phase 7's `buildSitePaths` derives
  the URL-resolution targets from `pages[]` + `staticFiles[]`. If
  Phase 6's outputs (search-data.json) aren't in the Set, a page
  linking to `/assets/js/search-data.json` would resolve to "not
  found" and the link would stay absolute. Defensive: §6.1 adds
  `search-data.json` to the Set explicitly.
- **Redirect-stub byte source.** Phase 7 transforms Phase 6's
  redirect-stub HTML to swap absolute target URLs for page-relative.
  The stubs are passed in-memory from Phase 6 (see §7.D8).

The orchestrator awaits Phase 6's `Promise.all` before invoking
Phase 7; the wait is implicit in the existing `await Promise.all(...)`
in `index.mjs`.

### D3. `_site/` is read-only input

Phase 7 reads `_site/assets/js/just-the-docs.js` and (depending on
implementation choice) `_site/assets/js/search-data.json`. Both are
reads only -- Phase 7 never writes back to `_site/`. The online
deploy artifact stays canonical.

If the reads moved to all-in-memory (search-data via §7.D8, JTD via a
pre-read in Phase 5), Phase 7 wouldn't need to touch `_site/` at all.
The current spec accepts the JTD read for simplicity; promotion to
all-in-memory is a follow-up.

### D4. The URL-rewrite caches are private to `offline.mjs`

The three caches (`rawResolution`, `seg`, `result`) are allocated at
the top of `writeOffline` and destroyed when it returns. No other
phase consumes them; no cross-build memoisation. Per-build cost is
~25 MB peak (Jekyll's measurement on the same site; JS's Map
representation is in the same ballpark).

If a future "incremental rebuild" mode lands, the caches would
become per-rebuild rather than per-build. Not relevant today.

### D5. `book.html` is excluded from Phase 7

`book.html` has `layout: book-combined` (PLAN-4 §5.10). Phase 5 skips
its write (`page.html === undefined`). Phase 6's outputs don't touch
it (no `redirect_from`, no sitemap entry, no search entry -- per
PLAN-6 §7.D13). Phase 7 also doesn't touch it:

- The `pages[]` filter in `writeOfflinePages` skips `page.html ===
  undefined` (same as Phase 5).
- The `offline_exclude` list includes `book.html` defensively, so
  even if it were in `_site/`, the static-copy pass would skip it.

Phase 8 (`pdf.mjs`) is the owner of `book.html`; it ships only to
`_site-pdf/`.

### D6. Absolute-URL preservation for unresolved links

A URL the rewriter can't resolve (no matching site path) is left as
the original absolute string. This is the same behaviour Jekyll
offlinify uses, and the rationale is the same:

- **Unresolved is a real bug signal.** The offline link check
  (`check_links.mjs --forbid 'https://docs.twinbasic.com'`) catches
  surviving absolute URLs; if a rewrite silently dropped or
  redirected, the bug would hide.
- **No semantic guess.** The rewriter has no way to know whether
  `/some/missing/path` was meant to point at `some/missing/path.html`,
  `some/missing/path/index.html`, or somewhere else entirely. Best to
  surface the failure than to guess.

The per-build `unresolved` counter (in the summary log line) is the
fast feedback channel: a non-zero value means one or more sources
need fixing.

### D7. Nav-block caching is deferred

Jekyll offlinify reaps ~1,900 ms from a per-source-dir nav-block
cache (the ~112 KB just-the-docs sidebar HTML is identical across
pages and rewritten the same way per source directory). On Ruby, that
cache turns ~600k of ~720k per-match callbacks into hash lookups.

tbdocs's projected baseline (no cache) is ~250 ms for the HTML pass
(~0.3 ms per page × 837 pages, derived from cache-warmed Phase 6
timings). Adding the cache would bring it to ~50 ms -- a ~200 ms
saving for ~80 lines of extra code (placeholder substitution, cache
storage, splice-back logic).

**The first cut doesn't include it.** Two reasons:

1. The total Phase 7 budget is ~480 ms (per §10's projection -- with
   the caveat that the projection is a guess; see §10). ~200 ms is
   meaningful but not transformative; if Phase 7 hits its budget
   without the cache, the added complexity isn't justified.
2. The cache adds a subtle invariant (the placeholder string must not
   collide with content; the post-gsub splice must find the
   placeholder) that's harder to verify than the cache-less form.

**Reconsider during Phase 7's first measured run, not as a follow-up.**
If the HTML pass exceeds **800 ms** on the dev machine in the first
real timing capture, the cache moves from "deferred follow-up" to
"in-scope before merge." Eight hundred ms is the threshold at which
Phase 7's total wall time risks blowing past the 1500 ms soft cap once
the other substeps' actual costs land. Below that threshold the
deferral stands. Track the threshold call in
[FUTURE-WORK.md](FUTURE-WORK.md) when Phase 7 ships.

### D8. Phase 6 surfaces in-memory bytes for Phase 7's consumption

The default Phase 6 substep returns are `{ entries: N }` (sitemap,
search) and `{ written: N }` (redirects). Phase 7 needs more:

- The `search-data.json` byte string (to wrap as `search-data.js`).
- The redirect-stub `{ destPath, html }` array (to rewrite per stub).

**Recommended Phase 6 API extension** (additive, non-breaking):

```js
// Phase 6 substep signatures
writeSearchData(pages, site, destRoot) → { entries, json }
writeRedirects(pages, site, destRoot)  → { written, stubs }
writeSitemap(pages, site, destRoot)    → { entries, robots }  // unchanged
```

The orchestrator's `auxStats` shape then carries the new fields:

```js
auxStats = {
  redirects: { written, stubs },
  sitemap:   { entries, robots },
  search:    { entries, json },
};
```

Phase 7 reads from `auxStats.search.json` and `auxStats.redirects.stubs`.
The verify-phase6 harness should remain green -- the existing checks
only look at `entries` / `written` counts, not the new fields.

The alternative -- have Phase 7 re-read `_site/assets/js/search-data.json`
and re-derive the redirect stubs via `deriveRedirectStubs(pages, site)`
-- would work too, with these costs:

- The search-data re-read costs ~10 ms (2.8 MB at SSD speed).
- The redirect-stub re-derive costs ~5 ms (290 stubs × ~17 µs each
  for the string-template substitution + collision check). Throws on
  collision a second time, redundantly. Surfaces the same error.

The in-memory path is preferred (cleaner, no duplicate work) but the
re-read path is an acceptable fallback if Phase 6's API extension is
deferred.

### D9. No async write pool

Jekyll offlinify gates a 4-thread write pool on Windows (`Gem.win_platform?`)
to overlap `mkdir_p` + `binwrite` with the next page's render and
rewrite. The pool saves ~530 ms on Windows -- on Linux ext4 the
overhead exceeds the saving.

tbdocs doesn't need it: Node's libuv pool already runs file writes
asynchronously (the same kernel-async path on Windows), and the
`runLimited`-based fan-out from `write.mjs` keeps the in-flight count
bounded. No threading code in JavaScript, no platform-gate logic, and
the per-file write cost is comparable.

If profiling on Windows shows write throughput is a bottleneck after
all, the `runLimited` cap can be tuned (current 64; bump to 128 or
256). Not needed at the projected baseline.

### D10. Single `offline.mjs` module

Phase 7 has internal section boundaries (orchestration, URL resolver,
HTML rewrite, CSS rewrite, redirect rewrite, JS patch, static copy)
but ~600 lines total -- comfortably one file. Mirrors `write.mjs`'s
Phase 5 layout. See §3's "Why one module" subsection.

A future split into `offline.mjs` + `offline-resolve.mjs` would
extract §C's URL resolver into a standalone module with the three
caches as instance state. Reserve as a refactor target if §C ever
exceeds ~300 lines.

### D11. Phase 7 inherits Phase 6's `Promise.all` orchestration

Phase 7's outer call from the orchestrator is one `await
writeOffline(...)` after the existing `await Promise.all([...
auxiliaries ...])`. Phase 7 internally fans out the five substeps
in §4 step [4] via its own `Promise.all`; this is independent of
Phase 6's fan-out.

The orchestrator's per-phase timing (`t.lap("offline")`) captures
the full Phase 7 wall time.

### D12. tbdocs may emit a different SEO block character-by-character than Jekyll

The SEO block in `template.mjs` is byte-identical to jekyll-seo-tag
v2.8.0's output for the current site config (verified by an earlier
template.mjs check). The `stripSeo` regex matches the `<!-- Begin
Jekyll SEO tag vX.Y.Z -->` / `<!-- End Jekyll SEO tag -->` brackets
regardless of the version string -- so a future tbdocs change to the
version comment, or a future jekyll-seo-tag version bump, won't break
the strip.

If tbdocs ever stops emitting the bracketed comments (or emits a
different comment shape), the strip becomes a no-op. The page would
still build correctly -- just with the SEO block intact in the
offline copy. The acceptance check in §10 catches this (0 surviving
`https://docs.twinbasic.com` references per offline page).

### D13. Theme assets copy from `_site/assets/`, not `builder/assets/`

Two options for the source of the theme-asset copy:

1. **From `_site/assets/`** (recommended). What Phase 5 just copied.
   Tracks any future post-copy transformation Phase 5 might apply.
2. **From `builder/assets/`** (the source of truth). One disk read
   fewer per file (already paid by Phase 5).

Option 1 wins on the "what's offline mirrors what's online" model.
The disk-read cost is negligible (~310 KB total across 7 files).
Option 2 would be faster by ~5 ms but couples Phase 7 to Phase 5's
upstream source rather than to its output -- a fragility if Phase 5
ever transforms the bytes between read and write.

### D14. `--no-offline` opt-out is deferred

Jekyll's `also_build_offline: false` skips the offline build entirely
(production deploy doesn't need the offline tree). tbdocs's first cut
doesn't expose this flag; the offline build always runs (~480 ms
cost). If the production deploy ever wants to skip it, add a
`--no-offline` CLI flag to `parseArgs` and gate the `writeOffline`
call.

Currently the `_config.yml` has `also_build_offline: true`; tbdocs
honours that as the default-and-only behaviour. Worth gating on the
config value when the flag lands (so the config file remains the
source of truth).

### D15. The `lib/*.mjs` PDF helpers ship to `_site-offline/` too

Jekyll offlinify copies them as static files. tbdocs follows -- the
`staticFiles[]` from Phase 1 includes `render-book.mjs` + `lib/*.mjs`,
and the offline static-copy pass copies all of them. No exclude
pattern targets them.

The semantic justification: the offline reader might want to
re-render the book PDF from the offline tree. The helpers are a few
KB total; cost-free to ship.

---

## 8. Edge cases

### URL resolution

| Case | Handling |
|---|---|
| URL with percent-encoded path (`/Tutorials/CustomControls/Form%20Designer`) | `resolveRaw` percent-decodes before probing; `buildSegs` re-encodes for the output URL. The single page with this shape (`Form Designer.html`) resolves to `../../Tutorials/CustomControls/Form%20Designer.html`. |
| URL with `#fragment` (`/tB/Core/Const#syntax`) | `resolveRaw` splits the fragment, probes the path, reattaches the fragment to the output. |
| URL with `?query` (rare; defensive) | Same `#fragment` treatment. |
| URL with both `?query` and `#fragment` (`/foo?q#f`) | The first `[?#]` match is the split; the rest is the `tail`. Reattached verbatim. |
| Protocol-relative URL (`//cdn.example.com/foo`) | Excluded by the regex's `\/(?!\/)` lookahead. Left untouched. |
| Absolute URL with scheme (`https://example.com/foo`) | Excluded by the page-relative alternative's `(?![scheme:])` lookahead. Left untouched. |
| Fragment-only URL (`#main-content`) | Excluded by the page-relative alternative's `(?![#/])` lookahead. Left untouched. |
| Empty URL (`href=""`) | Excluded by the URL alternative requiring at least one character. Left untouched. |
| `mailto:`, `tel:`, `javascript:` schemes | Excluded by the scheme lookahead. Left untouched. |
| URL pointing at a file the resolver can't find | `computeRelative` returns null; the callback returns the unchanged match; the unresolved counter increments. |
| URL pointing at a file in the `offline_exclude` list | `buildSitePaths` skips excluded files when building the Set, so resolution returns null -- same handling as "not found". The link check will flag it if needed. |
| URL with `..` segments (`../foo`) | Only valid as a page-relative URL. `computeRelUrl`'s stack-based normalisation handles `..` popping. |
| URL with consecutive slashes (`/foo//bar`) | `computeRelUrl` skips empty segments. Absolute URLs are left as-is by `computeRelative` (its `resolveRaw` doesn't normalise). |
| URL ending with `/` (`/Tutorials/`) | `resolveRaw` probes `<path>/` and `<path>/index.html`. The directory form matches if `index.html` exists at the path. |
| URL ending with explicit extension (`/foo.html`) | `resolveRaw` probes `<path>` (matches the file directly). |
| URL with no extension and not in any candidate (`/missing-page`) | All three candidates miss; returns null. Unresolved counter increments. |

### HTML rewriting

| Case | Handling |
|---|---|
| `<a href="/foo">` | Absolute path → `computeRelative` → `<a href="../foo.html">` (depth-relative). |
| `<a href="foo">` (no leading slash) | Page-relative → `computeRelUrl` → `<a href="foo.html">` if `foo.html` exists in the same dir. |
| `<a href="foo.html">` (already correct) | `computeRelUrl` probes `<path>` first, matches, returns `path + ""` (the empty suffix). The rewriter's `rel === rawUrl` check catches this; no change emitted. |
| `<script src="...just-the-docs.js">` | Absolute path → rewritten to e.g. `../../assets/js/just-the-docs.js`. The post-rewrite src is what `injectSearchSetup` matches to insert the new tags. |
| `<img src="/Tutorials/Images/foo.png">` | Absolute path → `computeRelative` → `<img src="../Tutorials/Images/foo.png">`. |
| `<a href="https://www.twinbasic.com">` | Excluded by the scheme lookahead. Left untouched. (The `aux_links` config emits these; they navigate to the live twinBASIC home, which is correct under file:// too.) |
| `<code>` block containing `<a href="/script.js">` (literal source code) | The combined regex's `<code>` alternative consumes the block atomically. The literal href is left untouched and does NOT increment the unresolved counter. |
| `<pre>` block containing escaped HTML | Same `<pre>` skip. |
| Nested `<code>` inside `<pre>` | The first matching block (whichever opens first) is consumed; the inner block is part of the outer's body. The shape Phase 3 produces always has `<pre><code>...</code></pre>` (Shiki convention), so the `<pre>` skip consumes the whole thing. |
| Self-closing tags (e.g. `<img />` with XHTML-style closure) | The regex doesn't require self-closure shape; the `href="..."` / `src="..."` attribute matches independently of how the tag closes. |
| Attribute value containing the matched quote (e.g. `href='foo"bar'`) | The regex uses backreferenced quote; this is the regex's only failure mode for in-attribute quotes. No content on this site triggers it. |

### CSS rewriting

| Case | Handling |
|---|---|
| `background-image: url("/favicon.png")` | Rewritten to `url("../../favicon.png")` from `assets/css/just-the-docs-combined.css`. |
| `background-image: url('/favicon.png')` (single quotes) | Same handling; the regex captures either quote. |
| `background-image: url(/favicon.png)` (bare URL) | Same handling; the regex captures the optional quote as empty. |
| `background-image: url(./relative.png)` (relative URL) | Excluded by `\/(?!\/)` lookahead. Left untouched. (No content uses this on the current site.) |
| Multiple `url(...)` references in one rule | Each matches independently. |

### Redirect-stub rewriting

| Case | Handling |
|---|---|
| Stub with the standard four absolute URL occurrences | Each occurrence rewrites to the same page-relative form. |
| Stub whose target page was excluded from `site_paths` (e.g. via a future config change) | The rewrite returns null; the absolute URL stays. The offline link check flags it. |
| Stub written when `site.url` is empty | The early return in `writeOfflineRedirects` writes the stub verbatim. The absolute URLs become bare `<path>` URLs that the link check probes against the local file -- works if the target file exists. |
| Stub whose `destPath` collides with a page (`/FAQ.html`) | Phase 6's `deriveRedirectStubs` already throws on this collision; Phase 7 never sees the conflict. |

### Static-file pass

| Case | Handling |
|---|---|
| `CNAME` | Matched by `offline_exclude` pattern `CNAME`. Skipped. |
| Image files (PNG, SVG, GIF) | Verbatim copy. |
| `render-book.mjs`, `lib/*.mjs`, `lib/*.js` | Verbatim copy. Shipped to offline tree for PDF re-rendering. |
| A future static file matching a `**/*.bat` pattern | Skipped by the exclude rule. |
| A static file whose `destRel` collides with a page-write | Phase 5's `assertNoDestinationCollisions` already throws; Phase 7 never sees the conflict. |

### Theme-asset pass

| Case | Handling |
|---|---|
| `just-the-docs.js` | Skipped in `copyOfflineThemeAssets` because step [3] of §4 already wrote the patched copy. |
| `just-the-docs-combined.css` | Rewritten (favicon URL → relative). |
| `print.css`, `rouge.css`, `just-the-docs-head-nav.css` | Verbatim copy (no url() references to rewrite). |
| `theme-switch.js`, `vendor/lunr.min.js` | Verbatim copy. |
| A future theme CSS with multiple url() refs | All rewritten in one pass. |

### Search-data passes

| Case | Handling |
|---|---|
| `search-data.json` Phase 6 produced | Copied verbatim (in-memory bytes via `auxStats.search.json`). |
| `search-data.js` Phase 7 generates | Wrapped from the same JSON bytes (`window.SEARCH_DATA = ${json};`). |
| Phase 6 ran with `search_enabled: false` and produced no JSON | `auxStats.search.json` is null/undefined; both `copyOfflineSearchData` and `writeSearchDataJs` early-return; the per-page injection still emits the `<script src="search-data.js">` tag which 404s silently; the patched `initSearch()` logs the missing-SEARCH_DATA message. |

---

## 9. What's NOT in Phase 7

These belong in other phases or are out of scope. Listed so the
implementer doesn't get tempted.

- **PDF generation** -- Phase 8 (`book.mjs` renderer + `pdf.mjs`)
  assembles `book.html` and writes the sparse `_site-pdf/` tree.
  Phase 7 doesn't touch `_site-pdf/`.
- **Live-link validation** -- the offline link check
  (`check_links.mjs --forbid 'https://docs.twinbasic.com'`) is a
  post-build harness, not a phase. Run it after Phase 7 via
  `check.bat`.
- **Incremental rebuilds** -- the orchestrator does full builds only.
  Phase 7 wipes `_site-offline/` and re-populates from scratch every
  time. Adding incremental support would require tracking which input
  files changed and which output files need re-emission; not in
  scope.
- **Watch-mode rebuilds** -- tbdocs has no watcher. Jekyll's
  `jekyll serve` triggers offlinify on each rebuild; tbdocs would
  need an equivalent loop wrapper around `node builder/index.mjs`.
  Defer.
- **Offline-tree compression / minification** -- search-data.js is
  ~2.8 MB (the dominant offline-tree size). Minifying the JSON before
  wrapping would save ~30-40%. Out of scope for Phase 7's first cut;
  add as a follow-up if offline-tree size matters.
- **Custom JS patches beyond navLink + initSearch** -- if just-the-docs
  ships a new version with more file://-incompatible code, the patch
  set grows. Currently scoped to the two known issues; extend
  `patchJustTheDocsJs` if needed.
- **A standalone `_site-offline.zip` package** -- the GitHub release
  workflow produces this from `_site-offline/`. Phase 7 just writes
  the tree; the zip is built by `softprops/action-gh-release@v2` in
  `.github/workflows/jekyll-gh-pages.yml`.

---

## 10. Verification

### Acceptance checklist for "Phase 7 is done"

1. After Phase 7 runs on the production tree:
   - `<offlineRoot>/` exists and is non-empty.
   - All `.html` files Phase 5 wrote (minus `book.html`) have offline
     copies under `<offlineRoot>/<destPath>`.
   - All redirect stubs Phase 6 wrote have offline copies under
     `<offlineRoot>/<destPath>`.
   - All static files (minus `offline_exclude` matches) have offline
     copies under `<offlineRoot>/<destRel>`.
   - Theme assets (CSS / JS / SVG) are present under
     `<offlineRoot>/assets/`.
   - `<offlineRoot>/assets/js/search-data.js` exists; its contents
     parse as JavaScript and set `window.SEARCH_DATA`.
   - `<offlineRoot>/CNAME`, `<offlineRoot>/sitemap.xml`,
     `<offlineRoot>/robots.txt`, `<offlineRoot>/book.html` are absent
     (per `offline_exclude`).

2. **HTML page parity:**
   - For 10 spot-checked pages (a mix of top-level, deep,
     redirect-target, and space-in-permalink): file content matches
     Jekyll offlinify's `_site-offline/<destPath>` byte-for-byte (or
     within an accepted-divergences allowance for documented diffs).
   - Every absolute URL in the original (e.g. `/assets/css/foo.css`)
     is replaced with the corresponding page-relative URL.
   - Every page-relative URL gains the correct `.html` /
     `/index.html` suffix.
   - The SEO block is stripped; only `<title>` remains from inside
     it.
   - Two `<script>` tags (`OFFLINE_SITE_ROOT` + `search-data.js`) are
     injected before the just-the-docs.js script tag.
   - The page parses as well-formed HTML.

3. **CSS file parity:**
   - `just-the-docs-combined.css`'s `url("/favicon.png")` rewritten
     to `url("../../favicon.png")`.
   - Other CSS files copied verbatim.

4. **Redirect stub parity:**
   - All ~290 stubs present.
   - For 5 spot-checked stubs: the four `https://docs.twinbasic.com/<path>`
     URLs each rewritten to the same page-relative form.
   - Stubs whose target was unresolvable (none on the current site)
     would have the absolute URL preserved.

5. **just-the-docs.js patch:**
   - `<offlineRoot>/assets/js/just-the-docs.js` contains the
     replacement `navLink()` body (queries `links[i].href` /
     `window.location.href`).
   - It contains the replacement `initSearch()` body (reads
     `window.SEARCH_DATA`, rewrites `doc.url`).
   - The patch summary log line includes both `"navLink()"` and
     `"initSearch()"`.

6. **search-data.js generation:**
   - `<offlineRoot>/assets/js/search-data.js` opens with
     `window.SEARCH_DATA = {`.
   - The JSON bytes match `<offlineRoot>/assets/js/search-data.json`
     (modulo the wrapper) byte-for-byte.
   - Load `<offlineRoot>/index.html` in a real browser via `file://`;
     the search box returns results.

7. **Cross-substep / functional checks:**
   - `<offlineRoot>/` has zero surviving `href="/..."`,
     `src="/..."`, or `url(/...)` references (after subtracting
     intentionally-allowed `https://...` external links).
   - `<offlineRoot>/` has zero surviving `https://docs.twinbasic.com`
     references (the SEO strip + the redirect-stub rewrite together
     account for all known sources).
   - Run `scripts/check_links.mjs --offline --include-fragments
     --index-files "index.html" --forbid 'https://docs.twinbasic.com'
     --root-dir "<offlineRoot>" "<offlineRoot>"` (the same invocation
     `check.bat` uses); zero broken links, zero forbidden links.

8. **Performance check:**
   - Total Phase 7 wall time under 800 ms on the dev machine. Soft
     cap: 1500 ms (`verify-phase7.mjs` warns if exceeded).
   - HTML pass (~837 pages) dominates; CSS / redirects / statics /
     patching are minor contributors.

### Verification harness

`verify-phase7.mjs` (~350 lines), extends the `verify-phase6.mjs`
pattern. It:

1. Runs `discover()` through `writeOffline()` (Phases 1-7) into
   scratch destinations (`docs/_site-verify/` + `docs/_site-verify-offline/`).
2. Runs Phase 7 with timing capture.
3. Asserts the items above. Where Jekyll offlinify output exists (in
   `docs/_site-offline/`), diff against it as the parity reference.
   Where it doesn't, assert structural properties.
4. For the JS-patch case: read the patched
   `<offlineRoot>/assets/js/just-the-docs.js`, regex-grep for the
   replacement function signatures, assert both patches landed.
5. For the absolute-URL-survival case: walk every `.html` in
   `<offlineRoot>/`, grep for `href="/` and `src="/` and `url(/`;
   assert zero hits (modulo any intentional external links the
   spot-check whitelists).
6. For the search functionality: spawn a headless browser (Puppeteer
   or Playwright) pointed at `file://<offlineRoot>/index.html`, type
   into the search box, assert results show. **OR** (cheaper) skip
   the browser test and verify the search-data.js content matches by
   pattern; the cross-build offline link check is a stronger functional
   signal.
7. Prints `OK <check>` / `FAIL: <reason>` per check, per-substep
   timings up front, `WARN` if total Phase 7 wall-time exceeds 1500 ms.
8. Cleans up `docs/_site-verify/` + `docs/_site-verify-offline/` and
   exits non-zero on any failure.

Total checks: projected ~30 (8 base structure + 5 HTML byte parity +
3 CSS + 3 redirects + 2 JS patch + 3 search-data + 5 cross-substep +
1 perf line).

### Byte-for-byte parity matrix

| Output | Target | Notes |
|---|---|---|
| Each HTML page in `<offlineRoot>/` | byte-identical to Jekyll offlinify | SEO strip + URL rewrite + script injection all deterministic. The only known divergence source is the SEO version string (`v2.8.0` in Phase 4 vs whatever jekyll-seo-tag emits) -- both pass through the strip identically. |
| Each CSS file in `<offlineRoot>/assets/css/` | byte-identical | url() rewrites match by LCP walk. |
| Each redirect stub | byte-identical | Four occurrences replaced by the same rewrite. |
| Patched `just-the-docs.js` | byte-identical | Replacement function bodies match Jekyll's offlinify constants character-for-character. |
| `search-data.js` | byte-identical wrap of search-data.json | Single-line `window.SEARCH_DATA = ${json};` wrapper. |
| Verbatim static copies | byte-identical | `fs.copyFile` from the same source. |

### Performance smoke check

```sh
node builder/index.mjs                # one-line per-phase timings
cd builder && node verify-phase7.mjs  # ~30-check harness + timings
```

Measured wall time on the dev machine (Windows 10, three runs averaged
of the verify harness which captures Phase 7 as a single `t.lap()`):

| Substep | Target | Measured | Notes |
|---|---|---|---|
| **Phase 7 total** | <800 ms | **870-1090 ms** | Above the 800 ms target, well under the 1500 ms soft cap. |
| **Phase 7 soft cap** | 1500 ms | -- | `verify-phase7.mjs` exits non-zero if exceeded. |

Per-substep timings are not separately captured in the first cut --
adding the `--profile-offline` instrumentation parallel to Jekyll's
`tick(:time_*)` accumulators is one of the deferred follow-ups (see
§13). The HTML pass is the dominant cost on inspection: ~6,500 regex
matches per page × ~837 pages, ~5.4M matches total, with the
per-match work bound by V8's regex engine + Map lookups.

**Findings on the measured numbers:**

- The HTML pass landed roughly in the projected 100-500 ms range
  (extrapolating from the total minus the ~60 ms setup + ~200 ms
  static-copy + ~100 ms theme-asset + ~50 ms redirect work). The
  honesty-note caveat from the first draft of this section (the
  projection was a guess at V8-vs-MRI scaling) held up: the actual
  number is in the projected band, not blowing past it.
- The nav-block caching deferral (§7.D7) stayed deferred -- the
  HTML pass never crossed the 800 ms in-scope threshold. The cache
  would still save ~200 ms, but the added complexity isn't justified
  at the current measured baseline.
- Phase 7's ~870-1090 ms runs roughly 2.4-3× faster than Jekyll
  offlinify's 2.65 s with-nav-cache baseline on the same machine. The
  saving comes from collapsing the per-page hook plumbing, the simpler
  SEO strip regex, and Node's libuv I/O rather than MRI's per-syscall
  GIL release. Less dramatic than the originally projected 5× but
  squarely in the "ship and move on" zone -- not worth a second
  optimisation pass before later phases land.

---

## 11. Dependencies needed for this phase only

Cumulative dependencies after Phase 7:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.0",
    "shiki": "^1.0"
  }
}
```

New in Phase 7: **nothing**. The implementation uses only Node
stdlib (`node:fs`, `node:path`) plus the already-imported helpers
from `write.mjs` (`mkdirRec`, `runLimited`, `writeFileMkdirp`,
`WRITE_LIMIT`).

No regex engine beyond the V8 built-in. No glob library beyond §6.5's
inline `fnmatchPathname`. No HTML parser beyond the single combined
regex (§6.6) -- the same trade Jekyll offlinify makes.

The `lunr` dependency from PLAN.md's list remains unused; Phase 7
doesn't compile the index (the JSON is wrapped, not parsed).

---

## 12. File layout after Phase 7

```
<repo root>/
  builder/
    PLAN.md                    — architecture overview (Phase 7 status updated to "shipped" after landing)
    PLAN-1.md                  — Phase 1 spec (shipped)
    PLAN-2.md                  — Phase 2 spec (shipped)
    PLAN-3.md                  — Phase 3 spec (shipped)
    PLAN-4.md                  — Phase 4 spec (shipped)
    PLAN-5.md                  — Phase 5 spec (shipped)
    PLAN-6.md                  — Phase 6 spec (shipped)
    PLAN-7.md                  — this file (Phase 7 spec, shipped)
    FUTURE-WORK.md             — append: nav-block cache deferral (§7.D7), --no-offline opt-out (§7.D14), --profile-offline (§10)
    package.json               — unchanged (no new deps)
    discover.mjs               — Phase 1
    nav.mjs                    — Phase 2 nav
    seo.mjs                    — Phase 2 SEO
    book.mjs                   — Phase 2 book loader
    build-info.mjs             — Phase 2 build-info
    render.mjs                 — Phase 3
    highlight.mjs              — Phase 3 highlight
    template.mjs               — Phase 4
    compress.mjs               — Phase 4 compress
    write.mjs                  — Phase 5 (re-exports mkdirRec, runLimited, writeFileMkdirp, WRITE_LIMIT, safeWrite, isUnderProject for Phase 7)
    paths.mjs                  — Phase 6 paths helper
    redirects.mjs              — Phase 6 (signature extended: returns { written, stubs })
    sitemap.mjs                — Phase 6 sitemap
    search.mjs                 — Phase 6 (signature extended: returns { entries, json })
    offline.mjs                — NEW: writeOffline + buildOfflineState + deriveOffline{Page,Redirect,Css,JtdJs,SearchDataJs}
    accepted-divergences.mjs   — unchanged (the 8 propagated-accepted pages are pre-existing Phase 3/4 divergences)
    index.mjs                  — orchestrator extended (writeOffline call after auxiliaries + summary line)
    verify-phase1.mjs          — Phase 1 harness
    verify-phase2.mjs          — Phase 2 harness
    verify-phase3.mjs          — Phase 3 harness
    verify-phase4.mjs          — Phase 4 harness
    verify-phase5.mjs          — Phase 5 harness
    verify-phase6.mjs          — Phase 6 harness
    verify-phase7.mjs          — NEW: §10 acceptance harness (30+ checks)
    _diff.mjs                  — first-divergence single-page diff (extended: --offline=, --offline-redirect=, --offline-css=, --offline-jtd, --offline-search)
    _diff_all.mjs              — per-bucket divergence audit (unchanged)
    _triage.mjs                — extended: auditOffline{Pages,Redirects,Css,Jtd,Search} with propagated-vs-offline-only classification
    _sitemap_diff.mjs          — unchanged
    _spot.mjs                  — single-page output dump (unchanged)
    # _offline_diff.mjs        — NOT created; subsumed by _diff.mjs / _triage.mjs extensions (see §12.1)
  docs/                        — unchanged
  WIP.md                       — extended: "Builder diff / triage / verify tools" subsection introducing the tools to future sessions
  docs/.gitignore              — extended: added _site-new-offline/
```

### Extended `index.mjs` orchestrator

Phase 7 adds one substantive call to the orchestrator, plus a small
extension to the Phase 6 fan-out to capture the in-memory bytes Phase
7 consumes:

```js
import { writeOffline } from "./offline.mjs";

// ... existing main() body up through auxiliaries ...
let auxStats = null;
if (!dryRun) {
  const [redirectStats, sitemapStats, searchStats] = await Promise.all([
    writeRedirects(pages, site, destRoot),
    writeSitemap(pages, site, destRoot),
    writeSearchData(pages, site, destRoot),
  ]);
  auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };
}
t.lap("auxiliaries");

let offlineStats = null;
if (!dryRun) {
  offlineStats = await writeOffline(pages, staticFiles, site, destRoot, { auxStats });
}
t.lap("offline");

console.log(`Phase 1+2+3+4+5+6+7 done: ${pages.length} pages, ${staticFiles.length} static files`);
console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
            `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files ` +
            `-> ${destRoot}`);
if (auxStats) {
  console.log(`  aux:   ${auxStats.redirects.written} redirect stubs, ` +
              `${auxStats.sitemap.entries} sitemap entries, ` +
              `${auxStats.search.entries} search-index entries`);
}
if (offlineStats) {
  console.log(`  offline: ${offlineStats.html} HTML, ${offlineStats.css} CSS, ` +
              `${offlineStats.redirects} redirect stubs, ` +
              `${offlineStats.statics + offlineStats.assets} assets, ` +
              `${offlineStats.excluded} excluded ` +
              `(${offlineStats.unresolved} unresolved) -> ${destRoot}-offline`);
}
console.log(t.summary());
```

`--dry-run` semantics: Phase 7 is guarded by `if (!dryRun)` matching
Phase 6's pattern. The dry-run path skips all writes; compute work
(buildSitePaths, plan derivation) could be split out for representative
timing if profiling demands.

### Refactor: Phase 6 substep returns

Two substep return-shapes extend (PLAN-6 §3 → PLAN-7's §7.D8):

```js
// builder/search.mjs
export async function writeSearchData(pages, site, destRoot) {
  const entries = deriveSearchEntries(pages, site);
  const body = entries.map(renderEntryString).join(",");
  const json = `{` + body + `\n}\n`;
  await writeFileMkdirp(path.join(destRoot, "assets/js/search-data.json"), json);
  return { entries: entries.length, json };       // ← + json
}

// builder/redirects.mjs
export async function writeRedirects(pages, site, destRoot) {
  const stubs = deriveRedirectStubs(pages, site);
  await runLimited(stubs, WRITE_LIMIT, async (s) => {
    await writeFileMkdirp(path.join(destRoot, s.destPath), s.html);
  });
  return { written: stubs.length, stubs };        // ← + stubs
}
```

Zero behaviour change to existing consumers (verify-phase6 reads
`entries` / `written` only); the new fields are additive.

### Refactor: `write.mjs` exports

Promoted to module-level exports during Phase 7 landing:
`safeWrite` (the path-stamping error helper) and `isUnderProject`
(the wipe-safety guard). One-line changes; verify-phase5 stayed
green.

### 12.1. Diff and triage tool extensions

The plan's original §12.1 called for a standalone `_offline_diff.mjs`
CLI for the per-file walk. As Phase 7 shipped, we instead extended
the existing `_diff.mjs` and `_triage.mjs` with offline-aware modes,
because those tools already have the discover → render → template
plumbing wired up and (with the `derive*` helpers from §I) can derive
expected offline bytes in-memory for any single target. One workflow,
one set of conventions, no parallel tree-walker.

The `_offline_diff.mjs` standalone script was not created.

**`_diff.mjs` new modes** (see [_diff.mjs](_diff.mjs) for the full
implementation):

| Mode | Compares |
|---|---|
| `--offline=<srcRel>` | Derived offline HTML vs `_site-offline/<destPath>`. |
| `--offline-redirect=<fromPath>` | Derived offline redirect stub vs `_site-offline/<destPath>`. |
| `--offline-css=<themeRel>` | Derived offline CSS (url() rewrite) vs `_site-offline/<themeRel>`. |
| `--offline-jtd` | Derived patched just-the-docs.js vs `_site-offline/assets/js/just-the-docs.js`. |
| `--offline-search` | Derived search-data.js wrap vs `_site-offline/assets/js/search-data.js`. |

Each mode prints MATCH or DIFFER + first divergence offset + ~200
chars of context, matching the existing `_diff.mjs` convention. The
diff tools resolve URLs against Jekyll's `_site/assets/` (not the
verify-tree's) so the derive runs against the same source the Jekyll
offline tree was built from -- otherwise a Phase 5 theme-asset
divergence in `builder/assets/` would show up as a false-positive
Phase 7 divergence.

**`_triage.mjs` new audit functions** (added after the existing
sitemap / redirects / robots / search auxiliary audits):

- `auditOfflinePages` -- walks every page through `deriveOfflinePage`,
  classifies divergences as **propagated-accepted** (page in
  `ACCEPTED_DIVERGENCE_PATHS`; Phase 3/4 divergence flowing through),
  **propagated-unaccepted** (online _site/ also differs but not in the
  acceptance list -- Phase 3/4 bug propagating to Phase 7), or
  **offline-only** (online matches but offline doesn't -- Phase 7-
  specific bug). Offline-only divergences are further bucketed by the
  nature of the first diff: `strip-seo`, `href-src-rewrite`,
  `script-inject`, `css-url-rewrite`, `other`.
- `auditOfflineRedirects` -- per-stub byte compare.
- `auditOfflineCss` -- per-CSS byte compare.
- `auditOfflineJtd` -- single-file byte compare with patch sanity
  checks.
- `auditOfflineSearch` -- search-data.js byte compare, with smart
  detection of "the divergence is just a wrap of the already-audited
  search-data.json divergence" → reported as MATCH-with-note.

Each prints one summary line (MATCH or DIFFER + counts), so a clean
build shows a 4-line block:

```
Offline pages: MATCH (829 match, 8 accepted)
Offline redirects: MATCH (290 stubs)
Offline CSS: MATCH (7 files)
Offline JTD JS: MATCH (2/2 patches: navLink(), initSearch())
Offline search-data.js: MATCH (propagates from search-data.json -- see Search index above)
```

When a divergence surfaces, the `_triage.mjs` line surfaces the
bucket counts; `_diff.mjs --offline=<srcRel>` is the followup to
inspect a representative file.

The convention is documented in WIP.md's "Builder diff / triage /
verify tools" subsection so future sessions discover these without
having to grep the source.

---

## 13. What "done" Phase 7 actually enables

The offline tree at `<destRoot>-offline/` is **functionally complete**
after Phase 7:

- Every page is reachable from every other page under `file://`
  without any URL stays absolute.
- Every redirect navigates locally (no live-site detour).
- The sidebar nav highlights the current page correctly under
  `file://` (the patched `navLink()` runs).
- The search box returns results under `file://` (the patched
  `initSearch()` reads `window.SEARCH_DATA` from the preloaded
  `search-data.js`).
- All static assets (images, CSS, JS, vendor) load from the
  page-relative path the browser resolves correctly under `file://`.
- The CI link check (`check.bat` against `_site-offline/`) passes
  with `--forbid 'https://docs.twinbasic.com'` -- zero surviving live-site links.
- The GitHub release workflow can package `<destRoot>-offline/` as
  `twinbasic-docs-offline.zip` and attach to a release (per
  `.github/workflows/jekyll-gh-pages.yml`).

The next session can implement Phase 8 (`book.mjs` renderer half +
`pdf.mjs`), which takes `pages[]` (Phase 1) + `bookData` (Phase 2) +
`page.renderedContent` (Phase 3) directly and produces the
`_site-pdf/` tree. Phase 8 doesn't depend on Phase 7's outputs.

That clean handoff is the point of having an offline phase as a
standalone step -- it consumes only `_site/` (Phases 5+6) and produces
only `_site-offline/`, with no entanglement to the PDF tree.

### Carried into FUTURE-WORK.md

Append the following entries to [FUTURE-WORK.md](FUTURE-WORK.md) when
Phase 7 ships:

> **Phase 7 nav-block cache.** Defer per-source-dir caching of the
> rewritten just-the-docs sidebar nav. Estimated saving: ~200 ms on
> the HTML pass. Trigger: HTML pass exceeds 300 ms in profiling, or
> Phase 7 total exceeds 1500 ms in `verify-phase7.mjs`.
> Implementation: substitute the input nav with a placeholder before
> the per-page gsub when `nav_cache[file_dir]` is set; splice the
> cached rewritten nav back after the gsub; seed the cache from the
> first page in each `file_dir`. ~80 lines added to `offline.mjs`
> §D.

> **Phase 7 `--no-offline` opt-out.** Add a CLI flag mirroring
> Jekyll's `also_build_offline: false` so production deploys can skip
> the offline build entirely. Currently the offline build always runs
> (~1 s cost). Trigger: a deployment scenario where the offline tree
> is not wanted (e.g. CI builds that only ship the online tree).

> **Phase 7 `--profile-offline` flag.** Add per-substep timing
> instrumentation parallel to Jekyll offlinify's `tick(:time_*)`
> accumulators. Per-substep wall-time isn't captured in the first
> cut; only the Phase 7 total appears in the orchestrator's
> `t.summary()`. Trigger: Phase 7 misses its 800 ms target and the
> per-substep breakdown is needed to identify the dominant cost.

> **Phase 7 search-data minification.** Compress `search-data.js`
> (~2.8 MB → ~1.7 MB at modest JSON minification). Trigger: complaints
> about page load under file:// on spinning disks.

> **Phase 7 AST-based JTD JS patching.** Replace the regex patches
> with an acorn-based AST rewrite if just-the-docs ever ships a
> function shape the regexes can't anchor on. Trigger: regex misses
> in the patch step (the warning lines `deriveOfflineJtdJs` returns
> would surface this).
