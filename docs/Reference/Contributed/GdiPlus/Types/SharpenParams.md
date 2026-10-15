---
title: SharpenParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/SharpenParams
---

# SharpenParams type
{: .no_toc }

The parameters of a [**Sharpen**](../Sharpen) effect: the radius and the amount.

The type mirrors the GDI+ [SharpenParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-sharpenparams) structure. A **Sharpen** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **radius** | **Single** | The sharpening radius in pixels, from 0 to 255. |
| **amount** | **Single** | The strength, from 0 to 100. 0 changes nothing. |

## Creating

Syntax: *params* **= SharpenParams**( *radius*, *amount* )

*radius*, *amount*
: *required* **Single** values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As SharpenParams = SharpenParams(3!, 40!)
Debug.Print p.radius & " " & p.amount

Dim fx As Sharpen = Sharpen(p)
Debug.Print fx.LastResult
' Output:
' 3 40
' 0
```

## See Also

- [SharpenParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-sharpenparams) -- Microsoft's documentation of the GDI+ structure
- [Sharpen](../Sharpen) class
