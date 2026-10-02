Filed as [twinbasic/twinbasic#2443](https://github.com/twinbasic/twinbasic/issues/2443).

## A call through a `FastCall` or `ThisCall` delegate is made as stdcall on win32

**Describe the bug**
On win32, a call through a delegate declared `FastCall` or `ThisCall` passes its arguments as stdcall does, whatever convention the delegate declares, and raises *Bad DLL definition. Stack corruption detected.* The delegate is unusable on win32: every call through it raises an error.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `fastcall-delegate-stdcall.twinproj` (attached as `fastcall-delegate-stdcall.zip`) and run it (F5) with the win32 target. Its declarations and the calls in its `Sub Main` hold the whole bug:
   ```
   Public Delegate Function FastDel FastCall (ByVal a As Long, ByVal b As Long) As Long
   
   Public Function GF FastCall(ByVal a As Long, ByVal b As Long) As Long
       Return a * 100 + b
   End Function
   
   Public Function GS(ByVal a As Long, ByVal b As Long) As Long
       Return a * 100 + b
   End Function
   
   Dim d As FastDel = AddressOf GF
   Debug.Print d(9, 1)        ' error: "Bad DLL definition.  Stack corruption detected."
   Dim e As FastDel = AddressOf GS
   Debug.Print e(9, 1)        ' 901: a stdcall target works, after warning TB0026
   ```
2. See the error for the call through `d`, and 901 for the call through `e`. The project declares a `ThisCall` delegate and function as well, and the same call through it raises the same error.

**Expected behavior**
901 from each call through `d`, as from calling `GF` directly.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the delegate is unusable on win32. What does not reproduce it:
- calling `GF` directly: 901. The callee side is right: a `FastCall Naked` function that returns `ECX + EDX`, and a `ThisCall Naked` one that returns `ECX + [ESP+4]` and ends `ret 4`, return the right sums when called directly;
- delegates declared stdcall (no keyword) or `CDecl`, each pointed at a function of its own convention: 901;
- a win64 build: every case above returns 901 (x64 has one calling convention; this project run with the win64 target prints 901 for all of them).

Both keywords are new in BETA 990 and 992; BETA 987 refuses them (TB5182), and BETA 983 reports errors for this project at compile time. Measured in the IDE's `[RunAfterBuild]` run, and in the compiled EXE that `tbrun` left, run from its `Sub Main` and writing to a file: the same five results both ways.

<!-- Stated by docs/Features/Advanced/API-Declarations.md (the calling-conventions section, which describes the defect) and docs/Reference/Core/Delegate.md; when fixed, update both. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 win32 and win64 and 983; the Naked callee, CDecl and stdcall controls and the exe run are from earlier tbrun probes in .claude/tooling-review-scratch/beta995-probes/callconv. -->
