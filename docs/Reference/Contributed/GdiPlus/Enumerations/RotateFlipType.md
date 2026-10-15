---
title: RotateFlipType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/RotateFlipType
---

# RotateFlipType enumeration
{: .no_toc }

Specifies the direction of the rotation of an image and the axis it is flipped about.

A rotation is clockwise, in steps of 90 degrees, and happens before the flip. Several combinations give the same result, so the members have the same values: for example flipping about the vertical axis after a 180 degree rotation is the same as flipping about the horizontal axis with no rotation.

| Member | Value | Description |
|:-------|:------|:------------|
| **RotateNoneFlipNone**{: #RotateNoneFlipNone } | `0` | No rotation and no flip. |
| **Rotate90FlipNone**{: #Rotate90FlipNone } | `1` | A rotation by 90 degrees and no flip. |
| **Rotate180FlipNone**{: #Rotate180FlipNone } | `2` | A rotation by 180 degrees and no flip. |
| **Rotate270FlipNone**{: #Rotate270FlipNone } | `3` | A rotation by 270 degrees and no flip. |
| **RotateNoneFlipX**{: #RotateNoneFlipX } | `4` | No rotation, then a horizontal flip. |
| **Rotate90FlipX**{: #Rotate90FlipX } | `5` | A rotation by 90 degrees, then a horizontal flip. |
| **Rotate180FlipX**{: #Rotate180FlipX } | `6` | A rotation by 180 degrees, then a horizontal flip. |
| **Rotate270FlipX**{: #Rotate270FlipX } | `7` | A rotation by 270 degrees, then a horizontal flip. |
| **RotateNoneFlipY**{: #RotateNoneFlipY } | `6` | No rotation, then a vertical flip. Same as **Rotate180FlipX**. |
| **Rotate90FlipY**{: #Rotate90FlipY } | `7` | A rotation by 90 degrees, then a vertical flip. Same as **Rotate270FlipX**. |
| **Rotate180FlipY**{: #Rotate180FlipY } | `4` | A rotation by 180 degrees, then a vertical flip. Same as **RotateNoneFlipX**. |
| **Rotate270FlipY**{: #Rotate270FlipY } | `5` | A rotation by 270 degrees, then a vertical flip. Same as **Rotate90FlipX**. |
| **RotateNoneFlipXY**{: #RotateNoneFlipXY } | `2` | No rotation, then a horizontal and a vertical flip. Same as **Rotate180FlipNone**. |
| **Rotate90FlipXY**{: #Rotate90FlipXY } | `3` | A rotation by 90 degrees, then a horizontal and a vertical flip. Same as **Rotate270FlipNone**. |
| **Rotate180FlipXY**{: #Rotate180FlipXY } | `0` | A rotation by 180 degrees, then a horizontal and a vertical flip. Same as **RotateNoneFlipNone**. |
| **Rotate270FlipXY**{: #Rotate270FlipXY } | `1` | A rotation by 270 degrees, then a horizontal and a vertical flip. Same as **Rotate90FlipNone**. |

## Used by

- [**Image**](../Image) class: [**RotateFlip**](../Image#rotateflip)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(4!, 2!)
bmp.Pixel(0, 0) = Color(CColor.Red)
Debug.Print bmp.Width, bmp.Height

bmp.RotateFlip Rotate90FlipNone
Debug.Print bmp.Width, bmp.Height
Debug.Print Hex$(bmp.Pixel(1, 0).Value)
' Output:
' 4             2
' 2             4
' FFFF0000
```

A rotation by 90 degrees swaps the width and the height. The red pixel at the upper left corner moves to the upper right corner.

## See Also

- [RotateFlipType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ne-gdiplusimaging-rotatefliptype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Image](../Image) class
