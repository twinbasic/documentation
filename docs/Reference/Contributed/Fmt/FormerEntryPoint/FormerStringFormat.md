---
title: FormerStringFormat
parent: FormerEntryPoint
permalink: /tB/Packages/Contributed/Fmt/FormerEntryPoint/FormerStringFormat
has_toc: false
---

# FormerStringFormat
{: .no_toc }

<!-- test: FormerStringFormatTests.CommonNotation_GivesTheSameAsStringFormat, FormerStringFormatTests.N_IsUnderstood, FormerStringFormatTests.CustomNumberFormat_IsPassedToFormat, FormerStringFormatTests.G_WithoutPrecision_TakesTheDigitsAfterThePoint, FormerStringFormatTests.X_PrefixIsUpperCaseForBothCases, FormerStringFormatTests.HexEscape_IsNotExpanded, FormerStringFormatTests.NonNumericValue_WithNumericIdentifier_RaisesInvalidNumberArgument, FormerStringFormatTests.E_PrecisionZero_RaisesInvalidFormatString, FormerStringFormatTests.WrongCount_HasTheSameNumberAndTextWithItsOwnSource -->

Builds a string from a format string and a list of values, with the earlier implementation of the formatter.

Syntax: **FormerStringFormat** ( *format_string* [, *values* ] ) **As String**

*format_string*
: *required* A **String** that holds text, format items and escape sequences, in the same notation as [**StringFormat**](../PublicEntryPoints/StringFormat). A leading `@` turns the escape sequences off.

*values*
: *optional* Any number of values. The first value is index `0`. This is a **ParamArray** of **Variant**.

Returns the format string with every format item and escape sequence replaced.

## Remarks

The function reads the same format items (`{index[,alignment][:identifier[precision]]}`) and the same escape sequences as [**StringFormat**](../PublicEntryPoints/StringFormat), checks that the number of distinct indexes equals the number of values, and aligns values in the same way. The identifiers `C D E F G P R X` for numbers and `d D f F g G s t T C` for dates exist here too.

It differs from [**StringFormat**](../PublicEntryPoints/StringFormat) in these ways:

- **N** is understood. `{0:N}` writes a number with thousands separators and no decimal places, and `{0:N2}` with two decimal places. **StringFormat** does not know the identifier.
- A few custom number formats are passed to **Format$**, for example `{0:0.00}`.
- **G** without a precision takes the count of digits after the decimal point in the value as its precision. `{0:G}` of `123.456` gives `123.46` here and `1.23456E2` in **StringFormat**.
- **X** writes the prefix `&H` in upper case whatever the case of the identifier. `{0:x4}` of `255` gives `&H00ff` here and `&h00ff` in **StringFormat**.
- The escape sequence `\xHH` is not expanded. `\x41` stays as written, where **StringFormat** gives `A`. The simple sequences and `\ooo` are expanded as in **StringFormat**.
- A non-numeric value with a numeric identifier raises error `-2147212501` (`vbObjectError Or 9003`), *Invalid number argument*. **StringFormat** raises *Invalid format string*. `{0:E0}` raises *Invalid format string* here, where **StringFormat** treats `E0` as `E`.
- Its errors have the source `FormerStringFormat`. The error for a wrong count of values has the same number, `-2147212503`, and the same text as **StringFormat**.

```tb check_build check_run
Debug.Print FormerStringFormat("{0} {1:F2}", "x", 2.5)  ' x 2.50
Debug.Print FormerStringFormat("{0:P1}", 0.12345)       ' 12.3%
Debug.Print FormerStringFormat("{0:x4}", 255)           ' &H00ff
Debug.Print StringFormat("{0:x4}", 255)                 ' &h00ff

Debug.Print FormerStringFormat("\x41\101")              ' \x41A
Debug.Print StringFormat("\x41\101")                    ' AA

Debug.Print FormerStringFormat("{0:G}", 123.456)        ' 123.46
Debug.Print StringFormat("{0:G}", 123.456)              ' 1.23456E2
```

<!-- /test -->

## Example

This example uses **N** and a custom number format, which only this function accepts. The results depend on the regional settings, so the output shown is for English (United States).

```tb check_build
Debug.Print FormerStringFormat("{0:N}|{0:N2}", 1234567.891)  ' 1,234,568|1,234,567.89
Debug.Print FormerStringFormat("{0:0.00}", 3.14159)           ' 3.14
```

This example shows the error for a value that is not a number.

```tb check_build check_run
On Error Resume Next
Debug.Print FormerStringFormat("{0:C}", "abc")
Debug.Print Err.Number & ": " & Err.Description  ' -2147212501: Invalid number argument.
```

## See Also

- [StringFormat](../PublicEntryPoints/StringFormat) function -- the current implementation
- [FormerEscapeSequence](../FormerEscapeSequence/) class -- an escape sequence class that this function does not use
- [FormerEntryPoint](./) module
- [Fmt package](../) -- overview
