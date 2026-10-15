---
title: HueSaturationLightness
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/HueSaturationLightness
---

# HueSaturationLightness class
{: .no_toc }

An [**Effect**](Effect) that changes the hue, the saturation and the lightness of a picture.

The class mirrors the GDI+ [HueSaturationLightness](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-huesaturationlightness) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= HueSaturationLightness**( )

Syntax: *fx* **= HueSaturationLightness**( *params* )

Syntax: *fx* **= HueSaturationLightness**( *hue*, *saturation*, *lightness* )

Each form is also available as **New HueSaturationLightness**( ... ) with the same arguments.

*params*
: *required* A [**HueSaturationLightnessParams**](Types/HueSaturationLightnessParams) for the parameters.

*hue*
: *required* A **Long** from -180 to 180: the angle, in degrees, by which every hue is turned around the colour wheel. 0 changes nothing.

*saturation*
: *required* A **Long** from -100 to 100. A positive value makes the colours more vivid, and -100 turns the picture gray.

*lightness*
: *required* A **Long** from -100 to 100. A positive value lightens the picture, and a negative one darkens it.

A constructor that fails creates an unusable object whose **LastResult** tells why.

> [!WARNING] 0.9.45.0
> The form with *params* stops the program with an access violation, in 32-bit and 64-bit programs. The forms without arguments and with the three values work. To use a structure, create the effect without arguments and set [**Parameters**](#parameters).

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**HueSaturationLightnessParams**](Types/HueSaturationLightnessParams).

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of HueSaturationLightnessParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As HueSaturationLightness = HueSaturationLightness(120, -20, 10)
Dim p As HueSaturationLightnessParams = fx.Parameters(LenB(Of HueSaturationLightnessParams))
Debug.Print fx.LastResult & " " & p.hue & " " & p.saturation & " " & p.lightness
' Output:
' 0 120 -20 10
```

## Example

The example applies each of the three settings alone to the colour 200, 100, 50.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim light As Bitmap = Bitmap(4!, 4!)
Dim gray As Bitmap = Bitmap(4!, 4!)
Dim turned As Bitmap = Bitmap(4!, 4!)
Graphics(light).Clear(Color(255, 200, 100, 50))
Graphics(gray).Clear(Color(255, 200, 100, 50))
Graphics(turned).Clear(Color(255, 200, 100, 50))

light.ApplyEffect HueSaturationLightness(0, 0, 50), GpRect(0, 0, 4, 4)
gray.ApplyEffect HueSaturationLightness(0, -100, 0), GpRect(0, 0, 4, 4)
turned.ApplyEffect HueSaturationLightness(120, 0, 0), GpRect(0, 0, 4, 4)
Debug.Print Hex$(light.Pixel(1, 1).argb)
Debug.Print Hex$(gray.Pixel(1, 1).argb)
Debug.Print Hex$(turned.Pixel(1, 1).argb)
' Output:
' FFFFFCFB
' FF7D7D7D
' FF32C862
```

## See Also

- [HueSaturationLightness](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-huesaturationlightness) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [Tint](Tint) class
- [ColorBalance](ColorBalance) class
- [HueSaturationLightnessParams](Types/HueSaturationLightnessParams) type
