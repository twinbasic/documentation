---
title: Painting / Drawing to Your Control
parent: CustomControls
nav_order: 4
permalink: /Tutorials/CustomControls/Painting
redirect_from:
  - /CustomControls/Painting
---

# Painting / Drawing to Your Control

## The ICustomControl.Paint method
This is by far the most important method of a CustomControl.  It tells the form engine exactly how you want it to render your control. See the [`ICustomControl.Paint`](../../tB/Packages/CustomControls/Framework/ICustomControl#paint) reference for the host-side contract.

> [!TIP]
> It is highly advisable to look at and experiment with the sample project provided with twinBASIC before trying to implement your own CustomControl.

```tb hidden concat_group=paint-a-line
' Context for the OnPaint sample below: the rest of a minimal control, as
' "Defining a CustomControl" describes it, and the Fill the sample draws with.
[COMCreatable(False)]
Class LineControl
    Implements CustomControls.ICustomControl

    Private LineFill As CustomControlsPackage.Fill

    Private Sub OnInitialize(ByVal Context As CustomControls.CustomControlContext) _
            Implements CustomControls.ICustomControl.Initialize
        Set LineFill = New CustomControlsPackage.Fill
        LineFill.ColorPoints.SetSolidColor vbBlack
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomControl.Destroy
    End Sub
```

```tb check_build concat_group=paint-a-line project=cc-private
Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
        Implements CustomControls.ICustomControl.Paint
    ' Draws a horizontal line across the middle of the control, as an element
    ' one pixel tall at 100% scaling. LineFill is a solid-colour
    ' CustomControlsPackage.Fill that the control creates once, in Initialize.
    Dim LineElement As CustomControlsPackage.ElementDescriptor
    LineElement.Width = Canvas.RuntimeUICCGetWidth()
    LineElement.Height = CLng(Canvas.RuntimeUICCGetDpiScaleFactor())
    LineElement.Top = (Canvas.RuntimeUICCGetHeight() - LineElement.Height) \ 2
    Set LineElement.BackgroundFill = LineFill
    Canvas.RuntimeUICCCanvasAddElement LineElement
End Sub
```

```tb hidden concat_group=paint-a-line
End Class
```

You are passed a [`Canvas`](../../tB/Packages/CustomControls/Framework/Canvas) object that offers the following methods:

```tb inert=pseudo
Canvas.RuntimeUICCGetWidth() As Long
Canvas.RuntimeUICCGetHeight() As Long
Canvas.RuntimeUICCGetDpi() As Long
Canvas.RuntimeUICCGetDpiScaleFactor() As Double
Canvas.RuntimeUICCCanvasAddElement(Descriptor As ElementDescriptor)
```

[`RuntimeUICCGetWidth`](../../tB/Packages/CustomControls/Framework/Canvas#runtimeuiccgetwidth) and [`RuntimeUICCGetHeight`](../../tB/Packages/CustomControls/Framework/Canvas#runtimeuiccgetheight) return the absolute pixel sizes that your control is drawing to.  Unlike your control's Width/Height properties, which are not DPI-scaled, these values **are** DPI-scaled.

[`RuntimeUICCGetDpi`](../../tB/Packages/CustomControls/Framework/Canvas#runtimeuiccgetdpi) returns the DPI setting in Windows.  If no DPI scaling is in effect, this value is 96.  For example, if you have scaling set at 150% on your monitor, then `RuntimeUICCGetDpi` returns 144.

[`RuntimeUICCGetDpiScaleFactor`](../../tB/Packages/CustomControls/Framework/Canvas#runtimeuiccgetdpiscalefactor) returns a floating point value representing the DPI scaling percentage.  A value of 1 indicates no scaling.  For example, if you have scaling set at 150% on your monitor, then `RuntimeUICCGetDpiScaleFactor` returns 1.5.

[`RuntimeUICCCanvasAddElement`](../../tB/Packages/CustomControls/Framework/Canvas#runtimeuicccanvasaddelement) adds an element to your control.  An *element* is considered to be something that the form-engine will render for you.  For example, you might have a grid control that displays 100 cells at a time.  Each of those cells would be an *element*.  Elements can overlap each over (allowing for opacity/transparency).  The form engine draws them in the order that you call `RuntimeUICCCanvasAddElement`, meaning that the last element added will have the highest z-order.

***
## RuntimeUICCCanvasAddElement(ElementDescriptor)
`RuntimeUICCCanvasAddElement` takes a single argument, an ElementDescriptor.  ElementDescriptor is a UDT that defines exactly how the element will be drawn and how it reacts to events like mouse clicks.

```tb check_build project=cc-private
Public Type ElementDescriptor
   OnClick As LongPtr               ' event function callback pointer
   OnDblClick As LongPtr            ' event function callback pointer
   OnMouseDown As LongPtr           ' event function callback pointer
   OnMouseUp As LongPtr             ' event function callback pointer
   OnMouseEnter As LongPtr          ' event function callback pointer
   OnMouseLeave As LongPtr          ' event function callback pointer
   OnMouseMove As LongPtr           ' event function callback pointer
   OnScrollH As LongPtr             ' event function callback pointer
   OnScrollV As LongPtr             ' event function callback pointer
   Left As Long                     ' pixel offset (control relative, DPI scaled)
   Top As Long                      ' pixel offset (control relative, DPI scaled)
   Width As Long                    ' pixel width (DPI scaled)
   Height As Long                   ' pixel width (DPI scaled)
   Cursor As MousePointerConstants  ' cursor/pointer icon
   TrackingIdX As LongLong          ' for tracking this element, passed to events
   TrackingIdY As LongLong          ' for tracking this element, passed to events
   Text As String                   ' the text to render
   TextRenderingOptions As CustomControlsPackage.TextRendering ' options to customize text rendering (object)
   BackgroundFill As CustomControlsPackage.Fill           ' options to customize back fill rendering (object)
   Corners As CustomControlsPackage.Corners               ' options to customize corner rendering (object)
   Borders As CustomControlsPackage.Borders               ' options to customize border rendering (object)
End Type
```

***
## Tips
- Each time your OnPaint method is called, you start with a blank canvas.

- Left/Top/Width/Height can legitimately be outside of the canvas area.  For example, negative Left/Top, or a Width/Height past the canvas width or height has no ill-effects.  The form engine will clip everything appropriately for you, allowing for much simpler designing of your control.

- You should put thought into making the Paint routine efficient.  Try not to instantiate COM objects, and when drawing multiple similar elements, try to re-use ElementDescriptors by setting up common properties outside of loops (see WaynesGrid for examples of this)

- TrackingIdX and TrackingIdY are important when you have multiple elements within a control.   The two values, when combined, should uniquely represent the element, and must be maintained if your Paint routine is called again.  This is needed for supporting events.  For example, in a grid control, each cell would have a TrackingIdX / TrackingIdY value associated with it, given the X/Y co-ordinates of the cell. 

- Currently, only mouse events are provided, but focus events are coming soon, as well as keyboard events.

- You can use class-based event handlers by simply using the `AddressOf MyEvent` which is now possible to use even on class members.  You can see this used frequently in the samples, such as WaynesGrid.    All mouse events have the following format:   

```tb check_build project=cc-private
Class MyCustomControl
    Implements CustomControls.ICustomControl
    ' ...

    Private Sub OnInitialize(ByVal Context As CustomControls.CustomControlContext) _
            Implements CustomControls.ICustomControl.Initialize
        ' ...
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomControl.Destroy
        ' ...
    End Sub

    Private Sub MyClickEvent(ByRef EventInfo As CustomControlsPackage.MouseEvent)
        MsgBox "You clicked me!"
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
            Implements CustomControls.ICustomControl.Paint
        ' One element covering the whole control, so a click anywhere on it
        ' calls MyClickEvent.
        Dim MyDescriptor As CustomControlsPackage.ElementDescriptor
        MyDescriptor.Width = Canvas.RuntimeUICCGetWidth()
        MyDescriptor.Height = Canvas.RuntimeUICCGetHeight()
        MyDescriptor.OnClick = AddressOf MyClickEvent
        Canvas.RuntimeUICCCanvasAddElement MyDescriptor
    End Sub
End Class
```

EventInfo (MouseEvent) provides mouse information such as the relative X/Y position of the mouse, plus the TrackingX/Y values discussed earlier.

- When you call `RuntimeUICCCanvasAddElement`, your element goes into a render pipeline.  It is **not** immediately painted to the screen.   The render pipeline is compared to the previous render pipeline that was provided by you in the last OnPaint call, and the tB form engine will only redraw areas of the control that have changed.  This allows for efficient painting of controls whilst not needing to be concerned about the finer details of how to do partial repainting.

***
## See also

- [`ICustomControl`](../../tB/Packages/CustomControls/Framework/ICustomControl) -- the interface every custom control implements
- [`Canvas`](../../tB/Packages/CustomControls/Framework/Canvas) -- the drawing surface passed to **Paint**
- Style helpers used by the `BackgroundFill` / `Borders` / `Corners` / `TextRenderingOptions` fields of an `ElementDescriptor`: [`Fill`](../../tB/Packages/CustomControls/Styles/Fill), [`Borders`](../../tB/Packages/CustomControls/Styles/Borders), [`Corners`](../../tB/Packages/CustomControls/Styles/Corners), [`TextRendering`](../../tB/Packages/CustomControls/Styles/TextRendering)
- [CustomControls package reference](../../tB/Packages/CustomControls/) -- overview of the framework and the built-in `Waynes…` controls (a number of which --- `WaynesGrid`, `WaynesButton`, … --- are exactly the worked examples mentioned above)