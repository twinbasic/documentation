---
title: BrightnessContrast
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/BrightnessContrast
---

# BrightnessContrast class
{: .no_toc }

An [**Effect**](Effect) that changes the brightness and the contrast of a picture.

The class mirrors the GDI+ [BrightnessContrast](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-brightnesscontrast) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= BrightnessContrast**( )

Syntax: *fx* **= BrightnessContrast**( *params* )

Syntax: *fx* **= BrightnessContrast**( *brightness*, *contrast* )

Each form is also available as **New BrightnessContrast**( ... ) with the same arguments.

*params*
: *required* A [**BrightnessContrastParams**](Types/BrightnessContrastParams) for the parameters.

*brightness*
: *required* A **Long** from -255 to 255. A positive value lightens the picture by adding that amount to each colour value, and a negative one darkens it. 0 changes nothing.

*contrast*
: *required* A **Long** from -100 to 100. A positive value increases the difference between light and dark, and a negative one decreases it. 0 changes nothing.

A constructor that fails creates an unusable object whose **LastResult** tells why.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**BrightnessContrastParams**](Types/BrightnessContrastParams).

<!-- test: Fx_EffectTests.BrightnessContrast_ParametersGetWithoutSize_ReturnsTheParameters -->
> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of BrightnessContrastParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As BrightnessContrast = BrightnessContrast(50, 0)
Dim p As BrightnessContrastParams = fx.Parameters(LenB(Of BrightnessContrastParams))
Debug.Print fx.LastResult & " " & p.brightness & " " & p.contrast

fx.Parameters = BrightnessContrastParams(-20, 30)
Debug.Print fx.Parameters(LenB(Of BrightnessContrastParams)).contrast
' Output:
' 0 50 0
' 30
```

## Example

The example applies three settings of the effect to three bitmaps of the same colour.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim lighter As Bitmap = Bitmap(8!, 8!)
Dim darker As Bitmap = Bitmap(8!, 8!)
Dim contrasty As Bitmap = Bitmap(8!, 8!)
Graphics(lighter).Clear(Color(255, 200, 100, 50))
Graphics(darker).Clear(Color(255, 200, 100, 50))
Graphics(contrasty).Clear(Color(255, 200, 100, 50))

lighter.ApplyEffect BrightnessContrast(50, 0), GpRect(0, 0, 8, 8)
darker.ApplyEffect BrightnessContrast(-50, 0), GpRect(0, 0, 8, 8)
contrasty.ApplyEffect BrightnessContrast(0, 50), GpRect(0, 0, 8, 8)
Debug.Print Hex$(lighter.Pixel(4, 4).argb)
Debug.Print Hex$(darker.Pixel(4, 4).argb)
Debug.Print Hex$(contrasty.Pixel(4, 4).argb)
' Output:
' FFFA9664
' FF963200
' FFFF4900
```

## See Also

- [BrightnessContrast](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-brightnesscontrast) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [HueSaturationLightness](HueSaturationLightness) class
- [Levels](Levels) class
- [BrightnessContrastParams](Types/BrightnessContrastParams) type
