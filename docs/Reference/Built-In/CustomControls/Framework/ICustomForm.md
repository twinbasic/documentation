---
title: ICustomForm
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/ICustomForm
has_toc: false
---

# ICustomForm interface
{: .no_toc }

The form-class counterpart to [**ICustomControl**](ICustomControl). Custom *form* classes --- top-level windows that host other custom controls --- implement this interface instead. The shape is identical to **ICustomControl** except that the **Initialize** callback receives a [**CustomFormContext**](CustomFormContext) (which extends [**CustomControlContext**](CustomControlContext) with **Show** and **Close**) rather than a plain **CustomControlContext**.

[**WaynesForm**](../WaynesForm/), the package's only concrete form class, does in fact implement [**ICustomControl**](ICustomControl) and cast its context to **CustomFormContext** internally --- the **ICustomForm** interface is published for parity with **ICustomControl** but is not currently consumed by any class shipped with the package.

## Methods

### Destroy
{: .no_toc }

Called once when the form is being released. The implementation should drop any references it holds to objects that themselves hold references back to it, so that the reference graph can collapse without cycles.

Syntax: *object*.**Destroy** ( )

The framework calls **Destroy** exactly once per instance, after the form has been closed and is no longer visible. No further calls to **Initialize** or **Paint** will arrive after **Destroy** returns. The implementation should set any stored [**CustomFormContext**](CustomFormContext) or [**CustomControlTimer**](CustomControlTimer) references to **Nothing** here.

### Initialize
{: .no_toc }

Called once after the framework has constructed the form and deserialized any designer-set property values into it.

Syntax: *object*.**Initialize** ( *Context* )

*Context*
: *required* The [**CustomFormContext**](CustomFormContext) for this form instance. Store it (typically as a class field) --- it is the only way to request repaints, show or close the form, create timers, or check the runtime mode after **Initialize** returns.

A common implementation calls **Context.GetSerializer().RuntimeUISrzDeserialize(Me, False)** to load designer-set property values into the instance; if the call returns **False**, no serialized data was found and the form should apply its own defaults.

### Paint
{: .no_toc }

Called every time the framework needs to redraw the form's client area. The implementation builds one or more `ElementDescriptor` records describing the rectangles to draw and passes each to *Canvas*.**RuntimeUICCCanvasAddElement**.

Syntax: *object*.**Paint** ( *Canvas* )

*Canvas*
: *required* The [**Canvas**](Canvas) drawing surface for this paint pass. Its **RuntimeUICCGetWidth**, **RuntimeUICCGetHeight**, and **RuntimeUICCGetDpiScaleFactor** methods supply the size and DPI of the area being painted, in device pixels.

A form implementation typically fills the form's background by adding one `ElementDescriptor` covering the full canvas area, then adds further descriptors for any content drawn directly on the form surface. Controls hosted in the form are painted separately by the framework --- the **Paint** implementation covers only the form's own background and direct decorations.

A form should request additional repaints by calling [**CustomFormContext.Repaint**](CustomControlContext#repaint) (inherited from [**CustomControlContext**](CustomControlContext#repaint)), not by calling **Paint** directly --- the framework controls when to issue the actual paint pass.

### Example

This example shows a minimal **ICustomForm** implementation whose **Paint** method fills the form with a solid background colour.

```tb
Class MyForm
    Implements CustomControls.ICustomForm

    Private m_Context As CustomControls.CustomFormContext

    Private Sub OnInitialize(ByVal Context As CustomControls.CustomFormContext) _
            Implements CustomControls.ICustomForm.Initialize
        Set m_Context = Context
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomForm.Destroy
        Set m_Context = Nothing
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
            Implements CustomControls.ICustomForm.Paint
        Dim descriptor As ElementDescriptor
        With descriptor
            .Left = 0
            .Top = 0
            .Width = Canvas.RuntimeUICCGetWidth()
            .Height = Canvas.RuntimeUICCGetHeight()
            Set .BackgroundFill = Me.BackgroundFill
        End With
        Canvas.RuntimeUICCCanvasAddElement(descriptor)
    End Sub
End Class
```

### See Also

- [ICustomControl](ICustomControl) -- the parallel interface for non-form custom controls
- [ICustomControl.Paint](ICustomControl#paint) -- the equivalent method on the control interface
- [Canvas](Canvas) -- the drawing surface passed to **Paint**
- [CustomFormContext](CustomFormContext) -- the callback object available after **Initialize**
