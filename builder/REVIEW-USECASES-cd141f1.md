# Use-case review, round 3 --- the fixes, and gates that report success, at `cd141f1`

Branch `staging` · reviewed 2026-09-21 · 8 cases

The third round of [the harness in `eval/`](../eval/README.md), run against the documentation
after round 2's ~35 commits of fixes. Six new cases from
[eval/usecases.md](../eval/usecases.md#round-3--the-fixes-and-gates-that-report-success),
plus round 2's two worst-scoring cases re-run unchanged. Method unchanged: a mirror with all
source stubbed unreadable, `WIP.md` and both prior reviews withheld, search and navigation
scored as separate channels.

## Verdict

**The two re-run cases improved more than any change this harness has measured. The six new
ones produced the lowest discoverability of any round.** Both halves are the same finding
seen from opposite ends, and it is not the one round 2 predicted.

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 --- re-runs (2) | **3.50** | **3.50** | **4.00** |
| round 3 --- new (6) | **2.50** | **2.00** | **2.50** |
| round 3 --- all (8) | 2.75 | 2.38 | 2.88 |

Per case:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-22 add a wide table *(re-run)* | 3 | 4 | 4 | pass |
| UC-24 `book.bat` failed *(re-run)* | 4 | 3 | 4 | pass |
| UC-33 fence inside a fence, then a callout | 2 | 1 | 2 | **fail** |
| UC-34 a package count that cannot go stale | 3 | 2 | 3 | **fail** |
| UC-35 accept a deliberate page removal | 3 | 3 | 4 | pass |
| UC-36 compile a probe project from a script | 1 | 1 | 1 | **unreachable** |
| UC-37 regression test for a rewrite that stopped firing | 3 | 2 | 3 | pass |
| UC-38 a gate comparing this build to the last | 3 | 3 | 2 | pass |

### Round 2's fixes demonstrably landed, and this is the second time that has been measured

UC-22 and UC-24 were round 2's two worst results: each *stalled* on navigation and *missed*
on search, answerable only by full-text grep over unpublished design notes. Both now land on
the first try, in both channels:

| | round 2 | round 3 |
|---|---|---|
| UC-22 search | MISS | **rank 1** on three of four queries |
| UC-22 navigation | STALL | **2 hops** from `README.md` |
| UC-24 search | MISS | **rank 1** on `"book.bat failed"` |
| UC-24 navigation | STALL | **3 hops** |

Measured independently of the evaluators, against the real index: `"wide table"` and
`"table too wide"` both return `Authoring#tables` at rank 1; `"book.bat failed"` and
`"pdf render failed"` both return `PDF-Generation#render-troubleshooting` at rank 1. The
UC-24 evaluator called its page "written for exactly this" and scored actionability 4.

**The recovery finding from round 2 is closed as stated.** What replaced it is narrower and
worse: the recovery prose that landed is *accurate about a build that no longer exists*.

## Tier 1 --- actively wrong guidance

**1. `book.bat`'s pre-flight is described on three pages, and all three describe the version
from before the freshness gate landed.** The shipped `book.bat:30` runs

```sh
node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html
```

as its first action, exiting 2 when the tree is absent and 1 when it is older than `docs/` or
`builder/`. Every page still documents the existence test it replaced:

- `PDF-Generation.md:102` --- "Nothing checks that `_site-pdf/` is *current*. `book.bat` tests
  only that `book.html` exists, and `check_tree_fresh.mjs` --- the gate that refuses a stale
  tree --- reads `_site-offline/`. Render after a content edit without rebuilding and you get
  the previous build's book, with nothing said about it."
- `Building.md:81` and `Tools.md:106`, in the same sentence on both --- "It checks that
  `docs\_site-pdf\book.html` exists and names `build.bat` as the fix".

`PDF-Generation.md:92` also quotes a verbatim error message, `docs\_site-pdf\book.html not
found. Run build.bat first.`, which **exists nowhere in the repository**. The real text is
`check_tree_fresh: docs/_site-pdf/book.html does not exist.` plus `Run build.bat first -- there
is no built tree to check.`

This is worse than a stale sentence. The section is the recovery prose round 2 added, it is
now search rank 1 for `"book.bat failed"`, and it tells a reader that a silent-staleness
hazard is live when the gate closing it is the first line of the script. A reader who hits
the real exit 1 is looking at a message three pages say cannot happen. The fix is recorded in
`WIP.md` under *The book refuses a stale source tree* --- which is to say, in the one file the
corpus withholds. **Round 2's headline recurring exactly.**

*Caught while verifying:* the UC-22 evaluator cited `Building.md:81` as evidence that
"book.bat refuses a stale tree and names build.bat". That line describes an existence check
and says nothing about staleness. The conclusion is right and the reading is wrong --- right
only because the code does something no page states.

**2. `Building.md`'s "Tests of the toolchain" names three of `test.bat`'s five gates, and the
reason it gives for skipping it is false.** `Building.md:237-243`:

> Three gates that test the build system rather than the site: `check_publish_policy.mjs`,
> `check_regex_safety.mjs` and `check_axe_patch_equiv.mjs`. About six seconds.
>
> **None of them reads a page of documentation**, so an edit confined to `docs/` cannot change
> any of their outcomes.

`test.bat` runs five: those three plus `check_code_regions.mjs` and `check_page_baseline.mjs`.
And `check_code_regions.mjs:67` is `const ROOT = path.join(REPO, "docs")` --- it tokenises
every markdown file under `docs/` and reports 906 of them. A docs-only edit changes its
outcome; that is the entire reason it exists. The page also says "both CI workflows run all
three unconditionally" where it is five.

**The false sentence is load-bearing.** It is the stated justification for the documented
commit bar --- docs-only edit, run `build.bat && check.bat`, skip `test.bat` --- and
`check_code_regions.mjs` is the only gate that can see the fence-pairing defect that shipped
six admonitions on `Reference/Attributes.md` as the literal text `[!NOTE]`. UC-33's evaluator
walked into precisely this: it found the hazard, found the gate, and then found the workflow
that omits it, noting that "the documented bar skips the one gate that catches this".

`Building.md` contradicts itself on its own page: `:39` correctly says "one of `test.bat`'s
five" and `:65` correctly lists all five. Only the section titled *Tests of the toolchain*
is wrong.

Round 2 already found this defect --- "`test.bat` was documented as three gates when it had
four" --- and fixed it in `Tools.md`. `Building.md`'s parallel copy was not touched, and has
since drifted further as a fifth gate landed. This is the exact failure
[protocol.md](../eval/protocol.md)'s fix-pass note warns about: two near-parallel copies, one
canonical decision never made.

**3. `Extending.md`, the page written to guide adding a gate, is wrong about which wrapper
runs what --- and never mentions `test.bat` at all.** Four separate statements, and zero
occurrences of the string `test.bat` in 619 lines:

| line | says | actual |
|---|---|---|
| `:493` | "`check.bat` runs six of them today" | four |
| `:500` | "used the same way by all six" | four |
| `:603` | check.bat is "the publish allowlist, tree freshness, diagram fit, the axe patch equivalence check, the accessibility sample-coverage check, and the accessibility scan" | the first and fourth are `test.bat` gates |
| `:612` | "Two of `check.bat`'s gates … `check_publish_policy.mjs` fails when…" | not a `check.bat` gate |
| `:600` | "A clean run of all four is the bar for 'ready to commit'" | omits `test.bat` |

Consequence, reached independently by UC-37 and UC-38: `:517` tells you to register a new
gate in `check.bat` and both workflows, which is the wrong wrapper for anything that does not
read a page --- by the rule `Tools.md:86` states correctly. UC-38 scored actionability **2**
for this and no other reason: "the one page written to guide this task sends you to register
in the wrong file and omits `test.bat` entirely."

## Tier 2 --- missing at the point of need

**4. The twinBASIC build harness is undocumented, and the page that would carry it claims
completeness.** UC-36 asked how to compile a one-module probe project from a script. The
answer is `scripts/tbbuild.mjs`, and the string `tbbuild` appears **zero times** anywhere
under `docs/`. Six natural queries produced one hit at rank 4; navigation from `README.md`
stalled outright. The evaluator concluded, correctly from the published corpus, that the task
is impossible --- citing `Features/Packages/Import-export tool.md:132`, "There is no command
that compiles a project … building is done from the IDE", which is true of the compiler
executable and reads as absolute.

It then noticed the contradiction by itself: `scripts/tbbuild.mjs`, `scripts/lib/tb-cdp.mjs`,
`scripts/lib/tb-launch.ps1` and `scripts/gen_attribute_probes.mjs` are all present in the
tree and all unreadable, and "the names read exactly like the harness this goal wants."

`Tools.md:11` promises "every executable in the documentation repository". Six are missing:
the four above plus `impexp.mjs` and `impexp.py`. **A page asserting completeness that omits
the tool named after the task is worse than no page** --- the evaluator's words, and they are
right. This is the round's only 1/1/1.

**5. Nothing anywhere says how to write a fence whose contents include a fence marker.**
`Authoring.md` covers fence languages, dashes, callouts and which check-mark glyph to use.
It does not mention this, though the site ships a page doing it (`Reference/Attributes.md:377`
opens a plain ` ```tb ` fence whose body contains two ` ``` ` markers inside twinBASIC string
literals). Longer fences and tilde fences appear **zero times** in `docs/`, so the evaluator
declined to use one --- "Don't be the first" --- and recommended a 4-space indented block for
the standalone-marker case, at the cost of all highlighting.

The hazard is documented, but only as an incident report inside a tool-reference entry headed
`### scripts/check_code_regions.mjs` (`Tools.md:328`), which no search reached and no author
would open. One of four searches hit anything; the load-bearing sentence needed Channel 3.
Combined with finding 2, an author following the documented workflow writes the construct
with no guidance and then skips the only gate that would catch it.

**6. `{{tbdocs:packages}}` has zero call sites, and the same page that documents it tells you
to hand-edit the number it would fill in.** The registry at `Authoring.md:299` is well
written --- UC-34 found it in two navigation hops and called the mechanism fully specified.
Three things then undercut it, all on that page:

- **`:343`, the section's closing sentence:** "Numbers already written as words stay as words
  --- *"thirteen packages" reads better than a digit in that sentence*." UC-34's goal **is**
  that sentence. The section teaching a contributor how to stop a count going stale closes by
  recommending, for the package count specifically, the form that goes stale. The evaluator
  docked actionability for it: "a careful reader stops rather than acts."
- **`:619`, the *Listing a new page* checklist:** a new package "moves the package counts
  written into the prose of [Packages] and the [Reference Section] landing page". That is the
  section a contributor adding a package actually lands on, and it prescribes hand-editing
  without mentioning `#counts` or linking to it. `:618` does the same for the enumeration
  total, for which no name exists.
- **Of the nine names, four are used** --- `pages`, `folderStyleIndexes`,
  `folderStyleSlashPermalinks`, `redirectStubs`. `packages` is not one of them.

Also genuine: no name covers Built-In-only or Default-only, which is what the site's own prose
actually needs.

**7. There is no "removing a page" checklist.** `Authoring.md:604` gives a six-case checklist
for *listing* a new page and insists the entry "has to go in deliberately, in the same commit
as the page". Nothing mirrors it for taking one out --- and UC-35's task begins with a
deliberate removal, whose genuinely multi-step part is delisting from Statements, Categories,
Procedures and Functions, Enumerations, the owning package `index.md` and Permanent Links.
The evaluator reconstructed that list by inverting the listing checklist, which worked, and
should not have been necessary on the one task where a missed entry becomes a broken link.

**8. The drift guard's own error message teaches a command with the link check removed.**
`Building.md:177-180` prints, verbatim from the build:

```
If the removal is intended, record it in the same commit:
  node builder/tbdocs.mjs --src docs --update-page-baseline
```

`build.bat` passes `--src docs --check-audit-index`, which implies `--check` (`Tools.md:134`).
The printed form omits it. So following the build's own advice produces a build with no link
or integrity check, on precisely the change --- a page removal --- most likely to have broken
links. Neither page mentions the other. UC-35 still scored actionability 4, because the
remedy being inside the error text is otherwise exactly right.

## Tier 3 --- stale figures and contradictions

**9. Three of the `Tables` section's totals have drifted; every rarity figure is exact.**
Recounted across the corpus:

| `Authoring.md` says | actual |
|---|---|
| "452 tables on the site" | **459** |
| "430 have two or three columns" | **437** |
| "1,175 columns … take the default" | **1,191** |
| "16 have four, five have five", "exactly one has seven" | 16 / 5 / 1 ✅ |
| "73 explicit left, 24 centred and 4 right" | 73 / 24 / 4 ✅ |
| "escaped in 37 files" | **38** |

The pattern is clean and worth keeping: **every drifted number is a total, every stable one is
a rarity.** The section sits 110 lines below the same page's own statement that "A figure
written by hand is correct the day it is written and attached to nothing that would notice
when it stops being correct" (`:301`). No `{{tbdocs:...}}` name covers tables, so there is no
derivable substitute today --- but the figures should be marked as as-of, or given names.

**10. "Built-in" names two different sets on two pages.** `Reference/index.md:30` says "all
thirteen built-in packages" and enumerates all thirteen including the Default trio;
`Reference/Packages.md:13` says "ten optional packages shipped with twinBASIC" for the
`Built-In/` directory. Verified on disk: 3 Default + 10 Built-In. **Both numbers are correct
today** --- the collision is in the word, not the arithmetic.

*This one was reported as active numeric drift and is not.* Recording the correction, because
it is the fourth round running in which a finding needed amendment in the direction of
overstated severity.

**11. No page gives the symptom of a missing Chromium.** `Building.md:39` and `Tools.md:100`
both say Chromium is required and how to install it; every other failure class in
`PDF-Generation.md` carries a verbatim error string and this one carries none. `Tools.md:100`
compounds it: "The first invocation auto-runs `npm install` if `puppeteer` is missing" is true
of `book.bat` and installs the *package*, not the browser binary, so a fresh clone can pass
that check and still fail with nothing documented.

**12. `book.bat`'s own pre-flight exit code is unstated.** `PDF-Generation.md:134` says it
propagates the renderer's 0/1/2, but the pre-flight refusal never reaches the renderer. It is
2 for an absent tree and 1 for a stale one. Anyone scripting this is guessing --- and, per
finding 1, guessing against a description of the wrong script.

**13. Nobody states how CI is detected for the baseline.** Three pages assert that CI must
never rewrite `page-baseline.json`; none names the knob. The only documented one is for a
sibling feature (`Pipeline-Stages.md:218`).

## What round 3 confirms about the method

**Re-running a case against a changed corpus is the only direct evidence a documentation
change works, and it is now two for two.** Round 2 measured round 1's fixes by five
unprompted citations of a section that had not existed that morning. Round 3 measured round
2's by taking its two worst cases back to rank 1 and 2--3 hops. Nothing else this project
does produces that evidence, and it costs one extra agent per round.

**Three corrections were needed, all in the direction of overstated severity**, which is the
same rate as every prior round:

- UC-34's "the drift has already happened" --- both package counts are correct; the word
  "built-in" is the problem (finding 10).
- UC-22 cited `Building.md:81` as documenting a staleness refusal; that line documents an
  existence check. The evaluator's conclusion happened to match the code, not the page.
- **Mine.** Investigating finding 2, I planted a probe page under `docs/`, ran
  `check_code_regions.mjs | tail`, read `EXIT=0` beside a stack trace, and was one step from
  recording a silent-success bug in the gate written to catch silent success. `$?` after a
  pipeline is `tail`'s status. The gate ends with `.catch(err => { console.error(err);
  process.exit(1) })` and is correct. **Re-measure before recording, including your own
  measurement.**

One small code observation, kept in proportion: `markdownFiles()` calls
`fs.readdir(root, { recursive: true })` over all of `docs/` and only then discards `_site`,
`_serve` and `_pdf` by prefix, so the walk enumerates four output trees to find 906 markdown
files, and races a concurrent build or serve --- which is how the transient
`ENOENT … docs\_serve\CustomControls` above arose. Wasteful and a little fragile; not a
correctness defect, and it exits 1 loudly if it does trip.

**The theme the round was written to probe held up.** UC-33, UC-37 and UC-38 were chosen as
one shape --- a check that is green because it is looking in the wrong place --- and all three
landed on the same structural fault from different directions: the documentation does not
agree with itself about which wrapper runs which gate, and the one page dedicated to the task
is the least accurate of the three.

## Method

Unchanged from round 2 and retained in [eval/](../eval/). Corpus built at `cd141f1` from a
current build (908 pages, 3,741 index entries): 982 readable prose files, 253 sources stubbed
unreadable, `WIP.md` + the twelve `WIP.*.md` + both prior `REVIEW-USECASES-*.md` withheld.
Eight independent evaluators, one goal each, never told what the case tested or that a hazard
existed. Protocol in [eval/protocol.md](../eval/protocol.md), catalogue in
[eval/usecases.md](../eval/usecases.md).

Search ranks quoted in the Verdict were re-measured by the orchestrator against
`eval/site_search.mjs` directly, not taken from evaluator reports.

## Outcome

**All thirteen findings are closed**, in `dc8dd25` and `049b949`. Seven agents, one file
each, with the canonical owner decided before dispatch rather than after --- `Tools.md` owns
the `book.bat` pre-flight and both gate lists; `Building.md`, `Extending.md` and
`PDF-Generation.md` cite it. That decision is the whole fix for findings 1 to 3, which were
one sentence copied across three pages in each case.

Two things came out of it that the review did not anticipate.

**A gate now enforces the gate lists.** [`scripts/check_gate_lists.mjs`](../scripts/check_gate_lists.mjs)
parses `check.bat` and `test.bat` and checks `Tools.md`'s two numbered lists and both stated
step counts against them, plus every `&&`-chained command block under `docs/Documentation/`
--- which is how `Building.md`'s POSIX equivalents stay honest. It is `test.bat`'s second
step and runs in both CI workflows. It caught its own registration immediately (six gates
documented as five), and reinstating round 2's real defect fails it by name. Requiring
`&&` is load-bearing: without it, a block listing one script's usage forms reads as a
wrapper sequence, which produced eight false findings on the first run.

**The tilde-fence hazard was found by an agent writing the fix for finding 5, not by the
round.** `stashCodeFences` recognised backtick fences only, on the stated reasoning that
`maskCodeRegions` handles tildes --- but `rewriteAdmonitions` runs outside the mask by
design, so nothing protected a tilde fence. A `~~~` block holding an odd number of
standalone ``` lines reproduced the `Attributes.md` failure exactly. `docs/` has no tilde
fence, so the corpus sweep could never have found it. Fixed in `049b949` with a fifth
admonition probe; reverting the regex fails that probe by name.

