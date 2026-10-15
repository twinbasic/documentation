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

A constructor that fails creates an unusable object whose **LastResult** tells why. The effect created without arguments has no areas, and [**Bitmap.ApplyEffect**](Bitmap#applyeffect) refuses to apply it: the call returns 2 (**InvalidParameter**).

> [!WARNING] 0.9.45.0
> The form with *params* does not work. In a 64-bit program it stops the program with an access violation, and in a 32-bit program it sets **LastResult** to 2 (**InvalidParameter**), and so does a later **ApplyEffect** with the effect. The parameters are not set in either case. Setting [**Parameters**](#parameters) on an effect fails the same way.

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**RedEyeCorrectionParams**](Types/RedEyeCorrectionParams). The setter creates the GDI+ effect again and sets the parameters on the new one, with the size `LenB(Of RedEyeCorrectionParams)` plus the size of the rectangles.

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*. See [**Effect**](Effect#parameters).

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
