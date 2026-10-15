---
title: HistogramFormat
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/HistogramFormat
---

# HistogramFormat enumeration
{: .no_toc }

Specifies the number and the kind of the histograms that describe the colour channels of a bitmap.

It is the *format* argument of **Bitmap.GetHistogram**.

| Member | Value | Description |
|:-------|:------|:------------|
| **HistogramFormatARGB**{: #HistogramFormatARGB } | `0` | Four histograms: alpha, red, green and blue. The colours are not premultiplied. |
| **HistogramFormatPARGB**{: #HistogramFormatPARGB } | `1` | Four histograms: alpha, red, green and blue, with the colours premultiplied by alpha. |
| **HistogramFormatRGB**{: #HistogramFormatRGB } | `2` | Three histograms: red, green and blue. |
| **HistogramFormatGray**{: #HistogramFormatGray } | `3` | One histogram of the gray level. |
| **HistogramFormatB**{: #HistogramFormatB } | `4` | One histogram of the blue channel. |
| **HistogramFormatG**{: #HistogramFormatG } | `5` | One histogram of the green channel. |
| **HistogramFormatR**{: #HistogramFormatR } | `6` | One histogram of the red channel. |
| **HistogramFormatA**{: #HistogramFormatA } | `7` | One histogram of the alpha channel. |

## Used by

- [**Bitmap**](../Bitmap) class: [**GetHistogram**](../Bitmap#gethistogram), [**HistogramSize**](../Bitmap#histogramsize)

## See Also

- [HistogramFormat](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolormatrix/ne-gdipluscolormatrix-histogramformat) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Bitmap](../Bitmap) class
