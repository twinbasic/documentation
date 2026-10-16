---
title: PathPointType
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/PathPointType
---

# PathPointType type
{: .no_toc }

The type of one point of a path: whether it starts a figure, ends a line or is part of a curve, with the flags that the point has.

A [**GraphicsPath**](../GraphicsPath) keeps one byte for each point. The three low bits hold the kind of point, and the higher bits are flags: the point closes its figure, it is a marker, or it is in a dash. A **PathPointType** wraps that byte and reads it through properties. Types come from [**GetTypes**](../GraphicsPath#gettypes), from [**PathData**](../PathData), from a [**TypedPoint**](TypedPoint) and from [**PathIterator**](../PathIterator).

## Field

| Field | Type | Meaning |
|:------|:-----|:--------|
| **_value** | **Byte** | The type byte, as GDI+ stores it. |

The name of the field begins with an underscore because the package treats it as internal. It is public, and it is the only way for a program to make a type: assign a member of [**GpPathPointType**](../Enumerations/GpPathPointType), or members combined with **Or**, to it.

## Properties

All the properties are read-only and return a value from the byte.

**PointType**
: A [**GpPathPointType**](../Enumerations/GpPathPointType): **PathPointTypeStart** (0) for the first point of a figure, **PathPointTypeLine** (1) for the end of a line, **PathPointTypeBezier** (3) for a point of a cubic Bézier curve. The value 2 is reserved. It is the three low bits of the byte.

**CloseSubpath**
: A **Boolean**, **True** for the last point of a closed figure.

**PathMarker**
: A **Boolean**, **True** for a point set as a marker with [**SetMarker**](../GraphicsPath#setmarker).

**DashMode**
: A **Boolean** for the dash flag. GDI+ does not use it.

**ReservedFlag1**, **ReservedFlag2**
: **Boolean** values of the two reserved flags.

<!-- test: Br_PathDataTests.PathPointType_Properties_ReadTheByte -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim t As PathPointType
t._value = PathPointTypeBezier Or PathPointTypeCloseSubpath
Debug.Print CLng(t.PointType) & " " & t.CloseSubpath & " " & t.PathMarker      ' 3 True False
```
<!-- /test -->

<!-- test: none -- a defect of the twinBASIC compiler (BETA 1007) and not of the package; the way round it is checked by the case after this callout -->
> [!WARNING] BETA 1007
> Reading a property of an element of an array, as in `types(i).CloseSubpath`, stops the program with an access violation. Copy the element to a variable and read the property of that. A type held in a variable or in a field of a **TypedPoint** is read without trouble.

<!-- test: Br_PathDataTests.PathPointType_ReadThroughAVariable_OfAnArrayElement -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddRectangle 0, 0, 5, 5
Dim types() As PathPointType
p.GetTypes types
Dim t As PathPointType = types(4)
Debug.Print CLng(t.PointType) & " " & t.CloseSubpath      ' 1 True
```
<!-- /test -->

## See Also

- [GpPathPointType](../Enumerations/GpPathPointType) enumeration
- [TypedPoint](TypedPoint) type -- a point with its type
- [GraphicsPath](../GraphicsPath) class -- **GetTypes**
- [PathData](../PathData) class -- holds the types of a path
