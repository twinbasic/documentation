---
title: FreeMem
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/FreeMem
---
# FreeMem
{: .no_toc }

Releases a block of memory previously obtained from [**AllocMem**](AllocMem).

Syntax: **FreeMem** *MemPointer*

*MemPointer*
: *required* **LongPtr**. The address returned by a previous call to [**AllocMem**](AllocMem).

The pointer is invalid after the call returns. Passing a pointer that did not come from **AllocMem** --- including zero, or one that has already been freed --- has undefined behaviour.

### Example

This example allocates a buffer, uses it, and then releases it with **FreeMem**.

```tb
Dim buf As LongPtr = AllocMem(256)
' ... write and read buf ...
FreeMem buf    ' release the block; buf is invalid after this point
```

### See Also

- [AllocMem](AllocMem) function
