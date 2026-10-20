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
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

<!-- VBA: VBA-Docs lists this setting too; twinBASIC and VB6 raise error 5 for it.
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
-->

**Return values:**

| If                                       | **Replace** returns                                                                                |
|------------------------------------------|----------------------------------------------------------------------------------------------------|
| *expression* is zero-length              | Zero-length string (`""`)                                                                          |
| *find* is zero-length                    | Copy of *expression*.                                                                              |
| *replace* is zero-length                 | Copy of *expression* with all occurrences of *find* removed.                                       |
| *start* > **Len**(*expression*)          | Zero-length string. String replacement begins at the position indicated by *start*.                |
| *count* is 0                             | Copy of *expression*.                                                                              |

The return value of the **Replace** function is a string, with substitutions made, that begins at the position specified by *start* and concludes at the end of the *expression* string. It's not a copy of the original string from start to finish.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *start* is less than 1, or *count* is less than -1<br>*compare* is less than 0, or greater than 1 and not a valid locale identifier |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | any argument is **Null** |

<!-- /errors -->

### See Also

- [InStr](InStr), [StrComp](StrComp) functions
