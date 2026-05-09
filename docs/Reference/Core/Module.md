---
title: Module
parent: Statements
permalink: /tB/Core/Module
---
# Module
{: .no_toc }

Defines a module — a non-instantiable container for procedures, constants, types, enums, and module-level variables. A module's members are accessed through the module name (or, for **Public** members in a non-private module, directly).

> [!NOTE]
> The explicit **Module** ... **End Module** block is a twinBASIC extension. Classic VBA distinguishes "standard modules" from "class modules" purely by file type (`.bas` vs. `.cls`); the source has no enclosing keyword. In `.twin` files twinBASIC requires (and supports) the explicit block, which lets you put a class and a module in the same file and apply attributes to the module as a whole.

Syntax:
> [ *attributes* ]  
> [ **Public** \| **Private** ] **Module** *name*  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *modulemember* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; ...  
> **End Module**

*attributes*
: *optional*  One or more attributes applicable to a module.

**Public**
: *optional*  In an ActiveX project, marks the module as exported into the type library so that consumers in other projects can see its **Public** members.

**Private**
: *optional*  In an ActiveX project, withholds the module from the type library: its members remain usable within the project, but are not exported. Equivalent to placing [**Option Private Module**](Option) at the top of a classic standard module.

*name*
: The identifier naming the module.

*modulemember*
: *optional*  Any of the following:

  - constants defined using [**Const**](Const)
  - module-level variables defined using [**Public**](Public), [**Private**](Private), or [**Dim**](Dim) (modules don't take part in inheritance, so [**Protected**](Protected) is not allowed)
  - procedures defined using [**Sub**](Sub), [**Function**](Function), or [**Property**](Property)
  - user-defined types defined using [**Type**](Type) or [**Enum**](Enum)
  - external procedure declarations using [**Declare**](Declare)

Modules cannot be instantiated and have no `New` constructor. Their **Public** members behave as project-wide globals (subject to the **Public**/**Private** module modifier above).

### Example

```tb
Public Module StringHelpers
    Public Function Reverse(ByVal s As String) As String
        Dim i As Long, r As String
        For i = Len(s) To 1 Step -1
            r = r & Mid$(s, i, 1)
        Next i
        Reverse = r
    End Function

    Public Function StartsWith(ByVal s As String, ByVal prefix As String) As Boolean
        StartsWith = (Left$(s, Len(prefix)) = prefix)
    End Function
End Module
```

Callers reach the members either through the module name or directly:

```tb
Debug.Print StringHelpers.Reverse("hello")  ' "olleh"
Debug.Print StartsWith("hello world", "hi") ' False
```

### See Also

- [**Class** statement](Class)
- [**Public** statement](Public)
- [**Private** statement](Private)
- [**Option** statement](Option)
- [Class and Module Enhancements](../../Features/Advanced/Classes-and-Modules)
