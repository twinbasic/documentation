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

<!-- test: IsValidTests.LastError_InvalidPatternLeavesNoError -->
The property compiles the pattern if it has not been compiled since [**Pattern**](Pattern) or [**IgnoreCase**](IgnoreCase) last changed. The compilation traps its error, so **LastError** raises nothing, but the error stays in the **Err** object (see [**IsValid**](IsValid)). The text is a sentence that names the fault, such as *Unterminated character class: a '[' without a matching ']'.* for the pattern `[abc`. [**LastErrorNumber**](LastErrorNumber) is the number of the error and lists the faults.
<!-- /test -->

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

re.Pattern = "[abc"
Debug.Print re.LastError           ' Unterminated character class: a '[' without a matching ']'.

On Error Resume Next
re.Test "123"
Debug.Print Err.Description = re.LastError  ' True
```

## See Also

- [LastErrorNumber](LastErrorNumber) property -- the number of the compile error
- [IsValid](IsValid) property -- whether the pattern compiles
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
