---
title: GpEmfType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpEmfType
---

# GpEmfType enumeration
{: .no_toc }

Specifies the kind of records that are written to a new enhanced metafile.

The members have the values of the matching members of [GpMetafileType](GpMetafileType).

| Member | Value | Description |
|:-------|:------|:------------|
| **EmfTypeEmfOnly**{: #EmfTypeEmfOnly } | `3` | All records are EMF records, which GDI or GDI+ can display. |
| **EmfTypeEmfPlusOnly**{: #EmfTypeEmfPlusOnly } | `4` | All records are EMF+ records, which GDI+ can display and GDI cannot. |
| **EmfTypeEmfPlusDual**{: #EmfTypeEmfPlusDual } | `5` | Each EMF+ record has an alternate EMF record. GDI or GDI+ can display the metafile. This is the default of the **Metafile** constructors. |

## Used by

- [**Metafile**](../Metafile) class: [**ConvertToEmfPlus**](../Metafile#converttoemfplus), [constructor](../Metafile#creating)

## See Also

- [EmfType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-emftype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Metafile](../Metafile) class
