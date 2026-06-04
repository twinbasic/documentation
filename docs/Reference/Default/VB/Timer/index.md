---
title: Timer
parent: VB Package
permalink: /tB/Packages/VB/Timer/
has_toc: false
---

# Timer class
{: .no_toc }

A **Timer** is a non-visual Win32 control that raises a [**Timer**](#timer) event at a programmable interval. Drop one onto a [**Form**](../Form/) (or **UserControl**) at design time, set [**Interval**](#interval) to the desired millisecond period, set [**Enabled**](#enabled) to **True**, and handle the [**Timer**](#timer) event. Timers are invisible at run time --- they appear only as icons in the designer.

The default property is [**Enabled**](#enabled) and the default event is [**Timer**](#timer).

```tb
Private Sub Form_Load()
    Timer1.Interval = 1000      ' fire once per second
    Timer1.Enabled  = True
End Sub

Private Sub Timer1_Timer()
    lblClock.Caption = Format$(Now, "hh:mm:ss")
End Sub
```

* TOC
{:toc}

## Starting and stopping

Two properties between them decide whether the [**Timer**](#timer) event fires:

- [**Enabled**](#enabled) is the master switch. While it is **False**, the timer is dormant regardless of [**Interval**](#interval).
- [**Interval**](#interval) is the period between events, in milliseconds. Setting it to `0` stops events from firing even while [**Enabled**](#enabled) remains **True**.

Either property can be flipped from inside the [**Timer**](#timer) handler itself --- a one-shot timer disables itself on the first tick:

```tb
Private Sub tmrStartup_Timer()
    tmrStartup.Enabled = False      ' fire only once
    LoadInitialData
End Sub
```

Assigning a negative value to [**Interval**](#interval) raises run-time error 380 (*Invalid property value*).

## Accuracy and resolution

The control wraps Win32's per-window timer queue, which runs on the standard message pump. Two consequences follow:

- **Resolution is coarse.** The OS quantises timer ticks to the system clock-tick period --- typically ~15.6 ms on desktop Windows. Intervals shorter than that are silently rounded up. For sub-millisecond pacing use a multimedia timer or `QueryPerformanceCounter` directly.
- **Ticks can be skipped under load.** If the message pump is blocked when a tick is due, no events queue up --- the runtime delivers a single [**Timer**](#timer) event when the pump resumes, *not* one for each missed period. Long-running work inside the handler therefore lengthens the next interval rather than producing a backlog.

For periodic UI updates (a clock, a progress animation, a poll for external state) the **Timer** is exactly the right tool. For precise wall-clock pacing, audio scheduling, or anything that must keep up under heavy CPU load, it is not.

## Control arrays

A control array of timers lets one handler service several periodic tasks while keeping a single shared code path. The array is declared at design time on the first item; further items are added at run time with **Load** and removed with **Unload**, exactly as for a windowed control. Inside the shared [**Timer**](#timer) handler, [**Index**](#index) identifies which timer fired.

```tb
Private Sub tmrPoll_Timer(Index As Integer)
    Select Case Index
        Case 0: RefreshStatus
        Case 1: PollPrinterQueue
        Case 2: TrimLogFile
    End Select
End Sub
```

[**Index**](#index) raises run-time error 343 (*Object not an array*) when read on a timer that is not part of a control array.

## Properties

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a timer. Always **vbTimer**.

### Enabled
{: .no_toc }

The master switch for the timer. While **False**, the timer is dormant and the [**Timer**](#timer) event does not fire regardless of [**Interval**](#interval). **Boolean**, default **True**. **Default property.**

Syntax: *object*.**Enabled** [ = *boolean* ]

### Index
{: .no_toc }

When the timer is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time. Raises run-time error 343 (*Object not an array*) on a timer that is not part of an array.

### Interval
{: .no_toc }

The period between [**Timer**](#timer) events, in milliseconds. **Long**, default `0`.

Syntax: *object*.**Interval** [ = *value* ]

*value*
: A non-negative **Long** giving the interval in milliseconds. Setting `0` stops events from firing. Negative values raise run-time error 380 (*Invalid property value*).

The effective resolution is the OS clock-tick period (~15.6 ms on desktop Windows); shorter intervals are silently rounded up. See [Accuracy and resolution](#accuracy-and-resolution).

### Left
{: .no_toc }

The horizontal position of the timer icon in the designer, in the container's **ScaleMode** units. **Single**. The runtime value has no visual effect --- the timer is invisible --- but it is preserved so the designer can place the icon back where it was.

### Name
{: .no_toc }

The unique design-time name of the timer on its parent form. **String**, read-only at run time.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that contains this timer. Read-only.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the timer. Ignored by the framework. Inherited from the base control class. Useful for control arrays --- e.g. holding the name of the operation a poll-timer is responsible for.

### Top
{: .no_toc }

The vertical position of the timer icon in the designer. Counterpart to [**Left**](#left); like [**Left**](#left), it has no visual effect at run time.

## Events

### Timer
{: .no_toc }

Raised every [**Interval**](#interval) milliseconds while [**Enabled**](#enabled) is **True** and [**Interval**](#interval) is greater than zero. **Default event.**

Syntax: *object*\_**Timer**( )

For a timer that is part of a control array, the handler receives the array [**Index**](#index) of the timer that fired:

Syntax: *object*\_**Timer**( *Index* **As Integer** )

The event is delivered through the normal Win32 message pump --- see [Accuracy and resolution](#accuracy-and-resolution) for the implications.
