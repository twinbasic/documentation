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

The pointer is invalid after the call returns. Passing a pointer that did not come from **AllocMem**, or one that has already been freed, has undefined behaviour. A *MemPointer* of 0 does nothing.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *MemPointer* is **Null** |

<!-- /errors -->

### Example

This example allocates a buffer, uses it, and then releases it with **FreeMem**.

```tb check_build
Dim buf As LongPtr = AllocMem(256)
' ... write and read buf ...
FreeMem buf    ' release the block; buf is invalid after this point
```

### See Also

- [AllocMem](AllocMem) function
