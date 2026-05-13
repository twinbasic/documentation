---
title: CornerShape
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/CornerShape
---
# CornerShape
{: .no_toc }

Determines how a single corner of a control is shaped. Carried by [**Corner.Shape**](../Styles/Corners#shape), which is set independently for each of the four corners of any control that exposes a [**Corners**](../Styles/Corners) style object. The numeric value of the radius is supplied separately by [**Corner.Radius**](../Styles/Corners#radius).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbCurve**{: #tbCurve } | 0 | Quarter-circle round corner; the radius gives the curve. |
| **tbNotched**{: #tbNotched } | 1 | Diagonal notch across the corner; the radius gives the cut depth. |
| **tbCutOut**{: #tbCutOut } | 2 | Inverse round-corner — the corner area is carved *out* of the control. |
