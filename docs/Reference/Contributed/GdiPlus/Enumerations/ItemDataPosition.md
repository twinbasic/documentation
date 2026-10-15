---
title: ItemDataPosition
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ItemDataPosition
---

# ItemDataPosition enumeration
{: .no_toc }

Specifies the location of custom metadata in an image file.

The item data of an image is custom metadata in a JPEG, PNG or GIF file. No public member takes or returns this enumeration.

| Member | Value | Description |
|:-------|:------|:------------|
| **ItemDataPositionAfterHeader**{: #ItemDataPositionAfterHeader } | `&H0` | The item data is stored after the header. |
| **ItemDataPositionAfterPalette**{: #ItemDataPositionAfterPalette } | `&H1` | The item data is stored after the palette. |
| **ItemDataPositionAfterBits**{: #ItemDataPositionAfterBits } | `&H2` | The item data is stored after the pixel data. |

## See Also

- [ItemDataPosition](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ne-gdiplusimaging-itemdataposition) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
