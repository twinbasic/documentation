---
title: Class Features
parent: Advanced Features
nav_order: 5
permalink: /Features/Advanced/Classes-and-Modules
---

# Class and Module Enhancements

twinBASIC provides several enhancements for classes and modules.

## Parameterized Class Constructors

A class can have a `Sub New` constructor, and the constructor can take arguments. The compiler treats the `Class_Initialize` event as another constructor, one that takes no arguments. [`New`](../../tB/Core/New) runs only the constructor that its arguments match --- it does not run `Sub New` and `Class_Initialize` one after the other:

- `New MyClass(123)` runs `Sub New(Value As Long)`. `Class_Initialize` is not raised.
- In a class that also has a `Class_Initialize`, a plain `New MyClass` runs `Class_Initialize`. `Sub New` does not run.
- A class that has both a `Class_Initialize` and a `Sub New` with no parameters cannot be created with a plain `New`. The call matches both, and fails with TB5073.

### Example

For example a class can have:

```tb check_build
[COMCreatable(False)]
Class MyClass
    Private MyClassVar As Long
    Sub New(Value As Long)
        MyClassVar = Value
    End Sub
End Class
```

then created by `Dim mc As MyClass = New MyClass(123)`, which sets `MyClassVar` on creation.

> [!IMPORTANT]
> A class that is not `Private` is exposed to COM, and COM creates objects without arguments. So a class whose `Sub New` takes arguments must be `Private`, have the `[COMCreatable(False)]` attribute, or also have a constructor that takes no arguments --- a `Class_Initialize()`, or a second `Sub New` with no parameters. Otherwise it fails to compile with TB5135. `Class_Initialize()` replaces `New` in callers of a compiled OCX.

## Private/Public Modifiers for Modules and Classes

A private module or class won't have its members entered into the type library in an ActiveX project.

## ReadOnly Variables

In a class, module-level variables can be declared as `ReadOnly`, e.g. `Private ReadOnly mStartDate As Date`. This allows more complex constant assignments: you can use a function return to set it inline, `Private ReadOnly mStartDate As Date = Now()`, or `ReadOnly` constants can be set in `Class_Initialize` or `Sub New(...)` (see parameterized class constructors above), but everywhere else, they can only be read, not changed.

## Get/Let/Set Notification for Class Public Variables

When have a variable in a class such as `Public myVar As Long`, it's treated as a property you can use the standard syntax to get or set. tB adds an optional notification event for when the Get/Let/Set occurs that's accessed through the regular `Handles` syntax:

```tb check_build
Class MyClass
    Public myVar As Long
    Public myOtherVar As Long
    Private Sub OnChangeMyVars() Handles myVar.OnPropertyLet, myOtherVar.OnPropertyLet, _
                                         myVar.OnPropertySet, myOtherVar.OnPropertySet
    ' ...
    End Sub
    Private Sub OnGetMyVar() Handles myVar.OnPropertyGet, myOtherVar.OnPropertyGet
    ' ...
    End Sub
End Class
```

These are notifications only, you can't change the `OnPropertyGet` method to a function and override the return.


## Exported Functions and Variables

It's possible to export a function or variable from standard modules, including with CDecl.

### Examples

```tb check_build
[DllExport]
Public Const MyExportedSymbol As Long = &H00000001

[DllExport]
Public Function MyExportedFunction(ByVal arg As Long) As Long
    ' ...
End Function

[DllExport]
Public Function MyCDeclExport CDecl(ByVal arg As Long)
    ' ...
End Function
```

This is primarily used to create Standard DLLs (see [Project Types](../Project-Configuration/Project-Types)), but this functionality is also available in Standard EXE and other compiled project types.

## Create classes without `IDispatch`

By default, the compiler creates a default implementation of `IDispatch` in all VBx/twinBASIC classes. This allows late-binding and other features. Sometimes however you want a more limited class that only implements `IUnknown`. This is possible in twinBASIC via the `NotDispatchable` keyword, used like this:

```tb check_build
NotDispatchable Class MyClass
'...
End Class
```

With the above, `MyClass` will not implement `IDispatch`. This means it will not be available for late-binding-- i.e. you cannot use it with a variable declared `As Object`. If you attempt to `Set` an `Object` (or `IDispatch`) variable to such a class, it will raise an `E_NOINTERFACE` error.

