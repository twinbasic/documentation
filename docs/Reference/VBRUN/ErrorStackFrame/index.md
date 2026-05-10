---
title: ErrorStackFrame Module
parent: VBRUN Package
permalink: /tB/Packages/VBRUN/ErrorStackFrame/
redirect_from:
  - /tB/Modules/ErrorStackFrame
has_toc: false
---

# ErrorStackFrame module

An **ErrorStackFrame** describes one procedure that was active on the call stack at the moment a run-time error was raised — the project it belongs to, the module that contains it, and its own name. Frames are produced by walking an [**ErrorCallstack**](../ErrorCallstack) snapshot, which in turn is reachable from the [**Callstack**](../ErrorContext#callstack) property of an [**ErrorContext**](../ErrorContext). Every property is read-only.

```tb
Sub LogStackTrace(ByVal Stack As ErrorCallstack)
    Dim i As Long
    For i = 1 To Stack.Count
        Dim Frame As ErrorStackFrame
        Set Frame = Stack.Items(i)
        Debug.Print Frame.ProjectName & "." & Frame.ModuleName & "." & Frame.ProcedureName
    Next i
End Sub
```

## Members

### ModuleName

Returns the name of the module — the standard module, class module, form, or user control — that contains the procedure for this frame, as a **String**.

Syntax: *object*.**ModuleName**

*object*
: *required* An object expression that evaluates to an **ErrorStackFrame** object.

### ProcedureName

Returns the name of the procedure for this frame, as a **String**.

Syntax: *object*.**ProcedureName**

*object*
: *required* An object expression that evaluates to an **ErrorStackFrame** object.

For property accessors, this is the property name without the `Get`/`Let`/`Set` prefix; for event handlers, it is the compiler-generated handler name in the usual `<Object>_<Event>` form.

### ProjectName

Returns the name of the twinBASIC project that contains the procedure for this frame, as a **String**.

Syntax: *object*.**ProjectName**

*object*
: *required* An object expression that evaluates to an **ErrorStackFrame** object.

For frames from a referenced package or compiled DLL, this is the name of the originating project.
