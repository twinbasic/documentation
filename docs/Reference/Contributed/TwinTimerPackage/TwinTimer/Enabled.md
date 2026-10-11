---
title: Enabled
parent: TwinTimer
permalink: /tB/Packages/Contributed/TwinTimerPackage/TwinTimer/Enabled
has_toc: false
---
# Enabled
{: .no_toc }

Returns or sets a value that determines whether the timer responds to elapsed-interval events.

## Get

Returns a **Boolean** indicating whether the timer is active.

Syntax: *object*.**Enabled**

*object*
: *required* An object expression that evaluates to a **TwinTimer** object.

The property returns **True** if the timer is enabled, **False** if it is disabled. The default value is **True**.

## Let

Enables or disables the timer.

Syntax: *object*.**Enabled** **=** *value*

*value*
: A **Long** that turns the timer on or off; the property is read as a **Boolean**. Zero (**False**) turns it off; any other value, such as **True**, turns it on.

Setting **Enabled** destroys any running timer and restarts it under the new setting. When **Enabled** is set to **True**, the timer begins firing only if [**Interval**](Interval) is greater than zero. When **Enabled** is set to **False**, no **Timer** events are raised regardless of the **Interval** setting.

### Remarks

**Enabled** is the default member of **TwinTimer**.

Changing **Enabled** at run time takes effect immediately: the underlying Win32 timer (`SetTimer` / `KillTimer`) is stopped and conditionally restarted on every assignment.

### Example

This example creates a **TwinTimer** that fires every 500 milliseconds, then disables it after the first event.

```tb
Private WithEvents tmr As TwinTimer

Private Sub Form_Load()
    Set tmr = New TwinTimer
    tmr.Interval = 500
    ' Enabled is True by default; the timer starts as soon as Interval > 0.
End Sub

Private Sub tmr_Timer(ByVal ElapsedTime As LongLong)
    Debug.Print "Elapsed: " & ElapsedTime & " ms"
    tmr.Enabled = False   ' Stop after the first tick.
End Sub
```

### See Also

- [Interval](Interval) property
- [Timer](Timer) event
