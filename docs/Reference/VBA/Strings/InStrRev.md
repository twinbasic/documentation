---
title: InStrRev
parent: Strings Module
permalink: /tB/Modules/Strings/InStrRev
vba_attribution: true
---
# InStrRev
{: .no_toc }

Returns the position of an occurrence of one string within another, from the end of the string.

Syntax: **InStrRev(** *stringcheck*, *stringmatch* [ **,** *start* [ **,** *compare* ] ] **)**

*stringcheck*
: *required* String expression being searched.

*stringmatch*
: *required* String expression being searched for.

*start*
: *optional* Numeric expression that sets the starting position for each search. If omitted, -1 is used, which means that the search begins at the last character position. If *start* contains **Null**, an error occurs.

*compare*
: *optional* Numeric value indicating the kind of comparison to use when evaluating substrings. If omitted, a binary comparison is performed. See settings below.

The *compare* argument can have the following values:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

**Return values:**

| If                                                  | **InStrRev** returns             |
|-----------------------------------------------------|----------------------------------|
| *stringcheck* is zero-length                        | 0                                |
| *stringcheck* is **Null**                           | **Null**                         |
| *stringmatch* is zero-length                        | *start*                          |
| *stringmatch* is **Null**                           | **Null**                         |
| *stringmatch* is not found                          | 0                                |
| *stringmatch* is found within *stringcheck*         | Position at which match is found |
| *start* > **Len**(*stringcheck*)                    | 0                                |

> [!NOTE]
> The syntax for the **InStrRev** function is not the same as the syntax for the [**InStr**](InStr) function — note the swapped order of the search arguments.

**InStrRev** will not find an instance of *stringmatch* unless the position of the end character of *stringmatch* is less than or equal to *start*.

### See Also

- [InStr](InStr) function
