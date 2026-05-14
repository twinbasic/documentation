---
title: Handles
parent: Statements
permalink: /tB/Core/Handles
---
# Handles
{: .no_toc }

A trailing clause on a procedure header that binds the procedure as an event handler for one or more specific events.

> [!NOTE]
> The **Handles** clause is a twinBASIC extension. Classic VBA connects event handlers solely by name: a `Sub` called `Form_Load` automatically handles the `Load` event of `Form`. twinBASIC still supports that pattern --- **Handles** decouples the procedure name from the events it handles and lets one body handle several events at once. Whether the IDE inserts the new syntax when auto-generating event prototypes is controlled by the "IDE: Use new handles/implements syntax" option.

Syntax:
> *procedure-header* **Handles** *object*.*event* [ **,** *object*.*event* ] …

*procedure-header*
: A complete [**Sub**](Sub), [**Function**](Function), or [**Property**](Property) header, including any access modifier, name, parameter list, and (for **Function** / **Property Get**) return type.

*object*
: An identifier naming an event source visible in the enclosing class, form, or user-control: the host's own implicit identifier (`Form`, `UserControl`, `MyClass`), a control declared on a form (`Command1`, `Text1`, …), or a [**WithEvents**](Dim) member variable.

*event*
: The name of an [**Event**](Event) declared on the type of *object*.

The procedure's parameter list must match the signatures of every event it handles. When several events are listed they must all share the same signature, so one body can service them interchangeably.

Because **Handles** decouples the procedure's name from the events it handles, the procedure can:

- have a descriptive name (`OnLoad`, `SyncOpacity`) instead of the compound `<Object>_<Event>` form;
- factor several related event handlers into a single body without duplicating code; and
- handle an event from a procedure whose name happens to collide with the implicit naming pattern.

The classic naming convention is unaffected: a procedure literally named `*object*_*event*` continues to be auto-wired as a handler for that event, with or without **Handles** clauses elsewhere on the same event.

### Example

A descriptively named handler for a form's `Load` event:

```tb
Private Sub OnLoad() Handles Form.Load
    Debug.Print "Form is loading."
End Sub
```

A single body responding to several property-change events at once (adapted from the standard `CheckMark` control):

```tb
Protected Sub SignificantChange() _
        Handles BackColor.OnPropertyLet, _
                BackStyle.OnPropertyLet, _
                Appearance.OnPropertyLet, _
                Value.OnPropertyLet
    Me.WindowlessRefresh()
End Sub
```

For comparison, the equivalent classic-VBA naming-convention form for one of those events:

```tb
Private Sub BackColor_OnPropertyLet()
    Me.WindowlessRefresh()
End Sub
```

--- a separate procedure body would be required per event.

### See Also

- [**Sub** statement](Sub)
- [**Function** statement](Function)
- [**Property** statement](Property)
- [**Event** statement](Event)
- [**Implements** statement](Implements)
- [Handler Method Syntax](../../Features/Language/Handlers)
