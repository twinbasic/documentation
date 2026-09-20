# Checks in the build — Phase A: the link checker

Move link extraction and resolution out of `scripts/check_links.mjs`'s
standalone re-scan and into the tbdocs task graph, so the build checks the
HTML it already has in memory instead of writing it out, exiting, and reading
it all back -- 230 MB when this was written, ~270 MB today.

This plan covers **the link checker only**. `pick_a11y_sample.mjs`, the axe
scan's orchestration, and CI step fusion are separate follow-ons, sketched at
the end so the shared interfaces are designed with them in mind.

> **Status: Phases 0–4 are implemented.** `tbdocs --src docs --check` runs the
> link and integrity check inside the build; `build.bat` passes it and
> `check.bat` no longer invokes `check_links.mjs`. What shipped differs from
> what is designed below in four places, each recorded at the phase that
> caused it and summarised in [Outcome](#outcome) at the end of Phase 4.
> The follow-ons (B, C, D) remain unimplemented.

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

#### Shipped

[scripts/check_links_diff.mjs](../scripts/check_links_diff.mjs), with a
registry of *sides* (`script`, `index`, `fused`, `mutant`) and *cases*, so
later phases add an implementation rather than rewriting the harness. Findings
come from `runCheck(argv, { structured: true })`, a new mode on
[check_links.mjs](../scripts/check_links.mjs) that reduces a pass to sorted
arrays of tree-relative strings; the CLI path is untouched and its output was
verified byte-identical against the pre-change script.

Two additions the plan did not call for, both because the gate as designed
could pass while proving very little:

- **A sixth case, `fixture`.** The real site is clean, so the four designed
  cases compare empty against empty in nine of the ten categories. `fixture`
  writes a synthetic tree carrying one fault of every kind -- broken target,
  missing fragment, forbidden prefix, duplicate id, remote `<img>`, missing
  alt, empty anchor, empty href, sitemap-missing, search-missing, canonical
  mismatch -- and asserts the expected count per category, so a fixture that
  stops provoking one fails loudly instead of quietly going back to
  empty-vs-empty.
- **`--self-test`.** Diffs `script` against a deliberately corrupted side and
  fails unless all three detector kinds fire: an extra entry (set difference),
  a check that stopped running (`null` vs `[]`), and files never looked at
  (count difference). Everything else the harness prints reduces to "the two
  sides agreed", which is also what a harness that compares nothing says.

`fixture` also recorded a finding about the existing checker: **`--check-html`
could not fire.** The implementation kept its own tag stack, but htmlparser2 in
its default non-XML mode synthesises every implied end tag, so that stack was
balanced by construction -- verified against an unclosed `<div>` before
`</body>`, an unclosed `<div>` at EOF, crossed `<div><span></div></span>`, a
stray `</section>`, unclosed `<svg><g>`, a malformed `<table>`, unclosed and
crossed custom elements, and `<html><body><p>x`. All ten produced no errors.
The flag had been in `check.bat` and both CI workflows gating nothing. Fixed
separately -- see [Appendix: the dead `--check-html` gate](#appendix-the-dead---check-html-gate).

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

#### Shipped

[builder/link-check.mjs](link-check.mjs), close to the designed surface. Three
deviations:

- **The cross-file checks take content, not a root.** `checkSitemap(xml,
  relFiles, basePath)` rather than `checkSitemapContents(rootStr, htmlFiles,
  …)`: the caller supplies the sitemap XML and a list of tree-relative POSIX
  paths with redirect stubs already filtered. That is what lets the build pass
  the string it just wrote instead of reading the file back. `check_links.mjs`
  keeps the old three-argument functions as four-line wrappers, so its
  self-test is unchanged.
- **`resolveOccurrences` gained `deferFragments` and `caches`.** The first lets
  a chunked caller settle the fragments it can decide locally and hand back the
  rest; the second is the reason the fusion is worth anything at all (see
  Phase 3). `occurrences` is a flat triple array rather than an array of
  triples -- one allocation instead of 793k.
- **`formatFindings` split in two.** `formatLinkReport` and
  `formatIntegrityReport`, because `runCheck` interleaves them with summary
  lines that must stay byte-identical, and the fused reporter wants the same
  two blocks in a different order.

All three `check.bat` passes were diffed against the pre-change script and came
back byte-identical (modulo timings), and four interleaved repetitions put the
wall time inside noise.

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

#### Shipped

`FsOracle()` and `IndexOracle(treeIndex)` in link-check.mjs, plus
`buildTreeIndex(rootStr, relFiles)`; `--oracle fs|index` on the script, kept as
a debugging escape hatch the way `--stock-axe` was. The script's `index` mode
builds its index by walking the tree, which is enough to prove the *lookup*
semantics; whether the build's index holds the right entries is a different
question, answered in Phase 3.

The harness found the coordinate-space hazard the plan predicted, in two forms
neither of which would have been caught by reasoning:

- **`path.normalize` preserves a trailing separator.** A directory-shaped link
  (`/Features/`) resolves to a target ending in `\`, while the index holds the
  bare path. 95 839 phantom broken links.
- **`resolve()` returns the source path untouched for a bare `#` link**, so
  that target carries whatever separators the caller's argv had -- forward
  slashes, where the index is built with native ones. 11 815 more, all from
  `book.html`.

Both are fixed by canonicalising in `indexKey()` rather than by assuming.
`statSync` shrugs both off, which is exactly why a Set-backed oracle needs its
own key discipline. After the fix, `script` and `index` agree on all six cases
including `fixture`, and the `online-abs = online` invariant holds on both
sides.

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

#### Shipped

[builder/check.mjs](check.mjs) (the build-side plumbing) and
[builder/check-tree.mjs](check-tree.mjs) (the index derivation), with the
graph shape as designed: extraction folded into `flush()`, then `linkJoin`,
`checkBook` and `checkReport` on main. Five deviations, the first three
forced and the last two found by measurement.

**1. `treeIndex` folded into `dispatch` rather than becoming its own task.**
Workers can only be handed what goes into dispatch's shared payload --
`packShared` runs in `dispatch.submit` -- so a task downstream of dispatch
could not reach them. Everything the derivation needs is settled by then:
pages from discover, stubs from `deriveRedirects`, `staticFiles` after `dot`
and `vendorAssets` have appended theirs, theme assets computed a few lines
above.

**2. The index derivation is a separate module from the rest of the check.**
`check-tree.mjs` imports nothing but `node:path`. Putting it in `check.mjs`
would have dragged htmlparser2's ~23 ms import onto the main thread inside
`dispatch`, which is on the render fan-out's critical path -- a 1 % regression
on builds that asked for no check at all. The plan's cold-boot argument was
about worker lanes; it applies to the main thread too.

**3. `linkJoin` depends on `writeOffline`, not just `writeAux`.** The offline
tree's redirect stubs exist only as strings inside `writeOfflineRedirects`,
which rewrites each stub's URLs. Without them the fused pass checked 792 438
occurrences against the script's 793 018 -- 290 stubs x 2 links each. Both
trees' stubs are now checked as one extra chunk per tree, on main.

**4. `counts.unique` is not reported.** The script's "N unique" counts entries
deduped across the whole tree; the build resolves in 160 chunks of ~6 pages
and a global figure would mean shipping every unique target key back from
every chunk -- hundreds of thousands of strings for a number that appears in a
summary line and is not a finding. `brokenUnique` *is* exact: broken entries
carry a key and the join dedupes them, and on a clean site there are none.
The harness skips a count either side reports as null.

**5. A latent bug in the resolution cache had to be fixed first.** The cache is
keyed by `(srcDir, href)`, but `resolve()` returns the *source page* for a link
with nothing before the `#` -- so two pages in one directory shared an entry
and the second page's same-page anchors were checked against the first page's
ids. Invisible on this site, where the same-page anchors are chrome every page
carries, but wrong, and it blocks hoisting the cache across chunks. Those
hrefs now bypass the cache. The fix is why the summary line moved from 8 022
to 10 694 unique entries on `_site/`: the checker now actually checks each
page's own anchors. Findings are unchanged.

##### Performance: the projection was wrong

**+1.7 s, not +0.25 s.** Measured, interleaved, three repetitions:

| | wall |
|---|---|
| `tbdocs --src docs` | 2.35 s |
| `tbdocs --src docs --check` | 4.05 s |
| — of which extraction | ~1.3 s |
| — of which resolution | ~0.4 s |
| — of which plumbing (import, index build, join) | ~0.2 s |

The plan's "+0.11 s per tree" assumed ~1.8 s of parse spread over 16 lanes,
i.e. a 16x speedup. The box has 8 physical cores and the build already
saturates them -- a plain build spends ~20 s of thread time in 2.35 s of wall.
Extra CPU-bound work cannot ride for free, and 4.2 s of added parse landing as
1.3 s of wall is a 3.2x effective speedup, which is about what an already-busy
machine gives. The floor here is the SAX parse of both trees; nothing in the
plumbing is worth tuning further.

Getting even that far needed the caches hoisted. With them created per chunk,
the `(srcDir, href)` reuse that makes the resolve stage cheap -- the same nav
and footer links on every page -- almost entirely disappeared across 160
six-page chunks: 6.1 s of resolve per tree against the script's 0.57 s. They
now live on `env`, which is per worker per tree.

Against that, the 5.2 s standalone link stage disappears. Interleaved, three
repetitions:

| | wall |
|---|---|
| `build.bat --no-check` + the three `/sep/` passes | 8.5 s |
| `build.bat` (check fused in) | 5.3 s |

**~3.2 s saved, 38 %** on the build-plus-link portion. Smaller than projected
because the projection double-counted parallelism, but real -- and the 230 MB
re-read is gone.

##### Verification

- `check_links_diff --a script --b fused` is clean on `online`, `offline`,
  `book` and `basepath`. (`online-abs` and `fixture` have no fused equivalent:
  the fused pass checks what the build produced, so it has nothing to say
  about a `--root-dir` shape variation or a synthetic tree.)
- `--check-audit-index` reports **0 missing, 0 spurious** on both trees. This
  is the one failure mode the findings comparison structurally cannot see: a
  missing index entry turns a working link into a reported break, which is
  loud, but a spurious entry masks a real break, and on a clean site nothing
  links to a path that does not exist, so nothing would ever notice.
- A probe page carrying eleven deliberate faults -- the six the plan asks for
  plus a same-page missing fragment, a cross-page missing fragment,
  `img-missing-alt`, an empty anchor and an empty `href` -- produced **zero
  differences** between the two paths, on both trees.
- With that page in the tree, `build.bat` exits 1 (links only) or 3 (links and
  integrity), matching `check_links.mjs`'s code scheme, **and the output trees
  are still on disk** -- non-negotiables 3 and 4.

##### Harness hazard worth knowing

The `fused` side *builds* the tree the `script` side then reads. Running the
sides in registry order compared the script's view of the previous build
against the new one and reported six phantom `search-missing` findings. The
build now happens before either side runs.

---

### Phase 4 — Wiring

`check.bat` drops its `check_links.mjs` invocation; `tbdocs --src docs --check`
covers it. `scripts/check_links.mjs` stays for trees the build did not produce,
and the Phase 0 harness becomes its regression test.

CI step fusion is deliberately **not** in this phase — it is entangled with the
axe follow-ons and with a real trade-off (per-step pass/fail granularity in the
Actions UI is worth something). Tracked below.

#### Shipped

`build.bat` passes `--check-audit-index` (which implies `--check`); `check.bat`
is down to a freshness gate and the three axe stages. `--no-check` exists so
`build.bat --no-check` still gets a plain build (flags are read in order, so
the later one wins). Neither CI workflow calls `check_links.mjs` directly any
more -- both run `check_links_diff.mjs`, which spawns it as the `script` side
of the comparison, so it stays a live consumer rather than a museum piece, but
only over the fixture trees.

`scripts/check_links_diff.mjs` is the regression test, run by hand when
`link-check.mjs`, `check.mjs` or `check_links.mjs` changes -- the same contract
`check_a11y_fingerprint.mjs` has, and for the same reason. It is deliberately
not in `check.bat`: the script side costs ~3 s, which is the whole saving.

**Both `.bat` files were swallowing failures.** `popd` resets `ERRORLEVEL`, so
`build.bat` could not fail at all -- not on a `dot` failure, a `scss` failure,
an uncommitted vendored asset, or the page-count drift guard -- and
`check.bat`'s *last* stage, the 20-second axe scan, could not fail the run
either. Both now capture the code before `popd` and `exit /b` it. This was
pre-existing, but it becomes load-bearing the moment `build.bat` carries a
gate.

---

## Outcome

Phases 0–4 shipped. The four places the implementation departs from the design:

1. **`treeIndex` is computed inside `dispatch`**, not as its own task -- the
   shared payload is packed there and workers cannot be reached later.
2. **The index derivation is its own module** (`check-tree.mjs`) to keep
   htmlparser2 off the main thread's critical path.
3. **`linkJoin` also depends on `writeOffline`**, for the offline tree's
   rewritten redirect stubs.
4. **`counts.unique` is not reported by the fused path**; `brokenUnique` is.

And the number that did not land: **+1.7 s on the build, not +0.25 s**, because
the projection assumed a 16x speedup on 8 physical cores the build already
saturates. Net across build-plus-link is still **-3.2 s**.

---

## Appendix: the dead `--check-html` gate

Phase 0's fixture found that `--check-html` could not report anything, and the
three error kinds it could emit -- `unclosed-tag`, `mismatched-tag`,
`unexpected-close` -- were all unreachable. The choice looked like "make it
work at the cost of a second `xmlMode` parse, plus a void/optional-end-tag
table of our own" against "retire it". Neither was necessary.

**htmlparser2 already answers the question.** Its close callback is
`onclosetag(name, isImplied)` --- `false` when the document contained a
matching end tag, `true` when the parser synthesised one. The old
implementation ignored the second argument and rebuilt, badly, the bookkeeping
the parser had already done. Reading the flag costs nothing: same parse, same
pass, one extra argument.

Three implied closes are legitimate and filtered out:

- **void elements** -- `endOpenTag` emits an implied close for every `<img>`,
  `<meta>`, `<br>` the moment the open tag ends;
- **anything inside `<svg>` or `<math>`** -- `<path/>` has no explicit end tag,
  so its close is implied. A depth counter skips foreign content while still
  checking the close of the `<svg>` element itself, so an unclosed one is
  caught;
- self-closing tags generally, which in non-XML mode only occur in foreign
  content, so the same filter covers them.

`unclosed-tag` and `mismatched-tag` both became reachable. They are now
`unclosed-tag` (the document never closed it) and `closed-early` (something
else closed around it first), separated by a flag set just before
`parser.end()` --- everything still open when the document runs out is closed
during `end()`. `unexpected-close` was dropped: htmlparser2 discards a close
tag for an element that was never opened before any callback runs, so catching
a stray `</section>` would need tokenizer access, and it is the harmless case
anyway --- the rendered DOM is unaffected.

**A census settled the design.** Over the 1 159 built pages: 2 035 654 explicit
closes, 17 415 implied closes of void elements, and 5 784 implied non-void
closes. Of those, 5 778 were `<path>`, `<rect>`, `<polygon>` and `<line>` ---
SVG self-closing tags. The remaining **six were real defects**, all the same
one:

```html
<p><div class="svg-inline-wrap">…</div></p>
```

`svgInlinePlugin` in [render.mjs](render.mjs) replaces an image with a `<div>`,
and a lone `![alt](x.svg)` is a paragraph, so the wrapper landed inside a `<p>`
--- which takes phrasing content only. Browsers repair it by closing the
paragraph early and leaving a stray empty `<p>` behind, which is exactly why it
survived unnoticed. Fixed with a core rule that hides the paragraph tokens, the
same way markdown-it hides them inside tight lists; the decision of whether an
image will be inlined now lives in one function that both the core rule and the
renderer rule call, because if the two ever disagreed a paragraph would be
hidden around an `<img>` that stayed an `<img>`.

Verified after the fix: zero empty paragraphs on the affected pages, the
diagram a direct child of `<main>`, 16 px above and below where the old markup
left collapsed empty-paragraph margins, the axe scan clean in both themes and
both viewports (`BuildInfo.html` is in `SAMPLE_PAGES` and was one of the six),
and the PDF book still rendering --- 1 984 pages, no missing images.

The fixture now provokes one of each reachable kind, so
`FIXTURE_EXPECTED.html` is 2.

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

**Where the time goes.** Instrumented `check_a11y.mjs`'s matrix (11 pages at the time of measurement, 13 now × 2
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
- **A skip cache.** The audit only ever reads a dozen-odd pages, 5 non-blocked assets
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
