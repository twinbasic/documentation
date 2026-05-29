---
title: PutMemPtr
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/PutMemPtr
---
# PutMemPtr
{: .no_toc }

Writes a pointer-sized value to a memory address.

Syntax: **PutMemPtr** *Address* **,** *Value*

*Address*
: *required* **LongPtr**. The address to write to.

*Value*
: *required* **LongPtr**. The pointer-sized value to store at *Address*.

The number of bytes written matches the host's pointer width --- four bytes in 32-bit builds, eight bytes in 64-bit builds. The bytes are written in the host's native byte order. The address is written directly with no bounds or alignment check.

### Example

This example stores a pointer in a buffer and reads it back.

```tb
Dim buf As LongPtr = AllocMem(8)    ' large enough for a pointer on any platform
Dim target As Long = 42
PutMemPtr buf, VarPtr(target)       ' store the address of target
Dim p As LongPtr
GetMemPtr buf, p                    ' p = address of target
FreeMem buf
```

### See Also

- [PutMem1](PutMem1), [PutMem2](PutMem2), [PutMem4](PutMem4), [PutMem8](PutMem8) procedures
- [GetMemPtr](GetMemPtr) procedure
