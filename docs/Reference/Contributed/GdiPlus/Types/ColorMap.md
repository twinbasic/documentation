---
title: ColorMap
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorMap
---

# ColorMap type
{: .no_toc }

A pair of colours: one to replace and the colour that takes its place.

An array of **ColorMap** is a remap table, which [**ImageAttributes.SetRemapTable**](../ImageAttributes#setremaptable) applies while an image is drawn. The type mirrors the GDI+ [ColorMap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolormatrix/ns-gdipluscolormatrix-colormap) structure.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **oldColor** | [**Color**](Color) | The colour to replace. |
| **newColor** | [**Color**](Color) | The colour to put in its place. |

## Creating

Syntax: *map* **= ColorMap**( *oldColor*, *newColor* )

*oldColor*, *newColor*
: *required* [**Color**](Color) values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim map As ColorMap = ColorMap(Color(1, 2, 3, 4), Color(5, 6, 7, 8))
Debug.Print Hex$(map.oldColor.argb) & " " & Hex$(map.newColor.argb)
' Output:
' 1020304 5060708
```

## See Also

- [ColorMap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscolormatrix/ns-gdipluscolormatrix-colormap) -- Microsoft's documentation of the GDI+ structure
- [ImageAttributes](../ImageAttributes) class
- [Color](Color) type
