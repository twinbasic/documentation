---
title: Alignment
parent: StringFormatSpecifier
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/Alignment
has_toc: false
---

# Alignment
{: .no_toc }

<!-- test: SpecifierTests.Defaults, SpecifierTests.Alignment_ProducesTheComma, ItemTests.Alignment_Positive_RightJustifies, ItemTests.Alignment_Negative_LeftJustifies, ItemTests.Alignment_WiderValue_IsNotShortened -->

Returns or sets the width and the justification of a formatted value.

## Get

Returns a **Long**.

Syntax: *object*.**Alignment**

*object*
: *required* An object expression that evaluates to a **StringFormatSpecifier**.

The default value is `0`, which means no alignment.

## Let

Sets the alignment.

Syntax: *object*.**Alignment** **=** *value*

*value*
: A **Long**. A positive number is the minimum width of the result, with the formatted value right-justified (padded on the left). A negative number is the minimum width with the value left-justified (padded on the right). Zero means no padding.

## Remarks

[**StringHelper**](../StringHelper) sets the property from the comma part of a format item, so `{0,8}` gives `8` and `{0,-8}` gives `-8`, and it pads the result after the format identifier class has produced it. The padding character is a space. A formatted value that is wider than the alignment is not shortened. The format identifier classes do not read the property.

<!-- /test -->

## Example

```tb check_build check_run
Dim spec As New StringFormatSpecifier
Debug.Print spec.Alignment       ' 0

spec.Alignment = -8
Debug.Print spec.ToString()      ' {0,-8}
Debug.Print StringFormat("[{0,-8}][{0,8}]", "ab")  ' [ab      ][      ab]
```

## See Also

- [ToString](ToString) method -- includes the alignment in its text
- [Index](IndexProperty) property -- the position of the value
- [StringFormatSpecifier](./) class -- overview
