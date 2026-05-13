---
title: Canvas
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/Canvas
has_toc: false
---

# Canvas type (UDT)
{: .no_toc }

The drawing surface a custom control paints onto. Passed to [**ICustomControl.Paint**](ICustomControl#paint) on every redraw pass and used exclusively from inside that method — its lifetime is the duration of the single paint pass.

A custom control builds up one or more `ElementDescriptor` records describing the rectangles it wants to draw — each carrying a position, size, fill, borders, corners, text, cursor, tab-index, and a set of `AddressOf`-registered input callbacks — and hands each descriptor to [**RuntimeUICCCanvasAddElement**](#runtimeuicccanvasaddelement). The framework rasterises the descriptor, routes hit-testing to the registered callbacks, and (where the descriptor opts in) tracks keyboard tab order and focus.

```tb
Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
        Implements CustomControls.ICustomControl.Paint

    Dim descriptor As ElementDescriptor
    With descriptor
        .Left = 0
        .Top = 0
        .Width = Canvas.RuntimeUICCGetWidth()
        .Height = Canvas.RuntimeUICCGetHeight()
        Set .BackgroundFill = Me.NormalState.BackgroundFill
        .Text = Me.Caption
        Set .TextRenderingOptions = Me.NormalState.TextRendering
        .OnClick = AddressOf BtnClick
        Canvas.RuntimeUICCCanvasAddElement(descriptor)
    End With
End Sub
```

## Methods

### RuntimeUICCCanvasAddElement
{: .no_toc }

Adds an `ElementDescriptor` to the canvas. Each element becomes one painted rectangle plus its input-handling region. Descriptors are rendered in the order they are added, so later elements paint on top of earlier ones.

Syntax: *Canvas*.**RuntimeUICCCanvasAddElement** *ElementDescriptor*

*ElementDescriptor*
: *required* A `ByRef` reference to the populated `ElementDescriptor` UDT. The framework copies the values it needs out of the record; the caller can reuse the variable for the next element.

### RuntimeUICCGetDpi
{: .no_toc }

Returns the DPI of the monitor the control is currently displayed on, as an integer (the standard 96 / 120 / 144 / … values).

Syntax: *Canvas*.**RuntimeUICCGetDpi** ( ) **As Long**

### RuntimeUICCGetDpiScaleFactor
{: .no_toc }

Returns the DPI scale factor — `RuntimeUICCGetDpi / 96` — as a **Double**. Multiply [**PixelCount**](../Enumerations/PixelCount)-typed measurements by this value to convert from design-time pixels to device pixels at paint time.

Syntax: *Canvas*.**RuntimeUICCGetDpiScaleFactor** ( ) **As Double**

### RuntimeUICCGetHeight
{: .no_toc }

Returns the height of the canvas in device pixels.

Syntax: *Canvas*.**RuntimeUICCGetHeight** ( ) **As Long**

### RuntimeUICCGetWidth
{: .no_toc }

Returns the width of the canvas in device pixels.

Syntax: *Canvas*.**RuntimeUICCGetWidth** ( ) **As Long**
