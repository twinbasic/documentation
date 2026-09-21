# Use-case review, round 5 --- the fixes hold, and discoverability is now the whole problem, at `4b50c0c`

Branch `staging` · reviewed 2026-09-21 · 8 cases

The fifth round of [the harness in `eval/`](../eval/README.md). Round 4's three worst cases
re-run unchanged, plus five new ones sampling surfaces no round had read. Method unchanged:
a mirror with all source stubbed unreadable, `WIP.md` and all four prior reviews withheld,
search and navigation scored as separate channels.

## Verdict

**The best actionability yet, the worst discoverability since round 3, and no hazard walked
into by any of the eight.** Four rounds of fixes have been raising completeness and
actionability on pages that readers cannot reach.

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 (8 cases) | 2.75 | 2.38 | 2.88 |
| round 4 (8 cases) | 3.00 | 2.50 | 3.00 |
| **round 5 (8 cases)** | **3.00** | **2.25** | **3.38** |

Per case:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-40 a gate refused my regex *(re-run)* | 3 | **1** | 4 | pass |
| UC-41 the build printed its last line and stopped *(re-run)* | 4 | 2 | 4 | pass |
| UC-43 `pick_a11y_sample --check` failed *(re-run)* | 3 | 3 | 3 | pass |
| UC-44 `serve.bat` never shows my builder change | 3 | **1** | 4 | pass |
| UC-45 a copy to read with no network | 3 | **1** | 4 | pass |
| UC-46 add a diagram to a page | 3 | **4** | 3 | n-a (premise false) |
| UC-47 make the build supply a stale total | 2 | 3 | 2 | pass |
| UC-48 fresh clone, is it healthy | 3 | 3 | 3 | pass |

**Eight hazards, none walked into.** That is a first. UC-41's evaluator told the user to
press Ctrl+C last round and this round told them not to, by name. UC-40's declined the
character-class narrowing the repository itself got wrong twice. UC-43's declined to widen
the sample. UC-45's refused to ship `_site/`.

### The re-runs: two axes moved a lot and one did not move at all

| | round 4 | round 5 |
|---|---|---|
| UC-40 a gate refused my regex | 2 / **2** / 2, pass | 3 / **1** / 4, pass |
| UC-41 the build stopped | 2 / **1** / 3, hazard **fail** | 4 / **2** / 4, pass |
| UC-43 sample `--check` failed | 2 / **3** / 2, pass | 3 / **3** / 3, pass |
| mean | 2.00 / **2.00** / 2.33 | **3.33** / **2.00** / **3.67** |

**Completeness +1.33, actionability +1.34, discoverability ±0.00.** Round 4's fix pass was
good: every page it wrote is now rated 3 or 4 for content by the evaluator that needed it,
and the one hazard failure is closed. None of it made anything easier to find, and UC-40's
discoverability *fell* from 2 to 1.

This is now four rounds of the same shape, and round 5 is the first where it is the entire
story rather than one finding among many.

## Tier 1 --- the finding: a correct page nobody can reach is worth what an absent one is worth

**1. The search box cannot find a script by the name its own failure prints.** Three cases
scored discoverability 1, and this is why for two of them.

`Tools.md` gives every script a section, and writes its name as a path in code:
`scripts/check_page_baseline.mjs`. lunr's default tokeniser splits on whitespace and hyphens
only, so that whole string --- slash, underscores, extension --- is **one token**. A reader
who copies the bare name out of a failing gate's output types a different token, and the
trailing wildcard the site adds extends the end of a query, never its start. Measured
against `eval/site_search.mjs`:

| query | results |
|---|---|
| `scripts/check_page_baseline.mjs` | 4 |
| `check_page_baseline` | **0** |
| `check-page-baseline` | 420 (the three words, as noise) |

`build_dot_metrics` is 0 as well; `sweep_a11y` returns 1, and it is the wrong section
(`Tools#cli-tools`). UC-40 issued seven queries including the gate's exact filename and
verbatim prose from the section, and `Tools#check-regex-safety` appeared in **none** of them.

> **The evaluator's explanation was wrong and the finding is right.** UC-40 concluded that
> "code content appears to be excluded from the index". It is not --- `check_page_baseline`
> occurs four times in `search-data.json`. The cause is tokenisation, and the distinction
> decides the remedy: excluding code would call for indexing it, whereas this calls for the
> name to appear somewhere lunr will split, or for the tokeniser to treat `/`, `_` and `.`
> as separators. Verified by tokenising through the site's own vendored lunr.

