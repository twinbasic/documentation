---
title: StringContainsAny
parent: StringValidation
permalink: /tB/Packages/Contributed/Fmt/StringValidation/StringContainsAny
has_toc: false
---

# StringContainsAny
{: .no_toc }

<!-- test: StringValidationTests.StringContainsAny_FindsAnyNeedle -->

Returns whether a string contains at least one of several strings.

Syntax: **StringContainsAny** ( *haystack*, *caseSensitive* [, *needles* ] ) **As Boolean**

*haystack*
: *required* The **String** to search.

*caseSensitive*
: *required* A **Boolean**. When **False** the comparison ignores letter case. When **True** it compares the characters exactly. It comes before the list of strings and cannot be left out.

*needles*
: *optional* Any number of values, each of which is converted to a **String** and looked for in *haystack*. This is a **ParamArray** of **Variant**.

Returns **True** when at least one of *needles* occurs in *haystack*, and **False** otherwise.

## Remarks

The function passes each needle in turn to [**StringContains**](StringContains) and returns **True** at the first one that is found, so later needles are not tried. With no needles the result is **False**.

<!-- /test -->

## Example

```tb check_build check_run
Debug.Print StringContainsAny("Hello", False, "x", "L")  ' True
Debug.Print StringContainsAny("Hello", True, "x", "L")   ' False
Debug.Print StringContainsAny("Hello", True, "x", "l")   ' True
Debug.Print StringContainsAny("Hello", False)            ' False
```

## See Also

- [StringContains](StringContains) function -- the same test against one string
- [StringMatchesAny](StringMatchesAny) function -- tests for equality with several values
- [StringValidation](./) module -- overview
