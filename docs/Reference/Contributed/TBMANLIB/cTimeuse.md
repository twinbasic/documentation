---
title: cTimeuse
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cTimeuse
has_toc: false
---

# cTimeuse class
{: .no_toc }

A **cTimeuse** is a stopwatch. [**Start**](#start) records the time, and [**Show**](#show) returns a message with the number of milliseconds since then. The class is declared as `cTimeuse`, with a lower-case *u*; twinBASIC does not distinguish the case of names. The package keeps one ready-made instance, named [**TBMAN.TimerUse**](TBMAN#timeruse).

```tb check_build check_run
Dim Watch As New cTimeuse
Watch.Start

' ... the work to be timed ...

Debug.Print Watch.Show("took {*} ms") Like "took * ms"
' Output:
' True
```

The clock is the Windows function **GetTickCount**, the time since the computer started, in milliseconds. Its resolution is that of the system timer, which is 10 to 16 milliseconds, so a part of a program that takes less than that can show as 0. The value is held in a **Long**, which holds a little under 25 days of milliseconds as a positive number: a computer that has been running longer than that gives negative tick counts, and the difference of two counts across the change can overflow.

## Methods

### Show
{: .no_toc }

Returns a message with the time since [**Start**](#start).

Syntax: *object*.**Show** ( [ *Txt* ] ) **As Variant**

*Txt*
: *optional* A **String**, the message. Every `{*}` in it is replaced by the number of milliseconds. The default is a Chinese message: the words for *time used*, a colon, `{*}` and the word for *milliseconds*.

Returns a **String** in a **Variant**. The number is the tick count at the call less the tick count at **Start**. If **Start** has not been called, the number is the tick count itself: the milliseconds since the computer started.

### Start
{: .no_toc }

Records the time at which the measurement starts.

Syntax: *object*.**Start**

Stores the current tick count. Calling **Start** again starts a new measurement.

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.TimerUse**
- [cLogs](cLogs) class -- writes log lines
- [TwinTimerLib](../TwinTimerLib/) package -- a Win32 timer class that reports the elapsed time
- [Timer](../../../Modules/DateTime/Timer) function -- the seconds since midnight
- [TBMANLIB](.) package -- overview
