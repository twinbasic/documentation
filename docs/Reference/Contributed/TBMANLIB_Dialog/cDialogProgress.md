---
title: cDialogProgress
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogProgress
has_toc: false
---

# cDialogProgress class
{: .no_toc }

A **cDialogProgress** keeps the state of a long task: a position between a minimum and a maximum, the time spent and an estimate of the time left, a message, and whether the task was cancelled. It raises events when the position changes or the task is cancelled, and describes the state as a line of text.

**The class shows no window.** In version 1.1.0.0 it has no dialog, no progress bar and no cancel button, whatever its name, [**Title**](#title), [**ShowCancel**](#showcancel), [**Style**](#style) and [**OwnerHwnd**](#ownerhwnd) suggest. A program that wants to show the progress reads [**Percentage**](#percentage) or [**GetDescription**](#getdescription) and draws them itself, for instance on a form, and calls [**Cancel**](#cancel) from its own button. [**ShowProgress**](#showprogress) writes the description with **Debug.Print**, which appears in the debug console of the IDE and nowhere in a built program.

A **cDialogProgress** is made with **New**: `Dim progress As New cDialogProgress`. It cannot be made with **CreateObject**. To receive the events, declare a variable `WithEvents`.

[**Start**](#start) begins a task. [**Progress**](#progress), [**Increment**](#increment), [**PerformStep**](#performstep), [**SetPercentage**](#setpercentage) and [**Complete**](#complete) move the position, each raising [**ProgressChanged**](#progresschanged). [**Cancel**](#cancel) sets [**Cancelled**](#cancelled), which the task has to test: nothing stops a task by itself, and only [**SimulateProgress**](#simulateprogress) looks at the flag.

```tb check_build
Dim progress As New cDialogProgress
Dim i As Long

progress.Message = "Copying files"
progress.Max = 200
progress.Start

For i = 1 To 200
    If progress.Cancelled Then Exit For
    ' ... copy file i ...
    progress.Progress = i
Next i

If Not progress.Cancelled Then progress.Complete
Debug.Print progress.Percentage & "%"
```

<!-- test: CDialogProgressTests.GetRemainingTime_JustAfterStartDoesNotDivideByZero, CDialogProgressTests.GetRemainingTime_JustAfterStartRaisesError11, CDialogProgressTests.GetDescription_JustAfterStartDoesNotDivideByZero, CDialogProgressTests.SimulateProgress_WithADelayOfZeroDoesNotDivideByZero -->
> [!NOTE] 1.1.0.0
> [**GetRemainingTime**](#getremainingtime), and with it [**GetRemainingTimeString**](#getremainingtimestring) and [**GetDescription**](#getdescription), raise error 11 (*Division by zero*) when they are called before the clock has ticked after [**Start**](#start) (the clock of Windows ticks about every 16 milliseconds) and [**Progress**](#progress) is above [**Min**](#min). A program that reports progress as it begins reads the description too early. Call them later, or handle the error.

<!-- test: CDialogProgressTests.Percentage_OfAWideRangeDoesNotOverflow, CDialogProgressTests.SetPercentage_OnAWideRangeDoesNotOverflow, CDialogProgressTests.Percentage_UpTo21MillionUnitsWorks -->
> [!NOTE] 1.1.0.0
> [**Percentage**](#percentage) and [**SetPercentage**](#setpercentage) multiply in a **Long**, so a range wider than about 21 million units can raise error 6 (*Overflow*): [**Percentage**](#percentage) with **Max** 100,000,000 and a position of 50,000,000 does, and so does [**SetPercentage**](#setpercentage) with 50. Use a smaller range, such as the number of items instead of the number of bytes.

<!-- test: CDialogProgressTests.Defaults_AreThoseOfThePage, CDialogProgressTests.Enumeration_HasTheDocumentedValues, CDialogProgressTests.Progress_IgnoresAValueOutsideTheRange, CDialogProgressTests.MaxAndMin_DoNotMoveProgress, CDialogProgressTests.Percentage_IsTheShareOfTheRangeRoundedDown, CDialogProgressTests.Start_SetsProgressToMinAndClearsCancelled, CDialogProgressTests.Increment_AddsStepAndIgnoresAValueAboveMax, CDialogProgressTests.Increment_ANegativeStepCanGoBelowMin, CDialogProgressTests.PerformStep_IsTheSameAsIncrement, CDialogProgressTests.SetPercentage_MovesToAPercentageOfTheRange, CDialogProgressTests.Complete_MovesToMax, CDialogProgressTests.Cancel_SetsCancelledAndNothingStops, CDialogProgressTests.Reset_RestoresTheStartingValuesButNotTheOwner, CDialogProgressTests.GetDescription_ProgressBarAddsThePercentageAndTheTimes, CDialogProgressTests.GetDescription_MarqueeAndStepsGiveTheMessageAlone, CDialogProgressTests.TimeFunctions_BeforeStartGiveZero, CDialogProgressTests.GetElapsedTime_CountsWholeSecondsSinceStart, CDialogProgressTests.GetRemainingTime_EstimatesFromTheSpeedSoFar, CDialogProgressTests.Events_ProgressChangedIsRaisedForEachMove, CDialogProgressTests.Events_ProgressChangedIsRaisedAlsoForTheSameValue, CDialogProgressTests.Events_ResetAndStartRaiseNothing, CDialogProgressTests.Events_CancelRaisesCancelClickedEachTimeWithCancelledSet, CDialogProgressTests.Events_SetPercentageRaisesAnEventForAPercentageInsideTheRange, CDialogProgressTests.SimulateProgress_RunsFromMinToMaxAndCompletes, CDialogProgressTests.SimulateProgress_ACancelInTheHandlerStopsTheLoop -->
## Properties

### Cancelled
{: .no_toc }

Whether [**Cancel**](#cancel) was called, read-only.

Syntax: *object*.**Cancelled** **As Boolean**

**False** in a new object. [**Cancel**](#cancel) sets it to **True**; [**Start**](#start) and [**Reset**](#reset) set it to **False**.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.Cancelled    ' False
progress.Cancel
Debug.Print progress.Cancelled    ' True
progress.Start
Debug.Print progress.Cancelled    ' False
```

### DetailMessage
{: .no_toc }

A second line of text for [**GetDescription**](#getdescription).

Syntax: *object*.**DetailMessage** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

[**GetDescription**](#getdescription) adds it on a new line when it is not empty.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Style = ProgressStyle.Marquee
progress.Message = "Copying"
progress.DetailMessage = "report.txt"
Debug.Print Replace(progress.GetDescription(), vbCrLf, " | ")    ' Copying | report.txt
```

### Max
{: .no_toc }

The value of [**Progress**](#progress) at the end of the task.

Syntax: *object*.**Max** [ **=** *value* ]

*value*
: A **Long**. The default is 100.

Changing it does not move [**Progress**](#progress). A value that is not above [**Min**](#min) makes [**Percentage**](#percentage) 0.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.Max    ' 100
progress.Max = 250
Debug.Print progress.Max    ' 250
```

### Message
{: .no_toc }

The main text of [**GetDescription**](#getdescription).

Syntax: *object*.**Message** [ **=** *value* ]

*value*
: A **String**. The default is `Processing...`.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.Message    ' Processing...
```

### Min
{: .no_toc }

The value of [**Progress**](#progress) at the start of the task.

Syntax: *object*.**Min** [ **=** *value* ]

*value*
: A **Long**. The default is 0.

[**Start**](#start) sets [**Progress**](#progress) to it. Changing it does not move [**Progress**](#progress).

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Min = 10
progress.Max = 110
progress.Start
Debug.Print progress.Progress      ' 10
Debug.Print progress.Percentage    ' 0
```

### OwnerHwnd
{: .no_toc }

A property that has no effect.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

*value*
: A **LongPtr**. The default is 0.

The value is stored; there is no window to own. Unlike the other properties, [**Reset**](#reset) keeps it.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.OwnerHwnd = 1234
progress.Reset
Debug.Print progress.OwnerHwnd    ' 1234
```

### Percentage
{: .no_toc }

The position as a percentage of the range, read-only.

Syntax: *object*.**Percentage** **As Long**

(**Progress** - **Min**) * 100 \ (**Max** - **Min**), rounded down; 0 when **Max** is not above **Min**. A position below **Min**, which [**Increment**](#increment) can reach with a negative [**Step**](#step), gives a negative number. See the second note [above](#cdialogprogress-class) for a range that is too wide.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Progress = 40
Debug.Print progress.Percentage    ' 40
progress.Max = 200
Debug.Print progress.Percentage    ' 20
progress.Max = 0
Debug.Print progress.Percentage    ' 0
```

### Progress
{: .no_toc }

The position of the task.

Syntax: *object*.**Progress** [ **=** *value* ]

*value*
: A **Long** from [**Min**](#min) to [**Max**](#max).

A value outside the range is ignored, without an error or an event. Any other value, even the current one, is stored and raises [**ProgressChanged**](#progresschanged). The default is 0.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Progress = 40
Debug.Print progress.Progress    ' 40
progress.Progress = 150          ' above Max: ignored
Debug.Print progress.Progress    ' 40
progress.Progress = -1           ' below Min: ignored
Debug.Print progress.Progress    ' 40
```

### ShowCancel
{: .no_toc }

Whether [**ShowProgress**](#showprogress) adds a line on cancelling.

Syntax: *object*.**ShowCancel** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

With **True**, [**ShowProgress**](#showprogress) ends its text with `(Press Ctrl+Break to cancel)`. The class does not react to that key; a task is cancelled by a call to [**Cancel**](#cancel).

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.ShowCancel    ' True
```

### ShowElapsedTime
{: .no_toc }

Whether [**GetDescription**](#getdescription) names the time spent.

Syntax: *object*.**ShowElapsedTime** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.ShowElapsedTime    ' True
```

### ShowRemainingTime
{: .no_toc }

Whether [**GetDescription**](#getdescription) names the estimated time left.

Syntax: *object*.**ShowRemainingTime** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.ShowRemainingTime    ' True
```

### Step
{: .no_toc }

The amount by which [**Increment**](#increment) moves [**Progress**](#progress).

Syntax: *object*.**Step** [ **=** *value* ]

*value*
: A **Long**. The default is 1.

[**SimulateProgress**](#simulateprogress) uses it as the step of its loop.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Step = 25
progress.Increment
progress.Increment
Debug.Print progress.Progress    ' 50
```

### Style
{: .no_toc }

The kind of progress that [**GetDescription**](#getdescription) describes.

Syntax: *object*.**Style** [ **=** *value* ]

*value*
: A [**ProgressStyle**](#progressstyle) member. The default is **ProgressBar**.

With **ProgressBar**, [**GetDescription**](#getdescription) adds the percentage and the times. With **Marquee** or **Steps** it returns the message alone, with the detail line.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.Style = ProgressStyle.ProgressBar    ' True
progress.Style = ProgressStyle.Steps
Debug.Print progress.Style                                ' 2
```

### Title
{: .no_toc }

A property that has no effect.

Syntax: *object*.**Title** [ **=** *value* ]

*value*
: A **String**. The default is `Progress`.

The value is stored. The class shows no title bar and does not use it in its text.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.Title    ' Progress
```

## Methods

### Cancel
{: .no_toc }

Marks the task as cancelled.

Syntax: *object*.**Cancel**

Sets [**Cancelled**](#cancelled) to **True** and raises [**CancelClicked**](#cancelclicked). It stops nothing: the task has to test [**Cancelled**](#cancelled). Cancelling a task that was already cancelled raises the event again.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Cancel
Debug.Print progress.Cancelled    ' True
```

### Complete
{: .no_toc }

Moves the position to the end.

Syntax: *object*.**Complete**

Sets [**Progress**](#progress) to [**Max**](#max) and raises [**ProgressChanged**](#progresschanged) with that value, also when [**Progress**](#progress) was already there.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Max = 80
progress.Complete
Debug.Print progress.Progress      ' 80
Debug.Print progress.Percentage    ' 100
```

### GetDescription
{: .no_toc }

Returns the state as a line of text.

Syntax: *object*.**GetDescription** ( ) **As String**

Returns [**Message**](#message). With [**Style**](#style) **ProgressBar** it adds ` (N%)` with [**Percentage**](#percentage); then ` - Elapsed: ` and [**GetElapsedTimeString**](#getelapsedtimestring) when [**ShowElapsedTime**](#showelapsedtime) is **True**, and ` - Remaining: ` and [**GetRemainingTimeString**](#getremainingtimestring) when [**ShowRemainingTime**](#showremainingtime) is **True** and [**Progress**](#progress) is above [**Min**](#min). A non-empty [**DetailMessage**](#detailmessage) follows after **vbCrLf**. See the first note [above](#cdialogprogress-class) for the error that the remaining time can raise.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Message = "Copying"
progress.DetailMessage = "report.txt"
progress.Progress = 50
Debug.Print Replace(progress.GetDescription(), vbCrLf, " | ")
' Copying (50%) - Elapsed: 0:00 - Remaining: 0:00 | report.txt

progress.ShowElapsedTime = False
progress.ShowRemainingTime = False
Debug.Print Replace(progress.GetDescription(), vbCrLf, " | ")
' Copying (50%) | report.txt
```

### GetElapsedTime
{: .no_toc }

Returns the whole seconds since [**Start**](#start).

Syntax: *object*.**GetElapsedTime** ( ) **As Long**

0 before the first [**Start**](#start). The count is made from the clock of Windows, which wraps around to negative numbers after 24.8 days of uptime; while it is negative at [**Start**](#start), the time functions return 0.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.GetElapsedTime()    ' 0
```

### GetElapsedTimeString
{: .no_toc }

Returns the time since [**Start**](#start) as text.

Syntax: *object*.**GetElapsedTimeString** ( ) **As String**

`m:ss`, or `h:mm:ss` from one hour on, such as `0:02` and `1:05:09`.

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.GetElapsedTimeString()    ' 0:00
```

### GetRemainingTime
{: .no_toc }

Estimates the whole seconds that are left.

Syntax: *object*.**GetRemainingTime** ( ) **As Long**

Takes the speed so far, (**Progress** - **Min**) per millisecond since [**Start**](#start), and returns the time that the rest of the range needs at that speed. Returns 0 before [**Start**](#start) and while [**Progress**](#progress) is not above [**Min**](#min). It raises error 11 when no time has passed since [**Start**](#start); see the first note [above](#cdialogprogress-class).

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.GetRemainingTime()    ' 0
```

### GetRemainingTimeString
{: .no_toc }

Returns [**GetRemainingTime**](#getremainingtime) as text.

Syntax: *object*.**GetRemainingTimeString** ( ) **As String**

In the form of [**GetElapsedTimeString**](#getelapsedtimestring).

```tb check_build check_run
Dim progress As New cDialogProgress

Debug.Print progress.GetRemainingTimeString()    ' 0:00
```

### Increment
{: .no_toc }

Moves [**Progress**](#progress) by [**Step**](#step).

Syntax: *object*.**Increment**

Adds [**Step**](#step) to [**Progress**](#progress) and raises [**ProgressChanged**](#progresschanged). When the new value is above [**Max**](#max), nothing happens: no change and no event. The new value is not compared with [**Min**](#min), so a negative [**Step**](#step) can lead below it.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Step = 40
progress.Increment
progress.Increment
progress.Increment    ' 120 is above Max: ignored
Debug.Print progress.Progress    ' 80
```

### PerformStep
{: .no_toc }

The same as [**Increment**](#increment).

Syntax: *object*.**PerformStep**

```tb check_build check_run
Dim progress As New cDialogProgress

progress.PerformStep
Debug.Print progress.Progress    ' 1
```

### Reset
{: .no_toc }

Restores the starting values.

Syntax: *object*.**Reset**

Sets [**Title**](#title) to `Progress`, [**Message**](#message) to `Processing...`, [**DetailMessage**](#detailmessage) to an empty string, [**Progress**](#progress) and [**Min**](#min) to 0, [**Max**](#max) to 100, [**Step**](#step) to 1, [**Style**](#style) to **ProgressBar**, the three **Show** properties to **True**, [**Cancelled**](#cancelled) to **False**, and forgets [**Start**](#start). It raises no event and leaves [**OwnerHwnd**](#ownerhwnd) as it is.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Max = 500
progress.Message = "Importing"
progress.Reset
Debug.Print progress.Max        ' 100
Debug.Print progress.Message    ' Processing...
```

### SetPercentage
{: .no_toc }

Moves [**Progress**](#progress) to a percentage of the range.

Syntax: *object*.**SetPercentage** ( *percent* )

*percent*
: *required* A **Long** from 0 to 100. Another value is ignored, without an error or an event.

Sets [**Progress**](#progress) to **Min** + (**Max** - **Min**) * *percent* \ 100, rounded down, and raises [**ProgressChanged**](#progresschanged). See the second note [above](#cdialogprogress-class) for a range that is too wide.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Min = 10
progress.Max = 110
progress.SetPercentage 25
Debug.Print progress.Progress      ' 35
progress.SetPercentage 101         ' ignored
Debug.Print progress.Progress      ' 35
progress.SetPercentage 100
Debug.Print progress.Progress      ' 110
```

### ShowProgress
{: .no_toc }

Writes the description with **Debug.Print**.

Syntax: *object*.**ShowProgress**

Prints [**GetDescription**](#getdescription), and when [**ShowCancel**](#showcancel) is **True** a blank line and `(Press Ctrl+Break to cancel)`. It opens no window, and a built program shows nothing. It raises the error of [**GetDescription**](#getdescription) when that does.

```tb check_build
Dim progress As New cDialogProgress

progress.Message = "Working"
progress.Progress = 30
progress.ShowProgress
```

### SimulateProgress
{: .no_toc }

Runs the task from the minimum to the maximum with a pause after every step, to try a program that reacts to the events.

Syntax: *object*.**SimulateProgress** ( [ *delayMs* ] )

*delayMs*
: *optional* A **Long**, the pause after every step in milliseconds. The default is 100.

Calls [**Start**](#start), then for *i* from [**Min**](#min) to [**Max**](#max) in steps of [**Step**](#step): stops when [**Cancelled**](#cancelled) is **True**, sets [**Progress**](#progress) to *i* (raising [**ProgressChanged**](#progresschanged)), calls [**ShowProgress**](#showprogress) and waits *delayMs*. Unless the task was cancelled it ends with [**Complete**](#complete), so the last position is reported twice. The thread waits and does not process messages, so a handler of [**ProgressChanged**](#progresschanged) is the place to call [**Cancel**](#cancel). A [**Step**](#step) of 0 never ends unless the task is cancelled, and a negative one skips the loop, so that only [**Complete**](#complete) runs.

With a *delayMs* of 0 or 1 the call raises error 11 (*Division by zero*) at its second step, from the estimate of the remaining time; see the first note [above](#cdialogprogress-class). The default of 100 does not.

```tb check_build
Dim progress As New cDialogProgress

progress.Max = 5
progress.SimulateProgress 50
Debug.Print "Done at " & progress.Percentage & "%"
```

### Start
{: .no_toc }

Begins a task.

Syntax: *object*.**Start**

Sets [**Progress**](#progress) to [**Min**](#min), [**Cancelled**](#cancelled) to **False** and notes the time for [**GetElapsedTime**](#getelapsedtime) and [**GetRemainingTime**](#getremainingtime). It raises no event, and does not change [**Message**](#message) and the other texts.

```tb check_build check_run
Dim progress As New cDialogProgress

progress.Progress = 60
progress.Start
Debug.Print progress.Progress    ' 0
```

## Events

### CancelClicked
{: .no_toc }

Raised by [**Cancel**](#cancel).

Syntax: **Event** *object*.**CancelClicked** ( )

The handler runs before [**Cancel**](#cancel) returns, and [**Cancelled**](#cancelled) is already **True**.

### ProgressChanged
{: .no_toc }

Raised when the position is set.

Syntax: **Event** *object*.**ProgressChanged** ( *value* )

*value*
: The new position, a **Long**.

Raised by [**Progress**](#progress) for a value inside the range, [**Increment**](#increment) and [**PerformStep**](#performstep) when they move, [**SetPercentage**](#setpercentage) for a percentage inside 0 to 100, and [**Complete**](#complete); also when the value is the same as before. [**Start**](#start) and [**Reset**](#reset) raise nothing. The handler runs before the call returns.

A class that receives the events declares the variable with **WithEvents**:

```tb check_build projname=dlg-progress slot=file
Class ProgressLog
    Private WithEvents mProgress As cDialogProgress

    Public Sub Attach(ByVal source As cDialogProgress)
        Set mProgress = source
    End Sub

    Private Sub mProgress_ProgressChanged(ByVal value As Long)
        Debug.Print "changed to " & value
    End Sub

    Private Sub mProgress_CancelClicked()
        Debug.Print "cancelled"
    End Sub
End Class
```

This example counts the events of a short task. A value outside the range raises none, **Complete** raises one, and [**CancelClicked**](#cancelclicked) follows from **Cancel**:

```tb check_run projname=dlg-progress
Dim progress As New cDialogProgress
Dim log As New ProgressLog

log.Attach progress
progress.Max = 3
progress.Start
progress.Increment
progress.Increment
progress.Progress = 9    ' outside the range: no event
progress.Complete
progress.Cancel
' Output:
' changed to 1
' changed to 2
' changed to 3
' cancelled
```

## Enumerations

### ProgressStyle
{: .no_toc }

The kinds of progress for [**Style**](#style). Only [**GetDescription**](#getdescription) reads it.

| Member | Value | Meaning |
|---|---|---|
| **ProgressBar** | 0 | A position in a range: the description has the percentage and the times |
| **Marquee** | 1 | A task of unknown length: the message alone |
| **Steps** | 2 | A task in steps: the message alone |

## Example

This example reports the progress of a task as text every 25 per cent, and stops when the task is cancelled by a call from elsewhere in the program.

```tb check_build
Dim progress As New cDialogProgress
Dim item As Long

progress.Message = "Processing items"
progress.Max = 100
progress.Step = 5
progress.Start

For item = 1 To 20
    If progress.Cancelled Then Exit For
    ' ... process item ...
    progress.PerformStep
    If progress.Percentage Mod 25 = 0 Then Debug.Print progress.Percentage & "% done"
Next item

If progress.Cancelled Then
    Debug.Print "Stopped at " & progress.Percentage & "%"
Else
    progress.Complete
    Debug.Print "Finished"
End If
```

<!-- /test -->

## See Also

- [cDialogCountdownMsgBox](cDialogCountdownMsgBox) class -- shows a message box that closes by itself
- [cDialogInputBox](cDialogInputBox) class -- asks for one line of text
- [TBMANLIB_Dialog](.) package -- overview

```
