---
title: GpCompositingQuality
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpCompositingQuality
---

# GpCompositingQuality enumeration
{: .no_toc }

Selects whether gamma correction is applied when colours are blended with the background.

Without gamma correction the colours are assumed to be in a linear colour space (gamma 1.0) and are blended as they are. With it they are assumed to be sRGB (gamma 2.2): GDI+ converts them to a linear space, blends them, and converts the result back. The blend is more accurate and takes more time. The first four members have the values of [GpQualityMode](GpQualityMode).

| Member | Value | Description |
|:-------|:------|:------------|
| **CompositingQualityInvalid**{: #CompositingQualityInvalid } | `-1` | Not a valid setting. GDI+ uses it internally. |
| **CompositingQualityDefault**{: #CompositingQualityDefault } | `0` | Gamma correction is not applied. |
| **CompositingQualityHighSpeed**{: #CompositingQualityHighSpeed } | `1` | Gamma correction is not applied. |
| **CompositingQualityHighQuality**{: #CompositingQualityHighQuality } | `2` | Gamma correction is applied. |
| **CompositingQualityGammaCorrected**{: #CompositingQualityGammaCorrected } | `3` | Gamma correction is applied. |
| **CompositingQualityAssumeLinear**{: #CompositingQualityAssumeLinear } | `4` | Gamma correction is not applied. |

## Used by

- [**Graphics**](../Graphics) class: [**CompositingQuality**](../Graphics#compositingquality)

## See Also

- [CompositingQuality](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-compositingquality) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
