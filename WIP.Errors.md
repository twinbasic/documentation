# twinBASIC Documentation --- Run-time errors per procedure

The plan for adding to every documented procedure, statement and operator the run-time errors
it raises, and for the tools that measure them. Prompted by a reader on Discord: no VB or VBA
reference answers *which errors can this raise*, and a reader writing an error handler needs
exactly that.

Like WIP.md, this file is not rendered through tbdocs.

## Owner's decisions (2026-10-20)

- **Data-driven.** Each procedure's errors are data: the cases that raise them. The page
  section, the probe that measures them and the check that keeps them true are generated
  from that data. Hand-written tables cannot be re-verified on a new BETA.
- **Measured, not copied.** Every row is observed in twinBASIC and in VB6. Microsoft's pages
  are a source of cases to try, never of answers.
- **Runtimes.** twinBASIC 32-bit and VB6 for everything; twinBASIC 64-bit as well for the
  operators and the `Math` module only.
- **Scope.** `docs/Reference/Default/` (VBA, VB, VBRUN), `docs/Reference/Core/` (statements and
  operators) and `docs/Reference/Built-In/`. Not `Contributed/`.
- **Existing error prose moves into the tables.** A page that states an error in a sentence
  ("an *LCID* that is not a valid locale identifier raises error 5") loses the sentence when
  its table is written; what the sentence explains beyond the number goes into the row's
  *When*.
