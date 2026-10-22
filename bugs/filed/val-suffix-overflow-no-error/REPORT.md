Filed as [twinbasic/twinbasic#2542](https://github.com/twinbasic/twinbasic/issues/2542).

## `Val` raises no error for a number followed by `%`, `&` or `@` that does not fit that type, where VB6 raises error 6

**Describe the bug**
`Val` reads a type-declaration character after a number: `Val("50%")` is 50, and `Val("50.5%")` raises error 13, *Type mismatch*, in both twinBASIC and VB6, because a fraction is not an **Integer**. When the number is whole but outside the range of the type the character names, VB6 raises error 6, *Overflow*: `Val("32768%")`, `Val("-32769%")`, `Val("2147483648&")`, `Val("1e15@")`. twinBASIC raises nothing and returns the number as a **Double** (`Val("70000%")` is 70000). Observed in the compiler's test mode, 32-bit and 64-bit, and in a built exe.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `val-suffix-overflow-no-error.twinproj` (attached as `val-suffix-overflow-no-error.zip`).
2. Run its test cases, the module below. On BETA 1010 the three controls pass (the largest **Integer** and **Long** with their characters, and `"50.5%"`, which raises 13) and the four cases past a type's range fail with `Actual: 0`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`val-suffix-overflow-no-error-vb6.zip`) prints: error 6 for the four, and 32767, 2147483647 and error 13 for the controls.
```vb
' Regression tests: Val of a number followed by a type-declaration character raises
' error 6 when the number does not fit that type. Expected results are VB6's (the VB6
' project beside this one prints them). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: numbers that fit their type, and a fraction with % (error 13 in both).
    [TestCase]
    Public Sub Val_LargestInteger_Accepted()
        Assert.Strict.AreEqual 32767#, Val("32767%")
    End Sub

    [TestCase]
    Public Sub Val_LargestLong_Accepted()
        Assert.Strict.AreEqual 2147483647#, Val("2147483647&")
    End Sub

    [TestCase]
    Public Sub Val_FractionInteger_Raises13()
        Dim R As Double
        On Error Resume Next
        R = Val("50.5%")
        Assert.Strict.AreEqual 13&, Err.Number
    End Sub

    ' The defect: each number is outside the range of its type, and twinBASIC returns it.
    [TestCase]
    Public Sub Val_IntegerPastLargest_Raises6()
        Dim R As Double
        On Error Resume Next
        R = Val("32768%")
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Val_IntegerPastSmallest_Raises6()
        Dim R As Double
        On Error Resume Next
        R = Val("-32769%")
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Val_LongPastLargest_Raises6()
        Dim R As Double
        On Error Resume Next
        R = Val("2147483648&")
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

    [TestCase]
    Public Sub Val_CurrencyPastLargest_Raises6()
        Dim R As Double
        On Error Resume Next
        R = Val("1e15@")
        Assert.Strict.AreEqual 6&, Err.Number
    End Sub

End Module
```

**Expected behavior**
Error 6, *Overflow*, for a number outside the range of the type its character names, as VB6 does, and as `Val` already raises error 13 for a fraction with `%` or `&`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. A program that counts on the error to reject text such as `"70000%"` accepts it.

What does not reproduce it: a number that fits its type; `!` and `#` (`Val("1e39!")` raises nothing in VB6 either, and `Val("1e400#")` raises 6 in both); a number past the **Double** range with no character, which raises 6 in both.

<!-- Reproducer: bugs/val-suffix-overflow-no-error/ (mode test: `tbrun --tests`; expect lists the three PASS and four FAIL lines); verified on BETA 1010 by `bug_repro.mjs verify`, and the same four failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints error 6 for the four and the values and 13 for the controls. Stated in a NOTE on docs/Reference/Default/VBA/Conversion/Val.md (its Common Errors section), generated from errors/VBA.Conversion.yml (row `bug: val-suffix-overflow-no-error`); when fixed, the row's bug and vb6 fields go and the NOTE with them. Found 2026-10-21 in batch 3 of WIP.Errors.md; owner: a bug, not an extension. -->
