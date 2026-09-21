# Use-case review, round 6 --- a discoverability fix, measured; and the 81% nobody had read, at `9b8e70c`

Branch `staging` · reviewed 2026-09-21 · 8 cases

The sixth round of [the harness in `eval/`](../eval/README.md). Round 5's three
discoverability-1 cases re-run unchanged, plus five new ones --- four of them on the
**site-entry protocol**, which starts navigation at the published welcome page and confines
the evaluator to `docs/`. `WIP.md` and all five prior reviews withheld as usual.

## Verdict

**Discoverability recovered to its best figure since round 1, and actionability fell to its
worst since round 2 --- because the two halves of this site fail in opposite directions.**

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 (8 cases) | 2.75 | 2.38 | 2.88 |
| round 4 (8 cases) | 3.00 | 2.50 | 3.00 |
| round 5 (8 cases) | 3.00 | 2.25 | 3.38 |
| **round 6 (8 cases)** | **3.13** | **2.75** | **3.00** |

Per case:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-40 a gate refused my regex *(re-run)* | 4 | **1** | 4 | pass |
| UC-44 `serve.bat` never shows my builder change *(re-run)* | 4 | 3 | 4 | pass |
| UC-45 a copy to read with no network *(re-run)* | 3 | 3 | 3 | pass |
| UC-52 cut a release carrying both artifacts | 2 | 2 | 3 | pass |
| UC-49 *(site)* replace an MSCOMCTL ListView | 4 | **4** | **2** | **fail** |
| UC-50 *(site)* port `Date =` and `CDec` from VBA | 2 | **4** | 3 | pass |
| UC-51 *(site)* read the docs offline | 3 | 3 | 3 | pass |
| UC-53 *(site)* a class that raises an event | 3 | 2 | **2** | pass |

### The two halves fail in opposite directions

Splitting the round by protocol is the finding:

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| repo cases (UC-40, 44, 45, 52) | 3.25 | **2.25** | **3.50** |
| site cases (UC-49, 50, 51, 53) | 3.00 | **3.25** | **2.50** |

**The developer documentation is hard to find and reliable once found. The reference is easy
to find and its examples do not work.** Rounds 1--5 measured only the first of those, on
**4.0%** of the search index; the reference is **80.9%** and this is the first round to open
it.

### The re-runs: two of three discoverability fixes worked

| | round 5 | round 6 | discoverability |
|---|---|---|---|
| UC-44 `serve.bat` | 3 / **1** / 4 | 4 / **3** / 4 | **1 → 3** |
| UC-45 offline copy | 3 / **1** / 4 | 3 / **3** / 3 | **1 → 3** |
| UC-40 regex gate | 3 / **1** / 4 | 4 / **1** / 4 | **1 → 1** |
| mean | 3.00 / 1.00 / 4.00 | 3.67 / 2.33 / 3.67 | |

**The two that worked got a new section with a title written in the reader's words.**
*Why `serve.bat` does not show a builder change* is now rank 1 for "serve.bat changes not
showing in browser"; *Reading offline, and the PDF book* is rank 1 for "offline" and one hop
from the welcome page. Both were previously unreachable prose inside a correct page.

**The one that did not got a rename and nothing else.** Round 5 dropped the `scripts/`
prefix from 21 tool headings so lunr could prefix-match a bare script name. That worked for
what it was: `check_regex_safety` now returns the Tools page at rank 1, where seven queries
found nothing before. It did not move the case, because **a developer holding a failure
message does not type a filename** --- UC-40's queries were "regex refused by gate",
"regular expression build failed", "catastrophic backtracking regex rejected", and all three
still MISS.

> **And the site's own subject matter outranks the gate.** `exponential backtracking`
> returns `/tB/Modules/Math/#exponentials-and-logarithms` at rank 1: the language
> reference's `Exp` page beats the gate that refuses exponentially backtracking regexes.
> Re-measured directly. On a corpus that is 80.9% programming-language reference, the
> developer docs lose every word the language also owns --- which the harness first recorded
> structurally in round 1 and has now watched decide a case.

