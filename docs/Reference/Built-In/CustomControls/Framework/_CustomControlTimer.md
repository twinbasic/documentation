---
title: _CustomControlTimer
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/_CustomControlTimer
has_toc: false
---

# _CustomControlTimer interface
{: .no_toc }

The underlying COM interface for [**CustomControlTimer**](CustomControlTimer), defining the **Interval** and **Enabled** properties that control the timer's rate and running state.

User code works with [**CustomControlTimer**](CustomControlTimer) directly; this interface page documents the property contract that the CoClass exposes.

## Properties

### Interval
{: .no_toc }

The number of milliseconds between successive [**OnTimer**](CustomControlTimer#ontimer) events. Read/write **Long**.

Syntax: *object*.**Interval** [ **=** *value* ]

*value*
: A **Long** specifying the number of milliseconds between timer firings. A value of `0` prevents the timer from firing.

Changing **Interval** while the timer is running takes effect on the next tick --- the current tick completes at the old interval before the new one begins.

### Enabled
{: .no_toc }

Whether the timer is currently running. Read/write **Boolean**. Setting to **True** starts it; setting to **False** stops it.

Syntax: *object*.**Enabled** [ **=** *value* ]

## See Also

- [CustomControlTimer](CustomControlTimer) class
- [CustomControlContext](CustomControlContext) class -- the callback object whose **CreateTimer** returns a **CustomControlTimer**
- [_CustomControlTimerEvents](_CustomControlTimerEvents) interface -- the event source interface with the **OnTimer** callback
