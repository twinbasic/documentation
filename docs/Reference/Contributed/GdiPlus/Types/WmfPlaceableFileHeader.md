---
title: WmfPlaceableFileHeader
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/WmfPlaceableFileHeader
---

# WmfPlaceableFileHeader type
{: .no_toc }

The 22-byte header of a placeable Windows metafile: the position, size and scale that the plain WMF format lacks.

A Windows metafile (WMF) does not say how big it is or where it should be drawn. Many programs add this header in front of the metafile data to say so. The Windows API cannot play such a file directly, because the header has to be removed first, but GDI+ can: the [**Metafile**](../Metafile#creating) constructors for a WMF handle and for a WMF file take a **WmfPlaceableFileHeader**. The type mirrors the GDI+ [WmfPlaceableFileHeader](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusmetaheader/ns-gdiplusmetaheader-wmfplaceablefileheader) structure and is packed to 2 bytes.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Key** | **Long** | The identification value `&H9AC6CDD7`, which marks the presence of the header. |
| **Hmf** | **Integer** | The handle of the metafile in memory. It is 0 in a file. |
| **BoundingBox** | [**PWMFRect16**](PWMFRect16) | The corners of the picture, in metafile units. |
| **Inch** | **Integer** | The number of metafile units per inch. 1440 (twips) is the normal value; a smaller number scales the picture up and a larger one down. |
| **Reserved** | **Long** | Always 0. |
| **Checksum** | **Integer** | The exclusive OR of the previous ten 16-bit words of the header, which detects a damaged header. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim h As WmfPlaceableFileHeader
h.Key = &H9AC6CDD7
h.BoundingBox.Right = 2880
h.BoundingBox.Bottom = 1440
h.Inch = 1440

Debug.Print LenB(h)
Debug.Print Hex$(h.Key)
Debug.Print (h.BoundingBox.Right - h.BoundingBox.Left) / h.Inch & " inches wide"
' Output:
' 22
' 9AC6CDD7
' 2 inches wide
```

## See Also

- [WmfPlaceableFileHeader](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusmetaheader/ns-gdiplusmetaheader-wmfplaceablefileheader) -- Microsoft's documentation of the GDI+ structure
- [PWMFRect16](PWMFRect16) type
- [Metafile](../Metafile) class
- [MetafileHeader](MetafileHeader) type
