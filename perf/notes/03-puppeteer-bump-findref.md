# Puppeteer 22→25 rebaseline, findRef fast path, removeChild, and the idle/RAF chase

Rebaselining after a Chromium version bump shifted the generate hot path, finding that `findRef` had been silently falling out of its fast path for 39% of calls (~2.4s render win), checkpointing the cumulative picture, then six variants of cheaper `removeChild` (none shipped) and chasing the residual `(idle)` time down to `requestAnimationFrame`.

## Rebaselining after the puppeteer 22 -> 25 bump

`docs/package.json` was bumped from `puppeteer ^22.x` to `^25.0.4`,
which pulled in a newer bundled Chromium. Same harness, same book
(now 1651 pages after a small content addition vs the 1638 the
prior baseline measured), `--detach-pages --cpu-profile`:

| Phase    | Prior (puppeteer 22, post-Attempt-E) | New (puppeteer 25) | Δ |
| -------- | ------------------------------------ | ------------------ | --- |
| render   | ~19 s   | 22.0 s | flat (run-to-run noise) |
| generate | ~60-70 s | **42.7 s** | **-20 to -28 s** |
| process  | ~5 s    | 4.9 s | flat |
| **total**| ~95-100 s | **69.6 s** | **-25 to -35 s** |
| raw Chrome PDF size | 52 MB | **39.3 MB** | -12 MB |
| render ratio (last/first quarter) | 1.60x | 1.36x | flatter |

The whole wall-clock win is in `generate`. Chrome's PDF writer got
meaningfully faster, and is now emitting something more compact --
a 25 % drop in the raw byte stream that previously needed pdf-lib's
re-emit pass to shrink. *Chromium `Page.printToPDF` knob survey* in
[01-baseline-and-detach.md](01-baseline-and-detach.md) noted Skia
wrote streams uncompressed; whatever changed at
the SkPDF level closes part of that gap automatically. The
final PDF after pdf-lib's `save()` is still ~17 MB either way --
the re-emit's deflate step was already doing most of the work.

Render itself is unchanged in shape. The same hot paths
(`hasOverflow`, `Footnotes.afterPageLayout`, `Page.create`,
`findRef`) sit at roughly the same self-times. Nothing that was
cheap got expensive; nothing that was expensive got cheap.

