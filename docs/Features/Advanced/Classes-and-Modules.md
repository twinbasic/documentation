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
- A class whose only `Sub New` has required arguments, with no `Class_Initialize`, cannot be declared [`As New`](../../tB/Core/New), which creates the object without arguments. The declaration fails with TB5121. If every argument of the `Sub New` is `Optional`, the class can be declared `As New`: the object is created by calling `Sub New` with the default values.

> [!NOTE] BETA 1010
> A `Sub New` declared `Private` is meant to make construction private, so that only code inside the class creates objects with it. This is not enforced: `New MyClass` in another module of the project, or in a project that references a package with the class, compiles and runs the private constructor.

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

### `Class_Initialize` or `Sub New`?

Both are constructors: code that runs once, as the object is created, before anything else can use it. Only one of them runs for any one object. They differ in what they can take and who can use them:

| | `Class_Initialize` | `Sub New` |
|---|---|---|
| Arguments | None. | Any. A class can have several `Sub New`s with different parameters, and `New` picks the one its arguments match. |
| VB6 and VBA | The same as in VB6 and VBA. | twinBASIC only. |
| COM clients | Can create the object. | Can create the object only through a `Sub New` that can be called without arguments: one with no parameters, or one whose parameters are all `Optional`, which then get their default values. |
| [`As New`](../../tB/Core/New) | Yes. | Only a `Sub New` that can be called without arguments. |
| Called from code | Possible, but it is an event handler, and the compiler warns: [TB0008](../Compiler-IDE/Compiler-Warnings#tb0008-suspicious-call). | Not possible: TB5053, *Cannot call New() constructor directly*. A derived class calls its base class's, as `Base.New(...)`. |

Which to use:

- **`Class_Initialize`** when setting up the object needs no information from the caller --- creating a `Collection`, reading a default --- and for code that must also compile in VB6 or VBA.
- **`Sub New(...)`** when the object is not usable until it is given something: a name, a file path, a connection. Requiring it as an argument means no caller can forget it, and no code has to check for an object that was created but not yet set up. It also sets [`ReadOnly`](#readonly-variables) fields, which nothing outside a constructor can change.
- **Both** when the class should be creatable with arguments, and also without them --- by `As New`, or by a COM client. The two never run one after the other, so code both of them need goes in a `Private` procedure that each calls.

Field initializers --- `Private _name As String = "nobody"` --- run before either constructor, whichever one `New` picks.

A class cannot have both a `Class_Initialize` and a `Sub New` without parameters: a plain `New` would match both, and fails with TB5073. Choose one of the two.

### Example: both constructors

`Greeter` can be created with a name or without one. The common part of the setup is in `Setup`, which both constructors call:

```tb check_build projname=ctor-both slot=file
Class Greeter
    Private _name As String = "nobody"

    Private Sub Class_Initialize()
        Debug.Print "Class_Initialize, _name = " & _name
        Setup "world"
    End Sub

    Public Sub New(ByVal Name As String)
        Debug.Print "Sub New, _name = " & _name
        Setup Name
    End Sub

    Private Sub Setup(ByVal Name As String)
        _name = Name
    End Sub

    Public Function Greet() As String
        Return "Hello, " & _name & "!"
    End Function
End Class
```

```tb check_run projname=ctor-both
Dim a As Greeter = New Greeter
Debug.Print a.Greet()
Dim b As Greeter = New Greeter("Ada")
Debug.Print b.Greet()
' Output:
' Class_Initialize, _name = nobody
' Hello, world!
' Sub New, _name = nobody
' Hello, Ada!
```

`New Greeter("Ada")` runs `Sub New` only: `Class_Initialize` does not run first. Both constructors see the field's initial value, `nobody`.

A class that [inherits](../Language/Inheritance#inherits-for-complete-oop) another runs the base class's constructor as well as its own. [Constructors in Derived Classes](../Language/Inheritance#constructors-in-derived-classes) says which of the base's constructors runs, and what the derived class must do so that the base is set up.

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

