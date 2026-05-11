---
title: AddressOf
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/AddressOf
---
# AddressOf operator
{: .no_toc }

A unary operator that returns a function-pointer reference to its operand.

Syntax:
> **AddressOf** *procedurename*  
> **AddressOf** *instance*.*procedurename*     *(twinBASIC)*

*procedurename*
: The name of a [**Sub**](Sub), [**Function**](Function), or [**Property**](Property) procedure whose address is taken.

*instance*
: *optional*  (twinBASIC) An object reference whose member *procedurename* is targeted. The resulting pointer is bound to *instance*, so calling through it invokes the method on that specific object.

When a procedure name appears in an argument list, normally the procedure is *called* and the procedure's return value is passed. **AddressOf** suppresses the call and substitutes the procedure's address instead. The most common use is to install a callback in a Windows API — the API then invokes the procedure from outside your code, in a process known as a *callback*.

The value **AddressOf** produces is bit-compatible with **LongPtr**, so it can be passed wherever a function pointer is expected — including legacy [**Declare**](Declare) parameters typed **As Long** or **As LongPtr**. When the destination type is a [**Delegate**](Delegate), the compiler additionally checks that the operand's signature matches the delegate's.

In classic VBA, *procedurename* must name a procedure in a standard [**Module**](Module) of the current project; the destination parameter must be typed **As Long**; and the resulting pointer can only be invoked by code outside Basic (e.g. a DLL). twinBASIC lifts each of these restrictions — see [twinBASIC enhancements](#twinbasic-enhancements) below.

> [!NOTE]
> Errors raised inside a callback cannot propagate back to the foreign caller — the API runs outside your project's error-handling chain. Place `On Error Resume Next` (or an explicit handler) at the top of any procedure used as an **AddressOf** target.

### twinBASIC enhancements

- **Indirect calls back through Basic.** A delegate variable holding an **AddressOf** value can be called directly: `Dim op As Operation = AddressOf Add: r = op(5, 6)`. Classic VBA can pass such pointers between procedures but cannot invoke through them inside Basic. See [**Delegate**](Delegate).
- **Class, form, and user-control members.** **AddressOf** accepts methods declared on a class, form, or user-control. Take a pointer to an instance method by qualifying the name with the object reference: `AddressOf myInstance.MyMethod`. The resulting pointer remembers the instance — calling through it dispatches to that object.
- **CDecl callbacks.** Mark both the target procedure and the matching [**Delegate**](Delegate) (or [**Declare**](Declare) parameter) with **CDecl** to model `cdecl` callbacks. Classic VBA's **AddressOf** is hard-wired to `__stdcall`. See [API Declarations](../../Features/Advanced/API-Declarations#cdecl-callbacks).
- **No `FARPROC` shim needed.** Assigning a function pointer to a local variable is direct — `Dim lpfn As LongPtr = AddressOf MyFunc` — without writing an intermediate forwarding procedure.

### Example

Calling through a typed delegate, inside Basic:

```tb
Private Delegate Function Operation (ByVal A As Long, ByVal B As Long) As Long

Public Function Addition(ByVal A As Long, ByVal B As Long) As Long
    Return A + B
End Function

Private Sub Demo()
    Dim op As Operation = AddressOf Addition
    Debug.Print op(5, 6)     ' 11
End Sub
```

Installing a callback in a Win32 API. `EnumWindows` invokes *EnumProc* once per top-level window:

```tb
Public Declare PtrSafe Function EnumWindows Lib "user32" ( _
    ByVal lpEnumFunc As LongPtr, ByVal lParam As LongPtr) As Long

Public Function EnumProc(ByVal hwnd As LongPtr, ByVal lParam As LongPtr) As Long
    On Error Resume Next
    Debug.Print hwnd
    EnumProc = 1     ' Continue enumeration.
End Function

Public Sub ListTopLevelWindows()
    EnumWindows AddressOf EnumProc, 0
End Sub
```

Taking a pointer to an instance method by qualifying with the object reference:

```tb
Class CFoo
    Public Sub Bar()
        Debug.Print "Bar on instance"
    End Sub
End Class

Public Sub Demo()
    Dim foo1 As New CFoo
    Dim lpfn As LongPtr = AddressOf foo1.Bar
End Sub
```

### See Also

- [**Delegate** statement](Delegate)
- [**Declare** statement](Declare)
- [Delegate Types](../../Features/Language/Delegates)
- [Enhanced Pointer Functionality](../../Features/Language/Pointers)
- [API Declarations](../../Features/Advanced/API-Declarations)
- [Operators](../../Reference/Operators)

{% include VBA-Attribution.md %}
