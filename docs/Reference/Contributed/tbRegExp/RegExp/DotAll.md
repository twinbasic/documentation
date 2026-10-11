---
title: DotAll
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/DotAll
has_toc: false
---

# DotAll
{: .no_toc }

Returns or sets whether `.` in the pattern matches line terminators.

## Get

Returns a **Boolean**.

Syntax: *object*.**DotAll**

*object*
: *required* An object expression that evaluates to a **RegExp**.

The default value is **False**.

## Let

Sets the value.

Syntax: *object*.**DotAll** **=** *value*

*value*
: A **Boolean**. **True** lets `.` match any character, line terminators included. **False** makes `.` match any character except a line terminator.

## Remarks

The line terminators are the line feed (`vbLf`), the carriage return (`vbCr`), and the characters U+2028 and U+2029.

The value is applied when [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) or [**Split**](Split) makes a match. Changing it does not compile the pattern again. The flag `s` of [**Flags**](Flags) reads and sets the same value.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "a.b"
Debug.Print re.Test("a" & vbLf & "b")  ' False

re.DotAll = True
Debug.Print re.Test("a" & vbLf & "b")  ' True
```

## See Also

- [Flags](Flags) property -- sets this option with the letter `s`
- [MultiLine](MultiLine) property -- the option for `^` and `$`
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
