# axe-core performance evaluation — measurement plan

Target: understand what `axe.run` spends its time on during the accessibility
scan, and decide what of that work is avoidable in a headless batch context.

Scope: measurement first, optimisation second. The deliverable is an
attribution — time and heap, by axe phase and by rule — plus a ranked list of
avoidable work backed by numbers.

---

## Outcome — all four phases complete

**Decision: take `plain-color-fields` (−26 %). Take nothing else.**

Every *config* lever that passes the correctness gate measures within noise of
zero — the config-only set, the safe early win the plan expected to land first,
is **9 ms ± 14 on a 349 ms audit**. What does pay is a vendored source patch,
though not the one the plan expected: replacing `Color2`'s WeakMap-emulated
`#private` fields with plain properties is **26 % across a realistic page set
and 30 % on large pages**, gated 24/24 and verified value-by-value.

That decision is conditional on the scan being widened, which it is. At the
current six small pages the same patch is worth ~140 ms of an ~8 s scan and
would not be worth the maintenance.

What the investigation produced instead:

| | |
|---|---|
| **The cost model** | Audit cost fits **k = 2.73 in element count** on real pages, and the exponent lives almost entirely in `color-contrast`. The other 63 rules are linear with a flat per-element cost. |
| **The mechanism** | `Color2` (`axe.js:18186`), whose six `#private` fields are Babel-emulated with six `WeakMap`s and a `WeakSet` — fourteen weak-collection operations per construction, multiplied by a background stack that deepens with the page. Removing the emulation is the one change that pays. |
| **A correctness gate** | `scripts/check_a11y_fingerprint.mjs`, plus a live demonstration (`no-html`) that it is necessary and **not sufficient**. |
| **A sampling correction** | `SAMPLE_PAGES` contains only the site's *small* pages. The four largest cost ~5.9x each, so widening the scan costs far more than a page count implies — and those pages are the least-audited part of the site. |

Four of the five "confirmed defects" below did not survive contact with
measurement. D2 — draft 2's headline, a vendored patch on memoizee — is
**0.45 %** of self-time. D4 is closed. D1 is confirmed but linear and a third of
what it looked like. The item that actually dominates was a footnote in
§Dead hypotheses.

Read §Phase 1, §Phase 2 and §Phase 3 for the evidence; each defect below carries
its verdict inline.

---

> [!IMPORTANT]
> **Revision note.** The first draft of this plan ranked "axe yields to the
> event loop like paged.js and pdf-lib did" as its headline hypothesis. Three
> contrarian source reviews killed that outright and replaced it with two
> confirmed O(n²) defects. Line references below are to
> `node_modules/axe-core/axe.js` (unminified, 4.13.0) unless stated. Claims are
> tagged **[measured]**, **[source-confirmed]** (read in axe/repo source, not
> yet timed), or **[assumed]**.

---

## Start here

### Prerequisites

The scan reads the built offline tree and needs a real browser:

```sh
build.bat
```

Chromium is not needed for `build.bat` / `serve.bat`, only for this work and
the PDF book. If it is missing:

```sh
npx puppeteer browsers install chrome
```

### Reproduce the baseline before changing anything

```sh
node scripts/check_a11y.mjs
```

Expected today: **`0 violation(s), 20 incomplete check(s)`**, ~10 s wall clock.
If that line differs, stop and reconcile — every experiment below is a delta
against it.

### Provenance of the numbers in this plan

> [!WARNING]
> All timings here were taken on a **16-core Windows box, unpinned**, mostly as
> single runs. They are load-bearing for *ranking*, not for absolute comparison.
> A different machine will produce different absolutes. Re-derive on the target
> machine before drawing conclusions, following §Methodology (pin the CPU;
> on-CPU time, not wall clock).

The scratch probes that produced the §Current state tables were **throwaway and
are not in the repo** — do not go looking for them. What is committed is
`scripts/check_a11y.mjs` (the production scanner, which carries the
search-index blocking), the `perf/` apparatus described in §Methodology, and
the four Phase 0 tools listed under §The apparatus.

The §Current state numbers below therefore predate the Phase 0 rig and were
taken under its *unfixed* methodology — single runs, lazy compilation inside
the measured window. Phase 0's own numbers (§Phase 0, "What it already shows")
are not directly comparable with them and do not replace them; Phase 1
re-derives the attribution properly.

### Version — line numbers are pinned, and why

Roughly fifty citations below are line numbers into
`node_modules/axe-core/axe.js`. `package.json` therefore pins
**`"axe-core": "4.13.0"`** exactly — no caret — matching what this repo already
does for the other two dependencies it reasons about at source level:
`"puppeteer": "25.0.4"` and `"pdf-lib": "1.17.1"`. A caret range would let a
minor upgrade silently invalidate every citation in this document.

Sanity check before trusting a line number:

```sh
node -p "require('axe-core/package.json').version"
```

If it is not `4.13.0`, someone bumped the pin: treat every line number as
approximate and re-locate by symbol name instead.

Upgrading axe-core is now a deliberate act with two consequences. It
re-invalidates the citations, **and** it can legitimately change the scan's
findings — axe ships new and revised WCAG rules between minors. Run the
fingerprint harness across the bump and read the diff as *news*, not as a
regression to be suppressed; the gate exists to make a change visible, not to
freeze coverage at its current level.

### The apparatus

All phases are **done**; the tools below exist and every experiment ran through
them. See §Phase 0 for what each one is and what it cost to get right.

| Tool | Role |
|---|---|
| `scripts/lib/axe-scan.mjs` | The single definition of "the scan" — page list, viewports, themes, blocked requests, run options, the scheme registry, and the fingerprint function. |
| `scripts/check_a11y_fingerprint.mjs` | The correctness gate. Two schemes, one build, one process, diffed audit by audit. |
| `perf/ab-axe.mjs` | The measurement rig. Rule ablation + config-lever A/B, pinned, paired, per-audit CPU sample-time. |
| `perf/trace-cpu-stats.mjs` | Trace parsing extracted from `ab-css.mjs` so both rigs share it. |
| `perf/probe-axe-dom.mjs` | Exact DOM operation counts per rule — what turned D1/D3/D4 into measurements. |
| `perf/probe-axe-scaling.mjs` | The scaling curve, the `--rules`/`--scheme` split that localised the exponent, and `--cpu-profile` for the differential profile. |
| `perf/instrument-axe-dom.js` | The in-page counters behind both probes. |
| `SOURCE_PATCHES` in `axe-scan.mjs` | Named substitutions against the injected bundle, so a vendored-patch candidate can be gated and measured before anyone maintains a fork. |

```sh
node scripts/check_a11y_fingerprint.mjs --list          # scheme registry
node scripts/check_a11y_fingerprint.mjs --candidate no-html
cd perf && node ab-axe.mjs --runs 5                      # default two-rule ablation
cd perf && node ab-axe.mjs --rules none --per-rule       # per-rule timing table
```

---

## Why

After the search-index fix (`78566d1`) the scan's page load is ~44 ms per audit
and `axe.run` is essentially everything else — **~81 %** of the remaining serial
cost **[measured]**.

The original motivation was an analogy: paged.js yielded every 100 objects,
pdf-lib gated on `parseSpeed`/`objectsPerTick`/`waitForTick`, both were built
for interactive use, so axe probably carries the same waste. **That analogy is
dead** (see §Dead hypotheses). What replaced it is better: two confirmed
super-linear algorithms and three pieces of provably unused work.

---

## Current state (measured)

### Already landed

`78566d1` blocks `search-data.js` + `lunr.min.js` during the scan (~3.2 MB of
search index that never reaches the audited DOM).

| | Before | After |
|---|--:|--:|
| 24-audit run (serial) | 27139 ms | 9120 ms |
| — of which `page.goto` | 18956 ms | 1051 ms |
| — of which `axe.run` | 7537 ms | 7406 ms |

Result identity verified across all 24 audits — byte-identical.

### Where the time goes **[measured]**

Per-audit, three representative pages (desktop, light; `goto` pre-blocking):

| Page | DOM nodes | `goto` | inject | `axe.run` |
|---|--:|--:|--:|--:|
| `Select-Case.html` | 2380 | 862 ms | 52 ms | 364 ms |
| `BuildInfo.html` | 2692 | 729 ms | 23 ms | 266 ms |
| `Interaction/index.html` | 2404 | 727 ms | 22 ms | 353 ms |

### Option probe — single runs, indicative only

| Config | Select-Case | BuildInfo | Interaction |
|---|--:|--:|--:|
| production | 364 ms | 266 ms | 353 ms |
| `resultTypes: ['violations']` | 261 ms | 196 ms | 276 ms |
| `preload: false` | 296 ms | 218 ms | 300 ms |
| `color-contrast` disabled | **168 ms** | 152 ms | 211 ms |

Two warnings now attached to this table:

- The contrast delta is **not** attributable to contrast math. Disabling the
  rule plausibly removes the whole `_createGrid` build (D1), which is charged to
  whichever rule touches it first. Do not cite 364→168 as "contrast costs
  196 ms" until D1 is isolated.
- `preload: false` is ~17 %, not 19 % (68/364, 48/266, 53/353 = 18.7/18.0/15.0),
  and the mechanism is not what the first draft claimed (D5).

### Concurrency ceiling **[measured]**

One browser, N pages, 24-audit matrix, 16-core box:

| Pages | 1 | 2 | 4 | 6 | 8 | 12 | 16 |
|---|--:|--:|--:|--:|--:|--:|--:|
| Scan (ms) | 9330 | 5904 | 4297 | 3635 | ~3200 | ~2794 | 2691 |

