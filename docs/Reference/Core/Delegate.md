---
title: Delegate
parent: Statements
permalink: /tB/Core/Delegate
---
# Delegate
{: .no_toc }

Declares a function-pointer type — a named signature that variables, parameters, and UDT members can hold a *reference* to a callable matching. A delegate value is bit-compatible with **LongPtr**, but adds compile-time signature checking when it is assigned, passed, or called.

> [!NOTE]
> The **Delegate** statement is a twinBASIC extension. In classic VBA, function pointers are untyped **LongPtr** values produced by **AddressOf** and called indirectly through custom mechanisms (`DispCallFunc`, `CallWindowProc` shims, etc.).

Syntax:
> [ **Public** \| **Private** ] **Delegate Function** *name* [ **CDecl** ] **(** [ *arglist* ] **)** **As** *type*

**Public**
: *optional*  In an ActiveX project, exports the delegate type to the type library so consumers in other projects see *name*.

**Private**
: *optional*  Withholds the delegate from the type library; usable only within the project.

*name*
: The identifier naming the delegate type. Must be a valid twinBASIC identifier.

**CDecl**
: *optional*  Marks the delegate as using the C calling convention (`cdecl` — caller cleans the stack), used to model callbacks expected by C-runtime APIs such as `qsort`. The default is `stdcall`. See [API Declarations](../../Features/Advanced/API-Declarations#cdecl-callbacks).

*arglist*
: *optional*  Parameter signature, written exactly as for a [**Sub**](Sub) or [**Function**](Function) — comma-separated `[ ByVal | ByRef ] [ Optional ] *varname* [ As *type* ]` parts.

*type*
: Return type of the delegate's signature.

After the declaration, *name* may be used wherever a type is allowed: to declare variables and parameters of function-pointer type, as the type of a member of a [**Type**](Type) (UDT), or as a parameter type in a [**Declare**](Declare) statement or an [**Interface**](Interface) member.

A delegate value is normally produced by **AddressOf**, which yields a delegate-typed reference to a regular procedure with a matching signature. For backwards compatibility, a delegate variable can also be assigned a plain **LongPtr** address obtained by other means — the value passes through unchecked. A delegate variable is called like a function: `result = myDelegate(arg1, arg2)`.

### Example

A basic delegate, declared, assigned, and called:

```tb
Private Delegate Function Operation (ByVal A As Long, ByVal B As Long) As Long

Public Function Addition(ByVal A As Long, ByVal B As Long) As Long
    Return A + B
End Function

Private Sub Command1_Click()
    Dim op As Operation = AddressOf Addition
    MsgBox "Answer: " & op(5, 6)
End Sub
```

A delegate used as a UDT member, modelling the `lpfnHook` field of the Windows `CHOOSECOLOR` struct. Existing code that assigns a **Long**/**LongPtr** to `lpfnHook` continues to work; new code can assign **AddressOf** *Handler* directly and have the signature checked at compile time:

```tb
Public Delegate Function CCHookProc (ByVal hwnd As LongPtr, ByVal uMsg As Long, _
    ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr

Public Type CHOOSECOLOR
    lStructSize As Long
    hwndOwner As LongPtr
    hInstance As LongPtr
    rgbResult As Long
    lpCustColors As LongPtr
    Flags As ChooseColorFlags
    lCustData As LongPtr
    lpfnHook As CCHookProc       ' Typed function pointer instead of LongPtr.
    lpTemplateName As LongPtr
End Type

Dim tCC As CHOOSECOLOR
tCC.lpfnHook = AddressOf ChooseColorHookProc
```

A **CDecl** delegate, used as the comparator parameter of the C-runtime `qsort` API:

```tb
Private Delegate Function LongComparator CDecl ( _
    ByRef a As Long, _
    ByRef b As Long _
) As Long

Private Declare PtrSafe Sub qsort CDecl Lib "msvcrt" ( _
    ByRef pFirst As Any, _
    ByVal lNumber As Long, _
    ByVal lSize As Long, _
    ByVal pfnComparator As LongComparator _
)
```

### See Also

- [**Declare** statement](Declare)
- [**Type** statement](Type)
- [**Interface** statement](Interface)
- [**Alias** statement](Alias)
- [Delegate Types](../../Features/Language/Delegates)
- [API Declarations](../../Features/Advanced/API-Declarations)
- [Enhanced Pointer Functionality](../../Features/Language/Pointers)
