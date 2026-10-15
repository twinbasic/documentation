---
title: GpWrapMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpWrapMode
---

# GpWrapMode enumeration
{: .no_toc }

Selects how copies of an image or a gradient tile an area larger than the original.

| Member | Value | Description |
|:-------|:------|:------------|
| **WrapModeTile**{: #WrapModeTile } | `0` | Tiles without flipping. |
| **WrapModeTileFlipX**{: #WrapModeTileFlipX } | `1` | Flips each tile horizontally relative to the previous tile in a row. |
| **WrapModeTileFlipY**{: #WrapModeTileFlipY } | `2` | Flips each tile vertically relative to the previous tile in a column. |
| **WrapModeTileFlipXY**{: #WrapModeTileFlipXY } | `3` | Flips tiles horizontally along a row and vertically along a column. |
| **WrapModeClamp**{: #WrapModeClamp } | `4` | No tiling takes place. |

## Used by

- [**ImageAttributes**](../ImageAttributes) class: [**SetWrapMode**](../ImageAttributes#setwrapmode)
- [**LinearGradientBrush**](../LinearGradientBrush) class: [**WrapMode**](../LinearGradientBrush#wrapmode)
- [**PathGradientBrush**](../PathGradientBrush) class: [**WrapMode**](../PathGradientBrush#wrapmode), [constructor](../PathGradientBrush#creating)
- [**TextureBrush**](../TextureBrush) class: [**WrapMode**](../TextureBrush#wrapmode), [constructor](../TextureBrush#creating)

## See Also

- [WrapMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-wrapmode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [ImageAttributes](../ImageAttributes) class
- [LinearGradientBrush](../LinearGradientBrush) class
- [PathGradientBrush](../PathGradientBrush) class
- [TextureBrush](../TextureBrush) class