Plateaus at ~3.5×. Produced by a throwaway probe (one browser, N pages, each
with the production request blocking), **not** by `perf/probe-parallel.mjs` —
that one shards a PDF render across browsers and measures something else
entirely. Do not run it expecting these numbers.
(The serial number here is 9330 ms against 9120 ms in the table above — both
single runs of the same configuration, 2 % apart. Treat neither as precise;
see §Methodology.)

Relevant because it bounds parallelism: **making axe cheaper is the only lever
with real headroom left.**

---

## What `axe.run` actually does **[source-confirmed]**

Corrected taxonomy. The first draft had six phases and missed the three that
matter most.

1. **Config / rule setup** — `_normalizeRunOptions` (`20833`). Cheap.
2. **Tree construction** — `_getFlattenedTree` (`19034-19045`) → `flattenTree`
   (`19070+`). A `VirtualNode` per **element and per text node**
   (`19101-19108`), each running `cacheNodeSelectors` (`19017+`) to build
   `_selectorMap`.
3. **Selector-frequency pre-pass** *(missed in draft 1)* —
   `_getSelectorData(context.flatTree)`, called **eagerly in `runRules` before
   any rule runs** (`30016`; impl `10957-11011`). Full tree walk with
   `children.slice()` allocations, building class/tag/attribute frequency tables.
4. **Grid construction** *(missed in draft 1 — likely the dominant cost)* —
   `_createGrid()` (`15434-15489`). See D1.
5. **Rule matching** — `gather` (`29135`) + `gatherAndMatchNodes` (`29350`).
6. **Check evaluation** — the per-node predicates.
7. **Result serialisation — two distinct phases, not one:**
   - **eager**, inside rule execution: `new DqElement(node)` at `29237` →
     `outerHTML`. See D3.
   - **lazy**, in `processAggregate` (`19149`) → `trimElementSpec` (`19197`) →
     the `selector`/`ancestry`/`xpath` getters (`11377-11385`).
8. **`after` passes** — `audit.after` (`29768-29788`), `_publishMetaData` +
   `_finalizeRuleResult` (`30054-30055`).
9. **Reporter** *(missed in draft 1)* — `createReport` (`30314`), separately
   timed as `'reporter'` (`30252`).

### Nothing amortises between runs **[source-confirmed]**

`teardown()` (`30001-30010`) clears every memoized function
(`axe._memoizedFns.forEach(fn => fn.clear())`), clears `cache`, and sets
`axe._tree = undefined`. So each of the 4 variants of a page **re-pays** the flat
tree, the selector pre-pass and the grid in full. This — not per-rule
invariance — is the real argument for collapsing the variant matrix (H4).

---

## Confirmed defects

Ranked as of draft 2, all **[source-confirmed]** and none yet timed. **Phases 1
and 2 have since measured every one of them, and the ranking below did not
survive.** Each carries its verdict inline; the evidence is in §Phase 1 and
§Phase 2, and the corrected ranking is at the end of §Phase 1.

> [!IMPORTANT]
> Read the verdicts before acting on this section. Two of the five are closed,
> one is reframed, and the item that turned out to dominate — `color-contrast`'s
> uncached `getComputedStyle` calls and its `Color2` construction — is not in
> this list at all. It was a footnote in §Dead hypotheses.

### D1 — `_createGrid` does ~14 computed-style reads per element

> **Verdict: confirmed as a count, wrong as a cost model, and linear.** ~18
> reads per element, not ~14; ~100–120 ms of a ~385 ms audit. But they are
> `getPropertyValue` reads on a *cached* declaration, not style resolutions, and
> the cost scales linearly. See §Phase 1.

`_createGrid()` (`15434-15489`) walks every element with a `TreeWalker`. Per
element it runs `createStackingOrder` → `isStackingContext`, which makes roughly
**14 `getComputedStylePropertyValue` calls** (`15491-15543`), plus
`_vNode.boundingClientRect` (`15479`) and `_isVisibleOnScreen(node)` (`15480`).

At ~2400 elements: **~34,000 style-property reads plus 2400 rect reads per
audit.** It is lazy and memoized behind `cache.get('gridCreated')` (`15438`), so
it is billed to whichever rule touches it first — which is why the contrast
ablation looks so dramatic.

### D2 — the memoization layer is itself O(n)

> **Verdict: REFUTED as a cost centre.** The O(n²) shape is real in source, but
> every memoized frame combined is **0.45 %** of self-time at 9,475 elements,
> and the half of the rule set that does not include `color-contrast` uses the
> same memo layer and scales linearly. The recommendation below to spend a
> vendored patch here is **withdrawn**. See §Phase 2.

`memoize_default` is plain `memoizee(fn)` with **no options** (`10885-10890`).
Without the `primitive` flag, memoizee selects reference-identity normalizers
(`6804-6819`): `get_1` for arity 1 (`5965-5992`), `get_fixed(length)` for arity
≥ 2 (`5994-6035`). Both resolve a cache hit via
`indexOf.call(argsMap, args[0])` — **a linear array scan** (`5972`, `6004`,
`6011`).

There are **23** memoized functions (`memoize_default(` at `10891, 11146, 11147,
11340, 12744, 15031, 15050, 15135, 15138, 15202, 15755, 15825, 15837, 16118,
16191, 16439, 16457, 17029, 17789, 19632, 27320, 27961, 28316`) — including
`getSelector`, `findSimilar`, `DqElement`, `isHiddenAncestors`,
`isVisibleOnScreenVirtual`, `isVisibleToScreenReadersVirtual`, `getTargetSize`,
`getPseudoElementArea`. Every one degrades to an O(k) scan over every distinct
argument seen so far in the run. `findSimilar` is worst — arity 2, so the second
level `indexOf`s over **selector strings**. `DqElement` is arity 3: three nested
scans.

**This is the best vendored-patch target in the codebase.** Replacing the
normalizer with a `WeakMap`/`Map` is behaviour-preserving and passes the
correctness gate by construction.

### D3 — `html` is serialised eagerly for every result node

> **Verdict: real, modest, lumpy.** 503 `outerHTML` reads per audit totalling
> 826 KB, concentrated in a few large-container serialisations. `noHtml: true`
> passes the correctness gate. See §Phase 1 and §Phase 3.

`DqElement`'s constructor sets `this.source = _getElementSource(this._element)`
(`11369-11373`), and the constructor runs at `29237` inside `Rule.prototype.run`
for **every** result node, passes included. `_getElementSource` (`11269-11287`)
calls `getOuterHtml` → `element.outerHTML` (`11289`), which serialises the
element's **entire subtree** and then discards it if it exceeds 300 chars. For
rules matching `html`, `body` or large containers, that is a repeated
full-document serialisation.

`resultTypes` cannot reach it — the truncation happens later. The only lever is
`axe.configure({ noHtml: true })` (`11370`, `21121-21122`), which is a
`configure` option, **not** a `run` option.

### D4 — `generateSelector` runs a document query per ancestor level

> **Verdict: CLOSED at this scale.** The entire audit issues **351**
> `querySelectorAll` calls, and the count is *sub*-linear in page size
> (k = 0.83). Not a cost centre here. See §Phase 1.

`generateSelector` (`11109-11142`) climbs the ancestor chain and at each level
calls `findSimilar(doc, selector)` = `doc.querySelectorAll(selector)`
(`11147-11148`) until the selector is unique. Per node: O(depth × n). Deque's own
band-aid — `constants.selectorSimilarFilterLimit = 700` (`6867`) — is the tell.

Avoidable via `selectors: false` (`19212`), which skips `target` generation
outright, or partially via `resultTypes`.

### D5 — preload fetches an asset nothing consumes

> **Verdict: correct diagnosis, negligible cost.** `only-no-autoplay-audio` is
> ~28 ms and performs zero DOM operations. Disabling the rule passes the gate;
> the win is small. See §Phase 1 and §Phase 3.

Exactly two rules carry `preload: true`: `css-orientation-lock`
(`32670`/`32683`, tags `wcag21aa` + `experimental`) and `no-autoplay-audio`
(`33271`/`33279`, tags include `wcag2a`). `matchTags` (`20558-20560`) is a literal
`some(tags.includes)` with **no WCAG-version rollup**, so with our tag set
`css-orientation-lock` does not run but **`no-autoplay-audio` does** →
`runLaterRules.length === 1` → `_preload` fires (`29724-29732`).

The CSSOM it fetches has exactly one consumer — `cssOrientationLockEvaluate`
(`25943-25950`) — which isn't running. Fetched, parsed, discarded.

Worse, under `file://` without `--allow-file-access-from-files` (our launch
passes only `--no-sandbox --disable-dev-shm-usage`, `check_a11y.mjs:123`),
`sheet.cssRules` throws → `isSameOriginStylesheet` false (`19968-19978`) →
`parseCrossOriginStylesheet` XHRs a `file://` URL (`19986-19997`) → blocked →
`_preload` rejects → `console.warn` (`29729`).

So the ~17 % measured for `preload: false` is probably noise or the
`getAllRootNodesInTree` walk (`20262-20277`), **not** CSSOM parsing. The correct
lever is `rules: { 'no-autoplay-audio': { enabled: false } }`, which empties
`runLaterRules` and also removes a second rule-queue round trip.

---

## Dead hypotheses

Recorded so they are not revisited.

### H1 — cooperative yielding: **DEAD**

There is no chunking, deadline, or work-splitting in axe-core 4.13.

- `queue()` is synchronous (`11711-11801`): `defer()` pushes a task and
  immediately calls `pop()` (`11769`); `pop()` drains every pending task in a
  plain `for` loop (`11742-11751`).
- `Check.prototype.run` (`29024-29048`) calls `evaluate` inline; no built-in
  check on the WCAG path calls `this.async()`.
- `performance.now()` appears **once** in 34,165 lines — at `20024`, inside the
  perf-timer utility itself. There is no deadline gate.
