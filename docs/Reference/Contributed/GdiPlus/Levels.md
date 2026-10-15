---
title: Levels
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Levels
---

# Levels class
{: .no_toc }

An [**Effect**](Effect) that sets the highlight, midtone and shadow levels of a picture.

Levels stretches the range of colour values: the shadow level is the value that becomes black, the highlight level the value that becomes white, and the midtone setting moves the middle values. It is the effect behind a Levels dialog of a picture editor. The class mirrors the GDI+ [Levels](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-levels) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= Levels**( )

Syntax: *fx* **= Levels**( *params* )

Syntax: *fx* **= Levels**( *highlight*, *midtone*, *shadow* )

Each form is also available as **New Levels**( ... ) with the same arguments.

*params*
: *required* A [**LevelsParams**](Types/LevelsParams) for the parameters.

*highlight*
: *required* A **Long** from 0 to 100: the level, in percent of the range, that becomes white. 100 leaves the top of the range alone.

*midtone*
: *required* A **Long** from -100 to 100. A positive value lightens the middle values and a negative one darkens them. 0 changes nothing.

*shadow*
: *required* A **Long** from 0 to 100: the level, in percent of the range, that becomes black. 0 leaves the bottom of the range alone. It has to be lower than *highlight*.

A constructor that fails creates an unusable object whose **LastResult** tells why.

> [!WARNING] 0.9.45.0
> The form with *params* stops the program with an access violation, in 32-bit and 64-bit programs. The forms without arguments and with the three values work. To use a structure, create the effect without arguments and set [**Parameters**](#parameters).

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**LevelsParams**](Types/LevelsParams).

> [!NOTE] 0.9.45.0
> The first field of **LevelsParams** is named **highight**, with the letter l missing. Write `params.highight`.

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of LevelsParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As Levels = Levels(80, 50, 20)
Dim p As LevelsParams = fx.Parameters(LenB(Of LevelsParams))
Debug.Print fx.LastResult & " " & p.highight & " " & p.midtone & " " & p.shadow
' Output:
' 0 80 50 20
```

## Example

The example applies the default levels, which change nothing, and then stretched levels.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim same As Bitmap = Bitmap(4!, 4!)
Dim stretched As Bitmap = Bitmap(4!, 4!)
Graphics(same).Clear(Color(255, 200, 100, 50))
Graphics(stretched).Clear(Color(255, 200, 100, 50))

same.ApplyEffect Levels(100, 0, 0), GpRect(0, 0, 4, 4)
stretched.ApplyEffect Levels(80, 50, 20), GpRect(0, 0, 4, 4)
Debug.Print Hex$(same.Pixel(1, 1).argb)
Debug.Print Hex$(stretched.Pixel(1, 1).argb)
' Output:
' FFC86432
' FFFC9000
```

## See Also

- [Levels](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-levels) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [BrightnessContrast](BrightnessContrast) class
- [ColorCurve](ColorCurve) class
- [LevelsParams](Types/LevelsParams) type
