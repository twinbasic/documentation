---
title: PathType
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/PathType
---

# PathType type
{: .no_toc }

A run of points of one type in a figure: the type, and where the run starts and ends.

[**PathIterator.NextPathType**](../PathIterator#nextpathtype) returns a **PathType**.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **type** | [**PathPointType**](PathPointType) | The type of the points in the run. |
| **startIndex** | **Long** | The index of the first point of the run, counted from 0. |
| **endIndex** | **Long** | The index of the last point of the run. |
| **resultCount** | **Long** | The number of points in the run. It is 0 when the figure has no more runs, and then the other fields are not changed. |

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 0
p.AddBezier 10, 0, 12, 5, 14, 5, 16, 0
Dim it As PathIterator = PathIterator(p)
Dim sp As SubPath = it.NextSubpath()
Dim run As PathType = it.NextPathType()
Debug.Print CLng(run.type.PointType) & " " & run.startIndex & " " & run.endIndex & " " & run.resultCount    ' 1 0 1 2
```

## See Also

- [PathIterator](../PathIterator) class
- [PathPointType](PathPointType) type
