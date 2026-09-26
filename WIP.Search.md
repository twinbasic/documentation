# twinBASIC Documentation — Site search design notes

Why searching for a member such as `PaintPicture` does not find it, what was
measured, and the design that fixes it. Companion to
[builder/PLAN-6.md](builder/PLAN-6.md) §5.3, which describes the search-data
generator as ported from Jekyll.

Like WIP.md, this file is not rendered through tbdocs, so literal dashes are fine here.

## The problem

`PaintPicture` is documented on six classes (Form, PictureBox, Printer,
PropertyPage, Report, UserControl), each under `### PaintPicture` inside
`## Methods`. Searching for it returns 24 results, but the definitions come
13th to 19th, as entries titled just "Methods" that link to `#methods`. The
same happens to every member documented at `###`: `Line`, `Print`, `Cls`, the
Assert methods, and about 2,700 others.

Three things combine:

1. **Granularity.** [builder/search.mjs](builder/search.mjs) splits a page into
   one entry per heading up to `search.heading_level`. `docs/_config.yml` does
   not set it, so it is 2. A `###` member becomes part of the text of its
   parent `##` entry, which is often 5 to 16 KB long.
2. **Length normalisation.** lunr scores with BM25 (`b` = 0.75). A term found
   in a 10 KB "Methods" entry scores far lower than the same term in a short
   entry that only mentions it, such as the glossary's "graphics method".
3. **Tokenisation.** The client splits on `/[\s\-/]+/`, not on `.`. So
   `Form.PaintPicture` is the single token `form.paintpicture`, which occurs
   nowhere. Qualified names find their target 0.4% of the time.

The render step `headingLevelNormalizePlugin` ([builder/render.mjs](builder/render.mjs))
matters here. On a page with `#` and `###` but no `##` (405 of 912 pages,
mostly `Reference/Core`), it promotes `###` to `##`, so those pages are
already split finer today. Counts below are after this step, which is what
search sees.

## The corpus

After normalisation: 909 h1, 2,549 h2, 3,820 h3 (on 222 pages), 31 h4, no h5
or h6. Of the raw h3 headings, 2,761 are API members, 799 are generic
sections and 1,056 are prose. The generic ones are mostly `See Also` (412)
and `Example` (379). Nearly every h4 is an `Example` under a member.
Generic headings appear in two layouts:

- next to the members, as on `ICustomControl`: `## Methods > ### Initialize, ### Destroy, ### See Also`;
- under a member, as on `NamedPipeServer`: `### PipeName > #### Example`.

No page sets a heading id by hand. `uniqueSlug` handles the 33 pages that
repeat a heading, by adding `-1`, `-2` and so on.

## Measurement

A harness replays the client's search in Node: the same lunr build, the
same boosts, the same query construction and the same capped fuzzy fallback.
It runs against a built `search-data.json`. The ground truth is
`tB/symbols.json`, which gives 8,012 queries:

- 2,884 bare names (`PaintPicture`). A result counts as correct if it is any
  URL that documents a symbol of that name, since 18% of names exist on many
  classes.
- 5,108 qualified names (`Form.PaintPicture`). Only that class's URL counts.
- 20 hand-picked prose queries ("late binding", "Option Explicit" and so on).

It reports hit@1/5/10, MRR (capped at rank 20), results by symbol kind, cost
(size raw and gzipped, index build time in the browser, heap) and the
queries that changed rank between two configurations. The harness is
[eval/search_quality.mjs](eval/search_quality.mjs); today's numbers (the
"today (h2)" row below) are its baseline, saved as
[eval/search_baseline.json](eval/search_baseline.json). Run
`node eval/search_quality.mjs --compare eval/search_baseline.json` to measure
a change against it.

### Results

| configuration | entries | gzip | hit@1 | hit@10 | MRR | bare hit@10 | qualified hit@10 | prose hit@10 / MRR |
|---|---|---|---|---|---|---|---|---|
| today (h2) | 3,781 | 1,039 KB | 16.7% | 20.5% | .182 | 55.8% | 0.4% | 80% / .690 |
| h3 | 7,606 | 1,131 KB | 27.7% | 35.3% | .307 | 84.6% | 7.3% | 80% / .611 |
| h4 | 7,637 | 1,132 KB | same as h3 | | | | | |
| V2: h3, generic sections folded | 6,713 | 1,094 KB | 28.3% | 35.7% | .312 | 84.6% | 7.9% | 80% / .621 |
| V3: h3, generic sections retitled | 7,606 | 1,112 KB | 27.7% | 35.3% | .307 | 84.6% | 7.3% | 80% / .610 |
| V2 + query split on every `.` | 6,713 | 1,094 KB | 67.9% | 90.5% | .761 | 84.6% | 93.9% | 80% / .621 |
| V2 + symbols field (boost 50) + split on every `.` | 6,713 | 1,143 KB | 77.9% | 97.5% | .862 | 98.1% | 97.2% | 80% |
| V2 + symbols (boost 200) + split | | | | 97.7% | .867 | | | **75%** |
| BM25 `b` 0.5 / 0.25 on V2 + split | | | | 90.4 / 90.3% | .757 / .751 | | | |
| **recommended**: V2 + symbols (50) + smart dot split | 6,713 | 1,143 KB | **88.7%** | **97.9%** | **.929** | 98.1% | 97.9% | 80% |

