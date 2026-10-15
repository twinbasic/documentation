---
title: GpQualityMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpQualityMode
---

# GpQualityMode enumeration
{: .no_toc }

Names the three quality levels that several rendering settings share.

No member of the package takes this enumeration. Its four values are the first four values of [GpCompositingQuality](GpCompositingQuality), [GpInterpolationMode](GpInterpolationMode), [GpPixelOffsetMode](GpPixelOffsetMode) and [GpSmoothingMode](GpSmoothingMode), which spell them as their own **Default**, **HighSpeed** (or **LowQuality**) and **HighQuality** members.

| Member | Value | Description |
|:-------|:------|:------------|
| **QualityModeInvalid**{: #QualityModeInvalid } | `-1` | Not a valid mode. GDI+ uses it to mark an invalid setting. |
| **QualityModeDefault**{: #QualityModeDefault } | `0` | Lets GDI+ choose the quality. |
| **QualityModeLow**{: #QualityModeLow } | `1` | Best performance, lowest quality. |
| **QualityModeHigh**{: #QualityModeHigh } | `2` | Best rendering quality, lowest performance. |

No public member of the package takes or returns this enumeration.

## See Also

- [Enumerations](.) -- all the enumerations of the package
