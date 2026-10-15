---
title: cToolsStr
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cToolsStr
has_toc: false
---

# cToolsStr class
{: .no_toc }

String functions: trimming and testing, searching and cutting out a part, the conversions to `%XX` and `\uXXXX` escapes, the splitting of text into lines, conversion between strings and bytes, and random text and identifiers. Twenty-eight functions, in six groups. Most use nothing but the language; [**GetGUID**](#getguid) uses the Windows object `Scriptlet.TypeLib`.

The class has no fields. The package keeps one instance of it, named **ToolsStr**, in the module [**Tools**](Tools), so a program writes `ToolsStr.TrimEx(...)` without a `New`, and the syntax lines below use that name. In the package's earlier versions **ToolsStr** was a module, and the calls are the same. A program that wants an object of its own writes `Dim S As New cToolsStr`.

```tb check_build check_run
Debug.Print ToolsStr.TrimEx(vbTab & "  a b " & vbCrLf)
Debug.Print ToolsStr.SubStr("key = value ;", "=", ";")
Debug.Print ToolsStr.InsertSpan("abcdefg", "-", 3)
Debug.Print ToolsStr.UnicodeEncode("caf" & ChrW(233))
' Output:
' a b
' value
' abc-def-g
' caf\u00E9
```

<!-- test: StrTests.TrimEx_TextOver32767Characters_IsTrimmed, StrTests.InsertSpan_TextOver32767Characters_IsSplit, StrTests.PercentEncode_TextOver32767Characters_IsEncoded, StrTests.PercentDecode_TextOver32767Characters_IsDecoded, StrTests.UnicodeEncode_TextOver32767Characters_IsEncoded, StrTests.UnicodeDecode_TextOver32767Characters_IsDecoded -->
> [!NOTE] 1.0.0.29
> A few functions keep a position or a count in an **Integer** variable: **TrimEx** and the functions built on it, **InsertSpan**, **PercentEncode**, **PercentDecode**, **UnicodeEncode** and **UnicodeDecode**. They raise error 6, *Overflow*, for a string of more than 32,767 characters.

Most **String** parameters are passed by reference, as the language does by default, and the functions do not change them. The two exceptions are [**IsEmptyEx**](#isemptyex), which trims the variable that is passed to it, and [**MidEx**](#midex), which sets its *starindex* argument.

* TOC
{:toc}

## Testing and trimming

### IsEmptyEx
{: .no_toc }

Tests whether a string holds nothing but white space.

Syntax: **ToolsStr.IsEmptyEx** ( *Text* ) **As Boolean**

*Text*
: *required* A **String**.

<!-- test: StrTests.IsEmptyEx_WhiteSpaceOnly_IsTrue -->
Returns **True** when *Text* has no characters left after [**TrimEx**](#trimex) removes the spaces, tabs, line breaks and other control characters at both ends.
<!-- /test -->

<!-- test: StrTests.IsEmptyEx_DoesNotChangeTheVariableItIsGiven -->
> [!WARNING] 1.0.0.29
> The parameter is passed by reference and the function assigns the trimmed text to it, so a variable that is passed is changed: after `IsEmptyEx(t)`, **t** holds the trimmed text. Pass an expression, such as `(t)`, to keep the variable as it is.

```tb check_build check_run
Dim t As String
t = "  x  "
Debug.Print ToolsStr.IsEmptyEx(t)
Debug.Print "[" & t & "]"
Debug.Print ToolsStr.IsEmptyEx(vbTab & " ")
' Output:
' False
' [x]
' True
```

### IsString
{: .no_toc }

Tests whether a value is a string.

Syntax: **ToolsStr.IsString** ( *var* ) **As Boolean**

*var*
: *required* A **Variant**.

<!-- test: StrTests.IsString_TellsStringsFromNumbers -->
Returns **True** when `VarType(var)` is **vbString**. The text `"12"` is a string, and the number 12 is not.
<!-- /test -->

### LeftEx
{: .no_toc }

Returns the first characters of a string, after removing the spaces at its ends.

Syntax: **ToolsStr.LeftEx** ( *Text* **,** *Length* ) **As String**

*Text*
: *required* A **Variant**. A value that is not a string is converted to one.

*Length*
: *required* A **Long**, the number of characters.

<!-- test: StrTests.LeftEx_RightEx_TrimOnlySpaces -->
The spaces at both ends of *Text* are removed with **Trim** first. Tabs and line breaks stay. [**cJson.Decode**](cJson#decode) uses the function to see whether a text begins with `[`.
<!-- /test -->

### RightEx
{: .no_toc }

Returns the last characters of a string, after removing the spaces at its ends.

Syntax: **ToolsStr.RightEx** ( *Text* **,** *Length* ) **As String**

*Text*
: *required* A **Variant**. A value that is not a string is converted to one.

*Length*
: *required* A **Long**, the number of characters.

<!-- test: StrTests.LeftEx_RightEx_TrimOnlySpaces -->
The spaces at both ends of *Text* are removed with **Trim** first. Tabs and line breaks stay.
<!-- /test -->

### TrimEx
{: .no_toc }

Removes white space and control characters from both ends of a string.

Syntax: **ToolsStr.TrimEx** ( *Text* ) **As String**

*Text*
: *required* A **String**. It is passed by reference and is not changed.

<!-- test: StrTests.TrimEx_RemovesWhiteSpaceAndControlCharactersAtBothEnds -->
Removes the characters space, tab, carriage return, line feed and every character with a code from 0 to 31, from the start and from the end of *Text*. Other characters that look like spaces, such as the non-breaking space, stay.
<!-- /test -->

## Searching and cutting

### GetFirstChar
{: .no_toc }

Returns the first visible character of a string.

Syntax: **ToolsStr.GetFirstChar** ( *Txt* [ **,** *Length* ] ) **As String**

*Txt*
: *required* A **String**.

*Length*
: *optional* A **Long**, 1 by default.

<!-- test: StrTests.GetFirstChar_SkipsSpacesAndReturnsTheCharacters, StrTests.GetFirstChar_NoVisibleCharacter_Raises5 -->
The function skips every character whose code is not from 33 to 126, so spaces, control characters and non-ASCII characters are skipped, and finds the first one that is. With a *Length* of 1 the result is that character. With a larger *Length* the result is that many characters from there, taken as they stand. If *Txt* holds no character with a code from 33 to 126, the function raises error 5.
<!-- /test -->

```tb check_build check_run
Debug.Print ToolsStr.GetFirstChar("  - abc")
Debug.Print ToolsStr.GetFirstChar("  - abc", 3)
' Output:
' -
' - a
```

### GetLastChar
{: .no_toc }

Intended to return the last visible character of a string.

Syntax: **ToolsStr.GetLastChar** ( *Txt* [ **,** *Length* ] ) **As String**

*Txt*
: *required* A **String**.

*Length*
: *optional* A **Long**, 1 by default.

<!-- test: StrTests.GetLastChar_ReturnsTheLastVisibleCharacter -->
> [!WARNING] 1.0.0.29
> The code of this function is a copy of the code of [**GetFirstChar**](#getfirstchar): it searches from the start of the text, and returns the first visible character, not the last. `GetLastChar("abc")` returns `a`.

```tb check_build check_run
Debug.Print ToolsStr.GetLastChar("abc")
' Output:
' a
```

### HasStr
{: .no_toc }

Finds a string inside another, with the arguments in the order *what*, *where*.

Syntax: **ToolsStr.HasStr** ( *FindStr* **,** *FullStr* [ **,** *StartPos* ] [ **,** *CompType* ] ) **As Long**

*FindStr*
: *required* A **String**, the text to find.

*FullStr*
: *required* A **String**, the text to search.

*StartPos*
: *optional* A **Long**, the position at which the search starts, 1 by default.

*CompType*
: *optional* A **VbCompareMethod**, **vbTextCompare** by default.

<!-- test: StrTests.HasStr_FindsTheTextIgnoringCaseByDefault -->
Returns the position of the first match, counted from 1, or 0 when there is none: the result of [**InStr**](../../../Modules/Strings/InStr) with the arguments in a different order. Unlike **InStr**, the search ignores letter case unless *CompType* is **vbBinaryCompare**.
<!-- /test -->

```tb check_build check_run
Debug.Print ToolsStr.HasStr("lo", "Hello")
Debug.Print ToolsStr.HasStr("LO", "Hello")
Debug.Print ToolsStr.HasStr("LO", "Hello", 1, vbBinaryCompare)
' Output:
' 4
' 4
' 0
```

### MidEx
{: .no_toc }

Returns the text between two markers, without its first and last character.

Syntax: **ToolsStr.MidEx** ( *FullStr* **,** *Lstr* **,** *Rstr* [ **,** *starindex* ] ) **As String**

*FullStr*
: *required* A **String**, the text to search.

*Lstr*
: *required* A **String**, the marker at the start.

*Rstr*
: *required* A **String**, the marker at the end.

*starindex*
: *optional* A **Long**, passed by reference. When it is not 0, the search for *Lstr* starts at that position and ignores letter case; a search from the start of *FullStr* is case-sensitive. When a match is found, the variable is set to the position after *Rstr*, so a loop that passes the same variable finds one match after another.

<!-- test: StrTests.MidEx_ReturnsTheTextBetweenTheMarkersWithoutItsEnds, StrTests.MidEx_FewerThanTwoCharactersBetween_Raises5 -->
The function finds the first *Lstr*, then the first *Rstr* after it. It returns an empty string if either is missing. Of the text between them, it removes the first and the last character, so the function suits a value that is enclosed in quotation marks: `MidEx("id=[""abc""]", "[", "]")` returns `abc`. If the text between has fewer than two characters, the call raises error 5.
<!-- /test -->

```tb check_build check_run
Dim Start As Long
Debug.Print ToolsStr.MidEx("id=[""abc""]", "[", "]")
Debug.Print "[" & ToolsStr.MidEx("abc", "[", "]") & "]"

Debug.Print ToolsStr.MidEx("[""a""][""bc""]", "[", "]", Start) & " " & Start
Debug.Print ToolsStr.MidEx("[""a""][""bc""]", "[", "]", Start) & " " & Start

On Error Resume Next
Debug.Print ToolsStr.MidEx("x[]y", "[", "]")
Debug.Print Err.Number
' Output:
' abc
' []
' a 6
' bc 12
' 5
```

### SliceString
{: .no_toc }

Returns a part of a string, counted from 0.

Syntax: **ToolsStr.SliceString** ( *Arr* **,** *StartPos* [ **,** *EndPos* ] ) **As String**

*Arr*
: *required* A **String**. The parameter is called *Arr*.

*StartPos*
: *required* A **Long**, the position of the first character, counting from 0.

*EndPos*
: *optional* A **Long**, the position of the last character, which is included. The default of -1 means the end of the string.

<!-- test: StrTests.SliceString_CountsFromZeroAndIncludesTheEnd -->
```tb check_build check_run
Debug.Print ToolsStr.SliceString("Hello World", 0, 4)
Debug.Print ToolsStr.SliceString("Hello World", 6)
' Output:
' Hello
' World
```
<!-- /test -->

### SubStr
{: .no_toc }

Returns the text between two markers, with the spaces at its ends removed.

Syntax: **ToolsStr.SubStr** ( *Txt* **,** *txtF* [ **,** *txtE* ] [ **,** *RetInt* ] ) **As String**

*Txt*
: *required* A **String**, the text to search.

*txtF*
: *required* A **String**, the marker at the start. The search is case-sensitive.

*txtE*
: *optional* A **String**, the marker at the end. If it is left out or empty, the text runs to the end of *Txt*.

*RetInt*
: *optional* A **Boolean**, **False** by default. It chooses what the function returns when nothing is found.

<!-- test: StrTests.SubStr_ReturnsTheTrimmedTextBetweenTheMarkers -->
The function finds the first *txtF*, then the first *txtE* after it, and returns what is between them, with **Trim** applied. When *txtF* is not found, when *txtE* is not found, or when the text between is empty, it returns an empty string, or the text `0` if *RetInt* is **True**.
<!-- /test -->

```tb check_build check_run
Debug.Print ToolsStr.SubStr("key = value ;", "=", ";")
Debug.Print ToolsStr.SubStr("key = value", "=")
Debug.Print "[" & ToolsStr.SubStr("abc", "x") & "]"
Debug.Print ToolsStr.SubStr("abc", "x", , True)
' Output:
' value
' value
' []
' 0
```

## Changing text

### InsertSpan
{: .no_toc }

Inserts a separator after every group of characters.

Syntax: **ToolsStr.InsertSpan** ( *inputStr* **,** *Span* **,** *SetpNum* [ **,** *HeadFoot* ] ) **As String**

*inputStr*
: *required* A **String**. It is passed by reference and is not changed.

*Span*
: *required* A **String**, the separator.

*SetpNum*
: *required* A **Long**, the number of characters in each group. It has to be at least 1 and at most 32,767.

*HeadFoot*
: *optional* A **Boolean**, **False** by default. When it is **True**, *Span* is also placed at the start and at the end of the result.

<!-- test: StrTests.InsertSpan_PutsTheSeparatorBetweenGroups -->
The separator is placed between groups, and not after the last one: `InsertSpan("abcdefg", "-", 3)` returns `abc-def-g`, and with *HeadFoot* set it returns `-abc-def-g-`.
<!-- /test -->

### JoinStr
{: .no_toc }

Joins strings with a separator.

Syntax: **ToolsStr.JoinStr** ( *Span* **,** *Strings* )

*Span*
: *required* A **String**, the separator. It comes first, before the strings.

*Strings*
: *required* Any number of values, in a **ParamArray**.

<!-- test: StrTests.JoinStr_JoinsWithTheSeparator -->
Returns the values joined with *Span* between them, as **Join** does.
<!-- /test -->

```tb check_build check_run
Debug.Print ToolsStr.JoinStr("-", "a", "b", "c")
' Output:
' a-b-c
```

### PercentDecode
{: .no_toc }

Replaces each `%XX` in a string with the character that has that code.

Syntax: **ToolsStr.PercentDecode** ( *encodedStr* ) **As String**

*encodedStr*
: *required* A **String**. It is passed by reference and is not changed.

<!-- test: StrTests.PercentDecode_ReadsHexPairsAsAnsiCharacters -->
Each `%` and the two characters after it are read as a hexadecimal number, and replaced by **Chr** of the number. The characters are those of the ANSI code page, so the bytes of a UTF-8 text such as `%C3%A9` become two characters, not one. A `%` that is not followed by two hexadecimal digits raises error 13.
<!-- /test -->

### PercentEncode
{: .no_toc }

Replaces each digit in a string with `%` and its code.

Syntax: **ToolsStr.PercentEncode** ( *inputStr* ) **As String**

*inputStr*
: *required* A **String**. It is passed by reference and is not changed.

<!-- test: StrTests.PercentEncode_SpaceSlashAndPercent_AreEncoded -->
> [!WARNING] 1.0.0.29
> The function does not follow the rules of percent-encoding for web addresses. A space, a slash, a percent sign or a non-ASCII letter is not encoded: the function replaces the digits `0` to `9` only.

<!-- test: StrTests.PercentEncode_EncodesTheDigits -->
The digits `0` to `9` are each replaced with `%` and the two hexadecimal digits of their code, and every other character is left as it is: `PercentEncode("A1b2")` returns `A%31b%32`. [**PercentDecode**](#percentdecode) turns the result back.

```tb check_build check_run
Debug.Print ToolsStr.PercentEncode("A1b2")
Debug.Print ToolsStr.PercentDecode("A%31b%32")
' Output:
' A%31b%32
' A1b2
```
<!-- /test -->

### UniVbCrLf
{: .no_toc }

Changes every kind of line break in a string to carriage return and line feed.

Syntax: **ToolsStr.UniVbCrLf** ( *Text* ) **As String**

*Text*
: *required* A **String**. It is passed by reference and is not changed.

<!-- test: StrTests.UniVbCrLf_CrAndCrLf_BecomeCrLf -->
An empty string is returned as it is. A string that has only carriage returns, or only the pairs carriage return and line feed, is converted as expected.
<!-- /test -->

<!-- test: StrTests.UniVbCrLf_LoneLineFeed_BecomesOneCrLf, StrTests.UniVbCrLf_ThreeAtSigns_AreKept -->
> [!WARNING] 1.0.0.29
> A line feed that is not part of a pair becomes a carriage return and **two** line feeds. The function turns each line feed into a pair, and then turns the carriage return of that pair into a pair again. `"a" & vbLf & "b"` comes out as `"a" & vbCr & vbLf & vbLf & "b"`, five characters.
>
> The function also uses the three characters `@@@` as a marker while it works, so a text that holds `@@@` has it replaced by a line break.

```tb check_build check_run
Dim s As String
Debug.Print Replace(ToolsStr.UniVbCrLf("a" & vbCr & "b"), vbCrLf, "|")
Debug.Print Replace(ToolsStr.UniVbCrLf("a" & vbCrLf & "b"), vbCrLf, "|")

s = ToolsStr.UniVbCrLf("a" & vbLf & "b")
Debug.Print Len(s) & " " & Replace(Replace(s, vbCr, "<CR>"), vbLf, "<LF>")
Debug.Print Replace(ToolsStr.UniVbCrLf("x@@@y"), vbCrLf, "|")
' Output:
' a|b
' a|b
' 5 a<CR><LF><LF>b
' x|y
```

### UnicodeDecode
{: .no_toc }

Replaces each `\uXXXX` in a string with the character it names.

Syntax: **ToolsStr.UnicodeDecode** ( *Text* [ **,** *PreFix* ] ) **As String**

*Text*
: *required* A **String**. It is passed by reference and is not changed.

*PreFix*
: *optional* A **String**, `\u` by default. It has to be two characters long: the function compares two characters of the text with it and then skips six, whatever its length.

<!-- test: StrTests.UnicodeDecode_ReplacesEscapesWithCharacters -->
The four characters after each prefix are read as a hexadecimal number, and the character with that code replaces the six. The letters in the number may be of either case. Four characters that are not hexadecimal digits raise error 13.
<!-- /test -->

```tb check_build check_run
Debug.Print ToolsStr.UnicodeDecode("\u0041\u0042")
Debug.Print AscW(Right$(ToolsStr.UnicodeDecode("caf\u00E9"), 1))
' Output:
' AB
' 233
```

<!-- test: StrTests.UnicodeDecode_EscapedBackslashBeforeU_IsNotAnEscape -->
> [!NOTE] 1.0.0.29
> The function does not know about backslashes before the prefix, so a backslash that is escaped and followed by the letter `u` and four hexadecimal digits is read as an escape of the character, from the second backslash. This is the cause of the error that [**cJson.Encode**](cJson#encode) raises for a text such as `C:\users` when *FromUnicode* is **True**.

### UnicodeEncode
{: .no_toc }

Replaces each character that is not in the ASCII range with `\uXXXX`.

Syntax: **ToolsStr.UnicodeEncode** ( *inputString* [ **,** *PreFix* ] ) **As String**

*inputString*
: *required* A **String**.

*PreFix*
: *optional* A **String**, `\u` by default.

<!-- test: StrTests.UnicodeEncode_EscapesNonAsciiCharacters -->
Characters with a code from 0 to 127 stay as they are, the control characters included. Every other character becomes *PreFix* and the four hexadecimal digits of its code, with letters in upper case. A character that is made of two UTF-16 units, such as an emoji, becomes two such groups.
<!-- /test -->

## Lines

### JoinLinesFromCollection
{: .no_toc }

Joins the items of a collection into one text, one item to a line.

Syntax: **ToolsStr.JoinLinesFromCollection** ( *Coll* ) **As String**

*Coll*
: *required* A **Collection**, passed by reference and not changed. The items are taken in order from 1 and converted to strings.

<!-- test: StrTests.JoinLinesFromCollection_JoinsWithCrLf -->
Returns the items with a carriage return and line feed (**vbCrLf**) between them, and none after the last. A collection with no items gives an empty string.
<!-- /test -->

```tb check_build check_run
Dim Lines As New Collection
Lines.Add "one"
Lines.Add "two"
Lines.Add 3
Debug.Print Replace(ToolsStr.JoinLinesFromCollection(Lines), vbCrLf, "|")
Debug.Print "[" & ToolsStr.JoinLinesFromCollection(New Collection) & "]"
' Output:
' one|two|3
' []
```

### SplitLinesToCollection
{: .no_toc }

Splits a text into lines.

Syntax: **ToolsStr.SplitLinesToCollection** ( *Text* ) **As Collection**

*Text*
: *required* A **String**.

<!-- test: StrTests.SplitLinesToCollection_SplitsAtCrLf -->
Returns a new **Collection** that holds one string for each line, numbered from 1. Lines end at a carriage return and line feed (**vbCrLf**) only. A line feed or a carriage return alone does not end a line: the lines of a text from another system stay in one item. An empty text gives an empty collection. A text that ends with **vbCrLf** gives an empty last item.
<!-- /test -->

<!-- test: StrTests.SplitLinesToCollection_LastLineOfOneCharacter_IsKept -->
> [!WARNING] 1.0.0.29
> The loop stops when its position is equal to the length of the text, which is the position of the last character. When the last line has exactly one character, the loop stops before it and the line is lost: `"a" & vbCrLf & "b"` gives one item, `a`, and the text `"a"` gives none. A last line of two or more characters is kept.

```tb check_build check_run
Dim Lines As Collection
Set Lines = ToolsStr.SplitLinesToCollection("one" & vbCrLf & "two" & vbCrLf & "three")
Debug.Print Lines.Count & " " & Lines(1) & " " & Lines(3)

Set Lines = ToolsStr.SplitLinesToCollection("a" & vbCrLf & "b")
Debug.Print Lines.Count
Set Lines = ToolsStr.SplitLinesToCollection("a" & vbCrLf & "bc" & vbCrLf)
Debug.Print Lines.Count & " [" & Lines(3) & "]"
' Output:
' 3 one three
' 1
' 3 []
```

## Bytes

### LenBytes
{: .no_toc }

Returns the number of elements of a byte array.

Syntax: **ToolsStr.LenBytes** ( *inputArray* ) **As Long**

*inputArray*
: *required* A **Byte** array.

<!-- test: StrTests.LenBytes_CountsTheElements -->
Returns the upper bound less the lower bound, plus 1. The comment in the source says *Unicode*, but the function counts the elements, whatever they hold.
<!-- /test -->

### ToBytes
{: .no_toc }

Converts a string to a byte array in the ANSI code page.

Syntax: **ToolsStr.ToBytes** ( *inputString* ) **As Byte()**

*inputString*
: *required* A **String**. It is passed by reference and is not changed.

<!-- test: StrTests.ToBytes_ToString_ConvertWithTheAnsiCodePage -->
Returns the bytes of the string in the ANSI code page of the system, with **StrConv** and **vbFromUnicode**, from 0. The comment in the source says *Unicode*; the result is not UTF-16 and not UTF-8. A character that the code page does not have is not kept as written. For UTF-8, use [**ToolsUtf8.Encode**](ToolsUtf8#encode).
<!-- /test -->

### ToHex
{: .no_toc }

Writes the bytes of an array as hexadecimal digits.

Syntax: **ToolsStr.ToHex** ( *inputArray* ) **As String**

*inputArray*
: *required* A **Byte** array whose lower bound is 0.

Returns the **Hex** of each element, joined with nothing between them.

<!-- test: StrTests.ToHex_WritesTwoDigitsForEachByte -->
> [!WARNING] 1.0.0.29
> A byte below 16 gives one digit, and not two: `ToHex` of the bytes 10 and 11 is `AB`, the same as the byte 171 gives. The result cannot always be split back into bytes.

```tb check_build check_run
Debug.Print ToolsStr.ToHex(ToolsStr.ToBytes("AB"))
Debug.Print ToolsStr.ToHex(ToolsStr.ToBytes(Chr$(10)))
' Output:
' 4142
' A
```

### ToString
{: .no_toc }

Converts a byte array in the ANSI code page to a string.

Syntax: **ToolsStr.ToString** ( *inputArray* ) **As String**

*inputArray*
: *required* A **Byte** array. It is passed by reference and is not changed.

Returns the string, with **StrConv** and **vbUnicode**: each byte is read as a character of the ANSI code page. It is the reverse of [**ToBytes**](#tobytes). For UTF-8, use [**ToolsUtf8.Decode**](ToolsUtf8#decode).

## Random text and identifiers

### GetGUID
{: .no_toc }

Returns a new GUID as text.

Syntax: **ToolsStr.GetGUID** ( [ *isFull* ] ) **As String**

*isFull*
: *optional* A **Boolean**, **False** by default. When it is **True**, the GUID is returned with the braces around it.

<!-- test: StrTests.GetGUID_HasThe36CharacterForm -->
The GUID is made by the Windows scripting object `Scriptlet.TypeLib`, which the function creates by name on each call. The result has the form `9A0F3C5E-1B2D-4C6E-8F70-123456789ABC`, 36 characters, or 38 with the braces, with the letters in upper case.
<!-- /test -->

```tb check_build check_run
Dim g As String
Dim h As String
g = ToolsStr.GetGUID()
h = ToolsStr.GetGUID(True)
Debug.Print Len(g) & " " & Len(h)
Debug.Print Left$(h, 1) & Right$(h, 1)
Debug.Print g = UCase$(g)
' Output:
' 36 38
' {}
' True
```

### GetNewIds
{: .no_toc }

Unfinished. Returns a fixed text.

Syntax: **ToolsStr.GetNewIds** ( [ *Bath* ] ) **As String**

*Bath*
: *optional* A **Long**. It is not used.

The function returns the Chinese words for *under development*, followed by three periods, and no identifier.

### GetRandByte
{: .no_toc }

Returns ten random bytes.

Syntax: **ToolsStr.GetRandByte** ( ) **As Byte()**

<!-- test: StrTests.GetRandByte_ReturnsTenBytes -->
Returns a **Byte** array from 0 to 9. The function takes no argument, so the number of bytes is always ten. It calls **Randomize** and fills the array with `Int(Rnd * 256)`. The bytes are not suitable for keys, passwords or tokens.
<!-- /test -->

```tb check_build check_run
Dim Bytes() As Byte
Bytes = ToolsStr.GetRandByte()
Debug.Print UBound(Bytes)
' Output:
' 9
```

### GetRandStr
{: .no_toc }

Returns a string of random characters.

Syntax: **ToolsStr.GetRandStr** ( [ *Lens* ] [ **,** *Zuhe* ] ) **As String**

*Lens*
: *optional* An **Integer**, the number of characters, 32 by default. A value below 1 is replaced by 8.

<!-- test: StrTests.GetRandStr_UsesTheNamedGroupsOfCharacters -->
*Zuhe*
: *optional* A **String** that says which characters can be used, `1aA` by default. It is a set of letters that stand for groups of characters: `1` for the digits, `a` for the lower-case letters `a` to `z`, `A` for the upper-case letters, and `@` for the 32 punctuation characters of ASCII. An empty string stands for all four groups. Other characters in the string are ignored; if no group is named, the result is an empty string. The name means *combination*.

Each character is chosen with [**ToolsMath.GetRandRange**](ToolsMath#getrandrange), so the strings are not suitable for passwords, keys or tokens.
<!-- /test -->

```tb check_build check_run
Dim s As String
s = ToolsStr.GetRandStr(10, "1")
Debug.Print Len(s)
Debug.Print s Like "##########"
Debug.Print Len(ToolsStr.GetRandStr())
Debug.Print Len(ToolsStr.GetRandStr(0))
' Output:
' 10
' True
' 32
' 8
```

## See Also

- [Tools](Tools) module -- the shared instance **ToolsStr**
- [cToolsStream](cToolsStream) class -- reads and writes whole files
- [ToolsArray](ToolsArray) module -- searching and cutting byte arrays
- [ToolsUtf8](ToolsUtf8) module -- UTF-8 conversion of strings and bytes
- [ToolsMath](ToolsMath) module -- the random numbers behind **GetRandStr**
- [TBMANLIB](.) package -- overview
