---
title: ColorMatrixFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ColorMatrixFlags
---

# ColorMatrixFlags enumeration
{: .no_toc }

Specifies which colours a colour matrix and a grayscale matrix of an **ImageAttributes** object change.

The members are alternatives, not bits to combine. A gray shade is any colour with equal red, green and blue components.

| Member | Value | Description |
|:-------|:------|:------------|
| **ColorMatrixFlagsDefault**{: #ColorMatrixFlagsDefault } | `0` | All colour values, gray shades included, are adjusted by the same colour matrix. |
| **ColorMatrixFlagsSkipGrays**{: #ColorMatrixFlagsSkipGrays } | `1` | Colours are adjusted, but gray shades are not. |
| **ColorMatrixFlagsAltGray**{: #ColorMatrixFlagsAltGray } | `2` | Colours are adjusted by one matrix and gray shades by another. |

## Used by

- [**ImageAttributes**](../ImageAttributes) class: [**SetColorMatrices**](../ImageAttributes#setcolormatrices), [**SetColorMatrix**](../ImageAttributes#setcolormatrix)

## See Also

- [ColorMatrixFlags](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolormatrix/ne-gdipluscolormatrix-colormatrixflags) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [ImageAttributes](../ImageAttributes) class
