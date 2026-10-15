---
title: GenericDateTimeSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/GenericDateTimeSFI
has_toc: false
---

# GenericDateTimeSFI class
{: .no_toc }

<!-- test: DateTests.ShortDate_d, DateTests.LongDate_D, DateTests.LongDateShortTime_f, DateTests.LongDateLongTime_F, DateTests.ShortDateShortTime_g, DateTests.ShortDateLongTime_G, DateTests.Sortable_s, DateTests.ShortTime_t, DateTests.LongTime_T, DateTests.Custom_C_PassesTheTextToFormat, DateTests.Custom_C_Empty_IsTheGeneralDate, DateTests.Letters_AreCaseSensitiveExceptC, DateTests.TextAfterTheLetter_IsIgnoredExceptForC, DateTests.UnknownLetter_RaisesFormatError, DateTests.Generic_Class_MatchesTheTenLetters -->

Formats a **Date** for the date and time identifiers **d**, **D**, **f**, **F**, **g**, **G**, **s**, **t**, **T** and **C**.

**GenericDateTimeSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier). [**StringHelper**](StringHelper) registers it as the only date and time identifier, so every date item in a call to [**StringFormat**](PublicEntryPoints/StringFormat) uses it. A value is treated as a date when its **TypeName** is `Date`. The class is predeclared, and its two members are reached through the interface.

## Identifiers

The identifier letters of the first nine rows are case-sensitive: `d` and `D` are different formats, and `S` matches nothing. The identifier **C** matches in either case. The text after the identifier is not used by the other letters.

| Identifier | Format string passed to **Format$** | Result |
|------------|-------------------------------------|--------|
| `d` | `ddddd` | The short date. |
| `D` | `dddddd` | The long date. |
| `f` | `dddddd h:mm AM/PM` | The long date and the short time. |
| `F` | `dddddd ttttt` | The long date and the long time. |
| `g` | `ddddd hh:mm AM/PM` | The short date and the short time. |
| `G` | `ddddd ttttt` | The short date and the long time. |
| `s` | `yyyy-mm-ddThh:mm:ss` | A sortable date and time. |
| `t` | `hh:mm AM/PM` | The short time. |
| `T` | `ttttt` | The long time. |
| `C` or `c` | the text after the identifier | A custom format: the rest of the item, up to the closing brace, is passed to **Format$** as it stands. An empty custom format gives the general date format. |

The date and time layouts of the named formats follow the Windows regional settings. Any other identifier raises error `-2147212503`, *Invalid format string*.

```tb check_build
Dim d As Date
d = #2026-10-11 14:05:09#

Debug.Print StringFormat("{0:d}", d)           ' 10/11/2026
Debug.Print StringFormat("{0:D}", d)           ' Sunday, October 11, 2026
Debug.Print StringFormat("{0:f}", d)           ' Sunday, October 11, 2026 2:05 PM
Debug.Print StringFormat("{0:g}", d)           ' 10/11/2026 02:05 PM
Debug.Print StringFormat("{0:t}", d)           ' 02:05 PM
Debug.Print StringFormat("{0:T}", d)           ' 2:05:09 PM
Debug.Print StringFormat("{0:s}", d)           ' 2026-10-11T14:05:09
Debug.Print StringFormat("{0:Cyyyy-MM-dd}", d) ' 2026-10-11
Debug.Print StringFormat("{0:Cdddd}", d)       ' Sunday
```

The output shown is for an English (United States) system.

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `C` or `c`, or is one of the other nine letters in the table.
- **GetFormattedValue** returns the value formatted as the table says. With `C` it uses the specifier's [**CustomSpecifier**](StringFormatSpecifier/CustomSpecifier).

Both are implemented as private members of the interface.

<!-- /test -->

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [DateTimeSFI](DateTimeSFI) class -- an identical class that **StringHelper** does not register
- [StringFormatSpecifier](StringFormatSpecifier/) class -- holds the identifier and the custom format
- [StringFormat](PublicEntryPoints/StringFormat) function -- formats a string using the identifiers
- [Fmt package](./) -- overview, with the table of identifiers
