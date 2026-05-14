---
title: On Error
parent: Statements
permalink: /tB/Core/On-Error
vba_attribution: true
---
# On Error
{: .no_toc }

Enables an error-handling routine and specifies the location of the routine within a procedure; can also be used to disable an error-handling routine.

Syntax:
- > **On Error GoTo** *line*
- > **On Error Resume Next**
- > **On Error GoTo 0**

**On Error GoTo** *line*
: Enables the error-handling routine that starts at *line*. The *line* argument is any line label or line number. If a run-time error occurs, control branches to *line*, making the error handler active. The specified *line* must be in the same procedure as the **On Error** statement; otherwise, a compile-time error occurs.

**On Error Resume Next**
: Specifies that when a run-time error occurs, control goes to the statement immediately following the statement where the error occurred and execution continues. This form is preferred over **On Error GoTo** when accessing objects.

**On Error GoTo 0**
: Disables any enabled error handler in the current procedure.

Without an **On Error** statement, any run-time error that occurs is fatal; that is, an error message is displayed and execution stops.

An "enabled" error handler is one that is turned on by an **On Error** statement; an "active" error handler is an enabled handler that is in the process of handling an error. If an error occurs while an error handler is active (between the occurrence of the error and a [**Resume**](Resume), [**Exit Sub**](Exit), **Exit Function**, or **Exit Property** statement), the current procedure's error handler can't handle the error. Control returns to the calling procedure.

If the calling procedure has an enabled error handler, it is activated to handle the error. If the calling procedure's error handler is also active, control passes back through previous calling procedures until an enabled, but inactive, error handler is found. If no inactive, enabled error handler is found, the error is fatal at the point at which it actually occurred.

Each time the error handler passes control back to a calling procedure, that procedure becomes the current procedure. After an error is handled by an error handler in any procedure, execution resumes in the current procedure at the point designated by the **Resume** statement.

> [!NOTE]
> An error-handling routine is not a [**Sub**](Sub) procedure or [**Function**](Function) procedure. It's a section of code marked by a line label or line number.

Error-handling routines rely on the value in the **Number** property of the **Err** object to determine the cause of the error. The error-handling routine should test or save relevant property values in the **Err** object before any other error can occur or before a procedure that might cause an error is called. The property values in the **Err** object reflect only the most recent error. The error message associated with **Err.Number** is contained in **Err.Description**.

**On Error Resume Next** causes execution to continue with the statement immediately following the statement that caused the run-time error, or with the statement immediately following the most recent call out of the procedure containing the **On Error Resume Next** statement. This statement allows execution to continue despite a run-time error. The error-handling routine can be placed where the error would occur, rather than transferring control to another location within the procedure. An **On Error Resume Next** statement becomes inactive when another procedure is called, so an **On Error Resume Next** statement must be executed in each called routine that requires inline error handling.

> [!NOTE]
> The **On Error Resume Next** construct may be preferable to **On Error GoTo** when handling errors generated during access to other objects. Checking **Err** after each interaction with an object removes ambiguity about which object was accessed by the code. It is then clear which object placed the error code in **Err.Number**, as well as which object originally generated the error (the object specified in **Err.Source**).

**On Error GoTo 0** disables error handling in the current procedure. It doesn't specify line 0 as the start of the error-handling code, even if the procedure contains a line numbered 0. Without an **On Error GoTo 0** statement, an error handler is automatically disabled when a procedure is exited.

To prevent error-handling code from running when no error has occurred, place an [**Exit Sub**](Exit), **Exit Function**, or **Exit Property** statement immediately before the error-handling routine, as in the following fragment:

```tb
Sub InitializeMatrix(Var1, Var2, Var3, Var4)
    On Error GoTo ErrorHandler
    . . .
    Exit Sub
ErrorHandler:
    . . .
    Resume Next
End Sub
```

Here, the error-handling code follows the **Exit Sub** statement and precedes the [**End Sub**](End) statement to separate it from the procedure flow. Error-handling code can be placed anywhere in a procedure.

When creating an object that accesses other objects, try to handle errors passed back from them unhandled. When such errors cannot be handled, map the error code in **Err.Number** to a project-specific error, and then pass it back to the caller of the object. Specify the error by adding the project error code to the **vbObjectError** constant. For example, if the error code is 1052, assign it as follows:

```tb
Err.Number = vbObjectError + 1052
```

> [!NOTE]
> System errors during calls to Windows dynamic-link libraries (DLLs) don't raise exceptions and cannot be trapped with twinBASIC error trapping. When calling DLL functions, check each return value for success or failure (according to the API specifications), and in the event of a failure, check the value in the **Err** object's **LastDLLError** property.

### Example

This example first uses the **On Error GoTo** statement to specify the location of an error-handling routine within a procedure. In the example, an attempt to delete an open file generates error number 55. The error is handled in the error-handling routine, and control is then returned to the statement that caused the error. The **On Error GoTo 0** statement turns off error trapping.

The **On Error Resume Next** statement is then used to defer error trapping so that the context for the error generated by the next statement can be known for certain. Note that **Err.Clear** is used to clear the **Err** object's properties after the error is handled.

```tb
Sub OnErrorStatementDemo()
    On Error GoTo ErrorHandler ' Enable error-handling routine.
    Open "TESTFILE" For Output As #1 ' Open file for output.
    Kill "TESTFILE" ' Attempt to delete open file.
    On Error GoTo 0 ' Turn off error trapping.
    On Error Resume Next ' Defer error trapping.
    ObjectRef = GetObject("MyWord.Basic") ' Try to start nonexistent object.

    ' Check for likely Automation errors.
    If Err.Number = 440 Or Err.Number = 432 Then
        ' Tell user what happened. Then clear the Err object.
        Msg = "There was an error attempting to open the Automation object!"
        MsgBox Msg, , "Deferred Error Test"
        Err.Clear ' Clear Err object fields.
    End If
    Exit Sub ' Exit to avoid handler.
ErrorHandler: ' Error-handling routine.
    Select Case Err.Number ' Evaluate error number.
        Case 55 ' "File already open" error.
            Close #1 ' Close open file.
        Case Else
            ' Handle other situations here...
    End Select
    Resume ' Resume execution at same line that caused the error.
End Sub
```

### See Also

- [**Resume** statement](Resume)
- [**Error** statement](Error)
- [**Exit** statement](Exit)
- [**GoTo** statement](GoTo)
