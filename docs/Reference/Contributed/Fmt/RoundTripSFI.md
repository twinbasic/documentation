---
title: RoundTripSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/RoundTripSFI
has_toc: false
---

# RoundTripSFI class
{: .no_toc }

<!-- test: PercentRoundTripTests.RoundTrip_ConvertsTheValueToText, PercentRoundTripTests.RoundTrip_NumericString_IsReturnedAsANumber, PercentRoundTripTests.RoundTrip_KeepsAtMost15SignificantDigits, PercentRoundTripTests.RoundTrip_IgnoresThePrecision, PercentRoundTripTests.RoundTrip_Class_MatchesRAndOnlyR -->

Converts a number to a **Double** and returns its text for the **R** identifier.

**RoundTripSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and matches the identifier **R** or **r** in any case. [**StringHelper**](StringHelper) registers it, so `{0:R}` in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it for a numeric value. The class is predeclared, and its two members are reached through the interface.

## Output

The value is converted with **CDbl**, and the **Double** is converted to a **String** by the ordinary conversion. A precision is ignored. The ordinary conversion keeps at most 15 significant digits, so a value that needs more digits does not survive the round trip, in spite of the identifier's name. A numeric **String** is accepted and returned as a number, without trailing zeros. The decimal point follows the Windows regional settings.

```tb check_build check_run
Debug.Print StringFormat("{0:R}", 0.1)     ' 0.1
Debug.Print StringFormat("{0:R}", 1 / 3)   ' 0.333333333333333
Debug.Print StringFormat("{0:R}", "1.50")  ' 1.5
```

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `R` or `r`.
- **GetFormattedValue** returns the value converted as described above.

Both are implemented as private members of the interface.

<!-- /test -->

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [FixedPointSFI](FixedPointSFI) class -- a fixed number of decimal places
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
