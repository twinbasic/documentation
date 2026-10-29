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

<!-- bug: nothing-argument-crashes -->
> [!WARNING] BETA 1010
> A *Value* of **Nothing**, or an object that is not a control, ends the program with an access violation: **Nothing** and a **Collection** in a 32-bit and a 64-bit build, a **Scripting.Dictionary** in a 64-bit build.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [424 (`&H1A8`)](tb:Errors#424), *Object required* | *Value* is **Null** |

<!-- /errors -->

### Example

This example reads the topmost container of a control and reports its type.

```tb check_build
' Inside a VB control class
Dim host As Object
host = GetInheritedOwner(Me)
If Not host Is Nothing Then
    Debug.Print "Container: " & TypeName(host)
End If
```

### See Also

- [vbaCastObj](vbaCastObj) function