**2. `hot-reload` appears exactly once in all of `docs/`, in an un-anchored NOTE, and it is
the answer to UC-44.** `Extending.md:30` is correct and complete --- what is not reloaded,
why, what to do, what *is* reloaded. It sits above the page's first `##`, so it has no
section of its own and search never returns it. The two pages that document `serve.bat` in
full, `Tools.md:34-42` and `Building.md:165-182`, are both silent on it. The evaluator
reached it at hop 6.

**3. Nothing a reader can reach says the offline copy or the PDF book exists.** UC-45
missed on all four reader-phrased queries. Outside `docs/Documentation/`, the word *offline*
appears in `docs/` only about a WebView2 installer, packages usable without a network, and
an async-read flag; `grep` for *twinBASIC Book*, *PDF book* or *download the book* outside
that folder returns **nothing at all**.

So the project renders a ~2,000-page book and a 124 MB browsable mirror, attaches both to a
GitHub release, and documents them exclusively on a contributor page about building the
site. Both are deliverables with no reader-facing door.

## Tier 2 --- contradictions, each verified against both sides

**4. `README.md:29` tells a Windows user to pass a Linux-only flag, on step one.** Found
independently by UC-45 and UC-48.

| | |
|---|---|
| `README.md:29` | Chromium "installed once with `npx puppeteer browsers install chrome --install-deps`" |
| `Building.md:39` | "Add `--install-deps` **only on Linux** --- it installs system packages, needs root, and is not supported anywhere else." |

The repository's wrappers are `.bat` files. The README's unconditional form is wrong for its
own default reader, and it is the first command a fresh clone runs. **This is the fourth
round-4-class defect on `README.md`**, after the three that round found.

**5. `Extending.md` contradicts itself on `serve.bat`, 391 lines apart, in the Verify step
for the exact change class that needs the restart.** `:30` says markdown-it plugins "are not
hot-reloaded by serve mode ... stop `serve.bat` (Ctrl+C) and re-run". `:421`, closing
*Adding a markdown-it plugin*, says: "Run `build.bat` and open an affected page; for live
feedback, use `serve.bat`." No caveat. That is the advice that produces the reported bug.
`:619` gets it right, so the page is two-for-three.

**6. `Tools.md` tells a reader to run the fingerprint gate for a change it says the gate
cannot judge**, 53 lines apart. `:312` --- "Any change to *what the scan runs* belongs here
and must go through the [fingerprint gate] first." `:259` --- "And do not expect
`check_a11y_fingerprint.mjs` to vouch for it: it compares a candidate against a baseline
produced by the same page set, so a change to *which* pages are walked is its documented
blind spot." Editing `SAMPLE_PAGES` is squarely both, and it is the remedy `:259` has just
prescribed. A reader following `:312` reads a green fingerprint as clearance.

**7. `Authoring.md:692` forbids the change `PLAN-counts.md` was written to make.**

| | |
|---|---|
| `Authoring.md:692` | the enumeration total "is a hand-written digit and **has to stay one**: no count name covers enumerations" |
| `PLAN-counts.md:62` | lists "enumeration totals on the Reference landing page" among the figures Phase 3 exists to convert |

Neither cites the other. UC-47 was asked to do exactly this and stopped, correctly, to say a
maintainer should settle it --- which is the right call and also a case where the
documentation cost the contributor the task. The number is `140` at `Reference/index.md:17`,
it is the only hand-written total left on a reference landing page, and it is correct today:
both lists in `Enumerations.md` hold exactly 140 bullets, confirmed by count.

**8. The one place the diagram markup appears models the alt text the other page spends five
paragraphs forbidding.** `Authoring.md`'s *Diagrams* section (`:528-539`) never shows what to
type on the page --- its only code block is the two file paths. The markup exists one page
over, at `Building.md:392-393`:

```
![Diagram](/assets/images/dot/<name>.svg)      <!-- shared -->
![Diagram](Images/<name>.svg)                  <!-- beside its page -->
```

against `Authoring.md:547`, "`![image](…)` passes it. So does `![img](…)`", and `:553`,
"copy the *shape* of a neighbouring page's image markdown, **never its alt text**" ---
which records one bad alt string having already travelled onto ten further images.
`![Diagram]` is that failure exactly, in the only copyable example, on the page an author is
sent to for the markup. `Authoring.md`'s neighbouring *Images* section does show its markup,
so the omission reads as an oversight rather than a policy.

