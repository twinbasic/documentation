---
title: Class Features
parent: Advanced Features
nav_order: 5
---

# Class and Module Enhancements

twinBASIC provides several enhancements for classes and modules.

## Parameterized Class Constructors

Classes now support a `New` sub with ability to add arguments, called as the class is constructed prior to the `Class_Initialize` event.

### Example

For example a class can have:

```
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

```
[DllExport]
Public Const MyExportedSymbol As Long = &H00000001

[DllExport]
Public Function MyExportedFunction(ByVal arg As Long) As Long

[DllExport]
Public Function MyCDeclExport CDecl(ByVal arg As Long)
```

This is primarily used to create Standard DLLs (see [Project Types](../Project-Configuration/Project-Types.md)), but this functionality is also available in Standard EXE and other compiled project types.