Notable side-effect: with `generate` no longer dominating, the
strategic note at the end of *Where this leaves the picture* in
[02-finalizepage.md](02-finalizepage.md)
("`pageRanges` sharding of `generate` is the only remaining knob
with a profile target large enough to move the wall-clock total
meaningfully") is now less true. The shard target shrunk from
~60 s to ~43 s, so the upper bound on what sharding can save
shrunk with it. Still the biggest untried knob, but the urgency
is lower.

The re-baselined bottom-up render profile also surfaced something
that *was* always there but had been mis-attributed: see the next
section.

## findRef wasn't taking the fast path

The new-baseline cpu profile's top entries:

```
   self_ms   self_%   function  @  source
   5872.93   26.84%   (program)             (V8/Blink internal)
   4831.83   22.08%   getBoundingClientRect (native)
   2530.25   11.56%   findRef               paged.browser.js:643
   2426.14   11.09%   removeChild           (native, called by detach-pages)
   1007.64    4.60%   (idle)
    565.17    2.58%   removeOverflow
```

`findRef` at **11.6 % of render self-time** is the second-largest
non-native bucket after gBCR. The prior *JS-body profile after
Attempt E* (in [02-finalizepage.md](02-finalizepage.md)) reported
`findElement self 1373 ms (7.1 %)`
and concluded `findElement` was already fast. Both numbers refer
to the same call chain -- V8 just attributes time differently
between the two-line forwarder and its called helper:

```js
function findElement(node, doc, forceQuery) {
    const ref = node.getAttribute("data-ref");
    return findRef(ref, doc, forceQuery);
}

function findRef(ref, doc, forceQuery) {
    if (!forceQuery && doc.indexOfRefs && doc.indexOfRefs[ref]) {
        return doc.indexOfRefs[ref];                              // fast
    } else {
        return doc.querySelector(`[data-ref='${ref}']`);          // slow
    }
}
```

The "post-Attempt-E" profile's `findElement` charge was its
forwarder cost; the actual body work has always been inside
`findRef`. The new V8 profile splits the attribution honestly,
with `findElement` reading `self=0.00 ms` and `findRef` carrying
the 2.5 s.

### Instrumenting per-branch call counts

Wrapped `findRef` with counters keyed by which branch it took:
fast-path (dict hit), `forceQuery` (caller explicitly asked for
querySelector), `noDict` (the doc didn't have `indexOfRefs` at all),
and `dictMiss` (the doc had a dict but no entry for the ref). The
caller of each branch was captured from `new Error().stack`.

A single instrumented run on the 1651-page book:

```
findRef.calls         = 47,867
findRef.fastPath      = 29,300   (8.4 ms total, 0.29 us/call)
findRef.fallback total = 18,567  (2585.5 ms total)
  forceQuery          =      2
  noDict              =  2,739
  dictMiss            = 15,826
  fallbackReturnedNull =    892

byCallerLine (top, all attributed to docs/lib/paged.browser.js):
   15,767  dictMiss   <- Layout.append, `findElement(node.parentNode, dest)`
      955  noDict     <- Layout.append, same call
      892  noDict     <- Layout.append, `findElement(node.parentNode, fragment)`
      848  noDict     <- Layout.createBreakToken, `findElement(*, source)`
       58  dictMiss   <- Layout.createBreakToken (an `*, rendered` site)
       42  noDict     <- Layout.createBreakToken, another `*, source` site
        2  forceQuery <- Layout.rebuildTableFromBreakToken
```

The fast path is essentially free (0.29 us/call -- a hashed object
lookup). **The entire 2.5 s lives in the 18,567 fallback calls**.
Two structural reasons:

### Root cause 1: rebuilt ancestors aren't indexed in `dest`

`Layout.append(node, dest, ...)` writes each leaf clone into
`dest.indexOfRefs` near the end of the function. But when the
leaf's parent isn't already in `dest`, `append` calls
`rebuildAncestors(node)` to clone the source ancestor chain into
a fresh `DocumentFragment` and appends the fragment to `dest`:

```js
let fragment = rebuildAncestors(node);
parent = findElement(node.parentNode, fragment);
// ... attach clone ...
dest.appendChild(fragment);   // <-- ancestors now live in dest's DOM
                              //     but dest.indexOfRefs wasn't updated
```

The rebuilt ancestors are now in `dest`'s DOM tree, findable by
`dest.querySelector("[data-ref='X']")`. They are **not** in
`dest.indexOfRefs`. Every subsequent `append` whose `node`
descends from one of those rebuilt ancestors hits dictMiss on
that ancestor and falls through to `dest.querySelector`. With
~15.7 k such calls per book at ~140 us each -- a small per-page
wrapper, so querySelector is fast even when it walks -- that's
about 2.2 s.

The 892 `noDict <- Layout.append, findElement(*, fragment)` calls
in the byCallerLine table are a related symptom: the second
`findElement` call inside the rebuild branch -- which looks the
parent up in the *fragment* before it gets appended to `dest` --
hits a fragment whose `indexOfRefs` was never created.

### Root cause 2: the source tree never has an index

Six call sites in `Layout.createBreakToken` use
`findElement(*, source)` to map a rendered node back to its
position in the original document. `source` is the
`ContentParser`-wrapped result of the initial document walk in
`ContentParser.addRefs` -- which walks every element, assigns a
`data-ref`, and **stops**. No `indexOfRefs` is ever populated.
Every `findElement(*, source)` therefore falls through to
`source.querySelector("[data-ref='X']")` against the whole
~10 k-element source tree.

There are only ~890 such calls per render (they only fire on
pages where the break landed mid-element), but at ~1.3 ms each
that's ~1.2 s.

### The fix

Three small patches in `docs/lib/paged.browser.js`, all marked
`// [PATCH: findRef fast-path]`:

1. **`rebuildAncestors`** -- initialise `fragment.indexOfRefs = {}`
   at the top, and write each rebuilt clone into it as the loop
   builds the chain. The second `findElement(*, fragment)` call in
   `Layout.append`'s rebuild branch then hits the fast path.

2. **`Layout.append`'s rebuild branch** -- after
   `dest.appendChild(fragment)`, merge `fragment.indexOfRefs` into
   `dest.indexOfRefs`. Subsequent `findElement(*, dest)` calls on
   any rebuilt ancestor now hit the fast path too.

3. **`ContentParser.addRefs`** -- initialise `content.indexOfRefs = {}`
   on entry and write `content.indexOfRefs[ref] = node` inside the
   tree-walk loop. Every `findElement(*, source)` call site now hits
   the fast path.

### Results

Instrumented A/B (call counts pre/post on the same 1651-page book):

| metric | pre-fix | post-fix | Δ |
| ------ | ------- | -------- | --- |
| findRef calls (total) | 47,867 | 47,867 | (same; this is a per-call cost change, not a count change) |
| fast path | 29,300 | **46,914** | **+17,614** |
| fallback total calls | 18,567 | **953** | **-17,614 (-95 %)** |
| dictMiss | 15,826 | 59 | -15,767 |
| noDict (`findElement(*, fragment)` in rebuild branch) | 892 | 0 | -892 |
| noDict (createBreakToken vs source) | 848 + 42 | 0 + 0 | -890 |
| fallback total time | 2,585 ms | **6.9 ms** | **-2,578 ms** |
| fallbackReturnedNull | 892 | 892 | unchanged (these are the genuine "no such ref" misses) |

The 892 residual fallbacks are all `findElement(node.parentNode, dest)`
on a *fresh* per-page `dest` whose dict was just created and only
contains its own leaf clones, so the parent lookup correctly returns
null (the parent's first appearance on this page will be in the
next call's rebuilt fragment). 7 ms total; not worth a third patch.

Wall-clock A/B, paired runs, no instrumentation, no cpu-profile
(stash the fix, run twice; pop, run twice):

| run | BEFORE render | AFTER render |
| --- | --- | --- |
| 1 | 20.73 s | 18.17 s |
| 2 | 20.54 s | 18.22 s |
| **avg** | **20.64 s** | **18.20 s** |

**Δ = -2.44 s render (-12 %).**

Profile diff (`--detach-pages --cpu-profile`, single run each --
between-run noise on cpu-profile self-time is in the 50-150 ms band
for sub-1 % rows):

| function | PRE | POST | Δ |
| --- | --- | --- | --- |
| `findRef`   | 2530 ms (11.56 %) | undetectable (<130 ms) | **-2400 ms** |
| `findElement` self | 0 ms (forwarder) | 0 ms | unchanged |
| `addRefs`  | not in top 20 | **157 ms (0.80 %)** | +157 ms (new dict-population cost) |
| `removeChild` (detach handler) | 2426 ms | 2320 ms | -106 ms (noise) |
| `getBoundingClientRect` | 4832 ms | 4632 ms | -200 ms (noise) |
| total render | 22.0 s | 19.8 s | -2.2 s |

PDF byte size is 16-47 bytes apart between any two runs (well inside
the standard `/CreationDate` / `/ModDate` timestamp drift); content
is functionally byte-identical.

Shipped.

### Was it the headers/footers change?

A reasonable initial hypothesis was that the recent
"Get the details of page headers/footers out of paged.js"
(`c70b83d`) or its precursor "Add the part name as a prefix to
the page number" (`71aea3d`) had introduced the cost. Neither
did:

- `71aea3d` added a per-page
  `pageElement.querySelector("article.part-divider")` in the
  Counters handler, which would have shown up as extra querySelector
  work, but it's unrelated to `findRef`'s call path.
- `c70b83d` removed that querySelector again, moving the part-title
  capture from per-page JS to a CSS `string-set` / `string()` rule.
  Net per-page work went *down*, not up.

`findRef`'s slow path was always there -- the prior post-Attempt-E
profile in [02-finalizepage.md](02-finalizepage.md) reported the same
call chain as `findElement self 1373 ms (7.1 %)`. Two things
happened to make it worth a fresh look:

- **V8's attribution split.** The new V8 charges `findElement` 0 ms
  and `findRef` 2530 ms instead of attributing the helper's body
  to its forwarder. Same call chain, different bucket label, much
  more visible in the bottom-up view.
- **The cost itself may have grown.** 1.4 s → 2.5 s is more than a
  V8 attribution shift can explain on a +0.8 % content change. The
  branch counters above don't tell us the pre-puppeteer-25 split;
  the most we can claim is "the fallback was clearly the dominant
  branch by the time we measured." Either way, the fix removes it.

### Methodology

This one had two of the recurring lessons baked in:

1. **Instrument to understand the workload, not just the time.**
   The CPU profile showed `findRef` at 2.5 s self-time; that's
   *what*. It needed branch-counting (fast-path vs dictMiss vs
   noDict, with caller attribution) to find out *why*. Wall-clock
   A/B alone would have detected the regression; only the per-branch
   counters explained it.

2. **`new Error().stack` is the cheap way to attribute hot-function
   calls back to their callers in-browser**, when you can't
   instrument the call sites individually. The harness already had
   `find-callers.mjs` for post-hoc cpu-profile attribution, but
   that aggregates by sample, not by call. Per-call attribution
   needed the in-page stack walk. Cost ~5 us per call, OK for
   1-shot diagnostic runs, not OK to ship.

## Where this leaves the picture

Updated cumulative table, all measured against the original 207 s
puppeteer-22 baseline:

| fix                                 | render saved | total saved | shipped |
| ----------------------------------- | ------------ | ----------- | ------- |
| `--detach-pages` (display:none)     |   ~55 s      |   ~55 s     | yes     |
| `--incremental` PDF update          |    -         |   ~32 s     | yes     |
| pdf-lib `parseSpeed: Fastest`       |    -         |    ~3 s     | yes     |
| `finalizePage` micro-optimizations  |    ~3 s      |    ~3 s     | yes     |
| aggressive detach (`removeChild`)   |   ~22 s      |   ~22 s     | yes     |
| skip dead `findEndToken` path       |   ~3.5 s     |   ~3.5 s    | yes     |
| `renderTo` additive backoff         |   ~4.25 s    |   ~4.25 s   | yes     |
| **puppeteer 22 -> 25 (Chromium bump)** | **-**     | **~20-30 s** *(generate)* | **yes** |
| **findRef fast-path** (this section) | **~2.4 s** | **~2.4 s**  | **yes** |
| `pageRanges` sharding (generate)    |    -         |  ~5-20 s    | no      |

Current end-to-end on the 1651-page book, `book.bat` path:

```
render   :  ~18 s    (was ~104 s in the original baseline)
generate :  ~43-48 s (was ~64 s; mostly the puppeteer 25 bump)
process  :  ~5 s
total    : ~70 s     (was ~207 s, a 3x speedup)
```

The remaining JS-body profile after the findRef fix:

```
self_ms   self_%   function                    source
  ~500    ~2.5 %   removeOverflow              paged.browser.js
  ~320    ~1.6 %   wrapContent
  ~200    ~1.0 %   afterPageLayout (paged.js)
  ~187    ~1.0 %   afterPageLayout (Footnotes)
  ~157    ~0.8 %   addRefs                     (new -- the fix above)
  ~130    ~0.7 %   renderTo
```

None of those individually clear the noise band; the largest
remaining JS-body bucket is the same scale as the `addRefs` cost
we just added. Native frames (`getBoundingClientRect` ~23 %,
`(program)` ~30 %, `removeChild` ~12 %) are now the dominant
contributors to render, and gBCR's caller breakdown is the same
flat-per-page shape it's had since aggressive detach landed.

The single biggest untried lever remains `pageRanges` sharding for
generate. After the puppeteer 25 bump it would save less than the
earlier estimate (the 64 s -> 43 s gain made the target smaller),
but it's still the only knob with a profile target large enough to
move the wall-clock total by 5+ s.

## Can we make `removeChild` cheaper?

After the findRef fix, `removeChild` sits at ~12 % of render
self-time. The detach-pages handler attribution is clean -- 1651
detaches for 1651 pages, exactly one per page, with the only
other removeChild callers being `filterTree` at startup (9,192
ignorable-text-node strips totalling 2.3 ms; not a hot path).

Per-call cost on the 1651-page book, with `Element.prototype.removeChild`
wrapped to measure each call:

```
[instrument] page-detach avg:      1.009 ms/call
[instrument] page-detach median:   0.900 ms/call
[instrument] page-detach p90:      2.000 ms/call
[instrument] page-detach p99:      3.000 ms/call
[instrument] avg descendants/page: 147.7
```

That's ~5-7 us per descendant LayoutObject torn down, multiplied
by ~150 descendants per page, multiplied by ~1651 pages = ~1.7 s
total. The distribution is tight and scales linearly with
descendant count -- this looks like ordinary Blink teardown work
rather than a pathological slow path.

To verify, two structural variants both tested at the same
instrumentation harness:

### Variant B: graveyard DocumentFragment

Replace `parent.removeChild(page)` with
`graveyard.appendChild(page)`, where `graveyard` is a fresh
`DocumentFragment` held by the handler. Hypothesis: the
move-to-out-of-document-fragment path might skip some
LayoutObject teardown work because the destination is itself
disconnected.

| metric | A (removeChild) | B (graveyard) |
| ------ | --------------- | ------------- |
| avg per call | **1.009 ms** | 1.082 ms (+7 %) |
| median | 0.900 ms | 0.900 ms |
| p90 | 2.000 ms | 2.200 ms |
| p99 | 3.000 ms | 3.100 ms |
| total page wall | 1666 ms | 1785 ms |
| render wall-clock | ~16.1 s | ~15.2 s (run-to-run noise) |

The graveyard move is **slightly slower** per call. Blink tears
down the LayoutObjects regardless of where the node lands; there's
no fast-path for "moved to a detached parent". No win.

### Variant C: `contain: layout style` on `.pagedjs_page`

Inject `<style>.pagedjs_page { contain: layout style; }</style>`
into the document before render. Hypothesis: removing a contained
subtree might skip style/layout invalidation propagation because
Blink already knows the subtree didn't influence its siblings or
parent.

Also tested `contain: strict` (which adds `paint` and `size`
containment -- pages already have explicit dimensions via @page
CSS so this is safe).

| metric | A (no contain) | C (layout style) | C-strict |
| ------ | -------------- | ---------------- | -------- |
| avg per call | **1.009 ms** | 1.017 ms | 0.991 ms |
| median | 0.900 ms | 0.900 ms | 0.900 ms |
| p90 | 2.000 ms | 1.900 ms | 1.900 ms |
| total page wall | 1666 ms | 1678 ms | 1634 ms |
| render wall-clock | ~16.1 s | ~15.0 s | ~14.8 s |

All four runs are within ~5 % of each other on per-call cost --
well inside the run-to-run noise band. Containment doesn't unlock
a faster removeChild path either.

### Conclusion (variants B + C)

The 1.7 s of `removeChild` is intrinsic Blink LayoutObject
teardown work. The math checks out at ~5-7 us per descendant ×
~150 descendants × 1651 pages, and three different framings
(plain removeChild, move-to-fragment, contain + removeChild) all
land within ~10 % of each other. The destination of the move and
the containment metadata don't change Blink's teardown rate.

The one thing we *don't* do is "remove less per page" -- removing
a page's content as N individual leaf removals would be strictly
worse (N × overhead instead of 1 × overhead, same teardown total).
Each removeChild call carries DOM-mutation, style-invalidation,
and notify overhead beyond the per-descendant cost, so consolidating
to one removal per page is already the optimal framing.

### Variant D: don't detach at all, just `contain: strict`

A natural follow-up: if the per-page cost of having siblings
around really comes from style/selector traversal, maybe Blink
will skip a *contained* sibling subtree even when it can't skip
a `display: none` one. Containment is a stronger signal -- it
explicitly tells the engine "no observable interaction crosses
this boundary" -- so the renderer ought to be able to short-circuit
sibling-walks more aggressively.

Implementation: replace the detach handler with one that sets
`pageElement.style.contain = 'strict'` at finalizePage and clears
the property for every page at afterRendered (so `page.pdf()`
serializes the right paint state).

Result:

| metric | current detach | variant D (contain:strict, no detach) |
| ------ | -------------- | --------------------------------------- |
| **render wall-clock** | **~16 s** | **89.3 s** |
| `Page.create` gBCR | ~764 ms | **31,142 ms** |
| `hasOverflow` gBCR | ~2,478 ms | 10,922 ms |
| total gBCR | ~4,832 ms | 45,413 ms |
| per-page ratio (last/first) | 1.36x | 4.11x |

Worse than the display:none baseline (`Page.create`
gBCR 12,947 ms / render 48.5 s, reported in
[02-finalizepage.md](02-finalizepage.md)).
Containment metadata adds work to per-sibling evaluation rather
than removing it. **Definitive no.** Containment is a hint about
what's inside the box; it doesn't make the box invisible to
neighbours.

### Variant E: empty the wrapper, leave it in place

A second framing of the same idea: keep the page wrapper as a
sibling, but move its children to a stash so the wrapper itself
is a leaf (no descendants for Blink to walk through). Restore
the children at afterRendered. This isolates the "what costs
what" question: does sibling-walk cost depend on descendant
count, or just on sibling count?

Implementation: at finalizePage, for the previous-finalized page
(one behind, mirroring the keep-one-back pattern), move each
child into an array via `wrapper.removeChild(wrapper.firstChild)`,
set `min-height: 297mm` so the wrapper still occupies its slot,
and stash the children. At afterRendered, restore.

Result:

| metric | current detach | variant E (empty wrapper) |
| ------ | -------------- | --------------------------- |
| **render wall-clock** | **~16 s** | **21.9 s** |
| `Page.create` gBCR | ~764 ms | 2,628 ms (+1,864) |
| `hasOverflow` gBCR | ~2,478 ms | 5,024 ms (+2,546) |
| `Layout` gBCR | ~294 ms | 937 ms |
| total gBCR | ~4,832 ms | **10,127 ms (+5,295)** |
| `removeChild` self | 2,426 ms | **854 ms (-1,572)** |
| per-page ratio (last/first) | 1.36x | 2.93x |

The removeChild *savings* are real -- with no wrapper to tear
down, just ~150 child removals per page at sub-microsecond each.
But the gBCR *cost* roughly doubles because the wrappers are
still siblings, and gBCR firings have to walk them. Net is +5 s
render, *worse* than the current detach.

This experiment yields a clean cost-model decomposition. Pulling
the gBCR deltas apart against the wrapper-vs-content split:

```
display:none baseline (full content):       gBCR(Page.create) ≈ 12,947 ms
variant E (empty wrappers, n=1651):         gBCR(Page.create) ≈  2,628 ms
current detach (no siblings):               gBCR(Page.create) ≈    764 ms
```

Subtracting:

- (variant E - current detach) = 1,864 ms for 1,651 sibling wrappers
  → ~1.1 us per wrapper-sibling per `Page.create` gBCR call
- (display:none - variant E) = 10,319 ms for 1,651 × 150 ≈
  247,650 sibling descendants
  → ~42 us per sibling-descendant per `Page.create` gBCR call

Both wrappers and their descendants contribute to the per-call
cost. Removing the descendants helps -- variant E really is
substantially cheaper than display:none -- but the wrapper cost
alone is enough to lose. To zero out both contributions you have
to take both the wrapper and its descendants out of the sibling
list, which is exactly what the current detach does.

### Variant F: `content-visibility: hidden`, no detach

The CSS spec's `content-visibility: hidden` is the closest
property to "freeze in place without disposing" -- per spec,
rendering work is "skipped" but cached state is preserved for
cheap restoration. Conceptually nearer to a freeze than
`display: none` or `contain: strict` were.

Implementation: at finalizePage, set
`pageElement.style.contentVisibility = 'hidden'` and
`containIntrinsicSize = '210mm 297mm'` (the size hint Blink uses
when content-visibility skips a subtree). At afterRendered,
clear both.

Result:

| metric | current detach | variant F (cv:hidden) |
| ------ | -------------- | ----------------------- |
| **render wall-clock** | **~16 s** | **95.2 s** |
| `Page.create` gBCR | ~764 ms | **29,656 ms** |
| `hasOverflow` gBCR | ~2,478 ms | 17,558 ms |
| total gBCR | ~4,832 ms | 52,899 ms |
| per-page ratio (last/first) | 1.36x | 5.12x |

Worse than every other variant. The spec's "skip rendering work"
clause covers painting and composition; it does **not** make the
subtree invisible to sibling-walks during style and selector
matching that gBCR forces. Three "leave in place" properties
(`display: none`, `contain: strict`, `content-visibility: hidden`)
have now been tested and none of them short-circuit the
sibling-walk.

### Conclusion across all six variants

| variant | render | net vs current |
| ------- | ------ | -------------- |
| A current (removeChild, no contain) | ~16.1 s | (baseline) |
| B graveyard fragment | ~15.2 s | flat (noise) |
| C `contain: layout style` + removeChild | ~15.0 s | flat (noise) |
| C-strict `contain: strict` + removeChild | ~14.8 s | flat (noise) |
| **D `contain: strict`, no detach** | **89.3 s** | **+73 s** |
| **E empty wrappers, no detach** | **21.9 s** | **+5.9 s** |
| **F `content-visibility: hidden`, no detach** | **95.2 s** | **+79 s** |

The flat band (A/B/C/C-strict) is the cost-of-doing-business --
~1 ms × 1651 pages = ~1.7 s of intrinsic Blink LayoutObject
teardown. Variations on the framing don't move it. The
catastrophic band (D, E) confirms that any path where the page
wrapper stays in the live sibling list pays meaningfully more
than the teardown cost would have been -- ~1.1 us per
wrapper-sibling × 1651 wrappers × several gBCR call sites per
page comes out to several seconds of extra render even when the
wrapper is otherwise empty and contained.

The 1.7 s is the bill we pay for shrinking the live DOM from
~150 × 1651 ≈ 250k nodes back down to 2 nodes (in-flight page +
keeper), which is what kept `Page.create`'s gBCR flat per page
(see *Hypothesis 2: sibling sweeps over `display: none` pages* in
[02-finalizepage.md](02-finalizepage.md)). Net savings vs the
display:none variant was ~22 s render;
the 1.7 s removeChild cost is roughly 8 % of that win paid back
to Blink for cleanup. Worth keeping.

### Aside: it's not GC, and JS references don't help

A reasonable follow-up question to all of this is "can we just
hold a reference to the detached children to avoid disposal,
or turn off GC to skip the cleanup?" Neither applies to what
we're measuring.

Chromium maintains two trees:

- **DOM tree** -- `Node` objects, JS-visible, referenceable.
- **Render tree** -- `LayoutObject` / `LayoutBox` / `LayoutText`
  etc., Blink-internal, NOT JS-visible.

`removeChild` keeps the DOM Node alive (JS reference holders --
including the handler's `this._detached` array -- prevent
collection). But the corresponding LayoutObject in the render
tree is **destroyed immediately**, synchronously, at the
removeChild call. Re-attaching via appendChild later builds a
new LayoutObject from scratch.

There is no JS-level API to keep a LayoutObject alive across
detach + reattach. Holding DOM references doesn't change the
render-tree lifecycle. The 1.7 s lives entirely in
LayoutObject teardown -- which is Blink-internal C++ work
attributed to the `removeChild` native frame in the profile,
not to GC.

V8's GC is a separate concern and isn't the bottleneck. The
profile reads:

```
   self_ms   self_%   function
    195.21    0.89%   (garbage collector)
```

~200 ms over a ~22 s render. Even if it could be disabled
(it can't -- Node would OOM), it would barely register.

The asymmetry between variants B and E makes this concrete.
Variant B (graveyard fragment) moves the page from
`.pagedjs_pages` to a detached DocumentFragment; variant E
(empty wrapper) keeps the page in `.pagedjs_pages` but moves
its children out. The fragment-move path *does* trigger
LayoutObject teardown (you can see the 1.08 ms / call in
variant B's instrumentation) even though the DOM Node lives on
in a JS-visible fragment -- because the destination is itself
not attached to the document, so there's no live render-tree
parent. Conversely, variant E's wrapper stays in
`.pagedjs_pages` with a live LayoutObject the whole time, so
the wrapper's render-tree slot doesn't get torn down; only
its child LayoutObjects do (as the children move out). The
"keep render objects alive" idea would have to mean keeping
the wrapper in `.pagedjs_pages` with all its children, which
is the display:none baseline -- ~48 s render.

The trade-off is therefore not "keep things alive vs. let GC
collect them"; it's "be a live render-tree sibling vs. not".
Anything that keeps the wrapper as a live sibling pays the
~1.1 us per wrapper-sibling per gBCR call shown above, and the
gBCR firings compound that into seconds across 1651 pages.

## Chasing the residual `(idle)` to requestAnimationFrame

A second axis of the same investigation. The post-findRef-fix
profile showed `(idle) 735 ms (4.6 %)` -- not huge, but non-zero
and worth understanding. `(idle)` in a V8 CPU profile means
samples taken while the main thread had nothing scheduled --
waiting on async/await, microtask queue settling, requestAnimationFrame
ticks, or other browser-internal yields.

### Hypothesis 1: microtask boundaries from `await Hook.trigger(...)`

The chunker's per-page loop has 5-6 `await this.hooks.X.trigger(...)`
calls per page. `Hook.trigger()` wraps every sync handler in a fresh
Promise and returns `Promise.all(promises)`, so the caller always
awaits a thenable -- a microtask boundary per await even when every
handler resolved synchronously. 5 boundaries × 1651 pages ≈ 8,255
yields; if each yield is ~85 us in V8 it lines up with the 735 ms.

Patched it: `Hook.trigger()` returns `undefined` when no handler
returned a thenable, callers do
`let p = hook.trigger(...); if (p) await p;` to skip the await on
the sync fast path. Patched at four hot per-page sites (3 in
`chunker.layout`, 3 in `chunker.handleBreaks`).

Result: render went **up** by ~0.35 s on a 2-run paired A/B
(14.57 s -> 14.92 s avg). `(idle)` in the profile went **up too**
(735 ms -> 1223 ms in absolute terms). Microtask boundaries are
~30 us each at the JIT level; the V8 sampler at 1 ms intervals
hardly catches them, so they show up as `(program)` rather than
`(idle)`. The patch shaved microtask scheduling cost in the
single-digit percent range but added a branch on every Hook.trigger
call -- net wash, slight regression. **Reverted.**

### Hypothesis 2: ResizeObserver firing per page

Per page, `Page.addResizeObserver` creates a fresh `ResizeObserver`
that fires its callback asynchronously from the compositor thread
back to main. The callback wraps work in `requestAnimationFrame`,
so each RO firing schedules a frame-tick wait. 1651 pages × ~0.5 ms
per RO-rAF round-trip ≈ ~800 ms. Plausible.

Two-step probe:
1. **Skip the rAF wrap inside the RO callback**, run synchronously.
   Result: `(idle) 902 ms`. No improvement, possibly slightly worse.
2. **Disable the ResizeObserver entirely** (early-return in
   `addResizeObserver`). Result: `(idle) 1,074 ms`. Still no
   improvement.

Neither helped. The RO isn't the source -- the per-page
`addResizeObserver` overhead is real, but it doesn't show up in
the `(idle)` bucket. Restored upstream behaviour.

### Hypothesis 3: the chunker's `Queue.tick` is `requestAnimationFrame`

The chunker drives its per-page work through a `Queue` class
(`paged.browser.js:2666`). The queue's constructor sets:

```js
this.tick = requestAnimationFrame;
```

and `Queue.run()` schedules each iteration via
`this.tick.call(window, () => { ... });`. Chunker's `render()`
loops over `this.q.enqueue(() => this.renderAsync(renderer))`
once per page. Every per-page iteration therefore waits one rAF
tick before processing.

`requestAnimationFrame` waits for the next animation frame. In
headless puppeteer with no display, rAF still delivers callbacks
on a regular cadence (Chromium's headless mode default is around
60 Hz off-screen / ~16 ms per frame, with the scheduler often
batching tighter than that). Either way, per-page rAF waits
across 1651 pages add up to several hundred milliseconds of pure
main-thread idle.

The fix is one line:

```js
this.tick = (cb) => queueMicrotask(cb);
```

`queueMicrotask` schedules the callback on the microtask queue --
runs before returning to the event loop, microsecond-scale latency
instead of millisecond-scale. The `Queue` doesn't depend on rAF
semantics (no paint coordination, no frame-budget yielding --
it's just a serializer that wants to run tasks back-to-back).

Verification (paired 2-run A/B, `--detach-pages`, no
instrumentation, no cpu-profile):

| run | BEFORE render | AFTER render |
| --- | --- | --- |
| 1 | 14.62 s | 11.86 s |
| 2 | 14.51 s | 12.12 s |
| **avg** | **14.57 s** | **11.99 s** |

**Δ = -2.58 s render (-18 %).** Larger than the 735 ms `(idle)`
that prompted the look -- because rAF was costing real (program)
work too (V8 scheduler, microtask queue draining around the rAF
boundary), not just idle wait. CPU profile of the fixed render:

```
   self_ms   self_%   function
   -------   ------   ----------------------------------------------
   4355.74   34.75%   getBoundingClientRect
   1935.89   15.45%   removeChild
   1934.11   15.43%   (program)             (was 5872 -- down ~4 s)
    636.43    5.08%   removeOverflow
    -- (idle) absent from the top 10, < 130 ms (1 %)
```

`(idle)` dropped out of the top 10 (< 130 ms / 1 %), `(program)`
dropped from 5872 ms to 1934 ms (-4 s), `removeChild` dropped
slightly (2426 ms -> 1935 ms; smaller render = same per-call cost
× same call count, so this is sampling artefact, not a real
change). PDF byte size unchanged (within standard timestamp
drift). Shipped.

### What the three hypotheses together teach

`(idle)` in a V8 CPU profile attribution table is **not** primarily
microtask scheduling -- those are too fast to sample. It's
genuinely-waiting time, where the main thread had no V8 work to do.
The dominant source of waiting in our render was not async/await,
not ResizeObserver coalescing, but a `requestAnimationFrame`
buried in the chunker's task queue. Replacing it with
`queueMicrotask` collapses the per-page wait, and additionally
shrinks the surrounding V8 scheduler work because each rAF
callback came with its own setup / teardown overhead.

The pattern to remember: if a profile shows non-trivial `(idle)`
in a render-style workload, hunt for explicit `requestAnimationFrame`
/ `setTimeout` / `requestIdleCallback` calls in the hot path before
investigating microtask machinery. The frame-paced scheduler is a
much bigger lever than the microtask scheduler.

### Follow-up: the `Queue` itself was unnecessary indirection

The chunker's `render()` routes each per-page iteration through
`this.q.enqueue(() => this.renderAsync(renderer))`. The queue's
job is to serialize tasks -- but an async generator is already
inherently serial (you can't call `.next()` twice in parallel).
With the rAF-tick fix above, the queue was reduced to a
`queueMicrotask` hop plus a Promise/deferred allocation per page,
for no purpose.

Dropped the indirection: `render()` now iterates `renderer.next()`
directly. The `Queue` class still exists in the bundle for the
`onOverflow` re-render path (which is rare in practice), but the
hot per-page loop bypasses it.

This is a structural simplification more than a measurable speedup
-- the queueMicrotask hop was already cheap and the deferred
allocation amortizes. But it removes a layer that was doing
nothing useful for our use case, which is the point of
maintaining a fork.
