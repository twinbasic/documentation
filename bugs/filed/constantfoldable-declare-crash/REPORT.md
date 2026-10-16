Filed as [twinbasic/twinbasic#2518](https://github.com/twinbasic/twinbasic/issues/2518).

## A call to a `Declare Function` marked `[ConstantFoldable]` crashes the build when Constant Function Folding is on

**Describe the bug**
With **Constant Function Folding** set to **Yes** in Project Settings (`"optimizer.constantFunctionFolding": true`), a `Declare Function` that carries `[ConstantFoldable]` (or `[ConstantFoldableNumericsOnly]`) and is called with constant arguments crashes the compiler during the build. The project compiles clean (0 errors, 0 warnings); Build then prints `NATIVE EXCEPTION: ACCESS_VIOLATION` in the DEBUG CONSOLE, the IDE restarts the compiler on the project, the same exception follows, and no exe is written.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `constantfoldable-declare-crash.twinproj` (attached as `constantfoldable-declare-crash.zip`). Its project has Constant Function Folding set to Yes, and its one source file, `Startup.twin`, holds the whole bug:
   ```
   Module Startup

       Public Sub Main()
           GetCurrentProcessId
       End Sub

       [ConstantFoldable]
       Declare Function GetCurrentProcessId Lib "kernel32" () As Long

   End Module
   ```
2. Let the IDE compile it: no diagnostic.
3. Build the project (**Build**, or `node scripts/tbbuild.mjs <project> --build`). See the DEBUG CONSOLE: `NATIVE EXCEPTION: ACCESS_VIOLATION  {unknown} [$00000000]`, then `restarting from MEMORY [...]` and the same exception again. The build produces no exe.

What it depends on, each tried in a project of its own:
- it needs the setting on, the attribute and a call: with Constant Function Folding off the project builds; without `[ConstantFoldable]` it builds; with the attribute and no call (`Sub Main` empty) it builds;
- every argument of the call must be a constant, and a call with none counts: `r = DSleepFn(5, 0)` for `Declare Function DSleepFn Lib "kernel32" Alias "SleepEx" (ByVal ms As Long, ByVal a As Long) As Long` crashes, and so does the zero-argument call above. With a variable for either argument (`v = 5: r = DSleepFn(v, 0)`, or `DSleepFn(5, v)`) it builds;
- `[ConstantFoldableNumericsOnly]` crashes as `[ConstantFoldable]` does; `Declare`, `Declare PtrSafe`, `Private Declare` and `DeclareWide` all crash; the call may be a statement or the right side of an assignment;
- a `[ConstantFoldable]` ordinary `Function` in a Module, called with a constant, builds (it is folded, which is what the attribute is for), and so does a `Declare Sub`.

**Expected behavior**
A built exe. A call to a Declare is not a pure function of its arguments (it calls into a DLL), so it is either not folded, or the attribute is refused on a `Declare Function` with a diagnostic, as it is refused on a method of a class. The compiler does not crash. The attribute does not exist in VB6, and neither does Constant Function Folding.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same in a 32-bit and a 64-bit build. The IDE's compile (what runs when a project is opened or edited) is clean, so the editor shows no sign of the problem; only Build crashes, so a project can hold the line for a long time before it is noticed.
Severity: medium. The build crashes every time, and the compiler restarts into the same crash, but the project compiles and runs from the IDE, and removing the attribute or the setting fixes it. No wrong code is produced.

<!-- Reproducer: bugs/constantfoldable-declare-crash/ (mode build; expect is tbbuild exit 5 and ACCESS_VIOLATION in the message); verified on BETA 1005 by `bug_repro.mjs verify`, and built with --arch win64 too. Narrowed from the SleepEx form (probe fp1 to fp4 of the attribute sweep): the arguments need not be there, and PtrSafe is not needed. Page: docs/Reference/Attributes.md carries the callout, a `> [!WARNING] BETA 1005`, entry ConstantFoldable (ConstantFoldableNumericsOnly refers to it); remove it when a fix is released. Found 2026-10-15 while probing the attributes at sites the page does not list. -->
