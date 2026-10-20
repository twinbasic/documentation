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
: *optional* Numeric expression that sets the starting position for each search. If omitted, -1 is used, which means that the search begins at the last character position. *start* must be -1, or 1 or greater.

*compare*
: *optional* Numeric value indicating the kind of comparison to use when evaluating substrings. If omitted, a binary comparison is performed. See settings below.

The *compare* argument can have the following values:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

<!-- VBA: VBA-Docs lists this setting too; twinBASIC and VB6 raise error 5 for it.
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
-->

**Return values:** the first row that applies gives the result.

| If                                                  | **InStrRev** returns             |
|-----------------------------------------------------|----------------------------------|
| *stringcheck* is zero-length                        | 0                                |
| *start* > **Len**(*stringcheck*)                    | 0                                |
| *stringmatch* is zero-length                        | *start*, or **Len**(*stringcheck*) when *start* is -1 |
| *stringmatch* is not found                          | 0                                |
| *stringmatch* is found within *stringcheck*         | Position at which match is found |

Unlike **InStr**, **InStrRev** does not return **Null**: a **Null** argument is an error.

> [!NOTE]
> The syntax for the **InStrRev** function is not the same as the syntax for the [**InStr**](InStr) function --- note the swapped order of the search arguments.

**InStrRev** will not find an instance of *stringmatch* unless the position of the end character of *stringmatch* is less than or equal to *start*.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *start* is 0, or less than -1<br>*compare* is less than 0, or greater than 1 and not a valid locale identifier |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | any argument is **Null** |

<!-- /errors -->

### Example

This example uses **InStrRev** to find the last occurrence of a substring.

```tb check_run
' The last dot.
Debug.Print InStrRev("a.b.c", ".")       ' 4
' The last dot at or before position 3.
Debug.Print InStrRev("a.b.c", ".", 3)    ' 2
' Not found.
Debug.Print InStrRev("a.b.c", "x")       ' 0
```

This example shows the end-character rule and the rows of the return-value table that are easy to get wrong.

```tb check_run
' "bc" at position 5 ends at 6, after start, so the match at 2 is found.
Debug.Print InStrRev("abcabc", "bc", 5)   ' 2
Debug.Print InStrRev("abcabc", "bc", 6)   ' 5
Debug.Print InStrRev("abc", "c", 4)       ' 0
Debug.Print InStrRev("abc", "")           ' 3
Debug.Print InStrRev("abc", "", 4)        ' 0

On Error Resume Next
Debug.Print InStrRev(Null, "a")
Debug.Print Err.Number                    ' 94
```

### See Also

- [InStr](InStr) function
