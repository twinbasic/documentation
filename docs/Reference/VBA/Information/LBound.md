---
title: LBound
parent: Information Module
permalink: /tB/Modules/Information/LBound
redirect_from:
-  /tB/Core/LBound
vba_attribution: true
---
# LBound
{: .no_toc }

Returns a **Long** containing the smallest available subscript for the indicated dimension of an array.

Syntax: **LBound(** *arrayname* [ **,** *dimension* ] **)**

*arrayname*
: *required* The name of the array variable; follows standard variable naming conventions.

*dimension*
: *optional* A **Long** indicating which dimension's lower bound is returned. Use 1 for the first dimension, 2 for the second, and so on. If *dimension* is omitted, 1 is assumed.

**LBound** is used together with [**UBound**](UBound) to determine the size of an array.

For an array `Dim A(1 To 100, 0 To 3, -3 To 4)`, **LBound** returns:

| Statement | Return value |
|-----------|--------------|
| `LBound(A, 1)` | 1 |
| `LBound(A, 2)` | 0 |
| `LBound(A, 3)` | -3 |

The default lower bound for any dimension is either 0 or 1, depending on the **Option Base** setting. Arrays created with the [**Array**](../../Core/Array) function are zero-based regardless of **Option Base**. Arrays whose dimensions are set with the **To** clause in **Dim**, **Private**, **Public**, **ReDim**, or **Static** can have any integer lower bound.

### Example

This example uses **LBound** to return the smallest available subscript for the indicated dimension of an array.

```tb
Dim Lower As Long
Dim MyArray(1 To 10, 5 To 15, 10 To 20)    ' Multidimensional array.
Dim AnyArray(10)
Lower = LBound(MyArray, 1)                 ' Returns 1.
Lower = LBound(MyArray, 3)                 ' Returns 10.
Lower = LBound(AnyArray)                   ' Returns 0 or 1, per Option Base.
```

### See Also

- [UBound](UBound) function
- [IsArray](IsArray), [IsArrayInitialized](IsArrayInitialized) functions
