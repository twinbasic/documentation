---
title: Effect
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Effect
---

# Effect class
{: .no_toc }

The base class of the image effects that [**Bitmap.ApplyEffect**](Bitmap#applyeffect) applies: blur, sharpening, brightness, colour balance and others.

An effect is an object with parameters. A program creates one of the eleven effect classes below, sets its parameters, and passes it to [**Bitmap.ApplyEffect**](Bitmap#applyeffect), which changes the pixels of the bitmap, or to [**Graphics.DrawImage**](Graphics#drawimage), which draws a picture through it. **Effect** itself cannot be created: it holds the members that every effect shares. The effects need GDI+ 1.1 (Windows 7 or later), and the class mirrors the GDI+ [Effect](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-effect) class.

* TOC
{:toc}

## The effects

| Class | What it does | Parameters |
|:------|:-------------|:-----------|
| [**Blur**](Blur) | Blurs the picture. | [**BlurParams**](Types/BlurParams) |
| [**Sharpen**](Sharpen) | Sharpens the edges. | [**SharpenParams**](Types/SharpenParams) |
| [**BrightnessContrast**](BrightnessContrast) | Changes brightness and contrast. | [**BrightnessContrastParams**](Types/BrightnessContrastParams) |
| [**HueSaturationLightness**](HueSaturationLightness) | Changes hue, saturation and lightness. | [**HueSaturationLightnessParams**](Types/HueSaturationLightnessParams) |
| [**Levels**](Levels) | Sets the highlights, midtones and shadows. | [**LevelsParams**](Types/LevelsParams) |
| [**Tint**](Tint) | Tints the picture with a hue. | [**TintParams**](Types/TintParams) |
| [**ColorBalance**](ColorBalance) | Shifts the balance between opposite colours. | [**ColorBalanceParams**](Types/ColorBalanceParams) |
| [**ColorMatrixEffect**](ColorMatrixEffect) | Transforms the colours with a matrix. | [**ColorMatrix**](Types/ColorMatrix) |
| [**ColorLUT**](ColorLUT) | Replaces colour values through lookup tables. | [**ColorLUTParams**](Types/ColorLUTParams) |
| [**ColorCurve**](ColorCurve) | Adjusts exposure, density, contrast and more. | [**ColorCurveParams**](Types/ColorCurveParams) |
| [**RedEyeCorrection**](RedEyeCorrection) | Corrects red eyes in areas of the picture. | [**RedEyeCorrectionParams**](Types/RedEyeCorrectionParams) |

Every effect class has the same shape:

- It is created with `Blur(...)` or `New Blur(...)`, with no arguments, with a parameters structure, or with the individual values.
- Its **Parameters** property gets or sets the parameters structure.
- It inherits the members described below.

## Creating

An **Effect** cannot be created. Create one of the eleven effect classes in the table above, with the function of its name or with `New`: `Blur(5!, False)` or `New Blur(5!, False)`.

## Parameters

Every effect class has a **Parameters** property of its own type, listed on the page of the class.

Syntax: *effect*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *effect*.**Parameters**( *size* )

The setter replaces the parameters. The getter reads them, and needs *size*, the size of the parameters structure in bytes (`LenB(Of BlurParams)`).

<!-- test: Fx_EffectTests.Blur_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.Sharpen_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.BrightnessContrast_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.HueSaturationLightness_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.Levels_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.Tint_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.ColorBalance_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.ColorCurve_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.ColorMatrixEffect_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.ColorLUT_ParametersGetWithoutSize_ReturnsTheParameters, Fx_EffectTests.RedEyeCorrection_ParametersGetWithoutSize_SetsNoError -->
> [!WARNING] 0.9.45.0
> Without *size*, the getter returns a structure of zeros and sets **LastResult** to 2 (**InvalidParameter**), because GDI+ is given a buffer size of 0. Pass the size every time: `blur.Parameters(LenB(Of BlurParams)).radius`.

## Auxiliary data

Some effects return data besides the changed pixels, as a block of memory that the effect owns. [**Bitmap.ApplyEffect**](Bitmap#applyeffect) stores it in the effect, and frees the earlier block.

### UseAuxData

Syntax: *effect*.**UseAuxData** [ **=** *flag* ]

A **Boolean**: whether **ApplyEffect** asks GDI+ for the auxiliary data. The default is **False**.

### AuxData

Syntax: *p* **=** *effect*.**AuxData**

Returns the address of the auxiliary data, a **LongPtr**, or 0 when there is none. The property is read-only.

### AuxDataSize

Syntax: *n* **=** *effect*.**AuxDataSize**

Returns the size of the auxiliary data in bytes, a **Long**. The property is read-only.

### SetAuxData

Syntax: *effect*.**SetAuxData**( *auxData*, *auxDataSize* )

Replaces the auxiliary data with the block at *auxData*, of *auxDataSize* bytes, and frees the earlier block with the GDI+ allocator. The block must have been allocated with that allocator; passing 0 and 0 discards the data. **ApplyEffect** calls it. A program rarely does.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As Blur = Blur(2!, False)
Debug.Print fx.UseAuxData
Debug.Print fx.AuxData & " " & fx.AuxDataSize

fx.UseAuxData = True
Debug.Print fx.UseAuxData
' Output:
' False
' 0 0
' True
```

## ParameterSize

Syntax: *n* **=** *effect*.**ParameterSize**

Returns the size in bytes of the parameters that the effect takes, as GDI+ states it.

<!-- test: Fx_EffectTests.ParameterSize_BrightnessContrast_IsTheSizeOfItsParameters, Fx_EffectTests.ParameterSize_ColorMatrixEffect_IsTheSizeOfItsParameters -->
> [!WARNING] 0.9.45.0
> **ParameterSize** always returns 0. The property assigns the status of the call, not the size, to its return value. Use `LenB(Of BlurParams)` and the like instead.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As BrightnessContrast = BrightnessContrast(10, 20)
Debug.Print fx.LastResult
Debug.Print fx.ParameterSize                    ' not the size
Debug.Print LenB(Of BrightnessContrastParams)
' Output:
' 0
' 0
' 8
```

## Example

The example applies two effects in a row to a bitmap, each to a part of it.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(8!, 4!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 200, 100, 50))

bmp.ApplyEffect BrightnessContrast(50, 0), GpRect(0, 0, 4, 4)
bmp.ApplyEffect BrightnessContrast(-50, 0), GpRect(4, 0, 4, 4)

Debug.Print Hex$(bmp.Pixel(0, 0).argb) & " " & Hex$(bmp.Pixel(7, 0).argb)
' Output:
' FFFA9664 FF963200
```

## See Also

- [Effect](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-effect) -- Microsoft's documentation of the GDI+ class
- [Bitmap](Bitmap) class
- [Graphics](Graphics) class
