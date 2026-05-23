# Move-not-clone, `(program)` Blink trace, and the WhiteSpaceFilter

What happened when we tried move-not-clone instead of clone-then-detach (the prediction was wrong; a `previousLeaf` cache shipped instead); cracking the cpu profile's `(program)` row open with a Blink-category trace; and a paired cpu-profile A/B that found the WhiteSpaceFilter wasn't worth its layout cost in our headless pipeline.

## What happened when we tried move-not-clone

A fresh `--detach-pages --no-timing --cpu-profile
--cpu-sampling 100` baseline run showed `cloneNode` at
~146 ms self-time, all of it inside `Layout.append`'s per-
source-node clone path. `Layout.append`'s body for the
`!shallow` (deep-cloned leaf) yields was:

```js
let clone = cloneNode(node, !shallow);  // deep clone
// ... attach clone to dest ...
return clone;
```

The user's question: source's read-only-template contract
is just an artifact of paged.js's break-and-resume model.
We're doing offline layout -- nothing reads source after
the render finishes. Could we MOVE the source node into
dest instead of cloning it, and avoid the allocation cost
entirely? Best-case ceiling estimated at ~300-450 ms /
~3-5 % of render (the cloneNode self plus distributed GC-
pressure relief from not allocating ~250 k duplicate DOM
nodes).

### What the refactor required

Three load-bearing assumptions in the chunker break the
moment source is mutated:

1. The walker traverses via live links
   (`node.firstChild` / `nextSibling` / `parentNode`).
   After a leaf yield, `walker = walk$2(nodeAfter(node,
   source), source)` reads `nodeAfter` AFTER `append` has
   moved `node` into dest -- the reads now go into dest's
   tree, not source's. Fix: capture `nodeAfter(node,
   source)` BEFORE the append call and pass it to the
   walker reset.

2. `BreakToken.node` stores a source-tree reference for
   the next page's `getStart(source, breakToken)` to
   resume from. `createBreakToken`'s four
   `findElement(*, source)` call sites map rendered
   (clone) nodes back to source via shared `data-ref`.
   With moves, source has lost the leaves and findElement
   returns the moved node now living in dest. Fix:
   bypass `createBreakToken` entirely. Compute the
   resume point from the extract-and-restore step
   instead (see `restoreOverflow` below).

3. `removeOverflow`'s `deleteContents` would drop the
   moved content forever. In the clone model that was
   fine -- source still held a pristine copy. In the
   move model, source needs the overflow content back so
   the next page can render it. Fix: replace with
   `restoreOverflow` -- `extractContents` the overflow
   range, walk the fragment depth-first collecting leaf
   elements, and reinsert each leaf at its stashed
   `_srcParent` / `_srcNextSibling` position. For the
   boundary leaf that's partially overflowing,
   `extractContents` produces a shallow clone of the
   leaf in the fragment; we inherit its source position
   via `source.indexOfRefs[ref]` (which still points at
   the original-now-in-dest, which carries the stash).
   Reverse-order iteration so each leaf's `_srcNextSibling`
   target is back in source by the time we insert.

### The bug that taught the real story

First pass rendered the book to 1740 pages -- 89 more
than the 1651-page baseline. Content was byte-identical
modulo timestamps. Per-page char counts in the FAQ
section showed pages 127+ with only ~50-500 chars each:

```
[BL p127] 3045 chars      [EX p127] 438 chars
[BL p128] 3732 chars      [EX p128] 185 chars
```

Some FAQ pages had a single short paragraph. Instrumenting
`shouldBreak` revealed it was returning true on every
non-first yield inside the FAQ article:

```
[instrument] shouldBreak true: tag=P  ref=6bv pba=- prevNode=ARTICLE
[instrument] shouldBreak true: tag=B  ref=6bx pba=- prevNode=ARTICLE
[instrument] shouldBreak true: tag=P  ref=6by pba=- prevNode=ARTICLE
... (one per FAQ paragraph)
```

The `<p>` elements have no `data-break-before` and no
`data-previous-break-after`, so the fire is via
`needsPageBreak(node, previousNode)` -- which checks
whether `node`'s effective `data-page` differs from
`previousNode`'s.

`previousNode` is computed via
`nodeBefore(node, limiter)`, which walks
`node.previousSibling` then climbs via `parentNode` if
no significant sibling exists. In the move model, after
the previous yield was moved out of source, the current
yield's `previousSibling` is `null` (the previous one no
longer lives in source). The climb continues up:
FAQ article (no `data-page`) -> looks at its previous
sibling -> finds the **part-divider article** sitting
right before the FAQ article in source, which DOES carry
`data-page="divider"` (set by processBreaks for the CSS
`page: divider;` rule on `article.part-divider`).

So `needsPageBreak` saw a transition from
`page="divider"` to (effectively) no page, fired true,
and the chunker started a fresh page for every paragraph
in the FAQ section. The chapter article's normal
"siblings share the same effective page-name" property
broke because the sibling-walk now escapes the chapter
into the prior part-divider.

### Fix: track previousLeaf in renderTo

The chunker already knows the right answer: the last
leaf it actually appended this page. Threaded through
`shouldBreak` as a third argument, used by the
`needsPageBreak` branch only (`needsBreakBefore` and the
`parentBreakBefore` logic still use `nodeBefore`):

```js
let _moveLastLeaf = null;
// ... in the loop ...
if (hasRenderedContent &&
    this.shouldBreak(node, start, _moveLastLeaf)) { ... }
