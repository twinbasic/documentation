---
title: AllocMem
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/AllocMem
---
# AllocMem
{: .no_toc }

Allocates a block of native memory and returns its address.

Syntax: **AllocMem(** *BytesToAlloc* **)** **As LongPtr**

*BytesToAlloc*
: *required* **Long**. The size of the block to allocate, in bytes.

The contents of the new block are unspecified. Release the block with [**FreeMem**](FreeMem) when no longer needed; passing the address to anything else (e.g. a Win32 `HeapFree`) will not work, since the block is owned by the twinBASIC runtime's heap.

If the allocation fails, **AllocMem** raises a run-time error.

### Example

```tb
Dim Buffer As LongPtr = AllocMem(1024)
PutMem4 Buffer, &HDEADBEEF
'... use Buffer ...
FreeMem Buffer
```

### See Also

- [FreeMem](FreeMem) procedure
- [vbaCopyBytes](vbaCopyBytes) function