Findings 6 and 10 turned out to be one problem. `packages` alone could not express either
sentence the site writes, so `builder/counts.mjs` gained `defaultPackages` and
`builtInPackages`, and `Reference/index.md` and `Reference/Packages.md` now carry the first
call sites any package count has had. **A count name is also a way of naming the set**,
which is a second thing it buys beyond not going stale.

Three corrections were made to the fix briefs by the agents executing them, each verified:
`npm install` *does* fetch Chromium through puppeteer's postinstall (the real weakness is
that `book.bat` tests for the package); `--install-deps` is Linux-only and needs root, so
recommending it on a Windows-centric page was wrong; and the enumeration total was 140, not
the 141 the page claimed --- the brief had said to leave that number alone. A fourth
correction is mine: `check_code_regions.mjs`'s corpus sweep structurally cannot see the
fence-marker case, which is the mirror fault its fixed probes cover, and I had written the
brief as though the sweep caught it.

## What to do next

The queue is this section, in the order worth doing. **Items 1 to 4 are done; 5 and 6
remain.**

**1. Fix the three Tier 1 items, and make a canonical decision while doing it.** All three are
one-copy-per-page drift, and findings 1 and 2 are each a sentence duplicated across two or
three pages where only one should own it. Round 2's fix pass created 40 lines of
near-parallel prose across `Authoring.md` and `Building.md` this way; finding 2 is round 2's
own fix decaying because its second copy was never reconciled. Decide the owner first:

