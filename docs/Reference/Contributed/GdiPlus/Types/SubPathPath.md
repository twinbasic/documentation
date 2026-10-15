---
title: SubPathPath
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/SubPathPath
---

# SubPathPath type
{: .no_toc }

One figure of a path, as a path of its own, with whether it is closed.

[**PathIterator.NextSubpathPath**](../PathIterator#nextsubpathpath) is meant to return a **SubPathPath**. That method does not work in this version; see the warning on the [**PathIterator**](../PathIterator) page.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **path** | [**GraphicsPath**](../GraphicsPath) | A new path that holds the figure. |
| **isClosed** | **Boolean** | **True** when the figure is closed. |
| **resultCount** | **Long** | The number of points in the figure. It is 0 when the iterator has no more figures. |

## See Also

- [PathIterator](../PathIterator) class
- [SubPath](SubPath) type -- the indexes of a figure
