Filed as [twinbasic/twinbasic#2475](https://github.com/twinbasic/twinbasic/issues/2475).

## A module-level array `Const` with an element that does not fit its type crashes the compiler

**Describe the bug**
An array `Const` at module level whose element is too large for the element type takes the compiler down: `Const Big() As Long = Array(2147483648)`. The IDE's compile restarts the compiler, which crashes again, and the project can neither be compiled nor run. The crash happens whether or not the constant is used. Observed with `tbbuild`, which reports "the compiler crashed 3x".

**To Reproduce**
Steps to reproduce the behavior:
1. Open `array-const-element-overflow-crash.twinproj` (attached as `array-const-element-overflow-crash.zip`). Its one module is:
   ```
   Module Startup
       Const Big() As Long = Array(2147483648)
       Public Sub Main()
       End Sub
   End Module
   ```
2. Compile it. The compiler crashes.

**Expected behavior**
A compile error, as for a scalar constant: `Const K As Long = 2147483648` is refused with TB5002, and `Const Small() As Integer = Array(32768)` with TB5001.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
BETA 995 has no array constants: every array `Const` is refused there with TB5245, *array cannot be initialized here*. VB6 has no array constants either (`Const A() As Long = Array(1)` is a syntax error), so there is no VB6 project.

What crashes, each in a module of its own, unused or used: `Array(2147483648)`, `Array(2147483648#)`, `Array(3000000000.5)` and `Array(1, 2147483648)` for `Long`; `Array(40000.5)` for `Integer`; `Array(300.5)` and `Array(-1.5)` for `Byte`; `Array(9223372036854775808#)` for `LongLong`. What does not: the same constant declared inside a procedure compiles clean; a `Single` or `Double` array with a huge element (`Array(1E+300)`) compiles; an `Integer` or `Byte` element that is an integer literal too large (`Array(32768)`) is the ordinary TB5001.

A second crash seems to belong with this one, and it is not in the reproducer. A `Single` array `Const` whose element overflows, `Const A() As Single = Array(1E+39)`, compiles alone, but crashes the compiler when a later array `Const` of `Double` calls `Sqr`, `Timer` or `Rnd`, for example `Const B() As Double = Array(Sqr(4))` on the next line. The reverse order, `Abs` or `Len` in place of those, `Now` or `Date`, and a `Single` array of `Timer` do not crash. The cause is not established; it could be an overflow flag left by the first constant, which the second one's call then trips over.

Severity: a compiler crash, and the project cannot be opened for compiling until the constant is removed.

<!-- Reproducer: bugs/array-const-element-overflow-crash/ (mode compile, expects tbbuild exit 4); verified on BETA 997 by `bug_repro.mjs verify`; on 995 the same project gives TB5245, as every array Const does there. The Sqr/Timer/Rnd variant was checked with `tbbuild` on BETA 997 in scratch projects (beta997-probes c24_KJ_KTm and the t_* cases) and is not in the reproducer. docs/Reference/Core/Const.md (the "Array constants" section) carries a `> [!WARNING]` for it, naming BETA 997 (a crash, owner's rule), removed once a fixed build is released. -->
