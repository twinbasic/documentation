Filed as [twinbasic/twinbasic#2516](https://github.com/twinbasic/twinbasic/issues/2516).

## `[RunAfterBuild]` on a generic Sub is accepted and the Sub never runs

**Describe the bug**
A Sub marked `[RunAfterBuild]` runs in the IDE once the build has finished. When the Sub is generic (`Public Sub Built(Of T)()`), the attribute is accepted with no diagnostic, the project builds, and the DEBUG CONSOLE says `[BUILD] Executing '...Built'...` as it does for any other such Sub, but the body of the Sub is never run: its `Debug.Print` prints nothing and a file it opens is not written. The compiler does count the Sub as the project's `[RunAfterBuild]`, since a second one is TB5114, *encountered too many [RunAfterBuild] attributes. Only allowed one per-project*.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `runafterbuild-generic-sub-never-runs.twinproj` (attached as `runafterbuild-generic-sub-never-runs.zip`). Its one source file, `Startup.twin`, holds the whole bug:
   ```
   Module Startup

       Public Sub Main()
       End Sub

       [RunAfterBuild]
       Public Sub Built(Of T)()
           Debug.Cls
           Debug.Print "built"
       End Sub

   End Module
   ```
2. Build the project.
3. See the DEBUG CONSOLE: the build log, ending `[BUILD] Executing 'RunafterbuildGenericSubNeverRuns.Startup.Built'...`, and no line `built` after it. Remove `(Of T)` and build again: `built` is printed (the console is cleared first, so it is the only line).

Tried in a project of its own: a body that opens a file under `Environ("TEMP")` and writes a line to it, in place of the `Debug.Print`; the file is not created. The same in a 32-bit and a 64-bit build.

**Expected behavior**
The Sub runs after the build, as it does without `(Of T)`, or the attribute is refused on a generic Sub with a diagnostic (as `[RunAfterBuild]` is refused on a second procedure, TB5114). A Sub that the compiler accepts, counts and announces as executing runs. The attribute does not exist in VB6.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
`[RunAfterBuild]` on a `Function` and on a `Property Get` in a Module runs as it does on a Sub, in the same project layout.
Severity: low. Nothing crashes and nothing is lost; the code the author expected to run does not, with no message.

<!-- Reproducer: bugs/runafterbuild-generic-sub-never-runs/ (mode run with exe, so that tbrun reads the DEBUG CONSOLE; expect is the `Executing` line, no `built` line, and the exe exiting 0); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too. Control: the same project with `Built()` not generic prints `built` (scratch variant, not kept). The first reproducer tried was `run` without `exe`, which fails with TB5114 because the harness adds a [RunAfterBuild] Sub of its own, which is how the counting was seen. Page: docs/Reference/Attributes.md carries the callout, a `> [!WARNING] BETA 1005`, entry RunAfterBuild; remove it when a fix is released. Found 2026-10-15 while probing the attributes at sites the page does not list (probe rb3, control rb4). -->
