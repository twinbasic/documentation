---
title: PutMem8
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/PutMem8
---
# PutMem8
{: .no_toc }

Writes eight bytes to a memory address.

Syntax: **PutMem8** *Address* **,** *Value*

*Address*
: *required* **LongPtr**. The address to write to.

*Value*
: *required* **Currency**. A **Currency** carrier whose underlying eight bytes are stored at *Address*.

**Currency** is used as the eight-byte carrier — its in-memory representation is a raw 64-bit pattern, scaled by the type's fixed factor of 10000 only at the point of arithmetic. To pack an arbitrary 64-bit integer, [**LSet**](../../Core/LSet) it into a **Currency** before calling **PutMem8**.

The address is written directly with no bounds or alignment check.

### See Also

- [PutMem1](PutMem1), [PutMem2](PutMem2), [PutMem4](PutMem4), [PutMemPtr](PutMemPtr) procedures
- [GetMem8](GetMem8) procedure