// ... after append ...
if (!shallow) _moveLastLeaf = node;
```

In `shouldBreak`:

```js
let pageBreakRef = previousLeaf || nodeBefore(node, limiter);
return ... || needsPageBreak(node, pageBreakRef);
```

With that, page count went 1740 -> 1653 (within 2 of
baseline) and per-page content matched. PDF
byte-equivalent to baseline within timestamp drift.

### Profile diff

Both runs `--detach-pages --cpu-profile --cpu-sampling
100`, sample-time absolute, single run each (wall-clock
on this machine is too noisy to be a useful signal --
see *Methodology: compare profiles, not wall-clock* in
[02-finalizepage.md](02-finalizepage.md)):

| function | baseline | move | Δ |
| --- | --- | --- | --- |
| `getBoundingClientRect` | 3539 ms | 4036 ms | **+497** |
| `appendChild` | 137 ms | 390 ms | **+253** |
| `restoreOverflow` (new) | -- | 168 ms | +168 |
| `removeChild` | 1536 ms | 1635 ms | +99 |
| `insertBefore` | <50 ms | 87 ms | ~+87 |
| `getNodeWithNamedPage` | <50 ms | 108 ms | ~+85 |
| `afterPageLayout` (AtPage) | 105 ms | 182 ms | +77 |
| `(program)` | 2196 ms | 2266 ms | +70 |
| `Layout` ctor | 23 ms | 31 ms | +8 |
| `cloneNode` | 146 ms | <130 ms | **-146** |
| `removeOverflow` | 124 ms | -- (replaced) | -124 |
| **samples** | **17,481** | **19,590** | **+2,109** |
| **CPU work** | **9.48 s** | **10.74 s** | **+1.26 s** |

Net **+1.26 s of CPU work** -- the change is a clear
regression in the opposite direction from the prediction.

### Why the prediction was wrong

The cloneNode self-time saving (-146 ms) shows up as
expected, but three structural costs dwarf it:

1. **`appendChild` on an attached node is roughly 2x
   the cost of `appendChild` on a fresh clone (+253 ms).**
   A move is internally detach-from-source-parent +
   attach-to-dest-parent; both touch Blink's child-list
   bookkeeping. cloneNode produces an unparented node,
   so the subsequent attach is one-sided. Intrinsic to
   any move-based design -- no implementation choice
   avoids it.

2. **Each move dirties Blink's layout state more than
   each clone does, distributing cost into gBCR
   (+497 ms).** The increase is spread across every
   gBCR call site -- `Page.create` (+225 ms),
   `hasOverflow` (+152 ms), `Layout` ctor (+58 ms),
   `afterPageLayout` (+31 ms), `addResizeObserver`
   (+31 ms) -- not localized to any new code. Each
   gBCR call flushes pending mutations; with every move
   counting as two mutations vs one for clone+append,
   each flush has more to do. Same migration pattern
   *Attempt B: memoize `Page.create`'s gBCR* in
   [02-finalizepage.md](02-finalizepage.md) documented --
   DOM mutation cost doesn't go away by elimination, it
   migrates to whichever frame next forces a layout flush.

3. **The extract-and-restore cycle adds ~340 ms of new
   JS work.** `restoreOverflow` (168 ms) builds an
   `extractContents` fragment + walks it for leaves +
   inserts each back into source. `previousLeaf` makes
   `shouldBreak` call `getNodeWithNamedPage` (108 ms)
   on every leaf yield (it climbs parent chains looking
   for `data-page`). `insertBefore` (87 ms) is the
   per-restore reinsertion.

The deeper structural reason: paged.js's break-and-
resume model touches each source leaf O(pages-spanning-
that-leaf) times in the move model -- moved into page N,
extracted to the fragment, reinserted into source,
moved into page N+1. Each touch is a DOM mutation. The
clone model touches each node O(1) times -- allocated
once, attached, thrown away with the page. Cumulative
mutation count is structurally higher under moves.

The cloneNode time the profile attributes to its native
frame is just the *allocator* portion of cloning work --
not the total cost of "duplicating a subtree". The rest
hides in V8 / Blink native frames not labeled
`cloneNode`, and that rest doesn't disappear when you
switch to moves; it shows up as appendChild +
invalidation cost instead.

### Where this leaves the picture

Reverted. The cumulative table from earlier phases
([03-puppeteer-bump-findref.md](03-puppeteer-bump-findref.md))
is unchanged. No row added.

The pattern this attempt taught is the inverse of the
"distributed savings often exceed direct estimates"
heuristic the earlier phases documented: sometimes a
change with a direct cost saving has bigger distributed
*regressions* that aren't visible until you measure.
The cloneNode saving was real; the appendChild + gBCR +
restoreOverflow overhead was bigger.

The only design that would avoid all three costs is one
that never re-moves the same node -- a single-pass
paginator with no break-and-resume. That's not paged.js;
it's a different algorithm. Not a small refactor.

The buffer variant (pre-clone source once at startup,
move from buffer to dest) was considered and not
prototyped: it'd shift the cloneNode allocation cost to
one big startup call but every per-page move would
still hit the same appendChild + gBCR dynamic that ate
the savings here. No structural win.

This experiment also clarifies why *Profiling pdf-lib's
load* (in
[01-baseline-and-detach.md](01-baseline-and-detach.md))
and *Can we make `removeChild` cheaper?* (in
[03-puppeteer-bump-findref.md](03-puppeteer-bump-findref.md))
saw allocation savings show up as wall-clock gains:
those operations didn't have a Blink layout-tree
mutation step downstream. Mutations are where the cost
that *looks* like JS allocation actually lives in this
codebase.

## Cracking `(program)` open with a Blink-category trace

The cpu profile's `(program)` row sat at ~2.2 s (23 %) of
render and resisted attribution -- `find-callers.mjs` puts
it directly under `(root)`, the V8 sampler's structural
floor for "isolate is on-CPU but no JS frame on top." To
see *what* native code was running there, the harness gained
a `--tracing` flag and a companion `analyze-trace.mjs`.

The flag wraps the render phase in `page.tracing.start()`
with Blink-relevant categories (`devtools.timeline`,
`disabled-by-default-devtools.timeline`, `blink`, `v8`,
`v8.execute`, `disabled-by-default-v8.cpu_profiler`) and
writes `trace.json` to the results folder. The
`v8.cpu_profiler` category embeds V8 sampling-profile data
as `Profile` / `ProfileChunk` events inline with the Blink
trace events, so the single trace file is *hybrid*: loaded
in Chrome DevTools Performance or [ui.perfetto.dev](https://ui.perfetto.dev)
it renders JS call stacks aligned with Blink events on the
same timeline (the de facto answer to "what was `(program)`
doing?"). Cost: ~2x file size (e.g. 22 MB -> 52 MB on the
1651-page book) and ~0.4 s wall-clock for the extra sampler
work -- both noise on the analysis side.

`analyze-trace.mjs` walks the trace's complete-phase
events on `CrRendererMain`, computes self-time per event
name via a nested-event stack walk (same shape as
`analyze-profile.mjs` for cpuprofiles), and prints a
top-N table. A `--children <name>` mode breaks any
parent event into its direct callees, mirroring
`find-callees.mjs`. It ignores the embedded V8 cpu samples
-- those are consumed by the viewers above (DevTools /
Perfetto) or, for terminal use, by `analyze-hybrid.mjs`,
which combines V8 sample stacks with Blink event nests
into a single bottom-up / callees view.

### What's on the main thread

Top events by self-time on a fresh `--detach-pages
--no-timing --render-only --tracing` run, 1651-page book,
9.07 s render:

| event                                    | self_ms | self_% |
| ---------------------------------------- | ------- | ------ |
| `RunMicrotasks`                          | 3039.42 | 33.5 % |
| `LocalFrameView::performLayout`          | 1800.31 | 19.9 % |
| `Document::recalcStyle`                  | 1785.55 | 19.7 % |
| `InlineNode::ShapeTextIncludingFirstLine`|  526.64 |  5.8 % |
| `Document::rebuildLayoutTree`            |  484.88 |  5.4 % |
| `FunctionCall`                           |  285.89 |  3.2 % |
| `v8.callFunction`                        |  251.48 |  2.8 % |
| `Blink.CompositingInputs.UpdateTime`     |  130.77 |  1.4 % |
| `Blink.PrePaint.UpdateTime`              |  118.90 |  1.3 % |
| `Document::updateStyle`                  |  101.65 |  1.1 % |
| ... 189 smaller events ...               |         |        |

Mapping these onto the cpu profile's labels:

| cpu profile row | trace decomposition |
| --- | --- |
| `getBoundingClientRect` self 3.7 s | `performLayout` 1.8 s + `recalcStyle` 1.8 s -- the layout flush gBCR triggers, which the cpu profile lumps under the native frame. |
| `removeChild` self 1.6 s | `rebuildLayoutTree` 0.5 s + portions of `recalcStyle` / `performLayout` -- each removeChild dirties style and layout. |
| `(program)` self 2.2 s | `RunMicrotasks` 3.0 s mostly. The cpu profile attributes a chunk of this to neighbour rows; what's left under `(program)` is the V8 runtime plumbing that has no JS frame on top. |
| `(garbage collector)` 100 ms | Sum of `V8.GC_*` events ≈ 135 ms. |

So `(program)` is essentially **the V8 runtime inside a
microtask continuation**. The natural follow-up is "which
microtask, and what's it doing?"

### Inside `RunMicrotasks`

`--children RunMicrotasks` shows the parent fired only
**15 times** across the whole render, totalling 7.14 s:

```
parent: RunMicrotasks  hits: 15  total: 7142.49ms  self: 3039.42ms (42.6%)

   total_ms  total_%     hits   child
   --------  -------   ------   --------------------------------
   3442.01   48.19%    39437   Document::UpdateStyleAndLayout
   3039.42   42.55%       15   (self / unattributed)
    547.98    7.67%   181106   v8.callFunction
     50.99    0.71%      892   Blink.Style.UpdateTime
     34.88    0.49%      205   V8.StackGuard
     17.05    0.24%        6   MinorGC
