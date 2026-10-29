---
title: HelpFile
parent: ErrObject
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

Write routines to handle typical errors. When programming with an object, the object's Help file can improve error handling or display a meaningful message to the user when an error isn't recoverable.

<!-- bug: err-helpfile-helpcontext-codegen -->
> [!NOTE] BETA 1010
> A statement that assigns **HelpFile**, such as `Err.HelpFile = "MyHelp.chm"`, compiles, but the build fails with a code-generation error in the procedure that holds it. [**Raise**](Raise) sets **HelpFile** without the problem, and so does an assignment through a variable declared **As Object** that holds **Err**.

### Example

This example uses the **HelpFile** property of the **Err** object to start the Help system.

```tb check_build
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
