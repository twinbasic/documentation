---
title: LevelsParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/LevelsParams
---

# LevelsParams type
{: .no_toc }

The parameters of a [**Levels**](../Levels) effect: the highlight, midtone and shadow levels.

The type mirrors the GDI+ [LevelsParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-levelsparams) structure. A **Levels** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **highight** | **Long** | The highlight level, from 0 to 100. 100 leaves the top of the range alone. |
| **midtone** | **Long** | The midtone adjustment, from -100 to 100. 0 changes nothing. |
| **shadow** | **Long** | The shadow level, from 0 to 100. 0 leaves the bottom of the range alone. It has to be lower than the highlight level. |

<!-- test: Fx_EffectTests.LevelsParams_HighightField_HoldsTheHighlightLevel, compile LevelsParamsHighlightField -->
> [!NOTE] 0.9.45.0
> The first field is named **highight**, with the letter l missing, and the field **highlight** does not exist. The argument of the function **LevelsParams** is spelled correctly.

## Creating

Syntax: *params* **= LevelsParams**( *highlight*, *midtone*, *shadow* )

*highlight*, *midtone*, *shadow*
: *required* **Long** values for the fields. *highlight* goes into **highight**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As LevelsParams = LevelsParams(90, 10, 5)
Debug.Print p.highight & " " & p.midtone & " " & p.shadow

Dim fx As Levels = Levels()
fx.Parameters = p
Debug.Print fx.LastResult
' Output:
' 90 10 5
' 0
```

## See Also

- [LevelsParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-levelsparams) -- Microsoft's documentation of the GDI+ structure
- [Levels](../Levels) class