```

Listing the 15 events by duration:

```
rm[0]   70.89 ms   -- one early-render burst (the parser)
rm[1..3]  < 1 ms  -- empty-trigger settle ticks
rm[4]  7071.14 ms  -- THE render loop
rm[5..14]  < 1 ms each  -- post-render cleanup
```

**One event accounts for 99.0 % of the parent total.**
rm[4] envelopes essentially the whole render. V8 batches
the ~6 `await` boundaries inside `Chunker.flow()`
(beforeParsed / filter / afterParsed / loadFonts /
render / afterRendered) -- all of which Phase 1 of
*Stripping headless-irrelevant async machinery* in
[04-sync-and-inner-loop.md](04-sync-and-inner-loop.md) turned
into `await undefined` fast-paths -- into a single drained
microtask continuation. There is
**no per-page microtask cost**. The async stripping did
its job.

### The 181,106 `v8.callFunction` callbacks

The first thing that looked like a smoking gun --
"181k dispatches sounds per-page-shaped" -- turned out
to be **one DOM walk**. Aggregating FunctionCall events
by `args.data.functionName + lineNumber`:

```
hits      dur_ms   functionName:line
181041    296.54   (anon):32455  (paged.browser.js)
     2      0.25   request.onload:27495
```

paged.browser.js:32455 is `WhiteSpaceFilter.filter`'s
TreeWalker callback:

```js
filterTree(content, (node) => {
    return this.filterEmpty(node);
}, NodeFilter.SHOW_TEXT);
```

The walker visits every text node in the parsed
document and calls the lambda. For our 5.5 MB book
that's 181,041 invocations, all clustered in the first
685 ms of rm[4]. Same `(node) => this.filterEmpty(...)`
arrow allocated once but called from C++→JS 181k times,
so V8 emits a `v8.callFunction` event each invocation.

These aren't 181k microtasks. They're 181k synchronous
TreeWalker callbacks nested inside the one big
continuation. The "callbacks per page" framing was a
mirage produced by dividing 181k by page count.

### What's actually in `(program)`'s 2.2 s

Triangulating the trace and cpu profile:

- **~1.7 s** is V8 dispatch glue for the 181k filter
  walk callbacks + remaining native→JS transitions
  inside the continuation. V8 charges this to
  `RunMicrotasks` self in the trace; the cpu profile
  splits it between `(program)` and rows like `v8.callFunction`.
- **~0.3 s** is V8 IC / inline-cache miss handling on
  the per-page hot path. Each polymorphic call site
  pays a stub-call indirection that lands in `(program)`.
- **~0.1 s** is Blink microtask checkpoint code -- the
  auto-style-and-layout pass that fires whenever a
  microtask drains. The `Document::UpdateStyleAndLayout`
  events under `RunMicrotasks` (3.44 s) attribute the
  work *itself* to named Blink rows; the C++ glue
  bracketing each call lands in `(program)`.
- The remainder is V8 scheduler bookkeeping, microtask
  queue drain machinery, and small unnamed natives.

None of this is a *per-page* cost. Reducing further
would require either (a) eliminating the filter walk,
or (b) reducing the per-page hot path's native→JS
transition count -- which is dominated by gBCR-driven
layout flushes that we've already pushed against
unsuccessfully (Attempts B, D from *What happened when
we tried `createBreakToken` dedup* in
[02-finalizepage.md](02-finalizepage.md)).

### The "actionable finding" that wasn't: WhiteSpaceFilter

The whitespace filter walk costs **~685 ms once per
render** -- 296 ms inside the JS callback bodies plus
~390 ms in TreeWalker dispatch overhead. The initial
read was "this is doing nothing useful for compressed
HTML, short-circuit it." Wrong on both counts.

Branch-counting the filter via a one-shot probe (count
every branch in `filterEmpty`, dump to the harness
console):

```
total:        181,106  every text node visited
  length === 0:       0
  length === 1:  38,685  (21.4%)  collapsed inter-element spaces
  length > 1, !ignorable: 101,930  (56.3%)  real content -- hot path
  length > 1, ignorable:  40,491  (22.4%)  whitespace-only, body runs
    inside <pre>:        3,408   no-op (REJECT)
    middle position:    27,901   textContent = " " (mutated)
    left edge:           5,405   removeChild (accepted)
    right edge:          3,777   removeChild (accepted)
    orphan:                  0
