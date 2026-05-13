---
title: Framework
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/
has_toc: false
---

# Framework

The framework half of the [**CustomControls**](..) package — the interfaces, callback objects, and drawing primitives an *author* of a custom control writes against. The eight concrete `Waynes…` controls in the package are themselves built on this surface; the same pieces are available to user code that needs to implement an entirely new custom control.

A custom control:

1. Implements [**ICustomControl**](ICustomControl) (or [**ICustomForm**](ICustomForm) for a form-class custom control).
2. Stores the [**CustomControlContext**](CustomControlContext) handed to it on **Initialize** and uses it to request repaints, create timers, or change the focused element.
3. Inside **Paint**, builds one or more `ElementDescriptor` records and hands them to the [**Canvas**](Canvas) via **RuntimeUICCCanvasAddElement** — the framework rasterises them, handles input routing, and dispatches events back through the descriptor's `AddressOf`-registered callbacks.

```tb
Class MyControl
    Implements CustomControls.ICustomControl

    Private Context As CustomControls.CustomControlContext

    Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
            Implements CustomControls.ICustomControl.Initialize
        Set Me.Context = Ctx
    End Sub

    Private Sub OnDestroy() _
            Implements CustomControls.ICustomControl.Destroy
    End Sub

    Private Sub OnPaint(ByVal Canvas As CustomControls.Canvas) _
            Implements CustomControls.ICustomControl.Paint
        ' build ElementDescriptor records and call Canvas.RuntimeUICCCanvasAddElement
    End Sub
End Class
```

## Interfaces

- [ICustomControl](ICustomControl) -- the interface implemented by every concrete custom control: **Initialize**, **Destroy**, **Paint**
- [ICustomForm](ICustomForm) -- the analogous interface for custom form classes

## Callback objects

- [CustomControlContext](CustomControlContext) -- the callback object passed to **Initialize**; **GetSerializer**, **Repaint**, **CreateTimer**, **ChangeFocusedElement**
- [CustomFormContext](CustomFormContext) -- a **CustomControlContext** extended with **Show** and **Close**, passed to a custom form's **Initialize**
- [CustomControlTimer](CustomControlTimer) -- the timer returned by **CustomControlContext.CreateTimer**; **Interval**, **Enabled**, **OnTimer** event
- [CustomControlsCollection](CustomControlsCollection) -- the **Controls** collection on a [**WaynesForm**](../WaynesForm/) or any other custom form

## Drawing primitives

- [Canvas](Canvas) -- the drawing surface passed to **Paint**; **RuntimeUICCCanvasAddElement**, plus size and DPI accessors
- [SerializeInfo](SerializeInfo) -- the per-instance serializer reached via **CustomControlContext.GetSerializer**; **RuntimeUISrzDeserialize**, design-mode flags, owner handle, runtime mode
