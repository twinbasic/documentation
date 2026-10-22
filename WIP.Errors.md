# twinBASIC Documentation --- Run-time errors per procedure

The plan for adding to every documented procedure, statement and operator the run-time errors
it raises, and for the tools that measure them. Prompted by a reader on Discord: no VB or VBA
reference answers *which errors can this raise*, and a reader writing an error handler needs
exactly that.

Like WIP.md, this file is not rendered through tbdocs.

## Where things stand (2026-10-22)

**Batches 0, 1 and 2 are done, reviewed by the owner, and committed on `staging`.** The
tooling, the central page and every page of the VBA `Strings` module are in place: 339 cases
in `errors/VBA.Strings.yml`, and a Common Errors section on 28 of the module's 30 pages.

**Batch 3, VBA `Conversion`, is done and committed on `staging`** (not pushed; 2026-10-21):
299 cases in `errors/VBA.Conversion.yml`, all agreeing with the data in twinBASIC 32-bit and
VB6 on BETA 1010, and a section on 23 of the module's 28 pages (CVar, Fix, Int and Nz raise
nothing of their own; the index documents nothing). No row is `bug: pending`, and no question
is open: the owner settled the last one (the width of a negative **Double**'s `Hex`, an
extension) on 2026-10-21.

Every difference from VB6 found so far has a reproducer. Filed upstream, under `bugs/filed/`
(2026-10-22): `redim-inverted-bounds-error`, `string-null-character`, and from batch 3
`val-suffix-overflow-no-error`, `error-function-above-65535`,
and `cdate-string-decimal-out-of-range`. (`hex-double-above-2-to-62` was withdrawn on
2026-10-22, owner: 64-bit VBA does the same; its reproducer is deleted.)
Still queued in BUGS-TO-REPORT.md, under `bugs/`: `database-compare-no-error`,
`instr-invalid-lcid-empty-string` and `strconv-east-asian-lcid`. Batch 3 also cites two
entries queued before it, `date-out-of-range-no-error` and `clnglng-2-to-63-no-overflow`,
whose HTML comments now name the Conversion pages too.

**Batch 4, VBA `Math`, is done and committed on `staging`** (not pushed; 2026-10-22): 132
cases in `errors/VBA.Math.yml`, all agreeing with the data in twinBASIC 32-bit, twinBASIC
64-bit and VB6 on BETA 1010, and a section on 15 of the module's 17 pages (ByteSwap raises
nothing; the index documents nothing). The owner ruled each difference a bug, and the three
are filed: `abs-minimum-widens-type` (twinbasic#2541), `trig-above-2-to-63` (Cos, Sin and Tan
in one report, #2539) and `round-null-negative-digits` (#2540). No row is `bug: pending` and no question is open.

**Batch 5, VBA `DateTime`, is done and committed on `staging`** (not pushed; 2026-10-22):
328 cases in `errors/VBA.DateTime.yml`, all agreeing with the data in twinBASIC 32-bit and
VB6 on BETA 1010, and a section on 17 of the module's 20 pages (Now and Timer raise nothing;
the index documents nothing). Seven differences are queued in BUGS-TO-REPORT.md, under `bugs/`:
`date-time-set-errors`, `dateadd-year-below-100`, `dateadd-date-out-of-range-overflow`,
`datepart-null-checks-interval`, `datepart-firstdayofweek-out-of-range`,
`datepart-firstweekofyear-out-of-range` and
`datepart-week-year-100` (a hang, so a WARNING by hand and not in the data). The owner
answered batch 5's questions on 2026-10-22 (*Batch 5 findings*). No row is `bug: pending`
and no question is open.

**Four runtimes: 64-bit twinBASIC answers to 64-bit VBA** (owner, 2026-10-22, after fafalone
pointed it out). `errors.mjs run` and `messages` now measure twinBASIC 32-bit (`tb`), twinBASIC
64-bit (`win64`), VB6 (`vb6`) and 64-bit VBA (`vba64`, run in 64-bit Access: `scripts/lib/vba.mjs`)
by default, for every file. Batches 2 to 5 and `Core.yml` were re-checked on BETA 1010: **all
1,109 cases agree with the data in all four runtimes** (1,005 of them run in 64-bit VBA), and
`messages` agrees in all four. See *The 64-bit VBA re-check* below.

The 64-bit VBA results are in the queued entries of BUGS-TO-REPORT.md (2026-10-22): nothing
of the re-check is left.

**In progress: batch 6a**, VBA `Information` and the non-interactive procedures of
`Interaction` (the owner split batch 6, 2026-10-22; 6b, the interactive ones, comes after).
Data, sections and page edits are committed (`71c9f42d`; `test.bat` passes, the build's link
check is clean): 302 cases, all agreeing in all four runtimes. The owner answered both
questions (2026-10-22, *Batch 6a findings*); the large numbers are an extension, done. **Now**:
the four bug entries the owner agreed (reproducers under `bugs/`, entries in BUGS-TO-REPORT.md,
the slugs in the data's `bug:` fields and in an HTML comment beside the RaiseEventByName
WARNINGs), then 6b.

## Owner's decisions

- **Data-driven** (2026-10-20). Each procedure's errors are data: the cases that raise them.
  The page section, the probe that measures them and the check that keeps them true are
  generated from that data. Hand-written tables cannot be re-verified on a new BETA.
- **Measured, not copied.** Every row is observed in twinBASIC and in VB6. Microsoft's pages
  are a source of cases to try, never of answers. A statement about VB6 names only what was
  run in VB6 (a `Long` array, not "any typed array").
- **Runtimes** (replaced 2026-10-22). Four, for everything: twinBASIC 32-bit, compared with
  VB6, and twinBASIC 64-bit, compared with **64-bit VBA, whose behaviour must be respected**
  (owner): a difference between twinBASIC 64-bit and 64-bit VBA is a bug, exactly as one from
  VB6 is, with a NOTE and a queued reproducer. (Before: twinBASIC 64-bit for operators and
  `Math` only, and no VBA.)
- **Scope.** `docs/Reference/Default/` (VBA, VB, VBRUN), `docs/Reference/Core/` (statements and
  operators) and `docs/Reference/Built-In/`. Not `Contributed/`.