```

**22.4 % of calls entered the body** and 37,083 actual
DOM mutations happened: 9,182 nodes removed +
27,901 nodes overwritten to single spaces. Far from
zero.

The premise was based on a misreading of html-compress:
the plugin does collapse inter-element whitespace, but
the `:site, :pre_render` gate that picks which pages it
processes explicitly excludes `book.html` (which uses
the minimal `book-combined` layout that doesn't reach
`vendor/compress`;
[docs/_plugins/html-compress.md](../../docs/_plugins/html-compress.md)
calls this out). Source indentation is preserved in
the PDF input, so paged.js sees the raw multi-char
whitespace text nodes. The filter is load-bearing --
its mutations are what subsequent chunker walkers
rely on to skip whitespace cheaply.

The 0.83 % of calls that exceeded 4 us in the trace's
dur histogram came from this body running; the
histogram undercounted body entries because the
short-branch (`closest("pre")` → REJECT) takes only
~2-3 us, indistinguishable from the hot path in the
0-4 us buckets. Branch counters were needed to reveal
the true split.

There's still optimisation headroom (the per-call
TreeWalker dispatch is ~3 us of which only ~1.5 us is
the body), but it requires changing the algorithm
rather than skipping it: e.g. a hand-rolled JS recursion
that avoids the C++→JS transition per node, or
folding WhiteSpaceFilter + CommentsFilter + ScriptsFilter
into a single TreeWalker pass with `SHOW_TEXT | SHOW_COMMENT`
and a dispatcher. Net saving probably ~300-400 ms once
per render; not investigated.

The methodology lesson: a histogram of per-call dur
**cannot** distinguish a fast body branch from a hot
path -- both compile to 2-3 µs on V8. Branch
instrumentation is the only way to count what each
call actually did. The histogram suggested "0.8 %
body entries"; reality was 22.4 %.

### And we did fix it, on the Jekyll side

The premise that motivated the original "actionable
finding" -- that book.html should already be
whitespace-collapsed when paged.js sees it -- was true
in spirit, just wrong about whether it was being done.
The fix landed in two parts:

1. **Extend `html-compress.rb` to book.html.** The
   layout-chain precompute now explicitly adds
   `book-combined` to `@compress_layouts` at the end of
   `precompute_compress_layouts!`. book.html therefore
   passes through `compress!` once per build (~480 ms
   of `String#split` work on the ~5.5 MB document), and
   paged.js sees a document with inter-element
   whitespace already collapsed to single spaces.

