---
title: GpInterpolationMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpInterpolationMode
---

# GpInterpolationMode enumeration
{: .no_toc }

Specifies the algorithm that is used when images are scaled or rotated.

The setting is the **InterpolationMode** property of [**Graphics**](../Graphics). The first four members have the values of [GpQualityMode](GpQualityMode).

<!-- test: Gr_GraphicsTests.InterpolationMode_HighQuality_ReadsBackAsBicubic, Gr_GraphicsTests.InterpolationMode_LowQualityAndDefault_ReadBackAsBilinear -->
> [!NOTE] timeless
> GDI+ replaces some of the values when they are set. A **Graphics** object that was given **InterpolationModeHighQuality** returns **InterpolationModeHighQualityBicubic** when the property is read again, and one that was given **InterpolationModeLowQuality** or **InterpolationModeDefault** returns **InterpolationModeBilinear**.

| Member | Value | Description |
|:-------|:------|:------------|
| **InterpolationModeInvalid**{: #InterpolationModeInvalid } | `-1` | Used internally. |
| **InterpolationModeDefault**{: #InterpolationModeDefault } | `0` | The default mode. |
| **InterpolationModeLowQuality**{: #InterpolationModeLowQuality } | `1` | A low-quality mode. |
| **InterpolationModeHighQuality**{: #InterpolationModeHighQuality } | `2` | A high-quality mode. |
| **InterpolationModeBilinear**{: #InterpolationModeBilinear } | `3` | Bilinear interpolation, with no prefiltering. It is not suitable for shrinking an image below 50 percent of its original size. |
| **InterpolationModeBicubic**{: #InterpolationModeBicubic } | `4` | Bicubic interpolation, with no prefiltering. It is not suitable for shrinking an image below 25 percent of its original size. |
| **InterpolationModeNearestNeighbor**{: #InterpolationModeNearestNeighbor } | `5` | Nearest-neighbour interpolation. |
| **InterpolationModeHighQualityBilinear**{: #InterpolationModeHighQualityBilinear } | `6` | High-quality bilinear interpolation. Prefiltering ensures high-quality shrinking. |
| **InterpolationModeHighQualityBicubic**{: #InterpolationModeHighQualityBicubic } | `7` | High-quality bicubic interpolation. Prefiltering ensures high-quality shrinking. This mode gives the highest quality of the transformed images. |

## Used by

- [**Graphics**](../Graphics) class: [**InterpolationMode**](../Graphics#interpolationmode)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)

g.InterpolationMode = InterpolationModeHighQuality
Debug.Print g.InterpolationMode = InterpolationModeHighQualityBicubic
g.InterpolationMode = InterpolationModeLowQuality
Debug.Print g.InterpolationMode = InterpolationModeBilinear
g.InterpolationMode = InterpolationModeNearestNeighbor
Debug.Print g.InterpolationMode = InterpolationModeNearestNeighbor
' Output:
' True
' True
' True
```

## See Also

- [InterpolationMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-interpolationmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
