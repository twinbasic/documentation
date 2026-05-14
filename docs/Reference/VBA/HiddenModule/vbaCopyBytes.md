---
title: vbaCopyBytes
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaCopyBytes
---
# vbaCopyBytes
{: .no_toc }

Copies a block of bytes from one address to another.

Syntax: **vbaCopyBytes(** *Length* **,** *Dest* **,** *Src* **)** **As LongPtr**

*Length*
: *required* **Long**. The number of bytes to copy.

*Dest*
: *required* **LongPtr**. The destination address.

*Src*
: *required* **LongPtr**. The source address.

The behaviour for overlapping ranges is unspecified --- use a temporary buffer if the ranges may overlap. The return value is *Dest* (the same address that was passed in), provided as a convenience for chaining.

### Example

```tb
Dim src As String = "Hello"
Dim dst(0 To 9) As Byte
vbaCopyBytes 10, VarPtr(dst(0)), StrPtr(src)
```

### See Also

- [vbaCopyBytesZero](vbaCopyBytesZero) function
- [GetMem4](GetMem4), [PutMem4](PutMem4) procedures
