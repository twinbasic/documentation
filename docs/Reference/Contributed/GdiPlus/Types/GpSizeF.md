---
title: GpSizeF
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpSizeF
has_toc: false
---

# GpSizeF type
{: .no_toc }

A width and a height as **Single** values.

**GpSizeF** is the size that the **Single** overloads of the drawing and measuring methods take and return. It is 8 bytes: the fields **Width** and **Height**, followed by methods that read and change them. The integer counterpart is [**GpSize**](GpSize); a point is a [**GpPointF**](GpPointF) and a rectangle a [**GpRectF**](GpRectF). It mirrors the `SizeF` class of the GDI+ C++ wrapper.

A variable declared with `Dim` starts at 0 by 0.

## Creating

Syntax: **GpSizeF**( ) \
Syntax: **GpSizeF**( *width*, *height* ) \
Syntax: **GpSizeF**( *size* ) \
Syntax: **GpSizeFFrom**( *size* )

The module function **GpSizeF** returns a new size.

*width*, *height*
: *required* A **Single** giving each dimension.

*size*
: *required* For **GpSizeF**, a [**GpSize**](GpSize) with the same dimensions. For **GpSizeFFrom**, a structure of two **Long** fields `cx` and `cy`, which is the layout of the Windows `SIZE` and is declared as **GDIP_SIZE**.

With no arguments the size is 0 by 0.

