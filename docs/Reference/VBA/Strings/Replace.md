---
title: Replace
parent: Strings Module
permalink: /tB/Modules/Strings/Replace
vba_attribution: true
---
# Replace
{: .no_toc }

Returns a string, which is a substring of a string expression beginning at the start position (defaults to 1), in which a specified substring has been replaced with another substring a specified number of times.

Syntax: **Replace(** *expression*, *find*, *replace* [ **,** *start* [ **,** *count* [ **,** *compare* ] ] ] **)**

*expression*
: *required* String expression containing substring to replace.

*find*
: *required* Substring being searched for.

*replace*
: *required* Replacement substring.

*start*
: *optional* Start position for the substring of *expression* to be searched and returned. If omitted, 1 is assumed.

*count*
: *optional* Number of substring substitutions to perform. If omitted, the default value is -1, which means, make all possible substitutions.

*compare*
: *optional* Numeric value indicating the kind of comparison to use when evaluating substrings. See settings below.

The *compare* argument can have the following values:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

**Return values:**

| If                                       | **Replace** returns                                                                                |
|------------------------------------------|----------------------------------------------------------------------------------------------------|
| *expression* is zero-length              | Zero-length string (`""`)                                                                          |
| *expression* is **Null**                 | An error.                                                                                          |
| *find* is zero-length                    | Copy of *expression*.                                                                              |
| *replace* is zero-length                 | Copy of *expression* with all occurrences of *find* removed.                                       |
| *start* > **Len**(*expression*)          | Zero-length string. String replacement begins at the position indicated by *start*.                |
| *count* is 0                             | Copy of *expression*.                                                                              |

The return value of the **Replace** function is a string, with substitutions made, that begins at the position specified by *start* and concludes at the end of the *expression* string. It's not a copy of the original string from start to finish.

### See Also

- [InStr](InStr), [StrComp](StrComp) functions