- **`book.bat`'s pre-flight** --- `Tools.md#bookbat` owns the behaviour; `Building.md:81` and
  `PDF-Generation.md:88-102` point at it. Delete the quoted message that does not exist.
- **Which wrapper runs which gate** --- `Tools.md` owns it and is correct today.
  `Building.md:237` and `Extending.md:493,500,600,603,612` cite it instead of restating it.
- **`Extending.md` must learn that `test.bat` exists**, and `:495`'s decision test should route
  a gate that reads no page to `test.bat` --- which is the rule `WIP.md` already states as "a
  new gate belongs in `test.bat` if it would still mean something with no documentation in
  the tree."

**2. A gate for the gate counts.** Findings 2 and 3 are six wrong numbers and two wrong gate
lists across three pages, and they are wrong because nothing checks them --- the same argument
`{{tbdocs:...}}` already won for page counts. `check.bat` and `test.bat` are parseable, so
`checkBatGates` / `testBatGates` are derivable names, and the gate *lists* could be generated
rather than restated. This is the cheapest permanent fix in the review and it closes a defect
that has now recurred across two rounds.

**3. Publish the twinBASIC build harness (finding 4).** `tbbuild.mjs` is the largest piece of
tooling in the repository with no published page, and `Tools.md:11` currently claims
otherwise. `WIP.md`'s section is written and would largely transplant. While there:
`Features/Packages/Import-export tool.md:132`'s "There is no command that compiles a project"
is true of `bin/twinBASIC_win32.exe` and reads as absolute --- scope it.

