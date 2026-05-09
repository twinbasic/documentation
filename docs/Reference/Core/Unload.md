---
title: Unload
parent: Statements
permalink: /tB/Core/Unload
---
# Unload
{: .no_toc }

Removes an object — typically a form — from memory.

Syntax:
> **Unload** *object*

*object*
: An object expression that evaluates to an unloadable object (commonly a form or a control array element).

When an object is unloaded, it is removed from memory and all memory associated with the object is reclaimed. Until it is placed in memory again with the [**Load**](Load) statement, the user can't interact with the object, and the object can't be manipulated programmatically.

### Example

The following example assumes two `UserForm`s in a program. In `UserForm1`'s **Initialize** event, `UserForm2` is loaded and shown. When the user clicks `UserForm2`, it is unloaded and `UserForm1` appears. When `UserForm1` is clicked, it is unloaded in turn.

```tb
' This is the Initialize event procedure for UserForm1.
Private Sub UserForm_Initialize()
    Load UserForm2
    UserForm2.Show
End Sub

' This is the Click event for UserForm2.
Private Sub UserForm_Click()
    Unload UserForm2
End Sub

' This is the Click event for UserForm1.
Private Sub UserForm_Click()
    Unload UserForm1
End Sub
```

### See Also

- [**Load** statement](Load)

{% include VBA-Attribution.md %}
