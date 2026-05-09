---
title: Strings Module
parent: VBA Modules
permalink: /tB/Modules/Strings/
has_toc: false
---

# Strings module

The **Strings** module groups together the runtime's text-processing primitives — measuring strings, looking inside them, building new ones from old ones, splitting and joining arrays of them, and formatting non-string values as text. Most members come in two callable forms: a `$`-suffixed form (e.g. **Left$**) that returns a **String**, and an unsuffixed form (e.g. **Left**) that returns a **Variant** (**String**) and propagates **Null** through the call. Several also have a `B` variant — **AscB**, **ChrB**, **InStrB**, **LeftB**, **LenB**, **MidB**, **RightB** — that operates on byte positions rather than character positions, for use with byte-buffer data held in a **String**.

## Length and character codes

[**Len**](Len) returns the number of characters in a string, or — when given a non-string variable — the number of bytes the variable occupies. [**Asc**](Asc) returns the character code of a string's first character; [**Chr**](Chr) is its inverse, building a single-character string from a code point. The `W` variants ([**AscW**](Asc), [**ChrW**](Chr)) work in Unicode regardless of the system code page.

```tb
Debug.Print Len("Hello")            ' 5
Debug.Print Asc("A")                ' 65
Debug.Print Chr(65)                 ' "A"
```

## Searching and comparing

[**StrComp**](StrComp) compares two strings and returns -1, 0, or 1 to report which is greater (or equal). [**InStr**](InStr) and [**InStrRev**](InStrRev) return the position of one string inside another, scanning forward from a chosen start position or backward from one. All three accept an optional *compare* argument controlling whether the comparison is case-sensitive (**vbBinaryCompare**), case-insensitive (**vbTextCompare**), or governed by the surrounding [**Option Compare**](../../Core/Option) setting (**vbUseCompareOption**). Note that **InStrRev** swaps the order of the haystack and needle arguments relative to **InStr**.

```tb
Debug.Print InStr("Hello, world", "o")           ' 5  (first match, forward)
Debug.Print InStrRev("Hello, world", "o")        ' 9  (first match, reverse)
Debug.Print StrComp("ABC", "abc", vbTextCompare) ' 0  (equal under text compare)
```

## Substrings, padding, and trimming

[**Left**](Left), [**Mid**](Mid), and [**Right**](Right) extract a substring from the start, middle, or end of a string. **Mid** doubles as an l-value via the [**Mid =**](../../Core/Mid-equals) statement, which writes characters back into a string in place. [**Space**](Space) returns a run of spaces and [**String**](String) returns a run of any chosen character — both useful for padding fixed-width output. [**LTrim**](LTrim), [**RTrim**](RTrim), and [**Trim**](Trim) strip leading, trailing, or both kinds of whitespace from a string.

```tb
Dim S As String
S = "  Hello, world  "
Debug.Print "[" & Trim(S) & "]"     ' "[Hello, world]"
Debug.Print Left(Trim(S), 5)        ' "Hello"
Debug.Print String(3, "*") & " " & Space(2) & "!"   ' "***   !"
```

## Case folding and other transformations

[**LCase**](LCase) and [**UCase**](UCase) fold a string to lowercase or uppercase. [**StrReverse**](StrReverse) reverses the character order. [**StrConv**](StrConv) bundles a wider set of conversions — case folding, proper-casing, narrow/wide and Hiragana/Katakana mapping for DBCS locales, and Unicode-to-ANSI byte-array round-tripping — selected by an additive flag argument.

```tb
Debug.Print UCase("Hello")               ' "HELLO"
Debug.Print StrReverse("Hello")          ' "olleH"
Debug.Print StrConv("hello world", vbProperCase)   ' "Hello World"
```

## Splitting, joining, replacing, filtering

[**Split**](Split) breaks a string apart at a delimiter into a zero-based array of substrings; [**Join**](Join) reverses the operation, gluing an array back together with a chosen separator between elements. [**Replace**](Replace) substitutes one substring for another across a string, optionally limited to a fixed number of replacements or starting from a given offset. [**Filter**](Filter) reduces a string array to only those elements that contain — or, with *include* set to **False**, do not contain — a chosen substring.

```tb
Dim Parts() As String
Parts = Split("red,green,blue", ",")
Debug.Print Join(Parts, " / ")              ' "red / green / blue"
Debug.Print Replace("red,green,blue", ",", "; ")  ' "red; green; blue"
```

## Formatting values as text

[**Format**](Format) is the general-purpose formatter: it takes any expression — number, date, or string — together with a named or user-defined format string, and returns the rendered text. The four named-formatter functions [**FormatCurrency**](FormatCurrency), [**FormatNumber**](FormatNumber), [**FormatPercent**](FormatPercent), and [**FormatDateTime**](FormatDateTime) wrap the most common cases with explicit parameters in place of a format string, so the call site reads as the intent rather than as a recipe. [**MonthName**](MonthName) and [**WeekdayName**](WeekdayName) return the localised name (or abbreviation) of a month or day of the week, given its numeric index.

```tb
Debug.Print Format(1234.5, "#,##0.00")         ' "1,234.50"
Debug.Print FormatCurrency(1234.5)             ' "$1,234.50"   (US locale)
Debug.Print FormatDateTime(Now, vbLongDate)    ' "Saturday, May 9, 2026"
Debug.Print MonthName(1)                       ' "January"
```

## Members

- [Asc](Asc) -- returns the character code of the first character in a string
- [Chr](Chr) -- returns the character associated with a character code
- [Filter](Filter) -- returns a subset of a string array matching (or not matching) a substring
- [Format](Format) -- formats an expression according to a format expression
- [FormatCurrency](FormatCurrency) -- formats an expression as a currency string
- [FormatDateTime](FormatDateTime) -- formats an expression as a date/time string
- [FormatNumber](FormatNumber) -- formats an expression as a numeric string
- [FormatPercent](FormatPercent) -- formats an expression as a percent string
- [InStr](InStr) -- returns the position of one string within another
- [InStrRev](InStrRev) -- returns the position of one string within another, searching from the end
- [Join](Join) -- concatenates a string array using a given delimiter
- [LCase](LCase) -- returns a string converted to lowercase
- [Left](Left) -- returns a leftmost substring of a string
- [Len](Len) -- returns the length of a string, or the storage size of a variable
- [LTrim](LTrim) -- removes leading spaces from a string
- [Mid](Mid) -- returns a substring of a string
- [MonthName](MonthName) -- returns the name of the specified month
- [Replace](Replace) -- replaces substrings within a string
- [Right](Right) -- returns a rightmost substring of a string
- [RTrim](RTrim) -- removes trailing spaces from a string
- [Space](Space) -- returns a string of spaces
- [Split](Split) -- splits a string into a string array on a delimiter
- [StrComp](StrComp) -- compares two strings
- [StrConv](StrConv) -- converts a string to a specified format
- [String](String) -- returns a string of repeating characters
- [StrReverse](StrReverse) -- reverses the order of characters of a string
- [Trim](Trim) -- removes leading and trailing spaces from a string
- [UCase](UCase) -- returns a string converted to uppercase
- [WeekdayName](WeekdayName) -- returns the name of the specified day of the week
