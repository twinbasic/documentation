---
title: Fmt Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - HelloWorldClass
  - HelloWorldModule
  - Pootle
indexed_from: 1.0.0.0
permalink: /tB/Packages/Contributed/Fmt/
---

# Fmt Package
{: .no_toc }

The **Fmt** contributed package provides [**StringFormat**](PublicEntryPoints/StringFormat), a function that builds a string from a format string and a list of values, in the style of C#'s **String.Format**. A format string holds text, format items such as `{0}`, `{1,8}` or `{2:F2}`, and C-style escape sequences such as `\n` and `\q`. Each format item is replaced by the value at its index, formatted and padded as the item says.

The rest of the package is what **StringFormat** is built from: a class for each format identifier and the interface they implement, a class for each escape sequence, the string tests the formatter uses, and the older implementation, [**FormerStringFormat**](FormerEntryPoint/FormerStringFormat).

```tb check_build check_run
Debug.Print StringFormat("I'm eating a very nice {0} {1}", "Bramleys", 3.142)  ' I'm eating a very nice Bramleys 3.142
Debug.Print StringFormat("Item {0,-6}|{1,8:F2}|", "tea", 2.5)                  ' Item tea   |    2.50|
```

The functions are public, so **StringFormat** is called by name, as the samples do, or as `PublicEntryPoints.StringFormat`.

* TOC
{:toc}

## Format items

A format item is written

```
{index[,alignment][:identifier[precision]]}
```

