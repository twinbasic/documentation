---
title: PixelFormat
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/PixelFormat
---

# PixelFormat enumeration
{: .no_toc }

Specifies the format of the pixels of a bitmap in memory.

A pixel format is a number made of three parts. Bits 0 to 7 are the index of the format. Bits 8 to 15 are the size of a pixel in bits. Bits 16 to 23 are flags, which are the first six members of the table. The formats are built from these parts with **Or**, so the flags of a format can be tested with **And**, and the package offers [**GetPixelFormatSize**](../Helpers) and the **IsAlphaPixelFormat**, **IsCanonicalPixelFormat**, **IsExtendedPixelFormat** and **IsIndexedPixelFormat** functions that do this.

In memory a 24-bit or 32-bit pixel stores its channels in the order blue, green, red, and then alpha.

| Member | Value | Description |
|:-------|:------|:------------|
| **PixelFormatIndexed**{: #PixelFormatIndexed } | `&H00010000` | A flag. The pixel values are indexes into a colour palette. |
| **PixelFormatGDI**{: #PixelFormatGDI } | `&H00020000` | A flag. GDI supports the format. |
| **PixelFormatAlpha**{: #PixelFormatAlpha } | `&H00040000` | A flag. The format has an alpha component. |
| **PixelFormatPAlpha**{: #PixelFormatPAlpha } | `&H00080000` | A flag. The colour components are premultiplied by the alpha component. |
| **PixelFormatExtended**{: #PixelFormatExtended } | `&H00100000` | A flag. The format has 16 bits per colour component. |
| **PixelFormatCanonical**{: #PixelFormatCanonical } | `&H00200000` | A flag. The format is one of the canonical formats: the 32-bit and 64-bit ARGB formats, with or without premultiplied alpha. |
| **PixelFormatUndefined**{: #PixelFormatUndefined } | `0` | The format is not specified. |
| **PixelFormatDontCare**{: #PixelFormatDontCare } | `0` | The format is not specified. Same as **PixelFormatUndefined**. |
| **PixelFormat1bppIndexed**{: #PixelFormat1bppIndexed } | `&H00030101` | 1 bit per pixel, indexed. |
| **PixelFormat4bppIndexed**{: #PixelFormat4bppIndexed } | `&H00030402` | 4 bits per pixel, indexed. |
| **PixelFormat8bppIndexed**{: #PixelFormat8bppIndexed } | `&H00030803` | 8 bits per pixel, indexed. |
| **PixelFormat16bppGrayScale**{: #PixelFormat16bppGrayScale } | `&H00101004` | 16 bits per pixel, grayscale: 65,536 shades of gray. |
| **PixelFormat16bppRGB555**{: #PixelFormat16bppRGB555 } | `&H00021005` | 16 bits per pixel. Red, green and blue have 5 bits each; 1 bit is not used. |
| **PixelFormat16bppRGB565**{: #PixelFormat16bppRGB565 } | `&H00021006` | 16 bits per pixel. Red has 5 bits, green has 6 bits and blue has 5 bits. |
| **PixelFormat16bppARGB1555**{: #PixelFormat16bppARGB1555 } | `&H00061007` | 16 bits per pixel. Alpha has 1 bit; red, green and blue have 5 bits each. |
| **PixelFormat24bppRGB**{: #PixelFormat24bppRGB } | `&H00021808` | 24 bits per pixel. Red, green and blue have 8 bits each. |
| **PixelFormat32bppRGB**{: #PixelFormat32bppRGB } | `&H00022009` | 32 bits per pixel. Red, green and blue have 8 bits each; 8 bits are not used. |
| **PixelFormat32bppARGB**{: #PixelFormat32bppARGB } | `&H0026200A` | 32 bits per pixel. Alpha, red, green and blue have 8 bits each. The colours are not premultiplied. This is the default format of a new **Bitmap**. |
| **PixelFormat32bppPARGB**{: #PixelFormat32bppPARGB } | `&H000E200B` | 32 bits per pixel. Alpha, red, green and blue have 8 bits each. The colours are premultiplied by the alpha component. |
| **PixelFormat48bppRGB**{: #PixelFormat48bppRGB } | `&H0010300C` | 48 bits per pixel. Red, green and blue have 16 bits each. |
| **PixelFormat64bppARGB**{: #PixelFormat64bppARGB } | `&H0034400D` | 64 bits per pixel. Alpha, red, green and blue have 16 bits each. The colours are not premultiplied. |
| **PixelFormat64bppPARGB**{: #PixelFormat64bppPARGB } | `&H001C400E` | 64 bits per pixel. Alpha, red, green and blue have 16 bits each. The colours are premultiplied by the alpha component. |
| **PixelFormat32bppCMYK**{: #PixelFormat32bppCMYK } | `&H0000200F` | 32 bits per pixel. Cyan, magenta, yellow and black have 8 bits each. |
| **PixelFormatMax**{: #PixelFormatMax } | `16` | One more than the highest index of a format. It is not a format. |

## Used by

- [**Bitmap**](../Bitmap) class: [**Clone**](../Bitmap#clone), [**CloneI**](../Bitmap#clonei), [**ConvertFormat**](../Bitmap#convertformat), [**LockBits**](../Bitmap#lockbits), [constructor](../Bitmap#creating)
- [**BitmapData**](../Types/BitmapData) type: **PixelFormat**
- [**Image**](../Image) class: [**PixelFormat**](../Image#pixelformat)
- [Helper functions](../Helpers): **CloneBitmapArea**, **CloneBitmapArea2**, **CloneBitmapArea2I**, **CloneBitmapAreaI**, **GetPixelFormatSize**, **IsAlphaPixelFormat**, **IsCanonicalPixelFormat**, **IsExtendedPixelFormat**, **IsIndexedPixelFormat**

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(4!, 4!)
Dim format As PixelFormat = bmp.PixelFormat

Debug.Print format = PixelFormat32bppARGB
Debug.Print GetPixelFormatSize(format)
Debug.Print (format And PixelFormatAlpha) <> 0
Debug.Print (format And PixelFormatIndexed) <> 0
' Output:
' True
' 32
' True
' False
```

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [Bitmap](../Bitmap) class
- [Image](../Image) class
