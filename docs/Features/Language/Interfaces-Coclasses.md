---
title: Interfaces and Coclasses
parent: Language Syntax
nav_order: 2
---

# Interfaces, Coclasses, and Aliases

twinBASIC supports these features as native language syntax where in VBx they were only supported via Type Libraries.

## Defining Interfaces

twinBASIC supports defining COM interfaces using BASIC syntax, rather than needing an type library with IDL and C++. These are only supported in .twin files, not in legacy .bas or .cls files. They must appear *before* the `Class` or `Module` statement, and will always have a project-wide scope. The generic form for this is as follows:

```
[InterfaceId ("00000000-0000-0000-0000-000000000000")]
*<attributes>*
Interface <name> Extends <base-interface>
    *<attributes>*
    <method 1>
    *<attributes>*
    <method 2>
    ...
End Interface
```

Methods can be any of the following: `Sub`, `Function`, `Property Get`, `Property Let`, or `Property Set`, with arguments following the standard syntax, and with the standard attributes available. These cannot be modified with `Public/Private/Friend`. `End <method>` is not used, as these are prototype definitions only.

### Available Attributes for Interfaces

- `[Description("text")]` - Provides a description in information popups, and is exported as a `helpstring` attribute in the type library (if applicable).
- `[Hidden]` - Hides the interface from certain Intellisense and other lists.
- `[Restricted]` - Restricts the interface methods from being called in most contexts.
- `[OleAutomation(True/False)]` - Controls whether this attribute is applied in the typelibrary. This attribute is set to **True** by default.
- `[ComImport]` - Specifies that an interface is an import from an external COM library, for instance, the Windows shell.
- `[ComExtensible(True/False)]` - Specifies whether new members added at runtime can be called by name through an interface implementing IDispatch. This attribute is set to **False** by default.

### Available Attributes for Methods

- `[Description("text")]` - Provides a description
- `[PreserveSig]` - For COM interfaces, normally methods return an HRESULT that the language hides from you. The `[PreserveSig]` attribute overrides this behavior and defines the function exactly as you provide. This is necessary if you need to define it as returning something other than a 4-byte `Long`, or want to handle the result yourself, bypassing the normal runtime error raised if the return value is negative (this is helpful when a negative value indicates an expected, acceptable failure, rather than a true error, like when an enum interface is out of items).
- `[DispId(number)]` - Defines a dispatch ID associated with the method.

### Example

```
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
(Where MyEnum is a standard `Enum ... End Enum` block.)

## Defining Coclasses

In addition to interfaces, twinBASIC also allows defining coclasses -- creatable classes that implement one or more defined interfaces. Like interfaces, these too must be in .twin files and not legacy .bas/.cls files, and must appear prior to the `Class` or `Module` statement. The generic form is:

```
[CoClassId("00000000-0000-0000-0000-000000000000")]
*<attributes>*
CoClass <name>
    [Default] Interface <interface name>
    *[Default, Source] Interface <event interface name>*
    *<additional Interface items>*
End CoClass
```

Each coclass must specify at least one interface but may have several more. It can optionally mark an interface as default or a source. It is typical and highly recommended that an interface be marked with `[Default]` attribute and in cases where it has events to also specify `[Default, Source]` to indicate the default interface used for events. Each represents a contract that the class will provide an implementation of the given interface. Note that at this time, twinBASIC does not yet support defining `dispinterface` interfaces (aka, dispatch-only interface) the usual form of source interfaces for events.

### Attributes for Coclasses

- `[Description("text")]` - Provides a description in info popups and other places.
- `[ComCreatable(True/False)]` - Indicates that this coclass can be created with the `New` keyword. This is *True* by default.
- `[AppObject]` - Indicates the class is part of the global namespace. You should not include this attribute without a full understanding of the meaning.
- `[Hidden]` - Hides the coclass from appearing in certain places.
- `[CoClassCustomConstructor("fully qualified path to factory method")]` - Allows custom logic for creating and returning a new instance of the coclass' implementation.

### Example

```
[CoClassId("52112FA1-FBE4-11CA-B5DD-0020AFE7292D")]
CoClass Foo
   [Default] Interface IFoo
   Interface IBar
End CoClass
```
Where `IFoo` and `IBar` are interfaces defined with the `Interface` syntax described earlier.

### Custom Constructor Example

```vb
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
[COMCreatable(True)]
Public CoClass Foo
    [Default] Interface IFoo
    Interface IBar
End CoClass

' The implementation do not have to be exposed. The coclass is a sufficient description
' and we should implement the interfaces that the coclass exposes.
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
    ' The signature must be "preserved", returning a HRESULT
    ' and the new instance via the "out" parameter.
    ' Note that we new up the FooImpl but return the Foo coclass.
    Public Function CreateFoo(ByRef RHS As Foo) As Long
        Set RHS = New FooImpl
        Return 0 ' S_OK
    End Function
End Module

Public Module Test
    Public Sub DoIt()
        Dim MyFoo As Foo
        ' create a new instance of coclass Foo
        ' this implicilty calls the custom constructor
        ' in the FooFactory.
        Set MyFoo = New Foo
        MyFoo.Foo
    End Sub
End Module
```

## Defining Aliases

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
