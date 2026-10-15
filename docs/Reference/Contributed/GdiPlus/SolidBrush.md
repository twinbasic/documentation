---
title: SolidBrush
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/SolidBrush
---

# SolidBrush class
{: .no_toc }

A brush that fills a shape with one colour.

A **SolidBrush** is the simplest of the [brushes](IBrush) and implements [**IBrush**](IBrush). Its colour can have an alpha value, so a fill can be partly transparent. The class mirrors the GDI+ [SolidBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-solidbrush) class.

* TOC
{:toc}

## Creating

Syntax: *brush* **= SolidBrush**( *color* )

Syntax: *brush* **= New SolidBrush**( *color* )

Syntax: *brush* **= SolidBrush**( *rgb* )

Syntax: *brush* **= New SolidBrush**( *rgb* )

*color*
: *required* A **Color** for the brush. Its alpha value is kept.

*rgb*
: *required* A **Long** for the colour, as `&H00RRGGBB`. The alpha is always 255.

> [!WARNING] 0.9.45.0
> The *rgb* form reads its **Long** as `&H00RRGGBB`, not as a VB colour: `SolidBrush(vbRed)` and `SolidBrush(RGB(255, 0, 0))` paint blue. The *rgb* form drops the alpha value, and a **CColor** member passed to it binds to it, so `SolidBrush(CColor.Transparent)` fills opaque white. [**IBrush**](IBrush#colours) lists what else is not translated. Use the **Color** form.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Dim g As Graphics = Graphics(bmp)

Dim brush As SolidBrush = SolidBrush(Color(255, 255, 0, 0))   ' red
g.FillRectangle(brush, 0, 0, 4, 4)
Debug.Print Hex$(bmp.Pixel(1, 1).argb)

Dim wrong As SolidBrush = SolidBrush(RGB(255, 0, 0))          ' blue, not red
g.FillRectangle(wrong, 0, 0, 4, 4)
Debug.Print Hex$(bmp.Pixel(1, 1).argb)
' Output:
' FFFF0000
' FF0000FF
```

### Clone

Syntax: *copy* **=** *brush*.**Clone**( )

Returns a new **SolidBrush** with the same colour. Changing the copy does not change the original.

## Colour

### Color

Syntax: *brush*.**Color** [ **=** *color* ]

Gets or sets the colour of the brush, as a **Color** with its alpha value.

### RGB

Syntax: *brush*.**RGB** [ **=** *rgb* ]

Gets or sets the colour as a **Long** in the form `&H00RRGGBB`. Reading it drops the alpha value, and writing it sets an opaque colour.

> [!WARNING] 0.9.45.0
> **RGB** reads and writes `&H00RRGGBB` and not a VB colour, so assigning `vbRed` makes the brush blue. Use [**Color**](#color).

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim brush As SolidBrush = SolidBrush(Color(128, 10, 20, 30))
Debug.Print Hex$(brush.Color.argb)
Debug.Print Hex$(brush.RGB)

brush.Color = Color(255, 1, 2, 3)
Debug.Print Hex$(brush.RGB)

brush.RGB = &HFF8000
Debug.Print Hex$(brush.Color.argb)
' Output:
' 800A141E
' A141E
' 10203
' FFFF8000
```

## Type

### Type

Syntax: *type* **=** *brush*.**Type**

Returns **BrushTypeSolidColor** ([**GpBrushType**](Enumerations/GpBrushType)). The property is read-only.

## Example

A partly transparent fill lets what is under it show through. The example fills a bitmap with white and then with half-transparent red.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim bmp As Bitmap = Bitmap(4!, 4!)
Dim g As Graphics = Graphics(bmp)
g.Clear(Color(255, 255, 255, 255))

Dim glass As SolidBrush = SolidBrush(Color(128, 255, 0, 0))
g.FillRectangle(glass, 0, 0, 2, 4)

Dim covered As Color = bmp.Pixel(0, 0)
Dim bare As Color = bmp.Pixel(3, 0)
Debug.Print Hex$(covered.R) & " " & Hex$(covered.G)
Debug.Print Hex$(bare.R) & " " & Hex$(bare.G)

Dim clone As SolidBrush = glass.Clone()
clone.Color = Color(255, 0, 0, 255)
Debug.Print Hex$(glass.Color.argb) & " " & Hex$(clone.Color.argb)
' Output:
' FF 7F
' FF FF
' 80FF0000 FF0000FF
```

## See Also

- [SolidBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-solidbrush) -- Microsoft's documentation of the GDI+ class
- [IBrush](IBrush) interface
- [HatchBrush](HatchBrush) class
- [Pen](Pen) class
- [Graphics](Graphics) class
