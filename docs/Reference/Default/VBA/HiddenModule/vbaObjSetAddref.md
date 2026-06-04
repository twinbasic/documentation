---
title: vbaObjSetAddref
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaObjSetAddref
---
# vbaObjSetAddref
{: .no_toc }

Assigns a raw object pointer to an **Object** variable, addrefing the new pointer and releasing any prior reference.

Syntax: **vbaObjSetAddref(** *DstObject* **,** *SrcObjPtr* **)** **As LongPtr**

*DstObject*
: *required* **IUnknown**. The variable to receive the pointer. Any prior reference is released.

*SrcObjPtr*
: *required* **LongPtr**. The pointer to the COM object that *DstObject* should refer to. **IUnknown::AddRef** is called on the pointer.

This is the copy-with-addref primitive --- equivalent to a regular `Set DstObject = obj` when *obj* is held only as a raw **LongPtr**.

The return value mirrors the assigned pointer.

### See Also

- [vbaObjSet](vbaObjSet) function -- move-without-addref counterpart
- [vbaObjAddref](vbaObjAddref) procedure
- [ObjPtr](ObjPtr) function
