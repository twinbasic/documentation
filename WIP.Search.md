# twinBASIC Documentation — Site search design notes

Why searching for a member such as `PaintPicture` does not find it, what was
measured, and the design that fixes it. Companion to
[builder/PLAN-6.md](builder/PLAN-6.md) §5.3, which describes the search-data
generator as ported from Jekyll.

Like WIP.md, this file is not rendered through tbdocs, so literal dashes are fine here.

## Resuming this work

Everything needed to continue is in this file and in `eval/`; nothing
depends on the session that wrote it.

**Where it stands.** Rollout steps 1–5, two reader-intent rounds, the
index pilot, the qualified-name round, the title-heading fix, the stem
twins, the same-page ground truth, a fix for lunr inventing words, and
the whole-title round (two eval sets, the re-rank, the plural rule) are
done and committed, on branch
`claude/paintpicture-docs-runtime-f3250d`, rebased onto `f8e630e5`.
Nothing is pushed. The working tree is clean; the last commit records the
whole-title round (item 3 under "Next").

| commit | step |
|---|---|
| `64e33f63` | this design doc |
| `0ce186db` | 1: the asterisk crash guard; the replica's tokenizer separator |
| `1c3edd94` | 2: `eval/search_quality.mjs` and its baseline |
| `897e48a3` | 3: h3 entries; `search.fold_headings` |
| `8a6db0b2` | 4: `names`/`qualified` fields; the smart dot split |
| `281fd978` | 5: stop words kept; dot runs split; lazy index build |
| `48b15c2e` | intent 1: `search_quality.mjs` judges bare names by reader intent |
| `6b9ada4a` | intent 3: exact-name and page-title fields, all words first, query tokens trimmed |
| `0c5f774c` | intent 4: `primary` names, non-word characters kept in exact names, kind words |
| `31f2d5b4` | pilot 1: prose queries can expect pages right behind (`behind`); ground truth intent-2 |
| `657d4296` | pilot 2: hand-marked index entries, and the first five |
| `f684f82c` | qualified names: `qualified` at 500, reached only by qualified names and word pairs |
| `03108b5a` | only a page's first heading can be its title (`Shape.Shape`, `Timer.Timer`) |
| `5d4f4e18` | stem twins held whole in `qualified` (`Printer.Fonts`) |
| `3b839326` | ground truth intent-3: a section of a symbol's page counts for it |
| `834e2bb5` | lunr's token-set keys separated: queries with the word `a` threw |
| `0b2dbd96` | the `New Functions` / `Form events` probes diagnosed and measured, not shipped |
| `2b8de7a9` | ground truth intent-4: page titles and page-plus-section queries in the eval |
| `3328881c` | a query naming a whole title scores ×3 |
| `03c90175` | a plural kind word doesn't make the other word a name |

Hit@10 went from 20.5% to 100%, and MRR from .182 to .997. By reader
intent, rank 1 is right for 99.9% of queries (89.0% before the intent
steps), every qualified name and all 20 prose queries are at rank 1, no
bare name is out of tier order, and no query got worse at any step.

