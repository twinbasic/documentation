---
title: vbaObjAddref
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaObjAddref
---
# vbaObjAddref
{: .no_toc }

Calls **IUnknown::AddRef** on the COM object at a given address.

Syntax: **vbaObjAddref** *Address*

*Address*
: *required* **LongPtr**. The address of an **IUnknown**-derived COM object — typically the value returned by [**ObjPtr**](ObjPtr).

The reference count of the object is incremented by one. The runtime does not validate that *Address* points at a real COM object; an invalid pointer will crash the host.

This is a low-level primitive. Ordinary code does not need it — assigning to an **Object** variable already addrefs.

### See Also

- [vbaObjSet](vbaObjSet) function
- [vbaObjSetAddref](vbaObjSetAddref) function
- [ObjPtr](ObjPtr) function
