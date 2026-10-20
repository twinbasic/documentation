---
title: StrComp
parent: Strings Module
permalink: /tB/Modules/Strings/StrComp
vba_attribution: true
---
# StrComp
{: .no_toc }

Returns a **Variant** (**Integer**) indicating the result of a string comparison.

Syntax: **StrComp(** *string1*, *string2* [ **,** *compare* ] **)**

*string1*
: *required* Any valid string expression.

*string2*
: *required* Any valid string expression.

*compare*
: *optional* Specifies the type of string comparison. If *compare* is omitted, the [**Option Compare**](../../Core/Option) setting determines the type of comparison.

The *compare* argument settings are:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

<!-- VBA: VBA-Docs lists this setting too; twinBASIC and VB6 raise error 5 for it.
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the **Option Compare** statement.          |
-->

**Return values:**

| If                                  | **StrComp** returns |
|-------------------------------------|---------------------|
| *string1* is less than *string2*    | -1                  |
| *string1* is equal to *string2*     | 0                   |
| *string1* is greater than *string2* | 1                   |
| *string1* or *string2* is **Null**  | **Null**            |

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *compare* is less than 0, or greater than 1 and not a valid locale identifier |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | *compare* is **Null** |

> [!NOTE] BETA 1010
> When *compare* is 2 (**vbDatabaseCompare**), VB6 raises error [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **StrComp** function to return the results of a string comparison. If the third argument is 1, a textual comparison is performed; if the third argument is 0 or omitted, a binary comparison is performed.

```tb check_build
Dim MyStr1, MyStr2, MyComp
MyStr1 = "ABCD": MyStr2 = "abcd"      ' Define variables.
MyComp = StrComp(MyStr1, MyStr2, 1)   ' Returns 0.
MyComp = StrComp(MyStr1, MyStr2, 0)   ' Returns -1.
MyComp = StrComp(MyStr2, MyStr1)      ' Returns 1.
```

### See Also

- [InStr](InStr) function
