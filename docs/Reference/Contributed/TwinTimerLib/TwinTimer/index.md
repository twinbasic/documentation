---
title: TwinTimer
parent: TwinTimerLib Package
permalink: /tB/Packages/Contributed/TwinTimerLib/TwinTimer/
has_toc: false
---

# TwinTimer class
{: .no_toc }

A timer class that fires a **Timer** event at a repeating interval and reports the total elapsed time in milliseconds since the first event.

**TwinTimer** uses the Win32 `SetTimer` / `KillTimer` API directly and is not tied to any form or control. It can be instantiated in any module---standard modules, class modules, and form code alike---and the **Timer** event is raised on the thread that created the timer, through that thread's Windows message pump, so no cross-thread marshalling is needed.

The elapsed-time counter passed to the **Timer** event is a monotonically increasing **LongLong** expressed in milliseconds. The implementation handles the 49.7-day rollover of the tick count that Windows supplies with each timer message (the same clock as `GetTickCount`), so the counter continues to increase correctly over long-running sessions.

```tb check_build
Private WithEvents Timer1 As TwinTimer

Private Sub Form_Load()
    Set Timer1 = New TwinTimer
    Timer1.Interval = 1000   ' fire every second
End Sub

Private Sub Timer1_Timer(ByVal ElapsedTime As LongLong)
    Label1.Caption = "Elapsed: " & ElapsedTime & " ms"
End Sub
```

* TOC
{:toc}

## Properties

### Enabled
{: .no_toc }

<!-- test: PropertyTests.Enabled_DefaultsToTrue, PropertyTests.Enabled_False_RaisesNoEvents, PropertyTests.Enabled_FalseThenTrue_RestartsTimer, PropertyTests.Enabled_True_WithZeroInterval_DoesNotStart, PropertyTests.NewTimer_ZeroInterval_RaisesNoEvents, ElapsedTimeTests.Enabled_Set_RestartsElapsedTime -->
Whether the timer fires **Timer** events. **Boolean**. Default: **True**.

Setting **Enabled** to **False** stops the Win32 timer and suppresses **Timer** events. Setting it back to **True** restarts the timer; the elapsed-time counter resets on the next tick.

Setting **Enabled** to **True** while **Interval** is `0` does not start the timer---the timer cannot run with a zero interval.

Syntax: *object*.**Enabled** [ = *value* ]

*value*
: A **Boolean**. **False** suppresses events; **True** allows them.

A new **TwinTimer** has **Enabled** set to **True** and **Interval** set to `0`, so it does not fire until **Interval** is set to a positive value.
<!-- /test -->

### Interval
{: .no_toc }

The number of milliseconds between successive **Timer** events. **Long**. Default: `0`.

<!-- test: PropertyTests.Interval_DefaultsToZero, PropertyTests.Interval_RoundTrip, PropertyTests.Interval_SetPositive_StartsTimer, PropertyTests.Interval_Zero_KeepsEnabled, PropertyTests.Interval_Negative_Raises380, ElapsedTimeTests.Interval_Set_RestartsElapsedTime, PropertyTests.Interval_SetWhileDisabled_DoesNotStart -->
Setting **Interval** to a positive value restarts the underlying Win32 timer with the new period and resets the elapsed-time counter, provided **Enabled** is **True**. Setting it to `0` stops the timer without changing **Enabled**.

Syntax: *object*.**Interval** [ = *milliseconds* ]

*milliseconds*
: A non-negative **Long**. A value of `0` stops the timer. A negative value raises run-time error 380 (Invalid property value).
<!-- /test -->

<!-- test: DeliveryTests.Timer_ShortInterval_RaisedToTenMilliseconds -->
> [!NOTE] timeless
> The Win32 `SetTimer` function raises an interval below 10 ms to 10 ms, and delivers its timer messages at the resolution of the system clock, typically 15--16 ms on standard Windows configurations. A short interval therefore does not give sub-15 ms accuracy.

## Events

### Timer
{: .no_toc }

Raised each time the interval elapses.

Syntax: *object*\_**Timer** ( *ElapsedTime* **As LongLong** )

<!-- test: ElapsedTimeTests.Timer_FirstEvent_PassesZero, ElapsedTimeTests.Timer_ElapsedTime_IsCumulative, ElapsedTimeTests.Timer_ElapsedTime_IsNotTheLastInterval, ElapsedTimeTests.Timer_TwoTimers_KeepSeparateElapsedTimes -->
*ElapsedTime*
: A **LongLong** giving the total number of milliseconds since the first tick. On the very first tick after the timer starts (or restarts), *ElapsedTime* is `0`. On each subsequent tick it reflects the cumulative milliseconds measured since that first tick.
<!-- /test -->

The value is derived from the `dwTime` parameter supplied with `WM_TIMER` (the number of milliseconds since the system started, as `GetTickCount` returns it). The class accounts for the 49.7-day `GetTickCount` rollover so *ElapsedTime* continues to increase correctly without wrapping.

```tb check_build
Private Sub Timer1_Timer(ByVal ElapsedTime As LongLong)
    ' ElapsedTime is 0 on the first tick, then increases by ~Interval each tick.
    Debug.Print "Tick at " & ElapsedTime & " ms"
End Sub
```

## Example

This example creates a countdown that stops itself 10 seconds after the first tick.

```tb check_build
Private WithEvents Countdown As TwinTimer

Private Sub Form_Load()
    Set Countdown = New TwinTimer
    Countdown.Interval = 500   ' check every 500 ms
End Sub

Private Sub Countdown_Timer(ByVal ElapsedTime As LongLong)
    Dim SecondsLeft As Long
    SecondsLeft = 10 - CLng(ElapsedTime \ 1000)
    If SecondsLeft <= 0 Then
        Countdown.Enabled = False
        Label1.Caption = "Done."
    Else
        Label1.Caption = "Stopping in " & SecondsLeft & " second(s)..."
    End If
End Sub
```

## See Also

- [TwinTimerLib](../) package -- overview and installation
