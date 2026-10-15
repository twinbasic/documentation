---
title: GpCoordinateSpace
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpCoordinateSpace
---

# GpCoordinateSpace enumeration
{: .no_toc }

Names the three coordinate spaces that GDI+ converts between.

Drawing calls give their points in world coordinates. The world transformation turns them into page coordinates, and the page unit and page scale turn those into device coordinates, which are pixels on the surface.

| Member | Value | Description |
|:-------|:------|:------------|
| **CoordinateSpaceWorld**{: #CoordinateSpaceWorld } | `0` | World coordinates, the coordinates that drawing calls use. |
| **CoordinateSpacePage**{: #CoordinateSpacePage } | `1` | Page coordinates, the result of the world transformation. |
| **CoordinateSpaceDevice**{: #CoordinateSpaceDevice } | `2` | Device coordinates, in the units of the surface. |

## Used by

- [**Graphics**](../Graphics) class: [**TransformPoints**](../Graphics#transformpoints)

## See Also

- [CoordinateSpace](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-coordinatespace) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
