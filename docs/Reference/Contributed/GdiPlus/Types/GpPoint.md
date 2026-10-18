---
title: GpPoint
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpPoint
has_toc: false
---

# GpPoint type
{: .no_toc }

A point or two-dimensional vector with **Long** coordinates.

<!-- test: Ty_GpPointTests.GpPoint_IsEightBytes -->
**GpPoint** is the point that the integer overloads of the drawing methods take. It is 8 bytes: the fields **X** and **Y**, followed by methods that read and change them. The floating-point counterpart is [**GpPointF**](GpPointF); a size is a [**GpSize**](GpSize) and a rectangle a [**GpRect**](GpRect). It mirrors the `Point` class of the GDI+ C++ wrapper.
<!-- /test -->


<!-- test: Ty_GpPointTests.GpPoint_FormsGiveTheDocumentedValues -->
A variable declared with `Dim` starts at (0, 0).
<!-- /test -->

## Creating

Syntax: **GpPoint**( ) \
Syntax: **GpPoint**( *x*, *y* ) \
Syntax: **GpPoint**( *point* ) \
Syntax: **GpPoint**( *size* )

<!-- test: Ty_GpPointTests.GpPoint_FormsGiveTheDocumentedValues, Ty_GpPointTests.GpPoint_OfGpPointFRoundsHalvesToEven -->
The module function **GpPoint** returns a new point.

*x*, *y*
: *required* A **Long** giving each coordinate.

*point*
: *required* A [**GpPointF**](GpPointF). Its coordinates are rounded to whole numbers, halves to the even number (2.5 becomes 2, 3.5 becomes 4).

*size*
: *required* A [**GpSize**](GpSize). The new point takes **X** from its **Width** and **Y** from its **Height**.

With no arguments the point is (0, 0).
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPoint = GpPoint(3, 4)
Debug.Print p.X & "," & p.Y                          ' 3,4
Dim rounded As GpPoint = GpPoint(GpPointF(2.5, 3.5))
Debug.Print rounded.X & "," & rounded.Y              ' 2,4
Dim fromSize As GpPoint = GpPoint(GpSize(7, 8))
Debug.Print fromSize.X & "," & fromSize.Y            ' 7,8
```

## Fields and properties

### X, Y

The coordinates, as **Long** fields. Assign them directly.

### Zero

Syntax: *point*.**Zero** As **Boolean**

<!-- test: Ty_GpPointTests.Zero_IsTrueOnlyForBothCoordinatesZero -->
Read-only. **True** when both coordinates are 0.
<!-- /test -->

### Transposed

Syntax: *point*.**Transposed** As **GpPoint**

<!-- test: Ty_GpPointTests.Transposed_ExchangesTheCoordinatesAndLeavesThePoint -->
Read-only. Returns a point with **X** and **Y** exchanged.
<!-- /test -->

## Conversion

### AsGpPointF

Syntax: *point*.**AsGpPointF**( ) As **GpPointF**

<!-- test: Ty_GpPointTests.AsGpPointF_ReturnsTheSameCoordinates -->
Returns the same coordinates as **Single** values.
<!-- /test -->

### SetFrom

Syntax: *point*.**SetFrom**( *source* )

<!-- test: Ty_GpPointTests.SetFrom_RoundsAGpPointF -->
Sets both coordinates from a [**GpPointF**](GpPointF), rounded as the constructor does.
<!-- /test -->

### AsPOINT, SetFromPOINT

Syntax: *point*.**AsPOINT**( ) As **GDIP_POINT** \
Syntax: *point*.**SetFromPOINT**( *source* As **GDIP_POINT** )

<!-- test: Ty_GpPointTests.AsPOINT_And_SetFromPOINT_ConvertToAndFromThePointStructure -->
Convert to and from a structure of two **Long** fields `x` and `y`, which is the layout of the Windows `POINT`. The structure is declared as **GDIP_POINT**.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPoint = GpPoint(3, 4)
Dim f As GpPointF = p.AsGpPointF()
Debug.Print f.X + f.Y                                ' 7
p.SetFrom GpPointF(2.6, -2.6)
Debug.Print p.X & "," & p.Y                          ' 3,-3
Debug.Print p.Transposed.X                           ' -3
Dim winPoint As GDIP_POINT = p.AsPOINT()
Debug.Print winPoint.x & "," & winPoint.y            ' 3,-3
```

## Modifying methods

These change the point they are called on.

<!-- test: Ty_GpPointTests.Add_ChangesThePoint, Ty_GpPointTests.Sub_ChangesThePoint, Ty_GpPointTests.SumAndDiff_ReturnNewPointsAndLeaveThePoint -->
> [!NOTE] 0.9.45.0
> **Add** and **Sub** change the point they are called on. Before version 0.9.0.43 they returned the result and left the point alone. Use [**Sum**](#sum-diff) and [**Diff**](#sum-diff) to get a new point.

### Add, Sub

Syntax: *point*.**Add**( *other* As **GpPoint** ) \
Syntax: *point*.**Sub**( *other* As **GpPoint** )

Adds *other* to the point, or subtracts it.

### Transpose

<!-- test: Ty_GpPointTests.Transpose_ExchangesTheCoordinatesOfThePoint -->
Syntax: *point*.**Transpose**

Exchanges **X** and **Y**.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPoint = GpPoint(3, 4)
p.Add GpPoint(10, 10)
Debug.Print p.X & "," & p.Y                          ' 13,14
p.Sub GpPoint(1, 1)
p.Transpose
Debug.Print p.X & "," & p.Y                          ' 13,12
```

## Query methods

These return a new value and leave the point unchanged.

### Sum, Diff

Syntax: *point*.**Sum**( *other* As **GpPoint** ) As **GpPoint** \
Syntax: *point*.**Diff**( *other* As **GpPoint** ) As **GpPoint**

Returns the sum of the two vectors, or the point less *other*.

### DotProd

Syntax: *point*.**DotProd**( *other* As **GpPoint** ) As **LongLong**

<!-- test: Ty_GpPointTests.DotProd_IsXTimesXPlusYTimesY -->
Returns the dot product, `X * other.X + Y * other.Y`.
<!-- /test -->

<!-- test: Ty_GpPointTests.DotProd_ProductAboveTheRangeOfALongIsReturned -->
> [!NOTE] 0.9.45.0
> Each product is calculated as a **Long**, and a product above 2,147,483,647 raises error 6, *Overflow*, although the result is a **LongLong**.

### Equals

Syntax: *point*.**Equals**( *other* As **GpPoint** ) As **Boolean**

<!-- test: Ty_GpPointTests.Equals_ComparesBothCoordinates -->
**True** when both coordinates equal those of *other*.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPoint = GpPoint(3, 4)
Debug.Print p.Sum(GpPoint(1, 1)).X                   ' 4
Debug.Print p.Diff(GpPoint(1, 1)).Y                  ' 3
Debug.Print p.DotProd(GpPoint(100000, 100000))       ' 700000
Debug.Print p.Equals(GpPoint(3, 4))                  ' True
```

## See Also

- [GpPointF](GpPointF) type -- the floating-point point
- [GpSize](GpSize) type -- a size
- [GpRect](GpRect) type -- a rectangle
- [Types](.) -- the types of the package
- [Point](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-point) -- the GDI+ class on Microsoft Learn
