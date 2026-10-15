---
title: GpRect
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpRect
has_toc: false
---

# GpRect type
{: .no_toc }

A rectangle with **Long** coordinates, whose sides are parallel to the axes.

**GpRect** is the rectangle that the integer overloads of the drawing methods take and return. It is 16 bytes: the fields **X**, **Y**, **Width** and **Height**, followed by methods that read and change them. The floating-point counterpart is [**GpRectF**](GpRectF); a point is a [**GpPoint**](GpPoint) and a size a [**GpSize**](GpSize). It mirrors the `Rect` class of the GDI+ C++ wrapper.

A variable declared with `Dim` starts as an empty rectangle at (0, 0).

## Creating

Syntax: **GpRect**( ) \
Syntax: **GpRect**( *x*, *y* ) \
Syntax: **GpRect**( *x*, *y*, *width*, *height* ) \
Syntax: **GpRect**( *location* ) \
Syntax: **GpRect**( *location*, *size* ) \
Syntax: **GpRect**( *rect* ) \
Syntax: **GpRectFrom**( *rect* )

The module function **GpRect** returns a new rectangle. The forms without a size give a rectangle of width 0 and height 0.

*x*, *y*, *width*, *height*
: *required* **Long** values: the top left corner and the dimensions.

*location*
: *required* A [**GpPoint**](GpPoint) giving the top left corner.

*size*
: *required* A [**GpSize**](GpSize) giving the dimensions.

*rect*
: *required* For **GpRect**, a [**GpRectF**](GpRectF), whose values are rounded to whole numbers (halves to the even number), or a structure of four **Long** fields `Left`, `Top`, `Right` and `Bottom`, which is the layout of the Windows `RECT` and is declared as **GDIP_RECT**. For **GpRectFrom**, a structure of four **Single** fields with the same names, declared as **GDIP_RECTF**. The rectangle has the same position, and the width and height are the differences of the edges.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRect = GpRect(10, 20, 30, 40)
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height     ' 10,20,30,40
Dim p As GpRect = GpRect(GpPoint(5, 6), GpSize(7, 8))
Debug.Print p.X & "," & p.Y & "," & p.Width & "," & p.Height     ' 5,6,7,8
Dim q As GpRect = GpRect(GpRectF(1.5, 2.5, 3.5, 4.5))
Debug.Print q.X & "," & q.Y & "," & q.Width & "," & q.Height     ' 2,2,4,4
Dim edges As GDIP_RECT
edges.Left = 1: edges.Top = 2: edges.Right = 11: edges.Bottom = 22
Dim e As GpRect = GpRect(edges)
Debug.Print e.X & "," & e.Y & "," & e.Width & "," & e.Height     ' 1,2,10,20
```

## Fields and properties

> [!NOTE] 0.9.45.0
> The location and the size are independent. Setting **Location** does not change the size, and setting **Size** does not change the location.

### X, Y, Width, Height

The top left corner and the dimensions, as **Long** fields. Assign them directly.

### Location

Syntax: *rect*.**Location** [ = *value* ] As **GpPoint**

Returns or sets the top left corner.

### Size

Syntax: *rect*.**Size** [ = *value* ] As **GpSize**

Returns or sets the width and height.

### Left, Top, Right, Bottom

Syntax: *rect*.**Left** As **Long**

Read-only. The coordinates of the four edges: **Left** is **X**, **Top** is **Y**, **Right** is **X** plus **Width** and **Bottom** is **Y** plus **Height**.

### TopLeft, TopRight, BottomLeft, BottomRight

Syntax: *rect*.**TopLeft** As **GpPoint**

Read-only. The corners of the rectangle.

### IsEmptyArea

Syntax: *rect*.**IsEmptyArea** As **Boolean**

Read-only. **True** when the width or the height is 0 or negative.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRect = GpRect(10, 20, 30, 40)
Debug.Print r.Left & "," & r.Top & "," & r.Right & "," & r.Bottom   ' 10,20,40,60
Debug.Print r.TopRight.X & "," & r.BottomLeft.Y                    ' 40,60
r.Location = GpPoint(0, 0)
Debug.Print r.Width                                                ' 30
r.Size = GpSize(3, 4)
Debug.Print r.Right & "," & r.Bottom                               ' 3,4
Debug.Print GpRect(1, 1, 0, 5).IsEmptyArea                         ' True
Debug.Print r.IsEmptyArea                                          ' False
```

