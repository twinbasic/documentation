# Use-case review, round 8 --- isolated evaluators, an export that empties a Git repository, and constructors that fail in silence, at `5b4cd37`

Branch `staging` · reviewed 2026-09-24 · 13 cases

The eighth round of [the harness in `eval/`](../eval/README.md), and the first run with
evaluators that cannot see `WIP.md`. Round 7's four named re-runs (UC-55, UC-56, UC-57,
UC-50) and two more of its cases (UC-54, UC-58); round 1's four lowest-scoring cases, never
re-measured since (UC-06, UC-14, UC-15, UC-16); and three new site cases (UC-59, UC-60,
UC-61). The corpus was built at `5de91d0`, which rebasing `staging` onto the IDE help add-in
branch turned into `5b4cd37`; the round ran in two sessions, and the Round 8 section of
[eval/usecases.md](../eval/usecases.md) records both.

## Verdict

**No isolated evaluator walked into a hazard it was set, and every re-run improved on at least
one axis --- but the round's most serious findings are behaviours of the product that no page
mentions, and every one of them was found by measuring the product while verifying an answer,
not by an evaluator reading.** The IDE's **Export Project** empties its folder before writing,
`.git` included, and follows a junction out of it. A derived class whose `New` does not call a
base constructor that takes arguments compiles, runs and leaves the base's fields empty. An
out-of-range index raises `-2147352565`, not VBA's 9. The debugger's **Stop** at an error ends
only the failing procedure --- so **Stop** at a failed unit test lets it run on, and the Assert
tutorial's runner ends by printing that every test passed.

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 (8 cases) | 2.75 | 2.38 | 2.88 |
| round 4 (8 cases) | 3.00 | 2.50 | 3.00 |
| round 5 (8 cases) | 3.00 | 2.25 | 3.38 |
| round 6 (8 cases) | 3.13 | 2.75 | 3.00 |
| round 7 (8 cases) | 3.25 | 2.75 | 3.63 |
| **round 8 (13 cases)** | **3.62** | **3.23** | **3.31** |

Per case. The scores are the evaluators' own except where verification changed them, which is
in bold and explained under *Corrections* below:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-56 `check_code_regions` failed after a rewrite change *(re-run)* | 4 | 4 | 4 | pass |
| UC-55 *(site, re-run)* a project in Git, and a rebuild script | 4 | 3 | **3** | pass |
| UC-57 the build stops with `Nav-parent orphan detected` *(re-run)* | 4 | 4 | 4 | pass |
| UC-50 *(site, re-run)* port a routine that assigns `Date` and uses `CDec` | 4 | 4 | **4** | pass |
| UC-60 *(site)* shared modules as a package, and how a fix reaches its users | **3** | 3 | 3 | partly walked into |
| UC-58 prove a new code example compiles *(re-run)* | 4 | 4 | 4 | pass |
| UC-54 *(site, re-run)* unit tests, from nothing to a run --- **executed** | 4 | 4 | **3** | n/a --- both runs as the pages say |
| UC-06 the build refused a file type *(round 1)* | 4 | 4 | 3 | pass |
| UC-14 change the site's body typeface *(round 1)* | 3 | 1 | 3 | pass |
| UC-15 did one link checker quietly check less *(round 1)* | 4 | **3** | 4 | n/a |
| UC-16 a CSS rule that works in both themes *(round 1)* | 4 | 2 | 4 | pass |
| UC-59 *(site)* a base class and two derived classes --- **executed** | 3 | 4 | **2** | pass; the code did not compile as given |
| UC-61 *(site)* a run-time error in a loop, then step through the rest | **2** | **2** | **2** | none known; walked into one the probe found |

Split by protocol:

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| repo cases, round 7 (UC-40, 56, 57, 58) | 3.00 | 3.00 | 3.25 |
| repo cases, round 8 (UC-56, 57, 58, 06, 14, 15, 16) | 3.86 | 3.14 | 3.71 |
| site cases, round 7 (UC-49, 53, 54, 55) | 3.50 | 2.50 | 4.00 |
| site cases, round 8 (UC-50, 54, 55, 59, 60, 61) | 3.33 | 3.33 | 2.83 |

**The repository half is now easy to use once found, and mostly easy to find.** Its one
discoverability 1 is UC-14, whose answer spans four pages with no section of its own. **The
site half lost actionability because its cases were checked against the product** --- UC-59's
code did not compile, UC-61's plan for stepping on would have repeated the error, and the Assert
tutorial's F5 does not run a test --- and because UC-60's question has no answer on any page.

### The re-runs

