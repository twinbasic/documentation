---
title: Interface
parent: Statements
permalink: /tB/Core/Interface
---
# Interface
{: .no_toc }

Defines a COM interface using twinBASIC syntax. An interface is a contract: a named set of method and property prototypes, with no implementation. Classes provide implementations of interfaces by using the [**Implements**](Implements) statement.

> [!NOTE]
> The **Interface** block is a twinBASIC extension. In classic VBA there is no interface keyword — interfaces could only be defined indirectly via a referenced type library (IDL/C++) or by using a class with no implementation.

Syntax:
> [ *attributes* ]  
> [ **Public** \| **Private** ] **Interface** *name* [ **Extends** *baseinterface* [ **,** *baseinterface* ] ... ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *attributes* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; *member-prototype*  
> &nbsp;&nbsp;&nbsp;&nbsp; ...  
> **End Interface**

*attributes*
: *optional*  Interface- and member-level attributes. See [Available attributes](#available-attributes) below.

*name*
: The identifier naming the interface. By convention an interface name begins with an uppercase `I` (`IFoo`, `ICalculator`, ...).

*baseinterface*
: *optional*  One or more interfaces that *name* extends. An implementing class is required to provide bodies for the inherited methods as well; in twinBASIC, you can `Implements` *name* and rely on the inherited interfaces being satisfied automatically.

*member-prototype*
: A header-only declaration. May be a [**Sub**](Sub), [**Function**](Function), [**Property Get**](Property), [**Property Let**](Property), or [**Property Set**](Property) signature, with arguments and return type. **Public**/**Private**/**Friend** modifiers are *not* allowed on members. There is no `End Sub` / `End Function` / `End Property` — the prototype ends at end of line.

**Interface** blocks are valid only in `.twin` source files (not legacy `.bas` or `.cls` files), and must appear *before* the [**Class**](Class) or [**Module**](Module) statement in the file. Interfaces always have project-wide scope.

### Available attributes

Interface-level attributes:

- `[InterfaceId("...")]` — fixes the IID for the interface (a string GUID). Set this on any public/exported interface so consumers in other projects bind to a stable identity.
- `[Description("text")]` — exposed as the `helpstring` in the type library.
- `[Hidden]` — hides the interface from IntelliSense and similar lists.
- `[Restricted]` — restricts the interface methods from being called in most contexts.
- `[OleAutomation(True/False)]` — controls whether the attribute is applied in the type library. `True` by default.
- `[ComImport]` — declares the interface as an import from an external COM library (e.g., the Windows shell).
- `[ComExtensible(True/False)]` — controls whether dynamically-added members can be invoked through `IDispatch`. `False` by default.

Member-level attributes:

- `[Description("text")]`
- `[PreserveSig]` — keeps the raw COM signature (returning `HRESULT`) instead of having the runtime translate negative results into errors. Use this when you need the literal return value, or when negative values mean *acceptable failure* (e.g. an enumerator running out of items).
- `[DispId(number)]` — fixes the dispatch ID associated with the member.

### Example

```tb
[InterfaceId("E7064791-0E4A-425B-8C8F-08802AAFEE61")]
[Description("Defines the IFoo interface")]
[OleAutomation(False)]
Interface IFoo Extends IUnknown
    Sub MySub(Arg1 As Long)
    Function Clone() As IFoo
    [PreserveSig]
    Function MyFunc([TypeHint(MyEnum)] Arg1 As Variant) As Boolean
End Interface
```

A class that implements `IFoo` provides bodies for every member:

```tb
Class FooImpl
    Implements IFoo

    Private Sub IFoo_MySub(Arg1 As Long) Implements IFoo.MySub
        Debug.Print "MySub called with"; Arg1
    End Sub

    Private Function IFoo_Clone() As IFoo Implements IFoo.Clone
        Set IFoo_Clone = New FooImpl
    End Function

    Private Function IFoo_MyFunc(Arg1 As Variant) As Boolean Implements IFoo.MyFunc
        IFoo_MyFunc = True
    End Function
End Class
```

### See Also

- [**Implements** statement](Implements)
- [**CoClass** statement](CoClass)
- [**Class** statement](Class)
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses)
- [Inheritance](../../Features/Language/Inheritance)
