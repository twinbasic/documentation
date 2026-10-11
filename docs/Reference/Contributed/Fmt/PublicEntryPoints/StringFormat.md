---
title: StringFormat
parent: PublicEntryPoints
permalink: /tB/Packages/Contributed/Fmt/PublicEntryPoints/StringFormat
has_toc: false
---

# StringFormat
{: .no_toc }

Builds a string from a format string and a list of values, in the style of C#'s **String.Format**.

Syntax: **StringFormat** ( *format_string* [, *values* ] ) **As String**

*format_string*
: *required* A **String** that holds text, format items and escape sequences. A format item is written `{index[,alignment][:identifier[precision]]}` and is replaced by the value at position *index* in *values*, formatted and padded as the item says. An escape sequence such as `\n` is replaced by the character it stands for. A format string that starts with `@` is taken literally: the `@` is dropped and no escape sequence is expanded.

*values*
: *optional* Any number of values, of any type that fits a **Variant**. The first value is index `0`. This is a **ParamArray**. To pass values that are already in an array, call [**StringHelper.StringFormat**](../StringHelper) instead.

Returns the format string with every format item and escape sequence replaced.

The syntax of a format item, the identifiers and the escape sequences are in the [package overview](../). This page describes what the function does with them.

## Remarks

**Which values are needed.** The function finds the format items first. When there are any, the number of distinct indexes must equal the number of values, and the highest index must be below that number. In practice every value must be used, and the indexes must run from `0` to one less than the number of values without a gap; the same index can occur any number of times. Anything else raises error `-2147212503`. A format string with no items accepts any number of values and ignores them.

**How a value is formatted.** The type of the value decides which identifiers an item may use:

- A value for which **IsNumeric** is **True** uses the numeric identifiers `C D E F G P R X`. This includes every number type, a **Boolean** and a **String** that looks like a number.
- A value whose type is **Date** uses the date and time identifiers `d D f F g G s t T C`.
- An item with no identifier converts the value to text as an assignment to a **String** does, without any format.
- An item with an identifier that the value's type does not accept, or that no class knows, raises error `-2147212503`, *Invalid format string*. Text that is not a number cannot take `F`, and a date cannot take `X`.
- A **Null** value raises run-time error 94, *Invalid use of Null*.

**Alignment** is applied after the value is formatted. A positive alignment pads the result on the left with spaces, so the value is right-justified, and a negative alignment pads on the right. A result that is wider than the alignment is not shortened.

**Order of work.** The function replaces the items one at a time, in the order they appear, and expands the escape sequences once all items are replaced. Three things follow:

- Escape sequences in a value are expanded too, because they are expanded in the finished string. A format string that starts with `@` expands none, in the values as well as in the text.
- A value that contains the text of an item that is not replaced yet, such as `{1}`, has that text replaced as well.
- The character `Chr$(27)` protects doubled backslashes while the string is built, so an ESC character anywhere in the result becomes a backslash.

An item is found again in the text by the text that [**ToString**](../StringFormatSpecifier/ToString) rebuilds from its parts. An item written with a leading zero in its index or alignment (`{00}`, `{0,08}`) or with an alignment of zero (`{0,0}`) is found by the pattern but not by the rebuilt text, and stays in the result unchanged.

> [!NOTE]
> The function is not .NET's **String.Format**, and it departs from it in several ways. Doubled braces do not escape a brace: `{{0}}` with the value `5` gives `{5}`. An index must be a number, and an item such as `{name}` raises error 13, *Type mismatch*. A value that no item uses is an error. Custom .NET format strings such as `{0:yyyy-MM-dd}` or `{0:#,##0.0}` are not understood, and give *Invalid format string*; the identifier `C` for a date takes a **Format$** string instead. The identifier `N` does not exist. A precision is a number of decimal places, not of significant digits. See the [package overview](../#differences-from-net) for the full list.

> [!NOTE]
> The results come from **Format$**, so the decimal separator, the thousands separator and the layout of dates and times follow the Windows regional settings. The output shown on this page is for an English (United States) system.

## Example

This example inserts values into a string, in the order of the format items and out of it.

