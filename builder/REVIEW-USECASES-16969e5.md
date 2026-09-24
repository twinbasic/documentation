# Use-case review, round 10 --- an IDE route a fix pass closed, a DLL the pages could not call, and a search box that froze, at `16969e5`

Branch `staging` · reviewed 2026-09-24 · 9 cases

The tenth round of [the harness in `eval/`](../eval/README.md), and the third with isolated
evaluators. It ran the five re-runs round 9 named: UC-55 against its export command, UC-62
against the Git section's new warning, and UC-63, UC-64 and UC-65 against their fixes, executed
again. It added the fresh-clone case round 9 asked for, UC-66, and opened three surfaces no case
had read: delegates used as callbacks (UC-67) and a UTF-8 text file (UC-68), both executed, and a
Standard DLL called from Excel VBA (UC-69), built and called. The corpus was built at `16969e5`,
round 9's last commit. The [Round 10 section of eval/usecases.md](../eval/usecases.md) records
the goals verbatim.

## Verdict

**Round 9's own fix closed the route UC-62 asks for.** Its warning in the Git section --- use
the tB executable or the script, "not the IDE's File → Export Project" --- is right about every
danger it names. It still told a reader who had asked for the IDE route that there was none.
UC-62 fell from 3/3/3 to 2/4/2, the first time since round 4 that a fix pass has damaged what it
touched, and only a re-run could show it. The IDE route works. Its rebuild half, New Project →
*Import from folder...*, was on no page, and following UC-66's answer one step past where it
stopped showed what that half needs: an export that still holds the compiler packages rebuilds
into a project carrying a dead copy of them, which every later save writes back into the
repository; and after a pull, the next save puts the IDE's copy of the project back over it.

**The new surfaces were accurate where the pages spoke, and silent where the reader got hurt.**
Four of the five executed programs ran as their evaluators predicted, and the fifth did once
its function was put in a module. The failures were in what no page said: a
twinBASIC DLL called from VBA garbles every string it takes or returns, cannot be loaded by
64-bit Office in the build a new project makes, and is written under a name the answer's
`Declare` does not use. And one page said too much: a delegate's signature, promised as checked
at compile time, is only a warning, and a mismatched function receives its arguments mangled.

**And the search box can freeze the page.** Re-measuring an evaluator's query ran the replica of
the site's search out of memory. The site's own script does the same: three Windows API names it
does not index froze the page for 5.1 s at 1.6 GB of heap, and four for over a minute.

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
| **round 10 (9 cases)** | **3.00** | **3.33** | **2.78** |

Per case. The scores are the evaluators' own except where verification changed them, which is
in bold and explained under *Corrections* below:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-55 *(site, re-run)* a project in Git, and a rebuild script | 4 | 3 | **3** | pass on the set hazards; its export command again has no `--overwrite` |
| UC-62 *(site, re-run)* a project in Git, kept from the IDE | 2 | 4 | 2 | pass; the route it was asked for reads as forbidden |
| UC-63 *(site, re-run)* port a VBA error handler --- **executed** | 4 | **3** | 4 | pass; ran as predicted |
| UC-64 *(site, re-run)* call the Windows API --- **executed** | **3** | 4 | 3 | none known; ran as handed over |
| UC-65 *(site, re-run)* a generic function and a generic class --- **executed** | 3 | 4 | **2** | none known; did not compile as handed over |
| UC-66 *(site)* rebuild a project kept by the IDE, from a fresh clone | 3 | 4 | 3 | pass on the pages' hazards; the rebuild it names keeps a dead copy of the compiler packages |
| UC-67 *(site)* pass a function as an argument --- **executed** | **3** | 2 | 3 | none known; ran as predicted |
| UC-68 *(site)* write and read back a UTF-8 file --- **executed** | 3 | **3** | 4 | none known; ran as predicted |
| UC-69 *(site)* a twinBASIC DLL called from Excel VBA --- **built and called** | 2 | 3 | **1** | three that no page knew: strings, bitness and the file's name |

### The re-runs

