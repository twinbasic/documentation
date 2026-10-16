---
title: PathData
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/PathData
---

# PathData class
{: .no_toc }

A **PathData** holds the points of a path and their types in two arrays of equal length, in memory that it allocates and frees.

The two arrays are the same pair that a [**GraphicsPath**](GraphicsPath) stores: the n-th point is a [**GpPointF**](Types/GpPointF), and the n-th type is a [**PathPointType**](Types/PathPointType) that says whether the point starts a figure, ends a line or belongs to a curve. Indexes are counted from 1. A [**TypedPoint**](Types/TypedPoint) bundles a point with its type.

The memory is released when the **PathData** object is. It is not cleared when it is allocated, so a point or a type holds an arbitrary value until it is set.

Two members of the package are meant to exchange a **PathData** with a path: the constructor [**GraphicsPath**](GraphicsPath#creating) that takes one, and the property [**GraphicsPath.PathData**](GraphicsPath#pathdata). Neither works in this version, so a **PathData** is at present a container filled and read by the program.

A call that fails records its status in **LastResult**, as every object of the package does. See [**GdiPlusBase**](GdiPlusBase).

## Creating

Syntax: *data* **= PathData(** *count* **)**

Syntax: *data* **= PathData(** *typedPoints*() **)**

Syntax: *data* **= New PathData**

*count*
: *required* The number of points to allocate room for.

*typedPoints*
: *required* An array of [**TypedPoint**](Types/TypedPoint). The new object holds a copy of each, in the order of the array, at the indexes 1 to the length of the array.

**New PathData** with no arguments creates an object with room for no points. The function form has no version without arguments. Call [**Allocate**](#allocate) to give it room.

<!-- test: Br_PathDataTests.New_Count_AndAllocate -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim a As PathData = PathData(3)
Dim b As PathData = New PathData
Debug.Print a.Count & " " & b.Count                    ' 3 0
```
<!-- /test -->

## Members

### Count
{: .no_toc }

Syntax: *data*.**Count** **As Long**

The number of points the object has room for.

### Allocate
{: .no_toc }

Syntax: *data*.**Allocate(** *count* **)** **As GpStatus**

Frees the arrays and allocates new ones for *count* points. The old values are lost, and a view taken with **Points** or **Types** is no longer valid. The new memory is not cleared. A *count* of 0 leaves the object empty.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim d As PathData = New PathData
Debug.Print d.Allocate(5) & " " & d.Count               ' 0 5
```

### Point
{: .no_toc }

Syntax: *data*.**Point(** *index* **)** [ **=** *point* ]

Reads or sets the point with the given index, a [**GpPointF**](Types/GpPointF). Reading an index outside 1 to **Count** returns a point at 0, 0.

<!-- test: Br_PathDataTests.Point_Get_ReturnsThePoint, Br_PathDataTests.TypedPoint_Get_ReturnsThePointAndItsType, Br_PathDataTests.TypedPoints_Get_ReturnsACopy -->
> [!WARNING] 0.9.45.0
> Reading **Point** stops a 32-bit program with an access violation, whatever the index is, as long as it is in range. A 64-bit program reads correctly. The same is true of **TypedPoint** and of **TypedPoints**, which read points through it. In a program that is built in both widths, read the points with [**Points**](#points), which works in both.

<!-- test: Br_PathDataTests.Point_Let_OutOfRange_LeavesTheMemoryBesideTheArrayAlone, Br_PathDataTests.Type_Let_OutOfRange_LeavesTheMemoryBesideTheArrayAlone, Br_PathDataTests.TypedPoint_Let_OutOfRange_LeavesTheMemoryBesideTheArraysAlone -->
> [!WARNING] 0.9.45.0
> Setting **Point**, **Type** or **TypedPoint** does not check the index. A value outside 1 to **Count** is written to the memory next to the arrays and raises no error.

### Type
{: .no_toc }

Syntax: *data*.**Type(** *index* **)** [ **=** *type* ]

<!-- test: Br_PathDataTests.Type_Get_OutOfRange_ReturnsZero -->
Reads or sets the [**PathPointType**](Types/PathPointType) of the point with the given index. Reading an index outside 1 to **Count** returns a type of 0.
<!-- /test -->

### TypedPoint
{: .no_toc }

Syntax: *data*.**TypedPoint(** *index* **)** [ **=** *typedPoint* ]

Reads or sets a point and its type together, as a [**TypedPoint**](Types/TypedPoint). See the warning under **Point**.

### Points
{: .no_toc }

Syntax: *data*.**Points** **As GpPointF()**

Returns the points as an array, with indexes 1 to **Count**. The array is a *view* of the object's memory, not a copy: reading it shows the points as they are, and the view is valid only while the object exists and until the next call of **Allocate**. Use it to read points in both 32-bit and 64-bit programs.

### Types
{: .no_toc }

Syntax: *data*.**Types** **As PathPointType()**

Returns the types as an array, a view of the memory as **Points** is.

### TypedPoints
{: .no_toc }

Syntax: *data*.**TypedPoints** **As TypedPoint()**

Returns a copy of the points and types as an array of [**TypedPoint**](Types/TypedPoint), with indexes 1 to **Count**. See the warning under **Point**.

### PointsPtr and TypesPtr
{: .no_toc }

Syntax: *data*.**PointsPtr** **As LongPtr**

Syntax: *data*.**TypesPtr** **As LongPtr**

<!-- test: Br_PathDataTests.PointsPtr_AndTypesPtr_AreZeroWithoutRoom -->
The addresses of the first point and of the first type, for a call of a Windows function. The address is 0 when the object has no room.
<!-- /test -->

The example fills a **PathData** and reads it through the views:

<!-- test: Br_PathDataTests.Points_AndTypes_AreViewsFromIndexOne -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim d As PathData = PathData(3)
d.Point(1) = GpPointF(3, 4)
d.Point(2) = GpPointF(5, 6)
d.Point(3) = GpPointF(7, 8)

Dim t As PathPointType
t._value = PathPointTypeLine
d.Type(1) = t
d.Type(2) = t
d.Type(3) = t

Dim pts() As GpPointF = d.Points
Dim ty() As PathPointType = d.Types
Debug.Print LBound(pts) & " " & UBound(pts)               ' 1 3
Debug.Print pts(2).X & "," & pts(2).Y & " " & ty(2)._value        ' 5,6 1
```
<!-- /test -->

A **PathData** is also created from an array of typed points:

<!-- test: Br_PathDataTests.New_TypedPoints_CopiesThem -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim tp(1 To 3) As TypedPoint
tp(1).pos = GpPointF(0, 0)
tp(2).pos = GpPointF(10, 0)
tp(3).pos = GpPointF(10, 10)
tp(2).type._value = PathPointTypeLine
tp(3).type._value = PathPointTypeLine

Dim d As PathData = PathData(tp)
Dim pts() As GpPointF = d.Points
Debug.Print d.Count & " " & pts(3).X & "," & pts(3).Y      ' 3 10,10
```
<!-- /test -->

## See Also

- [GraphicsPath](GraphicsPath) class
- [PathIterator](PathIterator) class
- [TypedPoint](Types/TypedPoint) and [PathPointType](Types/PathPointType) -- the types of the elements
- [GraphicsPath::GetPathData](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspath/nf-gdipluspath-graphicspath-getpathdata) -- Microsoft's documentation of the GDI+ method that fills the corresponding structure
