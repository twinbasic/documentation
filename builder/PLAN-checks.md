# Checks in the build — Phase A: the link checker

Move link extraction and resolution out of `scripts/check_links.mjs`'s
standalone re-scan and into the tbdocs task graph, so the build checks the
HTML it already has in memory instead of writing it out, exiting, and reading
230 MB back.

This plan covers **the link checker only**. `pick_a11y_sample.mjs`, the axe
scan's orchestration, and CI step fusion are separate follow-ons, sketched at
the end so the shared interfaces are designed with them in mind.

---

## Why

Measured on the dev box (Ryzen 7 8845HS, 16 logical cores, Node 24.13, warm
page cache), against the tree at `7801a75`:

| | wall |
|---|---|
| `build.bat` (`tbdocs --src docs`) | **2 251 ms** |
| `check.bat` | **25 675 ms** |
| — `check_links.mjs`, three passes via `/sep/` | 3 030 ms |
| — `check_axe_patch_equiv.mjs` | 1 034 ms |
| — `pick_a11y_sample.mjs --check` | 1 323 ms |
| — `check_a11y.mjs` | 20 288 ms |

The gate is **11× the build**. The build is the part that is already parallel:

```
render: 1460ms, w0..w15 all ~1.2–1.45s
write:  1115ms, w0..w15 all ~0.95–1.04s
```

Inside one link pass (`check_links.mjs -v`, `_site/`):

```
Files scanned: 1159
Walk 0.038s   Extract 1.986s   Resolve 0.518s   Check paths 0.078s   Fragments 0.002s
```

**Extract is 76 %.** Splitting it further with a minimal SAX handler over the
same 1 159 files:

- read + UTF-8 decode of 115 MB: **210 ms**
- read + SAX walk over 2 058 836 open tags: **1 498 ms**
- ⇒ parse alone ≈ **1 287 ms**; the real handler's extra work takes it to ~1.8 s

So the cost is parse, not I/O — and it is a parse of a string the build
already had. `cpu-worker.mjs`'s `flush()`:

```js
await fsP.writeFile(path.join(ctx.destRoot, p.destPath), p.html, "utf8");
if (p.offlineHtml !== undefined) {
  await fsP.writeFile(path.join(ctx.destRoot + "-offline", p.destPath), p.offlineHtml, "utf8");
```

Both trees' final HTML is in worker memory at that moment, on 16 lanes that
are already warm.

### Two properties that make this sound rather than merely faster

**1. The output tree is exactly the build's output.** `prepareDestinations()`
([write.mjs:96](write.mjs)) does `fs.rm(root, { recursive: true, force: true })`
then `mkdir` on `_site/`, `_site-offline/` and `_site-pdf/` before anything is
written. Nothing survives from a previous build. An existence oracle built
from what the build emitted is therefore **complete**, not an approximation of
the filesystem — which is what lets `checkPath()`'s `statSync` calls become
set lookups without losing fidelity.

**2. CI never builds without checking.** Both workflows run the same four
gates immediately after the build, in the same job, on the same runner —
[checks.yml](../.github/workflows/checks.yml) on `pull_request`,
[tbdocs-gh-pages.yml](../.github/workflows/tbdocs-gh-pages.yml) on `push` to
`staging` (which then blocks the Pages deploy on the result). `checks.yml`
says so in its trigger comment. There is no build that would start paying for
a check it does not already pay for, and the saving is proportionally larger
on a 4-vCPU runner than it is here.

### Projected

Extraction of ~1.8 s of parse per tree, spread over 16 lanes, lands as roughly
**+0.11 s per tree** on the write phase. Resolution (~0.5 s) moves onto the
workers too (see Phase 3). Against that, the 3 030 ms link stage disappears.

Build ≈ 2.25 s → ≈ **2.5 s**; `build.bat && check.bat` ≈ 28 s → ≈ **25 s** with
this plan alone, and ≈ **9 s** once the axe follow-ons land.

---

## Non-negotiables

These are constraints on the design, not goals to trade off.

