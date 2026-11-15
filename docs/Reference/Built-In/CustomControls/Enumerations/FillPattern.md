---
title: FillPattern
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/FillPattern
---
# FillPattern
{: .no_toc }

Identifies how the colour table held by a [**Fill**](../Styles/Fill) is applied across the area being painted. The same colour stops produce very different results depending on the pattern --- a north-to-south gradient with two stops paints a top-to-bottom transition, while a corner gradient with the same stops puts the second colour in one corner and the first everywhere else. Used by [**Fill.Pattern**](../Styles/Fill#pattern).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbPatternNone**{: #tbPatternNone } | 0 | No gradient --- the first colour of the table fills the whole area. |
| **tbGradientNorthToSouth**{: #tbGradientNorthToSouth } | 1 | Linear gradient from the top edge down to the bottom edge. |
| **tbGradientSouthToNorth**{: #tbGradientSouthToNorth } | 2 | Linear gradient from the bottom edge up to the top edge. |
| **tbGradientWestToEast**{: #tbGradientWestToEast } | 3 | Linear gradient from the left edge across to the right edge. |
| **tbGradientEastToWest**{: #tbGradientEastToWest } | 4 | Linear gradient from the right edge across to the left edge. |
| **tbGradientNorthWestToSouthEast**{: #tbGradientNorthWestToSouthEast } | 5 | Diagonal gradient from the top-left corner to the bottom-right corner. The colour changes evenly across and down, so the top-right and bottom-left corners are halfway between the two colours. |
| **tbGradientNorthWestToSouthEastAlt**{: #tbGradientNorthWestToSouthEastAlt } | 6 | Diagonal gradient from the top-left corner to the bottom-right corner, its lines of equal colour at 45 degrees: on an area wider than it is high the colour changes mostly across, and on one higher than it is wide mostly down. On a square area it is the same as **tbGradientNorthWestToSouthEast**. |
| **tbGradientNorthEastToSouthWest**{: #tbGradientNorthEastToSouthWest } | 7 | Diagonal gradient from the top-right corner to the bottom-left corner. The colour changes evenly across and down, so the top-left and bottom-right corners are halfway between the two colours. |
| **tbGradientNorthEastToSouthWestAlt**{: #tbGradientNorthEastToSouthWestAlt } | 8 | Diagonal gradient from the top-right corner to the bottom-left corner, its lines of equal colour at 45 degrees: on an area wider than it is high the colour changes mostly across, and on one higher than it is wide mostly down. On a square area it is the same as **tbGradientNorthEastToSouthWest**. |
| **tbGradientSouthWestToNorthEast**{: #tbGradientSouthWestToNorthEast } | 9 | Diagonal gradient from the bottom-left corner to the top-right corner. The colour changes evenly across and down, so the top-left and bottom-right corners are halfway between the two colours. |
| **tbGradientSouthWestToNorthEastAlt**{: #tbGradientSouthWestToNorthEastAlt } | 10 | Diagonal gradient from the bottom-left corner to the top-right corner, its lines of equal colour at 45 degrees: on an area wider than it is high the colour changes mostly across, and on one higher than it is wide mostly down. On a square area it is the same as **tbGradientSouthWestToNorthEast**. |
| **tbGradientSouthEastToNorthWest**{: #tbGradientSouthEastToNorthWest } | 11 | Diagonal gradient from the bottom-right corner to the top-left corner. The colour changes evenly across and down, so the top-right and bottom-left corners are halfway between the two colours. |
| **tbGradientSouthEastToNorthWestAlt**{: #tbGradientSouthEastToNorthWestAlt } | 12 | Diagonal gradient from the bottom-right corner to the top-left corner, its lines of equal colour at 45 degrees: on an area wider than it is high the colour changes mostly across, and on one higher than it is wide mostly down. On a square area it is the same as **tbGradientSouthEastToNorthWest**. |
| **tbGradientCornerTopLeft**{: #tbGradientCornerTopLeft } | 13 | The second colour at the top-left corner, fading to the first colour toward the right and bottom edges, which are the first colour throughout. |
| **tbGradientCornerTopRight**{: #tbGradientCornerTopRight } | 14 | The second colour at the top-right corner, fading to the first colour toward the left and bottom edges, which are the first colour throughout. |
| **tbGradientCornerBottomLeft**{: #tbGradientCornerBottomLeft } | 15 | The second colour at the bottom-left corner, fading to the first colour toward the right and top edges, which are the first colour throughout. |
| **tbGradientCornerBottomRight**{: #tbGradientCornerBottomRight } | 16 | The second colour at the bottom-right corner, fading to the first colour toward the left and top edges, which are the first colour throughout. |
| **tbGradientCornerTopLeftAlt**{: #tbGradientCornerTopLeftAlt } | 17 | The second colour along the whole left edge, deepest at the top-left corner, fading quickly to the first colour, which fills the right part of the area. |
| **tbGradientCornerTopRightAlt**{: #tbGradientCornerTopRightAlt } | 18 | The second colour along the whole right edge, deepest at the top-right corner, fading quickly to the first colour, which fills the left part of the area. |
| **tbGradientCornerBottomLeftAlt**{: #tbGradientCornerBottomLeftAlt } | 19 | The second colour along the whole left edge, deepest at the bottom-left corner, fading quickly to the first colour, which fills the right part of the area. |
| **tbGradientCornerBottomRightAlt**{: #tbGradientCornerBottomRightAlt } | 20 | The second colour along the whole right edge, deepest at the bottom-right corner, fading quickly to the first colour, which fills the left part of the area. |

The colour table itself comes from the array of [**FillColorPoint**](../Styles/Fill#fillcolorpoint-class) values inside [**Fill.ColorPoints**](../Styles/Fill#colorpoints), interpolated to the configured [**Granularity**](../Styles/Fill#granularity).

The same two-stop pair painted with three different patterns produces three quite different results:

```tb check_build
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

The first colour is where each gradient starts: at the edge or corner its name starts from, for an edge or diagonal gradient. A corner gradient is the other way round, with the second colour at the corner it names. **tbPatternNone** fills the area with the first colour alone; a [**Fill**](../Styles/Fill) with no colour stops paints nothing, and the area behind the control shows through.

Each pattern painting the same two colours, a dark blue first and a pale yellow second:

![Twenty-one panels painted with the same dark blue and pale yellow, one in each FillPattern and named under it: tbPatternNone solid blue; the four edge gradients; the diagonals, whose Alt forms run more across the wide panels; and the corner gradients, with the yellow in the named corner, or along the named side for the Alt forms](Images/FillPattern.png){:width="1009" height="565"}
