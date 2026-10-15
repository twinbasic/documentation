---
title: ColorBalanceParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorBalanceParams
---

# ColorBalanceParams type
{: .no_toc }

The parameters of a [**ColorBalance**](../ColorBalance) effect: the shift between cyan and red, magenta and green, and yellow and blue.

The type mirrors the GDI+ [ColorBalanceParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-colorbalanceparams) structure. A **ColorBalance** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **cyanRed** | **Long** | From -100 (more cyan) to 100 (more red). |
| **magentaGreen** | **Long** | From -100 (more magenta) to 100 (more green). |
| **yellowBlue** | **Long** | From -100 (more yellow) to 100 (more blue). |

## Creating

Syntax: *params* **= ColorBalanceParams**( *cyanRed*, *magentaGreen*, *yellowBlue* )

*cyanRed*, *magentaGreen*, *yellowBlue*
: *required* **Long** values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As ColorBalanceParams = ColorBalanceParams(10, -20, 30)
Debug.Print p.cyanRed & " " & p.magentaGreen & " " & p.yellowBlue

Dim fx As ColorBalance = ColorBalance()
fx.Parameters = p
Debug.Print fx.LastResult
' Output:
' 10 -20 30
' 0
```

## See Also

- [ColorBalanceParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-colorbalanceparams) -- Microsoft's documentation of the GDI+ structure
- [ColorBalance](../ColorBalance) class
