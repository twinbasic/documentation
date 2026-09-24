# Use-case catalogue

Each case is a **task**, not a topic. "Explain the scheduler" is a topic and every document
passes it; "add a task that fans out over pages and merges the results" is a task, and it
either walks into the barrier-`expected` hazard or it does not.

`H` marks a case with a known hazard: a way to do the task that looks right, is wrong, and is
recorded somewhere in the repository. **The evaluator is never told the hazard exists.**
Walking into it is the finding.

Do not paste this file into a corpus an evaluation will read --- `eval/` is excluded from the
mirror for exactly that reason.

---

## Round 1 --- the three personas

### Persona A: content contributor (never touches the builder)

| id | goal | hazard |
|----|------|--------|
| UC-01 | Add a reference page for a language statement: where does the file go, what frontmatter, how does it reach the nav and the indexes? | |
| UC-02 | Put a screenshot into a page --- where does it live, what is it named, what will the build refuse? | |
| UC-03 | A contributor's draft pastes a `github.com/user-attachments/...` image URL. Merge as-is? | **H** leaving the vendored copy uncommitted fails CI; the URL itself is fine |
| UC-04 | Embed a YouTube video. | **H** an `<iframe>` or hotlinked thumbnail is the obvious move and is banned |
| UC-05 | A page uses `#` then `###`. Is that acceptable? | **H** the build silently repairs legacy pages, which hides the defect from new authors |

### Persona B: toolchain user (runs the build, chases a gate, deploys)

| id | goal | hazard |
|----|------|--------|
| UC-06 | The build aborted: a file type may not be published. Diagnose and fix. | **H** widening `SOURCE_EXTENSIONS` is the obvious fix and the wrong one |
| UC-07 | The accessibility gate failed on one page. Reproduce it, look at it, fix it, prove it. | **H** `file://` in a preview pane renders unstyled; the scan targets `_site-offline/` |
| UC-08 | I edited a `.dot` diagram. What do I run, what do I commit? | **H** hand-editing the `.svg`, or setting the font anywhere but the `.dot` |
| UC-09 | Get my change deployed; what does CI run that my local build does not? | |
| UC-10 | Preview an edit and judge how it looks. | **H** `file://` is worthless for styling; `serve.bat` is required |

### Persona C: builder developer (modifies tbdocs itself)

| id | goal | hazard |
|----|------|--------|
| UC-11 | Add a task that fans out over pages and merges results into build state. | **H** a barrier must list every chunk task in `expected`; a zero dep count does not mean the submits ran |
| UC-12 | Add a markdown-it plugin that rewrites one kind of link. | **H** page-relative paths break the PDF book; emit root-absolute |
| UC-13 | Upgrade axe-core. What must be re-run before trusting a green check? | **H** the fingerprint gate alone is insufficient; two gates are required |
| UC-14 | Change the site's body typeface. What else must change? | **H** dark mode silently keeps system fonts; diagram metrics go stale |
| UC-15 | I edited the link checker. How do I know one implementation didn't quietly check less? | |
| UC-16 | Add a CSS rule for a component that works in both themes. | **H** the dark compilation raises specificity; a single-class rule silently loses |

## Round 2 --- recovery, and the URL contract

Round 1 under-sampled two things: **recovery** (something already went wrong and must be
diagnosed) and **the `/tB/` URL contract**, the one part of the site with an external
consumer. Both are where the repository's most expensive historical failures sit.

### Persona A: content contributor

| id | goal | hazard |
|----|------|--------|
| UC-17 | Document a COM interface whose real name begins with an underscore, with a folder of property pages. | **H** a blanket `**/_*/**` exclude once swallowed 37 pages and a package published nothing for months |
| UC-18 | Move a reference page between sections without breaking the `/tB/` links the IDE help system resolves against. | **H** the permalink is a contract; `redirect_from` is owed |
| UC-20 | Link from a VBA module page to a VBRUN module page, and back. | **H** the two sit at different URL depths, so the `../` counts are asymmetric |
| UC-21 | Write a passage with a parenthetical aside and a term list. | **H** literal `—` is forbidden in source; the bullet dash differs by list kind |
| UC-22 | Add a wide comparison table. | **H** a bare table once failed `scrollable-region-focusable` on 44 pages |
| UC-23 | Rename a section heading that other pages link to by anchor. | **H** `redirect_from` emits whole-page stubs and cannot remap a fragment |
| UC-30 | Add a fenced code sample in a language the highlighter has never seen. | **H** silently falls back to plain text with only a build-log warning |

### Persona B: toolchain user

| id | goal | hazard |
|----|------|--------|
| UC-19 | A new page built green and is not on the site. Diagnose. | **H** several distinct causes, most of them silent |
| UC-24 | `book.bat` failed. Triage it. | |
| UC-25 | The build has got slower. Find where the time went. | |
| UC-26 | Build and verify on macOS, where the `.bat` wrappers do not run. | |
| UC-29 | First contribution: what to read, in what order, what to run before opening a PR. | |

### Persona C: builder developer, and a reviewer

| id | goal | hazard |
|----|------|--------|
| UC-27 | Re-vendor a newer just-the-docs and keep the in-tree patches. | |
| UC-28 | Add a new verification gate to `check.bat`. | **H** not one of the three documented extension points |
| UC-31 | Review a pull request that changes `builder/`. | **H** the fixture's hard-coded counts break from a template change alone |
| UC-32 | I changed a build task. Which documentation must follow, and how do I know I found it all? | |

