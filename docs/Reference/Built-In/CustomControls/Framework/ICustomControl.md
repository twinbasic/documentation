---
title: ICustomControl
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/ICustomControl
has_toc: false
---

# ICustomControl interface
{: .no_toc }

The interface every custom control implements.

The framework calls **Initialize** once after the control has been constructed and its designer-set property values have been deserialized, **Paint** every time the control's area must be redrawn, and **Destroy** once when the control is being released.

The eight concrete `Waynes...` classes in the package all implement this interface, together with an inherited mixin base class that supplies the standard layout and name members.

```tb
Class MyControl
    Implements CustomControls.ICustomControl

    Private Sub OnInitialize(ByVal Context As CustomControls.CustomControlContext) _
            Implements CustomControls.ICustomControl.Initialize
        ' store Context and deserialize designer-set property values
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomControl.Destroy
        ' drop any back-references held by stored objects
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
            Implements CustomControls.ICustomControl.Paint
        ' build ElementDescriptor records and pass each to Canvas.RuntimeUICCCanvasAddElement
    End Sub
End Class
```

## Methods

### Initialize
{: .no_toc }

Called once after the framework has constructed the control and deserialized any designer-set property values from the form's `.frm` data into the new instance.

Syntax: *object*.**Initialize** ( *Context* )

*Context*
: *required* The [**CustomControlContext**](CustomControlContext) for this control instance. Store it---typically as a class field named **ControlContext**---because it is the only way to request repaints, create timers, or shift keyboard focus after **Initialize** returns.

A typical implementation calls **Context.GetSerializer().RuntimeUISrzDeserialize(Me, False)** to load the designer-set values. If that call returns **False**, no serialized data was found and the control should apply its own defaults instead.

### Destroy
{: .no_toc }

Called once when the control is being released.

Syntax: *object*.**Destroy** ( )

The implementation should drop any references it holds to objects that themselves hold references back to it, so that the reference graph can collapse without cycles.

### Paint
{: .no_toc }

Called every time the framework needs to redraw the control's client area.

Syntax: *object*.**Paint** ( *Canvas* )

*Canvas*
: *required* The [**Canvas**](Canvas) drawing surface for this paint pass. Its **RuntimeUICCGetWidth**, **RuntimeUICCGetHeight**, and **RuntimeUICCGetDpiScaleFactor** methods supply the size and DPI of the area being painted, in device pixels.

The implementation builds one or more `ElementDescriptor` records describing the regions to draw and passes each to *Canvas*.**RuntimeUICCCanvasAddElement**. A descriptor may include event callbacks (`OnClick`, `OnMouseDown`, and so on) as **AddressOf** pointers; the framework dispatches input back through those pointers without the control subscribing explicitly to anything.

A control should request additional repaints by calling [**CustomControlContext.Repaint**](CustomControlContext#repaint), not by calling **Paint** directly---the framework controls when to issue the actual paint pass.

### See Also

- [ICustomForm](ICustomForm) interface
- [CustomControlContext](CustomControlContext) class
- [Canvas](Canvas) class
- [SerializeInfo](SerializeInfo) class
