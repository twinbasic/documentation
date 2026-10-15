---
title: SubPath
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/SubPath
---

# SubPath type
{: .no_toc }

The extent of one figure of a path: where it starts and ends, and whether it is closed.

[**PathIterator.NextSubpath**](../PathIterator#nextsubpath) returns a **SubPath**.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **startIndex** | **Long** | The index of the first point of the figure, counted from 0. |
| **endIndex** | **Long** | The index of the last point of the figure. |
| **isClosed** | **Boolean** | **True** when the figure is closed. |
| **resultCount** | **Long** | The number of points in the figure. It is 0 when the iterator has no more figures, and then the other fields are not changed. |

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 10
Dim it As PathIterator = PathIterator(p)
Dim sp As SubPath = it.NextSubpath()
Debug.Print sp.startIndex & " " & sp.endIndex & " " & sp.isClosed & " " & sp.resultCount     ' 0 1 False 2
```

## See Also

- [PathIterator](../PathIterator) class
- [SubPathPath](SubPathPath) type -- the figure as a path
