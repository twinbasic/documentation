---
title: GeneralNumericSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/GeneralNumericSFI
has_toc: false
---

# GeneralNumericSFI class
{: .no_toc }

Formats a number for the **G** identifier, as whole-number digits, fixed-point or exponential notation depending on its type and size.

**GeneralNumericSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **G** or **g** in any case. [**StringHelper**](StringHelper) registers it, so `{0:G}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared. Its interface members are reached through the interface, and [**GetFormattedValue**](#getformattedvalue) is also public.

## Output

The result depends on the **TypeName** of the value:

- An **Integer** or a **Long** is formatted by [**DecimalSFI**](DecimalSFI): whole-number digits, padded with zeros to the precision.
- A **Double** is first formatted by [**ExponentialSFI**](ExponentialSFI) with the same precision. The exponent of that text is read back with [**ParseExponent**](ExponentialSFI#parseexponent). When the exponent is greater than -5 and its absolute value is less than the precision, the value is formatted again by [**FixedPointSFI**](FixedPointSFI), with the precision as the count of decimal places. Otherwise the exponential text is the result. Without a precision the second test cannot succeed, so a **Double** is always in exponential notation.
- A value of any other type, such as a **Single**, **Currency**, **Byte**, **Decimal** or a numeric **String**, gives an empty string.

The precision is therefore a count of decimal places and a limit for the exponent. It is not a count of significant digits, as it is in .NET. The case of the identifier is kept: `g` gives a lower-case `e` in exponential notation. The decimal point follows the Windows regional settings.

```tb check_build check_run
Debug.Print StringFormat("{0:G}", 42)               ' 42
Debug.Print StringFormat("{0:G5}", 42)              ' 00042
Debug.Print StringFormat("{0:G}", 12345.678)        ' 1.234568E4
Debug.Print StringFormat("{0:G3}", 12345.678)       ' 1.235E4
Debug.Print StringFormat("{0:G6}", 12345.678)       ' 12345.678000
Debug.Print StringFormat("{0:G3}", 123.456)         ' 123.456
Debug.Print StringFormat("{0:G3}", 0.5)             ' 0.500
Debug.Print StringFormat("{0:g}", 12345.678)        ' 1.234568e4
Debug.Print "[" & StringFormat("{0:G}", 3.14!) & "]"  ' []
```

> [!NOTE] 1.0.0.0
> **FormerStringFormat** treats a missing precision differently: it derives one from the count of digits after the decimal point in the value. `{0:G}` of `123.456` gives `123.46` there and `1.23456E2` here. See [FormerStringFormat](FormerEntryPoint/FormerStringFormat).

## Members

### GetFormattedValue

Returns a value formatted as the **G** identifier does.

Syntax: *object*.**GetFormattedValue** ( *value*, *specifier* ) **As String**

*value*
: *required* A **Variant** holding the number to format. Only **Integer**, **Long** and **Double** give a result.

*specifier*
: *required* A [**StringFormatSpecifier**](StringFormatSpecifier/) whose [**identifier**](StringFormatSpecifier/identifier) is `G` or `g` and whose [**CustomSpecifier**](StringFormatSpecifier/CustomSpecifier) holds the precision. The method uses the identifier only for its letter case.

Returns the formatted text. This is the method that the interface's **GetFormattedValue** calls, made public.

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.identifier = "G"
spec.CustomSpecifier = "3"
Debug.Print GeneralNumericSFI.GetFormattedValue(12345.678, spec)  ' 1.235E4
```

### IsIdentifierMatch

Returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `G` or `g`. It is implemented as a private member of the interface.

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [DecimalSFI](DecimalSFI) class -- whole-number digits, used for integers
- [FixedPointSFI](FixedPointSFI) class -- fixed-point notation, used for a **Double** whose exponent is small
- [ExponentialSFI](ExponentialSFI) class -- exponential notation, used for any other **Double**
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
