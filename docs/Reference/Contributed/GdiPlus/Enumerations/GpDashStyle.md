---
title: GpDashStyle
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpDashStyle
---

# GpDashStyle enumeration
{: .no_toc }

Selects the line style of a pen: solid, one of four predefined dash patterns, or a custom pattern.

The lengths in a predefined pattern are multiples of the pen width. Setting **DashStyle** on a pen replaces its dash pattern with the predefined one, and setting the **DashPattern** of a pen changes its style to **DashStyleCustom**.

| Member | Value | Description |
|:-------|:------|:------------|
| **DashStyleSolid**{: #DashStyleSolid } | `0` | A solid line. |
| **DashStyleDash**{: #DashStyleDash } | `1` | A line of dashes. |
| **DashStyleDot**{: #DashStyleDot } | `2` | A line of dots. |
| **DashStyleDashDot**{: #DashStyleDashDot } | `3` | A line that alternates a dash and a dot. |
| **DashStyleDashDotDot**{: #DashStyleDashDotDot } | `4` | A line that alternates a dash and two dots. |
| **DashStyleCustom**{: #DashStyleCustom } | `5` | A user-defined pattern, set with the **DashPattern** property of the pen. |

## Used by

- [**Pen**](../Pen) class: [**DashStyle**](../Pen#dashstyle)

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim p As Pen = Pen(Color(CColor.Red), 1)
Debug.Print p.DashStyle = DashStyleSolid
Debug.Print p.DashPatternCount

p.DashStyle = DashStyleDash
Debug.Print p.DashPatternCount

Dim pattern(1) As Single
pattern(0) = 2
pattern(1) = 1
p.DashPattern = pattern
Debug.Print p.DashStyle = DashStyleCustom
' Output:
' True
' 0
' 2
' True
```

## See Also

- [DashStyle](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-dashstyle) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Pen](../Pen) class