| case | round 9 | round 10 |
|---|---|---|
| UC-55 project in Git | 4 / 4 / 3 | 4 / 3 / 3 |
| UC-62 Git from the IDE | 3 / 3 / 3 | 2 / 4 / 2 |
| UC-63 error handler, executed | 3 / 3 / 4 | 4 / 3 / 4 |
| UC-64 Windows API, executed | 2 / 3 / 3 | 3 / 4 / 3 |
| UC-65 generics, executed | 3 / 4 / 3 | 3 / 4 / 2 |
| **mean** | **3.00 / 3.40 / 3.20** | **3.20 / 3.60 / 2.80** |

UC-63 and UC-64 gained what round 9's fixes gave them. UC-62 lost a point on two axes to one of
those fixes. UC-65 lost one to its own composition, not to the page. All nine cases ran on the
model and Claude Code build of rounds 8 and 9, `claude-sonnet-5` through 2.1.280.

## A discoverability fix, measured on the same queries

Round 9's own queries for the five re-run cases, word for word, against round 9's snapshot of
the index and this round's:

| case | round 9's queries | hits, round 9 index | hits, round 10 index |
|---|---|---:|---:|
| UC-55 | `rebuild project file`, `keep project in git plain text`, `export import tool command line`, `twinproj text format tbproj` | 1 of 4 | 1 of 4 |
| UC-62 | `git integration`, `auto commit on save`, `version control settings`, `export project on save git` | 2 of 4 | 2 of 4 |
| UC-63 | `On Error GoTo error handling`, `array index out of bounds error`, `divide by zero error number`, `Format function`, `division by zero floating point` | 1 of 5 | 0 of 5 |
| UC-64 | `call Windows API from twinBASIC`, `GetComputerName`, `GetWindowsDirectory`, `GetTickCount`, `computer name windows folder system uptime`, `Declare statement`, `LongPtr string buffer API`, `WinDevLib` | 3 of 8 | 6 of 8 |
| UC-65 | `generic function largest of two values`, `generic stack class`, `Of type-variable-list` | 2 of 3 | 2 of 3 |

**9 of 24 to 11 of 24.** UC-64's three new hits are *Functions that return a string* and the
WinDevLib link, both round 9's. UC-63's lost hit is the trade round 9 made on purpose: retitling
the error table for error 9 took `subscript out of range` from 23rd to 1st and pushed
`divide by zero error number` from 3rd out of the top ten. This round's UC-63 found the table
with `subscript out of range`, at rank 1; its other three queries missed.

This round's own 51 queries rank the same against both indexes except for three:
`subscript out of range`, a miss and then 1st; `clone repository rebuild twinproj`, 5th and then
4th; and UC-64's `GetComputerName GetWindowsDirectory GetTickCount`, 1st now, which could not be
measured against round 9's index at all. It ran the search replica out of memory there, because
round 9's index held none of the three words. That was finding 1.

## The session as evidence

**UC-66 found its answer by full-text search and reported that it had not.** Having read the
welcome page, it grepped the corpus three times --- `git|source control`, `\.twinproj`,
`export.*project` --- opened the four pages that turned up, the File menu, Project Settings, New
Project and Import/Export, and grepped twice more, for *Import from folder* and the export
settings. Its first site search was its 14th call. Its report says Channel 3 was not needed.
Scored from what can be checked, its discoverability stands: its first query ranks the Git
section 1st, and that section is three hops from the welcome page. But
the part of the answer it most needed, how the IDE rebuilds its own export, was on no page, so
no channel could have reached it (finding 7).

**Four other flags were smaller.** UC-62's grep looked up a search result's anchor; UC-63's
was refused; UC-64 grepped for `GetTickCount` after finding its tutorial, and its report owns a
full-text search; UC-65 grepped for `ReDim Preserve` while composing its class.

**Navigation was measured from the links, with `eval/nav_hops.mjs`,** and agrees with the
reports except in two places. UC-65 reached the Generics page by directory listing in what it
called two hops; by links it is three. UC-69 reported Project Types two hops from the welcome
page; it is three, through the Project Configuration index.

**Every rank an evaluator reported was re-measured against the round's snapshot --- 51 queries,
all as reported.**

## The executed cases

