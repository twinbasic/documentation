---
title: TintParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/TintParams
---

# TintParams type
{: .no_toc }

The parameters of a [**Tint**](../Tint) effect: the hue and the amount.

The type mirrors the GDI+ [TintParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-tintparams) structure. A **Tint** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **hue** | **Long** | The hue to tint with, an angle in degrees from -180 to 180. |
| **amount** | **Long** | The strength of the tint, from -100 to 100. 0 changes nothing. |

## Creating

Syntax: *params* **= TintParams**( *hue*, *amount* )

*hue*, *amount*
: *required* **Long** values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As TintParams = TintParams(-60, 25)
Debug.Print p.hue & " " & p.amount

Dim fx As Tint = Tint(p)
Debug.Print fx.LastResult
' Output:
' -60 25
' 0
```

## See Also

- [TintParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-tintparams) -- Microsoft's documentation of the GDI+ structure
- [Tint](../Tint) class