## Round 3 --- the fixes, and gates that report success

**Run 2026-09-21 at `cd141f1`** --- [builder/REVIEW-USECASES-cd141f1.md](../builder/REVIEW-USECASES-cd141f1.md).
Round 2's own ~35 commits of fixes had had no equivalent of the measurement
round 2 gave round 1, which is the only direct evidence a documentation change works: five
independent evaluators cited `Authoring.md:185-192` unprompted, a section that had not
existed that morning, and one reported it caught a regression for them.

Two things to sample that the earlier rounds could not.

**Re-run round 2's two worst cases unchanged.** UC-24 (`book.bat` failed) and UC-22 (add a
wide table) each *stalled* on navigation and *missed* on search. Both now have the page they
lacked --- `PDF-Generation.md` has a *When the render fails* section, `Authoring.md` has a
`## Tables` section. Whether either is **findable** is the thing the harness measures and
nothing else does. Re-running a case against a corpus that has changed is the design, not a
repeat.

**Sample surface no evaluator has read.** The page-count drift guard and its accept command,
`{{tbdocs:...}}` counts, `check_code_regions.mjs` (which had no `Tools.md` entry at all until
the session that added these cases), and the `LibraryId` / `Version` attribute entries.

### Persona A: content contributor

| id | goal | hazard |
|----|------|--------|
| UC-33 | Write a page that shows a fenced code sample whose *contents* include a fence marker, and put a note callout after it. | **H** the fence stasher once closed on the inner marker, and every admonition after it on that page shipped as the literal text `[!NOTE]` |
| UC-34 | State in prose how many packages the reference documents, so the sentence cannot go stale. | **H** the syntax exists, is one page away, and nothing in a page about counts points at it |

### Persona B: toolchain user

| id | goal | hazard |
|----|------|--------|
| UC-35 | The build says there are fewer pages than last time, and the removal was deliberate. Make it accept that. | **H** the number is in a committed file, and the remedy is a flag rather than an edit |
| UC-36 | Compile a one-module twinBASIC project from a script to check an attribute, without opening the IDE. | **H** an invalid `project.id` wedges the IDE at *Services: LIMITED* behind a 2% progress dialog, reports no error anywhere, and the harness still exits 0 |

### Persona C: builder developer, and a reviewer

| id | goal | hazard |
|----|------|--------|
| UC-37 | Add a regression test for a build-time rewrite that silently stopped firing. | **H** the first draft of exactly this test passed against the very defect it was written to catch |
| UC-38 | Add a gate that compares this build against the previous one, and decide what it must not do in CI. | **H** a guard keyed to nothing met a three-page fixture with *905 pages missing* |

**The theme is gates that report success.** UC-33, UC-37 and UC-38 are all one shape --- a
check that is green because it is looking in the wrong place --- and it is the failure this
repository keeps rediscovering. A case that finds the documentation silent on it is worth
more than one that finds a broken link.

## Round 4 --- recovery from a gate, and the boundary

**Run 2026-09-21 at `4f97bac`** --- [builder/REVIEW-USECASES-4f97bac.md](../builder/REVIEW-USECASES-4f97bac.md).
Round 3 closed thirteen findings and added two gates; this
round asks whether the prose those fixes produced is *reachable*, and samples the one
category round 3 named and could not cover: a gate that fails with no "when this fails"
passage anywhere. Two of the site's fifteen developer pages carry such a heading
(`Building.md`'s diagram-fit section and `PDF-Generation.md`'s render section), and both
were written by earlier rounds of this harness.

**Re-run round 3's three worst cases unchanged.** UC-36 scored 1/1/1, UC-33 2/1/2 with the
hazard walked into, UC-34 3/2/3 likewise. Each now has the page it lacked --- a
`scripts/tbbuild.mjs` entry, a fence subsection, two package-count call sites. Whether any
of them is *findable* is what this measures and nothing else does.

### Persona A: content contributor

| id | goal | hazard |
|----|------|--------|
| UC-33 | *(re-run)* A fenced sample whose contents include a fence marker, then a note callout. | **H** the fence stasher once closed on the inner marker and shipped every later admonition as literal `[!NOTE]` |
| UC-34 | *(re-run)* State in prose how many packages the reference documents, so it cannot go stale. | **H** the syntax exists one page away and the same page's checklist once said to hand-edit the number |
| UC-42 | Delete a reference page that other pages link to, and leave nothing broken behind. | **H** the URL is a contract, and the page-count guard fails on a fall |

### Persona B: toolchain user

| id | goal | hazard |
|----|------|--------|
| UC-36 | *(re-run)* Compile a one-module twinBASIC project from a script to check an attribute. | **H** the harness existed and was documented nowhere under `docs/` |
| UC-40 | A gate refused a regex I added to the builder. Understand it and fix it. | **H** the obvious narrowing of the character class is still exponential |
| UC-41 | The build printed its last line and stopped. Nothing since, no error. | **H** `--stall-timeout` appears zero times in `docs/`; the cause class is on another page |

### Persona C: builder developer

