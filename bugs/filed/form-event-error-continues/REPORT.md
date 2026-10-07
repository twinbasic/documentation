Filed as [twinbasic/twinbasic#2500](https://github.com/twinbasic/twinbasic/issues/2500).

## An unhandled error in a form's event procedure does not end a built exe

**Describe the bug**
In a built exe, an unhandled run-time error in an event procedure of a form shows the error's box, and once the box is closed the program goes on running: the form is shown and its later events run. VB6 ends the program.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `form-event-error-continues.twinproj` (attached as `form-event-error-continues.zip`). `FormE` is the startup object.
   ```
   Private Sub Form_Load()
       Err.Raise 5, "MySrc", "my text in Form_Load"
   End Sub
   
   Private Sub Form_Activate()
       MsgBox "Form_Activate ran after the error", , "FormEventErrorContinues"
       Unload Me
   End Sub
   ```
2. Build the project and run the exe.
3. See the box for the error (`Run-time error '5'`, `my text in Form_Load`), and press OK.
4. See a second box, `Form_Activate ran after the error`: the program went on running.

**Expected behavior**
The program ends when the error's box is closed, and `Form_Activate` never runs. The VB6 project is attached as `form-event-error-continues-vb6.zip`; its exe shows the error's box and ends, and the file it writes holds `Form_Load ran` alone.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Severity: medium; code goes on running after an error that the program did not handle, with whatever state the error left. The same for an error in `Form_Activate` (the form stays open), and on BETA 983 and 995. An unhandled error in `Sub Main` does end the exe, with exit code 0.

<!-- docs/Reference/Core/On-Error.md carries a NOTE under "Without an On Error statement ... execution stops" (owner, 2026-10-06); when fixed, remove the NOTE. Checked with scripts/bug_repro.mjs (run mode with "exe": tbrun exit 6 and both boxes; verify) on 997, and the Form_Activate case with `run --exe` on BETA 983, 995 and 997; the VB6 sides of Form_Load and Form_Activate with `bug_repro vb6` (exit 8, the box, and the exe ended). -->
