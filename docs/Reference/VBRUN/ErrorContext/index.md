---
title: ErrorContext Module
parent: VBRUN Package
permalink: /tB/Packages/VBRUN/ErrorContext/
redirect_from:
  - /tB/Modules/ErrorContext
has_toc: false
---

# ErrorContext module

An **ErrorContext** object captures everything the runtime knows about a run-time error: its identity ([**Number**](#number), [**Description**](#description), [**Source**](#source)), its help references ([**HelpFile**](#helpfile), [**HelpContext**](#helpcontext)), the operating-system error code at the time it was raised ([**LastDLLError**](#lastdllerror)), the [**State**](#state) of the error-handling machinery, and a snapshot of the [**Callstack**](#callstack) from the moment of the failure. It is twinBASIC's structured counterpart to the simpler [**Err**](../../../Modules/ErrObject) object.

The error-identity properties (**Number**, **Description**, **Source**, **HelpFile**, **HelpContext**, **LastDLLError**) carry the same meaning here as on the **Err** object — see the [**ErrObject**](../../../Modules/ErrObject) module for a discussion of each. **State** and **Callstack** are unique to **ErrorContext** and reflect the structured error-handling machinery that has no equivalent on the legacy **Err** object.

## Members

### Callstack

Returns a snapshot of the call stack as it was when the error was raised, as an [**ErrorCallstack**](../ErrorCallstack).

Syntax: *object*.**Callstack**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

The snapshot lists every active procedure outermost-first; the innermost frame is the procedure that raised the error. The collection is read-only — see [**ErrorCallstack**](../ErrorCallstack) for how to walk it.

### Description

Returns a short text description of the error, as a **String**. Read-only.

Syntax: *object*.**Description**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

For runtime-defined errors, this is the message the runtime would have shown in an unhandled-error dialog. For user-defined errors, it is whatever string was passed to **Err.Raise**.

### HelpContext

Returns the help-file context ID associated with the error, as a **Long**. Read-only.

Syntax: *object*.**HelpContext**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

When [**HelpFile**](#helpfile) names a help file, **HelpContext** identifies the topic in that file that documents the error. **0** if no help context is associated.

### HelpFile

Returns the path of the help file associated with the error, as a **String**. Read-only.

Syntax: *object*.**HelpFile**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

A zero-length string if no help file is associated.

### LastDLLError

Returns the last operating-system error code recorded by a call into a Windows DLL, as a **Long**. Read-only.

Syntax: *object*.**LastDLLError**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

twinBASIC's error trapping does not catch failures inside `Declare`d Windows API calls — those calls report failure through their return value, and the calling code has to inspect this property to learn the underlying Win32 error. The value is meaningful only on Windows.

### Number

Returns the run-time error number, as a **Long**. Read-only.

Syntax: *object*.**Number**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

Built-in errors use the standard VBA error codes (for example, `9` for "Subscript out of range" or `91` for "Object variable or With block variable not set"). User-defined errors raised with **Err.Raise** typically add the **vbObjectError** offset to a small per-application code.

### Source

Returns the name of the object or application that raised the error, as a **String**. Read-only.

Syntax: *object*.**Source**

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

For errors raised inside a twinBASIC project, this is the project name; for errors raised by an Automation server, it is the application's programmatic identifier. User code can supply any string when calling **Err.Raise**.

### State

Returns or sets a value identifying which error-handling construct is currently active, as an **OnErrorStatus** value.

Syntax: *object*.**State** [ **=** *value* ]

*object*
: *required* An object expression that evaluates to an **ErrorContext** object.

The runtime updates **State** as control flows through error handlers, **Try**/**Catch**/**Finally** blocks, and the various propagation paths. Reading the property tells diagnostic code which construct it is being invoked from. Assigning to it overrides the runtime's idea of what to do next — a deliberately advanced operation, useful mainly to diagnostic tools and to libraries that orchestrate their own error flow.

The **OnErrorStatus** enumeration values are:

`OnErrorGoto0` (`&H1`)
: An **On Error GoTo 0** is currently in effect — no handler is installed.

`OnErrorResumeNext` (`&H2`)
: An **On Error Resume Next** is currently in effect.

`OnErrorGotoLabel` (`&H3`)
: An **On Error GoTo** *label* is currently in effect.

`OnErrorEnd` (`&H4`)
: Execution is being terminated because of an unhandled error.

`OnErrorDebug` (`&H5`)
: The runtime is about to break into the debugger.

`CalledByLocalHandler` (`&H6`)
: The currently executing code was called by a local error handler.

`OnErrorRetry` (`&H7`)
: A retry of the failing statement is in progress (the structured equivalent of **Resume**).

`OnErrorPropagate` (`&H8`)
: An unhandled error is being propagated up the call stack.

`OnErrorExitProcedure` (`&H9`)
: An error is forcing the current procedure to exit.

`OnErrorCatch` (`&Ha`)
: Control is inside a **Catch** block matching a specific error.

`OnErrorCatchAll` (`&Hb`)
: Control is inside a general "catch all" block.

`OnErrorInsideCatch` (`&Hc`)
: Control is nested inside a **Catch** block (a further error has been raised inside a handler).

`OnErrorInsideCatchAll` (`&Hd`)
: Control is nested inside a "catch all" block.

`OnErrorInsideFinally` (`&He`)
: Control is inside a **Finally** block.

`OnErrorPropagateCatch` (`&Hf`)
: An error is being propagated out of a **Catch** block.

`OnErrorPropagateCatchAll` (`&H10`)
: An error is being propagated out of a "catch all" block.
