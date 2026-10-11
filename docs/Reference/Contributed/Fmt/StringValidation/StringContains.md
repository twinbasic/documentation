---
title: StringContains
parent: StringValidation
permalink: /tB/Packages/Contributed/Fmt/StringValidation/StringContains
has_toc: false
---

# StringContains
{: .no_toc }

Returns whether a string contains another string, ignoring letter case unless asked not to.

Syntax: **StringContains** ( *haystack*, *needle* [, *caseSensitive* ] ) **As Boolean**

*haystack*
: *required* The **String** to search.

*needle*
: *required* The **String** to look for.

*caseSensitive*
: *optional* A **Boolean**. When **False** (the default) the comparison ignores letter case. When **True** it compares the characters exactly.

Returns **True** when *needle* occurs in *haystack*, and **False** otherwise.

## Remarks

The function calls **InStr** with the text-comparison mode, or the binary mode when *caseSensitive* is **True**. An empty *needle* is found at the first position, so the result is **True**. A **Null** argument raises run-time error 94, *Invalid use of Null*.

[**StringContainsAny**](StringContainsAny) takes *caseSensitive* as a required argument before its list of strings. Here it is the last argument and is optional.

## Example

```tb check_build check_run
Debug.Print StringContains("Hello", "ELL")        ' True
Debug.Print StringContains("Hello", "ELL", True)  ' False
Debug.Print StringContains("Hello", "xyz")        ' False
Debug.Print StringContains("Hello", "")           ' True
```

## See Also

- [StringContainsAny](StringContainsAny) function -- the same test against several strings
- [StringStartsWith](StringStartsWith) function -- tests the start of a string
- [StringMatchesAny](StringMatchesAny) function -- tests for equality with several values
- [StringValidation](./) module -- overview
