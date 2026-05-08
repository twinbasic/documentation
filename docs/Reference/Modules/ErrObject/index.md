---
title: ErrObject Module
parent: Modules
permalink: /tB/Modules/ErrObject/
has_toc: false
---

# ErrObject module

The **Err** object holds information about the most recent run-time error. It is a global, intrinsic singleton — there is no need to declare it or construct one with **New**, just reference it as **Err**. The default property is [**Number**](Number), so a bare **Err** is equivalent to `Err.Number`.

## Inspecting an error

When a run-time error is raised inside a procedure that has an active error handler installed with [**On Error**](../../Core/On-Error), execution jumps to the handler with the **Err** object's properties populated. The handler reads [**Number**](Number) to identify the error, [**Description**](Description) for a human-readable message, and [**Source**](Source) to learn where it originated.

```tb
Sub Demo()
    On Error GoTo Handler
    Err.Raise 6                    ' Generate an Overflow error.
    Exit Sub
Handler:
    Debug.Print Err.Number         ' 6
    Debug.Print Err.Description    ' "Overflow"
End Sub
```

The properties are reset to their zero values when the handler exits via **Resume**, **Resume Next**, or any **Exit** statement, or when [**Clear**](Clear) is called explicitly.

## Raising a custom error

Code can generate its own run-time error by calling [**Raise**](Raise). Custom error numbers should be biased by [**vbObjectError**](../Constants/#vbObjectError) so that they don't collide with twinBASIC's built-in numbers. Setting [**Source**](Source) and [**Description**](Description) at the call site gives the error handler something useful to inspect or display.

```tb
Public Sub WithdrawCash(ByVal Amount As Currency)
    If Amount > Balance Then
        Err.Raise vbObjectError + 1001, _
                  Source:="Account.WithdrawCash", _
                  Description:="Insufficient funds."
    End If
    ' ...
End Sub
```

## Members

- [Clear](Clear) -- resets all properties of the **Err** object to their zero values
- [Description](Description) -- returns or sets a string describing the error
- [HelpContext](HelpContext) -- returns or sets the context ID of a Help topic associated with the error
- [HelpFile](HelpFile) -- returns or sets the path to the Help file associated with the error
- [LastDllError](LastDllError) -- returns the last system error code from a call into a DLL
- [LastHresult](LastHresult) -- returns the last HRESULT returned from a COM object method call
- [Number](Number) -- returns or sets the error number; the default member of **Err**
- [Raise](Raise) -- generates a run-time error
- [ReturnHResult](ReturnHResult) -- sets a custom HRESULT to be returned from the current method
- [Source](Source) -- returns or sets the name of the object or application that generated the error
