---
title: vbaCastObj
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaCastObj
---
# vbaCastObj
{: .no_toc }

Returns an object reinterpreted as another COM interface, given its IID.

Syntax: **vbaCastObj(** *Obj* **,** *IID* **)** **As IUnknown**

*Obj*
: *required* **stdole.IUnknown**. The object to cast.

*IID*
: *required* **Any**. The address of the interface ID to query for: a 16-byte **GUID** structure, its address given with [**VarPtr**](../Information/VarPtr).

A direct wrapper over **IUnknown::QueryInterface**, as VB6's runtime function `__vbaCastObj` is: the object is asked whether it implements the requested interface, and if so a reference to that interface is returned. If not, error 13, *Type mismatch*, is raised. If *Obj* is **Nothing**, the result is **Nothing**.

*IID* is read as the address of a **GUID**. A **String** is not converted: its text is not an interface ID, as `"{00000000-0000-0000-C000-000000000046}"` is not. A **GUID** variable passed itself, rather than its address, ends a 32-bit program with an access violation.

<!-- bug: vbacastobj-no-type-mismatch -->
> [!WARNING] BETA 1010
> **vbaCastObj** raises no error when *Obj* does not have the interface, or when *IID* is a **String**: it returns **Nothing**.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [424 (`&H1A8`)](tb:Errors#424), *Object required* | *Obj* is **Null** |

> [!NOTE] BETA 1010
> When *Obj* does not have the interface *IID* names, or *IID* is a **String**, whose text is not read as an interface ID, VB6 raises error [13 (`&HD`)](tb:Errors#13), *Type mismatch*; twinBASIC raises none.

<!-- /errors -->

### Example

This example asks an object for **IPicture**, whose interface ID is `{7BF80980-BF32-101A-8BBB-00AA00300CAB}`.

```tb check_build
Private Type InterfaceGuid
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type

Function AsPicture(ByVal Obj As Object) As IUnknown
    Dim Iid As InterfaceGuid
    Iid.Data1 = &H7BF80980
    Iid.Data2 = &HBF32
    Iid.Data3 = &H101A
    Iid.Data4(0) = &H8B: Iid.Data4(1) = &HBB: Iid.Data4(2) = &H00: Iid.Data4(3) = &HAA
    Iid.Data4(4) = &H00: Iid.Data4(5) = &H30: Iid.Data4(6) = &H0C: Iid.Data4(7) = &HAB
    Set AsPicture = vbaCastObj(Obj, VarPtr(Iid))    ' error 13 if Obj is not a picture
End Function
```

### See Also

- [ObjPtr](ObjPtr) function
- [CreateGUID](CreateGUID) function