2. **Reorder hook priorities** so that adding compress
   to book.html composes cleanly with the other
   `:pages, :post_render` plugins. The original
   `:high`-priority compress ran *before*
   `book-href-rewrite` -- whose landing-heading strip
   removed `<h2>` blocks from three chapter openings,
   leaving the (already-collapsed) single spaces on
   either side adjacent and producing literal `>  <`
   blobs. The fix is a three-tier convention: mutators
   at `:high` (run first), compress at `:normal` (the
   cleanup), readers at `:low` (snapshot final bytes).
   See `_plugins/html-compress.md` for the full table.

Verified: 0 outside-pre multi-whitespace runs in the
regenerated book.html (was 3 with the
landing-heading-strip artifacts; was 37,087 without
compress at all). Branch-counting the WhiteSpaceFilter
after the fix shows body entries drop from ~40 k to
the 3,408 in-pre cases that the filter is structurally
required to visit (and immediately REJECTs via
`closest("pre")`). DOM mutations drop from ~37 k to 0.
PDF output is byte-equivalent within timestamp drift.

Net wall-clock is approximately neutral on full builds
(~480 ms added to Jekyll, ~300-500 ms saved at paged.js
render time), and a small win for incremental Jekyll
workflows that skip the PDF (`also_build_pdf: false`):
the compress cost is paid once per Jekyll build, the
render saving is paid every PDF build, and decoupling
the two is the structural improvement.

