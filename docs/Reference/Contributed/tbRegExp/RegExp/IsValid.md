---
title: IsValid
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/IsValid
has_toc: false
---

# IsValid
{: .no_toc }

Returns whether the current pattern compiles. Raises no error.

Syntax: *object*.**IsValid**

*object*
: *required* An object expression that evaluates to a **RegExp**.

Returns a **Boolean**: **True** when [**Pattern**](Pattern) compiles, **False** when it does not.

## Remarks

The property compiles the pattern if it has not been compiled since [**Pattern**](Pattern) or [**IgnoreCase**](IgnoreCase) last changed, and keeps the result. Nothing is raised when the compilation fails. For a pattern that fails, [**LastError**](LastError) holds the message and [**LastErrorNumber**](LastErrorNumber) the number.

Check **IsValid** before [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) or [**Split**](Split) when the pattern comes from outside the program, because each of those raises the compile error.

<!-- test: IsValidTests.IsValid_InvalidPatternLeavesNoError -->
Nothing is raised and nothing is left behind. The **Err** object is clear when the property returns, even for a pattern that failed to compile, so a program that runs `On Error Resume Next` and tests **Err** for its own errors does not have to call **Err.Clear** first. The number and the message are kept in [**LastErrorNumber**](LastErrorNumber) and [**LastError**](LastError).
<!-- /test -->

<!-- test: IsValidTests.IsValid_LowCountAboveHigh, IsValidTests.LastErrorNumber_LowCountAboveHigh, IsValidTests.Test_LowCountAboveHighRaisesCompileError, IsValidTests.Execute_LowCountAboveHighRaisesCompileError, IsValidTests.Replace_LowCountAboveHighRaisesCompileError, IsValidTests.Split_LowCountAboveHighRaisesCompileError -->
A quantifier whose lower count is above its upper count, such as `a{2,1}`, is found when the pattern is compiled, like any other fault: **IsValid** returns **False**, [**LastErrorNumber**](LastErrorNumber) gives the invalid-quantifier number, and [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) raise it. A `{` that starts no quantifier at all, such as the one in `a{x}`, is not a fault but an ordinary character.
<!-- /test -->

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\d+"
Debug.Print re.IsValid                          ' False
Debug.Print Err.Number                          ' 0
Debug.Print re.LastErrorNumber - vbObjectError  ' 3009

re.Pattern = "(\d+)"
Debug.Print re.IsValid  ' True
```

## See Also

- [LastError](LastError) property -- the message of the compile error
- [LastErrorNumber](LastErrorNumber) property -- the number of the compile error
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
