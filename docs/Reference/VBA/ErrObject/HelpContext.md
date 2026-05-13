---
title: HelpContext
parent: ErrObject
permalink: /tB/Modules/ErrObject/HelpContext
vba_attribution: true
---
# HelpContext
{: .no_toc }

Returns or sets a **Long** containing the context ID for a topic in the Help file associated with the active error. Read/write.

Syntax:
- **Err**.**HelpContext**
- **Err**.**HelpContext** **=** *contextID*

*contextID*
: A **Long** specifying the context ID for the appropriate Help topic. Set to **0** when no specific topic applies.

The **HelpContext** property is used to automatically display the Help topic specified in the [**HelpFile**](HelpFile) property.

If both **HelpFile** and **HelpContext** are empty, the value of [**Number**](Number) is checked. If **Number** corresponds to a built-in run-time error, the Help context ID for that error is used. If the **Number** value doesn't correspond to a built-in error, the contents page of the Help file is displayed.

> [!NOTE]
>
> Write routines in your application to handle typical errors. When programming with an object, you can use the object's Help file to improve the quality of your error handling, or to display a meaningful message to the user when an error isn't recoverable.

### Example

This example uses the **HelpContext** property of the **Err** object to show the Help topic for the `Overflow` error.

```tb
Dim msg As String
Err.Clear
On Error Resume Next
Err.Raise 6                     ' Generate "Overflow" error.
If Err.Number <> 0 Then
    msg = "Press F1 or HELP to see " & Err.HelpFile & " topic for" & _
          " the following HelpContext: " & Err.HelpContext
    MsgBox msg, , "Error: " & Err.Description, Err.HelpFile, _
           Err.HelpContext
End If
```

### See Also

- [HelpFile](HelpFile) property
- [Number](Number) property
- [Raise](Raise) method
