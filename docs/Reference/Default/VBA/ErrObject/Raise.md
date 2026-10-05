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
: *required* A **Long** that identifies the nature of the error. Built-in errors fall in the range 0--65535; the range 0--512 is reserved for system errors and 513--65535 is available for user-defined errors. When raising a user-defined error from a class module, add the chosen number to the [**vbObjectError**](../Constants/#vbObjectError) constant --- for example, `vbObjectError + 513`.

*source*
: *optional* A **String** naming the object or application that generated the error. When setting the [**Source**](Source) property for an object, use the form *project.class*. If *source* is not specified, [**Source**](Source) is an empty string.

*description*
: *optional* A **String** describing the error. If unspecified, [**Description**](Description) is chosen from *number*, as the table below shows.

*helpfile*
: *optional* The fully qualified path to the Help file in which help on this error can be found. If unspecified, the [**HelpFile**](HelpFile) property is cleared.

*helpcontext*
: *optional* The context ID identifying a topic within *helpfile* that provides help for the error. If omitted, the [**HelpContext**](HelpContext) property is cleared.

All of the arguments are optional except *number*. An omitted argument is never taken from an earlier error: each call to **Raise** sets all five properties of the **Err** object, and the ones it is not given are empty or 0.

When *description* is omitted, **Description** depends on *number*:

| *number* | **Description** |
|----------|-----------------|
| has a built-in run-time error message, such as 5 or 11 | the text that the [**Error**](../Conversion/Error) function returns for it, such as `Invalid procedure call or argument` |
| from 1 to 746 and has no built-in message, such as 1, 95, 99 or 513 | an empty string |
| 747 or more | the Windows system message for that number when there is one, as for 1001 (`Recursion too deep; the stack overflowed.`), and otherwise `Automation error` |
| negative | the Windows system message for that value as an **HRESULT** when there is one, and otherwise `Automation error` |

A *description* of an empty string gives an empty **Description** for every number. The system messages are in the language of the system and differ between Windows versions; `Automation error` is the only text of the table that does not come from the system. A number above 65535 is accepted.

When the error is raised in a method of a class and the caller handles it, an empty **Description** reaches the caller as `Application-defined or object-defined error`. The other texts arrive unchanged.

> [!WARNING]
> BETA 997 has a defect: **Raise** differs from VBA and VB6 in three ways, and none of them raises an error. Without *source*, VBA sets **Source** to the name of the project, and twinBASIC leaves it empty. Without *description*, VBA gives every number that has no built-in message the text `Application-defined or object-defined error`, from 1 up to 65535, and twinBASIC gives an empty string or one of the texts above. And an omitted argument keeps the value left by an earlier error in VBA, and is reset in twinBASIC. A program that relies on **Err.Source** being the project name, or on **Err.Description** being non-empty, has to pass those arguments.

**Raise** is preferred over the [**Error**](../../Core/Error) statement when generating run-time errors, particularly inside class modules: the **Err** object holds richer information than the **Error** statement can supply. With **Raise** the source that generated the error can be specified in the [**Source**](Source) property, online Help for the error can be referenced through [**HelpFile**](HelpFile) and [**HelpContext**](HelpContext), and so on.

### Example

This example uses the **Raise** method of the **Err** object to generate an error from inside an Automation object with the programmatic ID `MyProj.MyObject`.

```tb check_build
Const MyContextID As Long = 1010407    ' Define a constant for the contextID.

Function TestName(ByVal CurrentName As String, ByVal NewName As String)
    If InStr(NewName, "bob") Then    ' Test the validity of NewName.
        Err.Raise vbObjectError + 513, "MyProj.MyObject", _
                  "No ""bob"" allowed in your name", _
                  "C:\MyProj\MyHelp.chm", MyContextID
    End If
End Function
```

This example raises errors without a source or a description, and prints what **Err** holds for each:

```tb check_run
On Error Resume Next
Err.Raise 5
Debug.Print "[" & Err.Source & "] [" & Err.Description & "]"   ' [] [Invalid procedure call or argument]
Err.Raise 513
Debug.Print "[" & Err.Source & "] [" & Err.Description & "]"   ' [] []
Err.Raise 1000
Debug.Print "[" & Err.Source & "] [" & Err.Description & "]"   ' [] [Automation error]
Err.Raise 1000, "MyProj.MyObject", "Out of paper"
Debug.Print "[" & Err.Source & "] [" & Err.Description & "]"   ' [MyProj.MyObject] [Out of paper]
```

### See Also

- [Number](Number) property
- [Source](Source) property
- [Description](Description) property
- [HelpFile](HelpFile) property
- [HelpContext](HelpContext) property
- [Clear](Clear) method
- [Error](../../Core/Error) statement
