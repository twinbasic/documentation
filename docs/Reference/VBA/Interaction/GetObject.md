---
title: GetObject
parent: Interaction Module
permalink: /tB/Modules/Interaction/GetObject
redirect_from:
-  /tB/Core/GetObject
vba_attribution: true
---
# GetObject
{: .no_toc }

Returns a reference to a COM/Automation object — either an already-running instance, or one bound to a file.

Syntax: **GetObject(** [ *pathname* ] [ **,** *class* ] **)**

*pathname*
: *optional* **Variant** (**String**). The full path and name of a file containing the object to retrieve. If *pathname* is omitted, *class* is required.

*class*
: *optional* **Variant** (**String**). The class of the object to retrieve, in the form *appname*.*objecttype* — for example, `"Excel.Application"`.

To assign the returned reference to a variable, use **Set**:

```tb
Dim CADObject As Object
Set CADObject = GetObject("C:\CAD\SCHEMA.CAD")
```

When the call is made with a *pathname*, the application registered for that file is started (if it isn't already running), and the object inside the file is activated.

If *pathname* is a zero-length string (`""`), **GetObject** returns a *new* instance of the type named by *class*. If *pathname* is omitted altogether, **GetObject** attempts to attach to a *currently running* instance of the type named by *class*; if no such instance exists, a run-time error occurs.

Some applications support activating a *part* of a file. Append `!` and an application-specific identifier to the file name — for example, the third layer of a CAD drawing:

```tb
Set LayerObject = GetObject("C:\CAD\SCHEMA.CAD!Layer3")
```

If you don't specify *class*, the operating system determines the application to start and the object to activate based on the file name you provide. Some files, however, may support more than one class of object. To be specific, supply both arguments:

```tb
Dim MyObject As Object
Set MyObject = GetObject("C:\Drawings\Sample.drw", "Figment.Drawing")
```

> [!NOTE]
> Use **GetObject** when there is already a current instance of the object, or when you want to create the object with a file already loaded. If there is no current instance and you don't want the object started with a file loaded, use [**CreateObject**](CreateObject) instead.

For an object registered as single-instance, **GetObject** with the zero-length-string syntax always returns the same instance, and the form with *pathname* omitted causes an error.

### Example

This example uses **GetObject** to attach to a Microsoft Excel **Worksheet** opened from a file. The first call (without *pathname*) tries to attach to a running Excel; the second call opens the file. If Excel was not already running when the script started, it is closed at the end via **Application.Quit**.

```tb
Dim MyXl As Object
Dim ExcelWasNotRunning As Boolean

On Error Resume Next
Set MyXl = GetObject(, "Excel.Application")
If Err.Number <> 0 Then ExcelWasNotRunning = True
Err.Clear
On Error GoTo 0

Set MyXl = GetObject("C:\Reports\MyTest.xls")
MyXl.Application.Visible = True
MyXl.Parent.Windows(1).Visible = True
' ... drive the workbook through MyXl ...

If ExcelWasNotRunning Then MyXl.Application.Quit
Set MyXl = Nothing
```

### See Also

- [CreateObject](CreateObject) function
