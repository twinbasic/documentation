---
title: GpImageItemData
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpImageItemData
---

# GpImageItemData type
{: .no_toc }

An item of extra data stored with an image: a block of bytes, its description and the way it is to be saved.

[**Image.FindFirstItem**](../Image#findfirstitem), **FindNextItem** and [**GetItemData**](../Image#getitemdata) enumerate and read such items; an array of one element holds the item and the memory its **Desc** and **Data** fields point to. The type mirrors the GDI+ [ImageItemData](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-imageitemdata) structure and needs GDI+ 1.1. The array that those methods return cannot be read in 0.9.45.0; see [**Image**](../Image#items-of-image-data).

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Size** | **Long** | The size of the structure and the data after it, in bytes. |
| **Position** | **Long** | Where the data goes in the saved file, an [**ItemDataPosition**](../Enumerations/ItemDataPosition) value. |
| **Desc** | **LongPtr** | The address of a description of how to save the data. It differs for every codec. |
| **DescSize** | **Long** | The size of the description in bytes. |
| **Data** | **LongPtr** | The address of the data, which a codec saves as it is. |
| **DataSize** | **Long** | The size of the data in bytes. |
| **Cookie** | **Long** | A value that GDI+ uses while it enumerates the items. A program leaves it alone. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim item As GpImageItemData
Debug.Print item.Size & " " & item.DataSize & " " & (item.Data = 0)
' Output:
' 0 0 True
```

## See Also

- [ImageItemData](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-imageitemdata) -- Microsoft's documentation of the GDI+ structure
- [Image](../Image) class
- [ItemDataPosition](../Enumerations/ItemDataPosition) enumeration
