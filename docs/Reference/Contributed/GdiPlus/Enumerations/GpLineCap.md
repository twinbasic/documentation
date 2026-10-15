---
title: GpLineCap
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpLineCap
---

# GpLineCap enumeration
{: .no_toc }

Selects the shape at the end of a line drawn with a pen.

A cap can be a plain end, or an anchor: a shape centred on the last point of the line that is wider than the line. Only the lowest 8 bits of a value are used. **LineCapAnchorMask** is the mask that the GDI+ header gives for checking whether a cap is an anchor.

| Member | Value | Description |
|:-------|:------|:------------|
| **LineCapFlat**{: #LineCapFlat } | `0` | The line ends at the last point; the end is squared off. |
| **LineCapSquare**{: #LineCapSquare } | `1` | A square cap. Its centre is the last point of the line, and its sides equal the line width. |
| **LineCapRound**{: #LineCapRound } | `2` | A round cap. Its centre is the last point of the line, and its diameter equals the line width. |
| **LineCapTriangle**{: #LineCapTriangle } | `3` | A triangular cap. Its base is at the last point of the line and equals the line width. |
| **LineCapNoAnchor**{: #LineCapNoAnchor } | `&H10` | No anchor. The end looks like **LineCapFlat**. |
| **LineCapSquareAnchor**{: #LineCapSquareAnchor } | `&H11` | An anchor in the shape of a square, centred on the last point of the line. It is wider than the line. |
| **LineCapRoundAnchor**{: #LineCapRoundAnchor } | `&H12` | An anchor in the shape of a circle, centred on the last point of the line. It is wider than the line. |
| **LineCapDiamondAnchor**{: #LineCapDiamondAnchor } | `&H13` | An anchor in the shape of a diamond (a square turned 45 degrees), centred on the last point of the line. |
| **LineCapArrowAnchor**{: #LineCapArrowAnchor } | `&H14` | An arrowhead whose point is at the last point of the line. It is wider than the line. |
| **LineCapCustom**{: #LineCapCustom } | `&HFF` | A cap made from a [**CustomLineCap**](../CustomLineCap) set on the pen. |
| **LineCapAnchorMask**{: #LineCapAnchorMask } | `&HF0` | A mask for the anchor bits, used to test whether a cap is an anchor. It is not a cap. |

## Used by

- [**CustomLineCap**](../CustomLineCap) class: [**BaseCap**](../CustomLineCap#basecap), [**EndStrokeCap**](../CustomLineCap#endstrokecap), [**GetStrokeCaps**](../CustomLineCap#getstrokecaps), [**SetStrokeCaps**](../CustomLineCap#setstrokecaps), [**StartStrokeCap**](../CustomLineCap#startstrokecap), [**StrokeCap**](../CustomLineCap#strokecap), [constructor](../CustomLineCap#creating)
- [**Pen**](../Pen) class: [**Caps**](../Pen#caps), [**DashCap**](../Pen#dashcap), [**EndCap**](../Pen#endcap), [**SetLineCap**](../Pen#setlinecap), [**StartCap**](../Pen#startcap)

## See Also

- [LineCap](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-linecap) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [CustomLineCap](../CustomLineCap) class
- [Pen](../Pen) class
