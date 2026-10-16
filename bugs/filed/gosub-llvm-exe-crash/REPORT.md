Filed as [twinbasic/twinbasic#2512](https://github.com/twinbasic/twinbasic/issues/2512).

## A `GoSub` in an exe built with LLVM ends the program with an access violation

**Describe the bug**
In an exe built with LLVM turned on, a procedure that runs `GoSub <label>` ends the program with an access violation (exit code -1073741819, 0xC0000005, in the exe's own module) at the `GoSub` statement, before the first statement after the label. No message box is shown. The same project built without LLVM runs correctly, and so does its run in the IDE with LLVM turned on for the debug run (Compiler Options (DEBUG)): only the built exe is affected, in a 32-bit and in a 64-bit build. Observed by building the exe and running it with its exit code read, and in the Application log, which records the fault.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `gosub-llvm-exe-crash.twinproj` (attached as `gosub-llvm-exe-crash.zip`). It needs an LLVM licence (Ultimate). Its module `Startup` is:
   ```
   Private Declare Sub ExitProcess Lib "kernel32" (ByVal uExitCode As Long)

   Private Function G() As Long
       Dim n As Long
       GoSub L
       G = n
       Exit Function
   L:
       n = 7
       Return
   End Function

   Public Sub Main()
       If App.IsInIDE Then
           Debug.Print "G = " & G()
       Else
           ExitProcess G()
       End If
   End Sub
   ```
2. In Project Settings, turn **Enable LLVM Compilation** on under **Compiler Options (BUILD)**, and build the exe (32-bit, then 64-bit).
3. Run the exe from a command prompt and read its exit code (`echo %errorlevel%`).
4. See -1073741819 (0xC0000005), and the fault recorded in the Application log. Turn LLVM off, build again and run: the exit code is 7.

**Expected behavior**
`G` returns 7, so the exe exits with code 7, as it does without LLVM.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
Every `GoSub` tried faults: in a Sub and in a Function, with a loop and without, with and without an assignment to a local, and with a label whose `Return` is the only statement. The fault is at the `GoSub` itself: nothing after it runs. With LLVM turned on under **Compiler Options (DEBUG)**, a run in the IDE (F5) prints `G = 7`; with the same setting on for the build, the exe faults.

TBMANLIB 1.0.0.29 has two members that use `GoSub` (`ToolsDic.OverWrite` and `cCsv.NewColumn`), and an exe built with LLVM that calls either ends the same way. In a copy of the package where each `GoSub` is replaced by a call to a Private Sub (or the label's code written inline), the same exe runs and gives what the plain exe gives.

Severity: high for a program built with LLVM. The program ends at the first `GoSub` it runs, with no message, and no wrong result is produced. Building without LLVM, or replacing the `GoSub` by a call to a Private Sub, avoids it.

Not tried: `On ... GoSub`, a `GoSub` in a class method, a label inside a nested block, and a `GoSub` reached from an error handler.

<!-- Reproducer: bugs/gosub-llvm-exe-crash/ (mode run with exe and llvm: the IDE run prints `G = 7`, and tbrun --exe --llvm shows the exe exiting 0xC0000005; expect is tbrun exit 6, that line, the exit line, and absent `exit 7`); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too. Control: `run --exe` without --llvm exits 7, win32 and win64. Pages: docs/LLVM/Getting-Started.md, "Language support", and docs/Reference/Core/GoSub-Return.md carry the WARNING labelled BETA 1005; remove both when a fix is released. Found 2026-10-15 when three TBMANLIB samples of the documentation ended an LLVM exe with no box. -->