**9. `Building.md:435` states a node margin as universal that three of five diagrams use.**
"from the `0.12` the diagrams set" --- true of the three under `assets/images/dot/`, false of
both tutorial diagrams, which set `0.16,0.09`. `Authoring.md:537` says to copy the blocks
"from one of them" and names no file, so a tutorial author is most likely to copy the 0.16
and then read that they are at 0.12.

## Tier 3 --- gaps at the point of need

**10. No page says what a healthy run looks like.** UC-48 was asked for it directly. The
documentation is exceptionally thorough on failure --- stall reports, exit codes, drift
errors, the `&&` trap --- and offers no successful transcript, no expected page count, and no
statement of which build-time output is normal. `Builder.md:33` does give "around 2--3
seconds on a modern laptop", which is the figure UC-41 reported as absent; it is on the
architecture page, framed as a win of the Jekyll port rather than as a triage baseline, and
neither `Building.md` nor `Tools.md` repeats it. *(UC-41's claim amended: the figure exists,
at the wrong place for the reader who needs it.)*

**11. Adding a `{{tbdocs:...}}` count name is an extension point that was promised and not
written.** `PLAN-counts.md:359`: "`Extending.md` gets adding a name as a fourth extension
point." `Authoring.md` and `Builder.md` got their Phase-4 edits; `Extending.md` did not. It
lists four extension points, none of them this, and `counts.mjs` is not a row in *Changing
what is already there*. The published docs teach *using* a name (`Authoring.md:299`) and
describe the registry in one table row (`Builder.md:123`); the only how-to is a plan file the
site does not index.

**12. `--fresh` is offered and never explained.** It appears in `pick_a11y_sample.mjs`'s
synopsis at `Tools.md:245` and nowhere else in `docs/`.

**13. `builder/README.md` never mentions `test.bat` or `check_regex_safety.mjs`.**
`README.md:47` sends anyone "changing the generator itself" there, "next to the code". Its
*Verification* section names the nav check, the publish policy and the link checkers. A
developer who edits `builder/render.mjs` and reads the README beside it learns nothing about
the two gates that key on that file by name.

**14. Three smaller ones, each verified.** `Extending.md:425` says "See `check_regex_safety.mjs`"
for which shapes resolve, and the target lists only the shapes that do *not* (UC-40). No page
gives a `SAMPLE_PAGES` entry format, though the neighbouring `FAMILIES` entry gets one
(UC-43). And the sample size "thirteen" is asserted in five prose sites plus a derived "60
audits", all of which the documented remedy invalidates, and `check_gate_lists.mjs` is scoped
to gate counts only (UC-43).

## The orchestrator's own finding

**15. `WIP.md` states a rule about alt text that has never been true of this repository, and
`builder/counts.mjs` repeats it.**

> **The one place this does not apply is alt text.** markdown-it's `replacements` rule ...
> does not descend into an image token's own children, so `--` and `---` inside `![...]`
> survive literally into the `alt` string and a screen reader announces two or three hyphens.
> Punctuate alt text with commas and colons instead. Verified by rendering through the
> repository's own markdown-it, not inferred.

The premise is true and the conclusion is false. `kramdownDashesPlugin` (`render.mjs:640`)
runs *after* `replacements` and walks with `walkTokens`, which recurses into `children` ---
so it reaches image alt and converts the dash. Measured: **zero literal `--` survives in any
`alt=` anywhere in the built site**, and `docs/_site/tB/IDE/Project/Menu/View.html` renders
`alt="The View menu open. The upper commands — Code Editor, …"` in all three trees.

Two things make it worse than a stale note. The plugin landed **2026-05-25** and the claim
was written **2026-09-21**, so it was wrong the day it was written. And four of the five alt
strings in `docs/` that contain `---` were committed *one minute after it*, by the same
pass --- the note and the practice were authored together and disagree.

The tell is the verification sentence. "The repository's own markdown-it" was the npm
dependency, not the repository's configured instance; a bare `markdown-it@14.2.0` with
`typographer: true` reproduces the stale answer exactly, which is how this was almost
recorded as a hazard for UC-46. **Verifying against the library a repository depends on is
not verifying against the pipeline it runs.**

`counts.mjs:42-45` carries the same clause. Its mechanism point --- image alt is a nested
child, so the walk must recurse --- is correct and load-bearing; only the "which is why `--`
survives literally in alt text across this site" is false.

