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
> [!NOTE]
> Although nothing is raised, the compile error of an invalid pattern stays in the **Err** object after the call that compiled the pattern returns. A program that tests **Err** for other errors calls **Err.Clear** first.

<!-- test: IsValidTests.IsValid_LowCountAboveHigh, IsValidTests.LastErrorNumber_LowCountAboveHigh, IsValidTests.Test_LowCountAboveHighRaisesCompileError, IsValidTests.Execute_LowCountAboveHighRaisesCompileError, IsValidTests.Replace_LowCountAboveHighRaisesCompileError, IsValidTests.Split_LowCountAboveHighRaisesCompileError -->
> [!NOTE]
> A quantifier whose lower count is above its upper count, such as `a{2,1}`, is not found when the pattern is compiled, so **IsValid** returns **True** for it and [**LastErrorNumber**](LastErrorNumber) returns 0. [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) then raise error 3000 when a search reaches the quantifier, with the description that Windows gives that number, *The specified print monitor is unknown.* This is how version 1.8.0.0 behaves.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\d+"
Debug.Print re.IsValid                       ' False
Debug.Print Err.Number = re.LastErrorNumber  ' True
Err.Clear

re.Pattern = "(\d+)"
Debug.Print re.IsValid  ' True
```

## See Also

- [LastError](LastError) property -- the message of the compile error
- [LastErrorNumber](LastErrorNumber) property -- the number of the compile error
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
