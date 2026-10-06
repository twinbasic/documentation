Filed as [twinbasic/twinbasic#2472](https://github.com/twinbasic/twinbasic/issues/2472).

## A module-level array `Const` declared after a procedure is not found by the procedures that follow it

**Describe the bug**
In a module, an array `Const` that is declared after a procedure cannot be used by the procedures declared after it: the use is TB5079, *Unrecognized symbol*. A scalar `Const` in the same place works. A procedure declared before the constant does see the name, and reads the array as empty: `Arr(1)` raises error 9 at run time. Observed in the compiler's diagnostics.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `array-const-after-procedure-not-found.twinproj` (attached as `array-const-after-procedure-not-found.zip`). Its module is:
   ```
   Module Startup
       Public Sub Main()
       End Sub
       Const Scalar As Long = 5
       Const Arr() As Long = Array(1, 2, 3)
       Public Sub UseIt()
           Debug.Print Scalar
           Debug.Print Arr(1)
       End Sub
   End Module
   ```
2. Compile it. The only error is `TB5079 Unrecognized symbol 'Arr'` on the use in `UseIt`; `Scalar` is found.

**Expected behavior**
No error: the constant is visible to every procedure of the module wherever it is declared, as a scalar `Const` is.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
BETA 995 has no array constants (TB5245). VB6 has none either, so there is no VB6 project.

Any procedure kind before the constant has the effect: a `Sub`, a `Function` and a `Property Get` were each checked. A declaration before the first procedure is fine, as are one after a `Dim`, an `Enum` or a `Type`. A `Public` array `Const` after a procedure is also unreachable from another module: `Startup.Arr(1)` is TB5027. Qualifying the name inside the module does not help. Classes are not affected: the order does not matter there.

A procedure declared before the constant does find it, and then fails at run time. With `[RunAfterBuild] Public Sub Run()` first and `Const Arr() As Long = Array(1, 2, 3)` after it, `v = Arr(1)` under `On Error Resume Next` leaves `Err=9 Subscript out of range` and `v` unchanged.

Severity: low, since the use is refused with an error; the run-time error 9 in an earlier procedure is a less obvious form of the same fault.

<!-- Reproducer: bugs/array-const-after-procedure-not-found/ (mode compile, expects exit 1 and TB5079); verified on BETA 997 by `bug_repro.mjs verify`; on 995 TB5245. The earlier-procedure case (error 9), the Function, Property and cross-module cases were checked with tbbuild and tbrun on 997 in scratch projects, not in the reproducer. docs/Reference/Core/Const.md (the "Array constants" section) carries a `> [!NOTE]` for it, naming BETA 997: declare an array Const before the first procedure of its module; removed once a fixed build is released. -->
