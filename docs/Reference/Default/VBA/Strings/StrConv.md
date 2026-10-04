---
title: StrConv
parent: Strings Module
permalink: /tB/Modules/Strings/StrConv
vba_attribution: true
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
: *optional* The LocaleID, if different than the system LocaleID. (The system LocaleID is the default.) An *LCID* that is not a valid locale identifier raises error 5.

The *conversion* argument settings are:

| Constant          | Value | Description                                                                                |
|-------------------|-------|--------------------------------------------------------------------------------------------|
| **vbUpperCase**   | 1     | Converts the string to uppercase characters.                                               |
| **vbLowerCase**   | 2     | Converts the string to lowercase characters.                                               |
| **vbProperCase**  | 3     | Converts the first letter of every word in a string to uppercase and the other letters to lowercase. |
| **vbWide**        | 4     | Converts narrow (single-byte) characters in a string to wide (double-byte) characters.     |
| **vbNarrow**      | 8     | Converts wide (double-byte) characters in a string to narrow (single-byte) characters.     |
| **vbKatakana**    | 16    | Converts Hiragana characters in a string to Katakana characters.                           |
| **vbHiragana**    | 32    | Converts Katakana characters in a string to Hiragana characters.                           |
| **vbUnicode**     | 64    | Converts the string to Unicode using the default code page of the system.                  |
| **vbFromUnicode** | 128   | Converts the string from Unicode to the default code page of the system.                   |
| **vbUTF8**        | 256   | Converts the string to UTF-8. Assign the result to a **Byte** array to get the UTF-8 bytes. |
| **vbFromUTF8**    | 512   | Converts UTF-8 text held in a **Byte** array to a string. An invalid byte sequence becomes the replacement character U+FFFD. |

> [!NOTE]
> These constants are specified by twinBASIC. As a result, they may be used anywhere in code in place of the actual values. Most can be combined, for example, **vbUpperCase + vbWide**, except when they are mutually exclusive, for example, **vbUnicode + vbFromUnicode**. The constants **vbWide**, **vbNarrow**, **vbKatakana**, and **vbHiragana** cause run-time errors when used in locales where they don't apply.

The following are valid word separators for proper casing: **Null** (`Chr$(0)`), horizontal tab (`Chr$(9)`), linefeed (`Chr$(10)`), vertical tab (`Chr$(11)`), form feed (`Chr$(12)`), carriage return (`Chr$(13)`), space (SBCS) (`Chr$(32)`). The actual value for a space varies by country/region for DBCS. No other character, such as a hyphen or an apostrophe, starts a word: `"mc-donald"` becomes `"Mc-donald"`.

> [!WARNING]
> BETA 995 has a defect in **vbProperCase**: it leaves a word in lowercase when the word follows an even number of consecutive separators, such as two spaces or the carriage return and linefeed of **vbCrLf**. `StrConv("a  b", vbProperCase)` returns `"A  b"`, where it should return `"A  B"`. A word after one separator, or after three, is capitalised. BETA 983 capitalised every word, as Visual Basic 6 does.

If *string* is **Null**, **StrConv** returns **Null**.

The case conversions map each character by the Windows rules for the character itself, and do not apply the language-specific rules of *LCID*. With an *LCID* of 1055 (Turkish), `"i"` becomes `"I"`, not the dotted capital I. The case conversions also work on characters outside the system code page, such as Greek and Cyrillic letters on a system with a Western European code page.

**vbUnicode** and **vbFromUnicode** use the default code page of the system, whatever *LCID* is given. **vbWide**, **vbNarrow**, **vbKatakana** and **vbHiragana** depend on the system locale as well: on a system whose locale is not East Asian they raise error 5 even when *LCID* names a Japanese locale. Visual Basic 6 applies the code page and locale of *LCID* to all six.

When converting from a **Byte** array in ANSI format to a string, use the **StrConv** function. When converting from such an array in Unicode format, use an assignment statement.

### Example

This example uses the **StrConv** function to convert a Unicode string to an ANSI string.

```tb check_build
Dim i As Long
Dim x() As Byte
x = StrConv("ABCDEFG", vbFromUnicode)    ' Convert string.
For i = 0 To UBound(x)
    Debug.Print x(i)
Next
```

This example shows the case conversions, an *LCID*, a **Null** argument and an invalid *LCID*.

```tb check_run
Debug.Print StrConv("hello wORLD", vbProperCase)       ' Hello World
Debug.Print StrConv("o'neil mc-donald", vbProperCase)  ' O'neil Mc-donald
Debug.Print StrConv("i", vbUpperCase, 1055)            ' I
Debug.Print AscW(StrConv(ChrW(&HE9), vbUpperCase))     ' 201
Debug.Print IsNull(StrConv(Null, vbUpperCase))         ' True
On Error Resume Next
Debug.Print StrConv("abc", vbUpperCase, 99999)
Debug.Print Err.Number                                 ' 5
```

### See Also

- [Asc](Asc), [Chr](Chr), [LCase](LCase), [UCase](UCase) functions
