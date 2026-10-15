---
title: GpPathPointType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpPathPointType
---

# GpPathPointType enumeration
{: .no_toc }

Gives the type of a point of a path, and flags that describe it.

Each point of a [**GraphicsPath**](../GraphicsPath) has a type byte. Bits 0 to 2 hold the type: **PathPointTypeStart**, **PathPointTypeLine** or **PathPointTypeBezier**. The higher bits are flags, and a type combines with them using **Or**. The package wraps the byte in the [**PathPointType**](../Types/PathPointType) type, whose **PointType** property returns the three low bits as a member of this enumeration, and whose **CloseSubpath**, **PathMarker** and **DashMode** properties return the flags as Boolean values.

| Member | Value | Description |
|:-------|:------|:------------|
| **PathPointTypeStart**{: #PathPointTypeStart } | `0` | The point starts a figure. |
| **PathPointTypeLine**{: #PathPointTypeLine } | `1` | The point is one of the two ends of a line. |
| **PathPointTypeBezier**{: #PathPointTypeBezier } | `3` | The point is an end point or a control point of a cubic Bezier spline. |
| **PathPointTypePathTypeMask**{: #PathPointTypePathTypeMask } | `&H07` | A mask for the three low bits that hold the point type. |
| **PathPointTypeDashMode**{: #PathPointTypeDashMode } | `&H10` | Not used. |
| **PathPointTypePathMarker**{: #PathPointTypePathMarker } | `&H20` | The point is a marker. |
| **PathPointTypeCloseSubpath**{: #PathPointTypeCloseSubpath } | `&H80` | The point is the last point of a closed figure. |
| **PathPointTypeBezier3**{: #PathPointTypeBezier3 } | `3` | Same as **PathPointTypeBezier**: a cubic Bezier spline. |
| **PathPointTypeReserved**{: #PathPointTypeReserved } | `2` | Reserved. |
| **PathPointTypeReservedFlag1**{: #PathPointTypeReservedFlag1 } | `&H08` | Reserved. |
| **PathPointTypeReservedFlag2**{: #PathPointTypeReservedFlag2 } | `&H40` | Reserved. |

## Used by

- [**PathPointType**](../Types/PathPointType) type: **PointType**

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim path As GraphicsPath = GraphicsPath()
path.AddRectangle(1, 1, 5, 5)

Dim types() As PathPointType
path.GetTypes types

Dim t As PathPointType
Dim i As Long
For i = LBound(types) To UBound(types)
    t = types(i)
    Debug.Print CLng(t.PointType) & " " & t.CloseSubpath
Next
' Output:
' 0 False
' 1 False
' 1 False
' 1 True
```

A rectangle has four points. The last one is a line point that also closes the figure.

## See Also

- [PathPointType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-pathpointtype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
