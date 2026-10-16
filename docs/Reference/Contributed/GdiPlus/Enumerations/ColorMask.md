---
title: ColorMask
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/ColorMask
---

# ColorMask enumeration
{: .no_toc }

Gives the bit mask that selects a channel of an ARGB value.

Each mask is `&HFF` shifted left by the matching member of [ColorShift](ColorShift). No public member takes or returns this enumeration.

<!-- test: Im_TypeTests.ColorMask_AlphaShiftOfTheMaskedValueIsMinusOne -->
> [!NOTE] 0.9.45.0
> **AlphaMask** has the sign bit set, so shifting the masked value right by **AlphaShift** copies the sign bit and gives -1 for an alpha of 255. Mask the result with `&HFF` again, or use the **Alpha** property of a [**Color**](../Types/Color).

| Member | Value | Description |
|:-------|:------|:------------|
| **AlphaMask**{: #AlphaMask } | `&HFF000000` | Selects the alpha channel. |
| **RedMask**{: #RedMask } | `&H00FF0000` | Selects the red channel. |
| **GreenMask**{: #GreenMask } | `&H0000FF00` | Selects the green channel. |
| **BlueMask**{: #BlueMask } | `&H000000FF` | Selects the blue channel. |

## Example

```tb check_build check_run
Dim argb As Long = CColor.Orange
Debug.Print (argb And RedMask) >> RedShift
Debug.Print (argb And GreenMask) >> GreenShift
Debug.Print (argb And BlueMask) >> BlueShift
Debug.Print (argb And AlphaMask) >> AlphaShift
Debug.Print ((argb And AlphaMask) >> AlphaShift) And &HFF
' Output:
' 255
' 165
' 0
' -1
' 255
```

## See Also

- [Enumerations](.) -- all the enumerations of the package