A ruby-prof A/B (post-change vs pre-change with a
single stashed-changes revert) confirmed that the only
attributable Jekyll-side cost is exactly one extra
`compress!` invocation (837 → 838) and its downstream
`String#split` calls (+819 from book.html's non-pre
segments). No plugin's call count or self-time changed
beyond the noise floor; the priority shuffle is
CPU-invariant for everything except the new compress
pass on book.html.

### What the trace doesn't change

Nothing about the cpu profile's bottom-up table is
wrong; the trace just resolves what `(program)` masked.
After this exercise, the menu of remaining levers is
unchanged:

- `pageRanges` sharding for the generate phase (biggest
  untried knob, generate is now the larger phase).
- WhiteSpaceFilter -- the trace and a follow-up cpu-
  profile A/B (see next section) eventually showed this
  *is* skippable for our pipeline once html-compress has
  done the work at Jekyll time. Worth ~600 ms / 6 %.
- Everything else lives below the noise floor.

The cpu profile's `(program)` row isn't a structural
smell or a missed microtask -- it's the fixed cost of V8
running the JavaScript we already have, accounted for
honestly by the trace and accounted for opaquely by
the JS sampler.

## Disabling the filter outright: paired cpu-profile A/B

The "actionable finding that wasn't" + "and we did fix
it, on the Jekyll side" pair above closed with two
conclusions:

