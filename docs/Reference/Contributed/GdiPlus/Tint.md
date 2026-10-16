---
title: Tint
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Tint
---

# Tint class
{: .no_toc }

An [**Effect**](Effect) that tints a picture with a hue.

The tint pulls the colours of the picture toward the chosen hue. The class mirrors the GDI+ [Tint](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-tint) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= Tint**( )

Syntax: *fx* **= Tint**( *params* )

Syntax: *fx* **= Tint**( *hue*, *amount* )

Each form is also available as **New Tint**( ... ) with the same arguments.

*params*
: *required* A [**TintParams**](Types/TintParams) for the parameters.

*hue*
: *required* A **Long** from -180 to 180: the hue to tint with, as an angle in degrees. 0 is the base of the colour wheel, and the angle runs around it.

*amount*
: *required* A **Long** from -100 to 100: the strength of the tint. 0 changes nothing, and a negative value tints toward the opposite hue.

A constructor that fails creates an unusable object whose **LastResult** tells why.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**TintParams**](Types/TintParams).

<!-- test: Fx_EffectTests.Tint_ParametersGetWithoutSize_ReturnsTheParameters -->
> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of TintParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As Tint = Tint(100, 50)
Dim p As TintParams = fx.Parameters(LenB(Of TintParams))
Debug.Print fx.LastResult & " " & p.hue & " " & p.amount
' Output:
' 0 100 50
```

## Example

The example tints the colour 200, 100, 50 with two different settings.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim a As Bitmap = Bitmap(4!, 4!)
Dim b As Bitmap = Bitmap(4!, 4!)
Graphics(a).Clear(Color(255, 200, 100, 50))
Graphics(b).Clear(Color(255, 200, 100, 50))

a.ApplyEffect Tint(0, 50), GpRect(0, 0, 4, 4)
b.ApplyEffect Tint(100, 100), GpRect(0, 0, 4, 4)
Debug.Print Hex$(a.Pixel(1, 1).argb)
Debug.Print Hex$(b.Pixel(1, 1).argb)
' Output:
' FFEC583F
' FF1BA000
```

## See Also

- [Tint](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-tint) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [HueSaturationLightness](HueSaturationLightness) class
- [ColorBalance](ColorBalance) class
- [TintParams](Types/TintParams) type
