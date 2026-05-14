---
title: GetMemPtr
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetMemPtr
---
# GetMemPtr
{: .no_toc }

Reads a pointer-sized value from a memory address into a **LongPtr** variable.

Syntax: **GetMemPtr** *Address* **,** *retVal*

*Address*
: *required* **LongPtr**. The address to read from.

*retVal*
: *required* **LongPtr**. The variable to receive the pointer-sized value read from *Address*.

The number of bytes read matches the host's pointer width --- four bytes in 32-bit builds, eight bytes in 64-bit builds. The bytes are interpreted in the host's native byte order. The address is read directly with no bounds or alignment check.

### Example

```tb
' Read the IUnknown vtable pointer of a Collection instance.
Dim c As Collection = New Collection
Dim vtbl As LongPtr
GetMemPtr ObjPtr(c), vtbl
Debug.Print "vtable at "; Hex(vtbl)
```

### See Also

- [GetMem1](GetMem1), [GetMem2](GetMem2), [GetMem4](GetMem4), [GetMem8](GetMem8) procedures
- [PutMemPtr](PutMemPtr) procedure