| id | goal | hazard |
|----|------|--------|
| UC-39 | I wrote a gate that reads no page. Where does it go, and what must I register? | **H** two wrappers, and the rule for choosing is one sentence added this morning |
| UC-43 | `pick_a11y_sample --check` failed after my change. Fix it. | **H** widening the sample is the obvious move and the wrong one |

**The theme is the failure path.** Every round so far has found that this documentation is
written for someone about to do something. Round 2 named that; round 3 found the recovery
prose it produced had gone stale against the code. UC-40, UC-41 and UC-43 are three gates
that can stop somebody's work, and the question is not whether the repository knows the
answer --- it does, in `WIP.md` and in the gates' own comments --- but whether a reader
meets it.

## Scoring

Per case, 0--4 each:

- **Completeness** --- does the corpus answer the goal well enough to act without guessing?
- **Discoverability** --- reachable from the goal alone? Measured separately per channel,
  because search and navigation fail on different pages.
- **Actionability** --- specific enough to execute (exact commands, files, order) and to
  verify afterwards?
- **Hazard coverage** --- pass / fail / n-a: was the reader warned at the place they were
  reading, or did they walk into it?

Also recorded, not scored: hops to first useful hit, dead ends, and whether full-text search
was needed.

## Writing a new case

**Mine the hazards.** `WIP.md` is substantially a catalogue of "this shipped broken and
nobody noticed" --- 27 mislabelled diagram boxes, ~6 pages silently dropped from the search
index, a package that published nothing. Each is a use case waiting to be written, and the
real question is never whether the warning exists but whether the reader meets it at the
point they would go wrong.

**Word the goal the way a person would say it**, and never hint at the hazard. If the case
mentions the trap, it measures reading comprehension instead of documentation.

**Expect premises to be wrong.** UC-18 assumed a page still needed moving; it had already
moved, and the evaluator audited the completed move against the documented checklist
instead, which produced three findings the intended scenario would not have. That is a
successful run, not a wasted one.

## Round 5 --- the fixes again, and three surfaces no round has read

**Run 2026-09-21 at `4b50c0c`** --- [builder/REVIEW-USECASES-4b50c0c.md](../builder/REVIEW-USECASES-4b50c0c.md).
Round 4 found that six of its fourteen findings were
introduced by round 3's own fix pass, seven hours old, and that re-running a case is the
only instrument that catches either a fix working or a fix pass damaging what it touched.
It has now gone three-for-three twice.

**Re-run round 4's worst three unchanged.** UC-40 scored 2/2/2, UC-41 2/1/3 with the hazard
walked into, UC-43 2/3/2. Each now has what it lacked: `Building.md` has a *When a build
stops instead of failing* section and `Tools.md` a `--stall-timeout` row, `Tools.md` states
what makes a regex exponential and that the report hands you a witness, and `Extending.md`
carries the shape of a construct family with its three fields.

**Sample three surfaces no round has touched**, all named by round 4's own queue: the
persistent worker pool under `serve.bat`, the offline mirror as something you hand to a
person rather than something a scan reads, and a cold start from a fresh clone. Two more
are mined from the places this file says to mine: adding a diagram, and the *producer* side
of `{{tbdocs:...}}` --- four extension points are documented and adding a count name is not
one of them.

### Persona A: content contributor

| id | goal | hazard |
|----|------|--------|
| UC-46 | Add an architecture diagram to a page: what to create, where it goes, what to commit, how to know it is right. | ~~**H** the dash convention does not apply inside alt text~~ --- **premise false**, see below |

### Persona B: toolchain user

| id | goal | hazard |
|----|------|--------|
| UC-41 | *(re-run)* The build printed its last line and stopped. Nothing since, no error. | **H** `--stall-timeout` appeared zero times in `docs/` and two pages asserted nothing times out |
| UC-44 | `serve.bat` is running for live preview and a builder change never appears in the browser. Diagnose it and give a workflow that works. | **H** the pool outlives a rebuild *and* the watcher only watches `docs/`; the page that says so is one a toolchain user has no reason to open |
| UC-45 | Hand somebody a copy of the documentation they can read on a laptop with no network. | **H** `_site/` is the tree that looks right and is the one that does not work under `file://` |
| UC-48 | Fresh clone on a new machine: confirm it is healthy and say what a healthy run looks like. | **H** three wrappers with an order between them, and `check.bat` refuses a tree it considers stale |

### Persona C: builder developer

| id | goal | hazard |
|----|------|--------|
| UC-40 | *(re-run)* A gate refused a regex I added to the builder. Understand it and fix it. | **H** the obvious narrowing of the character class is still exponential |
| UC-43 | *(re-run)* `pick_a11y_sample --check` failed after my change. Fix it. | **H** widening the sample is the obvious move and the wrong one |
| UC-47 | A landing page states a total as a hand-written digit that goes stale. Make the build supply it. | **H** a registry entry holding the number is the obvious shape and moves the stale figure rather than removing it |

**UC-46's hazard did not exist**, and the case was productive anyway --- third time this has
happened, after UC-18 and round 4's UC-42. It was written from `WIP.md`'s claim that image
alt text escapes the typographer, which is false for this repository: `kramdownDashesPlugin`
walks recursively and reaches alt. The case still returned the round's best discoverability
score and two verified findings the intended scenario would not have reached. **The check
that would have caught the bad premise is the one the review now recommends generally** ---
render through the pipeline the repository runs, not through the library it depends on.

