# Use-case review, round 11 --- the re-runs recover, a console program that prints nothing, and an add-in reference the page calls automatic, at `4a67e09`

Branch `staging` · reviewed 2026-09-24 · 9 cases

The eleventh round of [the harness in `eval/`](../eval/README.md), and the fourth with isolated
evaluators. It ran the five re-runs round 10 named --- UC-62 and UC-66 against *Keeping a project
in Git from the IDE*, UC-69 against the DLL section, UC-67 against the callback section, UC-55
against the single export command --- and UC-65 against its `Max` sample, made a whole file. It
opened three surfaces no case had read, each executed: a command-line tool built and run at a
command prompt (UC-70), two calculations on threads (UC-71), and an IDE add-in built, loaded and
clicked in a private copy of the install (UC-72). The corpus was built at `4a67e09`, round 10's
last commit. The [Round 11 section of eval/usecases.md](../eval/usecases.md) records the goals
verbatim.

## Verdict

**Round 10's fixes worked, on every axis but one.** Across the six re-runs, completeness rose
+1.00 and actionability +1.33, and UC-69, which scored 2/3/1 as a DLL the pages could not call,
scored 4/4/4 and ran from a 32-bit and a 64-bit caller as its answer predicted. Discoverability
moved ±0.00, exactly as it did across round 4's fix pass in round 5: the pages the fixes wrote
are right, and the evaluators' own words still reach them no more often. Measured on round 10's
own queries, the fixes did move it --- the sections that answer now are in the top ten for 21 of
36 of them, against 4 --- so what did not move is the next evaluator's choice of words.

**The new surfaces failed where the pages were thin, and one page was wrong.** The tbIDE package
page says its reference "is added to addin projects automatically"; UC-72's evaluator believed
it, and its add-in failed with 18 errors, `TB5079 Unrecognized datatype symbol 'AddIn'` first.
With the reference added, it built, loaded and inserted the date as predicted --- and its next
build, once the IDE had loaded it, failed with *error code 32*, which no page mentions. The
console program was worse off: the Console Applications section is one paragraph, and both UC-70
evaluators wrote programs that fail the goal in different ways. One printed nothing and always
exited 0, because `Debug.Print` writes nothing in a built `.exe` and `End` sets no exit code;
the other built only after the template's own `Sub Main` was removed, and wrote nothing when its
output was redirected.

**And the harness lost a channel without saying so.** Two evaluators chained `site-search` after
a `cd`, were refused, and concluded the search box was not available. Their digests flag it ---
*no site search at all* --- and both were run again once the protocol told them to run the
command on its own.

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 (8 cases) | 2.75 | 2.38 | 2.88 |
| round 4 (8 cases) | 3.00 | 2.50 | 3.00 |
| round 5 (8 cases) | 3.00 | 2.25 | 3.38 |
| round 6 (8 cases) | 3.13 | 2.75 | 3.00 |
| round 7 (8 cases) | 3.25 | 2.75 | 3.63 |
| round 8 (13 cases) | 3.62 | 3.23 | 3.31 |
| round 9 (11 cases) | 3.55 | 3.45 | 3.55 |
| round 10 (9 cases) | 3.00 | 3.33 | 2.78 |
| **round 11 (9 cases)** | **3.22** | **3.33** | **3.00** |

