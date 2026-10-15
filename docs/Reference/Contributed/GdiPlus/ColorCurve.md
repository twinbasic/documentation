---
title: ColorCurve
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ColorCurve
---

# ColorCurve class
{: .no_toc }

An [**Effect**](Effect) that adjusts the exposure, density, contrast, highlights, shadows, midtones or saturation of a picture, for all colour channels or for one.

Each setting of the effect makes one kind of adjustment, chosen by [**CurveAdjustments**](Enumerations/CurveAdjustments), on one channel, chosen by [**CurveChannel**](Enumerations/CurveChannel). To make several adjustments, apply several effects one after the other. The class mirrors the GDI+ [ColorCurve](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colorcurve) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= ColorCurve**( )

Syntax: *fx* **= ColorCurve**( *params* )

Syntax: *fx* **= ColorCurve**( *adjustment*, *channel*, *value* )

Each form is also available as **New ColorCurve**( ... ) with the same arguments.

*params*
: *required* A [**ColorCurveParams**](Types/ColorCurveParams) for the parameters.

*adjustment*
: *required* A [**CurveAdjustments**](Enumerations/CurveAdjustments) member: the kind of adjustment.

*channel*
: *required* A [**CurveChannel**](Enumerations/CurveChannel) member: **CurveChannelAll**, or one of red, green and blue.

*value*
: *required* A **Long**: the strength of the adjustment. Its range depends on *adjustment*: -255 to 255 for **AdjustExposure** and **AdjustDensity**, -100 to 100 for **AdjustContrast**, **AdjustHighlight**, **AdjustShadow** and **AdjustMidtone**, and 0 to 255 for **AdjustWhiteSaturation** and **AdjustBlackSaturation**. 0 changes nothing for the first two groups.

A constructor that fails creates an unusable object whose **LastResult** tells why.

> [!WARNING] 0.9.45.0
> The form with *params* stops the program with an access violation, in 32-bit and 64-bit programs. The forms without arguments and with the three values work. To use a structure, create the effect without arguments and set [**Parameters**](#parameters).

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**ColorCurveParams**](Types/ColorCurveParams).

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of ColorCurveParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As ColorCurve = ColorCurve(AdjustContrast, CurveChannelRed, 20)
Dim p As ColorCurveParams = fx.Parameters(LenB(Of ColorCurveParams))
Debug.Print fx.LastResult & " " & p.adjustment & " " & p.channel & " " & p.value
' Output:
' 0 2 1 20
```

## Example

The example raises the exposure of all channels, and the density of the red channel alone.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim exposed As Bitmap = Bitmap(4!, 4!)
Dim dense As Bitmap = Bitmap(4!, 4!)
Graphics(exposed).Clear(Color(255, 200, 100, 50))
Graphics(dense).Clear(Color(255, 200, 100, 50))

exposed.ApplyEffect ColorCurve(AdjustExposure, CurveChannelAll, 50), GpRect(0, 0, 4, 4)
dense.ApplyEffect ColorCurve(AdjustDensity, CurveChannelRed, 50), GpRect(0, 0, 4, 4)
Debug.Print Hex$(exposed.Pixel(1, 1).argb)
Debug.Print Hex$(dense.Pixel(1, 1).argb)
' Output:
' FFFA9664
' FFFA6432
```

## See Also

- [ColorCurve](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colorcurve) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [Levels](Levels) class
- [ColorCurveParams](Types/ColorCurveParams) type
- [CurveAdjustments](Enumerations/CurveAdjustments) enumeration
- [CurveChannel](Enumerations/CurveChannel) enumeration
