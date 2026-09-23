---
title: Canvas
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/Canvas
has_toc: false
---

# Canvas type (UDT)
{: .no_toc }

The drawing surface a custom control paints onto. Passed to [**ICustomControl.Paint**](ICustomControl#paint) on every redraw pass and used exclusively from inside that method --- its lifetime is the duration of the single paint pass.

A custom control builds up one or more `ElementDescriptor` records describing the rectangles to draw --- each with a position, size, fill, borders, corners, text, cursor, tab-index, and a set of `AddressOf`-registered input callbacks --- and passes each descriptor to [**RuntimeUICCCanvasAddElement**](#runtimeuicccanvasaddelement). The framework rasterises the descriptor, routes hit-testing to the registered callbacks, and (where the descriptor opts in) tracks keyboard tab order and focus.

A control fills one record in per element and adds it. The callback assigned to **OnClick** is an ordinary **Sub** taking a **MouseEvent** record, reached through **AddressOf**:

```tb check_build project=cc-private
Class MyIndicator
    Implements CustomControls.ICustomControl

    Private m_Context As CustomControls.CustomControlContext
    Public BackgroundFill As CustomControlsPackage.Fill
    Public TextRendering As CustomControlsPackage.TextRendering
    Public Caption As String

    Private Sub OnInitialize(ByVal Context As CustomControls.CustomControlContext) _
            Implements CustomControls.ICustomControl.Initialize
        Set m_Context = Context
        Set BackgroundFill = New CustomControlsPackage.Fill
        Set TextRendering = New CustomControlsPackage.TextRendering
        BackgroundFill.ColorPoints.SetSolidColor vbWhite
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomControl.Destroy
        Set m_Context = Nothing
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
            Implements CustomControls.ICustomControl.Paint

        Dim descriptor As CustomControlsPackage.ElementDescriptor
        With descriptor
            .Left = 0
            .Top = 0
            .Width = Canvas.RuntimeUICCGetWidth()
            .Height = Canvas.RuntimeUICCGetHeight()
            Set .BackgroundFill = Me.BackgroundFill
            .Text = Me.Caption
            Set .TextRenderingOptions = Me.TextRendering
            .OnClick = AddressOf OnElementClick
            Canvas.RuntimeUICCCanvasAddElement(descriptor)
        End With
    End Sub

    Private Sub OnElementClick(ByRef EventInfo As CustomControlsPackage.MouseEvent)
        m_Context.Repaint
    End Sub
End Class
```

> [!IMPORTANT]
>
> `ElementDescriptor` and `MouseEvent`, and the style classes the descriptor's members
> hold --- [**Fill**](../Styles/Fill), [**TextRendering**](../Styles/TextRendering),
> [**Corners**](../Styles/Corners) and [**Borders**](../Styles/Borders) --- are all
> **Private** components of the **CustomControlsPackage** control package. Naming them takes
> that library symbol prefixed with an asterisk in *Project Settings* --- not the
> **CustomControls** DESIGNER library listed beside it, which is where **Canvas** and
> [**ICustomControl**](ICustomControl) come from and needs no asterisk --- plus the package
> qualifier used above. See [Exposing a library's private
> symbols](../../../../Features/Packages/Library-Symbols#exposing-a-librarys-private-symbols)
> for the setting and where to find it.
>
> The **Waynes…** controls write the unqualified names because they are inside the package
> that declares them.

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

Returns the DPI scale factor --- `RuntimeUICCGetDpi / 96` --- as a **Double**. Multiply [**PixelCount**](../Enumerations/PixelCount)-typed measurements by this value to convert from design-time pixels to device pixels at paint time.

Syntax: *Canvas*.**RuntimeUICCGetDpiScaleFactor** ( ) **As Double**

### RuntimeUICCGetHeight
{: .no_toc }

Returns the height of the canvas in device pixels.

Syntax: *Canvas*.**RuntimeUICCGetHeight** ( ) **As Long**

### RuntimeUICCGetWidth
{: .no_toc }

Returns the width of the canvas in device pixels.

Syntax: *Canvas*.**RuntimeUICCGetWidth** ( ) **As Long**
