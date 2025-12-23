---
title: Painting / Drawing to Your Control
parent: CustomControls
nav_order: 4
permalink: /CustomControls/Painting/
---

# Painting / Drawing to Your Control

### The ICustomControl.Paint method
This is by far the most important method of a CustomControl.  It tells the form engine exactly how you want it to render your control.

{: .tip }
> It is highly advisable to look at and experiment with the sample project provided with twinBASIC before trying to implement your own CustomControl.

``` vb
Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas)  _
    Implements ICustomControl.Paint
```

You are passed a Canvas object that offers the following methods:

```
Canvas.Width As Long    [Property-Get]
Canvas.Height As Long   [Property-Get]
Canvas.Dpi As Long      [Property-Get]
Canvas.DpiScaleFactor As Double [Property-Get]
Canvas.AddElement(Descriptor As ElementDescriptor)
```

`Canvas.Width` and `Canvas.Height` are the absolute pixel sizes that your control is drawing to.  Unlike your controls Width/Height properties that are not DPI-scaled, the `Canvas.Width` and `Canvas.Height` values **are** DPI-scaled.

The `Canvas.Dpi` property represents the DPI setting in Windows.  If no DPI scaling is in effect, this value is 96.  For example, if you have scaling set at 150% on your monitor, then the `Canvas.Dpi` property will be 144.

The `Canvas.DpiScaleFactor` property gives a floating point value representing the DPI scaling percentage.  A value of 1 indicates no scaling.  For example, if you have scaling set at 150% on your monitor, then the `Canvas.DpiScaleFactor` property will be 1.5.

The `Canvas.AddElement` method is used for adding elements to your control.  An *element* is considered to be something that the form-engine will render for you.  For example, you might have a grid control that displays 100 cells at a time.  Each of those cells would be an *element*.  Elements can overlap each over (allowing for opacity/transparency).  The form engine draws them in the order that you call AddElement, meaning that the last element added will have the highest z-order.

***
### AddElement(ElementDescriptor)
The AddElement method takes a single argument; an ElementDescriptor.  ElementDescriptor is a UDT that defines exactly how the element will be drawn and how it reacts to events like mouse clicks.

``` vb
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
   TextRenderingOptions As TextRendering ' options to customize text rendering (object)
   BackgroundFill As Fill           ' options to customize back fill rendering (object)
   Corners As Corners               ' options to customize corner rendering (object)
   Borders As Borders               ' options to customize border rendering (object)
End Type
```

***
### Tips
- Each time your OnPaint method is called, you start with a blank canvas.

- Left/Top/Width/Height can legitimately be outside of the canvas area.  For example, negative Left/Top, or a Width/Height past the Canvas.Width/Canvas.Height has no ill-effects.  The form engine will clip everything appropriately for you, allowing for much simpler designing of your control.

- You should put thought into making the Paint routine efficient.  Try not to instantiate COM objects, and when drawing multiple similar elements, try to re-use ElementDescriptors by setting up common properties outside of loops (see WaynesGrid for examples of this)

- TrackingIdX and TrackingIdY are important when you have multiple elements within a control.   The two values, when combined, should uniquely represent the element, and must be maintained if your Paint routine is called again.  This is needed for supporting events.  For example, in a grid control, each cell would have a TrackingIdX / TrackingIdY value associated with it, given the X/Y co-ordinates of the cell. 

- Currently, only mouse events are provided, but focus events are coming soon, as well as keyboard events.

- You can use class-based event handlers by simply using the `AddressOf MyEvent` which is now possible to use even on class members.  You can see this used frequently in the samples, such as WaynesGrid.    All mouse events have the following format:   

``` vb
Class MyCustomControl
    '...
    Private Sub MyClickEvent(ByRef EventInfo As MouseEvent)
        MsgBox "You clicked me!"
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas)  _
            Implements ICustomControl.Paint
        Dim MyDescriptor As ElementDescriptor
        MyDescriptor.OnClick = AddressOf MyClickEvent
    End Sub
```

EventInfo (MouseEvent) provides mouse information such as the relative X/Y position of the mouse, plus the TrackingX/Y values discussed earlier.

- When you call Canvas.AddElement, your element goes into a render pipeline.  It is **not** immediately painted to the screen.   The render pipeline is compared to the previous render pipeline that was provided by you in the last OnPaint call, and the tB form engine will only redraw areas of the control that have changed.  This allows for efficient painting of controls whilst not needing to be concerned about the finer details of how to do partial repainting.