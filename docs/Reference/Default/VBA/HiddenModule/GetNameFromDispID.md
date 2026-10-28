---
title: GetNameFromDispID
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetNameFromDispID
---
# GetNameFromDispID, ShowPropertyPageEditor
{: .no_toc }

Look up a member's name from its dispatch ID, and show the property page that edits one property of an object.

Both procedures are declared **Hidden** and **Restricted**, so IntelliSense lists leave them out. They exist for twinBASIC's own packages, which call them while hosting property pages; ordinary code does not need them.

## GetNameFromDispID

Returns the name of the member of an object that has a given dispatch ID.

Syntax: **GetNameFromDispID(** *Object*, *DispID* **)** **As String**

*Object*
: *required* An object that exposes type information. An **IUnknown** parameter, so any object reference is accepted.

*DispID*
: *required* **Long**. The dispatch ID (DISPID) of a member of *Object*.

The name comes from the object's type information. `GetNameFromDispID(x, 0)` is the name of the default member and `-4` that of the enumerator member, when the object has them.

```tb check_run
Dim Table As Object = CreateObject("Scripting.Dictionary")
Debug.Print GetNameFromDispID(Table, 0)     ' Item
Debug.Print GetNameFromDispID(Table, 2)     ' Count
Debug.Print GetNameFromDispID(Table, -4)    ' _NewEnum
```

The call raises an error when no name can be returned; [Common Errors](#common-errors) lists them. For an object of a class that twinBASIC compiles, a *DispID* that is no member's raises error 5, *Invalid procedure call or argument*, and -4 raises -2147319765, *Element not found.*, when the class has no enumerator member.

The **VB** package's **PropertyPage** calls it when the property sheet asks a page to edit a property by dispatch ID, to find the property's name.

## ShowPropertyPageEditor

Shows the property page that edits one property of a control.

Syntax: **ShowPropertyPageEditor** *Caption*, *Object*, *DispID*

*Caption*
: *required* **String**. The title of the page.

*Object*
: *required* An **IUnknown** reference to the control whose property is edited.

*DispID*
: *required* **Long**. The dispatch ID of the property to edit.

The **VB** package's ActiveX control host calls it with the control's name, the control's object and the property's dispatch ID, when it is asked to edit a property that is linked to a property page. The call that shows all of a control's property pages at once is the hidden **ShowPropertyPages**.

```tb check_build
Sub EditProperty(ByVal Control As Object, ByVal PropertyDispId As Long)
    ShowPropertyPageEditor "Properties", Control, PropertyDispId
End Sub
```

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467261 (`&H80004003`)](tb:Errors#-2147467261), *Invalid pointer* | *Object* is **Nothing** |
| [-2147467263 (`&H80004001`)](tb:Errors#-2147467263), *Not implemented* | **GetNameFromDispID** is given an object that has no type information, such as a **Collection** |
| [-2147467262 (`&H80004002`)](tb:Errors#-2147467262), *No such interface supported* | **GetNameFromDispID** is given an object that does not support **IDispatch**, such as a **TbExpressionService**<br>**ShowPropertyPageEditor** is given an object that has no property pages |
| [-2147319765 (`&H8002802B`)](tb:Errors#-2147319765), *Element not found.* | **GetNameFromDispID** is given an object described by a type library, such as a **Scripting.Dictionary**, and a *DispID* that is no member's |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *Caption* or *DispID* is **Null** |
| [424 (`&H1A8`)](tb:Errors#424), *Object required* | *Object* is **Null** |

<!-- /errors -->

### See Also

- [PropertyPage](../../Packages/VB/PropertyPage/) class
- [AddClassInstanceFlag](AddClassInstanceFlag) procedure
