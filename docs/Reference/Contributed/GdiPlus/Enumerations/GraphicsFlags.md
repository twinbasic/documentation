---
title: GraphicsFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GraphicsFlags
---

# GraphicsFlags enumeration
{: .no_toc }

Holds the settings that [**VBGraphics**](../VBGraphics) keeps for itself.

No public member takes or returns this enumeration. The **UseTransparentAlpha** property of **VBGraphics** sets and clears its one flag. The flag is set when the object is created.

The members combine with **Or**.

| Member | Value | Description |
|:-------|:------|:------------|
| **LegacyTransparentDrawing**{: #LegacyTransparentDrawing } | `1` | Set: a colour whose alpha value is 0, such as a colour given as a VB6 colour constant, is used as it is, which draws nothing visible. Clear: a colour with alpha value 0 is drawn with alpha value 255. |
| **None**{: #None } | `0` | No flag is set. |

## See Also

- [Enumerations](.) -- all the enumerations of the package
