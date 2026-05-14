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

### See Also

- [GetMem1](GetMem1), [GetMem2](GetMem2), [GetMem8](GetMem8), [GetMemPtr](GetMemPtr) procedures
- [PutMem4](PutMem4) procedure