Per case. The scores are the evaluators' own except where verification changed them, which is
in bold and explained under *Corrections* below:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-55 *(site, re-run)* a project in Git, and a rebuild script | 4 | **3** | 4 | pass; its export command has `--overwrite` now |
| UC-62 *(site, re-run)* a project in Git, kept from the IDE | 4 | 3 | 4 | pass; the route it asked for is there |
| UC-65 *(site, re-run)* a generic function and a generic class --- **executed** | 3 | 4 | 3 | none known; ran as predicted |
| UC-66 *(site, re-run)* rebuild a project kept by the IDE, from a fresh clone | 4 | **3** | **3** | fail, by the page's order: its answer imports before it removes the compiler packages |
| UC-67 *(site, re-run)* pass a function as an argument --- **executed** | 4 | 3 | 4 | none known; ran as the page shows |
| UC-69 *(site, re-run)* a twinBASIC DLL called from Excel VBA --- **built and called** | 4 | 4 | 4 | pass on all three; the pattern ran from a win32 and a win64 caller |
| UC-70 *(site)* a command-line tool with an exit code --- **executed at a prompt** | 2 | 3 | **1** | three that no page knew: `Debug.Print`, `End` and redirected output |
| UC-71 *(site)* two calculations on two threads --- **executed** | 2 | 3 | 2 | none known; ran as predicted |
| UC-72 *(site)* an IDE add-in with a toolbar button --- **built, loaded and clicked** | **2** | 4 | **2** | walked into the page's claim that the reference is automatic |

### The re-runs

| case | round 10 | round 11 |
|---|---|---|
| UC-55 project in Git | 4 / 3 / 3 | 4 / 3 / 4 |
| UC-62 Git from the IDE | 2 / 4 / 2 | 4 / 3 / 4 |
| UC-65 generics, executed | 3 / 4 / 2 | 3 / 4 / 3 |
| UC-66 fresh clone | 3 / 4 / 3 | 4 / 3 / 3 |
| UC-67 callbacks, executed | 3 / 2 / 3 | 4 / 3 / 4 |
| UC-69 DLL from VBA, built and called | 2 / 3 / 1 | 4 / 4 / 4 |
| **mean** | **2.83 / 3.33 / 2.33** | **3.83 / 3.33 / 3.67** |

UC-62 and UC-66 each lost a point of discoverability: the phrasings this round's evaluators
chose rank the new section 3rd, 7th, 8th and 9th, or miss it. UC-67 and UC-69 each gained one,
from sections titled for their readers' words. All nine cases ran on the model and Claude Code
build of rounds 8--10, `claude-sonnet-5` through 2.1.280.

## A discoverability fix, measured on the same queries

Round 10's own queries for the six re-run cases, word for word, against round 10's snapshot of
the index and this round's. A hit is the section that answers the goal now, in the top ten:

| case | round 10's queries | hits, round 10 index | hits, round 11 index |
|---|---|---:|---:|
| UC-55 | 4, from `git source control project file` to `command line build twinproj from folder` | 1 | 1 |
| UC-62 | `git integration IDE`, `auto commit on save`, `export project on save git`, `version control settings` | 0 | 2 |
| UC-65 | `generics`, `generic function max of two values`, `generic stack class example` | 3 | 3 |
| UC-66 | `put my twinBASIC project in git`, `open project without twinproj file`, `clone repository rebuild twinproj`, `export project every save git` | 0 | 3 |
| UC-67 | 7, among them `callback function as argument`, `pass function as parameter`, `AddressOf`, `delegate` | 0 | 3 |
| UC-69 | 14, among them `call twinBASIC DLL from VBA`, `Excel VBA declare function DLL`, `ActiveX DLL VBA` | 0 | 9 |

**4 of 36 to 21 of 36.** Against round 10's broader targets --- any section of the page that
answers, which is what round 10 scored --- 21 of 36 became 23. The two readers' phrasings round 10
titled the callback section for, `callback function as argument` and `pass function as
parameter`, rank it 1st, and `ActiveX DLL VBA`, 4th for the DLL page in round 10, ranks the DLL
section 1st. Still missing: `rebuild project file from source files`, `auto commit on save` and
`version control settings`.

This round's own 56 queries rank as the evaluators reported, with two exceptions, both
overstatements: UC-69's `create ActiveX DLL twinBASIC` ranks the Standard DLLs section 4th, not
1st, and UC-66 swapped the ranks of *Export Project* (1st) and *Keeping a project in Git*
(2nd). Neither changes a score.

## The session as evidence

