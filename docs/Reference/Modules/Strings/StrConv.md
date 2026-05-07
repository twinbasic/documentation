---
title: StrConv
parent: Strings Module
permalink: /tB/Modules/Strings/StrConv
---
# StrConv
{: .no_toc }

Returns a **String** converted as specified.

Syntax: **StrConv(** *string*, *conversion* [ **,** *LCID* ] **)**

*string*
: *required* String expression to be converted.

*conversion*
: *required* **Integer**. The sum of values specifying the type of conversion to perform.

*LCID*
: *optional* The LocaleID, if different than the system LocaleID. (The system LocaleID is the default.)

The *conversion* argument settings are:

| Constant          | Value | Description                                                                                |
|-------------------|-------|--------------------------------------------------------------------------------------------|
| **vbUpperCase**   | 1     | Converts the string to uppercase characters.                                               |
| **vbLowerCase**   | 2     | Converts the string to lowercase characters.                                               |
| **vbProperCase**  | 3     | Converts the first letter of every word in a string to uppercase.                          |
| **vbWide**        | 4     | Converts narrow (single-byte) characters in a string to wide (double-byte) characters.     |
| **vbNarrow**      | 8     | Converts wide (double-byte) characters in a string to narrow (single-byte) characters.     |
| **vbKatakana**    | 16    | Converts Hiragana characters in a string to Katakana characters.                           |
| **vbHiragana**    | 32    | Converts Katakana characters in a string to Hiragana characters.                           |
| **vbUnicode**     | 64    | Converts the string to Unicode using the default code page of the system.                  |
| **vbFromUnicode** | 128   | Converts the string from Unicode to the default code page of the system.                   |

> [!NOTE]
> These constants are specified by twinBASIC. As a result, they may be used anywhere in your code in place of the actual values. Most can be combined, for example, **vbUpperCase + vbWide**, except when they are mutually exclusive, for example, **vbUnicode + vbFromUnicode**. The constants **vbWide**, **vbNarrow**, **vbKatakana**, and **vbHiragana** cause run-time errors when used in locales where they don't apply.

The following are valid word separators for proper casing: **Null** (`Chr$(0)`), horizontal tab (`Chr$(9)`), linefeed (`Chr$(10)`), vertical tab (`Chr$(11)`), form feed (`Chr$(12)`), carriage return (`Chr$(13)`), space (SBCS) (`Chr$(32)`). The actual value for a space varies by country/region for DBCS.

When converting from a **Byte** array in ANSI format to a string, use the **StrConv** function. When converting from such an array in Unicode format, use an assignment statement.

### Example

This example uses the **StrConv** function to convert a Unicode string to an ANSI string.

```tb
Dim i As Long
Dim x() As Byte
x = StrConv("ABCDEFG", vbFromUnicode)    ' Convert string.
For i = 0 To UBound(x)
    Debug.Print x(i)
Next
```

### See Also

- [Asc](Asc), [Chr](Chr), [LCase](LCase), [UCase](UCase) functions

{% include VBA-Attribution.md %}
