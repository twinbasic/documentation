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

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\d+"
Debug.Print re.IsValid  ' False

re.Pattern = "(\d+)"
Debug.Print re.IsValid  ' True
```

## See Also

- [LastError](LastError) property -- the message of the compile error
- [LastErrorNumber](LastErrorNumber) property -- the number of the compile error
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
