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

> [!IMPORTANT]
> On a dynamic array that has never been sized --- one declared `Dim a() As Long` and
> not yet **ReDim**'d, or one **Erase** has released --- this raises an error (see
> Common Errors) rather than returning anything. Test with
> [**IsArrayInitialized**](IsArrayInitialized) first. A **ParamArray** is always
> initialized, so it needs no guard: with no arguments passed it reports bounds of 0
> and -1.

For an array `Dim A(1 To 100, 0 To 3, -3 To 4)`, **UBound** returns:

| Statement | Return value |
|-----------|--------------|
| `UBound(A, 1)` | 100 |
| `UBound(A, 2)` | 3 |
| `UBound(A, 3)` | 4 |

<!-- errors: generated from errors/VBA.Information.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [9 (`&H9`)](tb:Errors#9), *Subscript out of range* | *arrayname* is a dynamic array that has not been sized with **ReDim**, or that **Erase** has released |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *dimension* is less than 1 or greater than the number of dimensions of *arrayname*, after rounding<br>*dimension* is greater than 32,767 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *arrayname* is a **Variant** that holds no array, **Empty** and **Null** included |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *dimension* is **Null** |

> [!NOTE] BETA 1010
> When *dimension* is less than 1 or greater than the number of dimensions of *arrayname*, after rounding, VB6 and 64-bit VBA raise error [9 (`&H9`)](tb:Errors#9), *Subscript out of range*, instead.

> [!NOTE] BETA 1010
> When *dimension* is greater than 32,767, VB6 and 64-bit VBA raise error [6 (`&H6`)](tb:Errors#6), *Overflow*, instead.

<!-- /errors -->

### Example

This example uses **UBound** to return the largest available subscript for the indicated dimension of an array.

```tb check_build
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