## Round 6 --- does a discoverability fix work, and does the reference half work at all

**Run 2026-09-21 at `9b8e70c`.** Round 5 measured something no earlier round could: across
round 4's fix pass, three re-run cases gained +1.33 completeness and +1.34 actionability
and moved discoverability **±0.00**. Round 5's own fix pass then went at discoverability
directly. Whether *that* works is the thing to measure now, and re-running is the only
instrument that can.

**Re-run round 5's three discoverability-1 cases unchanged.** UC-40, UC-44 and UC-45 each
scored 1 on reachability with content rated 3 or 4 --- the answer was there and nobody
could get to it. Each now has a specific fix: 21 tool headings lost a directory prefix so
lunr can prefix-match a bare script name, the serve-mode caveat is a section with a
symptom-shaped title instead of an un-anchored NOTE, and the offline copy has a welcome-page
door. A rank measured before and after is the whole point.

**Sample the 81% of the site no round has ever read.** Every case in rounds 1--5 was about
`docs/Documentation/` --- roughly 3.5% of the search index. The twinBASIC *reference* is the
rest, it is what the site is for, and nothing here has asked whether it works. These cases
use the **site-entry protocol** below.

### The site-entry protocol variant

A reader of `docs.twinbasic.com` never sees `README.md`, `WIP.md` or `builder/`. For the
cases marked *(site)* the protocol changes in two ways: **Channel 2 starts at
`docs/index.md`**, the published welcome page, rather than the repository README; and the
evaluator may open **only files under `docs/`**, which is what the site publishes. Nothing
else moves. A case run this way is not comparable with a repo-protocol run of the same
goal, so do not mix them in a re-run.

### Persona B: toolchain user, and a maintainer

| id | goal | hazard |
|----|------|--------|
| UC-40 | *(re-run)* A gate refused a regex I added to the builder. Understand it and fix it. | **H** the answering section appeared in none of seven queries, including the gate's own filename |
| UC-44 | *(re-run)* `serve.bat` never shows a builder change. Diagnose it and give a workflow. | **H** the answer was an un-anchored NOTE; both pages documenting `serve.bat` were silent |
| UC-45 | *(re-run)* Hand somebody a copy to read on a laptop with no network. | **H** four reader-phrased queries missed; no reader-facing page said the copy existed |
| UC-52 | Cut a release carrying the offline site copy and the PDF book, and say what a consumer gets. | **H** only a manual dispatch attaches them, and the release can lag the live site arbitrarily |

### Persona D: a twinBASIC developer on the published site *(new)*

| id | goal | hazard |
|----|------|--------|
| UC-49 | *(site)* Port a VB6 form that uses an `MSCOMCTL.OCX` ListView: what replaces it, and how do I fill it? | **H** the package ships with the IDE but is referenced on demand, and the items live on sub-objects reached through the control |
| UC-50 | *(site)* Port a VBA routine that assigns to `Date` and does currency maths with `CDec`. | **H** `Date` is a property in twinBASIC, not a function/statement, and `Decimal` is a full data type rather than a Variant subtype |
| UC-51 | *(site)* I want these docs on my laptop with no connection, or printed. | **H** the same deliverable as UC-45 from the reader's side, against a door added the same day |
| UC-53 | *(site)* Write a class that raises an event and a form that handles it. | **H** `WithEvents` has no page of its own, and twinBASIC adds `Handles`, which VB6 does not have |

## Round 7 --- the re-runs round 6 asked for, and the surface opened since

**Run 2026-09-23 at `60bb6f5`**, plus two uncommitted edits made for it: the UC-40 door
below, and one stale clause in `Tools.md`'s `gen_attribute_probes.mjs` entry. Round 6 left
a list; this round takes it, less the two items it could not honestly run.

**Re-run the three round 6 named.** UC-49 and UC-53 had their samples fixed and are now
compiled by `examples.bat`, and `WithEvents` has a page. UC-40's fix *did not work* in
round 6, and round 6 said why: a new section titled in the vocabulary of the problem is
what moves discoverability, and a renamed heading is not. `Extending.md` now has *When
`test.bat` says a regex can backtrack exponentially*, which quotes the gate's own first
line of failure. Whether a symptom-shaped title works when the symptom is a gate's output
rather than a behaviour is the question.

**Open the two surfaces round 6 named and the one it could not have.** The Features section
(6.7% of the index) has never been read by a case; UC-55 reads the page rebuilt the day
before. UC-54 is the tutorial case round 6 asked for, and the first case whose deliverable
is *executed*: the orchestrator compiles and runs what the evaluator assembles, with
`tbrun`, and compares the output with what the evaluator predicted from the page. And the
sample-compiling harness (`examples.bat`, `check_build`) did not exist at round 6.

**Two gates round 3 listed as having no "when this fails" passage** were never sampled:
`check_code_regions` and nav integrity. UC-56 and UC-57.

**Not run: the stale-page case** round 3 queued --- an answer correct on one page and stale
on another. A targeted search for a live instance found one, `Tools.md`'s claim that
`import` always exits 0, and it was too weak to use: the remedy that page gives next to the
stale claim is still the right one, so a reader who trusts it does not go wrong. It is fixed
in the corpus instead. Every evaluator's GAPS section is the cheaper detector for the next
one.

