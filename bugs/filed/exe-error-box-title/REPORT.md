Filed as [twinbasic/twinbasic#2501](https://github.com/twinbasic/twinbasic/issues/2501).

## The box for an unhandled error in a built exe is titled `shutdown`, not with the program's title

**Describe the bug**
In a built exe, the message box for an unhandled run-time error has the title `shutdown`. The project's title (`App.Title`) is not used, and neither is a title assigned to `App.Title` at run time.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `exe-error-box-title.twinproj` (attached as `exe-error-box-title.zip`). Its title, in the project settings, is `ExeErrorBoxTitle`.
   ```
   Public Sub Main()
       Err.Raise 5, "MySrc", "my text"
   End Sub
   ```
2. Build the project and run the exe.
3. See a box titled `shutdown`, with the text `Run-time error '5'` and `my text`.

**Expected behavior**
The box is titled with the program's title, `ExeErrorBoxTitle`, as VB6 titles it with `App.Title`. The VB6 project is attached as `exe-error-box-title-vb6.zip`; its exe shows a box titled `ExeErrorBoxTitle` with the text `Run-time error '5':` and `my text`. (Its `Form1` is never shown; it is there because a VB6 project without a form may be built with Unattended Execution, which writes the error to the event log instead of showing a box.)

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Severity: low; the box does not say which program it comes from. The same when `App.Title` is assigned before the error, for an error raised in a form's event procedure, and on BETA 983 and 995. #2017 mentions the same title for an error raised in a COM interface implementation.

<!-- No docs page states the title; when fixed, nothing to update. Checked with scripts/bug_repro.mjs (run mode with "exe": tbrun exit 6 and the box's title; verify) on 997, and with `run --exe` on BETA 983 and 995 (with a form, see form-event-error-continues); `App.Title` assigned at run time with `run --exe` on 997; the VB6 side with `bug_repro vb6` (exit 8, the box). -->
