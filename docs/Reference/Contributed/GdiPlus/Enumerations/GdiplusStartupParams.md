---
title: GdiplusStartupParams
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GdiplusStartupParams
---

# GdiplusStartupParams enumeration
{: .no_toc }

Specifies options for the start-up of GDI+.

GDI+ version 1 ignores these values. They apply when the **GdiplusVersion** of the [**GdiplusStartupInput**](../Types/GdiplusStartupInput) is 2 or higher. The default input of the **GdiPlusUser** constructor function uses **GdiplusStartupDefault**.

> [!NOTE] 0.9.45.0
> **GdiplusStartupReserved1** and **GdiplusStartupReserved2** have the values 5 and 6, because the package gives no value to them and they follow **GdiplusStartupReserved0**. They are not single bits.

The members combine with **Or**.

| Member | Value | Description |
|:-------|:------|:------------|
| **GdiplusStartupDefault**{: #GdiplusStartupDefault } | `0` | The default behaviour. |
| **GdiplusStartupNoSetRound**{: #GdiplusStartupNoSetRound } | `1` | No set round for start-up. Microsoft gives no further description. |
| **GdiplusStartupSetPSValue**{: #GdiplusStartupSetPSValue } | `2` | A pixel shader value for start-up. Microsoft gives no further description. |
| **GdiplusStartupReserved0**{: #GdiplusStartupReserved0 } | `4` | Reserved. |
| **GdiplusStartupReserved1**{: #GdiplusStartupReserved1 } | `5` | Reserved. |
| **GdiplusStartupReserved2**{: #GdiplusStartupReserved2 } | `6` | Reserved. |
| **GdiplusStartupTransparencyMask**{: #GdiplusStartupTransparencyMask } | `&HFF00_0000` | A transparency mask for start-up: the highest byte. |

## Used by

- [**GdiplusStartupInput**](../Types/GdiplusStartupInput) type: **StartupParameters**
- [**GdiPlusUser**](../GdiPlusUser) class: [constructor](../GdiPlusUser#creating)

## See Also

- [GdiplusStartupParams](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusinit/ne-gdiplusinit-gdiplusstartupparams) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [GdiPlusUser](../GdiPlusUser) class
