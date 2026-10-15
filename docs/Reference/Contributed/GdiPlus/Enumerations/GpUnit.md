---
title: GpUnit
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpUnit
---

# GpUnit enumeration
{: .no_toc }

Specifies the unit of measure of a coordinate, a size or a pen width.

| Member | Value | Description |
|:-------|:------|:------------|
| **UnitWorld**{: #UnitWorld } | `0` | World coordinates, a non-physical unit. |
| **UnitDisplay**{: #UnitDisplay } | `1` | The unit of the display device. On a monitor it is one pixel. GDI+ accepts it only as the page unit of a **Graphics**. |
| **UnitPixel**{: #UnitPixel } | `2` | One device pixel. |
| **UnitPoint**{: #UnitPoint } | `3` | A printer's point, 1/72 inch. |
| **UnitInch**{: #UnitInch } | `4` | One inch. |
| **UnitDocument**{: #UnitDocument } | `5` | A document unit, 1/300 inch. |
| **UnitMillimeter**{: #UnitMillimeter } | `6` | One millimetre. |

## Used by

- [**Font**](../Font) class: [**Unit**](../Font#unit), [constructor](../Font#creating)
- [**Graphics**](../Graphics) class: [**BeginContainer**](../Graphics#begincontainer), [**DrawImage**](../Graphics#drawimage), [**DrawImageI**](../Graphics#drawimagei), [**EnumerateMetaFile**](../Graphics#enumeratemetafile), [**PageUnit**](../Graphics#pageunit)
- [**Image**](../Image) class: [**Bounds**](../Image#bounds)
- [**Pen**](../Pen) class: [constructor](../Pen#creating)

## See Also

- [Unit](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-unit) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Font](../Font) class
- [Graphics](../Graphics) class
- [Image](../Image) class
- [Pen](../Pen) class