**Not run: UC-50.** Its completeness 2 was round 6's finding 10, still open when this round
started; a re-run would re-measure the same absence.

### Persona A: content contributor

| id | goal | hazard |
|----|------|--------|
| UC-57 | I renamed the title of a section's landing page and the build now stops with `Nav-parent orphan detected in 12 page(s)`. Fix it properly. | **H** the recovery prose sits under *Removing a page*, a heading about a different task; the match is on the title, so every child has to follow it |
| UC-58 | I'm adding a code example to a reference page. Make sure it actually compiles before I open the pull request, and tell me how I'd show a reviewer that it does. | **H** `examples.bat` is outside every gate and CI, so a green pull request says nothing about a sample; and a fence without `check_build` is never compiled at all |

### Persona C: builder developer

| id | goal | hazard |
|----|------|--------|
| UC-40 | *(re-run)* A gate refused a regex I added to the builder. Understand it and fix it. | **H** rounds 5 and 6 found the answer only under the script's own name; the section added for this round quotes the failure instead |
| UC-56 | I changed one of the builder's text rewrites, and `test.bat` now fails in `check_code_regions`. What does it want from me, and what is the right fix? | **H** exempting the page or loosening the comparison looks like a fix; the rewrite belongs between `maskCodeRegions` and its restore, and the gate's `Tools.md` entry has no "when this fails" passage |

### Persona D: a twinBASIC developer on the published site

| id | goal | hazard |
|----|------|--------|
| UC-49 | *(site, re-run)* Port a VB6 form that uses an `MSCOMCTL.OCX` ListView: what replaces it, and how do I fill it? | **H** the flagship sample raised a documented run-time error; fixed and compile-checked since |
| UC-53 | *(site, re-run)* Write a class that raises an event and a form that handles it. | **H** `WithEvents` had no page, and five pages disagreed about the event mechanism; reconciled since |
| UC-54 | *(site)* I want to start unit-testing my twinBASIC code. Get me from nothing to a test run: the finished project exactly as I'd have it, and what the run will print. | executed, not only read: the orchestrator runs the assembled project with `tbrun`. The Assert calls need both the package and the module qualifier, and the samples compiled only from two days before |
| UC-55 | *(site)* Keep my twinBASIC project in git as plain-text files, and rebuild the project file from them in a script. | **H** the tB executable exits 0 after the failures it reports, cannot re-pack a project that embeds a package --- which a project using one does by default --- and packs a `.git` folder into the project |

## Round 8 --- isolated evaluators, and the re-runs round 7 named

**Run 2026-09-24 at `5b4cd37`** --- [builder/REVIEW-USECASES-5b4cd37.md](../builder/REVIEW-USECASES-5b4cd37.md).
The corpus was built at `5de91d0`, which rebasing `staging` onto the IDE help add-in branch
(`9c733b2c`) turned into `5b4cd37`. It therefore lacks that branch's
changes to `Tools.md` and `BUGS-TO-REPORT.md`, the only two corpus files it touched that are
readable.

