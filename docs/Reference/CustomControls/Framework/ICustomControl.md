---
title: ICustomControl
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/ICustomControl
has_toc: false
---

# ICustomControl interface
{: .no_toc }

The interface every custom control implements. The framework calls **Initialize** once after the control has been instantiated and its serialized property values have been deserialized, **Paint** every time the framework needs to redraw the control's area, and **Destroy** once when the control is being released.

The eight concrete `Waynes…` classes in the package all implement this interface, alongside an inherited mixin base class for the standard layout / name members.

```tb
Class MyControl
    Implements CustomControls.ICustomControl

    Private Sub OnInitialize(ByVal Context As CustomControls.CustomControlContext) _
            Implements CustomControls.ICustomControl.Initialize
        ' …
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomControl.Destroy
        ' …
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
            Implements CustomControls.ICustomControl.Paint
        ' …
    End Sub
End Class
```

## Methods

### Destroy
{: .no_toc }

Called once when the control is being released. The implementation should drop any references it holds to objects that themselves hold references back to it, so that the reference graph can collapse cleanly.

Syntax: *object*.**Destroy** ( )

### Initialize
{: .no_toc }

Called once after the framework has constructed the control and deserialized any designer-set property values from the form's `.frm` data into the new instance.

Syntax: *object*.**Initialize** ( *Context* )

*Context*
: *required* The [**CustomControlContext**](CustomControlContext) for this control instance. Store it (typically as a class field named **ControlContext**) — it is the only way to request repaints, create timers, or check the runtime mode after **Initialize** returns.

A common implementation calls **Context.GetSerializer().RuntimeUISrzDeserialize(Me, False)** to load designer-set property values into the instance; if the call returns **False**, no serialized data was found and the control should apply its own defaults.

### Paint
{: .no_toc }

Called every time the framework needs to redraw the control's client area. The implementation builds one or more `ElementDescriptor` records describing the rectangles to draw and hands each to *Canvas*. **RuntimeUICCCanvasAddElement**.

Syntax: *object*.**Paint** ( *Canvas* )

*Canvas*
: *required* The [**Canvas**](Canvas) drawing surface for this paint pass. Its **RuntimeUICCGetWidth**, **RuntimeUICCGetHeight**, and **RuntimeUICCGetDpiScaleFactor** methods supply the size and DPI of the area being painted, in device pixels.

A descriptor may carry event callbacks (`OnClick`, `OnMouseDown`, …) as `AddressOf` pointers; the framework dispatches input back through those pointers without the control needing to subscribe explicitly to anything.

A control should request additional repaints by calling [**CustomControlContext.Repaint**](CustomControlContext#repaint), not by calling **Paint** directly — the framework decides when to issue the actual paint pass.
