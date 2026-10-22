Filed as [twinbasic/twinbasic#2538](https://github.com/twinbasic/twinbasic/issues/2538).

## `Error` and `Error$` of a number above 65535 return a message, where VB6 raises error 6

**Describe the bug**
`Error$(n)` returns the message of error number *n*. VB6 raises error 6, *Overflow*, when *n* is greater than 65535 (after rounding: `Error(65535.5)` raises it): `Error$(65536)`, `Error(100000)`, `Error(2147483647)`. twinBASIC raises nothing and returns a message. A negative number, an HRESULT such as -2147467259 included, gives a message in both. Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `error-function-above-65535.twinproj` (attached as `error-function-above-65535.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass (65535, -1 and -2147467259) and the four cases above 65535 fail with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`error-function-above-65535-vb6.zip`) prints: error 6 for the four, and a message for the controls.
```vb
' Regression tests: Error and Error$ of a number above 65535 raise error 6. Expected
' results are VB6's (the VB6 project beside this one prints them). tbrun --tests runs
' each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: the largest number, a negative one and an HRESULT give a message.
    [TestCase]
    Public Sub Error_Largest_Accepted()
        Dim N As Long = 65535
        Dim S As String
        On Error Resume Next
        S = Error$(N)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub Error_Negative_Accepted()
        Dim N As Long = -1
        Dim S As String
        On Error Resume Next
        S = Error$(N)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub Error_HResult_Accepted()
        Dim N As Long = -2147467259
        Dim S As String
        On Error Resume Next
        S = Error$(N)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    ' The defect: a number above 65535 returns a message.
    [TestCase]
    Public Sub ErrorDollar_65536_Raises6()
        Dim N As Long = 65536
        Dim S As String
        On Error Resume Next
        S = Error$(N)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Error_65536_Raises6()
        Dim N As Long = 65536
        Dim V As Variant
        On Error Resume Next
        V = Error(N)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Error_LargestLong_Raises6()
        Dim N As Long = 2147483647
        Dim V As Variant
        On Error Resume Next
        V = Error(N)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Error_RoundsTo65536_Raises6()
        Dim X As Double = 65535.5
        Dim V As Variant
        On Error Resume Next
        V = Error(X)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 6, *Overflow*, for a number above 65535, as VB6 does.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A program that passes an arbitrary number gets a message where VB6 code expected an error.

Related, and not part of this report: `Err.Raise 65536` raises 5 in VB6, and twinBASIC raises 65536 as *Automation error*.

<!-- Reproducer: bugs/error-function-above-65535/ (mode test: `tbrun --tests`; expect lists the three PASS and four FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same four failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints error 6 for the four and a message for the controls. Stated in a NOTE on docs/Reference/Default/VBA/Conversion/Error.md (its Common Errors section), generated from errors/VBA.Conversion.yml (row `bug: error-function-above-65535`); when fixed, the row's bug and vb6 fields go and the NOTE with them. Found 2026-10-21 in batch 3 of WIP.Errors.md; owner: a bug. -->
