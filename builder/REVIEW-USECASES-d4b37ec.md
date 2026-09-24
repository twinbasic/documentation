# Use-case review, round 9 --- the re-runs find their sections, and an IDE export that cannot be packed back, at `d4b37ec`

Branch `staging` · reviewed 2026-09-24 · 11 cases

The ninth round of [the harness in `eval/`](../eval/README.md), and the second with isolated
evaluators. The seven re-runs round 8 named --- UC-55, UC-59, UC-60 and UC-61 against its fixes,
UC-14, UC-15 and UC-16 against the three `##` sections written for them --- and four new site
cases: UC-62, the Git case round 8 asked for, kept **with the IDE's Export Project**; UC-63, a
VBA error handler that tests `Err.Number`; UC-64, the Windows API; and UC-65, generics. Four of
the eleven were executed. The corpus was built at `d4b37ec`, round 8's last commit, and the
[Round 9 section of eval/usecases.md](../eval/usecases.md) records the goals verbatim.

## Verdict

**The seven re-runs gained a full point of discoverability, and the same queries show why.**
Round 5 measured three re-runs across a fix pass and found discoverability moved ±0.00; this
round's seven moved +1.00. Round 8's own fourteen queries for the three repository cases hit
their answer twice against round 8's index and eleven times against this one, and the only
change in between is three `##` sections titled in the words of the task. **The new cases'
findings came, again, from running what the evaluators handed over.** The IDE's Export Project
writes the compiler packages into its export, and the tB executable cannot pack that export
back into a project, so the IDE route UC-62 set up cannot be rebuilt from a fresh clone with the
supported tool. A re-export without `--overwrite` leaves every changed file stale and exits 0,
and UC-55's answer re-exports without it. The Windows API tutorial typed a string pointer as
`Long`, against its own table.

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
| **round 9 (11 cases)** | **3.55** | **3.45** | **3.55** |

Per case. The scores are the evaluators' own except where verification changed them, which is
in bold and explained under *Corrections* below:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-55 *(site, re-run)* a project in Git, and a rebuild script | 4 | 4 | **3** | pass on the set hazards; its re-export leaves changed files stale |
| UC-59 *(site, re-run)* a base class and two derived classes --- **executed** | 4 | 4 | **3** | pass; the code as handed over did not compile |
| UC-60 *(site, re-run)* shared modules as a package, and how a fix reaches its users | 4 | 3 | 4 | pass |
| UC-61 *(site, re-run)* a run-time error in a loop, then step through the rest | 4 | **3** | 4 | pass |
| UC-14 change the site's body typeface *(re-run)* | 4 | 4 | 4 | pass |
| UC-15 did one link checker quietly check less *(re-run)* | 4 | 4 | 4 | n/a |
| UC-16 a CSS rule that works in both themes *(re-run)* | 4 | 3 | 4 | pass |
| UC-62 *(site)* a project in Git, kept from the IDE | 3 | **3** | **3** | pass; the rebuild it names fails with the tB executable |
| UC-63 *(site)* port a VBA error handler --- **executed** | 3 | **3** | 4 | pass; ran as predicted |
| UC-64 *(site)* call the Windows API --- **executed** | **2** | **3** | **3** | none known; ran as handed over |
| UC-65 *(site)* a generic function and a generic class --- **executed** | 3 | 4 | 3 | none known; ran as predicted, less two spaces |

Split by protocol:

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| repo cases, round 8 (UC-56, 57, 58, 06, 14, 15, 16) | 3.86 | 3.14 | 3.71 |
| repo cases, round 9 (UC-14, 15, 16) | 4.00 | 3.67 | 4.00 |
| site cases, round 8 (UC-50, 54, 55, 59, 60, 61) | 3.33 | 3.33 | 2.83 |
| site cases, round 9 (UC-55, 59, 60, 61, 62, 63, 64, 65) | 3.38 | 3.38 | 3.38 |

### The re-runs

| case | round 8 | round 9 |
|---|---|---|
| UC-55 project in Git *(site)* | 4 / 3 / 3 | 4 / 4 / 3 |
| UC-59 inheritance, executed *(site)* | 3 / 4 / 2 | 4 / 4 / 3 |
| UC-60 package and its fixes *(site)* | 3 / 3 / 3 | 4 / 3 / 4 |
| UC-61 run-time error, then step *(site)* | 2 / 2 / 2 | 4 / 3 / 4 |
| UC-14 body typeface | 3 / 1 / 3 | 4 / 4 / 4 |
| UC-15 link-checker parity | 4 / 3 / 4 | 4 / 4 / 4 |
| UC-16 CSS in both themes | 4 / 2 / 4 | 4 / 3 / 4 |
| **mean** | **3.29 / 2.57 / 3.00** | **4.00 / 3.57 / 3.71** |

