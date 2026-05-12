---
title: HelpFile
parent: ErrObject Module
permalink: /tB/Modules/ErrObject/HelpFile
vba_attribution: true
---
# HelpFile
{: .no_toc }

Returns or sets a **String** with the fully qualified path to a Help file associated with the active error. Read/write.

Syntax:
- **Err**.**HelpFile**
- **Err**.**HelpFile** **=** *helpFilePath*

*helpFilePath*
: A **String** with the fully qualified path of the Help file (typically a `.chm` file or a URL) to associate with the active error.

If a Help file is specified in **HelpFile**, it is automatically called when the user presses the **Help** button (or **F1**) in the error message dialog box. If the [**HelpContext**](HelpContext) property contains a valid context ID for the specified file, that topic is displayed automatically.

> [!NOTE]
>
> Write routines in your application to handle typical errors. When programming with an object, you can use the object's Help file to improve the quality of your error handling, or to display a meaningful message to the user when an error isn't recoverable.

### Example

This example uses the **HelpFile** property of the **Err** object to start the Help system.

```tb
Dim msg As String
Err.Clear
On Error Resume Next            ' Suppress errors for demonstration purposes.
Err.Raise 6                     ' Generate "Overflow" error.
msg = "Press F1 or HELP to see " & Err.HelpFile & _
      " topic for this error."
MsgBox msg, , "Error: " & Err.Description, Err.HelpFile
```

### See Also

- [HelpContext](HelpContext) property
- [Number](Number) property
- [Raise](Raise) method
