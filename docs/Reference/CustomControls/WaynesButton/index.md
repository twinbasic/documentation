---
title: WaynesButton
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesButton/
has_toc: false
---

# WaynesButton class
{: .no_toc }

An owner-drawn push-button. Renders a configurable rectangle (with optional gradient fill, borders, rounded / notched / cut-out corners) and a centred [**Caption**](#caption), in one of four visual states — normal, hovered, focused, or pressed — driven by four parallel [**WaynesButtonState**](WaynesButtonState) sub-objects.

The button raises a [**Click**](#click) event when clicked, plus the standard set of mouse, focus, and keyboard events. By default the four state objects are pre-set with a solid mid-blue ([**WAYNESCOLOR_BLUE**](#) — `&HAC7220`) background and 15-pixel curved corners.

```tb
Private Sub Form_Load()
    btnGo.Caption = "Continue"
    btnGo.NormalState.BackgroundFill.ColorPoints.SetSolidColor vbBlue
    btnGo.HoverState.BackgroundFill.SetSimplePattern vbBlue, vbWhite
    btnGo.NormalState.Corners.SetAll tbCurve, 12
End Sub

Private Sub btnGo_Click()
    MsgBox "Hello"
End Sub
```

* TOC
{:toc}

## Visual states

The button paints in one of four states, chosen at each repaint:

| State                              | When                                                                            |
|------------------------------------|---------------------------------------------------------------------------------|
| [**PressedState**](#pressedstate)  | The mouse is held down inside the button.                                       |
| [**HoverState**](#hoverstate)      | The mouse is held down outside the button, but began inside; or the mouse is hovering without being pressed. |
| [**FocusedState**](#focusedstate)  | The control has the keyboard focus and the mouse is not hovering or pressing.   |
| [**NormalState**](#normalstate)    | None of the above.                                                              |

Each state is a [**WaynesButtonState**](WaynesButtonState) — a small bundle of [**Corners**](../Styles/Corners), [**BackgroundFill**](../Styles/Fill), [**Borders**](../Styles/Borders), and [**TextRendering**](../Styles/TextRendering).

## Properties

### Anchors
{: .no_toc }

Which sides of the control are pinned to its container during resize. [**Anchors**](../Styles/Anchors). Inherited.

### Caption
{: .no_toc }

The text shown centred on the button. **String**. Default: `"Button"`.

Syntax: *object*.**Caption** [ = *string* ]

### Dock
{: .no_toc }

How the control is docked inside its container. A member of [**DockMode**](../Enumerations/DockMode). Inherited.

### FocusedState
{: .no_toc }

The [**WaynesButtonState**](WaynesButtonState) used when the control has the keyboard focus but is not being hovered or pressed.

### Height
{: .no_toc }

The control's height in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### HoverState
{: .no_toc }

The [**WaynesButtonState**](WaynesButtonState) used when the mouse is hovering over the button without being pressed (or when the mouse has been pressed and dragged off the button).

### Left
{: .no_toc }

The horizontal offset of the control's left edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. **String**. Inherited.

### NormalState
{: .no_toc }

The [**WaynesButtonState**](WaynesButtonState) used when the button is at rest — not hovered, not focused, not pressed.

### PressedState
{: .no_toc }

The [**WaynesButtonState**](WaynesButtonState) used when the mouse is held down on the button.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**. Inherited.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing **TAB**. **Boolean**. Inherited. Default: **True**.

### Top
{: .no_toc }

The vertical offset of the control's top edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Visible
{: .no_toc }

Whether the control is currently displayed. **Boolean**. Inherited. Default: **True**.

### Width
{: .no_toc }

The control's width in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

## Events

### Click
{: .no_toc }

Raised when the user clicks the button (mouse down + mouse up inside the control).

Syntax: *object*\_**Click**( )

### GotFocus
{: .no_toc }

Raised when the control receives the keyboard focus.

Syntax: *object*\_**GotFocus**( )

### KeyDown
{: .no_toc }

Raised when the user presses a key while the control has focus.

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### KeyPress
{: .no_toc }

Raised when the user types a character key while the control has focus.

Syntax: *object*\_**KeyPress**( *KeyCode* **As Integer** )

### KeyUp
{: .no_toc }

Raised when the user releases a key while the control has focus.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### LostFocus
{: .no_toc }

Raised when the control loses the keyboard focus.

Syntax: *object*\_**LostFocus**( )

### MouseDown
{: .no_toc }

Raised when the user presses a mouse button over the control.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseEnter
{: .no_toc }

Raised when the cursor first enters the control.

Syntax: *object*\_**MouseEnter**( )

### MouseLeave
{: .no_toc }

Raised when the cursor leaves the control.

Syntax: *object*\_**MouseLeave**( )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the control.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the control.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )
