---
title: InStr
parent: Strings Module
permalink: /tB/Modules/Strings/InStr
vba_attribution: true
---
# InStr, InStrB
{: .no_toc }

Returns a **Variant** (**Long**) specifying the position of the first occurrence of one string within another.

Syntax:

- **InStr(** [ *start* **,** ] *string1*, *string2* [ **,** *compare* ] **)**
- **InStrB(** [ *start* **,** ] *string1*, *string2* [ **,** *compare* ] **)**

*start*
: *optional* Numeric expression that sets the starting position for each search. If omitted, search begins at the first character position. *start* must be 1 or greater: 0 or a negative value raises error 5 (Invalid procedure call or argument), and **Null** raises error 94 (Invalid use of Null). The *start* argument is required if *compare* is specified.

*string1*
: *required* String expression being searched.

*string2*
: *required* String expression sought.

*compare*
: *optional* Specifies the type of string comparison. If *compare* is **Null**, an error occurs. If *compare* is omitted, the [**Option Compare**](../../Core/Option) setting determines the type of comparison. Specify a valid LCID (LocaleID) to use locale-specific rules in the comparison.

The *compare* argument settings are:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the **Option Compare** statement.          |
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

**Return values:** the first row that applies gives the result.

| If                                              | **InStr** returns                |
|-------------------------------------------------|----------------------------------|
| *string1* is **Null**                           | **Null**                         |
| *string2* is **Null**                           | **Null**                         |
| *string1* is zero-length                        | 0                                |
| *string2* is zero-length                        | *start*, even when *start* is greater than **Len**(*string1*) |
| *start* > **Len**(*string1*)                    | 0                                |
| *string2* is not found                          | 0                                |
| *string2* is found within *string1*             | Position at which match is found |

The **InStrB** function is used with byte data contained in a string. Instead of returning the character position of the first occurrence of one string within another, **InStrB** returns the byte position.

### Example

This example uses the **InStr** function to return the position of the first occurrence of one string within another.

```tb check_run
Dim SearchString As String, SearchChar As String
SearchString = "XXpXXpXXPXXP"    ' String to search in.
SearchChar = "P"                 ' Search for "P".

' A textual comparison starting at position 4.
Debug.Print InStr(4, SearchString, SearchChar, 1)    ' 6

' A binary comparison starting at position 1.
Debug.Print InStr(1, SearchString, SearchChar, 0)    ' 9

' Comparison is binary by default (last argument is omitted).
Debug.Print InStr(SearchString, SearchChar)          ' 9

Debug.Print InStr(1, SearchString, "W")              ' 0
```

This example shows the rows of the return-value table that are easy to get wrong.

```tb check_run
Debug.Print InStr(3, "abcdef", "cd")      ' 3
Debug.Print InStr(4, "abc", "c")          ' 0
Debug.Print InStr(5, "abc", "")           ' 5
Debug.Print InStr(1, "", "")              ' 0
Debug.Print IsNull(InStr(1, Null, "a"))   ' True

On Error Resume Next
Debug.Print InStr(0, "abc", "a")
Debug.Print Err.Number                    ' 5
```

### See Also

- [InStrRev](InStrRev), [Replace](Replace), [StrComp](StrComp) functions