1. WhiteSpaceFilter does real work on book.html
   (37k DOM mutations pre-compression, 0 post-).
2. Post-compression the filter is essentially a no-op
   visit over 181k text nodes, and skipping it doesn't
   save measurable wall-clock -- a 3+3 wall-clock A/B
   showed 8.78 s avg with filter vs 8.53 s without, well
   inside the 1.17 s within-variant noise band.

Conclusion (1) is correct. Conclusion (2) was wrong --
specifically the "no measurable saving" claim and the
flush-migration explanation I attached to the ~+180 ms
gBCR move that appeared in a single-run profile pair.

A reader pointed out the flush-migration reasoning was
incoherent: `WhiteSpaceFilter.filter` runs *once* in
`Chunker.flow()` *before* any page is created. The body
of `filterEmpty` reads `textContent`, walks parents via
`closest("pre")`, and walks siblings -- none of which
read layout-flushing properties (`gBCR`, `offsetTop`,
computed style, etc.). There is no flush for migration
to migrate from. Whatever the +180 ms gBCR move in the
single-run pair was, it wasn't "the filter's flush load
deferring to the next gBCR." It was single-run noise on
a 38 % row -- which has a much wider noise band than the
"50-150 ms for sub-1 % rows" methodology note in
[02-finalizepage.md](02-finalizepage.md) covers.

### The proper A/B

Three filter-on (A) and three filter-off (B) cpu-profile
runs, interleaved A1 B1 A2 B2 A3 B3 so system-load
variance hits both sides equally. The probe is a one-line
`return;` at the top of `WhiteSpaceFilter.filter` --
skip the TreeWalker entirely. Toggle is a single edit
between runs. Both states are otherwise identical
(post-compression book.html, current bundle).

Per-run totals from
[`perf/ab-aggregate.mjs`](../ab-aggregate.mjs):

| run | total CPU |
| --- | --- |
| A1 (filter ON)  | 11,120 ms |
| A2 (filter ON)  | 10,270 ms |
| A3 (filter ON)  |  9,727 ms |
| **A mean**      | **10,372 ms** |
| B1 (filter OFF) |  9,744 ms |
| B2 (filter OFF) | 10,189 ms |
| B3 (filter OFF) |  9,180 ms |
| **B mean**      |  **9,705 ms** |
| **Δ (B - A)**   |   **-668 ms (-6.4 %)** |

The within-group ranges are ~1.3 s (A) and ~1.0 s (B),
so the -668 ms total-CPU delta sits at roughly 1 σ of
within-variant spread. By itself, that's a soft signal.

But per-row breakdown is tighter:

| row | A mean ± sd | B mean ± sd | Δ |
| --- | --- | --- | --- |
| `getBoundingClientRect`         | 4128 ± 309 | 3791 ± 163 | **-338 ms** |
| `(program)`                     | 2243 ± 56  | 2328 ± 173 | +85 ms (noisy) |
| `removeChild`                   | 1619 ± 63  | 1564 ± 43  | -55 ms |
| `afterPageLayout` @ paged.js    |  150 ± 26  |  119 ± 17  | -32 ms |
| **`filterTree` self**           | **88 ± 14** |  **2 ± 1** | **-86 ms** |
| `(garbage collector)`           |  103 ± 6   |   92 ± 4   | -11 ms |
| `handleAlignment`               |   70 ± 5   |   56 ± 7   | -14 ms |
| `create` (`Page.create`)        |   66 ± 7   |   50 ± 4   | -15 ms |
| `sortDisplayedSelectors`        |   60 ± 10  |   46 ± 1   | -14 ms |
| **`filterEmpty` self**          | **37 ± 2** |    **0**   | **-37 ms** |

