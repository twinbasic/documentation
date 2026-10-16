---
title: ColorMatrixEffect
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ColorMatrixEffect
---

# ColorMatrixEffect class
{: .no_toc }

An [**Effect**](Effect) that transforms the colours of a picture with a 5 by 5 colour matrix.

It does with a [**Bitmap**](Bitmap) what [**ImageAttributes.SetColorMatrix**](ImageAttributes#setcolormatrix) does while drawing, and uses the same [**ColorMatrix**](Types/ColorMatrix): the page of **ImageAttributes** explains how the matrix is read. The class mirrors the GDI+ [ColorMatrixEffect](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colormatrixeffect) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= ColorMatrixEffect**( )

Syntax: *fx* **= ColorMatrixEffect**( *params* )

Each form is also available as **New ColorMatrixEffect**( ... ) with the same arguments.

*params*
: *required* A [**ColorMatrix**](Types/ColorMatrix).

A constructor that fails creates an unusable object whose **LastResult** tells why. The effect created without arguments has the default matrix of GDI+.

<!-- test: Fx_EffectTests.ColorMatrixEffect_NewWithParams_StoresTheMatrix -->
> [!WARNING] 0.9.45.0
> The form with *params* stops the program with an access violation, in 32-bit and 64-bit programs. Create the effect without arguments and set [**Parameters**](#parameters).

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**ColorMatrix**](Types/ColorMatrix).

<!-- test: Fx_EffectTests.ColorMatrixEffect_ParametersGetWithoutSize_ReturnsTheParameters -->
> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of ColorMatrix))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim cm As ColorMatrix
Dim i As Long
For i = 0 To 4
    cm.m(i, i) = 1
Next
cm.m(2, 0) = 1                              ' blue += red

Dim fx As ColorMatrixEffect = ColorMatrixEffect()
fx.Parameters = cm
Debug.Print fx.LastResult

Dim back As ColorMatrix = fx.Parameters(LenB(Of ColorMatrix))
Debug.Print back.m(2, 0) & " " & back.m(0, 2) & " " & back.m(1, 1)
' Output:
' 0
' 1 0 1
```

## Example

The example swaps the red and blue channels of a bitmap.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Graphics(bmp).Clear(Color(255, 200, 100, 50))

Dim swap As ColorMatrix
swap.m(2, 0) = 1                           ' blue = red
swap.m(1, 1) = 1                           ' green = green
swap.m(0, 2) = 1                           ' red = blue
swap.m(3, 3) = 1                           ' alpha = alpha
swap.m(4, 4) = 1

Dim fx As ColorMatrixEffect = ColorMatrixEffect()
fx.Parameters = swap
Debug.Print bmp.ApplyEffect(fx, GpRect(0, 0, 4, 4))
Debug.Print Hex$(bmp.Pixel(1, 1).argb)
' Output:
' 0
' FF3264C8
```

## See Also

- [ColorMatrixEffect](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colormatrixeffect) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [ImageAttributes](ImageAttributes) class
- [ColorMatrix](Types/ColorMatrix) type