## What round 5 confirms about the method

**A false premise is still a productive case.** UC-46 was written around the alt-text hazard
above. There is no such hazard, and the case returned the best discoverability score of the
round plus two verified findings the intended scenario would not have reached --- the
`![Diagram]` example and the margin figure. Third time the catalogue's note on this has held.

**Re-running is four-for-four, and it now measures a second thing.** It was the only
instrument that showed a fix working, and round 4 added that it catches a fix pass damaging
what it touched. Round 5 adds a third: it is the only way to see an axis *not* move. Three
cases, three fixes, +1.33 completeness, ±0.00 discoverability --- no single case could have
shown that, and no gate in the repository reports it.

**The evaluators overstated twice, both in the usual direction**, and both corrections
sharpened rather than weakened the finding: UC-40's index-exclusion explanation (it is
tokenisation), and UC-41's missing build baseline (it exists, on the wrong page). That is 2
of 24 this round against 7 of 26 in round 1.

**Partitioning agents by file still has the cross-file blind spot**, and findings 5, 6 and 7
are all one page or plan contradicting another. Round 4's remedy --- re-read every cross-file
claim *after* the pass --- has not yet been run as a discipline; three of this round's
contradictions would have been caught by it, and finding 7's two sides are four months apart.

## Method

Unchanged. Corpus built at `4b50c0c` from a current build (908 pages, 0 broken links in both
real trees): 982 readable prose files, 255 sources stubbed unreadable, `WIP.md` + the twelve
`WIP.*.md` + all four prior `REVIEW-USECASES-*.md` withheld. Eight independent evaluators,
one goal each, never told what the case tested or that a hazard existed. Re-runs use the
catalogue's recorded goal wording.

The stubbed count rose 254 to 255 with `scripts/lib/regex-fold.mjs`, which is the drift
detector working as designed.

Every search rank quoted above was re-measured by the orchestrator against
`eval/site_search.mjs`, and every finding was verified against the source before recording.

## What to do next

**1. Treat discoverability as the round's single defect.** Findings 1, 2 and 3 are three
faces of it, and the fix for each is different:

- **Search cannot match a script name.** The real lever is the tokeniser: adding `/`, `_`
  and `.` to lunr's separator would make every path token searchable by any of its parts.
  That is a change to `just-the-docs.js`'s index configuration and to
  `eval/site_search.mjs`'s replica together, and it needs measuring for noise before it
  ships --- `check-page-baseline` already returns 420 results, which is what over-splitting
  looks like.
- **`Extending.md:30` is un-anchored.** Give the NOTE a heading of its own so it is
  indexable, and put one sentence in `Tools.md`'s `serve.bat` entry and `Building.md`'s
  serving section pointing at it.
- **The offline mirror and the book have no reader-facing door.** Neither is mentioned on
  any page a reader can reach. One line on the welcome page, or a short *Reading offline*
  page, closes it.

**2. Fix the four contradictions (4 to 7).** Findings 4 and 5 are one-line deletions.
Finding 6 needs `Tools.md:312` to carry the page-set carve-out. **Finding 7 is a decision,
not an edit** --- either the enumeration total gets a name and `Authoring.md:692` is
rewritten, or `PLAN-counts.md` is marked as superseded on that point. Do not let a fix pass
guess.

**3. Fix the diagram example (8, 9).** `Building.md:392-393`'s `![Diagram]` should be a real
descriptive alt, and `Authoring.md`'s *Diagrams* section should carry the markup itself
rather than sending the reader to a page that models the anti-pattern. Name the file to copy
the blocks from, and drop or qualify the `0.12`.

**4. Correct finding 15 in all three places** --- `WIP.md`'s *Source dashes* section, its
*Build-time counts* section, and `builder/counts.mjs:42-45` --- keeping the recursion
rationale and deleting the false consequence. No content change is owed: the five alt strings
carrying `---` render correctly.

**5. Round 6 candidates.** Re-run UC-40, UC-44 and UC-45, the three that scored
discoverability 1, because whether a discoverability fix works is the one thing this harness
has never yet measured. Beyond them: the surface still unread is the deploy path from the
other end (a maintainer cutting a release), and a case given to somebody who arrives at the
*published site* rather than the repository --- every round so far has started at `README.md`,
which is not where a reader of `docs.twinbasic.com` starts.