## Conversion

### AsGpRectF

Syntax: *rect*.**AsGpRectF**( ) As **GpRectF**

Returns the same rectangle with **Single** values.

### SetFrom

Syntax: *rect*.**SetFrom**( *source* As **GpRectF** )

Sets the rectangle from a [**GpRectF**](GpRectF), rounded as the constructor does.

### AsRECT, AsRECTF

Syntax: *rect*.**AsRECT**( ) As **GDIP_RECT** \
Syntax: *rect*.**AsRECTF**( ) As **GDIP_RECTF**

Return the rectangle as the four edges.

### SetFromRECT, SetFromRECTF

Syntax: *rect*.**SetFromRECT**( *source* As **GDIP_RECT** ) \
Syntax: *rect*.**SetFromRECTF**( *source* As **GDIP_RECTF** )

Set the position and size from the four edges of *source*. **SetFromRECTF** rounds.

### ToRECT

Syntax: *rect*.**ToRECT**( *destination* As **GDIP_RECT** )

Writes the four edges into *destination*.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRect = GpRect(10, 20, 30, 40)
Dim f As GpRectF = r.AsGpRectF()
Debug.Print f.Right & "," & f.Bottom                               ' 40,60
Dim edges As GDIP_RECT
r.ToRECT edges
Debug.Print edges.Left & "," & edges.Top & "," & edges.Right & "," & edges.Bottom   ' 10,20,40,60
Dim edgesF As GDIP_RECTF
edgesF.Left = 1.5: edgesF.Top = 2.5: edgesF.Right = 11.5: edgesF.Bottom = 22.5
r.SetFromRECTF edgesF
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height     ' 2,2,10,20
```

## Modifying methods

These change the rectangle they are called on.

### Offset, OffsetPt

Syntax: *rect*.**Offset**( *dx*, *dy* ) \
Syntax: *rect*.**OffsetPt**( *point* As **GpPoint** )

Moves the rectangle by the given distance.

### Inflate, InflatePt

Syntax: *rect*.**Inflate**( *dx*, *dy* ) \
Syntax: *rect*.**InflatePt**( *point* As **GpPoint** )

Moves the left and right edges apart by *dx* each and the top and bottom edges apart by *dy* each. **X** and **Y** decrease by *dx* and *dy*, and **Width** and **Height** increase by twice as much. A negative value shrinks the rectangle. **InflatePt** takes *dx* and *dy* from the point.

### Intersect

Syntax: *rect*.**Intersect**( *other* As **GpRect** ) As **Boolean**

Sets the rectangle to its intersection with *other*, and returns **True** when the result is not empty. When the two do not overlap the rectangle is set to one with a negative width or height.

### Unite

Syntax: *rect*.**Unite**( *other* As **GpRect** ) As **Boolean**

Sets the rectangle to the smallest rectangle that holds both it and *other*. Returns **False** when the result is empty, which happens only when both are empty rectangles at the same location: an empty rectangle counts as the single point at its location.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRect = GpRect(10, 20, 30, 40)
r.Offset 1, 2
Debug.Print r.X & "," & r.Y                                        ' 11,22
r.OffsetPt GpPoint(-1, -2)
r.Inflate 5, 6
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height      ' 5,14,40,52
r.InflatePt GpPoint(-5, -6)
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height      ' 10,20,30,40
Dim a As GpRect = GpRect(0, 0, 10, 10)
Dim b As GpRect = GpRect(5, 5, 10, 10)
Dim u As GpRect = a
Debug.Print a.Intersect(b)                                         ' True
Debug.Print a.X & "," & a.Y & "," & a.Width & "," & a.Height       ' 5,5,5,5
Debug.Print u.Unite(b)                                             ' True
Debug.Print u.X & "," & u.Y & "," & u.Width & "," & u.Height       ' 0,0,15,15
Debug.Print GpRect(1, 1).Unite(GpRect(1, 1))                       ' False
```

## Query methods

These return a new value and leave the rectangle unchanged.

### Equals

Syntax: *rect*.**Equals**( *other* As **GpRect** ) As **Boolean**

