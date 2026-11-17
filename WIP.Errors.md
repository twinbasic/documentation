# twinBASIC Documentation --- Run-time errors per procedure

The plan for adding to every documented procedure, statement and operator the run-time errors
it raises, and for the tools that measure them. No VB or VBA reference answers *which errors
can this raise* (a reader's request), and a reader writing an error handler needs exactly that.

## Where things stand

The tooling, the central page and the VBA modules are in place: each module's file under
`errors/` holds its cases, and its pages have their Common Errors sections. `Core.yml` holds
ReDim's. Every file's `beta:` is 1034: twinBASIC 32-bit and 64-bit were run over every file on
BETA 1034 and agree with the data; VB6 and 64-bit VBA were last run over most files on BETA 1010.
No row is `bug: pending`, and no question is open.

**Next: batch 11**, Core file I/O statements.

## Owner's decisions

- **Data-driven** (2026-10-20). Each procedure's errors are data: the cases that raise them.
  The page section, the probe that measures them and the check that keeps them true are
  generated from that data. Hand-written tables cannot be re-verified on a new BETA.
- **Measured, not copied.** Every row is observed in twinBASIC and in VB6. Microsoft's pages
  are a source of cases to try, never of answers. A statement about VB6 names only what was
  run in VB6 (a `Long` array, not "any typed array").
- **Runtimes** (2026-10-22), for everything: twinBASIC 32-bit, compared with
  VB6, and twinBASIC 64-bit, compared with **64-bit VBA, whose behaviour must be respected**
  (owner): a difference between twinBASIC 64-bit and 64-bit VBA is a bug, exactly as one from
  VB6 is, with a NOTE and a queued reproducer. **Where VB6 and 64-bit VBA differ, twinBASIC does as 64-bit VBA
  does**, in both builds (owner, 2026-10-28): matching 64-bit VBA is an extension against VB6
  (`only: [tb, vba64]` cases, a NOTE in the prose), and matching neither is a bug whose
  reproducer asserts 64-bit VBA's number.
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
  page's prose, twinBASIC-only quiet cases, no `vb6:` row). The owner also ruled
  that `Val` ignoring a suffix's range, `Error$` above 65535 and `CDate` out of range are bugs.
- **An error that only the test setup raises is not listed** (2026-10-22): 70 when the probe
  lacks the privilege to set the clock documents the setup, not twinBASIC. Nor is a NOTE
  written for it. An extension is decided the same way for every argument (2026-10-22):
  it may be one where its behaviour makes sense and has no bugs; otherwise it is a bug.
- **Content that twinBASIC and VB6 both contradict is the page's fault** (2026-10-21): it is
  commented out, not deleted, as `<!-- VBA: <why it is out> ... -->`, by the rule in
  WIP.Authoring.md, *twinBASIC deviations from VBA to flag*. The `vbUseCompareOption` rows
  of the *compare* tables and two "**Null** is returned" sentences of String are such comments.
- **Interactive procedures** (2026-10-22): **D1**, MsgBox and InputBox
  may be called under the `dialog` harness. **D2**, SendKeys may be given strings that send
  keys, under the `keys` harness, once the patch is shown to catch every runtime's calls.
  **D3**, Beep takes no arguments and either works or does not: no case, no harness and no
  section (a case would sound in the owner's room four times a run). **D4**, an error Windows
  itself makes VB6 or 64-bit VBA raise on the user's own desktop (VB6's SendKeys raises 70 when
  its journal hook is refused) is nothing: no row and no NOTE, since the documentation does not
  document VB6 and such an error is a VB6 bug for practical purposes; it is not checked on the
  user's desktop either.

### Rulings on the finished modules

Each is in the data and on the pages; they are here so that a later case is judged alike.

- **Strings, Conversion** (2026-10-21): the extensions and bugs above. `Hex`, `Oct` and `Bin`
  of a `Single` or `Double` of 2^62 or more raise 6 (-2^62 passes), as in 64-bit VBA, and 64-bit
  VBA also takes the whole `LongLong` range and gives a negative non-integer 16 (22) characters:
  their NOTEs state the limit unlabelled (*as in 64-bit VBA*; Bin, which VBA lacks, *as it does
  in Hex and Oct*), and no bug is filed for it (owner, 2026-10-22).
- **Math** (2026-10-22): every difference from VB6 is a bug (`abs-minimum-widens-type`,
  `trig-above-2-to-63`, `round-null-negative-digits`).
- **DateTime** (2026-10-22): `Date =` and `Time =` of a number are an extension, read as `CDate`
  reads it (twinBASIC-only quiet cases that check the value, a NOTE on each). A *firstdayofweek*
  outside 0 to 7 and a *firstweekofyear* outside 0 to 3 are bugs. **Calendar is not reported**:
  every assignment raises -2147467259 and the compiler warns TB0009 (not implemented), so its
  cases are `only: tb`, with no VB6 NOTE, and a NOTE by hand on Calendar and on the module's
  index says it is not implemented. No 70 rows.
- **Information and Interaction** (2026-10-22, 2026-10-27): Partition of a *number* or *stop*
  beyond a **Long** and Choose of an *index* beyond the **Single** range follow 64-bit VBA, not
  VB6: a documented extension ("tB can extend VB6"), `only: [tb, vba64]`, a NOTE in the prose.
  The bugs are grouped: one entry for the -2147467259 family (`argument-errors-unspecified-error`),
  one for CreateObject's and GetObject's raw HRESULTs, one for CallByName's `DISP_E_` HRESULTs
  (what `latebound-hresult-mapping` does not already cover), one for the RaiseEventByName crash.
  SendKeys' -2147352567 and AppActivate's, Shell's, MsgBox's and InputBox's -2147467259 join the
  family; `interaction-missing-argument-checks`, `sendkeys-non-ascii` and
  `private-desktop-window-activation-delay` are bugs. Extensions: AppActivate `""`, SendKeys
  *wait* `"True"`, MsgBox passing every style Windows accepts. Not documented: VB's `"((a))"`, its
  doubled Shift for `"+"`, and its keeping the keys of a refused string for the next SendKeys. A
  probe may call MsgBox with -1 and &H7FFFFFFF unguarded: Windows refuses them for their button
  group before any box.
- **FileSystem** (2026-10-27). Extensions, with a NOTE and twinBASIC-only quiet cases: Dir's
  *attributes* outside 0 to 63; a non-String argument to Dir and CurDir; FileCopy of a source
  open for reading only; SetAttr's *attributes* wherever Windows accepts them ("tB extension
  where the attributes are valid for the underlying WINAPI; where the WINAPI fails, SetAttr must
  correctly raise an error"); Width from 256 to 32,767. Bugs (`filesystem-argument-checks`): a
  negative Width, FileLen and FileDateTime of a wildcard that matches, `Input(0)`, and the 13 of
  `CurDir(Null)` and `Dir(Null)`.
- **Collection and ErrObject** (2026-10-28). Extensions: `Err.Raise` and `Err.Number =` of a
  number above 65535, and `Collection.Add` with *before* one more than **Count** or *after* 0. A
  bug: `Collection.Add` with a *key* of **Empty** (`collection-index-checks`).
- **Financial** (2026-10-28): five entries, each with a `tests` reproducer and a VB6 side. PV's
  11 for an infinite result is an extension against VB6, and SLN's infinity a bug asserting 6;
  for a *rate* of -1 FV is to raise 6, and PV 0, 11 or 6 by the sign of *nper*, as 64-bit VBA.
- **HiddenModule, Compilation, TbExpressionService** (2026-10-28). The crashes are one entry
  (`nothing-argument-crashes`); the malformed expressions another
  (`expression-service-dangling-tokens`). **"Eval should not be special casing errors"**: the
  expression service is to pass an error through unchanged, as VBScript's and Access's `Eval` keep
  it (`expression-service-error-numbers`). A compile failure's number, `Eval("Len(Null)")`,
  `Eval("CVErr(5)")` and the unstable description stay NOTEs with no entry: untagged, so no
  retired entry removes them; check them against each new BETA, as every labelled callout is.
  `vbaCastObj` returning **Nothing** where VB6's `__vbaCastObj` raises 13 is a bug
  (`vbacastobj-no-type-mismatch`). `CreateGUID`'s braceless 36-character form and `AllocMem(0)`'s
  -2147024882 are the spec.

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
  page says **Long**). So a parameter whose type the page leaves out gets its type stated on the
  page (QBColor's and RGB's are **Integer**), and its 6 is then the conversion's; and a
  parameter type copied from VBA-Docs is checked against the declarations (Financial's *nper*
  is a **Double**, not the **Integer** VBA-Docs gave).
