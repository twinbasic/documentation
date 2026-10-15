---
title: GpCustomLineCapType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpCustomLineCapType
---

# GpCustomLineCapType enumeration
{: .no_toc }

Tells whether a custom line cap is built from paths or is an adjustable arrow.

The package reads this value from GDI+ to decide which class wraps a cap, [**CustomLineCap**](../CustomLineCap) or [**ArrowCap**](../ArrowCap). No public member takes or returns it.

| Member | Value | Description |
|:-------|:------|:------------|
| **CustomLineCapTypeDefault**{: #CustomLineCapTypeDefault } | `0` | A cap built from a fill path or a stroke path. |
| **CustomLineCapTypeAdjustableArrow**{: #CustomLineCapTypeAdjustableArrow } | `1` | An adjustable arrow cap. |

## See Also

- [Enumerations](.) -- all the enumerations of the package
