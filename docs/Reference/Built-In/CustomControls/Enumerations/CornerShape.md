---
title: CornerShape
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/CornerShape
---
# CornerShape
{: .no_toc }

Determines how a single corner of a control is shaped. Used by [**Corner.Shape**](../Styles/Corners#shape), which is set independently for each of the four corners of any control that exposes a [**Corners**](../Styles/Corners) style object. The numeric value of the radius is supplied separately by [**Corner.Radius**](../Styles/Corners#radius).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbCurve**{: #tbCurve } | 0 | Quarter-circle round corner; the radius gives the curve. |
| **tbNotched**{: #tbNotched } | 1 | Diagonal notch across the corner; the radius gives the cut depth. |
| **tbCutOut**{: #tbCutOut } | 2 | A square cut out of the corner; the radius gives the side of the square. |

[**Corners.SetAll**](../Styles/Corners#setall) applies one shape to every corner at once; setting [**TopLeft**](../Styles/Corners#topleft) / [**TopRight**](../Styles/Corners#topright) / [**BottomLeft**](../Styles/Corners#bottomleft) / [**BottomRight**](../Styles/Corners#bottomright) individually lets the shapes mix:

```tb check_build
With btnDemo.NormalState.Corners
    .TopLeft.Shape = tbCurve     : .TopLeft.Radius = 16     ' rounded
    .TopRight.Shape = tbNotched  : .TopRight.Radius = 16    ' diagonal cut
    .BottomLeft.Shape = tbCutOut : .BottomLeft.Radius = 16  ' square cut out
    .BottomRight.Shape = tbCurve : .BottomRight.Radius = 0  ' sharp 90°
End With
```

A [**Radius**](../Styles/Corners#radius) of 0 produces a sharp 90° corner regardless of [**Shape**](../Styles/Corners#shape); a radius greater than or equal to half the control's smaller dimension turns a [**tbCurve**](#tbCurve) corner into a quarter-circle that touches the centreline, which is the technique the package's `Circle` sample button uses to render a full circle from a rectangular control.

Buttons with each shape on all four corners at a radius of 16 pixels, with a radius of 0, with the shapes mixed as in the sample above, and with a radius of half the button's side:

![Buttons in their default blue: tbCurve with rounded corners, tbNotched with each corner cut off diagonally, tbCutOut with a square cut out of each corner, Radius 0 with square corners, Mixed with the sample's four corners, and a round button whose radius is half its side](Images/CornerShape.png){:width="601" height="265"}
