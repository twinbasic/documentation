---
title: UBound
parent: Information Module
permalink: /tB/Modules/Information/UBound
redirect_from:
-  /tB/Core/UBound
vba_attribution: true
---
# UBound
{: .no_toc }

Returns a **Long** containing the largest available subscript for the indicated dimension of an array.

Syntax: **UBound(** *arrayname* [ **,** *dimension* ] **)**

*arrayname*
: *required* The name of the array variable; follows standard variable naming conventions.

*dimension*
: *optional* A **Long** indicating which dimension's upper bound is returned. Use 1 for the first dimension, 2 for the second, and so on. If *dimension* is omitted, 1 is assumed.

**UBound** is used together with [**LBound**](LBound) to determine the size of an array.

For an array `Dim A(1 To 100, 0 To 3, -3 To 4)`, **UBound** returns:

| Statement | Return value |
|-----------|--------------|
| `UBound(A, 1)` | 100 |
| `UBound(A, 2)` | 3 |
| `UBound(A, 3)` | 4 |

### Example

This example uses **UBound** to return the largest available subscript for the indicated dimension of an array.

```tb
Dim Upper As Long
Dim MyArray(1 To 10, 5 To 15, 10 To 20)    ' Multidimensional array.
Dim AnyArray(10)
Upper = UBound(MyArray, 1)                 ' Returns 10.
Upper = UBound(MyArray, 3)                 ' Returns 20.
Upper = UBound(AnyArray)                   ' Returns 10.
```

### See Also

- [LBound](LBound) function
- [IsArray](IsArray), [IsArrayInitialized](IsArrayInitialized) functions
