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
queries that changed rank between two configurations. The harness is in the
session scratchpad for now; see the last open question.

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

### 2. A `symbols` field built from the symbol index

- Each entry gets `"symbols": "<names…>"`: the bare name and the
  `Container.Name` form of every symbol in `tB/symbols.json` whose URL is the
  entry's `relUrl` (ignoring a trailing slash or `index`). With the current
  corpus, 4,084 of 6,713 entries get one.
- In the build, `searchData` also waits for `symbolIndex`. Both already run
  on the main thread after `renderJoin`. `symbolIndex` returns its symbols,
  and `searchData` joins them by URL before it writes. Workers keep deriving
  sections as they do now; the join is a map lookup per entry.
- `renderEntryString` adds the field only when it is non-empty, so a page
  with no symbols produces the same bytes as before.
- In the client, `this.field('symbols', { boost: 50 })`. The title keeps 200
  and content keeps 2.

### 3. Query construction

In the client's `update()`, for each token the tokenizer produces:

- **Smart dot split.** Keep the whole token as a term with boost 10, as
  today. Where a `.` sits between identifier characters on both sides
  (`/(?<=[A-Za-z_]\w*)\.(?=[A-Za-z_])/`), also add the parts as extra terms,
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
so it needs the `symbols` field too. It uses the query code in `update()`
unchanged, so it inherits the query changes. Either keep one source for the
index setup, or add a check that the two field lists agree, so they cannot
drift apart.

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
5. **Regression fix.** Whatever the measurement picks for the 38 queries.

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
