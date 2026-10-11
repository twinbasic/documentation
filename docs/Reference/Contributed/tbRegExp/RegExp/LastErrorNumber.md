---
title: LastErrorNumber
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/LastErrorNumber
has_toc: false
---

# LastErrorNumber
{: .no_toc }

Returns the number of the error that compiling the current pattern raised.

Syntax: *object*.**LastErrorNumber**

*object*
: *required* An object expression that evaluates to a **RegExp**.

Returns a **Long**: the number of the compile error, or 0 when the pattern is valid.

## Remarks

The property compiles the pattern if it has not been compiled since [**Pattern**](Pattern) or [**IgnoreCase**](IgnoreCase) last changed. The compilation traps its error, so **LastErrorNumber** raises nothing. The value is the `Number` of the error that the compilation raised; [**LastError**](LastError) is its description.

The engine raises its pattern errors with numbers of the form `vbObjectError + 3000 + n`, where *n* identifies the fault, as in the example.

[**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) raise an error with this number when the pattern is invalid.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\d+)"
Debug.Print re.LastErrorNumber  ' 0

re.Pattern = "(\d+"
Debug.Print re.LastErrorNumber - vbObjectError  ' 3009

On Error Resume Next
re.Test "123"
Debug.Print Err.Number = re.LastErrorNumber  ' True
```

## See Also

- [LastError](LastError) property -- the message of the compile error
- [IsValid](IsValid) property -- whether the pattern compiles
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
