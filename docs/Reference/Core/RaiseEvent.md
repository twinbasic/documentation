---
title: RaiseEvent
parent: Statements
permalink: /tB/Core/RaiseEvent
vba_attribution: true
---
# RaiseEvent
{: .no_toc }

Fires an event declared at the module level within a class, form, or document.

Syntax:
> **RaiseEvent** *eventname* [ **(** *argumentlist* **)** ]

*eventname*
: Name of the event to fire. Must be the name of an [**Event**](Event) declared in the same module.

*argumentlist*
: *optional*  Comma-delimited list of variables, arrays, or expressions to pass as event arguments. The *argumentlist* must be enclosed by parentheses. If the event has no arguments, the parentheses must be omitted.

If the event has not been declared within the module in which it is raised, an error occurs. If the event has no arguments, including empty parentheses in the **RaiseEvent** invocation causes an error.

You can't use **RaiseEvent** to fire events that are not explicitly declared in the module. For example, if a form has a built-in **Click** event, you can't fire its **Click** event by using **RaiseEvent**. If you declare a **Click** event in the form module, it shadows the form's own **Click** event.

Event firing is done in the order that connections were established. Because events can have **ByRef** parameters, a process that connects late may receive parameters that have been changed by an earlier event handler.

### Example

The following fragment declares an event at the module level of a class module and raises it from a procedure:

```tb
' In a class module:
Public Event LogonCompleted(UserName As String)

Sub Demo()
    RaiseEvent LogonCompleted("AntoineJan")
End Sub
```

A more complete example showing event source/sink wiring. The class that raises an event is the event source, and the classes that handle the event are the sinks. An event source can have multiple sinks; when the source raises the event, every sink receives it.

The source class declares two events and raises them from a worker procedure:

```tb
Class TimerState
    Public Event UpdateElapsedTime(ByVal elapsedTime As Double)
    Public Event DisplayFinalTime()
    Private Const delta As Double = 0.01

    Public Sub TimerTask(ByVal duration As Double)
        Dim startTime As Double, timeElapsedSoFar As Double
        startTime = Timer
        timeElapsedSoFar = startTime

        Do While Timer < startTime + duration
            If Timer - timeElapsedSoFar >= delta Then
                timeElapsedSoFar = timeElapsedSoFar + delta
                RaiseEvent UpdateElapsedTime(Timer - startTime)
                DoEvents
            End If
        Loop

        RaiseEvent DisplayFinalTime
    End Sub
End Class
```

A sink subscribes by using a `WithEvents` field and supplying handler procedures named `<field>_<EventName>`:

```tb
Class Form1
    Private WithEvents ts As TimerState

    Private Sub UserForm_Initialize()
        Set ts = New TimerState
    End Sub

    Private Sub Command1_Click()
        ts.TimerTask 9.58
    End Sub

    Private Sub ts_UpdateElapsedTime(ByVal elapsedTime As Double)
        Text2.Text = Format(elapsedTime, "0.00")
    End Sub

    Private Sub ts_DisplayFinalTime()
        Text1.Text = "Until Now"
        Text2.Text = "9.58"
    End Sub
End Class
```

### See Also

- [**Event** statement](Event)
- [**Class** statement](Class)
- [**Implements** statement](Implements)
