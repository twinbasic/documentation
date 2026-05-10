---
title: InterlockedDecrement32
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/InterlockedDecrement32
---
# InterlockedDecrement32
{: .no_toc }

Atomically decrements a 32-bit value by one and returns the new value.

Syntax: **InterlockedDecrement32(** *Target* **)** **As Long**

*Target*
: *required* **Long**. The 32-bit variable to decrement, passed by reference.

The read, subtract, and write happen as one atomic operation. The return value is the post-decrement value of *Target* — testing against zero is the canonical way to spot the last release of a refcounted resource. Wraps the Win32 `InterlockedDecrement` intrinsic.

### See Also

- [InterlockedIncrement32](InterlockedIncrement32) function
- [InterlockedCompareExchange32](InterlockedCompareExchange32) function
