Filed as [twinbasic/twinbasic#2470](https://github.com/twinbasic/twinbasic/issues/2470).

## Passing a module-level array `Const` to a `ParamArray` compiles clean and then fails with a codegen error

**Describe the bug**
A module-level array `Const` passed as the argument of a `ParamArray` parameter compiles without a diagnostic, and the build then fails: the linker reports *compilation (codegen) error detected* at the call. The same constant passed to a parameter declared `a() As Long` is refused at compile time with TB5001, and to a `Variant` parameter with TB5077, so the `ParamArray` case slips through the check. Observed with `tbbuild --build`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `array-const-paramarray-codegen-error.twinproj` (attached as `array-const-paramarray-codegen-error.zip`). Its module:
   ```
   Module Startup
       Const Values() As Long = Array(10, 20, 30)
       Public Sub Main()
           Count Values
       End Sub
       Private Sub Count(ParamArray Items() As Variant)
           Debug.Print UBound(Items)
       End Sub
   End Module
   ```
2. Compile it: no errors. Build it (or press F5).
3. The build log reads `[LINKER] compilation (codegen) error detected in 'Startup.Mainrootmain' at line #7` and `[BUILD] failed`.

**Expected behavior**
A compile error at the call, as for the other whole-array uses of a constant array (TB5001 or TB5077). Documentation says the array "cannot be assigned to an array variable or a Variant, or passed as an array argument".

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
BETA 995 has no array constants (TB5245). VB6 has none either, so there is no VB6 project.

With LLVM the same call gives *a feature used in your code is not yet supported with the LLVM compiler*.

What does not reproduce it: the constant passed after another argument (`Count 1, Values`) fails the same way, but `Count Values(0)`, an element, builds clean, an ordinary array variable passed to a `ParamArray` builds clean, and a constant array declared inside the procedure builds clean.

Severity: low. The build fails with a message that gives the line, but not the cause.

<!-- Reproducer: bugs/array-const-paramarray-codegen-error/ (mode build, expects tbbuild exit 5 and "codegen" in the message); verified on BETA 997 by `bug_repro.mjs verify`; on 995 TB5245. The LLVM message is from the probe c15_paramarray run with `tbrun --llvm` on 997. The quoted documentation sentence is docs/Reference/Core/Const.md, "Array constants". That page carries a `> [!NOTE]` for it, naming BETA 997; removed once a fixed build is released. -->
