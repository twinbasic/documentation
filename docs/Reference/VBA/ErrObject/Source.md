---
title: Source
parent: ErrObject
permalink: /tB/Modules/ErrObject/Source
vba_attribution: true
---
# Source
{: .no_toc }

Returns or sets a **String** specifying the name of the object or application that originally generated the error. Read/write.

Syntax:
- **Err**.**Source**
- **Err**.**Source** **=** *errorSource*

*errorSource*
: A **String** identifying the source of the error. When read, **Source** returns the source for the active error, or a zero-length string if no error is active.

The **Source** property holds a string representing the object that generated the error; the expression is usually the object's class name or programmatic ID.

Use **Source** to provide information when your code is unable to handle an error generated in an accessed object. For example, if you call into an Automation server and it raises a `Division by zero` error, the server sets **Err.Number** to its error code for that error and sets **Source** to its programmatic ID.

When generating an error from your own code, **Source** is your application's programmatic ID. For class modules, **Source** should contain a name in the form *project.class*.

When an unexpected error occurs in your code, the **Source** property is automatically filled in. For errors in a standard module, **Source** contains the project name. For errors in a class module, **Source** contains a name in *project.class* form.

### Example

This example assigns the programmatic ID of an Automation object to the variable `myObjectID`, and then assigns that to the **Source** property of the **Err** object when it generates an error with the [**Raise**](Raise) method.

When handling errors, you should not rely on the **Source** property (or any **Err** properties other than [**Number**](Number)) for control flow. The intended use of properties other than **Number** is to display detailed information to an end user when you can't handle an error.

```tb
Dim myObjectID As String, myHelpFile As String, myHelpContext As Long
myObjectID = "MyApp.MyClass"
Err.Raise Number:=vbObjectError + 894, Source:=myObjectID, _
          Description:="Was not able to complete your task", _
          HelpFile:=myHelpFile, HelpContext:=myHelpContext
```

### See Also

- [Number](Number) property
- [Description](Description) property
- [Raise](Raise) method
- [Clear](Clear) method
