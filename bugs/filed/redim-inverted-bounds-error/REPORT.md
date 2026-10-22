Filed as [twinbasic/twinbasic#2544](https://github.com/twinbasic/twinbasic/issues/2544).

## `ReDim` with an upper bound less than its lower bound raises -2147467259, *Unspecified error*, where VB6 raises error 9

**Describe the bug**
`ReDim X(0 To -1)`, `ReDim X(-1)` and `ReDim X(5 To 4, 1)` on a dynamic array (`Dim X() As Long`), all of which give a dimension an upper bound below its lower bound, raise error -2147467259 (`&H80004005`), *Unspecified error*, where VB6 raises error 9, *Subscript out of range*. A handler that tests for 9 does not recognise it. Observed in the compiler's test mode, 32-bit and 64-bit, and in a probe run after a build.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `redim-inverted-bounds-error.twinproj` (attached as `redim-inverted-bounds-error.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass (`ReDim X(0 To 0)`, `ReDim X(-3 To -1)`, and a subscript above a fixed-size array's range, which raises 9) and the four cases on an inverted bound fail with `Actual: -2147467259`; `Err.Description` is *Unspecified error*.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`redim-inverted-bounds-error-vb6.zip`) prints: 9, *Subscript out of range*, for each of the three statements.
```vb
' Regression tests: ReDim with an upper bound less than its lower bound raises error 9,
' "Subscript out of range". Expected numbers are VB6's (the VB6 project beside this one
' prints them). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: bounds in order, an empty-looking but valid range, and a subscript out of range.
    [TestCase]
    Public Sub ReDim_OneElement_Succeeds()
        Dim X() As Long
        ReDim X(0 To 0)
        Assert.Strict.AreEqual 0&, UBound(X)
    End Sub

    [TestCase]
    Public Sub ReDim_NegativeBoundsInOrder_Succeeds()
        Dim X() As Long
        ReDim X(-3 To -1)
        Assert.Strict.AreEqual -3&, LBound(X)
    End Sub

    [TestCase]
    Public Sub FixedArray_SubscriptAboveRange_Raises9()
        Dim A(1 To 3) As Long
        On Error Resume Next
        A(4) = 1
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub ReDim_ZeroToMinusOne_Raises9()
        Dim X() As Long
        On Error Resume Next
        ReDim X(0 To -1)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub ReDim_MinusOne_Raises9()
        Dim X() As Long
        On Error Resume Next
        ReDim X(-1)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub ReDim_FiveToFour_SecondDimension_Raises9()
        Dim X() As Long
        On Error Resume Next
        ReDim X(5 To 4, 1)
        Assert.Strict.AreEqual 9&, Err.Number
    End Sub

    [TestCase]
    Public Sub ReDim_ErrorDescription()
        Dim X() As Long
        On Error Resume Next
        ReDim X(0 To -1)
        Assert.Strict.AreEqual "Subscript out of range", Err.Description
    End Sub

End Module
```

**Expected behavior**
Error 9, *Subscript out of range*, as VB6 raises, and as twinBASIC itself raises for a subscript outside a fixed-size array.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. An error is raised wherever VB6 raises one, so no failure goes unreported, but a handler that tests for 9 does not recognise it, and *Unspecified error* does not say what is wrong. It is the same symptom as "An index out of range on a fixed-size array member of a UDT raises -2147467259, *Unspecified error*, where VB6 raises error 9": a bounds failure that reaches the program as *Unspecified error*, here from the allocation rather than from a subscript.

What does not reproduce it: bounds in order (`0 To 0`, `-3 To -1`), and a subscript outside a fixed-size array that is not in a UDT.

<!-- Reproducer: bugs/redim-inverted-bounds-error/ (mode test: `tbrun --tests`; expect lists the three PASS and four FAIL lines, each FAIL with the number or text BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`. The same in `--arch win64`, and in a probe run after a build (win32 and win64) from a scratch folder not kept. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints 9 for the three inverted ReDim statements. Stated in a NOTE on docs/Reference/Core/ReDim.md, generated from errors/Core.yml (row `bug: redim-inverted-bounds-error`); when fixed, the row's bug and vb6 fields go and the NOTE with them. -->