| case | before | round 8 |
|---|---|---|
| UC-56 `check_code_regions` | round 7: 3 / 3 / 3 | 4 / 4 / 4 |
| UC-55 project in Git *(site)* | round 7: 3 / 2 / 4 | 4 / 3 / 3 |
| UC-57 nav orphan | round 7: 3 / 2 / 3 | 4 / 4 / 4 |
| UC-50 port `Date =` / `CDec` *(site)* | round 6: 2 / 4 / 3, a different routine | 4 / 4 / 4 |
| UC-58 prove a sample compiles | round 7: 2 / 3 / 3 | 4 / 4 / 4 |
| UC-54 unit tests, executed *(site)* | round 7: 3 / 3 / 4 | 4 / 4 / 3 |
| UC-06 publish refusal | round 1: 3 / 2 / 2 | 4 / 4 / 3 |
| UC-14 body typeface | round 1: 2 / 1 / 3 | 3 / 1 / 3 |
| UC-15 link-checker parity | round 1: 4 / 1 / 3 | 4 / 3 / 4 |
| UC-16 CSS in both themes | round 1: 1 / 0 / 1 | 4 / 2 / 4 |

**Every re-run rose or held on completeness and discoverability, with the notes removed**,
and on actionability all but UC-55 and UC-54, which verification lowered from their evaluators'
4 to 3 (*Corrections*, below). Rounds 1--7 ran their evaluators as
subagents, which carried `WIP.md` in their context ([eval/README.md](../eval/README.md#why-an-evaluator-is-a-separate-process));
round 8's could not. Removing the notes can only have made a case harder, so the rise is the
fixes' --- mixed with the model, which round 7 recorded only as Sonnet and rounds 1--6 not at
all.

**Round 7's three symptom-titled sections work without the notes.** UC-55, UC-56 and UC-57
each found its section at search rank 1: `git source control twinBASIC`,
`check_code_regions test.bat failing` and `nav-parent orphan` respectively. Round 7's
queries, re-measured: `git version control`, `check_code_regions failing` and
`nav-parent orphan detected` went from MISS to rank 1; `export project to text files` and
`rebuild project file from source` still miss; and `renamed page breaks navigation` still
ranks the heading-rename section first.

**Round 1's four moved on every axis but one.** UC-16 went from a stall after eleven hops to
the answer one hop from the README; round 1's findings 9 and 10 --- no published page named
the stylesheet or the specificity trap --- were closed by *Project styling* in `Builder.md`.
UC-06 now finds the right remedy first. **UC-14's discoverability stayed at 1**: all six of its
queries miss, and the steps a face change takes are spread across `Builder.md`, `Building.md`,
`Tools.md` and `PDF-Generation.md` (finding 13).

## Isolated evaluators, and the session as evidence

Every case ran through `eval/run_case.mjs`: `claude -p` inside the corpus, safe mode,
read-only tools, reads refused outside the working directory, and one command allowed. The
smoke run's six checks passed at the start of both sessions.

**The session contradicts the report in four cases of thirteen**, which is why channel order
was read from the digest and never from a report:

- **UC-56, UC-14 and UC-59 used full-text search and reported Channel 3 as not needed.**
  UC-14 grepped `font` across `builder/` and `docs/` three times before its first site search
  and then described a six-hop navigation path it had not walked blind. UC-59 opened
  `Protected.md`, one of the three pages its answer is built from, from a grep for
  `Overridable`, though `Class.md`, which it had read, links there; and it grepped for the
  constructor call just after `New with constructor arguments` had put
  `Classes-and-Modules.md` at rank 1. **UC-61** reported its greps as permalink lookups; one
  was a recursive search for `Erl`.
- **UC-55, UC-60 and UC-16 found the answer by search and walked the navigation path
  afterwards**, to links they already knew. **UC-58 did the reverse**: it navigated first and
  searched last, with a term it had learned on the way (`check_build`). **UC-50 and UC-61 did
  not navigate at all**; UC-61's navigation was measured by the orchestrator instead, two hops.

Discoverability was scored from the ranks and the links, which were all re-measured against
the round's snapshot of the index: **58 queries, and every rank an evaluator reported matched
but one.** UC-61 wrote that no query put the Debug menu page above rank 8;
`debug loop step through variables` has it at rank 4.

**The digest drew one letter per call**, so UC-58's four queries, chained in one command, read
as a single search. It now prints the count (`S4`) and a total.

## The executed cases

**UC-54 ran exactly as the pages say.** The evaluator's project --- its two modules verbatim,
each in a `Module` block, in the `packages` template, with a `[RunAfterBuild]` Sub standing in
for the reader's click --- printed one line, `All PadLeft tests passed.`, as predicted. With
one expected value changed, the run stopped on `TestStringUtils.twin` line 8 with **Assertion
FAILED** (`-353703420`), the Call Stack named `TestPadLeft_CustomPadChar` at 8:1, and nothing
reached the Debug Console. The expected value, `00043`, appeared on screen only in the source
line, and the actual `00042` nowhere. Round 7's rewrite of the Assert pages holds, **except for
one sentence**: the error panel has four actions, not the two the tutorial names (finding 4).

**The executed runs could not see two things the fix pass then measured**, because a
`[RunAfterBuild]` Sub stands in for the reader's click and nobody clicks the panel. The
tutorial's **F5** does not run the test under the cursor --- F5 starts the project; F6 runs the
procedure (finding 27). And **Stop** at a failed assertion lets the test carry on past it, so the
tutorial's runner ends by printing `All PadLeft tests passed.` (finding 29).

**UC-59 did not compile as given.** The evaluator put its three classes and its routine into
one `.twin` file, as it was asked to --- "exactly as I'd have it" --- with the routine at the
top level. Every line of the routine fails TB5182, *No handler for this symbol*. With the
routine inside a `Module` block it prints exactly what the evaluator predicted:

    Rex says: woof
    Whiskers says: meow

`Module.md` does say that a `.twin` file requires the block. The Inheritance page never shows
one, and neither shows a class being constructed; the IDE's own Sample 23, which the page
points to, keeps its routine in `Module AnimalsDemoMod`.

**Probing the constructor rules the page leaves out found three things none of its pages say.**
Nine probes, each in a project of its own:

| probe | result |
|---|---|
| a class with no modifier whose only `New` takes an argument | TB5135, *error generating implicit default constructor on class 'Animal' (for COM exposure)* |
| the same with `[ComCreatable(False)]`, with `Class_Initialize`, or `Private` | compiles and runs |
| a public class that `Inherits` a private base, with `New(name)` | TB5135 |
| a derived class with no `New` of its own, created with an argument | TB5030, *Unexpected call arguments* --- constructors are not inherited |
| the same created with no argument | compiles, runs, and **the base's field is empty** |
| a derived `New` that never calls the base's `New(name)` | compiles, runs, and **the base's field is empty** |
| a class with both `New(name)` and `Class_Initialize`, public or private, created with an argument | only `New` runs |

The evaluator copied `Private Class` from the page and so never met TB5135; the named hazard
was passed by imitation, not by understanding. The silent failures are the ones a reader
writing their own class would meet (finding 6).

**The fix pass narrowed two of these, measuring before it wrote.** A plain `New` on the last
class runs `Class_Initialize` and not `New(name)`: the compiler treats `Class_Initialize` as a
constructor without arguments, and a class with both it and a parameterless `Sub New` fails
TB5073, the call matching both. And a base constructor has to be called only when it takes
arguments; one without arguments, or a `Class_Initialize`, runs before the derived `New` by
itself.

## Tier 1 --- the documentation says something the product does not do

**1. `Classes-and-Modules.md:14`** says a parameterised `New` is "called as the class is
constructed prior to the `Class_Initialize` event". `New` never runs the two one after the
other: with arguments it runs `Sub New` and `Class_Initialize` is not raised, and without them
it runs `Class_Initialize` and not `Sub New`. The same section's `:30`, "Within the project,
only `New` will be used if present", was half right; the orchestrator's probes measured only
the first case, and the fix pass the second.

**2. The linked-package folder is given as `%APPDATA%\Roaming\twinBASIC\packages`**, twice in
`Linked Packages.md` (`:21`, `:43`), and **`FAQs.md:207-215` gives five folders of which none
exists as written**: four under `%APPDATA%\Local\` and one under `%APPDATA%\Roaming\`.
`%APPDATA%` is already `...\AppData\Roaming`. On this machine the real folders are
`%APPDATA%\twinBASIC` (holding `addins`, `locale`, `packages`, `themes`) and
`%LOCALAPPDATA%\twinBASIC` and `%LOCALAPPDATA%\twinBASIC_WebPanel`; the `_Admin` pair the FAQ
names does not exist here, as the FAQ allows. UC-60's evaluator copied the wrong path into its
answer.

**3. `Building.md:260` says the publish refusal "names only two" of the three ways forward.**
The message, `formatPublishRefusal` in `builder/publish-policy.mjs`, names every one --- remove
the file or add an `exclude:` pattern, declare it under `bundle_extra:`, and widen
`SOURCE_EXTENSIONS` only for a new asset type. The sentence was wrong the day it was written:
`955fe8a7` added `bundle_extra` to the message at 23:28 on 2026-09-20, and `77646458` wrote
the sentence twenty minutes later, in the same fix pass. UC-06's evaluator flagged the
paragraph as not saying *which* two; the defect was that there are not two.

**4. `Testing-with-Assert.md:127`** says the error panel "offers **Try Again (Resume)** and
**Ignore (Resume Next)**". It offers four --- **Stop** and **Search Online** as well ---
measured on a failing assertion in this round and on an array index in the debugger probe.

**5. `VB/Global/index.md:43`** says `Forms.Item` with an out-of-range index "raises run-time
error 9 (*Subscript out of range*)". It raises `-2147467259`, *Unspecified error* --- measured
in the IDE and in a compiled EXE, for `Forms(99)` and `Forms.Item(-1)`.
**`VBRUN/ErrorContext/index.md:83`** says "Built-in errors use the standard VBA error codes (for
example, `9` for "Subscript out of range" ...)". An out-of-range array index raises
`-2147352565` (`&H8002000B`, *Invalid index.*); an element of a never-dimensioned array, and a
missing `Collection` member by index or key, raise `-2147467259`. VBA-Docs gives 9 for all of
those --- its *Subscript out of range* page uses the never-dimensioned case as its example.
`UBound` of an erased array, `Printers(99)` and `Err.Raise 9` do give 9, and division by zero
gives 11, as VBA does. **The user asked, mid-round, whether the panel's number is the one `Err`
reports.** It is: every figure here is `Err.Number` read by the program, identical in the IDE
and in the compiled EXE, and for the array case the panel shows the same number as a handler
does. Code ported from VBA that tests `Err.Number = 9` does not recognise any of them; queued
to report. **The fix pass found three more on the pages it corrected**, each measured: the
`Printers` page's error 9 holds only past the end of the collection --- a negative index raises
`-2147467259` --- and an unknown printer name raises `-2147467259`, not the documented 5; and
the `Forms` page's own `Load` sample, `Forms("Form2")`, raises error 13 (*Type mismatch*),
because a form's name is not an index.

## Tier 2 --- hazards the pages do not know

**6. Constructors and inheritance.** The Inheritance page's classes are all `Private` and it
never says why; a public class, base or derived, whose `New` takes arguments fails TB5135. Its
comment says "we can explicitly call base constructors", which reads as optional --- and
omitting the call to a base constructor that takes arguments is silent. Constructors are not
inherited. The rule about `Private` is on one other page (`Classes-and-Modules.md:30`), and the
other two facts are on none.

**7. The IDE's Export Project empties its folder, and no page says so.** Measured by driving
the IDE's own `exportProjectTo()` over DevTools, on scratch folders:

- **Everything in the folder that is not part of the project is deleted first**, with no
  prompt: `.git`, a hidden file, an unrelated file, a subfolder. The command-line `export` verb
  deletes nothing, which is what the Import/Export page describes.
- **On a real `git init` working copy** it deleted `.git\config`, `HEAD`, `index`, `hooks` and
  `info`, then stopped at the first read-only object file with `[EXPORT] export failed.` in the
  Debug Console and nothing else. `git status` there reports `fatal: not a git repository`.
- **A directory junction in the folder is followed**, and the files it points to are deleted.
- **Exported into the folder that holds the project, it deletes the `.twinproj`.** The Settings
  editor refuses only the literal `${SourcePath}`.
- ***Export After Save* does it on every save.**

The IDE's own setting text warns "The export folder will be EMPTIED before export". The
documentation has *Export Path*, *Export After Save* and *Export Verbose* as empty headings,
**File → Export Project** as one line with no description, and a *Keeping a project in Git*
section that never mentions either. A reader who keeps a project in Git with the IDE's command
rather than the command-line one can destroy the repository. Three defects queued: the junction,
the silent part-way failure, and the path check.

**8. After a run-time error, F8 repeats the error.** UC-61's evaluator told the reader to step
through the rest of the loop with Step Into and Step Over. On the failing line both re-run it,
and the error recurs at once; the way on is to fix a value in the Debug Console, skip the line
with **Ignore (Resume Next)** or **Set Next Statement** (<kbd>CTRL</kbd>+<kbd>F9</kbd>), and
step from there. The key bindings on `Debug.md` are correct. Two defects the probe met are
queued: a step key pressed on the failing line leaves a step pending, and **Stop** at an error
ends only the failing procedure while its caller carries on.

## Tier 3 --- the answer exists and the reader cannot reach it, or it does not exist

**9. What happens on a run-time error is on no page.** The IDE section has nothing about the
error panel, its four actions, the marked line, or the Debug Console's input row --- which
evaluates `? i` and assigns `i = 2` while stopped. *Break On All Errors* is an empty heading on
`Project Settings.md` and an unexplained menu entry on `Debug.md`; measured, it stops even inside
an `On Error` handler, and **Ignore** there skips the line so that an `On Error GoTo` handler is
never run.

**10. The IDE section has 83 empty sections, 63 of them on `Project Settings.md`.** The site
search gives every `##` section an entry, so each empty one is served as a result with a blank
snippet: *Break On All Errors* ranked third to fifth for UC-61's debugging queries and led
nowhere. BETA 983's `ide/main.js` holds the IDE's own description of every setting, which is
the primary source for filling them. This round filled the four its cases needed.

**11. A fix to a locally built package has no documented route to the projects that use it.**
*Updating a Package* covers only TWINSERV. UC-60's evaluator applied that procedure to a local
file and could not have known otherwise. The package's **Version** field appears only in a
screenshot caption. Measured by a probe agent over DevTools:

- **An embedded package** --- the default --- is a copy in each project, and rebuilding the
  package changes none of them. Importing the new file while the project still holds the old
  copy is refused, *conflicts with an existing imported package*, whatever its version --- the
  fix pass found it refused with no reference at all. What works is to untick the package and
  apply, then import the new file, tick it and apply again. **The same steps
  under one apply left the old build running** until a save and a compiler restart (two runs of
  two, with no linked copy on the machine); queued.
- **A linked package** is a file in `%APPDATA%\twinBASIC\packages`, found by the package's ID
  rather than its file name, and a replaced file reaches every project that links it at the
  next compiler start --- never at the next build.
- **The IDE never compares a local package's version**: a lower one is accepted, and a
  same-named package is refused whatever its version.
- ***Import from file...* leaves the imported package unticked** in BETA 983, where the Importing
  page says it appears ticked; queued.

**12. The Inheritance page's example stops before the code that uses it**, and says "see the
full Sample 23" without saying where Sample 23 is. It is on the site --- `New Project.md:59`
lists "**23.** OOP Inheritance Example (Animals)" --- but nothing links there, and UC-59's
evaluator, grepping for "Sample 23", concluded it was not. **`New.md`** is VBA-derived and never
mentions constructor arguments; the evaluator reached `New Dog("Rex")` by grep, though
`New with constructor arguments` is rank 1 for the section that shows it.

**13. Changing the body typeface spans four pages and no section.** UC-14's six queries all
miss. The places a face is named --- `build_fonts.py`, `_fonts.scss`, `modules-dark.scss`,
`template.mjs`'s preloads, `print.css` with `pdf.mjs`'s `REQUIRED_FONTS`, `svg-inline.js`'s
exports, the `.dot` sources and `inter-metrics.json` --- are listed together only in
`WIP.Typography.md`, and the fix pass found three places even that list lacks: the Gantt chart's
own copy of the stack, the link-check fixture's stub fonts named after the preloaded files, and
the two diagram tools that name Inter outright. It also narrowed the case's hazard:
`modules-dark.scss` reads the stack variables, so the dark theme keeps the system fonts only
when a *new* stack is not passed to it. The rule to run the full accessibility sweep after a change that moves type
metrics is published, in `Tools.md`'s `sweep_a11y.mjs` entry, where the evaluator read past it.
`Builder.md:535` says `build_fonts.py` downloads "Cascadia Code", which is the release; the site
uses its Cascadia Mono cut, and the evaluator took the release's name for the face.

**14. `Builder.md:13` tells contributors they should not need the page that holds the styling
rules.** Its *Project styling* section is the only published account of where a CSS rule goes
and of the dark-mode specificity trap; UC-16 reached it by search at rank 6, with a query using
the page's own word *styling*. *Theme* matches the IDE's Themes pages, and `add CSS rule for
both themes`, `dark mode CSS variable` and `theme CSS variables light dark` all miss. The same
shape as round 7's finding 9.

**15. The site search gives no entry to a `###` section**, and no page says so. `search.mjs`
indexes to `heading_level`, which defaults to 2, and `_config.yml` sets none: an h3 is folded
into its parent's entry. UC-15's answer is `### The link-checker parity fixtures`, which has no
entry of its own --- its evaluator said so and the orchestrator doubted it, then measured it.
Round 7's three symptom-titled sections work in part because all three are `##`.

**16. The link checker has no section in a builder developer's words.** UC-15 reached the
parity harness in two hops from the README, but `link checker` and `link checker coverage`
return neither the section nor the tool's entry in the top ten, and Extending.md, the builder
developer's page, mentions the harness only as an example of a gate that must be able to fail.

**17. The Git section's rebuild step gives no command.** `Import-export tool.md`'s *Keeping a
project in Git* says to "rebuild the project file with `import --overwrite`". UC-55's evaluator
assembled the command itself and reversed the arguments --- folder first. Run on a scratch copy,
the reversed command prints `... FAILED` and exits 0, touching nothing, and the evaluator's own
`find "... DONE"` line would have caught it. The page states the order correctly, twice, in its
usage block.

**18. Minor.** `Tools.md`'s `check_code_regions.mjs` entry lists `--self-test` without saying
that it de-indents one fence body and checks that the comparison notices. `Authoring.md` never
says that `parent:` must match the parent's title exactly, case included (`nav.mjs` looks it up
in a map keyed by the title; `nav_sort: case_insensitive` affects only order).

## Found by the probes and the fix pass

Findings 19--21 are about the harness that checks evaluators' answers, which no evaluator sees.
The rest are documentation defects and product defects that the fix agents met while measuring
the pages beside the ones they were sent to fix.

**19. The Debug Console can append to an entry that is still open**, so a reader that indexes
the console from its last known entry misses new text. The export probe lost the first
`exporting...` line of every session that way until it compared the whole console before and
after. `tbrun` re-reads the whole backing array on each poll and was never affected;
`WIP.Harness.md` now says so.

**20. `tbrun` reported a failed build as a successful run.** Twice during the fix pass, with
five runs going at once, a build failed after a clean compile --- `[TYPELIB] failed to finalize
typelibrary.  Disk error?`, `[LINKER] FAILED to create type library`, `[BUILD] failed` --- and
`tbrun` returned those lines as the probe's output with exit 0. Both passed when repeated. The
probe never ran, and its first statement, `Debug.Cls`, would have erased that log. *Fixed*:
`tbrun` exits 2 on those lines. Exercised both ways: a capture carrying them exits 2 with the
log, and UC-54's probe still exits 0. What makes the type library fail was not isolated.

**21. Four gates could report a crash as a finding.** `Extending.md`'s gate conventions reserve
exit 2 for a harness that failed, so that a crash never reads as a defect in the site.
`check_code_regions.mjs` caught its own crash and exited 1; `check_dot_fit.mjs`,
`check_publish_policy.mjs` and `check_page_baseline.mjs` run at top level with no handler, so a
crash fell through to Node's exit 1. *Fixed*, each crash path exercised by an injected failure
--- an unreadable page, a missing browser, a missing temp directory --- and exiting 2.

**22. `Tools.md` said `check_code_regions.mjs` runs eleven probes**; it runs twelve, and prints
the counts itself. *Fixed* by dropping the number.

**23. `Class.md:38` said `Inherits` names "a single base class".** `Inherits Animal, Pet`, and
two `Inherits` lines, both compile, and the derived class uses members of both --- as the
Inheritance page's own "multiple inheritance" says. *Fixed*, with the syntax line.

**24. `Attributes.md` said `COMCreatable` decides whether a class "can be created with the
New keyword".** A `[COMCreatable(False)]` class is created with **New** inside the project as
usual. *Fixed*: the entry now says what the compiler's TB5135 says, that COM creation needs a
constructor without arguments.

**25. `Static s As Dog = New Dog("Rex")` fails TB5074**, where `Dim` and module-level
declarations accept it. Queued to report.

**26. Reading `Forms` by index can crash the program.** With a form loaded, `Forms(0).Name`
returns an empty string, and the process then dies with an access violation, `0xC0000005` ---
reproduced by the orchestrator from the fix agent's probe, with crash dialogs suppressed, while
`n = 0: Set f = Forms(n)` returned the form and exited 0. The fix agent also measured
`Set f = Forms(k)` inside a `For` loop corrupting `k`. The `Forms` page says `Forms(0)` and
`Forms.Item(0)` are equivalent, so a reader following it meets the crash. *Warned* on the page,
with `For Each` and the class name as the ways that work, and queued to report.

**27. `Testing-with-Assert.md` said F5 runs the Sub under the cursor.** It starts the project,
as **Run → Start** does --- measured, with the cursor in another Sub, and it is
`tbDebug_StartOrContinue` in the IDE's key table. F6, `tbDebug_RunOrPreview`, runs the procedure
under the cursor. *Fixed* in both places the tutorial said it.

**28. `Toolbar.md` gave Step Into as <kbd>F8</kbd> / <kbd>F10</kbd>.** The key table binds F8
and F11, as `Menu/Debug.md` says; F10 is Step Over. *Fixed*.

**29. Stop at a failed assertion reports a pass.** The Stop defect (finding 8) has its worst case
here: the failed assertion's error is raised by the assertion's own procedure, so **Stop**, and
**Run → End** as well, end only that and let the test carry on past the failed check. The
tutorial's `RunAllTests` then prints `All PadLeft tests passed.` --- three trials, one per button.
What ends the run is moving to the test's `End Sub` with **Set Next Statement** and then
**Run → End**, which prints `aborted` (two trials). *Fixed*: an `[!IMPORTANT]` note in the
tutorial says both, and the defect's queue entry names this case.

## Corrections --- evaluator claims amended

**UC-55**, from the first session: its "exit-code contradiction" is not one --- the table it
cited is the script's, under a heading that says so; its "shaky" LF note is accurate; and
`Tools.md` is not off the corpus, since it is published under `docs/Documentation/`. **New in
this session: its rebuild command reverses `import`'s arguments** (finding 17), so its
actionability is amended from 4 to 3 --- the command is the deliverable's key line, and the
section written for this goal gives none.

**UC-57's** rename section is not "buried under *Removing a page*": both are `##` sections.

**UC-54's** actionability is amended from 4 to 3: one of the two ways the tutorial gave to run a
test, F5, starts the project instead (finding 27). The evaluator could not have known; the page
said so.

**UC-50's** actionability deduction rested on a false premise. VBA's `Date =` sets the system
clock too, so the assignment is not a porting defect, and the `Date` page states the privilege
the assignment needs. Amended from 3 to 4.

**UC-60's** completeness is amended from 4 to 3: half of its goal --- how a fix reaches the
projects that use a local package --- is answered only for TWINSERV (finding 11).

**UC-15's** split discoverability --- search 2, navigation 4 --- is recorded as 3. Its claim
that the search indexes "page/section title, not this deep subsection" was right (finding 15).

**UC-59's** "Sample 23 is a dead end for a reader confined to the site" is overstated: the
New Project page lists it. Its actionability is amended from 3 to 2, because the code it handed
over did not compile.

**UC-61's** completeness is amended from 3 to 2 and actionability from 3 to 2: its plan to step
through the rest of the loop repeats the error at the first key (finding 8), and nothing it
could have read says what the panel's buttons do. Its discoverability is amended from 1 to 2,
because navigation --- which it did not walk --- reaches the pane pages in two hops.

**UC-58's** "neither page states the `--only` dialect" is overstated: `Tools.md:674` says it is
a regular expression over the page's path. **UC-14** located `_fonts.scss` under
`builder/vendor/`, although *Project styling* opens by saying every project style lives under
`docs/_sass/`. **UC-06** took the publish refusal's message to name two remedies, because the
page said so (finding 3).

## What round 8 says about the method

**Isolation did not lower a re-run.** The worry was that round 7's passes came from `WIP.md`.
Six of round 7's cases and four of round 1's ran without it, every hazard among them was passed,
and every evaluator scored its case the same as before or higher; the two scores that fell,
UC-55's and UC-54's actionability, fell on verification. The symptom-titled sections, in particular, work on their
own.

**The four most serious findings came from probing the product, not from reading.** Round 7
found that executing a case is a different instrument. Round 8 extends it: every evaluator
answer about product behaviour was checked against BETA 983, and that is where the Export
Project deletion, the silent constructors, the error numbers and the debugger defects came from.
No evaluator could have found them, because nothing in the corpus contradicts a page that is
silent. Three probe agents did the IDE work over DevTools --- Export Project, the debugger, and
package updates --- and the orchestrator's own probes the rest.

**The session is evidence the report is not.** Four of thirteen reports misstate their channels
(above). Round 7's subagents returned only their reports; no earlier round could have known.

**The evaluators ran on `claude-sonnet-5` through Claude Code 2.1.280**, recorded in every
case's `.meta.json`. Thirteen cases cost $3.21 between them --- a mean of $0.25, from $0.16
(UC-50) to $0.53 (UC-14, 39 turns and 122 seconds) --- and the two smoke runs $0.11.

## Method

Corpus built at `5de91d0` (`5b4cd37` after the rebase) with `eval/build_corpus.mjs`: 1,261
files, 986 readable and 275 source files stubbed unreadable; 910 pages under `docs/`; `WIP.md`,
the `WIP.*.md` files, `CLAUDE.md` and prior use-case reviews withheld. It lacks the IDE help
add-in branch's changes to `Tools.md` and `BUGS-TO-REPORT.md`, and the LLVM section merged
between the two sessions (`62a88982`..`398aa897`); no case concerns either. The search index
was snapshotted with the corpus --- 3,784 entries, 80.6% reference, 4.1% developer docs --- and
every case queried the snapshot.

**Rounds 1--7 ran their evaluators as subagents, and a subagent carries the session's
`CLAUDE.md`** --- here one line, `@WIP.md`, the file the corpus exists to withhold. Measured before
this round: a fresh subagent, asked without tools, quoted `WIP.md`'s first heading. Search ranks
from those rounds stand, because they are mechanical and every one quoted in a review was
re-measured. What `WIP.md` can have supplied is everything else --- cold guesses, the next page to
open, a hazard passed, how complete an answer felt --- and it states the hazard, and usually the
remedy, of UC-06, UC-14, UC-16, UC-56 and UC-58. **This round re-ran all five without it, and
all five passed their hazards again**, as did UC-57, the third of round 7's repository hazard
passes that were unproven. Those passes now rest on isolated runs.

The first session ran UC-56 and UC-55 with an earlier runner of the same configuration, then
UC-57, UC-50 and UC-60 with `run_case.mjs`; the second ran the other eight, in parallel. Goals
were verbatim from the tables; round 1's four kept the repository protocol they were first run
under.

The executed runs used `scripts/tbrun.mjs` on BETA 983: UC-54 in the `packages` template and
UC-59 in `console`, each without its stage module, the evaluator's code verbatim inside `Module`
blocks, and a `[RunAfterBuild]` Sub beginning `Debug.Cls` in place of the reader's click. The
failing UC-54 run kept its IDE, whose screen was read over DevTools before it was ended by pid.
The error-number probe ran both in the IDE and as the compiled EXE.

## What to do next

**1. Round 9.** Re-run UC-59, UC-61, UC-60 and UC-55 against this round's fixes, and UC-14,
UC-15 and UC-16 against the three new `##` sections. Write a case that keeps a project in Git
**with the IDE's Export Project**, since that is where the data loss is.

**2. The other error numbers, and a master list of them.** The reference states about 150
run-time error numbers across 54 pages --- 55 of them error 5, 29 of them 380. Of its six claims
of error 9, this round measured five: `Forms.Item`'s was wrong and `ErrorContext`'s general
statement false, while both of `Printers`' and `UBound`'s held. A probe per claim is the only
way to know the rest. The maintainer proposed, during the round, a master list of run-time
errors: for each kind, the current behaviour, the behaviour VBA-Docs specifies, and text for the
pages that need it. It needs a design of its own. The orchestrator's view: keep it as data, not
prose. The *current behaviour* column should be written by a probe runner, never by hand, since
re-measuring on every BETA is the point --- a snippet that raises the error, then the number, the
description and the build, written back by the probe. Hand-written fields stay few: VBA's number
and its VBA-Docs source, and the pages that state it. And no page text to paste: a blurb copied
into several pages is exactly the drift the canonical-plus-pointer rule exists to stop, so one
table --- `Number.md`'s *Error numbers that differ from VBA*, written in this fix pass --- would
be generated from the list or checked against it, and every other page would link there.

**3. The empty IDE sections** (finding 10), from the IDE's own setting descriptions. Offered as
a task of its own.

**4. `check_run`** is still designed and not implemented, and UC-59 is the second executed case
whose defect it would have caught.

## Outcome

**Every finding is fixed, warned or queued, except three left open on purpose.** The
documentation carries findings 1--9 and 11--18 and the fix pass's 22--24 and 26--29; the
harness carries 19--21 and the digest's query count; and ten product defects are queued in
`BUGS-TO-REPORT.md`, behind findings 5, 7, 8, 11, 25 and 26, with the false pass of finding 29
added to the Stop entry. Left open: the 59 empty IDE sections the cases did not need (finding
10, offered as a task of its own); the reference's other run-time error numbers (*What to do
next*, 2); and the TWINSERV half of *Updating a Package*, whose *Remove It* prompt appears
nowhere in BETA 983's code --- read, not measured, so the page was left as it is.

