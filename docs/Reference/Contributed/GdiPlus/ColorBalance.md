---
title: ColorBalance
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/ColorBalance
---

# ColorBalance class
{: .no_toc }

An [**Effect**](Effect) that shifts the balance between the opposite colours cyan and red, magenta and green, and yellow and blue.

The class mirrors the GDI+ [ColorBalance](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colorbalance) class and inherits the members of [**Effect**](Effect).

* TOC
{:toc}

## Creating

Syntax: *fx* **= ColorBalance**( )

Syntax: *fx* **= ColorBalance**( *params* )

Syntax: *fx* **= ColorBalance**( *cyanRed*, *magentaGreen*, *yellowBlue* )

Each form is also available as **New ColorBalance**( ... ) with the same arguments.

*params*
: *required* A [**ColorBalanceParams**](Types/ColorBalanceParams) for the parameters.

*cyanRed*
: *required* A **Long** from -100 to 100. A positive value adds red, and a negative one adds cyan.

*magentaGreen*
: *required* A **Long** from -100 to 100. A positive value adds green, and a negative one adds magenta.

*yellowBlue*
: *required* A **Long** from -100 to 100. A positive value adds blue, and a negative one adds yellow.

A value of 0 changes nothing. A constructor that fails creates an unusable object whose **LastResult** tells why.

> [!WARNING] 0.9.45.0
> The form with *params* stops the program with an access violation, in 32-bit and 64-bit programs. The forms without arguments and with the three values work. To use a structure, create the effect without arguments and set [**Parameters**](#parameters).

## Parameters

Syntax: *fx*.**Parameters** [ **=** *params* ]

Syntax: *params* **=** *fx*.**Parameters**( *size* )

Gets or sets the [**ColorBalanceParams**](Types/ColorBalanceParams).

> [!WARNING] 0.9.45.0
> The getter returns zeros and sets **LastResult** to 2 (**InvalidParameter**) unless it is given *size*, the size of the structure: `fx.Parameters(LenB(Of ColorBalanceParams))`. See [**Effect**](Effect#parameters).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim fx As ColorBalance = ColorBalance(10, -20, 30)
Dim p As ColorBalanceParams = fx.Parameters(LenB(Of ColorBalanceParams))
Debug.Print fx.LastResult & " " & p.cyanRed & " " & p.magentaGreen & " " & p.yellowBlue
' Output:
' 0 10 -20 30
```

## Example

The example pushes the colour 200, 100, 50 fully toward red, toward cyan, and toward blue.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim red As Bitmap = Bitmap(4!, 4!)
Dim cyan As Bitmap = Bitmap(4!, 4!)
Dim blue As Bitmap = Bitmap(4!, 4!)
Graphics(red).Clear(Color(255, 200, 100, 50))
Graphics(cyan).Clear(Color(255, 200, 100, 50))
Graphics(blue).Clear(Color(255, 200, 100, 50))

red.ApplyEffect ColorBalance(100, 0, 0), GpRect(0, 0, 4, 4)
cyan.ApplyEffect ColorBalance(-100, 0, 0), GpRect(0, 0, 4, 4)
blue.ApplyEffect ColorBalance(0, 0, 100), GpRect(0, 0, 4, 4)
Debug.Print Hex$(red.Pixel(1, 1).argb)
Debug.Print Hex$(cyan.Pixel(1, 1).argb)
Debug.Print Hex$(blue.Pixel(1, 1).argb)
' Output:
' FFFF6432
' FF006432
' FFC86464
```

## See Also

- [ColorBalance](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/nl-gdipluseffects-colorbalance) -- Microsoft's documentation of the GDI+ class
- [Effect](Effect) class
- [Tint](Tint) class
- [ColorBalanceParams](Types/ColorBalanceParams) type
