---
title: GpPixelOffsetMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpPixelOffsetMode
---

# GpPixelOffsetMode enumeration
{: .no_toc }

Specifies the pixel offset mode of a **Graphics** object.

The setting is the **PixelOffsetMode** property of [**Graphics**](../Graphics). Take the pixel in the upper left corner of an image, with the address (0, 0). With **PixelOffsetModeNone** it covers the area from -0.5 to 0.5 in both directions, so its centre is at (0, 0). With **PixelOffsetModeHalf** it covers the area from 0 to 1, so its centre is at (0.5, 0.5). The first four members have the values of [GpQualityMode](GpQualityMode).

| Member | Value | Description |
|:-------|:------|:------------|
| **PixelOffsetModeInvalid**{: #PixelOffsetModeInvalid } | `-1` | Used internally. |
| **PixelOffsetModeDefault**{: #PixelOffsetModeDefault } | `0` | Same as **PixelOffsetModeNone**. |
| **PixelOffsetModeHighSpeed**{: #PixelOffsetModeHighSpeed } | `1` | Same as **PixelOffsetModeNone**. |
| **PixelOffsetModeHighQuality**{: #PixelOffsetModeHighQuality } | `2` | Same as **PixelOffsetModeHalf**. |
| **PixelOffsetModeNone**{: #PixelOffsetModeNone } | `3` | The centres of pixels have integer coordinates. |
| **PixelOffsetModeHalf**{: #PixelOffsetModeHalf } | `4` | The centres of pixels have coordinates half way between integers. |

## Used by

- [**Graphics**](../Graphics) class: [**PixelOffsetMode**](../Graphics#pixeloffsetmode)

## See Also

- [PixelOffsetMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-pixeloffsetmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
