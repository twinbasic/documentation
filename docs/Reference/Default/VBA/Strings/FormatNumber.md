---
title: FormatNumber
parent: Strings Module
permalink: /tB/Modules/Strings/FormatNumber
vba_attribution: true
---
# FormatNumber
{: .no_toc }

Returns an expression formatted as a number.

Syntax: **FormatNumber(** *expression* [ **,** *numDigitsAfterDecimal* [ **,** *includeLeadingDigit* [ **,** *useParensForNegativeNumbers* [ **,** *groupDigits* ] ] ] ] **)**

*expression*
: *required* Expression to be formatted.

*numDigitsAfterDecimal*
: *optional* Numeric value indicating how many places to the right of the decimal are displayed. Default value is -1, which indicates that the computer's regional settings are used.

*includeLeadingDigit*
: *optional* Tristate constant that indicates whether or not a leading zero is displayed for fractional values. See settings below.

*useParensForNegativeNumbers*
: *optional* Tristate constant that indicates whether or not to place negative values within parentheses. See settings below.

*groupDigits*
: *optional* Tristate constant that indicates whether or not numbers are grouped by using the group delimiter specified in the computer's regional settings. See settings below.

The *includeLeadingDigit*, *useParensForNegativeNumbers*, and *groupDigits* arguments have the following settings:

| Constant         | Value | Description                                          |
|------------------|-------|------------------------------------------------------|
| **vbTrue**       | -1    | True                                                 |
| **vbFalse**      | 0     | False                                                |
| **vbUseDefault** | -2    | Use the setting from the computer's regional settings. |

When one or more optional arguments are omitted, the values for omitted arguments are provided by the computer's regional settings.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *numDigitsAfterDecimal* is less than -1<br>*includeLeadingDigit*, *useParensForNegativeNumbers* or *groupDigits* is not -2, -1 or 0 |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | an argument other than *expression* is **Null** |

<!-- /errors -->

### See Also

- [Format](Format), [FormatCurrency](FormatCurrency), [FormatPercent](FormatPercent) functions