Direct attribution (the filter rows that vanish in B):

- `filterTree` self: -86 ms
- `filterEmpty` self: -37 ms
- ~123 ms

Indirect attribution (rows that shrink in B despite
unchanged call counts -- see the trace data above
where Document::UpdateStyleAndLayout, recalcStyle and
performLayout all run ~14-15 % cheaper per call with
filter off):

- `getBoundingClientRect`: -338 ms
- `removeChild`: -55 ms
- `afterPageLayout @ paged.js:30458` (paged.js core): -32 ms
- `create`: -15 ms
- `handleAlignment`: -14 ms
- `sortDisplayedSelectors`: -14 ms
- `(garbage collector)`: -11 ms
- smaller rows: ~50 ms
- ~529 ms

Direct + indirect ≈ 652 ms, in the neighbourhood of
the -668 ms total-CPU delta. They corroborate.

### Why the filter has indirect cost

The single-trace measurement above (filter-off trace
captured for the same render) made the indirect path
visible: with filter off, `Document::UpdateStyleAndLayout`
total dropped by 574 ms across an *unchanged* 39,437
call count -- ~14 µs less per call. `recalcStyle` and
`performLayout` similarly dropped ~14 % per call.
Plausibly:

- V8's polymorphic inline caches stay warmer on the
  per-page hot path when 181 k extra C++→JS
  dispatches haven't been churning them.
- Blink's main-thread scheduler has fewer task
  boundaries to bookkeep across.
- Allocator/GC pressure is lower (the filter walk
  allocates per-callback closures and intermediate
  strings, even when each callback just returns
  FILTER_REJECT).

None of those are "the filter triggers a layout
flush." Layout work *itself* gets cheaper because the
ambient V8/Blink state is less polluted. Same per-call
mechanics, slightly faster main-thread context.

### The fix: config flag, default off

`window.PagedConfig.runWhitespaceFilter` gates the
walk. Default is undefined (falsy) -- our pipeline runs
`html-compress` on book.html, so the filter has
nothing to do and skipping it saves the ~600 ms.

Anyone running paged.js against an uncompressed
document can set the flag before `PagedPolyfill.preview()`
to opt back in. The class itself is unchanged so the
opt-in path is byte-equivalent to the original.

The opt-in semantic is the conservative choice: paged.js
upstream and many downstream users feed it untouched
HTML (with inter-element indentation surviving), where
the filter does meaningful cleanup. Disabling it for
*every* caller of this bundle would be a regression for
those use cases. Disabling it by default for *our*
pipeline is fine because we control the input
end-to-end.

Cost: zero per-page work (the gate is one `&&`-chain
check at startup), structural correctness for clean
documents, opt-in safety valve for everyone else.

### Methodology note

The wall-clock A/B was correct in claiming "the saving
is below the wall-clock noise floor for short N." It
was wrong in concluding "therefore no saving exists."
Two corrections:

1. Aggregate CPU work across paired profiles. Wall-clock
   noise is ~1 s per run on this machine; CPU sample
   totals are also ~1 s per run but the row-by-row
   self-time deltas can be much tighter. The
   `filterTree` row goes from 88 ms (sd 14) to 2 ms (sd
   1) -- a 6 σ shift. Per-row analysis can see signals
   that per-run totals lose.

2. Use *enough* paired runs that within-group SD lets
   you compute mean ± SD honestly. 3+3 is the bare
   minimum (gives 1 σ confidence on row-level deltas
   for things that change by 5+ σ). 5+5 or 10+10 would
   tighten the gBCR delta confidence further -- worth
   doing for finer signals.

The probe + aggregator are reusable
([`perf/ab-aggregate.mjs`](../ab-aggregate.mjs)): point at
6 `ab-*.cpuprofile` files and it prints the mean ± SD
table. Pattern fits any future "does this change save
CPU?" question where wall-clock noise is the obstacle.
