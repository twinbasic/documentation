---
title: GpTextRenderingHint
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpTextRenderingHint
---

# GpTextRenderingHint enumeration
{: .no_toc }

Specifies the process used to render text, which affects the quality of the text.

A process that gives higher quality is generally slower than one that gives lower quality. **TextRenderingHintClearTypeGridFit** gives the best quality for most LCD monitors and relatively small font sizes. **TextRenderingHintAntiAlias** gives the best quality for rotated text.

<!-- test: Gr_GraphicsTests.DrawString_ClearTypeGridFitWithSourceCopy_ReturnsInvalidParameter -->
> [!NOTE] timeless
> **TextRenderingHintClearTypeGridFit** cannot be used together with [**CompositingModeSourceCopy**](GpCompositingMode).

| Member | Value | Description |
|:-------|:------|:------------|
| **TextRenderingHintSystemDefault**{: #TextRenderingHintSystemDefault } | `0` | A character is drawn with the font smoothing mode that is currently selected in the system. |
| **TextRenderingHintSingleBitPerPixelGridFit**{: #TextRenderingHintSingleBitPerPixelGridFit } | `1` | A character is drawn with its glyph bitmap and hinting, which improves the look of stems and curves. |
| **TextRenderingHintSingleBitPerPixel**{: #TextRenderingHintSingleBitPerPixel } | `2` | A character is drawn with its glyph bitmap and no hinting. This is faster and gives lower quality. |
| **TextRenderingHintAntiAliasGridFit**{: #TextRenderingHintAntiAliasGridFit } | `3` | A character is drawn with its antialiased glyph bitmap and hinting. The quality is much better, at a higher cost in time. |
| **TextRenderingHintAntiAlias**{: #TextRenderingHintAntiAlias } | `4` | A character is drawn with its antialiased glyph bitmap and no hinting. Differences in stem width can be noticeable, because hinting is off. |
| **TextRenderingHintClearTypeGridFit**{: #TextRenderingHintClearTypeGridFit } | `5` | A character is drawn with its ClearType glyph bitmap and hinting. |

## Used by

- [**Graphics**](../Graphics) class: [**TextRenderingHint**](../Graphics#textrenderinghint)

## See Also

- [TextRenderingHint](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-textrenderinghint) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
