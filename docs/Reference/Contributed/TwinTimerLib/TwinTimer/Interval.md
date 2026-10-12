---
title: Interval
parent: TwinTimer
permalink: /tB/Packages/Contributed/TwinTimerLib/TwinTimer/Interval
has_toc: false
---
# Interval
{: .no_toc }

Returns or sets the number of milliseconds between successive **Timer** events.

## Get

Returns a **Long** giving the current interval in milliseconds.

Syntax: *object*.**Interval**

*object*
: *required* An object expression that evaluates to a **TwinTimer** object.

The default value is `0`. A value of `0` means the timer is not running regardless of the [**Enabled**](Enabled) setting.

## Let

Sets the interval in milliseconds between **Timer** events.

Syntax: *object*.**Interval** **=** *milliseconds*

*milliseconds*
: A non-negative **Long**. Setting **Interval** to `0` stops the timer without changing **Enabled**. Setting **Interval** to a positive value restarts the underlying Win32 timer with the new period and resets the elapsed-time counter, provided [**Enabled**](Enabled) is **True**. A negative value raises run-time error 380 (Invalid property value).

### Remarks

Changing **Interval** at run time takes effect immediately: the underlying Win32 timer (`SetTimer` / `KillTimer`) is stopped and conditionally restarted on every assignment. The timer starts only when both **Interval** is greater than `0` and [**Enabled**](Enabled) is **True**.

> [!NOTE]
> The Win32 `SetTimer` function raises an interval below 10 ms to 10 ms, and delivers its timer messages at the resolution of the system clock, typically 15--16 ms on standard Windows configurations. A short interval therefore does not give sub-15 ms accuracy.

### Example

This example creates a **TwinTimer** that fires every second and prints the elapsed time.

```tb check_build
Private WithEvents tmr As TwinTimer

Private Sub Form_Load()
    Set tmr = New TwinTimer
    tmr.Interval = 1000   ' fire every 1000 milliseconds (one second)
End Sub

Private Sub tmr_Timer(ByVal ElapsedTime As LongLong)
    Debug.Print "Elapsed: " & ElapsedTime & " ms"
End Sub
```

### See Also

- [Enabled](Enabled) property
- [Timer](Timer) event
