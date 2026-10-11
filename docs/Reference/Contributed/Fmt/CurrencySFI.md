---
title: CurrencySFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/CurrencySFI
has_toc: false
---

# CurrencySFI class
{: .no_toc }

Formats a number as an amount of money for the **C** identifier.

**CurrencySFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **C** or **c** in any case. [**StringHelper**](StringHelper) registers it, so `{0:C}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared, and its two members are reached through the interface.

## Output

The value is passed to **Format$**. Without a precision the format is `#,##0.00$`: thousands separators, two decimal places and a `$` after the number. With a precision *n* greater than zero the format has *n* decimal places instead. A precision of `0` is the same as none.

The `$` is a fixed character placed after the number. It is not the currency symbol of the system locale, and the identifier does not move it in front of the number. The thousands separator and the decimal point follow the Windows regional settings.

```tb check_build
Debug.Print StringFormat("{0:C}", 1234.5)     ' 1,234.50$
Debug.Print StringFormat("{0:C3}", 2.5)       ' 2.500$
Debug.Print StringFormat("{0:C0}", 17.63245)  ' 17.63$
Debug.Print StringFormat("{0:C}", -5)         ' -5.00$
```

The output shown is for an English (United States) system.

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `C` or `c`.
- **GetFormattedValue** returns the value formatted as described above. It reads the specifier's [**Precision**](StringFormatSpecifier/Precision).

Both are implemented as private members of the interface.

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [DecimalSFI](DecimalSFI) class -- integer digits, padded with zeros
- [FixedPointSFI](FixedPointSFI) class -- a fixed number of decimal places, no separators
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