**The lesson is about what kind of fix moves the number.** Making an existing page matchable
helps someone who already knows what to search for. Only a new section, titled in the
vocabulary of the problem rather than of the solution, reaches someone who does not.

> **My measurement of the same fix said it worked, and it was the weaker test.** Round 5's
> outcome section reported rank 1 for `check_regex_safety` --- true, and a query I chose
> knowing what I had changed. The evaluator chose queries from the symptom. **Never grade a
> discoverability fix with a query written after the fix.**

## Tier 1 --- the reference's worked examples do not run

**1. The flagship ListView example raises a documented run-time error, and it is the first
code a VB6 porter copies.** UC-49, hazard **fail** --- the only one this round.

`WinNativeCommonCtls/ListView/index.md:25` binds one image list:

    Set ListView1.SmallIcons = ImageList1

and `:35` passes an icon key in the **fourth** positional slot:

    Set item = ListView1.ListItems.Add(, "doc1", "Report.docx", "doc")

The fourth parameter is *Icon*, documented at `ListItems.md:71` as "a 1-based **Long** index
into **ListView.Icons**, or a **String** key. **Validated against the bound image list**" ---
and `Icons` was never bound. The correct call needs the fifth slot, `.Add(, "doc1",
"Report.docx", , "doc")`. Report view renders the *small* icon anyway (`ListView/index.md:55`),
so even without the error the icon would not appear.

**The same defective call is repeated at `ListItem.md:17`**, there with no image list bound
at all. Two pages, one wrong idiom, in the package that is the headline VB6-migration story.

**2. The `Event` statement's first sample does not compile.** UC-53. `Reference/Core/Event.md:41`
is a `Sub` with no name:

    Sub
     RaiseEvent LogonCompleted("AntoineJan")
    End Sub

`RaiseEvent.md:35` carries the same fragment correctly as `Sub Demo()`. Two lines further on,
`Event.md:94` is a bare line reading `VB` --- a conversion artifact from VBA-Docs, where code
blocks carried that label, rendered to readers as body text.

**3. Nothing tests any of this.** The protocol has warned since round 2 that "examples are
the part readers copy, and nothing tests them", and every gate this repository owns was green
over all three defects: they are inside fenced `tb` blocks, which `check_code_regions.mjs`
protects the *contents* of and never evaluates. The reference ships ~3,000 indexed sections
of code samples with no execution path at all --- and [`scripts/tbbuild.mjs`](../scripts/tbbuild.mjs)
exists, compiles a project unattended in 8--11 seconds, and is pointed at none of them.

## Tier 2 --- contradictions and convention breaches, each verified

**4. Three index pages link `Date` and `Time` through a `redirect_from` alias.** UC-50.
`Reference/Categories.md:356`, `Reference/Data-Types.md:83` and
`Reference/Procedures and Functions.md:64` all point at `../tB/Core/Date`, while the page's
canonical permalink is `/tB/Modules/DateTime/Date`. Six links. This is a named rule ---
*always link to the canonical location, not to a `redirect_from` alias* --- and the redirects
work, so nothing reports it and no reader is harmed today. It is the `/tB/` URL contract
fraying from the inside.

**5. Three pages disagree on what form code-behind looks like.** UC-53. `Event.md:59` and
`RaiseEvent.md:71` wrap handlers in `Class Form1 … End Class`; `VB/Form/index.md:14` writes
them bare under `' In Form1's code-behind:`, and `Tutorials/Forms.md:66` agrees with the bare
form. A newcomer pasting the reference samples gets a class nested inside a class.

**6. And they disagree on the form's construction hook.** `Event.md:72` uses `Form_Load`;
`RaiseEvent.md:74` uses `UserForm_Initialize`, which is a VBA *UserForm* name.
`VB/Form/index.md` documents the event as `object_Initialize()`. `UserForm_Initialize` is
wrong on all three of the other pages' terms.

**7. `Class.md`'s member list omits `Event`.** `Reference/Core/Class.md:39-45` enumerates
what may appear in a class --- constants, variables, procedures, UDTs, `Implements` --- while
`Event.md:34` says an event *must* be declared in a class module. The two pages describe
different languages.

