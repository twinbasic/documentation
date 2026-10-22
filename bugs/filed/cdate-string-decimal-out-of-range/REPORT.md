Filed as [twinbasic/twinbasic#2537](https://github.com/twinbasic/twinbasic/issues/2537).

## `CDate` of a string holding a number outside the `Date` range raises no error, and of such a `Decimal` raises error 6, where VB6 raises error 13

**Describe the bug**
A `Date` holds a day number from -657434 (January 1, 100) to 2958465 (December 31, 9999). VB6's `CDate` raises error 13, *Type mismatch*, for a string that holds a number outside that range (`CDate("2958466")`, `CDate("-657435")`) and for a `Decimal` outside it (`CDate(CDec(2958466))`). twinBASIC raises nothing for the string, and the `Date` holds the number, as in the entry *A `Date` outside January 1, 100 to December 31, 9999 is accepted with no error*; for the `Decimal` it raises error 6, *Overflow*, so a handler that tests for 13 does not recognise it. Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `cdate-string-decimal-out-of-range.twinproj` (attached as `cdate-string-decimal-out-of-range.zip`).
2. Run its test cases, the module below. On BETA 1010 the four controls pass (the two ends of the range as strings, a `Decimal` in range, and `CDate("abc")`, which raises 13) and the four cases fail: `Actual: 0` for the strings, `Actual: 6` for the `Decimal`s.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`cdate-string-decimal-out-of-range-vb6.zip`) prints: error 13 for the four, and the day numbers and 13 for the controls.
```vb
' Regression tests: CDate of a string that holds a number outside the Date range, and of
' a Decimal outside it, raise error 13. Expected results are VB6's (the VB6 project beside
' this one prints them). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: the ends of the range as strings and as Decimals, and a string that is
    ' not a date (error 13 in both).
    [TestCase]
    Public Sub CDate_StringLargest_Accepted()
        Assert.Strict.AreEqual 2958465#, CDbl(CDate("2958465"))
    End Sub

    [TestCase]
    Public Sub CDate_StringSmallest_Accepted()
        Assert.Strict.AreEqual -657434#, CDbl(CDate("-657434"))
    End Sub

    [TestCase]
    Public Sub CDate_DecimalInRange_Accepted()
        Assert.Strict.AreEqual 5#, CDbl(CDate(CDec(5)))
    End Sub

    [TestCase]
    Public Sub CDate_NotADate_Raises13()
        Dim D As Date
        On Error Resume Next
        D = CDate("abc")
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    ' The defect: a string holding a number past either end raises nothing.
    [TestCase]
    Public Sub CDate_StringPastLargest_Raises13()
        Dim D As Date
        On Error Resume Next
        D = CDate("2958466")
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub CDate_StringBeforeSmallest_Raises13()
        Dim D As Date
        On Error Resume Next
        D = CDate("-657435")
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    ' The defect: a Decimal past either end raises 6.
    [TestCase]
    Public Sub CDate_DecimalPastLargest_Raises13()
        Dim D As Date
        On Error Resume Next
        D = CDate(CDec(2958466))
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    [TestCase]
    Public Sub CDate_DecimalBeforeSmallest_Raises13()
        Dim D As Date
        On Error Resume Next
        D = CDate(CDec(-657435))
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 13, *Type mismatch*, for both, as VB6 does. `CVDate` already raises 13 for both in twinBASIC.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: medium for the string, which stores an out-of-range `Date` silently (`CStr`, `Format` and `Year` of it then raise error 5); low for the `Decimal`, which raises an error, only another one.

What does not reproduce it: `CVDate` of the same values (13 in both); a string that is not a number (`"1/1/10000"` raises 13 in both). A `Double`, `Long`, `Single` or `Currency` outside the range is the other entry: VB6 raises 6 for it, twinBASIC nothing.

<!-- Reproducer: bugs/cdate-string-decimal-out-of-range/ (mode test: `tbrun --tests`; expect lists the four PASS and four FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`, and the same four failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints error 13 for the four. Stated in NOTEs on docs/Reference/Default/VBA/Conversion/CDate.md (its Common Errors section), generated from errors/VBA.Conversion.yml (the two rows `bug: cdate-string-decimal-out-of-range`), and in the WARNING above that section; when fixed, the rows' bug and vb6 fields go (the Decimal row becomes error 13) and the NOTEs with them. Found 2026-10-21 in batch 3 of WIP.Errors.md; owner: a bug. -->
