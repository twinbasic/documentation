---
title: TextAlignment
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/TextAlignment
---
# TextAlignment
{: .no_toc }

Horizontal and vertical alignment of text drawn inside a control's bounding rectangle. Carried by [**TextRendering.Alignment**](../Styles/TextRendering#alignment); each member combines one of three vertical positions (top, middle, bottom) with one of three horizontal positions (left, centre, right).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbAlignTopLeft**{: #tbAlignTopLeft } | 0 | Top edge, left-aligned. |
| **tbAlignTopCenter**{: #tbAlignTopCenter } | 1 | Top edge, horizontally centred. |
| **tbAlignTopRight**{: #tbAlignTopRight } | 2 | Top edge, right-aligned. |
| **tbAlignMiddleLeft**{: #tbAlignMiddleLeft } | 3 | Vertically centred, left-aligned. |
| **tbAlignMiddleCenter**{: #tbAlignMiddleCenter } | 4 | Vertically centred, horizontally centred. The default for newly-constructed [**TextRendering**](../Styles/TextRendering) objects. |
| **tbAlignMiddleRight**{: #tbAlignMiddleRight } | 5 | Vertically centred, right-aligned. |
| **tbAlignBottomLeft**{: #tbAlignBottomLeft } | 6 | Bottom edge, left-aligned. |
| **tbAlignBottomCenter**{: #tbAlignBottomCenter } | 7 | Bottom edge, horizontally centred. |
| **tbAlignBottomRight**{: #tbAlignBottomRight } | 8 | Bottom edge, right-aligned. |

The padding added around the text by [**TextRendering.Padding**](../Styles/TextRendering#padding) is applied first; the alignment then positions the text inside the padded region.