**True** when the position and the size equal those of *other*.

### Contains2, ContainsPt

Syntax: *rect*.**Contains2**( *x*, *y* ) As **Boolean** \
Syntax: *rect*.**ContainsPt**( *point* As **GpPoint** ) As **Boolean**

**True** when the point is inside the rectangle. The left and top edges are inside; the right and bottom edges are not.

### Contains

Syntax: *rect*.**Contains**( *other* As **GpRect** ) As **Boolean**

**True** when *other* lies entirely within the rectangle. Sharing an edge counts as within.

### IntersectsWith

Syntax: *rect*.**IntersectsWith**( *other* As **GpRect** ) As **Boolean**

**True** when the two rectangles overlap. Rectangles that only touch at an edge do not overlap.

### IntersectedWith, UnitedWith

Syntax: *rect*.**IntersectedWith**( *other* As **GpRect** ) As **GpRect** \
Syntax: *rect*.**UnitedWith**( *other* As **GpRect** ) As **GpRect**

Return the intersection or the bounding rectangle. As with [**Intersect**](#intersect) and [**Unite**](#unite), the intersection of rectangles that do not overlap has a negative width or height.

### OffsetBy, OffsetByPt, InflatedBy, InflatedByPt

Syntax: *rect*.**OffsetBy**( *dx*, *dy* ) As **GpRect** \
Syntax: *rect*.**OffsetByPt**( *point* As **GpPoint** ) As **GpRect** \
Syntax: *rect*.**InflatedBy**( *dx*, *dy* ) As **GpRect** \
Syntax: *rect*.**InflatedByPt**( *point* As **GpPoint** ) As **GpRect**

Return a copy of the rectangle moved or inflated as [**Offset**](#offset-offsetpt) and [**Inflate**](#inflate-inflatept) do.

> [!NOTE] 0.9.45.0, BETA 1005
> A program that names any of these four methods does not link: the linker reports a code generation error in the method. Copy the rectangle and call **Offset**, **OffsetPt**, **Inflate** or **InflatePt** on the copy.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRect = GpRect(10, 20, 30, 40)
Debug.Print r.Contains2(10, 20)                                    ' True
Debug.Print r.Contains2(40, 60)                                    ' False
Debug.Print r.ContainsPt(GpPoint(39, 59))                          ' True
Debug.Print r.Contains(GpRect(11, 21, 5, 5))                       ' True
Debug.Print r.IntersectsWith(GpRect(40, 60, 5, 5))                 ' False
Dim i As GpRect = r.IntersectedWith(GpRect(30, 40, 30, 40))
Debug.Print i.X & "," & i.Y & "," & i.Width & "," & i.Height       ' 30,40,10,20
Dim u As GpRect = r.UnitedWith(GpRect(30, 40, 30, 40))
Debug.Print u.X & "," & u.Y & "," & u.Width & "," & u.Height       ' 10,20,50,60
Debug.Print r.Equals(GpRect(10, 20, 30, 40))                       ' True
```

## Free-standing functions

### Intersection, Union

Syntax: **Intersection**( *result* As **GpRect**, *a* As **GpRect**, *b* As **GpRect** ) As **Boolean** \
Syntax: **Union**( *result* As **GpRect**, *a* As **GpRect**, *b* As **GpRect** ) As **Boolean**

Set *result* to the intersection of *a* and *b*, or to the smallest rectangle that holds both. Each returns **True** when the result is not empty. The functions also exist for [**GpRectF**](GpRectF) arguments.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As GpRect
Debug.Print Intersection(c, GpRect(0, 0, 10, 10), GpRect(5, 5, 10, 10))    ' True
Debug.Print c.X & "," & c.Y & "," & c.Width & "," & c.Height               ' 5,5,5,5
Debug.Print Union(c, GpRect(0, 0, 10, 10), GpRect(5, 5, 10, 10))           ' True
Debug.Print c.X & "," & c.Y & "," & c.Width & "," & c.Height               ' 0,0,15,15
```

## See Also

- [GpRectF](GpRectF) type -- the floating-point rectangle
- [GpPoint](GpPoint) type -- a point
- [GpSize](GpSize) type -- a size
- [Types](.) -- the types of the package
- [Rect](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-rect) -- the GDI+ class on Microsoft Learn