Each ran through `scripts/tbrun.mjs` on BETA 983, in the `console` template, with the
evaluator's code verbatim, bare procedures wrapped in a `Module` block as round 9 did, and a
`[RunAfterBuild]` Sub beginning `Debug.Cls` in place of the reader's click.

**UC-63 ran as predicted**: `2.50`, `no such position`, `cannot divide by zero`. Its `Case 9,
-2147352565` came from the table round 9 retitled.

**UC-64 ran as handed over**, printing the computer's name, `C:\WINDOWS` and the uptime. Its
`GetTickCount64` declaration, which it composed from the `Declare` page because no page names
the function, worked first time.

**UC-65 did not compile as handed over.** Its first file put `Max(Of T)` outside any module,
above a `Module Demo` block: TB5182, *Syntax error. No handler for this symbol*, seven times,
then TB5079 at each call. Wrapped in the `Module MaxDemo` its own comment names, it printed
` 25 `, ` 3.5 ` and `banana` --- the prediction, less the sign spaces round 9 also noted. The
Generics page's `Max` sample is a bare function, beside samples that are whole files (finding 10).

**UC-67 ran as predicted**: the five names alphabetically, then by length, with the two
two-letter names in their original order. **UC-68 ran as predicted**: `Zoë - 3 characters`,
`Łódź - 4 characters`, `東京 - 2 characters`. The file it wrote is UTF-8 without a byte-order
mark and with CRLF line ends, as the `Open` page says `utf_8` writes.

**UC-64 and UC-67 first failed on the harness, not on their code.** Both declare a `Sub Main`,
and so does the template's `tbxMain.twin`. Two `Main`s compile, which is all `examples.bat`
asks, but a build fails binding the startup object: *'Main' is ambiguous*. The template's
comment said a second `Main` "builds as written" (finding 14). Without the template's file both
ran as above.

**UC-69 was built and called** --- see finding 5. Its DLL is the Standard DLL template's settings
and the evaluator's module; its caller is a twinBASIC project using plain `Declare`, which
converts strings to and from ANSI as VBA's does, in place of the Excel macro. Excel itself was
not driven: its *Trust access to the VBA project object model* is off, and it stays off.

## Tier 1 --- the site does something harmful, or says something the product does not do

**1. The search box froze the page on a query whose words the site does not index.** When a
query matches nothing, just-the-docs searches again, allowing each word an edit distance taken
from the length of the whole query: `Math.round(Math.sqrt(input.length / 2 - 1))`, which is 5 at
49 characters and 6 at 70. lunr's fuzzy expansion grows exponentially with that distance.
Measured in headless Chromium against the built offline site, by pasting into the search box:

| query | characters | distance | result |
|---|---:|---:|---|
| `GetTickCount64` | 14 | 2 | no result in 7 ms |
| `GetTickCount64 GetSystemTimes` | 29 | 4 | no result in 117 ms |
| `GetTickCount64 GetSystemTimes GetDiskFreeSpaceExW` | 49 | 5 | no result after 5.1 s, 1.6 GB of JS heap |
| `GetTickCount64 GetSystemTimes GetDiskFreeSpaceExW GlobalMemoryStatusEx` | 70 | 6 | no answer within 60 s |

A reader of the Windows API tutorial pasting a few function names is exactly who types that.
It was found because `eval/site_search.mjs`, which replicates the query logic, ran out of a
4 GB heap re-measuring UC-64's query against round 9's index. *Fixed*: the distance is capped at
2, in the vendored `just-the-docs.js` and in the replica. That changes nothing for a query of 15
characters or fewer, where the formula gives at most 2; the two long queries above now answer in
about 10 ms, and a misspelled query still falls back: `recieve bytez frum serail` returns 1,636
results at distance 2 where it returned 3,027 at 3. Pasted into the rebuilt offline site in the
same browser, the 49- and 70-character queries answered in 8 ms.

**2. The pages promised a delegate's signature is checked, and a mismatch is only a warning.**
The *Delegate* reference said a delegate "adds compile-time signature checking when it is
assigned, passed, or called". Found by the fix pass while writing UC-67's section, and
re-measured: a function taking an **Integer**, assigned to a delegate whose parameter is a
**Long**, builds with warning TB0026, *Mismatched delegate type*, and no error, and called with
70000 it receives 4464. The same page's syntax line made **Public** and **Private** optional; a
**Delegate** with neither is TB5182, and a **Public** one in a class is TB5227, *Delegate
declarations in class modules must be Private*. *Fixed* on both Delegate pages, with
`[EnforceErrors(TB0026)]` as the way to make the mismatch an error.