Before any case ran, this round found that an evaluator run as a subagent carries `WIP.md`
in its own context, because it inherits the orchestrating session's `CLAUDE.md` --- as
round 7's evaluators very likely did
([eval/README.md](README.md#why-an-evaluator-is-a-separate-process)). Every case from here
on runs through `eval/run_case.mjs`. A re-run's delta therefore mixes the fix with the
removal of the notes --- and removing them can only have made a case harder.

**Re-run round 7's four.** UC-55, UC-56 and UC-57 against the symptom-titled sections
written for them; UC-50 against round 6's findings 10 and 12, closed since.

**UC-50's routine is reconstructed.** Round 6 gave its evaluator a routine to port and
recorded only a description of it. The routine below fits that description --- it assigns
to `Date`, does its money arithmetic through `CDec`, and prints --- and is recorded here
verbatim so the next re-run can be exact. Round 6's scores are for a different program.

```vba
Public Sub PostMonthEndInterest()
    Dim balance As Variant, monthlyRate As Variant, interest As Variant
    Date = #1/31/2026#                          ' post as of month end
    balance = CDec("15230.55")
    monthlyRate = CDec("0.0425") / 12
    interest = balance * monthlyRate
    Debug.Print "Posted "; Date; ": interest "; Round(interest, 2); _
                ", new balance "; balance + Round(interest, 2)
End Sub
```

**Open one surface no case has read**: the Features section's package pages, which UC-55
reached only at their Import/Export page.

**Then, in a second session, eight more.** UC-58 and UC-54 re-run, UC-54 executed again
against the Assert pages rewritten after round 7's run. **Round 1's four lowest, never
re-measured since**, with their goals verbatim from the Round 1 tables and on the repository
protocol they were first run under: UC-06 (3/2/2), UC-14 (2/1/3), UC-15 (4/1/3) and UC-16
(1/0/1). And two new site cases: UC-59, a second executed case, and UC-61, the first case to
read the IDE section.

### Persona B: toolchain user

| id | goal | hazard |
|----|------|--------|
| UC-06 | *(re-run of round 1)* The build aborted: a file type may not be published. Diagnose and fix. | **H** widening `SOURCE_EXTENSIONS` is the obvious fix and the wrong one; in round 1 the right remedy was on neither page that diagnoses the refusal |

### Persona C: builder developer, and a content contributor

| id | goal | hazard |
|----|------|--------|
| UC-56 | *(re-run)* I changed one of the builder's text rewrites, and `test.bat` now fails in `check_code_regions`. What does it want from me, and what is the right fix? | **H** exempting the page or loosening the comparison looks like a fix; round 7's pass may have come from `WIP.md` |
| UC-57 | *(re-run)* I renamed the title of a section's landing page and the build now stops with `Nav-parent orphan detected in 12 page(s)`. Fix it properly. | **H** the match is on the title, so every child has to follow it; round 7's pass may have come from `WIP.md` |
| UC-58 | *(re-run)* I'm adding a code example to a reference page. Make sure it actually compiles before I open the pull request, and tell me how I'd show a reviewer that it does. | **H** `examples.bat` is outside every gate and CI, so a green pull request says nothing about a sample, and a fence without `check_build` is never compiled; round 7's pass may have come from `WIP.md` |
| UC-14 | *(re-run of round 1)* Change the site's body typeface. What else must change? | **H** dark mode silently keeps the system font stack, and the diagram metrics go stale |
| UC-15 | *(re-run of round 1)* I edited the link checker. How do I know one implementation didn't quietly check less? | round 1 found the answer excellent and missed by four searches of four |
| UC-16 | *(re-run of round 1)* Add a CSS rule for a component that works in both themes. | **H** the dark compilation raises specificity, so a single-class rule silently loses in dark mode; round 1 stalled after eleven hops |

### Persona D: a twinBASIC developer on the published site

| id | goal | hazard |
|----|------|--------|
| UC-50 | *(site, re-run)* Port this VBA routine to twinBASIC: it assigns to `Date` and does its currency maths with `CDec`. *(The routine above follows the sentence.)* | **H** `Date` is a property, not a statement; `Decimal` is a full data type, and whether the arithmetic stays `Decimal` is now documented; so is the order a date literal is read in |
| UC-55 | *(site, re-run)* Keep my twinBASIC project in git as plain-text files, and rebuild the project file from them in a script. | **H** as round 7, and one the pages do not know: the IDE's own **Export Project** --- and *Export After Save*, which runs it on every save --- empties its folder first, and the docs describe neither |
| UC-60 | *(site)* I have a few utility modules I copy into every project. Make them a package that my projects reference instead, and tell me how a bug fix in the package then gets into the projects that use it. | **H** a referenced package is embedded in each project by default, so rebuilding the package changes nothing in them; *Updating a Package* covers only TWINSERV; and the linked-package folder is given as `%APPDATA%\Roaming\twinBASIC\packages`, which does not exist --- `%APPDATA%` already ends in `Roaming` |
| UC-54 | *(site, re-run)* I want to start unit-testing my twinBASIC code. Get me from nothing to a test run: the finished project exactly as I'd have it, and what the run will print. | executed, as in round 7, and twice: once as assembled and once with one expected value changed, against the Assert pages rewritten after round 7's run to say what a failure looks like |
| UC-59 | *(site)* Several of my classes share most of their code and differ in one step. In VB6 I copied the shared code into each one behind `Implements`; I've read that twinBASIC has real inheritance. Get me a working example --- a base class, two classes derived from it, and a routine that uses both through the base type --- as the finished code exactly as I'd have it in my project, and what running that routine prints. | executed. **H** the Inheritance page's classes are all `Private` without saying why, and a public class whose `New` takes arguments does not compile; the rule is on another page, and the page's example never constructs a class |
| UC-61 | *(site)* My program stops with a run-time error partway through a loop when I run it from the IDE. Find the line and the loop iteration where it stopped and what the variables held there, then step through the rest of the loop one line at a time. | none known. No case has read the IDE section, whose debugging pages are 14--25 lines each |

## Round 9 --- the re-runs round 8 named, and four new site cases

**Run 2026-09-24 at `d4b37ec`** --- [builder/REVIEW-USECASES-d4b37ec.md](../builder/REVIEW-USECASES-d4b37ec.md).
Round 8's last commit, with its fixes in. One session, every case in parallel through
`eval/run_case.mjs`, on the same model and Claude Code build as round 8.

**Re-run the seven round 8 named**: UC-55, UC-59, UC-60 and UC-61 against its fixes, and UC-14,
UC-15 and UC-16 against the three `##` sections written for them. Goals verbatim, each case on
the protocol it was first run under. **Also re-run round 8's own queries** for those cases against
this round's index, since an evaluator's queries differ from run to run and the index's answer to
the same words does not.

**Write the case round 8 asked for**: a project kept in Git with the IDE's own Export Project,
where round 8 found the data loss. **Open three surfaces no case has read**, each executed: a VBA
error handler ported as it stands, against the error-number table round 8 wrote; the Windows API
tutorial; and generics.

### Persona C: builder developer

| id | goal | hazard |
|----|------|--------|
| UC-14 | *(re-run of round 1)* Change the site's body typeface. What else must change? | **H** dark mode keeps the system fonts when a new stack is not passed to it, and the diagram metrics go stale; round 8's six queries all missed, and *Changing a typeface* was written for this |
| UC-15 | *(re-run of round 1)* I edited the link checker. How do I know one implementation didn't quietly check less? | round 8 found the answer in an `###` the search does not index; *Changing the link checker* was written for this |
| UC-16 | *(re-run of round 1)* Add a CSS rule for a component that works in both themes. | **H** the dark compilation raises specificity, so a single-class rule silently loses in dark mode; *Adding a CSS rule that works in both themes* was written for this |

### Persona D: a twinBASIC developer on the published site

| id | goal | hazard |
|----|------|--------|
| UC-55 | *(site, re-run)* Keep my twinBASIC project in git as plain-text files, and rebuild the project file from them in a script. | **H** as round 8; its rebuild command reversed `import`'s arguments, and the section now gives the command |
| UC-59 | *(site, re-run)* The goal of round 8, verbatim. | executed. **H** as round 8; the page now shows the routine inside a `Module` and says what the constructor rules are |
| UC-60 | *(site, re-run)* The goal of round 8, verbatim. | **H** as round 8; *Updating a package you built yourself* was written for this, and the linked-package folder corrected |
| UC-61 | *(site, re-run)* The goal of round 8, verbatim. | **H** Step Into on the failing line repeats the error; *When a run-time error stops the program* was written for this |
| UC-62 | *(site)* I want my twinBASIC project under Git, and I'd rather do it from inside the IDE than with a separate command-line tool. Set it up so that every time I save the project in the IDE, the files in my repository are brought up to date and ready to commit. Tell me exactly which settings to change, what to set them to, and where my repository should be. | **H** Export Project empties its folder first, `.git` included, and *Export After Save* does it on every save |
| UC-63 | *(site)* Port this VBA function to twinBASIC, and give me a routine that calls it on an array of a few numbers: once with two valid positions, once with a position past the end of the array, and once with a divisor of zero. I want the finished code exactly as I'd have it in my project, and what the routine prints. *(The function below follows the sentence.)* | executed. **H** an index past the end raises -2147352565, not 9, so `Case 9` does not catch it |
| UC-64 | *(site)* I need to call the Windows API directly from twinBASIC. Get me a module that prints this computer's name, the Windows folder, and how many seconds the system has been running, using API calls rather than `Environ` or FileSystemObject --- the finished code exactly as I'd have it in my project, and what it prints. | executed. None known; no case has read the Windows API tutorial |
| UC-65 | *(site)* I've read that twinBASIC has generics. Show me one function that returns the larger of two values and works for Long, Double and String alike, and a small stack class that holds items of any one type, with a routine that uses both --- the finished code exactly as I'd have it in my project, and what running that routine prints. | executed. None known; no case has read the generics page |

UC-63's function, verbatim:

```vba
Public Function Ratio(values() As Double, ByVal i As Long, ByVal j As Long) As String
    On Error GoTo Failed
    Ratio = Format$(values(i) / values(j), "0.00")
    Exit Function
Failed:
    Select Case Err.Number
        Case 9:  Ratio = "no such position"
        Case 11: Ratio = "cannot divide by zero"
        Case Else: Ratio = "unexpected error " & Err.Number
    End Select
End Function
```

## Round 10 --- the re-runs round 9 named, a fresh clone, and three surfaces no case has read

**Run 2026-09-24 at `16969e5`** --- [builder/REVIEW-USECASES-16969e5.md](../builder/REVIEW-USECASES-16969e5.md).
Round 9's last commit, with its fixes in. One session, every case in parallel through
`eval/run_case.mjs`, on the model and Claude Code build of rounds 8 and 9. That build is the
desktop app's bundled 2.1.280, passed with `--claude`: the `claude` on `PATH` had become 2.1.212
in the meantime, and the smoke check ran on both.

**Re-run the five round 9 named**: UC-63, UC-64 and UC-65 against its fixes, executed again;
UC-62 against the Git section's new warning; UC-55 against the export command. Goals verbatim,
each on the site protocol it was first run under. **Also re-run round 9's own queries** for those
cases against this round's index.

**Write the fresh-clone case round 9 asked for**, UC-66, and **open three surfaces no case has
read**: delegates used as callbacks and a UTF-8 text file, both executed, and a Standard DLL
called from Excel VBA, built and called.

### Persona D: a twinBASIC developer on the published site

| id | goal | hazard |
|----|------|--------|
| UC-55 | *(site, re-run)* The goal of round 7, verbatim. | **H** a second export without `--overwrite` leaves every changed file stale and exits 0; round 9 put the command with `--overwrite` into step 2 |
| UC-62 | *(site, re-run)* The goal of round 9, verbatim. | **H** Export Project empties its folder, `.git` included; round 9 added a warning to the Git section |
| UC-63 | *(site, re-run)* The goal of round 9, verbatim, with the function above. | executed. **H** -2147352565, not 9; the table was retitled for error 9 and *On Error* points to it |
| UC-64 | *(site, re-run)* The goal of round 9, verbatim. | executed. The tutorial now has *Functions that return a string* and links WinDevLib |
| UC-65 | *(site, re-run)* The goal of round 9, verbatim. | executed. The page now says the body is compiled for each type |
| UC-66 | *(site)* My twinBASIC project is in a Git repository. A colleague set it up so that the IDE exports the project into the repository every time it is saved, and the exported files are what we commit; the `.twinproj` file itself is not in the repository. I've just cloned the repository onto a new computer that has twinBASIC installed. Get me from the fresh clone to the project open in the IDE and building, with every save still updating the repository --- the exact steps and commands, in order. | **H** the tB executable cannot pack the IDE's export (999), and a `.twinproj` saved inside the export folder is deleted by the next save |
| UC-67 | *(site)* I want to pass a function as an argument to another procedure, the way a callback works in other languages. Write me a routine that sorts an array of names using a comparison function it is given, and use it to sort the same few names twice --- alphabetically, and by length --- printing the names each time. I want the finished code exactly as I'd have it in my project, and what it prints. | executed. None known; no case has read the Delegates page |
| UC-68 | *(site)* I need to write a text file in UTF-8 that holds names with accents and non-Latin letters --- Zoë, Łódź and 東京 --- and read it back later. Write me a routine that writes those three names to a UTF-8 file, one per line, then reads the file back line by line and prints each line and how many characters it has. I want the finished code exactly as I'd have it in my project, and what it prints. | executed. None known; no case has read File I/O |
| UC-69 | *(site)* Some of my Excel VBA code is slow, and I'd like to move it into a DLL built with twinBASIC and call it from VBA. Get me a working example: a twinBASIC DLL with one function that adds two numbers and one that takes a name and returns a greeting such as "Hello, Ann", and the VBA declarations and a macro that calls both and prints the results. I want both sides exactly as I'd have them, the steps to build the DLL, and what the macro prints. | built and called, with a twinBASIC caller standing in for VBA. None known; no case has read Project Types |

## Round 11 --- the re-runs round 10 named, and three surfaces no case has read

**Run 2026-09-24 at `4a67e09`** --- [builder/REVIEW-USECASES-4a67e09.md](../builder/REVIEW-USECASES-4a67e09.md).
Round 10's last commit, with its fixes in. One session, every case in parallel through
`eval/run_case.mjs`, on the model and Claude Code build of rounds 8--10: `claude-sonnet-5`
through the desktop app's bundled 2.1.280, passed with `--claude`.

**Re-run the five round 10 named**: UC-62 and UC-66 against *Keeping a project in Git from
the IDE*, UC-69 against *Calling a Standard DLL from VBA or Excel*, UC-67 against the callback
section, and UC-55 against the single export command; and UC-65 against the `Max` sample made
a whole file. Goals verbatim, each on the site protocol it was first run under. **Also re-run
round 10's own queries** for those cases against this round's index.

**Open three surfaces no case has read**, each executed: a command-line tool with an exit
code, built and run at a command prompt; two calculations on threads; and an IDE add-in, built,
loaded and clicked in a private copy of the install by the add-in test runner.

**UC-70 and UC-71 ran twice.** Their first evaluators chained `site-search` after a `cd`, were
refused, and concluded that the search box was not available, so neither ran Channel 1. The
protocol now says to run the command on its own, and the second runs are the ones scored.

### Persona D: a twinBASIC developer on the published site

| id | goal | hazard |
|----|------|--------|
| UC-55 | *(site, re-run)* The goal of round 7, verbatim. | **H** a second export without `--overwrite` leaves every changed file stale; step 2 now gives one command for every export |
| UC-62 | *(site, re-run)* The goal of round 9, verbatim. | **H** Export Project empties its folder; round 9's warning read as closing the IDE route, and *Keeping a project in Git from the IDE* was written for this |
| UC-65 | *(site, re-run)* The goal of round 9, verbatim. | executed. The `Max` sample is now a whole file |
| UC-66 | *(site, re-run)* The goal of round 10, verbatim. | **H** an export that holds the compiler packages rebuilds into a project with a dead copy of them; the section now says to delete them |
| UC-67 | *(site, re-run)* The goal of round 10, verbatim. | executed. *Passing a function as an argument or parameter (callbacks)* was written for this |
| UC-69 | *(site, re-run)* The goal of round 10, verbatim. | built and called, from a win32 and a win64 twinBASIC caller. **H** strings, bitness and the file's name; *Calling a Standard DLL from VBA or Excel* was written for this |
| UC-70 | *(site)* I want to write a small command-line tool in twinBASIC. Run as `linecount <file>`, it prints how many lines the file has. Run with no argument, or with a file that does not exist, it prints what went wrong and exits with exit code 1, so that a batch file can test `errorlevel`. Get me the finished code exactly as I'd have it in my project, the steps to build it into an .exe, and exactly what it prints for a file of three lines and for a file that does not exist. | built, and run at a command prompt in a console window, redirected and piped. None known; *Console Applications* is one paragraph |
| UC-71 | *(site)* I have two slow calculations that don't depend on each other, and I want twinBASIC to run them at the same time on two separate threads, wait until both have finished, and then print both results. As the two calculations, use counting the prime numbers below 200,000 and counting how many of the numbers from 1 to 5,000,000 are divisible by 7 or by 11. I want the finished code exactly as I'd have it in my project, and what it prints. | executed. None known; no case has read Multithreading |
| UC-72 | *(site)* I want to write my own add-in for the twinBASIC IDE: a button on the IDE's toolbar that, when clicked, inserts a comment line holding today's date, such as `' 2026-09-24`, at the cursor in the code editor I'm working in. Get me the finished add-in project exactly as I'd have it, the steps to build it and get the IDE to load it, and what happens when I click the button. | built, loaded and clicked in a private copy of the install. None known; no case has read the tbIDE package |