**Every re-run reached completeness 4, and none fell on any axis.** All seven ran on the same
model and Claude Code build as round 8 (`claude-sonnet-5`, 2.1.280), under the same isolation, so
the difference is the fix pass's.

## A discoverability fix, measured on the same queries

A re-run's evaluator types different queries each time, so its rank says whether *it* found the
answer, not whether the fix made the answer findable. Round 8's queries for the three repository
cases, re-run word for word against round 8's snapshot and this round's:

| case | round 8's queries | hits, round 8 index | hits, round 9 index |
|---|---|---:|---:|
| UC-14 | `change the site font`, `body font`, `webfont`, `typeface`, `change the body font on the site`, `self-hosted font` | 0 of 6 | 4 of 6 --- ranks 3, 5, 1, 3 |
| UC-15 | `link checker`, `link checker coverage`, `did I break the link check` | 0 of 3 | 3 of 3 --- ranks 1, 1, 9 |
| UC-16 | `add CSS rule for both themes`, `dark mode CSS variable`, `custom CSS styling`, `theme CSS variables light dark`, `style a component for both light and dark theme` | 2 of 5 | 4 of 5 --- ranks 1, 6, 4, 6 |

**2 of 14 to 11 of 14**, and in each case the hit is the new section: *Changing a typeface*
(`Builder.md`), *Changing the link checker* (`Extending.md`), *Adding a CSS rule that works in
both themes* (`Authoring.md`). Round 5 renamed headings and moved discoverability ±0.00; round 6
found that a new section titled in the vocabulary of the problem is what moves it, and round 7
wrote three for symptoms. These three are for tasks, and they work the same way. Three queries
still miss: `webfont`, `self-hosted font` and `dark mode CSS variable`.

