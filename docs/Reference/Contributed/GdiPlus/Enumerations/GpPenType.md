---
title: GpPenType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpPenType
---

# GpPenType enumeration
{: .no_toc }

Names the kind of fill that a pen draws with.

The members repeat the values of [GpBrushType](GpBrushType), because a pen draws with a brush.

| Member | Value | Description |
|:-------|:------|:------------|
| **PenTypeSolidColor**{: #PenTypeSolidColor } | `0` | A solid colour. |
| **PenTypeHatchFill**{: #PenTypeHatchFill } | `1` | A hatch pattern. |
| **PenTypeTextureFill**{: #PenTypeTextureFill } | `2` | A texture made of tiles of an image. |
| **PenTypePathGradient**{: #PenTypePathGradient } | `3` | A path gradient. |
| **PenTypeLinearGradient**{: #PenTypeLinearGradient } | `4` | A linear gradient. |
| **PenTypeUnknown**{: #PenTypeUnknown } | `-1` | The type is not known. |

## Used by

- [**Pen**](../Pen) class: [**PenType**](../Pen#pentype)

## See Also

- [PenType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-pentype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Pen](../Pen) class
