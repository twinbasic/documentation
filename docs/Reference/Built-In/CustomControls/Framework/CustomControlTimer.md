---
title: CustomControlTimer
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/CustomControlTimer
has_toc: false
---

# CustomControlTimer class
{: .no_toc }

A timer created by [**CustomControlContext.CreateTimer**](CustomControlContext#createtimer) and owned by the control that created it. The timer raises [**OnTimer**](#ontimer) at the rate given by [**Interval**](#interval), once it has been started by setting [**Enabled**](#enabled) to **True**.

The framework returns timers typed as **stdole.IUnknown**; cast to **CustomControlTimer** with `CType(Of CustomControlTimer)(…)` before storing. Declare the field with **WithEvents** so that the **OnTimer** event can be handled.

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
    ' raised every 250 ms
End Sub
```

[**WaynesTimer**](../WaynesTimer) wraps a single **CustomControlTimer** and re-exposes its **Interval** and **Enabled** as designer-visible properties. [**WaynesSlider**](../WaynesSlider/) uses one internally for mouse-down auto-repeat.

## Properties

### Enabled
{: .no_toc }

Whether the timer is currently running. Read/write **Boolean**. Setting to **True** starts it; setting to **False** stops it.

Syntax: *object*.**Enabled** [ **=** *value* ]

*value*
: A **Boolean** specifying the running state. **True** starts the timer; **False** stops it.

### Interval
{: .no_toc }

The number of milliseconds between successive [**OnTimer**](#ontimer) events. Read/write **Long**. A value of `0` prevents the timer from firing.

Syntax: *object*.**Interval** [ **=** *value* ]

*value*
: A **Long** specifying the number of milliseconds between timer firings.

Changing **Interval** while the timer is running takes effect on the next tick --- the current tick completes at the old interval before the new one begins.

## Events

### OnTimer
{: .no_toc }

Raised every [**Interval**](#interval) milliseconds while the timer is enabled.

Syntax: *object*\_**OnTimer**( )

## See Also

- [CustomControlContext](CustomControlContext) class -- the callback object whose **CreateTimer** returns a **CustomControlTimer**
- [ICustomControl](ICustomControl) interface
