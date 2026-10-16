---
title: GraphicsPath
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/GraphicsPath
---

# GraphicsPath class
{: .no_toc }

A **GraphicsPath** stores a sequence of connected lines, curves and shapes that can be drawn, filled, used as a clip or turned into a [**Region**](Region).

A path is made of one or more *figures*. The lines and curves added one after another belong to the same figure and are connected: the end of one is the start of the next, and the figure stays open until it is closed. A shape that is closed by nature, such as a rectangle, an ellipse, a pie, a polygon or a string, is a figure of its own. [**StartFigure**](#startfigure) begins a new figure without closing the old one, and [**CloseFigure**](#closefigure) closes the current figure and begins a new one.

The path stores its outline as an array of points and an array of *point types*. The type of a point says whether it begins a figure, ends a line, or is one of the three points that define a cubic Bézier curve after the previous point. The type also records whether the figure is closed, and whether the point has a marker or is in a dash. A point type is a [**PathPointType**](Types/PathPointType). [**PathIterator**](PathIterator) reads the figures and markers one after another.

A path is drawn with the **DrawPath** method of [**Graphics**](Graphics) and filled with **FillPath**; how a filled area is found depends on the [fill mode](#fillmode).

Most members return a [**GpStatus**](Enumerations/GpStatus), which is **Ok** when the call worked. A property that fails records its status in **LastResult**, as every object of the package does. See [**GdiPlusBase**](GdiPlusBase). Members that take coordinates exist in a floating-point and an integer form. The floating-point form takes **Single** values, a [**GpPointF**](Types/GpPointF) or a [**GpRectF**](Types/GpRectF). The integer form takes [**GpPoint**](Types/GpPoint) or [**GpRect**](Types/GpRect), or, where the member has four loose coordinates, is the method with the extra letter **I** in its name, such as **AddLineI**, which takes **Long** values.

## Creating

Syntax: *path* **= GraphicsPath(** [ *fillMode* ] **)**

Syntax: *path* **= New GraphicsPath(** [ *fillMode* ] **)**

The function **GraphicsPath** and **New GraphicsPath** are the same thing, and take the same arguments.

*fillMode*
: *optional* A [**GpFillmode**](Enumerations/GpFillmode): **FillModeAlternate**, the default, or **FillModeWinding**.

Creates an empty path.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
Dim w As GraphicsPath = GraphicsPath(FillModeWinding)
Debug.Print p.FillMode & " " & w.FillMode & " " & p.PointCount     ' 0 1 0
```

Syntax: *path* **= GraphicsPath(** *pathData* [, *fillMode* ] **)**

Syntax: *path* **= GraphicsPath(** *typedPoints*() [, *fillMode* ] **)**

Syntax: *path* **= GraphicsPath(** *points*(), *types*() [, *fillMode* ] **)**

These forms create a path from existing point data: a [**PathData**](PathData), an array of [**TypedPoint**](Types/TypedPoint), or an array of **GpPointF** or **GpPoint** together with an array of [**PathPointType**](Types/PathPointType) of the same length.

<!-- test: Br_PathTests.New_PathData_CreatesThePath, Br_PathTests.New_TypedPoints_CreatesThePath, Br_PathTests.New_PointsAndTypes_CreatesThePath, Br_PathTests.New_GpPointsAndTypes_CreatesThePath, Br_PathTests.GetPoints_EmptyPath_RaisesUnspecifiedError -->
> [!WARNING] 0.9.45.0
> The forms that take point data do not create the path they are given. The call reports no error, and the path is empty: **PointCount** is 0, and a call of **GetPoints** on it raises an error. With an array of **GpPoint** the call records **OutOfMemory** in a 64-bit program and stops a 32-bit program with an access violation. Build the path with the **Add** methods instead.

### Clone
{: .no_toc }

Syntax: *path*.**Clone** **As GraphicsPath**

Returns a new path with the same points, point types and fill mode. A change to one path does not change the other.

<!-- test: Br_PathTests.Clone_IsIndependent -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 1, 2, 10, 20
Dim c As GraphicsPath = p.Clone
p.AddRectangle 0, 0, 5, 5
Debug.Print p.PointCount & " " & c.PointCount                     ' 8 4
```
<!-- /test -->

## Properties

### FillMode
{: .no_toc }

Syntax: *path*.**FillMode** [ **=** *fillMode* ]

A [**GpFillmode**](Enumerations/GpFillmode) that decides which areas of a path that crosses itself, or has figures inside each other, count as inside when the path is filled or tested. It is also used when a path becomes a [**Region**](Region). **Reset** sets it back to **FillModeAlternate**.

With **FillModeAlternate**, a point is inside if a ray from it to infinity crosses an odd number of the path's lines. With **FillModeWinding**, a point is inside if the lines crossed do not cancel out, counting a line one way as +1 and the other way as -1. Two rectangles added to a path run in the same direction. The inner one is a hole with the alternate mode and is filled with the winding mode:

<!-- test: Br_PathTests.FillMode_WindingFillsTheInnerRectangleAlternateDoesNot -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.AddRectangle 2, 2, 6, 6
Debug.Print p.IsVisible(5, 5)         ' False
p.FillMode = FillModeWinding
Debug.Print p.IsVisible(5, 5)         ' True
```
<!-- /test -->

### PointCount
{: .no_toc }

Syntax: *path*.**PointCount** **As Long**

The number of points in the path. The same number of point types exists.

### LastPoint
{: .no_toc }

Syntax: *path*.**LastPoint** **As GpPointF**

The last point of the path: the end of the last figure. An empty path has no last point and the property records an error in **LastResult**.

<!-- test: Br_PathTests.LastPoint_IsTheEndOfTheLastFigure -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 20
Dim pt As GpPointF = p.LastPoint
Debug.Print pt.X & " " & pt.Y         ' 10 20
```
<!-- /test -->

### PathData
{: .no_toc }

Syntax: *path*.**PathData** **As PathData**

Returns the points and point types of the path as a [**PathData**](PathData).

<!-- test: Br_PathTests.PathData_Get_ReturnsThePoints -->
> [!NOTE] 0.9.45.0
> The property returns **Nothing** and records **InvalidParameter** in **LastResult**, whatever the path holds. Read the points with [**GetPoints**](#getpoints) and the point types with [**GetTypes**](#gettypes).

## Figures and markers

This example makes a path of two figures, closes the second, and lists the types the points get. A type is a number: 0 begins a figure, 1 is a line, 3 is part of a Bézier curve, and the letters show the close flag **c** and the marker flag **m**.

<!-- test: Br_PathTests.Types_OfTwoFiguresWithAClosedOneAndAMarker -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 5, 5
p.StartFigure
p.AddLine 10, 10, 15, 15
p.AddLine 15, 15, 20, 10
p.CloseFigure
p.SetMarker

Dim ty() As PathPointType
p.GetTypes ty
Dim t As PathPointType
Dim i As Long, s As String
For i = 1 To UBound(ty)
    t = ty(i)
    s &= CLng(t.PointType) & IIf(t.CloseSubpath, "c", "") & IIf(t.PathMarker, "m", "") & " "
Next
Debug.Print s                         ' 0 1 0 1 1cm
```
<!-- /test -->

### Reset
{: .no_toc }

Syntax: *path*.**Reset** **As GpStatus**

Empties the path and sets its fill mode to **FillModeAlternate**.

### StartFigure
{: .no_toc }

Syntax: *path*.**StartFigure** **As GpStatus**

Begins a new figure without closing the current one. The next line or curve is not connected to the end of the previous one.

### CloseFigure
{: .no_toc }

Syntax: *path*.**CloseFigure** **As GpStatus**

Closes the current figure by marking its last point with the close flag, and begins a new figure. When the path is drawn, the last point is connected to the first point of the figure. A figure that is closed by nature, such as a rectangle, needs no call.

### CloseAllFigures
{: .no_toc }

Syntax: *path*.**CloseAllFigures** **As GpStatus**

Closes every open figure of the path, as **CloseFigure** closes the current one.

### SetMarker
{: .no_toc }

Syntax: *path*.**SetMarker** **As GpStatus**

Marks the last point of the path as a marker. Markers divide the path into sections that [**PathIterator**](PathIterator#nextmarker) reads one after another.

### ClearMarkers
{: .no_toc }

Syntax: *path*.**ClearMarkers** **As GpStatus**

Removes all markers from the path.

### Reverse
{: .no_toc }

Syntax: *path*.**Reverse** **As GpStatus**

Reverses the order of the points, so that the path runs from its last point to its first. The figures are reversed too: the first figure of the result ends where the last figure of the path began.

## Adding lines and curves

An *Add* method appends to the current figure. If the figure has points, the first new point is connected to the last point of the figure by a line. To avoid the connecting line, call [**StartFigure**](#startfigure) first.

### AddLine
{: .no_toc }

Syntax: *path*.**AddLine(** *x1*, *y1*, *x2*, *y2* **)** **As GpStatus**

Syntax: *path*.**AddLine(** *pt1*, *pt2* **)** **As GpStatus**

Syntax: *path*.**AddLineI(** *x1*, *y1*, *x2*, *y2* **)** **As GpStatus**

*x1*, *y1*, *x2*, *y2*
: *required* Coordinates of the two ends, **Single** for **AddLine** and **Long** for **AddLineI**.

*pt1*, *pt2*
: *required* The two ends, as [**GpPointF**](Types/GpPointF) or as [**GpPoint**](Types/GpPoint).

Adds a line from *pt1* to *pt2*. When the figure already has points, a line from its last point to *pt1* is added first.

### AddLines
{: .no_toc }

Syntax: *path*.**AddLines(** *points*() **)** **As GpStatus**

*points*
: *required* An array of **GpPointF** or **GpPoint**.

Adds a series of connected lines through the points.

<!-- test: Br_PathTests.Lines_AddLines_AndBeziers_PointCounts -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 10
Debug.Print p.PointCount                                       ' 2
Dim pts(1 To 3) As GpPointF
pts(1) = GpPointF(20, 0): pts(2) = GpPointF(30, 10): pts(3) = GpPointF(20, 20)
p.AddLines pts
Debug.Print p.PointCount                                       ' 5
```
<!-- /test -->

### AddArc
{: .no_toc }

Syntax: *path*.**AddArc(** *rect*, *startAngle*, *sweepAngle* **)** **As GpStatus**

Syntax: *path*.**AddArc(** *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* **)** **As GpStatus**

Syntax: *path*.**AddArcI(** *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* **)** **As GpStatus**

*rect*
: *required* A [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect) that bounds the ellipse the arc is part of.

*x*, *y*, *width*, *height*
: *required* The same rectangle as four numbers, **Single** for **AddArc** and **Long** for **AddArcI**.

*startAngle*
: *required* A **Single** angle in degrees, measured clockwise from the x axis, where the arc begins.

*sweepAngle*
: *required* A **Single** angle in degrees, where the arc ends, relative to *startAngle*. A positive angle turns clockwise.

Adds an elliptical arc as one or more Bézier curves. Where the figure already has points, a line to the start of the arc is added first.

### AddBezier
{: .no_toc }

Syntax: *path*.**AddBezier(** *x1*, *y1*, *x2*, *y2*, *x3*, *y3*, *x4*, *y4* **)** **As GpStatus**

Syntax: *path*.**AddBezier(** *pt1*, *pt2*, *pt3*, *pt4* **)** **As GpStatus**

Syntax: *path*.**AddBezierI(** *x1*, *y1*, ..., *x4*, *y4* **)** **As GpStatus**

Adds a cubic Bézier curve. The points are the start, the first control point, the second control point and the end. The curve is the three point types 3 after a start or line point.

### AddBeziers
{: .no_toc }

Syntax: *path*.**AddBeziers(** *points*() **)** **As GpStatus**

*points*
: *required* An array of **GpPointF** or **GpPoint**. It holds the start point, then three points for each curve, so its length is 3n + 1 for n curves. An array of any other length is refused with **InvalidParameter**.

Adds a series of connected Bézier curves.

<!-- test: Br_PathTests.AddBeziers_NeedsThreeNPlusOnePoints -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddBezier 0, 0, 5, 10, 15, 10, 20, 0
Debug.Print p.PointCount                                       ' 4
Dim pts(1 To 7) As GpPointF
pts(1) = GpPointF(0, 0): pts(2) = GpPointF(5, 10): pts(3) = GpPointF(15, 10): pts(4) = GpPointF(20, 0)
pts(5) = GpPointF(25, -10): pts(6) = GpPointF(35, -10): pts(7) = GpPointF(40, 0)
Dim q As GraphicsPath = GraphicsPath()
Debug.Print q.AddBeziers(pts) & " " & q.PointCount             ' 0 7
Dim r(1 To 3) As GpPointF
Debug.Print q.AddBeziers(r)                                    ' 2
```
<!-- /test -->

### AddCurve
{: .no_toc }

Syntax: *path*.**AddCurve(** *points*() [, *tension* ] **)** **As GpStatus**

Syntax: *path*.**AddCurve(** *points*(), *offset*, *numberOfSegments*, *tension* **)** **As GpStatus**

*points*
: *required* An array of **GpPointF** or **GpPoint** that the curve passes through.

*tension*
: *optional* A **Single** that sets how sharply the curve bends at the points. 0 gives straight lines, and the default, 0.5, a smooth curve. Larger values make the curve overshoot.

*offset*
: *required* The index of the array element at which the curve starts, counted from 0.

*numberOfSegments*
: *required* The number of segments, each between two points, to draw.

Adds a cardinal spline, drawn as Bézier curves.

### AddClosedCurve
{: .no_toc }

Syntax: *path*.**AddClosedCurve(** *points*() [, *tension* ] **)** **As GpStatus**

Adds a closed cardinal spline through the points. It is a figure of its own.

<!-- test: Br_PathTests.Curves_PointCounts -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim pts(1 To 3) As GpPointF
pts(1) = GpPointF(0, 0): pts(2) = GpPointF(5, 10): pts(3) = GpPointF(10, 0)
Dim p As GraphicsPath = GraphicsPath()
p.AddCurve pts
Debug.Print p.PointCount                                       ' 7
Dim c As GraphicsPath = GraphicsPath()
c.AddClosedCurve pts
Debug.Print c.PointCount                                       ' 10
```
<!-- /test -->

## Adding shapes

### AddRectangle
{: .no_toc }

Syntax: *path*.**AddRectangle(** *rect* **)** **As GpStatus**

Syntax: *path*.**AddRectangle(** *x*, *y*, *width*, *height* **)** **As GpStatus**

Syntax: *path*.**AddRectangleI(** *x*, *y*, *width*, *height* **)** **As GpStatus**

Adds a closed figure of four points. The rectangle is a figure of its own.

### AddRectangles
{: .no_toc }

Syntax: *path*.**AddRectangles(** *rects*() **)** **As GpStatus**

*rects*
: *required* An array of [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect).

Adds each rectangle as a figure of its own.

### AddEllipse
{: .no_toc }

Syntax: *path*.**AddEllipse(** *rect* **)** **As GpStatus**

Syntax: *path*.**AddEllipse(** *x*, *y*, *width*, *height* **)** **As GpStatus**

Syntax: *path*.**AddEllipseI(** *x*, *y*, *width*, *height* **)** **As GpStatus**

Adds a closed ellipse that fits in the rectangle, as a figure of its own. It consists of 13 points: the start point and four Bézier curves.

### AddPie
{: .no_toc }

Syntax: *path*.**AddPie(** *rect*, *startAngle*, *sweepAngle* **)** **As GpStatus**

Syntax: *path*.**AddPie(** *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* **)** **As GpStatus**

Syntax: *path*.**AddPieI(** *x*, *y*, *width*, *height*, *startAngle*, *sweepAngle* **)** **As GpStatus**

Adds a closed pie slice: an arc, as for [**AddArc**](#addarc), with a line from each end to the centre of the ellipse. It is a figure of its own.

### AddPolygon
{: .no_toc }

Syntax: *path*.**AddPolygon(** *points*() **)** **As GpStatus**

*points*
: *required* An array of **GpPointF** or **GpPoint**, with at least three points.

Adds a closed polygon, as a figure of its own. The last point need not repeat the first.

<!-- test: Br_PathTests.Shapes_PointCounts -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.AddEllipse 20, 0, 10, 10
Dim tri(1 To 3) As GpPointF
tri(1) = GpPointF(40, 0): tri(2) = GpPointF(50, 0): tri(3) = GpPointF(45, 8)
p.AddPolygon tri
Debug.Print p.PointCount                                       ' 20
```
<!-- /test -->

### AddPath
{: .no_toc }

Syntax: *path*.**AddPath(** *addingPath*, *connect* **)** **As GpStatus**

*addingPath*
: *required* The **GraphicsPath** whose figures are copied. It is not changed.

*connect*
: *required* A **Boolean**. When it is **True**, the first figure of *addingPath* continues the current figure of this path instead of starting a new one.

Adds the points of *addingPath* to the end of this path.

### AddString
{: .no_toc }

Syntax: *path*.**AddString(** *string*, *family*, *style*, *emSize*, *origin*, *format* **)** **As GpStatus**

Syntax: *path*.**AddString(** *string*, *family*, *style*, *emSize*, *layoutRect*, *format* **)** **As GpStatus**

*string*
: *required* The **String** whose outline is added.

*family*
: *required* The [**FontFamily**](FontFamily) of the text.

*style*
: *required* A **Long** made of [**GpFontStyle**](Enumerations/GpFontStyle) flags, such as **FontStyleRegular**.

*emSize*
: *required* A **Single** height of the em square, in the units of the path's coordinates.

*origin*
: *required* A [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint), the top-left corner of the text.

*layoutRect*
: *required* A [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect) in which the text is laid out and wrapped.

*format*
: *required* The [**StringFormat**](StringFormat) that sets the alignment and the wrapping. It can be **Nothing**.

Adds the outlines of the characters of *string*, so that text can be filled, used as a clip, or reshaped like any other path. The shape of the characters depends on the fonts installed.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
Dim family As FontFamily = FontFamily("Arial")
p.AddString "Hello", family, FontStyleRegular, 24, GpPointF(0, 0), StringFormat()
```

## Changing a path

### Transform
{: .no_toc }

Syntax: *path*.**Transform(** *matrix* **)** **As GpStatus**

*matrix*
: *required* A [**Matrix**](Matrix) to apply to every point. **Nothing** leaves the path as it is and returns **Ok**.

Multiplies each point by the matrix.

<!-- test: Br_PathTests.Transform_MultipliesEveryPoint -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 1, 1, 2, 2
Dim m As Matrix = Matrix(2, 0, 0, 3, 10, 20)
p.Transform m
Dim pt As GpPointF = p.LastPoint
Debug.Print pt.X & " " & pt.Y         ' 14 26
```
<!-- /test -->

### Flatten
{: .no_toc }

Syntax: *path*.**Flatten(** [ *matrix* ], [ *flatness* ] **)** **As GpStatus**

*matrix*
: *optional* A [**Matrix**](Matrix) applied before flattening. The default is no transformation.

*flatness*
: *optional* A **Single**, the largest distance, in the units of the path, between a curve and the lines that replace it. The default is 0.25, which the constant **FlatnessDefault** holds. A smaller value gives more lines.

Replaces every curve with a series of straight lines. The curve information is lost.

<!-- test: Br_PathTests.Flatten_ReplacesTheCurvesWithLines -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddEllipse 0, 0, 100, 100
Dim ty() As PathPointType
Dim t As PathPointType
Dim i As Long, n As Long
p.GetTypes ty
For i = 1 To UBound(ty)
    t = ty(i)
    If t.PointType = PathPointTypeBezier Then n += 1
Next
Debug.Print p.PointCount & " " & n                ' 13 12
p.Flatten
p.GetTypes ty
n = 0
For i = 1 To UBound(ty)
    t = ty(i)
    If t.PointType = PathPointTypeBezier Then n += 1
Next
Debug.Print (p.PointCount > 13) & " " & n         ' True 0
```
<!-- /test -->

### Widen
{: .no_toc }

Syntax: *path*.**Widen(** *pen*, [ *matrix* ], [ *flatness* ] **)** **As GpStatus**

*pen*
: *required* The [**Pen**](Pen) whose width, dashes, caps and joins decide the outline.

*matrix*, *flatness*
: *optional* As for **Flatten**.

Replaces the path with the outline of the area that the pen paints when it draws the path. The outline is flattened and its fill mode is **FillModeWinding**.

<!-- test: Br_PathTests.Widen_ReplacesTheLineWithTheOutlineOfItsStroke -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 0
Dim pn As Pen = Pen(Color(255, 255, 0, 0), 2)
p.Widen pn
Debug.Print p.PointCount & " " & p.FillMode       ' 4 1
Dim b As GpRectF
p.GetWorldBounds b, Nothing, Nothing
Debug.Print b.Y & " " & b.Height                  ' -1 2
```
<!-- /test -->

### Outline
{: .no_toc }

Syntax: *path*.**Outline(** [ *matrix* ], [ *flatness* ] **)** **As GpStatus**

*matrix*, *flatness*
: *optional* As for **Flatten**.

Flattens the path and replaces it with the outline of the area that **FillModeWinding** fills. Where figures overlap, only the outer boundary remains.

<!-- test: Br_PathTests.Outline_KeepsTheOuterBoundaryOfOverlappingFigures -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.AddRectangle 5, 5, 10, 10
p.FillMode = FillModeWinding
Dim ty() As PathPointType
Dim t As PathPointType
Dim i As Long, n As Long
p.GetTypes ty
For i = 1 To UBound(ty)
    t = ty(i)
    If t.PointType = PathPointTypeStart Then n += 1
Next
Debug.Print n                                     ' 2
p.Outline
p.GetTypes ty
n = 0
For i = 1 To UBound(ty)
    t = ty(i)
    If t.PointType = PathPointTypeStart Then n += 1
Next
Debug.Print n                                     ' 1
```
<!-- /test -->

### Warp
{: .no_toc }

Syntax: *path*.**Warp(** *destPoints*(), *srcRect*, [ *matrix* ], [ *warpMode* ], [ *flatness* ] **)** **As GpStatus**

Syntax: *path*.**Warp(** *destPoints*(), *srcX*, *srcY*, *srcWidth*, *srcHeight*, [ *matrix* ], [ *warpMode* ], [ *flatness* ] **)** **As GpStatus**

*destPoints*
: *required* An array of **GpPointF** with three or four points: the images of the top-left, top-right and bottom-left corners of the source rectangle, and, with four points, of the bottom-right corner. With three points the warp is a parallelogram transformation.

*srcRect*, *srcX*, *srcY*, *srcWidth*, *srcHeight*
: *required* The rectangle that is mapped to the destination, as a [**GpRectF**](Types/GpRectF) or as four **Single** values. There is no integer overload.

*matrix*
: *optional* A [**Matrix**](Matrix) applied after the warp.

*warpMode*
: *optional* A [**GpWarpMode**](Enumerations/GpWarpMode): **WarpModePerspective**, the default, or **WarpModeBilinear**.

*flatness*
: *optional* As for [**Flatten**](#flatten).

Warps the path so that the source rectangle fills the quadrilateral given by the destination points, and flattens it. The curve information is lost.

<!-- test: Br_PathTests.Warp_MapsTheSourceRectangleToTheQuadrilateral -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
Dim dst(1 To 4) As GpPointF
dst(1) = GpPointF(0, 0): dst(2) = GpPointF(20, 0)
dst(3) = GpPointF(0, 10): dst(4) = GpPointF(20, 10)
Debug.Print p.Warp(dst, GpRectF(0, 0, 10, 10))    ' 0
Dim b As GpRectF
p.GetWorldBounds b, Nothing, Nothing
Debug.Print Round(b.Width, 2) & " " & Round(b.Height, 2)      ' 20 10
```
<!-- /test -->

## Reading a path

### GetPoints
{: .no_toc }

Syntax: *path*.**GetPoints(** *points*() **)** **As GpStatus**

*points*
: *required* A dynamic array of **GpPointF** or **GpPoint**. The call sizes it to the number of points, with indexes 1 to **PointCount**, and fills it.

<!-- test: Br_PathTests.GetPoints_EmptyPath_RaisesUnspecifiedError -->
> [!NOTE] 0.9.45.0
> On an empty path the call raises run-time error -2147467259, *Unspecified error*. Check **PointCount** first.

### GetTypes
{: .no_toc }

Syntax: *path*.**GetTypes(** *types*() **)** **As GpStatus**

*types*
: *required* A dynamic array of [**PathPointType**](Types/PathPointType). The call sizes it to the number of points, with indexes 1 to **PointCount**, and fills it.

<!-- test: Br_PathTests.GetTypes_EmptyPath_RaisesUnspecifiedError -->
> [!NOTE] 0.9.45.0
> On an empty path the call raises run-time error -2147467259, *Unspecified error*. Check **PointCount** first.

<!-- test: Br_PathTests.GetPoints_ListsThePointsFromIndexOne -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 1, 2, 10, 20
Dim pts() As GpPointF
p.GetPoints pts
Dim i As Long, s As String
For i = 1 To UBound(pts)
    s &= "(" & pts(i).X & "," & pts(i).Y & ") "
Next
Debug.Print s                         ' (1,2) (11,2) (11,22) (1,22)
```
<!-- /test -->

### GetWorldBounds
{: .no_toc }

Syntax: *path*.**GetWorldBounds(** *bounds*, *matrix*, *pen* **)** **As GpStatus**

*bounds*
: *required* A [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect) variable that receives the rectangle. The integer form rounds outward.

*matrix*
: *required* A [**Matrix**](Matrix) applied to the path before its bounds are found, or **Nothing**.

*pen*
: *required* A [**Pen**](Pen). When given, the bounds also hold the area the pen paints when it draws the path, wide corners and caps included. **Nothing** gives the bounds of the path itself.

Finds a rectangle that holds the path. The rectangle need not be the smallest one: for a curve it can be larger than the curve, and with a pen it can be much larger than the line.

<!-- test: Br_PathTests.GetWorldBounds_OfARectangle -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 1, 2, 10, 20
Dim b As GpRectF
p.GetWorldBounds b, Nothing, Nothing
Debug.Print b.X & " " & b.Y & " " & b.Width & " " & b.Height   ' 1 2 10 20
```
<!-- /test -->

## Hit testing

### IsVisible
{: .no_toc }

Syntax: *path*.**IsVisible(** *point*, [ *g* ] **)** **As Boolean**

Syntax: *path*.**IsVisible(** *x*, *y*, [ *g* ] **)** **As Boolean**

Syntax: *path*.**IsVisibleI(** *x*, *y*, [ *g* ] **)** **As Boolean**

*point*
: *required* A [**GpPointF**](Types/GpPointF) or [**GpPoint**](Types/GpPoint).

*x*, *y*
: *required* The coordinates, **Single** for **IsVisible** and **Long** for **IsVisibleI**.

*g*
: *optional* A [**Graphics**](Graphics). When given, the point is taken in the coordinates of that object, after its transformation.

Returns **True** when the point is inside the area that is filled when the path is filled, as the [fill mode](#fillmode) decides.

### IsOutlineVisible
{: .no_toc }

Syntax: *path*.**IsOutlineVisible(** *point*, *pen*, [ *g* ] **)** **As Boolean**

Syntax: *path*.**IsOutlineVisible(** *x*, *y*, *pen*, [ *g* ] **)** **As Boolean**

Syntax: *path*.**IsOutlineVisibleI(** *x*, *y*, *pen*, [ *g* ] **)** **As Boolean**

*pen*
: *required* The [**Pen**](Pen) whose width, caps and joins decide how much the outline covers.

The other arguments are as for **IsVisible**. Returns **True** when the point touches the outline of the path, drawn with the pen.

<!-- test: Br_PathTests.IsVisible_AndIsOutlineVisible -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
Dim pn As Pen = Pen(Color(255, 255, 0, 0), 2)
Debug.Print p.IsVisible(5, 5) & " " & p.IsVisible(15, 15)               ' True False
Debug.Print p.IsOutlineVisible(0, 5, pn) & " " & p.IsOutlineVisible(5, 5, pn)    ' True False
```
<!-- /test -->

## Example

<!-- test: Br_PathTests.FillPath_FillsTheShape -->
This example fills a heart-shaped path made of two arcs and a polygon, then reads two pixels back to show which areas are filled and which are not.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40!, 40!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)

Dim p As GraphicsPath = GraphicsPath()
p.AddArc 4, 6, 16, 16, 180, 180            ' the left lobe
p.AddArc 20, 6, 16, 16, 180, 180           ' the right lobe
Dim tip(1 To 3) As GpPointF
tip(1) = GpPointF(36, 14): tip(2) = GpPointF(20, 36): tip(3) = GpPointF(4, 14)
p.AddLines tip
p.CloseFigure

Dim sb As SolidBrush = New SolidBrush(Color(255, 255, 0, 0))
g.FillPath sb, p
Debug.Print Hex$(bmp.Pixel(20, 20).G)      ' 0
Debug.Print Hex$(bmp.Pixel(2, 2).G)        ' FF
```
<!-- /test -->

## See Also

- [PathIterator](PathIterator) class -- reads the figures and markers of a path
- [PathData](PathData) class -- the points and point types of a path
- [Region](Region) class -- an area made from paths and rectangles
- [Matrix](Matrix) class -- the transformation applied by **Transform**
- [Graphics](Graphics) class -- **DrawPath**, **FillPath** and **SetClip** use a path
- [GpFillmode](Enumerations/GpFillmode) enumeration
- [GraphicsPath class](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspath/nl-gdipluspath-graphicspath) -- Microsoft's documentation of the GDI+ class
