Filed as [twinbasic/twinbasic#2485](https://github.com/twinbasic/twinbasic/issues/2485).

## A watch on a variable of a user-defined type fails with a codegen error, and the Debug Console reports a linker error at every stop

**Describe the bug**
While the debugger is stopped, a watch on a variable of a user-defined type cannot be evaluated. **Watches** shows `(compile error: codegen error; check for compilation errors)`, of type `ERROR`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`. The linker error comes again at every later stop while the watch exists, and `? p` in the Debug Console fails the same way. **Variables** shows the same variable and its fields without trouble, and a watch on one of its fields works.

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
3. Add a watch on `p` (**Debug > Add Watch...**, or the plus sign in **Watches**). The watch shows `(compile error: codegen error; check for compilation errors)`, of type `ERROR`, and the Debug Console prints `[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1`.
4. Press F5. The run stops at the breakpoint again, and the Debug Console prints the linker error again.
5. Type `? p` in the Debug Console and press Enter. It fails with the same error, and the Debug Console prints the same linker line.

**Expected behavior**
The watch shows `p` as **Variables** does, `{user defined type, 8 bytes}` opening to its fields, as VBA's Watch window shows a variable of a user-defined type. An expression that cannot be shown, such as `? p`, which has no single value to print, is refused with a message about the expression. A linker error about generated code reads as though the project had failed to build, which it has not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: a watch on a field, `p.X`, which shows `7`, of type `Variant [Long]`; and **Variables**, which shows `p` and its fields. That type suggests a watch is evaluated as a `Variant`, which cannot hold a value of a user-defined type. Seen with a `Private Type` declared in the module; other declarations of the type were not tried.

Severity: a watch on a structure is unusable, and while it exists every stop adds a linker error to the Debug Console.

<!-- Asserted by `ide-test.bat --only watches` (test/ide/watches.test.mjs: the watch on p, the watch on p.X, the next stop, and ? p); passes on BETA 995 and 987. The reproducer's Startup.twin is test/ide/probes/watches/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->