| Part | Meaning |
|------|---------|
| *index* | The position of the value in the argument list, counting from 0. It is written in decimal digits. A word that is not a number, such as `{name}`, raises error 13. |
| *alignment* | Optional. A comma and an integer, with an optional minus sign: `,8` or `,-8`. A positive number is the minimum width and right-justifies the value. A negative number is the minimum width and left-justifies it. The padding is spaces, and a value wider than the width is not shortened. |
| *identifier* | Optional. A colon and one letter that selects the format. The letters are in the tables [below](#format-identifiers). An item without an identifier shows the value as the conversion of the value to a **String** gives it. |
| *precision* | Optional. The text after the identifier letter, up to the closing brace. A number sets the precision of the identifier, a count of decimal places or of digits depending on the identifier; `0` is the same as none. With the date identifier `C` the text is a **Format$** format string. |

Four rules decide what is an item and what is text:

- The index, the alignment and the identifier contain no spaces. `{0, 8}` is not an item and stays in the result as text, and so does `{0` without a closing brace.
- The index is written in its plain form. An item whose index or alignment has a leading zero (`{00}`, `{0,08}`), or whose alignment is zero (`{0,0}`), is recognised but not replaced, and stays in the result unchanged.
- Every value must be used. The distinct indexes of the items must number exactly the values, and run from 0 without a gap. A format string with no items ignores its values.
- A doubled brace is not an escape. `{{0}}` with the value `5` gives `{5}`.

```tb check_build check_run
Debug.Print StringFormat("{{0}} {0}", 5)   ' {5} 5
Debug.Print StringFormat("[{0, 8}]", 5)    ' [{0, 8}]
Debug.Print StringFormat("[{00}]", 5)      ' [{00}]
```

[**StringFormat**](PublicEntryPoints/StringFormat) describes how the items are processed. The properties of one item are held by a [**StringFormatSpecifier**](StringFormatSpecifier/).

## Format identifiers

The type of the value decides which identifiers an item can use. A value for which **IsNumeric** is **True** (a number, a **Boolean**, a **String** that looks like a number) uses the numeric identifiers. A value of type **Date** uses the date identifiers. A value of any other type takes no identifier. An identifier that does not suit the value raises error `-2147212503`, *Invalid format string*. A **Null** value raises error 94.

### Numeric values

The numeric identifiers ignore the case of the letter, and the letters `X`, `E` and `G` copy it into the result. A precision of *n* below is a precision greater than zero.

| Identifier | Class | Without a precision | With a precision *n* | Example |
|------------|-------|---------------------|----------------------|---------|
| `C` | [CurrencySFI](CurrencySFI) | Thousands separators, two decimal places and a `$` after the number | *n* decimal places | `{0:C}` of `17.63245` gives `17.63$` |
| `D` | [DecimalSFI](DecimalSFI) | A whole number, rounded | At least *n* digits, padded with zeros | `{0:D5}` of `42` gives `00042` |
| `E` | [ExponentialSFI](ExponentialSFI) | Exponential notation with up to six decimal places | *n* decimal places | `{0:E2}` of `12345.678` gives `1.23E4` |
| `F` | [FixedPointSFI](FixedPointSFI) | Two decimal places | *n* decimal places | `{0:F}` of `12345.678` gives `12345.68` |
| `G` | [GeneralNumericSFI](GeneralNumericSFI) | An **Integer** or **Long** as `D`. A **Double** in exponential notation. Any other type gives an empty string | An **Integer** or **Long** as `D`. A **Double** in fixed-point notation with *n* decimal places when its exponent is above -5 and its size is below *n*, otherwise exponential | `{0:G3}` of `12345.678` gives `1.235E4` |
| `P` | [PercentSFI](PercentSFI) | A whole number of percent | *n* decimal places | `{0:P1}` of `0.12345` gives `12.3%` |
| `R` | [RoundTripSFI](RoundTripSFI) | The value as a **Double** converted to text, with at most 15 significant digits | Ignored | `{0:R}` of `0.1` gives `0.1` |
| `X` | [HexSFI](HexSFI) | `&H` and the hexadecimal digits | The digits padded with zeros, or cut from the left, to *n* digits | `{0:X}` of `255` gives `&HFF` |

No class accepts any other letter. [**NumericPaddingSFI**](NumericPaddingSFI) is registered for numbers but its test is always **False**, so `N` and every other letter raise error `-2147212503`.

```tb check_build check_run
Debug.Print StringFormat("{0:D5}|{0:D}", 42)                ' 00042|42
Debug.Print StringFormat("{0:E2}|{0:E}", 12345.678)         ' 1.23E4|1.234568E4
Debug.Print StringFormat("{0:F2}|{0:F}|{0:F0}", 12345.678)  ' 12345.68|12345.68|12345.68
Debug.Print StringFormat("{0:G}|{0:G3}", 12345.678)         ' 1.234568E4|1.235E4
Debug.Print StringFormat("{0:P1}|{0:P}", 0.12345)           ' 12.3%|12%
Debug.Print StringFormat("{0:R}", 0.1)                      ' 0.1
Debug.Print StringFormat("{0:X}|{0:x4}|{0:X8}", 255)        ' &HFF|&h00ff|&H000000FF
```

The currency identifier writes the dollar sign after the number, and its thousands separator follows the regional settings of the system.

```tb check_build
Debug.Print StringFormat("{0:C2}|{0:C}|{0:c0}", 17.63245)  ' 17.63$|17.63$|17.63$
Debug.Print StringFormat("{0:C}", 1234567.891)             ' 1,234,567.89$
Debug.Print StringFormat("{0:C}", -5)                      ' -5.00$
```

### Dates

The date identifiers are the letters of [**GenericDateTimeSFI**](GenericDateTimeSFI). They are case-sensitive, except `C`.

| Identifier | Result | Example for 11 October 2026, 14:05:09 |
|------------|--------|---------------------------------------|
| `d` | The short date | `10/11/2026` |
| `D` | The long date | `Sunday, October 11, 2026` |
| `f` | The long date and the short time | `Sunday, October 11, 2026 2:05 PM` |
| `F` | The long date and the long time | `Sunday, October 11, 2026 2:05:09 PM` |
| `g` | The short date and the short time | `10/11/2026 02:05 PM` |
| `G` | The short date and the long time | `10/11/2026 2:05:09 PM` |
| `s` | A sortable date and time | `2026-10-11T14:05:09` |
| `t` | The short time | `02:05 PM` |
| `T` | The long time | `2:05:09 PM` |
| `C` or `c` | A custom format: the text after the letter is a **Format$** format string | `{0:Cyyyy-MM-dd}` gives `2026-10-11` |

The text after a letter other than `C` is ignored, and a letter that is not in the table raises error `-2147212503`. A .NET custom format such as `{0:yyyy-MM-dd}` starts with the letter `y`, so it is refused.

```tb check_build
Dim d As Date
d = #2026-10-11 14:05:09#

Debug.Print StringFormat("{0:d}|{0:t}", d)    ' 10/11/2026|02:05 PM
Debug.Print StringFormat("{0:D}|{0:T}", d)    ' Sunday, October 11, 2026|2:05:09 PM
Debug.Print StringFormat("{0:f}|{0:g}", d)    ' Sunday, October 11, 2026 2:05 PM|10/11/2026 02:05 PM
Debug.Print StringFormat("{0:Cyyyy-MM-dd}", d)  ' 2026-10-11
```

> [!NOTE]
> The results come from **Format$**, so the decimal separator, the thousands separator and the layout of dates and times follow the Windows regional settings. The output shown for the currency and date identifiers is for an English (United States) system.

## Escape sequences

The formatter replaces these sequences in the finished string, values included. A backslash that starts none of them stays as it is.

| Sequence | Result |
|----------|--------|
| `\n` | A line break, **vbNewLine**: `Chr$(13)` followed by `Chr$(10)` |
| `\q` | A double quote, `Chr$(34)` |
| `\t` | A tab, **vbTab** |
| `\a` | `Chr$(7)` |
| `\b` | `Chr$(8)` |
| `\v` | `Chr$(13)` |
| `\f` | `Chr$(14)` |
| `\r` | `Chr$(15)` |
| `\xHH` | The character whose code is the two hexadecimal digits *HH*: `\x41` gives `A` |
| `\ooo` | The character whose code is the three octal digits *ooo*: `\101` gives `A` |
| `\\` | A backslash |

> [!NOTE]
> The package maps `\v`, `\f` and `\r` to the codes 13, 14 and 15. In C they are the vertical tab (11), the form feed (12) and the carriage return (13). Use `\n` for a line break, and `\x0B`, `\x0C` or `\x0D` for the C characters.

A format string that starts with `@` is literal: the `@` is dropped and no sequence is expanded, `\\` included. This suits a file path.

```tb check_build check_run
Debug.Print Asc(StringFormat("\v")) & " " & Asc(StringFormat("\f")) & " " & Asc(StringFormat("\r"))  ' 13 14 15
Debug.Print Len(StringFormat("a\nb"))   ' 4
Debug.Print StringFormat("\x41\101")    ' AA
Debug.Print StringFormat("a\\nb")       ' a\nb
Debug.Print StringFormat("@a\nb")       ' a\nb
```

An `\xHH` or `\ooo` sequence with digits that are not valid in its base, such as `\xzz` or `\189`, raises error 13.

## Errors

| Number | Description | Raised when |
|--------|-------------|-------------|
| `-2147212503` (`vbObjectError Or 9001`) | *The number indicating an argument to format is less than zero, or greater than or equal to the length of the args array.* | The format string has items, and the distinct indexes do not number exactly the values, or the highest index is not below that number, or no values were given. |
| `-2147212503` | *Invalid format string.* | An item has an identifier that no class accepts for the type of the value. |
| 13 | *Type mismatch* | An index is not a number, as in `{name}`, or an escape sequence has invalid digits. |
| 94 | *Invalid use of Null* | A value is **Null**. |

The first two have the source `StringHelper`. [**FormerStringFormat**](FormerEntryPoint/FormerStringFormat) raises the same numbers from the source `FormerStringFormat`, and adds `-2147212501` (`vbObjectError Or 9003`), *Invalid number argument*.

## Differences from .NET

The function follows the notation of .NET's **String.Format** and departs from it in these ways:

- Doubled braces do not escape a brace.
- The index must be a number. Names are not supported.
- Every value must be used by an item, and a value that no item uses raises an error where .NET ignores it.
- The numeric identifiers are `C D E F G P R X`. There is no `N`, and the custom numeric formats of .NET, such as `#,##0.0`, are refused.
- A precision is a count of decimal places or of digits. For `G` it is not a count of significant digits.
- `C` writes a `$` after the number whatever the regional settings, `X` writes an `&H` prefix, and `R` keeps 15 significant digits.
- Only the identifiers of the date table exist for dates, and they are case-sensitive. The custom format of a date is the `C` identifier with a **Format$** string, whose letters are VBA's.
- Escape sequences are expanded by the function itself and use the C-style letters of the table above.

## Modules

- [FormerEntryPoint](FormerEntryPoint/) -- holds FormerStringFormat, the earlier implementation of the formatter
  - [FormerStringFormat](FormerEntryPoint/FormerStringFormat) -- builds a string from a format string and a list of values, with the earlier implementation
- [PublicEntryPoints](PublicEntryPoints/) -- holds StringFormat, the main entry point of the package
  - [StringFormat](PublicEntryPoints/StringFormat) -- builds a string from a format string and a list of values
- [StringValidation](StringValidation/) -- holds the small string tests and the case helper that the formatter uses
  - [CopyCapitalisation](StringValidation/CopyCapitalisation) -- returns a string in upper case or lower case, following another string
  - [StringContains](StringValidation/StringContains) -- returns whether a string contains another, ignoring case unless asked not to
  - [StringContainsAny](StringValidation/StringContainsAny) -- returns whether a string contains at least one of several strings
  - [StringMatchesAny](StringValidation/StringMatchesAny) -- returns whether a string is equal to at least one of several values
  - [StringStartsWith](StringValidation/StringStartsWith) -- returns whether a string begins with another, taking case into account

## Classes

- [EscapeSequence](EscapeSequence/) -- describes one escape sequence and applies it to a string
  - [AsciiBase](EscapeSequence/AsciiBase) -- returns or sets the number base of an ASCII sequence
  - [Create](EscapeSequence/Create) -- creates an escape sequence, plain or ASCII
  - [EscapeString](EscapeSequence/EscapeString) -- returns or sets the text or the pattern to look for
  - [Execute](EscapeSequence/Execute) -- applies the sequence to a string
  - [IsAsciiCharacter](EscapeSequence/IsAsciiCharacter) -- returns or sets whether the sequence stands for a character code
  - [ReplacementString](EscapeSequence/ReplacementString) -- returns or sets the text that replaces a plain sequence
  - [Self](EscapeSequence/Self) -- returns the object itself
- [FormerEscapeSequence](FormerEscapeSequence/) -- holds a text and its replacement, in the form of the earlier escape sequence class
  - [Create](FormerEscapeSequence/Create) -- creates a FormerEscapeSequence
  - [EscapeString](FormerEscapeSequence/EscapeString) -- returns or sets the text to look for
  - [ReplacementString](FormerEscapeSequence/ReplacementString) -- returns or sets the replacement text
- [StringFormatSpecifier](StringFormatSpecifier/) -- describes one format item
  - [Alignment](StringFormatSpecifier/Alignment) -- returns or sets the width and the justification of a formatted value
  - [CustomSpecifier](StringFormatSpecifier/CustomSpecifier) -- returns or sets the text that follows the identifier letter
  - [identifier](StringFormatSpecifier/identifier) -- returns or sets the letter that selects the format
  - [Index](StringFormatSpecifier/IndexProperty) -- returns or sets the position of the value in the argument list
  - [Precision](StringFormatSpecifier/Precision) -- returns the number that follows the identifier letter
  - [ToString](StringFormatSpecifier/ToString) -- returns the text of the format item
- [StringHelper](StringHelper) -- the class behind StringFormat, which takes the values as an array

### Format identifier classes

Each of these implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and is predeclared.

- [CurrencySFI](CurrencySFI) -- the `C` identifier for numbers: an amount with a trailing `$`
- [DateTimeSFI](DateTimeSFI) -- the date identifiers, in a class that StringHelper does not register
- [DecimalSFI](DecimalSFI) -- the `D` identifier for numbers: whole-number digits
- [ExponentialSFI](ExponentialSFI) -- the `E` identifier for numbers: exponential notation, with ParseExponent
- [FixedPointSFI](FixedPointSFI) -- the `F` identifier for numbers: a fixed count of decimal places
- [GeneralNumericSFI](GeneralNumericSFI) -- the `G` identifier for numbers: whole-number, fixed-point or exponential notation
- [GenericDateTimeSFI](GenericDateTimeSFI) -- the date identifiers `d D f F g G s t T C`
- [HexSFI](HexSFI) -- the `X` identifier for numbers: hexadecimal digits with an `&H` prefix
- [NumericPaddingSFI](NumericPaddingSFI) -- a placeholder that never matches
- [PercentSFI](PercentSFI) -- the `P` identifier for numbers: a percentage
- [RoundTripSFI](RoundTripSFI) -- the `R` identifier for numbers: the value as a **Double** in text

## Interface

- [IStringFormatIdentifier](IStringFormatIdentifier) -- the contract of the format identifier classes

## Enumeration

- [AsciiEscapeBase](AsciiEscapeBase) -- selects the number base of an ASCII escape sequence

## Other public names

The package also exposes `HelloWorldClass`, `HelloWorldModule` and `Pootle`. They are test code that was left in the package, and they are not part of its formatting API. `HelloWorldClass.Show` and `HelloWorldModule.Show` each display a message box that says *Hello world!*, and `Pootle.SimpleTest` prints the results of four sample calls to **StringFormat** to the Immediate window. These three names have no pages.
