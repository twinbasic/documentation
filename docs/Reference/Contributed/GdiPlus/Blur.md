---
title: Blur
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Blur
---

# Blur class
{: .no_toc }

An [**Effect**](Effect) that blurs a picture.

The blur spreads each pixel over its neighbours, as far as the radius reaches. The class mirrors the GDI+ [Blur](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-blur) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= Blur**( )

Syntax: *fx* **= Blur**( *params* )

Syntax: *fx* **= Blur**( *radius*, *expandEdge* )

Each form is also available as **New Blur**( ... ) with the same arguments.

*params*
: *required* A [**BlurParams**](Types/BlurParams) for the parameters.

*radius*
: *required* A **Single**: the blur radius in pixels, from 0 to 255. A larger radius gives a stronger blur.

*expandEdge*
: *required* A **Boolean**. **True** lets the blur spread beyond the edges of the picture. **False** keeps the size of the picture.

A constructor that fails creates an unusable object whose **LastResult** tells why. The form without arguments leaves the parameters at the defaults of GDI+.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**BlurParams**](Types/BlurParams).

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of BlurParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As Blur = Blur(10!, True)
Dim p As BlurParams = fx.Parameters(LenB(Of BlurParams))
Debug.Print fx.LastResult & " " & p.radius & " " & p.expandEdge

fx.Parameters = BlurParams(4!, False)
Debug.Print fx.Parameters(LenB(Of BlurParams)).radius
' Output:
' 0 10 -1
' 4
```

## Example

The example blurs a picture of one white pixel on black and shows how the light spreads.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(9!, 9!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 0, 0, 0))
bmp.Pixel(4, 4) = Color(255, 255, 255, 255)

Debug.Print bmp.ApplyEffect(Blur(2!, False), GpRect(0, 0, 9, 9))
Debug.Print Hex$(bmp.Pixel(4, 4).argb) & " " & Hex$(bmp.Pixel(3, 4).argb) & " " & Hex$(bmp.Pixel(2, 4).argb) & " " & Hex$(bmp.Pixel(0, 0).argb)
' Output:
' 0
' FF666666 FF3E3E3E FF0E0E0E FF000000
```

## See Also

- [Blur](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-blur) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [Sharpen](Sharpen) class
- [BlurParams](Types/BlurParams) type
- [Bitmap](Bitmap) class