- **Existing error prose moves into the tables.** A page that states an error in a sentence
  ("an *LCID* that is not a valid locale identifier raises error 5", "if *compare* is
  **Null**, an error occurs") loses the sentence when its table is written; what the sentence
  explains beyond the number goes into the row's *When*.
- **A difference from VB6 is a bug** (the owner's rule for bugs generally): the table states
  what twinBASIC does, a NOTE on the page states what VB6 does, and the difference is queued in
  [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md). Where VB6 has no counterpart (LongLong, twinBASIC
  additions), there is nothing to compare and nothing to file on that ground. **Ask the owner
  when twinBASIC accepts what VB6 refuses**: it may be an extension (2026-10-21: `Join` and
  `Filter` of a `Long` or `Double` array are, and so are `Hex` and `Oct` of any number in the
  `LongLong` range, with a negative non-integer type in the `LongLong` form; a NOTE in the
  page's prose, twinBASIC-only quiet cases, no `vb6:` row). The owner also ruled, for batch 3,
  that `Val` ignoring a suffix's range, `Error$` above 65535 and `CDate` out of range are bugs.
- **An error that only the test setup raises is not listed** (2026-10-22): 70 when the probe
  lacks the privilege to set the clock documents the setup, not twinBASIC. Nor is a NOTE
  written for it. An extension is decided the same way for every argument (2026-10-22):
  it may be one where its behaviour makes sense and has no bugs; otherwise it is a bug.
- **Content that twinBASIC and VB6 both contradict is the page's fault** (2026-10-21): it is
  commented out, not deleted, as `<!-- VBA: <why it is out> ... -->`, outside any table, so
  the VBA text is kept for docs that will one day switch between VB6, VBA and twinBASIC
  (WIP.Authoring.md, *twinBASIC deviations from VBA to flag*). The first were the
  `vbUseCompareOption` rows of six *compare* tables and two "**Null** is returned" sentences of
  String.

## What a page gets

A `## Common Errors` section (owner, 2026-10-21, on a reader's request) after the page's main
text and before `## Example`:

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *start* is less than 1, or *length* is negative |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Mid$** is given a *string* that is **Null** |

- The number is given in decimal and in VB hexadecimal, as a 32-bit **Long** (owner,
  2026-10-20): -2147467259 (`&H80004005`), 5 (`&H5`), in the table and in the VB6 NOTE alike.
- The number links to its row on the central page as `tb:Errors#<n>` (owner, 2026-10-21): the
  central page has `shortcut: Errors` in its front matter and its anchors are the bare numbers.
  How shortcuts work: WIP.Authoring.md, *Cross-section linking*.
- The message is `Err.Description` of the raised error (owner, 2026-10-20), in italics.
- *When* is a condition on the arguments or the state, in the reader's terms --- not the
  probe's expression. Name the form when only some forms raise (**Mid$**, **LCase$**).
- **What is listed**: what the procedure raises from its own arguments and state, and **any
  error a Null argument raises**, in the procedure or in converting the argument (owner,
  2026-10-21: which parameters convert is invisible to the reader; `Filter(Null, "a")`'s 13 is
  listed).
  **What is not**: errors anything can raise (7 *Out of memory*, 14 *Out of string space*, 28
  *Out of stack space*), errors in converting an argument to the type its page gives for the
  parameter (13 for a value of the wrong kind, 6 for a number outside that type's range, such
  as 2147483648 for a **Long**), and compile-time diagnostics (TB codes). The central page says
  this once. A 6 for a value inside the documented type's range is listed (`ChrB(256)`: the
  page says **Long**).
- The heading takes the level of the page's Example heading: `###` on the VBA and Core pages,
  which the build promotes to `##`; `##` on a page without an Example or See Also heading.
- Rows of a page that raise the same number are one table row, their *When* cells joined with
  `<br>` in the order of the data.
- A row where twinBASIC raises nothing and VB6 raises (`error: 0`, below) is a NOTE only.
- A procedure that raises nothing gets no section --- unless its absence is surprising enough
  to state (`none:`).
- The section is written between markers, so regenerating it replaces only it.

## The central page

[`docs/Reference/Run-time-Errors.md`](docs/Reference/Run-time-Errors.md), permalink
`/Reference/Run-time-Errors`, `shortcut: Errors`, under *Reference Section* in the nav and in
the book's *The Core Language* part after Compiler Constants. Hand-written: what the sections
list and leave out, how a number is written, the message rule, and a NOTE on `Err.Raise` of a
number without a message. Generated by `errors.mjs write`, between `<!-- errors-index: -->`
and `<!-- /errors-index -->`:

- a table, one row per number in `messages.yml`: the number, anchored by itself (`#5`,
  `#-2147467259`), its hexadecimal, its message (and `Error$`'s where it differs), and
  *Listed by*, a link (*22 pages*) to the number's line below, or `---`;
- a section *Pages that list each error*: a line per number some table names (twinBASIC's
  number, not the `vb6:` one), anchored `#listed-<n>`, its pages comma-separated and sorted by
  title (owner, 2026-10-21).

VB's numbers come first in order, then the HRESULTs in the order of their hexadecimal.
`check_errors.mjs` checks the index as it checks the sections, and that the page keeps its
shortcut.

What `errors.mjs messages` found (BETA 1010):

- **Every number from 1 to 65535 with a message of its own: 88, and twinBASIC 32-bit and VB6
  agree on every one**, for `Error$(n)` and for `Err.Description` after `Err.Raise n`. They
  are all in `messages.yml`, whether or not a table names them yet.
- **HRESULTs** are in `messages.yml` only when the data names one: -2147467259 so far. For
  these the two messages differ, and the file says `{ raised, error }`. The sections show
  `Err.Description` (owner: settled); showing `Error$(n)` instead would be a one-line change in
  `renderSection` (`.raised` to `.error`).
- **Differences from VB6 that batch 8 (`ErrObject`) should take up**, none queued yet (batch 3
  queued `Error$` above 65535, `error-function-above-65535`):
  `Err.Raise n` of a number from 1 to 65535 without a message of its own leaves
  `Err.Description` empty in twinBASIC below 747, and from 747 up gives the Windows system
  message of that number (*Page fault was a transition fault.* for 747); VB6 gives
  *Application-defined or object-defined error* (the central page says so in a NOTE).
  VB6's `Err.Raise` of a common HRESULT raises its own number instead (`&H80070057` raises 5,
  `&H80004001` 445, `&H80004002` 430, `&H80020003` 438, `&H80040154` 429, ...) and describes
  the rest as *Automation error* with the HRESULT's text on a second line; twinBASIC keeps the
  HRESULT and its text. `Err.Raise 65536` raises 5 in VB6, and `Error$(65536)` raises 6;
  twinBASIC raises 65536 as *Automation error*, and `Error$(65536)` is generic. twinBASIC's
  `Error$` of a few HRESULTs is VB's message (`Error$(&H80070057)` is *Invalid procedure call
  or argument*), VB6's is generic.

## Tooling

Their reference is on the Tools pages:
[`errors.mjs`](docs/Documentation/Tools-Defects.md#errorsmjs) and
[`check_errors.mjs`](docs/Documentation/Tools-Toolchain-Tests.md#check_errorsmjs).

- `errors/` --- the data: one YAML file per area (`VBA.Strings.yml`, `Core.yml`, ...) and
  `messages.yml`, each error number's message.
- `errors/harnesses/<name>.bas` --- the harnesses (*Harnesses*, below).
- `node scripts/errors.mjs run [<file.yml>] [--only <regex>]` --- builds one probe from the data
  per runtime, runs it, and compares each case with the data. All four runtimes by default
  (`--runtime tb|win64|vb6|vba64`, repeatable, picks some). By hand only: it needs twinBASIC,
  VB6 and 64-bit Office. A run of every file in all four takes a few minutes; one page about 15 s.
  `--only` is a plain regex (a leading `/` is read as a delimiter: write `Mid\.md$`, not `/Mid\.md`). A case a
  compiler refuses is reported and dropped, and the probe rebuilt. `generate <dir>` writes the
  probes without running them; `--keep` keeps the ones `run` built.
- `node scripts/errors.mjs write` --- writes each page's section and the central page's index.
- `node scripts/errors.mjs messages` --- measures `messages.yml` in twinBASIC 32-bit and VB6.
- `scripts/check_errors.mjs` --- the gate in `test.bat` and CI: data in order, every section
  what `write` makes of it, no section without data, the index current, the central page's
  shortcut. No runtime needed. A data problem makes `run` exit 2 with only "the data has
  problems"; `check_errors.mjs` names it.
- `scripts/lib/errors-data.mjs` --- what the two share (`renderSection`, `renderIndex`,
  `errorAnchor`, `CENTRAL_SHORTCUT`, `RUNTIMES`, `expected`, `runsIn`, ...).
- `scripts/lib/vba.mjs` --- `VbaSession`, 64-bit VBA. Its opening comment says why each part
  is as it is; in short: VBA has no host but Office (VBE7.DLL cannot be hosted without the
  vendor-only SDK); Access, not Excel, because Excel needs "Trust access to the VBA project
  object model", a security setting that is the user's; a PowerShell driver (as
  `-EncodedCommand`) started by `launchOnDesktop`, so Access's windows are on a private desktop;
  **one Access for the whole run** (owner: the overhead), taking jobs from `job.txt`, each a new
  database in its own folder, the module imported through the VBE, `Application.Run "Main"`, the
  module removed again (else closing the database asks to save it) and the database closed.
  A compile error is a VBE box that Run waits on; answering it does not free Run (the VBE stays in
  break mode), so any box ends that Access by its pid and the next job starts another (about 2 s).
  VBA compiles a Sub when it is first called, so the refused case is the first that did not
  report; the vba dialect's Main reports `start` first, so an error in the declarations is told
  apart. `findAccess64` reads Access.Application's LocalServer32 and checks the exe is x64.

How a probe runs a case: a `Private Sub C<n>()` of its own, `Dim Result As Variant`, the
case's `decl` lines, `On Error Resume Next`, its `setup` lines (an error there is reported as
a setup failure, not as the case's result), then `Result = <expr>` or its `run` lines, then
`case <n> <Err.Number> <Err.Description>`. twinBASIC: a tree for `tbrun --exe`, module
`Probe` with `Sub Main` and a `[RunAfterBuild]` that only prints, so the IDE run passes and
the exe runs the cases. VB6: `Probe.vbp` and `Module1.bas` through `runRepro`, appending to
`out.txt` line by line, so a case that kills the exe still leaves the ones before it. A case
that runs under a harness calls `<name>_Begin` before its `setup` lines and `<name>_End`
after its `run` lines (and before a setup failure is reported); the harness's code is in the
module once, before `Report`.

### The data format

```yaml
# errors/VBA.Strings.yml
beta: 1010                 # the BETA the data was last measured on; titles the VB6 NOTE
pages:
  Reference/Default/VBA/Strings/Mid.md:     # the page, as a path under docs/
    rows:                  # one table row each, in this order
      - error: 5           # the number twinBASIC raises
        when: "*start* is less than 1, or *length* is negative"   # the When cell
        cases:             # every case must raise `error` in twinBASIC
          - Mid("abc", 0)  # a string is an expression: Result = Mid("abc", 0)
          - Mid("abc", 1, -1)
      - error: 94
        when: "**Mid$** or **MidB$** is given a *string* that is **Null**"
        cases:
          - Mid$(Null, 1)
          - MidB$(Null, 1)
    quiet:                 # cases that must raise nothing; never shown on the page
      - Mid(Null, 1)
      - Mid("abc", 4)
  Reference/Default/VBA/Strings/InStr.md:
    rows:
      - error: 0           # twinBASIC raises nothing, VB6 raises: a NOTE, no table row
        when: "**InStr** is given a *compare* of 2 (**vbDatabaseCompare**)"
        vb6: 5             # what VB6 raises instead (0: nothing); writes the NOTE
        bug: database-compare-no-error   # a bugs/<slug> reproducer, or pending until queued
        cases:
          - InStr(1, "abc", "a", 2)
  Reference/Core/ReDim.md:
    rows:
      - error: -2147467259
        when: an upper bound is less than its lower bound
        vb6: 9
        bug: redim-inverted-bounds-error
        cases:
          - { decl: Dim X() As Long, run: ReDim X(0 To -1) }
          - { decl: Dim X() As Long, run: "ReDim X(5 To 4, 1)" }
    quiet:
      - { decl: Dim X() As Long, setup: ReDim X(3), run: ReDim Preserve X(5) }
  Reference/Default/VBA/DateTime/Date.md:
    harness: clock         # every case of the page runs under errors/harnesses/clock.bas
    quiet:
      - { run: "Date = #1/1/1601#\nclock_Expect #1/1/1601#, Null" }   # and checks the value
      - { run: "Date = 36526\nclock_Expect #1/1/2000#, Null", only: tb }
  Reference/Default/VBA/Strings/Join.md:
    quiet:
      - decl: Dim A(1) As Long          # block form for a case whose text holds commas
        expr: Join(A)
        only: tb                        # not run in VB6 (twinBASIC syntax, or an extension)
      - { expr: 'StrConv("a", 256)', only: tb }   # single quotes around double quotes
```

A case is an expression, or a mapping with `expr` or `run` (statements; a multi-line string
for several) and optionally `decl` (`Dim` lines), `setup` (statements before it),
`only:` and `harness: <name>` (also on a row or a page; a case takes its own, else its
row's, else its page's). **`only:`** names the runtimes a case runs in: `tb` (both twinBASIC
builds only: twinBASIC syntax, an extension, a twinBASIC addition), or a list holding `tb` and
one of `vb6`, `vba64`: `[tb, vba64]` for `LongLong` code (64-bit VBA has it, VB6 not),
`[tb, vb6]` for a case Access cannot answer for (vbDatabaseCompare, below).

What each runtime is expected to raise for a row (`expected` in errors-data.mjs): `tb` its
`error:`; `win64` its `win64:` if given, else `error:`; `vb6` its `vb6:` if given, else
`error:`; `vba64` its `vba64:` if given, else `vb6:`, else `win64:`, else `error:`. So a row
that differs from VB6 expects 64-bit VBA to agree with VB6, and every other row expects it to
agree with twinBASIC 64-bit; `vba64:` is written only where that is not so (refused when it
equals the default). A row where 64-bit VBA's number differs from twinBASIC 64-bit's needs a
`bug:`, as a `vb6:` row does. A row of `error: 0` needs a `vb6:` or `vba64:` other than 0 and
a `bug:`. **The NOTE** names both runtimes when they agree (*When ..., VB6 and 64-bit VBA
raise error N, ...; twinBASIC raises none.* / *..., instead.*), else one sentence each, the
VBA one compared with twinBASIC 64-bit; a row none of whose cases runs in 64-bit VBA says
nothing of it. **A row's `message:`** is twinBASIC's own `Err.Description` for its number,
where it is not the number's message in `messages.yml` (Array's destructuring form raises 5
as *expected an array*): the table shows it, and `run` checks it in twinBASIC. `run` does
not check an HRESULT's description in VB6 or VBA, which describe every HRESULT as *Automation
error* with Windows' text on a second line (`expectedDescription`). A page with no rows gets no section; one with `none: "<sentence>"` and
no rows gets a section holding that sentence. `messages.yml` maps each number to its message,
or to `{ raised: <Err.Description>, error: <Error$(n)> }` where they differ; `run` fails a
case whose `Err.Description` is not the `raised` text. A number a row names must be in the
file; a new HRESULT is added by hand and then measured with `errors.mjs messages`. A data page
must have `title:` and `permalink:` in its front matter.

### Harnesses

A harness is code a case runs under, for a procedure whose effect must not happen in a probe
(setting the system clock) or must be observed (the value it would set). It is one file,
`errors/harnesses/<name>.bas` (a lowercase name), **the same source for twinBASIC, VB6 and
VBA** (owner, 2026-10-22): module-level code that defines `Private Sub <name>_Begin()` and
`<name>_End()`, and whatever helpers its cases call (`<name>_...`). VB6 compiles only the
branch of an `#If` that is true, so `#If VBA7` holds what VB6 cannot parse (`PtrSafe`,
`LongPtr`; `VBA7` is true in twinBASIC and in VBA 7, and 64-bit VBA refuses a `Declare`
without `PtrSafe`, so never `#If TWINBASIC` for this), and `#If Win64` what differs in a 64-bit build; a pointer is kept in a
`Variant` between calls, and in a typed local for an `As Any` parameter (a `Variant` passed
`ByVal` to one passes the Variant). **A harness must refuse what the real thing refuses**: one
that accepts more hides errors (the clock harness first passed `Time$ = "24:00:00"`, which
Windows refuses). `check_errors.mjs` reports a harness the data names and has no file for.

- **`clock`** --- `Date`, `Date$`, `Time`, `Time$`. `clock_Begin` patches `SetLocalTime` and
  `SetSystemTime` (kernelbase and kernel32) with a jump to a function that records the
  SYSTEMTIME and succeeds where Windows would (it asks `SystemTimeToFileTime`, and fails with
  error 87 otherwise), and `AdjustTokenPrivileges`, which VB6 calls first and twinBASIC never
  does, with one that succeeds; `clock_End` puts the bytes back. The patch is of the probe's
  own exe, for one case at a time, and the real clock is never set. `clock_Expect Day, Clock`
  raises 1001 when the date part or the time part set is not the one given (`Null` skips
  it); it does nothing when the case has already raised. 32-bit and 64-bit; in 64-bit VBA it
  patches Access's own process for the case, and works (every Date and Time case agrees).
- **`registry`** (batch 6a) --- `SaveSetting`, `GetSetting`, `GetAllSettings`,
  `DeleteSetting`. A case names the application `registry_App`, `tbdocsErrorsProbe` and the
  process id (the four runtimes run at once), and `registry_Begin` and `registry_End` delete
  that application's whole key under `HKCU\Software\VB and VBA Program Settings` with
  `SHDeleteKeyW` (`DeleteSetting` raises 5 in VB6 and VBA for a key that has a subkey), keeping
  the case's error (raised again with its description once the key is gone), so nothing a case
  writes stays in the user's registry. A case's `setup` may save what it reads. Check after a run
  that no `tbdocsErrorsProbe*` key is left.

**YAML pitfalls**, each met in batch 2:

- **A flow list breaks on a comma inside a case**: `cases: [Mid(Null, 1)]` is two items. Use a
  block list (`- Mid(Null, 1)`) for any case with a comma; a flow list only for cases with none.
- Quote a case that holds `: `, starts with a quote, or sits in a `{ }` mapping and holds a
  comma; in a `{ }` mapping, a case holding double quotes goes in single quotes.

## How a batch runs

Read first: [WIP.Harness.md](WIP.Harness.md) (`tbbuild`, `tbrun`), [WIP.Build.md](WIP.Build.md)
(gates), [WIP.Authoring.md](WIP.Authoring.md) (page template, *Cross-section linking*,
*twinBASIC deviations from VBA to flag*), and `scripts/lib/vb6.mjs`'s opening comment
(driving VB6).

1. **List the batch's pages**, and for each read its syntax, parameters, settings tables and
   every sentence that mentions an error, **Null** or a limit.
2. **Explore first.** Write a temporary `errors/Explore.yml` that names the real pages and puts
   every candidate case under `quiet:`, then `node scripts/errors.mjs run Explore.yml`: each
   case's line shows what every runtime raised, `[tb 5, win64 5, vb6 5, vba64 5]`. Mark
   `LongLong` cases `only: [tb, vba64]`, not `only: tb`. A case VBA refuses costs an Access
   restart and a rebuild, and `run` gives up after 25 rebuilds: keep twinBASIC-only cases
   (`Bin`, `CType(Of ...)`, `ValDec`, `Shift*`) marked `only: tb` while exploring. Try, for every parameter:
   **Null**; 0, -1, -2; the upper limit and one past it (strings stop at 1,073,741,823;
   2147483647); a value just past a **Long** (2147483648#, which raises 6 and is not listed);
   an empty string; a 2-D array, an unallocated one and a typed one for an array parameter;
   **every value a settings table on the page lists**, and values between and beyond them
   (a *compare* above 1 is an LCID: 1033 is valid, 99999 is not). Probe a boundary from both
   sides before writing it. **Delete `Explore.yml` before committing.**
3. **Write the data** in the area's file, one row per condition, quiet cases for each
   boundary's passing side, then `node scripts/errors.mjs run <file> --only "<Page>\.md"` until
   it says *all agree with the data*.
4. **`node scripts/errors.mjs write`**, then edit the pages: remove each error sentence the
   table now carries; comment out, as `<!-- VBA: -->`, what both runtimes contradict; move a
   VB6 claim that the table's NOTE now makes. Check index pages (a module's `index.md`) for the
   same claims.
5. **A difference from VB6**: a row with `vb6:` (or `error: 0`), `bug: pending`, and either
   queue it yourself (`node scripts/bug_repro.mjs new <slug>`, the entry in
   BUGS-TO-REPORT.md, then the slug in the data) or list it for the owner. **Where twinBASIC
   accepts what VB6 refuses, ask the owner** whether it is an extension before queuing.
6. **Gates**: `build.bat` (0 broken), `node scripts/check_errors.mjs`, `test.bat`;
   `check.bat` once per batch. Commit on staging (the owner's choice for this work), one-line
   message, no Co-Authored-By trailer. **When another session shares the checkout, `git add`
   by path**, never `-A`, so its files are not swept into the commit.
7. Update *Where things stand* and the batch's row below, and list the questions for the owner.

What the probes must respect (BETA 1010; `errors.mjs` already does all of it):

- **Run cases in the built exe** (`tbrun --exe`), and print with `TbRun.Out`, which `tbrun`
  adds to the project: `Debug.Print` writes nothing in an exe. A `[RunAfterBuild]` run in the
  IDE reads every module-level variable as 0 once one initializer reads another module's
  variable (bug `module-init-reads-other-module-ide`), and may differ in other ways.
- **A `tbrun --exe` probe brings its own `Sub Main`**, without the console template's
  `tbxMain.twin`; two `Main`s make the build fail with *'Main' is ambiguous*.
- **Never `MsgBox`, `InputBox` or an unhandled error** in a probe: each opens a modal box on a
  private desktop. Every case runs under `On Error Resume Next`.
- **Keep the generated code plain.** A module-level or class-field initializer cannot call a
  procedure of the project, and a class field that reads another field fails the build (bug
  `class-field-init-reads-field`).
- **VB6 cannot compile twinBASIC syntax** (`LongLong`, `Return` in a function, inline `Dim x =`,
  generics), and has no counterpart for twinBASIC additions such as StrConv's `vbUTF8` (256).
  A twinBASIC-only case says `only: tb`.
- **One case can stop a whole project**: a compile error anywhere fails all of it. `run`
  builds a failing project again without the case named in the error.
- **A case that allocates near the string limit raises 14** (`String(1073741823, "a")` in
  32-bit): use it to show that the 5 above the limit is a check of its own, never as a row.

## Batch 2 findings (VBA `Strings`, BETA 1010)

Both runtimes agree unless said. The pages and data carry each of these; they are here so a
later batch knows what to look for.

- **`vbUseCompareOption` (-1) raises 5** in InStr, InStrRev, Filter, Replace, Split and StrComp,
  though VBA-Docs lists it: their rows are `<!-- VBA: -->` comments, and the module's index no
  longer offers it. Omitting *compare* still follows **Option Compare** where the page says so.
- **A *compare* above 1 is an LCID**: 3, 4, 1024, 1033 pass; 255, 65536, 99999 raise 5.
  `InStrB` ignores *compare*.
- **`vbDatabaseCompare` (2)**: InStr, Filter and StrComp take it as an LCID where VB6 raises 5
  (`database-compare-no-error`); Replace and Split take it in both.
- **The LCID check and empty strings**: twinBASIC's InStr checks it when a string is
  zero-length, VB6's does not (`instr-invalid-lcid-empty-string`); InStrRev, Replace and Split
  check it in both; StrComp checks it in neither when a string is **Null** or zero-length.
- **Limits**: Mid, Left, Right (not the B forms), String and Space raise 5 above 1,073,741,823
  characters; InStr raises 5 for a *start* above 1,073,741,824, InStrRev and InStrB do not;
  FormatCurrency raises 5 for *numDigitsAfterDecimal* above 255, FormatNumber and
  FormatPercent take 2147483647. Chr raises 5 outside 0--255 (on a code page that is not
  double-byte), ChrW outside -32,768--65,535, ChrB 6 outside 0--255.
- **Settings ranges** that raise 5: MonthName's *month* outside 1--12; WeekdayName's *weekday*
  outside 1--7 and *firstdayofweek* outside 0--7; Format's *firstDayOfWeek* outside 0--7 and
  *firstWeekOfYear* outside 0--3; FormatDateTime's *namedFormat* outside 0--4; the Format...
  functions' tristates other than -2, -1, 0 and *numDigitsAfterDecimal* below -1; Split's
  *limit* and Replace's *count* below -1; StrConv's unlisted values and any sum that combines
  vbUnicode, vbFromUnicode, vbUTF8 or vbFromUTF8 with another value.
- **Null**: every $ form raises 94 for a **Null** string where the Variant form returns
  **Null**; `String(3, Null)` raises 94 in twinBASIC only (`string-null-character`); the
  Format... functions return for a **Null** *expression*.
- **StrConv's East Asian conversions** (vbWide, vbNarrow, vbKatakana, vbHiragana) raise 5 on a
  system whose locale is not East Asian; given an East Asian *LCID* VB6 converts and
  twinBASIC still raises (`strconv-east-asian-lcid`).
- **Extensions** (owner): `Join` and `Filter` take a `Long` or `Double` array; VB6 raises 5 and
  13 for a `Long` one.

## Batch 3 findings (VBA `Conversion`, BETA 1010)

Both runtimes agree unless said.

- **What a C function lists**: 6 for a value outside its type (after rounding: `CByte(255.5)`,
  `CInt(32767.5)`; -0.5 rounds to 0 and passes), 13 for a string that is not a number, 94 for
  **Null**. Their parameter is any expression, so the conversion is their own work, and listed;
  13 for an argument of the wrong kind on a page that names a numeric parameter (`Fix("abc")`,
  `Str("abc")`, `CVErr("abc")`) is not. An **Error** value converts quietly in `CBool`, `CByte`,
  `CInt`, `CLng`, `CDbl` and `CStr`, and raises 13 in `Fix`, `Int`, `Hex`, `Str`, `Val` and
  `CDate`. An object argument (91 for **Nothing**) was left out: it is the default member's error.
- **Constants**: a probe of a `Double` boundary near 2^62 or 2^63 uses a variable (`X = 2 ^ 63`),
  never a literal: the constant 2^63 converts wrongly (`clnglng-2-to-63-no-overflow`), and a
  32-bit build can raise a late 6 after a constant overflow (`const-double-expression-after-overflow-32bit`).
- **`CLngPtr`**: its 32-bit row has `win64: 0` (`run --runtime win64 --only CLngPtr` checks it).
- **`CDate`** takes any number other than a **Decimal** with no error (`date-out-of-range-no-error`,
  VB6 6), a string holding such a number with none (VB6 13), and raises 6 for a **Decimal** (VB6
  13; both `cdate-string-decimal-out-of-range`). The page has a WARNING. `CVDate` raises 13 for
  all of these in both, and returns **Null** for **Null**.
- **`Val`**: 13 for a fraction with `%` or `&`; VB6 raises 6 for a whole number outside the
  suffix's type (`%`, `&`, `@`), twinBASIC returns it (`val-suffix-overflow-no-error`, owner: a
  bug). `ValDec` ignores the suffixes.
- **`Error`/`Error$`**: VB6 raises 6 above 65,535 (after rounding), twinBASIC returns a message
  (`error-function-above-65535`, owner: a bug; taken from batch 8's list). Negative numbers pass.
- **`CVErr`** raises 5 outside 0--65,535 (after rounding).
- **Extension** (owner): `Hex` and `Oct` take any number in the `LongLong` range, where VB6
  raises 6 outside a `Long`. A `Single` or `Double` of 2^62 or more in magnitude raises 6 in
  `Hex`, `Oct` and `Bin` (-2^62 itself passes); a `LongLong`, `Decimal` or string does not.
  64-bit VBA does both (the re-check, below), so neither is an extension nor a bug against it.
- **Extension** (owner, 2026-10-21): a negative `Single`, `Double`, `Currency`, `Decimal` or
  numeric string gives `Hex` 16 characters (`Oct` 22, `Bin` 64) in twinBASIC, the `LongLong`
  form; VB6 gives 8 (11), the `Long` form: `Hex(-1#)` is `"FFFFFFFF"` in VB6. A negative
  `Integer` or `Long` agrees. The Hex and Oct pages state it in their extension NOTE, and the
  tables give each type's width. Nothing to queue; not an error, so not in the data.

## Batch 4 findings (VBA `Math`, BETA 1010)

Both runtimes agree unless said; win64 agrees with win32 on every case.

- **Null raises 94** in Atn, Cos, Sin, Tan, Exp, Log, Sqr, Sgn, Rnd and Randomize, and as
  Round's *numdecimalplaces* or the Shift functions' *shiftamount*. Abs and Round return
  **Null** for a **Null** first argument.
- **Abs** keeps its argument's type, so the smallest `Currency` raises 6 in both. For the
  smallest typed `Integer` or `Long` VB6 raises 6 and twinBASIC returns a `Long` or a
  `Double` (`abs-minimum-widens-type`; the smallest `LongLong` gives a `Double` too). A
  `Variant` holding either widens in both.
- **Trigonometry past 2^63**: VB6 raises 5 for Cos, Sin and Tan from 9.223372E+18 in magnitude
  (found by bisection). twinBASIC returns a value up to 2^63; from 2^63 Cos and Sin return
  the argument itself, and Tan raises -2147348207 (`&H80021111`), *Automation error*, whose
  `Error$` is generic (`trig-above-2-to-63`; WARNINGs on Cos and Sin). The number is in
  `messages.yml`.
- **Limits**: Exp raises 6 above 709.782712893384; Log raises 5 for 0 or less (**Empty** and
  -0 included); Sqr 5 for a negative number (-0 passes). Rnd's 6 above the `Single` range is
  the conversion of its parameter, not listed.
- **Round**: 5 when *numdecimalplaces* rounds below 0 (-0.4 passes), and above 22 only for a
  `Single`, `Double`, `Date` or string *expression*; `Integer`, `Long`, `Currency`,
  `Decimal`, `Boolean` and **Empty** take any `Long`. VB6 raises 5 for `Round(Null, -1)`,
  twinBASIC returns **Null** (`round-null-negative-digits`); `Round(Null, 23)` is **Null** in
  both.

## Batch 5 findings (VBA `DateTime`, BETA 1010)

Both runtimes agree unless said.

- **A Calendar case must set `vbCalGreg` again.** In VB6 `Calendar = vbCalHijri` succeeds and
  stays, so every later case of the probe runs under the Hijri calendar and the VB6 column
  drifts. The data's cases end with `Calendar = vbCalGreg`. In twinBASIC every assignment
  raises -2147467259 and the compiler warns TB0009, *[Calendar] has not yet been implemented*.
  The owner chose not to report it (2026-10-22): its cases are `only: tb`, with no VB6 NOTE,
  and a NOTE by hand on Calendar and on the module's index says it is not implemented.
- **Setting the clock**: Date and Time run under the `clock` harness (*Harnesses*), so an
  accepted value raises nothing and `clock_Expect` checks what would be set; without it a
  probe has no privilege and every accepted value raises 70. **A 70 is never a row** (owner,
  2026-10-22: it documents the test setup, not twinBASIC). Neither runtime checks a date or a
  time it parses: both pass month 13 or February 30 to Windows, and Windows refuses them, and
  any date before January 1, 1601. Where Windows refuses, twinBASIC raises -2147467259 and VB6
  5. `Date = Null` and `Time = Null` raise 94 (VB6 13); `Date$` takes only *mm-dd-yyyy* and
  `Time$` only *hh:mm:ss* (VB6 also takes *m-d-yyyy*, *m/d/yyyy*, *mm-dd-yy*, *hh:mm*, *hh*);
  all in `date-time-set-errors`. Both read the string "0.25" given to `Time` as 0:25.
- **`Date =` and `Time =` of a number are an extension** (owner, 2026-10-22). twinBASIC reads
  the number, or a string holding one, as `CDate` does: whole days from December 30, 1899
  (`Empty` and `False` are that day, `True` the day before, being -1), `Byte`, `Long`,
  `Single`, `Currency` and `Decimal` alike, and 13 outside the range of dates. `Date` sets
  the date part and keeps the time of day; `Time` sets the time part of the `CDate` value
  (0.25 and 1.25 are 6:00, -0.25 and -1.25 too; 0.999999 rounds to 0:00 of the same day). VB6
  sets exactly the same for a **Date** value (`Time = CDate(1.25)` is 6:00), and raises 13 for
  a number. Each is a twinBASIC-only quiet case that checks the value, and a NOTE on Date and
  on Time says it. Checked in 32-bit and 64-bit.
- **The 13 rule**: a function whose parameter is "any expression that can represent a date"
  (Day, Month, Year, Weekday, Hour, Minute, Second, DatePart, DateValue, TimeValue) raises 13
  for a string that is not a date, a number outside -657434 to 2958465, and an **Error**
  value; **Null** returns **Null** in the part functions and raises 94 in DateValue and
  TimeValue (TimeValue's page said **Null** is returned: now a `<!-- VBA: -->` comment).
  DateValue refuses any number with a whole part (`DateValue(36526)` is 13), and a **Date**
  passes.
- **DateAdd and DateDiff raise 6** for a date number outside the range (VB6 13,
  `dateadd-date-out-of-range-overflow`). Listed, though the page gives the parameter as
  **Variant** (**Date**): it differs from VB6 and from the part functions.
- **DateAdd**: 5 for an interval that is not a setting (case-insensitive, no spaces) and for a
  result after 9999 or before year 100; with "yyyy", "q" or "m" a result in years 0 to 99
  becomes 1930--2029 silently (`dateadd-year-below-100`, VB6 5; a WARNING).
- **_firstdayofweek_ outside 0 to 7 is a bug** (owner: an extension only if it makes sense
  and has no bugs). Over every date of 1999 to 2001: a negative value acts modulo 7, but
  `DatePart("w")` takes 8 as 1 and 9 up as nothing at all (255 gives a weekday of -2),
  `DatePart("ww")` takes 8 and 9 as 1, `DateDiff("ww")` 8 to 13 as 1
  (`datepart-firstdayofweek-out-of-range`; WARNINGs on DatePart and DateDiff). VB6 checks it
  only where the interval uses it.
- **_firstweekofyear_ outside 0 to 3** gives, for every value tried (-15 to 2147483647), the
  same results as 0 and 1, which agree on this system (its own setting is January 1). That
  could be an extension, but whether twinBASIC takes it as 0 (the system's setting) or 1
  cannot be told apart here; the owner ruled it a bug (`datepart-firstweekofyear-out-of-range`).
- **DatePart**: `DatePart("x", Null)` raises 5, VB6 returns **Null**
  (`datepart-null-checks-interval`). `DatePart("ww", ...)` of January 1 or 2, 100 never
  returns with `vbFirstFullWeek` and returns -98980 with `vbFirstFourDays`
  (`datepart-week-year-100`; a WARNING). **A case that hangs stops the probe, and every
  later case reports `none`**: run a suspect alone before reading the cases after it.
- **DateSerial**: 5 when the date is outside January 1, 100 to December 31, 9999, after its
  two-digit-year reading (`DateSerial(-1900, 1, 1)` passes, -1901 raises); 6 above an
  **Integer** is the conversion, not listed. **TimeSerial** cannot reach a date outside the
  range with **Integer** arguments: its page's sentence saying it can is a `<!-- VBA: -->`
  comment.
- **`pageLevel`** now takes the level of the page's last Example or See Also heading, so Date
  and Time (an Example a level down under each property) get `###` like their See Also. Their
  sections were placed before See Also by hand, as markers; `write` fills them.

Owner's answers (2026-10-22): 1, `Date =` and `Time =` of a number are an extension; 2,
the week arguments may be extensions where they make sense and have no bugs; 3, Calendar is
not reported; 4, no 70 rows. Then: a *firstweekofyear* outside 0 to 3 is a bug.

## Batch 6a findings (VBA `Information` and non-interactive `Interaction`, BETA 1010)

Status (2026-10-22): **data, sections and page edits done and committed**:
`errors/VBA.Information.yml` and `errors/VBA.Interaction.yml`, 302 cases, all agreeing with the
data in all four runtimes; sections on 27 pages. **Left**: the owner's answers to the questions
below (bug grouping; large numbers in Partition and Choose), then each `bug: pending` row's
reproducer and entry in BUGS-TO-REPORT.md, and the `RaiseEventByName` crash's entry (the
WARNINGs on both pages are written; put the slug in an HTML comment beside each). Page edits
made: LBound/UBound's IMPORTANT no longer names error 9; the error sentences of DeleteSetting,
SaveSetting, CreateObject, GetObject and Switch went into the tables; Environ's "a zero-length
string is returned" for a missing position is a `<!-- VBA: -->` comment (both VB runtimes raise
5); Array's *RhsArray* no longer says it raises; QBColor's and RGB's parameters are stated as
**Integer**. twinBASIC 64-bit agrees with 32-bit on every case. The registry harness names the
application with the process id, since `run` probes the four runtimes at once and they shared
one key (a VB6 case failed when another runtime's cleanup removed its section).

- **twinBASIC raises -2147467259 (`&H80004005`, *Unspecified error*) where VB6 and 64-bit VBA
  raise 5, 9 or 13 for an argument the procedure refuses**: LBound/UBound's *dimension* out of
  range (VB 9), Switch with an odd number of arguments (5), Partition's *start* below 0,
  *stop* not above *start*, *interval* below 1 (after rounding) (5) and a string *number* (13),
  Environ's *number* of 0 or less (after rounding), `""`, **Empty**, **True**, and a position
  with no entry (5: the page's "zero-length string is returned" is wrong for both VB runtimes),
  GetObject() with no arguments (13), CallByName's *calltype* not 1 to 4 (VB 438) and an
  object of **Nothing** (5), and the four registry procedures' `""` *appname*, *section* or
  *key*, and DeleteSetting of a missing application, section or key (5). The same family as
  `date-time-set-errors` and `redim-inverted-bounds-error`. **Proposal for the owner**: one bug
  entry for the family. Above the VB `Integer` range VB raises 6 where twinBASIC raises
  -2147467259 (Environ's *number* from 32,768, LBound's *dimension* 32,768).
- **COM creation raises the raw HRESULT where VB maps it**: CreateObject of an unknown ProgID,
  a CLSID without `new:`, a number: -2147221020 (`MK_E_SYNTAX`); `new:` with an unregistered
  CLSID: -2147221164 (`REGDB_E_CLASSNOTREG`); `new:` with a malformed one: -2147221005
  (`CO_E_CLASSSTRING`); `""`: 5. VB6 and 64-bit VBA raise 429 for each. GetObject: a missing file
  -2147221014 (`MK_E_CANTOPENFILE`), with a class -2147467262 (`E_NOINTERFACE`) where VB raises
  432; an unknown class -2147221005 and no running instance -2147221021 (`MK_E_UNAVAILABLE`)
  where VB raises 429. A remote server that does not resolve: -2147023174 in all four; a
  `"notaprogid:xyz"` moniker: -2147221020 in all four. **Proposal**: a second bug entry.
- **CallByName raises DISP_E_ HRESULTs where VB maps them**: a wrong argument count
  -2147352562 (`DISP_E_BADPARAMCOUNT`; VB 450), a property given arguments it does not take
  -2147352559 (VB 451), and an error the COM member raises -2147352567 (`DISP_E_EXCEPTION`;
  VB raises the member's own number: Dictionary.Add of a key that exists 457, Remove of a
  missing key 32811, CompareMode set after an Add 5). `""` as *procname*: 438, VB 450. The
  page already has a NOTE for a twinBASIC member's constant Err.Raise; this widens it.
  **Proposal**: a third entry, or fold into the page's existing NOTE's bug.
- **A VBA Collection is not reachable through CallByName in VB6 or 64-bit VBA**: even
  `CallByName(C, "Count", vbGet)` raises 438 there (twinBASIC: 0). The data uses
  `Scripting.Dictionary`. Not queued: the VB runtimes' own limitation.
- **`RaiseEventByName` and `RaiseEventByName2` crash** (access violation, 32-bit and 64-bit)
  given an object that is not an event source (`Collection`, `Dictionary`); **Nothing** raises
  91. A crash cannot be a case: a WARNING by hand on both pages, and a bug to queue.
- **32-bit twinBASIC follows 64-bit VBA, not VB6, for large numbers**: Partition of a *number*
  or *stop* beyond a **Long** (VB6 6, twinBASIC and 64-bit VBA none); Choose of an *index* beyond
  the **Single** range (VB6 none, twinBASIC and 64-bit VBA 6). **Owner, 2026-10-22: a documented
  extension** ("tB can extend VB6"): the cases are `only: [tb, vba64]`, no `vb6:` and no bug,
  and each page has a NOTE in its prose saying what VB6 does.
- **Owner, 2026-10-22: the bugs are grouped as proposed**: one entry for the -2147467259 family,
  one for CreateObject's and GetObject's raw HRESULTs, one for CallByName's `DISP_E_` HRESULTs,
  and one for the RaiseEventByName crash. Progress (reproducers under `bugs/`, each a `tests`
  reproducer with a `vb6/` side, run and `repro.json` written; entries in BUGS-TO-REPORT.md
  not written yet unless ticked):
  - [x] reproducer `argument-errors-unspecified-error` (3 PASS controls, 17 FAIL), [ ] entry
  - [x] reproducer `createobject-getobject-raw-hresults` (3 PASS, 8 FAIL), [ ] entry
  - [x] reproducer `callbyname-dispatch-hresults` (3 PASS, 5 FAIL), [ ] entry. Narrowed:
    `latebound-hresult-mapping` (queued) already has `DISP_E_BADPARAMCOUNT` (450), so the
    wrong-count rows cite it; this entry is what is left: a COM object's own error reaches
    `CallByName` (any call type) and a late-bound property `Let` statement as -2147352567,
    though a late-bound method statement gets it right (`D.Add "x", 2` raises 457 in all four);
    and `""` as *procname* raises 438, VB 450.
  - [ ] `&H80020011` (`DISP_E_NOTACOLLECTION`, VB 451, for a statement too: `D.Count(1)`) goes
    into `latebound-hresult-mapping`'s table, with a test case in its reproducer
  - [ ] reproducer and entry `raiseeventbyname-no-events-crash`
  - [ ] the data's `bug: pending` replaced by the slugs; the WARNINGs' HTML comments
- **Agree in all four**: LBound/UBound of an unsized or erased array 9, of a **Variant** holding
  no array 13, *dimension* **Null** 94; QBColor outside 0 to 15 after rounding 5; RGB's negative
  component (after rounding) 5, above 255 taken as 255; Null 94 in QBColor, RGB, Choose's
  *index*, Environ, CreateObject, GetObject, CallByName, and every registry argument; Switch,
  IIf and If of a string that is not a Boolean 13; the Is* functions, TypeName, VarType,
  ObjPtr, StrPtr, IMEStatus, Erl and Command raise nothing.
- **twinBASIC-only**: RGBA's negative component 5; RGB_R/G/B and RGBA_A raise only 94 for
  **Null**; TranslateColor raises 5 for a high byte other than 0, 1, 2 or &H80, and for a
  system colour index above 30 (&H8000001E passes, &H8000001F raises); Array's destructuring
  form raises 5 for a right side that is not an array (**Null** too) and 9 for one with fewer
  elements or unsized; CallByDispId: an unknown DISPID 438, *calltype* outside 1 to 4 and
  **Nothing** -2147467259, a wrong argument count -2147352562.
- **Type of a parameter the page leaves out**: QBColor's and RGB's parameters are **Integer**
  in VB (32,768 raises 6 in all four): state the type on the page, and the 6 is then the
  conversion, not listed.

## The 64-bit VBA re-check (BETA 1010, Office 365 x64, VBA 7.1 VBE7.DLL 7.01.1158, 2026-10-22)

Batches 2 to 5 and `Core.yml` in all four runtimes. Every runtime agreed with the data as it
stood, apart from the cases that follow, and twinBASIC 64-bit agreed with 32-bit everywhere.

- **Every `vb6:` row: 64-bit VBA agrees with VB6.** So each existing bug holds against 64-bit
  VBA as well, and `write` now words those NOTEs *VB6 and 64-bit VBA raise ...* (17 pages).
  `Abs` of the smallest `Integer`/`Long` raises 6 in 64-bit VBA too (`abs-minimum-widens-type`).
- **`vbDatabaseCompare` (2)**: in Access, 64-bit VBA takes it (the database's sort order) and
  raises nothing for `InStr`, `Filter`, `StrComp`, as twinBASIC does; VB6 raises 5
  (`database-compare-no-error`). That is Access's own meaning, which VBA documents as
  Access-only, so Access cannot answer for VBA in Excel or Word: the three cases are
  `only: [tb, vb6]`, and the NOTEs stay VB6-only. Whether VBA outside Access raises 5 is left
  unchecked (owner, 2026-10-22: not worth it; Excel would need the VBA object-model trust
  setting, the user's).
- **`only: tb` cases 64-bit VBA can run**: `CLngLng` (13 cases), `CLngPtr` (10), `Hex` and `Oct`
  beyond a `Long` (15), `Round` of a `LongLong` (1) are now `only: [tb, vba64]`, and all agree:
  `CLngPtr` of 2^31 raises nothing in 64-bit VBA, as the rows' `win64: 0` say.
- **`Hex`/`Oct` in 64-bit VBA behave exactly as in twinBASIC**: the whole `LongLong` range, and
  a negative non-integer gives 16 (22) characters: `Hex(-1#)` is `FFFFFFFFFFFFFFFF`, `Hex(-1&)`
  `FFFFFFFF`. So the batch-3 "extensions" are 64-bit VBA's own behaviour; the Hex and Oct pages'
  NOTEs now say so. **And a `Double` or `Single` of 2^62 or more raises 6 in 64-bit VBA too**
  (`Hex(2^62)`, `Oct(2^62)`, `-2^62` passes). The filed bug `hex-double-above-2-to-62` said
  otherwise: **the owner withdrew it** (2026-10-22, closed upstream), its reproducer is deleted,
  and the Hex, Oct and Bin NOTEs are now unlabelled statements of the limit (*as in 64-bit
  VBA*; Bin, which VBA lacks, *as it does in Hex and Oct*).
- **`CLngLng(2 ^ 63)`, `CLngLng(9223372036854775808#)` and `CLngLng(9223372036854775807)` raise
  6 in 64-bit VBA**; twinBASIC returns the smallest `LongLong` (`clnglng-2-to-63-no-overflow`,
  queued): the bug is confirmed against 64-bit VBA, and the CLngLng WARNING now says so. Add
  this to the entry's text in BUGS-TO-REPORT.md (not done yet).
- **Extensions stay extensions, and 64-bit VBA sides with VB6**: `Date =`/`Time =` a number
  (13), `Join` of a `Long` array (5), `Filter` of one (13), `StrConv` 256/512 (5). Their hand
  NOTEs now say *VB6 and 64-bit VBA raise ...*. `Date = -657434` stays `only: tb` (it is a
  number). `Bin`, `CType(Of ...)`, `ValDec`, `Shift*` and `Calendar` do not exist in VBA.
- **`messages`**: all 89 numbers agree in all four runtimes.

### State of the work (committed on `staging`, 2026-10-22; `build.bat`, `check.bat`, `test.bat` pass)

Done:

- `scripts/lib/vba.mjs` (new), `scripts/errors.mjs` (four runtimes, `generate` writes
  `<dir>/vba`, the VBA refusal reading), `scripts/lib/errors-data.mjs` (`vba64:`, `only:` lists,
  `expected`, `runsIn`, `RUNTIMES`, the vba dialect, the NOTE wording; the file key `win64:` is
  gone), `scripts/check_errors.mjs` (probes for all of it), `errors/harnesses/clock.bas`
  (`#If VBA7`), `errors/VBA.Math.yml` (no `win64: true`), `errors/VBA.Conversion.yml` and
  `VBA.Math.yml` (`only: [tb, vba64]`), `errors/VBA.Strings.yml` (the three `[tb, vb6]` cases),
  `docs/Documentation/Tools-Defects.md` (the errors.mjs entry).
- `errors.mjs write` run: 17 pages' NOTEs regenerated. Hand NOTEs edited: Hex, Oct, Join,
  Filter, Date, Time, CLngLng.

Then (2026-10-22, done): **the 64-bit VBA results in the queued entries of
BUGS-TO-REPORT.md.** In every one 64-bit VBA does what VB6 does, and twinBASIC 64-bit what
32-bit does. Each entry's **Expected behavior** now says *as VB6 and 64-bit VBA ...*, and its
**Additional context** that a 64-bit build gives the same results and which VBA was used
(*VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access*), the way a later entry should
say it too. The entries: `clnglng-2-to-63-no-overflow` (the four constants and four controls,
checked by a VbaSession probe), `date-out-of-range-no-error` (its six cases and three controls,
by a probe), `date-time-set-errors`, `dateadd-date-out-of-range-overflow`,
`dateadd-year-below-100`, `datepart-firstdayofweek-out-of-range`,
`datepart-firstweekofyear-out-of-range`, `datepart-null-checks-interval`,
`instr-invalid-lcid-empty-string`, `strconv-east-asian-lcid` (all from the data's run), and
`datepart-week-year-100` (a probe: 52, 1, 52, 52; `bug_repro.mjs run --arch win64` hangs as
32-bit does). Filed entries were not touched: their issues are the owner's to edit.
`database-compare-no-error` was left alone: Access's VBA takes 2 by design (above).

## Batches

Each batch is one session. They are independent after batch 0, so any order works, and
each can be run when there is budget. Status is kept here.

| # | Batch | Pages (about) | Status |
|---|---|---|---|
| 0 | Tooling: data format, probe generator (twinBASIC and VB6), checker, section writer, the gate | --- | done; reviewed 2026-10-20 |
| 1 | The central Run-time errors page | 1 | done; reviewed 2026-10-20; list of pages per number and `tb:Errors` shortcut 2026-10-21 |
| 2 | **Pilot: VBA `Strings`** --- settled the section's style with the owner | 30 | done: 28 sections, 339 cases; reviewed 2026-10-21 |
| 3 | VBA `Conversion` | 28 | done: 23 sections, 299 cases; owner's questions answered 2026-10-21 |
| 4 | VBA `Math` | 17 | done: 15 sections, 132 cases; 2026-10-22 |
| 2--5 | Re-check of batches 2 to 5 and Core in four runtimes (64-bit VBA added) | --- | done: all agree; committed 2026-10-22, see *The 64-bit VBA re-check* |
| 5 | VBA `DateTime` | 20 | done: 17 sections, 328 cases; owner's questions answered 2026-10-22 |
| 6a | VBA `Information`, and `Interaction`'s non-interactive procedures: `CallByName`, `CallByDispId`, `Choose`, `Command`, `CreateObject`, `GetObject`, `Environ`, `IIf`, `If`, `Partition`, `Switch`, `RaiseEventByName`, `RaiseEventByName2`, `SaveSetting`, `GetSetting`, `GetAllSettings`, `DeleteSetting` (owner split batch 6, 2026-10-22) | 45 | in progress |
| 6b | `Interaction`'s interactive procedures: `AppActivate`, `Beep`, `DoEvents`, `InputBox`, `MsgBox`, `SendKeys`, `Shell` (a probe never calls `MsgBox` or `InputBox`; `SendKeys` only with strings refused before a key is sent; `Shell` only with a missing program or `cmd.exe /c exit`) | 7 | not started |
| 7 | VBA `FileSystem` | 23 | not started |
| 8 | VBA `Collection` and `ErrObject` (and the `Err.Raise` differences under *The central page*) | 22 | not started |
| 9 | VBA `Financial` | 14 | not started |
| 10 | VBA `HiddenModule`, then `Compilation` and `TbExpressionService` (`Constants` has nothing to raise) | 68 | not started |
| 11 | Core file I/O statements (`Open`, `Get`, `Put`, `Input`, ...: errors 52--75) | 15 | not started |
| 12 | Core arrays and control flow (`ReDim`, `Erase`, `Resume`, `Return`, ...); ReDim has data already, in `errors/Core.yml` | 15 | not started |
| 13 | Operators: the matrix generator and its pages | 25 | not started |
| 14 | VB package (37 pages) and the VBRUN pages that document members rather than constants: properties and methods that raise 380, 383, 387 and the like; needs forms | 37 + part of 134 | not started |
| 15 | Built-In packages | 195 | not started |

Page counts are the folders' `.md` files on 2026-10-20, index pages included; a batch's first
step is to list the pages in it that document something that can raise.
