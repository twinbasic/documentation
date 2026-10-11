---
title: FixedPointSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/FixedPointSFI
has_toc: false
---

# FixedPointSFI class
{: .no_toc }

Formats a number with a fixed count of decimal places for the **F** identifier.

**FixedPointSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **F** or **f** in any case. [**StringHelper**](StringHelper) registers it, so `{0:F}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared, and its two members are reached through the interface.

## Output

The value is passed to **Format$**. Without a precision the format is `0.00`, two decimal places. With a precision *n* greater than zero the format is `0.` followed by *n* zeros. A precision of `0` is the same as none, so `{0:F0}` also gives two decimal places. The result has no thousands separator, and the decimal point follows the Windows regional settings.

```tb check_build check_run
Debug.Print StringFormat("{0:F}", 3.14159)    ' 3.14
Debug.Print StringFormat("{0:F3}", 3.14159)   ' 3.142
Debug.Print StringFormat("{0:f1}", -3.14159)  ' -3.1
Debug.Print StringFormat("{0:F0}", 2.5)       ' 2.50
Debug.Print StringFormat("{0:F2}", 12345.678) ' 12345.68
```

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `F` or `f`.
- **GetFormattedValue** returns the value formatted as described above. It reads the specifier's [**Precision**](StringFormatSpecifier/Precision).

Both are implemented as private members of the interface. [**GeneralNumericSFI**](GeneralNumericSFI) calls this class when it chooses fixed-point notation.

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [CurrencySFI](CurrencySFI) class -- decimal places with thousands separators and a trailing `$`
- [ExponentialSFI](ExponentialSFI) class -- exponential notation
- [GeneralNumericSFI](GeneralNumericSFI) class -- the **G** identifier, which can fall back to this class
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
