---
title: Alias
parent: Statements
permalink: /tB/Core/Alias
---
# Alias
{: .no_toc }

Declares an alternative name for an intrinsic type, user-defined [**Type**](Type), [**Interface**](Interface), or another **Alias**. The alias and the original type are interchangeable --- assigning between them is not a type mismatch. Comparable to `typedef` in C/C++.

> [!NOTE]
> The **Alias** statement is a twinBASIC extension. It has no equivalent in classic VBA, where the only use of the **Alias** keyword is to name a DLL entry point in a [**Declare**](Declare) statement.

Syntax:
> [ **Public** \| **Private** ] **Alias** *aliasname* **As** *type*

**Public**
: *optional* The alias is exported to the type library of an ActiveX DLL or control, so consumers in other projects see *aliasname* itself.

**Private**
: *optional* The alias is visible only within the project. Usages of a **Private** alias are replaced with the underlying *type* during compilation, so *aliasname* never appears in the project's type library.

*aliasname*
: The name of the alias. Must be a valid twinBASIC identifier.

*type*
: The original type. May be an intrinsic type, a user-defined [**Type**](Type), an [**Interface**](Interface), or another **Alias**.

**Alias** statements are valid only in `.twin` source files (not legacy `.bas` or `.cls` files), and must appear at file scope --- outside of [**Module**](Module) and [**Class**](Class) blocks, alongside [**Interface**](Interface) and [**CoClass**](CoClass) declarations.

### Example

Aliasing intrinsic types and a user-defined type:

```tb
Public Type POINT
    x As Long
    y As Long
End Type

Public Alias POINTAPI As POINT

Public Alias CBoolean As Byte

Public Alias KAFFINITY As LongPtr
```

A variable declared with the alias and a variable declared with the original type are interchangeable:

```tb
Dim p As POINT
Dim q As POINTAPI
p = q   ' OK — no type mismatch.
```

### See Also

- [**Type** statement](Type)
- [**Interface** statement](Interface)
- [**CoClass** statement](CoClass)
- [Alias Types](../../Features/Language/Alias-Types)
