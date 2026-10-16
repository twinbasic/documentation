---
title: PathIterator
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/PathIterator
---

# PathIterator class
{: .no_toc }

A **PathIterator** reads the figures, the marker sections, the runs of points of one type, and the points of a [**GraphicsPath**](GraphicsPath), one part after another.

A path is made of figures, which [**StartFigure**](GraphicsPath#startfigure) and [**CloseFigure**](GraphicsPath#closefigure) separate. [**SetMarker**](GraphicsPath#setmarker) divides it into sections, independently of the figures. Each point has a [**PathPointType**](Types/PathPointType). The iterator finds where each figure, section or run of points begins and ends, as indexes into the path's points, or copies the part into a new path or array.

The indexes are counted from 0 and are inclusive: a figure from 4 to 5 has the points 4 and 5. The arrays that **Enumerate** fills are counted from 1, so index *i* of the path is element *i* + 1 of the array.

Each kind of iteration keeps its own position. The calls of **NextSubpath** step through the figures, the calls of **NextMarker** through the sections, and **NextPathType** through the runs of the figure that **NextSubpath** returned last. **Rewind** puts every position back at the start of the path.

Every method exists twice. The *UDT form* has no arguments and returns a user-defined type: [**NextSubpath**](#nextsubpath) returns a [**SubPath**](Types/SubPath), [**NextMarker**](#nextmarker) a [**Marker**](Types/Marker), and so on. The *direct form* has the same name, takes variables for the results, and returns the number of points as a **Long**, as the C++ class does. In both forms the number of points is 0 when the iteration has come to its end. A call that fails records its status in **LastResult**, as every object of the package does. See [**GdiPlusBase**](GdiPlusBase).

<!-- test: Br_PathIteratorTests.NextSubpathPath_UDT_ReturnsTheFigure, Br_PathIteratorTests.NextSubpathPath_Direct_ReturnsTheFigure, Br_PathIteratorTests.NextMarkerPath_UDT_ReturnsTheSection, Br_PathIteratorTests.NextMarkerPath_Direct_ReturnsTheCount, Br_PathIteratorTests.NextMarkerPath_Direct_ReturnsAUsablePath -->
> [!WARNING] 0.9.45.0, BETA 1007
> **NextSubpathPath** and **NextMarkerPath** do not work. The package assigns a `New GraphicsPath` to a member of a user-defined type without `Set`, and twinBASIC reports a code generation error for it in **NextSubpathPath** whenever it compiles a project that uses **PathIterator**, though the other members still work when the program is run from the IDE. A program that calls the UDT form of either method stops at the call, and so does one that calls the direct form of **NextMarkerPath**. The direct form of **NextSubpathPath** returns 0 and a path that holds no GDI+ object. To get the points of a figure or a section, take the indexes from **NextSubpath** or **NextMarker** and read the points with **Enumerate**.

## Creating

Syntax: *iterator* **= PathIterator(** *path* **)**

Syntax: *iterator* **= New PathIterator(** *path* **)**

The function **PathIterator** and **New PathIterator** are the same thing.

*path*
: *required* The [**GraphicsPath**](GraphicsPath) to read.

## Properties

### Count
{: .no_toc }

Syntax: *iterator*.**Count** **As Long**

The number of points in the path.

### SubpathCount
{: .no_toc }

Syntax: *iterator*.**SubpathCount** **As Long**

The number of figures in the path. A path with no points has none.

### HasCurve
{: .no_toc }

Syntax: *iterator*.**HasCurve** **As Boolean**

**True** when the path has at least one Bézier curve. A path that has been through [**Flatten**](GraphicsPath#flatten) has none.

<!-- test: Br_PathIteratorTests.Count_SubpathCount_AndHasCurve -->
```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.SetMarker
p.AddLine 20, 20, 30, 30
p.StartFigure
p.AddEllipse 40, 40, 10, 10

Dim it As PathIterator = PathIterator(p)
Debug.Print it.Count & " " & it.SubpathCount & " " & it.HasCurve       ' 19 3 True
```
<!-- /test -->

### Rewind
{: .no_toc }

Syntax: *iterator*.**Rewind** **As GpStatus**

<!-- test: Br_PathIteratorTests.Rewind_StartsAgain -->
Puts all the positions back at the start of the path.
<!-- /test -->

## Figures

### NextSubpath
{: .no_toc }

Syntax: *iterator*.**NextSubpath** **As SubPath**

Syntax: *iterator*.**NextSubpath(** *startIndex*, *endIndex*, *isClosed* **)** **As Long**

*startIndex*, *endIndex*
: *required* **Long** variables that receive the index of the first and of the last point of the figure.

*isClosed*
: *required* A **Boolean** variable that receives **True** when the figure is closed.

Returns the next figure. The UDT form returns a [**SubPath**](Types/SubPath) with the same values and the number of points in its field *resultCount*. The direct form returns the number of points. At the end of the path both give 0.

The path of the first example has three figures. The rectangle is closed by nature, the line is open, and the ellipse is closed:

<!-- test: Br_PathIteratorTests.NextSubpath_UDT_ListsTheFigures -->
```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.SetMarker
p.AddLine 20, 20, 30, 30
p.StartFigure
p.AddEllipse 40, 40, 10, 10

Dim it As PathIterator = PathIterator(p)
Dim sp As SubPath
Do
    sp = it.NextSubpath()
    If sp.resultCount = 0 Then Exit Do
    Debug.Print sp.startIndex & ".." & sp.endIndex & " " & sp.isClosed
Loop
' 0..3 True
' 4..5 False
' 6..18 True
```
<!-- /test -->

The direct form does the same with variables:

<!-- test: Br_PathIteratorTests.NextSubpath_Direct_ListsTheFigures -->
```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.AddLine 20, 20, 30, 30

Dim it As PathIterator = PathIterator(p)
Dim first As Long, last As Long, closed As Boolean, n As Long
n = it.NextSubpath(first, last, closed)
Debug.Print n & " " & first & " " & last & " " & closed     ' 4 0 3 True
n = it.NextSubpath(first, last, closed)
Debug.Print n & " " & first & " " & last & " " & closed     ' 2 4 5 False
n = it.NextSubpath(first, last, closed)
Debug.Print n                                               ' 0
```
<!-- /test -->

### NextSubpathPath
{: .no_toc }

Syntax: *iterator*.**NextSubpathPath** **As SubPathPath**

Syntax: *iterator*.**NextSubpathPath(** *path*, *isClosed* **)** **As Long**

Meant to return the next figure as a new [**GraphicsPath**](GraphicsPath), together with whether it is closed. The UDT form returns a [**SubPathPath**](Types/SubPathPath). See the warning at the top of this page: these forms do not work.

## Sections between markers

### NextMarker
{: .no_toc }

Syntax: *iterator*.**NextMarker** **As Marker**

Syntax: *iterator*.**NextMarker(** *startIndex*, *endIndex* **)** **As Long**

Returns the next section of the path, which ends at a marker set with [**SetMarker**](GraphicsPath#setmarker), or at the end of the path. The UDT form returns a [**Marker**](Types/Marker). Sections are not the same as figures: a marker can fall in the middle of a figure, and a section can hold several figures.

<!-- test: Br_PathIteratorTests.NextMarker_UDT_ListsTheSections, Br_PathIteratorTests.NextMarker_Direct_ListsTheSections -->
```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.SetMarker
p.AddLine 20, 20, 30, 30
p.StartFigure
p.AddEllipse 40, 40, 10, 10

Dim it As PathIterator = PathIterator(p)
Dim mk As Marker
Do
    mk = it.NextMarker()
    If mk.resultCount = 0 Then Exit Do
    Debug.Print mk.startIndex & ".." & mk.endIndex
Loop
' 0..3
' 4..18
```
<!-- /test -->

### NextMarkerPath
{: .no_toc }

Syntax: *iterator*.**NextMarkerPath** **As MarkerPath**

Syntax: *iterator*.**NextMarkerPath(** *path* **)** **As Long**

Meant to return the next section as a new [**GraphicsPath**](GraphicsPath). The UDT form returns a [**MarkerPath**](Types/MarkerPath). See the warning at the top of this page: these forms do not work.

## Runs of one type

### NextPathType
{: .no_toc }

Syntax: *iterator*.**NextPathType** **As PathType**

Syntax: *iterator*.**NextPathType(** *pathType*, *startIndex*, *endIndex* **)** **As Long**

*pathType*
: *required* A [**PathPointType**](Types/PathPointType) variable that receives the type of the run.

*startIndex*, *endIndex*
: *required* **Long** variables that receive the index of the first and of the last point of the run.

Returns the next group of points of the same type, within the figure that **NextSubpath** returned last. The first group includes the start point of the figure. The UDT form returns a [**PathType**](Types/PathType).

<!-- test: Br_PathIteratorTests.NextPathType_BeforeNextSubpath_ReturnsZero -->
Call **NextSubpath** first: before it, and after the last group of a figure, the call returns 0. Each figure then needs its own call of **NextSubpath**.
<!-- /test -->

<!-- test: Br_PathIteratorTests.NextPathType_UDT_ListsTheRunsOfAFigure -->
```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 0
p.AddBezier 10, 0, 12, 5, 14, 5, 16, 0

Dim it As PathIterator = PathIterator(p)
Dim sp As SubPath = it.NextSubpath()
Dim run As PathType
Do
    run = it.NextPathType()
    If run.resultCount = 0 Then Exit Do
    Debug.Print CLng(run.type.PointType) & ": " & run.startIndex & ".." & run.endIndex
Loop
' 1: 0..1
' 3: 1..4
```
<!-- /test -->

## Copying points

### Enumerate
{: .no_toc }

Syntax: *iterator*.**Enumerate(** [ *startIndex*, *endIndex* ] **)** **As TypedPoints**

Syntax: *iterator*.**Enumerate(** *points*(), *types*(), [ *startIndex*, *endIndex* ] **)** **As Long**

*points*
: *required* A dynamic array of [**GpPointF**](Types/GpPointF) that receives the points.

*types*
: *required* A dynamic array of [**PathPointType**](Types/PathPointType) that receives their types.

<!-- test: Br_PathIteratorTests.Enumerate_OnlyOneIndex_IsRefused -->
*startIndex*, *endIndex*
: *optional* The first and the last point to copy, counted from 0. Both default to -1, which copies the whole path. Giving only one of them is refused with **InvalidParameter**.
<!-- /test -->

Copies the points and their types. The UDT form returns a [**TypedPoints**](Types/TypedPoints), a structure that holds an array of [**TypedPoint**](Types/TypedPoint) and the count in *resultCount*. The direct form sizes the two arrays, with indexes from 1, and returns the count.

<!-- test: Br_PathIteratorTests.Enumerate_EmptyPath_RaisesUnspecifiedError -->
> [!NOTE] 0.9.45.0
> On an empty path both forms raise run-time error -2147467259, *Unspecified error*. Check **Count** first.

<!-- test: Br_PathIteratorTests.Enumerate_UDT_CopiesTheWholePathOrAPart, Br_PathIteratorTests.Enumerate_Direct_SizesTheArraysFromOne -->
```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
Dim pts(1 To 3) As GpPointF
pts(1) = GpPointF(0, 0): pts(2) = GpPointF(10, 0): pts(3) = GpPointF(10, 10)
p.AddLines pts

Dim it As PathIterator = PathIterator(p)
Dim all As TypedPoints = it.Enumerate()
Debug.Print all.resultCount & " " & UBound(all.points)          ' 3 3
Dim part As TypedPoints = it.Enumerate(1, 2)
Debug.Print part.resultCount & " " & part.points(1).pos.X       ' 2 10
```
<!-- /test -->

### CopyData
{: .no_toc }

Syntax: *iterator*.**CopyData(** *startIndex*, *endIndex* **)** **As TypedPoints**

Syntax: *iterator*.**CopyData(** *points*(), *types*(), *startIndex*, *endIndex* **)** **As Long**

<!-- test: Br_PathIteratorTests.CopyData_DoesWhatEnumerateDoes -->
Deprecated. It does what **Enumerate** does with the two indexes; use **Enumerate**.
<!-- /test -->

## Example

This example lists the figures of a path and, for each one, the type of its first run of points.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 10, 10
p.AddEllipse 20, 0, 10, 10
p.AddLine 40, 0, 50, 10

Dim it As PathIterator = PathIterator(p)
Dim sp As SubPath
Dim run As PathType
Do
    sp = it.NextSubpath()
    If sp.resultCount = 0 Then Exit Do
    run = it.NextPathType()
    Debug.Print "points " & sp.startIndex & ".." & sp.endIndex & ", first run of type " & CLng(run.type.PointType)
Loop
' points 0..3, first run of type 1
' points 4..16, first run of type 3
' points 17..18, first run of type 1
```

## See Also

- [GraphicsPath](GraphicsPath) class
- [PathData](PathData) class
- [SubPath](Types/SubPath), [Marker](Types/Marker), [PathType](Types/PathType), [TypedPoints](Types/TypedPoints) -- the types the UDT forms return
- [PathPointType](Types/PathPointType) -- the type of a point
- [GraphicsPathIterator class](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspath/nl-gdipluspath-graphicspathiterator) -- Microsoft's documentation of the GDI+ class
