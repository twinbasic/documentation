---
title: GetMem1
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetMem1
---
# GetMem1
{: .no_toc }

Reads one byte from a memory address into a **Byte** variable.

Syntax: **GetMem1** *Address* **,** *retVal*

*Address*
: *required* **LongPtr**. The address to read from.

*retVal*
: *required* **Byte**. The variable to receive the byte read from *Address*.

The address is read directly with no bounds or alignment check. Reading from an address that does not belong to the process, or from one that has been freed, will crash the host.

### Example

```tb
Dim s As String = "ABC"
Dim b As Byte
GetMem1 StrPtr(s), b
Debug.Print b              ' 65 — the low byte of the UTF-16 code unit for "A".
```

### See Also

- [GetMem2](GetMem2), [GetMem4](GetMem4), [GetMem8](GetMem8), [GetMemPtr](GetMemPtr) procedures
- [PutMem1](PutMem1) procedure
