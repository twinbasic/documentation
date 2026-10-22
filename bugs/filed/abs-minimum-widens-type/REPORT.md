Filed as [twinbasic/twinbasic#2541](https://github.com/twinbasic/twinbasic/issues/2541).

## `Abs` of the smallest `Integer` or `Long` returns a `Long` or a `Double`, where VB6 raises error 6

**Describe the bug**
`Abs` returns a value of the type it is given: `Abs` of the `Integer` -32767 is the `Integer` 32767. The smallest `Integer`, -32768, has no positive counterpart in an `Integer`, and VB6 raises error 6, *Overflow*, for it, as for the smallest `Long` and the smallest `Currency`. twinBASIC raises 6 for the `Currency`, but for the `Integer` it returns the `Long` 32768, for the `Long` -2147483648 the `Double` 2147483648, and for the smallest `LongLong` a `Double`. Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `abs-minimum-widens-type.twinproj` (attached as `abs-minimum-widens-type.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass (an `Integer` one above the smallest keeps its type, the smallest `Currency` raises 6, and a `Variant` holding the smallest `Integer` gives a `Long`, as in VB6) and the three cases fail with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`abs-minimum-widens-type-vb6.zip`) prints: error 6 for the `Integer`, the `Long` and the `Currency`, and the `Integer` 32767 and the `Long` 32768 for the controls. VB6 has no `LongLong`; its case asserts the same rule.
```vb
' Regression tests: Abs of the smallest Integer or Long raises error 6, as Abs of the
' smallest Currency does, because the result keeps the argument's type and the type
' cannot hold it. Expected results are VB6's (the VB6 project beside this one prints
' them). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: a value one above the smallest keeps its type; the smallest Currency
    ' raises 6; a Variant holding the smallest Integer gives a Long (in VB6 too).
    [TestCase]
    Public Sub Abs_IntegerAboveSmallest_KeepsInteger()
        Dim I As Integer = -32767
        Dim V As Variant = Abs(I)
        Assert.Strict.AreEqual "Integer", TypeName(V)
    End Sub

    [TestCase]
    Public Sub Abs_SmallestCurrency_Raises6()
        Dim C As Currency = -922337203685477.5807@ - 0.0001@
        Dim V As Variant
        On Error Resume Next
        V = Abs(C)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Abs_VariantSmallestInteger_GivesLong()
        Dim V As Variant = CInt(-32768)
        V = Abs(V)
        Assert.Strict.AreEqual "Long", TypeName(V)
    End Sub

    ' The defect: the result is widened to a Long or a Double, and no error is raised.
    [TestCase]
    Public Sub Abs_SmallestInteger_Raises6()
        Dim I As Integer = -32768
        Dim V As Variant
        On Error Resume Next
        V = Abs(I)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Abs_SmallestLong_Raises6()
        Dim L As Long = -2147483647 - 1
        Dim V As Variant
        On Error Resume Next
        V = Abs(L)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Abs_SmallestLongLong_Raises6()
        Dim L As LongLong = -9223372036854775807^ - 1
        Dim V As Variant
        On Error Resume Next
        V = Abs(L)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 6, *Overflow*, for the smallest `Integer`, `Long` and `LongLong`, as for the smallest `Currency` and as VB6 does: the result has the argument's type.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. The value is right, and assigning it back to the argument's type raises 6 there (`I = Abs(I)`); a program that relies on the error from `Abs` itself, or on the result's type (`TypeName`, a `Variant` passed on), sees a difference.

What does not reproduce it: any other `Integer` or `Long`; the smallest `Currency` (6 in both); a `Variant` holding the smallest `Integer` or `Long`, which gives a `Long` or a `Double` in VB6 too.

<!-- Reproducer: bugs/abs-minimum-widens-type/ (mode test: `tbrun --tests`; expect lists the three PASS and three FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same three failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints error 6 for the Integer, Long and Currency. Stated in a NOTE on docs/Reference/Default/VBA/Math/Abs.md (its Common Errors section), generated from errors/VBA.Math.yml (row `bug: abs-minimum-widens-type`); when fixed, the row becomes a 6 row with the Currency one. Found 2026-10-22 in batch 4 of WIP.Errors.md; owner: a bug. -->
