---
title: StringHelper
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/StringHelper
has_toc: false
---

# StringHelper class
{: .no_toc }

The class that does the work behind **StringFormat**: it finds the format items in a format string, formats the values and expands the escape sequences.

**StringHelper** is predeclared, so its one public method is called on the class name, `StringHelper.StringFormat`. [**StringFormat**](PublicEntryPoints/StringFormat) in the [**PublicEntryPoints**](PublicEntryPoints/) module copies its **ParamArray** into an array and calls this method. Call the method directly when the values are already in an array. A project can also create an instance with `New StringHelper`, which behaves in the same way.

Creating an instance, the predeclared one on its first use included, builds three private lists that cannot be changed afterwards:

- The escape sequences, in the order `\n`, `\q`, `\t`, `\a`, `\b`, `\v`, `\f`, `\r`, then `\xHH` (hexadecimal) and `\ooo` (octal). The table of what they produce is in the [package overview](./#escape-sequences).
- The numeric format identifier classes, in the order [**CurrencySFI**](CurrencySFI), [**DecimalSFI**](DecimalSFI), [**GeneralNumericSFI**](GeneralNumericSFI), [**PercentSFI**](PercentSFI), [**FixedPointSFI**](FixedPointSFI), [**ExponentialSFI**](ExponentialSFI), [**HexSFI**](HexSFI), [**RoundTripSFI**](RoundTripSFI) and [**NumericPaddingSFI**](NumericPaddingSFI).
- The date format identifier classes: only [**GenericDateTimeSFI**](GenericDateTimeSFI). [**DateTimeSFI**](DateTimeSFI) exists in the package but is not registered.

The padding character for alignment is a space and cannot be changed.

* TOC
{:toc}

## Methods

### StringFormat

Builds a string from a format string and an array of values.

Syntax: *object*.**StringFormat** ( *format_string*, *values* ) **As String**

*format_string*
: *required* A **String** holding text, format items and escape sequences. See [**PublicEntryPoints.StringFormat**](PublicEntryPoints/StringFormat) for the rules.

*values*
: *required* A **Variant** array holding the values. The array is indexed from 0: element *n* supplies the format items with index *n*, and the number of elements is the number of distinct indexes the format string must use.

Returns the formatted **String**. The method raises the same errors as [**PublicEntryPoints.StringFormat**](PublicEntryPoints/StringFormat), from the source `StringHelper`.

```tb check_build check_run
Dim values(0 To 1) As Variant
values(0) = "x"
values(1) = 2.5
Debug.Print StringHelper.StringFormat("{0}-{1:F1}", values)  ' x-2.5

Debug.Print StringHelper.StringFormat("{0} and {1}", Array("salt", "pepper"))  ' salt and pepper
```

## See Also

- [StringFormat](PublicEntryPoints/StringFormat) function -- the entry point that takes the values as arguments
- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- implemented by the identifier classes the lists hold
- [EscapeSequence](EscapeSequence/) class -- the escape sequences the list holds
- [StringFormatSpecifier](StringFormatSpecifier/) class -- describes one format item
- [Fmt package](./) -- overview
