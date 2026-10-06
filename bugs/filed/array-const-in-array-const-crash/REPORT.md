Filed as [twinbasic/twinbasic#2474](https://github.com/twinbasic/twinbasic/issues/2474).

## A module-level array `Const` initialised from an element of another array `Const` crashes the compiler

**Describe the bug**
At module level, an array `Const` whose `Array(...)` list names an element of another array `Const` crashes the compiler: `Const A() As Long = Array(1, 2, 3)` followed by `Const B() As Long = Array(A(0))`. The compiler crashes again each time the IDE restarts it, so the project cannot be compiled or run. Observed with `tbbuild`, which reports "the compiler crashed 3x".

**To Reproduce**
Steps to reproduce the behavior:
1. Open `array-const-in-array-const-crash.twinproj` (attached as `array-const-in-array-const-crash.zip`). Its one module is:
   ```
   Module Startup
       Const A() As Long = Array(1, 2, 3)
       Const B() As Long = Array(A(0))
       Public Sub Main()
       End Sub
   End Module
   ```
2. Compile it. The compiler crashes.

**Expected behavior**
Either `B` is `Array(1)`, as it is when the two constants are declared in a procedure, or the compiler refuses the element with an error, as it does for a scalar constant (`Const S As Long = A(0)` is TB5002).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
BETA 995 has no array constants: every array `Const` is refused there with TB5245. VB6 has none either, so there is no VB6 project.

It crashes with `B` used or unused, with `Private` constants, with `Double` arrays, with the two in the opposite order, and when an array refers to its own element (`Const B() As Long = Array(1, B(0))`).

What does not crash: the same two constants inside a procedure compile clean; an array whose element is a scalar `Const` compiles; `Array(A(0) + 1)` is an ordinary TB5001, *Type mismatch*.

Severity: a compiler crash, and the project cannot be compiled until the constant is removed.

<!-- Reproducer: bugs/array-const-in-array-const-crash/ (mode compile, expects tbbuild exit 4); verified on BETA 997 by `bug_repro.mjs verify`; on 995 the project gives TB5245. The variants above were checked with `tbbuild` on 997 in scratch projects. docs/Reference/Core/Const.md (the "Array constants" section) carries a `> [!WARNING]` for it, naming BETA 997 (a crash, owner's rule), removed once a fixed build is released. Related: array-const-element-overflow-crash. -->