**UC-70 and UC-71 lost Channel 1 to the harness.** Each began by chaining the search after a
change of directory --- `cd ".../corpus" && site-search "command line arguments"` --- which the
evaluator's one allow rule refuses. Six other evaluators did the same and retried with the
bare command; these two concluded, in their own words, that "the `site-search` command requires
the Bash tool, which was denied". UC-70 then made eight full-text searches and scored its
discoverability 1; UC-71 made six, "only to check completeness after the answer was found".
Both were run again with the protocol's new sentence (finding 10), and both searched first:
UC-70 20 times, UC-71 8. The second runs are the ones scored; the first runs' answers were
executed as well.

**Four other flags were smaller.** UC-65 grepped twice for a generic `Stack` class to confirm
there is none, UC-71's second run grepped for `Sub Main`, and UC-72 grepped for *Build Output
Path* while checking a variable; each report says Channel 3 was not needed. UC-66 made no
full-text search this time, where round 10's run found its answer by five.

**Navigation was measured from the links, with `eval/nav_hops.mjs`**: the Git sections,
Delegates, Generics, Project Types and Multithreading are three hops from the welcome page, and
the tbIDE package and the Add Ins page one. UC-62 and UC-66 reported four hops and UC-72 two;
by links it is three and one.

## The executed cases

Each ran through `scripts/tbrun.mjs` on BETA 983, from one process that owned the registry tidy,
with the evaluator's code verbatim --- a bare module body wrapped in a `Module` block, as rounds
9 and 10 did --- and a `[RunAfterBuild]` Sub beginning `Debug.Cls` in place of the reader's click.

**UC-65 ran as predicted**: ` 42 `, ` 3.14 `, `banana`, less the sign spaces rounds 9 and 10 also
noted. Its `Stack(Of T)`, which the evaluator composed from the page's `List(Of T)`, compiled
first time. **UC-67 ran as the page shows**, since its answer is the page's sample: the five
names alphabetically, then by length.

**UC-69 was built and called from both bitnesses.** The DLL is the Standard DLL template's
settings with the page's two functions, built win32 and win64; each caller is a twinBASIC
project holding the evaluator's VBA verbatim, the `Lib` path aside, since a plain `Declare`
converts strings to and from ANSI as VBA's does. Both printed ` 5 ` and `Hello, Ann`, and both
returned `Hello, Zoë Łódź 東京` intact, character for character. This is round 10's second
*What to do next*, done: the pointer pattern works in a 64-bit caller. Excel itself was not
driven.

**UC-71 ran as predicted, in both runs**: `Primes below 200000: 17984` and `Numbers 1 to 5000000
divisible by 7 or 11: 1103895`. Two things it relied on without a page to say so both hold:
module-level variables are shared between threads, and a thread procedure declared as a `Sub`
with no parameters runs. One step past the answer, a thread whose calculation overflows with
nothing to handle the error never finishes: in the IDE it was still running ten seconds later,
so the answer's `WaitForSingleObject ..., INFINITE` would wait for ever (finding 5).

**UC-70 was built into an `.exe` and run at a command prompt**, in a console window, redirected
to a file and piped, with the exit code read after each. The second run's answer prints with
`Debug.Print` and stops with `End`: **it printed nothing, in any case, and every exit code was
0.** The first run's answer, as handed over, did not build --- it adds a module with a `Sub Main`
to the Console App template, whose `MainModule` has one already: *'Main' is ambiguous*. Without
the template's module it printed `three.txt: 3 lines` for a file of three lines ending CRLF,
`linecount: file not found: missing.txt` with exit code 1, and the usage line with exit code 1
--- and wrote nothing at all with its output redirected, because it calls `WriteConsoleA`. A
file with Unix line endings counted as one line, as the `Line Input #` page says it would.

