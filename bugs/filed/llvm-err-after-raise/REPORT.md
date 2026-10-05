Filed as [twinbasic/twinbasic#2452](https://github.com/twinbasic/twinbasic/issues/2452).

## `Err` after a handled `Err.Raise` in an LLVM-compiled procedure holds `&HEAEAEA01` and no text

**Describe the bug**
In a procedure compiled with LLVM, an `Err.Raise` that the procedure handles leaves `Err.Number` at -353703423 (`&HEAEAEA01`), with an empty `Err.Source` and the generic description *Application-defined or object-defined error*. The handler cannot tell which error it caught.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-err-after-raise.twinproj` (attached as `llvm-err-after-raise.zip`). It needs an LLVM licence (Ultimate): the procedure below is compiled with LLVM by its attribute. Run it (F5).
   ```
   [CompilerOptions("+llvm")]
   Private Sub LlvmRaise()
       On Error Resume Next
       Err.Raise 5, "MySrc", "my text"
       Debug.Print Err.Number & " / " & Err.Source & " / " & Err.Description
   End Sub
   ```
2. See `-353703423 /  / Application-defined or object-defined error`. The project also calls the same procedure without the attribute, and that one prints `5 / MySrc / my text`.

**Expected behavior**
`5 / MySrc / my text`, as without the attribute. VB6 gives the same after `On Error Resume Next` and in an `On Error GoTo` handler (the project is attached as `llvm-err-after-raise-vb6.zip`):
```
plain:  5  / MySrc / my text
GoTo:   5  / MySrc / my text
```

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: an error handler in LLVM-compiled code cannot tell which error it caught. The same happens with `On Error GoTo` and a handler, with `Err.Raise 11` and with `Err.Raise 1000`, on win32 and win64. What does not reproduce it: a run-time error the procedure causes itself, `1 \ 0` on a `Long`, reads correctly as 11, and `Err.Number = 7` assigned directly reads 7. Measured in the IDE's run only (a `[RunAfterBuild]` probe through `tbrun`); not run in a built exe. BETA 983 refuses the project's LLVM procedure ("Unable to compile due to use of datatype that is not yet supported for LLVM compilation"), so it was not compared there.

<!-- Stated by docs/LLVM/Getting-Started.md (the note at line 61), and the page's samples are measured on 995; when fixed, update it. Measured with scripts/bug_repro.mjs (run mode, verify) on 995; the On Error GoTo, Err.Raise 11 and 1000 and win64 variants from tbrun probes on 2026-10-01 and not re-run for this report. -->
