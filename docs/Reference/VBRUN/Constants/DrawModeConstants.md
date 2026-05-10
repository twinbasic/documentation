---
title: DrawModeConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/DrawModeConstants
---
# DrawModeConstants
{: .no_toc }

GDI raster-operation values for the **DrawMode** property, controlling how the pen colour is combined with the existing pixels when drawing with **PSet**, **Line**, **Circle**, and similar methods.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbBlackness**{: #vbBlackness } | 1 | Output is black. |
| **vbNotMergePen**{: #vbNotMergePen } | 2 | Inverse of **vbMergePen**. |
| **vbMaskNotPen**{: #vbMaskNotPen } | 3 | Combination of the colours common to the background and the inverse of the pen. |
| **vbNotCopyPen**{: #vbNotCopyPen } | 4 | Inverse of **vbCopyPen**. |
| **vbMaskPenNot**{: #vbMaskPenNot } | 5 | Combination of the pen and the inverse of the screen. |
| **vbInvert**{: #vbInvert } | 6 | Inverse of the existing screen colour. |
| **vbXorPen**{: #vbXorPen } | 7 | XOR of the pen and the screen. |
| **vbNotMaskPen**{: #vbNotMaskPen } | 8 | Inverse of **vbMaskPen**. |
| **vbMaskPen**{: #vbMaskPen } | 9 | Combination of the colours common to both the pen and the screen. |
| **vbNotXorPen**{: #vbNotXorPen } | 10 | Inverse of **vbXorPen**. |
| **vbNop**{: #vbNop } | 11 | No drawing — the screen is left unchanged. |
| **vbMergeNotPen**{: #vbMergeNotPen } | 12 | Combination of the screen and the inverse of the pen. |
| **vbCopyPen**{: #vbCopyPen } | 13 | Output is the pen colour (the default). |
| **vbMergePenNot**{: #vbMergePenNot } | 14 | Combination of the pen and the inverse of the screen. |
| **vbMergePen**{: #vbMergePen } | 15 | Combination of the pen colour and the screen colour. |
| **vbWhiteness**{: #vbWhiteness } | 16 | Output is white. |