**UC-72 was built, loaded and clicked by the add-in test runner**, in a lane of its own with a
private copy of the install. As handed over, without the package reference its answer calls
automatic, it did not compile (finding 1). With the reference, the IDE loaded *Insert Date
AddIn*, its button showed *Insert Date* on the toolbar, and a click with the cursor in `Main.twin`
inserted `' 2026-09-24` there, as predicted --- the rest of the line moving down, unindented,
as inserting a line break at the cursor does.

**Two builds failed that built on a retry**: UC-71's first, and one probe's, each with
`[TYPELIB] failed to finalize typelibrary. Disk error?` --- once among four concurrent builds and
once among two. The cause was not isolated (finding 13).

## Tier 1 --- the site does something harmful, or says something the product does not do

**1. The tbIDE page said the package reference is added automatically, and it is not.** *"It is
added to addin projects automatically; there is no need to add it manually through Project →
References."* No template makes an add-in project: a reader starts from the Standard DLL
template, as UC-72's evaluator did, and that template references OLE Automation and the App
global class object only. UC-72's add-in, built from it, failed with 18 errors --- `TB5079
Unrecognized datatype symbol` for `AddIn`, `Host`, `Button` and `CodeEditor`. The Built-In
Packages page, and the pages of four other packages, say to add a built-in package through
Project → References → Available Packages. The add-in samples 10--16 reference it already.
A probe agent measured the dialog: the row is *twinBASIC - IDE Extensibility Package*, marked
*[BUILT-IN]*, library symbol *tbIDE*, and ticking it and pressing **Apply Changes** took the
Standard DLL template's three `TB5079` errors to none. *Fixed*: the page says to add it, in the
dialog's words, and the Add Ins page names Sample 10 as the project to start from.

The same probe read the Assert package's row: *twinBASIC - Unit Testing Package*, library symbol
*Assert*. The testing tutorial said to "tick **Assert**. Click **OK**" --- a name the Name column
does not show, and a button the dialog does not have. *Fixed* too.

**2. The Windows API tutorial said a `Long` handle fails in 64-bit mode, and for two of the three
kinds of handle it does not.** *"A Declare that uses `Long` for a handle type compiles and runs in
32-bit mode but fails or crashes in 64-bit mode because a 64-bit handle does not fit in 4 bytes."*
Measured with `tbrun --arch win64`, which round 10 asked for: a window handle and an event's
handle both fitted in a `Long` and worked; `GetModuleHandleW(0)` returned `&H7FF6436A0000` as a
`LongPtr` and `&H436A0000` as a `Long`, and `GetModuleFileNameW` given the `Long` failed with
error 126; a pointer returned `As Long` was cut the same way, and `lstrlenW` read nothing at it.
And what the sentence missed: in a win64 build, a `LongPtr` passed to a `Long` parameter does not
compile, *TB5001 cannot coerce type 'LongLong' to 'Long'*, and `CLng(StrPtr(s))`, which the
message suggests, raises error 6. *Fixed*: the sentence is three measured cases, and the advice
--- declare every handle and pointer `LongPtr` --- stands.

## Tier 2 --- hazards the pages did not know

**3. A console program: `Debug.Print` prints nothing, `End` sets no exit code, and the
template's `Console` class cannot be redirected.** Measured on built `.exe` files at a command
prompt:

- `Debug.Print` writes to the IDE's Debug Console only; a built program prints nothing with it.
- `End` ends the program with exit code 0. `ExitProcess` sets the code, and a batch file's
  `errorlevel` reads it.
- The template's `Console.WriteLine` calls `WriteConsoleW`, which writes nothing to a file or a
  pipe. Redirected, it wrote nothing and raised error 5, its own *failed to write to the
  console*.
- `Command$` keeps the quotes of a quoted argument: `"my file.txt"` arrives as `"my file.txt"`.
- The template's `MainModule` has a `Sub Main`, so a second one in the reader's module stops the
  build with *'Main' is ambiguous*.

*Fixed*: *Writing a command-line tool: output, exit code and arguments*, a `##` on Project Types
with a measured `linecount`. Its `WriteOut` and `WriteErr` use `WriteConsoleW` for a console
window and `WriteFile` for a file or a pipe, so the tool's output reaches a console, a
redirection and a pipe alike --- measured, with `Zoë Łódź` intact in a console window and
converted to the ANSI code page in a file. The template's class is described as the starting
point it is, and *Is Console Application* on Project Settings, an empty heading until now, has
the IDE's own description of it.