- The heading takes the level of the page's last Example or See Also heading (`pageLevel`):
  `###` on the VBA and Core pages, which the build promotes to `##`; `##` on a page without an
  Example or See Also heading.
- Rows of a page that raise the same number are one table row, their *When* cells joined with
  `<br>` in the order of the data.
- A row where twinBASIC raises nothing and VB6 raises (`error: 0`, below) is a NOTE only.
- A procedure that raises nothing gets no section --- unless its absence is surprising enough
  to state (`none:`).
- The section is written between markers, so regenerating it replaces only it. A new section
  goes before the page's first Example (`spliceSection`); on a page that puts See Also before
  its Example, move it above See Also by hand once.

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

What `messages.yml` holds:

- **Every number from 1 to 65535 with a message of its own**, whether or not a table names it
  yet. twinBASIC and VB6 agree on every one, for `Error$(n)` and for `Err.Description` after
  `Err.Raise n`, and so does 64-bit VBA.
- **HRESULTs** only when the data names one. For these the two messages differ, and the file
  says `{ raised, error }`. The sections show `Err.Description` (owner: settled); showing
  `Error$(n)` instead would be a one-line change in `renderSection` (`.raised` to `.error`).
- **The differences from VB6 in the messages and in `Err.Raise`**: `Err.Raise n` without a
  description, *Application-defined or object-defined error* in VB6 and empty or a system
  message in twinBASIC, is filed (`err-raise-defaults`, #2504; the central page's NOTE). VB's
  `Err.Raise` of a common HRESULT as its own number is queued (`err-raise-hresult-mapping`; the
  Raise page's hand NOTE has the table, since a row holds one `vb6:`, and twinBASIC's side is
  `only: tb` quiet cases). `Err.Raise 65536`, 5 in VB6, is an extension (owner, 2026-10-28; the
  Raise page's NOTE). `Error$` above 65535 is filed (`error-function-above-65535`). Left alone:
  twinBASIC's `Error$` of a few HRESULTs is VB's message (`Error$(&H80070057)` is *Invalid
  procedure call or argument*), VB6's is generic.

## Tooling

Their reference is on the Tools pages:
[`errors.mjs`](docs/Documentation/Tools-Defects.md#errorsmjs) and
[`check_errors.mjs`](docs/Documentation/Tools-Toolchain-Tests.md#check_errorsmjs).

- `errors/` --- the data: one YAML file per area (`VBA.Strings.yml`, `Core.yml`, ...) and
  `messages.yml`, each error number's message.
- `errors/harnesses/<name>.bas` --- the harnesses (*Harnesses*, below).
- `node scripts/errors.mjs run [<file.yml>] [--only <regex>]` --- builds one probe from the data
  per runtime, runs it, and compares each case with the data. Every runtime by default
  (`--runtime tb|win64|vb6|vba64`, repeatable, picks some). By hand only: it needs twinBASIC,
  VB6 and 64-bit Office. A run of every file in every runtime takes a few minutes; one page about 15 s.
  `--only` is a plain regex (a leading `/` is read as a delimiter: write `Mid\.md$`, not `/Mid\.md`). A case a
  compiler refuses is reported and dropped, and the probe rebuilt. `generate <dir>` writes the
  probes without running them; `--keep` keeps the ones `run` built.
- `node scripts/errors.mjs write` --- writes each page's section and the central page's index.
- `node scripts/errors.mjs messages` --- measures `messages.yml` in every runtime.
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
  break mode), so a box seen at two polls ends that Access by its pid and the next job starts
  another (about 2 s). VBA compiles a Sub when it is first called, so the refused case is the first that did not
  report; the vba dialect's Main reports `start` first, so an error in the declarations is told
  apart. `findAccess64` reads Access.Application's LocalServer32 and checks the exe is x64.
- VB6 and VBA refuse a declaration after a procedure, so a probe with two harnesses puts all
  their declarations first (`splitHarness`). A reproducer's VB6 project may call MsgBox and
  InputBox when it carries the dialog harness (`reproAnswersBoxes`).

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
beta: 1034                 # the BETA the data was last measured on; titles the VB6 NOTE
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
`[tb, vb6]` for a case Access cannot answer for. **`vbDatabaseCompare` (2)** is such a case:
in Access, 64-bit VBA takes it as the database's sort order, Access's own meaning, which VBA
documents as Access-only, so Access cannot answer for VBA in Excel or Word; its cases are
`only: [tb, vb6]` and its NOTEs VB6-only. Whether VBA outside Access raises 5 for it is left
unchecked (owner, 2026-10-22: not worth it; Excel would need the VBA object-model trust
setting, the user's).

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
(setting the system clock, opening a box, sending a key) or must be observed (the value it
would set). It makes the effect safe in the probe's own process, so that every case can be
tried: without one, MsgBox and InputBox could have no quiet case, since a case that succeeds
opens a box. It is one file,
`errors/harnesses/<name>.bas` (a lowercase name), **the same source for twinBASIC, VB6 and
VBA** (owner, 2026-10-22): module-level code that defines `Private Sub <name>_Begin()` and
`<name>_End()`, and whatever helpers its cases call (`<name>_...`). VB6 compiles only the
branch of an `#If` that is true, so `#If VBA7` holds what VB6 cannot parse (`PtrSafe`,
`LongPtr`; `VBA7` is true in twinBASIC and in VBA 7, and 64-bit VBA refuses a `Declare`
without `PtrSafe`, so never `#If TWINBASIC` for this), and `#If Win64` what differs in a 64-bit build; a pointer is kept in a
`Variant` between calls, and in a typed local for an `As Any` parameter (a `Variant` passed
`ByVal` to one passes the Variant). **A harness must refuse what the real thing refuses**: one
that accepts more hides errors (a clock harness that passed `Time$ = "24:00:00"`, which
Windows refuses). `check_errors.mjs` reports a harness the data names and has no file for.

The interactive harnesses patch what each runtime calls (BETA 1010): MsgBox
`MessageBoxIndirectW` (twinBASIC) and `MessageBoxIndirectA` (VB6, VBA); InputBox
`DialogBoxIndirectParamW` (twinBASIC), `DialogBoxParamA` template &HFBF (VB6, VBA); SendKeys
`keybd_event` (twinBASIC), and in VB6 and VBA a journal-playback hook, refused on Windows 10,
then `SendInput` one event at a time; AppActivate `SetForegroundWindow` and `SetFocus` in all.

- **`clock`** --- `Date`, `Date$`, `Time`, `Time$`. `clock_Begin` patches `SetLocalTime` and
  `SetSystemTime` (kernelbase and kernel32) with a jump to a function that records the
  SYSTEMTIME and succeeds where Windows would (it asks `SystemTimeToFileTime`, and fails with
  error 87 otherwise), and `AdjustTokenPrivileges`, which VB6 calls first and twinBASIC never
  does, with one that succeeds; `clock_End` puts the bytes back. The patch is of the probe's
  own exe, for one case at a time, and the real clock is never set. `clock_Expect Day, Clock`
  raises 1001 when the date part or the time part set is not the one given (`Null` skips
  it); it does nothing when the case has already raised. 32-bit and 64-bit; in 64-bit VBA it
  patches Access's own process for the case, and works (every Date and Time case agrees).
  Without it a probe has no privilege and every accepted value raises 70.
- **`registry`** --- `SaveSetting`, `GetSetting`, `GetAllSettings`,
  `DeleteSetting`. A case names the application `registry_App`, `tbdocsErrorsProbe` and the
  process id (the runtimes run at once, and a shared key would let one runtime's cleanup remove
  another's section), and `registry_Begin` and `registry_End` delete
  that application's whole key under `HKCU\Software\VB and VBA Program Settings` with
  `SHDeleteKeyW` (`DeleteSetting` raises 5 in VB6 and VBA for a key that has a subkey), keeping
  the case's error (raised again with its description once the key is gone), so nothing a case
  writes stays in the user's registry. A case's `setup` may save what it reads. Check after a run
  that no `tbdocsErrorsProbe*` key is left.
- **`dialog`** --- `MsgBox`, `InputBox`. A `WH_CBT` hook on the probe's thread notes
  each top-level `#32770` it creates and, as it is activated, hides it and **sends**
  `WM_COMMAND` from Cancel, else the first push button that is not Help (a posted one never
  reaches the box in Access; `EndDialog` skips the dialog procedure, and twinBASIC's InputBox
  then faults in OLEAUT32). Windows the hook did not see created --- Access's own --- are left
  alone, and the real MessageBox and dialog run: what they refuse is what the probe measures. A
  style with any of &H260000 (service notification, its NT 3.x form, default desktop only) puts
  the box on the input desktop, the user's, where no thread hook sees it, and a *buttons* of -1
  or 2147483647 has those bits. So a guard patches `MessageBoxIndirectA/W` and refuses such a
  style, which `dialog_End` reports as 1002, so a case can never pass silently; the
  six other MessageBox entry points are refused outright. `dialog_Expect Count` raises 1001;
  `dialog_Count`, `dialog_Style`, `dialog_Button` record the last box. VB6 builds a probe with
  `dialog` cases without Unattended Execution (`ATTENDED_HARNESSES`: with it, VB6's MsgBox writes
  to the event log and shows nothing), and `VbaSession` ends Access only at a box seen at two
  polls, since the hook's box exists for an instant before it hides it.
- **`keys`** --- `SendKeys`. Patches `keybd_event` (twinBASIC's way) and `SendInput`
  (VB6's and VBA's) with fakes that record each event and succeed, and `SetWindowsHookExA/W`
  with one that refuses a journal-playback hook as Windows does without UIAccess (VB6 and VBA
  then use `SendInput`). `keys_Expect "10d 41d 41u 10u"` raises 1001 for other events
  (`<vk hex><d|u>`, or `U<char hex><d|u>` for a Unicode one).
- **`window`** --- `AppActivate`. A `STATIC` top-level window titled `window_Title`
  (with the process id), shown without activation; `window_Pid`, `window_Hide`,
  `window_Minimize`, `window_Visible`, `window_Minimized`. On the private desktop no window
  becomes the foreground one, and AppActivate raises nothing for that; in twinBASIC, activating a
  new window there takes 2 s from the third on (not on the user's desktop), so `errors.mjs`
  gives a twinBASIC probe 120 s.
- **`files`** --- every procedure that names or opens a file. `files_Begin` makes
  `files_Dir`, `tbdocsErrorsProbe` and the process id under the temporary folder, makes it the
  current directory (Windows' own calls, so no statement under test sets it up) and fills it:
  `a.txt` (`abc`, CR LF, `def`, CR LF: 10 bytes), `empty.txt`, `ro.txt` (read-only), `hid.txt`
  (hidden), the empty folder `sub` and `full`, which holds `f.txt`. A case names its files
  relatively. `files_End` closes every file, puts the current directory back and deletes the
  folder whatever its files' attributes, keeping the case's error; it deletes nothing whose path
  does not end in the folder's own name. `files_Begin` raises 1003 when it cannot make or enter
  the folder, so a case never runs in another folder. `files_Attr(name)` is
  `GetFileAttributesW` (-1: no such file), `files_Expect Cond` raises 1001, `files_NoDrive` is a
  letter no drive has. **A probe line that starts `Reset:` is a label**, not the statement: put
  `Reset` on a line of its own (`run: "Reset\n..."`). Check after a run that no
  `tbdocsErrorsProbe*` folder is left in `%TEMP%`.
- **`native`** --- **twinBASIC only**: every case that uses it is `only: tb`, so it uses
  twinBASIC syntax. What the (Default) module's procedures take: `native_Icon` (the shared
  `IDI_APPLICATION` icon), `native_Bitmap` (a 2 x 2 bitmap that `native_End` deletes unless
  `native_Keep` says a picture owns it), `native_Window` (a hidden `STATIC` window, made by
  `native_Begin`), `native_Handler` (a `GetMessageHookHelper.GetMessageHandler` that does
  nothing), `native_StdIid(Data1)` (the address of the interface ID
  `{Data1-0000-0000-C000-000000000046}`, for `vbaCastObj`) and the enumeration `native_Kind`
  (-3 to 7).
- **`expression`** --- twinBASIC only. In a built exe the first error the expression
  service (`Eval`, `TbExpressionService`) raises in a process has the description *Automation
  error*, every later one *Unspecified error*; `expression_Begin` raises the first once and
  clears it, so a case's description does not depend on which case runs first (`--only`).

**Shell** needs no harness: its cases name only programs that do not exist, `cmd.exe /c exit`,
and files that are not programs (`win.ini` of the Windows folder). A process it starts inherits
the probe's private desktop and its kill-on-close job. No case names a `.bat`, `.cmd` or
anything else CreateProcess would run. **DoEvents** gets quiet cases and no section; **Beep**
nothing (D3).

**YAML pitfalls**:

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
   (`Bin`, `CType(Of ...)`, `ValDec`, `Shift*`, `Calendar`, none of which VBA has) marked
   `only: tb` while exploring. Try, for every parameter:
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
   accepts what VB6 refuses, ask the owner** whether it is an extension before queuing. A
   difference that belongs to a queued family extends its entry rather than starting one
   (*Patterns a batch meets*, below). Where the two VB runtimes differ, a reproducer's case
   asserts 64-bit VBA's number; say so in the entry, since the VB6 project then disagrees with
   the module. An entry's **Expected behavior** says *as VB6 and 64-bit VBA ...*, and its
   **Additional context** that a 64-bit build gives the same results and which VBA was used
   (*VBA 7.1 (VBE7.DLL 7.01.1158) in 64-bit Microsoft 365 Access*). A filed entry's issue is the
   owner's to edit.
6. **Gates**: `build.bat` (0 broken), `node scripts/check_errors.mjs`, `test.bat`;
   `check.bat` once per batch. Commit on staging (the owner's choice for this work). **When
   another session shares the checkout, `git add` by path**, never `-A`, so its files are not
   swept into the commit.
7. Update *Where things stand* and the batch's row below, keeping here only what the batch
   leaves that a later one needs (a rule, an owner's ruling), and list the questions for the
   owner.

What the probes must respect (BETA 1010; `errors.mjs` already does all of it):

- **Run cases in the built exe** (`tbrun --exe`), and print with `TbRun.Out`, which `tbrun`
  adds to the project: `Debug.Print` writes nothing in an exe. A `[RunAfterBuild]` run in the
  IDE reads every module-level variable as 0 once one initializer reads another module's
  variable (bug `module-init-reads-other-module-ide`), and may differ in other ways.
- **A `tbrun --exe` probe brings its own `Sub Main`**, without the console template's
  `tbxMain.twin`; two `Main`s make the build fail with *'Main' is ambiguous*.
- **Never an unhandled error** in a probe, and **`MsgBox` and `InputBox` only under the `dialog`
  harness**, `SendKeys` only under `keys`: otherwise each opens a modal box on a private desktop,
  or sends keys. Every case runs under `On Error Resume Next`.
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
- **A case that crashes stops the probe, and every later case reports `none`** (`the probe
  stopped before it ended: exception 0xc0000005`), as a hang does: run a suspect alone before
  reading the cases after it. Explore one page per probe
  (a data file holding only that page), then one case per probe for a page that stops; a case
  that crashes or hangs is a WARNING by hand, never a case, and so is a silent wrong value found
  while writing a reproducer (a value, not an error). A WARNING by hand names its reproducer in
  `<!-- test: bug <slug> -->` on the line above it (and `errors <name>` when it cites the data's
  rows too), as every callout labelled `BETA <n>` does (WIP.Authoring.md, rule 6); the generated callouts
  need none.
- **The probe is one module**: a case cannot declare a class, an interface or a `Type`. A
  harness can hold a `Type`, an `Enum`, a `Declare` and procedures; a fact that needs a class
  (`GetNameFromDispID` on a twinBASIC class) is checked with `tbrun` on a tree of its own and
  stated in the page's prose.
- **A probe of a `Double` boundary near 2^62 or 2^63 uses a variable** (`X = 2 ^ 63`), never a
  literal: the constant 2^63 converts wrongly (`clnglng-2-to-63-no-overflow`), and a 32-bit
  build can raise a late 6 after a constant overflow
  (`const-double-expression-after-overflow-32bit`).
- **A Calendar case must set `vbCalGreg` again.** In VB6 `Calendar = vbCalHijri` succeeds and
  stays, so every later case of the probe would run under the Hijri calendar; the data's cases
  end with `Calendar = vbCalGreg`.
- **A case that checks an error was raised as asked**: `Err.Raise n` (or `Err.Number = n`) then
  `If Err.Number = n Then Err.Clear`, so the case reports 0, and a runtime that raises or keeps
  another number reports that. `Err.Number = 65536` raises 5 in VB (an `On Error GoTo` handler
  is entered); `Err.Number = &H80070057` only stores 5.
- **A VBA Collection is not reachable through `CallByName` in VB6 or 64-bit VBA** (even
  `CallByName(C, "Count", vbGet)` raises 438 there): a case that needs a COM object uses
  `Scripting.Dictionary`.

## Patterns a batch meets

The pages and data carry every finding; these recur, so a later batch knows what to look for.

- **The -2147467259 family.** twinBASIC raises -2147467259 (`&H80004005`, *Unspecified error*)
  where VB6 and 64-bit VBA raise 5, 9, 13 or another number for an argument the procedure
  refuses, or for a file it cannot use: `argument-errors-unspecified-error` and, for the file
  procedures, `file-errors-unspecified`. A new instance extends its entry.
- **Raw HRESULTs where VB maps them**: COM creation (`createobject-getobject-raw-hresults`),
  late binding and `CallByName` (`latebound-hresult-mapping`, `callbyname-dispatch-hresults`),
  `Err.Raise` (`err-raise-hresult-mapping`). A new HRESULT goes into `messages.yml` by hand.
- **Null** raises 94 nearly everywhere; in an optional **Variant** argument twinBASIC raises 13
  where VB raises 94 (`financial-null-optional-argument`).
- **A parameter type the page gets wrong or leaves out**: see *What is listed*, above.
- **Content both runtimes contradict** (a settings value VBA-Docs lists that every runtime
  refuses, such as `vbUseCompareOption`): a `<!-- VBA: -->` comment.

## Batches

Each batch is one session. They are independent, so any order works, and each can be run
when there is budget. The VBA modules are done; what is left:

| # | Batch | Pages (about) | Status |
|---|---|---|---|
| 11 | Core file I/O statements (`Open`, `Get`, `Put`, `Input`, ...: errors 52--75). The Core pages Open, Name, Get, Put, Print and Line Input have hand NOTEs for `file-errors-unspecified`, which the rows' generated NOTEs replace | 15 | not started |
| 12 | Core arrays and control flow (`ReDim`, `Erase`, `Resume`, `Return`, ...); ReDim has data already, in `errors/Core.yml`. A Core batch also takes `Set X = obj` where *X* is declared as an interface *obj* does not have: twinBASIC raises -2147467262 (`E_NOINTERFACE`), VB6 13 (not checked in VB6 yet, not queued) | 15 | not started |
| 13 | Operators: the matrix generator and its pages | 25 | not started |
| 14 | VB package and the VBRUN pages that document members rather than constants: properties and methods that raise 380, 383, 387 and the like; needs forms | 37 + part of 134 | not started |
| 15 | Built-In packages | 195 | not started |

Page counts are the folders' `.md` files on 2026-10-20, index pages included; a batch's first
step is to list the pages in it that document something that can raise.

Open in the finished modules: assigning `Err.HelpFile`, `Err.HelpContext` or
`Err.ReturnHResult` in a module procedure fails the build (`err-helpfile-helpcontext-codegen`),
so the data has no case for those three pages, and each has a hand NOTE. When it is fixed, add
`Err.HelpFile = Null` and `Err.HelpContext = Null` (94 in VB6 and VBA) as rows.
