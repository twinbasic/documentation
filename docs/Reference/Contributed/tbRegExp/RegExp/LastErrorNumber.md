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

<!-- test: IsValidTests.LastErrorNumber_InvalidPatternLeavesNoError -->
The engine raises its pattern errors with numbers of the form `vbObjectError + 3000 + n`, where *n* identifies the fault, as in the example. The compilation traps the error, so **LastErrorNumber** raises nothing and leaves the **Err** object clear.
<!-- /test -->

| *n* | Fault | Example |
|-----|-------|---------|
| 1 | A backslash at the end, a `\c` without a letter, or a `\0` followed by `8` or `9` | `\`, `\c1`, `\08` |
| 2 | A `\x` or `\u` escape without its hexadecimal digits | `\u00` |
| 3 | A range in a character class that runs backwards | `[z-a]` |
| 4 | A character class without its `]` | `[abc` |
| 6 | A group construct `(?<` that is neither a lookbehind nor a valid name | `(?<1a>x)` |
| 8 | A quantifier whose upper count is below its lower count, or a count that is too large | `a{2,1}`, `a{99999999999}` |
| 9 | A group without its `)` | `(\d+` |
| 11 | A `)` that closes no group | `)` |
| 12 | A quantifier with nothing to repeat | `*a` |
| 13 | A group name with a character that a name cannot hold | `(?<a-b>x)` |
| 14 | An inline option that is not `i`, `m` or `s`, which includes an atomic group and a conditional | `(?x)`, `(?>a)` |

[**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) raise an error with this number when the pattern is invalid.

Those four methods can also raise `vbObjectError + 3016`, which is not a compile error and so never appears here: it means a valid pattern ran out of its step budget before the search finished. See [**SearchStepLimit**](SearchStepLimit).

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
