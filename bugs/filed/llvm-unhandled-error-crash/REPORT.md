Filed as [twinbasic/twinbasic#2499](https://github.com/twinbasic/twinbasic/issues/2499).

## An unhandled error in an LLVM-compiled exe shows no number or description, and the exe then ends with an access violation

**Describe the bug**
In a built exe, an error that no handler catches in a procedure compiled with LLVM opens a message box titled `_TB_ERROR_HANDLER` that says only `unhandled error in Startup.Main`: neither the error's number nor its description is shown. When the box is closed, the exe does not end normally: it ends with an access violation at address 0 (exit code `0xC0000005`).

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-unhandled-error-crash.twinproj` (attached as `llvm-unhandled-error-crash.zip`). It needs an LLVM licence (Ultimate): `Sub Main` is compiled with LLVM by its attribute.
   ```
   [CompilerOptions("+llvm")]
   Public Sub Main()
       Err.Raise 5, "MySrc", "my text"
   End Sub
   ```
2. Build the project, win32 or win64, and run the exe.
3. See a box titled `_TB_ERROR_HANDLER` with the text `unhandled error in Startup.Main`, and press OK.
4. The exe ends with exit code -1073741819 (`0xC0000005`), and the Windows Application log has an Application Error record (event 1000) for it, faulting module `unknown`, offset 0.

**Expected behavior**
The box shows the error, and the exe ends when it is closed, as it does for the same procedure without the attribute: that exe shows `Run-time error '5'` and `my text`, and ends with exit code 0 when the box is closed. VB6 shows `Run-time error '5':` and `my text` for the same code. The VB6 project is attached as `llvm-unhandled-error-crash-vb6.zip`; built with Unattended Execution, it writes the box's text to the Application log instead (`MsgBox:  , Run-time error '5': my text`).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Severity: medium; a program that should report an error and end crashes instead, and the box does not say which error it was. An error the code causes itself, such as `z = 1 \ z` with `z` 0 (error 11), ends the same way. The same on BETA 987 and 995, and in win32 and win64 exes. An error that an LLVM-compiled procedure handles opens no box (but see #2452 for what `Err` then holds).

<!-- No docs page states this; docs/LLVM/Getting-Started.md says only that a built program "stops as it does for an unhandled error", and stays as it is (owner, 2026-10-06). When fixed, nothing to update. Checked with scripts/bug_repro.mjs (run mode with "exe": tbrun exit 6, the exe's exit code and the box; verify) on 997, and with `run --exe` on win64 and on BETA 987 and 995; the division by zero with tbrun --exe on 997; the VB6 side with `bug_repro vb6` (exit 8, the VB runtime's record). -->
