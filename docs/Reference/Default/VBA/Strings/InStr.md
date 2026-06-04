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
: *optional* Numeric expression that sets the starting position for each search. If omitted, search begins at the first character position. If *start* contains **Null**, an error occurs. The *start* argument is required if *compare* is specified.

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

**Return values:**

| If                                              | **InStr** returns                |
|-------------------------------------------------|----------------------------------|
| *string1* is zero-length                        | 0                                |
| *string1* is **Null**                           | **Null**                         |
| *string2* is zero-length                        | *start*                          |
| *string2* is **Null**                           | **Null**                         |
| *string2* is not found                          | 0                                |
| *string2* is found within *string1*             | Position at which match is found |
| *start* > **Len**(*string2*)                    | 0                                |

The **InStrB** function is used with byte data contained in a string. Instead of returning the character position of the first occurrence of one string within another, **InStrB** returns the byte position.

### Example

This example uses the **InStr** function to return the position of the first occurrence of one string within another.

```tb
Dim SearchString, SearchChar, MyPos
SearchString = "XXpXXpXXPXXP"    ' String to search in.
SearchChar = "P"                 ' Search for "P".

' A textual comparison starting at position 4. Returns 6.
MyPos = InStr(4, SearchString, SearchChar, 1)

' A binary comparison starting at position 1. Returns 9.
MyPos = InStr(1, SearchString, SearchChar, 0)

' Comparison is binary by default (last argument is omitted).
MyPos = InStr(SearchString, SearchChar)    ' Returns 9.

MyPos = InStr(1, SearchString, "W")    ' Returns 0.
```

### See Also

- [InStrRev](InStrRev), [Replace](Replace), [StrComp](StrComp) functions
