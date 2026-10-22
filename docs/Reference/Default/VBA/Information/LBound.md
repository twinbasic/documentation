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

> [!IMPORTANT]
> On a dynamic array that has never been sized --- one declared `Dim a() As Long` and
> not yet **ReDim**'d, or one **Erase** has released --- this raises an error (see
> Common Errors) rather than returning anything. Test with
> [**IsArrayInitialized**](IsArrayInitialized) first. A **ParamArray** is always
> initialized, so it needs no guard: with no arguments passed it reports bounds of 0
> and -1.

**LBound** is used together with [**UBound**](UBound) to determine the size of an array.

For an array `Dim A(1 To 100, 0 To 3, -3 To 4)`, **LBound** returns:

| Statement | Return value |
|-----------|--------------|
| `LBound(A, 1)` | 1 |
| `LBound(A, 2)` | 0 |
| `LBound(A, 3)` | -3 |

The default lower bound for any dimension is either 0 or 1, depending on the **Option Base** setting. Arrays created with the [**Array**](../../Core/Array) function are zero-based regardless of **Option Base**. Arrays whose dimensions are set with the **To** clause in **Dim**, **Private**, **Public**, **ReDim**, or **Static** can have any integer lower bound.

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

This example uses **LBound** to return the smallest available subscript for the indicated dimension of an array.

```tb check_build
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
