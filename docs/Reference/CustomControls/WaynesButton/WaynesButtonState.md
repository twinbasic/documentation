---
title: WaynesButtonState
parent: WaynesButton
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesButton/WaynesButtonState
has_toc: false
---

# WaynesButtonState class
{: .no_toc }

A bundle of the four style objects that describe a single visual state of a [**WaynesButton**](.) — its corners, background fill, borders, and text rendering. Each button carries four parallel instances reachable as [**NormalState**](.#normalstate), [**HoverState**](.#hoverstate), [**FocusedState**](.#focusedstate), and [**PressedState**](.#pressedstate); the button picks one at each repaint depending on the mouse / focus state.

Newly-constructed **WaynesButtonState** objects pre-set their **BackgroundFill** to a solid mid-blue and all four corners to a 15-pixel curve. Override per-state to give the button a different look in each state.

The type itself is `Private Class` — you reach instances only through the **WaynesButton.…State** properties and cannot declare a variable typed as **WaynesButtonState** from outside the package.

```tb
With btnGo.NormalState
    .BackgroundFill.ColorPoints.SetSolidColor vbBlue
    .TextRendering.Fill.ColorPoints.SetSolidColor vbWhite
End With

With btnGo.HoverState
    .BackgroundFill.SetSimplePattern vbBlue, &HE0E0FF, _
            Pattern:=tbGradientNorthToSouth
    .Borders.SetSimpleBorder StrokeSize:=2, ColorRGB:=vbBlue
End With
```

## Properties

### BackgroundFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the button's background.

### Borders
{: .no_toc }

The [**Borders**](../Styles/Borders) that draws the button's border strokes.

### Corners
{: .no_toc }

The [**Corners**](../Styles/Corners) that controls the per-corner shape and radius.

### TextRendering
{: .no_toc }

The [**TextRendering**](../Styles/TextRendering) that controls how the button's [**Caption**](.#caption) is drawn.

## Methods

### InitializeDefaults
{: .no_toc }

Resets the state object to the package's defaults — solid mid-blue **BackgroundFill** and 15-pixel curved corners. Called automatically the first time the parent button is initialized, if no serialized data was loaded.

Syntax: *object*.**InitializeDefaults**

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the four contained style objects raises its own **OnChanged**. The parent [**WaynesButton**](.) listens for this and requests a repaint.
