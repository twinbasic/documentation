---
title: ColorMatrix
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorMatrix
has_toc: false
---

# ColorMatrix type
{: .no_toc }

A 5 by 5 matrix of **Single** values that transforms colours.

A **ColorMatrix** has one field, the array **m**(0 To 4, 0 To 4) of **Single**, and no methods. Handing one to [**ImageAttributes**](../ImageAttributes) with **SetColorMatrix** transforms every colour that is drawn with those attributes. A [**ColorMatrixEffect**](../ColorMatrixEffect) applies one to a bitmap. It mirrors the `ColorMatrix` structure of GDI+.

## How the matrix is read

A colour is a row of five numbers: red, green, blue and alpha, each from 0 to 1 (the channel divided by 255), and a fifth number that is always 1. The new colour is that row multiplied by the matrix. The five positions, numbered 0 to 4, are red, green, blue, alpha and the translation (the amount added).

The array is indexed by the **output** component first and the **input** component second:

*new component* **j** = sum over **i** of *old component* **i** times **m**(**j**, **i**)

| Element | Effect |
|---|---|
| **m**(**j**, **j**) | the factor that channel **j** is multiplied by (1 leaves it) |
| **m**(**j**, **i**) for **i** other than **j** and 4 | adds channel **i**, times the value, to channel **j** |
| **m**(**j**, 4) | adds the value, as a fraction of 255, to channel **j** |
| **m**(4, 4) | 1 |

> [!NOTE] 0.9.45.0
> The two indexes are the reverse of the C++ `ColorMatrix`, where `m[i][j]` has the input row first: the array is stored so that its memory layout is the one GDI+ expects. To add a value to red, set **m**(0, 4), not `m[4][0]`.

A variable declared with `Dim` holds all zeros, which turns every colour into transparent black. Start from the identity matrix, with 1 on the diagonal.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim src As Bitmap = Bitmap(4!, 4!)
src.Pixel(1, 1) = Color(255, 200, 100, 40)
Dim dst As Bitmap = Bitmap(4!, 4!)
Dim g As Graphics = Graphics(dst)
Dim ia As ImageAttributes = New ImageAttributes()
Dim cm As ColorMatrix
Dim i As Long
For i = 0 To 4
    cm.m(i, i) = 1
Next

ia.SetColorMatrix cm
g.DrawImage src, GpRect(0, 0, 4, 4), GpRect(0, 0, 4, 4), UnitPixel, ia
Debug.Print Hex$(dst.Pixel(1, 1).Value)                          ' FFC86428

cm.m(0, 0) = 0.5                       ' half the red
ia.SetColorMatrix cm
g.Clear Color(0, 0, 0, 0)
g.DrawImage src, GpRect(0, 0, 4, 4), GpRect(0, 0, 4, 4), UnitPixel, ia
Debug.Print Hex$(dst.Pixel(1, 1).Value)                          ' FF646428

cm.m(0, 0) = 1
cm.m(2, 2) = 0: cm.m(2, 0) = 1         ' blue = red
ia.SetColorMatrix cm
g.Clear Color(0, 0, 0, 0)
g.DrawImage src, GpRect(0, 0, 4, 4), GpRect(0, 0, 4, 4), UnitPixel, ia
Debug.Print Hex$(dst.Pixel(1, 1).Value)                          ' FFC864C8
```

The related enumerations are [**ColorMatrixFlags**](../Enumerations/ColorMatrixFlags), which says how grays are treated, and [**ColorAdjustType**](../Enumerations/ColorAdjustType), which says what kind of drawing the matrix applies to.

## See Also

- [ColorChannelLUT](ColorChannelLUT) type -- a lookup table for one channel
- [Color](Color) type -- a colour
- [ImageAttributes](../ImageAttributes) class -- **SetColorMatrix** and **SetColorMatrices**
- [ColorMatrixEffect](../ColorMatrixEffect) class -- the matrix as an effect
- [Types](.) -- the types of the package
- [ColorMatrix](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolormatrix/ns-gdipluscolormatrix-colormatrix) -- the GDI+ structure on Microsoft Learn
