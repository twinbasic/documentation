---
title: Split
parent: Strings Module
permalink: /tB/Modules/Strings/Split
---
# Split
{: .no_toc }

Returns a zero-based, one-dimensional array containing a specified number of substrings.

Syntax: **Split(** *expression* [ **,** *delimiter* [ **,** *limit* [ **,** *compare* ] ] ] **)**

*expression*
: *required* String expression containing substrings and delimiters. If *expression* is a zero-length string (`""`), **Split** returns an empty array, that is, an array with no elements and no data.

*delimiter*
: *optional* String character used to identify substring limits. If omitted, the space character (`" "`) is assumed to be the delimiter. If *delimiter* is a zero-length string, a single-element array containing the entire *expression* string is returned.

*limit*
: *optional* Number of substrings to be returned; -1 indicates that all substrings are returned.

*compare*
: *optional* Numeric value indicating the kind of comparison to use when evaluating substrings. See settings below.

The *compare* argument can have the following values:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

### Example

This example shows how to use the **Split** function.

```tb
Dim strFull As String
Dim arrSplitStrings1() As String
Dim arrSplitStrings2() As String
Dim strSingleString1 As String
Dim strSingleString2 As String
Dim strSingleString3 As String
Dim i As Long

strFull = "Dow - Fonseca - Graham - Kopke - Noval - Offley - Sandeman - Taylor - Warre"

' arrSplitStrings1 will be an array from 0 To 8.
' arrSplitStrings1(0) = "Dow " and arrSplitStrings1(1) = " Fonseca ".
' The delimiter did not include spaces, so the spaces in strFull will be
' included in the returned array values.
arrSplitStrings1 = Split(strFull, "-")

' arrSplitStrings2 will be an array from 0 To 8.
' arrSplitStrings2(0) = "Dow" and arrSplitStrings2(1) = "Fonseca".
' The delimiter includes the spaces, so the spaces will not be included
' in the returned array values.
arrSplitStrings2 = Split(strFull, " - ")

' Multiple examples of how to return the value "Kopke" (array position 3).
strSingleString1 = arrSplitStrings2(3)         ' "Kopke".

' This syntax can be used if the entire array is not needed and the
' position in the returned array for the desired value is known.
strSingleString2 = Split(strFull, " - ")(3)    ' "Kopke".

For i = LBound(arrSplitStrings2, 1) To UBound(arrSplitStrings2, 1)
    If InStr(1, arrSplitStrings2(i), "Kopke", vbTextCompare) > 0 Then
        strSingleString3 = arrSplitStrings2(i)
        Exit For
    End If
Next i
```

### See Also

- [Filter](Filter), [Join](Join) functions

{% include VBA-Attribution.md %}
