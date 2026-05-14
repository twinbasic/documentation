---
title: ProgressBar
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ProgressBar
has_toc: false
---

# ProgressBar class
{: .no_toc }

A **ProgressBar** is a horizontal or vertical bar that visually represents progress through a range. Three configurable axes shape the visual: [**Scrolling**](#scrolling) (segmented / smooth / marquee), [**State**](#state) (Normal / Error / Paused, which tints the bar to match the OS theme), and [**Orientation**](#orientation) (horizontal or vertical).

```tb
Private Sub StartTask()
    ProgressBar1.Min = 0
    ProgressBar1.Max = ItemCount
    ProgressBar1.Step = 1
    ProgressBar1.Value = 0
End Sub

Private Sub OnItemDone()
    ProgressBar1.StepIt   ' advances by Step (1 here) and fires Change
End Sub

Private Sub OnTaskFailed()
    ProgressBar1.State = PrbStateError
End Sub
```

For indeterminate progress (e.g. waiting on a server response with no length information), use the marquee variant:

```tb
ProgressBar1.Scrolling = PrbScrollingMarquee
ProgressBar1.MarqueeSpeed = 30       ' milliseconds per animation step
ProgressBar1.MarqueeAnimation = True ' start animating
```

The control inherits the non-focusable rect-dockable members from `BaseControlNotFocusable2` — size, position, **Anchors**, **Dock**, **Appearance**, **MousePointer** / **MouseIcon**, **ToolTipText**, **DragMode** / **DragIcon**, **Drag**, **Refresh**, **ZOrder**, **CausesValidation**, **VisualStyles**, **hWnd**, **HelpContextID** / **WhatsThisHelpID**.

* TOC
{:toc}

## Three axes of configuration

The visual is the cartesian product of three properties:

- **[Scrolling](#scrolling)** — *Standard* (the default, animated segmented bar), *Smooth* (a continuous block — combine with [**SmoothReverse**](#smoothreverse) to allow the bar to decrease), or *Marquee* (an indeterminate animated stripe; control with [**MarqueeAnimation**](#marqueeanimation) + [**MarqueeSpeed**](#marqueespeed)).
- **[State](#state)** — *Normal* (theme-default color, typically green), *Error* (typically red), or *Paused* (typically yellow). The OS chooses the actual colors based on its current theme.
- **[Orientation](#orientation)** — *Horizontal* or *Vertical*.

All three can be changed at run time; the underlying Win32 styles are re-applied without recreating the window.

## Range, value, and stepping

[**Min**](#min) and [**Max**](#max) bracket the range. [**Value**](#value) is the current position. [**Step**](#step) is the amount [**StepIt**](#stepit) advances the bar by, used to power the common loop pattern:

```tb
ProgressBar1.Min = 0
ProgressBar1.Max = Items.Count
ProgressBar1.Step = 1
For Each item In Items
    DoWork item
    ProgressBar1.StepIt
Next
```

Each [**StepIt**](#stepit) call increments [**Value**](#value) by [**Step**](#step) and fires the [**Change**](#change) event.

Properties
----------

### BackColor
{: .no_toc }

The background color drawn behind the progress bar segments. **OLE_COLOR**. Default: **vbButtonFace**. Applied via `PBM_SETBKCOLOR`.

### BorderStyle
{: .no_toc }

The control's border style. A [**ControlBorderStyleConstants**](../VBRUN/Constants/ControlBorderStyleConstants) member. Default: **vbNoBorder**.

### ForeColor
{: .no_toc }

The color of the progress bar segments themselves. **OLE_COLOR**. Default: **vbHighlight**. Applied via `PBM_SETBARCOLOR`.

> [!NOTE]
> The OS visual styles theme typically overrides this value in standard rendering. To see the assigned **ForeColor** at run time, disable visual styles by setting [**VisualStyles**](../VB/CheckBox#visualstyles) to **False**.

### MarqueeAnimation
{: .no_toc }

Whether the marquee animation is currently running. **Boolean**. Default: **False**. Only meaningful when [**Scrolling**](#scrolling) is **PrbScrollingMarquee**. Set to **True** to start, **False** to stop.

### MarqueeSpeed
{: .no_toc }

The marquee animation update interval, in milliseconds. **Long**. Default: `80`.

### Max
{: .no_toc }

The upper bound of the range. **Long**. Default: `100`. The combination of [**Min**](#min) and [**Max**](#max) is applied to the underlying control via `PBM_SETRANGE32`.

### Min
{: .no_toc }

The lower bound of the range. **Long**. Default: `0`.

### Orientation
{: .no_toc }

The progress bar's orientation. A member of [**PrbOrientation**](#prborientation). Default: **PrbOrientationHorizontal**.

### Scrolling
{: .no_toc }

The visual style of progress. A member of [**PrbScrolling**](#prbscrolling). Default: **PrbScrollingStandard**.

### SmoothReverse
{: .no_toc }

Whether a smooth progress bar can decrease (when [**Value**](#value) is set to a smaller number). **Boolean**. Default: **False**. Without this flag a smooth bar that has reached, say, 80% will not visibly decrease when [**Value**](#value) is reduced — it simply snaps back. Only meaningful when [**Scrolling**](#scrolling) is **PrbScrollingSmooth**.

### State
{: .no_toc }

The visual state of the bar. A member of [**PrbState**](#prbstate). Default: **PrbStateNormal**. The OS uses the value to tint the bar — **PrbStateError** typically renders red, **PrbStatePaused** typically renders yellow, **PrbStateNormal** uses the theme-default progress color (typically green).

### Step
{: .no_toc }

The amount [**StepIt**](#stepit) advances [**Value**](#value) by. **Long**. Default: `10`.

### Value
{: .no_toc }

The current position in the range. **Long**. The default member. Reads and writes via `PBM_GETPOS` / `PBM_SETPOS`. Fires [**Change**](#change) when the value is changed past the control's initialization phase.

Methods
-------

### StepIt
{: .no_toc }

Advances [**Value**](#value) by [**Step**](#step), wrapping to [**Min**](#min) once [**Max**](#max) is reached. Fires the [**Change**](#change) event.

Syntax: *object*.**StepIt**

Events
------

### Change
{: .no_toc }

Raised when [**Value**](#value) has changed — either through direct assignment, through [**StepIt**](#stepit), or by code adjusting [**Step**](#step) and re-applying.

Syntax: *object*\_**Change**( )

### Click, DblClick
{: .no_toc }

Inherited mouse events.

### DragDrop, DragOver
{: .no_toc }

Inherited drag-drop events.

### Initialize
{: .no_toc }

Raised after the control's window has been created.

### MouseDown, MouseMove, MouseUp
{: .no_toc }

Inherited mouse events.

### OLECompleteDrag, OLEDragDrop, OLEDragOver, OLEGiveFeedback, OLESetData, OLEStartDrag
{: .no_toc }

Inherited OLE drag-and-drop events.

## PrbOrientation
{: #prborientation }

Determines the orientation of the progress bar. Declared on the **ProgressBar** class.

| Member                          | Value | Description                                |
|---------------------------------|-------|--------------------------------------------|
| **PrbOrientationHorizontal**{: #PrbOrientation_PrbOrientationHorizontal } | 0 | Horizontal bar; progress flows left-to-right. |
| **PrbOrientationVertical**{: #PrbOrientation_PrbOrientationVertical } | 1 | Vertical bar; progress flows bottom-to-top. |

## PrbScrolling
{: #prbscrolling }

Determines how the progress bar animates as the value changes. Declared on the **ProgressBar** class.

| Member                       | Value | Description                                                            |
|------------------------------|-------|------------------------------------------------------------------------|
| **PrbScrollingStandard**{: #PrbScrolling_PrbScrollingStandard } | 0 | Segmented bar with the classic discrete blocks animation. |
| **PrbScrollingSmooth**{: #PrbScrolling_PrbScrollingSmooth } | 1 | Continuous block with no inter-segment gaps. Pair with [**SmoothReverse**](#smoothreverse) to allow the value to decrease visibly. |
| **PrbScrollingMarquee**{: #PrbScrolling_PrbScrollingMarquee } | 2 | Indeterminate animated stripe. Drive with [**MarqueeAnimation**](#marqueeanimation) and [**MarqueeSpeed**](#marqueespeed); the actual [**Value**](#value) is irrelevant. |

## PrbState
{: #prbstate }

Determines the color theme of the progress bar. Declared on the **ProgressBar** class.

| Member                      | Value | Description                                                                       |
|-----------------------------|-------|-----------------------------------------------------------------------------------|
| **PrbStateNormal**{: #PrbState_PrbStateNormal }   | 1 | Theme-default progress color (typically green). |
| **PrbStateError**{: #PrbState_PrbStateError }     | 2 | Error state (typically red).                    |
| **PrbStatePaused**{: #PrbState_PrbStatePaused }   | 3 | Paused state (typically yellow).                |

## See Also

- [Slider](Slider) -- when the user needs to set a value within a range, not just see progress
- [ControlTypeConstants](../VBRUN/Constants/ControlTypeConstants) -- where **vbProgressBar** lives
