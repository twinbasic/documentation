---
title: GetInheritedOwner
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetInheritedOwner
---
# GetInheritedOwner
{: .no_toc }

Returns the inherited owner object of a control.

Syntax: **GetInheritedOwner(** *Value* **)** **As Object**

*Value*
: *required* **Object**. The control whose inherited owner is wanted.

For controls that participate in a control-container hierarchy, the inherited owner is the topmost owning object that supplies ambient settings --- typically the form. Returns **Nothing** when no inherited owner is set.

### Example

This example reads the topmost container of a control and reports its type.

```tb
' Inside a VB control class
Dim host As Object
host = GetInheritedOwner(Me)
If Not host Is Nothing Then
    Debug.Print "Container: " & TypeName(host)
End If
```

### See Also

- [vbaCastObj](vbaCastObj) function

