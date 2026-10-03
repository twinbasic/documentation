Filed as [twinbasic/twinbasic#2441](https://github.com/twinbasic/twinbasic/issues/2441).

## Stop at a run-time error ends only the procedure that raised it

**Describe the bug**
When a program raises an untrapped error in the debugger and the error panel opens, **Stop** (the panel's button, the toolbar's Stop, or **Run → End**) ends only the procedure that raised the error. The caller carries on running: statements after the call still execute. The program goes on running after the user asked it to stop. Three runs, the same each time.

Its worst consequence is a false pass. At a failed `Assert`, whose error is raised by the assertion's own procedure, **Stop** ends only that procedure: the test carries on past the failed check, and a runner in the shape of the Assert tutorial (`Testing-with-Assert.md`) then prints `All PadLeft tests passed.`

**To Reproduce**
Steps to reproduce the behavior:
1. Open `stop-at-error-ends-procedure.twinproj` (attached as `stop-at-error-ends-procedure.zip`) and press F5. `Main` calls `FillTable`, which raises an error at the line marked `FAILS`, and prints a line after the call:
   ```
   Public Sub Main()
       Debug.Print "main start"
       FillTable
       Debug.Print "main after call"
   End Sub
   
   Private Sub FillTable()
       Dim a(3) As Long, i As Long, idx As Long = 5
       For i = 0 To 2
           Debug.Print "loop " & i
           a(idx) = i ' FAILS
           Debug.Print "after fail " & i
       Next
       Debug.Print "fill end"
   End Sub
   ```
   The error panel opens. The Debug Console shows `main start` and `loop 0`.
2. In the error panel choose **Stop**. (Or press the toolbar's Stop, or **Run → End**: the same.)
3. `FillTable` ends, and `Main` goes on: the Debug Console shows `main after call`.
4. A failed assertion: in `Main` change the call `FillTable` to `TestPadLeft`, which holds `Assert.Exact.AreEqual "   hi", "hi"` between two `Debug.Print` lines, and press F5. At the error panel choose **Stop**, or **Run → End**. `TestPadLeft` carries on past the failed assertion (`test after assert`) and `Main` prints `main after call`.

**Expected behavior**
**Stop** ends the whole run, as it does at an ordinary break: nothing more is printed.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983: both lanes pass there as well. Severity: the program goes on running after the user asked it to stop.

What does not reproduce it: **Stop** at an ordinary break (a breakpoint or a step) prints `aborted` and ends the whole run. By hand on BETA 983, **Ignore (Resume Next)** at the failed assertion did the same as **Stop**, as it should, and moving execution to the test's `End Sub` with **Set Next Statement** and then choosing **Run → End** made it an ordinary break, and the run was aborted (two trials).

<!-- Asserted by `ide-test.bat --only debugger` (test/ide/debugger.test.mjs: "the panel's Stop ends only the failing procedure: Main goes on", "the Stop command, as the toolbar and Run > End give it, does the same", and the control "Stop at an ordinary break ends the whole run") and `ide-test.bat --only assert` (test/ide/assert.test.mjs, the failed-assertion case); all pass on BETA 995. The reproducer's Startup.twin joins the two probes (test/ide/probes/debugger and assert), with the assertion case as TestPadLeft, which is not called until Main is edited; that join was not itself run in a lane. Found by the same probe as the step-key entry; the assertion case by the fix pass for the Assert tutorial. When fixed: update those tests, the NOTE under "Running the tests" in docs/Tutorials/Testing-with-Assert.md, and the Traps on docs/IDE/Menu/Debug.md. -->