## Tier 2 --- hazards the pages did not know

**3. A project rebuilt from an export that holds the compiler packages keeps a dead copy of
them, and every save writes it back.** UC-66's answer rebuilt the fresh clone with the script,
which round 9 had documented as the way and measured as compiling. Measured this round with the
IDE's own *Import from folder* over DevTools, on scratch folders:

- a project with *Export Path* `${SourcePath}\src` and *Export After Save* on, saved once,
  exported 478 files into `src`, 475 of them the compiler packages `VB`, `VBA`, `VBRUN` and
  `AppGlobalClassProject`;
- imported from that `src` and saved beside it, the project is 4,222,833 bytes. From the same
  `src` with `Packages` removed it is 4,207 bytes, compiles with no errors, and its next save
  exports the full 478 files again;
- a function added to the copy of `VBA` in `src\Packages` and called from the project is
  TB5079, *Unrecognized symbol*: the compiler uses the IDE's own package;
- the next save exported `139 folders, 954 files`, against `72 folders, 479 files` for the
  original, and the file in `src\Packages\VBA` held the added function. The export writes both
  copies to the same paths, the project's last.

So after an IDE update, a repository kept this way goes on committing the package source of the
IDE that first exported it. Every compiler package a project references gets a folder, named
after the package's own project: the WebView2 sample references `WebView2Package` and
`WindowsControlsPackage`, and exported `VB`, `VBA`, `VBRUN` and `WebView2Package`, because
`WindowsControlsPackage` is the VB package. The project's `Settings` marks each such reference
`"isCompilerPackage": true`; nothing inside the folder does. *Fixed*: the Git section for the
IDE keeps the compiler packages out of the repository, and says to delete them from a clone that
has them before importing (finding 7). The product side extends round 9's queued entry.

**4. With the IDE keeping `src`, the next save undoes a pull.** Every save empties `src` and
writes the project the IDE has open, and the IDE's project is the `.twinproj`, which Git does
not hold. Measured: a change written into `src` as a pull would, then the project opened and
saved, and `src` held the IDE's version again, the pulled change gone. The fix pass derived
this and flagged it unmeasured; it was measured before the section went in. *Fixed*: the section
says to save and commit before pulling, and to open the project from `src` again after it.

**5. A twinBASIC DLL called from VBA fails three ways, and no page said so.** UC-69's answer
exported `AddNumbers` and `Greet` with `[DllExport]` and declared them in VBA with plain
`Declare ... Lib "MathGreetLib.dll"`. Built from the Standard DLL template's settings and
called:

- **Strings.** `AddNumbers(2, 3)` printed ` 5 `. `Greet("Ann")` came back as 17 characters,
  `H`, NUL, `e`, NUL ... then `Ann`: a VBA `Declare` converts a `String` argument to ANSI on the
  way in and the result from ANSI on the way out, so the DLL's Unicode text is read as bytes.
  The pattern that works leaves the DLL as it is: declare the argument and the result
  `LongPtr`, pass `StrPtr(name)`, and take over the returned string with `RtlMoveMemory`. That
  printed `Hello, Ann`, and `Hello, Zoë Łódź 東京` for text outside the ANSI code page.
- **Bitness.** A new project builds win32, and 64-bit Office --- Excel on this machine is 64-bit
  Microsoft 365 --- cannot load it: from a 64-bit process the win32 build fails with
  `BadImageFormatException` (0x8007000B). Switched to win64 by the toolbar's build
  configuration box, driven over DevTools, the same project built an x64 DLL whose two exports
  worked from 64-bit PowerShell.
- **The file's name.** The template's *Build Output Path* is
  `${SourcePath}\Build\${ProjectName}_${Architecture}.${FileExtension}`, so the file is
  `MathGreetLib_win32.dll` or `_win64.dll`, not the `MathGreetLib.dll` the answer declares.

