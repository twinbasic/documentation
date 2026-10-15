---
title: StringMatchesAny
parent: StringValidation
permalink: /tB/Packages/Contributed/Fmt/StringValidation/StringMatchesAny
has_toc: false
---

# StringMatchesAny
{: .no_toc }

<!-- test: StringValidationTests.StringMatchesAny_ComparesWholeStringsExactly -->

Returns whether a string is equal to at least one of several values.

Syntax: **StringMatchesAny** ( *searchString* [, *possibleMatches* ] ) **As Boolean**

*searchString*
: *required* The **String** to test.

*possibleMatches*
: *optional* Any number of values. Each is converted to a **String** with **CStr** and compared with *searchString*. This is a **ParamArray** of **Variant**.

Returns **True** when *searchString* is equal to at least one of *possibleMatches*, and **False** otherwise.

## Remarks

The comparison is an equality test of whole strings, not a search for a substring. It takes letter case into account, because the module has no `Option Compare` statement and the default comparison is binary. A number among the values is compared as its text, so `1` matches `"1"`. With no values the result is **False**.

<!-- /test -->

## Example

```tb check_build check_run
Debug.Print StringMatchesAny("b", "a", "b", "c")  ' True
Debug.Print StringMatchesAny("B", "a", "b", "c")  ' False
Debug.Print StringMatchesAny("1", 1, 2)           ' True
Debug.Print StringMatchesAny("ab", "a", "b")      ' False
Debug.Print StringMatchesAny("a")                 ' False
```

## See Also

- [StringContainsAny](StringContainsAny) function -- searches for substrings instead
- [StringContains](StringContains) function -- searches for one substring
- [StringValidation](./) module -- overview
