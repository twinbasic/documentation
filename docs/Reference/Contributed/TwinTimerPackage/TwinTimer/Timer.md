---
title: Timer
parent: TwinTimer
permalink: /tB/Packages/Contributed/TwinTimerPackage/TwinTimer/Timer
has_toc: false
---
# Timer
{: .no_toc }

Occurs when the preset interval for a **TwinTimer** has elapsed.

Syntax: *object*\_**Timer**( **ByVal** *ElapsedTime* **As LongLong** )

*ElapsedTime*
: A **LongLong** giving the total number of milliseconds that have elapsed since the first event after the timer last started or restarted. That first event passes `0`.

## Remarks

The **Timer** event fires on every tick of the underlying Win32 timer (`SetTimer`), provided [**Enabled**](Enabled) is **True** and [**Interval**](Interval) is greater than zero.

*ElapsedTime* is a cumulative count, not the duration of the most recent interval. It begins at `0` on the first event after the timer starts, which comes one interval after the start, and increases monotonically. The counter restarts at `0` whenever [**Enabled**](Enabled) or [**Interval**](Interval) is set, because both properties destroy and recreate the underlying Win32 timer.

The argument is derived from the `dwTime` parameter of the Win32 timer callback (a **DWORD** tick count, wrapping at approximately 49.7 days). **TwinTimer** handles the 32-bit wrap-around internally and promotes the result to a **LongLong**, so *ElapsedTime* does not wrap during a session regardless of how long the timer has been running.

> [!NOTE]
> The event is delivered through the Win32 message pump of the thread that created the timer. If that thread's message pump is blocked when a tick is due, Windows delivers a single timer message when the pump resumes rather than one for each missed period. Long-running work inside the handler therefore lengthens the effective interval.

### Example

This example creates a **TwinTimer** that fires every 500 milliseconds and prints the cumulative elapsed time on each tick.

```tb
Private WithEvents tmr As TwinTimer

Private Sub Form_Load()
    Set tmr = New TwinTimer
    tmr.Interval = 500
    ' Enabled is True by default; the timer starts as soon as Interval > 0.
End Sub

Private Sub tmr_Timer(ByVal ElapsedTime As LongLong)
    Debug.Print "Elapsed: " & ElapsedTime & " ms"
End Sub
```

### See Also

- [Enabled](Enabled) property
- [Interval](Interval) property
