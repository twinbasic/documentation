---
title: BrightnessContrastParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/BrightnessContrastParams
---

# BrightnessContrastParams type
{: .no_toc }

The parameters of a [**BrightnessContrast**](../BrightnessContrast) effect: the brightness and the contrast.

The type mirrors the GDI+ [BrightnessContrastParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-brightnesscontrastparams) structure. A **BrightnessContrast** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **brightness** | **Long** | The change of brightness, from -255 to 255. 0 changes nothing. |
| **contrast** | **Long** | The change of contrast, from -100 to 100. 0 changes nothing. |

## Creating

Syntax: *params* **= BrightnessContrastParams**( *brightness*, *contrast* )

*brightness*, *contrast*
: *required* **Long** values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As BrightnessContrastParams = BrightnessContrastParams(40, -10)
Debug.Print p.brightness & " " & p.contrast

Dim fx As BrightnessContrast = BrightnessContrast(p)
Debug.Print fx.LastResult
' Output:
' 40 -10
' 0
```

## See Also

- [BrightnessContrastParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-brightnesscontrastparams) -- Microsoft's documentation of the GDI+ structure
- [BrightnessContrast](../BrightnessContrast) class