> [!WARNING] 0.9.45.0
> **GpSizeFFrom** returns a size of 0 by 0 whatever its argument holds. Set the size with [**SetFromSIZE**](#assize-setfromsize) instead.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSizeF = GpSizeF(3, 4)
Debug.Print s.Width & "," & s.Height                 ' 3,4
Debug.Print GpSizeF().Empty                          ' True
Dim fromInt As GpSizeF = GpSizeF(GpSize(7, 8))
Debug.Print fromInt.Width & "," & fromInt.Height     ' 7,8
```

## Fields and properties

### Width, Height

The dimensions, as **Single** fields. Assign them directly.

### Empty

Syntax: *size*.**Empty** As **Boolean**

Read-only. **True** when both dimensions are exactly 0.

### Diagonal

Syntax: *size*.**Diagonal** [ = *value* ] As **Single**

Returns the length of the diagonal of a rectangle of this size. Setting it scales both dimensions so that the diagonal has the given length. Setting the diagonal of a size whose diagonal is shorter than twice [**REAL_EPSILON**](../Helpers#real_epsilon) changes nothing.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSizeF = GpSizeF(3, 4)
Debug.Print s.Diagonal                               ' 5
s.Diagonal = 10
Debug.Print s.Width & "," & s.Height                 ' 6,8
```

## Conversion

### AsGpSize

Syntax: *size*.**AsGpSize**( ) As **GpSize**

Returns the size with both dimensions rounded to whole numbers, halves to the even number (2.5 becomes 2, 3.5 becomes 4).

### SetFrom

Syntax: *size*.**SetFrom**( *source* )

Sets both dimensions from a [**GpSize**](GpSize).

### AsSIZE, SetFromSIZE

Syntax: *size*.**AsSIZE**( ) As **GDIP_SIZE** \
Syntax: *size*.**SetFromSIZE**( *source* As **GDIP_SIZE** )

Convert to and from the `SIZE`-shaped structure described under [Creating](#creating). **AsSIZE** rounds as **AsGpSize** does.

### AsGpRectF, AsGpRect, AsRECT

Syntax: *size*.**AsGpRectF**( ) As **GpRectF** \
Syntax: *size*.**AsGpRect**( ) As **GpRect** \
Syntax: *size*.**AsRECT**( ) As **GDIP_RECT**

Return a rectangle of this size with its top left corner at (0, 0). **AsRECT** returns the structure of four **Long** fields `Left`, `Top`, `Right` and `Bottom`, which is the layout of the Windows `RECT`; it is declared as **GDIP_RECT**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSizeF = GpSizeF(2.5, 3.5)
Dim whole As GpSize = s.AsGpSize()
Debug.Print whole.Width & "," & whole.Height         ' 2,4
Dim r As GpRectF = s.AsGpRectF()
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height   ' 0,0,2.5,3.5
Dim winSize As GDIP_SIZE
winSize.cx = 9: winSize.cy = 10
s.SetFromSIZE winSize
Debug.Print s.Width & "," & s.Height                 ' 9,10
Debug.Print s.AsRECT().Right & "," & s.AsRECT().Bottom   ' 9,10
```

## Modifying methods

These change the size they are called on.

> [!NOTE] 0.9.45.0
> **Add** and **Sub** change the size they are called on. Before version 0.9.0.43 they returned the result and left the size alone. Use [**Sum**](#sum-diff) and [**Diff**](#sum-diff) to get a new size.

> [!NOTE] 0.9.45.0, BETA 1005
> The compiler reads `s.Scale(2)` as the start of a `Scale` statement and reports a syntax error. Write `s.Scale 2` or `Call s.Scale(2)`. **Scale2**, **InvScale** and the other methods are not affected.

### Add, Sub

Syntax: *size*.**Add**( *other* As **GpSizeF** ) \
Syntax: *size*.**Sub**( *other* As **GpSizeF** )

Adds *other* to the size, or subtracts it.

### Scale, Scale2

Syntax: *size*.**Scale** *factor* \
Syntax: *size*.**Scale2**( *widthFactor*, *heightFactor* )

Multiplies both dimensions by *factor*, or **Width** by *widthFactor* and **Height** by *heightFactor*.

### InvScale, InvScale2

Syntax: *size*.**InvScale**( *divisor* ) \
Syntax: *size*.**InvScale2**( *widthDivisor*, *heightDivisor* )

Divides both dimensions by *divisor*, or **Width** by *widthDivisor* and **Height** by *heightDivisor*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSizeF = GpSizeF(3, 4)
s.Add GpSizeF(1, 1)
s.Sub GpSizeF(0, 2)
Debug.Print s.Width & "," & s.Height                 ' 4,3
s.Scale 2
s.Scale2 1, 3
Debug.Print s.Width & "," & s.Height                 ' 8,18
s.InvScale 2
s.InvScale2 2, 9
Debug.Print s.Width & "," & s.Height                 ' 2,1
```

## Query methods

These return a new value and leave the size unchanged.

### Sum, Diff

Syntax: *size*.**Sum**( *other* As **GpSizeF** ) As **GpSizeF** \
Syntax: *size*.**Diff**( *other* As **GpSizeF** ) As **GpSizeF**

Returns the sum of the two sizes, or the size less *other*.

### Prod, Prod2

Syntax: *size*.**Prod**( *factor* ) As **GpSizeF** \
Syntax: *size*.**Prod2**( *widthFactor*, *heightFactor* ) As **GpSizeF**

Returns the size with its dimensions multiplied.

### Quot, Quot2

Syntax: *size*.**Quot**( *divisor* ) As **GpSizeF** \
Syntax: *size*.**Quot2**( *widthDivisor*, *heightDivisor* ) As **GpSizeF**

Returns the size with its dimensions divided.

### Equals

Syntax: *size*.**Equals**( *other* As **GpSizeF** ) As **Boolean**

**True** when both dimensions are exactly equal to those of *other*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSizeF = GpSizeF(3, 4)
Debug.Print s.Sum(GpSizeF(1, 1)).Width               ' 4
Debug.Print s.Diff(GpSizeF(1, 1)).Height             ' 3
Debug.Print s.Prod2(2, 3).Height                     ' 12
Debug.Print s.Quot(2).Width                          ' 1.5
Debug.Print s.Equals(GpSizeF(3, 4))                  ' True
```

## See Also

- [GpSize](GpSize) type -- the integer size
- [GpPointF](GpPointF) type -- a point
- [GpRectF](GpRectF) type -- a rectangle
- [Types](.) -- the types of the package
- [SizeF](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-sizef) -- the GDI+ class on Microsoft Learn
