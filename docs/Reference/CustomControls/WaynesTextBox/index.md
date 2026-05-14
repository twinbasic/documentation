---
title: WaynesTextBox
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesTextBox/
has_toc: false
---

# WaynesTextBox class
{: .no_toc }

A single-line editable text field. The user can type, select with the mouse or with shift-modified cursor keys, jump word-by-word with **Ctrl+Left** / **Ctrl+Right**, double-click to select a word, and copy / cut / paste / select-all with the standard Windows shortcuts. The control draws its own caret, selection highlight, and inline text decorators (squiggle for *ERROR*, underline for *WARNING*, background highlight for *INFO*) on top of the configurable background.

The control paints three visual states ([**NormalState**](#normalstate), [**HoverState**](#hoverstate), [**FocusedState**](#focusedstate)) controlled by parallel [**WaynesTextBoxState**](WaynesTextBoxState) sub-objects, each of which has its own background fill, borders, corners, text rendering, selection colours, caret colour, and decorator colours.

The current text is held in [**Value**](#value). Surrogate-pair characters are handled correctly by the cursor / selection logic — the caret never appears between the high and low halves of a pair.

```tb
Private Sub Form_Load()
    txtName.Value = ""
    txtName.NormalState.TextRendering.Padding.Left = 6
    txtName.NormalState.TextRendering.Padding.Right = 6
End Sub
```

The three states are styled independently — a common pattern is to give the focused state a heavier border in an accent colour and brighten its fill, so the active field stands out from its siblings:

```tb
Private Sub Form_Load()
    With txtName.NormalState
        .BackgroundFill.ColorPoints.SetSolidColor vbWhite
        .Borders.SetSimpleBorder StrokeSize:=1, ColorRGB:=&HC0C0C0
        .Corners.SetAll tbCurve, 4
        .TextRendering.Padding.Left = 6
        .TextRendering.Padding.Right = 6
    End With

    With txtName.FocusedState
        .BackgroundFill.ColorPoints.SetSolidColor vbWhite
        .Borders.SetSimpleBorder StrokeSize:=2, ColorRGB:=&HC07014  ' accent blue
        .Corners.SetAll tbCurve, 4
        .TextRendering.Padding.Left = 6
        .TextRendering.Padding.Right = 6
    End With
End Sub
```

* TOC
{:toc}

## Inline text decorators

As the user types, the control automatically marks any occurrence of three literal strings inside [**Value**](#value):

- `ERROR` — a red squiggle underline (colour from [**WaynesTextBoxState.DecorationERROR**](WaynesTextBoxState#decorationerror)).
- `WARNING` — a dark-blue 2-pixel straight underline (from [**DecorationWARNING**](WaynesTextBoxState#decorationwarning)).
- `INFO` — a light-blue background highlight (from [**DecorationINFO**](WaynesTextBoxState#decorationinfo)).

The colours are configurable per visual state. The substrings themselves are hard-coded into the control's paint logic in the current release.

## Properties

### Anchors
{: .no_toc }

Which sides of the control are attached to its container during resize. [**Anchors**](../Styles/Anchors). Inherited.

### Dock
{: .no_toc }

How the control is docked inside its container. A member of [**DockMode**](../Enumerations/DockMode). Inherited.

### FocusedState
{: .no_toc }

The [**WaynesTextBoxState**](WaynesTextBoxState) used when the control has the keyboard focus. Pre-set with focus-specific defaults — orange caret, blue selection background.

### Height
{: .no_toc }

The control's height in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### HoverState
{: .no_toc }

The [**WaynesTextBoxState**](WaynesTextBoxState) used when the mouse is hovering over the textbox without it having focus.

### Left
{: .no_toc }

The horizontal offset of the control's left edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. **String**. Inherited.

### NormalState
{: .no_toc }

The [**WaynesTextBoxState**](WaynesTextBoxState) used when the textbox is idle — not focused and not hovered.

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

The current text in the field. **String**. Default: `"Textbox"`.

Syntax: *object*.**Value** [ = *string* ]

### Visible
{: .no_toc }

Whether the control is currently displayed. **Boolean**. Inherited. Default: **True**.

### Width
{: .no_toc }

The control's width in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.
