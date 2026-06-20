---
title: vbaObjSet
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaObjSet
---
# vbaObjSet
{: .no_toc }

Assigns a raw object pointer to an **Object** variable, taking ownership of the existing reference without addrefing.

Syntax: **vbaObjSet(** *DstObject* **,** *SrcObjPtr* **)** **As LongPtr**

*DstObject*
: *required* **IUnknown**. The variable to receive the pointer. Any prior reference is released.

*SrcObjPtr*
: *required* **LongPtr**. The pointer to the COM object that *DstObject* should refer to. The pointer's existing reference count is **not** incremented.

This is the move-without-addref primitive --- used to wrap a freshly-handed-out raw pointer (from a Win32 `IUnknown**` out-parameter, for example) into an **Object** variable without leaking a reference.

The return value mirrors the assigned pointer.

### See Also

- [vbaObjSetAddref](vbaObjSetAddref) function -- copy-with-addref counterpart
- [vbaObjAddref](vbaObjAddref) procedure
- [ObjPtr](ObjPtr) function
