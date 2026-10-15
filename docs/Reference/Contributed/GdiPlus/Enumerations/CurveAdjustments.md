---
title: CurveAdjustments
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/CurveAdjustments
---

# CurveAdjustments enumeration
{: .no_toc }

Names the eight adjustments of the **ColorCurve** effect.

The adjustment is the *adjustment* field of a **ColorCurveParams** and the colour channel it works on is the *channel* field, a [CurveChannel](CurveChannel). The *value* says how much to adjust.

| Member | Value | Description |
|:-------|:------|:------------|
| **AdjustExposure**{: #AdjustExposure } | `0` | Simulates increasing or decreasing the exposure. |
| **AdjustDensity**{: #AdjustDensity } | `1` | Simulates increasing or decreasing the density of film. |
| **AdjustContrast**{: #AdjustContrast } | `2` | Increases or decreases the contrast of the image. |
| **AdjustHighlight**{: #AdjustHighlight } | `3` | Increases or decreases the value of a colour channel that is already above half intensity. This affects the bright areas of the image more than the dark ones. |
| **AdjustShadow**{: #AdjustShadow } | `4` | Increases or decreases the value of a colour channel that is already below half intensity. This affects the dark areas of the image more than the bright ones. |
| **AdjustMidtone**{: #AdjustMidtone } | `5` | Adjusts the middle range of intensities. |
| **AdjustWhiteSaturation**{: #AdjustWhiteSaturation } | `6` | Sets the intensity at which white saturation occurs. |
| **AdjustBlackSaturation**{: #AdjustBlackSaturation } | `7` | Sets the intensity at which black saturation occurs. |

## Used by

- [**ColorCurve**](../ColorCurve) class: [constructor](../ColorCurve#creating)
- [**ColorCurveParams**](../Types/ColorCurveParams) type: **adjustment**, the **ColorCurveParams** function

## See Also

- [CurveAdjustments](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ne-gdipluseffects-curveadjustments) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [ColorCurve](../ColorCurve) class
