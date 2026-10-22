---
title: CreateObject
parent: Interaction Module
permalink: /tB/Modules/Interaction/CreateObject
index_also: late binding
redirect_from:
-  /tB/Core/CreateObject
vba_attribution: true
---
# CreateObject
{: .no_toc }

Creates and returns a reference to a new instance of a COM/Automation object.

Syntax: **CreateObject(** *class* [ **,** *servername* ] **)**

*class*
: *required* **Variant** (**String**). The application name and class of the object to create, in the form *appname*.*objecttype* --- for example, `"Excel.Application"`. A CLSID may also be supplied in the form `"new:{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"`.

*servername*
: *optional* **Variant** (**String**). The name of the network server on which to create the object --- the same as the *Machine Name* portion of a UNC share name. For a share named `\\MyServer\Public`, *servername* is `"MyServer"`. If *servername* is omitted or supplied as a zero-length string (`""`), the object is created on the local machine.

To use the returned object, assign it to an object variable. Declaring the variable `As Object` causes late binding (binding occurs at run time); declaring it with a specific class type produces early binding (binding occurs at compile time), which is faster and gives access to IntelliSense for the object's members but limits the variable to that one type.

```tb check_build
Dim ExcelApp As Object
Set ExcelApp = CreateObject("Excel.Application")
ExcelApp.Visible = True
```

If an object has registered itself as single-instance, only one instance is ever created, no matter how many times **CreateObject** is invoked.

> [!NOTE]
> **CreateObject** obtains a new instance of the object. [**GetObject**](GetObject) attaches to an *already-running* instance --- or starts the object's application with a particular file loaded.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147221020 (`&H800401E4`)](tb:Errors#-2147221020), *Invalid syntax* | *class* is not a registered class name, such as a number, or a CLSID in braces without `new:` |
| [-2147221164 (`&H80040154`)](tb:Errors#-2147221164), *Class not registered* | *class* is `new:` with a CLSID that is not registered |
| [-2147221005 (`&H800401F3`)](tb:Errors#-2147221005), *Invalid class string* | *class* is `new:` followed by text that is not a CLSID |
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *class* is a zero-length string |
| [-2147023174 (`&H800706BA`)](tb:Errors#-2147023174), *The RPC server is unavailable.* | *servername* names a computer that cannot be reached |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *class* or *servername* is **Null** |

> [!NOTE] BETA 1010
> When *class* is not a registered class name, such as a number, or a CLSID in braces without `new:`, VB6 and 64-bit VBA raise error [429 (`&H1AD`)](tb:Errors#429), *ActiveX component can't create object*, instead.

> [!NOTE] BETA 1010
> When *class* is `new:` with a CLSID that is not registered, VB6 and 64-bit VBA raise error [429 (`&H1AD`)](tb:Errors#429), *ActiveX component can't create object*, instead.

> [!NOTE] BETA 1010
> When *class* is `new:` followed by text that is not a CLSID, VB6 and 64-bit VBA raise error [429 (`&H1AD`)](tb:Errors#429), *ActiveX component can't create object*, instead.

> [!NOTE] BETA 1010
> When *class* is a zero-length string, VB6 and 64-bit VBA raise error [429 (`&H1AD`)](tb:Errors#429), *ActiveX component can't create object*, instead.

<!-- /errors -->

### Example

This example creates a Microsoft Excel **Application** object, makes it visible, and then closes it via **Quit**, releasing the reference at the end.

```tb check_build
Dim XlApp As Object
Set XlApp = CreateObject("Excel.Application")
XlApp.Visible = True
' ... work with Excel through XlApp ...
XlApp.Quit
Set XlApp = Nothing
```

### See Also

- [GetObject](GetObject) function
