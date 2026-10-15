---
title: CurveChannel
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/CurveChannel
---

# CurveChannel enumeration
{: .no_toc }

Specifies which colour channels a **ColorCurve** adjustment affects.

| Member | Value | Description |
|:-------|:------|:------------|
| **CurveChannelAll**{: #CurveChannelAll } | `0` | The adjustment affects all channels: red, green and blue. |
| **CurveChannelRed**{: #CurveChannelRed } | `1` | The adjustment affects the red channel only. |
| **CurveChannelGreen**{: #CurveChannelGreen } | `2` | The adjustment affects the green channel only. |
| **CurveChannelBlue**{: #CurveChannelBlue } | `3` | The adjustment affects the blue channel only. |

## Used by

- [**ColorCurve**](../ColorCurve) class: [constructor](../ColorCurve#creating)
- [**ColorCurveParams**](../Types/ColorCurveParams) type: **channel**, the **ColorCurveParams** function

## See Also

- [CurveChannel](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ne-gdipluseffects-curvechannel) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [ColorCurve](../ColorCurve) class
