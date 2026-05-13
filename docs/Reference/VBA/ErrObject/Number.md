---
title: Number
parent: ErrObject
permalink: /tB/Modules/ErrObject/Number
vba_attribution: true
---
# Number
{: .no_toc }

Returns or sets a **Long** value specifying an error. **Number** is the default member of the **Err** object, so a bare reference to **Err** is equivalent to **Err.Number**. Read/write.

Syntax:
- **Err**.**Number**
- **Err**.**Number** **=** *errorNumber*

*errorNumber*
: A **Long** error code to assign to the **Err** object. When read, **Number** returns the current error code, or **0** if no error is active.

When returning a user-defined error from an object, set **Err.Number** by adding the number you selected as an error code to the [**vbObjectError**](../Constants/#vbObjectError) constant. For example, the following code returns 1051 as an error code:

```tb
Err.Raise Number:=vbObjectError + 1051, Source:="SomeClass"
```

### Example

The first example illustrates a typical use of the **Number** property in an error-handling routine.

```tb
Sub Demo()
    On Error GoTo Handler

    Dim x As Double, y As Double
    x = 1 / y                ' Create division-by-zero error.
    Exit Sub
Handler:
    MsgBox Err.Number
    MsgBox Err.Description
    ' Check for division-by-zero error.
    If Err.Number = 11 Then
        y = y + 1
    End If
    Resume
End Sub
```

The second example examines the **Number** property of the **Err** object to determine whether an error returned by an Automation object was defined by the object, or whether it was mapped to a built-in error.

The constant **vbObjectError** is a very large negative number that an object adds to its own error code to indicate that the error is server-defined; subtracting it from **Err.Number** strips it back out. If the error is object-defined, the base number is left in `myError`, which is displayed in a message box along with the original source of the error. If **Err.Number** represents a built-in error, the built-in error number is displayed instead.

```tb
Dim myError As Long, msg As String
' Strip off the constant added by the object to indicate one of its own errors.
myError = Err.Number - vbObjectError
' If you subtract vbObjectError and the number is still in the range 0-65535,
' it is an object-defined error code.
If myError > 0 And myError < 65535 Then
    msg = "The object you accessed assigned this number to the error: " _
        & myError & ". The originator of the error was: " _
        & Err.Source & ". Press F1 to see the originator's Help topic."
Else
    msg = "This error (# " & Err.Number & ") is a built-in error number." _
        & " Press the Help button or F1 for the Help topic for this error."
End If
MsgBox msg, , "Object Error", Err.HelpFile, Err.HelpContext
```

### See Also

- [Description](Description) property
- [Source](Source) property
- [Raise](Raise) method
- [Clear](Clear) method
