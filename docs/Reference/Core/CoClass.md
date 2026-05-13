---
title: CoClass
parent: Statements
permalink: /tB/Core/CoClass
---
# CoClass
{: .no_toc }

Defines a creatable COM class as a contract: a public name and identity, paired with one or more [**Interface**](Interface) blocks that the class will expose. The actual implementation lives in a separate [**Class**](Class) (typically `Private`) that uses [**Implements**](Implements).

> [!NOTE]
> The **CoClass** block is a twinBASIC extension. In classic VBA, coclasses could only be defined indirectly via a referenced type library (IDL/C++).

Syntax:
> [ *attributes* ]  
> [ **Public** \| **Private** ] **CoClass** *name*  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *member-attributes* ] **Interface** *interfacename*  
> &nbsp;&nbsp;&nbsp;&nbsp; ...  
> **End CoClass**

*attributes*
: *optional*  Coclass-level attributes. See [Available attributes](#available-attributes) below.

*name*
: The identifier naming the coclass.

*interfacename*
: An [**Interface**](Interface) defined in the project (or imported from a referenced type library) that the coclass exposes. A coclass must list at least one interface and may list several.

*member-attributes*
: *optional*  Per-interface markers, principally:

  - `[Default]` — marks an interface as the default interface of the coclass. It is conventional and highly recommended to mark exactly one interface as `[Default]`.
  - `[Source]` — marks an interface as a source interface (an outgoing/event interface). Combine with `[Default]` (`[Default, Source]`) to mark the default event interface.

**CoClass** blocks are valid only in `.twin` source files (not legacy `.bas` or `.cls` files), and must appear *before* the [**Class**](Class) or [**Module**](Module) statement in the file.

### Available attributes

- `[CoClassId("...")]` — fixes the CLSID for the coclass (a string GUID). Set this on any public/exported coclass so consumers in other projects bind to a stable identity.
- `[Description("text")]` — exposed as the `helpstring` in the type library.
- `[ComCreatable(True/False)]` — indicates whether the coclass can be created with **New**. `True` by default.
- `[AppObject]` — marks the class as part of the global namespace. Use only when you fully understand the implication.
- `[Hidden]` — hides the coclass from IntelliSense and similar lists.
- `[CoClassCustomConstructor("ModuleName.FunctionName")]` — names a factory function (returning `HRESULT` and producing the new instance via an out parameter) used in place of the default `New` behavior. The factory may construct any private class that implements the coclass's interfaces.

### Example

A simple coclass exposing two interfaces, with `IFoo` marked as the default:

```tb
[CoClassId("52112FA1-FBE4-11CA-B5DD-0020AFE7292D")]
CoClass Foo
    [Default] Interface IFoo
    Interface IBar
End CoClass
```

A more complete example showing a custom-constructor coclass paired with a private implementing class. The coclass `Foo` is what consumers see and instantiate; the actual implementation `FooImpl` is hidden:

```tb
[InterfaceId("016BC30A-A8E0-4AAF-93AE-13BD838A149E")]
Public Interface IFoo
    Sub Foo()
End Interface

[InterfaceId("2A20E655-30A4-4534-86BC-6A7E281C425D")]
Public Interface IBar
    Sub Bar()
End Interface

[CoClassId("7980D953-10BF-478C-93BB-DD0093315D96")]
[CoClassCustomConstructor("FooFactory.CreateFoo")]
[ComCreatable(True)]
Public CoClass Foo
    [Default] Interface IFoo
    Interface IBar
End CoClass

' The implementation does not have to be exposed.
Private Class FooImpl
    Implements IFoo
    Implements IBar

    Public Sub Foo() Implements IFoo.Foo
        Debug.Print "Foo ran"
    End Sub

    Public Sub Bar() Implements IBar.Bar
        Debug.Print "Bar ran"
    End Sub
End Class

Public Module FooFactory
    ' The signature must be "preserved", returning an HRESULT
    ' and the new instance via the "out" parameter.
    Public Function CreateFoo(ByRef RHS As Foo) As Long
        Set RHS = New FooImpl
        Return 0 ' S_OK
    End Function
End Module

Public Module Test
    Public Sub DoIt()
        Dim MyFoo As Foo
        Set MyFoo = New Foo  ' Implicitly calls FooFactory.CreateFoo.
        MyFoo.Foo
    End Sub
End Module
```

### See Also

- [**Interface** statement](Interface)
- [**Implements** statement](Implements)
- [**Class** statement](Class)
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses)
