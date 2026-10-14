---
title: StringStartsWith
parent: StringValidation
permalink: /tB/Packages/Contributed/Fmt/StringValidation/StringStartsWith
has_toc: false
---

# StringStartsWith
{: .no_toc }

Returns whether a string begins with another string, taking letter case into account.

Syntax: **StringStartsWith** ( *startingSequence*, *source* ) **As Boolean**

*startingSequence*
: *required* The **String** that the start of *source* is compared with. It comes first.

*source*
: *required* The **String** whose start is tested.

Returns **True** when the first characters of *source* are exactly *startingSequence*, and **False** otherwise.

## Remarks

> [!IMPORTANT] timeless
> The arguments are in the order *startingSequence*, *source*. This is the reverse of [**StringContains**](StringContains), which takes the string to search first. `StringStartsWith("Hello", "He")` asks whether `"He"` starts with `"Hello"` and returns **False**.

The comparison is binary, so `"he"` does not start `"Hello"`. An empty *startingSequence* returns **True**. A *source* shorter than *startingSequence* returns **False**.

[**StringFormat**](../PublicEntryPoints/StringFormat) uses the function to test whether a format string begins with `@`.

## Example

```tb check_build check_run
Debug.Print StringStartsWith("He", "Hello")     ' True
Debug.Print StringStartsWith("he", "Hello")     ' False
Debug.Print StringStartsWith("Hello", "He")     ' False
Debug.Print StringStartsWith("", "Hello")       ' True
```

## See Also

- [StringContains](StringContains) function -- tests whether a string occurs anywhere
- [StringMatchesAny](StringMatchesAny) function -- tests for equality with several values
- [StringValidation](./) module -- overview
