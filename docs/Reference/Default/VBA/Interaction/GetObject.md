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

Returns a reference to a COM/Automation object --- either an already-running instance, or one bound to a file.

Syntax: **GetObject(** [ *pathname* ] [ **,** *class* ] **)**

*pathname*
: *optional* **Variant** (**String**). The full path and name of a file containing the object to retrieve. If *pathname* is omitted, *class* is required.

*class*
: *optional* **Variant** (**String**). The class of the object to retrieve, in the form *appname*.*objecttype* --- for example, `"Excel.Application"`.

To assign the returned reference to a variable, use **Set**:

```tb check_build
Dim CADObject As Object
Set CADObject = GetObject("C:\CAD\SCHEMA.CAD")
```

When the call is made with a *pathname*, the application registered for that file is started (if it isn't already running), and the object inside the file is activated.

If *pathname* is a zero-length string (`""`), **GetObject** returns a *new* instance of the type named by *class*. If *pathname* is omitted altogether, **GetObject** attempts to attach to a *currently running* instance of the type named by *class*.

Some applications support activating a *part* of a file. Append `!` and an application-specific identifier to the file name --- for example, the third layer of a CAD drawing:

```tb check_build
Dim LayerObject As Object
Set LayerObject = GetObject("C:\CAD\SCHEMA.CAD!Layer3")
```

When *class* is not specified, the operating system determines the application to start and the object to activate based on the supplied file name. Some files, however, may support more than one class of object. To be specific, supply both arguments:

```tb check_build
Dim MyObject As Object
Set MyObject = GetObject("C:\Drawings\Sample.drw", "Figment.Drawing")
```

> [!NOTE]
> **GetObject** attaches to a current instance of the object, or creates the object with a file already loaded. When there is no current instance and the object should not be started with a file loaded, [**CreateObject**](CreateObject) creates a new instance.

For an object registered as single-instance, **GetObject** with the zero-length-string syntax always returns the same instance, and the form with *pathname* omitted causes an error.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147221014 (`&H800401EA`)](tb:Errors#-2147221014), *Moniker cannot open file* | *pathname* names a file that does not exist, and *class* is omitted |
| [-2147467262 (`&H80004002`)](tb:Errors#-2147467262), *No such interface supported* | *pathname* names a file that does not exist, and *class* is given |
| [-2147221005 (`&H800401F3`)](tb:Errors#-2147221005), *Invalid class string* | *class* is not a registered class name |
| [-2147221021 (`&H800401E3`)](tb:Errors#-2147221021), *Operation unavailable* | *pathname* is omitted and no instance of *class* is running |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | both arguments are omitted |
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *pathname* is a zero-length string and *class* is omitted |
| [-2147221020 (`&H800401E4`)](tb:Errors#-2147221020), *Invalid syntax* | *pathname* is neither a file name nor a name Windows can bind to an object |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* or *class* is **Null** |

> [!NOTE] BETA 1010
> When *pathname* names a file that does not exist, and *class* is omitted, VB6 and 64-bit VBA raise error [432 (`&H1B0`)](tb:Errors#432), *File name or class name not found during Automation operation*, instead.

> [!NOTE] BETA 1010
> When *pathname* names a file that does not exist, and *class* is given, VB6 and 64-bit VBA raise error [432 (`&H1B0`)](tb:Errors#432), *File name or class name not found during Automation operation*, instead.

> [!NOTE] BETA 1010
> When *class* is not a registered class name, VB6 and 64-bit VBA raise error [429 (`&H1AD`)](tb:Errors#429), *ActiveX component can't create object*, instead.

> [!NOTE] BETA 1010
> When *pathname* is omitted and no instance of *class* is running, VB6 and 64-bit VBA raise error [429 (`&H1AD`)](tb:Errors#429), *ActiveX component can't create object*, instead.

> [!NOTE] BETA 1010
> When both arguments are omitted, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### Example

This example uses **GetObject** to attach to a Microsoft Excel **Worksheet** opened from a file. The first call (without *pathname*) tries to attach to a running Excel; the second call opens the file. If Excel was not already running when the script started, it is closed at the end via **Application.Quit**.

```tb check_build
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
' ... work with the workbook through MyXl ...

If ExcelWasNotRunning Then MyXl.Application.Quit
Set MyXl = Nothing
```

### See Also

- [CreateObject](CreateObject) function