**4. An add-in built into the IDE's own `addins` folder cannot be rebuilt once the IDE has loaded
it.** UC-72's answer, like the samples, builds to `${IdePath}\addins\${Architecture}\...`.
Measured in a private copy of the install: the first build wrote the DLL; the IDE loaded it when
it next opened; and the next build failed with `[LINKER] FAILED to create output file ...
(error code 32)`, naming the IDE's own compiler as the process that held it. WIP.HelpAddin.md
had recorded the lock as P8; no page had. *Fixed*: *Rebuilding an addin the IDE has loaded*, a
`##` on the tbIDE page --- build to the ordinary `Build` folder, close the IDE, copy the DLL over
the old one --- which is the loop the add-in test runner itself uses. Two copies of an add-in
under two names load as two add-ins, with two identical buttons, which the page says too.

**5. An error nothing handles stops a thread for good.** UC-71's answer handled errors in its
thread procedures in its first run and not in its second, and the Multithreading page's example
has none. A thread whose `Integer` overflowed was still running ten seconds later, its wait timed
out, and a wait with `INFINITE`, as both answers used, never returns. *Fixed*: *Running code on
two threads and waiting for both to finish*, a `##` on the Multithreading page with an example
measured in 32-bit and 64-bit builds --- module-level results, a wait on each handle in turn,
`CloseHandle`, and a handler in each thread procedure, which, with an overflow forced, set its
result to `-1` and let the other thread's line print unchanged. The page now gives a thread
procedure the signature `CreateThread` calls: a `Function` taking one `LongPtr` and returning a
`Long`.

**6. The fresh-clone steps put their precondition after themselves.** Round 10's fix told a
reader to remove the compiler packages from a clone "before step 1" --- in a paragraph after
step 3. UC-66's answer put the removal after the import, where it no longer prevents the dead
copy round 10 measured. *Fixed*: it is step 1.

## Tier 3 --- the answer exists and the reader cannot reach it, or it does not exist

**7. `${IdePath}` is not among the Build Output Path variables** on Project Settings, though every
add-in sample uses it; UC-72's evaluator flagged it as possibly unsupported. Measured: it is the
installation folder, written as `...\bin\..`. *Fixed*, with a pointer to finding 4.

**8. Project Settings put eight ids and three classes on the wrong headings.** Found while
re-measuring a rank: the search result for *Register DLLs to HKLM* links to
`#typelib-auto-increment`. Each `{: #... }` line on the page stood after a blank line, and
kramdown applies such a line to the next block, so `#show-run-procedure` was on *Runtime Windows
Codepage*, `#enable-aslr` on *PE File Image Base Address (Win32)*, and *Register DLLs to HKLM*
had lost its own id. Nothing links to the ids yet; the IDE help add-in will. *Fixed*: each line
is under its heading. Three reference pages --- `Attributes`, `Date`, `Time` --- attach an id to
the paragraph under a heading the same way, which lands on the right place and was left.

**9. Left open.** The per-user add-in folder the Add Ins page mentions still has no path: the
IDE hands the compiler `%APPDATA%\twinBASIC\addins`, and whether it loads from there is
WIP.HelpAddin.md's P6, which needs a DLL placed where the user's own IDE would load it --- not
run. Phrasings that still miss: `rebuild twinproj from exported files`, `version control
twinbasic project`, `export project every time it is saved`, `sort array with comparison
function`, `return larger of two values`, `WaitForMultipleObjects`, and round 10's finding 11.

### The fix, measured on the readers' words

The evaluators' phrasings, against this round's snapshot of the index and the rebuilt site. The
target is the section written for the case, which did not exist before:

