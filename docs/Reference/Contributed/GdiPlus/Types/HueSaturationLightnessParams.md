---
title: HueSaturationLightnessParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/HueSaturationLightnessParams
---

# HueSaturationLightnessParams type
{: .no_toc }

The parameters of a [**HueSaturationLightness**](../HueSaturationLightness) effect: the change of hue, saturation and lightness.

The type mirrors the GDI+ [HueSaturationLightnessParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-huesaturationlightnessparams) structure. A **HueSaturationLightness** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **hue** | **Long** | The turn of the hue, in degrees from -180 to 180. |
| **saturation** | **Long** | The change of saturation, from -100 to 100. |
| **lightness** | **Long** | The change of lightness, from -100 to 100. |

## Properties

**hueLevel**, **saturationLevel** and **lightnessLevel** are other names for **hue**, **saturation** and **lightness**, the names that the C++ structure has. They are declared as object properties, so the value is read with `params.hueLevel` and written with the **Set** statement: `Set params.hueLevel = 5`.

## Creating

Syntax: *params* **= HueSaturationLightnessParams**( *hue*, *saturation*, *lightness* )

*hue*, *saturation*, *lightness*
: *required* **Long** values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As HueSaturationLightnessParams = HueSaturationLightnessParams(30, -10, 5)
Debug.Print p.hue & " " & p.saturation & " " & p.lightness
Debug.Print p.hueLevel

Set p.hueLevel = 45
Debug.Print p.hue
' Output:
' 30 -10 5
' 30
' 45
```

## See Also

- [HueSaturationLightnessParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-huesaturationlightnessparams) -- Microsoft's documentation of the GDI+ structure
- [HueSaturationLightness](../HueSaturationLightness) class
