---
title: PaletteType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/PaletteType
---

# PaletteType enumeration
{: .no_toc }

Identifies several standard colour palettes, for the conversion of a bitmap to another pixel format and for the creation of a palette.

A halftone palette is a superset of the system palette: it holds the colours of its own grid plus the 16 system colours, without duplicates. The symmetric halftone palettes have the same number of intensity levels for each colour. The two asymmetric ones are less useful and do not include all of the system colours.

| Member | Value | Description |
|:-------|:------|:------------|
| **PaletteTypeCustom**{: #PaletteTypeCustom } | `0` | An arbitrary palette that the caller provides. |
| **PaletteTypeOptimal**{: #PaletteTypeOptimal } | `1` | An optimal palette generated with a median-cut algorithm. |
| **PaletteTypeFixedBW**{: #PaletteTypeFixedBW } | `2` | A black and white palette. |
| **PaletteTypeFixedHalftone8**{: #PaletteTypeFixedHalftone8 } | `3` | A symmetric halftone palette with 8 colours: the on-off primaries. |
| **PaletteTypeFixedHalftone27**{: #PaletteTypeFixedHalftone27 } | `4` | A symmetric halftone palette with 3 intensity levels of each colour. |
| **PaletteTypeFixedHalftone64**{: #PaletteTypeFixedHalftone64 } | `5` | A symmetric halftone palette with 4 intensity levels of each colour. |
| **PaletteTypeFixedHalftone125**{: #PaletteTypeFixedHalftone125 } | `6` | A symmetric halftone palette with 5 intensity levels of each colour. |
| **PaletteTypeFixedHalftone216**{: #PaletteTypeFixedHalftone216 } | `7` | A symmetric halftone palette with 6 intensity levels of each colour. |
| **PaletteTypeFixedHalftone252**{: #PaletteTypeFixedHalftone252 } | `8` | An asymmetric halftone palette with 6 intensity levels of red, 7 of green and 6 of blue. |
| **PaletteTypeFixedHalftone256**{: #PaletteTypeFixedHalftone256 } | `9` | An asymmetric halftone palette with 8 intensity levels of red, 8 of green and 4 of blue. |

## Used by

- [**Bitmap**](../Bitmap) class: [**ConvertFormat**](../Bitmap#convertformat)
- [Helper functions](../Helpers): **InitializePalette**

## See Also

- [PaletteType](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspixelformats/ne-gdipluspixelformats-palettetype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Bitmap](../Bitmap) class
