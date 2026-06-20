---
title: vbaCastObj
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaCastObj
---
# vbaCastObj
{: .no_toc }

Returns an object reinterpreted as another COM interface, given its IID, or **Nothing** if the object does not implement that interface.

Syntax: **vbaCastObj(** *Obj* **,** *IID* **)** **As IUnknown**

*Obj*
: *required* **stdole.IUnknown**. The object to cast.

*IID*
: *required* **Any**. The interface ID to query for --- accepted as a 16-byte **GUID** structure or as a **String** in registry format (`{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}`).

A direct wrapper over **IUnknown::QueryInterface**: the object is asked whether it implements the requested interface, and if so a reference to that interface is returned. If not, **Nothing** is returned.

### Example

```tb
Const IID_IPicture As String = "{7BF80980-BF32-101A-8BBB-00AA00300CAB}"

Dim Pic As Object = LoadPicture("logo.bmp")
Dim AsPicture As IUnknown = vbaCastObj(Pic, IID_IPicture)
If Not AsPicture Is Nothing Then
    ' Use AsPicture as an IPicture.
End If
```

### See Also

- [ObjPtr](ObjPtr) function
- [CreateGUID](CreateGUID) function