*Fixed*: *Calling a Standard DLL from VBA or Excel*, a `##` on the Project Types page, with the
bitness, the full path and the pointer pattern; the build configuration box documented on the
Toolbar and 64-bit pages; *Build Output Path* and *Build Type* filled in on Project Settings from
the IDE's own descriptions. The pattern's text outside the ANSI code page is described rather than
quoted: the site's fonts do not cover CJK, and the page is in the book.

**6. UC-55 again exported without `--overwrite`.** Round 9 put the command with `--overwrite`
into step 2 of *Keeping a project in Git*, for "every other export". Step 2's first sentence,
about the first export, gave no command, and this round's evaluator took one from the Usage
example, which has no `--overwrite`, and never mentioned later exports. Measured:
`export --overwrite` into a folder that does not exist gives a tree identical to a plain export,
and `... DONE`. *Fixed*: step 2 gives one command for every export.

## Tier 3 --- the answer exists and the reader cannot reach it, or it does not exist

**7. The IDE route to Git: round 9's warning closed it, and its rebuild was on no page.** New
Project's *Import from folder...* was a bare list item. In the IDE's code it shows a *Browse For
Folder* dialog, "Select folder of the existing twinBASIC project...", and imports the folder as a
new, unsaved project; the first save asks for a file name. Saved beside `src`, the project's
`${SourcePath}\src` resolves to the clone's own folder, and every save updates it again ---
measured. *Fixed*: *Keeping a project in Git from the IDE*, a `##` beside the command-line
section: the two settings, the layout, a `.gitignore` for the compiler packages, the
`.twinproj` and the build folder, committing after a save, the fresh clone, and reopening after
a pull. The warning keeps its dangers and points there. The File menu's *Packing the export back
into a project* and a new *Import from folder* section on the New Project page describe the
import.

**8. No page said how to build for 64-bit, where a build goes, or what Build does.** The toolbar's
build configuration box was one list item and an image's alt text; `64bit.md` says twinBASIC
compiles 64-bit and not how; *Build Output Path* and *Build Type* were empty headings; File →
Build had no description. *Fixed* on those pages and the File menu. The box's keys are CTRL+F1 and
CTRL+F2, the IDE remembers the choice for each project, and the box has a third entry,
**safeMode**, described from the IDE's own text.

**9. Delegates are not found by the reader's word for them.** UC-67's `callback function as
argument` and `pass function as parameter` both missed; `delegate`, a word the reader did not
know yet, found the pages at ranks 1 and 2. No example showed a delegate as a procedure
parameter. *Fixed* with *Passing a function as an argument or parameter (callbacks)*, a `##` on
the Features page with an executed example; the title was chosen by its rank on the reader's
two queries, 1st for both, where the shorter *Passing a function as an argument (callbacks)*
was 1st and 2nd.

**10. The Generics page's `Max` sample did not show where it goes** (UC-65). The rule is on the
*Module* page: a `.twin` file needs the explicit block. *Fixed*: the sample is a whole file, a
`Module` holding `Max` and the three calls the prose describes. Four other compiled samples on
the page are still bare declarations, three procedures and a generic `Type`.

**11. Left open.** `array index out of bounds error` and `division by zero` still miss the error
table (UC-63); UC-64's `GetTickCount64` and `system uptime` miss, which is Microsoft's to
document; `auto commit on save`, `version control settings` and `rebuild project file from
source files` still miss the Git sections; and round 9's finding 9.

### The fix, measured on the readers' words

The fix pass's phrasings, against this round's snapshot of the index and the rebuilt site:

| case | query | before | after |
|---|---|---:|---:|
| UC-67 | `callback function as argument` | miss | 1 |
| UC-67 | `pass function as parameter` | miss | 1 |
| UC-67 | `callback` | miss | 3 |
| UC-66 | `import from folder` | miss | 1 |
| UC-62 | `git integration IDE` | 1 | 1, the new section |
| UC-69 | `Excel VBA declare function DLL` | 2 | 1 |
| UC-69 | `build 64-bit DLL` | miss | 1 |
| UC-69 | `win64` | miss | 3 |

`open project without twinproj file` stays 7th, for the New Project page rather than its new
section.

