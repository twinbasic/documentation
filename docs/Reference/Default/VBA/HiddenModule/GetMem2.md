---
title: GetMem2
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetMem2
---
# GetMem2
{: .no_toc }

Reads two bytes from a memory address into an **Integer** variable.

Syntax: **GetMem2** *Address* **,** *retVal*

*Address*
: *required* **LongPtr**. The address to read from.

*retVal*
: *required* **Integer**. The variable to receive the value read from *Address*.

The bytes are interpreted in the host's native byte order --- little-endian on x86 and x64. The address is read directly with no bounds or alignment check.

### Example

This example writes a 16-bit value to a buffer and reads it back with **GetMem2**.

```tb
Dim buf As LongPtr = AllocMem(4)
PutMem2 buf, &H1234
Dim v As Integer
GetMem2 buf, v          ' v = &H1234
FreeMem buf
```

### See Also

- [GetMem1](GetMem1), [GetMem4](GetMem4), [GetMem8](GetMem8), [GetMemPtr](GetMemPtr) procedures
- [PutMem2](PutMem2) procedure
