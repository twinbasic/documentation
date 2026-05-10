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

### See Also

- [vbaCopyBytes](vbaCopyBytes) function
