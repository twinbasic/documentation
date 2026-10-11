---
title: ExponentialSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/ExponentialSFI
has_toc: false
---

# ExponentialSFI class
{: .no_toc }

Formats a number in exponential notation for the **E** identifier, and reads the exponent back from such a text.

**ExponentialSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **E** or **e** in any case. [**StringHelper**](StringHelper) registers it, so `{0:E}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared. Its interface members are reached through the interface, and [**ParseExponent**](#parseexponent) is public.

## Output

The value is passed to **Format$** with a format of the form `0.00000#E-#`. The letter in the format is the identifier as written, so `E` gives an upper-case `E` in the result and `e` a lower-case `e`. The exponent has no plus sign and no leading zeros.

- Without a precision the mantissa has six decimal places. The sixth is optional, so a trailing zero there is dropped.
- With a precision *n* greater than zero the mantissa has *n* decimal places, and the last of them is optional. A precision of `0` is the same as none.

```tb check_build check_run
Debug.Print StringFormat("{0:E}", 12345.678)   ' 1.234568E4
Debug.Print StringFormat("{0:E2}", 12345.678)  ' 1.23E4
Debug.Print StringFormat("{0:e}", 12345.678)   ' 1.234568e4
Debug.Print StringFormat("{0:E}", 0.00012345)  ' 1.23450E-4
Debug.Print StringFormat("{0:E3}", 1.5)        ' 1.50E0
Debug.Print StringFormat("{0:E1}", 1.5)        ' 1.5E0
```

## Members

### ParseExponent

Returns the exponent of a value that was formatted in exponential notation.

Syntax: *object*.**ParseExponent** ( *formattedValue* ) **As Long**

*formattedValue*
: *required* A **String** holding exponential notation, such as `"1.5E-3"`. The text after the first `E` or `e` is converted to a **Long**.

Returns the exponent as a **Long**. **ParseExponent** is public so that [**GeneralNumericSFI**](GeneralNumericSFI) can call it. Call it on the predeclared instance, `ExponentialSFI.ParseExponent`.

```tb check_build check_run
Debug.Print ExponentialSFI.ParseExponent("1.5E-3")  ' -3
Debug.Print ExponentialSFI.ParseExponent("1.5E4")   ' 4
Debug.Print ExponentialSFI.ParseExponent("1.5e12")  ' 12
```

### IsIdentifierMatch and GetFormattedValue

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `E` or `e`.
- **GetFormattedValue** returns the value formatted as described above. It reads the specifier's [**Precision**](StringFormatSpecifier/Precision) and [**identifier**](StringFormatSpecifier/identifier).

Both are implemented as private members of the interface.

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [GeneralNumericSFI](GeneralNumericSFI) class -- the **G** identifier, which chooses between this class and **FixedPointSFI**
- [FixedPointSFI](FixedPointSFI) class -- a fixed number of decimal places
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
