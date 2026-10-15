---
title: Index
parent: StringFormatSpecifier
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/IndexProperty
has_toc: false
---

# Index
{: .no_toc }

<!-- test: SpecifierTests.Index_IsNotCheckedWhenAssigned, ItemTests.Index_RepeatedIndexUsesTheValueEachTime -->

Returns or sets the position of the value that a format item refers to.

## Get

Returns a **Long**.

Syntax: *object*.**Index**

*object*
: *required* An object expression that evaluates to a **StringFormatSpecifier**.

The default value is `0`.

## Let

Sets the position.

Syntax: *object*.**Index** **=** *value*

*value*
: A **Long**. The zero-based position of the value in the argument list: `0` for the first value, `1` for the second.

## Remarks

[**StringHelper**](../StringHelper) sets the property from the number at the start of a format item, so `{2}` gives `2`. The same index can occur in several items. The property is not checked when it is assigned; [**StringHelper**](../StringHelper) checks the indexes of a whole format string against the number of values.

<!-- /test -->

## Example

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.Index = 2
Debug.Print spec.Index       ' 2
Debug.Print spec.ToString()  ' {2}
```

## See Also

- [Alignment](Alignment) property -- the width of the formatted value
- [ToString](ToString) method -- includes the index
- [StringFormatSpecifier](./) class -- overview
