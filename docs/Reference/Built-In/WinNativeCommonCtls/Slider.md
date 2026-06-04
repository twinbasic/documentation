---
title: Slider
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Slider
has_toc: false
---

# Slider class
{: .no_toc }

A **Slider** is a trackbar control --- a horizontal or vertical channel with a draggable thumb that lets the user pick a value between [**Min**](#min) and [**Max**](#max). Optional tick marks, a floating value tip, and a highlighted selection range round out the control.

```tb
Private Sub Form_Load()
    Slider1.Min = 0
    Slider1.Max = 100
    Slider1.Value = 50
    Slider1.SmallChange = 1   ' arrow-key step
    Slider1.LargeChange = 10  ' PgUp/PgDn step
    Slider1.TickFrequency = 10
End Sub

Private Sub Slider1_Change()
    Label1.Caption = Slider1.Value & " %"
End Sub
```

The control inherits the focusable rect-dockable members from `BaseControlFocusableNoFont` --- size, position, **Anchors**, **Dock**, **Appearance**, **MousePointer** / **MouseIcon**, **ToolTipText**, **DragMode** / **DragIcon**, **Drag**, **Refresh**, **SetFocus**, **TabIndex** / **TabStop**, **ZOrder**, **CausesValidation**, **VisualStyles**, **hWnd**, **HelpContextID** / **WhatsThisHelpID**. Slider does not have a [**Font**](../VB/CheckBox#font) property (its thumb and tick marks are drawn by the OS theme).

* TOC
{:toc}

## Change vs Scroll

The slider raises two distinct events as the user interacts with the thumb:

- **[Scroll](#scroll)** fires *during* drag and during keyboard navigation --- every time the thumb position is updated, regardless of whether the user has settled.
- **[Change](#change)** fires *only when the drag completes* (mouse release) or when the user reaches an extremity with the keyboard.

Use **Scroll** for live previews ("show the value as the user is dragging") and **Change** for commit-style handlers ("apply the value once the user lets go").

## Selection range

Set [**SelectRange**](#selectrange) to **True** to enable a highlighted selection band overlay on the channel. [**SelStart**](#selstart) and [**SelLength**](#sellength) then become writable and define the selection's bounds. This is useful for "between X and Y" UI patterns where the user picks a value but the application wants to highlight a recommended sub-range.

When [**SelectRange**](#selectrange) is **False** (the default), [**SelLength**](#sellength) always reads as `0` and [**SelStart**](#selstart) reads back as the [**Min**](#min) value.

Properties
----------

### BackColor
{: .no_toc }

The background color of the channel. **OLE_COLOR**. Default: **vbButtonFace**.

### BorderStyle
{: .no_toc }

The control's border style. A [**ControlBorderStyleConstants**](../VBRUN/Constants/ControlBorderStyleConstants) member. Default: **vbNoBorder**.

### HideThumb
{: .no_toc }

Whether the draggable thumb is hidden. **Boolean**. Default: **False**. When **True** the channel still functions but the user can only navigate it with the keyboard.

### LargeChange
{: .no_toc }

The amount **PgUp** / **PgDn** moves the thumb by. **Long**. Default: `2`.

### Max
{: .no_toc }

The upper bound of the range. **Long**. Default: `10`.

### Min
{: .no_toc }

The lower bound of the range. **Long**. Default: `0`.

### Orientation
{: .no_toc }

The slider's orientation. A [**OrientationConstants**](Enumerations/OrientationConstants) member (**ccOrientationHorizontal** or **ccOrientationVertical**). Default: **ccOrientationHorizontal**.

### SelectRange
{: .no_toc }

Whether a highlighted selection band overlay is enabled. **Boolean**. Default: **False**. When **False**, [**SelStart**](#selstart) and [**SelLength**](#sellength) are inert; assignments are silently dropped.

### SelLength
{: .no_toc }

The length of the highlighted selection band. **Long**. Read/write only when [**SelectRange**](#selectrange) is **True**. Assigning a value that pushes the end past [**Max**](#max) raises run-time error 380.

### SelStart
{: .no_toc }

The starting position of the highlighted selection band. **Long**. Assigning a value outside [[**Min**](#min), [**Max**](#max)] raises run-time error 380.

### ShowTip
{: .no_toc }

Whether the slider shows a floating tip with the current value while the thumb is being dragged. **Boolean**. Default: **True**. The tip side is controlled by [**TextPosition**](#textposition).

### SmallChange
{: .no_toc }

The amount the arrow keys move the thumb by. **Long**. Default: `1`.

### TextPosition
{: .no_toc }

Which side of the channel the floating tip is rendered on. A member of [**TextPositionConstants**](#textpositionconstants). Default: **sldBelowRight**. The naming reflects both axes: in horizontal orientation, **sldAboveLeft** renders above the channel and **sldBelowRight** renders below; in vertical orientation, **sldAboveLeft** renders to the left and **sldBelowRight** renders to the right.

### TickFrequency
{: .no_toc }

How often tick marks appear along the channel. **Long**. Default: `1` (one tick per unit). Assigning `0` is silently coerced to the same as `1`.

### TickStyle
{: .no_toc }

Which side(s) of the channel tick marks appear on. A member of [**TickStyleConstants**](#tickstyleconstants). Default: **sldBottomRight**.

### Value
{: .no_toc }

The current thumb position. **Long**. The default member. Fires [**Change**](#change) when set programmatically.

Events
------

### Change
{: .no_toc }

Raised when the user lets go of the thumb at a new position, or when the keyboard navigates to a track extremity. Distinct from [**Scroll**](#scroll), which fires continuously during drag.

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised on a mouse click inside the control's rectangle.

Syntax: *object*\_**Click**( )

### DragDrop, DragOver
{: .no_toc }

Inherited drag-drop events.

### GotFocus, LostFocus
{: .no_toc }

Inherited focus events.

### Initialize
{: .no_toc }

Raised after the control's window has been created.

### KeyDown, KeyPress, KeyUp
{: .no_toc }

Inherited keyboard events. The trackbar consumes arrow keys, **Home**, **End**, **PgUp**, and **PgDn** to navigate; the events still fire for the application to observe.

### MouseDown, MouseMove, MouseUp
{: .no_toc }

Inherited mouse events.

### OLECompleteDrag, OLEDragDrop, OLEDragOver, OLEGiveFeedback, OLESetData, OLEStartDrag
{: .no_toc }

Inherited OLE drag-and-drop events.

### Scroll
{: .no_toc }

Raised continuously while the user is interacting with the thumb. Use this for live previews; use [**Change**](#change) for commit-style handlers.

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Inherited validation event.

## TickStyleConstants
{: #tickstyleconstants }

Determines which side(s) of the slider channel tick marks are rendered on. Declared on the **Slider** class.

| Member                | Value | Description                                                          |
|-----------------------|-------|----------------------------------------------------------------------|
| **sldBottomRight**{: #TickStyleConstants_sldBottomRight } | 0 | Ticks render below the channel (horizontal) or to the right (vertical). |
| **sldTopLeft**{: #TickStyleConstants_sldTopLeft }         | 1 | Ticks render above the channel (horizontal) or to the left (vertical). |
| **sldBoth**{: #TickStyleConstants_sldBoth }               | 2 | Ticks render on both sides of the channel.                            |
| **sldNoTicks**{: #TickStyleConstants_sldNoTicks }         | 3 | Tick marks are hidden.                                                |

## TextPositionConstants
{: #textpositionconstants }

Determines which side of the slider channel the floating tip is rendered on when [**ShowTip**](#showtip) is **True**. Declared on the **Slider** class.

| Member                          | Value | Description                                                                  |
|---------------------------------|-------|------------------------------------------------------------------------------|
| **sldAboveLeft**{: #TextPositionConstants_sldAboveLeft } | 0 | Tip renders above the channel (horizontal) or to the left (vertical). |
| **sldBelowRight**{: #TextPositionConstants_sldBelowRight } | 1 | Tip renders below the channel (horizontal) or to the right (vertical). |

## See Also

- [ProgressBar](ProgressBar) -- when the user only needs to see progress, not adjust a value
- [UpDown](UpDown) -- a spin control for numeric value entry
- [OrientationConstants](Enumerations/OrientationConstants) -- the shared horizontal / vertical enum used by **Slider** and **UpDown**
- [ControlTypeConstants](../VBRUN/Constants/ControlTypeConstants) -- where **vbSlider** lives
