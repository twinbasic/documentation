# PLAN-9: Phase 9 — QoL, Documentation, Cleanup

Consolidation phase landing the FUTURE-WORK items that either don't
change build output or strictly improve byte-parity with Jekyll, plus
the doc / cleanup work that accumulated across Phases 1-8. Read this
together with [PLAN.md](PLAN.md) (architecture overview) and any of
[PLAN-1..PLAN-8.md](.) for the upstream phase specs the items below
modify.

Phase 9 has one job: **work through the no-regression backlog without
expanding the feature surface**. Every item in this phase satisfies
one of two criteria:

1. The on-disk output is byte-identical before and after, OR
2. The on-disk output moves closer to Jekyll's output (improves
   `verify-phaseN.mjs` parity).

What Phase 9 does NOT do:

- Change build output in any way that regresses Jekyll parity. Items
  that introduce intentional new HTML / asset bytes (mermaid auto-gen,
  Shiki theming, copy-code SSR, linkify, search-data minification,
  AST-based JTD patcher) belong to **Phase 10** — see [§8](#8-whats-not-in-phase-9).
- Run the Jekyll-to-tbdocs cutover (FUTURE-WORK.md §C1). Orthogonal to
  both Phase 9 and Phase 10; happens once the verify harnesses run
  steadily clean on the production tree.
- Add new build phases. The eight-phase orchestrator stays as-is;
  Phase 9 is internal cleanup spread across existing modules.

Target wall-clock impact: ~200 ms shaved off `node builder/index.mjs`
(Phase 7 nav-block cache plus the Phase 8 image-extract unification),
otherwise neutral on perf.

## Status: planned

---

## 1. Inputs

The current builder state at HEAD: Phases 1-8 shipped, the seven
production-module set under `builder/`, the per-phase verify
harnesses, and the
[FUTURE-WORK.md](FUTURE-WORK.md) backlog. No new source-tree input
is required; Phase 9 operates inside `builder/` and on `docs/WIP.md`.

---

## 2. Outputs

Phase 9 produces no new build artifacts. Its outputs are:

- Edits to existing builder modules (`index.mjs`, `seo.mjs`,
  `book.mjs`, `offline.mjs`, `pdf.mjs`, `verify-phase{7,8}.mjs`).
- One new module: `data.mjs` (generic `_data/*.yml` loader, B4).
- One new diagnostic tool: `_audit_accepted.mjs` (A1 multi-divergence
  audit).
- One new documentation file: `builder/README.md`.
- Edits to `docs/WIP.md` (the "JS builder port (in progress)" section).
- Updates to [PLAN.md](PLAN.md) (phase count, file layout) and
  [FUTURE-WORK.md](FUTURE-WORK.md) (mark Phase-9-landed items, group
  remaining as Phase-10 candidates).

Build output (`_site/`, `_site-offline/`, `_site-pdf/`) is byte-
identical to the pre-Phase-9 state, with two exceptions both of which
improve Jekyll parity:

- `_site-pdf/book.html` title-page date line switches from
  `commitDate` to wall-clock (B15). Matches Jekyll's `site.time`
  semantics.
- The optional `--no-offline` / `--no-pdf` / `--serving` flags (B8 /
  B13 / B14), when passed, suppress one or both trailing trees or
  switch error→warn. Default behaviour with no flag is unchanged.

---

## 3. Module split

```
builder/
  data.mjs                  ~50 lines. Generic _data/*.yml loader (B4).
  _audit_accepted.mjs       ~120 lines. Multi-divergence audit tool (A1).
  README.md                 ~80 lines. Quickstart + doc map.
  seo.mjs                   -3 / +2. Drop the private markdown-it,
                             accept a `markdown` parameter (B3).
  book.mjs                  -5 / +10. Read site.data.book instead of
                             loading book.yml directly (B4); thread
                             imagePaths Set through emitChapter so it
                             collects during assembly (B17).
  index.mjs                 +50. parseArgs flags (B8, B13, B14, B9),
                             skipOffline / skipPdf / serving plumbing,
                             call loadData() + createMarkdownIt() before
                             precomputeSeo (B3).
  render.mjs                -10 / +5. Export createMarkdownIt; read
                             site.markdown instead of creating it (B3).
  pdf.mjs                   -3 / +3. Switch title-page date source to
                             wall-clock + drop extractImagePaths
                             post-pass (B15 + B17 follow-up).
  offline.mjs               +90 / -10. Per-source-dir nav-block cache
                             (B7), per-substep timing under
                             --profile-offline (B9).
  verify-phase8.mjs         +40. Cross-ref completeness audit (B16).
  _diff.mjs                 +20. --against-disk[=<path>] mode (B12),
                             --multi (continue past first divergence, A1).
  _triage.mjs               +20. --multi flag, parallel to _diff.mjs.
  accepted-divergences.mjs  -1 line (B15 narrows the build-date entry).
  PLAN-N.md (1..8)          Headers touched where Phase 9 absorbed an
                             item; bodies unchanged.
  PLAN.md                   Architecture + Build Phases tables touched.
  FUTURE-WORK.md            Mark Phase-9-landed entries; group
                             remainder by Phase 10 vs deferred.
  docs/WIP.md               "JS builder port (in progress)" rewritten.

(all production .mjs)       File-header consistency pass: one canonical
                             // Phase N <NAME>: ... header form.
```

Estimated total churn: ~400 lines added across all files, ~50 removed,
plus the README and per-module header rewrites.

---

## 4. Implementation order

Each substep is independently verifiable and order-independent except
where noted. Suggested batching for review-sized commits:

| Batch | Substeps | Verifies by |
|---|---|---|
| 1 | B3 (seo consolidation) + B4 (data loader) | `verify-phase2.mjs` byte-identical SEO output |
| 2 | B17 (image-extract fold) | `verify-phase8.mjs` byte-identical book.html |
| 3 | B7 (nav-block cache) | `verify-phase7.mjs` byte-identical offline tree + ~200 ms speedup |
| 4 | B8 + B13 + B14 + B9 (CLI flags + timing) | Manual: each flag flips the documented behaviour; default run still byte-clean |
| 5 | B15 (date semantics) | `verify-phase8.mjs` book.html date line changes; accepted-divergences updated |
| 6 | B12 + B16 + A1 (diagnostics) | Diagnostic-tool sanity: each surfaces at least one known case from the current tree |
| 7 | Documentation: README, WIP.md, header pass | `check.bat` clean (no broken links in WIP edits) |

Batches 1-3 can land in any order. Batch 4 depends on
[index.mjs:29-48](index.mjs) `parseArgs` (present today, extends
cleanly with the same `--flag value` / `--flag=value` shape). Batch
5 is the only one that updates `accepted-divergences.mjs`. Batch 6
has no production impact and can land last. Batch 7 closes the phase.

### Commit policy

One git commit per batch above (seven commits total). Each commit
must pass the listed verify harness before the next is started -- a
broken intermediate commit makes bisecting any future regression
considerably harder. Hooks already in place (kramdown formatting,
ESLint) stay enforced; **no `--no-verify` allowed** even on the
documentation batches.

---

## 5. Per-substep specifications

### 5.1. B3 — seo.mjs title rendering consolidation

**Source**: FUTURE-WORK.md §B3, PLAN-2 §D6, PLAN-3 §15.

**Current** ([seo.mjs:44](seo.mjs:44)): `precomputeSeo(pages, config)`
instantiates its own minimal `new MarkdownIt({ html: true, typographer:
true })`. Of the 836 page titles, [seo.mjs:7-11](seo.mjs:7) notes
that 834 are plain ASCII (where the pipeline reduces to
`escape_once(title)`) and 2 contain markdown-active characters:
`&, &=` and `\, \=`.

**Change** — three coordinated file edits:

1. **[render.mjs](render.mjs)**: extract `createMarkdownIt({
   highlighter, linkTables, baseurl, staticFiles })` (currently
   private inside `renderPhase`) as an exported function. Keep
   `renderPhase`'s body, but change line 28-29 from `const md =
   createMarkdownIt(...); site.markdown = md;` to `const md =
   site.markdown ?? createMarkdownIt(...); site.markdown = md;` so
   it's idempotent — the orchestrator can pre-build the instance
   without breaking the standalone `renderPhase` call.

2. **[seo.mjs:37](seo.mjs:37)**: change the signature to
   `precomputeSeo(pages, config, markdown)`. Delete the import of
   `MarkdownIt` and the local `const markdown = new MarkdownIt(...)`
   at line 44. `renderTitle` already takes `markdown` as its second
   argument (line 72) so its body needs no change.

3. **[index.mjs](index.mjs)**: between the existing nav step
   (line 82-83) and the SEO step (line 85-86), insert the
   markdown-it init:

   ```js
   const { navTree } = computeNav(pages, config);
   t.lap("nav");

   // Phase 3 prelude moved up: SEO consolidates onto site.markdown.
   const highlighter = await initHighlighter();
   const linkTables = buildLinkTables(pages);
   const baseurl = String(config.baseurl || "");
   const staticFileSet = new Set(staticFiles.map(s => s.srcRel));
   site.markdown = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles: staticFileSet });
   t.lap("markdown-init");

   const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config, site.markdown);
   t.lap("seo");
   ```

   `initHighlighter`, `buildLinkTables`, and `createMarkdownIt` need
   exports added to render.mjs's import line in index.mjs. The
   `site` object is constructed AFTER this block (line 95), so
   `site.markdown` needs a temporary holder until then — either
   construct `site` earlier with just `{ markdown }`, or stash on a
   `let markdown` variable and pass to both seo and the eventual
   `site` literal.

**Active-title parity risk**: the full markdown-it has more plugins
(attrs, deflist, footnote, plus custom: header-id, TOC,
relative-links, block-HTML recursion) than the minimal one in
seo.mjs. For `&, &=` and `\, \=`, none of those plugins should fire
(no `{:` attribute syntax, no `term\n: definition`, no `[^N]`
footnote ref, no heading, no `{:toc}` marker, no `<a>` token, no
`html_block` with `markdown="1"`). The fenced-code Shiki highlight
callback applies only to fence / code_block tokens, also absent.
Verification: run `verify-phase2.mjs` after the swap; if either
`&, &=` or `\, \=` byte-diverges from the pre-change output, that's
a plugin interaction that wasn't caught here -- inspect with
`_diff.mjs` against the source title.

**Verification**: `verify-phase2.mjs` passes unchanged (SEO checks
compare against Jekyll byte-for-byte; if the consolidation doesn't
regress, byte parity stays).

### 5.2. B4 — generic `_data/*.yml` loader

**Source**: FUTURE-WORK.md §B4, PLAN-3 §15.

**New module** `data.mjs`:

```js
import { promises as fs } from "fs";
import path from "path";
import fg from "fast-glob";
import yaml from "js-yaml";

export async function loadData(srcRoot) {
  const dataDir = path.join(srcRoot, "_data");
  if (!await exists(dataDir)) return {};
  const files = await fg("*.yml", { cwd: dataDir, absolute: true });
  const out = {};
  for (const f of files) {
    const key = path.basename(f, ".yml");
    out[key] = yaml.load(await fs.readFile(f, "utf8"));
  }
  return out;
}
```

**Wiring**:

- Orchestrator calls `site.data = await loadData(srcRoot)` once at the
  top of the COMPUTE prelude.
- `book.mjs` reads `site.data.book` instead of doing its own YAML
  load. The internal `loadBookYaml(srcRoot)` function disappears.

**Verification**: `verify-phase2.mjs` passes unchanged (bookData
resolution doesn't care where the YAML came from).

**Edge cases**:

- `_data/` doesn't exist → return `{}`. No throw.
- A `.yml` with empty content → `out[key] = null` (yaml.load returns
  null for empty input). `book.mjs` checks for null and throws an
  informative error if `site.data.book` is missing, same as current.

### 5.3. B7 — Phase 7 nav-block cache

**Source**: FUTURE-WORK.md §B7, PLAN-7 §13. Largest substep in
Phase 9; reads the offline.mjs internals carefully.

**Current** ([offline.mjs:523](offline.mjs:523), §D
`rewriteHtml`): a single `HTML_COMBINED_RE.replace` pass walks every
page's HTML, matching each `href=`/`src=` attribute and replacing
through a cached resolver. The per-URL `pageCache` (keyed on
`fileDir`, shared across pages in the same dir) already memoises the
URL resolution itself; what's NOT cached is the regex scan + per-
match callback invocation on the ~80 KB sidebar nav block embedded
in every page. With 837 pages × ~80 KB sidebar = ~67 MB of
re-scanned bytes per build.

**Premise**: every page in the same source directory emits a
byte-identical sidebar nav block. The just-the-docs sidebar lists
every page in the site; the per-page active highlight lives in
`<style id="jtd-nav-activation">` (CSS), NOT as inline class
attributes on the nav anchors. So the nav HTML really is identical
across all pages in a given source dir (and almost certainly across
ALL pages, but the per-dir grouping is the safer cache key — it
matches the way [template.mjs](template.mjs) currently precomputes
the nav per directory).

**Decision** ([§7.D11](#71-decision-record)): assert the premise at
first use; fall back to the full rewrite on assertion miss with a
warning. The cache is an optimisation, never a correctness
dependency.

**Algorithm** — extends `writeOfflinePages`
([offline.mjs:129](offline.mjs:129)) and `deriveOfflinePage`
([offline.mjs:147](offline.mjs:147)):

1. **Pre-pass** before the `runLimited` parallel loop in
   `writeOfflinePages`: walk `writable` (already sorted by `srcRel`
   from Phase 1's deterministic glob) and group by source directory.
   The **first** page in `srcRel` order per group renders the cached
   input/output slices for the rest.

   ```js
   const writable = pages.filter(p => p.html !== undefined);
   const byDir = new Map();   // srcDir → { firstSrcRel, members[] }
   for (const p of writable) {
     const srcDir = posixDirname(p.srcRel);
     let g = byDir.get(srcDir);
     if (!g) { g = { firstSrcRel: p.srcRel, members: [] }; byDir.set(srcDir, g); }
     g.members.push(p);
   }
   ```

2. **Cache shape**: `navCache: Map<string, { input: string, output: string }>`
   keyed on source directory. Stored on `deps` so the wrapped
   `deriveOfflinePage` (called from inside `runLimited`) can read it.

3. **First-page execution per dir**: serial pass over the
   first-page set (one page per dir, ~30-40 pages depending on
   tree shape). For each: render via the existing
   `deriveOfflinePage(page, deps)` unmodified. On the resulting
   `{ html }`, slice the nav block; also slice the pre-rewrite nav
   from `page.html` (the Phase 4 output, before any offline
   rewrite). Stash `{ input, output }` on
   `deps.navCache.set(srcDir, {...})`.

   Slice helper:

   ```js
   const NAV_OPEN_RE = /<nav id="site-nav"[^>]*>/;
   const NAV_CLOSE = "</nav>";
   function sliceNavBlock(html) {
     const m = html.match(NAV_OPEN_RE);
     if (!m) return null;
     const start = m.index;
     const end = html.indexOf(NAV_CLOSE, start);
     if (end === -1) return null;
     return html.slice(start, end + NAV_CLOSE.length);
   }
   ```

   If `sliceNavBlock` returns `null` on either side (no sidebar in
   this page's layout, e.g. a hypothetical full-bleed page), skip
   the cache entry for that dir; subsequent pages fall back to the
   full path.

4. **Subsequent pages**: render via a wrapped `deriveOfflinePage`
   that consults the cache:

   ```js
   function deriveOfflinePageCached(page, deps) {
     const srcDir = posixDirname(page.srcRel);
     const cached = deps.navCache?.get(srcDir);
     if (!cached) return deriveOfflinePage(page, deps);

     // Locate the cached pre-rewrite input slice in this page's html.
     // If it's not there byte-for-byte, fall back to full rewrite.
     const idx = page.html.indexOf(cached.input);
     if (idx === -1) {
       console.warn(
         `offline nav cache miss for ${page.srcRel}: ` +
         `nav block doesn't match first page in ${srcDir}; ` +
         `falling back to full rewrite`,
       );
       return deriveOfflinePage(page, deps);
     }

     // Substitute placeholder, rewrite, splice cached output back.
     const PLACEHOLDER = "<!--TBDOCS_NAV_CACHE_-->";
     const stubbed = page.html.slice(0, idx) + PLACEHOLDER +
                     page.html.slice(idx + cached.input.length);
     const stubbedPage = { ...page, html: stubbed };
     const { html: stubbedOut, misses } = deriveOfflinePage(stubbedPage, deps);
     const out = stubbedOut.replace(PLACEHOLDER, cached.output);
     return { html: out, misses };
   }
   ```

5. **Placeholder safety**: `<!--TBDOCS_NAV_CACHE_-->` is an HTML
   comment. `HTML_COMBINED_RE` ([offline.mjs:520](offline.mjs:520))
   has three alternatives: `<code>...</code>`, `<pre>...</pre>`, and
   `\b(href|src)=...`. None matches an HTML comment, so the
   placeholder passes through `rewriteHtml` verbatim. The
   `injectSearchSetup` regex ([offline.mjs:553](offline.mjs:553))
   matches `<script src="...just-the-docs.js"` which can't collide
   either. `stripSeo` ([offline.mjs:508](offline.mjs:508)) matches
   `<!-- Begin Jekyll SEO tag` -- different prefix. The placeholder
   reaches the final `String.prototype.replace` step untouched,
   where it's swapped for the cached output.

**Performance budget**: ~200 ms saving on the HTML pass (PLAN-7 §13
estimate). New cap for `verify-phase7.mjs`: 1200 ms (down from 1500
ms). Measure before / after with `--profile-offline` (§5.7).

**Verification**:

- Byte-identical offline tree to pre-cache. `verify-phase7.mjs`
  `diff -rq` clean.
- Zero cache-miss warnings on the production tree. If any fire,
  that surfaces a sidebar-nav divergence the implementer needs to
  understand BEFORE merging (likely a regression in
  [template.mjs](template.mjs) or a layout that legitimately omits
  the nav).
- Spot-check: pick two pages in the same source dir (e.g.
  `tB/Core/Const.md` and `tB/Core/Dim.md`); confirm the cached
  offline outputs are byte-identical to the pre-cache outputs
  (build twice -- on this commit with cache, on the prior commit
  without -- and `diff -rq` the two `_site-offline-new/tB/Core/`
  trees).

### 5.4. B8 — `--no-offline` flag

**Source**: FUTURE-WORK.md §B8, PLAN-7 §13.

**Change**:

- Add to `parseArgs` in `index.mjs`:
  ```js
  case "--no-offline": opts.skipOffline = true; break;
  ```
- Gate the `await offlinePhase(...)` call on `!opts.skipOffline`.
- Read `site.config.also_build_offline` as the fallback when the flag
  is not passed:
  ```js
  const skipOffline = opts.skipOffline
    ?? (site.config.also_build_offline === false);
  ```
- When skipped, log `Phase 7: skipped (--no-offline)` in place of the
  timing line.

**Verification**: with no flag, output unchanged. With `--no-offline`,
`_site-offline/` is not touched (verify by `fs.stat` on the dest path).

### 5.5. B13 — `--no-pdf` flag

**Source**: FUTURE-WORK.md §B13, PLAN-8 §13.

Identical shape to B8. `parseArgs` adds `--no-pdf`, orchestrator gates
the PDF phase on `!opts.skipPdf`, fallback to
`site.config.also_build_pdf === false`.

### 5.6. B14 — `--serving` flag

**Source**: FUTURE-WORK.md §B14, PLAN-8 §13.

**Change**:

- Add to `parseArgs`: `case "--serving": opts.serving = true; break;`
- Thread `opts.serving` into the PDF phase call:
  `await pdfPhase(..., { serving: opts.serving })`.
- `writePdf` already accepts a `serving` option (PLAN-8 §6 / §D6); it
  flips the missing-image throw to a `console.warn` line and continues.

**Verification**: with `--serving` and a temporarily-missing image,
the build completes with a warning instead of throwing.

### 5.7. B9 — `--profile-offline` flag

**Source**: FUTURE-WORK.md §B9, PLAN-7 §13.

**Current timer** ([index.mjs:50-63](index.mjs:50)): `makeTimer()`
returns `{ lap(label), summary() }` -- flat, no nested scopes. The
hedge in the previous draft ("if `t.lap` doesn't support nested
scopes, add the minimum needed") is real -- it doesn't. **No timer
API extension needed**; instead, instantiate a second `makeTimer`
inside `writeOffline` for the substep grain.

**Change**:

- Add to `parseArgs`:
  `case "--profile-offline": args.profileOffline = true; break;`
  (plus the `--profile-offline=...` form for consistency with
  `--src=`/`--dest=`).
- Thread `{ profileOffline }` through to `writeOffline` via the
  existing options object alongside `auxStats`.
- Inside `writeOffline` ([offline.mjs:45](offline.mjs:45)), create
  a local `const subT = makeTimer()` (export `makeTimer` from
  index.mjs, or duplicate the ~13-line helper into offline.mjs --
  duplicating is fine, but exporting is cleaner; pick exporting).
  Call `subT.lap("<step>")` after each of: `setupOfflineDest`,
  `patchJustTheDocsJs`, `writeSearchDataJs`, and each of the five
  `Promise.all` branches (use a wrapper so each `await branch();
  subT.lap("...")` runs at the point the branch completes -- not
  before).
- When `profileOffline`, append `subT.summary()` to the
  orchestrator's main summary line, prefixed by `  offline:`.
- Substep names: `setup`, `jtdPatch`, `searchDataJs`, `pages`,
  `redirects`, `statics`, `themeAssets`, `searchDataCopy`. Eight
  rows total. Parallel structure to Jekyll offlinify's
  `tick(:time_*)` accumulators
  ([docs/_plugins/offlinify.rb](../docs/_plugins/offlinify.rb)
  L800+).

**Caveat**: the five Phase 7 `Promise.all` branches run concurrently,
so naively measuring "wall time per branch" overcounts (Σ branches
> overall Phase 7 wall time). The simplest honest report:
sequential parts (`setup`, `jtdPatch`, `searchDataJs`) get true
wall-time laps; the five concurrent branches each report `await`
duration via `Date.now() - start` measured inside each branch's
`.then(...)` callback and printed as "(concurrent)" rows that don't
sum to total. Document this in the help-text line under
`--profile-offline`.

**Verification**: with the flag, the per-substep table appears.
The sequential rows sum (within rounding) to the
"sequential portion" of the Phase 7 total; the concurrent rows are
informational only.

### 5.8. B15 — PDF title-page date semantics

**Source**: FUTURE-WORK.md §B15, PLAN-8 §13 / §6.10.

**Current**: Phase 8 reads `site.buildInfo.commitDate` (parsed via the
YYYY-MM-DD path) for the PDF title-page date line.

**Jekyll**: reads `site.time` — the build wall-clock.

**Change**: switch `pdf.mjs` to `new Date()` (wall-clock). The
`commitDate` field stays in `buildInfo` for any future consumer that
wants commit-day semantics; the PDF title page just stops using it.

**Output impact**: the title-page date line in `_site-pdf/book.html`
now matches Jekyll's emitted date line on any build run. The pre-
Phase-9 builds saw this line diverge when `book.bat` was run several
days after the last commit; Phase 9 closes that gap.

**Verification**: `verify-phase8.mjs` byte-diff vs `_site-pdf/book.html`
on the date line. Currently this is in the accepted-divergences (the
date is build-time-dependent on Jekyll's side too); the entry can be
narrowed to "current build date" rather than "commitDate vs
build date".

### 5.9. B17 — fold `extractImagePaths` into `assembleBook`

**Source**: FUTURE-WORK.md §B17, PLAN-8 §13.

**Current state**: partially done. The return-shape contract is
already met -- `deriveBookOutputs`
([pdf.mjs:73-77](pdf.mjs:73)) returns `{ bookHtml, imagePaths }`,
and the caller at [pdf.mjs:50](pdf.mjs:50) destructures both. What
remains: the regex still runs post-pass:

```js
export function deriveBookOutputs(pages, site) {
  const bookHtml = assembleBook(site, pages);
  const imagePaths = extractImagePaths(bookHtml);   // <- this post-pass
  return { bookHtml, imagePaths };
}
```

**Change** -- move the collection INTO the assembly:

1. **[book.mjs:367](book.mjs:367)** `emitChapter(out, chapter, opts,
   subPageState, baseurl)`: extend signature to accept an
   `imagePaths: Set<string>`. Every place `emitChapter` writes a
   chapter body containing image refs, scan that body fragment for
   `<img src=...>` and `seen.add(path.split(/[?#]/, 1)[0])` -- same
   logic as [pdf.mjs:113-125](pdf.mjs:113) `extractImagePaths` but
   per-chunk.
2. **[book.mjs:473](book.mjs:473)** `assembleBook(site, pages)`:
   create `const imagePaths = new Set()`, thread through every
   `emitChapter` call, return `{ bookHtml, imagePaths: [...imagePaths] }`
   (array, matching the existing extractImagePaths return type).
3. **[pdf.mjs:74](pdf.mjs:74)** `deriveBookOutputs`: drop the
   `extractImagePaths(bookHtml)` line; destructure directly from
   `assembleBook`.
4. **[pdf.mjs:113](pdf.mjs:113)** `extractImagePaths` and
   `IMG_SRC_RE`: leave in place as fallback/diagnostic exports OR
   delete if no test fixture imports them. Grep usage first.

**Performance budget**: ~10 ms saving (PLAN-8 §13 estimate).
Doesn't affect a per-phase cap; just a tidy.

**Verification**:

- `verify-phase8.mjs` byte-identical `_site-pdf/book.html` and
  identical image-file copy set.
- A throwaway audit: after the change, run a one-liner that calls
  both the new `assembleBook` (returns imagePaths inline) and the
  old `extractImagePaths(bookHtml)` post-pass, then asserts the two
  sets are identical. Either commit-temporary, or run from an ad-
  hoc node REPL; not worth permanent harness code.

### 5.10. B12 — `_diff.mjs --against-disk` mode

**Source**: FUTURE-WORK.md §B12, PLAN-5 §14 step 11.

**Change**: add a CLI flag to `_diff.mjs`:

- `--against-disk` (no value) reads from the orchestrator's default
  destination (`<srcRoot>/_site-new/`).
- `--against-disk=<path>` reads from an explicit destination
  (lets the user diff a CI-built tree or an archived snapshot).

Resolution: `path.resolve(opts.againstDisk || path.join(srcRoot,
"_site-new"))` -- same shape as `index.mjs`'s `dest` argument
default ([index.mjs:71](index.mjs:71)).

For each page diff:

- Default (in-memory): build via the existing `templatePage(...)`
  pipeline, diff against Jekyll's `_site/<destPath>`.
- `--against-disk`: read `path.join(diskRoot, page.destPath)` and
  diff that against `_site/<destPath>`.

The bulk of `_diff.mjs` is the per-mode bytes-fetch + the shared
diff-and-print helper; the new mode is one new bytes-fetch path
plumbed into the existing helper.

Useful for triaging post-write divergences (write-time encoding
bugs, line-ending contamination) that wouldn't show up in the
in-memory compare because the in-memory string never went through
`fs.writeFile`.

**Verification**: run on a clean tree → MATCH for every page.
Manually introduce a `\r\n` in one page's write path
(temporarily edit `write.mjs`'s `writeFileMkdirp`) →
`--against-disk` flags the divergence; in-memory diff doesn't.
Revert the test edit.

### 5.11. B16 — PDF cross-reference completeness audit

**Source**: FUTURE-WORK.md §B16, PLAN-8 §13.

**Change**: add a check to `verify-phase8.mjs` that walks
`_site-pdf/book.html` for absolute hrefs to the deploy URL and
reports each one with its source-chapter context.

**Deploy-URL filter** -- read from config, NOT hardcoded:

```js
const siteUrl = String(site.config.url ?? "").replace(/\/+$/, "");
const baseurl = String(site.config.baseurl ?? "");
const externalPrefix = siteUrl + baseurl;   // e.g. "https://docs.twinbasic.com"
const HREF_RE = new RegExp(`\\bhref="(${escapeRegExp(externalPrefix)}[^"#]*)`, "g");
```

This matches the same convention `offline.mjs` uses
([offline.mjs:107](offline.mjs:107)) for its own `siteUrl` and
keeps the audit working against any staging deploy URL.

**Why these hrefs exist**: emitted by Phase 8's `rewriteBookHrefs`
([book.mjs](book.mjs)) when a chapter references a page that isn't
in `book.yml`'s manifest -- the rewriter has no in-book anchor to
target, so it falls back to the absolute deploy URL. These become
live links in the rendered PDF; readers without internet can't
follow them.

**Output**: a non-failing report at the end of `verify-phase8.mjs`:

```
Phase 8 cross-references:
  In-book anchors: 1,247
  Out-of-book live links: 38
    Top targets by reference count:
       12 × https://docs.twinbasic.com/tB/Core/Const
        8 × https://docs.twinbasic.com/Reference/Glossary
        5 × https://docs.twinbasic.com/tB/Modules/Strings/Replace
        ... (showing top 10; --verbose for the full list)
  Action: either add the target pages to docs/_data/book.yml
          or accept the live-link behaviour.
```

Sort by reference count descending; cap displayed rows at 10 by
default; expose `--verbose` to dump all rows. Per-source-chapter
context optional (often the same target is referenced from many
chapters; the aggregated count is more useful than the per-call
list).

**Verification**: the report runs without throwing; the count is
stable across consecutive builds on the same content; spot-check
2-3 reported targets manually -- each should resolve under
`docs.twinbasic.com/` and not appear in `book.yml`.

### 5.12. A1 — multi-divergence audit tool

**Source**: FUTURE-WORK.md §A1 investigation paths #1 and #3.

**Two pieces:**

1. New tool `_audit_accepted.mjs`:
   - Iterate `ACCEPTED_DIVERGENCE_PATHS` from `accepted-divergences.mjs`.
   - For each path, render the page through Phase 4, strip the
     sidebar (so the diff is content-only), and diff against
     `_site/<destPath>`.
   - Report all divergence regions, not just the first. For each
     region, print the character offsets, ~80 chars of context on each
     side, and a flag if the offset falls outside the documented
     accepted region.
   - Goal: surface the kind of hidden secondary divergence found at
     `Reference/Attributes.md` line 629 (the kramdown-vs-markdown-it
     strong-asterisk parse) on other accepted pages.

2. Extend `_diff.mjs` and `_triage.mjs` with a `--multi` flag that
   continues past the first divergence and reports each distinct
   region with context.

**Verification**: run `_audit_accepted.mjs` on the current accepted
list. Expected outcome: zero new hidden secondaries on the existing
accepted pages, or N new ones surfaced for triage. Either outcome is
informative; failing builds isn't the goal.

### 5.13. Documentation

#### 5.13.1. `builder/README.md`

Currently absent. Add a ~80-line quickstart that orients new readers:

```markdown
# tbdocs

Node.js static site generator for [docs.twinbasic.com](https://docs.twinbasic.com).
Replaces the original Jekyll + just-the-docs pipeline (which lives at
`docs/_plugins/` and friends for reference).

## Quickstart

Requires Node.js 20+.

    cd builder
    npm install
    node index.mjs                # builds docs/_site-new/

## Documentation

- [PLAN.md](PLAN.md) — architecture overview and the 8-phase pipeline.
- [PLAN-1..PLAN-9.md](.) — per-phase specs (inputs, outputs, edge
  cases, acceptance checklists).
- [FUTURE-WORK.md](FUTURE-WORK.md) — open follow-ups, grouped by
  divergence investigations / deferred enhancements / post-port
  cutover.
- [accepted-divergences.mjs](accepted-divergences.mjs) — per-page
  allow-list every verify harness reads.

## Verification

Each phase has its own acceptance harness:

    node verify-phase1.mjs       # discover
    ...
    node verify-phase8.mjs       # PDF

The bulk-triage tools (`_triage.mjs`, `_diff.mjs`, `_diff_all.mjs`)
classify divergences by first-occurrence pattern; see the
[WIP.md "Builder diff / triage / verify tools" section](../docs/WIP.md)
in the repo root for the full workflow table.

## Build phases (cheatsheet)

| Phase | Module(s) | Job |
|---|---|---|
| 1 | discover.mjs | Read .md/.html + frontmatter |
| 2 | nav / seo / book / build-info / data | Compute nav tree, SEO, etc. |
| 3 | render / highlight | Markdown → HTML body |
| 4 | template / compress | Wrap in layout, anchor, compress |
| 5 | write | Write _site/ |
| 6 | redirects / sitemap / search | Auxiliaries |
| 7 | offline | Mirror to _site-offline/ with file:// rewrites |
| 8 | pdf / book (renderer) | Sparse _site-pdf/ tree |
```

#### 5.13.2. WIP.md "JS builder port" section update

Current state (last paragraph of `## JS builder port (in progress)`):

> The Jekyll + Ruby build pipeline is being ported to a custom
> single-purpose Node.js tool that lives at the repo root in
> [builder/](builder/) ... See [builder/PLAN.md](builder/PLAN.md) for
> the full implementation plan ... and [builder/PLAN-1.md](builder/PLAN-1.md)
> for the detailed Phase 1 (DISCOVER) spec.

Rewrite to: "JS builder port (shipped, Phase 9 cleanup)" with a brief
note that all eight build phases are shipped, that Phase 9 is the
QoL/doc/cleanup pass, that the cutover from Jekyll is tracked in
[FUTURE-WORK.md §C1](builder/FUTURE-WORK.md), and that the Jekyll
pipeline below remains the canonical build path until that cutover
runs.

The "Builder diff / triage / verify tools" subsection below it stays
unchanged (it documents the diagnostic tools, which still apply).

#### 5.13.3. Per-module header consistency pass

Walk every `builder/*.mjs` and standardise the file-header block to:

```js
// Phase N <NAME>: <one-line purpose>. See builder/PLAN-N.md for the
// full spec[ and <path/to/jekyll/ref.rb> for the canonical Jekyll
// reference].
//
// [Optional 2-3 line summary of what this module exports.]
```

Modules that span phases (e.g. `book.mjs` does Phase 2 and Phase 8)
list both phases on the first line.

Verify-harness headers follow:

```js
// Acceptance harness for Phase N. Drives Phases 1..N into a scratch
// destination and asserts the §10 checks from builder/PLAN-N.md.
```

Diagnostic-tool headers (the `_*.mjs` set) follow:

```js
// Diagnostic: <one-line summary>. See builder/WIP.md (Builder diff /
// triage / verify tools) for the workflow table.
```

---

## 6. Shared helpers

### 6.1. `parseArgs` extension

`index.mjs` currently parses `--src`, `--dest`, `--dry-run`. Phase 9
adds four more (`--no-offline`, `--no-pdf`, `--serving`,
`--profile-offline`).

If `parseArgs` is currently a hand-rolled switch (per PLAN-5 §6),
extend it inline. If it's grown past ~30 lines, factor into a
dedicated `args.mjs` (still ~50 lines total). Either is fine; pick by
file length after the additions.

Order in `--help` output: ordered by phase the flag affects
(`--src`, `--dest`, `--dry-run`, `--profile-offline`, `--no-offline`,
`--no-pdf`, `--serving`).

### 6.2. Substep timing primitive

For B9 (`--profile-offline`), reuse the existing `t.lap()` pattern
the orchestrator uses for phase-level timing (per PLAN-2 §11 / PLAN-7
§11). Nested under a Phase-7-scoped `subT` instance:

```js
const subT = t.scope("offline");
subT.lap("css-rewrite");
subT.lap("html-rewrite");
...
if (opts.profileOffline) subT.summary().forEach(line => console.log(line));
```

If the existing `t.lap` doesn't support nested scopes, add the
minimum needed (~10 lines).

---

## 7. Design decisions and assumptions

### 7.1. Decision record

| ID | Decision | Why |
|---|---|---|
| D1 | `site.markdown` consolidation (B3) runs as Phase 2.5 (after Phase 3 init) rather than moving markdown-it init into Phase 2 | Phase 3 owns the markdown-it instance and its plugin configuration; moving init earlier couples Phase 2 to Phase 3's plugin stack. The 2.5 ordering is cheap (markdown-it init is ~5 ms) and keeps phase boundaries clean. |
| D2 | B4 loader returns `null` for empty `.yml` files; `book.mjs` raises on `site.data.book == null` | Matches the YAML-spec behaviour (empty file = null). Per-consumer null-checks are clearer than swallowing in the loader. |
| D3 | B7 nav-block cache keys on **source directory** (the dir of the source `.md` / `.html`), not on the rendered destination directory | Pages in the same source dir get the same `_includes/nav.html` rendering in Jekyll; tbdocs's nav precompute (PLAN-2) is also per source dir. The cache key has to match the unit of nav uniqueness. |
| D4 | The `--no-offline` / `--no-pdf` CLI flags take precedence over `site.config.also_build_*` config | CLI flags are the explicit user intent; config is the default. Same convention every other CLI in this repo follows. |
| D5 | B15 switches to wall-clock (`new Date()`) rather than reading `site.time` (which doesn't exist in tbdocs) | The simpler shape; the orchestrator doesn't have a `site.time` concept and adding one just to mirror Jekyll's API would be cosmetic. The visible behaviour is identical (Jekyll's `site.time` is also `Time.now` at build start). |
| D6 | B17 returns `{ bookHtml, imagePaths }` from `assembleBook` (object) rather than a tuple | JavaScript convention; the existing PLAN-8 callers already destructure the return value, so this is a one-line caller change. |
| D7 | `_audit_accepted.mjs` reports all divergence regions but does not fail the build | The tool is informational. Failing the build would block legitimate accepted divergences from staying accepted. The output is meant for human triage. |
| D8 | The per-module header pass does NOT renumber phases or rewrite the in-file `PLAN-N.md` cross-references | Cross-reference churn would balloon the diff and risk breaking working links. Headers are touched; bodies are not. |
| D9 | Phase 9 does not add new dependencies | Every item is either a pure refactor, a CLI flag, a diagnostic tool, or a refactor using the existing dep set. No `acorn`, no `terser`, no `mmdc`. |
| D10 | The README.md goes in `builder/README.md` (not `docs/README.md` or repo-root) | The repo-root README would conflict with GitHub's project-level README convention. `docs/` is the content tree, not a tool. The builder is the tool. |
| D11 | B7 nav-block cache treats per-source-directory sidebar identity as a runtime-asserted **premise**, not a load-bearing invariant | The just-the-docs sidebar is per-page identical within a source dir today, but the premise isn't enforced by template.mjs's contract. The cached substitution checks `page.html.indexOf(cached.input) !== -1` before splicing; on miss it logs and falls back to the full rewrite. The cache is purely an optimisation -- correctness never depends on the assertion holding. |
| D12 | The B16 cross-ref audit derives its filter prefix from `site.config.url + site.config.baseurl`, not a hardcoded `https://docs.twinbasic.com/` | Same convention `offline.mjs` uses for its own URL resolution. Keeps the audit working against staging deploys, custom domains, or `--src` pointing at a sibling repo. |
| D13 | B9 `--profile-offline` instantiates a second `makeTimer` inside `writeOffline` rather than extending the existing flat timer with nested scopes | The existing `makeTimer` ([index.mjs:50](index.mjs:50)) is 13 lines and intentionally minimal. Nesting would invite per-call subtlety (scope inheritance, label collision). A second timer instance is zero new API surface and the orchestrator's existing summary already concatenates strings; one more line of concatenation handles the substep printout. |
| D14 | B12 `--against-disk` defaults the read path to `<srcRoot>/_site-new/`, matching the orchestrator's default `dest` | Single source of truth: if the executor ever flips `index.mjs`'s default destination (the post-port cutover, FUTURE-WORK §C1), `_diff.mjs --against-disk` follows automatically. Explicit `--against-disk=<path>` overrides for ad-hoc cases. |

### 7.2. Why no Phase 9 verify harness

Most prior phases ship with a `verify-phaseN.mjs` that asserts the §10
acceptance checks for that phase. Phase 9 doesn't have a dedicated
output, so a separate harness would duplicate the existing per-phase
ones. Instead:

- B3 / B4 / B17 → checked by re-running `verify-phase{2,8}.mjs` and
  asserting "still passes".
- B7 → checked by re-running `verify-phase7.mjs` and asserting the
  new perf cap (1200 ms vs 1500 ms).
- B15 → handled by an `accepted-divergences.mjs` narrowing.
- B12 / B16 / A1 / B9 → diagnostic tools, used manually.
- B8 / B13 / B14 → manual: run `node index.mjs --no-offline` and
  confirm `_site-offline/` is untouched, etc.

If Phase 9 needs a harness later (e.g. for the documentation pass),
add `verify-phase9.mjs` then. Don't pre-build one.

### 7.3. Scope guardrails

The line between Phase 9 and Phase 10 is the criterion stated in
[§intro](#plan-9-phase-9--qol-documentation-cleanup): no regression
in build-output bytes vs current state, OR improvement of Jekyll
parity. Implementer test for "is this Phase 9 or Phase 10?":

1. Run `verify-phase{1..8}.mjs` against current state. All clean.
2. Apply the candidate change.
3. Run `verify-phase{1..8}.mjs` again.
4. If output now diverges from current state in a direction that
   matches Jekyll → Phase 9 (B15 fits this).
5. If output diverges in any other direction → Phase 10.
6. If output unchanged → Phase 9.

The accepted-divergences allow-list can be narrowed by Phase 9 (B15
example) but not expanded.

---

## 8. What's NOT in Phase 9

These belong to Phase 10 (planned next) or are out of scope entirely.
Listed here so the implementer doesn't get tempted.

### 8.1. Deferred to Phase 10 (regresses byte-match)

- **B1 Mermaid `.mmd` → `.svg` automation.** Auto-regenerated SVGs
  would differ from the hand-exported originals. Phase 10 handles the
  parity update (or accepts the divergence as a category).
- **B2 Switch to Shiki-themed inline-style output.** Removes
  `rouge.css`; changes the HTML body of every `<pre>`. Phase 10
  consumes the upstream twinBASIC `.twin` source files directly to
  generate Shiki styles (replacing the current
  `scripts/extract_theme_colors.py` mapping). See FUTURE-WORK.md §B2.
- **B5 Inline copy-code button server-side rendering.** Changes the
  HTML of every `<pre>` block; client-bundle reduction comes with a
  Jekyll-output divergence.
- **B6 Linkify exception list.** Auto-linking bare URLs changes
  rendered HTML.
- **B10 Phase 7 search-data minification.** Jekyll's search-data.js
  is not minified; minifying regresses byte-match. Phase 10 should
  also minify the Jekyll-side fixture, or accept the divergence.
- **B11 AST-based JTD JS patching.** Replacing regex patches with an
  acorn rewrite carries a real risk of byte drift in the patched
  `just-the-docs.js`. Phase 10 verifies byte-identity or accepts the
  divergence.

### 8.2. Dropped entirely

- **B18 Streaming write of book.html.** The trigger is "a future book
  size where the in-memory string causes GC pressure"; the current
  scale (~5 MB) is two orders of magnitude below that. Drop the entry
  from FUTURE-WORK.md.

### 8.3. Orthogonal (separate task)

- **C1 Jekyll-to-tbdocs cutover.** Stays as its own post-port task.
  Phase 9 doesn't affect cutover sequencing.

### 8.4. Out of scope by topic

- **Trimming `builder/one-offs/`.** Per the scope question, the 12
  dev-test scripts in `one-offs/` stay untouched. They're noisy but
  bounded.
- **New build phases.** Phase 9 is internal cleanup; the orchestrator's
  eight-phase shape doesn't change.

---

## 9. Verification

### 9.1. Acceptance checklist for "Phase 9 is done"

1. `verify-phase{1..8}.mjs` all clean on the production tree after
   every batch lands.
2. `diff -rq docs/_site/ docs/_site-new/` clean modulo accepted-
   divergences and the B15 date-line narrowing.
3. `diff -rq docs/_site-offline/ docs/_site-offline-new/` clean
   (B7 nav-block cache is byte-neutral).
4. `diff -rq docs/_site-pdf/ docs/_site-pdf-new/` clean modulo the
   B15 date-line narrowing.
5. `node builder/index.mjs --no-offline` leaves `docs/_site-offline-new/`
   untouched.
6. `node builder/index.mjs --no-pdf` leaves `docs/_site-pdf-new/`
   untouched.
7. `node builder/index.mjs --profile-offline` prints the per-substep
   table; sums match the Phase 7 total.
8. `node builder/index.mjs --serving` succeeds even if an image is
   temporarily missing (with a warning).
9. `_audit_accepted.mjs` runs without throwing; output reviewed for
   any new hidden secondary divergences.
10. `_diff.mjs --against-disk <srcRel>` works for any page in the
    current tree.
11. `verify-phase8.mjs` prints the cross-reference completeness
    report.
12. `builder/README.md` exists; the WIP.md section is updated.
13. Every `builder/*.mjs` carries the standardised header block.
14. `check.bat` clean (no broken links introduced by doc edits).
15. Wall-clock measurement of `node builder/index.mjs` is ≤ the
    pre-Phase-9 baseline minus ~150 ms (B7 and B17 contributions).

### 9.2. Manual smoke

| Step | Confirms |
|---|---|
| `node builder/index.mjs && diff -rq docs/_site/ docs/_site-new/` | Default build still byte-clean. |
| `node builder/index.mjs --no-offline --no-pdf && ls docs/_site-offline-new docs/_site-pdf-new` | Both trees skipped. |
| `node builder/index.mjs --profile-offline` | Per-substep table appears. |
| `node builder/_audit_accepted.mjs` | Multi-divergence audit runs. |
| `node builder/_diff.mjs --against-disk Reference/Const.md` | Disk diff works. |
| `node builder/verify-phase8.mjs` | Cross-ref report appears. |
| Open `builder/README.md` in a browser via `gh readme` or rendered | Quickstart reads cleanly. |

---

## 10. Dependencies

None added. Every Phase 9 item uses the existing seven-dep set:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.0",
    "shiki": "^1.0",
    "lunr": "^2.3"
  }
}
```

`data.mjs` reuses `fast-glob` and `js-yaml` (both already loaded by
Phase 1 / Phase 2). `_audit_accepted.mjs` reuses the existing diff
helpers shared with `_diff.mjs` / `_triage.mjs`. The CLI flags only
extend `parseArgs`.

---

## 11. File layout after Phase 9

```
<repo root>/
  builder/
    README.md                  (new — quickstart, §5.13.1)
    PLAN.md                    (updated — Phase 9 listed, file table refreshed)
    PLAN-1.md ... PLAN-8.md    (header conventions referenced from PLAN-9.md
                                 §5.13.3; bodies unchanged)
    PLAN-9.md                  (this file)
    FUTURE-WORK.md             (Phase-9-landed items struck through;
                                 Phase 10 candidates grouped)
    data.mjs                   (new — §5.2)
    _audit_accepted.mjs        (new — §5.12)
    index.mjs                  (+30 lines; CLI flags, data load, gates)
    seo.mjs                    (-10 lines; uses site.markdown)
    book.mjs                   (-15 lines; reads site.data.book)
    offline.mjs                (+70 net; nav cache, substep timers)
    pdf.mjs                    (~0 net; date semantics)
    verify-phase8.mjs          (+30 lines; cross-ref report)
    _diff.mjs                  (+20 lines; --against-disk, --multi)
    _triage.mjs                (+20 lines; --multi)
    one-offs/                  (unchanged)
  docs/
    WIP.md                     (the "JS builder port (in progress)" section
                                 rewritten per §5.13.2)
```

---

## 12. What "done" Phase 9 enables

Phase 9 doesn't unlock a new pipeline capability — the build output is
unchanged. What changes:

- **Developer ergonomics**: the four new CLI flags let CI / scripted
  callers skip output trees they don't need or get per-substep
  timing without code edits.
- **Diagnostic surface**: `_audit_accepted.mjs` and the `--multi`
  diff modes surface hidden secondary divergences that previously
  hid behind first-divergence shortcuts.
- **PDF cross-reference visibility**: the verify report makes the
  out-of-book live-link surface area explicit; source authors can
  decide per reference whether to bring the target into the book.
- **Speed**: ~200 ms shaved from the full build (Phase 7 cache + B17
  fold).
- **Documentation**: `builder/README.md` orients a new reader without
  requiring them to start at WIP.md or `PLAN.md`'s prose.
- **Code consistency**: per-module headers and the consolidated
  markdown-it instance reduce friction when reading or modifying
  multiple modules in one session.

After Phase 9 lands, Phase 10 picks up the output-changing FUTURE-WORK
items (B1, B2, B5, B6, B10, B11) and the deferred parity work they
imply. The Jekyll-to-tbdocs cutover (C1) stays orthogonal; it can run
after Phase 9 or after Phase 10 depending on whether the Phase 10
divergences are acceptable for the deploy target.
