---
title: GpDriverStringOptions
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpDriverStringOptions
---

# GpDriverStringOptions enumeration
{: .no_toc }

Specifies the spacing, orientation and quality of the rendering of driver strings.

A driver string is an array of glyph indexes or Unicode values that **Graphics.DrawDriverString** draws at positions the caller gives. The members combine with **Or**.

| Member | Value | Description |
|:-------|:------|:------------|
| **DriverStringOptionsCmapLookup**{: #DriverStringOptionsCmapLookup } | `1` | The array holds Unicode character values. When the flag is not set, each value is an index of a glyph in the font. |
| **DriverStringOptionsVertical**{: #DriverStringOptionsVertical } | `2` | The string is displayed vertically. |
| **DriverStringOptionsRealizedAdvance**{: #DriverStringOptionsRealizedAdvance } | `4` | The positions of the glyphs are calculated from the position of the first glyph. When the flag is not set, they come from an array of coordinates. |
| **DriverStringOptionsLimitSubpixel**{: #DriverStringOptionsLimitSubpixel } | `8` | Less memory is used for the cache of antialiased glyphs, which also lowers the quality. When the flag is not set, more memory is used and the quality is higher. |

## Used by

- [**Graphics**](../Graphics) class: [**DrawDriverString**](../Graphics#drawdriverstring), [**MeasureDriverString**](../Graphics#measuredriverstring)

## See Also

- [DriverStringOptions](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-driverstringoptions) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
