---
title: GpMetafileFrameUnit
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpMetafileFrameUnit
---

# GpMetafileFrameUnit enumeration
{: .no_toc }

Specifies the unit of measure of the frame rectangle of a metafile.

The first five members have the values of the matching members of [GpUnit](GpUnit).

| Member | Value | Description |
|:-------|:------|:------------|
| **MetafileFrameUnitPixel**{: #MetafileFrameUnitPixel } | `2` | One pixel. |
| **MetafileFrameUnitPoint**{: #MetafileFrameUnitPoint } | `3` | One point, 1/72 inch. |
| **MetafileFrameUnitInch**{: #MetafileFrameUnitInch } | `4` | One inch. |
| **MetafileFrameUnitDocument**{: #MetafileFrameUnitDocument } | `5` | One document unit, 1/300 inch. |
| **MetafileFrameUnitMillimeter**{: #MetafileFrameUnitMillimeter } | `6` | One millimetre. |
| **MetafileFrameUnitGdi**{: #MetafileFrameUnitGdi } | `7` | 0.01 millimetre, the unit that GDI uses for the frame of an enhanced metafile. |

## Used by

- [**Metafile**](../Metafile) class: [constructor](../Metafile#creating)

## See Also

- [MetafileFrameUnit](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-metafileframeunit) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Metafile](../Metafile) class
