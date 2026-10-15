---
title: MarkerPath
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/MarkerPath
---

# MarkerPath type
{: .no_toc }

One section of a path between markers, as a path of its own.

[**PathIterator.NextMarkerPath**](../PathIterator#nextmarkerpath) is meant to return a **MarkerPath**. That method does not work in this version; see the warning on the [**PathIterator**](../PathIterator) page.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **path** | [**GraphicsPath**](../GraphicsPath) | A new path that holds the section. |
| **resultCount** | **Long** | The number of points in the section. It is 0 when the iterator has no more sections. |

## See Also

- [PathIterator](../PathIterator) class
- [Marker](Marker) type -- the indexes of a section
