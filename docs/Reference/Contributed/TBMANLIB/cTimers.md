---
title: cTimers
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cTimers
has_toc: false
---

# cTimers class
{: .no_toc }

A **cTimers** is a numbered group of [**cTimer**](cTimer) objects that share one event. Each timer has its own interval and is switched on and off on its own, but all of them raise the single **Timer** event of the group, with the number of the timer. The code is by David Zimmer (2003).

```tb check_build check_run
Dim Group As New cTimers

Debug.Print Group.Add() & " " & Group.Add() & " " & Group.Count
Group(2).Interval = 250
Debug.Print Group(2).Interval & " " & Group(1).Interval
Group.BulkLoad 3
Debug.Print Group.Count
' Output:
' 1 2 2
' 250 2000
' 6
```

* TOC
{:toc}

## Properties

### Count
{: .no_toc }

An **Integer**, the number of timers in the group.

### Item
{: .no_toc }

Returns one timer.

Syntax: *object*.**Item** ( *Index* ) **As cTimer**

*Index*
: *required* An **Integer**, from 1 to [**Count**](#count).

<!-- test: TimerTests.cTimers_ItemAndBulkLoad_RaiseTheirErrors -->
It is the default member, so `Group(2)` is `Group.Item(2)`. A number above **Count** raises error -2147221504 (`vbObjectError`), with the text *Index does not Exist*, and 0 or a negative number raises error 9.
<!-- /test -->

## Methods

### Add
{: .no_toc }

Adds a timer to the group.

Syntax: *object*.**Add** ( ) **As Integer**

<!-- test: TimerTests.cTimers_Add_Count_Item_BulkLoad -->
Returns the number of the new timer, counted from 1. The timer is off, with an [**Interval**](cTimer#interval) of 2000; start it with `Group(n).Enabled = True`.
<!-- /test -->

### BulkLoad
{: .no_toc }

Adds several timers at once.

Syntax: *object*.**BulkLoad** ( *num* ) **As Variant**

*num*
: *required* An **Integer** from 1 to 199.

Adds *num* + 1 timers, not *num*: a call with 3 adds 4. Any other value raises error -2147221504 with the text *No more than 200 times allowed per class* (the text means *timers*). The function returns nothing useful.

## Events

### Timer
{: .no_toc }

<!-- test: TimerTests.cTimers_Timer_IsRaisedByTheGroupWithTheNumberOfTheTimer -->
Raised when the interval of one of the enabled timers has passed.
<!-- /test -->

Syntax: **Event** *object*_**Timer** ( *Index* )

*Index*
: An **Integer**, the number of the timer that is raising the event.

A handler is written for a variable declared with **WithEvents**. The timers of the group do not raise their own **Timer** events.

```tb check_build
Private WithEvents Group As cTimers

Private Sub StartTimers()
    Set Group = New cTimers
    Group.BulkLoad 2
    Group(1).Interval = 500
    Group(1).Enabled = True
    Group(2).Interval = 1500
    Group(2).Enabled = True
End Sub

Private Sub Group_Timer(ByVal Index As Integer)
    Debug.Print "timer " & Index
End Sub
```

<!-- test: TimerTests.cTimers_GroupReleased_IsDestroyed, TimerTests.cTimers_EnabledTimerOfAReleasedGroup_IsDestroyed -->
> [!NOTE] 1.0.0.29
> A **cTimers** registers itself in a collection of the package's internal module **mTimer**, which keeps a reference to it. The group is therefore not destroyed when the program releases its last reference, and its enabled timers go on running. Set [**Enabled**](cTimer#enabled) of each timer to **False** first.

## See Also

- [cTimer](cTimer) class -- one timer
- [cTimeuse](cTimeuse) class -- a stopwatch
- [TBMANLIB](.) package -- overview
