Filed as [twinbasic/twinbasic#2536](https://github.com/twinbasic/twinbasic/issues/2536).

## `Hex`, `Oct` and `Bin` raise error 6 for a `Double` or `Single` from 2^62 up, though the value fits a `LongLong`

**Describe the bug**
twinBASIC's `Hex`, `Oct` and `Bin` take any number in the range of a `LongLong`: a `LongLong`, a `Decimal` or a string holding 4611686018427387904 (2^62) gives `"4000000000000000"`. A `Double` or a `Single` of the same value raises error 6, *Overflow*, and so does every `Double` from 2^62 up to the largest below 2^63, and below -2^62 (-2^62 itself converts). Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `hex-double-above-2-to-62.twinproj` (attached as `hex-double-above-2-to-62.zip`).
2. Run its test cases, the module below. On BETA 1010 the six controls pass (2^62 as a `LongLong`, a `Decimal` and a string, the `Double`s 2^62 - 1024 and -2^62, and `1E+20`, which raises 6 as it should) and the six cases fail with `runtime error 6: Overflow`.
```vb
' Regression tests: Hex, Oct and Bin take any Double or Single whose value fits a
' LongLong, as they take a LongLong, a Decimal or a string of the same value.
' tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: the same values as a LongLong, a Decimal and a string, a Double just
    ' below 2^62, -2^62, and a Double past the LongLong range (error 6).
    [TestCase]
    Public Sub Hex_LongLong2To62_Converts()
        Dim L As LongLong = 4611686018427387904^
        Assert.Strict.AreEqual "4000000000000000", Hex$(L)
    End Sub

    [TestCase]
    Public Sub Hex_Decimal2To62_Converts()
        Dim D As Variant = CDec("4611686018427387904")
        Assert.Strict.AreEqual "4000000000000000", Hex$(D)
    End Sub

    [TestCase]
    Public Sub Hex_String2To62_Converts()
        Assert.Strict.AreEqual "4000000000000000", Hex$("4611686018427387904")
    End Sub

    [TestCase]
    Public Sub Hex_DoubleBelow2To62_Converts()
        Dim X As Double = 2 ^ 62 - 1024
        Assert.Strict.AreEqual "3FFFFFFFFFFFFC00", Hex$(X)
    End Sub

    [TestCase]
    Public Sub Hex_DoubleMinus2To62_Converts()
        Dim X As Double = -(2 ^ 62)
        Assert.Strict.AreEqual "C000000000000000", Hex$(X)
    End Sub

    [TestCase]
    Public Sub Hex_DoublePastLongLong_Raises6()
        Dim X As Double = 1E+20
        Dim S As String
        On Error Resume Next
        S = Hex$(X)
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    ' The defect: a Double or Single from 2^62 up, in magnitude, raises error 6.
    [TestCase]
    Public Sub Hex_Double2To62_Converts()
        Dim X As Double = 2 ^ 62
        Assert.Strict.AreEqual "4000000000000000", Hex$(X)
    End Sub

    [TestCase]
    Public Sub Hex_DoubleLargestBelow2To63_Converts()
        Dim X As Double = 2 ^ 63 - 1024
        Assert.Strict.AreEqual "7FFFFFFFFFFFFC00", Hex$(X)
    End Sub

    [TestCase]
    Public Sub Hex_DoubleBelowMinus2To62_Converts()
        Dim X As Double = -(2 ^ 62) - 1024
        Assert.Strict.AreEqual "BFFFFFFFFFFFFC00", Hex$(X)
    End Sub

    [TestCase]
    Public Sub Hex_Single2To62_Converts()
        Dim S As Single = 2 ^ 62
        Assert.Strict.AreEqual "4000000000000000", Hex$(S)
    End Sub

    [TestCase]
    Public Sub Oct_Double2To62_Converts()
        Dim X As Double = 2 ^ 62
        Assert.Strict.AreEqual "400000000000000000000", Oct$(X)
    End Sub

    [TestCase]
    Public Sub Bin_Double2To62_Converts()
        Dim X As Double = 2 ^ 62
        Assert.Strict.AreEqual "1" & String$(62, "0"), Bin$(X)
    End Sub

End Module
```

**Expected behavior**
The digits of the value, as for the same value in a `LongLong`; error 6 only past the `LongLong` range, as for `1E+20`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. The error is raised, not hidden, and `CLngLng` around the argument avoids it (`Hex(CLngLng(2 ^ 62))`). VB6 has no `LongLong` and raises 6 for any number outside the `Long` range, so there is no VB6 behaviour to compare.

What does not reproduce it: a `LongLong`, `Decimal`, `Currency` or string of the same value; a `Double` between -2^62 and 2^62 - 1024.

<!-- Reproducer: bugs/hex-double-above-2-to-62/ (mode test: `tbrun --tests`; expect lists the six PASS and six FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same six failures with `run --arch win64`. No VB6 side: VB6 has no LongLong. Stated in a NOTE on docs/Reference/Default/VBA/Conversion/Hex.md, Oct.md and Bin.md; the limit is in the 6 row of each page's data in errors/VBA.Conversion.yml. When fixed, the NOTEs go, and the rows' When and their Double cases change to the LongLong range. Found 2026-10-21 in batch 3 of WIP.Errors.md. -->
