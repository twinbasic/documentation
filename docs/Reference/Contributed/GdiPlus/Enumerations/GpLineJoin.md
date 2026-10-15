---
title: GpLineJoin
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpLineJoin
---

# GpLineJoin enumeration
{: .no_toc }

Selects how two lines drawn by the same pen are joined where their ends meet.

| Member | Value | Description |
|:-------|:------|:------------|
| **LineJoinMiter**{: #LineJoinMiter } | `0` | A mitered join, a sharp corner. When the miter is longer than the pen's miter limit, the join is beveled. |
| **LineJoinBevel**{: #LineJoinBevel } | `1` | A beveled join, a diagonal corner. |
| **LineJoinRound**{: #LineJoinRound } | `2` | A rounded join, a circular arc between the two lines. |
| **LineJoinMiterClipped**{: #LineJoinMiterClipped } | `3` | A mitered join that is clipped at the miter limit instead of being beveled. |

## Used by

- [**CustomLineCap**](../CustomLineCap) class: [**StrokeJoin**](../CustomLineCap#strokejoin)
- [**Pen**](../Pen) class: [**LineJoin**](../Pen#linejoin)

## See Also

- [LineJoin](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-linejoin) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [CustomLineCap](../CustomLineCap) class
- [Pen](../Pen) class
