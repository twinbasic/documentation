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

## Tooling (batch 0)

To design and build first; the points below are what it must settle, not decisions yet.

- **The data.** One file per area (per VBA module, per Core group), YAML like `_book.yml`,
  which `builder/data.mjs` already reads with `js-yaml`. An entry names the page (by path or
  by `symbols:`), and lists cases: the expression or statements that raise, the error number,
  the *When* text, and optional per-runtime expectations (`vb6:`, `win64:`) where they differ.
  Cases that need set-up (an open file, a form, an array) carry it.
- **The probe generator.** From a data file, one twinBASIC project and one VB6 project, each
  case wrapped in `On Error Resume Next` / `Err.Clear` / print `Err.Number`, run with
  `tbrun --exe` (and `--arch win64` where the decisions above say) and with
  `scripts/vb6run.mjs`. The exe, not a `[RunAfterBuild]` run: the IDE context has its own
  defects (see `module-init-reads-other-module-ide` in BUGS-TO-REPORT.md).
- **The checker.** Runs the probes and fails when a runtime disagrees with the data, or a
  page's section disagrees with what the data generates. Run by a person when a new BETA is
  installed, like `bug_repro.mjs verify` --- never by CI, which has no twinBASIC or VB6.
- **The section writer.** Writes each page's `## Errors` from the data, between markers, and
  the central page's index. A gate in `test.bat` (no runtime needed) checks that every
  section matches its data.
- **Operators.** A generator of its own: each operator over every pair of operand types
  (Byte, Integer, Long, LongLong, Single, Double, Currency, Decimal, Date, String, Boolean,
  Variant holding Empty or Null) at boundary values, giving a matrix of error numbers per
  runtime. Each operator page gets a summary of it; the full matrix is a page of its own.

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
| 0 | Tooling: data format, probe generator (twinBASIC and VB6), checker, section writer, the gate | --- | not started |
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
