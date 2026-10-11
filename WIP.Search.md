# twinBASIC Documentation — Site search design notes

Why searching for a member such as `PaintPicture` did not find it, what was
measured, and the design that fixes it. Companion to
[builder/PLAN-6.md](builder/PLAN-6.md) §5.3, which describes the search-data
generator as ported from Jekyll.

Like WIP.md, this file is not rendered through tbdocs, so literal dashes are fine here.

## Resuming this work

Everything needed to continue is in this file and in `eval/`.

**Where it stands.** The design below is shipped. No decision is open. The
candidates for further work are under "Next"; the user picks.

**The eval now** (`node eval/search_quality.mjs`, ground truth `intent-5`,
10,327 queries): 98.2% at rank 1, 99.1% in the top 10.

| category | hit@1 | n | what it types |
|---|---|---|---|
| bare names | 99.7% | 2,884 | `PaintPicture`, judged by reader intent (tiers) |
| qualified names | 100% | 5,108 | `Printer.Fonts` |
| name and kind | 91.1% | 1,785 | `MaxHeight property` |
| prose | 97.2% | 108 | hand-picked (`late binding`, `immediate window`, `ByVal`) |
| page titles | 97.2% | 142 | `Return Syntax` |
| page plus section | 96.7% | 300 | `DTPicker Properties` |

No bare name is out of tier order, and every prose query's `behind` page is
within the top 3 (22 of 22). Compare categories, not totals, across ground
truths: adding the name-and-kind set lowered the overall hit@1 from 99.7%.

