---
title: Test
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Test
has_toc: false
---

# Test
{: .no_toc }

Returns whether the pattern finds a match in a string.

Syntax: *object*.**Test** ( *sourceString* ) **As Boolean**

*object*
: *required* An object expression that evaluates to a [**RegExp**](./).

*sourceString*
: *required* A **String**, the text to search.

Returns **True** if [**Pattern**](Pattern) finds a match in *sourceString*, otherwise **False**.

## Remarks

**Test** only reports whether a match exists. To read the matches, use [**Execute**](Execute).

[**IgnoreCase**](IgnoreCase), [**MultiLine**](MultiLine) and [**DotAll**](DotAll) apply to the matching. [**Global**](Global) makes no difference, because one match is enough.

When **Pattern** is not a valid regular expression, **Test** raises the compile error. Its number is [**LastErrorNumber**](LastErrorNumber), its description is [**LastError**](LastError), and its source is `RegExp`. Read [**IsValid**](IsValid) first to avoid the error.

## Example

This example tests two strings against a pattern, then shows the effect of **IgnoreCase**.

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "\d{3}-\d{4}"
Debug.Print re.Test("Call 555-0142 today")  ' True
Debug.Print re.Test("Call us today")        ' False

re.Pattern = "^hello"
Debug.Print re.Test("Hello")                ' False
re.IgnoreCase = True
Debug.Print re.Test("Hello")                ' True
```

## See Also

- [Execute](Execute) method -- returns the matches themselves
- [Replace](Replace) method -- replaces the matches
- [Split](Split) method -- splits a string at the matches
- [IsValid](IsValid) property -- whether the pattern compiles
- [RegExp](./) class -- overview
