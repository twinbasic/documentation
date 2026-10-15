---
title: ColorCurveParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorCurveParams
---

# ColorCurveParams type
{: .no_toc }

The parameters of a [**ColorCurve**](../ColorCurve) effect: the kind of adjustment, the channel and the strength.

The type mirrors the GDI+ [CurveAdjustments](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ne-gdipluseffects-curveadjustments) parameters. A **ColorCurve** takes it in its constructor and in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **adjustment** | [**CurveAdjustments**](../Enumerations/CurveAdjustments) | The kind of adjustment. |
| **channel** | [**CurveChannel**](../Enumerations/CurveChannel) | The channel that is adjusted: all, or one of red, green and blue. |
| **value** | **Long** | The strength. The range depends on **adjustment**, as the page of [**ColorCurve**](../ColorCurve#creating) lists. |

## Properties

**adjustValue** is another name for **value**: the name of the C++ structure. It can be read and written.

## Creating

Syntax: *params* **= ColorCurveParams**( *adjustment*, *channel*, *value* )

*adjustment*, *channel*, *value*
: *required* Values for the fields.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As ColorCurveParams = ColorCurveParams(AdjustContrast, CurveChannelBlue, 9)
Debug.Print p.adjustment & " " & p.channel & " " & p.value & " " & p.adjustValue

p.adjustValue = 11
Debug.Print p.value
' Output:
' 2 3 9 9
' 11
```

## See Also

- [CurveAdjustments](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ne-gdipluseffects-curveadjustments) -- Microsoft's documentation of the GDI+ enumeration
- [ColorCurve](../ColorCurve) class