**Known misses (185 at rank 1)**, each recorded where it was diagnosed:
- 158 name-and-kind queries, mostly properties; not diagnosed yet
  ([Kind words](#kind-words)).
- 10 bare names: 7 enum constants, 2 members, and `MidB$`
  ([Ground truth sets](#ground-truth-sets)).
- 3 page titles and 10 page-plus-section queries, each at rank 2 or 3
  ([Known misses and limits](#known-misses-and-limits)).
- 1 page title, `Input #`, at 2 behind the `Input` function: the query trims
  to `input`, and the title set skips one-word titles.
- 3 prose queries, `declaration`, `comment` and `default property`, whose
  Glossary definitions are 2nd, 5th and 5th. That is right by the user's
  ruling (a Glossary definition counts within the top 5). An entry would
  reorder the bare names `Declare` and `Comments`
  ([Index entry decisions](#index-entry-decisions)), and one for `default
  property` would put it above CommandButton's `Default`
  ([Index entry decisions](#index-entry-decisions)).

**Next**, for the user to choose from:
1. **The 158 name-and-kind misses.** Diagnose them as the whole-title probes
   were: group by cause, measure a knob, ship only what makes nothing worse.
   93 aren't in the top 50 at all.
2. **Question-shaped queries.** `how do I register a com dll` misses the
   index entry: the all-words pass requires `how`, `do` and `I`, and only the
   FAQ holds them all. A fix touches the all-words pass, so it needs the
   spaced and kinds probes as well as the eval.
3. **The cost of one-letter words.** `a p` takes about 250 ms and a single
   letter 80–110 ms, lunr's own work. Cheaper means changing the query, and
   so the ranking, for instance not completing a one-letter word
   ([lunr patches](#lunr-patches)).
4. **More content and index entries**, under the rules below. Open:
   `COM interop` (no clear target) and three content gaps: subclassing,
   IntelliSense and conditional breakpoints (first find out whether the IDE
   has the last two). See
   [Known misses and limits](#known-misses-and-limits).
5. **An extra word hides a page.** `memory window`, `history panel`,
   `registry access`: the all-words pass finds a few pages holding both
   words and doesn't fall back, so the page named by the other word never
   shows. Entries fixed 20 such queries, but the cause is the pass itself,
   as in item 2; a fix there needs the spaced and kinds probes.
6. **Operator-shaped page titles.** `Input #` and `Mid =` miss rank 1
   because the query trims its non-word character. Exact names already spell
   such characters as word characters (`#If`); whether a whole title can too
   needs the title set and the spaced probe.

**Why hand-marked index entries.** Symbol lookups need no more ranking work:
`names`, `qualified` and `primary` are already a hand index, generated from
`tB/symbols.json`. Jargon is the hard case, because no ranking can find a
page for words it doesn't contain. So authors mark index entries by hand
([Hand-marked index entries](#hand-marked-index-entries)).

**Rules for index entries:**
- An entry names the page a reader wants for that term, not a summary of the
  page. One main entry (`index`) per term across the site; the build
  enforces it. Any number of secondary entries (`index_also`).
- Agents may draft terms and targets; **the user approves every target**.
  The query goes into `eval/search_prose_queries.json` first, measured, then
  the entry, measured again.
- Only a term the page's own words can't find gets an entry. Check first
  where it lands (`node eval/site_search.mjs "<term>"`). Where the page
  lacks the content, write it first, measure, then mark what the new text
  still can't find.
- A term matches only a query holding all its words, whole and in order,
  alone or among others. Capitals and hyphens don't matter, word endings
  don't (stems), but `type char` doesn't match `type character`, and
  `register a dll` doesn't match `register dll`: each spelling a reader types
  is its own term.
- A term whose stem is a bare name's reorders that name (`declaration` and
  `Declare`). A secondary entry can overtake a page that ranks first only on
  its own text, so that page takes a main entry for the term too. A one-word
  term matches every query holding the word, page titles included. The eval
  shows all three.

**The user's criteria**, which govern every decision here:
- A reader either finds what they want or doesn't. A small regression is
  still a miss, and being better than an earlier index is not the bar.
- Judge by what a reader typing the query wants. For a bare name the order is
  type names and language elements first, then members, then enum constants
  and similar, then prose. The order is a priority, not a filter: lower
  tiers must still appear.
- Configuration belongs in `docs/_config.yml`, not code (for example
  `search.fold_headings`).
- Ship in small steps, each committed on its own with its measured numbers.
- Existing links in the docs may be wrong or not the best. Treat them as
  leads, never as evidence of the right page, and don't derive test
  expectations from them. The glossary is a source of candidate *terms*, not
  of targets. List doubtful links for the user; don't fix them in passing,
  since which page is right is an editorial call.
- Fix what a tweak can fix first; use hand-marked index entries where the
  right page can't be found from its text. A tweak that happens to fix a
  handful of prose queries is overfitting, not a fix.
- A Glossary definition counts as a right answer for its term within the top
  5; it needn't be first. Where several pages answer a query, they should
  all appear in the results, in the order the user chose.
- lunr's cost rules out extra query passes for now (the reason the
  name-and-kind set leaves out `sub` and `member` rather than spelling a Sub
  as `method`).
- Use Sonnet agents for mechanical and exploratory work.
- Review every agent's work before committing it. Agents produce false
  explanations (see [X1t](#rejected-tier-specific-exact-fields-x1t)), a
  lookbehind regex that breaks the whole client on Safari before 16.4,
  and a loading message that blanks on the second keystroke.

**Tools.**
- `node eval/search_quality.mjs --compare eval/search_baseline.json --worst 20`
  measures a build against the saved baseline; `--save eval/search_baseline.json`
  updates it (it needs the file name); `--failures N` lists what misses rank
  1, by category and tier. The baseline records its ground truth (`intent-5`).
- The eval's symbol queries are one word each; its page-title and
  page-plus-section sets are its only multi-word queries. So for any change
  to the all-words pass, also rank every qualified symbol written as two
  words (`FileListBox Name`) and every symbol as its name and kind
  (`MaxHeight property`) with the committed replica and the candidate:
  `eval/search-experiments/probes/spaced.mjs` and `kinds.mjs`, run once
  against a copy of the committed `site_search.mjs`.
- `eval/site_search.mjs` is the replica of the client search. The site's
  client and `builder/offline.mjs`'s `initSearch` must stay identical to it;
  `test/search.test.mjs` fails if their fields or pipeline drift apart.
- Build first with `node builder/tbdocs.mjs --src docs --no-check --no-offline --no-pdf`.
- The research scripts and their records are in
  [eval/search-experiments/](eval/search-experiments/README.md).
- Measure a candidate change with temporary knobs in the replica (an `EXP`
  environment variable read by `eval/site_search.mjs`), then restore the file
  from git and write the chosen version cleanly into all three copies.
- Check anything in the client in a real browser. `.claude/launch.json` has
  `docs-serve` (port 4001) and `docs-offline` (port 4002; build without
  `--no-offline` first). The client runs `update()` on `keyup`, so browser
  tools that insert text without key events don't trigger search; setting the
  box's value and dispatching a `keyup` from script does, and is the quick
  way to compare many queries with the replica. A hidden pane pauses
  `requestAnimationFrame`; the client has a timer fallback for that.
- The browser pane's console keeps messages from earlier pages. Check an
  error's line numbers against the served file before chasing it.
- A twinBASIC sample on a page: mark it `check_build` and compile it with
  `node scripts/check_examples.mjs --only "^Reference/Core/Sub\.md"`
  (`check_run` only compiles, so far). To confirm what it prints, put the code
  in a source tree with a `[RunAfterBuild]` Sub that starts with `Debug.Cls`,
  and run `node scripts/tbrun.mjs <tree>`; `--keep` on `check_examples` leaves
  a project whose `Settings` and `tbxMain.twin` make a starting tree. No
  `MsgBox` in a probe: it hangs invisibly.
- Every title as a query: load `eval/site_search.mjs` from a throwaway script
  with an absolute site path (a relative one breaks `loadLunr`) and search
  each distinct entry title; a result's `ref` is its key in `ctx.docs`.
  Currently: no throws, 9 empty, 2 not in the top 50.
- `test.bat` stops at `check_axe_patch_equiv.mjs` in a worktree without
  `node_modules`. Run `npm install` first for the full suite.
- In some agent shells `cmd` reports `test.bat` and `check.bat` as "not
  recognized", even from the worktree, and from PowerShell too. Their gates
  are plain `node` commands; run them in order, and rebuild the way
  `build.bat` does first (`node builder/tbdocs.mjs --src docs
  --check-audit-index`), since `check_tree_fresh.mjs` refuses a tree older
  than any edited file.
- Rewriting WIP.Search.md with a script: pass replacement text as a function,
  never as a string. In a string, `$` followed by a backtick means
  "everything before the match", so a sentence containing `MidB$` pastes the
  file's head into the replacement.

**How lunr behaves here:**
- The tokenizer tests one character at a time against `separator`, so a
  multi-character alternative in the separator regex can never match.
- The index pipeline is trimmer, stop-word filter, stemmer; the search
  pipeline is only the stemmer. The stop-word filter is removed here.
- BM25's length normalisation makes a short entry that mentions a term beat a
  long entry about it. Tuning `b` doesn't help short of `b` = 0.
- A query of only `*` throws inside lunr.
- A clause's `boost` cancels out when it is the only clause on a field: lunr
  divides each field's score by the query vector's magnitude *for that
  field*. Weight such a field with its index-time field boost.
- A clause names every field unless it says otherwise, so a wildcard clause
  also searches helper fields such as `exact`.
- A wildcard term is not stemmed usefully: `operator*` misses the index's
  `oper`. Stem first, then add the wildcard, with `usePipeline: false`.
- The index trims non-word characters from token ends (`Date$` → `date`), and
  the query trims the same way. A name that must keep them (`#If`, `<>`) has
  to spell them as word characters.
- A REQUIRED clause names every field too, so it scores in helper fields such
  as `exact` unless it is given the text fields. That leak can put the wrong
  page first (`With statement`) and push others down (`error handling`).
- A REQUIRED clause matches if the term is in *any* of its fields, and it
  scores as well. To require a word without scoring it in some field, give
  the REQUIRED clause boost 0 (its terms enter the query vector at zero
  weight) and score with a second, optional clause.
- BM25 compares a field's length with that field's average over *every*
  entry, empty ones included. A field that is empty on nearly every entry has
  an average near zero, so a match in it counts for almost nothing, and
  counts for more as more entries fill it. The `index` field pins its average
  at 1 (`pinIndexFieldLengths`).
- Every field costs a slot on every term of the whole index, not just on the
  entries that use it: `add()` creates an empty object per field for each new
  term. Three sparse fields took 24 MB more heap; one takes 5 MB. Prefer
  encoding a variant inside one field (secondary entries carry one more `_`)
  to adding a field.
- A trailing wildcard completes a plain word to every token it begins,
  including whole qualified names: `form*` reaches every `form.*` in
  `qualified`. Harmless at a low field boost, it lifts a container by its
  member count at a high one.
- lunr 2.3.9's token set can invent words and lose real ones: its
  minimisation keys nodes by `TokenSet#toString()`, which runs edge labels
  into child ids (`{1 -> 656}` and `{1 -> 6, 5 -> 6}` are both `01656`).
  Whether it happens depends on the whole term set, so any content or field
  change can start it. Patched; see "lunr patches". Check a
  candidate change with every title as a query, not only the eval, since the
  eval never types `a`.
- The search data must keep the page's HTML entities: the results panel
  inserts titles and content with `innerHTML` and highlights by lunr's
  character positions in that text. Decode inside the index instead, per
  token, after the tokenizer splits (`Token#update` keeps the position); see
  "lunr patches".
- lunr 2.3.9's `Set#union` copies both sets, and `Index#query` unions once
  per expanded term and field of a REQUIRED clause, so a short wildcard word
  was quadratic. Patched (`accumulateSetUnions()`); see "lunr patches".
  Profile before guessing: `node --cpu-prof`.

## The problem

`PaintPicture` is documented on six classes (Form, PictureBox, Printer,
PropertyPage, Report, UserControl), each under `### PaintPicture` inside
`## Methods`. With the original index, a search returned 24 results, but the
definitions came 13th to 19th, as entries titled just "Methods" that link to
`#methods`. The same happened to every member documented at `###`: `Line`,
`Print`, `Cls`, the Assert methods, and about 2,700 others.

Three things combined:

1. **Granularity.** [builder/search.mjs](builder/search.mjs) splits a page into
   one entry per heading up to `search.heading_level` (2 by default). A `###`
   member became part of the text of its parent `##` entry, often 5 to 16 KB
   long.
2. **Length normalisation.** lunr scores with BM25 (`b` = 0.75). A term found
   in a 10 KB "Methods" entry scores far lower than the same term in a short
   entry that only mentions it, such as the glossary's "graphics method".
3. **Tokenisation.** The client split on `/[\s\-/]+/`, not on `.`. So
   `Form.PaintPicture` was the single token `form.paintpicture`, which occurs
   nowhere. Qualified names found their target 0.4% of the time.

The render step `headingLevelNormalizePlugin` ([builder/render.mjs](builder/render.mjs))
matters here. On a page with `#` and `###` but no `##` (405 of 912 pages,
mostly `Reference/Core`), it promotes `###` to `##`. Counts below are after
this step, which is what search sees.

## The corpus

After normalisation: 909 h1, 2,549 h2, 3,820 h3 (on 222 pages), 31 h4, no h5
or h6. Of the raw h3 headings, 2,761 are API members, 799 are generic
sections and 1,056 are prose. The generic ones are mostly `See Also` (412) and
`Example` (379). Nearly every h4 is an `Example` under a member. Generic
headings appear in two layouts:

- next to the members, as on `ICustomControl`: `## Methods > ### Initialize, ### Destroy, ### See Also`;
- under a member, as on `NamedPipeServer`: `### PipeName > #### Example`.

No page sets a heading id by hand. `uniqueSlug` handles the 33 pages that
repeat a heading, by adding `-1`, `-2` and so on.

## Measurement

A harness replays the client's search in Node: the same lunr build, boosts,
query construction and capped fuzzy fallback, against a built
`search-data.json`. The first ground truth is `tB/symbols.json`, which gives
8,012 queries:

- 2,884 bare names (`PaintPicture`). A result counts as correct if it is any
  URL that documents a symbol of that name, since 18% of names exist on many
  classes.
- 5,108 qualified names (`Form.PaintPicture`). Only that class's URL counts.
- 20 hand-picked prose queries ("late binding", "Option Explicit" and so on).

Later sections add ground truths: reader-intent tiers, page titles, page plus
section, name and kind, and a larger prose set. The harness reports hit@1/5/10,
MRR (capped at rank 20), results by symbol kind, cost (size raw and gzipped,
index build time in the browser, heap) and the queries that changed rank
between two configurations. It is [eval/search_quality.mjs](eval/search_quality.mjs);
its baseline is [eval/search_baseline.json](eval/search_baseline.json). Run
`node eval/search_quality.mjs --compare eval/search_baseline.json` to measure
a change against it.

### Results

The table compares the configurations tried against the first ground truth.
"today (h2)" is the original index.

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

### What the numbers showed

- **h4 adds nothing.** From h3 to h4, no query changes rank.
- **Splitting creates short competitors.** At h3, `vbSolid` falls from rank 1
  to about 12. Its page, `DrawStyleConstants`, is 483 characters. The new
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
- **Splitting on every `.` has two costs.** `Debug.Print` falls from rank 1 to
  61, because `debug` and `print` are both common words and the exact token
  no longer counts. And `1.0`, `e.g.` and `i.e.` turn into single-character
  tokens that match letter-index pages. The smart split below fixes both and
  keeps every qualified-name gain.
- **Generic sections:** folding them into the entry before them is a small,
  free gain. Retitling them ("PaintPicture — Example") gains nothing.

## Design

### 1. Split entries at h3, and fold generic sections

- Set `search.heading_level: 3` in `docs/_config.yml`.
- In `extractSections`, after the split, append any section whose title is a
  generic section name to the section before it on the same page, rather than
  giving it its own entry. The list lives in config as
  `search.fold_headings`: `See Also`, `Example`, `Examples`, `Remarks`,
  `Parameters`, `Return value`, `Syntax`, `Notes`. It is matched without
  regard to case.
- Folding applies at every level, including the h2 `Example` and `See Also`
  on normalised `Reference/Core` pages. Measured separately, that is neutral
  to slightly positive (V2 on h2 against h2: hit@10 21.0% against 20.5%).
- A page whose first section is generic keeps it as its own entry, since
  there is nothing before it to fold into.
- The order of entries stays fixed. `discover.mjs` orders pages
  deterministically so that search entries don't shuffle between builds, and
  splitting headings top to bottom keeps that.

### 2. Two fields built from the symbol index

A single `symbols` field at boost 50 was measured first. BM25 discounts a
match inside a long field, and `Container.Name` forms are longer than bare
names, so the two compete inside one field for no reason. Two fields, each
boosted on its own, rank better than one field at any single boost:

- `names`: the bare name of every symbol in `tB/symbols.json` whose URL is
  the entry's `relUrl` (ignoring a trailing slash or `index`), space-separated
  and deduplicated. Client boost 100.
- `qualified`: the `Container.Name` form of the same symbols (only those that
  have a container -- a bare statement or operator does not), space-separated
  and deduplicated. Client boost 500 (see "Qualified names and stem twins").

With the current corpus, 4,084 of 6,713 entries get either field.

- In the build, `searchData` also waits for `symbolIndex`. Both run on the
  main thread after `renderJoin`. `symbolIndex` returns its symbols, and
  `searchData` joins them by URL before it writes (`joinSymbolsToEntries` in
  `search.mjs`). Workers keep deriving sections as before; the join is a map
  lookup per entry.
- `renderEntryString` adds `names` / `qualified` only when non-empty, so a
  page with no symbols produces the same bytes as before.
- In the client, `this.field('names', { boost: 100 })` and
  `this.field('qualified', { boost: 500 })`. The title keeps 200 and content
  keeps 2.

### 3. Query construction

In the client's `update()`, for each token the tokenizer produces:

- **Smart dot split.** Keep the whole token as a term with boost 10. Where a
  `.` sits between identifier characters on both sides (found by
  `/([A-Za-z_]\w*)\.(?=[A-Za-z_])/g`, not a lookbehind, which Safari before
  16.4 can't parse), also add the parts as extra terms, with the same boost
  and trailing wildcard as ordinary tokens. Drop parts of one character. So
  `1.0`, `3.9`, `e.g.` and `i.e.` add nothing, and `Debug.Print` still
  matches its exact entry first. Making the parts required (lunr's
  `presence.REQUIRED`) was measured and rejected: qualified hit@10 falls from
  97.9% to 88.6%.
- **Asterisk guard.** Drop tokens made only of `*`. If nothing is left, show
  no results. A search for `*` or `**` otherwise throws inside lunr's query
  engine and search stops working. (Trimming query tokens, see "What
  shipped", subsumes this.)

### 4. Both copies of the client

The online client is the vendored
`builder/vendor/just-the-docs/assets/js/just-the-docs.js`, patched in place.
Every change goes on the patch list in its README. The offline build replaces
`initSearch` with its own copy, `JTD_INITSEARCH_FN_REPLACEMENT` in
[builder/offline.mjs](builder/offline.mjs), which builds its own lunr index,
so it needs the same fields at the same boosts. It uses the query code in
`update()` unchanged, so it inherits query changes. A unit test extracts the
field/boost list from both sources and asserts they agree, so they cannot
drift apart silently.

### 5. Tests and tooling

- `test/search.test.mjs` checks what `search.mjs` emits: the h3 split,
  folding (including a generic section that comes first on a page), the
  symbols join and URL normalisation, and byte stability when `symbols` is
  empty. (`checkSearch` checks only URL coverage; it strips `#`.)
- `eval/site_search.mjs` must reproduce the client exactly, including
  `lunr.tokenizer.separator` (without it the replica tokenises with lunr's
  default `/[\s\-]+/` and cannot show the `*` crash) and every field and
  query rule.
- The harness lives in `eval/`, next to `site_search.mjs`, sharing its index
  and query code. The ground-truth derivation and the prose queries are
  committed; the built data files are not. `scripts/` does not fit, because
  its tools are checks that pass or fail.

## Known regressions and remaining gaps

- **Stop words kept, so short common words crowd.** `VB` is a prefix of many
  `vbXxx` constant names in `names`; `Lock`, `Time$`, `Column`, `Index`
  crowd the same way. Everything is judged by reader intent, not by the
  rank an earlier index gave; see [Reader intent](#reader-intent-after-the-rollout).
- **Operators (24 symbols)** are unsearchable by their text under this design;
  exact names find them. See [Future work](#future-work).
- **Ground-truth bias.** Most queries are symbol names, so the numbers favour
  API lookup. The symbols field comes from the same data as the ground
  truth. The held-out check limits that concern, but does not remove it. The
  prose set is small and hand-picked.

## Design §5: stop words, dot runs, and a lazy build

Three independent, measured changes to both client copies and the eval
replica.

### A. Keep lunr's stop words in the index

lunr's **index** pipeline runs `lunr.stopWordFilter` by default, dropping
words like `do`, `for`, `if`, `is`, `on`, `with`, `each` from every field. Its
**search** pipeline never ran that filter, so a query for `Do` still carried
the token `do`, which existed nowhere in the index. Many twinBASIC keywords
are English stop words, so every keyword query missed its own entry (`Do`
ranked 18th, `For` 17th, `With` 55th, `Is` 177th). The fix is one line inside
the `lunr(function(){...})` builder: `this.pipeline.remove(lunr.stopWordFilter);`.
Every keyword query goes to rank 1, and the fix isn't specific to
twinBASIC's keyword list. The cost: a few short, extremely common tokens
(mostly other `vbXxx` constant name prefixes and `Index`/`Lock`/`Column`/`Time$`)
crowd into more results; see "Known regressions" above.

### B. Split runs of two or more dots

Titles like `Do...Loop`, `For Each...Next` and `If...Then...Else` tokenised as
a single opaque token (`do...loop`). lunr's tokenizer decides where to split
by testing *one character at a time* against `separator`, so a `\.{2,}`
alternative inside that regex can never match. The fix wraps
`lunr.tokenizer`: for a string input, every run of 2+ dots becomes the same
number of spaces (`s.replace(/\.{2,}/g, m => new Array(m.length + 1).join(' '))`;
spaces rather than deleting the dots, so that character offsets used for
match highlighting stay valid), then the original tokenizer runs. Non-string
input (arrays, `null`) passes through unchanged, since lunr also calls its
tokenizer with those.

The wrapper is installed once, where the separator used to be set, and has to
carry `separator` itself: the original tokenizer reads
`lunr.tokenizer.separator` at call time, so once `lunr.tokenizer` points at
the wrapper, that lookup resolves to the *wrapper's* own `.separator`. The
wrapper sets `wrapper.separator = /[\s\-\/]+/`, the client's separator, so
`/` still splits (`a/b` → `a`, `b`). It runs on the shared global `lunr`, so
it applies to the index build and every query alike.

### C. Build the index lazily, on the first keystroke, with visible feedback

Building the lunr index on every page load costs about 1.3 s and 240 MB of
heap on a desktop, paid by every reader whether or not they open search. So
`initSearch()` only defines *how* to build the index (`loadIndex(onSuccess,
onError)`, which fetches via XHR and installs the stop-word and dot-run
patches) and hands that function to `searchLoaded()`. `searchLoaded()` wires
up the search box's listeners at once but calls `loadIndex()` only on the
first `keyup` that leaves the box non-empty.

That first keystroke calls `loadIndexNow()`:
- It shows "Loading search index..." in the same slot and style as "No
  results found" (`.search-no-result`, reused rather than adding a class) and
  the same text in the `a11y-status` live region.
- It yields (a `requestAnimationFrame` raced by a 100 ms timer, since frames
  never fire in a hidden tab, then `setTimeout(fn, 0)`) so that the message
  paints before the build starts.
- The build runs 25 ms at a time and yields between slices
  (`buildIndexInSlices()`: an entry added, a hundred fields' vectors, a term
  put into the token set), so the reader can keep typing; the longest task is
  about 50 ms. Built in one piece, the index held the main thread for about
  1.6 s and the box took no keystrokes.
- A keystroke during the load leaves the message in place until results
  replace it, with no empty panel in between, online and offline.

When `loadIndex()` finishes, `finishLoad()` searches whatever is in the box
*at that moment*, not what was typed when the load started. Only one load is
in flight at a time (`indexLoading`, checked at the top of `loadIndexNow()`);
a keystroke mid-load just updates `currentInput` and returns from `update()`.
A failed load (bad XHR status, parse error, or an exception building the
index) shows "Search is unavailable" plus the matching `a11y-status` text and
leaves the index `null`, so the next keystroke retries from scratch.

`update()` keeps its prefix (the dedup check, the `search-active` class, the
iOS scroll workaround) and its keyboard/focus/blur listeners. The query part
was split out into `doSearch(input)`, gated behind `if (index === null) {
loadIndexNow(); return; }`. `searchLoaded()` takes `loadIndex` instead of
`(index, docs)`.

`builder/offline.mjs`'s `JTD_INITSEARCH_FN_REPLACEMENT` works the same way:
its `window.SEARCH_DATA` is already in memory (preloaded by a `<script src=>`
the offline HTML injects), so there is no fetch to defer, but the *build*
still waits for the first `loadIndexNow()`, with the same feedback.
`eval/site_search.mjs` mirrors parts A and B exactly; there is no lazy build
to mirror, since the CLI always wants an index.

**Cost per page view**, median of 15 interleaved runs on a desktop:

| | today (h2) | steps 3-4 | + stop words kept |
|---|---|---|---|
| index build | 964 ms | 1,184 ms | 1,294 ms |
| heap | 157 MB | 204 MB | 243 MB |

With the lazy build these costs are paid once per page, and only by readers
who type into the search box; a page never searched from pays nothing.

## Rollout

Step numbers cited in code comments: 1 bug fixes (asterisk guard, tokenizer
separator in the replica); 2 the harness; 3 h3 entries and folding; 4 the
symbols fields and smart dot split; 5 stop words, dot runs and lazy build
(5A, 5B, 5C are "Design §5" A, B, C). Each step is its own change recording
its numbers from the harness.

## Reader intent (after the rollout)

### The criterion

A reader either finds what they want at the top or doesn't, so "small
regressions" are not acceptable, and neither is an earlier index's rank as a
reference. A result is judged by what a reader typing the query most
plausibly wants. Rank 1 is the measure that matters; hit@10 and MRR are
secondary.

A bare name counts as correct only for the best tier that documents it, not
for any page documenting that name (the eval still reports that looser rule
as `bare, any page`): for `CheckBox` it accepts `DTPicker › CheckBox`, but the
reader wants the CheckBox control.

### The intent ground truth

For a bare name, the expected results are ordered by tier. Higher tiers come
first, and lower tiers must still appear below them; nothing is excluded:

1. **Type names and language elements.** A type is a class, control, module,
   enum, interface or package. A language element is a statement, keyword,
   operator, attribute or directive with no package, or a function, property,
   sub or method whose container is a module (so `Time$` → DateTime's `Time`,
   and `Left` → the Strings function, not the `Left` property of 30
   controls). `isPrimarySymbol` in `builder/search.mjs` states this rule for
   the index; `intentTier` in `eval/search_quality.mjs` states it again,
   independently, as the ground truth the index is measured against.
2. **Members** of classes.
3. **Enum constants and similar** (`vbForm` → `ControlTypeConstants`).
4. **Prose.**

The primary metric is a top-tier answer at rank 1; where a name has several
top-tier answers, any of them counts. Secondary: recall of every same-name
symbol URL in the top 10 and top 20, and tier-order violations, which is a
lower-tier exact-name result ranked above a higher-tier one. Near-name
matches (`Nodes` for `Node`) are related, not violations, but must not
outrank any exact-name match. Qualified `Class.Member` queries expect that
member. Prose queries expect the dedicated page, not a summary section that
only links to it.

Of the 2,884 bare names: 318 are types, 453 language elements, 1,132 enum
constants and 981 member-only. 115 have a doubtful expectation, listed by the
script: mostly statements with several pages (`For` has For...Next and For
Each...Next; `GoSub`, `On`, `Input`), plus `Line` and `Timer`, where a type
outranks a same-named statement or enum and either could be argued.

The tiers are `eval/search_quality.mjs`'s primary ground truth; the
experiments' copy is
[eval/search-experiments/intent/intent_gt.mjs](eval/search-experiments/intent/intent_gt.mjs).

### Ground truth sets

`eval/search_quality.mjs` records its ground truth in the baseline as a label
(`intent-1` to `intent-5`), so `--compare` can tell a changed ground truth from
a changed ranking. Each set below names the label it counts under.

- **Bare names** (`intent-1`), judged by the tiers above, and **qualified
  names** (only that symbol's URL counts), both derived from
  `tB/symbols.json`.
- **Same-page sections count** (`intent-3`). Where a symbol's URL is a page,
  not a section of one, any section of that page counts for it too. `DefInt`
  is documented by the Deftype page, and its section headed `DefBool, DefByte,
  DefInt, ...` lands the reader on the same definition; so do
  `Chr#chr-chrb-chrw` for `ChrB` and `Left#left-leftb` for `LeftB`. It applies
  to bare, qualified and name-and-kind queries, not to prose, which already
  matches by path. `MidB$` stays a miss, rightly: its first result is the
  `MidB =` statement (`/tB/Core/MidB-equals`), a different page, and the Mid
  function it names is second.
- **Page titles** (`intent-4`): every page's own title of two or more words,
  as the reader sees it (entities decoded: the data holds `&lt;&lt;`); any
  entry of that page counts. Titles with no letter or digit (the operator
  pages, `&, &=`, `<<, <<=`) are left out, since a reader types one operator,
  which the bare-name set measures.
- **Page plus section** (`intent-4`): `<page title> <section title>` for the
  one-word section titles 20 or more pages share (`DTPicker Properties`),
  less sections that document a symbol. Only that section counts; a query
  several sections share accepts any of them.
- **Name and kind** (`intent-5`): `<Name> <kind>` for every symbol whose kind
  is a kind word (`MaxHeight property`, `Continue statement`), less `sub` and
  `member`, which readers don't say (a Sub is a method to them; spelling a Sub
  as `method` would need another query pass, which lunr's cost rules out for
  now). Operators, with no word character, stay out, as the bare-name set
  measures them. Any symbol of that name and kind counts, and any section of
  a page that documents one. The set was agreed with the user as ground truth
  and has three caveats: the kind-word fallback was designed on it, so it
  starts near its best (a regression guard, flattering for gains); several
  symbols of one name and kind (`Name property`) are judged leniently, any of
  them counting; and at 1,785 queries it moves the overall hit@1, so compare
  categories, not totals, across ground truths. `KIND_WORDS` is exported from
  the replica, so the eval and `probes/kinds.mjs` build the set from the list
  the replica searches with.
- **Prose** (`intent-2` for its two expectation changes): the hand-picked
  queries in `eval/search_prose_queries.json` (108), each with a
  maintainer-judged expected page, matched by path only. The expectations for
  `64-bit compilation`, `Fusion`, `symbol index` and `array bounds checks` are
  right, so a miss on them is a ranking problem. A query may name
  `behind` pages that should be found right behind the expected one, within
  the top 3 (`BEHIND_WITHIN`). For `conditional compilation` the user chose
  `/tB/Core/Topic-Preprocessor` (the `#If`/`#Const` page), with
  `/Reference/Compiler-Constants` right behind. For `symbol index` the user
  ruled that Permanent-Links' definition counts as well as Building's
  section, and the definition ranks first on its own text, so it needs no
  index entry.

The eval's symbol queries are one word each, so its page-title and
page-plus-section sets are its only multi-word queries. The two probe scripts
under `eval/search-experiments/probes/` (`spaced.mjs`, `kinds.mjs`) cover the
rest; see Tools above.

### Where each piece lives

The online client is the vendored
`builder/vendor/just-the-docs/assets/js/just-the-docs.js`.
`builder/offline.mjs` replaces `initSearch()` with its own copy
(`JTD_INITSEARCH_FN_REPLACEMENT`), which builds the same fields at the same
boosts. Everything else the search uses sits outside `initSearch()`
(`doSearch()`, `exactName()`, `indexField()`, `qualifiedField()`,
`stemTwins()`, `boostWholeTitles()`, `namesTheThing()` and the lunr patches),
so the offline page shares it. `eval/site_search.mjs` is the replica, which
mirrors all of it. A change to `doSearch()` or a helper is therefore two
copies (client, replica); a change to the field list, the tokenizer wrapper
or the patch installs is three (online `initSearch()`, offline
`initSearch()`, replica).

`test/search.test.mjs` has one guard per topic below (reader intent,
qualified names and stem twins, index marks and the index terms, token-set
keys, whole titles, entities, set union, kind words, the sliced build). Each
compares the online client, the offline copy where it has its own, and the
replica, by pattern or by behaviour, so a change to one copy fails until the
others agree. A guard's mutations (a boost changed, a clause dropped) are
meant to fail it. What each asserts:

- **Reader intent:** all three derive `exact` with `exactName()` and `page`
  from `doc`; the client and the replica write names and kind words alike,
  build the same query and compare kind words as typed.
- **Qualified names:** the client keeps plain words off `qualified` as the
  replica does, and the replica ranks the member a qualified name names first.
  These mutations each fail it: boost 50, plain words completing in
  `qualified`, no word pairs, the REQUIRED clause scoring in `qualified` or
  dropped off it.
- **Stem twins:** all three fill `qualified` through `qualifiedField()` and
  both queries match a whole name there; the client's `stemTwins()` and
  `qualifiedField()` equal the replica's by behaviour; the replica ranks twins
  apart in a small index, typed with a dot or as two words.
- **Index marks:** the path from page to entry (front matter to the page's
  entry, a heading's mark by id, terms trimmed and kept once regardless of
  case, a main term not also secondary; a value that isn't a term or a list,
  or a heading no entry holds, fails the build), `render.mjs` lifting the
  attributes off headings (a pinned id is the key; any other element fails),
  one main entry per term (case and hyphens ignored; a secondary entry
  elsewhere is fine), all three filling `index` and the content and pinning
  the average length, a term written alike by the client and the replica, and
  the replica ranking a marked entry first and its secondary entry next.
- **Token-set keys:** lunr's own keys still invent and lose words for the
  fixture; the client's and the replica's keep it exact; all three install
  them when they build the index.
- **Whole titles:** both copies boost the same results by the same factor and
  apply it to the final results; the replica ranks a fixture like the site
  (`DTPicker Properties` behind the class heading without the boost).
- **Entities:** all three wrappers call the decoder; the client and the
  replica decode alike and keep each token's position; the replica finds
  `&H80004005` and highlights it where it is written.
- **Set union:** both copies' `union` against lunr's own on a chain of sets
  (same elements and length at every step, inputs untouched, the running total
  added to in place); the replica ranks exactly as with lunr's own; all three
  install it.
- **Kind words:** both copies' `namesTheThing()` agree on the same results and
  both fall back only when nothing found names the thing; the replica finds a
  member its section doesn't call a property (`MaxHeight`) and keeps a titled
  match (`Mid`).
- **Sliced build:** the index equals `lunr()`'s, sliced finely and as the site
  slices it; a build that throws reports it and puts `lunr.idf` back.

### Index fields

| field | holds | boost |
|---|---|---|
| `title` | the section's heading | 200 |
| `content` | the section's text, plus the entry's index terms as plain words | 2 |
| `names` | bare names of the symbols documented at the entry's URL (build join) | 100 |
| `qualified` | their `Container.Name` forms (build join), plus the stem twins whole | 500 |
| `exact` | each `names` entry as `exactName()` writes it; derived in the browser, so the download doesn't grow | 50 |
| `primary` | the `names` that are types or language elements (build join, `isPrimarySymbol`), as `exactName()` writes them | 1000 |
| `page` | the page's own title (`doc`), so a page whose title the reader typed outranks a section of another page that only mentions it | 5 |
| `index` | hand-marked terms (see below) | 1000 |
| `relUrl` | the entry's URL | 1 (lunr's default) |

**`exactName()`** lowercases a name, spells every non-word character as `_`
and its hex code, and appends `_` (`#if` → `_23if_`, `time$` → `time_24_`,
`<>` → `_3c_3e_`). The index trims non-word characters from token ends, which
would turn `#If` into `if` and `<>` into nothing; spelled out, they survive,
so `#If`, `Time$` and `Error$` stay distinct from `If`, `Time` and the `Error`
statement, and the 24 operators are findable. The final `_` keeps a whole-name
query off every longer name that starts with it (`Node` against `Nodes`,
`ListItem` against `ListItems`, `vbForm` against `vbFormCode`): the trimmer
keeps `_` as a word character, and every Porter stemmer rule anchors on the
end of the word, so a trailing `_` passes through untouched.

**Why `primary` exists.** Same-name entries of different tiers tie on
`exact`, and BM25's length normalisation then favours the short member
entries: `Left`, `Right`, `BorderStyle`, `WindowState`, `Next`, `Default`,
`Month`, `Print`, `Lock`. An enum page loses further, since its `exact` also
holds every constant's name. `primary` lists only the names that are types or
language elements and weighs them at 1000, so a type or language element
comes before a member of the same name.

**Boosts come from the fields.** A clause alone on a field has its boost
divided back out (see "How lunr behaves here"), so the exact-name clause
carries none and the field boosts decide. Boosts of 50 to 1000 on `exact`
measured the same.

**Measured, and rejected:**
- `primary` at boost 200 left 9 names out of tier order, at 500 left 2; 1000
  leaves none.
- `page` at boost 10 or 20 puts the `Folder` page above `Folder.Parent` and
  `Folder.Path`, which are documented on `FileSystemItem`; 10, 20 and 50 each
  also move `Pointer` from 6 to 7 (50 also `MidB$` from 2 to 3). Boost 5
  keeps both.

### Query construction

`doSearch()` builds the query in these steps. The first three apply to every
query.

1. **Tokens.** `lunr.tokenizer` (the wrapper, see "lunr patches"), then each
   token trimmed with `lunr.trimmer`, and tokens left empty dropped. Trimming
   as the index trims keeps every `Xxx$` qualified query that the `page`
   field would otherwise make worse, finds each bare `Xxx$` function, and
   subsumes the asterisk guard, since an all-`*` token trims to nothing.
   These are `baseTokens`.
2. **Smart dot split** (Design §3). A token with a split dot (`qualifiedTokens`)
   is kept whole and also adds its parts of two or more characters. A part
   from a split is a plain token. A split dot is found with a NUL marker,
   not a lookbehind.
3. **What the query names.** A query names one thing if it has one
   whitespace word, or one word besides words that name a kind
   (`KIND_WORDS`: `operator`, `statement`, `attribute`, `keyword`,
   `directive`, `class`, `method`, `property`, `module`, `function`,
   `constant`, `enum`, `object`, `member`, `sub`, `package`, `interface`,
   `control`, `event`, `type`, `field`; the kinds in `tB/symbols.json` less
   `enumvalue`, which nobody types). `With statement` names `With`; `error
   handling` names nothing, since `error` alone isn't what the reader named.
   Only the singular counts, compared as typed: `Delegate Types` and `New
   Functions` name a topic, not the one thing `Delegate` or `New`.

The any-words query (`anyWords()`) holds these clauses. The text fields are
`title`, `content`, `names`, `qualified`, `page` and `relUrl`; the plain-word
fields are those less `qualified`. No clause names `exact`, `primary` or
`index` except its own, since a wildcard such as `node*` would match `nodes_`
there.

| clause | fields | notes |
|---|---|---|
| every token, whole tokens and split parts | text fields | clause boost 10, no wildcard |
| each plain token | plain-word fields | trailing wildcard |
| each token with a split dot | text fields | trailing wildcard |
| each two adjacent plain tokens, joined with a dot | `qualified` | clause boost 10 |
| each raw word that holds a dot, and each two adjacent raw words joined with a dot, as `exactName()` writes them | `qualified` | clause boost 10; matches only the names held whole (the stem twins) |
| the name the query names, as `exactName()` writes it | `exact`, `primary` | no wildcard, no boost (field boosts decide); only when the query names one thing |
| each run of up to four consecutive tokens, as `phraseKey()` writes it | `index` | boost 5, and the key plus `_` at boost 1; no pipeline |

Only a token with a split dot may complete with the trailing wildcard in
`qualified`: a plain word there would complete to every member of each
container whose name it begins (`vbfile*` to all of `vbfileattribute.*`), and
at a high field boost lifts that container by its member count.

**The passes**, in order, stopping at the first that finds anything:

1. **All words first**, when there are two or more tokens. Each token is
   REQUIRED as its stem plus a trailing wildcard, with `usePipeline: false`
   (the index holds stems, and an unstemmed `operator*` misses `oper`),
   over the text fields at boost 0, so the clause decides only which entries
   qualify. A second, optional clause scores the same stem on the plain-word
   fields, or the text fields for a token with a split dot. The any-words
   clauses are in this query too, so they score. Taking `qualified` out of
   the REQUIRED clause altogether loses entries that name their container
   nowhere else (`_HiddenModule Input`, `CefEnvironmentOptions LogFilePath`),
   hence the split between presence and score; lunr ORs a REQUIRED clause's
   fields and adds boost-0 terms to the query vector at zero weight, so the
   split changes no presence and no other score. The REQUIRED clause is also
   restricted to the text fields because it would otherwise score in `exact`,
   which put the wrong page first for `With statement` and pushed others down
   for `error handling`; `With statement` gets its rank 1 properly, from the
   exact-name clause for the one thing it names.
2. **Kind words optional**, when the query names one thing in two or more
   words and no entry the first pass found matched the name (see "Kind
   words"). The result replaces the first pass's only if it is not empty.
3. **Any words**, when the query still has no result and has tokens, or names
   something (a name with no word character, such as `<>`, leaves no tokens
   but its exact-name clause can still match).
4. **Fuzzy**, when still empty, the input is longer than 2 characters and has
   tokens: the tokens under 20 characters, at an edit distance of at most 2
   (`min(2, round(sqrt(length / 2 - 1)))`). Upstream applied the distance from
   the whole query's length to every word, and lunr's fuzzy expansion grows
   exponentially with it: three unindexed API names (49 characters, distance
   5) froze the page for 5 s at 1.6 GB, and four (70, distance 6) for over a
   minute.

The results then go through `boostWholeTitles()` ("Whole titles").

**Measured, and rejected:**
- Requiring each raw whitespace word, neither lowercased nor split like the
  index, makes every capitalised or hyphenated phrase silently fall back to
  the plain query. Lowercased properly, `AddressOf operator` and `64-bit
  compilation` vanish, because `operator*` can't match the stem `oper`. So
  each lunr token is required as its stem plus a trailing wildcard.
- The exact-name clause on every query lets `Error` take `error handling`'s
  rank 1, so it runs only for a query that names one thing.
- The all-words pass is the only fix for `symbol index` (rank 39 to 3): the
  `Index` property pages never contain "symbol".

### Kind words

A query naming one thing and its kind (`MaxHeight property`, `Continue
statement`, `VbTriState enum`) fails when the all-words pass
requires the kind word and a member's section rarely says "property",
"method" or "event" (`Continue`'s page never says "statement").

`namesTheThing()` tells whether a result matched the name: in `exact` or
`primary`, or every word of it in `title`. For a query naming one thing in
two or more words, if no entry the all-words pass found matched the name, the
pass runs again with the kind words not required (they still score).

Where requiring the word worked, it kept a different kind of the same name
out: `Mid function` finds a section of the Mid page, titled `Mid`; with the
word optional, the `Mid =` statement page, which never says "function", comes
in on its exact name. The exact-name test alone fell back there, since a
section carries no names, so the title counts as well.

**Measured, and rejected** (name-and-kind hit@1 over every symbol written as
its name and kind):
- Kind words never required: 93.9%, but 22 queries worse (`Mid function`,
  `Line statement`, `Timer event`), `Loop Control` 1 to 2 in the eval, and 3
  worse among qualified names typed as two words (`File Type`).
- Optional only when no result has the exact name: 94.7%, 4 worse (`Mid
  function`, `Stop method`).
- Optional only when no result has the name in its title or as its exact
  name: 91.1%, none worse. This is the shipped rule.

A plural kind word does not make a name (`Delegate Types`), see "Query
construction".

### Whole titles

After lunr ranks, a query of two or more tokens multiplies by 3
(`WHOLE_TITLE_BOOST`) the score of every result whose title, or page title
plus title, reads the same as the query, and re-sorts. Both sides are written
as `indexTermKey()` writes a term (tokenized, trimmed, stemmed), so case,
punctuation and word endings don't matter. Without it a one-word entry beats
a page titled with both words: `Return Syntax` loses to `Return`, `DTPicker
Properties` to the DTPicker class heading (the class heading has `DTPicker`
in its title at 200, the section only in `page` at 5). It adds no index term
and no field. Each entry's two keys are computed once, on its first
appearance in a result, about 100 ms on the first multi-word query after the
index is built and nothing measurable after.

`boostWholeTitles()` is at the end of `doSearch()`, which is outside
`initSearch()`, so the offline copy shares it. The replica needs `docs`
(`load()` returns it, and the test fixtures pass it too), so that it cannot
quietly skip the re-rank the client applies.

**Measured, and rejected** (page-title hit@1, page-plus-section hit@1):
- Whole title x1.5: 90.6%, 55.7%. x2: 91.9%, 85.0%. x3: 91.9%, 95.0%.
- x5 and x10: 94.0%, 96.7%, but 21 and 23 of the qualified names typed as two
  words get worse (99.59% and 99.55% against 100%). At x5 `_App Comments`
  lifts the `App` page's Comments section, since the trimmer drops the
  leading `_`. x3 leaves a margin.
- With singular-only kind words (see "Query construction") and x3 together,
  page-title hit@1 is 94.0% and page-plus-section 96.0%, with nothing worse.

### Qualified names and stem twins

`qualified` is boosted 500. Every entry holds the right token
(`FileListBox.Name` whole, and the query keeps it whole beside its parts), so
this is weighting, not recall. At boost 50 the container's page came first
(`FileListBox.Name` gave the FileListBox page, whose title matches
`filelistbox` at 200, above `#name`), and a heading naming several members
(`KeyDown, KeyPress, KeyUp`) came 20th behind every other control's single
`KeyDown`, since BM25 discounts its three-name title and `names`.

The qualified-name rules, all in the query table above:
- Only a token with a split dot completes in `qualified`.
- Two adjacent plain words are also a term on `qualified`, joined with a
  dot, at clause boost 10 (`FileListBox Name`). Without them two words
  naming a member had nothing tying them together. The pairs are exact terms:
  pairs that also completed with the wildcard moved `File I/O` from 1 to 2.
- The REQUIRED clause is split into presence and score, as under "Query
  construction".

**Measured, and rejected:**

| `qualified` boost | plain words complete in `qualified` | hit@1 | worse |
|---|---|---|---|
| 50 | yes | 94.18% | |
| 200 | yes | 98.83% | 1 (`vbFile` 1 to 2) |
| 1000 | yes | 99.41% | 4 (`error handling` 1 to 3, `System`, `TextAlign`, `vbFile`) |
| 300 | no | 98.93% | 0 |
| 500, 700, 1000 | no | 99.46% | 0 |

Every regression came from one mechanism: a plain word completing in
`qualified` by the trailing wildcard (`vbfile*` to all of
`vbfileattribute.*`), which at boost 500 pulls a container up by its member
count. For two-word queries, the boost alone lost a good section from the top
three on five probes (`form*` completing to every `form.*` in the REQUIRED
clauses). Taking `qualified` out of the REQUIRED clauses (96.93% spaced, 45
worse) lost entries that name their container nowhere else; the shipped
split, plus the word pairs, gives 99.82% spaced with none worse.

**Stem twins.** `Printer.Font` and `Printer.Fonts` both stem to
`printer.font`, so they tied in `qualified` and everywhere else a query for
either reached (`Printer.Fonts` came second; so did `Collection.Item`,
`Global.Printers`, `OLE.Update`, `Report.Page` and both
`WebView2*Headers.GetHeaders`). `exact` fixes this for bare names but holds
only bare names. `stemTwins()` finds the qualified names whose stem another
qualified name shares (104 names under 50 stems, mostly a function and its
`$` form: `strings.left` / `strings.left$`), and `qualifiedField()` appends
each twin an entry holds to its `qualified` field as `exactName()` writes it
(`printer_2efonts_`). The query's whole-qualified clause (a word with a dot,
or two adjacent words joined with one, as `exactName()` writes them) matches
it. A whole name that isn't a twin is in no field, so the clause matches
nothing for it.

**Measured, and rejected** (on every qualified name typed as two words):
- Every qualified name whole in `exact`: 19 MB more heap (293 to 312 MB) for
  14 queries.
- Only the twins whole in `exact`: made the entries holding them longer in
  the field bare names are ranked by, so `InStrB` fell from 1 to 2, behind
  its own section `Strings/InStr#instr-instrb`, and `MidB$` from 2 to 3 (BM25
  length normalisation).
- The twins whole in `qualified`: the bare-name ranking can't move, and the
  result held at clause boosts from 1 to 100. Shipped at 10; heap 293.1 MB.

### lunr patches

All installed once on the global `lunr`, from the tokenizer wrapper and
install block in both `initSearch()` copies and in the replica's
`loadLunr()`. The failure each patch fixes is described under "How lunr
behaves here".

- **Stop words kept** (Design §5 A).
- **The tokenizer wrapper** splits runs of two or more dots (Design §5 B) and
  decodes entities.
- **`separateTokenSetKeys()`** replaces `TokenSet#toString()` with a key that
  has a `,` after each child id. lunr 2.3.9's key made two different nodes
  collide, so the token set held words no entry has (`amp;h80004001010`) and
  lost real ones; a trailing-wildcard clause reaching an invented word threw,
  which any query with the word `a` did. Whether keys collide depends on the
  whole term set, so any content change can start it; check a candidate change
  with every page and section title as a query (3,658 titles, none throws).
  `toString()` is used only for these keys. The guard takes lunr's own
  `toString()` from `lunr.min.js` and checks that a 494-word fixture built from
  id 3 still collides with it, so the test says when a lunr upgrade changes
  this.
- **`accumulateSetUnions()`** replaces `Set#union` with one that, once it has
  made a set, adds the next set into it in place. lunr's `Index#query` unions
  once per expanded term and field of a REQUIRED clause, copying both sets
  each time, and a short word's wildcard expands to thousands of terms:
  quadratic. lunr's only unions are running totals that drop the set they
  replace, so nothing sees the change. It keeps lunr's own `length` (the first
  set's elements plus the second's, an element in both counting twice), which
  `intersect()` uses to choose the set it walks, so even the order of a set's
  elements is lunr's. Results, refs and scores are unchanged, checked over
  10,292 queries, one per page or section title; they take 86 s in the
  replica (7 over 200 ms, worst 331 ms), and `a page` takes 87 ms. The token-set guard's install
  check allows a second install after `separateTokenSetKeys()`.
- **`pinIndexFieldLengths()`** pins the `index` field's average length at 1.
- **`buildIndexInSlices()`** builds the index in slices (Design §5 C).

**Entities.** The search data keeps the page's HTML entities (`&amp;`,
`&gt;`, `&lt;`, `&#45;`), so the index held `amp;h80004005` while a query
trims to `h80004005`, and `&H80004005` found none of the five pages that
mention it. The data can't decode them: the client inserts `doc.title`,
`doc.doc` and slices of `doc.content` with `innerHTML` and highlights by
lunr's character positions in that text, so a decoded `&lt;Object&gt;` would
become a tag in the results panel and every highlight after an entity would
shift. Instead the tokenizer wrapper passes each token through
`decodeTokenEntities()`, which decodes `&amp;`, `&lt;`, `&gt;`, `&quot;`,
`&apos;`, `&nbsp;` and decimal and hexadecimal references, lowercased like the
rest of the token. `Token#update` keeps the token's position, which still
spans the escaped text, so the highlight covers `(&amp;H80004005)` and shows
`(&H80004005)`. The same wrapper runs on queries, where it changes nothing a
reader types. Limits: a decoded separator doesn't split its token
(`per&#45;lane` indexes as `per-lane`, which a query splits into two words);
punctuation inside a token still blocks a match (`Emit(&amp;Hb8,` indexes as
`emit(&hb8`), as for any text; and the operator characters the entities spell
(`<`, `>`) still trim away, so operators stay with their exact names (see
"Operators").

**Cost left.** The remaining cost of a one-letter word (`a p` about 250 ms, a
single letter 80–110 ms, in the replica) is lunr's own work (43% in
`Index#query` itself): each one-letter word
expands to thousands of terms in three clauses. Making it cheaper means
changing the query, for instance not completing a one-letter word, and so the
ranking; that needs its own measurement and the user's call (Next, item 3).

### Hand-marked index entries

Entries live in the page, not a central file, so an entry moves with its text
and a renamed heading can't strand it. A page takes `index:` / `index_also:`
in its frontmatter (a term or a list); a heading takes `{: index="a; b" }` /
`{: index_also="..." }`, like a pinned id. `index` is the main entry, where a
reader of that term wants to land first; `index_also` a strong second
answer. Documented for authors in `docs/Documentation/Authoring.md`, "Index
entries for the site search".

**Build.** `render.mjs`'s `searchIndexMarksPlugin` runs after `header-id`,
takes both attributes off every heading into `env.searchIndexMarks` as
`{ id, index, index_also }`, and throws on either attribute anywhere else,
since it would be published and do nothing. `search.mjs` gives each section
the ids of every heading it holds (its own, deeper ones and folded ones),
attaches heading marks by id (an error if no entry holds that heading) and
frontmatter marks to the page's own entry, keeps terms in the order written,
once each regardless of case, drops a main term from the same entry's
secondary ones, and emits `index` / `index_also` as JSON lists. On main,
`checkIndexTerms` throws when two entries claim one term as `index` (compared
without case, a hyphen counting as a space). The client also stems, so `late
bindings` and `late binding` would still collide there without failing the
build: keep terms in their plain form.

**Client**, in all three copies:
- One lunr field `index`, boost 1000. Each term is one token: its words
  tokenized, trimmed and stemmed as the index holds words, joined by `_`,
  with `_` appended (`late_bind_`). A secondary term has one more `_`.
- The query adds, for every run of up to four consecutive words, that run's
  key at clause boost 5 and the key plus `_` at boost 1, on `index` only. So
  a term matches only a query that names all of it, alone or among other
  words: `binding` alone doesn't match `late binding`. Main and secondary
  therefore weigh 5 to 1.
- The terms are appended to the entry's content as plain words, so the
  all-words pass, which requires every word in the text fields, still finds a
  marked entry.
- `pinIndexFieldLengths` sets the field's average length to 1: BM25 compares
  a field's length with its average over every entry, and `index` is empty on
  nearly every entry, so a marked entry looked a thousand times too long.

The boosts sit in the client beside every other boost, not in
`docs/_config.yml`: the client reads no site config.

**Measured, and rejected:**
- Two fields (main, secondary) with no length pin: the first three entries
  barely moved (`late binding` 5 to 2, the other two unchanged). With the pin
  all three went to rank 1.
- Boosts, main/secondary: 1000/200 and 200/50 both put them at rank 1, but
  only 1000/200 keeps CreateObject right behind Data-Types for `late
  binding` (at 200/50 the `Bind` method comes between). 100/20 left `late
  binding` at 2; 50/10 and 20/5 fixed nothing.
- Weighting longer word runs higher changed nothing.
- Heap: two fields plus a words field cost 24 MB (288 to 312 MB); the words
  in `content` brought that to 10 MB, and one field for both levels to 5 MB,
  with identical results. Hence one field, with the secondary level encoded
  as one more `_`.

### Index entry decisions

The rules for writing entries are under "Rules for index entries" above. The
decisions behind them, and what the measurements ruled out:

- **A Glossary definition counts as a right answer for its term, within the
  top 5.** A term whose Glossary definition already ranks first gets no
  entry.
- **A term whose stem is a bare name's reorders that name, so there is no
  entry for it.** `declaration` (stem `declar`) put `Declare` 2nd; `comment`
  put the `Comments` property 2nd; their Glossary definitions are 2nd and 5th
  without an entry, which the ruling counts. `array` and `delegates`: an
  index term shares its stem with the bare name (`deleg_`; the stem can't tell
  singular from plural), so an entry for `arrays` or `delegates` made the
  concept page first and the element second for `array`, `Array`, `arrays`,
  `delegate`, `Delegate` and `delegates`, and made the eval 2 worse (bare
  `Array` and `Delegate`, 1 to 2).
- **`pointers` is a secondary entry** ("at a lower priority"): the Pointers
  page goes 3 to 1 and bare `Pointer` is untouched (a main entry cost it 6 to
  7), but `Pointer field` goes 3 to 4, kept at the user's request.
- **A secondary entry can overtake a page that ranks first only on its own
  text.** CommandButton's `access key` put it above Label, and UDTs' `user
  types` would have put it above Type. The page meant to be first takes a
  main entry for the term too.
- **A one-word term matches every query holding the word.** The Packages
  page's `twinpack` entry beat `Importing a Package from a TWINPACK File`
  typed whole; a secondary entry on the Importing page restored it.
- **A term matches only whole words.** `type character` doesn't match `type
  char`, so each spelling a reader types is its own term (`register COM
  dll`, `register dll`, `create dll`, `typedecl char`, `typedecl character`).
  Capitals don't matter.
- **Decided by the user:** `user defined types` and `user types` go to Type,
  then UDTs; `event handlers` to Handlers, then the Forms tutorial's handler
  step; `namespaces` to a new Glossary definition that links the relevant
  pages, then the Packages page; `twinpack` to Creating-TWINPACK, then the
  other package pages; `standard exe` and `create an ActiveX DLL` to the New
  Project dialog's options (main entry), with Project Settings' *Build Type*
  and Project-Types as secondary entries (Project-Types covers types "beyond
  the traditional EXE and ActiveX DLL/Control").
- **`default property`.** A VB6 reader means a class's default member, which
  `[DefaultMember]` sets (Attributes). An entry there, main or secondary
  alike, puts it above CommandButton's `Default` property for the
  name-and-kind query `Default property` (1 to 2); search ignores case, so
  the two are one query. A Glossary definition headed *default property*
  matched the whole query, took rank 1 at x3 and pushed `Default` to 2, the
  same trade. The user chose a Glossary definition headed *default member*,
  with *default property* as the other name and a link to `[DefaultMember]`:
  it lands at 5, where a Glossary definition counts, with nothing worse.
- **Placing a section can move words between entries.** A section placed
  before a page's folded `Example` takes the Example into its own entry
  instead of the page's top entry, which loses its words (a *Named arguments*
  section before Call's *Example* took `statement` away: `Call statement` fell
  1 to 5). New sections go after the Example.
- **A survey's "already fine" list is rechecked** before it is used as
  guards: one such list was wrong at least once (`optional parameters` landed
  on Compiler-Options).
- **A term that is not a symbol reorders no bare name.** `ByRef` and `ByVal`
  are not symbols, so their entries are safe.
- **Terms with no entry, because the right page is already first or in the
  top 3:** `continue statement` (fixed by the kind-word fallback),
  `packages`, `inline assembly`, `import a vbp project` and `breakpoints`.
- **Prose guards, not added:** 53 queries already at rank 1 (41 jargon, 12
  glossary: `generics`, `multithreading`, `static linking`, `migrate from
  VB6`, `unit testing`, `data type`, `date literal`, `control array`) could
  join the prose set. They don't discriminate, but would catch a regression.

### Section entries

- `extractSections` takes only the page's first heading for the title, when
  it reads the same as the page's title and has no prose before it: that
  entry gets the page's URL and no prefix entry is made. A later heading that
  reads the same is a member. On Shape and Timer the h1 is "Shape class" /
  "Timer class", so `### Shape` and `### Timer`, which document the Shape and
  Timer properties, keep their own entries (`#shape`, `#timer`), and
  `Shape.Shape` and `Timer.Timer` are found.
- A page whose first heading does not read as its title, or whose prose comes
  before its first heading, gets a prefix entry beside its first section (the
  page's URL, the text before the first heading, often empty).
  The first-heading rule matters for four pages: Shape, Timer, and two prose
  pages whose h1 differs from the title and whose second heading repeats it
  (`Features/Standard-Library/New-Functions`, `Challenges/1`).

### Rejected: tier-specific exact fields (X1t)

Splitting `exact` into `exact1`/`exact2`/`exact3` by symbol kind, with
descending boosts, measured no better than flat `exact` (hit@1 90.0% against
90.1%) and ordered tiers worse (48 violating queries against 42). It would
also need the build's join to emit each symbol's kind. **This is superseded:**
it was measured while a lone clause's boost cancelled out, so it never had a
fair test. Done with field boosts, as the `primary` field, it took tier-order
violations to zero. Don't rebuild X1t without a new idea.

The explanation that CheckBox's `names` field lists too few members was false:
both entries' `names` are the single word `CheckBox`. The difference is the
content: the CheckBox page's top entry (`/tB/Packages/VB/CheckBox/`) has 1
character, since a class's introduction sits under its own heading
(`#checkbox-class`), while `DTPicker › CheckBox` has 467 characters that
mention "checkbox" several times.

### Known misses and limits

The counts are in "Resuming this work"; the diagnoses are here.

- **Three page titles and ten page-plus-section queries**, each at rank 2 or
  3:
  - `Mid =`: the trimmer drops `=`, so the query is `Mid`, one word, and the
    Mid function (tier 1 for `Mid`) comes before the `Mid =` statement. An
    operator-like title, like those left out of the set. `Input #` is the
    same.
  - `Compiler and IDE Features`: the Features page's section of the same
    title, then the page. Both read the same as the query.
  - `WebView2 Package`: `/tB/Packages/WebView2/WebView2`, then the package
    page.
  - Sections behind a page whose name contains or stems like theirs:
    `Printers Properties` behind `Printer#properties`; the six `Html*` pages
    (`HtmlElement Properties` behind the same page's second Properties
    section, which documents the `HtmlElement.Properties` member, so the set
    leaves it out, and behind `HtmlElements#properties`); `UpDown Properties`
    behind `DTPicker#updown`; `ParentControls Members` behind
    `UserControl#parentcontrols`; `Timer Properties` behind the Timer
    function.
  - None is a reader's likely query in a form the bare-name or qualified sets
    don't already cover, and each would need its own tweak.
- **Name and kind**: the misses are mostly properties and not diagnosed
  further.
- **Question-shaped queries miss the index entries.** `how do I register a
  com dll` finds the FAQ, not ActiveX Registration: the all-words pass
  requires `how`, `do` and `I` too, and only the FAQ holds them all.
- **Odd results the qualified-name rules don't change:** `Form events` puts
  `/tB/Core/Event` first and `Form#events` second (the Form page's own entry
  lacks `event`, so the all-words pass drops it; `events` stems to `event`,
  the Event page's title and name); `Fonts property` puts
  `AmbientProperties/Font` first.
- **The whole-title re-rank is a post-pass outside lunr's scoring.** Whether
  a hand-marked index entry should outrank it if the two ever disagree is
  untested: no prose query has a heading of the same text elsewhere.
- **Soft notes from the glossary and jargon survey, not changed:**
  Project-Types' Kernel-Mode Drivers section names the "Native subsystem"
  setting without linking it, and twinBASIC-Additions' changelog anchors
  outrank the Features pages for `inline assembly`.
- **The builder docs are in the reader's search**, and may crowd other
  site-tooling words: `dark mode` needed an entry to keep the site's own build
  docs (Documentation/Development) off rank 1; `compile to exe` puts
  `TbExpressionService.Compile` first. Noted, not changed.
- **Open content gaps:** `COM interop` (no clear target: Categories' COM and
  Automation list, Interfaces-CoClasses, ActiveX Registration), subclassing
  (only the FAQ mentions it), IntelliSense (no page names the feature) and
  conditional breakpoints (the Debug menu shows none; check the IDE first).

## Future work

### Operators

All 24 operator symbols (`<` `<=` `<>` `=` `>` `>=` `&` `&=` `/` `/=` `^` `^=`
`\` `\=` `<<` `<<=` `-` `-=` `*` `*=` `+` `+=` `>>` `>>=`) are at rank 1,
through exact names that spell non-word characters (`<>` → `_3c_3e_`). The
causes, which still explain why operators need exact names:

- **Content.** `stripHtml` leaves `<` and `>` as the entities `&lt;` and
  `&gt;`, so the literal character never reaches the index. (Entities are
  decoded per token, see "lunr patches"; the trimming below
  still applies.)
- **Trimming.** lunr's trimmer strips non-word characters from both ends of
  every token, in the index and in the query. An operator token trims to
  nothing.
- **Separators.** `/` and `-` are tokenizer separators, so a search for `/` or
  `-` contains no tokens at all.

Some operator pages are titled by category, not by symbol: `<` is documented on
"Comparison". An alias table (`<` → `less-than`, `&` → `ampersand
concatenation`) was considered and is not needed; it would need its own
measurement (a check that aliases like "less" don't crowd prose) and a home
in the package API or the symbol index, not a hand-kept list.
