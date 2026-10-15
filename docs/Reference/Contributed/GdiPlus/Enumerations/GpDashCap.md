---
title: GpDashCap
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpDashCap
---

# GpDashCap enumeration
{: .no_toc }

Selects the shape at both ends of each dash of a dashed line.

The enumeration has fewer members than [GpLineCap](GpLineCap), whose **Flat**, **Round** and **Triangle** members it repeats with the same values. The package declares the dash cap of a pen as a **GpLineCap**; the *dashCap* argument of **Pen.SetLineCap** is the one place that takes this enumeration.

| Member | Value | Description |
|:-------|:------|:------------|
| **DashCapFlat**{: #DashCapFlat } | `0` | A square end that stops at the end of the dash. |
| **DashCapRound**{: #DashCapRound } | `2` | A rounded end. |
| **DashCapTriangle**{: #DashCapTriangle } | `3` | A triangular end. |

## Used by

- [**Pen**](../Pen) class: [**SetLineCap**](../Pen#setlinecap)

## See Also

- [DashCap](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-dashcap) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Pen](../Pen) class
