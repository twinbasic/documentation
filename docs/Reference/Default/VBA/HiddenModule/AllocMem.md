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

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147024882 (`&H8007000E`)](tb:Errors#-2147024882), *Not enough memory resources are available to complete this operation.* | *BytesToAlloc* is 0 or less<br>in a 32-bit build, there is not enough memory for the block (2,000,000,000 bytes, for one) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *BytesToAlloc* is **Null** |

<!-- /errors -->

### Example

```tb check_build
Dim Buffer As LongPtr = AllocMem(1024)
PutMem4 Buffer, &HDEADBEEF
'... use Buffer ...
FreeMem Buffer
```

### See Also

- [FreeMem](FreeMem) procedure
- [vbaCopyBytes](vbaCopyBytes) function
