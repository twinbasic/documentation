---
title: GpCompositingMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpCompositingMode
---

# GpCompositingMode enumeration
{: .no_toc }

Selects how a drawn colour is combined with the colour already on the surface.

The setting is the **CompositingMode** property of [**Graphics**](../Graphics). It matters only for colours that are not fully opaque.

<!-- test: Gr_GraphicsTests.DrawString_ClearTypeGridFitWithSourceCopy_ReturnsInvalidParameter -->
> [!NOTE] timeless
> Text drawn with [**TextRenderingHintClearTypeGridFit**](GpTextRenderingHint) cannot be combined with **CompositingModeSourceCopy**. This is a limit of GDI+.

| Member | Value | Description |
|:-------|:------|:------------|
| **CompositingModeSourceOver**{: #CompositingModeSourceOver } | `0` | The drawn colour is blended with the background according to its alpha value. |
| **CompositingModeSourceCopy**{: #CompositingModeSourceCopy } | `1` | The drawn colour replaces the background colour, alpha value included. |

## Used by

- [**Graphics**](../Graphics) class: [**CompositingMode**](../Graphics#compositingmode)

## See Also

- [CompositingMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-compositingmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