**8. `Reference/Controls.md` is a dead end for the case it looks written for.** UC-49. The
welcome page sells it as "the standard UI controls … grouped by purpose"; the page mentions
`WinNativeCommonCtls`, `CustomControls` and `ListView` **zero times** and carries no onward
link. A porter hunting a ListView under *Controls* finds nothing.

## Tier 3 --- gaps at the point of need

**9. `WithEvents` has no page, no index entry and no category.** UC-53. It exists only as a
bullet inside `Dim`, `Private` and `Public`; it appears **zero times** in
`Reference/Statements.md` and `Reference/Categories.md`, whose *Events* section lists
`Event`, `RaiseEvent`, `RaiseEventByName`, `RaiseEventByName2` --- every part of the mechanism
except the one the receiving side needs. Searching the keyword returns tbIDE and
CustomControls internals. Its definition, where it exists, is stale VBA: "respond to events
triggered by an **ActiveX object**", for events on a plain twinBASIC class.

**10. No numeric type-promotion rules anywhere, and that is the question UC-50 was set.**
`Reference/Operators.md` has ten sections and **zero** mentions of promotion, result types or
widening. Whether `Decimal * Integer` stays `Decimal` decides whether the port is worth
making, and the evaluator correctly declined to answer it. Relatedly, `Decimal`'s own
paragraph (`Data-Types.md:72`) claims *precision* while `Currency` (`:66`) gets the
*exactness* language and the explicit "use it for monetary values" --- so a reader porting
`CDec` money code is quietly steered elsewhere with no comparison offered.

**11. `Debug.Print` has no reference page.** Zero entries in `Procedures and Functions.md`,
nothing under `Core/`, while it appears in worked examples across at least eight Features
pages and in the code UC-50 was given to port.

**12. Date literals are undocumented.** `Features/Language/Literals.md` covers `&B`, `&O`,
`&H` and digit grouping. Whether `#1/1/2026#` is month-first or day-first is stated nowhere.

**13. The release path has no page and no asset names.** UC-52. `Documentation/index.md`
lists nine sub-pages and none covers releasing; the procedure is step 8 of a section titled
*Deploying to docs.twinbasic.com*, and the query `cut a release` returns 2,478 hits of
language reference. Neither `Building.md:490` nor `:556` names either artifact --- only
`docs/index.md`, a *reader* page, does. The workflow's `release_tag` input appears **zero
times** under `docs/`, and `make_latest: 'true'` is what makes the site's own
`releases/latest/download/` buttons resolve, which nothing records.

**14. The staleness caveat I wrote one commit earlier is a dead end.** UC-51.
`docs/index.md:94` tells a reader the release may lag and that "this site is always current",
then offers no remedy and no link to `Building.md`, where the build-it-yourself escape hatch
lives. The same section undersells the book: "a single printable book" is ~2,000 A4 pages
(`PDF-Generation.md:20`, `:426`), which is the wrong answer for the e-reader the goal asked
about, and neither fact is on a page a reader sees.

## Corrections --- three evaluator claims amended

**The PDF download link is not broken.** UC-45 and UC-52 both flagged `_config.yml:45`'s
`twinBASIC.Book.pdf` (dotted) against the workflow's `twinBASIC Book.pdf` (spaced), and both
were right to. Measured: the dotted URL returns **HTTP 200** --- GitHub normalises spaces to
dots in release asset URLs. The link works. **What is missing is the one comment saying so**,
without which a future maintainer "fixes" it and breaks both download buttons.

**UC-40's exit-code contradiction is real but smaller than stated.** `Extending.md:546`
reserves exit 2 for "the harness or the environment failed … Nothing was checked", while
`Tools.md:368` has `check_regex_safety.mjs` exit 1 "on a probe that came back wrong" --- a
failed self-probe is the harness failing, so by the stated convention it is a 2. Verified on
both pages. It is a one-line inconsistency in a convention the same page set introduced, not
a defect in the gate.

**UC-49's "no tutorial" is accurate but not new.** `Tutorials/` has Arrays, Forms,
Hello-World, Testing-with-Assert, Windows-API, CustomControls, CEF and WebView2. There is no
tutorial for WinNativeCommonCtls and none for classes or events. Recorded as coverage, not as
a defect of any page.

