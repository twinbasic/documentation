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

The framework returns timers typed as **stdole.IUnknown**; cast to **CustomControlTimer** with `CType(Of CustomControlTimer)(…)` before storing. The control should also declare the field with `WithEvents` so that the **OnTimer** event can be handled.

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
    ' fire every 250ms
End Sub
```

[**WaynesTimer**](../WaynesTimer) wraps a single **CustomControlTimer** and re-exposes its **Interval** / **Enabled** as designer-visible properties. [**WaynesSlider**](../WaynesSlider/) uses one as an internal mouse-down auto-repeat timer.

## Properties

### Enabled
{: .no_toc }

Whether the timer is currently running. Setting to **True** starts it; setting to **False** stops it. **Boolean**.

Syntax: *object*.**Enabled** [ = *value* ]

### Interval
{: .no_toc }

The number of milliseconds between successive [**OnTimer**](#ontimer) events. **Long**. A timer with an interval of 0 never fires.

Syntax: *object*.**Interval** [ = *value* ]

Changing **Interval** while the timer is enabled takes effect on the next tick.

## Events

### OnTimer
{: .no_toc }

Raised every [**Interval**](#interval) milliseconds while the timer is enabled.

Syntax: *object*\_**OnTimer**( )