The site re-runs were re-measured the same way. Round 8's queries for UC-55, UC-59 and UC-60
rank exactly as they did against round 8's index. For UC-61, `run-time error highlighted line
yellow` and `runtime error stopped in loop` went from misses to 4th and 8th, both for the
section round 8 added, *When a run-time error stops the program*.

## The session as evidence

**Navigation is now measured from the links.** `eval/nav_hops.mjs`, added this round, walks the
links breadth-first from the welcome page or the README, resolving each against the page's
rendered URL as a browser does. It overturned one report outright: **UC-63** said pure
link-following stalled on a link "broken in three places", and the link works --- the table it
was after is two hops from the welcome page, through `Err`. Its permalink lookup, a grep anchored
with `$`, had failed on the corpus's CRLF line endings, which `eval/build_corpus.mjs` now
normalises to LF (finding 10). **UC-61, UC-55, UC-60 and UC-62 navigated partly by directory
listing**, which a reader of the published site does not have; by links, UC-61's answer is three
hops through the IDE section and two through the Assert tutorial.

**Three reports say Channel 3 was not needed, and the session has full-text searches.** UC-63
grepped the corpus for *Division by zero* to find `Divide.md`; UC-65 grepped for `Stack(Of`,
`Push` and `ReDim Preserve` while composing its class; UC-64 grepped for `WinDevLib`, and half
owned it. All came after the answer was found, and none changes a score. UC-62's flagged
grep was for the anchor of a search result, a lookup rather than a search. **UC-15 did not
navigate at all, and said so.** UC-55's report lists a query that was refused, not the one that
ran; both miss.

Every rank an evaluator reported was re-measured against the round's snapshot --- **44 queries,
all as reported.**

**The digest miscounted searches** (finding 11). It took `which site-search` for a query, and
counted refused calls in the total: UC-65's eleven queries were four.

## The executed cases

Each ran through `scripts/tbrun.mjs` on BETA 983, in the `console` template without its stage
module: the evaluator's files verbatim, procedures wrapped in a `Module` block, and a
`[RunAfterBuild]` Sub beginning `Debug.Cls` in place of the reader's click.

**UC-59 did not compile as handed over, and this time the page was not the cause.** The answer
copied the page's classes `Animal`, `Dog` and `Cat` and its routine `DemoAnimals`, which also
creates a `GuardDog` --- a class the answer pointed to but did not copy. As handed over: TB5079,
*Unrecognized datatype symbol 'GuardDog'*. With the page's `GuardDog` added, it printed exactly
what the answer predicted:

    Rex says: woof
    Rover says: WOOF!
    Misty says: meow

The answer's own two-class variant --- "drop the `GuardDog` line" --- printed `Rex says: woof`
and stopped, because `pets(1)` is then `Nothing`. The answer predicted two lines.

**UC-63 ran as predicted, and the unported routine shows why it had to change.** The evaluator
found *Error numbers that differ from VBA* and changed `Case 9` to `Case 9, &H8002000B`:

    valid positions (1,2): 2.50
    past end (4,9): no such position
    divisor zero (2,3): cannot divide by zero

The routine as given in the goal, unchanged, prints `past end (4,9): unexpected error
-2147352565` --- the hazard is real in this build, and the evaluator did not walk into it.

**UC-64 ran first time**, printing the computer's name, `C:\WINDOWS` and the uptime in seconds,
from `DeclareWide` declarations of `GetComputerNameW` and `GetWindowsDirectoryW` and a `Declare`
of `GetTickCount64 ... As LongLong`. The evaluator scored itself 1/2/2 because no page documents
those three functions; the twinBASIC part of the task was all there, but not the shape it needed
most (finding 4).

**UC-65 ran as predicted, except that the numbers print as ` 10 `, ` 7 ` and ` 3.5 `.** A
number is printed with a sign space before it and a space after it, which `Debug.md:40` states;
the evaluator never opened that page. Its generic `Max(Of T)` compares with `>`, which it
doubted would compile; it does, for **Long**, **Double** and **String** alike (finding 6).

## Tier 1 --- the documentation says something the product does not do

**1. `Tutorials/Windows-API.md:185-189`** declared `GetWindowTextW`'s text pointer as `ByVal
lpString As Long`. Line 155 of the same page gives **LongPtr** for `LPWSTR`, and line 160 says to
"always use `LongPtr` for handle and pointer parameters", because a `Long` "fails or crashes in
64-bit mode". Found while checking UC-64's answer against the tutorial; the evaluator used
`DeclareWide` instead and never met it. The harness builds only 32-bit, where a `Long` holds a
pointer, so the 64-bit failure was not measured; the corrected declaration was compiled and run.
*Fixed.*

## Tier 2 --- hazards the pages do not know

**2. A second export needs `--overwrite`, and the Git section never said so.** Its steps give the
`import` command in full and no `export` command at all, so UC-55's evaluator took the one in the
usage block, which has no `--overwrite`, and told the reader to export again after each change.
Measured with the tB executable: into a folder that holds an earlier export, `export` without
`--overwrite` prints `[EXPORT]  ERROR: output file already exists and --overwrite not set` for
each existing file, writes the files that are new, ends `... FAILED` and exits 0. The file edited
in the project kept its old contents; with `--overwrite` the same export ends `... DONE` and
updates it. The product side --- a refused export that still writes part of the tree --- was
already queued. *Fixed*: step 2 now gives the command, with `--overwrite` and the `... DONE`
check.

**3. The IDE's Export Project cannot be packed back into a project by the tB executable.** Its
export holds a `Packages` folder with the compiler packages --- `VB`, `VBA`, `VBRUN` and
`AppGlobalClassProject` for a project with the default references, 475 of the 477 files round 8's
export of a two-file project wrote. A `.twinproj` the IDE saved does not hold them: the tB
executable's `export` of one writes only the packages the project embeds. And the tB executable's
`import` stops at the first folder under `Packages\`, writes nothing and exits 999 --- exit 231
in Git Bash, which reports it modulo 256 --- so it can never rebuild a project from the IDE's
export. The standalone script can, into a 4,220,723-byte project that embeds its own copy of the
four packages, against 2,055 bytes for the same export with `Packages` removed; that project
compiles. UC-62's evaluator set up *Export After Save* into a `src` folder correctly --- never the
repository's top folder --- and then told the reader to rebuild "with the separate tB executable
or Node/Python script". No page connected the two facts, which were on different pages. *Fixed*
in *Export Project* and in the Git section's warning; queued, with a cross-reference from the 999
entry.

## Tier 3 --- the answer exists and the reader cannot reach it, or it does not exist

**4. The Windows API tutorial never showed a function that returns a string.** Most do it the
same way --- the caller passes a buffer and the function reports the characters it wrote --- and
UC-64's goal needed two. The tutorial's only string example was the `GetWindowTextW`
declaration of finding 1, with no call. The evaluator composed its buffers from a `wsprintfW`
example on the API Declarations page, and `GetComputerName` and `GetWindowsDirectory` returned
no search result at all. WinDevLib, which declares common APIs ready-made, is linked from the
64-bit and Windowless pages but not from the tutorial. *Fixed*: a `##` section, *Functions that
return a string*, with both usual ways the length comes back, executed; WinDevLib under *Where to
go next*. Both API names and `WinDevLib` now rank 1.

**5. The error-number table was not found by the name of the error.** A porter whose handler
says `Case 9 ' subscript out of range` searches for that: `subscript out of range` ranked the
table 23rd, behind scroll-bar *range* pages, and `error 9` 17th. UC-63 found it with `divide by
zero error number`, a query about a different error. Eight new headings were tried against the
real index and query logic, by swapping the entry's title and rebuilding the index in memory,
before one was chosen; the ranks below are the rebuilt site's:

| query | *Error numbers that differ from VBA* | *Error 9, Subscript out of range: numbers that differ from VBA* |
|---|---:|---:|
| `subscript out of range` | 23 | **1** |
| `error 9` | 17 | **4** |
| `Err.Number 9` | 2 | **1** |
| `error numbers VBA` | 1 | 3 |
| `error numbers differ` | 1 | 4 |
| `Err.Number different from VBA` | 1 | 3 |
| `porting error handling from VBA` | 2 | 10 |
| `divide by zero error number` | 3 | 14 |

A longer title costs the queries that match only its old words, so the change trades the second
half of the table for the first. The anchor is kept with an explicit id, since five pages link
to it. *On Error*, the first page a porter reads, pointed nowhere near the table, and now has a
note; it ranks 8th for `porting error handling from VBA`. *Fixed.*

**6. Generics: the body is compiled for each type, and no page said so.** UC-65's evaluator
doubted that `>` on a type parameter would compile, and the page gives nothing to settle it. It
does; and a type the body cannot handle is a compile error reported **in the body**, not at the
call: `Max(Of Collection)(c1, c2)` fails with TB5092, *Missing argument 'Index'*, twice, at the
`>` --- the message comes from `Collection`'s default member, `Item`. Nothing names the type or
the call. *Fixed* with an executed example; the diagnostic is queued.

**7. An override is final unless it is also `Overridable`.** UC-59's evaluator asked why the
page's `Dog` override repeats `Overridable` and `GuardDog`'s does not. Measured: a class that
overrides `Cat`'s `GetSound`, which is not marked `Overridable`, fails TB5068, *procedure is not
marked as Overridable*. The rule was on the `Sub`, `Function` and `Property` pages and not on the
Inheritance page the evaluator read. *Fixed.*

**8. The Features *Debugging* page did not point to the Debug menu**, where stepping and
run-time errors are covered; UC-61's evaluator noted that a reader searching for debugging lands
there and finds neither. *Fixed* with one sentence.

**9. Left open.** Three phrasings of referencing a package --- `reference a package in my
project`, `add a package reference`, `use a package in my project` --- miss, with the Add-Ins
pages on top; `library references` ranks Project Settings' section first, which points to the
Packages pages. And round 8's `webfont`, `self-hosted font` and `dark mode CSS variable` still
miss.

## The harness

**10. The corpus kept the checkout's CRLF line endings**, so a permalink grep anchored with `$`
matched nothing, and UC-63 reported a working link as broken three times. The repository stores
LF; the CR comes from a Windows checkout with `autocrlf`. *Fixed*: `build_corpus.mjs` writes
readable files with LF, through a `latin1` round trip that changes no other byte --- all 988
checked against their sources.

**11. The digest's search counts were wrong in three ways.** `which site-search` and `type
site-search` counted as queries; a refused call counted in the total; and the first site search
could be a refused one, which decides whether a full-text search came "before" it. *Fixed*:
only the search box in command position counts, by name or by a path to the shim; refused calls
are counted apart; the first search is the first that ran.

**12. Navigation had no mechanical measure**, so every hop count so far was a report's or was
checked by hand. *Added*: `eval/nav_hops.mjs`.

## Corrections --- evaluator claims amended

**UC-55's** actionability is amended from 4 to 3: its export command has no `--overwrite`, so
every export after the first leaves changed files as they were (finding 2).

**UC-59's** actionability is amended from 4 to 3: the code as handed over does not compile, and
its two-class variant stops after one line. The page it copied from runs as predicted. Its note
that `check_build` means the page's samples are *run* is overstated: they are compiled.

**UC-61's** split discoverability --- search 3, navigation 4 --- is recorded as 3, because its
navigation went by directory listing; by links it is three hops.

**UC-62** gave no actionability score; it is recorded as 3, for finding 3, and because the
answer never says where the `.twinproj` goes --- which matters, since an export into the folder
that holds it deletes it. Its split discoverability, search 2 and navigation 4, is recorded as 3.

**UC-63's** discoverability is amended from 2 to 3: the navigation stall was its own lookup
failing (finding 10), and by links the table is two hops. Its "broken link, repeated three
times" is withdrawn.

**UC-64's** scores are amended from 1/2/2 to 2/3/3. The signatures it could not find are
Microsoft's to document; what twinBASIC's pages owe --- the forms of `Declare` and `DeclareWide`,
**LongLong**, `Err.LastDllError` --- was there, and the code ran as handed over. Its claim that
WinDevLib is not reachable inside the corpus is right of the tutorial and wrong of the site: the
64-bit and Windowless pages link it.

**UC-65's** scores stand. Its predicted output lacks the spaces `Debug.md:40` documents.

## What round 9 says about the method

**A re-run measures the evaluator; the same queries measure the fix.** The seven re-runs' +1.00
discoverability is the evaluators' search, which varies; round 8's fourteen queries going from
two hits to eleven is the index, which does not. Both point the same way this round. The second
kind is the one to keep, and it takes a snapshot of each round's index --- round 8's was still on
disk.

**Run what the answer hands over, and its alternatives.** UC-59's main answer failed on a
missing class and its offered variant on a `Nothing` element; the page it drew on was correct.
Round 8's UC-59 failed because of the page. Both are actionability failures, and only running
the code tells them apart.

**The product findings came from following an answer one step further than the evaluator
went.** UC-62's answer stops at the setting; the fresh clone it implies is where the export
breaks. UC-55's stops at the first export; the second one is where the files go stale.

**The evaluators ran on `claude-sonnet-5` through Claude Code 2.1.280**, recorded in every case's
`.meta.json`. Eleven cases cost $2.85 --- a mean of $0.26, from $0.13 (UC-59) to $0.44 (UC-63) ---
and the smoke run $0.05.

## Method

Corpus built at `d4b37ec` with `eval/build_corpus.mjs`: 1,267 files, 988 readable and 279
stubbed unreadable, 262 binary omitted; `WIP.md`, the `WIP.*.md` files, `CLAUDE.md` and the
eight prior use-case reviews withheld. The corpus was built before finding 10's fix, with CRLF
line endings. The search index was snapshotted with it --- 3,807 entries, 80.3% reference, 4.1%
developer docs --- and every case queried the snapshot. The smoke run's six checks passed; the
eleven cases then ran in parallel, all through `eval/run_case.mjs`, goals verbatim from the
tables, round 1's three on the repository protocol they were first run under.

Executed runs used `scripts/tbrun.mjs` on BETA 983 on ports 9771--9775, four at a time, with
`tbbuild` on 9776 and `examples.bat` from 9790: UC-59 as
handed over, with the page's `GuardDog`, with the `GuardDog` line dropped, and a subclass of
`Cat` overriding `GetSound`; UC-63 as ported and as given; UC-64; UC-65, and `Max(Of Collection)`.
The two examples the fix pass added were run the same way before they were written, and every
`check_build` sample on the six changed pages that have one compiles (`examples.bat`, 29
samples). The
export measurements used `bin\twinBASIC_win32.exe` on scratch copies: a project packed from the
`console` template; round 8's IDE export and its `.twinproj`; and a copy of a project the IDE
had saved, which embeds WinDevLib.

## What to do next

**1. Round 10.** Re-run UC-62, UC-63, UC-64 and UC-65 against this round's fixes, and UC-55
against the export command. Write the fresh-clone case UC-62 stopped short of: a project kept
with the IDE's *Export After Save*, rebuilt on another machine. Re-run round 8's and round 9's
queries against round 10's index, as this round did.

**2. Still open from round 8:** the master list of run-time error numbers, the 59 empty IDE
sections, and `check_run`.

**3. The phrasings that still miss** (finding 9).

## Outcome

**Every finding is fixed or queued, except the misses left open in finding 9.** The
documentation carries findings 1--8; the harness carries 10--12; and two product defects are
queued in `BUGS-TO-REPORT.md` --- the IDE's export of the compiler packages (finding 3) and the
generic body's diagnostic (finding 6) --- with a cross-reference added to the 999 entry.

`build.bat`, `check.bat` and `test.bat` are green: 914 pages, 0 broken links and 0 integrity
findings in both real trees, 0 accessibility violations, every toolchain probe passing. The book
tree's informational broken links are 23, as before.

The work is committed in four commits on `staging`: the harness, the defect queue, the
documentation fixes, and this review with the round's records. Nothing is pushed.
