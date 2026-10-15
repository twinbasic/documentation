---
title: DecimalSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/DecimalSFI
has_toc: false
---

# DecimalSFI class
{: .no_toc }

<!-- test: DecimalTests.Default_IsTheWholeNumber, DecimalTests.Precision_PadsWithZeros, DecimalTests.FractionalValue_IsRounded, DecimalTests.Negative_KeepsTheSignInFrontOfThePadding, DecimalTests.LongerNumber_IsNotShortened, DecimalTests.Class_MatchesDAndOnlyD, DecimalTests.Class_GetFormattedValue_ReadsThePrecision -->

Formats a number as whole-number digits for the **D** identifier.

**DecimalSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **D** or **d** in any case. [**StringHelper**](StringHelper) registers it, so `{0:D}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared, and its two members are reached through the interface.

## Output

The value is passed to **Format$** with a format of zeros. Without a precision the format is `0`. With a precision *n* the format is *n* zeros, so the result has at least *n* digits and shorter numbers are padded on the left with zeros. A value with a fractional part is rounded to a whole number, and a negative number keeps its minus sign in front of the padding. A value with more digits than *n* is not shortened.

```tb check_build check_run
Debug.Print StringFormat("{0:D}", 42)     ' 42
Debug.Print StringFormat("{0:D5}", 42)    ' 00042
Debug.Print StringFormat("{0:D3}", -5)    ' -005
Debug.Print StringFormat("{0:D}", 3.7)    ' 4
Debug.Print StringFormat("{0:D2}", 1234)  ' 1234
Debug.Print StringFormat("{0:D2}:{1:D2}", 7, 5)  ' 07:05
```

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `D` or `d`.
- **GetFormattedValue** returns the value formatted as described above. It reads the specifier's [**Precision**](StringFormatSpecifier/Precision).

Both are implemented as private members of the interface. [**GeneralNumericSFI**](GeneralNumericSFI) calls this class for **Integer** and **Long** values.

<!-- /test -->

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [HexSFI](HexSFI) class -- hexadecimal digits, padded with zeros
- [GeneralNumericSFI](GeneralNumericSFI) class -- the **G** identifier, which uses this class for integers
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
