---
title: FormerEntryPoint
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/FormerEntryPoint/
has_toc: false
---

# FormerEntryPoint module
{: .no_toc }

<!-- test: FormerStringFormatTests.CommonNotation_GivesTheSameAsStringFormat -->

Holds **FormerStringFormat**, the earlier implementation of the formatter, which is kept in the package beside the newer one.

**FormerEntryPoint** is a standard module with one function, [**FormerStringFormat**](FormerStringFormat). The function does the whole job in one procedure, in the style of VB6 code. It does not use [**StringHelper**](../StringHelper), [**StringFormatSpecifier**](../StringFormatSpecifier/) or the format identifier classes, and only borrows [**EscapeSequence**](../EscapeSequence/) for the simple escape sequences. It takes the same format strings as [**StringFormat**](../PublicEntryPoints/StringFormat) with a few differences, which are listed on the page of the function. A project that references the package calls it by name or as `FormerEntryPoint.FormerStringFormat`.

```tb check_build check_run
Debug.Print FormerStringFormat("{0} {1:F2}", "x", 2.5)  ' x 2.50
```

<!-- /test -->

## Functions

- [FormerStringFormat](FormerStringFormat) -- builds a string from a format string and a list of values, with the earlier implementation

## See Also

- [StringFormat](../PublicEntryPoints/StringFormat) function -- the current implementation
- [FormerEscapeSequence](../FormerEscapeSequence/) class -- an escape sequence class that the function does not use
- [Fmt package](../) -- overview
