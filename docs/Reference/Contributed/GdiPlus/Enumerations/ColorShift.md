---
title: ColorShift
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ColorShift
---

# ColorShift enumeration
{: .no_toc }

Gives the number of bits to shift an ARGB value right to bring a channel to the lowest byte.

The values are used with [ColorMask](ColorMask). No public member takes or returns this enumeration.

| Member | Value | Description |
|:-------|:------|:------------|
| **AlphaShift**{: #AlphaShift } | `24` | The alpha channel is in bits 24 to 31. |
| **RedShift**{: #RedShift } | `16` | The red channel is in bits 16 to 23. |
| **GreenShift**{: #GreenShift } | `8` | The green channel is in bits 8 to 15. |
| **BlueShift**{: #BlueShift } | `0` | The blue channel is in bits 0 to 7. |

## See Also

- [Enumerations](.) -- all the enumerations of the package
