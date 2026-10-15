---
title: GpCombineMode
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpCombineMode
---

# GpCombineMode enumeration
{: .no_toc }

Selects how a new region or clip shape is combined with an existing one.

| Member | Value | Description |
|:-------|:------|:------------|
| **CombineModeReplace**{: #CombineModeReplace } | `0` | The existing region is replaced by the new one. |
| **CombineModeIntersect**{: #CombineModeIntersect } | `1` | The result is the area that the existing and the new region have in common. |
| **CombineModeUnion**{: #CombineModeUnion } | `2` | The result is every area that is in either region. |
| **CombineModeXor**{: #CombineModeXor } | `3` | The result is the areas that are in exactly one of the two regions. |
| **CombineModeExclude**{: #CombineModeExclude } | `4` | The result is the existing region without the area that it shares with the new region. |
| **CombineModeComplement**{: #CombineModeComplement } | `5` | The result is the new region without the area that it shares with the existing region. |

## Used by

- [**Graphics**](../Graphics) class: [**SetClip**](../Graphics#setclip)

## See Also

- [CombineMode](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-combinemode) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
