---
title: GpFillmode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpFillmode
---

# GpFillmode enumeration
{: .no_toc }

Selects the rule that decides which areas of a self-intersecting path are filled.

The rule matters only where a path crosses itself or holds shapes inside one another. A [**GraphicsPath**](../GraphicsPath) keeps its rule in the **FillMode** property, and the polygon and curve fills of [**Graphics**](../Graphics) take it as an argument.

| Member | Value | Description |
|:-------|:------|:------------|
| **FillModeAlternate**{: #FillModeAlternate } | `0` | The even-odd rule. A point is filled when a line from it to infinity crosses the path an odd number of times, so the fill alternates between filled and empty areas at each boundary. A shape inside another leaves a hole. |
| **FillModeWinding**{: #FillModeWinding } | `1` | The nonzero winding rule. A point is filled when the path winds around it a net non-zero number of times. A shape drawn inside another in the same direction is filled; one drawn in the opposite direction leaves a hole. |

## Used by

- [**Graphics**](../Graphics) class: [**FillClosedCurve**](../Graphics#fillclosedcurve), [**FillPolygon**](../Graphics#fillpolygon)
- [**GraphicsPath**](../GraphicsPath) class: [**FillMode**](../GraphicsPath#fillmode), [constructor](../GraphicsPath#creating)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(30!, 30!)
Dim g As Graphics = Graphics(bmp)

' Two rectangles, one inside the other, both drawn in the same direction.
Dim path As GraphicsPath = GraphicsPath(FillModeAlternate)
path.AddRectangle(2, 2, 26, 26)
path.AddRectangle(8, 8, 14, 14)

g.Clear(White)
g.FillPath(SolidBrush(CColor.Black), path)
Debug.Print Hex$(bmp.Pixel(4, 4).Value), Hex$(bmp.Pixel(15, 15).Value)

path.FillMode = FillModeWinding
g.Clear(White)
g.FillPath(SolidBrush(CColor.Black), path)
Debug.Print Hex$(bmp.Pixel(4, 4).Value), Hex$(bmp.Pixel(15, 15).Value)
' Output:
' FF000000      FFFFFFFF
' FF000000      FF000000
```

The pixel in the ring is black in both runs. The pixel inside the inner rectangle is white with **FillModeAlternate** (a hole) and black with **FillModeWinding**.

## See Also

- [FillMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-fillmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
- [GraphicsPath](../GraphicsPath) class
