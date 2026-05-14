---
title: CreateObject
parent: Interaction Module
permalink: /tB/Modules/Interaction/CreateObject
redirect_from:
-  /tB/Core/CreateObject
vba_attribution: true
---
# CreateObject
{: .no_toc }

Creates and returns a reference to a new instance of a COM/Automation object.

Syntax: **CreateObject(** *class* [ **,** *servername* ] **)**

*class*
: *required* **Variant** (**String**). The application name and class of the object to create, in the form *appname*.*objecttype* — for example, `"Excel.Application"`. A CLSID may also be supplied in the form `"new:{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"`.

*servername*
: *optional* **Variant** (**String**). The name of the network server on which to create the object — the same as the *Machine Name* portion of a UNC share name. For a share named `\\MyServer\Public`, *servername* is `"MyServer"`. If *servername* is omitted or supplied as a zero-length string (`""`), the object is created on the local machine.

To use the returned object, assign it to an object variable. Declaring the variable `As Object` causes late binding (binding occurs at run time); declaring it with a specific class type produces early binding (binding occurs at compile time), which is faster and gives access to IntelliSense for the object's members but limits the variable to that one type.

```tb
Dim ExcelApp As Object
Set ExcelApp = CreateObject("Excel.Application")
ExcelApp.Visible = True
```

If a remote *servername* is supplied but the remote machine doesn't exist or is unreachable, a run-time error occurs. If an object has registered itself as single-instance, only one instance is ever created, no matter how many times **CreateObject** is invoked.

> [!NOTE]
> Use **CreateObject** to obtain a new instance of the object. To attach to an *already-running* instance — or to start the object's application with a particular file loaded — use [**GetObject**](GetObject) instead.

### Example

This example creates a Microsoft Excel **Application** object, makes it visible, and then closes it via **Quit**, releasing the reference at the end.

```tb
Dim XlApp As Object
Set XlApp = CreateObject("Excel.Application")
XlApp.Visible = True
' ... work with Excel through XlApp ...
XlApp.Quit
Set XlApp = Nothing
```

### See Also

- [GetObject](GetObject) function
