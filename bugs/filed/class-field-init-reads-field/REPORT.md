Filed as [twinbasic/twinbasic#2546](https://github.com/twinbasic/twinbasic/issues/2546).

## A class field whose initializer reads another field of the class fails the build with a codegen error

**Describe the bug**
A field initializer in a class that reads another field of the same class (`Public Second As Long = First + 1`) compiles with no diagnostic, and the build fails once the class is used: `[LINKER] compilation (codegen) error detected in 'Counter.{fields_init}' at line #1`, then `[LINKER] FAILED due to compilation errors`. A run in the IDE goes ahead instead, and the field holds an arbitrary number: with `A` = 1, `X = A + 1` read `1073741889`. Observed with `tbbuild --build` and with `tbrun` (a `[RunAfterBuild]` procedure in the IDE).

**To Reproduce**
Steps to reproduce the behavior:
1. Open `class-field-init-reads-field.twinproj` (attached as `class-field-init-reads-field.zip`). Its file `Startup.twin` is:
   ```
   Module Startup
       Public Sub Main()
           Dim c As New Counter
           Debug.Print c.First & ", " & c.Second
       End Sub
   End Module

   Class Counter
       Public First As Long = 1
       Public Second As Long = First + 1
   End Class
   ```
2. Compile the project: no diagnostic.
3. Build it. The DEBUG CONSOLE prints `[LINKER] compilation (codegen) error detected in 'Counter.{fields_init}' at line #1` and `[BUILD] failed`.

**Expected behavior**
The build succeeds and `Main` prints `1, 2`: `Second`'s initializer reads `First`, whose initializer comes before it. If reading another field is not meant to be allowed, the compiler should say so at the declaration, as it does for a call to a procedure of the project (TB5079). Field initializers are a twinBASIC extension, so there is no VB6 behaviour to compare with.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
The same codegen error, one line per class, for `X = A` with no arithmetic, `X = Me.A + 1`, `String` fields (`X = S & "b"`), a `ReadOnly` field read, a field declared below the one that reads it, and a field with no initializer of its own, in 32-bit and 64-bit builds. These are right: a field that reads a module-level variable (`X = Mods.MV + 1`) or a constant, a module-level variable that reads a variable of its own module (`MW = MV + 1`), and a class that is never created (it is not compiled, so the build does not fail).

Severity: medium. The build fails with a message that names the class but not the field or the reason, and the IDE run gives a wrong value with no message at all. Setting the field in `Class_Initialize` or `Sub New` avoids it.

Not tried: an `Object` or `Variant` field, LLVM.

<!-- Reproducer: bugs/class-field-init-reads-field/ (mode build: tbbuild --build exits 5 and the output names the codegen error in 'Counter.{fields_init}'); verified on BETA 1010 by `bug_repro.mjs verify`. The variants and win64 are from a scratch probe (one class per variant), not kept. Page: docs/Features/Language/Inline-Initialization.md, "What an Initializer Can Use", states it as the behaviour ("A class field cannot read another field of the same class"); when a fix is released, that bullet changes to say it can. Found 2026-10-20 while documenting field initializers. -->
