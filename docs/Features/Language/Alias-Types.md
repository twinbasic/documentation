---
title: Alias Types
parent: Language Syntax
nav_order: 0
permalink: /Features/Language/Alias-Types
---

## Defining Alias Types

An alias is an alternative name for a User-Defined Type, intrinsic type, or interface. This is similar to C/C++'s `typedef` statement. These can then be used in place of the original type and will be treated as if the original was used (would not be a type mismatch).

`[Public|Private] Alias AltName As OrigName`

### Example

With intrinsic types, or if you have a type such as:

```vb
Public Type POINT
    x As Long
    y As Long
End Type
```

You can create aliases:

```vb
Public Alias POINTAPI As POINT

Public Alias CBoolean As Byte

Public Alias KAFFINITY As LongPtr
```

Like interfaces and coclasses, these must be placed in a .twin file, outside of `Module` and `Class` blocks. You can create aliases of other aliases. The optional `Public` and `Private` modifiers determine whether the alias is exported to the Type Library of an ActiveX DLL or Control. A `Private` alias would result in usage of it being replaced with the original type.

## Enhancements to `Implements`

`Implements` in twinBASIC has several enhancements:

### Inherited Interfaces

`Implements` in twinBASIC is allowed on inherited interfaces -- for instance, if you have `Interface IFoo2 Extends IFoo`, you then use `Implements IFoo2` in a class, where in VBx this would not be allowed. You'll need to provide methods for all inherited interfaces (besides `IDispatch` and `IUnknown`). The class will mark all interfaces as available-- you don't need a separate statement for `IFoo`, it will be passed through `Set` statements (and their underlying `QueryInterface` calls) automatically.

### Multiple Implementations

If you have an interface that multiple others extend from, you can write multiple implementations, or specify one implementation for all. For example:

```vb
IOleWindow_GetWindow() As LongPtr _
    Implements IOleWindow.GetWindow, IShellBrowser.GetWindow, IShellView2.GetWindow
```

### 'As Any' Parameters in Interfaces

`Implements` is allowed on interfaces with 'As Any' parameters: In VBx, you'd get an error if you attempted to use any interface containing a member with an `As Any` argument. With twinBASIC, this is allowed if you substitute `As LongPtr` for `As Any`, for example:

```vb
Interface IFoo Extends IUnknown
    Sub Bar(ppv As Any)
End Interface

Class MyClass
    Implements IFoo

    Private Sub IFoo_Bar(ppv As LongPtr) Implements IFoo.Bar

    End Sub
```