- **A difference from VB6 is a bug** (the owner's rule for bugs generally): the table states
  what twinBASIC does, a NOTE on the page states what VB6 does, and the difference is queued in
  [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md). Where VB6 has no counterpart (LongLong, twinBASIC
  additions), there is nothing to compare and nothing to file on that ground.

## What a page gets

An `## Errors` section after the page's main text and before `## Example`:

| Error | When |
|---|---|
| 5, *Invalid procedure call or argument* | *start* is less than 1, or *length* is negative |
| 94, *Invalid use of Null* | `Mid$` is given a *string* that is **Null** |

- The number links to its row on the central page (below); the message is the runtime's own,
  as `Error$(n)` returns it, in italics as the rest of the site writes messages.
- *When* is a condition on the arguments or the state, in the reader's terms --- not the
  probe's expression.
- **What is listed**: what the procedure raises from its own arguments and state.
  **What is not**: errors anything can raise (7 *Out of memory*, 28 *Out of stack space*),
  error 13 from converting an argument before the call is made, and compile-time
  diagnostics (TB codes). The central page says this once.
- A procedure that raises nothing gets no section, not an empty one --- unless its absence is
  surprising enough to state (a function that returns a value where VB6 raises).
- The section is written between markers, so regenerating it replaces only it.

## The central page

`Reference/Run-time-Errors.md` (name to settle in batch 1): every trappable error number with
its message, measured with `Error$(n)` in both runtimes, the general exclusions above, and,
for each number, a generated list of the procedures whose tables name it.

## Tooling (batch 0, built)

Three files and a folder. Their reference is on the Tools pages:
[`errors.mjs`](docs/Documentation/Tools-Defects.md#errorsmjs) and
[`check_errors.mjs`](docs/Documentation/Tools-Toolchain-Tests.md#check_errorsmjs).

- `errors/` --- the data: one YAML file per area (`VBA.Strings.yml`, `Core.yml`, ...) and
  `messages.yml`, each error number's message.
- `scripts/errors.mjs run` --- builds one probe from the data per runtime, runs it, compares
  each case with the data. twinBASIC 32-bit and VB6 by default, win64 for a file that says
  `win64: true` or with `--runtime win64`. By hand only: it needs twinBASIC and VB6. A
  case a compiler refuses is reported and dropped, and the probe rebuilt (VB6 stops at its
  first error, so one rebuild per refused case there). `generate <dir>` writes the probes
  without running them; `--keep` keeps the ones `run` built.
- `scripts/errors.mjs write` --- writes each page's section from the data.
- `scripts/check_errors.mjs` --- the gate in `test.bat` and CI: data in order, every section
  what `write` makes of it, no section without data. No runtime needed.
- `scripts/lib/errors-data.mjs` --- what the two share.

How a probe runs a case: a `Private Sub C<n>()` of its own, `Dim Result As Variant`, the
case's `decl` lines, `On Error Resume Next`, its `setup` lines (an error there is reported as
a setup failure, not as the case's result), then `Result = <expr>` or its `run` lines, then
`case <n> <Err.Number> <Err.Description>`. twinBASIC: a tree for `tbrun --exe`, module
`Probe` with `Sub Main` and a `[RunAfterBuild]` that only prints, so the IDE run passes and
the exe runs the cases. VB6: `Probe.vbp` and `Module1.bas` through `runRepro`, appending to
`out.txt` line by line, so a case that kills the exe still leaves the ones before it.

### The data format

```yaml
# errors/VBA.Strings.yml
beta: 1010                 # the BETA the data was last measured on; titles the VB6 NOTE
win64: false               # optional: run measures win64 too (operators, Math)
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
        cases: [Mid$(Null, 1), MidB$(Null, 1)]
    quiet:                 # cases that must raise nothing; never shown on the page
      - Mid(Null, 1)
      - Mid("abc", 4)
  Reference/Core/ReDim.md:
    rows:
      - error: -2147467259
        when: an upper bound is less than its lower bound
        vb6: 9             # VB6 raises this instead (0: nothing); writes the NOTE
        bug: pending       # a bugs/<slug> reproducer, or pending until one is queued
        cases:
          - { decl: Dim X() As Long, run: ReDim X(0 To -1) }
          - { decl: Dim X() As Long, run: "ReDim X(5 To 4, 1)" }
    quiet:
      - { decl: Dim X() As Long, setup: ReDim X(3), run: ReDim Preserve X(5) }
  Reference/Default/VBA/Strings/Len.md:
    quiet:                 # raises nothing: no section
      - Len(Null)
      - { expr: LenB(CLngLng(1)), only: tb }   # twinBASIC syntax: not run in VB6
```

A case is an expression, or a mapping with `expr` or `run` (statements; a multi-line string
for several) and optionally `decl` (`Dim` lines), `setup` (statements before it) and
`only: tb`. A row's `win64:` is the number win64 raises where it differs. A page with no
rows gets no section; one with `none: "<sentence>"` and no rows gets a section holding that
sentence, for an absence of errors worth stating. Quote a case that holds `: `, starts with
a quote, or sits in a `{ }` mapping and holds a comma. `messages.yml` maps each number to its
message; `run` fails a case whose `Err.Description` is not that text.

The section `write` makes, before the page's first Example heading:

```
<!-- errors: generated from errors/Core.yml by scripts/errors.mjs write; edit the data, not this section -->
### Errors

| Error | When |
|---|---|
| -2147467259 (`&H80004005`), *Unspecified error* | an upper bound is less than its lower bound |

> [!NOTE] BETA 1010
> When an upper bound is less than its lower bound, VB6 raises error 9 (`&H9`), *Subscript out of range*, instead.

<!-- /errors -->
```

### Decided while building (owner's answers, 2026-10-20)

- **The heading takes the page's level for Example** (owner: confirmed): `###` on the VBA and
  Core pages, which the build promotes to `##` on a page with `#` and `###` but no `##`;
  `##` on a page without an Example or See Also heading.
- **Every number is given in decimal and in VB hexadecimal** (owner), as a 32-bit **Long**:
  -2147467259 (`&H80004005`), 5 (`&H5`), in the table and in the VB6 NOTE alike.
  `errorNumber` in `scripts/lib/errors-data.mjs` writes it.
- **The message is `Err.Description`, not `Error$(n)`** (owner: undecided). For VB's own
  numbers the two agree; for an HRESULT they do not: `Error$(-2147467259)` is
  *Application-defined or object-defined error*, while the error raised describes itself as
  *Unspecified error*, which is what a handler sees. Batch 1 settles which the central page
  lists, and so what the sections show.
- **The number is not linked yet** (owner: agreed): the central page does not exist. Batch 1
  adds the link in `renderSection` (`scripts/lib/errors-data.mjs`) and rewrites every section
  with `write`.
- **A row that differs from VB6 must name its reproducer**, or say `bug: pending` (owner:
  agreed); the gate refuses a `vb6:` row without it.
- **Errors from converting an argument are left out**, as the plan says: `Mid("abc", "x")`
  raises 13 and `Mid("abc", Null)` 94 in both runtimes, in the conversion of *start* to
  **Long**. `Mid("abc", 1, Null)` is in the table: *length* is a **Variant**, and the 94 is
  Mid's own.

## Starting batch 0

Read first: [WIP.Harness.md](WIP.Harness.md) (`tbbuild`, `tbrun`), [WIP.Build.md](WIP.Build.md)
(gates), [WIP.Authoring.md](WIP.Authoring.md) (page template), and `scripts/lib/vb6.mjs`'s
opening comment (driving VB6). Models to copy from: `scripts/check_package_tests.mjs` and
`scripts/check_code_regions.mjs` tie page text to tests with markers, and `scripts/bug_repro.mjs`
runs projects in both runtimes and compares the result with an expectation.

What this repository has already learned that the probes must respect (BETA 1010):

- **Run cases in the built exe** (`tbrun --exe`), and print with `TbRun.Out`, which `tbrun`
  adds to the project: `Debug.Print` writes nothing in an exe. A `[RunAfterBuild]` run in the
  IDE reads every module-level variable as 0 once one initializer reads another module's
  variable (bug `module-init-reads-other-module-ide`), and may differ in other ways.
- **A `tbrun --exe` probe brings its own `Sub Main`**, without the console template's
  `tbxMain.twin`; two `Main`s make the build fail with *'Main' is ambiguous*. A project has
  one `[RunAfterBuild]` at most.
- **Never `MsgBox`, `InputBox` or an unhandled error** in a probe: each opens a modal box on a
  private desktop. `tbrun --exe` closes them and reports them, and `vb6run` refuses a source
  that calls the first two. Every case runs under `On Error Resume Next`.
- **Keep the generated code plain.** A module-level or class-field initializer cannot call a
  procedure of the project, and a class field that reads another field fails the build (bug
  `class-field-init-reads-field`). Assign in code instead.
- **VB6 cannot compile twinBASIC syntax** (`LongLong`, `Return` in a function, inline `Dim x =`,
  generics). Cases for VB6 are written in the common subset; a twinBASIC-only case says so in
  the data and is not run in VB6.
- **One case can stop a whole project**: a compile error anywhere fails all of it. The
  generator should build a failing project again without the case named in the error, so one
  bad case costs a rerun, not the batch.
- A new gate in `test.bat` must also be added to the gate list in
  `docs/Documentation/Tools.md` (`check_gate_lists.mjs` fails otherwise), and a new tool gets
  its section on the Tools pages under `docs/Documentation/`.

Batch 0 is done when:

1. The data format is written down in this file, with one complete example.
2. The generator, the runner (twinBASIC 32-bit, 64-bit on request, VB6) and the section
   writer exist, with `--help`, and the gate is in `test.bat`.
3. A trial on three pages of different shapes --- a function with several errors
   (`Mid` or `InStr`), a statement (`ReDim`), a procedure that raises nothing --- runs through
   every step, and its sections are written.
4. **The owner has seen the trial's sections** before batch 2 starts: the format is settled
   then, not before. The trial's pages may be committed or reverted, as the owner says.
5. This file's batch table says batch 0 is done, and what batch 1 needs to know.

## Batches

Each batch is one session. They are independent after batch 0, so any order works, and
each can be run when there is budget. Status is kept here.

| # | Batch | Pages (about) | Status |
|---|---|---|---|
| 0 | Tooling: data format, probe generator (twinBASIC and VB6), checker, section writer, the gate | --- | built; trial sections (Mid, ReDim; Len raises nothing) await the owner |
| 1 | The central Run-time errors page | 1 | not started |
| 2 | **Pilot: VBA `Strings`** --- settles the section's style with the owner before anything scales | 30 | not started |
| 3 | VBA `Conversion` | 28 | not started |
| 4 | VBA `Math` (also win64) | 17 | not started |
| 5 | VBA `DateTime` | 20 | not started |
| 6 | VBA `Information` and `Interaction` | 54 | not started |
| 7 | VBA `FileSystem` | 23 | not started |
| 8 | VBA `Collection` and `ErrObject` | 22 | not started |
| 9 | VBA `Financial` | 14 | not started |
| 10 | VBA `HiddenModule`, then `Compilation` and `TbExpressionService` (`Constants` has nothing to raise) | 68 | not started |
| 11 | Core file I/O statements (`Open`, `Get`, `Put`, `Input`, ...: errors 52--75) | 15 | not started |
| 12 | Core arrays and control flow (`ReDim`, `Erase`, `Resume`, `Return`, ...) | 15 | not started |
| 13 | Operators: the matrix generator and its pages (also win64) | 25 | not started |
| 14 | VB package (37 pages) and the VBRUN pages that document members rather than constants: properties and methods that raise 380, 383, 387 and the like; needs forms | 37 + part of 134 | not started |
| 15 | Built-In packages | 195 | not started |

Page counts are the folders' `.md` files on 2026-10-20, index pages included; a batch's first step is to list the pages in it that document something that can raise.
