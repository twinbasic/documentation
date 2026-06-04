---
title: CustomControlContext
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/CustomControlContext
has_toc: false
---

# CustomControlContext class
{: .no_toc }

The callback object passed to a custom control's [**Initialize**](ICustomControl#initialize). Holds the connection back into the framework --- used to deserialize designer-set property values, request repaints, create timers, and move the keyboard focus between elements the control has drawn.

Custom controls store the **CustomControlContext** in a private field (typically called **ControlContext**) so that they can call back into the framework at any point after **Initialize** has returned. The form-class counterpart [**CustomFormContext**](CustomFormContext) extends this with **Show** and **Close**.

```tb
Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    ' Load any serialized property values
    If Not Ctx.GetSerializer.RuntimeUISrzDeserialize(Me, False) Then
        InitializeDefaultValues
    End If

    ' Remember the context for later
    Set Me.ControlContext = Ctx
End Sub
```

## Methods

### ChangeFocusedElement
{: .no_toc }

Asks the framework to move the keyboard focus to a particular `ElementTabIndex` value, as if the user had pressed **TAB** until reaching that point. Used by [**WaynesGrid**](../WaynesGrid/) when a cell is selected programmatically --- the grid changes its **SelectedCellX** / **SelectedCellY** and then calls this method so that the form-level focus tracking matches.

Syntax: *object*.**ChangeFocusedElement** *ElementTabIndex*

*ElementTabIndex*
: *required* A **Long** matching the **ElementTabIndex** of an element that was added to the canvas in the most recent paint pass.

### CreateTimer
{: .no_toc }

Returns a new [**CustomControlTimer**](CustomControlTimer) bound to this control's lifetime. The timer is disabled on creation; the caller sets [**Interval**](CustomControlTimer#interval), subscribes to the timer's [**OnTimer**](CustomControlTimer#ontimer) event, and sets [**Enabled**](CustomControlTimer#enabled) to **True** to start it.

Syntax: *object*.**CreateTimer** ( ) **As stdole.IUnknown**

The timer is returned as **stdole.IUnknown**. Cast to [**CustomControlTimer**](CustomControlTimer) with `CType(Of CustomControlTimer)(…)` before accessing its members. Declare the holding field with **WithEvents** so that the **OnTimer** event can be handled.

```tb
Private WithEvents InternalTimer As CustomControlTimer

Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    Set Me.ControlContext = Ctx
    Set Me.InternalTimer = CType(Of CustomControlTimer)(Ctx.CreateTimer())
    Me.InternalTimer.Interval = 250
    Me.InternalTimer.Enabled = True
End Sub

Private Sub OnTimer() Handles InternalTimer.OnTimer
    ' called every 250 ms
End Sub
```

### GetSerializer
{: .no_toc }

Returns the [**SerializeInfo**](SerializeInfo) handle for this control instance. The serializer exposes the deserialization entry point and the run-time/design-time mode flags.

Syntax: *object*.**GetSerializer** ( ) **As SerializeInfo**

Call **GetSerializer** at the start of a control's [**Initialize**](ICustomControl#initialize) implementation to load any property values that were set in the form designer, and to read the mode flags before storing the context for later use.

```tb
Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    With Ctx.GetSerializer
        If Not .RuntimeUISrzDeserialize(Me, False) Then
            InitializeDefaultValues
        End If

        Me.IsDesignMode = .RuntimeUISrzIsDesignMode()
    End With

    Set Me.ControlContext = Ctx
End Sub
```

### Repaint
{: .no_toc }

Tells the framework that the control's appearance has changed and that the canvas should be repainted at the next opportunity.

Syntax: *object*.**Repaint** ( )

The framework schedules one paint pass regardless of how many times **Repaint** is called before it runs --- multiple calls in quick succession produce at most one call to [**ICustomControl.Paint**](ICustomControl#paint). This means it is safe to call **Repaint** from multiple **OnChanged** handlers that fire together when several style properties are set in sequence.

When writing a new custom control, call **Repaint** whenever the control's internal state changes in a way that affects what the next **Paint** call should draw. Every concrete `Waynes...` control hooks the **OnChanged** events raised by its style sub-objects and calls **Repaint** from each handler, so a runtime property assignment triggers an automatic redraw without the caller needing to call **Repaint** directly.

```tb
' In a custom control class:
Private m_Context As CustomControls.CustomControlContext
Private m_Caption As String

Public Property Let Caption(ByVal Value As String)
    m_Caption = Value
    m_Context.Repaint   ' schedule a repaint to show the new caption
End Property
```

## See Also

- [_CustomControlContext](_CustomControlContext) interface -- the COM interface definition this CoClass implements
- [CustomFormContext](CustomFormContext) class -- extends **CustomControlContext** with **Show** and **Close** for form-class controls
- [ICustomControl](ICustomControl) interface -- the interface a custom control implements; receives the context on **Initialize**
- [SerializeInfo](SerializeInfo) type (UDT) -- the per-instance serializer returned by **GetSerializer**
- [CustomControlTimer](CustomControlTimer) class -- the timer object returned by **CreateTimer**
