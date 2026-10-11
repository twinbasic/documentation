Filed as [twinbasic/twinbasic#2485](https://github.com/twinbasic/twinbasic/issues/2485).

## A watch on a variable of a user-defined type fails with a codegen error, and the Debug Console reports a linker error at every stop

**Describe the bug**
While the debugger is stopped, `? p` in the Debug Console, where `p` is a variable of a user-defined type, fails with `(compile error: codegen error; check for compilation errors)`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`. **Variables** and a watch on `p` show the same variable and its fields without trouble.

On BETA 995 and 997 a watch on `p` failed in the same way, and repeated the linker error at every later stop; BETA 1005 fixed the watch, and left `? p` as it was.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `udt-watch-codegen-error.twinproj` (attached as `udt-watch-codegen-error.zip`). `Startup.twin` declares a type, and `Main` passes the line marked `BREAK` twice:
   ```
   Private Type Point
       X As Long
       Y As Long
   End Type

   Public Sub Main()
       Dim p As Point
       Dim i As Long
       p.X = 7
       For i = 1 To 2
           Debug.Print "pass " & i ' BREAK
       Next
   End Sub
   ```
2. Put a breakpoint on the line marked `BREAK` (F9) and press F5. The run stops there, and **Variables** shows `p` as `{user defined type, 8 bytes}`, with `X` and `Y`.
3. Type `? p` in the Debug Console and press Enter. It prints `(compile error: codegen error; check for compilation errors)`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`.

**Expected behavior**
An expression that cannot be shown, such as `? p`, which has no single value to print, is refused with a message about the expression. A linker error about generated code reads as though the project had failed to build, which it has not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
Also on BETA 987, 995 and 997, where a watch on `p` failed in the same way.

What does not reproduce it, on BETA 1005: a watch on `p`, which shows `{user defined type, 8 bytes}`, of type `Point`, and again at the next stop with no linker error; a watch on a field, `p.X`, which shows `7`, of type `Long`; and **Variables**, which shows `p` and its fields. Seen with a `Private Type` declared in the module; other declarations of the type were not tried.

Severity: low. The console reports a failed build for a line that only asks to print a structure.

<!-- Asserted by `ide-test.bat --only watches` (test/ide/watches.test.mjs: the watch on p, the watch on p.X and the next stop, which now assert the fixed behaviour, and ? p, which asserts the defect); passes on BETA 1005, and its earlier form passed on 995 and 987. The reproducer's Startup.twin is test/ide/probes/watches/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->