## The harness

**12. `nav_hops.mjs` could not run on a corpus,** because it imported the Markdown walker from
`--src`, where `build_corpus.mjs` leaves scripts as stubs; and **Git Bash turned its patterns
into Windows paths**, `^/tB/Core/Open$` into `^C:/Program Files/Git/tB/Core/Open$`, so every
target reported as unreachable. *Fixed*: the walker comes from the repository, and a pattern
that arrives as a drive-letter path is refused with the reason.

**13. The search replica had no guard** against finding 1, and a run that re-measures an
evaluator's queries died with it. It carries the same cap as the site now.

**14. The console template's comment said a second `Sub Main` builds.** It compiles, and a build
fails (see *The executed cases*). *Fixed* in `test/example-projects/console/Sources/tbxMain.twin`.

**15. The harness built only the architecture the IDE last used**, win32 for a new project, so
round 9's 64-bit claim went unmeasured and this round's win64 DLL was built by a scratch probe
that set the toolbar's box over DevTools before clicking Build. *Landed since*, in `a46fd3f`:
`tbrun` and `tbbuild` take `--arch win32|win64`, and the registry tidy sweeps the remembered
target, the `targetArchitectureMemory` setting, which the probe's entry had to be removed from by
restoring a backup.

**16. A `check_examples` run by the fix pass wedged for more than ten minutes** on one lane,
with nothing listening on its port; its processes were ended and the rerun was clean. The cause
was not isolated. The fix pass suspected a CDP call with no timeout; the tooling merged in
`a46fd3f` gives every CDP call one.

**17. The executed cases ran four `tbrun` lanes from a script that did not own the registry
tidy**, which `scripts/lib/tb-registry.mjs` says one process per run must; the IDE's recent list
was left holding one probe project 19 times, and was swept by the tidy's own prefix rule.

## Corrections --- evaluator claims amended

**UC-55's** actionability is amended from 4 to 3, as in round 9: its export command has no
`--overwrite`, and it never says to export again after a change (finding 6).

**UC-63's** discoverability is amended from 2 to 3: `subscript out of range` ranks the table
first, *On Error* ranks third for `On Error GoTo` and points to it, and by links the table is two
hops from the welcome page.

**UC-64's** completeness is amended from 2 to 3, on round 9's reasoning: the signature it could
not find is Microsoft's to document, and what twinBASIC's pages owe was there. The code ran as
handed over.

**UC-65's** actionability is amended from 3 to 2: the code as handed over does not compile.

**UC-66's** report says Channel 3 was not used; the session shows five full-text searches before
the first site search. Its scores stand, discoverability from the rank and the links.

**UC-67's** completeness is amended from 2 to 3: every mechanism its code used is documented,
and the one step it inferred --- a delegate as a parameter --- compiled and ran as the rules
imply. Its discoverability of 2 stands (finding 9).

**UC-68's** split discoverability, search 2 and navigation 4, is recorded as 3.

**UC-69's** actionability is amended from 2 to 1: as handed over, the macro declares a file that
the build does not write, in a bitness 64-bit Office cannot load, and the greeting comes back
garbled.

## What round 10 says about the method

**A fix pass can close a route, and only a re-run shows it.** Round 4 found six of its fourteen
findings introduced by round 3's fix pass, seven hours old. Round 9's warning is the first since:
every sentence of it true, and the reader who asked for the route it warned about concluded the
route did not exist. A warning is a fix that subtracts, and it needs the same re-run as one that
adds.

**The product findings came, again, from going one step past the answer.** UC-66's answer
stopped at a rebuilt project that compiles; the next save is where the stale copy goes back into
the repository. UC-69's answer stopped at a macro; calling it is where the strings garble, and
building it is where the file's name and bitness come from.

**Measuring with the site's own logic inherits the site's defects**, and that is the reason to
do it. The search replica was written to return exactly what a reader's search returns; it
returned exactly what a reader's search does to a long, unindexed query.

