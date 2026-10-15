---
title: ImageFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ImageFlags
---

# ImageFlags enumeration
{: .no_toc }

Specifies the attributes of the pixel data of an image.

The **Flags** property of [**Image**](../Image) returns a combination of these members as a **UINT**. Test a member with **And**.

The members combine with **Or**.

| Member | Value | Description |
|:-------|:------|:------------|
| **ImageFlagsNone**{: #ImageFlagsNone } | `0` | No format information. |
| **ImageFlagsScalable**{: #ImageFlagsScalable } | `&H0001` | The image can be scaled. |
| **ImageFlagsHasAlpha**{: #ImageFlagsHasAlpha } | `&H0002` | The pixel data contains alpha values. |
| **ImageFlagsHasTranslucent**{: #ImageFlagsHasTranslucent } | `&H0004` | The pixel data has alpha values other than 0 (transparent) and 255 (opaque). |
| **ImageFlagsPartiallyScalable**{: #ImageFlagsPartiallyScalable } | `&H0008` | The pixel data is partly scalable, with some limitations. |
| **ImageFlagsColorSpaceRGB**{: #ImageFlagsColorSpaceRGB } | `&H0010` | The image is stored in an RGB colour space. |
| **ImageFlagsColorSpaceCMYK**{: #ImageFlagsColorSpaceCMYK } | `&H0020` | The image is stored in a CMYK colour space. |
| **ImageFlagsColorSpaceGRAY**{: #ImageFlagsColorSpaceGRAY } | `&H0040` | The image is a grayscale image. |
| **ImageFlagsColorSpaceYCBCR**{: #ImageFlagsColorSpaceYCBCR } | `&H0080` | The image is stored in a YCbCr colour space. |
| **ImageFlagsColorSpaceYCCK**{: #ImageFlagsColorSpaceYCCK } | `&H0100` | The image is stored in a YCCK colour space. |
| **ImageFlagsHasRealDPI**{: #ImageFlagsHasRealDPI } | `&H1000` | The image holds dots per inch information. |
| **ImageFlagsHasRealPixelSize**{: #ImageFlagsHasRealPixelSize } | `&H2000` | The image holds the size of its pixels. |
| **ImageFlagsReadOnly**{: #ImageFlagsReadOnly } | `&H00010000` | The pixel data is read-only. |
| **ImageFlagsCaching**{: #ImageFlagsCaching } | `&H00020000` | The pixel data can be cached for faster access. |

## Used by

- [**Image**](../Image) class: [**Flags**](../Image#flags) returns a combination of the members

## See Also

- [ImageFlags](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ne-gdiplusimaging-imageflags) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Image](../Image) class