- Zero `requestAnimationFrame`, zero `requestIdleCallback`.

The only yield is one `setTimeout(…, 0)` per rule (`29264-29266`), fired *after*
that rule's work completes. Because `getDefferedRule` is called in a `forEach`
that immediately `defer()`s and therefore `pop()`s (`29720-29722`), all rules'
real work runs back-to-back **in one task**; the ~100 timers then fire doing
nothing but resolving. Low single-digit ms.

### Also worth nothing

- **Shadow-DOM flattening** — three cheap `if` branches per node (`19076`,
  `19084`, `19088`).
- **Frame handling / `pingWaitTime`** — `_collectResultsFromFrames` is gated on
  `context.frames.length && options.iframes !== false` (`30026`); the site has no
  iframes.
- **Forced synchronous reflow** — `color-contrast` does **not** hit-test
  (`getRectStack` queries axe's own grid, `16022-16047`), and `VirtualNode`
  caches `computedStyle` (`18856-18859`), `boundingClientRect` (`18890-18895`)
  and `clientRects` (`18880-18887`). Nothing mutates the DOM mid-scan, so layout
  stays clean after the first flush. Expect the Blink trace to come back
  negative; it is now a *confirmation* that the grid build is the single layout
  flush, not a hunt for thousands of reflows.

Contrast does still bypass caches in two places worth timing: raw
`window.getComputedStyle(node)` at `27203`, and `findPseudoElement`'s ancestor
walk (`27312-27318`) calling `getPseudoElementArea` → `getComputedStyle(node,
pseudo)` (`27321`), which is not cached on the VirtualNode.

---

## Correctness gate

axe is the **correctness oracle**, so a change can silently make it see *less*
while still reporting a pass. This nearly happened once: blocking
`just-the-docs.js` looked like a 130 ms win and quietly dropped `color-contrast`
nodes on `Select-Case` from 54 to 2.

**Gate, revised:** across all 24 audits,

- `violations`: identical sorted `ruleId:nodeCount`;
- `incomplete`: identical sorted `ruleId` **set** (node counts excluded).

The node-count relaxation on `incomplete` is required because `resultTypes`
truncates each excluded group's `nodes` to `[nodes[0]]` (`19149-19158`) rather
than dropping the group — so a `ruleId:nodeCount` fingerprint would read `:1`
everywhere and silently stop discriminating.

**Known blind spot:** the gate compares the candidate scheme against a baseline
produced by that same scheme's element set. It therefore **cannot** detect a
change that stops auditing elements entirely — a rule that never runs simply
produces no entry. Any change touching *which DOM is walked* (viewport, visibility,
blocking) must be argued from source, not from the gate. This is why H4's
viewport half is struck below.

### Required harness shape — **written**, `scripts/check_a11y_fingerprint.mjs`

It runs the full 24-audit matrix under two named schemes and diffs the
fingerprints. The throwaway version used to validate `78566d1` looked like
this, and the shipped one keeps the same core:

```js
// per audit, after axe.run:
const fmt = (arr) => arr.map((v) => `${v.id}:${v.nodes.length}`).sort().join(",");
fingerprints.push(`${page}|${theme}|${viewport}|V[${fmt(res.violations)}]|I[${fmt(res.incomplete)}]`);
// then: index-wise compare candidate[] against baseline[], print every mismatch
```

Two requirements the throwaway version did **not** meet and the committed one
does:

1. **`incomplete` compares rule-id sets, not `ruleId:nodeCount`** — see the
   truncation note above, or `resultTypes` experiments will fail spuriously.
2. **Both configurations run against one build.** Comparing across a rebuild
   produces false diffs: the BuildInfo page embeds the build's own Gantt chart,
   so its SVG `<text>` nodes change every build and show up in contrast results.

It lives in `scripts/`, alongside `check_a11y.mjs`, and shares
`scripts/lib/axe-scan.mjs` with it so the two cannot drift.

---

## Methodology — house rules this plan must follow

The first draft proposed wall-clock timings with repeats. This repo already
rejected that approach:

- **Wall-clock is too noisy at this granularity.** `perf/ab-css.mjs:3-5` measures
  on-CPU time from the embedded V8 profile explicitly *"NOT wall-clock, which is
  too noisy at single-run granularity."*
- **Pin the CPU.** `perf/pin-cpu.mjs:4-9` — stock Windows dev boxes show 15–25 %
  single-run variance; pinning to a fixed logical-processor subset at High
  priority brings it to ~3 %. Repeats without pinning measure the noise more
  times. `pinCpuIfWindows()` is a one-line import (`ab-css.mjs:41, 46`).
- **Paired differencing against an interleaved baseline**, re-measured before
  each variant (`ab-css.mjs:327-337, 361-364`), reported as mean paired diff ± SD
  (`:392-396, 407`).

### Tooling corrections

- **Harness:** use `perf/ab-css.mjs`, **not** `ab-aggregate.mjs`. The latter is
  not a harness — six hardcoded filenames, 2 conditions × 3 repeats, paged.js
  path-stripping. `ab-css.mjs` is the generalisable N-variant rig (programmatic
  variant list `:132-146`, `--runs N` `:51`, CPU pinning, Blink-label metric
  extraction `:191-192`). Retarget it from CSS variants to rule sets.
  **Correction (Phase 0):** its *shape* was the thing worth copying; the script
  itself no longer runs. It reads `_site-pdf/assets/css/rouge.css`, a
  Jekyll-era artifact the Shiki migration removed, and dies at startup. The
  retarget therefore landed as a sibling, `perf/ab-axe.mjs`, with the shared
  trace parsing extracted to `perf/trace-cpu-stats.mjs`.
- **Renderer `.cpuprofile` needs no adaptation.** `perf/analyze-profile.mjs:2-3`
  already reads *"the JSON returned by CDP's `Profiler.stop`"*, and
  `measure.mjs:626-631, 702-706` already captures that from a renderer via
  `page.createCDPSession()`.
- **Blink event names:** the DevTools display names (`Layout`,
  `UpdateLayoutTree`, `RecalcStyles`) do not appear in these traces. Use the C++
  symbols: `LocalFrameView::performLayout`, `Document::recalcStyle`,
  `Document::rebuildLayoutTree`, `Document::UpdateStyleAndLayout`.
- **Event counts** come only from `analyze-trace.mjs --children <parent>`
  (`:164-168`, printed `:208`); default mode accumulates self-time with no hit
  counter. Worked precedent: `perf/notes/05-blink-trace.md:347` shows
  `39437 Document::UpdateStyleAndLayout` via `--children RunMicrotasks`.
- **Trace capture must be written** (~10 lines). `measure.mjs`'s tracing is welded
  to the book render (`:602, 672-684, 685`); copy the category list verbatim from
  `measure.mjs:656-663`.
- **`analyze-hybrid.mjs`** combines V8 sample stacks with Blink event nests in one
  artifact — the right tool for "does layout interleave with JS", rather than
  capturing a trace and a profile separately.
- **Heap:** `diff-heap-profile.mjs` consumes two *sampling* `.heapprofile` files,
  not snapshots; `analyze-heap-snapshot.mjs` already has a two-argument diff mode
  (`:5-9, 19, 25-30`). `diff-blink-classes.mjs` needs memory-infra process dumps,
  whose producer is `probe-renderer-mem.mjs:136, 150` — not in `measure.mjs`'s
  categories.
- **Profile against `axe.js`, not `axe.min.js`.** `check_a11y.mjs:58` currently
  loads the minified build; every frame would be a mangled single letter.

### What Phase 0 had to add — the noise was not where this section assumed

The house rules above transfer, but pinning plus paired differencing alone left
this workload at **17 % variance** (SD 79 ms on a 467 ms mean) — unpinned-grade,
while pinned. Two causes, neither of them machine drift. Fixing both took it to
**2 %** (SD 7 ms on 355 ms).

1. **V8's lazy compilation of `axe.js` sat inside the measured window.**
   `page.evaluate(axeSource)` runs only axe's top level; V8 compiles function
   bodies lazily, so the *first* `axe.run` in a context compiles most of a
   1.3 MB library. `ab-axe.mjs` now does one discarded in-page `axe.run` before
   tracing starts (`--in-page-warmup`, default 1). `teardown()` (`30001-30010`)
   clears every memoized function, the cache and `axe._tree` between runs, so
   the discarded run leaves no axe-side state behind — only compiled code.
2. **The parent was `JSON.parse`-ing multi-MB traces between measurements** — a
   synchronous parse on a four-core affinity mask, immediately before the next
   browser launch. Traces are now parsed once every run has been captured.
   **This was the larger of the two.**

Two corollaries, recorded so they are not re-tried:

- **A fresh browser per run is *worse* than reusing one**, until (1) is fixed.
  It is the obvious answer to cross-run drift and it made things worse
  (461–780 ms on identical configurations), because it puts a full lazy-compile
  into every sample. `ab-css.mjs` never hit any of this because it shells out to
  `measure.mjs` and gets process isolation for free — which is exactly why its
  methodology *looked* directly transferable when it was not.
- **Measure a steady-state loop, not a single audit.** `--iters` (default 5)
  runs N `axe.run` calls inside one traced window and divides. Blink's style and
  layout caches stay warm across them, which is also true in production: the
  page is loaded and laid out before the audit starts.

**On-CPU time buys less here than on the book.** `Δwall` and `Δcpu` agree to
within ~1 % on every variant (baseline 359 vs 355; drop-contrast 141 vs 143),
because the audit is CPU-bound with no idle. The V8-profile metric is kept for
consistency with `ab-css.mjs` and because it carries the Blink-label split — but
on this workload wall clock was never the liability this section warns about.
The lazy-compile and trace-parse artifacts were.

Practical consequence: the defaults (`--runs 3 --iters 5`) are for iteration; a
citable number wants `--runs 7 --iters 10`. `ab-axe.mjs` prints the **median**
paired difference as its headline, with mean and SD beside it, because even at
2 % the occasional run still lands 30 % high.

---

## Instruments

### 1. Per-rule timing

`axe.run(ctx, { …, performanceTimer: true })`. Output does **not** appear in the
return value — `_logGatherPerformance` (`29321-29324`) and
`performanceTimer.logMeasures` (`20075-20102`) go to `console.log`
(`6898-6904`). Harvesting via `page.on('console')` would push ~100 rules × 5
measures × 24 audits through CDP — overhead on the thing being measured. Read the
measures directly instead; only the marks are cleared (`20071-20073`):

```js
const { r, m } = await page.evaluate(async () => {
  const r = await axe.run(document, { runOnly: {/*…*/}, performanceTimer: true });
  const m = performance.getEntriesByType('measure')
    .map(e => ({ name: e.name, dur: e.duration }));
  return { r, m };
});
```

Measure names: `rule_<id>`, `runchecks_<id>`, `rule_<id>#gather`,
`rule_<id>#matches`, `audit.after`, `audit_start_to_end`, `reporter`, `axe`.

**Caveat that shapes the whole instrument:** `mark_rule_start_<id>`
(`29934`) / `mark_rule_end_<id>` (`29325-29329`) are correct per rule, but
`_createGrid`, the VirtualNode caches and all 23 memo caches are billed to
whichever rule touches them **first**. Run the ablation in **both rule orders**
to separate shared setup from rule cost.

### 2. Ablation matrix — `perf/ab-axe.mjs`

Rule-at-a-time (`only-R`) and leave-one-out (`drop-R`), both generated per rule.
Cross-check against (1) — disagreement localises shared setup, which is itself
the D1 measurement.

Running both halves supersedes the "both rule orders" suggestion in (1). Order
reversal tells you *that* setup moved between rules; the `only-`/`drop-` pair
tells you *how much* setup each rule triggers, which is the number D1 needs.
The rig prints the decomposition directly.

### 3. Node-count scaling curve

Synthetic pages at 500/1k/2k/4k/8k nodes. Real pages cluster near 2.4k, so we
have **one point on an unknown curve**. D2 and D4 both predict super-linearity;
this is the cheapest test that distinguishes them from a large constant.

### 4. Blink trace — now a confirmation, not a hunt

Expect few layout events. Confirm the grid build is the single flush. Demote
below (5) if (1)–(3) already localise the cost.

### 5. CPU profile

CDP `Profiler` → `analyze-profile.mjs` / `find-callers.mjs` / `find-callees.mjs`.
Specifically: what fraction of self-time is inside memoizee's `indexOf` scans
(D2) and `getComputedStylePropertyValue` (D1)?

### 6. Heap

`HeapProfiler.startSampling` → `analyze-heap-profile.mjs` (+
`find-heap-callers.mjs` / `heap-subtree.mjs`); snapshot diff via
`analyze-heap-snapshot.mjs`; `probe-renderer-mem.mjs` for the memory-infra
capture feeding `diff-blink-classes.mjs`. Expect VirtualNode-per-element-and-text-node
(`19101-19108`) to dominate.

---

## Landing options

1. **Config only** — `axe.configure({ noHtml: true })` (D3), `selectors: false`
   (D4), `rules: { 'no-autoplay-audio': { enabled: false } }` (D5), possibly
   `resultTypes` (with the revised gate). No maintenance burden; available as
   soon as the gate clears.
2. **Scheduling** — theme-axis collapse only (see H4 below). Our code.
3. **Vendored patch — serious candidate, but re-aimed again.** Draft 1 reserved
   this for H1, which does not exist. Draft 2 re-aimed it at **D2**, which
   Phase 2 measured at 0.45 % of self-time — so that aim is withdrawn too.

   The measured target is **`Color2` (`axe.js:18186`)**. axe-core ships only a
   Babel-downleveled bundle, so its six `#private` fields plus brand check are
   emulated with six `WeakMap`s and a `WeakSet`: fourteen weak-collection
   operations per construction before any colour maths, and `color-contrast`
   builds enormous numbers of them. `SOURCE_PATCHES['cheap-private-fields']` in
   `scripts/lib/axe-scan.mjs` implements and measures the cheapest
   behaviour-preserving version (drop the redeclaration guard and the brand
   assert). Cost of shipping it: pinning a patched fork, and re-deriving the
   substitutions on each axe-core upgrade — which the patch asserts loudly
   rather than silently skipping.

### H4 — variant collapse, corrected

Draft 1 claimed only contrast varies with theme and only target-size/overflow
with viewport, proposing 2–3× from running the full ruleset once per page.
**The viewport half is struck.** The `md` breakpoint is 800px
(`_variables.scss:113,123`); our viewports (1280/375) straddle it, and
`layout.scss:102-116, 40-47, 167-171` sets `.site-nav` and `.main-header` to
`display: none` on mobile while `#menu-button` is desktop-hidden. Axe's
`excludeHidden` defaults true (`29118`, `29145-29151`), so **the two viewports
walk near-disjoint DOM subtrees.** That is a per-*element* partition, not a
per-rule property, and the gate cannot detect the resulting loss (see gate blind
spot above).

**Salvaged version:** keep both viewports at full ruleset; collapse only the
**theme** axis — full ruleset in light, `{color-contrast, link-in-text-block}` in
dark. `_theme.scss:17-27` is a pure colour mixin and the non-colour dark rules
(`just-the-docs-dark.scss:107-119`) are scoped under `.search-active`, a state the
scanner never triggers. Realistically **~1.7×**, not 2–3×.

Two caveats to record: the theme axis is colour-only *by accident of the
harness* — `data-theme-choice` drives `.theme-icon` `display`
(`custom.scss:176-184`) but stays `"system"` because the harness sets
`data-theme` directly and never clicks the toggle. And `theme-toggle.js` is
`defer` with `apply("system")` calling `removeAttribute("data-theme")`; deferred
scripts run before `DOMContentLoaded` and the harness waits on
`domcontentloaded`, so the harness currently wins — change either side and every
"dark" audit silently becomes a light one.

---

## Phases

### Phase 0 — harness — **DONE**

Four tools landed. Invocations are in §The apparatus.

**`scripts/lib/axe-scan.mjs`** — extracted from `check_a11y.mjs` so the
production scanner, the gate and the rig cannot drift apart. If they did, the
gate would stop gating what production runs, which is the one failure mode it
exists to prevent. Holds the page list, viewports, themes, blocked requests,
run options, browser/page plumbing, the matrix builder and `fingerprint()`.
`check_a11y.mjs` is now a thin consumer; its output is unchanged
(`0 violation(s), 20 incomplete check(s)`) and `check.bat` passes clean.

It also carries a **scheme registry**, so one name means the same thing to the
gate and to the rig: `production`, `no-html` (D3), `no-selectors` (D4),
`no-autoplay-audio` and `no-preload` (D5), `violations-only`, `config-only`
(D3+D4+D5), and the `no-contrast` ablation, flagged `gates: false` because it is
expected to change the findings.

**`scripts/check_a11y_fingerprint.mjs`** — the gate. Meets both constraints
§Correctness gate demanded: `incomplete` compares rule-id **sets**, and both
schemes run in one process against one build. On a mismatch it re-derives the
structured difference from the raw results rather than printing two opaque
strings. Exit 0 identical / 1 differ / 2 harness error.

Verified in both directions. `production` vs `production` is 24/24 identical.
`production` vs `no-contrast` reports 20/24 differing, every one of them
`incomplete color-contrast: present -> absent` — exactly the 20 incomplete
checks the baseline carries.

**`perf/ab-axe.mjs`** — the rig. Same methodology as `ab-css.mjs` (pinning,
paired differencing against an interleaved baseline, on-CPU time from the
embedded V8 profile), retargeted to rule sets. `ab-css.mjs` itself was left
pointed at the book: retargeting it in place would have destroyed a working
tool for nothing, since what transfers is its *shape*, not its plumbing.

For each rule it generates **both** `drop-R` and `only-R`. That pairing, not
the rule-order reversal §Instruments proposed, is what separates a rule's own
cost from the shared setup it is billed for:

- `cost(R)` = baseline − `drop-R` — R's marginal cost inside a full run
- `shared` = `only-R` − `cost(R)` — the setup R triggers when it runs alone

`only-R` is exact, and for a reason worth recording: `ruleShouldRun`
(`20569-20583`) tests `runOnly.type === 'rule'` **before** the explicit
`rules[id].enabled` branch, so production's `heading-order: { enabled: true }`
does not leak into an `only-` variant. (The plan notes elsewhere that explicit
`enabled` beats the *tag* filter. It does — but the rule filter beats both.)

**`perf/trace-cpu-stats.mjs`** — `cpuStatsFromTrace` lifted out of `ab-css.mjs`
verbatim (diffed to confirm, then smoke-tested against an existing book trace)
plus `TRACE_CATEGORIES` copied verbatim from `measure.mjs:656-663`. `ab-css.mjs`
imports it; behaviour unchanged.

The profiling path runs `axe.js`, not `axe.min.js` (`--minified` opts back in).
Confirmed against a captured trace: 362 distinct frames, 2 of them
single-character, including `flattenTree`, `_getSelectorData`,
`colorContrastEvaluate`, `DqElementMemoized` and the rest of the `*Memoized`
wrappers D2 targets.

**Also fixed:** `pin-cpu.mjs` silently dropped empty-string arguments when
re-serialising argv for the `/affinity` relaunch — an unquoted `` vanishes when
cmd.exe re-splits the line, shifting every later argument by one. It turned
`--rules "" --per-rule` into `--rules --per-rule`. One line; it affected every
tool importing the shim.

#### What it already shows

Indicative, **not** the Phase 1 attribution — one page (`Select-Case.html`,
light, desktop), one machine. Recorded because it already narrows where Phase 1
should aim.

Ablation, 5 pairs × 5 iterations, pinned. Baseline **355 ms/audit, SD 7 ms**:

| variant | Δcpu (median) | own cost |
|---|--:|--:|
| `drop-color-contrast` | 143 ms ± 6 | 212 ms |
| `only-color-contrast` | 71 ms ± 18 | **278 ms** |
| `drop-no-autoplay-audio` | −57 ms ± 100 | — (noise floor) |
| `only-no-autoplay-audio` | 328 ms ± 9 | **28 ms** |

The `only-` column is the informative one, and it says something the `drop-`
column cannot. Running **one trivial rule** costs 28 ms. Running **one contrast
rule** costs 278 ms. So the unconditional setup — flat tree, selector pre-pass
— is **at most 28 ms**, and roughly 250 ms of the audit is contrast plus
whatever contrast triggers. That is the shape D1 predicts: the grid is lazy and
is billed to the first rule that touches it.

`Δrecalc` and `Δlayout` were **0 on every variant**, with
`Document::UpdateStyleAndLayout` at 41 ms on the baseline. That is the
confirmation §Dead hypotheses expected: layout is one flush, not thousands.

Per-rule timing (instrument 1, `--per-rule`; `performanceTimer` inflates the
total to 398 ms, so read the ranking, not the absolutes) agrees and adds the
split:

| measure | ms |
|---|--:|
| `axe` (whole run) | 397.9 |
| `audit_start_to_end` | 337.9 |
| `reporter` | 30.8 |
| `audit.after` | 0.6 |

| rule (64 ran) | total | gather | matches | checks |
|---|--:|--:|--:|--:|
| `color-contrast` | 250.2 | 0.0 | 81.2 | 168.7 |
| `aria-allowed-attr` | 19.9 | 18.6 | 0.0 | 1.1 |
| `target-size` | 12.9 | 0.5 | 1.5 | 10.7 |
| `scrollable-region-focusable` | 8.2 | 1.3 | 1.2 | 5.6 |
| `link-in-text-block` | 8.0 | 0.3 | 5.6 | 2.0 |

Three things to carry into Phase 1. `aria-allowed-attr`'s 18.6 ms `gather` is
the flat-tree build billed to the first rule, and it is *small* — consistent
with the 28 ms ceiling above. `color-contrast` splits 81 ms `matches` / 169 ms
`checks`, so a third of it is in `colorContrastMatches`, which is where the
grid gets triggered — D1 and the contrast maths are separable and Phase 1
should separate them. And `reporter` at 30.8 ms (~8 %) is the phase draft 1
missed entirely; it is not nothing.

### Phase 1 — attribution — **DONE**

Instruments 1–3 with pinning and paired differencing, via `perf/ab-axe.mjs`
(time), `perf/probe-axe-dom.mjs` (DOM operation counts) and
`perf/probe-axe-scaling.mjs` (the curve).

**Gate:** cost-by-rule table with SD; D1 isolated from `color-contrast`; a stated
complexity class for the scaling curve.

#### DOM operation counts **[measured]**

`probe-axe-dom.mjs` counts what one audit actually does to the DOM. Counts are
deterministic, so these are exact, not sampled. `Select-Case.html`, light,
desktop, **2380 elements**, production rule set:

| variant | gCS | gPV | gBCR | gCR | qSA | outerHTML | oHTML KB |
|---|--:|--:|--:|--:|--:|--:|--:|
| baseline (all rules) | 14,400 | 65,627 | 4,931 | 404 | 351 | 503 | 826 |
| `only-color-contrast` | 14,368 | 65,355 | 4,930 | 404 | 206 | 249 | 136 |
| `only-target-size` | 3,292 | 47,866 | 2,817 | 404 | 113 | 124 | 11 |
| `only-link-in-text-block` | 5,003 | 54,012 | 3,600 | 404 | 8 | 6 | 1 |
| `only-aria-allowed-attr` | 2,291 | 5,474 | 0 | 0 | 19 | 25 | 125 |
| `only-no-autoplay-audio` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

(gCS = `window.getComputedStyle`, gPV =
`CSSStyleDeclaration.getPropertyValue`, gBCR/gCR = `getBoundingClientRect` /
`getClientRects`, qSA = `querySelectorAll`.)

This table settles three of the five defects.

#### D1 — confirmed as a count, wrong as a cost model

The per-element claim holds. `only-aria-allowed-attr` builds no grid (gBCR and
gCR are both **0**); every rule that does build one shows gCR = **404** exactly,
which is the grid's own fixed walk showing through.

The grid's share has to be bracketed rather than differenced, because the
no-grid rule's own work is not a subset of a grid rule's. The cheapest
grid-building rule bounds it from above at **47,866 gPV**; subtracting the
no-grid floor of 5,474 puts it near **42,000**. The two grid rules bracket it at
42.4k–48.5k. Either way: **~42,000 gPV, ~2,800 gBCR, and only ~1,000 gCS**, i.e.
**~18 property reads per element** against the plan's estimate of ~14.

But "~34,000 style-property reads" invites reading this as 34,000 style
resolutions, and it is not.
`VirtualNode.getComputedStylePropertyValue` (`18853-18861`) caches the
`CSSStyleDeclaration` per node **and** the resolved value per property. So the
grid's real shape is **one** `window.getComputedStyle` per element — the
expensive call, paid once — plus ~18 cheap `getPropertyValue` reads on the
cached declaration, each behind a `'computedStyle_' + property` string concat
and a `hasOwnProperty` probe on a plain object.

That matters for what a fix would look like. Eliminating CSSOM reads is not the
lever; the string concat and the object probe, at 42,000 a page, might be.

#### The uncached `getComputedStyle` calls are the headline, not a footnote

`only-color-contrast` performs **14,368** `window.getComputedStyle` calls —
99.8 % of the whole audit's 14,400, and roughly **11,000 more** than any
grid-building rule. At 2380 elements that is 6 per element where the
VirtualNode cache should give 1.

Those are the calls §Dead hypotheses files under "Also worth nothing": the raw
`window.getComputedStyle(node)` at `27203`, and `findPseudoElement`'s ancestor
walk (`27312-27318`) calling `getPseudoElementArea` →
`getComputedStyle(node, pseudo)` (`27321`), which is **not** cached on the
VirtualNode. That paragraph ends "worth timing". It is not a footnote — it is
the single largest identified block of work in the audit, and it is contrast's
own, not the grid's.

So the §Current state warning that "the contrast delta is not attributable to
contrast math" needs splitting in three, not two: the grid (D1), contrast's
uncached style reads, and the contrast maths proper.

#### Cost by rule **[measured]** — and D1 isolated

`ab-axe.mjs`, 3 pairs x 5 iterations, pinned, same page. Baseline **385 ms**
median per audit (mean 397, SD 26 — noisier than the 2 % Phase 0 saw, because
this run spans thirty captures over five minutes; the median is doing real work
here).

| rule | `only-R` | `drop-R` (marginal) |
|---|--:|--:|
| `color-contrast` | 336 ms | **127 ms ± 16** |
| `target-size` | 147 ms | −30 ms ± 25 — noise floor |
| `link-in-text-block` | 145 ms | −19 ms ± 23 — noise floor |
| `aria-allowed-attr` | 48 ms | 3 ms ± 23 — zero |

**D1 is ~100 ms, measured two ways.**

Directly: `target-size` and `link-in-text-block` do quite different jobs, and
both land at ~146 ms. `aria-allowed-attr`, the one rule here that builds no grid
(gBCR and gCR both 0), lands at **48 ms**. The ~98 ms gap is the grid.

Independently, the rig's `shared` column — `only-R` minus `cost(R)`, i.e. the
setup a rule pays for when it runs alone — comes out at **45 ms** for the
non-grid rule and **163–176 ms** for the two grid rules. That difference,
~120 ms, is the same quantity arrived at from the other side.

So: **the grid costs ~100–120 ms of a ~385 ms audit, a little under a third.**
It is a real cost and the largest single identified component after contrast's
own work — but it is not the whole of what the contrast ablation appeared to
show, which was the open question §Current state flagged.

#### Only `color-contrast` has a marginal cost

This is the finding that matters operationally, and it was not anticipated.

Dropping `target-size`, `link-in-text-block` or `aria-allowed-attr` changes the
audit by an amount indistinguishable from zero — every one of those Δ values is
inside 2 SD — even though each of the first two costs ~146 ms when run alone.
The reason is structural: the grid they pay for gets built anyway, by whichever
grid-consuming rule is still in the set.

**Per-rule disabling is therefore not a lever.** Only three things move the
number: removing `color-contrast`, making `_createGrid` cheaper, or making the
shared memoization layer cheaper. A landing option that switches off a handful
of expensive-looking rules would buy nothing and cost coverage.

#### The additive model does not close — which is itself the D2 signature

`only-color-contrast` is 336 ms; its marginal cost is 127 ms. If per-rule costs
were additive over a fixed shared setup S, then `only-R − cost(R)` would equal S
for every rule. Instead it ranges **45 → 209 ms**.

Most of that spread is explained — 45 is setup without the grid, ~170 is setup
with it. The residual, roughly 40 ms on contrast, is not. The explanation
consistent with the source is the memo layer: a rule running alone pays cache
misses that, in a full run, an earlier rule has already paid. That makes
per-rule costs non-additive by construction, and it is D2's fingerprint.

It also means the `cost(R)` / `shared` decomposition should be read as a
*bracket*, not an identity. The rig says so in its own output.

#### D4 — refuted at this scale

The whole audit issues **351** `querySelectorAll` calls. D4 predicts
`generateSelector` climbing the ancestor chain with a document query per level,
O(depth × n) per node — on 2380 elements that would be tens of thousands.
Deque's `selectorSimilarFilterLimit = 700` band-aid (`6867`) is real, but
nothing here is hitting it.

`selectors: false` may still pay for itself by skipping other work in
`trimElementSpec`, but **not** by removing thousands of document queries.
D4 is closed as a cost centre pending a page where the count is actually large.

#### D3 — real, modest, and lumpy

**503** `outerHTML` reads per audit, serialising **826 KB** in total, then
discarding everything above 300 chars. Worth having, not transformative.

The interesting row is `only-aria-allowed-attr`: **25** reads for **125 KB** —
5 KB per read. That is exactly the case D3 names, rules matching `html`, `body`
or large containers, and it means the cost is concentrated in a few enormous
subtree serialisations rather than spread across the 503.

#### The scaling curve is quadratic **[measured]**

`probe-axe-scaling.mjs`, `Select-Case.html` replicated, production rule set,
3 iterations per size, pinned:

| elements | ms | gCS | gPV | gBCR | qSA | oHTML KB | us/element |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 2,380 | 276.8 | 12,604 | 63,509 | 4,819 | 347 | 827 | **116** |
| 4,745 | 1,554.2 | 74,930 | 178,954 | 12,871 | 567 | 1,316 | **328** |
| 9,475 | 5,325.3 | 199,582 | 409,844 | 28,975 | 1,021 | 2,295 | **562** |
| 18,935 | 16,694.3 | 448,886 | 871,624 | 61,183 | 1,914 | 4,253 | **882** |

Fitted `metric = a * elements^k`:

| metric | k | R² |
|---|--:|--:|
| **ms** | **1.957** | 0.9898 |
| gCS | 1.692 | 0.9636 |
| gPV | 1.256 | 0.9944 |
| gBCR | 1.220 | 0.9959 |
| qSA | 0.826 | 0.9971 |
| oHTML KB | 0.791 | 0.9962 |

**Complexity class: quadratic.** k = 1.96 at R² = 0.99. An 8x page costs **60x**
the time (277 ms → 16.7 s), and per-element cost rises 7.6x across the range.

And the operation counts do **not** explain it. `getPropertyValue` and
`getBoundingClientRect` grow at k ≈ 1.2; `querySelectorAll` and `outerHTML` are
*sub*-linear. The gap between k(ms) = 1.96 and k(gPV) = 1.26 is work that never
touches the DOM — axe's own bookkeeping.

That is precisely D2's prediction and its predicted exponent. ~19 memoized
functions are per-node, each `argsMap` grows to O(n), each lookup is an O(k)
scan: O(n) lookups x O(n) scan = O(n²). Nothing else in the identified defect
list predicts k = 2 — D1 is linear in elements, D3 and D4 are measured
sub-linear here.

Two honest caveats on this curve:

- **Replication makes the document taller, not just larger.** At 18,935
  elements the page is ~20 copies of the content, so some of the
  super-linearity could be page geometry rather than element count. That would
  most plausibly show up in contrast's `getRectStack` work — note gCS is itself
  super-linear at k = 1.69, which element count alone does not explain. So
  "quadratic" is established; *which* quadratic term dominates is Phase 2's
  question, and D2 is the leading but not the only candidate.
- **The absolute ms here (277 at 2,380) is below `ab-axe.mjs`'s 385**, because
  this probe times in-page with `performance.now()` and no tracing attached.
  Only the exponent is being claimed, and the method is constant across sizes.

**Consequence for §Open questions.** The representative-set idea — computing
scan targets from page structure and scanning more of them — is now
*more* attractive, not less: cost is super-linear in page size, so scanning many
small pages is far cheaper than scanning few large ones. But it also means any
future page substantially larger than ~2.4k elements is disproportionately
expensive, and the largest pages in the site should be checked before the scan
is widened.

#### D2 — source refined, and now the leading candidate

The 23 `memoize_default(` call sites are confirmed. Classifying them: **~19 are
per-node** (`isHiddenAncestors`, `isVisibleOnScreenVirtual`,
`isVisibleToScreenReadersVirtual`, `isInertSelf` / `isInertAncestors`,
`isFixedSelf` / `isFixedAncestors`, `getOverflowHiddenAncestors`,
`getClosestAncestorRoleType`, `hasWidgetAncestorInTabOrder`,
`getVisibleChildTextRects`, `DqElement`, …), so each one's `argsMap` grows to
O(n) and every lookup is an O(k) scan. Only `isXHTML(doc)` and the arity-0
`getModalDialog()` are genuinely cheap.

One correction to the severity, though. `indexOf` here is es5-ext's, and for a
non-NaN search element it **delegates to native `Array.prototype.indexOf`**
(`require_e_index_of`) — so each comparison is a native pointer compare, not a
JS-loop iteration. The quadratic term is genuine; the constant is smaller than
the plan implies.

`findSimilar` remains the worst *shape* (arity 2, second level scanning
selector **strings**) but it cannot be the worst *cost*: only 351
`querySelectorAll` calls means k never exceeds a few hundred.

The scaling curve decided it: operation counts at k ≈ 1.2, time at k = 1.96.
The excess is axe's own bookkeeping, and D2 is the only identified defect whose
shape predicts that exponent.

#### Phase 1 gate — **MET**

- **cost-by-rule table with SD** — above; `ab-axe.mjs --per-rule` gives the full
  64-rule version with cross-run SD.
- **D1 isolated from `color-contrast`** — the grid is **~100–120 ms** of a
  ~385 ms audit, measured two independent ways. Contrast's own work is the
  larger remainder.
- **complexity class** — **quadratic**, k = 1.96, R² = 0.99.

The ranking that comes out of Phase 1 differs from the one the plan went in
with. In descending order of what actually moves the number:

1. **The quadratic term** (D2, or a geometry-driven term in contrast). Already
   the dominant effect at 2.4k elements and catastrophic above it.
2. **`color-contrast`'s uncached `getComputedStyle` calls** — ~11,000 per audit,
   99.8 % of the page's total, and the plan had them as a footnote.
3. **`_createGrid`** (D1) — real, ~100–120 ms, but a third of what the naive
   contrast ablation suggested.
4. **D3** — 826 KB of discarded serialisation. Worth taking, not transformative.
5. **D4** — closed. 351 queries per audit; not a cost centre at this scale.

### Phase 2 — mechanism — **DONE**

The specific question was: what share of self-time is memoizee `indexOf` (D2)
versus `getComputedStylePropertyValue` (D1)? The answer is **neither**.

#### The super-linear term is entirely inside `color-contrast`

`probe-axe-scaling.mjs --rules color-contrast` against
`--scheme no-contrast`, same replication, 2 iterations per size:

| | k(ms) | R² | us/element, 2,380 → 9,475 |
|---|--:|--:|---|
| `color-contrast` alone | **2.201** | 0.977 | 88 → 465 (5.3x) |
| everything except contrast | **1.185** | 1.000 | 68 → 87 (1.3x) |

Contrast's `getComputedStyle` count fits k = **1.998** — exactly quadratic.
Everything else's fits 1.28. Sixty-three rules together are linear with a nearly
flat per-element cost; one rule carries the whole exponent.

#### D2 is refuted as the mechanism

Two independent lines, and they agree.

**From the profile.** In the 9,475-element run, every memoized frame combined —
`getVisibleChildTextRectsMemoized`, `DqElementMemoized`, `isHiddenSelfMemoized`,
`isVisibleToScreenReadersMemoized`, `getPseudoElementAreaMemoized`,
`getOverflowHiddenAncestorsMemoized`, `isInertSelfMemoized`,
`isFixedSelf`/`isFixedAncestorsMemoized`, and memoizee's own `memoized` frame —
totals **~56 ms of 12,500 ms, 0.45 %**.

**From the split curve.** The non-contrast half of the rule set leans on exactly
the same memo layer for exactly the same nodes, and it is linear.

The O(n²) shape in `get_1` / `get_fixed` is real as source and would bite at
some page size. It is not what is biting now. **Do not spend a vendored patch on
it** — that was draft 2's headline recommendation and it is wrong.

#### What the profile names instead

Bottom-up self-time, 100 us sampling, same two sizes:

| function | n=2,380 | n=9,475 |
|---|--:|--:|
| `_classPrivateFieldInitSpec` | 3.86 % | **23.59 %** |
| `matches` | 1.53 % | 6.71 % |
| `_classPrivateMethodInitSpec` | — | 4.84 % |
| `_checkPrivateRedeclaration` | 1.45 % | 3.18 % |
| `_classPrivateFieldSet` | — | 2.53 % |
| `getPropertyValue` | **10.06 %** | 3.19 % |

Note `getPropertyValue` — D1's mechanism — is the *top* row at real page size
and falls to 3 % at 4x the elements. D1 is linear, exactly as it should be.

`find-callers.mjs` attributes `_classPrivateFieldInitSpec` almost entirely to
**`Color2`** (`axe.js:18186`): 3.19 s of a 12.5 s run.

#### Why `Color2` construction is expensive: a transpilation tax

axe-core ships **only** a Babel-downleveled bundle — `package.json`'s `files:`
lists `axe.js` and `axe.min.js`, and there is no ESM or modern build. `Color2`'s
six `#private` fields and its brand check are therefore emulated with **six
`WeakMap`s and a `WeakSet`** (`18184-18196`). Every construction runs:

- `_classPrivateMethodInitSpec` → `WeakSet.has` + `WeakSet.add`
- 6 x `_classPrivateFieldInitSpec` → `WeakMap.has` + `WeakMap.set`

— **14 weak-collection operations before any colour maths happens.** The
`.red` / `.green` / `.blue` setters then add two `_classPrivateFieldSet` calls
each (`_assertClassBrand`'s `has`, plus a `set`), and each of those writes
*both* a normalised and a 0-255 field, so a fully-initialised Color runs well
over twenty WeakMap operations.

Native `#private` fields are hidden-class slots and nearly free. We are paying an
old-browser compatibility tax in current headless Chrome.

So the cost is a product of two independent factors, and both are levers:

1. **How many Colors are constructed** — contrast's background-stack walk, which
   is what makes the count super-linear.
2. **What each construction costs** — the WeakMap-emulated private fields.

#### Phase 2 gate — **MET**

- **Named function:** `Color2` (`axe.js:18186`), reached via
  `_classPrivateFieldInitSpec` / `_classPrivateMethodInitSpec`.
- **Named mechanism:** WeakMap-emulated private fields, multiplied by a
  background element stack that deepens as the page grows.
- **Decision on D2:** **not worth a vendored patch.** Under 1 % of self-time.
  If a vendored patch is ever made, `Color2` is the target.

#### Confirmed on real pages — the curve is not a replication artifact

The replication method makes the document taller as well as larger, so the
exponent needed checking against pages nobody generated. Nine real pages from
`_site-offline`, production rule set, one audit each:

| page | elements | ms | us/element |
|---|--:|--:|--:|
| `404.html` | 2,175 | 143 | 66 |
| `index.html` | 2,412 | 236 | 98 |
| `Core/Dim.html` | 2,409 | 285 | 118 |
| `Core/Select-Case.html` | 2,380 | 297 | 125 |
| `Development/BuildInfo.html` | 2,694 | 226 | 84 |
| `VB/PictureBox/index.html` | 4,095 | **1,200** | 293 |
| `VB/Form/index.html` | 4,388 | **1,297** | 296 |
| `VB/UserControl/index.html` | 4,672 | **1,607** | 344 |
| `Development/Pipeline-Stages.html` | 5,231 | **1,517** | 290 |

Least-squares fit on real pages: **k = 2.73, R² = 0.95** — *steeper* than the
2.0–2.2 the replicated curve gave. The scatter within the small cluster
(143–297 ms at 2.2–2.7k elements) is content, not noise: `404.html` has almost
no syntax-highlighted code, `Select-Case.html` is full of it, and every
highlighted token is a `<span>` with its own colour for contrast to resolve.

`PictureBox` costs **4x** `Select-Case` for **1.7x** the elements. The caveat is
retired: the super-linearity is a property of the content, not of the harness.

#### This changes the §Open questions arithmetic

The five small pages average **237 ms**; the four large ones average
**1,405 ms** — 5.9x the cost for 1.8x the elements. And the current
`SAMPLE_PAGES` set contains *only* small pages: 2,175–2,694 elements, when the
site's largest is 5,231.

Concretely, adding those four pages to the sample — a 67 % increase in page
count — would take the scan's axe time from **~5.7 s to ~28 s**, a 5x increase.
The plan's estimate that a ~25-page representative set lands near 13 s assumed
linear scaling and is wrong by a wide margin.

Two consequences, both of which belong in the representative-set design:

- **Weight page selection by size, not just by structural pattern.** A
  representative set that happens to include several large reference pages costs
  far more than its page count suggests.
- **The large pages are exactly the ones currently unaudited.** The sample's
  size range is narrow and low, so the pages most likely to have layout defects
  under a narrow viewport are also the ones the scan never sees. That is a
  coverage argument for including them *and* a cost argument for making contrast
  cheaper first.

### Phase 3 — decide — **DONE**

Every candidate through the gate, then measured. The headline is a negative
result, and it is the most useful thing in this document.

#### Every candidate passes the correctness gate

`check_a11y_fingerprint.mjs`, full 24-audit matrix, one build, one process:

| candidate | gate |
|---|---|
| `no-html` (D3) | **24/24 identical** |
| `no-selectors` (D4) | **24/24 identical** |
| `no-autoplay-audio` (D5) | **24/24 identical** |
| `violations-only` (`resultTypes`) | **24/24 identical** |
| `config-only` (D3+D4+D5) | **24/24 identical** |
| `cheap-private-fields` source patch | **24/24 identical** |

#### And none of them is worth taking

`ab-axe.mjs`, 5 pairs x 5 iterations, pinned, `Select-Case.html` (2,380
elements). Baseline **349 ms** median (mean 355, SD 13):

| variant | Δcpu median | mean ± SD | 2xSD | verdict |
|---|--:|--:|--:|---|
| `no-selectors` | 23 ms | 22 ± 13 | 26 | consistent with zero |
| `violations-only` | 13 ms | 13 ± 27 | 54 | consistent with zero |
| `config-only` | 9 ms | 11 ± 14 | 28 | consistent with zero |
| `cheap-private-fields` | 8 ms | 5 ± 18 | 36 | consistent with zero |
| `no-html` | −11 ms | −14 ± 21 | 42 | consistent with zero |

By the rig's own criterion — Δ below 2 SD is indistinguishable from zero —
**every one of them is zero.** Landing option 1, the config-only set that looked
like the safe early win, is 9 ms ± 14 on a 349 ms audit.

This follows directly from Phase 1 and Phase 2 and should not be a surprise in
hindsight. D3 and D4 were measured small and *sub*-linear; D5 was measured at
~28 ms for the whole rule. The audit's cost is `color-contrast`, and none of
these levers touches it.

#### `no-html` would crash the reporter — a live case of the gate's blind spot

Worth recording in its own right. Under `noHtml: true`, `trimElementSpec` sets
`serialElm.html = null` outright (`19203-19204`) — not the `'Undefined'` string
the non-`noHtml` branch falls back to. `check_a11y.mjs:91` does
`node.html.slice(0, 120)`, so the production reporter would throw a TypeError on
the first violation or incomplete node it printed.

The fingerprint gate passed it 24/24, correctly: the fingerprint reads rule ids
and node counts and never touches `.html`. **The gate is necessary, not
sufficient.** It answers "does axe still find the same things", not "is the
result still shaped the way consumers expect". Any candidate that changes the
*shape* of a result node, rather than which nodes are found, needs a separate
read of the consumers. Adopting `noHtml` would mean fixing `check_a11y.mjs`
first — for a win of −11 ms.

#### The cheap patch is not worth it

`SOURCE_PATCHES['cheap-private-fields']` removes Babel's redeclaration guard and
brand assert — seven fewer `WeakMap`/`WeakSet` `has` calls per `Color2`
construction, plus two per colour-channel write. It gates clean and measures
**8 ms ± 18** at 2,380 elements and **28 ms** (mean −133 ± 302) at 4,672.

The profile attributed 23.6 % of self-time to `_classPrivateFieldInitSpec` at
9,475 elements, so why so little? Because that self-time is dominated by the
`WeakMap.set` the patch necessarily *keeps*, not by the `has` it removes.

#### The full rewrite is worth it — `plain-color-fields` **[measured]**

`SOURCE_PATCHES['plain-color-fields']` takes the other half: `Color2`'s six
`#private` fields become plain own properties, removing every `WeakMap.set` /
`get` and the `WeakSet` brand as well.

**Safety.** All 26 call sites (`18190-18356`) were enumerated before
substituting, and the patch asserts an exact occurrence count at each one, so an
axe-core upgrade that moves the code fails loudly:

- The backing bindings (`_r`, `_g`, `_b`, `_red`, `_green`, `_blue`,
  `_Class3_brand`) are parameters of the bundle's top-level IIFE (`axe.js:506`)
  and appear **nowhere** outside the `Color2` body, so a global substitution
  cannot reach another class. `__`-prefixed names do not occur in the bundle.
- `_classPrivateFieldSet` returns the assigned value; every call site is a
  statement, and the replacement `(this.__x = v)` has that value anyway.
- All six fields are assigned in the constructor ahead of `alpha` and before
  either return path, so every instance keeps one hidden class.

**Correctness.** The fingerprint gate passes **24/24**. Because that gate
compares `incomplete` as a rule-id *set*, a colour error that shifted ratios
without flipping a classification could slip through it — so the patch was also
checked directly, value by value: 11 colour-string forms (including `hsl` with
`turn` and `rad` units), channel round-trips through both accessor pairs, the
copy constructor, `getRelativeLuminance`, `toHexString`, and
`getLuminosity`/`setLuminosity`, which exercises the private-method `#add` path
behind the removed brand assert.

**20 of 21 cases are byte-identical.** The one difference is exactly the
expected one: `Object.keys(color)` now returns the six backing fields alongside
`alpha`. It cannot reach a consumer — `Color2` defines an explicit `toJSON`
returning `{red, green, blue, alpha}`, and `color-contrast` puts only
`toHexString()` strings into result data (`27284-27285`), never a Color
instance.

**Cost of adoption.** The patch needs the unminified bundle. That is cheaper
than it sounds: injection is **22 ms** per page for `axe.min.js` against
**28 ms** for `axe.js` — 0.14 s across all 24 audits, against seconds saved.

**The numbers.** Ten real pages, stock and patched interleaved per page per
rep, 4 reps, median of each:

| page | elements | stock | patched | Δ | % |
|---|--:|--:|--:|--:|--:|
| `404.html` | 2,175 | 138 | 131 | 7 | 4.8 |
| `index.html` | 2,412 | 247 | 211 | 36 | 14.7 |
| `Core/Dim.html` | 2,409 | 275 | 234 | 41 | 14.9 |
| `Core/Select-Case.html` | 2,380 | 258 | 230 | 27 | 10.6 |
| `Development/BuildInfo.html` | 2,694 | 205 | 202 | 3 | 1.4 |
| `Modules/Interaction/index.html` | 2,404 | 283 | 256 | 26 | 9.3 |
| `VB/PictureBox/index.html` | 4,095 | 1,298 | 970 | 328 | 25.3 |
| `VB/Form/index.html` | 4,388 | 1,587 | 1,124 | 463 | 29.2 |
| `VB/UserControl/index.html` | 4,672 | 1,838 | 1,285 | 552 | 30.1 |
| `Development/Pipeline-Stages.html` | 5,231 | 1,752 | 1,174 | 578 | **33.0** |
| **total** | | **7,880** | **5,818** | **2,062** | **26.2** |
| small (<3k) | | 1,405 | 1,265 | 140 | 10.0 |
| large (≥3k) | | 6,475 | 4,553 | 1,922 | **29.7** |

The win rises monotonically with element count — 25.3, 29.2, 30.1, 33.0 — which
is what the mechanism predicts, since Color construction volume is what grows
super-linearly.

> [!NOTE]
> This supersedes an earlier, noisier reading. `ab-axe.mjs` put the same patch
> at −39 ms median (mean 49 ± 166) on `Select-Case` and called it a wash. That
> variant SD of 166, against a baseline SD of 9 in the same run, was the tell:
> the tracer's overhead plus GC timing was swamping a ~10 % effect. The
> interleaved, untraced, median-of-4 measurement above resolves it at +10.6 % on
> that page. **When a variant's SD dwarfs the baseline's, distrust the variant,
> not the effect.**

#### On large pages: suggestive, unresolved, and at the rig's limit

`config-only` behaves differently on `VB/UserControl/index.html` (4,672
elements, baseline ~2,100 ms). Two independent runs:

| run | `config-only` Δ median | mean ± SD | baseline SD |
|---|--:|--:|--:|
| 5 pairs x 3 iters | 505 ms | 163 ± 790 | 53 |
| 7 pairs x 2 iters | 486 ms | 583 ± 559 | 743 |

The medians reproduce to within 4 %, which is hard to get from a zero effect.
The means and SDs say do not cite it: 2 SD exceeds the effect in both runs, and
the second run's *baseline* SD is 743 ms on a 2,601 ms mean — 28 %.

That is a real limit of the rig, worth recording. A 2 s audit needs a fresh
browser and a 253 KB page load per run, so a pair costs ~8 s and a seven-pair
sweep runs four minutes — long enough for thermal drift to dominate. The
techniques that got a 0.35 s audit to 2 % variance (in-page warmup, deferred
trace parsing, steady-state iteration) do not scale to a 2 s one, because the
fixed per-run overhead no longer amortises. Getting a citable large-page number
needs a different approach, not more pairs.

It does not change the recommendation, because **the scan contains no large
pages today** — `SAMPLE_PAGES` spans 2,175 to 2,694 elements. It becomes the
first thing to re-measure if the representative-set work adds any.

#### H4 theme collapse — the largest measured win, and it is ours

From the split curve at 2,380 elements: a full audit is ~349 ms, of which
`color-contrast` is ~210 ms and the other 63 rules are ~160 ms.

Collapsing the theme axis — full rule set in light, `{color-contrast,
link-in-text-block}` in dark — leaves the dark audits paying the grid, the tree
and two rules, ~215 ms instead of ~349 ms. Across 12 dark audits that is
**~1.4 s of an ~8.4 s scan, about 17 %**.

That is larger than every config lever combined, and it is in our code rather
than axe's. It is also the only option here whose ceiling is set by something
real: `color-contrast` is ~60 % of the audit and *must* run in both themes —
that is the entire point of scanning dark mode — so no scheduling change can
ever remove more than the non-contrast remainder in one theme.

Not taken here, because it needs two things this phase did not build: per-theme
rule sets in `runMatrix`, and a gate mode that compares findings **unioned over
the theme axis** rather than per audit (a collapsed dark audit legitimately
reports fewer rules, so the per-audit gate would fail it for the wrong reason).
Both are small. The caveats in §H4 about `data-theme-choice` and
`theme-toggle.js` still apply and should be re-read before starting.

#### Phase 3 gate — **MET**. Decision: take `plain-color-fields`; take nothing else.

The decision turns on whether the scan stays as it is. It is being widened, so:

**Take `plain-color-fields`.** 26 % across a ten-page set spanning the real size
range, 30 % on the pages that dominate a widened scan's cost, gated 24/24 and
checked value-by-value. Adoption is one line in `check_a11y.mjs`:

```js
axeSource: readAxeSource({ minified: false, patches: ["plain-color-fields"] }),
```

The cost is real and should be stated plainly: it makes the site's correctness
oracle depend on a text substitution against a pinned `axe-core` version. That
is why the patch asserts an exact occurrence count at each of its eight
substitution points — an upgrade that moves the code fails the build rather than
silently reverting the optimisation. **Every axe-core bump now needs the
fingerprint gate run across it**, which §Version already asks for on other
grounds.

**Take nothing else.** Every config lever measures within noise at every size
tested. The theme collapse remains available at ~17 % and still costs harness
complexity; with `plain-color-fields` taken it is worth less, because it saves
non-contrast work and contrast is where the money is.

Had the scan stayed at six small pages the answer would have been "take
nothing": the same patch is worth ~140 ms there, against an ~8 s scan.

What the work produced beyond the milliseconds:

1. **A correctness gate** (`check_a11y_fingerprint.mjs`) that any future change
   to the scan runs through — plus a demonstration, in `no-html`, that it is
   necessary and not sufficient.
2. **A measured cost model.** Audit cost fits **k = 2.73 in element count** on
   real pages, and the exponent lives almost entirely in `color-contrast`.
   Everything else is linear.
3. **A correction to the sampling strategy.** `SAMPLE_PAGES` contains only the
   site's small pages. The four largest cost ~5.9x each, so widening the scan is
   far more expensive than a page count suggests — and those large pages are
   also the least-audited part of the site.

For the widening itself, the order of attack is: take `plain-color-fields`;
weight the representative set by element count (cost is k = 2.73 in page size,
so a few large pages dominate); re-measure `config-only` against the large pages
actually added, since it is the one lever whose large-page behaviour is
unresolved; then the theme collapse if still needed. **Not** per-rule disabling —
Phase 1 showed the grid is shared, so switching off individual rules saves
nothing.

---

## Open questions

- **The site-wide static check does *not* cover the gap** — this inverts draft 1's
  framing. `check_links.mjs:312-330, 347-380` implements exactly three a11y
  checks: `img-missing-alt`, `empty-href`, `empty-anchor`. Two are weaker than
  their axe equivalents (`empty-anchor` treats any element child as content, so
  `<a href=x><img alt=""></a>` passes statically but fails axe's `link-name`).
  So the author-supplied surface — `link-name`, `svg-img-alt`,
  `th-has-data-cells`, `td-headers-attr`, and the `definition-list`/`dlitem`
  rules our parameter-list pattern generates on nearly every reference page — is
  audited on **6 pages of ~1000**. The pressure is to *widen* the scan, which is
  what makes per-audit cost binding. (Lone exception: `--check-ids` strictly
  dominates axe for duplicate ids, since `duplicate-id`/`duplicate-id-active` are
  `deprecated`/`wcag2a-obsolete` in 4.13 and excluded by our tag set.)
- **Representative-set interaction.** Computing scan targets from page structure
  changes *what* is scanned and therefore aggregate cost.
  **Superseded by Phase 2's measurements:** the "~13 s for 25 pages" figure
  assumed linear scaling in page size. Real-page cost fits k = 2.73, and the
  four largest pages in the site cost 5.9x the current sample's average each.
  Adding just those four would take axe time from ~5.7 s to ~28 s. Any
  representative-set design has to weight by element count, and the case for
  making `color-contrast` cheaper comes *before* the case for widening the
  scan, not after it.

## Adjacent defects found during review — FIXED in `01883d4`

Both are done. Do not redo them; recorded here because they change the
baseline this plan measures against.

- **The "WCAG 2.2 AA" claim was false.** `check_a11y.mjs` selected
  `['wcag2a','wcag2aa','wcag22aa']`, but `matchTags` (`20558-20560`) does no
  version rollup, so `autocomplete-valid`, `avoid-inline-spacing` (WCAG 1.4.12),
  `css-orientation-lock` and `label-content-name-mismatch` had never run. The tag
  list is now all five (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`);
  there is no `wcag22a` tag in 4.13. Docs corrected in WIP.md, `Tools.md`,
  `Building.md`, `PLAN-a11y.md`.
- **`heading-order` was guarded by nothing.** Re-admitted via
  `rules: { 'heading-order': { enabled: true } }`. This works because
  `ruleShouldRun` (`20569-20583`) tests an explicit `rules[id].enabled`
  **before** the `runOnly` tag filter — so one best-practice rule can be
  re-admitted without dragging in the rest.

**Consequence for this plan:** neither change moved the result — still
0 violations / 20 incomplete — so every number in §Current state remains valid.
But the *rule set is now larger*, so a from-scratch re-measurement may attribute
time slightly differently. Two live interactions:

- **D5 is now contingent.** `css-orientation-lock` (`wcag21aa`) is back in the
  set. It is still `experimental` and so excluded by axe's default
  `tagExclude`, which is why preload's CSSOM still has no consumer — but if that
  exclusion ever changes, `preload: false` starts degrading a real rule. Re-check
  before landing D5.
- **`heading-order` guards only the 6 sampled pages.** It does not catch the five
  known h1→h3 survivors (FAQ, Do-Loop, Painting, Windowless, Fusion) — none is in
  `SAMPLE_PAGES`. That is a sampling gap, and further evidence for the
  representative-set work in §Open questions.
