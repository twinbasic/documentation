Filed as [twinbasic/twinbasic#2517](https://github.com/twinbasic/twinbasic/issues/2517).

## `[RunBeforeStartupObject]` on a generic procedure crashes the build

**Describe the bug**
`[RunBeforeStartupObject]` on a generic procedure of a Module, `Public Sub Pre(Of T)()`, compiles without a diagnostic and then crashes the compiler during the build. The DEBUG CONSOLE shows `NATIVE EXCEPTION: ACCESS_VIOLATION`, the IDE restarts the compiler on the project, the same exception follows, and no exe is written.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `runbeforestartupobject-generic-crash.twinproj` (attached as `runbeforestartupobject-generic-crash.zip`). Its one source file, `Startup.twin`, holds the whole bug:
   ```
   Module Startup

       Public Sub Main()
       End Sub

       [RunBeforeStartupObject]
       Public Sub Pre(Of T)()
       End Sub

   End Module
   ```
2. Let the IDE compile it: no diagnostic.
3. Build the project. See the DEBUG CONSOLE: `NATIVE EXCEPTION: ACCESS_VIOLATION  {no-basic-code} [$1EA2AFE8:twinBASIC_win32.dll+0002AFE8]`, then `restarting from MEMORY [...]` and the same exception again. No exe is written.

What it depends on, each tried in a project of its own:
- the generic procedure with the attribute alone is the cause: `Pre(Of T)` without the attribute builds, and `Pre()` with it, not generic, builds;
- a generic `Function` crashes too (`Public Function Pre(Of T)() As Boolean`); the body, an empty Sub or Function, does not matter, and nothing calls `Pre`.

**Expected behavior**
Either a diagnostic that the attribute is not allowed on a generic procedure, or a built exe in which `Pre` runs before `Main` (what it does on a procedure that is not generic). The compiler does not crash. The attribute does not exist in VB6.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same in a 32-bit and a 64-bit build. Only Build crashes: the IDE's compile and the sweep of the attribute's sites find no problem, so the line stays unnoticed until the first build.
Severity: medium. The build crashes every time, and the compiler restarts into the same crash; removing the attribute from the generic procedure fixes it.

<!-- Reproducer: bugs/runbeforestartupobject-generic-crash/ (mode build; expect is tbbuild exit 5 and ACCESS_VIOLATION in the message); verified on BETA 1005 by `bug_repro.mjs verify`, and built with --arch win64 too. Narrowed from probe rs6b of the attribute sweep, which had the same two procedures: the generic Function crashes as well, a generic Sub with no attribute and a plain Sub with it do not. Page: docs/Reference/Attributes.md carries the callout, a `> [!WARNING] BETA 1005`, entry RunBeforeStartupObject; remove it when a fix is released. Found 2026-10-15 while probing the attributes at sites the page does not list. -->
