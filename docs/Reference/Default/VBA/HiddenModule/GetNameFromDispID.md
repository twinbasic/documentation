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

The call raises an error when no name can be returned:

| Case | Error |
|------|-------|
| *Object* is **Nothing** | -2147467261, *Invalid pointer* |
| *Object* has no type information (a **Collection**, for one) | -2147467263, *Not implemented* |
| A member of a twinBASIC class has no such ID | 5, *Invalid procedure call or argument* |
| A member of a type-library object, such as a **Scripting.Dictionary**, has no such ID | -2147319765, *Element not found.* |

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

### See Also

- [PropertyPage](../../Packages/VB/PropertyPage/) class
- [AddClassInstanceFlag](AddClassInstanceFlag) procedure