## What round 6 confirms about the method

**The site-entry protocol earns its place and should stay.** Four cases, starting at the
welcome page and confined to `docs/`, produced eight findings in a half of the corpus that
five rounds and sixty-odd cases had never opened --- including the only hazard failure of the
round and the only non-compiling sample the harness has ever found. It is not a variant to
run occasionally; it is the half of the site the readers are actually on.

**Re-running is five-for-five, and this is the first round where it reported a fix *not*
working.** That is more valuable than the three that did: UC-40 would otherwise be recorded
as closed on the strength of my own after-the-fact query.

**Evaluator overstatement is down to three of twenty-eight**, all amended above, all in the
usual direction. The discipline that produces that is in the protocol and is holding.

**A fix pass one commit old is not exempt from the next round.** Finding 14 is prose I wrote
during round 5's fix pass, caught by round 6 six hours later, and finding 3's absence of an
example-execution path is the same class as round 5's finding 15: the repository keeps
writing things nothing checks.

## Method

Corpus built at `9b8e70c` from a current build (908 pages, 0 broken links in both real
trees): 982 readable prose files, 255 sources stubbed unreadable, `WIP.md` + the twelve
`WIP.*.md` + all five prior `REVIEW-USECASES-*.md` withheld.

**Two protocols.** Four cases used the standard one. Four used the **site-entry variant**:
Channel 2 starts at `docs/index.md` rather than the repository `README.md`, and the evaluator
may open only files under `docs/`, which is what the site publishes. A site-protocol run is
not comparable with a repo-protocol run of the same goal.

Index composition, re-measured: **80.9% twinBASIC reference, 6.5% Features, 4.3% Tutorials,
4.0% developer documentation.** Rounds 1--5 tested the last of those exclusively.

One evaluator returned only a preamble on its first attempt and was resumed; its second run
is the one recorded. Every search rank quoted was re-measured by the orchestrator against
`eval/site_search.mjs`, and every finding was verified against the source before recording.

## What to do next

**1. Fix the three broken samples first (findings 1, 2).** They are the only findings in six
rounds where following the documentation exactly produces a run-time error. Two edits to the
ListView call, a name on a `Sub`, and a stray `VB` line.

**2. Then decide whether samples get a gate (finding 3).** `scripts/tbbuild.mjs` compiles a
project unattended in 8--11 seconds and nothing points it at the corpus. Extracting every
`tb` fence and compiling it is a large piece of work with a real false-positive problem ---
most samples are fragments, not compilable units --- so the honest first step is a census:
how many fences are whole procedures, how many are whole modules, how many are neither. **Do
not start by writing the gate.**

**3. The reference's cross-page consistency (findings 5, 6, 7, 9).** Form code-behind, the
construction hook, `Class.md`'s member list and `WithEvents`'s absence are one cluster: the
event mechanism is documented in five places that disagree. Give `WithEvents` a page, then
make the other four point at it.

**4. The cheap ones.** Canonical links for `Date`/`Time` (4); a `Controls.md` that names the
two control packages (8); a comment on `_config.yml:45` (corrections); a remedy sentence and
the book's real shape on `docs/index.md` (14); `Debug.Print` a page (11).

**5. Round 7 candidates.** Re-run **UC-40**, whose fix demonstrably did not work and whose
remedy is now known to be about vocabulary rather than matching --- and **UC-49** and
**UC-53** once their samples are fixed, since a corrected example is exactly the kind of
change this harness can measure. The unread surface remaining is the Features section
(6.5%) and the Tutorials (4.3%), and one case worth writing deliberately: a reader who
follows a tutorial end to end and runs what it produces.

## Outcome

**Twelve of the fourteen findings are closed.** `build.bat`, `check.bat` and `test.bat` are
green; the site is 909 pages, one more than at review time.

### The samples

Both ListView calls now pass the icon key in the fifth slot with a comment saying why the
fourth is wrong, and `ListItem.md`'s copy --- which had no image list bound at all --- drops
the argument entirely. `Event.md`'s sample is `Sub Demo()`, matching the correct twin at
`RaiseEvent.md:35` that it had diverged from.

