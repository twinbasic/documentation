---
title: HexSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/HexSFI
has_toc: false
---

# HexSFI class
{: .no_toc }

Formats a number as hexadecimal digits with an `&H` prefix for the **X** identifier.

**HexSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **X** or **x** in any case. [**StringHelper**](StringHelper) registers it, so `{0:X}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared, and its two members are reached through the interface.

## Output

The digits are the result of **Hex$**, so a value with a fractional part is rounded to a whole number and a negative **Integer** gives its 16-bit form (`&HFFFF` for `-1`) where a negative **Long** gives its 32-bit form.

- Without a precision the result is the prefix and the digits.
- With a precision *n* greater than zero the digits are padded on the left with zeros to *n* digits, and a longer number is cut to its last *n* digits. `{0:X2}` of `4095` is `&HFF`.
- The case of the identifier sets the case of the whole result, prefix included: `X` gives `&HFF` and `x` gives `&hff`.

```tb check_build check_run
Debug.Print StringFormat("{0:X}", 255)     ' &HFF
Debug.Print StringFormat("{0:x}", 255)     ' &hff
Debug.Print StringFormat("{0:X8}", 255)    ' &H000000FF
Debug.Print StringFormat("{0:x4}", 255)    ' &h00ff
Debug.Print StringFormat("{0:X2}", 4095)   ' &HFF
Debug.Print StringFormat("{0:X}", -1)      ' &HFFFF
Debug.Print StringFormat("{0:X}", -1&)     ' &HFFFFFFFF
```

> [!NOTE] 1.0.0.0
> **FormerStringFormat** writes the `&H` prefix in upper case for both `X` and `x`, so `{0:x4}` of `255` gives `&H00ff` there and `&h00ff` here.

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `X` or `x`.
- **GetFormattedValue** returns the value formatted as described above. It reads the specifier's [**Precision**](StringFormatSpecifier/Precision) and [**identifier**](StringFormatSpecifier/identifier).

Both are implemented as private members of the interface.

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [DecimalSFI](DecimalSFI) class -- decimal digits, padded with zeros
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