| case | query | before | after |
|---|---|---:|---:|
| UC-70 | `exit code errorlevel` | miss | 2 |
| UC-70 | `Console.WriteLine ExitCode` | miss | 3 |
| UC-70 | `set exit code End process` | miss | 6 |
| UC-70 | `command line arguments` | miss | 8 |
| UC-70 | `print to stdout console app` | miss | miss |
| UC-71 | `run code on two threads and wait for both to finish` | miss | 1 |
| UC-71 | `thread wait join` | miss | 2 |
| UC-71 | `run two calculations in parallel on separate threads` | miss | 7 |
| UC-72 | `rebuild addin` | miss | 1 |
| UC-72 | `addin build failed error code 32` | miss | 8 |

`print to stdout console app` ranks *Is Console Application* 5th and *Console Applications* 6th,
and both link to the new section; `stdout` alone ranks it 3rd. UC-72's `add-in for twinbasic
ide` still ranks the Add Ins page 1st, which now names Sample 10 and says what a Standard DLL
lacks.

## The harness

**10. A search refused once was taken for a search that does not exist.** See *The session as
evidence*. *Fixed*: the protocol's search section says to run `site-search` as a command of its
own, and that chained after a `cd` or piped it is refused. Both re-runs searched first. The
refusal itself is right --- the allow rule is the whole of the evaluator's shell --- so the fix is
the sentence, not a wider rule.

**11. Executed console programs need a real console.** `WriteConsole` writes nothing to a pipe,
which is the very behaviour UC-70 turned on, so the programs were run in a hidden console of
their own and the screen buffer read through `AttachConsole` --- a PowerShell script, for the
same reason `scripts/lib/tb-launch.ps1` is one. Two traps on the way: the harness's environment
sets `NoDefaultCurrentDirectoryInExePath`, so `cmd.exe` would not find a program in its own
folder without `.\`; and in a pipe to `find`, the PATH that Git Bash hands down found MSYS's
`find` before Windows', which listed a drive. The protocol records the method.

**12. The executed cases' runner owned the registry tidy**, as round 10's finding 17 asked, and
every run left the IDE's lists as found. The protocol says so now.

**13. Two of 29 `tbrun` builds failed with `[TYPELIB] failed to finalize typelibrary. Disk
error?`** and built on retry, unchanged. Not isolated; queued nowhere, since there is nothing narrowed to
report. Round 10's unexplained `check_examples` wedge (its finding 16) may or may not be the same
thing.

## Corrections --- evaluator claims amended

**UC-55's** split discoverability, search 3 and navigation 4, is recorded as 3: two of its four
phrasings still miss the page.

**UC-66's** discoverability, split search 2 and navigation 3, is recorded as 3: its first query
ranks the section 3rd, and the page is three hops from the welcome page. Its actionability is
amended from 4 to 3: followed in its own order, it imports the clone before removing the
compiler packages (finding 6).

**UC-69's** report puts `create ActiveX DLL twinBASIC` at rank 1; it is 4th. Its discoverability of
4 stands on its three other queries, each at rank 1.

**UC-70's** actionability is amended from 2 to 1: as handed over, the tool prints nothing in any
case and always exits 0. Its first run, scored 1/1/2 without a single search, is not in the
tables.

**UC-72's** completeness is amended from 3 to 2 and its actionability from 3 to 2: the page told it
that the one setting it lacked was automatic, and as handed over the add-in does not compile.
With the reference added, everything it predicted happened.

**UC-65, UC-71 and UC-72** each report that Channel 3 was not needed; their sessions hold two, one
and one full-text searches. Their scores stand, from the ranks and the links.

## What round 11 says about the method

**Discoverability is flat across a fix pass for the second time, and for the same reason.** Round
5 found it: the pages a fix writes are right, and the next evaluator's words still miss them.
Round 10's fixes titled two sections for their readers' exact phrasings, and those phrasings now
rank them 1st; the re-runs used other words. The fair measure is the one that holds the words
still, and on round 10's own queries it moved from 4 hits of 36 to 21.

**A page's claim that something is automatic is the claim to test first.** UC-72's evaluator read
the tbIDE page correctly, found the one thing it needed to do, and was told not to do it. The
executed case is what turned a sentence that read as reassurance into 18 compile errors.

**The template is not the answer, and a page that points at it inherits its limits.** The
Console App template's `Console` class writes to a console window, which is what a template needs
to show; a command-line tool needs its output redirected. The fix documents a mechanism of the
project's own rather than a defect in the template, which is there for convenience.

**Evaluators infer the absence of a tool from one refusal.** Nothing in the protocol said the
search box could be refused; two of nine evaluators concluded it was missing, and neither the
refusal nor the conclusion appeared anywhere but the session. The digest's flag is what caught it.

## Method

Corpus built at `4a67e09` with `eval/build_corpus.mjs`: 988 readable files and 291 stubbed
unreadable, 262 binary omitted; `WIP.md`, the twenty `WIP.*.md` files and the ten prior use-case
reviews withheld. The search index was snapshotted with it --- 3,815 entries, 80.2% reference,
4.1% developer docs --- and every case queried the snapshot. The smoke run's six checks passed on
2.1.280, for $0.06; the nine cases then ran in parallel through `eval/run_case.mjs`, goals
verbatim from the tables, and UC-70 and UC-71 again after the protocol fix. The nine scored runs
cost $2.61, from $0.15 (UC-69) to $0.67 (UC-70); all eleven, $3.52.

Executed runs used `scripts/tbrun.mjs` on BETA 983, four lanes on ports 9911--9914, from one
process holding `startTidy`: UC-65, UC-67, UC-71 and UC-71b, UC-69's DLL and two callers for each
bitness, three UC-70 builds, the probes behind findings 2, 3 and 5, and the fix pass's two
examples. Command-line programs ran in a hidden console through a PowerShell script reading the
screen buffer. UC-72 ran through `scripts/addin_test.mjs` with a temporary lane on port 9931, and
the rebuild and two-copies probes on 9941--9942, each in a private copy of the install that was
deleted afterwards. A probe agent answered finding 1's question about the References dialog on
9951--9959. `%APPDATA%\twinBASIC\addins` held no DLL before, during or after.

## What to do next

**1. Round 12.** Re-run UC-70, UC-71 and UC-72 against their new sections, executed again, and
UC-66 against the reordered steps. Re-run this round's queries against round 12's index.

**2. P6**, with the user's go-ahead, so the Add Ins page can give the per-user folder's path;
and the add-in rebuild loop without closing the IDE (P9), which would give readers a shorter one.

**3. Still open:** the master list of run-time error numbers; the IDE section's empty headings,
75 now, 56 of them on Project Settings --- finding 1's probe read the dialog's own description
of every setting, which is the material to fill them from; `check_run`; the phrasings in
finding 9; and the transient `[TYPELIB]` failure.

## Outcome

**Every finding is fixed, except those left open in finding 9 and the transient build failure
of finding 13.** The documentation carries findings 1--8, the protocol and `eval/README.md`
findings 10--12.

`build.bat`, `check.bat` and `test.bat` are green: 914 pages, 0 broken links and 0 integrity
findings in both real trees, 0 accessibility violations, every toolchain probe passing. The
book tree's informational broken links are 32, up from 31: the new one is the link from
*Console Applications* on Project Types, a page the book includes, to *Is Console Application*
in the IDE section, which it leaves out. The samples on the seven pages the round changed or
re-ran compile (`check_examples`, 37 samples). The two new examples are byte for byte what was
executed: the command-line tool at a command prompt, in a console window, redirected, piped and
with a quoted file name, and the threads in 32-bit and 64-bit builds and with an overflow
forced.

The work is three commits on `staging`: the protocol fix, the documentation fixes, and this
review with round 11's goals. Nothing is pushed.
