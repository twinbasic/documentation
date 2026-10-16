---
title: HatchBrush
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/HatchBrush
---

# HatchBrush class
{: .no_toc }

A brush that fills a shape with a pattern of lines or dots in a foreground colour over a background colour.

A **HatchBrush** implements [**IBrush**](IBrush). The pattern is one of the 53 styles of [**GpHatchStyle**](Enumerations/GpHatchStyle), a small tile that repeats across the shape. The foreground colour draws the lines or dots of the tile, and the background colour fills the rest. The class mirrors the GDI+ [HatchBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-hatchbrush) class.

* TOC
{:toc}

## Creating

Syntax: *brush* **= New HatchBrush**( *hatchStyle*, *foreColor*, *backColor* )

Syntax: *brush* **= New HatchBrush**( *hatchStyle*, *foreRgb*, *backRgb* )

*hatchStyle*
: *required* A [**GpHatchStyle**](Enumerations/GpHatchStyle) value for the pattern.

*foreColor*, *backColor*
: *required* **Color** values for the lines or dots and for the background. The alpha values are kept.

*foreRgb*, *backRgb*
: *required* **Long** values for the same colours, as `&H00RRGGBB`. The alpha values are always 255.

<!-- test: Br_BrushTests.HatchBrush_Function_ColorForm_Returns, Br_BrushTests.HatchBrush_Function_RGBForm_Returns -->
> [!WARNING] 0.9.45.0
> The function **HatchBrush**( ), the form without **New**, calls itself until the program stops with a stack overflow. Use **New HatchBrush**.

<!-- test: Br_BrushColourTests.HatchBrush_RGBForm_VBColour_UsesThatColour -->
> [!WARNING] 0.9.45.0
> The *foreRgb* and *backRgb* form reads each **Long** as `&H00RRGGBB`, not as a VB colour, and drops the alpha: `vbRed` is blue. [**IBrush**](IBrush#colours) lists what else is not translated. Use the **Color** form.

<!-- test: Br_BrushTests.HatchBrush_New_PaintsTheTile -->
```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim red As Color = Color(255, 255, 0, 0)
Dim blue As Color = Color(255, 0, 0, 255)
Dim brush As HatchBrush = New HatchBrush(HatchStyleHorizontal, red, blue)

Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
g.FillRectangle(brush, 0, 0, 8, 8)

Dim y As Long, row As String
For y = 0 To 3
    row = row & IIf(bmp.Pixel(3, y).argb = red.argb, "F", "B")
Next
Debug.Print row
' Output:
' FBBB
```
<!-- /test -->

### Clone

Syntax: *copy* **=** *brush*.**Clone**( )

Returns a new **HatchBrush** with the same style and colours.

## Properties

The properties are read-only: a hatch brush is created with its style and colours, and they do not change.

### HatchStyle

Syntax: *style* **=** *brush*.**HatchStyle**

Returns the [**GpHatchStyle**](Enumerations/GpHatchStyle) of the brush.

### ForegroundColor

Syntax: *color* **=** *brush*.**ForegroundColor**

Returns the colour of the lines or dots, as a **Color**.

### BackgroundColor

Syntax: *color* **=** *brush*.**BackgroundColor**

Returns the background colour, as a **Color**.

### Type

Syntax: *type* **=** *brush*.**Type**

Returns **BrushTypeHatchFill** ([**GpBrushType**](Enumerations/GpBrushType)). The property is read-only.

## Example

The example fills two 8-by-8 bitmaps with the cross and the vertical styles and prints the top row of each. **F** is a pixel of the foreground colour and **B** one of the background colour.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim red As Color = Color(255, 255, 0, 0)
Dim blue As Color = Color(255, 0, 0, 255)
Dim styles(1) As GpHatchStyle
styles(0) = HatchStyleCross
styles(1) = HatchStyleVertical

Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
Dim i As Long, x As Long, row As String
For i = 0 To 1
    Dim brush As HatchBrush = New HatchBrush(styles(i), red, blue)
    g.FillRectangle(brush, 0, 0, 8, 8)
    row = ""
    For x = 0 To 7
        row = row & IIf(bmp.Pixel(x, 0).argb = red.argb, "F", "B")
    Next
    Debug.Print row
Next

Dim hatch As HatchBrush = New HatchBrush(HatchStyle50Percent, red, blue)
Debug.Print hatch.HatchStyle & " " & Hex$(hatch.ForegroundColor.argb) & " " & Hex$(hatch.BackgroundColor.argb)
' Output:
' FFFFFFFF
' FBBBBBBB
' 12 FFFF0000 FF0000FF
```

## See Also

- [HatchBrush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-hatchbrush) -- Microsoft's documentation of the GDI+ class
- [IBrush](IBrush) interface
- [SolidBrush](SolidBrush) class
- [TextureBrush](TextureBrush) class
- [GpHatchStyle](Enumerations/GpHatchStyle) enumeration