**The fix pass measures too, and its briefs can be wrong.** Two findings came from the fix
agents rather than the evaluators: the delegate warning, met while executing the callback
example, and the pull that a save undoes, derived, flagged as unmeasured, and then measured.
The brief for the Git pages said the WebView2 sample's export had no folder for
`WindowsControlsPackage`, which was true and misleading --- that reference is the VB package ---
and the page repeated it until the diff was read against the export's own `Settings`. The
protocol's advice to verify rather than comply cuts both ways: the orchestrator has to verify
what it dispatches, too.

**The evaluators ran on `claude-sonnet-5` through Claude Code 2.1.280**, passed with `--claude`
because the `claude` on `PATH` had become 2.1.212; the smoke check passed on both. Nine cases
cost $2.21 --- a mean of $0.25, from $0.15 (UC-55) to $0.42 (UC-69) --- and the smoke runs $0.04
on 2.1.280 and $0.13 on 2.1.212.

## Method

Corpus built at `16969e5` with `eval/build_corpus.mjs`: 988 readable files and 279 stubbed
unreadable, 262 binary omitted; `WIP.md`, the twenty `WIP.*.md` files and the nine prior use-case
reviews withheld. The search index was snapshotted with it --- 3,808 entries, 80.3% reference,
4.1% developer docs --- and every case queried the snapshot. The smoke run's six checks passed on
both Claude Code builds; the nine cases then ran in parallel through `eval/run_case.mjs`, goals
verbatim from the tables.

Executed runs used `scripts/tbrun.mjs` on BETA 983, ports 9811--9816: UC-63, UC-64, UC-65 as
handed over and wrapped, UC-67 and UC-68, then UC-64 and UC-67 again without the template's
`Main`; UC-69's DLL, its caller as handed over, and the pointer pattern. The win64 build ran on
9817 through a scratch probe that sets the build configuration box over DevTools, and its DLL
was called from 64-bit PowerShell. The IDE probes --- a save with *Export After Save*, *Import
from folder* on a clone with and without `Packages`, a marker in the embedded `VBA`, the
WebView2 sample's export, and a save after a change to `src` --- ran on 9831--9836 through
`root.loadProjectFromFolder()` and `root.saveProjectAs()`, on scratch folders, with the IDE's
registry entries swept by prefix and its remembered build architectures restored from a backup.
The delegate probes ran through `tbbuild` and `tbrun` on 9840--9842. The fix pass's own runs
used 9850--9879. The search timings used headless Chromium through the repository's puppeteer,
on `_site-offline/` and on the rebuilt offline tree.

## What to do next

**1. Round 11.** Re-run UC-62 and UC-66 against the Git-from-the-IDE section, UC-69 against the
DLL section, UC-67 against the callback section, and UC-55 against the single export command.
Re-run round 10's queries against round 11's index, as this round did. Measure a case in Excel
itself if a person can run the macro; the harness cannot.

**2. With `tbrun --arch win64`, merged in `a46fd3f`**, re-measure the Windows API tutorial's
claim that a `Long` pointer fails in 64-bit mode, and UC-69's pointer pattern in a 64-bit
twinBASIC caller.

**3. Still open:** the master list of run-time error numbers; the IDE section's empty headings,
76 of them, 57 on Project Settings, after this round filled two; `check_run`; the Generics
page's four remaining bare samples; and the phrasings in finding 11.

## Outcome

**Every finding is fixed, except the misses left open in finding 11.** The documentation
carries findings 1--10, in two commits; the site's search carries finding 1; the harness carries
12--14, and 15--16 landed with the tooling merge the round was rebased onto. The product side of
finding 3 extends round 9's queued entry in `BUGS-TO-REPORT.md`, with the dead copy measured.

`build.bat`, `check.bat` and `test.bat` are green on the rebased tree: 914 pages, 0 broken links
and 0 integrity findings in both real trees, 0 accessibility violations, every toolchain probe
passing. The book tree's informational broken links are 31, up from 23: all eight new ones lead
from this round's Features pages, which the book includes, into the IDE section, which it leaves
out. The samples on the three pages whose samples changed compile (`check_examples`, 14
samples), and the callback example printed what the page shows.

The work is seven commits on `staging`, rebased onto `a46fd3f`: the search fix, the harness,
the defect queue, round 10's goals with this review's draft, the documentation fixes in two
parts, and this review. Nothing is pushed.
