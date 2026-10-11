---
title: IStringFormatIdentifier
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/IStringFormatIdentifier
has_toc: false
---

# IStringFormatIdentifier interface
{: .no_toc }

The contract that a format identifier class implements: it says whether it handles an item's identifier, and formats a value for it.

Each of the eleven format identifier classes of the package implements **IStringFormatIdentifier**: [**CurrencySFI**](CurrencySFI), [**DateTimeSFI**](DateTimeSFI), [**DecimalSFI**](DecimalSFI), [**ExponentialSFI**](ExponentialSFI), [**FixedPointSFI**](FixedPointSFI), [**GeneralNumericSFI**](GeneralNumericSFI), [**GenericDateTimeSFI**](GenericDateTimeSFI), [**HexSFI**](HexSFI), [**NumericPaddingSFI**](NumericPaddingSFI), [**PercentSFI**](PercentSFI) and [**RoundTripSFI**](RoundTripSFI). [**StringHelper**](StringHelper) holds one list of them for numeric values and one for dates. For each format item it asks every class of the list that suits the value's type whether it matches the item's identifier, and a class that matches formats the value. It does not stop at the first match, so the last matching class decides. The classes of one list match different letters, so at most one of them matches an item.

The interface is declared as a class module with two empty members. A class in a project can implement it, and its methods can be called through the interface, as in the example below. The lists in **StringHelper** are private and filled when the class is initialised, so there is no way to add a class to them, and [**StringFormat**](PublicEntryPoints/StringFormat) never calls a class that is not already there.

* TOC
{:toc}

## Methods

### GetFormattedValue

Returns the value formatted as the implementing class defines.

Syntax: *object*.**GetFormattedValue** ( *value*, *specifier* ) **As String**

*value*
: *required* A **Variant** holding the value to format. **StringHelper** passes a number to the numeric classes and a **Date** to the date classes.

*specifier*
: *required* A [**StringFormatSpecifier**](StringFormatSpecifier/) describing the format item: its [**identifier**](StringFormatSpecifier/identifier), [**Precision**](StringFormatSpecifier/Precision) and [**CustomSpecifier**](StringFormatSpecifier/CustomSpecifier).

Returns the formatted text. **StringHelper** applies the item's [**Alignment**](StringFormatSpecifier/Alignment) afterwards, so an implementation does not pad the result.

### IsIdentifierMatch

Returns whether the implementing class handles the identifier of a format item.

Syntax: *object*.**IsIdentifierMatch** ( *specifier* ) **As Boolean**

*specifier*
: *required* A [**StringFormatSpecifier**](StringFormatSpecifier/) describing the format item.

Returns **True** when the class formats items with that identifier. The classes of the package compare the specifier's [**identifier**](StringFormatSpecifier/identifier) with their own letter. The numeric classes ignore the case of the identifier. The date classes treat nine of their letters as case-sensitive and accept `C` in either case.

## Example

This example implements the interface in a class that upper-cases a value for the identifier `U`, and calls it directly.

```tb check_build projname=fmt-isfi
Class UpperSFI
    Implements IStringFormatIdentifier

    Private Function IStringFormatIdentifier_GetFormattedValue(ByVal value As Variant, ByVal specifier As StringFormatSpecifier) As String
        IStringFormatIdentifier_GetFormattedValue = UCase$(CStr(value))
    End Function

    Private Function IStringFormatIdentifier_IsIdentifierMatch(ByVal specifier As StringFormatSpecifier) As Boolean
        IStringFormatIdentifier_IsIdentifierMatch = (specifier.identifier = "U")
    End Function
End Class
```

```tb check_build check_run projname=fmt-isfi
Dim spec As New StringFormatSpecifier
spec.identifier = "U"

Dim f As IStringFormatIdentifier
Set f = New UpperSFI
Debug.Print f.IsIdentifierMatch(spec)  ' True
Debug.Print f.GetFormattedValue("hello", spec)  ' HELLO

' StringFormat does not know the class, so the identifier is refused.
On Error Resume Next
Debug.Print StringFormat("{0:U}", "hello")
Debug.Print Err.Number & ": " & Err.Description  ' -2147212503: Invalid format string.
```

## See Also

- [StringHelper](StringHelper) class -- holds the lists of format identifier classes
- [StringFormatSpecifier](StringFormatSpecifier/) class -- describes one format item
- [GenericDateTimeSFI](GenericDateTimeSFI) class -- the registered date and time identifier class
- [Fmt package](./) -- overview, with the table of identifiers
