---
title: MultiLine
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/MultiLine
has_toc: false
---

# MultiLine
{: .no_toc }

Returns or sets whether `^` and `$` in the pattern match at the boundaries of each line.

## Get

Returns a **Boolean**.

Syntax: *object*.**MultiLine**

*object*
: *required* An object expression that evaluates to a **RegExp**.

The default value is **False**.

## Let

Sets the value.

Syntax: *object*.**MultiLine** **=** *value*

*value*
: A **Boolean**. **True** lets `^` match at the start of the string and after a line terminator, and `$` match at the end of the string and before a line terminator. **False** lets `^` match only at the start of the whole string and `$` only at its end.

## Remarks

The line terminators are the line feed (`vbLf`), the carriage return (`vbCr`), and the characters U+2028 and U+2029.

The value is applied when [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) or [**Split**](Split) makes a match. Changing it does not compile the pattern again. The flag `m` of [**Flags**](Flags) reads and sets the same value.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "^\w+$"
re.Global = True

Dim text As String
text = "one" & vbLf & "two"
Debug.Print re.Execute(text).Count  ' 0

re.MultiLine = True
Debug.Print re.Execute(text).Count  ' 2
```

## See Also

- [Flags](Flags) property -- sets this option with the letter `m`
- [DotAll](DotAll) property -- the option for `.`
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