**The stray `VB` label turned out to be a one-off, and a sweep is what says so.** A scan
for bare `VB` / `VBA` / `VB.NET` lines outside fences across all 956 markdown files returns
**zero** now and returned one before. Worth doing rather than assuming, since it is exactly
the shape that arrives in bulk from a converter.

### The event cluster

`WithEvents` has a page. It was the one part of the mechanism with no page, no index entry
and no category, while being the half the receiving side needs; searching the keyword
returned tbIDE and CustomControls internals at ranks 1 and 2, and now returns
`/tB/Core/WithEvents` at rank 1. It is in `Statements.md` and in `Categories.md`'s *Events*
section, which also gained `Handles`.

`RaiseEvent.md`'s `UserForm_Initialize` is `Form_Load`, `Class.md`'s member list includes
`Event`, and the stale "events triggered by an **ActiveX object**" wording on `Dim`,
`Private` and `Public` now describes a twinBASIC class and links the new page.

### Finding 5 was wrong, and so was my fix for it

UC-53 reported that `Event.md` and `RaiseEvent.md` wrap form code-behind in
`Class Form1 … End Class` while `VB/Form/index.md` and `Tutorials/Forms.md` write handlers
bare, and concluded a newcomer pasting the reference samples "gets a nested class". I
verified that the two pages disagree --- they do --- and then unified them on the bare
form. **That was backwards, and a reviewer caught it.**

Settled against the primary source rather than against the pages. The compiler's `export`
verb unpacks a shipped `.twinproj`, and every form code-behind in the samples looks like
this:

```
[Description("")]
[FormDesignerId("EAEAEAEA-EAEA-EAEA-EAEA-EAEAEAEAEA02")]
[PredeclaredId]
Class ChildBlue
    Private Sub Cascade_Click()
...
End Class
```

**Four of four real form files are a `Class`, all four carry `[FormDesignerId]`.** The
wrapper the two reference pages used is what a form file actually is; the bare handlers on
`VB/Form/index.md` are an *excerpt* convention. My change had made two correct pages wrong.

Reverted. What survives is the half the same sources confirm: **`UserForm_Initialize`
appears in zero real twinBASIC sources and `Form_Load` is what they use**, so that rename
stands. And the genuine inconsistency is now resolved the right way round ---
`VB/Form/index.md` states what the file contains, shows the designer attributes, and says
its snippets are excerpts from inside the class.

### The cheap ones

Six `Date` / `Time` links across three index pages point at the canonical
`/tB/Modules/DateTime/…` instead of the `redirect_from` alias. `Controls.md` --- the page
the welcome page sells as "the standard UI controls" and which mentioned neither
`WinNativeCommonCtls` nor `ListView` --- has a *Controls in other packages* section naming
both control packages and the two browser hosts. `docs/index.md` says the book is A4 and
~2,000 pages, and its staleness caveat now links the build-it-yourself remedy. `Building.md`
has a *Cutting a release* section with both asset names, the `release_tag` input and the
`make_latest` coupling that makes the site's download buttons resolve.

`_config.yml` carries five lines explaining that `twinBASIC.Book.pdf` is dotted on purpose.
That is the whole fix for the finding two evaluators raised: the link works, and what was
missing was the sentence stopping someone correcting it.

### I nearly shipped a wrong fix, and only checking the code caught it

UC-40 found that `Tools.md:368` gives `check_regex_safety.mjs` exit 1 "on a probe that came
back wrong", while `Extending.md:546` reserves 2 for the harness failing. I rewrote the
line to say it exits 2 --- and then read the script. **It returns 0 or 1 and nothing else.**
The original sentence was accurate about the code; my correction would have made the
documentation wrong in the name of consistency, on a page whose job is to describe what the
tools do.

Reverted. The line now states what the gate does, notes that two of its three exit-1 cases
are harness failures the convention would put at 2, and says the gate predates the
convention. **The honest fix is in the code, not the prose**, and it is left as such rather
than papered over: both are non-zero, so no wrapper behaves differently today.

