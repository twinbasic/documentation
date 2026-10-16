Filed as [twinbasic/twinbasic#2513](https://github.com/twinbasic/twinbasic/issues/2513).

## LLVM: passing `ByVal` for a `ByRef` parameter of a twinBASIC `Sub` is a codegen error, and the calling procedure does not run

**Describe the bug**
In a project compiled with LLVM, in a 32-bit and in a 64-bit build, a call that passes `ByVal` for a `ByRef` parameter of a twinBASIC `Sub` or `Function` (for example `Take ByVal 0&` for `Sub Take(ByRef h As Long)`) makes the build print `[LLVM] codegen error occurred when compiling 'Startup.Caller': Call parameter type does not match function signature!`, followed by the offending instruction, `call x86_stdcallcc void @"#0"(i32 0)` (an `i32` where the signature has a pointer; `double 0.0` for a `Double`). The build still makes the exe, and the procedure that contains the call does not run: the 64-bit exe ends with an access violation (0xC0000005, no message box, in `ntdll.dll` or `USER32.dll`) when it enters the procedure, and the 32-bit exe skips the procedure and then faults later, in `OLEAUT32.dll`. Without LLVM the call compiles and passes a NULL pointer. VB6 refuses the same call with the error *Type mismatch*, so the call is a twinBASIC extension that the LLVM back end cannot compile. Observed with `bug_repro.mjs run` (which uses `tbrun`) on an exe and in the IDE run, and with the exe's exit code read.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm-byval-to-byref-sub-codegen.twinproj` (attached as `llvm-byval-to-byref-sub-codegen.zip`). It needs an LLVM licence (Ultimate). Its module `Startup` is:
   ```
   Private Declare PtrSafe Sub ExitProcess Lib "kernel32" (ByVal uExitCode As Long)

   Private Sub Take(ByRef h As Long)
   End Sub

   Private Function Caller() As Long
       Take ByVal 0&
       Caller = 7
   End Function

   Public Sub Main()
       If App.IsInIDE Then
           Debug.Print "Caller = " & Caller()
       Else
           ExitProcess Caller()
       End If
   End Sub
   ```
2. In Project Settings, set the architecture to 64-bit and turn **Enable LLVM Compilation** on under **Compiler Options (BUILD)** and under **Compiler Options (DEBUG)**.
3. Run the project in the IDE (F5), and build the exe and run it from a command prompt, reading its exit code (`echo %errorlevel%`).
4. The DEBUG CONSOLE shows the `[LLVM] codegen error` for `Startup.Caller`, the IDE run does not print `Caller = 7`, and the exe exits with -1073741819 (0xC0000005). Turn LLVM off and run again: it prints `Caller = 7`, and the exe exits with code 7.

**Expected behavior**
Either the same as without LLVM, `Caller` returning 7 with a NULL pointer passed to `Take`, so the exe exits with code 7, or a compile error that names the call, as VB6 gives. A codegen error that the build reports and then ignores leaves a program that fails at run time.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same error appears at the first and at the eighth parameter, for a `Long` and for a `Double` parameter, for an `Optional ByRef` parameter that is passed `ByVal 0&`, and with five instead of 0 as the value. These are right: a variable for the `ByRef` parameter, an `Optional ByRef` parameter that is left out, and a `ByVal` parameter. A smaller calling procedure fails the same way. This is not the crash of `llvm64-byval-to-byref-declare-crash`: that one is a call of a `Declare`d API in a 64-bit build only, and the calls in that entry compile.

Severity: medium. A 64-bit program built with LLVM that has such a call ends at the calling procedure, with no message box; a 32-bit one silently skips the procedure, which is worse. The build does report the error, but as a log line, with a successful build after it. Passing a variable for the parameter avoids it.

Not tried: `ByVal Nothing` for a `ByRef` object parameter of a twinBASIC procedure (the documentation's Pointers page describes it), a `ByVal` string or UDT argument, a method of a class, and a `Property` with a `ByRef` parameter. The generated code was not read.

<!-- Reproducer: bugs/llvm-byval-to-byref-sub-codegen/ (mode run with arch win64, llvm and exe: the DEBUG CONSOLE has the codegen error for Startup.Caller and tbrun --exe --llvm --arch win64 shows the exe exiting 0xC0000005; expect is tbrun exit 5, those two lines, and absent `Caller = 7` and `exit 7`); verified on BETA 1005 by `bug_repro.mjs verify`. Controls: `run --exe --arch win64` (no LLVM) prints `Caller = 7` and exits 7; `run --exe --llvm --arch win32` prints the codegen error and exits 0 (Caller skipped). Pages: docs/LLVM/Getting-Started.md, "Language support", and docs/Reference/Core/Call.md carry the WARNING labelled BETA 1005; remove both when a fix is released. The additional-context cases (first and eighth parameter, Double, Optional, a variable, the argument left out, a ByVal parameter) were run in a session of 2026-10-16 and are not in the reproducer. -->