`build.bat`, `check.bat` and `test.bat` are green: 914 pages, 0 broken links and 0 integrity
findings in both real trees, 0 accessibility violations, every toolchain probe passing. A full
`examples.bat` run, on a port of its own beside another session's: **1,123 samples, 1,123
compile, 0 findings.** The book tree's informational broken links went from 16 to 23 --- two
from the LLVM section merged since the corpus was built, five from this round's fixes, and all
seven are links from a book chapter into the IDE section, which the book leaves out.

**Every sentence the fix pass wrote about the product was measured first, and every one of the
seven fix briefs was corrected on at least one point** by the agent that received it:

- `Class_Initialize` does run: on a plain `New`, instead of `Sub New`.
- A base constructor without arguments runs by itself; only one that takes them must be called.
- `dot-metrics.mjs` does not change for a new face, and `modules-dark.scss` only for a new
  stack; the Gantt chart, the link-check fixture and the two diagram tools name the face as well.
- CI's pull-request fixture case does compare the build's own checker with the script.
- Export Project's folder picker ignores `exportPathIsV2`, and the probe's 476 exported files
  were 475.
- An erased array behaves as one never dimensioned.
- An import is refused because the project holds the old copy, not because of the reference,
  and the dialog's Version does not follow a replaced linked file.

The agents also found the three defects of the Assert tutorial (findings 27--29) while
measuring pages the orchestrator had not asked about, which is the strongest case yet for
telling a fix agent to verify rather than comply.

The work is committed in four commits on `staging`, the first two made during the round at the
maintainer's request --- the harness and gate fixes, and the defect queue --- then the
documentation fixes, and this review with the round's records. Nothing is pushed.
