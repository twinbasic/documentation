---
title: AddinTimer
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/AddinTimer
has_toc: false
---

# AddinTimer class
{: .no_toc }

A simple periodic-callback helper. **AddinTimer** is the **only user-instantiable class** in the package — every other CoClass is handed to the addin by the IDE; this one the addin creates with `New`. Internally it wraps the Win32 `SetTimer` / `KillTimer` pair against `hwnd = 0` and fires its [**Timer**](#timer) event from the IDE's UI thread.

```tb
Private WithEvents Timer As AddinTimer

Private Sub Button1_OnClick()
    Set Timer = New AddinTimer
    Timer.Interval = 500          ' milliseconds
    Timer.Enabled  = True
End Sub

Private Sub Timer_Timer()
    ' fires every 500 ms on the IDE's UI thread
End Sub
```

Stop the timer by setting [**Enabled**](#enabled) = **False**, or simply by dropping the last reference — `Class_Terminate` cancels the underlying Win32 timer automatically. Both [**Enabled**](#enabled) and [**Interval**](#interval) are live: assigning to either re-arms the underlying Win32 timer using the new values, so changing the interval while the timer is running takes effect immediately.

Nothing in the package *requires* this helper — a direct `SetTimer` / `KillTimer` pair (or any other periodic mechanism) works just as well; sample 15's dwell-time pattern uses raw Win32 calls. Use **AddinTimer** when the convenience of an event-bound class is preferable to managing the Win32 plumbing yourself.

* TOC
{:toc}

## Properties

### Enabled
{: .no_toc }

Controls whether the underlying Win32 timer is running. **Boolean**, default **False**. Assigning to **Enabled** re-arms (or cancels) the timer immediately.

Syntax: *timer*.**Enabled** [ = *value* ]

### Interval
{: .no_toc }

The timer's period, in milliseconds. **Long**, default **0**. With **Interval = 0** the timer is effectively inert; set a positive value and [**Enabled**](#enabled) = **True** to start the periodic callback. Assigning to **Interval** re-arms the timer with the new value, so the next tick fires after the new interval rather than the old one.

Syntax: *timer*.**Interval** [ = *milliseconds* ]

## Events

### Timer
{: .no_toc }

Fires every [**Interval**](#interval) milliseconds while [**Enabled**](#enabled) is **True**. Runs on the IDE's UI thread.

Syntax: *timer*_**Timer**()

Long-running work inside the handler will block the UI thread until it returns — keep the handler short and offload heavy work to a background mechanism if needed.
