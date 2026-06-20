---
title: WaynesSliderState
parent: WaynesSlider
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesSlider/WaynesSliderState
has_toc: false
---

# WaynesSliderState class
{: .no_toc }

A bundle of the style objects that describe a single visual state of a [**WaynesSlider**](.). Each slider holds three parallel instances ([**NormalState**](.#normalstate), [**HoverState**](.#hoverstate), [**FocusedState**](.#focusedstate)); the slider picks one at each repaint depending on the mouse / focus state.

The state has two halves --- the *background* (the full track behind the block) and the *block* (the draggable rectangle that indicates [**Value**](.#value)). Each half has its own [**Fill**](../Styles/Fill), [**Borders**](../Styles/Borders), and [**Corners**](../Styles/Corners). A [**TextRendering**](../Styles/TextRendering) on the state controls how the optional [**DisplayFormat**](.#displayformat) text is drawn on the block.

[**InitializeDefaultValues**](#initializedefaultvalues) pre-sets the block to a solid mid-blue ([**WAYNESCOLOR_BLUE**](#) --- `&HAC7220`) fill, a 2-pixel black background border, and a transparent block border that acts as inner padding inside the background.

The type itself is `Public Class` but cannot be instantiated from outside the package --- instances are accessed only through the slider's **NormalState** / **HoverState** / **FocusedState** properties.

## Properties

### BackgroundBorders
{: .no_toc }

The [**Borders**](../Styles/Borders) drawn around the background track.

### BackgroundCorners
{: .no_toc }

The [**Corners**](../Styles/Corners) that controls the per-corner shape and radius of the background track.

### BackgroundFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the background track.

### BlockBorders
{: .no_toc }

The [**Borders**](../Styles/Borders) drawn around the block.

### BlockCorners
{: .no_toc }

The [**Corners**](../Styles/Corners) that controls the per-corner shape and radius of the block.

### BlockFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the block.

### BlockWidth
{: .no_toc }

The width of the block, in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 100. When [**Direction**](.#direction) is **Vertical**, this is the *height* of the block rather than its width; the block's other dimension takes the full available extent of the slider.

### TextRendering
{: .no_toc }

The [**TextRendering**](../Styles/TextRendering) that controls how the optional [**DisplayFormat**](.#displayformat) text is rendered on the block.

## Methods

### InitializeDefaultValues
{: .no_toc }

Resets the state object to the package's defaults --- a solid mid-blue block fill, a 2-pixel black background border, and a transparent block border. Called automatically the first time the parent slider is initialized, if no serialized data was loaded.

Syntax: *object*.**InitializeDefaultValues**

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the contained style objects raises its own **OnChanged**, or when [**BlockWidth**](#blockwidth) is assigned. The parent [**WaynesSlider**](.) listens for this and requests a repaint.
