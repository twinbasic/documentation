---
title: Class Features
parent: Advanced Features
nav_order: 5
permalink: /Features/Advanced/Classes-and-Modules
---

# Class and Module Enhancements

twinBASIC provides several enhancements for classes and modules.

## Parameterized Class Constructors

Classes now support a `New` sub with ability to add arguments, called as the class is constructed prior to the `Class_Initialize` event.

### Example

For example a class can have:

```tb
[ComCreatable(False)]
Class MyClass
Private MyClassVar As Long
Sub New(Value As Long)
MyClassVar = Value
End Sub
End Class
```

then created by `Dim mc As MyClass = New MyClass(123)` which sets `MyClassVar` on create. Note: Classes using this must be private, have the `[ComCreatable(False)]` attribute, or also contain `Class_Initialize()`. `Class_Initialize()` will replace `New` in callers of a compiled OCX. Within the project, only `New` will be used if present.

## Private/Public Modifiers for Modules and Classes

A private module or class won't have its members entered into the type library in an ActiveX project.

## ReadOnly Variables

In a class, module-level variables can be declared as `ReadOnly`, e.g. `Private ReadOnly mStartDate As Date`. This allows more complex constant assignments: you can use a function return to set it inline, `Private ReadOnly mStartDate As Date = Now()`, or `ReadOnly` constants can be set in `Class_Initialize` or `Sub New(...)` (see parameterized class constructors above), but everywhere else, they can only be read, not changed.

## Exported Functions and Variables

It's possible to export a function or variable from standard modules, including with CDecl.

### Examples

```tb
[DllExport]
Public Const MyExportedSymbol As Long = &H00000001

[DllExport]
Public Function MyExportedFunction(ByVal arg As Long) As Long

[DllExport]
Public Function MyCDeclExport CDecl(ByVal arg As Long)
```

This is primarily used to create Standard DLLs (see [Project Types](../Project-Configuration/Project-Types)), but this functionality is also available in Standard EXE and other compiled project types.

## Create classes without `IDispatch`

By default, the compiler creates a default implementation of `IDispatch` in all VBx/twinBASIC classes. This allows late-binding and other features. Sometimes however you want a more limited class that only implements `IUnknown`. This is possible in twinBASIC via the `NotDispatchable` keyword, used like this:

```tb
NotDispatchable Class MyClass
'...
End Class
```

With the above, `MyClass` will not implement `IDispatch`. This means it will not be available for late-binding-- i.e. you cannot use it with a variable declared `As Object`. If you attempt to `Set` an `Object` (or `IDispatch`) variable to such a class, it will raise an `E_NOINTERFACE` error.

In programming, a class that does not use the `NotDispatchable` keyword—and therefore **does not implement the `IDispatch` interface by default**—has two main benefits:

**1. Improved performance and reduced resource usage**  
In traditional VBx/VBA environments, classes implement `IDispatch` by default to support so‑called _late binding_. However, `IDispatch` has a relatively complex implementation mechanism: it requires the program to dynamically resolve and look up method or property addresses at runtime (via a dispatch table).  
If a class only implements the more basic `IUnknown` interface, the compiler can skip this extra dispatching overhead and generate leaner code, resulting in slightly better performance and lower memory consumption.

**2. Stronger type safety, preventing accidental misuse**  
Implementing `IDispatch` by default means the class can be assigned to variables declared `As Object` (i.e., late binding is allowed). While this offers flexibility, it also means the compiler cannot perform strict type checking.  
By declaring `NotDispatchable`, you explicitly restrict the class to _early binding_ (the exact class type must be known to use it). This forces developers to follow the defined interface strictly, eliminating potential hidden runtime bugs caused by typos or incorrect object types, making the code more robust.

**Usage recommendation:**  
If you are developing an internal utility class, a low‑level module, or you know for certain that you do not need to treat objects as generic `Object` instances, **it is highly recommended to use `NotDispatchable`**. This makes your code more modern, safer, and more efficient.
