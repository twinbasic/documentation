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
: *optional* Specifies the type of string comparison. If the *compare* argument is **Null**, an error occurs. If *compare* is omitted, the [**Option Compare**](../../Core/Option) setting determines the type of comparison.

The *compare* argument settings are:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the **Option Compare** statement.          |
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

**Return values:**

| If                                  | **StrComp** returns |
|-------------------------------------|---------------------|
| *string1* is less than *string2*    | -1                  |
| *string1* is equal to *string2*     | 0                   |
| *string1* is greater than *string2* | 1                   |
| *string1* or *string2* is **Null**  | **Null**            |

### Example

This example uses the **StrComp** function to return the results of a string comparison. If the third argument is 1, a textual comparison is performed; if the third argument is 0 or omitted, a binary comparison is performed.

```tb
Dim MyStr1, MyStr2, MyComp
MyStr1 = "ABCD": MyStr2 = "abcd"      ' Define variables.
MyComp = StrComp(MyStr1, MyStr2, 1)   ' Returns 0.
MyComp = StrComp(MyStr1, MyStr2, 0)   ' Returns -1.
MyComp = StrComp(MyStr2, MyStr1)      ' Returns 1.
```

### See Also

- [InStr](InStr) function
