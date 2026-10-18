---
title: ColorLUT
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ColorLUT
---

# ColorLUT class
{: .no_toc }

An [**Effect**](Effect) that replaces the value of each colour channel through a lookup table.

A lookup table (LUT) has 256 entries, one for each possible value of a channel. The pixel value *v* becomes the table entry number *v*. The effect has one table for blue, green, red and alpha, so it can express any curve, inversion or posterisation of a channel. The class mirrors the GDI+ [ColorLUT](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colorlut) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= ColorLUT**( )

Syntax: *fx* **= ColorLUT**( *params* )

Syntax: *fx* **= ColorLUT**( *lutB*, *lutG*, *lutR*, *lutA* )

Each form is also available as **New ColorLUT**( ... ) with the same arguments.

*params*
: *required* A [**ColorLUTParams**](Types/ColorLUTParams) for the parameters.

*lutB*, *lutG*, *lutR*, *lutA*
: *required* Arrays of 256 **Byte** values, any lower bound: the tables for blue, green, red and alpha. An array of another length leaves the tables unchanged.

A constructor that fails creates an unusable object whose **LastResult** tells why.

<!-- test: Fx_EffectTests.ColorLUT_NewWithParams_StoresTheParameters -->
> [!WARNING] 0.9.45.0
> The form with *params* stops the program with an access violation, in 32-bit and 64-bit programs. Create the effect without arguments and set [**Parameters**](#parameters).

<!-- test: Fx_EffectTests.ColorLUT_NewWithFourArrays_TakesTheAlphaTableFromLutA, Fx_EffectTests.ColorLUT_ApplyEffectWithFourArrays_KeepsAlphaWithTheIdentityTable -->
> [!WARNING] 0.9.45.0
> The form with four arrays copies the alpha table from the array *lutB*, not from *lutA*, so the alpha channel is mapped through the blue table. With a blue table that inverts, as in the example below, an opaque picture becomes transparent. Fill the four tables of a [**ColorLUTParams**](Types/ColorLUTParams) yourself and set **Parameters**.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**ColorLUTParams**](Types/ColorLUTParams).

<!-- test: Fx_EffectTests.ColorLUT_ParametersGetWithoutSize_ReturnsTheParameters -->
> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of ColorLUTParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim tables As ColorLUTParams
Dim i As Long
For i = 0 To 255
    tables.lutB.b(i) = 255 - i              ' invert blue
    tables.lutG.b(i) = i
    tables.lutR.b(i) = i
    tables.lutA.b(i) = i
Next

Dim fx As ColorLUT = ColorLUT()
fx.Parameters = tables
Dim p As ColorLUTParams = fx.Parameters(LenB(Of ColorLUTParams))
Debug.Print fx.LastResult & " " & p.lutB.b(10) & " " & p.lutG.b(10) & " " & p.lutA.b(10)
' Output:
' 0 245 10 10
```

## Example

The example inverts the blue channel and leaves the others alone.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Graphics(bmp).Clear(Color(255, 200, 100, 50))

Dim tables As ColorLUTParams
Dim i As Long
For i = 0 To 255
    tables.lutB.b(i) = 255 - i
    tables.lutG.b(i) = i
    tables.lutR.b(i) = i
    tables.lutA.b(i) = i
Next

Dim fx As ColorLUT = ColorLUT()
fx.Parameters = tables

Debug.Print bmp.ApplyEffect(fx, GpRect(0, 0, 4, 4))
Debug.Print Hex$(bmp.Pixel(1, 1).argb)
' Output:
' 0
' FFC864CD
```

## See Also

- [ColorLUT](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colorlut) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [ColorCurve](ColorCurve) class
- [ColorLUTParams](Types/ColorLUTParams) type
