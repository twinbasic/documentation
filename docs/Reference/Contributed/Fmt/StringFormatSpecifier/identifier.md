---
title: identifier
parent: StringFormatSpecifier
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/identifier
has_toc: false
---

# identifier
{: .no_toc }

<!-- test: SpecifierTests.Identifier_KeepsTheCaseAsWritten, HexTests.LowerCaseIdentifier_GivesALowerCaseResult, GeneralTests.LowerCaseIdentifier_GivesALowerCaseE -->

Returns or sets the letter that selects the format of a format item.

## Get

Returns a **String**.

Syntax: *object*.**identifier**

*object*
: *required* An object expression that evaluates to a **StringFormatSpecifier**.

The default value is an empty string, which means that the item has no identifier.

## Let

Sets the identifier.

Syntax: *object*.**identifier** **=** *value*

*value*
: A **String**, normally one character such as `"F"` or `"x"`.

## Remarks

[**StringHelper**](../StringHelper) sets the property from the first character after the colon of a format item, so `{0:F2}` gives `F`. The rest of the text after the colon goes to [**CustomSpecifier**](CustomSpecifier).

The property keeps the letter as written, including its case. The format identifier classes compare it with their own letter, and [**HexSFI**](../HexSFI) and [**GeneralNumericSFI**](../GeneralNumericSFI) copy its case into their results.

<!-- /test -->

## Example

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.identifier = "x"

Dim f As IStringFormatIdentifier
Set f = HexSFI
Debug.Print f.IsIdentifierMatch(spec)         ' True
Debug.Print f.GetFormattedValue(255, spec)    ' &hff

Set f = CurrencySFI
Debug.Print f.IsIdentifierMatch(spec)         ' False
```

## See Also

- [CustomSpecifier](CustomSpecifier) property -- the text after the identifier
- [IStringFormatIdentifier](../IStringFormatIdentifier) interface -- compares the identifier
- [StringFormatSpecifier](./) class -- overview
