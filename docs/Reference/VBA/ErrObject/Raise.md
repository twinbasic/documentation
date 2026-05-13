---
title: Raise
parent: ErrObject
permalink: /tB/Modules/ErrObject/Raise
vba_attribution: true
---
# Raise
{: .no_toc }

Generates a run-time error.

Syntax: **Err**.**Raise** *number* [ **,** *source* [ **,** *description* [ **,** *helpfile* [ **,** *helpcontext* ] ] ] ]

*number*
: *required* A **Long** that identifies the nature of the error. Built-in errors fall in the range 0–65535; the range 0–512 is reserved for system errors and 513–65535 is available for user-defined errors. When raising a user-defined error from a class module, add the chosen number to the [**vbObjectError**](../Constants/#vbObjectError) constant — for example, `vbObjectError + 513`.

*source*
: *optional* A **String** naming the object or application that generated the error. When setting the [**Source**](Source) property for an object, use the form *project.class*. If *source* is not specified, the programmatic ID of the current twinBASIC project is used.

*description*
: *optional* A **String** describing the error. If unspecified, the value in *number* is examined; if it can be mapped to a built-in run-time error code, the string that would be returned by the [**Error**](../Conversion/Error) function is used as the [**Description**](Description). If there is no matching built-in error, the message `Application-defined or object-defined error` is used.

*helpfile*
: *optional* The fully qualified path to the Help file in which help on this error can be found. If unspecified, the [**HelpFile**](HelpFile) property is cleared.

*helpcontext*
: *optional* The context ID identifying a topic within *helpfile* that provides help for the error. If omitted, the [**HelpContext**](HelpContext) property is cleared.

All of the arguments are optional except *number*. If you call **Raise** without specifying some arguments, and the corresponding properties of the **Err** object still hold values from an earlier error, those values serve as the values for your error.

**Raise** is preferred over the [**Error**](../../Core/Error) statement when generating run-time errors, particularly inside class modules: the **Err** object carries richer information than the **Error** statement can supply. With **Raise** the source that generated the error can be specified in the [**Source**](Source) property, online Help for the error can be referenced through [**HelpFile**](HelpFile) and [**HelpContext**](HelpContext), and so on.

### Example

This example uses the **Raise** method of the **Err** object to generate an error from inside an Automation object with the programmatic ID `MyProj.MyObject`.

```tb
Const MyContextID As Long = 1010407    ' Define a constant for the contextID.

Function TestName(ByVal CurrentName As String, ByVal NewName As String)
    If InStr(NewName, "bob") Then    ' Test the validity of NewName.
        Err.Raise vbObjectError + 513, "MyProj.MyObject", _
                  "No ""bob"" allowed in your name", _
                  "C:\MyProj\MyHelp.chm", MyContextID
    End If
End Function
```

### See Also

- [Number](Number) property
- [Source](Source) property
- [Description](Description) property
- [HelpFile](HelpFile) property
- [HelpContext](HelpContext) property
- [Clear](Clear) method
- [Error](../../Core/Error) statement
