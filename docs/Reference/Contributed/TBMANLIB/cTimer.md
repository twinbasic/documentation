---
title: cTimer
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cTimer
has_toc: false
---

# cTimer class
{: .no_toc }

A **cTimer** is a timer that raises its **Timer** event at a set interval. It is built on the Windows function **SetTimer**, with no window, and does not need a form. The code is by David Zimmer (2003), who allows its use in commercial and non-commercial programs. A **cTimer** can be used alone, as here, or as one of the numbered timers of a [**cTimers**](cTimers).

```tb check_build
Private WithEvents Tick As cTimer
Private Count As Long

Private Sub StartTicking()
    Set Tick = New cTimer
    Tick.Interval = 500
    Tick.Enabled = True
End Sub

Private Sub Tick_Timer()
    Count = Count + 1
    If Count = 3 Then Tick.Enabled = False
End Sub
```

The event is raised from the message loop of the program, so it is not raised while the program is busy in a long loop without **DoEvents**.

* TOC
{:toc}

## Properties

### Enabled
{: .no_toc }

A **Boolean**: whether the timer is running. It is **False** for a new object.

<!-- test: TimerTests.cTimer_Enabled_FollowsTheInterval, TimerTests.cTimer_Enabled_RaisesTheTimerEventAtTheInterval -->
Setting it to **True** starts the timer, or starts it again from zero when it is running. Setting it to **False** stops it. A start with [**Interval**](#interval) of 0 or less does nothing: **Enabled** stays **False**.
<!-- /test -->

```tb check_build check_run
Dim T As New cTimer

Debug.Print T.Interval & " " & T.Enabled
T.Interval = 0
T.Enabled = True
Debug.Print T.Enabled
T.Interval = 1000
T.Enabled = True
Debug.Print T.Enabled
T.Enabled = False
Debug.Print T.Enabled
' Output:
' 2000 False
' False
' True
' False
```

### Interval
{: .no_toc }

A **Long**, the time between two events in milliseconds. It is 2000 for a new object. It is an ordinary field: a new value does not reach a running timer until the timer is started again with [**Reset**](#reset), [**Enable**](#enable) or [**EnableTimer**](#enabletimer).

### Tag
{: .no_toc }

A **Variant** for the program's own use. The class does not read it.

## Methods

### Disable
{: .no_toc }

Stops the timer.

Syntax: *object*.**Disable**

The same as setting [**Enabled**](#enabled) to **False**.

### Enable
{: .no_toc }

<!-- test: TimerTests.cTimer_EnableTimer_Reset_Disable_StartAndStopTheTimer -->
Starts the timer, with the current [**Interval**](#interval). A running timer is stopped and started again.
<!-- /test -->

Syntax: *object*.**Enable**

### EnableTimer
{: .no_toc }

Sets the interval and starts the timer.

Syntax: *object*.**EnableTimer** ( *mInterval* )

*mInterval*
: *required* A **Long**, the new [**Interval**](#interval) in milliseconds.

### Reset
{: .no_toc }

Stops the timer and starts it again, so that the next event comes after one full interval.

Syntax: *object*.**Reset**

The timer runs after the call, also when it was not running before it.

## Events

### Timer
{: .no_toc }

Raised each time the interval has passed.

Syntax: **Event** *object*_**Timer** ( )

A handler is written for a variable declared with **WithEvents**. A timer that belongs to a [**cTimers**](cTimers) raises the **Timer** event of that object instead, with its number, and not its own.

## The registry of timers

The class keeps every running timer in a collection of the module **mTimer**, by the number that Windows gives the timer, and the callback that Windows calls, **mTimer.TimerProc**, finds the object there and raises its event. The module belongs to the package's internal code and has no page; a program does not call it.

<!-- test: TimerTests.cTimer_EnabledTimerReleased_IsDestroyed, TimerTests.cTimer_NeverEnabledTimerReleased_IsDestroyed -->
> [!NOTE] 1.0.0.29
> The collection holds a reference to each running timer. A **cTimer** that is enabled is therefore not destroyed when the program releases its last reference: it stays registered and goes on running until [**Enabled**](#enabled) is set to **False**. A timer that was never enabled is destroyed as usual, and the timer of a destroyed object is stopped.

## See Also

- [cTimers](cTimers) class -- a numbered group of these timers
- [cTimeuse](cTimeuse) class -- a stopwatch
- [TwinTimerLib](../TwinTimerLib/) package -- another timer class
- [TBMANLIB](.) package -- overview
