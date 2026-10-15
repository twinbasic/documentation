---
title: DitherType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/DitherType
---

# DitherType enumeration
{: .no_toc }

Identifies the algorithms that are available for dithering when a bitmap is converted to another pixel format.

The ordered and spiral dithers must be used with a fixed palette. Error diffusion can be used with any palette. **DitherTypeMax** is not an algorithm.

| Member | Value | Description |
|:-------|:------|:------------|
| **DitherTypeNone**{: #DitherTypeNone } | `0` | No dithering. |
| **DitherTypeSolid**{: #DitherTypeSolid } | `1` | A solid colour: the nearest matching colour is picked, with no halftone or dither. It can be used with an arbitrary palette. |
| **DitherTypeOrdered4x4**{: #DitherTypeOrdered4x4 } | `2` | An ordered dither with a 4 by 4 matrix. It is the only ordered dither that can also be used for conversions to 16 bits per pixel. |
| **DitherTypeOrdered8x8**{: #DitherTypeOrdered8x8 } | `3` | An ordered dither with an 8 by 8 matrix. |
| **DitherTypeOrdered16x16**{: #DitherTypeOrdered16x16 } | `4` | An ordered dither with a 16 by 16 matrix. |
| **DitherTypeSpiral4x4**{: #DitherTypeSpiral4x4 } | `5` | A spiral dither with a 4 by 4 matrix. |
| **DitherTypeSpiral8x8**{: #DitherTypeSpiral8x8 } | `6` | A spiral dither with an 8 by 8 matrix. |
| **DitherTypeDualSpiral4x4**{: #DitherTypeDualSpiral4x4 } | `7` | A dual spiral dither with a 4 by 4 matrix. |
| **DitherTypeDualSpiral8x8**{: #DitherTypeDualSpiral8x8 } | `8` | A dual spiral dither with an 8 by 8 matrix. |
| **DitherTypeErrorDiffusion**{: #DitherTypeErrorDiffusion } | `9` | Error diffusion. |
| **DitherTypeMax**{: #DitherTypeMax } | `10` | One more than the highest dither type. It is not an algorithm. |

## Used by

- [**Bitmap**](../Bitmap) class: [**ConvertFormat**](../Bitmap#convertformat)

## See Also

- [DitherType](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspixelformats/ne-gdipluspixelformats-dithertype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Bitmap](../Bitmap) class