Against today, the recommended configuration makes 6,590 queries better and
38 worse, and leaves 1,384 unchanged. Its index build time in the browser is
about 1.1 s against 1.0 s today. Query latency is unchanged at about 0.03 ms.

### What the numbers showed

- **h4 adds nothing.** From h3 to h4, no query changes rank.
- **Splitting creates short competitors.** At h3, `vbSolid` falls from rank
  1 to about 12. Its page, `DrawStyleConstants`, is 483 characters. The new
  per-property entries such as `DrawStyle` (171 characters) mention the
  constant once and now outscore it. Titles play no part; every hit is on
  content. Tuning `b` down to 0.25 leaves `vbSolid` at 12, and only `b` = 0
  fixes it, so BM25 tuning is not the answer.
- **Most remaining misses are enum values that live in table rows.** Of the
  444 bare names still outside the top 10 at h3: 410 have a page whose title
  is not the symbol's name, mostly enum tables (`KeyCodeConstants` 100,
  `MenuAccelConstants` 75, `ShortcutConstants` 49); 24 are operators; 10 are
  common words (`And`, `Is`, `Not`, `With`). A symbols field fixes the first
  group.
- **The symbols field generalises.** Built from a random 50% of symbols, it
  still raises the other 50% from 82.4% to 87.3% in the top 10. At boost 200
  it starts to beat real prose answers (prose drops to 75%); at 50 prose is
  unchanged.
- **Splitting on every `.` has two costs.** `Debug.Print` falls from rank 1
  to 61, because `debug` and `print` are both common words and the exact
  token no longer counts. And `1.0`, `e.g.` and `i.e.` turn into
  single-character tokens that match letter-index pages. The smart split
  below fixes both and keeps every qualified-name gain.
- **Generic sections:** folding them into the entry before them is a small,
  free gain. Retitling them ("PaintPicture — Example") gains nothing.

## Design

### 1. Split entries at h3, and fold generic sections

- Set `search.heading_level: 3` in `docs/_config.yml`.
- In `extractSections`, after the split, append any section whose title is a
  generic section name to the section before it on the same page, rather
  than giving it its own entry. The list lives in config as
  `search.fold_headings`: `See Also`, `Example`, `Examples`, `Remarks`,
  `Parameters`, `Return value`, `Syntax`, `Notes`. It is matched without
  regard to case.
- Folding applies at every level, including the h2 `Example` and `See Also`
  on normalised `Reference/Core` pages. Measured separately, that is neutral
  to slightly positive (V2 on h2 against h2: hit@10 21.0% against 20.5%).
- A page whose first section is generic keeps it as its own entry, since
  there is nothing before it to fold into.
- The order of entries stays fixed. `discover.mjs` orders pages
  deterministically because reordering used to shuffle search entries
  between builds, and splitting headings top to bottom keeps that.

### 2. Two fields built from the symbol index

Measurement (below) used a single `symbols` field at boost 50. Building it,
BM25 discounts a match inside a long field, and `Container.Name` forms are
longer than bare names, so the two compete inside one field for no reason.
Splitting them into two fields, each boosted on its own, ranks better than
one field at any single boost. The shipped design is therefore two fields,
not one:

- `names`: the bare name of every symbol in `tB/symbols.json` whose URL is
  the entry's `relUrl` (ignoring a trailing slash or `index`), space-
  separated and deduplicated. Client boost 100.
- `qualified`: the `Container.Name` form of the same symbols (only those
  that have a container -- a bare statement or operator does not), space-
  separated and deduplicated. Client boost 50.

With the current corpus, 4,084 of 6,713 entries get either field.

- In the build, `searchData` also waits for `symbolIndex`. Both already run
  on the main thread after `renderJoin`. `symbolIndex` returns its symbols,
  and `searchData` joins them by URL before it writes (`joinSymbolsToEntries`
  in `search.mjs`). Workers keep deriving sections as they do now; the join
  is a map lookup per entry.
