---
title: WithEvents
parent: Statements
permalink: /tB/Core/WithEvents
---
# WithEvents
{: .no_toc }

A modifier on a module-level variable declaration that makes the object it holds a source of events for the declaring module.

Syntax: **Dim** | **Private** | **Public** | **Protected** **WithEvents** *varname* **As** *type*

*varname*
: The field name. It also forms the first half of each handler's name --- a handler is called *varname*`_`*EventName*, unless a [**Handles**](Handles) clause names the event instead.

*type*
: A class that declares one or more [**Event**](Event) members. A generic **Object** will not do: the compiler has to see the event list at compile time to bind the handlers.

**WithEvents** is the receiving half of the event mechanism. [**Event**](Event) declares an event, [**RaiseEvent**](RaiseEvent) fires it, and a **WithEvents** field is what connects a sink to a source so the handlers run.

## Where it is allowed

**Only in a class module**, at module level. That includes a form or a user control, since each one designed in the IDE becomes its own class. A standard module cannot declare a **WithEvents** field, and neither can a procedure.

Three further restrictions come from the declaration itself:

- **It cannot be combined with [**New**](New).** `Private WithEvents x As New Thing` does not compile. Declare the field, then assign it --- typically in [**Form_Load**](../Packages/VB/Form/#load) or a constructor.
- **It cannot be an array.** One field holds one source.
- **The type must be a class, named at compile time.** A late-bound **Object** or **Variant** carries no event list to bind against.

Assigning a new object to the field rebinds the handlers to it; assigning **Nothing** disconnects them.

## Example

This form receives two events from a worker class. The field is declared at module level, constructed in **Form_Load**, and its handlers are named after it.

```tb
' In Form1's code-behind:
Private WithEvents mRunner As JobRunner

Private Sub Form_Load()
    Set mRunner = New JobRunner
End Sub

Private Sub cmdStart_Click()
    mRunner.Run 50
End Sub

Private Sub mRunner_Progress(ByVal Percent As Long)
    lblStatus.Caption = Percent & "%"
End Sub

Private Sub mRunner_Finished(ByVal ItemsProcessed As Long)
    lblStatus.Caption = "Done: " & ItemsProcessed
End Sub
```

The class supplying those events declares them with **Event** and fires them with **RaiseEvent**:

```tb
Class JobRunner
    Public Event Progress(ByVal Percent As Long)
    Public Event Finished(ByVal ItemsProcessed As Long)

    Public Sub Run(ByVal Count As Long)
        Dim i As Long
        For i = 1 To Count
            RaiseEvent Progress(i * 100 \ Count)
        Next
        RaiseEvent Finished(Count)
    End Sub
End Class
```

> [!NOTE]
> twinBASIC adds [**Handles**](Handles), which decouples the handler's name from the event. The field must still be declared **WithEvents** --- **Handles** changes only how the procedure is bound to it:
>
> ```tb
> Private Sub OnJobDone(ByVal ItemsProcessed As Long) Handles mRunner.Finished
>     lblStatus.Caption = "Done: " & ItemsProcessed
> End Sub
> ```

## See Also

- [Event](Event) statement -- declares an event on a class
- [RaiseEvent](RaiseEvent) statement -- fires a declared event
- [Handles](Handles) clause -- binds a handler without relying on its name
- [Dim](Dim) statement -- where the **WithEvents** modifier may appear
- [Private](Private) statement -- the usual visibility for a **WithEvents** field
- [Class](Class) statement -- the only kind of module that may declare one
