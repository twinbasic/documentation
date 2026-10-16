---
title: GpPointF
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpPointF
has_toc: false
---

# GpPointF type
{: .no_toc }

A point or two-dimensional vector with **Single** coordinates.

<!-- test: Ty_GpPointFTests.GpPointF_IsEightBytes -->
**GpPointF** is the point that the **Single** overloads of the drawing methods take. It is 8 bytes: the fields **X** and **Y**, followed by methods that read and change them. The integer counterpart is [**GpPoint**](GpPoint); a size is a [**GpSizeF**](GpSizeF) and a rectangle a [**GpRectF**](GpRectF). It mirrors the `PointF` class of the GDI+ C++ wrapper.
<!-- /test -->


<!-- test: Ty_GpPointFTests.GpPointF_FormsGiveTheDocumentedValues -->
A variable declared with `Dim` starts at (0, 0).
<!-- /test -->

## Creating

Syntax: **GpPointF**( ) \
Syntax: **GpPointF**( *x*, *y* ) \
Syntax: **GpPointF**( *point* ) \
Syntax: **GpPointF**( *size* )

<!-- test: Ty_GpPointFTests.GpPointF_FormsGiveTheDocumentedValues -->
The module function **GpPointF** returns a new point. A **GpPointF** has no constructor of the `New` form.

*x*, *y*
: *required* A **Single** giving each coordinate.

*point*
: *required* A [**GpPoint**](GpPoint). The new point has the same coordinates.

*size*
: *required* A [**GpSizeF**](GpSizeF). The new point takes **X** from its **Width** and **Y** from its **Height**.

With no arguments the point is (0, 0).
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPointF = GpPointF(3, 4)
Debug.Print p.X & "," & p.Y                          ' 3,4
Debug.Print GpPointF().Zero                          ' True
Dim fromInt As GpPointF = GpPointF(GpPoint(7, 8))
Debug.Print fromInt.X & "," & fromInt.Y              ' 7,8
Dim fromSize As GpPointF = GpPointF(GpSizeF(1.5, 2.5))
Debug.Print fromSize.X & "," & fromSize.Y            ' 1.5,2.5
```

## Fields and properties

### X, Y

The coordinates, as **Single** fields. Assign them directly.

### Zero

Syntax: *point*.**Zero** As **Boolean**

<!-- test: Ty_GpPointFTests.Zero_IsTrueOnlyForExactlyZero -->
Read-only. **True** when both coordinates are exactly 0.
<!-- /test -->

### Length

Syntax: *point*.**Length** [ = *value* ] As **Single**

<!-- test: Ty_GpPointFTests.Length_IsTheSquareRootOfTheSumOfSquares, Ty_GpPointFTests.Length_SetScalesTheVectorKeepingItsDirection -->
Returns the length of the vector, the square root of **X** squared plus **Y** squared. Setting it scales the vector to the given length and keeps its direction.
<!-- /test -->

<!-- test: Ty_GpPointFTests.Length_SetToZeroZeroesBothCoordinates, Ty_GpPointFTests.Length_SetOfAVectorShorterThanTwiceEpsilonChangesNothing -->
Setting **Length** to 0 sets both coordinates to 0, and the direction is lost. Setting the length of a zero vector, or of one shorter than twice [**REAL_EPSILON**](../Helpers#real_epsilon), changes nothing.
<!-- /test -->

### Normalized

Syntax: *point*.**Normalized** As **GpPointF**

Returns the vector scaled to length 1.

<!-- test: none -- the linker rejects the program, and the compile-case runner sees only the diagnostics of the editor -->
> [!NOTE] 0.9.45.0, BETA 1005
> A program that names **Normalized** does not link: the linker reports a code generation error in `Types.Normalized`. Use [**Normalize**](#normalize) on a copy of the point instead.

### Transposed

Syntax: *point*.**Transposed** As **GpPointF**

<!-- test: Ty_GpPointFTests.Transposed_ExchangesTheCoordinates -->
Read-only. Returns a point with **X** and **Y** exchanged.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPointF = GpPointF(3, 4)
Debug.Print p.Length                                 ' 5
p.Length = 10
Debug.Print p.X & "," & p.Y                          ' 6,8
p.Length = 0
Debug.Print p.Zero                                   ' True
Debug.Print GpPointF(1, 2).Transposed.X              ' 2
```

## Conversion

### AsGpPoint

Syntax: *point*.**AsGpPoint**( ) As **GpPoint**

<!-- test: Ty_GpPointFTests.AsGpPoint_RoundsHalvesToEven -->
Returns the point with its coordinates rounded to whole numbers. Halves go to the even number: 2.5 becomes 2 and 3.5 becomes 4.
<!-- /test -->

### SetFrom

Syntax: *point*.**SetFrom**( *source* )

<!-- test: Ty_GpPointFTests.SetFrom_TakesAGpPoint -->
Sets both coordinates from a [**GpPoint**](GpPoint).
<!-- /test -->

### AsPOINT, SetFromPOINT

Syntax: *point*.**AsPOINT**( ) As **GDIP_POINT** \
Syntax: *point*.**SetFromPOINT**( *source* As **GDIP_POINT** )

