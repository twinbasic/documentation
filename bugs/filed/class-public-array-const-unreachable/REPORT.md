Filed as [twinbasic/twinbasic#2471](https://github.com/twinbasic/twinbasic/issues/2471).

## A `Public` array `Const` in a class is accepted but cannot be reached from outside, where a `Public` scalar `Const` is refused

**Describe the bug**
A class may not have a `Public` constant: `Public Const Num As Long = 5` in a class is refused with TB5250, *Constants in a class cannot be Public*. For an array constant the declaration `Public Const Arr() As Long = Array(1, 2, 3)` is accepted without a diagnostic, and then `Arr` cannot be reached from outside the class: `obj.Arr(1)` is TB5027, *Unrecognized member*. The declaration is accepted and the constant is private in practice. Observed in the compiler's diagnostics.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `class-public-array-const-unreachable.twinproj` (attached as `class-public-array-const-unreachable.zip`). Class `WithArray` declares `Public Const Arr() As Long = Array(1, 2, 3)` and class `WithScalar` declares `Public Const Num As Long = 5`. `Sub Main` reads `a.Arr(1)` and `s.Num` from instances.
2. Compile it. The diagnostics are:
   ```
   Startup.twin [7,21]: TB5027 Unrecognized member 'Arr' on type '_WithArray' [non-extensible object]
   Startup.twin [8,21]: TB5027 Unrecognized member 'Num' on type '_WithScalar' [non-extensible object]
   WithScalar.twin [3,18]: TB5250 Constants in a class cannot be Public
   ```
   The declaration in `WithArray` has no diagnostic of its own.

**Expected behavior**
The same refusal for both: TB5250 on the declaration of `Arr`, so that the cause is named at the declaration and not as an unrecognized member at each use.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
BETA 995 has no array constants (TB5245). VB6 has none either, so there is no VB6 project; a `Public Const` in a VB6 class is refused.

Inside the class, the array constant reads correctly (`Arr(1)` in `WithArray.Show`). A `Private` array `Const` in a class works, and `Friend`, `Protected` and `Static` are accepted as well.

Severity: low. The error appears at the use, with a message that does not mention the declaration.

<!-- Reproducer: bugs/class-public-array-const-unreachable/ (mode compile, expects TB5027 and TB5250); verified on BETA 997 by `bug_repro.mjs verify`; on 995 TB5245. The VB6 remark is from knowledge of VB6, not run. docs/Reference/Core/Const.md (the "Array constants" section) carries a `> [!NOTE]` for it, naming BETA 997; removed once a fixed build is released. -->
