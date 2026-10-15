---
title: GpMetafileType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpMetafileType
---

# GpMetafileType enumeration
{: .no_toc }

Specifies the kind of a metafile.

| Member | Value | Description |
|:-------|:------|:------------|
| **MetafileTypeInvalid**{: #MetafileTypeInvalid } | `0` | A metafile format that GDI+ does not recognise. |
| **MetafileTypeWmf**{: #MetafileTypeWmf } | `1` | A Windows metafile (WMF), which holds only GDI records. |
| **MetafileTypeWmfPlaceable**{: #MetafileTypeWmfPlaceable } | `2` | A WMF with a placeable metafile header in front of it. |
| **MetafileTypeEmf**{: #MetafileTypeEmf } | `3` | An enhanced metafile (EMF), which holds only GDI records. |
| **MetafileTypeEmfPlusOnly**{: #MetafileTypeEmfPlusOnly } | `4` | An EMF+ file, which holds only GDI+ records and must be displayed with GDI+. Displaying the records with GDI can give unpredictable results. |
| **MetafileTypeEmfPlusDual**{: #MetafileTypeEmfPlusDual } | `5` | An EMF+ Dual file, which holds GDI+ records and alternate GDI records. It can be displayed with GDI or GDI+. Displaying it with GDI can lower the quality. |

## Used by

- [**MetafileHeader**](../Types/MetafileHeader) type: **Type**

## See Also

- [MetafileType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-metafiletype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
