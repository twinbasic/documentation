---
title: LastError
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/LastError
has_toc: false
---

# LastError
{: .no_toc }

Returns the message of the error that compiling the current pattern raised.

Syntax: *object*.**LastError**

*object*
: *required* An object expression that evaluates to a **RegExp**.

Returns a **String**: the description of the compile error, or an empty string when the pattern is valid.

## Remarks

The property compiles the pattern if it has not been compiled since [**Pattern**](Pattern) or [**IgnoreCase**](IgnoreCase) last changed. The compilation traps its error, so **LastError** raises nothing. The text is the `Description` of the error that the compilation raised; [**LastErrorNumber**](LastErrorNumber) is its number.

[**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) raise an error with this description when the pattern is invalid.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\d+)"
Debug.Print Len(re.LastError)  ' 0

re.Pattern = "(\d+"
Debug.Print re.IsValid         ' False
Debug.Print Len(re.LastError) > 0  ' True

On Error Resume Next
re.Test "123"
Debug.Print Err.Description = re.LastError  ' True
```

## See Also

- [LastErrorNumber](LastErrorNumber) property -- the number of the compile error
- [IsValid](IsValid) property -- whether the pattern compiles
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
