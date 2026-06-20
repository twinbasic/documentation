---
title: PutMem4
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/PutMem4
---
# PutMem4
{: .no_toc }

Writes four bytes to a memory address.

Syntax: **PutMem4** *Address* **,** *Value*

*Address*
: *required* **LongPtr**. The address to write to.

*Value*
: *required* **Long**. The 32-bit value to store at *Address*.

The bytes are written in the host's native byte order --- little-endian on x86 and x64. The address is written directly with no bounds or alignment check.

### Example

This example writes a 32-bit value to a buffer and reads it back.

```tb
Dim buf As LongPtr = AllocMem(4)
PutMem4 buf, &H12345678
Dim v As Long
GetMem4 buf, v          ' v = &H12345678
FreeMem buf
```

### See Also

- [PutMem1](PutMem1), [PutMem2](PutMem2), [PutMem8](PutMem8), [PutMemPtr](PutMemPtr) procedures
- [GetMem4](GetMem4) procedure