The eval now also types every page's multi-word title (140 queries) and
`<page title> <section title>` for shared section titles (300). They
were at 87.9% and 22.7% at rank 1; after the whole-title round they are
at 97.9% and 96.7%. See [Fixed: whole titles](#fixed-whole-titles).

The remaining 23 rank-1 misses: 10 bare names (7 enum constants and 2
members, in
[What shipped, second round](#what-shipped-second-round-tiers-in-the-index),
and `MidB# twinBASIC Documentation — Site search design notes

Why searching for a member such as `PaintPicture` does not find it, what was
measured, and the design that fixes it. Companion to
[builder/PLAN-6.md](builder/PLAN-6.md) §5.3, which describes the search-data
generator as ported from Jekyll.

Like WIP.md, this file is not rendered through tbdocs, so literal dashes are fine here.

## Resuming this work

Everything needed to continue is in this file and in `eval/`; nothing
depends on the session that wrote it.

**Where it stands.** Rollout steps 1–5, two reader-intent rounds, the
index pilot, the qualified-name round, the title-heading fix, the stem
twins, the same-page ground truth, a fix for lunr inventing words, and
the whole-title round (two eval sets, the re-rank, the plural rule) are
done and committed, on branch
`claude/paintpicture-docs-runtime-f3250d`, rebased onto `f8e630e5`.
Nothing is pushed. The working tree is clean; the last commit records the
whole-title round (item 3 under "Next").

| commit | step |
|---|---|
| `64e33f63` | this design doc |
| `0ce186db` | 1: the asterisk crash guard; the replica's tokenizer separator |
| `1c3edd94` | 2: `eval/search_quality.mjs` and its baseline |
| `897e48a3` | 3: h3 entries; `search.fold_headings` |
| `8a6db0b2` | 4: `names`/`qualified` fields; the smart dot split |
| `281fd978` | 5: stop words kept; dot runs split; lazy index build |
| `48b15c2e` | intent 1: `search_quality.mjs` judges bare names by reader intent |
| `6b9ada4a` | intent 3: exact-name and page-title fields, all words first, query tokens trimmed |
| `0c5f774c` | intent 4: `primary` names, non-word characters kept in exact names, kind words |
| `31f2d5b4` | pilot 1: prose queries can expect pages right behind (`behind`); ground truth intent-2 |
| `657d4296` | pilot 2: hand-marked index entries, and the first five |
| `f684f82c` | qualified names: `qualified` at 500, reached only by qualified names and word pairs |
| `03108b5a` | only a page's first heading can be its title (`Shape.Shape`, `Timer.Timer`) |
| `5d4f4e18` | stem twins held whole in `qualified` (`Printer.Fonts`) |
| `3b839326` | ground truth intent-3: a section of a symbol's page counts for it |
| `834e2bb5` | lunr's token-set keys separated: queries with the word `a` threw |
| `0b2dbd96` | the `New Functions` / `Form events` probes diagnosed and measured, not shipped |
| `2b8de7a9` | ground truth intent-4: page titles and page-plus-section queries in the eval |
| `3328881c` | a query naming a whole title scores ×3 |
| `03c90175` | a plural kind word doesn't make the other word a name |

Hit@10 went from 20.5% to 100%, and MRR from .182 to .997. By reader
intent, rank 1 is right for 99.9% of queries (89.0% before the intent
steps), every qualified name and all 20 prose queries are at rank 1, no
bare name is out of tier order, and no query got worse at any step.

, in [Same-page sections count](#same-page-sections-count)),
3 page titles and 10 page-plus-section queries, listed in
[Fixed: whole titles](#fixed-whole-titles).

**The index pilot held up.** The user asked whether ranking tweaks are an
uphill battle, since a book's index is marked by hand. The conclusion,
which the user accepted: symbol lookups are not uphill (`names`,
`qualified` and `primary` are already a hand index, generated from
`tB/symbols.json`), but jargon is, because no ranking can find a page for
words it doesn't contain. So authors now mark index entries by hand, and
five entries put the three remaining prose misses at rank 1 with nothing
worse. How it works, what it cost and what was measured on the way is in
[What shipped, third round](#what-shipped-third-round-the-index-pilot).

**Qualified names are done.** The user chose them before a wider index
pass. `qualified` now weighs 500, and only qualified names reach it,
typed with a dot or as two adjacent words: 423 queries better, none
worse, and 99.8% of qualified queries at rank 1 (91.5% before). The last
9 followed: 2 member headings the build took for the page's title, and 7
siblings the stemmer merges (`Printer.Font` / `Printer.Fonts`). All 5108
qualified names are now at rank 1, typed with a dot or as two words.

**Next.**
1. ~~The 9 qualified misses left.~~ Done; see
   [the title-heading fix](#fixed-a-member-heading-taken-for-the-page-title)
   and [the stem twins](#fixed-stem-twins).
2. ~~The same-page ground-truth question.~~ The user ruled that a section
   of the page documenting a name counts; see
   [Same-page sections count](#same-page-sections-count).
3. ~~The whole-title fix.~~ Done, in the order below; see
   [Fixed: whole titles](#fixed-whole-titles). The user had decided:
   - **Ship both**, each its own commit with its measured numbers: the
     score ×3 for a result whose whole title, or page title plus title,
     reads the same as a query of two or more words; and plural kind
     words not making a name. In all three copies, as every client change.
   - **Add both sets to `eval/search_quality.mjs`** as ground truth: every
     page's own multi-word title (any entry of that page counts), and
     `<page title> <section title>` for the one-word section titles 20+
     pages share (that section counts). They are derived from the build,
     like the symbol queries, so no hand-approved targets are needed. This
     is a new ground truth (`intent-4`), with a re-saved baseline.

   Order, this session's suggestion: the eval sets first, as their own
   commit with no change to ranking, so each fix is then measured by the
   eval itself and not by throwaway scripts. Then the ×3 re-rank, then
   the plural rule. `eval/search-experiments/probes/knobs.patch` holds
   the measured knobs (`title=F`, `plural`), and `sets.mjs` the set
   definitions to port. The re-rank needs `docs` in the replica's
   `search()` (the `load()` context has it; tests pass `{ lunr, index }`
   only, so decide how the re-rank behaves without it). Re-check the
   operator titles (`&, &=` find nothing) when porting the title set:
   leave them in and let them count as misses, or leave them out with a
   stated reason.
4. `&H80004005` finds none of the five pages that mention it. The search
   content keeps `&amp;` as an entity (`stripHtml` doesn't decode it), so
   the index holds `amp;h80004005` while the query trims to `h80004005`.
   The same is known for `&lt;`/`&gt;` (see "Operators"). A content fix in
   `builder/search.mjs`, to measure on its own.
5. Multi-word queries with a short word are slow: `a page` takes about
   820 ms per search in the replica, `Form events` about 100 ms, on every
   keystroke. Until the lunr fix, `a` threw, so this was never seen; the
   eval's one-word queries take 0.4 ms. The likely cost is the all-words
   pass's REQUIRED stem wildcards (`a*` reaches thousands of terms). To
   measure in a browser and profile before changing anything.
6. The wider index pass, under the pilot's rules: an entry names the page
   a reader wants for that term, not a summary of the page; few entries
   per page; one main entry per term (the build enforces this). Agents
   draft candidate terms and targets, and **the user approves every
   target** before it goes into `eval/search_prose_queries.json`. Open
   questions:
   - Where the candidate terms come from. The glossary is a source of
     *terms*, never of targets. Every candidate needs a query in
     `eval/search_prose_queries.json` first, so an entry is measured, not
     assumed: the prose set is 20 queries and all now pass, so it no longer
     discriminates.
   - Only a term the page's own words can't find gets an entry. Check
     first where the term lands without one
     (`node eval/site_search.mjs "<term>"`).

**The user's criteria**, which govern every decision here:
- A reader either finds what they want or doesn't. A small regression is
  still a miss, and being better than the old index is not the bar: that
  index was nearly useless.
- Judge by what a reader typing the query wants. For a bare name the order
  is type names and language elements first, then members, then enum
  constants and similar, then prose. The order is a priority, not a filter:
  lower tiers must still appear.
- Configuration belongs in `docs/_config.yml`, not code (for example
  `search.fold_headings`).
- Ship in small steps, each committed on its own with its measured numbers.
- Existing links in the docs may be wrong or not the best. Treat them as
  leads, never as evidence of the right page, and don't derive test
  expectations from them. The glossary is a source of candidate *terms*,
  not of targets. List doubtful links for the user; don't fix them in
  passing, since which page is right is an editorial call.
- Fix what a tweak can fix first; use hand-marked index entries where the
  right page can't be found from its text. A tweak that happens to fix a
  handful of prose queries is overfitting, not a fix.
- Use Sonnet agents for mechanical and exploratory work.
- Review every agent's work before committing it. Agents have produced
  false explanations (see [X1t](#rejected-tier-specific-exact-fields-x1t)),
  a lookbehind regex that would break the whole client on Safari before
  16.4, and a loading message that blanked on the second keystroke.

**Tools.**
- `node eval/search_quality.mjs --compare eval/search_baseline.json --worst 20`
  measures a build against the saved baseline; `--save` updates it;
  `--failures N` lists what misses rank 1, by category and tier. The
  baseline records its ground truth (`intent-4`).
- The eval's symbol queries are one word each; its page-title and
  page-plus-section sets are its only multi-word queries. So for any
  change to the all-words pass, also rank every qualified symbol written
  as two words (`FileListBox Name`) with the committed replica and the
  candidate: `eval/search-experiments/probes/spaced.mjs`, run once
  against a copy of the committed `site_search.mjs`.
- `eval/site_search.mjs` is the replica of the client search. The site's
  client and `builder/offline.mjs`'s `initSearch` must stay identical to it;
  `test/search.test.mjs` fails if their fields or pipeline drift apart.
- Build first with `node builder/tbdocs.mjs --src docs --no-check --no-offline --no-pdf`.
- The research scripts and their records are in
  [eval/search-experiments/](eval/search-experiments/README.md).
- Measure a candidate change with temporary knobs in the replica (an `EXP`
  environment variable read by `eval/site_search.mjs`), then restore the
  file from git and write the chosen version cleanly into all three
  copies.
- Check anything in the client in a real browser. `.claude/launch.json` has
  `docs-serve` (port 4001) and `docs-offline` (port 4002; build without
  `--no-offline` first). The client runs `update()` on `keyup`, so browser
  tools that insert text without key events don't trigger search; setting
  the box's value and dispatching a `keyup` from script does, and is the
  quick way to compare many queries with the replica. A hidden pane pauses `requestAnimationFrame`;
  the client has a timer fallback for that.
- `test.bat` stops at `check_axe_patch_equiv.mjs` in a worktree without
  `node_modules`. Run `npm install` first for the full suite.
- In some agent shells `cmd` reports `test.bat` and `check.bat` as "not
  recognized", even from the worktree. Their gates are plain `node`
  commands; run them in order, and rebuild the way `build.bat` does
  first, since `check_tree_fresh.mjs` refuses a tree older than any
  edited file.

**How lunr behaves here, learned the hard way:**
- The tokenizer tests one character at a time against `separator`, so a
  multi-character alternative in the separator regex can never match.
- The index pipeline is trimmer, stop-word filter, stemmer; the search
  pipeline is only the stemmer. The stop-word filter is now removed.
- BM25's length normalisation makes a short entry that mentions a term beat
  a long entry about it. Tuning `b` doesn't help short of `b` = 0.
- A query of only `*` throws inside lunr.
- A clause's `boost` cancels out when it is the only clause on a field:
  lunr divides each field's score by the query vector's magnitude *for
  that field*. Weight such a field with its index-time field boost.
- A clause names every field unless it says otherwise, so a wildcard
  clause also searches helper fields such as `exact`.
- A wildcard term is not stemmed usefully: `operator*` misses the index's
  `oper`. Stem first, then add the wildcard, with `usePipeline: false`.
- The index trims non-word characters from token ends (`Date$` → `date`);
  the query side didn't, until the intent step. A name that must keep them
  (`#If`, `<>`) has to spell them as word characters.
- A REQUIRED clause names every field too, so it scores in helper fields
  such as `exact` unless it is given the text fields. That leak once put
  `With statement` first by accident, and pushed `error handling` down.
- BM25 compares a field's length with that field's average over *every*
  entry, empty ones included. A field that is empty on nearly every entry
  has an average near zero, so a match in it counts for almost nothing,
  and counts for more as more entries fill it. The pilot's `index` field
  pins its average at 1 (`pinIndexFieldLengths`).
- Every field costs a slot on every term of the whole index, not just on
  the entries that use it: `add()` creates an empty object per field for
  each new term. Three sparse fields took 24 MB more heap; one takes 5 MB.
  Prefer encoding a variant inside one field (the pilot's secondary
  entries carry one more `_`) to adding a field.
- A trailing wildcard completes a plain word to every token it begins,
  including whole qualified names: `form*` reaches every `form.*` in
  `qualified`. Harmless at a low field boost, it lifts a container by its
  member count at a high one.
- A REQUIRED clause matches if the term is in *any* of its fields, and it
  scores as well. To require a word without scoring it in some field,
  give the REQUIRED clause boost 0 (its terms enter the query vector at
  zero weight) and score with a second, optional clause.
- lunr 2.3.9's token set can invent words and lose real ones: its
  minimisation keys nodes by `TokenSet#toString()`, which runs edge labels
  into child ids (`{1 -> 656}` and `{1 -> 6, 5 -> 6}` are both `01656`).
  Whether it happens depends on the whole term set, so any content or
  field change can start it. Patched; see "Fixed: lunr invented words".
  Check a candidate change with every title as a query, not only the
  eval, since the eval never typed `a`.

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
  "Worse than the original baseline" turned out to be the wrong criterion:
  that index was nearly useless, so its rank 1 was often not what a reader
  wanted. These 18 and the rest of the work list are now judged by reader
  intent; see [Reader intent](#reader-intent-after-the-rollout).

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
- Stop words stay in the index, and to offset the cost the index is built
  lazily, on the first keystroke rather than on focus, with a visible
  loading message.
- Results are judged by reader intent, not against the old baseline. For a
  bare name the tiers are type and language element, then member, then enum
  constant, then prose, as a priority order.
- Operators are future work, after the reader-intent fixes.

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

## Reader intent (after the rollout)

Steps 1 and 3 of "Next steps" below are done; see "What shipped" at the
end of this section. The measurements between here and there are the
research that led to it, kept as it was.

### The criterion

A reader either finds what they want at the top or doesn't, so "small
regressions" are not acceptable, and neither is the pre-rollout baseline as
a reference: that index was nearly useless. A result is judged by what a
reader typing the query most plausibly wants. Rank 1 is the measure that
matters; hit@10 and MRR are secondary.

The first ground truth (`eval/search_quality.mjs`) counts a bare name as
correct if *any* page documenting that name is hit. That is too lax: for
`CheckBox` it accepts `DTPicker › CheckBox`, but the reader wants the
CheckBox control.

### The intent ground truth

For a bare name, the expected results are ordered by tier. Higher tiers
come first, and lower tiers must still appear below them; nothing is
excluded:

1. **Type names and language elements.** A type is a class, control, module,
   enum, interface or package. A language element is a statement, keyword,
   operator, attribute or directive with no package, or a function or
   property whose container is a module (so `Time$` → DateTime's `Time`, and
   `Left` → the Strings function, not the `Left` property of 30 controls).
2. **Members** of classes.
3. **Enum constants and similar** (`vbForm` → `ControlTypeConstants`).
4. **Prose.**

The primary metric is a top-tier answer at rank 1; where a name has several
top-tier answers, any of them counts. Secondary: recall of every same-name
symbol URL in the top 10 and top 20, and tier-order violations, which is a
lower-tier exact-name result ranked above a higher-tier one. Near-name
matches (`Nodes` for `Node`) are related, not violations, but must not
outrank any exact-name match. Qualified `Class.Member` queries expect that
member, as before. Prose queries expect the dedicated page, not a summary
section that only links to it.

Of the 2,884 bare names: 318 are types, 453 language elements, 1,132 enum
constants and 981 member-only. 115 have a doubtful expectation, listed by
the script: mostly statements with several pages (`For` has For...Next and
For Each...Next; `GoSub`, `On`, `Input`), plus `Line` and `Timer`, where a
type outranks a same-named statement or enum and either could be argued.

Implemented in
[eval/search-experiments/intent/intent_gt.mjs](eval/search-experiments/intent/intent_gt.mjs).
It still needs promoting into `eval/search_quality.mjs` as the primary
ground truth.

**Prose ground truth, reviewed.** The expectations for `64-bit
compilation`, `Fusion`, `symbol index` and `array bounds checks` are right,
so their misses are ranking problems. `conditional compilation` is doubtful:
it expects `/Reference/Compiler-Constants`, but `/tB/Core/Topic-Preprocessor`
(the `#If`/`#Const` page) is arguably the better answer, and the glossary's
"conditional compiler constant" entry links there twice. Not changed yet;
decide, then edit `eval/search_prose_queries.json`.

### Where the committed design stands under it

Measured at commit `281fd978`, with intent ground truth: hit@1 89.0% of
8,012 queries. Failing at rank 1:

- **bare names**: 193 of 2,884 (6.7%):
  - 86 language elements. `Default`, `Description`, `Flags` lose to Core's
    shared Attributes page; the operators can't be found at all (see
    [Operators](#operators)).
  - 55 types: `Line`, `Timer`, `FileSystem`, `Anchors`, `BorderStyle`.
  - 25 enum constants: `vbDate`, `vbForm`, `vbListBox`, `vbKey0`…`vbKeyA`.
  - 27 member-only names.
- **qualified**: 682 of 5,108 (13.4%), mostly VBA constants: `Constants.vbCr`,
  `.vbCrLf`, `.vbLf`.
- **prose**: 10 of 20 at rank 1. `late binding` ranks 17, `circular
  reference` 14, `regular expressions` 13.

### Three fixes, measured

Each was a client-side change to a copy of the replica,
[eval/search-experiments/intent/variants.mjs](eval/search-experiments/intent/variants.mjs),
measured by `eval_variants.mjs` beside it.

- **X1, an exact-name field.** It fixes an exact name losing to a longer or
  plural one (`Node` to `Nodes`, `ListItem` to `ListItems`, `vbForm` to
  `vbFormCode`), and `Time$`, whose `$` the index trims but the query keeps.
  At index-build time, every name in the doc's `names` field is lowercased and
  suffixed with `_` into a field `exact`: `node_`, `time$_`, `vb_`. At query
  time, for each whitespace token, the term `token + "_"` is added on `exact`
  only, with no wildcard. Checked against lunr.min.js: the trimmer keeps `_`
  as a word character, and every Porter stemmer rule anchors on the end of
  the word, so a trailing `_` passes through untouched. It's derived in the
  browser, so the download doesn't grow. Boosts from 50 to 1000 give the same
  result, because nothing else matches that field.
- **X2, a page-title field.** Index each entry's `doc` (its page's title) as
  a field `page`. Then a page whose own title matches the query outranks a
  summary section on another page (`Features › Fusion` against the Fusion
  page). Boosts from 5 to 50 give the same result.
- **X3, all words first.** With 2+ whitespace tokens, first query with every
  token REQUIRED (each via its wildcard form, so an exact or a prefix match
  satisfies it; the exact and dot-split clauses stay optional). If that finds
  nothing, fall back to the current query. It doesn't move the aggregate,
  but it is the only fix for `symbol index` (rank 39 → 3): the `Index`
  property pages never contain "symbol".

| configuration | hit@1, old ground truth | hit@1, intent |
|---|---|---|
| committed (`281fd978`) | 89.5% | 89.0% |
| X1 | 90.1% | 89.5% |
| X2 | 92.3% | 91.8% |
| X3 | 89.5% | 89.0% |
| X1t (tiered exact fields, below) | 90.0% | 89.3% |
| X1 + X2 | 92.9% | 92.4% |
| **X1 + X2 + X3 (recommended)** | **92.9%** | **92.4%** |

With the recommended combination, and intent ground truth:
- **Rank 1:** bare names 94.9% (99.0% in the top 10), qualified 91.1%,
  prose 50% (85% in the top 10).
- **No query gets worse:** 353 improve under intent ground truth, 344 under
  the old one.
- **Tier ordering:** recall of same-name pages is 92.4% in the top 10 and
  97.6% in the top 20; 41 queries order tiers wrongly, against 42 before.
- **Cost:** index build 1,533 ms against 1,359 ms (+13%), heap 291 MB
  against 263 MB (+11%), from 7 interleaved runs of this experiment. It's
  paid only when a reader starts searching, because of the lazy build. The
  heap figures may undercount: the script let the index go out of use
  before its second reading, so V8 could collect it early. That's fixed in
  the committed copy; re-measure before relying on them.

**The 18**, with their rank for the intent answer, before → after X1 + X2 + X3:

| query | rank |
|---|---|
| `symbol index` | 39 → 3 |
| `Time$` | 7 → 1 |
| `Column` | 3 → 1 |
| `PropertyPage` | 2 → 1 |
| `ListItem` | 2 → 1 |
| `Node` | 2 → 1 |
| `ToolWindow` | 2 → 1 |
| `CheckBox` | 4 → 2 |
| `VB` | 16 → 11 |
| `Lock`, `64-bit compilation` | 3, unchanged |
| `vbForm`, `vbListBox`, `ListImage`, `ColumnHeader`, `array bounds checks`, `Fusion` | 2, unchanged |
| `conditional compilation` | 6, unchanged |

### Rejected: tier-specific exact fields (X1t)

**Later superseded:** this was measured while a lone clause's boost
cancelled out, so it never had a fair test. Done with field boosts, as the
`primary` field, it took tier-order violations to zero; see "What shipped,
second round".

Splitting `exact` into `exact1`/`exact2`/`exact3` by symbol kind, with
descending boosts, measured no better than flat X1 (hit@1 90.0% against
90.1%) and ordered tiers worse (48 violating queries against 42). It would
also need the build's join to emit each symbol's kind, which it doesn't
today. Don't rebuild it without a new idea.

The agent that measured it blamed the CheckBox control's `names` field for
"listing every member". **That's false.** Both entries' `names` are the
single word `CheckBox`. The real difference: the CheckBox page's top entry
(`/tB/Packages/VB/CheckBox/`) has **1 character** of content, while
`DTPicker › CheckBox` has 467 characters that mention "checkbox" several
times. A class's introduction evidently sits under its own heading
(`#checkbox-class`), which leaves the page's top entry empty. This is the
lead for `CheckBox` and probably for the other types that miss (`Line`,
`Timer`, `BorderStyle`): look at how a page's top entry and its first
section are split, and consider merging an empty top entry into the first
section, or giving it the page's introduction.

### What shipped

Implementing X1 + X2 + X3 as measured made 14 queries worse, so it was not
shipped as measured. Four corrections, each measured, took that to none:

1. **X3's required terms were wrong.** The experiment required each raw
   whitespace word, neither lowercased nor split like the index, so every
   capitalised or hyphenated phrase silently fell back to the old query.
   Lowercased properly, `AddressOf operator` and `64-bit compilation` then
   vanish, because `operator*` can't match the stem `oper`. Shipped: each
   lunr token is required as its stem plus a trailing wildcard, with
   `usePipeline: false`. Prose rank 1 went from 10 to 16 of 20.
2. **X1's boost never did anything.** A clause alone on a field has its
   boost divided back out (see "How lunr behaves here"), which is why
   50–1000 measured the same. Shipped: field boost 50 on `exact`; the
   other clauses name every field but `exact` (otherwise `node*` matches
   `nodes_`); `exact` is queried only for a one-word query (`error
   handling` had lost its answer to `Error`); and `exactName()` drops a
   trailing `$`, so `Format`/`Format$` isn't marked down as a longer field.
3. **X2's boost is 5, not 20.** At 10 or 20 the `Folder` page outranks
   `Folder.Parent` and `Folder.Path`, which are documented on
   `FileSystemItem`.
4. **Query tokens are trimmed as the index trims them** (`lunr.trimmer`).
   This fixed 8 `Xxx$` qualified queries that X2 had made worse, found
   every bare `Xxx$` function that was unfindable, and subsumes the
   asterisk guard, since an all-`*` token trims to nothing.

Measured against the intent baseline (`48b15c2e`):

| | before | after |
|---|---|---|
| hit@1 | 89.0% | 93.5% |
| bare / qualified / prose hit@1 | 93.3% / 86.6% / 10 of 20 | 97.0% / 91.5% / 16 of 20 |
| hit@10 | 97.9% | 98.5% (prose 20 of 20) |
| names out of tier order | 45 | 19 |
| queries worse / better | | 0 / 418 |
| index build, heap | 1,538 ms, 251 MB | 1,625 ms, 280 MB |

The cost row is 7 interleaved builds and one heap reading per process,
three processes each. Both client copies were checked in a browser against
`eval/site_search.mjs`: the same top three for 15 queries, and `*` shows
"No results found".

Still missing rank 1 (522 queries): 70 language elements (the 24
operators; the `Def*` statements, rank 2; `Left`/`Left$` at 42, below 40
controls' `Left` properties; `Right`, the `B`/`W` string functions;
`#If`/`#Const`/`#Else`; `Default`, `Description`, `Flags`), 7 types
(`BorderStyle` 23, `WindowState` 5, `StartupPosition` 5), 7 enum constants
(`vbDate`, `vbForm`), 2 members, 432 qualified (mostly `Constants.vbXxx`,
rank 2) and 4 prose.

### What shipped, second round: tiers in the index

The step-4 failures sorted into four mechanisms, measured one at a time:

1. **Same-name entries of different tiers tied, and length decided.**
   `Left`, `Right`, `BorderStyle`, `WindowState`, `StartupPosition`,
   `Next`, `Default`, `Month`, `Print`, `Lock`: the function, enum or
   statement and the members all matched `exact` equally, and BM25 then
   favoured the short member entries. An enum page lost further, since its
   `exact` also held every constant's name. Fixed with a `primary` field:
   the build's join lists the names that are types or language elements
   (`isPrimarySymbol` in `builder/search.mjs`), and the client indexes
   them as exact names at field boost 1000. This is X1t done right: X1t was
   measured when clause boosts cancelled out, so it never had a fair test.
   Boost 200 left 9 names out of tier order; 500 left 2; 1000 leaves none.
2. **`#If`, `#Const`, `#Else` lost their `#`** to lunr's trimmer and
   matched the `If` function. `exactName()` now spells every non-word
   character as `_` and its hex code (`#if` → `_23if_`), so they stay
   distinct. So do `Time$` against `Time` and `Error$` against the `Error`
   statement, which dropping `$` had merged, and the 24 operators (`<>`,
   `&=`, `*`) become findable: the exact-name clause runs even when a
   query leaves no tokens.
3. **REQUIRED clauses searched every field** (see "How lunr behaves
   here"). Restricted to the text fields.
4. **`With statement` then fell to 2**, because its rank 1 had come from
   that leak. Fixed properly: a query names one thing if it has one word,
   or one word besides words naming a kind (`KIND_WORDS`, the kinds in
   `tB/symbols.json` less `enumvalue`). `error handling` still names
   nothing.

Against the previous baseline: 53 queries better, none worse.

| | before | after |
|---|---|---|
| hit@1 | 93.5% | 94.1% |
| bare hit@1 / hit@10 | 97.0% / 99.1% | 98.8% / 100% |
| language / type hit@1 | 85.3% / 97.8% | 94.7% / 100% |
| names out of tier order | 19 | 0 |
| search-data.json | 4,784 KB, 1,173 KB gzip | 4,807 KB, 1,177 KB gzip |
| index build, heap | | +5–6%, 280 → 288 MB |

Both clients were checked in a browser against the replica (15 queries,
same top three; `**` shows "No results found", no console errors).
`test/search.test.mjs` now compares `exactName()` and `KIND_WORDS` by
behaviour across the online client and the replica, and a mutation of the
replica's `exactName()` fails it.

Left at rank 1's door (470 queries):
- **25 language elements, all at rank 2, behind a section of the same
  page**: `DefInt` → `Deftype#defbool-defbyte-defint-…` above `Deftype`;
  `AscW` → `Asc#asc-ascb-ascw` above `Asc`. The reader lands on the
  definition either way, so this looks like a ground-truth artifact
  (the symbol's URL is the page; the heading that names it is a section).
  Not changed: whether a page-level symbol should accept its own sections
  is a ground-truth decision, to be made on its own.
- 7 enum constants and 2 members, all at rank 2 (`vbForm`, `vbDate`).
- **432 qualified**: 246 at rank 2, but 24–26 deep for members of
  `Slider`, `MonthView`, `ProgressBar`, `UpDown` and similar.
- 4 prose: `late binding` 5, `conditional compilation` 3, `64-bit
  compilation` 3, `symbol index` 3. Index-pilot material.

### What shipped, third round: the index pilot

Decided with the user: entries live in the page, not a central file, so an
entry moves with its text and a renamed heading can't strand it. A page
takes `index:` / `index_also:` in its frontmatter (a term or a list); a
heading takes `{: index="a; b" }` / `{: index_also="..." }`, like a pinned
id. `index` is the main entry, where a reader of that term wants to land
first; `index_also` a strong second answer. Documented for authors in
`docs/Documentation/Authoring.md`, "Index entries for the site search".

**Build.** `render.mjs`'s `searchIndexMarksPlugin` runs after `header-id`,
takes both attributes off every heading into `env.searchIndexMarks` as
`{ id, index, index_also }`, and throws on either attribute anywhere
else, since it would be published and do nothing. `search.mjs` gives each
section the ids of every heading it holds (its own, deeper ones and folded
ones), attaches heading marks by id and frontmatter marks to the page's
own entry, and emits `index` / `index_also` as JSON lists. On main,
`checkIndexTerms` throws when two entries claim one term as `index`
(compared without case, a hyphen counting as a space).

**Client**, in all three copies:
- One lunr field `index`, boost 1000. Each term is one token: its words
  tokenized, trimmed and stemmed as the index holds words, joined by `_`,
  with `_` appended (`late_bind_`). A secondary term has one more `_`.
- The query adds, for every run of up to four consecutive words, that
  run's key at clause boost 5 and the key plus `_` at boost 1, on `index`
  only. So a term matches only a query that names all of it, alone or
  among other words: `binding` alone doesn't match `late binding`.
- The terms are appended to the entry's content as plain words, so the
  all-words-first pass, which requires every word in the text fields,
  still finds a marked entry.
- `pinIndexFieldLengths` sets the field's average length to 1 (see "How
  lunr behaves here").

**The five entries.** Pages were read to place them (a Sonnet survey,
checked against the pages); existing links were leads only. It found no
doubtful links for these terms.

| term | `index` | `index_also` |
|---|---|---|
| conditional compilation | `/tB/Core/Topic-Preprocessor` (page) | `/Reference/Compiler-Constants` (page) |
| late binding | `/Reference/Data-Types#object` | `/tB/Modules/Interaction/CreateObject` (page) |
| 64-bit compilation | `/Features/64bit` (page) | |

`symbol index` needed none: the user ruled that Permanent-Links'
definition counts as well as Building's section (pilot 1), and the
definition ranks first on its own text.

**Measured on the way.**
- As first built, with two fields and no length pin, the entries barely
  moved anything (`late binding` 5 → 2, the other two unchanged). The
  cause was BM25's average length for a nearly empty field; with the pin,
  all three went to rank 1.
- Boosts, main/secondary: 1000/200 and 200/50 both put the three at rank
  1, but only 1000/200 keeps CreateObject right behind Data-Types for
  `late binding` (at 200/50 the `Bind` method comes between). 100/20 left
  `late binding` at 2; 50/10 and 20/5 fixed nothing.
- Weighting longer word runs higher changed nothing, so it was dropped.
- Two fields plus a words field cost 24 MB of heap (288 → 312 MB); the
  words in `content` brought that to 10 MB, and one field for both levels
  to 5 MB (287 → 292 MB), with identical results.

Against intent-2's baseline (`31f2d5b4`):

| | before | after |
|---|---|---|
| hit@1 | 94.15% | 94.18% |
| prose hit@1 | 17 of 20 | 20 of 20 |
| prose, `behind` page within 3 | 0 of 1 | 1 of 1 |
| queries worse / better | | 0 / 3 |
| search-data.json | 4,807 KB, 1,177 KB gzip | 4,810 KB, 1,178 KB gzip (mostly the new Authoring section) |
| index build, heap | 287 MB | +3–8%, 292 MB |

Both clients were checked in a browser against the replica: the same top
three for 15 queries, `**` shows "No results found", no console errors.
`test/search.test.mjs` covers the marks' path from page to entry, the
render rule, the one-main-entry check, and the client patch by behaviour;
mutating the replica's key, secondary suffix, words in content or length
pin each fails it. `test.bat`, `check.bat` and a checked build pass.

The boosts sit in the client beside every other boost, not in
`docs/_config.yml`: the client reads no site config today.

### What shipped, fourth round: qualified names

Decided with the user: qualified names before a wider index pass.

432 qualified queries missed rank 1: 338 at 2–5, 92 at 20–27. Every entry
already held the right token (`qualified` keeps `FileListBox.Name` whole,
and the query keeps it whole beside its parts), so this was weighting,
not recall:
- **The container's page came first** (333, most at rank 2):
  `FileListBox.Name` → the FileListBox page, whose title matches
  `filelistbox` at boost 200, above `#name`, whose `qualified` match
  counted at 50.
- **Headings naming several members fell furthest**: `Slider.KeyDown`,
  under `KeyDown, KeyPress, KeyUp`, came 20th, behind every other
  control's single `KeyDown`, since BM25 discounts its three-name title
  and `names`.

Measured with knobs in the replica, against intent-2's baseline:

| `qualified` boost | plain words complete in `qualified` | hit@1 | worse / better |
|---|---|---|---|
| 50 (before) | yes | 94.18% | |
| 200 | yes | 98.83% | 1 / 421 (`vbFile` 1 → 2) |
| 1000 | yes | 99.41% | 4 / 423 (`error handling` 1 → 3, `System`, `TextAlign`, `vbFile`) |
| 300 | no | 98.93% | 0 / 423 |
| 500, 700, 1000 | no | 99.46% | 0 / 423 |

The regressions all came from one mechanism: a plain word completing in
`qualified` by the trailing wildcard, to every member of each container
whose name it begins (`vbfile*` to all of `vbfileattribute.*`). At boost
50 that was noise; at 500 it pulled a container up by the number of its
members. So only a token with a split dot may complete there.

The eval's symbol queries are one word each, so two-word queries were
checked separately, on probes (`Form events`, `ListView events`,
`TextBox properties`, `Printer object`, `DTPicker format`, `Slider value`,
`FileListBox Name`, `Debug Print`, ...) and on every qualified symbol
written as two words (`FileListBox Name`, 5108 queries, not saved as
ground truth). The boost alone lost a good section from the top three on
five probes, through the same mechanism in the all-words pass's REQUIRED
clauses (`form*` completing to every `form.*`):

| two-word variant | spaced hit@1 | worse / better than before | probes |
|---|---|---|---|
| before | 97.75% | | |
| boost 500, REQUIRED unchanged | 98.84% | | 5 worse |
| REQUIRED off `qualified` | | 36 gone from the results | fixed |
| REQUIRED over all, scored off `qualified` | 96.93% | 45 / 0 | fixed |
| the same, plus word pairs | 99.82% | 0 / 106 | fixed or better |
| the same, pairs also completing | | | `File I/O` 1 → 2 |

Taking `qualified` out of the REQUIRED clauses lost entries that name
their container nowhere else (`_HiddenModule Input`,
`CefEnvironmentOptions LogFilePath`), so presence and score are split: a
REQUIRED clause over every text field at boost 0, which only decides who
qualifies, and a second clause that scores the word off `qualified`.
lunr ORs a REQUIRED clause's fields and adds boost-0 terms to the query
vector at zero weight, so this changes no presence and no other score.
Without `qualified`, though, two words naming a member (`FileListBox
Name`) had nothing tying them together, so every two adjacent plain words
are also a term on `qualified`, joined with a dot, at clause boost 10.

**Shipped**, in all three copies: `qualified` at boost 500; plain words
complete in the text fields less `qualified`; word pairs on `qualified`;
the REQUIRED split. Against intent-2's baseline (`063ed786`'s):

| | before | after |
|---|---|---|
| hit@1 | 94.18% | 99.46% |
| hit@10 | 98.83% | 99.98% |
| MRR | .9627 | .9972 |
| qualified hit@1 / hit@10 | 91.5% / 98.2% | 99.8% / 100% |
| bare hit@1, prose, tier order | 98.8%, 20 of 20, 0 out | unchanged |
| queries worse / better | | 0 / 423 |
| two-word qualified (not in the baseline) | 97.75% | 99.82%, 0 worse |
| search-data.json, heap | | unchanged: no new field or term |

Both clients were checked in a browser against the replica: the same top
three for 15 queries, `**` shows "No results found", no console errors.
`test/search.test.mjs`'s qualified-name guard checks the online client's
clauses by pattern and the replica by behaviour; each of five mutations
(boost 50, plain words completing in `qualified`, no pairs, the REQUIRED
clause scoring in `qualified`, the REQUIRED clause off `qualified`) fails
it.

Left at rank 1's door, 9 qualified queries:
- **7 stemming collisions between siblings**: `Global.Printers` →
  `Printer`, `OLE.Update` → `Updated`, `Printer.Fonts`, `Report.Page`,
  `Collection.Item` → `Items`, and `GetHeaders` on both
  `WebView2*Headers`. Porter stems both names alike, so they tie. For bare
  names `exact` fixed this; a qualified equivalent is the next tweak.
- **2 with no entry**: `Shape.Shape` and `Timer.Timer`. The member's
  heading (`### Shape`, `### Timer`) reads the same as the page's title,
  and the search-data build takes it for the title, so there's no
  `#shape` entry for the symbol's URL to match. Fixed next.

The 7 collisions are fixed in [Fixed: stem twins](#fixed-stem-twins).

### Fixed: a member heading taken for the page title

`extractSections` took *any* heading that read the same as the page's
title, with no prose before the first heading, for the title: that entry
got the page's URL and no prefix entry was made. On Shape and Timer the h1
is "Shape class" / "Timer class", so `### Shape` and `### Timer`, which
document the Shape and Timer properties, became the page's entry, and no
`#shape` / `#timer` entry existed. Now only the page's first heading can
be the title.

It changed four pages' entries, nothing else: Shape and Timer, and two
prose pages whose h1 differs from the title and whose second heading
repeats it (`Features/Standard-Library/New-Functions`, `Challenges/1`).
Those two now have an empty page entry beside the section, as 272 other
pages already do (every page whose h1 differs from its title). Neither
page's own query moved off it.

| | before | after |
|---|---|---|
| hit@1 / hit@10 | 99.46% / 99.98% | 99.49% / 100% |
| queries worse / better | | 0 / 2 (`Shape.Shape`, `Timer.Timer`: none → 1) |

Seen on the way, and predating it: `New Functions` puts
`ServiceState#new` first and the page second, because `functions` is a
kind word, so the query is taken to name `New`. Not changed: one probe is
not a measurement, and kind words were measured as a whole.

### Fixed: stem twins

`Printer.Font` and `Printer.Fonts` both stem to `printer.font`, so in
`qualified`, and everywhere else a query for either reached, the two tied;
`Printer.Fonts` came second. So did `Collection.Item`, `Global.Printers`,
`OLE.Update`, `Report.Page` and both `WebView2*Headers.GetHeaders`, and
the same seven written as two words (`Printer Fonts`). For bare names
`exact` had fixed this, but its clause matched nothing for a qualified
name: `exact` held only bare names.

Measured with knobs in the replica, against `03108b5a`'s baseline, and on
the throwaway set of every qualified name written as two words:

| variant | worse / better | two words, hit@1 | heap | new terms |
|---|---|---|---|---|
| before | | 99.86% | 292.8 MB | |
| every qualified name whole in `exact` | 0 / 7 | 99.86% (no clause for two words) | | 5108 |
| the same, plus word pairs whole on `exact` | 0 / 7 | 100% | 311.6 MB | 5108 |
| only the stem twins whole in `exact`, plus pairs | **2** / 7 | 100% | 293.1 MB | 104 |
| only the stem twins whole in `qualified`, plus pairs (clause boost 1, 10 or 100) | 0 / 7 | 100% | 293.1 MB | 104 |

- Every qualified name whole cost 19 MB of heap for 14 queries.
- Only the twins, but in `exact`, made the entries holding them longer in
  the field bare names are ranked by. `InStrB` fell from 1 to 2, behind
  its own section `Strings/InStr#instr-instrb`, and `MidB$` from 2 to 3,
  both BM25 length normalisation. (Both are the same-page question in
  "Next", but that is not decided.)
- In `qualified` the bare-name ranking can't move, and the result held at
  clause boosts from 1 to 100.

**Shipped**, in all three copies: `stemTwins()` finds the qualified names
whose stem another qualified name shares (104 names under 50 stems, mostly
a function and its `$` form: `strings.left` / `strings.left$`), and
`qualifiedField()` appends each twin an entry holds to its `qualified`
field as `exactName()` writes it (`printer_2efonts_`). The query adds, on
`qualified` at clause boost 10, every word with a dot in it and every two
adjacent words joined with a dot, as `exactName()` writes them. A whole
name that isn't a twin is in no field, so it matches nothing.

| | before | after |
|---|---|---|
| hit@1 | 99.49% | 99.58% |
| qualified hit@1 | 99.86% | 100% |
| every qualified name as two words, hit@1 | 99.86% | 100% (0 worse) |
| queries worse / better | | 0 / 7 |
| heap, index terms | 292.8 MB, 26,029 | 293.1 MB, 26,133 |
| index build | | within noise (7 interleaved builds, three processes) |
| search-data.json | | unchanged |

Both clients were checked in a browser against the replica: the same top
three for 15 queries (the seven twins, both ways where it applies,
`Shape.Shape`, `FileListBox Name`, `Form events`, `late binding`,
`PaintPicture`), `**` shows "No results found", no console errors.
`test/search.test.mjs` checks all three copies fill `qualified` through
`qualifiedField()`, compares the online client's `stemTwins()` and
`qualifiedField()` with the replica's by behaviour, and ranks twins in a
small index both ways; each of eight mutations (no whole-name clause, no
whole names in the field, no twins, no pairs or no dotted words whole, in
the replica; three in the online client) fails it. `test.bat`'s gates,
`check.bat`'s gates and a checked build pass.

Probes seen on the way, all predating this and unchanged by it: `Form
events` puts `/tB/Core/Event` first and `Form#events` second; `Fonts
property` puts `AmbientProperties/Font` first.

### Same-page sections count

Decided with the user: where a symbol's URL is a page, not a section of
one, any section of that page counts for it too. `DefInt` is documented
by the Deftype page, and its section headed `DefBool, DefByte, DefInt,
...`, which ranked first, lands the reader on the same definition; so do
`Chr#chr-chrb-chrw` for `ChrB` and `Left#left-leftb` for `LeftB`. Before,
only the page's own entry counted, so 24 queries sat at rank 2 behind a
section of the right page. `eval/search_quality.mjs` now judges by this,
as ground truth `intent-3`; it applies to bare and qualified names alike,
and not to prose, which already matched by path.

The change moved exactly those 24 to rank 1 and no other query's rank:
hit@1 99.58% → 99.88%, MRR .9978 → .9993.

`MidB$` stays a miss, rightly: its first result is the `MidB =` statement
(`/tB/Core/MidB-equals`), a different page, and the Mid function it names
is second.

### Fixed: lunr invented words

Found while measuring the probes above: the replica threw inside lunr
(`Cannot read properties of undefined (reading '_index')`) for 103 of
3,658 page and section titles, every one holding the word `a` (or
`&amp;`). So did both real clients: typing `a` left the results empty and
logged the error.

lunr's index keeps a token set of its terms for wildcard and fuzzy
matching. Built from this branch's terms, it held `amp;h80004001010`,
which no entry has, and lacked `amp;h80004001` and `amp;h80004005`, which
six pages have (`&H80004001` and `&H80004005`, since the content keeps
`&amp;`). A
trailing-wildcard clause reaching the invented word (`a*`, `am*`, `amp*`)
found no postings for it and threw.

The cause is lunr 2.3.9's `TokenSet.Builder#minimize`, which merges nodes
whose `TokenSet#toString()` match. That key is the final flag, then each
edge's label and its child's numeric id with nothing between: here
`{1 -> 656}` and `{1 -> 6, 5 -> 6}` (6 being the shared leaf) both keyed
as `01656`. Whether keys collide depends on the whole term set and on the
ids nodes happen to get. `f8e630e5`, built alone, doesn't collide; this
branch's added fields shifted the ids until it did. Rebuilding the token
set with a `,` after each id gives exactly the index's terms.

**Shipped**, in all three copies: `separateTokenSetKeys()` replaces
`TokenSet#toString()` with the separated key, installed once beside the
tokenizer wrapper. `toString()` is used only for these keys.

| | before | after |
|---|---|---|
| titles that throw, of 3,658 | 103 | 0 |
| token set vs index terms | 1 invented, 2 lost | identical |
| eval (8,012 queries) | | unchanged |
| index terms | 26,136 | 26,136; the token set differs by those three words (heap after: 293.3 MB, not measured apart from the rebase's new content) |

Both clients were checked in a browser against the replica: `a`,
`Removing a page`, `am`, `amp`, `&H80004005`, `Printer.Fonts`, `late
binding` and `PaintPicture` give the same top two, with no console
errors. `test/search.test.mjs`'s token-set key guard takes lunr's own
`toString()` from `lunr.min.js`, checks that a 494-word fixture built from
id 3 still collides with it (so the test says when a lunr upgrade changes
this), and that the online client's and the replica's keys keep the
fixture exact; each of five mutations (either key without its separator,
or any of the three copies not installing it) fails it.

### Fixed: whole titles

Diagnosed and measured with knobs first
(`eval/search-experiments/probes/`), as recorded below; then shipped as
the user decided, in three commits: the two sets as ground truth, the
×3 re-rank, and the plural rule. See "Shipped" at the end of this
section.

**Diagnosis.**
- `New Functions`: `ServiceState#new` (689) above the page (437).
  `functions` is a kind word, so the query names `New`, and the
  exact-name clause matches `new_` in the method's `exact`. The page
  matches both words in its title and `page`.
- `Form events`: `/tB/Core/Event` (210) above `Form#events` (151). The
  exact-name clause (`form_`) plays no part: the Form page's own entry
  lacks `event`, so the all-words pass drops it. `events` stems to
  `event`, the Event page's title (200) and name (100); `Form#events`
  has `form` only in `page` (5) and its URL.

**How widespread**, on two throwaway sets built from the site:
- *titles*: every page's own multi-word title typed as is (149): 84.6% at
  rank 1. The misses are a one-word symbol entry beating a page titled
  with both words (`Return Syntax` → `Return`, `Delegate Types` →
  `Delegate`), made worse where the other word is a kind word.
- *sections*: `<page title> <section title>` for the section titles 20+
  pages share, such as `DTPicker Properties` (300): 22.7% at rank 1,
  94.3% in the top three. In 182 of the 232 misses the page's own
  `X class` heading wins: it has `X` in its title (200), the section only
  in `page` (5).

**Measured** against the baseline (eval), both sets, and every qualified
name as two words (*spaced*):

| variant | eval | titles hit@1 | sections hit@1 | spaced | worse anywhere |
|---|---|---|---|---|---|
| now | | 84.6% | 22.7% | 100% | |
| plural kind words don't make a name | unchanged | 85.2% | 22.7% | 100% | 0 |
| `page` boost 10 / 20 / 50 | `Pointer` 6→7 (50: also `MidB$` 2→3) | 85.2–85.9% | 22.7–23.7% | 100% | 1–3 |
| whole title ×1.5 | unchanged | 90.6% | 55.7% | 100% | 0 |
| whole title ×2 | unchanged | 91.9% | 85.0% | 100% | 0 |
| whole title ×3 | unchanged | 91.9% | 95.0% | 100% | 0 |
| whole title ×5 / ×10 | unchanged | 94.0% | 96.7% | 99.59 / 99.55% | 21 / 23 spaced |
| **plural + whole title ×3** | unchanged | **94.0%** | **96.0%** | 100% | **0** |

*Whole title*: after lunr ranks, a query of two or more words multiplies
the score of every result whose title, or page title plus title, reads
the same as the query (compared as `indexTermKey()` writes both:
tokenized, trimmed, stemmed). It adds no index term and no field; the
keys are computed once per entry, on first use. At ×5 it goes wrong:
`_App Comments` lifts the `App` page's Comments section, since the
trimmer drops the leading `_`. ×3 leaves a margin.

With plural + ×3 both probes are at rank 1, and so are `ListView events`
and `TextBox properties`, from the qualified-name round's probes; every
other probe is unchanged. Latency: about 100 ms more on the first
multi-word query after the index is built (computing the keys of its
results), nothing measurable after.

**Shipped.**

1. `2b8de7a9`: `eval/search_quality.mjs` derives both sets from the
   build, as ground truth `intent-4`, with no ranking change (all 8,012
   earlier queries kept their ranks):
   - *page title*: every page's own title of two or more words, as the
     reader sees it (entities decoded: the data holds `&lt;&lt;`); any
     entry of that page counts. 140 queries. The 9 operator pages
     (`&, &=`, `<<, <<=`) are left out, since a reader types one
     operator, which the bare-name set measures (all 24 at rank 1).
     That, not a change of ranking, is why this set starts at 87.9% where
     the probe's 149 titles were at 84.6%.
   - *page plus section*: `<page title> <section title>` for the one-word
     section titles 20+ pages share, less sections that document a
     symbol; only that section counts, and a query several sections
     share expects any of them. 300 queries.
2. `3328881c`: the ×3 re-rank, `boostWholeTitles()`, at the end of
   `doSearch()` in `just-the-docs.js` and of the replica's `search()`.
   `doSearch()` is outside `initSearch()`, so the offline copy shares it:
   two copies, not three. The replica now needs `docs` in its context
   (`load()` gives it; the tests' fixtures pass it too) and fails loudly
   without it, since a replica that skipped the re-rank would quietly
   differ from the client.
3. `03c90175`: a kind word counts only in the singular.

| | page title (140) | page plus section (300) | other queries | spaced (5,108) |
|---|---|---|---|---|
| before | 87.9% | 22.7% | | 100% |
| ×3 re-rank | 95.7% | 95.7% | unchanged; 243 better, none worse | 100%, unchanged |
| plural rule | **97.9%** | **96.7%** | unchanged; 6 better, none worse | 100%, unchanged |

Every page and section title (3,658) runs as a query without throwing.
Both clients were checked in a browser against the replica
(`DTPicker Properties`, `Return Syntax`, `Delegate Types`, `Form events`,
`New Functions`, `With statement`, `AddressOf operator`, `a` and
others): same results, no console errors.
`test/search.test.mjs`'s whole-title guard runs both copies'
`boostWholeTitles()` on the same results, checks both apply it to the
final results, and ranks a fixture like the site (`DTPicker Properties`
behind the class heading without the boost). Setting either copy's boost
to 1, or dropping the client's call, fails it. The query guard checks
that both compare kind words as typed.

Left, 3 page titles and 10 page-plus-section queries, each at rank 2 or 3:
- `Mid =`: the trimmer drops `=`, so the query is `Mid`, one word, and
  the Mid function (tier 1 for `Mid`) comes before the `Mid =` statement.
  An operator-like title, like those left out of the set.
- `Compiler and IDE Features`: the Features page's section of the same
  title, then the page. Both read the same as the query.
- `WebView2 Package`: `/tB/Packages/WebView2/WebView2`, then the package
  page.
- Sections behind a page whose name contains or stems like theirs:
  `Printers Properties` behind `Printer#properties`; the six `Html*`
  pages (`HtmlElement Properties` behind a second Properties section on
  the same page that documents a symbol, so the set leaves it out);
  `UpDown Properties` behind `DTPicker#updown`; `ParentControls Members`
  behind `UserControl#parentcontrols`; `Timer Properties` behind the
  Timer function.

Not diagnosed further: none is a reader's likely query in a form the
bare-name or qualified sets don't already cover, and each would need its
own tweak.

Open: the re-rank works outside lunr's scoring, as a post-pass. Whether
a hand-marked index entry should outrank it if the two ever disagree is
untested: no prose query has a heading of the same text elsewhere.

### Next steps

1. ~~Promote the intent ground truth into `eval/search_quality.mjs`.~~
   Done, `48b15c2e`.
2. ~~Decide the `conditional compilation` expectation.~~ The user chose
   Topic-Preprocessor, with Compiler-Constants right behind (`31f2d5b4`).
3. ~~Implement X1 + X2 + X3 in all three copies.~~ Done, with the four
   corrections in "What shipped". `test/search.test.mjs`'s reader-intent
   guard covers the fields and the query.
4. ~~The tweak-shaped rank-1 failures.~~ Done; see "What shipped, second
   round". The operators came with it.
5. ~~The index pilot.~~ Done; see "What shipped, third round".
6. ~~The qualified names deep in the list.~~ Done; see "What shipped,
   fourth round". What is left, and in what order, is in "Resuming this
   work".

## Future work

### Operators

**Done in the intent step's second round**: all 24 are now at rank 1,
through exact names that spell non-word characters (`<>` → `_3c_3e_`).
What follows is the analysis from before, kept for the record.

The 24 operator symbols couldn't be found by searching for the symbol,
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
