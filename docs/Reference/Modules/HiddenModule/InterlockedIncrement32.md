---
title: InterlockedIncrement32
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/InterlockedIncrement32
---
# InterlockedIncrement32
{: .no_toc }

Atomically increments a 32-bit value by one and returns the new value.

Syntax: **InterlockedIncrement32(** *Target* **)** **As Long**

*Target*
: *required* **Long**. The 32-bit variable to increment, passed by reference.

The read, add, and write happen as one atomic operation. The return value is the post-increment value of *Target*. Wraps the Win32 `InterlockedIncrement` intrinsic.

### See Also

- [InterlockedDecrement32](InterlockedDecrement32) function
- [InterlockedCompareExchange32](InterlockedCompareExchange32) function
