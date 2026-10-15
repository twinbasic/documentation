---
title: Sharpen
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Sharpen
---

# Sharpen class
{: .no_toc }

An [**Effect**](Effect) that sharpens a picture.

Sharpening makes the difference between a pixel and its neighbours larger, which brings out edges. The class mirrors the GDI+ [Sharpen](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-sharpen) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= Sharpen**( )

Syntax: *fx* **= Sharpen**( *params* )

Syntax: *fx* **= Sharpen**( *radius*, *amount* )

Each form is also available as **New Sharpen**( ... ) with the same arguments.

*params*
: *required* A [**SharpenParams**](Types/SharpenParams) for the parameters.

*radius*
: *required* A **Single** from 0 to 255: the number of pixels around a pixel that the effect looks at. A larger radius sharpens broader features.

*amount*
: *required* A **Single** from 0 to 100: the strength. 0 changes nothing, and 100 is the strongest.

A constructor that fails creates an unusable object whose **LastResult** tells why.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**SharpenParams**](Types/SharpenParams).

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of SharpenParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As Sharpen = Sharpen(5!, 50!)
Dim p As SharpenParams = fx.Parameters(LenB(Of SharpenParams))
Debug.Print fx.LastResult & " " & p.radius & " " & p.amount
' Output:
' 0 5 50
```

## Example

A sharpened edge overshoots: the light side gets lighter and the dark side darker. The example sharpens a picture whose left half is dark gray and whose right half is light gray.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(10!, 4!)
Dim g As Graphics = Graphics(bmp)
Dim dark As SolidBrush = SolidBrush(Color(255, 100, 100, 100))
Dim light As SolidBrush = SolidBrush(Color(255, 150, 150, 150))
g.FillRectangle dark, 0, 0, 5, 4
g.FillRectangle light, 5, 0, 5, 4

Debug.Print bmp.ApplyEffect(Sharpen(2!, 100!), GpRect(0, 0, 10, 4))
Debug.Print (bmp.Pixel(4, 2).R < 100) & " " & (bmp.Pixel(5, 2).R > 150)
' Output:
' 0
' True True
```

## See Also

- [Sharpen](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-sharpen) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [Blur](Blur) class
- [SharpenParams](Types/SharpenParams) type
