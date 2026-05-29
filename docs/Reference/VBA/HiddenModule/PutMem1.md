---
title: PutMem1
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/PutMem1
---
# PutMem1
{: .no_toc }

Writes one byte to a memory address.

Syntax: **PutMem1** *Address* **,** *Value*

*Address*
: *required* **LongPtr**. The address to write to.

*Value*
: *required* **Byte**. The byte to store at *Address*.

The address is written directly with no bounds or alignment check. Writing to an address that does not belong to the process, or one that points into read-only memory, will crash the host.

### Example

This example writes a single byte to a buffer and reads it back.

```tb
Dim buf As LongPtr = AllocMem(4)
PutMem1 buf, &HFF
Dim b As Byte
GetMem1 buf, b          ' b = &HFF
FreeMem buf
```

### See Also

- [PutMem2](PutMem2), [PutMem4](PutMem4), [PutMem8](PutMem8), [PutMemPtr](PutMemPtr) procedures
- [GetMem1](GetMem1) procedure
