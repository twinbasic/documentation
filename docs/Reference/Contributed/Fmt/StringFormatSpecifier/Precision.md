---
title: Precision
parent: StringFormatSpecifier
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/Precision
has_toc: false
---

# Precision
{: .no_toc }

Returns the number that follows the identifier letter of a format item.

Syntax: *object*.**Precision**

*object*
: *required* An object expression that evaluates to a **StringFormatSpecifier**.

Returns a **Long**. The default value is `0`, which means that no precision was given.

## Remarks

The property is read-only. It changes only when [**CustomSpecifier**](CustomSpecifier) is assigned a numeric text that is not zero, so `{0:F3}` gives `3` and `{0:F}` and `{0:F0}` give `0`. Assigning a text that is not numeric, or is zero, leaves the earlier value in place.

The meaning of the number depends on the format identifier class: a count of decimal places for [**FixedPointSFI**](../FixedPointSFI), [**ExponentialSFI**](../ExponentialSFI), [**CurrencySFI**](../CurrencySFI) and [**PercentSFI**](../PercentSFI), a count of digits for [**DecimalSFI**](../DecimalSFI) and [**HexSFI**](../HexSFI), and both a count of decimal places and a limit for the exponent for [**GeneralNumericSFI**](../GeneralNumericSFI). A precision of `0` selects each class's default.

## Example

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.identifier = "F"
Debug.Print spec.Precision   ' 0

spec.CustomSpecifier = "3"
Debug.Print spec.Precision   ' 3

Dim f As IStringFormatIdentifier
Set f = FixedPointSFI
Debug.Print f.GetFormattedValue(3.14159, spec)  ' 3.142
```

## See Also

- [CustomSpecifier](CustomSpecifier) property -- sets the precision
- [identifier](identifier) property -- the letter in front of the precision
- [StringFormatSpecifier](./) class -- overview
