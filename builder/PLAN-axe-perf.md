# axe-core performance evaluation — measurement plan

Target: understand what `axe.run` spends its time on during the accessibility
scan, and decide what of that work is avoidable in a headless batch context.

Scope: measurement first, optimisation second. The deliverable is an
attribution — time and heap, by axe phase and by rule — plus a ranked list of
avoidable work backed by numbers.

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
search-index blocking) and the `perf/` apparatus described in §Methodology.

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

### First task

Phase 0 below. Its first item — the fingerprint harness — **does not exist yet
and must be written**; every later experiment depends on it, so build it first.
Its required shape is given in §Correctness gate.

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

Ranked. All **[source-confirmed]**, none yet timed — Phase 1 assigns the numbers.

### D1 — `_createGrid` does ~14 computed-style reads per element

`_createGrid()` (`15434-15489`) walks every element with a `TreeWalker`. Per
element it runs `createStackingOrder` → `isStackingContext`, which makes roughly
**14 `getComputedStylePropertyValue` calls** (`15491-15543`), plus
`_vNode.boundingClientRect` (`15479`) and `_isVisibleOnScreen(node)` (`15480`).

At ~2400 elements: **~34,000 style-property reads plus 2400 rect reads per
audit.** It is lazy and memoized behind `cache.get('gridCreated')` (`15438`), so
it is billed to whichever rule touches it first — which is why the contrast
ablation looks so dramatic.

### D2 — the memoization layer is itself O(n)

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

`generateSelector` (`11109-11142`) climbs the ancestor chain and at each level
calls `findSimilar(doc, selector)` = `doc.querySelectorAll(selector)`
(`11147-11148`) until the selector is unique. Per node: O(depth × n). Deque's own
band-aid — `constants.selectorSimilarFilterLimit = 700` (`6867`) — is the tell.

Avoidable via `selectors: false` (`19212`), which skips `target` generation
outright, or partially via `resultTypes`.

### D5 — preload fetches an asset nothing consumes

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

### Required harness shape

Not yet written. It must run the full 24-audit matrix under two configurations
and diff the fingerprints — the throwaway version used to validate `78566d1`
looked like this:

```js
// per audit, after axe.run:
const fmt = (arr) => arr.map((v) => `${v.id}:${v.nodes.length}`).sort().join(",");
fingerprints.push(`${page}|${theme}|${viewport}|V[${fmt(res.violations)}]|I[${fmt(res.incomplete)}]`);
// then: index-wise compare candidate[] against baseline[], print every mismatch
```

Two requirements the throwaway version did **not** meet and the committed one
must:

1. **`incomplete` compares rule-id sets, not `ruleId:nodeCount`** — see the
   truncation note above, or `resultTypes` experiments will fail spuriously.
2. **Both configurations run against one build.** Comparing across a rebuild
   produces false diffs: the BuildInfo page embeds the build's own Gantt chart,
   so its SVG `<text>` nodes change every build and show up in contrast results.

Suggested home: `scripts/` alongside `check_a11y.mjs`, or `perf/` if it grows
measurement flags.

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

### 2. Ablation matrix

Rule-at-a-time and leave-one-out, via a retargeted `ab-css.mjs`. Cross-check
against (1) — disagreement localises shared setup, which is itself the D1
measurement.

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
3. **Vendored patch — now a serious candidate, re-aimed.** Draft 1 reserved this
   for H1, which does not exist. The real target is **D2**: swap memoizee's
   reference-identity normalizer for a `WeakMap`/`Map`. Behaviour-preserving,
   passes the gate by construction, and consistent with
   `book/lib/paged.browser.js` and the `fast-*.mjs` shims. Cost: pinning a patched
   fork, and triaging axe's WCAG rule updates against the gate on each upgrade.

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

### Phase 0 — harness

**Write** the fingerprint harness — it does not exist; §Correctness gate gives
the required shape and the two constraints it must satisfy. Then retarget
`ab-css.mjs` to rule sets, write the ~10-line trace capture (categories copied
verbatim from `measure.mjs:656-663`), and switch the profiling path from
`axe.min.js` to `axe.js` (`check_a11y.mjs:58` loads the minified build; every
profile frame would otherwise be a mangled single letter).

Option-name verification is **already done** — `performanceTimer` (`29141`),
`resultTypes` (`19152`), `preload` (`20439`) all confirmed, as is renderer
`.cpuprofile` compatibility. Do not re-litigate.

**Gate:** harness reproduces the current fingerprint; `ab-css.mjs` runs a
two-rule ablation end to end with pinning.

### Phase 1 — attribution

Instruments 1–3 with pinning and paired differencing. Ablate in both rule orders.

**Gate:** cost-by-rule table with SD; D1 isolated from `color-contrast`; a stated
complexity class for the scaling curve.

### Phase 2 — mechanism

Instruments 5–6 (and 4 if still warranted), aimed only at what Phase 1 says
dominates. Specific question: what share of self-time is memoizee `indexOf` (D2)
versus `getComputedStylePropertyValue` (D1)?

**Gate:** named functions and named mechanism, with a decision on whether D2 is
worth a vendored patch.

### Phase 3 — decide

Pick from the landing options against measured numbers. Every candidate through
the gate.

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
  changes *what* is scanned and therefore aggregate cost. If that set lands near
  25 pages, aggregate is ~13 s at current rates — config-only wins plus the
  theme collapse might get it under 5 s without touching axe. Worth knowing
  before committing to Phase 2/3 depth.

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
