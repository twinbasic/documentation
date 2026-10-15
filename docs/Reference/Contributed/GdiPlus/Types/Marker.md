---
title: Marker
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/Marker
---

# Marker type
{: .no_toc }

The extent of one section of a path between markers.

[**PathIterator.NextMarker**](../PathIterator#nextmarker) returns a **Marker**. The section ends at a point set with [**SetMarker**](../GraphicsPath#setmarker), or at the end of the path.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **startIndex** | **Long** | The index of the first point of the section, counted from 0. |
| **endIndex** | **Long** | The index of the last point of the section. |
| **resultCount** | **Long** | The number of points in the section. It is 0 when the iterator has no more sections, and then the other fields are not changed. |

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As GraphicsPath = GraphicsPath()
p.AddLine 0, 0, 10, 0
p.SetMarker
p.AddLine 20, 0, 20, 10
Dim it As PathIterator = PathIterator(p)
Dim mk As Marker = it.NextMarker()
Debug.Print mk.startIndex & " " & mk.endIndex & " " & mk.resultCount      ' 0 1 2
mk = it.NextMarker()
Debug.Print mk.startIndex & " " & mk.endIndex & " " & mk.resultCount      ' 2 3 2
```

## See Also

- [PathIterator](../PathIterator) class
- [MarkerPath](MarkerPath) type -- the section as a path
