---
title: StringFormatSpecifier
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/
has_toc: false
---

# StringFormatSpecifier class
{: .no_toc }

<!-- test: SpecifierTests.Defaults, SpecifierTests.ToString_RebuildsTheItem -->

Describes one format item of a format string: its index, alignment, identifier and the text that follows the identifier.

[**StringHelper**](../StringHelper) creates one **StringFormatSpecifier** for every format item it finds in a format string, and passes it to the [format identifier classes](../IStringFormatIdentifier), which read the identifier and the precision from it. For the item `{2,-8:G3}` the index is `2`, the alignment is `-8`, the identifier is `G` and the custom specifier is `3`, which is also the precision.

A project can create an instance with `New StringFormatSpecifier` to call a format identifier class directly. The properties are plain stored values, with one exception: assigning [**CustomSpecifier**](CustomSpecifier) can set [**Precision**](Precision).

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.Index = 2
spec.Alignment = -8
spec.identifier = "G"
spec.CustomSpecifier = "3"

Debug.Print spec.ToString()  ' {2,-8:G3}
Debug.Print spec.Precision   ' 3
```

<!-- /test -->

## Properties

- [Alignment](Alignment) -- returns or sets the width and justification of the formatted value
- [CustomSpecifier](CustomSpecifier) -- returns or sets the text that follows the identifier
- [identifier](identifier) -- returns or sets the letter that selects the format
- [Index](IndexProperty) -- returns or sets the position of the value in the argument list
- [Precision](Precision) -- returns the number that the custom specifier gave

## Methods

- [ToString](ToString) -- returns the text of the format item that the properties describe

## See Also

- [StringHelper](../StringHelper) class -- creates the specifiers
- [IStringFormatIdentifier](../IStringFormatIdentifier) interface -- receives a specifier
- [Fmt package](../) -- overview, with the syntax of a format item
