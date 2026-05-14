---
title: FillPattern
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/FillPattern
---
# FillPattern
{: .no_toc }

Identifies how the colour table held by a [**Fill**](../Styles/Fill) is applied across the area being painted. The same colour stops produce very different results depending on the pattern — a north-to-south gradient with two stops paints a top-to-bottom transition, while a corner gradient with the same stops paints from one corner outward. Used by [**Fill.Pattern**](../Styles/Fill#pattern).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbPatternNone**{: #tbPatternNone } | 0 | No fill — leaves the region transparent. |
| **tbGradientNorthToSouth**{: #tbGradientNorthToSouth } | 1 | Linear gradient from the top edge down to the bottom edge. |
| **tbGradientSouthToNorth**{: #tbGradientSouthToNorth } | 2 | Linear gradient from the bottom edge up to the top edge. |
| **tbGradientWestToEast**{: #tbGradientWestToEast } | 3 | Linear gradient from the left edge across to the right edge. |
| **tbGradientEastToWest**{: #tbGradientEastToWest } | 4 | Linear gradient from the right edge across to the left edge. |
| **tbGradientNorthWestToSouthEast**{: #tbGradientNorthWestToSouthEast } | 5 | Linear diagonal gradient from the top-left corner to the bottom-right. |
| **tbGradientNorthWestToSouthEastAlt**{: #tbGradientNorthWestToSouthEastAlt } | 6 | Alternate diagonal: same axis as **tbGradientNorthWestToSouthEast** but with the stops mirrored about the centre. |
| **tbGradientNorthEastToSouthWest**{: #tbGradientNorthEastToSouthWest } | 7 | Linear diagonal gradient from the top-right corner to the bottom-left. |
| **tbGradientNorthEastToSouthWestAlt**{: #tbGradientNorthEastToSouthWestAlt } | 8 | Alternate diagonal: same axis as **tbGradientNorthEastToSouthWest** but mirrored. |
| **tbGradientSouthWestToNorthEast**{: #tbGradientSouthWestToNorthEast } | 9 | Linear diagonal gradient from the bottom-left corner to the top-right. |
| **tbGradientSouthWestToNorthEastAlt**{: #tbGradientSouthWestToNorthEastAlt } | 10 | Alternate diagonal: same axis as **tbGradientSouthWestToNorthEast** but mirrored. |
| **tbGradientSouthEastToNorthWest**{: #tbGradientSouthEastToNorthWest } | 11 | Linear diagonal gradient from the bottom-right corner to the top-left. |
| **tbGradientSouthEastToNorthWestAlt**{: #tbGradientSouthEastToNorthWestAlt } | 12 | Alternate diagonal: same axis as **tbGradientSouthEastToNorthWest** but mirrored. |
| **tbGradientCornerTopLeft**{: #tbGradientCornerTopLeft } | 13 | Radial-style gradient emanating from the top-left corner outward. |
| **tbGradientCornerTopRight**{: #tbGradientCornerTopRight } | 14 | Radial-style gradient emanating from the top-right corner outward. |
| **tbGradientCornerBottomLeft**{: #tbGradientCornerBottomLeft } | 15 | Radial-style gradient emanating from the bottom-left corner outward. |
| **tbGradientCornerBottomRight**{: #tbGradientCornerBottomRight } | 16 | Radial-style gradient emanating from the bottom-right corner outward. |
| **tbGradientCornerTopLeftAlt**{: #tbGradientCornerTopLeftAlt } | 17 | Alternate top-left corner gradient with the stops mirrored. |
| **tbGradientCornerTopRightAlt**{: #tbGradientCornerTopRightAlt } | 18 | Alternate top-right corner gradient with the stops mirrored. |
| **tbGradientCornerBottomLeftAlt**{: #tbGradientCornerBottomLeftAlt } | 19 | Alternate bottom-left corner gradient with the stops mirrored. |
| **tbGradientCornerBottomRightAlt**{: #tbGradientCornerBottomRightAlt } | 20 | Alternate bottom-right corner gradient with the stops mirrored. |

The colour table itself comes from the array of [**FillColorPoint**](../Styles/Fill#fillcolorpoint-class) values inside [**Fill.ColorPoints**](../Styles/Fill#colorpoints), interpolated to the configured [**Granularity**](../Styles/Fill#granularity).

The same two-stop pair painted with three different patterns produces three quite different results:

```tb
' Top fades to bottom
pnlOne.BackgroundFill.SetSimplePattern vbWhite, &H99CCFF, _
        Pattern:=tbGradientNorthToSouth

' Left fades to right
pnlTwo.BackgroundFill.SetSimplePattern vbWhite, &H99CCFF, _
        Pattern:=tbGradientWestToEast

' Emanates from the top-left corner
pnlThree.BackgroundFill.SetSimplePattern vbWhite, &H99CCFF, _
        Pattern:=tbGradientCornerTopLeft
```

For a flat region with no gradient at all, use **tbPatternNone** — the `Fill` becomes fully transparent and the area behind the control shows through.
