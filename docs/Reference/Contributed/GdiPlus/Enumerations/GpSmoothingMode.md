---
title: GpSmoothingMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpSmoothingMode
---

# GpSmoothingMode enumeration
{: .no_toc }

Specifies the kind of smoothing (antialiasing) that is applied to lines and curves.

The setting is the **SmoothingMode** property of [**Graphics**](../Graphics). A box filter that is 8 pixels wide and 4 high gives better results for lines that are nearly vertical than for lines that are nearly horizontal. A filter of 8 by 8 pixels gives equally good results for both and is slower. The first four members have the values of [GpQualityMode](GpQualityMode).

> [!NOTE] timeless
> GDI+ replaces some of the values when they are set. A **Graphics** object that was given **SmoothingModeHighQuality** returns **SmoothingModeAntiAlias** when the property is read again, and one that was given **SmoothingModeHighSpeed** or **SmoothingModeDefault** returns **SmoothingModeNone**.

| Member | Value | Description |
|:-------|:------|:------------|
| **SmoothingModeInvalid**{: #SmoothingModeInvalid } | `-1` | Reserved. |
| **SmoothingModeDefault**{: #SmoothingModeDefault } | `0` | No smoothing is applied. |
| **SmoothingModeHighSpeed**{: #SmoothingModeHighSpeed } | `1` | No smoothing is applied. |
| **SmoothingModeHighQuality**{: #SmoothingModeHighQuality } | `2` | Smoothing is applied with an 8 by 4 box filter. |
| **SmoothingModeNone**{: #SmoothingModeNone } | `3` | No smoothing is applied. |
| **SmoothingModeAntiAlias**{: #SmoothingModeAntiAlias } | `4` | Smoothing is applied with an 8 by 4 box filter. |
| **SmoothingModeAntiAlias8x4**{: #SmoothingModeAntiAlias8x4 } | `4` | Smoothing is applied with an 8 by 4 box filter. Same value as **SmoothingModeAntiAlias**. |
| **SmoothingModeAntiAlias8x8**{: #SmoothingModeAntiAlias8x8 } | `5` | Smoothing is applied with an 8 by 8 box filter. |

## Used by

- [**Graphics**](../Graphics) class: [**SmoothingMode**](../Graphics#smoothingmode)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)

g.SmoothingMode = SmoothingModeHighQuality
Debug.Print g.SmoothingMode = SmoothingModeAntiAlias
g.SmoothingMode = SmoothingModeHighSpeed
Debug.Print g.SmoothingMode = SmoothingModeNone
g.SmoothingMode = SmoothingModeDefault
Debug.Print g.SmoothingMode = SmoothingModeNone
' Output:
' True
' True
' True
```

## See Also

- [SmoothingMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-smoothingmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