1. **`scripts/check_links.mjs` keeps working standalone, unchanged in
   behaviour.** CI invokes it directly today; you need it against trees you did
   not just build (a release zip, a bisect, someone else's artifact). The
   fused path is an *additional* front end over shared code, never a
   replacement.
2. **Findings must be identical, and that must be demonstrated, not asserted.**
   The failure mode here is the same one `check_a11y_fingerprint.mjs` exists to
   catch on the axe side: a fused checker that silently checks *less* reports a
   clean pass. Phase 0 builds the differential harness before any code moves.
3. **Exit-code semantics survive.** `check_links.mjs` returns 1 for broken
   links and 2 for integrity-only failures so CI can tell them apart. A fused
   run must preserve the distinction in its summary even if the process exit
   code collapses.
4. **A failing check must not destroy build output.** `Scheduler._abort()`
   rejects the whole graph on task failure. `nav.mjs` already aborts the build
   on nav ambiguity — but that is a *build correctness* check: the output would
   be wrong. A broken link still produces a valid site you want on disk to
   inspect. Check tasks collect and report; they do not abort.
5. **The three passes keep their distinct option sets.** Online `_site/` runs
   `--check-sitemap --check-search --check-canonical`; offline `_site-offline/`
   runs `--forbid 'https://docs.twinbasic.com'` and has neither sitemap nor
   search; the book pass is `--no-fail`. The deploy workflow additionally
   passes `--base-path`. Fusion must not quietly unify them.

---

## What is being moved

`scripts/check_links.mjs` is 1 314 lines and almost all of it is pure. The
filesystem coupling is three lines:

| Coupling | Location | Becomes |
|---|---|---|
| `parser.write(fs.readFileSync(htmlPath, "utf8"))` | `extractLinksAndIds`, [check_links.mjs:393](../scripts/check_links.mjs) | a string parameter |
| `statSafe(p)` in `checkPath` | [check_links.mjs:551](../scripts/check_links.mjs) | an oracle call |
| `collectHtmlFiles` directory walk | [check_links.mjs:732](../scripts/check_links.mjs) | the build's own page list |

Everything else — `resolve()` (string ops only, explicitly no syscalls), the
`(srcDir, href)` resolution cache, the `Map<target, Map<isDirFrag, entry>>`
dedup, the fragment pass, `checkSitemapContents` / `checkSearchContents` /
`checkCanonicalContents`, `stripBasePath` / `isOutsideBasePath`, the reporter
— is already independent of where the bytes came from.

Note `collectHtmlFiles` only picks up `*.html`. Static assets are never
parsed, so the fused extraction set is exactly: **pages** (both trees) +
**redirect stubs** (both trees) + **book.html**.

---

## The existence oracle

`checkPath()` answers two questions against the filesystem: *is this a file*,
*is this a directory*, with fallback extensions (`html`) and index files
(`index.html`, `.`) layered on top. Replacing it needs an equivalent over the
build's own output.

`state.sitePaths` is close but **not** the right input as-is. It is built at
`dispatch` by `buildSitePathsSync(pages, staticFiles, excludePatterns, stubs,
themeAssetRels)` ([offline-rewrite.mjs](offline-rewrite.mjs)) as a
`Set<"/dest/path">`, and it is already broadcast to every worker via
`sitePathsArr` — but it is shaped for the *offline rewrite*, so it:

- drops anything matching `offlineExcluded(rel, excludePatterns)`;
- drops the `layout: book-combined` page;
- carries no aux output — `sitemap.xml`, `robots.txt`,
  `assets/js/search-data.js`, `search-data.json` are written later by
  `searchData` / `writeAux`;
- is a file set with no directory entries, while `checkPath` needs
  `isDirectory` for trailing-slash links.

So Phase 2 introduces a **`TreeIndex` per output tree**: the set of files that
tree actually receives, plus the derived directory set, plus the aux outputs.
`sitePaths` stays what it is and keeps its current consumer.

---

## Payload sizing — measured, because this is Phase 3's main risk

The obvious worry with moving extraction onto workers is the reduction: 795 625
`href`/`src` occurrences is not something to ship back over `postMessage`.
Measured over `_site/`:

| | count |
|---|---|
| `href`/`src` occurrences | 795 625 |
| unique `(srcDir, href)` | 114 298 |
| unique `href` strings | 8 507 |
| unique resolution entries (check_links' own count) | 8 022 |
| **occurrences carrying a fragment** | **17 541 (2.2 %)** |
| — of which same-page (`#foo`) | 16 084 |
| — **cross-page** | **1 457** |
| total `id`/`name` attributes | 32 955 (avg 28/page, max 199) |
| id payload as raw strings | 0.5 MB |

This settles the design: **resolve on the worker.** Each worker already holds
the tree index, so it resolves its own chunk's links locally and returns only:

- **broken links** — ~0 on a healthy site;
- **cross-page fragment references** — 1 457 site-wide, because 92 % of
  fragment references are same-page and the worker can verify those against
  the page's own id set without leaving the lane;
- **per-destination id sets** — 33 k strings, 0.5 MB, needed so the join task
  can settle those 1 457;
- **integrity findings** — ~0 on a healthy site.

The 795 k occurrences never cross a thread boundary. The reduction payload is
under a megabyte on a clean build and proportional to the number of *findings*
on a dirty one.

---

## Phases

### Phase 0 — Differential harness

Build the oracle-of-record before moving anything.

**Deliverable:** `scripts/check_links_diff.mjs`. Runs two configurations over
the same tree in one process and diffs their findings — broken links as a
sorted `(source, href, reason)` set, forbidden hits, and each integrity
category as a sorted per-file set. Prints the symmetric difference and exits
non-zero on any.

It must know the three real invocations verbatim, including the deploy
workflow's `--base-path` variant, because that is the only pass where
`isOutsideBasePath` and `stripBasePath` do anything:

1. online `_site/` — integrity + sitemap + search + canonical;
2. offline `_site-offline/` — integrity + `--forbid`;
3. book `_site-pdf/book.html` — `--no-fail`, fragments only;
4. online `_site/` **with** `--base-path '/twinBASIC-docs'` against a tree
   built with the matching `--baseurl`.

**Exit criteria:** with both sides configured as today's code path, the harness
reports zero differences on all four, and `check.bat` output is unchanged.

**Why first:** every later phase's exit criterion is "the harness is clean".
Without it, Phase 2 and Phase 3 are unfalsifiable.

---

### Phase 1 — Split the pure core out

**Deliverable:** `builder/link-check.mjs`, exporting:

```js
extractFromHtml(html, { captureIds, forbidPrefixes, checkOpts })
  // → { links, ids, forbidden, htmlErrors, a11yErrors, dupIds,
  //     remoteAssets, isRedirectStub, canonicalHref }
resolveOccurrences(occurrences, oracle, opts)   // resolve + checkPath + fragments
checkSitemap / checkSearch / checkCanonical     // cross-file, oracle-parameterised
formatFindings(findings)                        // the reporter, unchanged
```

`scripts/check_links.mjs` keeps `extractLinksAndIds(htmlPath, …)` as a
two-line wrapper: `readFileSync` then `extractFromHtml`. Nothing else in the
script changes.

**Placement.** The module lives in `builder/`, not `scripts/lib/`, and the
dependency runs script → builder. Two reasons: the extraction runs inside the
build on worker threads in the hot path, and `cpu-worker.mjs` importing across
into `scripts/` would put the checks' dependency tree on every lane's cold
boot. `scripts/lib/axe-scan.mjs` stays where it is — it owns puppeteer, which
must never enter the build graph.

**Cold-boot cost.** `htmlparser2` imports in **22–24 ms** (3 runs). Across 16
lanes that is ~23 ms added to a boot phase already at 250–330 ms per lane, and
only when checking. Import it dynamically inside the handler, guarded on
`ctx.opts.check`, so a plain `build.bat` pays nothing.

**Exit criteria:** Phase 0 harness clean on all four invocations; `check.bat`
byte-identical; no measurable change to `check_links.mjs` wall time.

---

### Phase 2 — The existence oracle

**Deliverable:** an oracle interface with two implementations.

```js
// Both answer in the same coordinate space as resolve()'s output.
FsOracle(rootStr)        // statSafe + memo — exactly today's behaviour
IndexOracle(treeIndex)   // Set-backed
```

`checkPath()` moves behind it unchanged in logic: file, then directory +
index files, then fallback extensions.

**The coordinate-space hazard.** `runCheck()` deliberately keeps `--root-dir`
in its caller-supplied shape rather than `path.resolve`-ing it, so that
resolver-built target strings have the same relative-vs-absolute shape as walk
paths — otherwise the `idsByFile` lookup misses. The comment at
[check_links.mjs:788](../scripts/check_links.mjs) records this. `IndexOracle`
keys must match whatever `resolve()` produces, which means normalising both
sides at construction rather than assuming. This is the single most likely
place for a silent miss, so Phase 0's harness carries a dedicated case: the
same tree checked with `--root-dir docs/_site` (relative) and with an absolute
root, both oracles, all four results identical.

**`TreeIndex` construction** — one per output tree, from the build's own
records rather than from `sitePaths`:

- `_site/`: every `page.destPath`, every redirect stub `destPath`, every
  `staticFile.destRel`, the theme assets, plus `sitemap.xml`, `robots.txt`,
  `assets/js/search-data.js` and `search-data.json`.
- `_site-offline/`: the same minus `offlineExcluded` entries and the aux files
  the offline tree does not carry, plus its own rewritten assets.
- `_site-pdf/`: `book.html` plus the images and CSS `writePdf` emits.

Directories are derived by walking each file path's prefixes.

**Exit criteria:** `check_links.mjs --oracle index` against a freshly built
tree produces findings identical to `--oracle fs`, on all four Phase 0
invocations. The `--oracle` flag is a Phase 2 development aid; it can stay as
a debugging escape hatch (the way `--stock-axe` did) or be dropped once
Phase 3 lands — decide then, but do not remove it before Phase 3 is green.

---

### Phase 3 — Extraction into the build

**Task-graph shape.** All of this is gated on a new `--check` option; without
it the build is byte-identical to today and pays nothing.

```
  dispatch ──► treeIndex        (main; one per tree, from pages/stubs/staticFiles)
                  │
  flush:i ────────┴──► extract:i   (worker; folded INTO flush:i, not a separate task)
                           │
                           ▼
                      linkJoin      (main; settles cross-page fragments,
                           │         cross-file sitemap/search/canonical)
                           ▼
                      checkReport   (main; formats, sets the summary + exit code)
```

`extract` folds into `flush()` rather than becoming its own task because the
HTML string is already in the lane's memory there; a separate task would have
to be handed the strings, which is the payload problem this design avoids.

**Per-page work inside `flush()`**, for each tree the page is written to:

1. `extractFromHtml(html, …)` — one SAX walk over a string already decoded;
2. resolve each `(srcDir, href)` against that tree's index, memoised per chunk;
3. settle same-page fragments locally against the page's own id set;
4. accumulate broken links, cross-page fragment refs, integrity findings, and
   the page's id set.

**Return value per chunk:** `{ brokenLinks, forbidden, crossPageFragments,
idsByDest, integrityByFile, redirectStubs, canonicals }`. Sized above: under
1 MB on a clean build.

**`linkJoin`** merges the chunks, resolves the 1 457 cross-page fragment
references against the merged `idsByDest`, and runs the three cross-file
checks (`checkSitemapContents`, `checkSearchContents`,
`checkCanonicalContents`) — which need `sitemap.xml` and `search-data.json`,
so it depends on `writeAux`, not merely on `flushJoin`.

**Redirect stubs** are generated by `deriveRedirectStubs` and written by
`writeRedirects` inside `writeAux`, not through `flush`. Their HTML is
in-process all the same; extract there, with the same `extractFromHtml` call.
They are 290 files and the `--check-sitemap` / `--check-search` /
`--check-canonical` checks exclude them via `redirectStubSet`, so the stub set
has to reach `linkJoin` either way.

**The book pass** (`_site-pdf/book.html`, one 6.5 MB file, `--no-fail`) hangs
off `writePdf`. It is a single file with almost entirely internal fragments;
keep it a separate task rather than special-casing the chunk path.

**Reporting.** A `Check` Gantt section and a summary line alongside the
existing per-task timings. `checkReport` must distinguish broken-link failures
from integrity-only failures (non-negotiable 3) and must not abort the graph
(non-negotiable 4) — it records the outcome and `runBuild()` sets the process
exit code after the output trees are complete.

**Capacity:** `MAX_TASKS = 512` against ~60 in use. Three new static tasks plus
one per tree index. No headroom concern.

**Exit criteria:**

- Phase 0 harness clean, comparing `tbdocs --src docs --check` against
  `check_links.mjs` over the same tree, for all four invocations.
- Build wall time with `--check` within the projected +0.25 s; without
  `--check`, unchanged within noise.
- A deliberately broken link, a duplicate id, a remote `<img src>`, a
  fragment pointing at a missing anchor, a `--forbid` hit and a canonical
  mismatch are each detected by the fused path and reported identically.

---

### Phase 4 — Wiring

`check.bat` drops its `check_links.mjs` invocation; `tbdocs --src docs --check`
covers it. `scripts/check_links.mjs` stays for trees the build did not produce,
and the Phase 0 harness becomes its regression test.

CI step fusion is deliberately **not** in this phase — it is entangled with the
axe follow-ons and with a real trade-off (per-step pass/fail granularity in the
Actions UI is worth something). Tracked below.

---

## Follow-ons

Not implemented here. This section carries enough measurement and enough
open questions to plan each one **cold** — everything below was measured in
the same session, on the same machine and the same tree as the numbers in
"Why", so it does not need re-deriving before planning starts. What it does
*not* contain is a design; each still needs its own phased plan.

---

### Follow-on B — `pick_a11y_sample.mjs --check` (1 323 ms)

**What it does.** Counts 16 **construct families** — markup shapes some axe
rule keys on — across the built tree, and fails if any family the site uses is
covered by no page in `SAMPLE_PAGES`. Each family is
`{ re: /…/g, min: N, why: "<rule ids>" }`: a per-page regex count plus the
threshold at which a page counts as covering it. Pure string work, no browser.

**The subtlety that makes it two-pass.** Counts are taken *above the site-wide
minimum* for that family, because the shared chrome contributes a fixed floor
to several of them. `--census` on the current tree:

```
  family            min  floor  pages   max  heaviest page
  listDense         150    871      3   286  /Reference/Enumerations.html
  codeDense         200      0      5  1168  /Documentation/Development/Pipeline-Stages.html
  details             1      0      2    29  /FAQ.html
  …                                          (16 families, 869 content pages
                                              + 290 redirect stubs excluded)
```

`listDense`'s floor of 871 is the nav's `<li>` elements on every page. So a
page's contribution cannot be decided in isolation: raw counts are per-page,
but the floor is a site-wide reduction. That maps onto the task graph cleanly —
per-chunk raw counts, then a join that computes each family's site-wide minimum,
subtracts, applies `min`, and tests the cover — but a design that assumes
per-page independence will silently over-report coverage.

**Measured: the census is identical over `_site/` and `_site-offline/`.** Ran
`--census` against both trees and diffed: no difference. The offline rewrite
changes URLs, not constructs, and the class-keyed families (`video-link`,
`svg-container`) survive it. So `flush()` can compute the tally from either
`p.html` or `p.offlineHtml` — no need to do it twice, and no need to pick
carefully.

**Only `--check` folds in.** `--propose` (greedy set cover) and `--census` read
`perf/results/a11y-sweep.jsonl` and the fitted cost curve (k = 2.73), and are
interactive tools for choosing the sample, not gates. They stay in the script.

**The dependency-direction problem, which is the real design question.**
`--check` needs `SAMPLE_PAGES`, which lives in `scripts/lib/axe-scan.mjs` —
and Phase 1 of this plan forbids the builder importing from `scripts/`,
because `axe-scan.mjs` owns puppeteer and that must never enter the build
graph. Three ways out, in rough order of preference:

1. **Split the work across the boundary.** The build does the expensive half
   (scan 869 pages, emit per-family per-page counts as data) and the script
   does the cheap half (floor subtraction, cover test against `SAMPLE_PAGES`).
   Keeps the direction clean, keeps `--propose`/`--census` working off the same
   data, and takes the gate from 1 323 ms to roughly the cost of reading one
   JSON file. Does not reach ~0, but reaches ~0.05 s.
2. **Move `FAMILIES` into `builder/`** and have the script import it, mirroring
   Phase 1's placement argument. Leaves `SAMPLE_PAGES` where it is and the
   cover test in the script.
3. Move `SAMPLE_PAGES` out of `axe-scan.mjs`. Rejected on sight — WIP.md is
   explicit that the scan's definition lives in one place, and splitting the
   page list from the run options is exactly the drift the fingerprint gate
   exists to prevent.

**Open questions for the plan.**

- Redirect stubs are counted out of the census (869 content pages, 290 stubs)
  but are written by `writeRedirects` inside `writeAux`, not by `flush` — so
  the exclusion has to be deliberate rather than incidental. `STUB_CEILING`
  (100) is the script's own heuristic for this; check whether the fused path
  needs it at all, given the build knows exactly which pages are stubs.
- `ANCHORS` pins `/index.html` and `/404.html` in the sample "for a reason the
  construct census cannot see". Nothing in the fused path should be able to
  drop them.
- What happens on `--serve`, which builds with `skipOffline: true`? The census
  is tree-independent (measured above), so this should be fine, but the cover
  test's `DEFAULT_ROOT_DIR` assumption needs checking.

---

### Follow-on C — axe scan orchestration (20 288 ms)

**Where the time goes.** Instrumented `check_a11y.mjs`'s matrix (11 pages × 2
themes × 2 viewports = 44 audits):

| | ms |
|---|---|
| browser launch | 480 |
| `page.goto` × 44 | 1 973 |
| axe inject × 44 | 1 267 |
| **`axe.run` × 44** | **14 989** |
| matrix wall | 18 251 |

`Pipeline-Stages.html` × 4 is 5 221 ms — **28 %** of the matrix, matching the
30 % already recorded in WIP.md. The cheapest page (`404.html`) is ~204–223 ms
per audit; Pipeline-Stages is ~1 235–1 396 ms.

**The lever is a worker pool, and it is safe.** One browser, N puppeteer pages,
shared queue, longest-page-first (byte size of the built page as a stand-in for
element count). Medians of interleaved repetitions:

| workers | matrix wall | speedup |
|---|---|---|
| 1 | 19.5 s | 1.0× |
| 2 | 14.2 s | 1.4× |
| 4 | 8.5 s | 2.3× |
| 8 | 6.0 s | **3.2×** |
| 12 | 5.6 s | 3.5× |
| 16 | 5.8 s | 3.4× |

**Every configuration produced the identical fingerprint**
(`15349db33270cc38` over `fingerprint()` from `lib/axe-scan.mjs` — violations
as sorted `ruleId:nodeCount`, incomplete as a sorted rule-id set) at every
worker count, under both orderings, and with one browser or N. Knee at 8.

**What is *not* the bottleneck**, so a future plan does not chase it:

- **Node.** The driver burns 1.4–1.9 s of CPU across a ~6–7 s wall. CDP
  marshalling has headroom; the renderers are genuinely CPU-bound.
- **Renderer sharing.** 49 Chrome processes at 8 workers / 1 browser, 103 at
  8 workers / 8 browsers. Pages are not being crammed into one renderer.
- **Memory.** Marginal Chrome RSS from W=1 to W=8 is ~0.5 GB.
- Most of the gap between 3.2× and 8× is the machine: 8 physical cores with
  SMT, on a mobile part whose sustained all-core clock is well below its
  single-core boost.

Separate browsers per worker run the matrix ~15 % faster (5.1 s vs 6.0 s) but
cost 480 ms each to launch; launching them concurrently makes it a wash. **One
browser, N pages** is the shape.

**What integration adds** (none of it makes `axe.run` faster):

- the 480 ms launch becomes a seed task, hidden under a 2.25 s build;
- `check_axe_patch_equiv.mjs` (1 034 ms, almost entirely its own browser
  launch — it loads one page and runs a probe) shares that browser: → ~0.15 s;
- audits get Gantt lanes and land in the existing timings map;
- `serve.mjs` already persists the worker pool across rebuilds
  ([serve.mjs:171](serve.mjs)); a browser on the same lifetime turns the a11y
  gate into a watch-mode check — ~6 s per save, no launch.

**The audit pool wants the main thread, not lanes.** The concurrency lives in
Chrome, not in Node (1.4–1.9 s of Node CPU, above), so it is one `runOnMain`
task awaiting a bounded pool of puppeteer pages. That also sidesteps `HANDLERS`
being a fixed integer map in `sab-scheduler.mjs` — adding a worker handler
touches two files, adding a main task touches one.

**Implementation notes that are easy to miss.**

- **Output ordering.** `check_a11y.mjs` prints each audit as it finishes.
  Parallel + longest-first scrambles that; buffer and emit in matrix order.
- **Worker count must be derived**, `min(cpus, 8)`. CI's `ubuntu-latest` is
  4 vCPU → ~2.3×.
- **The fingerprint gate's blind spot applies.** It cannot detect a change that
  stops auditing elements entirely, so parallelism has to be argued from
  source, not from the gate: each worker page carries its own viewport, its own
  request interception and its own navigation, so the DOM walked per audit is
  unchanged. The identical fingerprints corroborate that argument; they do not
  establish it.
- `scripts/lib/axe-scan.mjs` keeps owning the definition of "the scan" and the
  builder calls in — never the reverse. `check_a11y_fingerprint.mjs` and
  `perf/ab-axe.mjs` must keep consuming the same definition as production, or
  the gate stops gating what production runs.

**Open questions for the plan.**

- **How much overlap is actually available, and is it worth buying?** The
  audit needs `_site-offline/` to have the sample pages plus CSS and JS. The
  build ends at 2.25 s; if sample pages were prioritised into chunk 0 the
  audits might start at ~1.5 s, saving ~0.75 s against a ~6 s audit. Set
  against that: 8 Chrome renderers contending with 16 saturated worker lanes.
  The honest prior is that overlap is **not** worth engineering and the audit
  should simply follow the build.
- **Browser lifetime under `--serve`.** Persisting across rebuilds is the whole
  attraction, but the pool's `destroy()` path and the rebuild queue both need
  to account for it.
- **A skip cache.** The audit only ever reads 11 pages, 5 non-blocked assets
  (3 CSS + `just-the-docs.js` + `theme-toggle.js`; `search-data.js` and
  `lunr.min.js` are blocked during the scan) and the 20 distinct images those
  pages reference — ~36 files. Keying a "last green" marker on their hashes
  skips the whole scan for the common edit that touches none of them, taking
  the dev loop back to ~2.7 s. The build knows exactly what HTML it emitted, so
  this is a graph dependency rather than a bolt-on cache. It is a caching
  trade: it holds only if the key covers everything that can change the render.

---

### Follow-on D — CI step fusion

**Measured, stage-level.** The four gates are independent, and the three cheap
ones hide entirely under the audit:

| configuration | wall |
|---|---|
| today (serial stages, serial audits) | 25.7 s |
| concurrent stages only | 19.9 s |
| serial stages + 8 audit workers | 12.6 s |
| **concurrent stages + 8 audit workers** | **7.6 s** |
| concurrent stages + 4 audit workers | 9.9 s |

Under concurrency the cheap stages inflate from contention — links 3.0 → 4.8 s,
axe-equiv 1.0 → 1.4 s, sample 1.3 → 1.9 s — but none of it shows on the wall.

**The trade-off is not performance.** Both workflows would collapse build +
four checks into one step, losing at-a-glance "link check failed" vs "a11y
failed" in the Actions UI. A fused summary has to carry that distinction;
`check_links.mjs` already separates the two with exit code 2.

**Two things CI will otherwise discover the hard way.**

- `checks.yml`'s dedicated "Install Chromium" step exists solely for
  `check_a11y.mjs` — its comment says the build itself needs no browser, which
  is true since `dot.mjs` went to WASM Graphviz. If the audit becomes a build
  task, that install stops being separable from the build.
- The two workflows build **differently**: `tbdocs-gh-pages.yml` passes
  `--url` + `--baseurl` and its link pass passes the matching `--base-path`;
  `checks.yml` passes neither. Any fused entry point has to follow the tree it
  was given rather than assume one.

Sequence this **last**: it depends on both B and C, and unlike them it is a
trade rather than a pure win.
