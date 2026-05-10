---
title: GetMem8
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetMem8
---
# GetMem8
{: .no_toc }

Reads eight bytes from a memory address into a **Currency** variable.

Syntax: **GetMem8** *Address* **,** *retVal*

*Address*
: *required* **LongPtr**. The address to read from.

*retVal*
: *required* **Currency**. The variable to receive the bytes read from *Address*.

**Currency** is the convenient eight-byte signed-integer carrier used by these primitives because of its in-memory representation; the resulting bits are the raw 64-bit pattern stored at *Address*, scaled by the **Currency** type's fixed factor of 10000 only at the point of arithmetic. To work with the bits as an unscaled 64-bit integer, [**LSet**](../../Core/LSet) the **Currency** value into a **LongLong** variable.

The address is read directly with no bounds or alignment check.

### See Also

- [GetMem1](GetMem1), [GetMem2](GetMem2), [GetMem4](GetMem4), [GetMemPtr](GetMemPtr) procedures
- [PutMem8](PutMem8) procedure
