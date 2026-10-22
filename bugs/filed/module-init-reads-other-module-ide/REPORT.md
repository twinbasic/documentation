Filed as [twinbasic/twinbasic#2545](https://github.com/twinbasic/twinbasic/issues/2545).

## In the IDE, a module-level initializer that reads another module's variable leaves every module-level variable at 0

**Describe the bug**
When one module-level variable's initializer reads a variable of another module (`Public FromConfig As Long = Config.Limit + 100`), code run in the IDE reads every module-level variable of the project as 0, including ones whose initializers are constants (`Public Limit As Long = 5`). The built exe gets them all right. Observed with a `[RunAfterBuild]` procedure, through `tbrun` and `bug_repro.mjs run`; the exe was run with `tbrun --exe`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `module-init-reads-other-module-ide.twinproj` (attached as `module-init-reads-other-module-ide.zip`). Its file `Startup.twin` is:
   ```
   Module Config
       Public Const Base As Long = 7
       Public Limit As Long = 5
       Public Doubled As Long = Base * 2
   End Module

   Module Other
       Public FromConfig As Long = Config.Limit + 100
   End Module

   Class Box
       Public Size As Long = 3
   End Class

   Module Startup
       Public Sub Main()
           Dim b As New Box
           Debug.Print "Limit=" & Config.Limit & " Doubled=" & Config.Doubled & " FromConfig=" & Other.FromConfig & " Box.Size=" & b.Size
       End Sub
   End Module
   ```
2. Add a module with a `[RunAfterBuild]` procedure that calls `Startup.Main`, and build the project.
3. The DEBUG CONSOLE prints `Limit=0 Doubled=0 FromConfig=0 Box.Size=3`.

**Expected behavior**
`Limit=5 Doubled=14 FromConfig=105 Box.Size=3`, which is what the built exe prints. Module-level initializers are a twinBASIC extension, so there is no VB6 behaviour to compare with.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Every module-level variable reads 0 as long as one initializer reads another module's variable. Each of these makes the IDE print `Limit=5 Doubled=14`: the same project without `Other`, `FromConfig = 100`, `FromConfig = Config.Base + 100` (another module's constant), and `FromConfig = Limit2 + 100`, where `Limit2` is a variable of `Other` itself. A class field initializer runs either way (`Box.Size=3`). In the exe, a module whose initializer reads a module that is set up after it reads 0 there; that is a matter of order, and the IDE gives 0 for every module, whatever the order.

Severity: medium. A `[RunAfterBuild]` procedure that signs or post-processes the build sees wrong settings with no message, and code that runs correctly as an exe behaves differently in the IDE.

Not tried: a run with F5 (only `[RunAfterBuild]` was observed), a variable of the module's own read with a qualified name (`Other.Limit2`), 64-bit, LLVM.

<!-- Reproducer: bugs/module-init-reads-other-module-ide/ (mode run: bug_repro run prints the zeros; expect matches "Limit=0 Doubled=0 FromConfig=0 Box.Size=3"); verified on BETA 1010 by `bug_repro.mjs verify`. The exe side and the variants are from scratch probes (tbrun --exe with TbRun.Out; one tbrun per variant), not kept. It also means a check_run sample that relies on a module-level initializer reading another module would print 0 under check_examples. Page: docs/Features/Language/Inline-Initialization.md, "What an Initializer Can Use", last bullet, advises against reading another module's variable; when a fix is released, nothing there needs to change. Found 2026-10-20 while documenting field initializers. -->