**4. The authoring gaps.** A `## Fences` subsection in `Authoring.md` stating the
longer-fence rule and pointing at `Attributes.md` as the precedent (finding 5); a *Removing a
page* mirror of the listing checklist (finding 7); `{{tbdocs:packages}}` used at its two call
sites and `:343` and `:619` reconciled with `:299` (finding 6). Mark the `Tables` totals
as-of or give them names (finding 9).

**5. Round 4 candidates**, from what this round could not reach:

- The `check.bat` / `test.bat` boundary as a *task*: "I wrote a gate that reads no page ---
  where does it go?" Three cases brushed it; none was pointed at it.
- Recovery from a gate whose failure has no "when this fails" passage. Round 2 listed five;
  `check_regex_safety`, `check_code_regions`, `check_a11y`, `pick_a11y_sample` and nav
  integrity still have none, and round 3 did not sample them directly.
- A case whose answer is correct on one page and stale on another, to measure whether a
  reader notices. Findings 1 and 2 were both found by evaluators who read two pages; an
  evaluator who reads one would have acted on the wrong one.

**6. The tail, carried forward unchanged from round 2.**
[PLAN-counts.md](PLAN-counts.md)'s Phase 3 is four call sites against ~270 numeric claims in
`docs/Documentation/` prose --- findings 6 and 9 are both instances of it.
[PLAN-checks.md](PLAN-checks.md)'s `pick_a11y_sample --check` census and the axe scan's
orchestration remain designed and not implemented.
