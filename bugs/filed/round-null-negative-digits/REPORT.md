Filed as [twinbasic/twinbasic#2540](https://github.com/twinbasic/twinbasic/issues/2540).

## `Round` of `Null` with a negative *numdecimalplaces* returns `Null`, where VB6 raises error 5

**Describe the bug**
`Round` raises error 5, *Invalid procedure call or argument*, for a negative *numdecimalplaces*: `Round(1.5, -1)` and `Round(Empty, -1)` raise it in twinBASIC and VB6. When the *expression* is `Null`, VB6 still raises 5, and twinBASIC returns `Null`. Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `round-null-negative-digits.twinproj` (attached as `round-null-negative-digits.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass and `Round_NullNegativeDigits_Raises5` fails with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`round-null-negative-digits-vb6.zip`) prints.
```vb
' Regression tests: Round raises error 5 for a negative numdecimalplaces when the
' expression is Null, as it does for any other expression, and as VB6 does (the VB6
' project beside this one prints it). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: a negative numdecimalplaces raises 5 for a number and for Empty, and
    ' Round of Null with a valid numdecimalplaces returns Null.
    [TestCase]
    Public Sub Round_NumberNegativeDigits_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Round(1.5, -1)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Round_EmptyNegativeDigits_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Round(Empty, -1)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Round_NullValidDigits_ReturnsNull()
        Dim V As Variant = Round(Null, 2)
        Assert.Strict.IsTrue IsNull(V)
    End Sub

    ' The defect: Null with a negative numdecimalplaces returns Null.
    [TestCase]
    Public Sub Round_NullNegativeDigits_Raises5()
        Dim V As Variant
        On Error Resume Next
        V = Round(Null, -1)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 5 for a negative *numdecimalplaces* whatever the *expression*, as VB6 does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. An invalid argument goes unreported only while the value is `Null`.

What does not reproduce it: a *numdecimalplaces* above 22 with `Null`, which returns `Null` in VB6 too (the limit of 22 applies only to a `Single`, `Double`, `Date` or string); a `Null` *numdecimalplaces*, which raises 94 in both.

<!-- Reproducer: bugs/round-null-negative-digits/ (mode test: `tbrun --tests`; expect lists the three PASS and one FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same failure with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints error 5 for it. Stated in a NOTE on docs/Reference/Default/VBA/Math/Round.md (its Common Errors section), generated from errors/VBA.Math.yml (row `bug: round-null-negative-digits`); when fixed, the row's case moves to the 5 row and the NOTE goes. Found 2026-10-22 in batch 4 of WIP.Errors.md; owner: a bug. -->
