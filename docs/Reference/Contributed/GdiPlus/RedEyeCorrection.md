---
title: RedEyeCorrection
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/RedEyeCorrection
---

# RedEyeCorrection class
{: .no_toc }

An [**Effect**](Effect) that corrects red eyes in the rectangles of a picture that a program names.

The effect works only inside the rectangles of its [**RedEyeCorrectionParams**](Types/RedEyeCorrectionParams). The program, or the user, finds the eyes; the effect fixes their colour. The class mirrors the GDI+ [RedEyeCorrection](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-redeyecorrection) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= RedEyeCorrection**( )

Syntax: *fx* **= RedEyeCorrection**( *params* )

Each form is also available as **New RedEyeCorrection**( ... ) with the same arguments.

*params*
: *required* A [**RedEyeCorrectionParams**](Types/RedEyeCorrectionParams): the number of areas and the memory that holds their rectangles.

A constructor that fails creates an unusable object whose **LastResult** tells why.

<!-- test: Fx_EffectTests.RedEyeCorrection_ApplyEffectWithoutAreas_ReturnsInvalidParameter -->
The effect created without arguments has no areas, and [**Bitmap.ApplyEffect**](Bitmap#applyeffect) refuses to apply it: the call returns 2 (**InvalidParameter**).
<!-- /test -->

<!-- test: Fx_EffectTests.RedEyeCorrection_NewWithParams_StoresTheAreas, Fx_EffectTests.RedEyeCorrection_NewKeywordWithParams_StoresTheAreas, Fx_EffectTests.RedEyeCorrection_ParametersLet_StoresTheAreas -->
> [!WARNING] 0.9.45.0
> In a 64-bit program the form with *params* stops the program with an access violation. A 32-bit program is not affected. To work in both, create the effect without arguments and set [**Parameters**](#parameters), which works in both.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**RedEyeCorrectionParams**](Types/RedEyeCorrectionParams). The setter creates the GDI+ effect again and sets the parameters on the new one, with the size `LenB(Of RedEyeCorrectionParams)` plus the size of the rectangles.

<!-- test: Fx_EffectTests.RedEyeCorrection_ParametersGetWithoutSize_SetsNoError, Fx_EffectTests.RedEyeCorrection_ParametersGet_AfterSettingAreas_ReturnsTheAreaCount, Fx_EffectTests.RedEyeCorrection_ParametersLet_StoresTheAreas -->
> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*. On an effect that has areas it does so even with *size*, so the areas cannot be read back: keep the **RedEyeCorrectionParams** that was set. See [**Effect**](Effect#parameters).

The areas are described by a structure whose methods allocate and fill the rectangles; the page of [**RedEyeCorrectionParams**](Types/RedEyeCorrectionParams) shows them.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As RedEyeCorrection = RedEyeCorrection()
Debug.Print fx.LastResult

Dim bmp As Bitmap = Bitmap(10!, 10!)
Graphics(bmp).Clear(Color(255, 220, 20, 20))
Debug.Print bmp.ApplyEffect(fx, GpRect(0, 0, 10, 10))
' Output:
' 0
' 2
```

## See Also

- [RedEyeCorrection](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-redeyecorrection) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [RedEyeCorrectionParams](Types/RedEyeCorrectionParams) type
