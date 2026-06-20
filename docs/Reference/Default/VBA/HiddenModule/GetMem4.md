---
title: GetMem4
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetMem4
---
# GetMem4
{: .no_toc }

Reads four bytes from a memory address into a **Long** variable.

Syntax: **GetMem4** *Address* **,** *retVal*

*Address*
: *required* **LongPtr**. The address to read from.

*retVal*
: *required* **Long**. The variable to receive the value read from *Address*.

The bytes are interpreted in the host's native byte order --- little-endian on x86 and x64. The address is read directly with no bounds or alignment check.

### Example

This example writes a 32-bit value to a buffer and reads it back with **GetMem4**.

```tb
Dim buf As LongPtr = AllocMem(4)
PutMem4 buf, &H12345678
Dim v As Long
GetMem4 buf, v          ' v = &H12345678
FreeMem buf
```

### See Also

- [GetMem1](GetMem1), [GetMem2](GetMem2), [GetMem8](GetMem8), [GetMemPtr](GetMemPtr) procedures
- [PutMem4](PutMem4) procedure
