---
title: WaynesSlider
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesSlider/
has_toc: false
---

# WaynesSlider class
{: .no_toc }

A horizontal or vertical slider control — a draggable block over a track — for editing an integer value within a range. The user can drag the block, click on the track to step the value by one page, or use the arrow keys when the control has focus; an optional auto-increment timer activates while a mouse button is held down on the track.

The control paints three visual states ([**NormalState**](#normalstate), [**HoverState**](#hoverstate), [**FocusedState**](#focusedstate)) controlled by parallel [**WaynesSliderState**](WaynesSliderState) sub-objects, each of which has independent fill / border / corner styling for the background and for the block. The current [**Value**](#value) is optionally rendered as text on the block — as a raw integer or as a formatted percentage — depending on [**DisplayFormat**](#displayformat).

If the control's [**Height**](#height) is greater than its [**Width**](#width) on first display, the slider defaults to [**Direction**](#direction) = **Vertical**; otherwise it defaults to **Horizontal**.

```tb
Private Sub Form_Load()
    sldVolume.MinValue = 0
    sldVolume.MaxValue = 100
    sldVolume.StepValue = 5
    sldVolume.PagingStepValue = 10
    sldVolume.DisplayFormat = SliderDisplayValueFormat.DisplayPercentage
End Sub
```

[**Value**](#value) is just a **Long** property — assigning to it from outside the control moves the block and triggers a repaint. Combined with a [**WaynesTimer**](../WaynesTimer), the slider can animate itself across its range:

```tb
Private Sub Form_Load()
    sldProgress.MinValue = 0
    sldProgress.MaxValue = 100
    sldProgress.Value = 0
    Timer1.Interval = 50
    Timer1.Enabled = True
End Sub

Private Sub Timer1_Timer()
    If sldProgress.Value < sldProgress.MaxValue Then
        sldProgress.Value = sldProgress.Value + 1
    Else
        Timer1.Enabled = False
    End If
End Sub
```

* TOC
{:toc}

## SliderDirection

The slider orientation enum, declared inside the **WaynesSlider** class. Assigned to [**Direction**](#direction).

| Constant | Value | Description |
|----------|-------|-------------|
| **Horizontal**{: #horizontal } | 0 | Track runs left-to-right; arrow keys **Left** / **Right** step the value. |
| **Vertical**{: #vertical } | 1 | Track runs top-to-bottom; arrow keys **Up** / **Down** step the value. |

## SliderDisplayValueFormat

How the [**Value**](#value) is rendered on the block, declared inside the **WaynesSlider** class. Assigned to [**DisplayFormat**](#displayformat).

| Constant | Value | Description |
|----------|-------|-------------|
| **DisplayValue**{: #displayvalue } | 0 | Show the raw integer value. |
| **DisplayPercentage**{: #displaypercentage } | 1 | Show the value as a percentage of the range — `FormatPercent((Value - MinValue) / (MaxValue - MinValue), 1)`. |
| **DisplayNone**{: #displaynone } | 2 | No text on the block. |

## Properties

### Anchors
{: .no_toc }

Which sides of the control are attached to its container during resize. [**Anchors**](../Styles/Anchors). Inherited.

### Direction
{: .no_toc }

Whether the slider is laid out horizontally or vertically. A member of [**SliderDirection**](#sliderdirection). Default: chosen on first display from the control's aspect ratio (vertical if **Height** > **Width**, else horizontal).

### DisplayFormat
{: .no_toc }

How the [**Value**](#value) is rendered as text on the block. A member of [**SliderDisplayValueFormat**](#sliderdisplayvalueformat). Default: **DisplayValue**.

### Dock
{: .no_toc }

How the control is docked inside its container. A member of [**DockMode**](../Enumerations/DockMode). Inherited.

### FocusedState
{: .no_toc }

The [**WaynesSliderState**](WaynesSliderState) used when the control has the keyboard focus and the mouse is not hovering.

### Height
{: .no_toc }

The control's height in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### HoverState
{: .no_toc }

The [**WaynesSliderState**](WaynesSliderState) used when the mouse is hovering over the block or over the track.

### Left
{: .no_toc }

The horizontal offset of the control's left edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### MaxValue
{: .no_toc }

The upper bound of the slider's value range. **Long**. Default: 100.

### MinValue
{: .no_toc }

The lower bound of the slider's value range. **Long**. Default: 0.

### MoveInterval
{: .no_toc }

The interval, in milliseconds, between automatic increments of [**Value**](#value) while a mouse button is held down on the track. **Long**. A value of 0 disables auto-repeat.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. **String**. Inherited.

### NormalState
{: .no_toc }

The [**WaynesSliderState**](WaynesSliderState) used when the slider is idle — not hovered, not focused.

### PagingStepValue
{: .no_toc }

How far [**Value**](#value) moves when the user clicks on the track outside the block (or holds a mouse button down on the track). **Long**. Default: 1.

### StepValue
{: .no_toc }

The granularity of the slider — [**Value**](#value) is rounded to a multiple of **StepValue** offset from [**MinValue**](#minvalue) before each paint. **Long**. Default: 1.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**. Inherited.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing **TAB**. **Boolean**. Inherited. Default: **True**.

### Top
{: .no_toc }

The vertical offset of the control's top edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Value
{: .no_toc }

The current position of the block within the range, as an integer. **Long**. Clamped to `[MinValue, MaxValue]` at paint time unless [**WrapAround**](#wraparound) is **True**.

Syntax: *object*.**Value** [ = *value* ]

### Visible
{: .no_toc }

Whether the control is currently displayed. **Boolean**. Inherited. Default: **True**.

### Width
{: .no_toc }

The control's width in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### WrapAround
{: .no_toc }

When **False** (the default), [**Value**](#value) is clamped to the range `[MinValue, MaxValue]`. When **True**, values outside the range are allowed and the block wraps around — the slider paints additional block instances on the opposite edge to give a continuous visual. **Boolean**.
