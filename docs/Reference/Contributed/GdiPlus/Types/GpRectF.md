---
title: GpRectF
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpRectF
has_toc: false
---

# GpRectF type
{: .no_toc }

A rectangle with **Single** coordinates, whose sides are parallel to the axes.

<!-- test: Ty_GpRectFTests.GpRectF_IsSixteenBytes -->
**GpRectF** is the rectangle that the **Single** overloads of the drawing methods take and return. It is 16 bytes: the fields **X**, **Y**, **Width** and **Height**, followed by methods that read and change them. The integer counterpart is [**GpRect**](GpRect); a point is a [**GpPointF**](GpPointF) and a size a [**GpSizeF**](GpSizeF). It mirrors the `RectF` class of the GDI+ C++ wrapper.
<!-- /test -->


<!-- test: Ty_GpRectFTests.GpRectF_FormsGiveTheDocumentedValues -->
A variable declared with `Dim` starts as an empty rectangle at (0, 0).
<!-- /test -->

## Creating

Syntax: **GpRectF**( ) \
Syntax: **GpRectF**( *x*, *y* ) \
Syntax: **GpRectF**( *x*, *y*, *width*, *height* ) \
Syntax: **GpRectF**( *location* ) \
Syntax: **GpRectF**( *location*, *size* ) \
Syntax: **GpRectF**( *rect* ) \
Syntax: **GpRectFFrom**( *rect* )

<!-- test: Ty_GpRectFTests.GpRectF_FormsGiveTheDocumentedValues, Ty_GpRectFTests.GpRectF_OfTheEdgesStructureTakesWidthAndHeightAsDifferences -->
The module function **GpRectF** returns a new rectangle. The forms without a size give a rectangle of width 0 and height 0.

*x*, *y*, *width*, *height*
: *required* **Single** values: the top left corner and the dimensions.

*location*
: *required* A [**GpPointF**](GpPointF) giving the top left corner.

*size*
: *required* A [**GpSizeF**](GpSizeF) giving the dimensions.

*rect*
: *required* For **GpRectF**, a [**GpRect**](GpRect) or a structure of four **Single** fields `Left`, `Top`, `Right` and `Bottom`, declared as **GDIP_RECTF**. For **GpRectFFrom**, a structure of four **Long** fields with the same names, which is the layout of the Windows `RECT` and is declared as **GDIP_RECT**. The rectangle has the same position, and the width and height are the differences of the edges.
<!-- /test -->

