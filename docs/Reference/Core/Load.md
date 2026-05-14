---
title: Load
parent: Statements
permalink: /tB/Core/Load
vba_attribution: true
---
# Load
{: .no_toc }

Loads an object --- typically a form --- into memory but does not show it.

Syntax:
> **Load** *object*

*object*
: An object expression that evaluates to a loadable object (commonly a form or a control array element).

When an object is loaded, it is placed in memory but is not visible. Use the **Show** method to make it visible. Until an object is visible, the user can't interact with it; the object can be manipulated programmatically inside its **Initialize** event handler.

Use [**Unload**](Unload) to remove the object from memory once it is no longer needed.

### Example

In the following example, `UserForm2` is loaded during `UserForm1`'s **Initialize** event. Subsequent clicking on `UserForm2` reveals `UserForm1`.

```tb
' This is the Initialize event procedure for UserForm1.
Private Sub UserForm_Initialize()
    Load UserForm2
    UserForm2.Show
End Sub

' This is the Click event of UserForm2.
Private Sub UserForm_Click()
    UserForm2.Hide
End Sub

' This is the Click event for UserForm1.
Private Sub UserForm_Click()
    UserForm2.Show
End Sub
```

### See Also

- [**Unload** statement](Unload)
