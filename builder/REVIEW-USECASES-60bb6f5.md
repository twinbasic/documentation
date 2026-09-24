# Use-case review, round 7 --- the first executed case, three symptom sections, and a gate that argued with its own documentation, at `60bb6f5`

Branch `staging` · reviewed 2026-09-23 · 8 cases

The seventh round of [the harness in `eval/`](../eval/README.md). Round 6's three named
re-runs (UC-40, UC-49, UC-53), plus five new cases: two on the site-entry protocol (UC-54,
UC-55) and three on the repository protocol (UC-56, UC-57, UC-58). `WIP.md`, the other
`WIP.*.md` files and all six prior reviews withheld as usual. The corpus was built from
`60bb6f5` plus two edits made for the round and named in [eval/usecases.md](../eval/usecases.md#round-7--the-re-runs-round-6-asked-for-and-the-surface-opened-since):
the UC-40 section, and one stale clause in `Tools.md`.

## Verdict

**No hazard was walked into, for the second round in three; every re-run improved; and
the one case that was executed rather than read found what seven read-only cases could
not --- a tutorial describing a failure the product does not produce.**

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 (8 cases) | 2.75 | 2.38 | 2.88 |
| round 4 (8 cases) | 3.00 | 2.50 | 3.00 |
| round 5 (8 cases) | 3.00 | 2.25 | 3.38 |
| round 6 (8 cases) | 3.13 | 2.75 | 3.00 |
| **round 7 (8 cases)** | **3.25** | **2.75** | **3.63** |

Per case:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-40 a gate refused my regex *(re-run)* | 4 | **4** | 4 | pass |
| UC-49 *(site, re-run)* replace an MSCOMCTL ListView | 4 | 3 | **4** | **pass** |
| UC-53 *(site, re-run)* a class that raises an event | 4 | 2 | **4** | pass |
| UC-54 *(site)* unit tests, from nothing to a run --- **executed** | 3 | 3 | 4 | n/a |
| UC-55 *(site)* a project in Git, and a rebuild script | 3 | 2 | 4 | pass |
| UC-56 `check_code_regions` failed after a rewrite change | 3 | 3 | 3 | pass |
| UC-57 the build stops with `Nav-parent orphan detected` | 3 | 2 | 3 | pass |
| UC-58 prove a new code example compiles | 2 | 3 | 3 | pass |

Split by protocol, against round 6:

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| repo cases, round 6 (UC-40, 44, 45, 52) | 3.25 | 2.25 | 3.50 |
| repo cases, round 7 (UC-40, 56, 57, 58) | 3.00 | **3.00** | 3.25 |
| site cases, round 6 (UC-49, 50, 51, 53) | 3.00 | 3.25 | 2.50 |
| site cases, round 7 (UC-49, 53, 54, 55) | 3.50 | 2.50 | **4.00** |

**Round 6 found the reference easy to find and its examples broken. Round 7's site cases
score 4.00 on actionability, every one of them**: the samples round 6 found broken were
fixed, and since then 1,116 of the site's 1,168 `tb` fences have been marked for
`examples.bat` to compile. Site discoverability fell because this round sent two cases into
territory with no door --- a Features page for Git, and events on a user-defined class.

### The re-runs: all three moved, and the discoverability fix worked this time

| | round 5 | round 6 | round 7 |
|---|---|---|---|
| UC-40 regex gate | 3 / **1** / 4 | 4 / **1** / 4 | 4 / **4** / 4 |
| UC-49 ListView *(site)* | --- | 4 / 4 / **2**, hazard **fail** | 4 / 3 / **4**, pass |
| UC-53 events *(site)* | --- | 3 / 2 / **2** | 4 / 2 / **4** |

**UC-40 went from 1 to 4 on the fix round 6 prescribed.** Round 6 found that renaming a
heading helps only a reader who already knows the script's name, and that "only a new
section, titled in the vocabulary of the problem rather than of the solution, reaches
someone who does not". `Extending.md` now has *When `test.bat` says a regex can backtrack
exponentially*, which quotes the first line of the gate's own failure. Measured with round
6's own queries --- written before the fix, by a different evaluator:

| round 6's query | round 6 | round 7 |
|---|---|---|
| `regex refused by gate` | MISS | **1** |
| `catastrophic backtracking regex rejected` | MISS | **1** |
| `regular expression build failed` | MISS | MISS |
| `exponential backtracking` | `Math#exponentials-and-logarithms` at 1 | **the gate at 1**, `Exp` at 2 |

The miss that remains is a synonym: the section says *regex*, and lunr does not know that
is a *regular expression*. The last row is the one round 6 quoted as its headline --- the
language reference's `Exp` page beating the gate that refuses exponential regexes. It no
longer does.

**UC-49's hazard failure is gone**, and so is its actionability 2: the flagship sample now
passes the icon key in the fifth slot, compiles under `examples.bat`, and the evaluator
quoted the page's own comment explaining why. It lost a discoverability point to a page
round 6 never opened (finding 6).

**UC-53 gained two on actionability and nothing on discoverability** --- the same shape as
round 5's re-runs. The `WithEvents` page round 6 wrote is what the evaluator built from;
nothing reaches it from the words a newcomer types (finding 13).

## The first executed case

UC-54 asked for a unit-test project "from nothing to a test run", and the evaluator
assembled it from `Tutorials/Testing-with-Assert.md` and predicted what the run prints.
The orchestrator then built exactly that project --- the evaluator's two modules verbatim,
in the `packages` template, with a `[RunAfterBuild]` Sub standing in for the CodeLens
**▶ Run** click --- and ran it with `scripts/tbrun.mjs`.

**The passing run printed exactly what the evaluator predicted**, one line: `All PadLeft
tests passed.` The tutorial works as a reader follows it.

**The failing run did not do what the pages say it does.** One expected value was
changed so one test fails. The run stopped at the failing line --- the next `Debug.Print`
never appeared --- and the Debug Console received nothing at all. The IDE was left
running on its private desktop and its screen read over DevTools:

    Run-time error -353703420 (EAEAEA04)
       DESCRIPTION:
    Assertion FAILED
    Try Again (Resume)
    Ignore (Resume Next)

A second run gave the assertion distinctive expected and actual values and a message
(`MESSAGE-TEXT-7731`). Each marker occurs exactly once in the IDE's entire DOM, hidden
nodes and attributes included --- in the editor, on the source line itself. **The expected
value, the actual value and the message are displayed nowhere.** The tutorial said, twice,
that the Debug Console shows "which assertion failed, its expected and actual values, and
the source location", and the package page said a test runner --- "the twinBASIC IDE's
Test Explorer" --- collects the results.

**There is no Test Explorer.** The string occurs nowhere in the IDE's UI files or its
binaries, in UTF-8 or UTF-16, while the strings actually on screen (`Try Again`,
`Resume Next`, `DEBUG CONSOLE`) are found in the same files, and `Assertion FAILED` is in
six of the runtime's DLLs. The package's own source settles the mechanism: every
assertion is a `DeclareWide` into a compiler-provided library, `[PreserveSig(False)]`, so
a failure is an HRESULT raised as an ordinary run-time error.

**Two things the run confirmed rather than refuted.** A failing assertion is *not*
swallowed by `On Error Resume Next` --- the error-path pattern the tutorial teaches works,
though the orchestrator had suspected it would not, and measured it before writing either
way. And the tutorial's module semantics hold: `Assert.Permissive.AreEqual "HELLO",
LCase$("HELLO")` passes and `Assert.Strict` fails.

**Reading could not have found this.** The evaluator read the claim, had no reason to doubt
it, and predicted output only for the passing case --- correctly. Every gate the
repository owns was green over it: the samples compile, which is all `examples.bat` asks.
The protocol has said since round 2 that "examples are the part readers copy, and nothing
tests them". `check_run` is designed in `Authoring.md` and not implemented; this case is
what it would have caught.

## Tier 1 --- the documentation says something the product does not do

**1. Assert failure reporting, on five pages.** `Testing-with-Assert.md:35`, `:103` and
`:121`; `TwinBasicAssertions/index.md:12`; and the *Message* parameter of **Fail** on each
of `Exact.md`, `Strict.md` and `Permissive.md` ("recorded together with the source location
of the call"). Measured on BETA 983 as above. *Fixed*: each now says what happens --- the
run stops on the line with **Assertion FAILED**, nothing reaches the Debug Console, and
neither the values nor the message is shown --- and the tutorial shows the one line a
passing run prints.

**2. The Test Explorer does not exist.** `TwinBasicAssertions/index.md:12`. *Fixed* with
the same edit.

**3. `Event.md` is derived from VBA-Docs and carried no attribution.** UC-53 noticed that
`Event.md` and `RaiseEvent.md` share an example and only one carries `vba_attribution`.
Checked against `VBA-Docs/.../event-statement.md`: the summary line, the
`LogonCompleted("AntoineJan")` sample and the *event source ... sinks* paragraph are
verbatim. CC-BY-4.0 requires the attribution. The May review had classified `Event`
among "twinBASIC-original keywords" where omission was correct.

**A sentence-level scan says it is the only one.** Every page without `vba_attribution:
true` was checked for 60-character sentences occurring verbatim in VBA-Docs: `Event.md`,
with ten, is the single hit across the reference, and there are none in Features,
Tutorials, IDE or Documentation. (The scan's first run reported 180 --- every page is CRLF
and its frontmatter pattern assumed LF, so it saw no attribution anywhere. Worth
recording, because the number looked like a finding.) *Fixed.*

**4. The tutorial said the Assert modules are "in scope without any `Imports`
statement".** `Testing-with-Assert.md:39`. `Exact.AreEqual` alone is a compile error
(TB5079); every call needs both qualifiers. This is the sentence shape `WIP.ExamplesBuild.md`
identified as the root of 66 non-compiling calls --- "when a sample is wrong across a whole
package, check whether a sentence taught it" --- surviving on the one page that was not the
package index. *Fixed.*

## Tier 2 --- stale pages and contradictions

**5. The welcome page lists four tutorials of eight, and not the four written for a
newcomer.** `docs/index.md:66-69` against `Tutorials/index.md:13-26`: Hello World, Forms,
Windows API and Testing with Assert were added after the welcome page's list was written.
This is the "correct on one page, stale on another" case round 3 queued and this round
could not find a live instance of --- found by an evaluator reading both. *Fixed*: the
four come first, and the list points at the Tutorials index.

**6. `Features/GUI-Components/Modernization.md` never names WinNativeCommonCtls.** It lists
ListView among the available Common Controls, then sends the reader to Krool's VBCCR or
the 32-bit `MSCOMCTL.OCX` for "unimplemented controls". The built-in package that replaces
the OCX appears on no Features page but the Import/Export one. UC-49 reached it at rank 3
for `MSCOMCTL`. *Fixed.*

**7. `Authoring.md` gave two rules for a fence that is not a program.** `:460` said "mark a
sample that is complete, and leave the rest alone"; `:493` said to mark those
`inert=<reason>` "rather than leaving them unmarked". The census says which one the tree
follows: 1,168 fences, 1,116 `check_build`, 52 `inert`, **none unmarked**. The same
paragraph put non-programs at "roughly a third of the corpus"; they are 4.5%. *Fixed.*

**8. `Extending.md:728`'s one-line fix for `check_code_regions` does not cover indented
code blocks.** The mask deliberately does not protect one (`Building.md:381-384`), so moving
the rewrite behind the mask cannot help there, and nothing linked the two. *Fixed* in
finding 11's section.

## Tier 3 --- the answer exists and the reader cannot reach it

**9. The nav-integrity failure had no recovery section a contributor would open.**
UC-57: `Building.md` and `Tools.md` mention nav integrity zero times; the fix sat under
*Removing a page*; the literal error text, `nav-parent orphan detected`, missed on search;
and *Renaming a heading without breaking its links* ranked first for `renamed page breaks
navigation` while answering a different question. `Builder.md:13` tells contributors they
should not need that page --- and it was one of the three that described the check.
*Fixed*: `Authoring.md` has *When the build stops with `Nav-parent orphan detected`*,
covering all four messages `nav.mjs` can print, including the one a reader will not
expect --- a stale `grand_parent:` fails only on the day a second page takes the parent's
title. `Building.md` points at it.

**10. `check_code_regions` had no "when this fails" passage.** Round 2 listed it; no round
sampled it until now. UC-56 found the fix at 2 hops but missed on `check_code_regions
failing`, and the fix was one sentence with no code. *Fixed*: a section beside the regex
one, with the shape of the change taken from `applyPreRenderRewrites`.

**11. Keeping a project in Git was described in three separate warnings.** UC-55: the use
case is named on the Import/Export page's second line, but the section it sits in is
introduced entirely in terms of distributing packages, and `git version control`,
`export project to text files` and `rebuild project file from source` all missed. The
facts --- export into a folder of its own, `export` never deletes, `.git` is packed by the
tB executable, LF is converted --- were all present and scattered. *Fixed*: a *Keeping a
project in Git* section assembles them in order, and the section index names the use.

**12. `WithEvents.md` shows a form as `Class Form1 ... End Class` without saying why.**
UC-53's evaluator quoted the example and silently dropped the wrapper. Checked against the
IDE's *Standard EXE* template, which creates `Form1.twin` as a `Class` with its designer
attributes. *Fixed*: one sentence, pointing at `Form`.

**13. "event handler" reaches the Forms tutorial and stops.** Rank 1 for the phrase is
*Step 3: Write the event handler*, which is about a control's Click event and did not
mention that classes raise events too. *Fixed* with a pointer; the reference pages
themselves are still reached only by the keyword.

**14. Nothing says how to show a reviewer that a sample compiles.** UC-58: `examples.bat`
is outside CI on purpose, and every page says so consistently, but the contributor
workflow never says what to put in a pull request instead. **A maintainer's convention to
set, not a sentence to write --- and set during the round: paste the `examples.bat`
summary line into the pull request description.** *Fixed*: `Authoring.md` states it with a
real run's line, and step 5 of `Building.md`'s pull-request walkthrough points there.

## Found by the orchestrator

Four defects in the tooling surfaced while verifying, none of which an evaluator could
see, because the corpus stubs every source file.

**15. `check_regex_safety.mjs` printed advice its own documentation calls wrong.** On a
finding it said "Narrow one of them so the partition is unique" --- the move that left
`VOID_TAGS_RE`'s first fix exponential, which `Tools.md` records and the new UC-40
section warns against. A developer holding the failure reads the gate's text before any
page. *Fixed*: the text now agrees with the documentation and names the section.

**16. It cut the witness to 70 characters, and a shortened witness can pass.** Both
documentation pages tell a developer to keep the witness and run `re.test(witness)`,
because it is the only thing that proves a rewrite. Two of the three exponential regexes
this repository shipped have witnesses of 148 and 492 characters. Measured on the
492-character one: **the printed 73-character form returns in under a millisecond; the
full witness was still running at 30 seconds.** The documented proof step would have passed
an unfixed regex. *Fixed*: printed whole, with its length.

**17. Its exit codes did not follow the convention.** Round 6 recorded this and left it
open. A parse failure, an unanalysable regex, a wrong probe and a crash now exit 2; an
exponential finding exits 1; a 2 wins. Every path exercised on an isolated copy of the
gate with fixture files, since a deliberately exponential regex in the real tree would
fail `test.bat` for anyone else running it.

**18. The file contained a raw NUL byte**, typed straight into a template literal as a key
separator in `4f9c9e90`. Git treated the file as binary, so its diff showed nothing, and
`grep` refused to search it. The maintainer caught this during the round; the escape
`\u0000` is the same character at run time. It was the only tracked text file with one.

**19. The corpus has carried `CLAUDE.md` since round 1.** It is gitignored, one line ---
`@WIP.md` --- and points at the file the corpus withholds. The UC-40 evaluator opened it
first and reported the dead end. `build_corpus.mjs` now excludes it.

## Corrections --- evaluator claims amended

**UC-55's "contradiction" is not one.** The evaluator read *the officially supported way*
against the `.git` warning and concluded only the script is safe for Git. The page's own
remedy --- do not use the repository's top folder --- works with either program.

**UC-53's "duplicated, drifted example" is inherited.** VBA-Docs carries the same timer
example on both source pages; the finding that mattered was the attribution, and it held.

**UC-40's "one shape every time is an absolute claim from two examples"** describes the
general mechanism --- ambiguity --- of which `(a+)+` is the textbook instance. No change.

**And one of the orchestrator's own.** Reading the Assert pages, the orchestrator suspected
that an assertion inside `On Error Resume Next` would be swallowed, silently passing the
tutorial's error-path test. Measured: it is not. Nothing was written on the suspicion.

## What round 7 says about the method

**Executing a case is a different instrument, not a better reading.** Seven evaluators
read, and each reported gaps; none could report that a sentence was false about the
product, because nothing in the corpus contradicts it. Running what the eighth assembled
found it in two runs. The protocol should keep one executed case a round wherever a
tutorial's product can be run headlessly --- which excludes anything that opens a
message box (`MsgBox` hangs a run-mode probe on the private desktop) and anything that
needs a user at a form.

**A symptom-titled section works, and now has a measured before and after.** UC-40 moved
1 → 4 on round 6's own queries. Three more such sections were written in this round's fix
pass, for UC-55, UC-56 and UC-57 --- which makes those three the round 8 re-runs.

**The evaluators ran on Sonnet**, recorded for the first time; earlier rounds did not record
the model. The re-run deltas therefore mix a fix's effect with a model change. The search
ranks do not: every one quoted here was re-measured by the orchestrator against
`eval/site_search.mjs`, 32 of 32 matching what the evaluators reported. Eight evaluators
used about 1.15 M tokens between them, four to six minutes each.

**Three evaluator claims needed amendment**, all in the usual direction, and one of the
orchestrator's own was measured before it reached a page.

## Method

Corpus built at `60bb6f5` from a current build (912 pages, 0 broken links in both real
trees): 987 readable prose files, 275 sources stubbed unreadable, `WIP.md` and eighteen
`WIP.*.md` plus six prior reviews withheld. The search index was snapshotted with the
corpus and every evaluator queried the snapshot through `--site`, so rebuilds made during
the round by the concurrent fix work could not move a rank mid-evaluation.

Evaluator instructions were the evaluator-facing half of [protocol.md](../eval/protocol.md)
only. The history paragraph of the site-entry variant names round 6's broken ListView and
`Event` samples, which would have told the UC-49 and UC-53 re-runs what they were
measuring. One line was added: opening a search result means finding the file whose
`permalink:` matches, and that grep does not count as full-text search.

The executed runs used `scripts/tbrun.mjs` on port 9700, on BETA 983, with the evaluator's
code verbatim; the failure and message probes changed one expected value each.

## Findings 10 and 12 of round 6

Both closed during this round, by an agent measuring with `tbrun` in parallel with the
evaluators --- about 150 probe projects on BETA 983, an hour of wall time. Its page edits
began after the corpus was snapshotted, so no round-7 case saw them, which is why UC-50 was
not re-run.

**Finding 10.** `Reference/Operators.md` has *Result Types and Promotion*: `+`, `-` and `*`
rank Byte < Integer < Long < LongLong < Single < Double < Currency < Decimal, with the
exceptions stated (a **Single** meeting a **Long** gives a **Double**; under `*`, **Single**
and **Double** outrank **Currency**; **Date** has its own rules); `/`, `\`, `Mod`, `^` and
`&` each have a row; **Variant** operands widen on overflow instead of raising error 6.
**`Decimal * Integer` stays `Decimal`** --- the question UC-50 was set. `Data-Types.md` now
compares **Decimal** and **Currency** for money: **Currency** rounds to four places, half to
even, so `CCur(0.03125)` is 0.0312.

**Claims already on the operator pages were wrong**, each measured: a number plus a
**String** raises *Type mismatch* (it converts and adds); a **String** plus a **Variant**
joins them (it adds when the **Variant** holds a number); the precision order omitted
**Decimal**, and its **Single** exceptions omitted **LongLong**; `/`'s **Single** rule was
incomplete; `\` and `Mod` never mentioned
**Decimal**; `&` returns a **Variant** of type **String** (a **String**, unless an operand is
a **Variant**); a floating-point shift operand is truncated (it does not compile);
`-1 >> 1` is `&H7FFFFFFF` (it is -1); and `1 << 33`'s explanation named the wrong cause.

**Finding 12.** `Data-Types.md` has a canonical *Date literals* section, with the Glossary
and `Features/Language/Literals.md` pointing at it. `#1/2/2026#` is January 2;
`#13/1/2026#` is silently January 13; two-digit years follow the machine's Windows window;
an impossible date is compile error TB5085; the value is fixed at compile time.

**A literal is month-first whatever the regional format** --- the one question the agent
could not settle. On this en-US machine every literal read exactly as `CDate` read the same
text, which fits both a fixed order and one taken from the regional format. The maintainer
switched Windows to English (United Kingdom), whose short date is `dd/MM/yyyy`, and the
agent's probe was compiled again, its first line confirming the switch
(`DateSerial(2026, 1, 2)` formatted as `02/01/2026`):

| text | as a literal | through `CDate` |
|---|---|---|
| `1/2/2026` | 2026-01-02 | **2026-02-01** |
| `13/1/2026` | 2026-01-13 | 2026-01-13 |
| `2026-01-02` | 2026-01-02 | 2026-01-02 |
| `1/2/30` | 2030-01-02 | **2030-02-01** |

The literal did not move; `CDate` did. The en-US agreement between the two was a
coincidence of that format. The page states the order as settled, and a NOTE now says that
a literal and `CDate` read the same text differently under a day-first format --- which is
the trap a porter actually meets, since code that builds dates from strings goes through
`CDate`.

**Verified independently.** The orchestrator re-measured twelve of the claims in one probe
of its own --- the porting table's key rows, halfway rounding in `\`, **Variant** widening,
both date-literal orders, **Currency** rounding and **Decimal** exactness --- and all twelve
agreed. A full `examples.bat` run after both fix passes: **1,117 samples, 1,117 compile,
0 findings**.

**Five compiler defects** the probes found are queued in `BUGS-TO-REPORT.md`, each narrowed:
`\` and `Mod` of an **Integer** or **Long** minimum by -1 raise a native exception `On Error`
cannot catch; shifting a floating-point, **Date**, **Boolean** or **String** operand
compiles and then fails code generation; `>>` gives three different results for one value
depending on whether it is a constant, a variable or a **Variant**; overloads on **Date**
and **Double** resolve by declaration order; and `Boolean \ String` returns a wrong
**Boolean**.

## What to do next

**1. Round 8 candidates.** Re-run UC-55, UC-56 and UC-57 against their new sections, the
same measurement UC-40 just passed; re-run UC-50 once round 6's findings 10 and 12 land.
Write one more executed case --- `Windows-API.md` and `Forms.md` need a user at a form,
so the candidate is a Features page whose samples print. And the stale-page case has a
shape now: the welcome page restates section indexes, and nothing compares them.

**2. The tail.** The PDF book's informational broken links have grown from 8 in May to 14,
three of them new this week (`downloads/impexp.mjs`, `downloads/impexp.py`,
`/tB/IDE/Project/DebugConsole`). `check_run` is designed and not implemented, and finding
1 is what it exists for.

## Outcome

**All nineteen findings are closed**, finding 14 by a maintainer's decision. `build.bat`,
`check.bat` and `test.bat` are green, with 0 broken links in both real trees, 0 violations
in the accessibility sample, and every toolchain probe passing. Nothing is committed.

Every sentence the fix pass wrote about the product was measured first, and three
measurements changed what was written:

- **The Assert pages** say only what the two runs showed. The *Message* parameter is
  documented as accepted and not displayed, because a distinctive message occurred once in
  the IDE's whole DOM, on its own source line.
- **The error-path sentence** in the tutorial --- `On Error Resume Next` does not swallow a
  failing assertion --- was written after a probe of the tutorial's own sample, with its
  hidden context, stopped in the error panel with the handler active.
- **`WithEvents.md`'s new sentence** says the IDE creates a form's `Class` wrapper, and was
  written only after the *Standard EXE* template was exported and its `Form1.twin` read.

**The welcome page's stale list had a twin in the book.** Adding the four foundation
tutorials to `docs/index.md` sent the PDF's informational broken-link count from 14 to 19,
because `docs/_book.yml`'s Tutorials part --- "Worked code examples for Arrays, CEF,
WebView2, and CustomControls" --- predates them too. They are chapters of the book now, and
the count is 15; the one new entry is the welcome page's link to the Tutorials index, which
the book excludes as it excludes the Reference and Videos indexes.

**Three sections titled by symptom** were written, for the three failures UC-55, UC-56 and
UC-57 met with no door: *Keeping a project in Git*, *When `test.bat` fails in
`check_code_regions`* and *When the build stops with `Nav-parent orphan detected`*. The
code-region section puts a fenced block inside a numbered list, which is the kind of
construct `test.bat` is run for; it passed, and the built HTML carries the block intact
inside the list.

**The harness changed in three places.** `build_corpus.mjs` excludes `CLAUDE.md`.
`protocol.md` now separates the evaluator's half from the orchestrator's, since its
site-entry section named round 6's defects to anyone handed the whole file, and records
the evaluator model and how to run an executed case. `eval/README.md` says to snapshot the
search index with the corpus.

### Findings 10 and 12 of round 6

**Closed**, and described [above](#findings-10-and-12-of-round-6). Round 6's review records
the closure in its own outcome. The last open question, whether a literal follows the
regional format, was settled by compiling under English (United Kingdom) once the
maintainer switched to it: it does not. Every finding from rounds 6 and 7 is closed.