<!-- test: Ty_GpRectFTests.GpRectFFrom_ReadsTheLongEdgesStructure -->
> [!WARNING] 0.9.45.0
> **GpRectFFrom** returns an empty rectangle at (0, 0) whatever its argument holds. Use [**SetFromRECT**](#setfromrect-setfromrectf) instead.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRectF = GpRectF(10, 20, 30, 40)
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height     ' 10,20,30,40
Dim p As GpRectF = GpRectF(GpPointF(5, 6), GpSizeF(7, 8))
Debug.Print p.X & "," & p.Y & "," & p.Width & "," & p.Height     ' 5,6,7,8
Dim q As GpRectF = GpRectF(GpRect(1, 2, 3, 4))
Debug.Print q.X & "," & q.Y & "," & q.Width & "," & q.Height     ' 1,2,3,4
Dim edges As GDIP_RECTF
edges.Left = 1.5: edges.Top = 2.5: edges.Right = 11.5: edges.Bottom = 22.5
Dim e As GpRectF = GpRectF(edges)
Debug.Print e.X & "," & e.Y & "," & e.Width & "," & e.Height     ' 1.5,2.5,10,20
```

## Fields and properties

<!-- test: Ty_GpRectFTests.Location_And_Size_AreIndependent -->
> [!NOTE] 0.9.45.0
> The location and the size are independent. Setting **Location** does not change the size, and setting **Size** does not change the location.

### X, Y, Width, Height

The top left corner and the dimensions, as **Single** fields. Assign them directly.

### Location

Syntax: *rect*.**Location** [ = *value* ] As **GpPointF**

Returns or sets the top left corner.

### Size

Syntax: *rect*.**Size** [ = *value* ] As **GpSizeF**

Returns or sets the width and height.

### Left, Top, Right, Bottom

Syntax: *rect*.**Left** As **Single**

<!-- test: Ty_GpRectFTests.Edges_AreXYAndXPlusWidthYPlusHeight -->
Read-only. The coordinates of the four edges: **Left** is **X**, **Top** is **Y**, **Right** is **X** plus **Width** and **Bottom** is **Y** plus **Height**.
<!-- /test -->

### TopLeft, TopRight, BottomLeft, BottomRight

Syntax: *rect*.**TopLeft** As **GpPointF**

<!-- test: Ty_GpRectFTests.Corners_AreThePointsOfTheRectangle -->
Read-only. The corners of the rectangle.
<!-- /test -->

### IsEmptyArea

Syntax: *rect*.**IsEmptyArea** As **Boolean**

<!-- test: Ty_GpRectFTests.IsEmptyArea_IsTrueForWidthOrHeightAtMostEpsilon -->
Read-only. **True** when the width or the height is at most [**REAL_EPSILON**](../Helpers#real_epsilon), which includes a negative one.
<!-- /test -->

### Diagonal

Syntax: *rect*.**Diagonal** [ = *value* ] As **Single**

<!-- test: Ty_GpRectFTests.Diagonal_GetAndSetScaleWidthAndHeightKeepingTheLocation, Ty_GpRectFTests.Diagonal_SetOfARectangleShorterThanTwiceEpsilonChangesNothing -->
Returns the length of the diagonal. Setting it scales **Width** and **Height** by the same factor so that the diagonal has the given length; the location does not change. A rectangle whose diagonal is shorter than twice [**REAL_EPSILON**](../Helpers#real_epsilon) is not changed.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRectF = GpRectF(10, 20, 30, 40)
Debug.Print r.Left & "," & r.Top & "," & r.Right & "," & r.Bottom   ' 10,20,40,60
Debug.Print r.TopRight.X & "," & r.BottomLeft.Y                    ' 40,60
r.Location = GpPointF(0, 0)
Debug.Print r.Width                                                ' 30
r.Size = GpSizeF(3, 4)
Debug.Print r.Diagonal                                             ' 5
r.Diagonal = 10
Debug.Print r.Width & "," & r.Height                               ' 6,8
Debug.Print GpRectF(1, 1, 0, 5).IsEmptyArea                        ' True
Debug.Print GpRectF(1, 1, -2, 5).IsEmptyArea                       ' True
Debug.Print r.IsEmptyArea                                          ' False
```

## Conversion

### AsGpRect

Syntax: *rect*.**AsGpRect**( ) As **GpRect**

<!-- test: Ty_GpRectFTests.AsGpRect_RoundsAllFourValuesHalvesToEven -->
Returns the rectangle with all four values rounded to whole numbers, halves to the even number.
<!-- /test -->

### SetFrom

Syntax: *rect*.**SetFrom**( *source* As **GpRect** )

<!-- test: Ty_GpRectFTests.SetFrom_TakesAGpRect -->
Sets the rectangle from a [**GpRect**](GpRect).
<!-- /test -->

### AsRECT, AsRECTF

Syntax: *rect*.**AsRECT**( ) As **GDIP_RECT** \
Syntax: *rect*.**AsRECTF**( ) As **GDIP_RECTF**

<!-- test: Ty_GpRectFTests.AsRECT_RoundsEachEdge, Ty_GpRectFTests.AsRECTF_And_ToRECTF_ReturnTheEdges -->
Return the rectangle as the four edges. **AsRECT** rounds each edge as **AsGpRect** does.
<!-- /test -->

### SetFromRECT, SetFromRECTF

Syntax: *rect*.**SetFromRECT**( *source* As **GDIP_RECT** ) \
Syntax: *rect*.**SetFromRECTF**( *source* As **GDIP_RECTF** )

<!-- test: Ty_GpRectFTests.SetFromRECT_And_SetFromRECTF_SetPositionAndSize -->
Set the position and size from the four edges of *source*.
<!-- /test -->

### ToRECTF

Syntax: *rect*.**ToRECTF**( *destination* As **GDIP_RECTF** )

<!-- test: Ty_GpRectFTests.AsRECTF_And_ToRECTF_ReturnTheEdges -->
Writes the four edges into *destination*.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRectF = GpRectF(1.5, 2.5, 3.5, 4.5)
Dim whole As GpRect = r.AsGpRect()
Debug.Print whole.X & "," & whole.Y & "," & whole.Width & "," & whole.Height   ' 2,2,4,4
Dim edges As GDIP_RECTF
r.ToRECTF edges
Debug.Print edges.Left & "," & edges.Top & "," & edges.Right & "," & edges.Bottom   ' 1.5,2.5,5,7
Dim winRect As GDIP_RECT
winRect.Left = 1: winRect.Top = 2: winRect.Right = 11: winRect.Bottom = 22
r.SetFromRECT winRect
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height                    ' 1,2,10,20
```

## Modifying methods

These change the rectangle they are called on.

### Offset, OffsetPt

Syntax: *rect*.**Offset**( *dx*, *dy* ) \
Syntax: *rect*.**OffsetPt**( *point* As **GpPointF** )

<!-- test: Ty_GpRectFTests.Offset_And_OffsetPt_MoveTheRectangle -->
Moves the rectangle by the given distance.
<!-- /test -->

### Inflate, InflatePt

Syntax: *rect*.**Inflate**( *dx*, *dy* ) \
Syntax: *rect*.**InflatePt**( *point* As **GpPointF** )

<!-- test: Ty_GpRectFTests.Inflate_And_InflatePt_MoveTheEdgesApart -->
Moves the left and right edges apart by *dx* each and the top and bottom edges apart by *dy* each. **X** and **Y** decrease by *dx* and *dy*, and **Width** and **Height** increase by twice as much. A negative value shrinks the rectangle. **InflatePt** takes *dx* and *dy* from the point.
<!-- /test -->

### Intersect

Syntax: *rect*.**Intersect**( *other* As **GpRectF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.Intersect_SetsTheIntersection, Ty_GpRectFTests.Intersect_OfRectanglesThatDoNotOverlapGivesNegativeSize -->
Sets the rectangle to its intersection with *other*, and returns **True** when the result is not empty. When the two do not overlap the rectangle is set to one with a negative width or height.
<!-- /test -->

### Unite

Syntax: *rect*.**Unite**( *other* As **GpRectF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.Unite_SetsTheBoundingRectangle, Ty_GpRectFTests.Unite_OfTwoEmptyRectanglesAtTheSameLocationIsFalse -->
Sets the rectangle to the smallest rectangle that holds both it and *other*. Returns **False** when the result is empty, which happens only when both are empty rectangles at the same location: an empty rectangle counts as the single point at its location.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRectF = GpRectF(10, 20, 30, 40)
r.Offset 1, 2
Debug.Print r.X & "," & r.Y                                        ' 11,22
r.OffsetPt GpPointF(-1, -2)
r.Inflate 5, 6
Debug.Print r.X & "," & r.Y & "," & r.Width & "," & r.Height      ' 5,14,40,52
Dim a As GpRectF = GpRectF(0, 0, 10, 10)
Dim b As GpRectF = GpRectF(5, 5, 10, 10)
Dim u As GpRectF = a
Debug.Print a.Intersect(b)                                         ' True
Debug.Print a.X & "," & a.Y & "," & a.Width & "," & a.Height       ' 5,5,5,5
Debug.Print u.Unite(b)                                             ' True
Debug.Print u.X & "," & u.Y & "," & u.Width & "," & u.Height       ' 0,0,15,15
Dim far As GpRectF = GpRectF(100, 100, 5, 5)
Debug.Print b.Intersect(far)                                       ' False
Debug.Print b.Width & "," & b.Height                               ' -85,-85
```

## Query methods

These return a new value and leave the rectangle unchanged.

### Equals

Syntax: *rect*.**Equals**( *other* As **GpRectF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.Equals_IsExact -->
**True** when the position and the size are exactly those of *other*.
<!-- /test -->

### Contains2, ContainsPt

Syntax: *rect*.**Contains2**( *x*, *y* ) As **Boolean** \
Syntax: *rect*.**ContainsPt**( *point* As **GpPointF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.Contains2_And_ContainsPt_IncludeLeftAndTopEdgesButNotRightAndBottom -->
**True** when the point is inside the rectangle. The left and top edges are inside; the right and bottom edges are not.
<!-- /test -->

### Contains

Syntax: *rect*.**Contains**( *other* As **GpRectF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.Contains_CountsSharingAnEdgeAsWithin -->
**True** when *other* lies entirely within the rectangle. Sharing an edge counts as within.
<!-- /test -->

### IntersectsWith

Syntax: *rect*.**IntersectsWith**( *other* As **GpRectF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.IntersectsWith_RectanglesThatOnlyTouchDoNotOverlap -->
**True** when the two rectangles overlap. Rectangles that only touch at an edge do not overlap.
<!-- /test -->

### IntersectedWith, UnitedWith

Syntax: *rect*.**IntersectedWith**( *other* As **GpRectF** ) As **GpRectF** \
Syntax: *rect*.**UnitedWith**( *other* As **GpRectF** ) As **GpRectF**

<!-- test: Ty_GpRectFTests.IntersectedWith_And_UnitedWith_ReturnNewRectangles -->
Return the intersection or the bounding rectangle. As with [**Intersect**](#intersect) and [**Unite**](#unite), the intersection of rectangles that do not overlap has a negative width or height.
<!-- /test -->

### OffsetBy, OffsetByPt, InflatedBy, InflatedByPt

Syntax: *rect*.**OffsetBy**( *dx*, *dy* ) As **GpRectF** \
Syntax: *rect*.**OffsetByPt**( *point* As **GpPointF** ) As **GpRectF** \
Syntax: *rect*.**InflatedBy**( *dx*, *dy* ) As **GpRectF** \
Syntax: *rect*.**InflatedByPt**( *point* As **GpPointF** ) As **GpRectF**

Return a copy of the rectangle moved or inflated as [**Offset**](#offset-offsetpt) and [**Inflate**](#inflate-inflatept) do.

<!-- test: none -- the linker rejects the program, and the compile-case runner sees only the diagnostics of the editor -->
> [!NOTE] 0.9.45.0, BETA 1010
> A program that names any of these four methods does not link: the linker reports a code generation error in the method. Copy the rectangle and call **Offset**, **OffsetPt**, **Inflate** or **InflatePt** on the copy.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As GpRectF = GpRectF(10, 20, 30, 40)
Debug.Print r.Contains2(10, 20)                                    ' True
Debug.Print r.Contains2(40, 60)                                    ' False
Debug.Print r.ContainsPt(GpPointF(39.5, 59.5))                     ' True
Debug.Print r.Contains(GpRectF(11, 21, 5, 5))                      ' True
Debug.Print r.Contains(GpRectF(5, 5, 30, 40))                      ' False
Debug.Print r.IntersectsWith(GpRectF(40, 60, 5, 5))                ' False
Debug.Print r.IntersectsWith(GpRectF(30, 40, 30, 40))              ' True
Dim i As GpRectF = r.IntersectedWith(GpRectF(30, 40, 30, 40))
Debug.Print i.X & "," & i.Y & "," & i.Width & "," & i.Height       ' 30,40,10,20
Dim u As GpRectF = r.UnitedWith(GpRectF(30, 40, 30, 40))
Debug.Print u.X & "," & u.Y & "," & u.Width & "," & u.Height       ' 10,20,50,60
Debug.Print r.Equals(GpRectF(10, 20, 30, 40))                      ' True
```

## Free-standing functions

### Intersection, Union

Syntax: **Intersection**( *result* As **GpRectF**, *a* As **GpRectF**, *b* As **GpRectF** ) As **Boolean** \
Syntax: **Union**( *result* As **GpRectF**, *a* As **GpRectF**, *b* As **GpRectF** ) As **Boolean**

<!-- test: Ty_GpRectFTests.Intersection_And_Union_SetTheResult -->
Set *result* to the intersection of *a* and *b*, or to the smallest rectangle that holds both. Each returns **True** when the result is not empty. The functions also exist for [**GpRect**](GpRect) arguments.
<!-- /test -->

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim c As GpRectF
Debug.Print Intersection(c, GpRectF(0, 0, 10, 10), GpRectF(5, 5, 10, 10))    ' True
Debug.Print c.X & "," & c.Y & "," & c.Width & "," & c.Height                 ' 5,5,5,5
Debug.Print Union(c, GpRectF(0, 0, 10, 10), GpRectF(5, 5, 10, 10))           ' True
Debug.Print c.X & "," & c.Y & "," & c.Width & "," & c.Height                 ' 0,0,15,15
```

## See Also

- [GpRect](GpRect) type -- the integer rectangle
- [GpPointF](GpPointF) type -- a point
- [GpSizeF](GpSizeF) type -- a size
- [Types](.) -- the types of the package
- [RectF](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-rectf) -- the GDI+ class on Microsoft Learn
