---
title: vbaCopyBytesZero
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaCopyBytesZero
---
# vbaCopyBytesZero
{: .no_toc }

Copies a block of bytes from one address to another, then zeroes the source bytes.

Syntax: **vbaCopyBytesZero(** *Length* **,** *Dest* **,** *Src* **)** **As LongPtr**

*Length*
: *required* **Long**. The number of bytes to copy.

*Dest*
: *required* **LongPtr**. The destination address.

*Src*
: *required* **LongPtr**. The source address. The *Length* bytes starting at *Src* are written with zero after the copy completes.

Equivalent to a [**vbaCopyBytes**](vbaCopyBytes) followed by a memory clear of the source. Useful when moving an owning resource (a BSTR, an interface pointer) without leaving a duplicate behind. The return value is *Dest*.

### Example

This example copies four bytes from one buffer to another, then confirms the source is zeroed.

```tb
Dim src As LongPtr = AllocMem(8)
Dim dst As LongPtr = AllocMem(8)
PutMem4 src, &H12345678
vbaCopyBytesZero 4, dst, src    ' copy; src bytes are zeroed
Dim v As Long
GetMem4 dst, v                  ' v = &H12345678
GetMem4 src, v                  ' v = 0  (source was cleared)
FreeMem src
FreeMem dst
```

### See Also

- [vbaCopyBytes](vbaCopyBytes) function