- `renderEntryString` adds `names` / `qualified` only when non-empty, so a
  page with no symbols produces the same bytes as before.
- In the client, `this.field('names', { boost: 100 })` and
  `this.field('qualified', { boost: 50 })`. The title keeps 200 and content
  keeps 2.

### 3. Query construction

In the client's `update()`, for each token the tokenizer produces:

- **Smart dot split.** Keep the whole token as a term with boost 10, as
  today. Where a `.` sits between identifier characters on both sides
  (found by `/([A-Za-z_]\w*)\.(?=[A-Za-z_])/g`, not a lookbehind, which
  Safari before 16.4 can't parse), also add the parts as extra terms,
  with the same boost and trailing wildcard as ordinary tokens. Drop parts of
  one character. So `1.0`, `3.9`, `e.g.` and `i.e.` add nothing, and
  `Debug.Print` still matches its exact entry first.
  Making the parts required (lunr's `presence.REQUIRED`) was measured and
  rejected: qualified hit@10 falls from 97.9% to 88.6%.
- **Asterisk guard.** Drop tokens made only of `*`. If nothing is left, show
  no results. Today a search for `*` or `**` throws inside lunr's query
  engine and search stops working. The guard changes no metric.

### 4. Both copies of the client

The online client is the vendored
`builder/vendor/just-the-docs/assets/js/just-the-docs.js`, patched in place.
Add both changes to the patch list in its README. The offline build replaces
`initSearch` with its own copy, `JTD_INITSEARCH_FN_REPLACEMENT` in
[builder/offline.mjs](builder/offline.mjs), which builds its own lunr index,
so it needs the `names` and `qualified` fields too, at the same boosts. It
uses the query code in `update()` unchanged, so it inherits the query
changes. A unit test extracts the field/boost list from both sources and
asserts they agree, so they cannot drift apart silently.

### 5. Tests and tooling

- **Unit tests for `search.mjs`.** Today nothing checks what entries
  contain; only URL coverage is checked (`checkSearch`, which strips `#`, so
  it is unaffected). Add tests for the h3 split, folding (including a generic
  section that comes first on a page), the symbols join and URL
  normalisation, and byte stability when `symbols` is empty.
- **Fix `eval/site_search.mjs`.** It claims to reproduce the client exactly,
  but never sets `lunr.tokenizer.separator`, so it tokenises with lunr's
  default `/[\s\-]+/`. That is why it could not show the `*` crash. Mirror
  the new field and the new query logic too.
- **Promote the harness into `eval/`**, as `eval/search_quality.mjs` next to
  `site_search.mjs`, sharing its index and query code. Commit the ground-truth
  derivation and the 20 prose queries, but not the built data files, and
  record today's numbers as the baseline. `scripts/` does not fit, because
  its tools are checks that pass or fail.
- **Comments.** The byte-parity-with-Jekyll wording in `search.mjs` is
  history, since nothing has compared against Jekyll since the cutover.
  Reword it where this change diverges.

## Known regressions and remaining gaps

- **38 queries get worse.** The largest: `VB` (rank 1→15), `Do` (1→13),
  `For` (1→12), `With` (28→54), `Is` (151→176). Short keywords now also
  match many `symbols` fields. Step 5 of the rollout diagnoses them and
  fixes them.
- **Operators (24 symbols) remain unsearchable.** See [Future work](#future-work).
- **Prose hit@10 stays at 80%.** Four of the twenty prose queries miss
  whatever the configuration, so they are content or wording problems.
- **Ground-truth bias.** Most queries are symbol names, so the numbers favour
  API lookup. The symbols field comes from the same data as the ground truth.
  The held-out check limits that concern, but does not remove it. The prose
  set is small and hand-picked.
- **After step 5** (below), 18 queries are still worse than the *original*
  (pre-rollout) baseline, not the 38 above: `VB` (rank 1→16, wildcard
  crowding -- `VB` is a prefix of many `vbXxx` constant names in `names`),
  `Lock`, `Time$` (same crowding, on `names`/`qualified`), `Column`,
  `ColumnHeader`, `CheckBox`, `PropertyPage`, `ToolWindow`, `Node`, several
  `vbXxx` bare names at rank 2 instead of 1, and the `symbol index` prose
  query (rank 1→39, because `Index` is a property on many controls, so the
  `names` field now outranks the prose page that used to be the only match).
  All are wildcard/wording crowding from keeping short common words
  searchable, not regressions step 5 introduces on its own -- see "Design
  §5" below for why keeping them was still the right trade.

## Design §5: stop words, dot runs, and a lazy build

Step 5 of the rollout (see "Rollout" below) is three independent, measured
changes to both client copies and the eval replica.

### A. Keep lunr's stop words in the index

lunr's **index** pipeline runs `lunr.stopWordFilter` by default, dropping
words like `do`, `for`, `if`, `is`, `on`, `with`, `each` from every field
before it's added. Its **search** pipeline never ran that filter -- upstream
never removes it, so a query for `Do` still carried the token `do`, which
by that point existed nowhere in the index. Since a large fraction of
twinBASIC's own keywords are English stop words, every keyword query was
guaranteed to miss its own entry (`Do` ranked 18th, `For` 17th, `With` 55th,
`Is` 177th, `On` 3rd only because of an unrelated coincidental match, `Each`
6th). The fix is one line inside the `lunr(function(){...})` builder: `
this.pipeline.remove(lunr.stopWordFilter);`. Keeping stop words does let a
handful of short, extremely common tokens (mostly other `vbXxx` constant
name prefixes and `Index`/`Lock`/`Column`/`Time$`) crowd into more results
than before -- see "Known regressions" above -- but every one of the
keyword queries this fixes goes to rank 1, and the fix generalises (it
isn't specific to twinBASIC's keyword list).

### B. Split runs of two or more dots

Titles like `Do...Loop`, `For Each...Next` and `If...Then...Else` tokenised
as a single opaque token (`do...loop`), because lunr's tokenizer decides
where to split by testing *one character at a time* against `separator`; a
`\.{2,}` alternative inside that regex can never match, since no single
character is "two or more dots". The fix wraps `lunr.tokenizer` instead of
trying to extend the separator regex: for a string input, every run of 2+
dots becomes the same number of spaces (`s.replace(/\.{2,}/g, m => new
Array(m.length + 1).join(' '))`, chosen over deleting the dots so that
character offsets used for match highlighting stay valid), then the
original tokenizer runs as usual. Non-string input (arrays, `null`) passes
through unchanged, since lunr also calls its tokenizer with those.

The wrapper is installed once, at the same place the separator used to be
set, and it has to carry `separator` itself: the original tokenizer reads
`lunr.tokenizer.separator` at call time (not a value captured when it was
first defined), so once `lunr.tokenizer` points at the wrapper, that lookup
resolves to the *wrapper's* own `.separator` property, not the original
function's. The wrapper sets `wrapper.separator = /[\s\-\/]+/`, the client's
existing separator, and `/` still splits tokens, e.g. `a/b` tokenises to
`a`, `b` exactly as before. Since it runs on the shared global `lunr`
object, it applies to the index build and every query alike -- `update()`
already calls `lunr.tokenizer(input)` unchanged.

### C. Build the index lazily, on the first keystroke, with visible feedback

Before step 5, `initSearch()` ran unconditionally on every page load,
fetching `search-data.json` and synchronously building the lunr index --
about 1.3s and 240MB of heap on a desktop (see the cost table below), paid
by every reader whether or not they ever opened search. `initSearch()` now
only defines *how* to build the index (`loadIndex(onSuccess, onError)`,
which fetches via XHR as before and installs the stop-word/dot-run patches
above) and hands that function to `searchLoaded()`, which wires up the
search box's listeners immediately but doesn't call `loadIndex()` until the
first `keyup` that leaves the box non-empty.

That first keystroke calls `loadIndexNow()`, which shows a status message
("Loading search index...") in the same slot and style as "No results
found" (`.search-no-result`, reused rather than adding a class, since
visually it's the same single centred message) and the same text in the
`a11y-status` live region, then yields (a `requestAnimationFrame` raced by
a 100 ms timer, since frames never fire in a hidden tab, then
`setTimeout(fn, 0)`) so that message actually paints before the
synchronous, comparatively expensive index build runs on the main thread.
A keystroke during the load leaves the message in place. Checked in a
browser: the message stays up until results replace it, with no empty
panel in between, both online and in the offline tree.
When `loadIndex()` finishes, `finishLoad()` searches whatever is in the box
*at that moment* -- not whatever was typed when the load started, since the
reader may have kept typing while the fetch and build were in flight. Only
one load is ever in flight at a time (`indexLoading`, checked at the top of
`loadIndexNow()`); a keystroke that lands mid-load just returns from
`update()`, having already updated `currentInput`, and `finishLoad()`'s
fresh read of the search box at completion is what ends up searched for. A
failed load (a bad XHR status, a parse error, or an exception building the
index) shows "Search is unavailable" plus the matching `a11y-status` text
and leaves the index `null`, so the next keystroke retries from scratch.

The restructuring keeps `update()`'s existing prefix (the dedup check, the
`search-active` class, the iOS scroll workaround) and its keyboard/focus/
blur listeners untouched; only the part that used to run the query
unconditionally was split out into `doSearch(input)`, gated behind `if
(index === null) { loadIndexNow(); return; }`. `searchLoaded()` itself now
takes `loadIndex` instead of `(index, docs)`, since those two are no longer
available at the time it's called.

`builder/offline.mjs`'s `JTD_INITSEARCH_FN_REPLACEMENT` gets the same
treatment: its `window.SEARCH_DATA` is already sitting in memory (preloaded
via a `<script src=>` the offline HTML injects before this file runs, so
there's no fetch to defer), but the *build* -- the actual expensive part --
still waits for `loadIndexNow()`'s first call, with the same loading/error
feedback, because `searchLoaded()` (unchanged, shared by both copies) is
what decides when to call `loadIndex()`. `eval/site_search.mjs` mirrors
parts A and B exactly (there's no lazy build to mirror -- the CLI always
wants an index).

**Cost per page view**, from 15 interleaved runs on a desktop (median build
time and heap; see "Measurement" above for methodology):

| | today (h2) | steps 3-4 | + stop words kept |
|---|---|---|---|
| index build | 964 ms | 1,184 ms | 1,294 ms |
| heap | 157 MB | 204 MB | 243 MB |

With the lazy build (part C), these costs move from "every page view" to
"once per page, and only for readers who actually type into the search
box" -- a page a reader never searches from now pays nothing at all for
search.

## Decisions

- The fold list is config (`search.fold_headings`), not code.
- The harness moves into `eval/`.
- The 38 regressions are measured and fixed, in a step of their own.
- The work ships in steps, in this order.

## Rollout

Each step is its own change. From step 2 on, each one records its numbers
from the harness.

1. **Bug fixes.** The asterisk guard, in both client copies. The missing
   tokenizer separator in `eval/site_search.mjs`.
2. **Harness.** `eval/search_quality.mjs`, with the ground truth and today's
   numbers as the baseline.
3. **h3 entries.** Set `search.heading_level: 3`, fold `search.fold_headings`,
   and add unit tests for `search.mjs`.
4. **Symbols field and smart dot split.** The build join, the new field in
   both client copies, the query construction, and `eval/site_search.mjs`
   updated to match.
5. **Regression fix.** Done: keep lunr's stop words in the index, split runs
   of 2+ dots before tokenising, and build the index lazily on the first
   keystroke instead of on every page load. See "Design §5" above. Against
   step 4's baseline: hit@10 97.8% → 98.0%, MRR .9326 → .9331, 42 queries
   worse (all but two by a single rank -- wildcard crowding from keeping
   short common words searchable) and 23 better. Against the *original*
   (pre-rollout) baseline: hit@10 98.0%, MRR .933, bare MRR .966, prose
   80% (`With statement` improves from rank 19 to 4), and 18 queries worse
   (`VB`, `Lock`, `Time$`, `Column`, `ColumnHeader` and a few more, plus the
   `symbol index` prose query) against `With`, `Is`, `Do`, `For`, `Each` and
   `On` all now at rank 1.

## Future work

### Operators

The 24 operator symbols can't be found by searching for the symbol,
whatever the configuration: `<` `<=` `<>` `=` `>` `>=` `&` `&=` `/` `/=`
`^` `^=` `\` `\=` `<<` `<<=` `-` `-=` `*` `*=` `+` `+=` `>>` `>>=`. Three things combine:

- **Content.** `stripHtml` leaves `<` and `>` as the entities `&lt;` and
  `&gt;`, so the literal character never reaches the index.
- **Trimming.** lunr's trimmer strips non-word characters from both ends of
  every token, in the index and in the query. An operator token trims to
  nothing.
- **Separators.** `/` and `-` are tokenizer separators, so a search for `/`
  or `-` contains no tokens at all. `/` ranked 763rd today and finds nothing
  under the new design.

Some operator pages are also titled by category, not by symbol: `<` is
documented on "Comparison".

A likely approach is to map each operator to words at both ends. At index
time, the symbols field would carry a spelled-out alias as well as the
symbol, such as `<` → `less-than`, `&` → `ampersand concatenation`. At query
time, a query made only of operator characters would be rewritten to the
same alias before tokenising. This needs its own measurement (operator
queries as ground truth, and a check that aliases like "less" don't crowd
prose) and a decision on where the alias table lives. The package API or the
symbol index is the natural place, so it is not a list maintained by hand.
