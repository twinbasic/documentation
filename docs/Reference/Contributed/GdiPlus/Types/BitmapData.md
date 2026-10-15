---
title: BitmapData
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/BitmapData
---

# BitmapData type
{: .no_toc }

The description of the pixels that [**Bitmap.LockBits**](../Bitmap#lockbits) has locked in memory: their size, layout and address.

The type mirrors the GDI+ [BitmapData](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-bitmapdata) structure. A program declares a variable of the type, passes it to **LockBits**, and reads the pixels from the address in **Scan0**. [**UnlockBits**](../Bitmap#unlockbits) takes it back.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Width** | **Long** | The width of the locked area in pixels. |
| **Height** | **Long** | The height of the locked area in pixels. |
| **Stride** | **Long** | The number of bytes from the start of one row to the start of the next. It is a multiple of 4, and negative when the rows run from the bottom up. |
| **PixelFormat** | [**PixelFormat**](../Enumerations/PixelFormat) | The pixel format of the locked data. |
| **Scan0** | **LongPtr** | The address of the first pixel. The pixel (*x*, *y*) of a format with *b* bytes per pixel is at `Scan0 + y * Stride + x * b`. |
| **Reserved** | **LongPtr** | Reserved by GDI+. A program leaves it alone. |

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
bmp.Pixel(2, 1) = Color(255, 1, 2, 3)

Dim bd As BitmapData
bmp.LockBits GpRect(0, 0, 4, 4), ImageLockModeRead, PixelFormat32bppARGB, bd
Dim v As Long
GetMem4 bd.Scan0 + 1 * bd.Stride + 2 * 4, v       ' the pixel (2, 1)
bmp.UnlockBits bd
Debug.Print bd.Width & " " & bd.Height & " " & bd.Stride
Debug.Print Hex$(v)
' Output:
' 4 4 16
' FF010203
```

## See Also

- [BitmapData](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-bitmapdata) -- Microsoft's documentation of the GDI+ structure
- [Bitmap](../Bitmap) class
- [ImageLockMode](../Enumerations/ImageLockMode) enumeration
