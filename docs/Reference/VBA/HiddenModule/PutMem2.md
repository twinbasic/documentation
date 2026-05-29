---
title: PutMem2
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/PutMem2
---
# PutMem2
{: .no_toc }

Writes two bytes to a memory address.

Syntax: **PutMem2** *Address* **,** *Value*

*Address*
: *required* **LongPtr**. The address to write to.

*Value*
: *required* **Integer**. The 16-bit value to store at *Address*.

The bytes are written in the host's native byte order --- little-endian on x86 and x64. The address is written directly with no bounds or alignment check.

### Example

This example writes a 16-bit value to a buffer and reads it back.

```tb
Dim buf As LongPtr = AllocMem(4)
PutMem2 buf, &H1234
Dim v As Integer
GetMem2 buf, v          ' v = &H1234
FreeMem buf
```

### See Also

- [PutMem1](PutMem1), [PutMem4](PutMem4), [PutMem8](PutMem8), [PutMemPtr](PutMemPtr) procedures
- [GetMem2](GetMem2) procedure