```tb check_build check_run
Dim fruit As String
fruit = "Bramleys"
Debug.Print StringFormat("I'm eating a very nice {0} {1}", fruit, 3.142)  ' I'm eating a very nice Bramleys 3.142
Debug.Print StringFormat("{1} {0} {1}", "a", "b")                          ' b a b
Debug.Print StringFormat("No items, so values are ignored.", 1, 2)         ' No items, so values are ignored.
```

This example formats numbers with the numeric identifiers.

```tb check_build check_run
Debug.Print StringFormat("{0:F2}", 12345.678)   ' 12345.68
Debug.Print StringFormat("{0:D5}", 42)          ' 00042
Debug.Print StringFormat("{0:X}", 255)          ' &HFF
Debug.Print StringFormat("{0:P1}", 0.12345)     ' 12.3%
Debug.Print StringFormat("{0:E2}", 12345.678)   ' 1.23E4
Debug.Print StringFormat("{0:G3}", 12345.678)   ' 1.235E4
Debug.Print StringFormat("{0:R}", 0.1)          ' 0.1
```

This example aligns values in columns. The brackets show the width.

```tb check_build check_run
Debug.Print StringFormat("[{0,8}][{1,-8}]", "ab", "cd")  ' [      ab][cd      ]
Debug.Print StringFormat("[{0,8:F2}]", 3.14159)          ' [    3.14]
Debug.Print StringFormat("[{0,3}]", "abcdef")            ' [abcdef]
```

This example formats money and dates. These results depend on the regional settings of the system, so the output shown is for English (United States).

```tb check_build
Dim due As Date
due = #2026-10-11 14:05:09#

Debug.Print StringFormat("The price is {0:C2} per ounce.", 17.63245)  ' The price is 17.63$ per ounce.
Debug.Print StringFormat("Due {0:d} at {0:t}", due)                    ' Due 10/11/2026 at 02:05 PM
Debug.Print StringFormat("{0:D}", due)                                 ' Sunday, October 11, 2026
Debug.Print StringFormat("{0:Cyyyy-MM-dd hh:mm}", due)                 ' 2026-10-11 14:05
```

This example uses escape sequences. `\n` is a line break and `\q` a double quote.

```tb check_build check_run
Debug.Print StringFormat("Total:\n  {0} items\n  \q{1}\q", 3, "ok")
' Output:
' Total:
'   3 items
'   "ok"
```

A backslash in a path is written as `\\`, or the whole format string is made literal with a leading `@`.

```tb check_build check_run
Debug.Print StringFormat("C:\\temp\\{0}", "file.txt")   ' C:\temp\file.txt
Debug.Print StringFormat("@C:\temp\{0}", "file.txt")    ' C:\temp\file.txt
```

This example shows the effect of the order of work on the values. The leading `@` stops the expansion of escape sequences in a value too.

```tb check_build check_run
Debug.Print StringFormat("{0} {1}", "{1}", "x")   ' x x
Debug.Print StringFormat("{0}", "a\qb")           ' a"b
Debug.Print StringFormat("@{0}", "a\qb")          ' a\qb
```

This example handles the errors that the function raises.

```tb check_build check_run
On Error Resume Next

Debug.Print StringFormat("{0} {1}", "only one")
Debug.Print Err.Number & " " & Err.Source          ' -2147212503 StringHelper
Err.Clear

Debug.Print StringFormat("{0:Z}", 5)
Debug.Print Err.Number & ": " & Err.Description    ' -2147212503: Invalid format string.
Err.Clear

Debug.Print StringFormat("{0}", Null)
Debug.Print Err.Number & ": " & Err.Description    ' 94: Invalid use of Null
Err.Clear

Debug.Print StringFormat("{name}", 1)
Debug.Print Err.Number & ": " & Err.Description    ' 13: Type mismatch
```

## See Also

- [FormerStringFormat](../FormerEntryPoint/FormerStringFormat) function -- the earlier implementation
- [StringHelper](../StringHelper) class -- the same function, taking an array
- [StringFormatSpecifier](../StringFormatSpecifier/) class -- describes one format item
- [EscapeSequence](../EscapeSequence/) class -- one escape sequence
- [IStringFormatIdentifier](../IStringFormatIdentifier) interface -- the contract of the format identifier classes
- [PublicEntryPoints](./) module
- [Fmt package](../) -- overview, with the syntax of format items
