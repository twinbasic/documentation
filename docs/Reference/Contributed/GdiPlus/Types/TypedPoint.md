---
title: TypedPoint
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/TypedPoint
---

# TypedPoint type
{: .no_toc }

A point of a path together with its type.

A path stores its points and their types in two arrays. A **TypedPoint** keeps one point and its type together, so that code can handle them as one value. [**PathData**](../PathData) takes an array of them, and [**TypedPoints**](TypedPoints) returns one.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **pos** | [**GpPointF**](GpPointF) | The position of the point. |
| **type** | [**PathPointType**](PathPointType) | What kind of point it is. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim tp As TypedPoint
tp.pos = GpPointF(3, 4)
tp.type._value = PathPointTypeLine
Debug.Print tp.pos.X & "," & tp.pos.Y & " " & CLng(tp.type.PointType)      ' 3,4 1
```

## See Also

- [PathPointType](PathPointType) type
- [TypedPoints](TypedPoints) type -- an array of typed points with a count
- [PathData](../PathData) class
- [PathIterator](../PathIterator) class -- **Enumerate** returns typed points
