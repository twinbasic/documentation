---
title: ErrorCallstack
parent: VBRUN Package
nav_order: 10
permalink: /tB/Packages/VBRUN/ErrorCallstack/
redirect_from:
  - /tB/Modules/ErrorCallstack
has_toc: false
---

# ErrorCallstack class

An **ErrorCallstack** object is a snapshot of the chain of procedures that were active on the call stack at the moment a run-time error was raised --- outermost frame first, innermost (the procedure that actually raised the error) last. Each frame is exposed as an [**ErrorStackFrame**](../ErrorStackFrame), describing one procedure by its project, module, and procedure names.

The snapshot is read through the **Callstack** property of an **ErrorContext** object, which is itself accessible from the structured error-handling machinery --- typically inside a `Catch` block or an **On Error** handler.

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

The collection is read-only and has no `_NewEnum` member, so it cannot be iterated with **For Each** --- use a numeric loop from `1` to [**Count**](#count) and read each frame with [**Items**](#items).

## Members

### Count

Returns the number of frames in the snapshot.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to an **ErrorCallstack** object.

The value is a **Long**. Valid indexes for [**Items**](#items) run from `1` to **Count**. **Count** is `0` if no procedures were on the stack at the time the snapshot was taken.

### Items

Returns one frame from the snapshot by its one-based position.

Syntax: *object*.**Items(** *Index* **)**

*object*
: *required* An object expression that evaluates to an **ErrorCallstack** object.

*Index*
: *required* A **Long** giving the one-based position of the frame to return. Frame `1` is the outermost procedure on the stack; frame [**Count**](#count) is the innermost --- the procedure that raised the error. *Index* must be between `1` and **Count**; otherwise an error occurs.

The result is an [**ErrorStackFrame**](../ErrorStackFrame) describing the procedure at that position.
