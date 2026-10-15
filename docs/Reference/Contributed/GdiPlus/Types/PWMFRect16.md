---
title: PWMFRect16
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/PWMFRect16
---

# PWMFRect16 type
{: .no_toc }

A rectangle of 16-bit coordinates: the bounding box in the header of a placeable Windows metafile.

It is the type of the **BoundingBox** field of a [**WmfPlaceableFileHeader**](WmfPlaceableFileHeader). The type mirrors the GDI+ `PWMFRect16` structure, and is 8 bytes long.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Left** | **Integer** | The left edge, in metafile units. |
| **Top** | **Integer** | The top edge. |
| **Right** | **Integer** | The right edge. |
| **Bottom** | **Integer** | The bottom edge. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim box As PWMFRect16
box.Left = 0
box.Top = 0
box.Right = 2880
box.Bottom = 1440
Debug.Print (box.Right - box.Left) & " " & (box.Bottom - box.Top) & " " & LenB(box)
' Output:
' 2880 1440 8
```

## See Also

- [WmfPlaceableFileHeader](WmfPlaceableFileHeader) type
- [Metafile](../Metafile) class
