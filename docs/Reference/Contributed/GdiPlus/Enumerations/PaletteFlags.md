---
title: PaletteFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/PaletteFlags
---

# PaletteFlags enumeration
{: .no_toc }

Indicates attributes of the colours in a palette.

The members combine with **Or**. The **flags** field of a **ColorPalette** holds them.

| Member | Value | Description |
|:-------|:------|:------------|
| **PaletteFlagsHasAlpha**{: #PaletteFlagsHasAlpha } | `&H0001` | The palette entries contain alpha information. |
| **PaletteFlagsGrayScale**{: #PaletteFlagsGrayScale } | `&H0002` | The palette holds only shades of gray. |
| **PaletteFlagsHalftone**{: #PaletteFlagsHalftone } | `&H0004` | The palette is a halftone palette. |

## Used by

- [**ColorPalette**](../Types/ColorPalette) type: **flags**, the **ColorPalette** function

## See Also

- [PaletteFlags](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspixelformats/ne-gdipluspixelformats-paletteflags) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