<!-- test: Ty_GpPointFTests.AsPOINT_RoundsAndSetFromPOINTConverts -->
Convert to and from a structure of two **Long** fields `x` and `y`, which is the layout of the Windows `POINT`. The structure is declared as **GDIP_POINT**. **AsPOINT** rounds as **AsGpPoint** does.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim whole As GpPoint = GpPointF(2.5, 3.5).AsGpPoint()
Debug.Print whole.X & "," & whole.Y                  ' 2,4
Dim p As GpPointF
p.SetFrom GpPoint(5, 6)
Debug.Print p.X & "," & p.Y                          ' 5,6
Dim winPoint As GDIP_POINT = GpPointF(9.2, 1.7).AsPOINT()
Debug.Print winPoint.x & "," & winPoint.y            ' 9,2
```

## Modifying methods

These change the point they are called on.

<!-- test: Ty_GpPointFTests.Add_ChangesThePoint, Ty_GpPointFTests.Sub_ChangesThePoint, Ty_GpPointFTests.SumDiffProdQuot_ReturnNewPointsAndLeaveThePoint -->
> [!NOTE] 0.9.45.0
> **Add** and **Sub** change the point they are called on. Before version 0.9.0.43 they returned the result and left the point alone. Use [**Sum**](#sum-diff) and [**Diff**](#sum-diff) to get a new point.

<!-- test: none -- a twinBASIC defect (BETA 1005), not the package's -->
> [!NOTE] 0.9.45.0, BETA 1005
> The compiler reads `p.Scale(2)` as the start of a `Scale` statement and reports a syntax error. Write `p.Scale 2` or `Call p.Scale(2)`. **Scale2**, **InvScale** and the other methods are not affected.

### Add, Sub

Syntax: *point*.**Add**( *other* As **GpPointF** ) \
Syntax: *point*.**Sub**( *other* As **GpPointF** )

Adds *other* to the point, or subtracts it.

### Scale, Scale2

Syntax: *point*.**Scale** *factor* \
Syntax: *point*.**Scale2**( *xFactor*, *yFactor* )

<!-- test: Ty_GpPointFTests.Scale_MultipliesBothCoordinates, Ty_GpPointFTests.Scale_CallFormMultipliesBothCoordinates, Ty_GpPointFTests.Scale2_MultipliesEachCoordinateByItsOwnFactor -->
Multiplies both coordinates by *factor* (**Single**), or **X** by *xFactor* and **Y** by *yFactor*.
<!-- /test -->

### InvScale, InvScale2

Syntax: *point*.**InvScale**( *divisor* ) \
Syntax: *point*.**InvScale2**( *xDivisor*, *yDivisor* )

<!-- test: Ty_GpPointFTests.InvScale_And_InvScale2_Divide -->
Divides both coordinates by *divisor*, or **X** by *xDivisor* and **Y** by *yDivisor*.
<!-- /test -->

### Transpose

Syntax: *point*.**Transpose**

<!-- test: Ty_GpPointFTests.Transpose_ExchangesTheCoordinatesOfThePoint -->
Exchanges **X** and **Y**.
<!-- /test -->

### Normalize

Syntax: *point*.**Normalize**

<!-- test: Ty_GpPointFTests.Normalize_SetsTheLengthToOneAndKeepsTheDirection, Ty_GpPointFTests.Normalize_LeavesAZeroVector -->
Sets the length to 1 and keeps the direction. A zero vector stays as it is.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPointF = GpPointF(3, 4)
p.Add GpPointF(1, 1)
Debug.Print p.X & "," & p.Y                          ' 4,5
p.Sub GpPointF(1, 1)
p.Scale 2
Debug.Print p.X & "," & p.Y                          ' 6,8
p.Scale2 1, 3
Debug.Print p.X & "," & p.Y                          ' 6,24
p.InvScale 2
p.InvScale2 3, 12
Debug.Print p.X & "," & p.Y                          ' 1,1
p.Transpose
p = GpPointF(3, 4)
p.Normalize
Debug.Print p.X & "," & p.Y                          ' 0.6,0.8
```

## Query methods

These return a new value and leave the point unchanged.

### Sum, Diff

Syntax: *point*.**Sum**( *other* As **GpPointF** ) As **GpPointF** \
Syntax: *point*.**Diff**( *other* As **GpPointF** ) As **GpPointF**

Returns the sum of the two vectors, or the point less *other*.

### Prod, Prod2

Syntax: *point*.**Prod**( *factor* ) As **GpPointF** \
Syntax: *point*.**Prod2**( *xFactor*, *yFactor* ) As **GpPointF**

Returns the point with its coordinates multiplied.

### Quot, Quot2

Syntax: *point*.**Quot**( *divisor* ) As **GpPointF** \
Syntax: *point*.**Quot2**( *xDivisor*, *yDivisor* ) As **GpPointF**

Returns the point with its coordinates divided.

### DotProd

Syntax: *point*.**DotProd**( *other* As **GpPointF** ) As **Single**

<!-- test: Ty_GpPointFTests.DotProd_IsXTimesXPlusYTimesY -->
Returns the dot product, `X * other.X + Y * other.Y`.
<!-- /test -->

### Equals

Syntax: *point*.**Equals**( *other* As **GpPointF** ) As **Boolean**

<!-- test: Ty_GpPointFTests.Equals_IsExact -->
**True** when both coordinates are exactly equal to those of *other*.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GpPointF = GpPointF(3, 4)
Dim s As GpPointF = p.Sum(GpPointF(1, 1))
Debug.Print s.X & "," & s.Y                          ' 4,5
Debug.Print p.X & "," & p.Y                          ' 3,4
Debug.Print p.Diff(GpPointF(1, 1)).X                 ' 2
Debug.Print p.Prod(2).Y                              ' 8
Debug.Print p.Quot2(2, 4).Y                          ' 1
Debug.Print p.DotProd(GpPointF(2, 1))                ' 10
Debug.Print p.Equals(GpPointF(3, 4))                 ' True
```

## See Also

- [GpPoint](GpPoint) type -- the integer point
- [GpSizeF](GpSizeF) type -- a size
- [GpRectF](GpRectF) type -- a rectangle
- [Types](.) -- the types of the package
- [PointF](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-pointf) -- the GDI+ class on Microsoft Learn
