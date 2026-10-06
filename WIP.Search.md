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
  ([Fixed: kind words](#fixed-kind-words)).
- 10 bare names: 7 enum constants, 2 members, and `MidB$`
  ([Same-page sections count](#same-page-sections-count)).
- 3 page titles and 10 page-plus-section queries, each at rank 2 or 3
  ([Fixed: whole titles](#fixed-whole-titles)).
- 1 page title, `Input #`, at 2 behind the `Input` function: the query trims
  to `input`, and the title set skips one-word titles.
- 3 prose queries, `declaration`, `comment` and `default property`, whose
  Glossary definitions are 2nd, 5th and 5th. That is right by the user's
  ruling (a Glossary definition counts within the top 5). An entry would
  reorder the bare names `Declare` and `Comments`
  ([Item 6: shipped](#item-6-shipped)), and one for `default property` would
  put it above CommandButton's `Default`
  ([Item 7](#item-7-content-and-index-entries-from-two-surveys)).

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
   ([Fixed: slow multi-word queries](#fixed-slow-multi-word-queries)).
4. **More content and index entries**, under the rules below. Open:
   `COM interop` (no clear target) and three content gaps: subclassing,
   IntelliSense and conditional breakpoints (first find out whether the IDE
   has the last two). See
   [Item 7](#item-7-content-and-index-entries-from-two-surveys).
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
([third round](#what-shipped-third-round-the-index-pilot)).

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
  change can start it. Patched; see "Fixed: lunr invented words". Check a
  candidate change with every title as a query, not only the eval, since the
  eval never types `a`.
- The search data must keep the page's HTML entities: the results panel
  inserts titles and content with `innerHTML` and highlights by lunr's
  character positions in that text. Decode inside the index instead, per
  token, after the tokenizer splits (`Token#update` keeps the position); see
  "Fixed: entities in the index".
- lunr 2.3.9's `Set#union` copies both sets, and `Index#query` unions once
  per expanded term and field of a REQUIRED clause, so a short wildcard word
  was quadratic. Patched (`accumulateSetUnions()`); see "Fixed: slow
  multi-word queries". Profile before guessing: `node --cpu-prof`.

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
  and deduplicated. Client boost 500 (see "What shipped, fourth round:
  qualified names").

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
Every keyword query it fixes goes to rank 1, and the fix isn't specific to
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
regressions" are not acceptable, and neither is the pre-rollout baseline as a
reference. A result is judged by what a reader typing the query most
plausibly wants. Rank 1 is the measure that matters; hit@10 and MRR are
secondary.

The first ground truth counted a bare name as correct if *any* page
documenting that name was hit. That is too lax: for `CheckBox` it accepts
`DTPicker › CheckBox`, but the reader wants the CheckBox control.

### The intent ground truth

For a bare name, the expected results are ordered by tier. Higher tiers come
first, and lower tiers must still appear below them; nothing is excluded:

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
member. Prose queries expect the dedicated page, not a summary section that
only links to it.

Of the 2,884 bare names: 318 are types, 453 language elements, 1,132 enum
constants and 981 member-only. 115 have a doubtful expectation, listed by the
script: mostly statements with several pages (`For` has For...Next and For
Each...Next; `GoSub`, `On`, `Input`), plus `Line` and `Timer`, where a type
outranks a same-named statement or enum and either could be argued.

It is `eval/search_quality.mjs`'s primary ground truth; the experiments' copy
is
[eval/search-experiments/intent/intent_gt.mjs](eval/search-experiments/intent/intent_gt.mjs).

**Prose ground truth.** The expectations for `64-bit compilation`, `Fusion`,
`symbol index` and `array bounds checks` are right, so their misses are
ranking problems. For `conditional compilation` the user chose
`/tB/Core/Topic-Preprocessor` (the `#If`/`#Const` page), with
`/Reference/Compiler-Constants` right behind.

### Three fixes, measured

Each was a client-side change to a copy of the replica,
[eval/search-experiments/intent/variants.mjs](eval/search-experiments/intent/variants.mjs),
measured by `eval_variants.mjs` beside it.

- **X1, an exact-name field.** It fixes an exact name losing to a longer or
  plural one (`Node` to `Nodes`, `ListItem` to `ListItems`, `vbForm` to
  `vbFormCode`), and `Time$`, whose `$` the index trims but the query kept.
  At index-build time, every name in the doc's `names` field is lowercased
  and suffixed with `_` into a field `exact`: `node_`, `time$_`, `vb_`. At
  query time, for each whitespace token, the term `token + "_"` is added on
  `exact` only, with no wildcard. The trimmer keeps `_` as a word character,
  and every Porter stemmer rule anchors on the end of the word, so a trailing
  `_` passes through untouched. It is derived in the browser, so the download
  doesn't grow.
- **X2, a page-title field.** Index each entry's `doc` (its page's title) as a
  field `page`. A page whose own title matches the query then outranks a
  summary section on another page (`Features › Fusion` against the Fusion
  page).
- **X3, all words first.** With 2+ whitespace tokens, first query with every
  token REQUIRED (each via its wildcard form, so an exact or a prefix match
  satisfies it; the exact and dot-split clauses stay optional). If that finds
  nothing, fall back to the plain query. It doesn't move the aggregate, but
  it is the only fix for `symbol index` (rank 39 → 3): the `Index` property
  pages never contain "symbol".

| configuration | hit@1, old ground truth | hit@1, intent |
|---|---|---|
| before (committed) | 89.5% | 89.0% |
| X1 | 90.1% | 89.5% |
| X2 | 92.3% | 91.8% |
| X3 | 89.5% | 89.0% |
| X1t (tiered exact fields, below) | 90.0% | 89.3% |
| X1 + X2 | 92.9% | 92.4% |
| **X1 + X2 + X3 (recommended)** | **92.9%** | **92.4%** |

The recommended combination made no query worse; cost was +13% index build
and +11% heap, paid only when a reader starts searching.

### Rejected: tier-specific exact fields (X1t)

Splitting `exact` into `exact1`/`exact2`/`exact3` by symbol kind, with
descending boosts, measured no better than flat X1 (hit@1 90.0% against
90.1%) and ordered tiers worse (48 violating queries against 42). It would
also need the build's join to emit each symbol's kind. **This is superseded:**
it was measured while a lone clause's boost cancelled out, so it never had a
fair test. Done with field boosts, as the `primary` field, it took tier-order
violations to zero (see "What shipped, second round"). Don't rebuild X1t
without a new idea.

**The CheckBox control's `names` field does not list every member**, as the
X1t measurement blamed it for doing. Both entries' `names` are the
single word `CheckBox`. The real difference: the CheckBox page's top entry
(`/tB/Packages/VB/CheckBox/`) has **1 character** of content, while
`DTPicker › CheckBox` has 467 characters that mention "checkbox" several
times. A class's introduction sits under its own heading (`#checkbox-class`),
which leaves the page's top entry empty. This is the lead for `CheckBox` and
probably for the other types that miss (`Line`, `Timer`, `BorderStyle`): look
at how a page's top entry and its first section are split, and consider
merging an empty top entry into the first section, or giving it the page's
introduction.

### What shipped

X1 + X2 + X3 as measured made 14 queries worse, so four corrections, each
measured, are part of the shipped design:

1. **X3's required terms.** Requiring each raw whitespace word, neither
   lowercased nor split like the index, makes every capitalised or
   hyphenated phrase silently fall back to the plain query. Lowercased
   properly, `AddressOf operator` and `64-bit compilation` vanish, because
   `operator*` can't match the stem `oper`. So each lunr token is
   required as its stem plus a trailing wildcard, with `usePipeline: false`.
2. **X1's boost.** A clause alone on a field has its boost divided back out
   (see "How lunr behaves here"), which is why boosts 50–1000 measured the
   same. Field boost 50 on `exact`; the other clauses name every
   field but `exact` (otherwise `node*` matches `nodes_`); `exact` is queried
   only for a one-word query (`error handling` loses its answer to
   `Error` otherwise). How `exactName()` spells `$` and other non-word
   characters is under the second round.
3. **X2's boost is 5, not 20.** At 10 or 20 the `Folder` page outranks
   `Folder.Parent` and `Folder.Path`, which are documented on `FileSystemItem`.
4. **Query tokens are trimmed as the index trims them** (`lunr.trimmer`). This
   keeps 8 `Xxx$` qualified queries that X2 would make worse, finds every bare
   `Xxx$` function, and subsumes the asterisk guard,
   since an all-`*` token trims to nothing.

Both client copies are checked in a browser against
`eval/site_search.mjs`. `test/search.test.mjs`'s reader-intent guard covers
the fields and the query.

### What shipped, second round: tiers in the index

The remaining failures sorted into four mechanisms, measured one at a time:

1. **Same-name entries of different tiers tied, and length decided.** `Left`,
   `Right`, `BorderStyle`, `WindowState`, `StartupPosition`, `Next`,
   `Default`, `Month`, `Print`, `Lock`: the function, enum or statement and
   the members all matched `exact` equally, and BM25 then favoured the short
   member entries. An enum page lost further, since its `exact` also held
   every constant's name. Fixed with a `primary` field: the build's join
   lists the names that are types or language elements (`isPrimarySymbol` in
   `builder/search.mjs`), and the client indexes them as exact names at field
   boost 1000. Boost 200 left 9 names out of tier order; 500 left 2; 1000
   leaves none.
2. **`#If`, `#Const`, `#Else` lose their `#`** to lunr's trimmer and match
   the `If` function. `exactName()` spells every non-word character as
   `_` and its hex code (`#if` → `_23if_`), so they stay distinct. So do
   `Time$` against `Time` and `Error$` against the `Error` statement, and
   the 24 operators (`<>`, `&=`, `*`) become findable: the exact-name clause
   runs even when a query leaves no tokens.
3. **REQUIRED clauses searched every field** (see "How lunr behaves here").
   They are restricted to the text fields.
4. **`With statement` then fell to 2**, because its rank 1 had come from that
   leak. Fixed properly: a query names one thing if it has one word, or one
   word besides words naming a kind (`KIND_WORDS`, the kinds in
   `tB/symbols.json` less `enumvalue`). `error handling` still names nothing.

Result: bare hit@1 98.8%, language elements 94.7%, types 100% in the top 10,
names out of tier order 0; 53 queries better, none worse; index build +5–6%.
`test/search.test.mjs` compares `exactName()` and `KIND_WORDS` by behaviour
across the online client and the replica.

### What shipped, third round: the index pilot

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
attaches heading marks by id and frontmatter marks to the page's own entry,
and emits `index` / `index_also` as JSON lists. On main, `checkIndexTerms`
throws when two entries claim one term as `index` (compared without case, a
hyphen counting as a space).

**Client**, in all three copies:
- One lunr field `index`, boost 1000. Each term is one token: its words
  tokenized, trimmed and stemmed as the index holds words, joined by `_`,
  with `_` appended (`late_bind_`). A secondary term has one more `_`.
- The query adds, for every run of up to four consecutive words, that run's
  key at clause boost 5 and the key plus `_` at boost 1, on `index` only. So
  a term matches only a query that names all of it, alone or among other
  words: `binding` alone doesn't match `late binding`.
- The terms are appended to the entry's content as plain words, so the
  all-words-first pass, which requires every word in the text fields, still
  finds a marked entry.
- `pinIndexFieldLengths` sets the field's average length to 1 (see "How lunr
  behaves here").

**The first three entries** (placed by reading the pages; existing links were
leads only):

| term | `index` | `index_also` |
|---|---|---|
| conditional compilation | `/tB/Core/Topic-Preprocessor` (page) | `/Reference/Compiler-Constants` (page) |
| late binding | `/Reference/Data-Types#object` | `/tB/Modules/Interaction/CreateObject` (page) |
| 64-bit compilation | `/Features/64bit` (page) | |

`symbol index` needed none: the user ruled that Permanent-Links' definition
counts as well as Building's section, and the definition ranks first on its
own text.

**Measured:**
- With two fields and no length pin, the entries barely moved anything
  (`late binding` 5 → 2, the other two unchanged): BM25's average length for
  a nearly empty field. With the pin, all three went to rank 1.
- Boosts, main/secondary: 1000/200 and 200/50 both put the three at rank 1,
  but only 1000/200 keeps CreateObject right behind Data-Types for `late
  binding` (at 200/50 the `Bind` method comes between). 100/20 left `late
  binding` at 2; 50/10 and 20/5 fixed nothing.
- Weighting longer word runs higher changed nothing, so it was dropped.
- Two fields plus a words field cost 24 MB of heap (288 → 312 MB); the words
  in `content` brought that to 10 MB, and one field for both levels to 5 MB,
  with identical results.
- Result: 0 queries worse, 3 better; index build +3–8%, heap 292 MB.

The boosts sit in the client beside every other boost, not in
`docs/_config.yml`: the client reads no site config. `test/search.test.mjs`
covers the marks' path from page to entry, the render rule, the one-main-entry
check, and the client patch by behaviour.

### What shipped, fourth round: qualified names

432 qualified queries missed rank 1: 338 at 2–5, 92 at 20–27. Every entry
already held the right token (`qualified` keeps `FileListBox.Name` whole, and
the query keeps it whole beside its parts), so this was weighting, not recall:
- **The container's page came first** (333, most at rank 2):
  `FileListBox.Name` → the FileListBox page, whose title matches
  `filelistbox` at boost 200, above `#name`, whose `qualified` match counted
  at 50.
- **Headings naming several members fell furthest**: `Slider.KeyDown`, under
  `KeyDown, KeyPress, KeyUp`, came 20th, behind every other control's single
  `KeyDown`, since BM25 discounts its three-name title and `names`.

Measured with knobs in the replica:

| `qualified` boost | plain words complete in `qualified` | hit@1 | worse / better |
|---|---|---|---|
| 50 (before) | yes | 94.18% | |
| 200 | yes | 98.83% | 1 / 421 (`vbFile` 1 → 2) |
| 1000 | yes | 99.41% | 4 / 423 (`error handling` 1 → 3, `System`, `TextAlign`, `vbFile`) |
| 300 | no | 98.93% | 0 / 423 |
| 500, 700, 1000 | no | 99.46% | 0 / 423 |

The regressions all came from one mechanism: a plain word completing in
`qualified` by the trailing wildcard, to every member of each container whose
name it begins (`vbfile*` to all of `vbfileattribute.*`). At boost 50 that
was noise; at 500 it pulled a container up by the number of its members. So
only a token with a split dot may complete there.

The eval's symbol queries are one word each, so two-word queries were checked
separately, on probes (`Form events`, `ListView events`, `TextBox properties`,
`Printer object`, `DTPicker format`, `Slider value`, `FileListBox Name`,
`Debug Print`, ...) and on every qualified symbol written as two words
(`FileListBox Name`, 5108 queries, not saved as ground truth). The boost alone
lost a good section from the top three on five probes, through the same
mechanism in the all-words pass's REQUIRED clauses (`form*` completing to
every `form.*`):

| two-word variant | spaced hit@1 | worse / better than before | probes |
|---|---|---|---|
| before | 97.75% | | |
| boost 500, REQUIRED unchanged | 98.84% | | 5 worse |
| REQUIRED off `qualified` | | 36 gone from the results | fixed |
| REQUIRED over all, scored off `qualified` | 96.93% | 45 / 0 | fixed |
| the same, plus word pairs | 99.82% | 0 / 106 | fixed or better |
| the same, pairs also completing | | | `File I/O` 1 → 2 |

Taking `qualified` out of the REQUIRED clauses lost entries that name their
container nowhere else (`_HiddenModule Input`, `CefEnvironmentOptions
LogFilePath`), so presence and score are split: a REQUIRED clause over every
text field at boost 0, which only decides who qualifies, and a second clause
that scores the word off `qualified`. lunr ORs a REQUIRED clause's fields and
adds boost-0 terms to the query vector at zero weight, so this changes no
presence and no other score. Without `qualified`, two words naming a member
(`FileListBox Name`) had nothing tying them together, so every two adjacent
plain words are also a term on `qualified`, joined with a dot, at clause
boost 10.

**Shipped**, in all three copies: `qualified` at boost 500; plain words
complete in the text fields less `qualified`; word pairs on `qualified`; the
REQUIRED split. Result: hit@1 94.18% → 99.46%, qualified hit@1 99.8%, two-word
qualified 99.82%, 0 queries worse, no new field or term (search-data and heap
unchanged). `test/search.test.mjs`'s qualified-name guard checks the online
client's clauses by pattern and the replica by behaviour; mutations (boost 50,
plain words completing in `qualified`, no pairs, the REQUIRED clause scoring
in or dropped off `qualified`) each fail it.

The stem collisions and the entries with no `#shape` / `#timer` are handled in
[Fixed: stem twins](#fixed-stem-twins) and
[Fixed: a member heading taken for the page title](#fixed-a-member-heading-taken-for-the-page-title).

### Fixed: a member heading taken for the page title

`extractSections` takes only the page's first heading for the title, when it
reads the same as the page's title and has no prose before it: that entry gets
the page's URL and no prefix entry is made. A later heading that reads the same
is a member. On Shape and Timer the h1 is "Shape class" / "Timer class", so
`### Shape` and `### Timer`, which document the Shape and Timer properties,
keep their own entries (`#shape`, `#timer`), and `Shape.Shape` and
`Timer.Timer` are found.

The rule matters for four pages' entries: Shape and Timer, and two prose pages
whose h1 differs from the title and whose second heading repeats it
(`Features/Standard-Library/New-Functions`, `Challenges/1`). Those two have an
empty page entry beside the section, as 272 other pages do (every page whose h1
differs from its title).

### Fixed: stem twins

`Printer.Font` and `Printer.Fonts` both stem to `printer.font`, so in
`qualified`, and everywhere else a query for either reached, the two tied;
`Printer.Fonts` came second. So did `Collection.Item`, `Global.Printers`,
`OLE.Update`, `Report.Page` and both `WebView2*Headers.GetHeaders`, and the
same seven written as two words (`Printer Fonts`). For bare names `exact` had
fixed this, but its clause matched nothing for a qualified name: `exact` held
only bare names.

Measured with knobs in the replica, and on the throwaway set of every
qualified name written as two words:

| variant | worse / better | two words, hit@1 | heap | new terms |
|---|---|---|---|---|
| before | | 99.86% | 292.8 MB | |
| every qualified name whole in `exact` | 0 / 7 | 99.86% (no clause for two words) | | 5108 |
| the same, plus word pairs whole on `exact` | 0 / 7 | 100% | 311.6 MB | 5108 |
| only the stem twins whole in `exact`, plus pairs | **2** / 7 | 100% | 293.1 MB | 104 |
| only the stem twins whole in `qualified`, plus pairs (clause boost 1, 10 or 100) | 0 / 7 | 100% | 293.1 MB | 104 |

- Every qualified name whole cost 19 MB of heap for 14 queries.
- Only the twins, but in `exact`, made the entries holding them longer in the
  field bare names are ranked by. `InStrB` fell from 1 to 2, behind its own
  section `Strings/InStr#instr-instrb`, and `MidB$` from 2 to 3, both BM25
  length normalisation.
- In `qualified` the bare-name ranking can't move, and the result held at
  clause boosts from 1 to 100.

**Shipped**, in all three copies: `stemTwins()` finds the qualified names
whose stem another qualified name shares (104 names under 50 stems, mostly a
function and its `$` form: `strings.left` / `strings.left$`), and
`qualifiedField()` appends each twin an entry holds to its `qualified` field
as `exactName()` writes it (`printer_2efonts_`). The query adds, on
`qualified` at clause boost 10, every word with a dot in it and every two
adjacent words joined with a dot, as `exactName()` writes them. A whole name
that isn't a twin is in no field, so it matches nothing.

Result: qualified hit@1 100%, every qualified name as two words 100% (0
worse); heap 293.1 MB, 26,133 index terms; search-data unchanged.
`test/search.test.mjs` checks all three copies fill `qualified` through
`qualifiedField()`, compares the online client's `stemTwins()` and
`qualifiedField()` with the replica's by behaviour, and ranks twins in a small
index both ways.

Probes with known odd results, unchanged by this: `Form events` puts
`/tB/Core/Event` first and `Form#events` second; `Fonts property` puts
`AmbientProperties/Font` first.

### Same-page sections count

Where a symbol's URL is a page, not a section of one, any section of that
page counts for it too. `DefInt` is documented by the Deftype page, and its
section headed `DefBool, DefByte, DefInt, ...`, which ranked first, lands the
reader on the same definition; so do `Chr#chr-chrb-chrw` for `ChrB` and
`Left#left-leftb` for `LeftB`. `eval/search_quality.mjs` judges by this, as
ground truth `intent-3`; it applies to bare and qualified names alike, and
not to prose, which already matched by path. It moved 24 queries from rank 2
to rank 1 and nothing else.

`MidB$` stays a miss, rightly: its first result is the `MidB =` statement
(`/tB/Core/MidB-equals`), a different page, and the Mid function it names is
second.

### Fixed: lunr invented words

The replica threw inside lunr (`Cannot read properties of undefined (reading
'_index')`) for 103 of 3,658 page and section titles, every one holding the
word `a` (or `&amp;`). So did both real clients: typing `a` left the results
empty and logged the error.

lunr's index keeps a token set of its terms for wildcard and fuzzy matching.
Built from this site's terms, it held `amp;h80004001010`, which no entry has,
and lacked `amp;h80004001` and `amp;h80004005`, which six pages have. A
trailing-wildcard clause reaching the invented word (`a*`, `am*`, `amp*`)
found no postings for it and threw.

The cause is lunr 2.3.9's `TokenSet.Builder#minimize`, which merges nodes
whose `TokenSet#toString()` match. That key is the final flag, then each
edge's label and its child's numeric id with nothing between: `{1 -> 656}`
and `{1 -> 6, 5 -> 6}` (6 being the shared leaf) both key as `01656`. Whether
keys collide depends on the whole term set and on the ids nodes happen to
get. Rebuilding the token set with a `,` after each id gives exactly the
index's terms.

**Shipped**, in all three copies: `separateTokenSetKeys()` replaces
`TokenSet#toString()` with the separated key, installed once beside the
tokenizer wrapper. `toString()` is used only for these keys. Result: 0 of
3,658 titles throw; the token set matches the index terms.

`test/search.test.mjs`'s token-set key guard takes lunr's own `toString()`
from `lunr.min.js`, checks that a 494-word fixture built from id 3 still
collides with it (so the test says when a lunr upgrade changes this), and
that the online client's and the replica's keys keep the fixture exact.

### Fixed: whole titles

Two probe sets were built from the site (`eval/search-experiments/probes/`),
then shipped as ground truth `intent-4`.

**Diagnosis.**
- `New Functions`: `ServiceState#new` (689) above the page (437). `functions`
  is a kind word, so the query names `New`, and the exact-name clause matches
  `new_` in the method's `exact`. The page matches both words in its title and
  `page`.
- `Form events`: `/tB/Core/Event` (210) above `Form#events` (151). The
  exact-name clause (`form_`) plays no part: the Form page's own entry lacks
  `event`, so the all-words pass drops it. `events` stems to `event`, the
  Event page's title (200) and name (100); `Form#events` has `form` only in
  `page` (5) and its URL.

**How widespread:**
- *titles*: every page's own multi-word title typed as is (149): 84.6% at
  rank 1. The misses are a one-word symbol entry beating a page titled with
  both words (`Return Syntax` → `Return`, `Delegate Types` → `Delegate`), made
  worse where the other word is a kind word.
- *sections*: `<page title> <section title>` for the section titles 20+ pages
  share, such as `DTPicker Properties` (300): 22.7% at rank 1, 94.3% in the
  top three. In 182 of the 232 misses the page's own `X class` heading wins:
  it has `X` in its title (200), the section only in `page` (5).

**Measured**, both sets and every qualified name as two words (*spaced*):

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

*Whole title*: after lunr ranks, a query of two or more words multiplies the
score of every result whose title, or page title plus title, reads the same
as the query (compared as `indexTermKey()` writes both: tokenized, trimmed,
stemmed). It adds no index term and no field; the keys are computed once per
entry, on first use. At ×5 it goes wrong: `_App Comments` lifts the `App`
page's Comments section, since the trimmer drops the leading `_`. ×3 leaves a
margin. Latency: about 100 ms more on the first multi-word query after the
index is built (computing the keys of its results), nothing measurable after.

**Shipped.**
1. The two sets as ground truth `intent-4` in `eval/search_quality.mjs`, with
   no ranking change:
   - *page title*: every page's own title of two or more words, as the
     reader sees it (entities decoded: the data holds `&lt;&lt;`); any entry
     of that page counts. 140 queries. The 9 operator pages (`&, &=`,
     `<<, <<=`) are left out, since a reader types one operator, which the
     bare-name set measures.
   - *page plus section*: `<page title> <section title>` for the one-word
     section titles 20+ pages share, less sections that document a symbol;
     only that section counts, and a query several sections share expects
     any of them. 300 queries.
2. The ×3 re-rank, `boostWholeTitles()`, at the end of `doSearch()` in
   `just-the-docs.js` and of the replica's `search()`. `doSearch()` is outside
   `initSearch()`, so the offline copy shares it: two copies, not three. The
   replica needs `docs` in its context (`load()` gives it; the tests'
   fixtures pass it too) and fails loudly without it, since a replica that
   skipped the re-rank would quietly differ from the client.
3. A kind word counts only in the singular.

Result: page title 87.9% → 97.9%, page plus section 22.7% → 96.7%; other
queries unchanged; 249 better, none worse. Every page and section title
(3,658) runs as a query without throwing. `test/search.test.mjs`'s
whole-title guard runs both copies' `boostWholeTitles()` on the same results,
checks both apply it to the final results, and ranks a fixture like the site
(`DTPicker Properties` behind the class heading without the boost). The query
guard checks that both compare kind words as typed.

Left, 3 page titles and 10 page-plus-section queries, each at rank 2 or 3:
- `Mid =`: the trimmer drops `=`, so the query is `Mid`, one word, and the
  Mid function (tier 1 for `Mid`) comes before the `Mid =` statement. An
  operator-like title, like those left out of the set.
- `Compiler and IDE Features`: the Features page's section of the same title,
  then the page. Both read the same as the query.
- `WebView2 Package`: `/tB/Packages/WebView2/WebView2`, then the package page.
- Sections behind a page whose name contains or stems like theirs:
  `Printers Properties` behind `Printer#properties`; the six `Html*` pages
  (`HtmlElement Properties` behind the same page's second Properties section,
  which documents the `HtmlElement.Properties` member, so the set leaves it
  out, and behind `HtmlElements#properties`); `UpDown Properties` behind
  `DTPicker#updown`; `ParentControls Members` behind
  `UserControl#parentcontrols`; `Timer Properties` behind the Timer function.

Not diagnosed further: none is a reader's likely query in a form the bare-name
or qualified sets don't already cover, and each would need its own tweak.

Open: the re-rank works outside lunr's scoring, as a post-pass. Whether a
hand-marked index entry should outrank it if the two ever disagree is
untested: no prose query has a heading of the same text elsewhere.

### Fixed: entities in the index

`&H80004005` found none of the five pages that mention it, only an unrelated
fuzzy match. The search content keeps the page's HTML entities (`&amp;` 991
times, `&gt;` 977, `&lt;` 819, `&#45;` 90, a few others), so the index held
`amp;h80004005` while the query trims to `h80004005`. 507 index terms held an
entity.

**Not a content fix.** The client inserts `doc.title`, `doc.doc` and slices
of `doc.content` with `innerHTML`, and highlights by lunr's character
positions in that text. Decoded in `search-data.json`, `&lt;Object&gt;` would
become a tag in the results panel, and every highlight after an entity would
shift.

**Shipped**, in all three copies: the tokenizer wrapper (installed in both
`initSearch()` copies and the replica's `loadLunr()`) passes each token
through `decodeTokenEntities()`, which decodes `&amp;`, `&lt;`, `&gt;`,
`&quot;`, `&apos;`, `&nbsp;` and numeric references, lowercased like the rest
of the token. `Token#update` keeps the token's position, which still spans
the escaped text, so the highlight covers `(&amp;H80004005)` and shows
`(&H80004005)`. The same wrapper runs on queries, where it changes nothing a
reader types. Result: `&H80004005` finds the 5 pages and nothing else; index
terms 25,897, none with an entity; eval and spaced sets unchanged.

`test/search.test.mjs`'s entity guard checks that all three wrappers call the
decoder, that the client's and the replica's decode alike and keep positions,
and that the replica finds and highlights the literal. The client lowercases
the decoded token (`&#x41;` decoded to `A` while every other token is
lowercase).

Limits: a decoded separator doesn't split its token (`per&#45;lane` indexes
as `per-lane`, which a query splits into two words); punctuation inside a
token still blocks a match (`Emit(&amp;Hb8,` indexes as `emit(&hb8`), as for
any text; and the operator characters the entities spell (`<`, `>`) still
trim away, so operators stay with their exact names (see "Operators").

### Fixed: slow multi-word queries

`a page` took about 800 ms per search in the replica and `a p`, a keystroke on
the way to it, 1.3 s.

**Profiled** (`node --cpu-prof`, `a p` and `a page`): 82% of the time in
`lunr.Set#union` and the `lunr.Set` constructor. lunr 2.3.9's `Index#query`
gathers the entries a REQUIRED clause matches as a running total, `c =
c.union(S)`, once per term the clause expands to and per field, and `union`
copies both sets into a new one every time. The all-words pass requires every
word as its stem with a trailing wildcard, on six fields, and `a*` expands to
thousands of terms: quadratic.

**Shipped**, in all three copies: `accumulateSetUnions()`, installed beside
`separateTokenSetKeys()`, replaces `Set#union` with one that, once it has
made a set, adds the next set into it in place. lunr's only unions are
running totals that drop the set they replace (`c`, the prohibited sets, and
the final `R`), so nothing can see the change. It keeps lunr's own `length`
(the first set's elements plus the second's, an element in both counting
twice), which `intersect()` uses to choose the set it walks, so even the
order of a set's elements is lunr's.

| | before | after |
|---|---|---|
| replica, `a page` | 809 ms | 87 ms |
| replica, `a p` | 1,334 ms | 278 ms |
| replica, `Form events` / `the form` / `to the` | 104 / 112 / 114 ms | 52 / 35 / 43 ms |
| Chrome, online client, `a page` / `a p` | 501 / 1,102 ms | 120 / 235 ms |
| Chrome, `Form events` / `the form` | 70 / 86 ms | 17 / 41 ms |
| every page and section title as a query (10,292), replica | 718 s; 716 over 200 ms; worst 4,068 ms | 86 s; 7 over 200 ms; worst 331 ms |

Results, refs and scores are identical for all 10,292 title queries; the eval
is unchanged. (Chrome: one run each on the same page.) `test/search.test.mjs`'s
set-union guard runs the online client's and the replica's `union` against
lunr's own (extracted from `lunr.min.js`) on a chain of sets: the same
elements and length at every step, inputs untouched, and the running total
added to in place. It also ranks a fixture with both and checks all three
copies install it. The token-set guard's install check allows a second
install after `separateTokenSetKeys(lunr)`.

**Left**, none a regression: `a p` still takes about 250 ms and a single letter
(`a`, `t`) about 80–110 ms. That is lunr's own work (43% in `Index#query`
itself): each one-letter word expands to thousands of terms in three clauses.
Making it cheaper means changing the query, and so the ranking, for instance
not completing a one-letter word; that needs its own measurement and the
user's call.

### Fixed: kind words

`continue statement` didn't find `/tB/Core/Continue`, whose page never says
"statement". The query names `Continue` plus a kind word, which the exact-name
clause handles, but the all-words pass still *required* the kind word, so the
page was never a candidate. `With statement` worked only because its page
happens to use the word.

**How widespread**: every symbol written as its name and its kind, for the
kinds the client counts as kind words (1,836 queries,
`eval/search-experiments/probes/kinds.mjs`): 61.6% at rank 1, and 662 not
found at all. A member's section rarely says "property", "method" or "event":
`MaxHeight property`, `Terminate event`, `VbTriState enum`. The eval never saw
it, since its symbol queries are bare names.

**Measured** with knobs:

| variant | kinds hit@1 | kinds worse | eval | spaced (5,108) |
|---|---|---|---|---|
| now | 61.6% | | | 100% |
| kind words never required | 93.9% | 22 (`Mid function`, `Line statement`, `Timer event`) | `Loop Control` 1→2 | 3 worse (`File Type`) |
| optional only when no result has the exact name | 94.7% | 4 (`Mid function`, `Stop method`) | | |
| **optional only when no result has the name in its title or as its exact name** | **91.1%** | **0** | unchanged | unchanged |

Where requiring the word worked, it kept a different kind of the same name
out: `Mid function` finds a section of the Mid page, titled `Mid`; with the
word optional, the `Mid =` statement page, which never says "function", comes
in on its exact name. The exact-name test alone fell back there, since a
section carries no names.

**Shipped**, in the client (`doSearch()`, so the offline copy shares it) and
the replica: for a query naming one thing in two or more words, if no entry
the all-words pass found matched the name in `title`, or in `exact` or
`primary` (`namesTheThing()`), the pass runs again with the kind words
optional; they still score. Result: name and kind 61.6% → 91.1% hit@1 (top 10
94.9%, not found 93); 577 better, 0 worse; eval and spaced sets unchanged.
`test/search.test.mjs`'s kind-word guard runs both copies' `namesTheThing()`
on the same results, checks both fall back the same way, and ranks a fixture
with the `MaxHeight` and `Mid` shapes.

**Left**: 164 not at rank 1, 93 not found, mostly properties (75). Not
diagnosed further.

**Ground truth `intent-5`.** The user agreed to make the set ground truth in
`eval/search_quality.mjs` (category `name and kind`), less `sub` and
`member`: readers don't say them (a Sub is a method to them). Spelling a Sub
as `method` instead would need another query pass, which lunr's cost rules
out for now. Operators, with no word character, stay out, as the bare-name
set measures them. Any symbol of that name and kind counts, and any section of
a page that documents one. Reasons against: the fallback was designed on this
set, so it starts near its best (fine as a regression guard, flattering for
gains); several symbols of one name and kind (`Name property`) are judged
leniently, any of them counting; and at 1,785 queries it moves the overall
hit@1 (99.7% → 98.2%), so compare categories, not the total, across ground
truths. `KIND_WORDS` is exported from the replica, so the eval and
`probes/kinds.mjs` build the set from the list the replica searches with.

### Item 6: shipped

Two Sonnet agents drafted candidate terms: one from the glossary, one from
jargon and features outside it. Both read the target pages; every proposed
URL was checked to exist in the build and the contested pages were reread.
The user approved every target. The agents found no doubtful links; two soft
notes: Project-Types' Kernel-Mode Drivers section names the "Native
subsystem" setting without linking it, and twinBASIC-Additions' changelog
anchors outrank the Features pages for `inline assembly`.

**Rulings.**
- *A Glossary definition counts as a right answer for its term, and needn't
  be first: within the top 5 is enough.* The ten `<Type> data type` terms,
  `Function procedure`, `Sub procedure`, `Property procedure`, `breakpoint`,
  `watch expression`, `base class`, `compiler directive`, `MDI form` and
  `dynamic-link library` are all at rank 1 by their Glossary definitions, so
  they need no entries.
- *Bare words that name a language element*: `array` (the `Array` function
  first, `/Tutorials/Arrays` second) and `delegates` (`/tB/Core/Delegate`,
  then `/Features/Language/Delegates`) get no entry. An index term shares its
  stem with the bare name (`deleg_`; the stem can't tell singular from
  plural), so an entry for `arrays` or `delegates` made the concept page first
  and the element second for `array`, `Array`, `arrays`, `delegate`,
  `Delegate`, `delegates`, and made the eval 2 worse (bare `Array` and
  `Delegate`, 1 → 2). `array`: the Glossary's definition is 4th. `delegate`
  and `delegates`: the Glossary has no entry for the word; the user was asked
  what to add.
- All 16 recommended rows were approved, with shortened forms indexed too
  (`register COM dll`, `register dll`, `create dll`) and more variants:
  `inline initialization`, `field initialization`, `typedecl char[acter]`,
  `type char[acter]`. Capitals don't matter.
- Decided by the user: `user defined types` (and `user types`) →
  Type, then UDTs; `event handlers` → Handlers, then the Forms tutorial's
  handler step; `namespaces` → a new Glossary definition that links the
  relevant pages, then the Packages page; `twinpack` → Creating-TWINPACK, then
  the other package pages; `standard exe`, `create an ActiveX DLL`, `create
  ActiveX DLL` → the New Project dialog's options (main entry), with Project
  Settings' *Build Type* and Project-Types as secondary entries (Project-Types
  covers types "beyond the traditional EXE and ActiveX DLL/Control"); `pointers`
  → a secondary entry ("at a lower priority"): the Pointers page goes 3 → 1
  and bare `Pointer` is untouched (a main entry cost it 6 → 7), but `Pointer
  field` goes 3 → 4, kept at the user's request.
- Not indexed (the right pages are already in the top 3 or first): `continue
  statement` (fixed by the kind-word tweak), `packages`, `inline assembly`,
  `import a vbp project`, `breakpoints`.
- Content gaps that item 7 then handled or left: multiple return values,
  application manifest, by reference / by value, ActiveX control, Automation
  object, Object Browser, type library, named arguments, tab order, twips.
- 53 queries already at rank 1 (41 jargon, 12 glossary: `generics`,
  `multithreading`, `static linking`, `migrate from VB6`, `unit testing`, `data
  type`, `date literal`, `control array`) could join the prose set as guards:
  they don't discriminate, but they would catch a regression. Not done.

Each batch went in as queries first, then entries. Result, prose set (it now
holds 108 queries):

| | prose hit@1 | `behind` within 3 | worse |
|---|---|---|---|
| the 20 earlier queries | 20 of 20 | 1 of 1 | |
| + 33 approved, before entries | 25 of 53 | 1 of 10 | |
| with their entries | 50 of 53 | 10 of 10 | 0 |
| + 11 decided, before entries | 51 of 64 | 10 of 17 | |
| with their entries | **61 of 64** | **17 of 17** | 0 |

Qualified names typed as two words are unchanged throughout.

**Rules the measurements forced** (also under "Rules for index entries"):
- *A term whose stem is a bare name's reorders that name.* `declaration`
  (stem `declar`) put `Declare` 2nd; `comment` put the `Comments` property
  2nd; `pointers` cost `Pointer` 6 → 7 and `Pointer field` 3 → 4. So there is
  no entry for `declaration` and `comment`: their Glossary definitions are
  2nd and 5th without one, which the ruling counts, and their queries accept
  the Glossary. `pointers` has no Glossary entry; its page is 3rd.
- *A secondary entry can overtake a page that ranks first only on its own
  text.* CommandButton's `access key` put it above Label, and UDTs' `user
  types` would have put it above Type. The page meant to be first takes a
  main entry for the term too.
- *A one-word term matches every query holding the word.* The Packages page's
  `twinpack` entry beat `Importing a Package from a TWINPACK File` typed
  whole; a secondary entry on the Importing page restored it.
- *A term matches only whole words.* `type character` doesn't match `type
  char`, so each spelling a reader types is its own term.

**Limit, not fixed**: a question-shaped query misses the entries. `how do I
register a com dll` finds the FAQ, not ActiveX Registration: the all-words
pass requires `how`, `do` and `I` too, and only the FAQ holds them all.

### Item 7: content and index entries from two surveys

Two Sonnet agents rechecked item 6's content gaps and ran about 120 reader
terms (IDE panes, VB6 vocabulary, Features and Tutorials headings) through the
replica. The user asked for every fix they prompted, content included, with
samples checked by the compiler.

**Rechecked gaps.** Already fine, the Glossary 1st: `by reference`, `by
value`, `ActiveX control`, `ActiveX object`, `Automation object`, `Object
Browser`, `type library`, `tlb`, `named arguments`, `tab order`, `manifest`,
`twips`. Missing, now handled: `ByRef`, `ByVal`, `ByVal vs ByRef` (no section
explained them), `typelib`, `named parameters`, `application manifest`, and
`return multiple values` (no page at all). `ByRef` and `ByVal` are not
symbols, so entries for them reorder no bare name. The survey agent's
"already fine" list was wrong at least once (`optional parameters` landed on
Compiler-Options): rerun a list before using it as guards.

**Content**, each sample `check_build`, compiled, and its printed values
confirmed with `tbrun`:
- Sub: *Passing arguments ByRef and ByVal*; *Optional arguments and default
  values*. Function: *Returning more than one value* (ByRef parameters, a UDT,
  an array). Call: *Named arguments* (a positional argument after a named one
  is TB5103, checked), and its old example, inert and declaring the 16-bit
  `"User"` library, now compiles.
- Polish: Glossary links to these; the Project Explorer's manifest section
  says what a manifest does and links Force DPI Awareness; Library References
  says how to add a reference; the Variables pane names VB6's Locals window.
- *Placing a section can move words between entries.* With *Named arguments*
  before Call's *Example*, the Example folded into the new section instead of
  the page's top entry, which lost the word "statement": `Call statement` fell
  1 -> 5. Named arguments comes after the Example.

**Entries**: Sub `ByRef`, `ByVal`, `optional parameters`; Function `return
multiple values`, `multiple return values`; Call `named parameters`; Glossary
`typelib`; Project Explorer `visual styles`; Attributes `packing alignment`;
Categories `registry access`; Project Settings `add reference` (the Project
menu's References secondary) and `high DPI`; IDE-Features `dark mode` (the
Window menu's Theme secondary); the IDE pages `new project dialog`, `find and
replace`, `search and replace`, `memory window/panel`, `variables panel`,
`locals window`, `diagnostics window`, `history panel/window`, `outline
view/window/panel`.

Prose hit@1: 73 of 108 before (41 new queries, 8 of them guards); 80 of 108
with the content; **105 of 108** with the entries; 0 worse.

**`default property`.** A VB6 reader means a class's default member, which
`[DefaultMember]` sets (Attributes). An entry there, main or secondary alike,
puts it above CommandButton's `Default` property for the name-and-kind query
`Default property` (1 -> 2); search ignores case, so the two are one query.
The user chose a Glossary definition instead. Headed *default property*, it
matched the whole query, took rank 1 at ×3 and pushed `Default` to 2, the same
trade. Headed *default member*, with *default property* as the other name and
a link to `[DefaultMember]`, it lands at 5, where a Glossary definition
counts: nothing worse.

**Open.** `COM interop`: no clear target (Categories' COM and Automation list,
Interfaces-CoClasses, ActiveX Registration). Content gaps: subclassing (only
the FAQ mentions it), IntelliSense (no page names the feature), conditional
breakpoints (the Debug menu shows none; check the IDE first).

**Doubtful, noted, not changed.** `compile to exe` puts
`TbExpressionService.Compile` first. `dark mode`, before its entry, put the
site's own build docs (Documentation/Development) first: the builder docs are
in the reader's search, and may crowd other site-tooling words.

## Future work

### Operators

All 24 operator symbols (`<` `<=` `<>` `=` `>` `>=` `&` `&=` `/` `/=` `^` `^=`
`\` `\=` `<<` `<<=` `-` `-=` `*` `*=` `+` `+=` `>>` `>>=`) are at rank 1,
through exact names that spell non-word characters (`<>` → `_3c_3e_`). The
causes, which still explain why operators need exact names:

- **Content.** `stripHtml` leaves `<` and `>` as the entities `&lt;` and
  `&gt;`, so the literal character never reaches the index. (Entities are
  decoded per token, see "Fixed: entities in the index"; the trimming below
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
