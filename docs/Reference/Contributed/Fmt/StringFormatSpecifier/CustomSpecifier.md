---
title: CustomSpecifier
parent: StringFormatSpecifier
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/CustomSpecifier
has_toc: false
---

# CustomSpecifier
{: .no_toc }

Returns or sets the text of a format item that follows its identifier letter.

## Get

Returns a **String**.

Syntax: *object*.**CustomSpecifier**

*object*
: *required* An object expression that evaluates to a **StringFormatSpecifier**.

The default value is an empty string.

## Let

Sets the text, and sets [**Precision**](Precision) when the text is a non-zero number.

Syntax: *object*.**CustomSpecifier** **=** *value*

*value*
: A **String**. For `{0:F2}` it is `2`, for `{0:Cyyyy-MM-dd}` it is `yyyy-MM-dd`.

## Remarks

The text is stored as written. When it is numeric and not zero, [**Precision**](Precision) takes the value as well. When it is not, [**Precision**](Precision) is left as it was: assigning `"abc"` or `"0"` does not reset an earlier precision to zero.

The meaning of the text belongs to the format identifier class. The numeric classes read it as a precision through [**Precision**](Precision). [**GenericDateTimeSFI**](../GenericDateTimeSFI) passes it to **Format$** as a custom date and time format when the identifier is `C`.

## Example

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.identifier = "F"
spec.CustomSpecifier = "3"
Debug.Print spec.Precision          ' 3

spec.CustomSpecifier = "abc"
Debug.Print spec.Precision          ' 3
Debug.Print spec.CustomSpecifier    ' abc
```

## See Also

- [Precision](Precision) property -- the numeric reading of the text
- [identifier](identifier) property -- the letter in front of the text
- [ToString](ToString) method -- includes the text
- [StringFormatSpecifier](./) class -- overview
