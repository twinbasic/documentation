---
title: GpSize
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpSize
has_toc: false
---

# GpSize type
{: .no_toc }

A width and a height as **Long** values.

**GpSize** is the size that the integer overloads of the drawing and measuring methods take and return. It is 8 bytes: the fields **Width** and **Height**, followed by methods that read and change them. The floating-point counterpart is [**GpSizeF**](GpSizeF); a point is a [**GpPoint**](GpPoint) and a rectangle a [**GpRect**](GpRect). It mirrors the `Size` class of the GDI+ C++ wrapper.

A variable declared with `Dim` starts at 0 by 0.

## Creating

Syntax: **GpSize**( ) \
Syntax: **GpSize**( *width*, *height* ) \
Syntax: **GpSize**( *size* ) \
Syntax: **GpSizeFrom**( *size* )

The module function **GpSize** returns a new size.

*width*, *height*
: *required* A **Long** giving each dimension.

*size*
: *required* For **GpSize**, a [**GpSizeF**](GpSizeF); its dimensions are rounded to whole numbers, halves to the even number (2.5 becomes 2, 3.5 becomes 4). For **GpSizeFrom**, a structure of two **Long** fields `cx` and `cy`, which is the layout of the Windows `SIZE` and is declared as **GDIP_SIZE**.

With no arguments the size is 0 by 0.

> [!WARNING] 0.9.45.0
> **GpSizeFrom** returns a size of 0 by 0 whatever its argument holds. Set the size with [**SetFromSIZE**](#assize-setfromsize) instead.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSize = GpSize(3, 4)
Debug.Print s.Width & "," & s.Height                 ' 3,4
Dim rounded As GpSize = GpSize(GpSizeF(2.5, 3.5))
Debug.Print rounded.Width & "," & rounded.Height     ' 2,4
Debug.Print GpSize().Empty                           ' True
```

## Fields and properties

### Width, Height

The dimensions, as **Long** fields. Assign them directly.

### Empty

Syntax: *size*.**Empty** As **Boolean**

Read-only. **True** when both dimensions are 0.

## Conversion

### AsGpSizeF

Syntax: *size*.**AsGpSizeF**( ) As **GpSizeF**

Returns the same dimensions as **Single** values.

### SetFrom

Syntax: *size*.**SetFrom**( *source* )

Sets both dimensions from a [**GpSizeF**](GpSizeF), rounded as the constructor does.

### AsSIZE, SetFromSIZE

Syntax: *size*.**AsSIZE**( ) As **GDIP_SIZE** \
Syntax: *size*.**SetFromSIZE**( *source* As **GDIP_SIZE** )

Convert to and from the `SIZE`-shaped structure described under [Creating](#creating).

### AsGpRect, AsGpRectF, AsRECT

Syntax: *size*.**AsGpRect**( ) As **GpRect** \
Syntax: *size*.**AsGpRectF**( ) As **GpRectF** \
Syntax: *size*.**AsRECT**( ) As **GDIP_RECT**

Return a rectangle of this size with its top left corner at (0, 0). **AsRECT** returns the structure of four **Long** fields `Left`, `Top`, `Right` and `Bottom`, which is the layout of the Windows `RECT`; it is declared as **GDIP_RECT**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSize = GpSize(5, 6)
Dim r As GpRect = s.AsGpRect()
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height   ' 0,0,5,6
Debug.Print s.AsGpSizeF().Width                      ' 5
Dim winSize As GDIP_SIZE
winSize.cx = 9: winSize.cy = 10
s.SetFromSIZE winSize
Debug.Print s.AsSIZE().cx & "," & s.AsSIZE().cy      ' 9,10
```

## Modifying methods

> [!NOTE] 0.9.45.0
> **Add** and **Sub** change the size they are called on. Before version 0.9.0.43 they returned the result and left the size alone. Use [**Sum**](#sum-diff) and [**Diff**](#sum-diff) to get a new size.

### Add, Sub

Syntax: *size*.**Add**( *other* As **GpSize** ) \
Syntax: *size*.**Sub**( *other* As **GpSize** )

Adds *other* to the size, or subtracts it.

## Query methods

### Sum, Diff

Syntax: *size*.**Sum**( *other* As **GpSize** ) As **GpSize** \
Syntax: *size*.**Diff**( *other* As **GpSize** ) As **GpSize**

Returns the sum of the two sizes, or the size less *other*.

### Equals

Syntax: *size*.**Equals**( *other* As **GpSize** ) As **Boolean**

**True** when both dimensions equal those of *other*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim s As GpSize = GpSize(3, 4)
s.Add GpSize(1, 1)
Debug.Print s.Width & "," & s.Height                 ' 4,5
s.Sub GpSize(2, 2)
Debug.Print s.Width & "," & s.Height                 ' 2,3
Debug.Print s.Sum(GpSize(10, 10)).Width              ' 12
Debug.Print s.Diff(GpSize(1, 1)).Height              ' 2
Debug.Print s.Equals(GpSize(2, 3))                   ' True
```

## See Also

- [GpSizeF](GpSizeF) type -- the floating-point size
- [GpPoint](GpPoint) type -- a point
- [GpRect](GpRect) type -- a rectangle
- [Types](.) -- the types of the package
- [Size](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-size) -- the GDI+ class on Microsoft Learn
