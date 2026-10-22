Filed as [twinbasic/twinbasic#2539](https://github.com/twinbasic/twinbasic/issues/2539).

## `Cos` and `Sin` return their argument, and `Tan` raises an automation error, for a number of 2^63 or more in magnitude, where VB6 raises error 5

**Describe the bug**
For a number of 2^63 (9,223,372,036,854,775,808) or more in magnitude, twinBASIC's `Cos` and `Sin` return the number itself: `Cos(1E+20)` and `Sin(1E+20)` are `1E+20`, outside the range -1 to 1, with no error. `Tan` raises -2147348207 (`&H80021111`), *Automation error*. VB6 raises error 5, *Invalid procedure call or argument*, for all three, from 9.223372E+18 up in magnitude (just below 2^63). Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `trig-above-2-to-63.twinproj` (attached as `trig-above-2-to-63.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass (each function of 2^62 gives a value with no error) and the four cases fail: `Cos` and `Sin` with `Actual: 0`, `Tan` with `Actual: -2147348207`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`trig-above-2-to-63-vb6.zip`) prints: error 5 for each, and also for 9.223372E+18 itself, where 9.223372E+18 - 2048 gives a value.
```vb
' Regression tests: Cos, Sin and Tan of a number of 2^63 or more in magnitude raise
' error 5, as VB6 does (the VB6 project beside this one prints it), rather than
' returning the argument (Cos, Sin) or raising an automation error (Tan).
' tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: below 2^62 each returns a value in its range.
    [TestCase]
    Public Sub Cos_2To62_InRange()
        Dim X As Double = 2 ^ 62
        Assert.Strict.IsTrue Abs(Cos(X)) <= 1
    End Sub

    [TestCase]
    Public Sub Sin_2To62_InRange()
        Dim X As Double = 2 ^ 62
        Assert.Strict.IsTrue Abs(Sin(X)) <= 1
    End Sub

    [TestCase]
    Public Sub Tan_2To62_NoError()
        Dim X As Double = 2 ^ 62
        Dim R As Double
        On Error Resume Next
        R = Tan(X)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect: Cos and Sin return the argument itself, with no error.
    [TestCase]
    Public Sub Cos_2To63_Raises5()
        Dim X As Double = 2 ^ 63
        Dim R As Double
        On Error Resume Next
        R = Cos(X)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Cos_1E300_Raises5()
        Dim X As Double = 1E+300
        Dim R As Double
        On Error Resume Next
        R = Cos(X)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    [TestCase]
    Public Sub Sin_Minus2To63_Raises5()
        Dim X As Double = -(2 ^ 63)
        Dim R As Double
        On Error Resume Next
        R = Sin(X)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

    ' The defect: Tan raises -2147348207 (&H80021111), "Automation error".
    [TestCase]
    Public Sub Tan_2To63_Raises5()
        Dim X As Double = 2 ^ 63
        Dim R As Double
        On Error Resume Next
        R = Tan(X)
        Assert.Strict.AreEqual 5&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 5, *Invalid procedure call or argument*, for each of the three, as VB6 does. (A correctly reduced result would serve as well, but would be a change from VB6.)

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium for `Cos` and `Sin`: the wrong value is returned silently, and is outside the range the functions promise. `Tan` raises an error, but not VB's.

Between 9.223372E+18 and 2^63 in magnitude, twinBASIC returns a value where VB6 already raises 5; the regression tests above do not assert that range.

What does not reproduce it: any number below 9.223372E+18 in magnitude.

<!-- Reproducer: bugs/trig-above-2-to-63/ (mode test: `tbrun --tests`; expect lists the three PASS and four FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same four failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints error 5 for each, and for 9.223372E+18. Stated in a WARNING on docs/Reference/Default/VBA/Math/Cos.md and Sin.md, and in NOTEs on Cos.md, Sin.md and Tan.md (their Common Errors sections, the Tan row of -2147348207), generated from errors/VBA.Math.yml (rows `bug: trig-above-2-to-63`); when fixed, the WARNINGs go, and the rows become 5 rows. Found 2026-10-22 in batch 4 of WIP.Errors.md; owner: a bug. -->
