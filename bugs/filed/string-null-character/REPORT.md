Filed as [twinbasic/twinbasic#2543](https://github.com/twinbasic/twinbasic/issues/2543).

## `String` with a *character* of `Null` raises error 94, where VB6 returns `Null`

**Describe the bug**
`String(3, Null)`, the **Variant** form of `String`, raises error 94, *Invalid use of Null*. VB6 raises no error and returns **Null** (`VarType` 1), as it does for `String(0, Null)`. `String$(3, Null)` raises 94 in both, and so does a *number* of **Null** in either form, so only the **Variant** form with a **Null** *character* differs. Observed in the compiler's test mode, 32-bit and 64-bit.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `string-null-character.twinproj` (attached as `string-null-character.zip`).
2. Run its test cases, the module below. On BETA 1010 the four controls pass (`String(3, "a")`, a **Null** *number* in `String` and `String$`, and `String$(3, Null)`, which raise 94 in VB6 too) and the three cases on `String` with a **Null** *character* fail: `Actual: 94`, or `runtime error 94: Invalid use of Null`.

The module is meant to be adapted as a regression test. Each case asserts VB6's result, which the attached VB6 project (`string-null-character-vb6.zip`) prints: no error and `VarType` 1 (**Null**) for `String(3, Null)` and `String(0, Null)`, and 94 for the controls.
```vb
' Regression tests: the Variant form String, given a character of Null, returns Null
' with no error; String$ raises error 94. Expected results are VB6's (the VB6 project
' beside this one prints them). tbrun --tests runs each case and prints PASS or FAIL.
[TestFixture]
Module RegressionTests

    ' Controls: a letter, a Null number in either form, and String$ with a Null character.
    [TestCase]
    Public Sub String_Letter_Repeats()
        Assert.Strict.AreEqual CVar("aaa"), String(3, "a")
    End Sub

    [TestCase]
    Public Sub String_NullNumber_Raises94()
        On Error Resume Next
        Dim R As Variant
        R = String(Null, "a")
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    [TestCase]
    Public Sub StringDollar_NullNumber_Raises94()
        On Error Resume Next
        Dim R As Variant
        R = String$(Null, "a")
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    [TestCase]
    Public Sub StringDollar_NullCharacter_Raises94()
        On Error Resume Next
        Dim R As Variant
        R = String$(3, Null)
        Assert.Strict.AreEqual 94&, Err.Number
    End Sub

    ' The defect: String with a Null character returns Null.
    [TestCase]
    Public Sub String_NullCharacter_NoError()
        On Error Resume Next
        Dim R As Variant
        R = String(3, Null)
        Assert.Strict.AreEqual 0&, Err.Number
    End Sub

    [TestCase]
    Public Sub String_NullCharacter_ReturnsNull()
        Dim R As Variant
        R = String(3, Null)
        Assert.Strict.AreEqual vbNull, VarType(R)
    End Sub

    [TestCase]
    Public Sub String_ZeroNullCharacter_ReturnsNull()
        Dim R As Variant
        R = String(0, Null)
        Assert.Strict.AreEqual vbNull, VarType(R)
    End Sub

End Module
```

**Expected behavior**
`String(number, Null)` returns **Null** with no error, as VB6 does, and as the **Variant** forms of other string functions propagate **Null**; `String$` keeps raising 94.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1010

**Additional context**
Severity: low. Code that relies on **Null** propagating through `String`, as VB6 code reading database fields can, stops with error 94.

What does not reproduce it: `String$` with a **Null** *character*, and a **Null** *number* in either form, all of which raise 94 in VB6 as well.

<!-- Reproducer: bugs/string-null-character/ (mode test: `tbrun --tests`; expect lists the four PASS and three FAIL lines, each FAIL with what BETA 1010 gives); verified on BETA 1010 by `bug_repro.mjs verify`, and the same three failures with `run --arch win64`. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints no error and VarType 1 for String(3, Null) and String(0, Null), and 94 for the controls. Stated in a NOTE on docs/Reference/Default/VBA/Strings/String.md (its Common Errors section), generated from errors/VBA.Strings.yml (row `bug: string-null-character`); when fixed, the row's bug and vb6 fields go and the NOTE with them. -->
