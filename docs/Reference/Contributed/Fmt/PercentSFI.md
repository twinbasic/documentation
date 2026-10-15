---
title: PercentSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/PercentSFI
has_toc: false
---

# PercentSFI class
{: .no_toc }

<!-- test: PercentRoundTripTests.Percent_Default_IsAWholeNumberOfPercent, PercentRoundTripTests.Percent_Precision_SetsTheDecimalPlaces, PercentRoundTripTests.Percent_HasThousandsSeparators, PercentRoundTripTests.Percent_Class_MatchesPAndOnlyP -->

Formats a number as a percentage for the **P** identifier.

**PercentSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **P** or **p** in any case. [**StringHelper**](StringHelper) registers it, so `{0:P}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared, and its two members are reached through the interface.

## Output

The value is passed to **Format$**, whose `%` format multiplies it by 100 and appends a percent sign. Without a precision the format is `#,##0%`, a whole number of percent, rounded. With a precision *n* greater than zero the format has *n* decimal places. A precision of `0` is the same as none. The result has thousands separators, and the decimal point follows the Windows regional settings.

```tb check_build check_run
Debug.Print StringFormat("{0:P}", 0.12345)   ' 12%
Debug.Print StringFormat("{0:P1}", 0.12345)  ' 12.3%
Debug.Print StringFormat("{0:P2}", 0.5)      ' 50.00%
Debug.Print StringFormat("{0:P}", 1)         ' 100%
Debug.Print StringFormat("{0:P}", 0.005)     ' 1%
```

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `P` or `p`.
- **GetFormattedValue** returns the value formatted as described above. It reads the specifier's [**Precision**](StringFormatSpecifier/Precision).

Both are implemented as private members of the interface.

<!-- /test -->

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [FixedPointSFI](FixedPointSFI) class -- a fixed number of decimal places
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