That is the second time in two rounds that a fix pass has been caught by reading the source
instead of the brief --- round 5's tokeniser recommendation, and this. The protocol's *tell
agents to verify rather than comply* applies to the orchestrator writing edits by hand.

**And the third time it was not caught in time**: the `Class Form1` unwrapping above
shipped and had to be reverted after review. The pattern in all three is identical --- a
finding that two documents disagree is *evidence*, and picking the winner by reading the
documents is guessing. Each was settled in minutes once somebody looked at the artefact:
the script's `return`, the census, the exported `.twin`. **For a disagreement about what
the product does, no amount of reading the documentation is a substitute for one look at
the product** --- and this repository ships the tools for that look (`export` for sources,
`tbbuild.mjs` for the compiler) which no fix pass had used until now.

### The census (queue item 2)

Recorded in `WIP.md`. **1,100 `tb` fences across 600 files**:

| shape | count | compilable |
|---|---:|---|
| whole `Class` / `Module` | 36 | as-is |
| whole procedure | 357 | wrapped in a module |
| declarations only | 457 | wrapped in a module |
| neither --- a fragment | 250 | not without judgement |

**3% compile as they stand and 23% cannot be made to.** That settles the design question
the review left open: a gate demanding every fence compile needs 250 opt-outs on day one,
and a 250-entry opt-out list is not maintained. The tractable direction is to mark the
fences that claim to be complete and compile only those --- which makes the marker the
design problem, not the harness. **Not started, deliberately.**

### Two findings left open, both for the same reason

**Finding 11 is now closed, and the way it closed is the point.** A maintainer supplied the
member list --- `Cls`, `Print`, `Assert`, `TracePrint` --- and the rest was verified rather
than assumed. A sweep of every `.md` in the repository found `Debug.Print` 1,863 times,
`Debug.Assert` 179 and `Debug.TracePrint` 63, `Debug.Cls` never, and `Debug.WriteLine` 22
times --- all of which turned out to be C# and VB.NET pasted into Discord, so it is
correctly absent from the page. It also found `docs/IDE/Debug Console.md`, an existing page
describing the pane and its *Clear Debug Console* button, which is what `Debug.Cls` does
from code; the two now link each other.

**Every syntax claim on the page was compiled before it was written**, using
`scripts/tbbuild.mjs` against a probe built from a shipped sample: the bare `Debug.Print`,
the comma and trailing-semicolon forms, `Debug.TracePrint` taking the same output list, and
`Debug.Assert` on both a comparison and a Boolean. Then a negative control --- renaming one
call to `Debug.NoSuchMember` --- to prove the probe file was actually being compiled rather
than silently excluded, which is the failure this repository keeps finding in its own
gates. It failed at the expected line. **The page's four examples were then compiled as
written; this is the first reference page here whose samples have been executed.**

One measurement changed the page's shape. With `##` headings reading `Print` and `Assert`,
a search for `Debug.Print` returned the page at **rank 7** --- behind `Math/Round#example`
and `Strings/StrReverse#example`, pages that merely *use* it. Headings carry a 200x title
boost, and `Debug.Print` is what a reader types, so the headings now read `Debug.Print`
with the short anchors pinned. All four members went to **rank 1**. That is round 6's own
lesson applied at authoring time instead of a round later.

**Finding 12 (date literals) is still open**, and needs a primary source this repository
does not contain. `Debug` appears in worked
examples on eight-plus Features pages and nowhere is its member list stated; whether
`#1/1/2026#` is month-first is stated nowhere either. Writing either page means either
exporting the package `.twin` sources or compiling a probe --- both documented, both real
work --- and the alternative is inventing semantics into a language reference, which is the
one thing the authoring rules forbid outright.

**Finding 10 (no numeric type-promotion rules) is the same, and larger.** It is the question
UC-50 was actually set --- whether `Decimal * Integer` stays `Decimal` --- and answering it
properly means documenting promotion across the operator set, not one probe's answer. An
IDE install is present, so `scripts/tbbuild.mjs` can settle it; that is a session's work
with a compiler, not a line of prose.
