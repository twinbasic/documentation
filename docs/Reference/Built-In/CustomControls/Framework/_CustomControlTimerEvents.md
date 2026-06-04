---
title: _CustomControlTimerEvents
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/_CustomControlTimerEvents
has_toc: false
---

# _CustomControlTimerEvents interface
{: .no_toc }

The event source interface of [**CustomControlTimer**](CustomControlTimer), declaring the single [**OnTimer**](#ontimer) callback that fires on each tick.

This interface is the **\[Default, Source\]** interface of the **CustomControlTimer** CoClass. A field declared with `WithEvents` receives the **OnTimer** event through this interface automatically; there is no need to reference `_CustomControlTimerEvents` by name in application code.

```tb
Private WithEvents InternalTimer As CustomControlTimer

Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    Set Me.InternalTimer = CType(Of CustomControlTimer)(Ctx.CreateTimer())
    Me.InternalTimer.Interval = 100
    Me.InternalTimer.Enabled = True
End Sub

Private Sub OnTimer() Handles InternalTimer.OnTimer
    ' called every 100 ms while the timer is enabled
End Sub
```

## Events

### OnTimer
{: .no_toc }

Raised every [**Interval**](CustomControlTimer#interval) milliseconds while the timer's [**Enabled**](CustomControlTimer#enabled) property is **True**.

Syntax: *object*\_**OnTimer**( )

## See Also

- [CustomControlTimer](CustomControlTimer) -- the timer class whose ticks fire **OnTimer**; exposes **Interval** and **Enabled**
- [CustomControlContext](CustomControlContext) -- supplies **CreateTimer**, the factory method that returns a **CustomControlTimer**
