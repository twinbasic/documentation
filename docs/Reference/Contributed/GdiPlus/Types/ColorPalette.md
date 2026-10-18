---
title: ColorPalette
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorPalette
---

# ColorPalette type
{: .no_toc }

A palette of up to 256 colours for a bitmap with an indexed pixel format.

An indexed bitmap stores, for each pixel, the number of an entry of its palette instead of a colour. A **ColorPalette** holds such a palette, and goes to [**Bitmap.ConvertFormat**](../Bitmap#convertformat) and [**ImageAttributes.GetAdjustedPalette**](../ImageAttributes#getadjustedpalette). The type mirrors the GDI+ [ColorPalette](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspixelformats/ns-gdipluspixelformats-colorpalette) structure, with room for 256 entries always.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **flags** | [**PaletteFlags**](../Enumerations/PaletteFlags) | Whether the palette has alpha values, is a grayscale or is a halftone palette. |
| **count** | **Long** | The number of entries that are in use. |
| **entries** | **Long** array, 0 to 255 | The colours, each as `&HAARRGGBB`. |

## Creating

Syntax: *pal* **= ColorPalette**( *flags*, *entries*( ) )

*flags*
: *required* A [**PaletteFlags**](../Enumerations/PaletteFlags) value for **flags**.

*entries*
: *required* An array of **Long** colours, `&HAARRGGBB`.

The function sets **flags** and sets **count** to the smaller of 256 and the length of *entries*.

<!-- test: Im_TypeTests.ColorPalette_FunctionCopiesTheColours, Im_TypeTests.ColorPalette_EntriesSetOneAtATimeAreKept -->
> [!WARNING] 0.9.45.0
> The function does not copy the colours: every element of **entries** of the result is 0. Set **entries** one element at a time, as below.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim colours(0 To 1) As Long
colours(0) = &HFF000000
colours(1) = &HFFFFFFFF

Dim made As ColorPalette = ColorPalette(PaletteFlagsGrayScale, colours)
Debug.Print made.count & " " & Hex$(made.entries(1))        ' the colours are not there

Dim pal As ColorPalette
pal.flags = PaletteFlagsGrayScale
pal.count = 2
pal.entries(0) = colours(0)
pal.entries(1) = colours(1)
Debug.Print pal.count & " " & Hex$(pal.entries(1))
' Output:
' 2 0
' 2 FFFFFFFF
```

## See Also

- [ColorPalette](https://learn.microsoft.com/en-us/windows/win32/api/gdipluspixelformats/ns-gdipluspixelformats-colorpalette) -- Microsoft's documentation of the GDI+ structure
- [Bitmap](../Bitmap) class
- [ImageAttributes](../ImageAttributes) class
- [PaletteFlags](../Enumerations/PaletteFlags) enumeration
