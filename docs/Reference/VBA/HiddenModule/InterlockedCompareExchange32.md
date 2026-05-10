---
title: InterlockedCompareExchange32
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/InterlockedCompareExchange32
---
# InterlockedCompareExchange32
{: .no_toc }

Atomically compares a 32-bit value at a memory location with a comparand and replaces it with a new value if they match. Returns the original value either way.

Syntax: **InterlockedCompareExchange32(** *Target* **,** *NewValue* **,** *OldValueCompare* **)** **As Long**

*Target*
: *required* **Long**. The 32-bit variable to update, passed by reference.

*NewValue*
: *required* **Long**. The value to write into *Target* if the compare succeeds.

*OldValueCompare*
: *required* **Long**. The expected current value of *Target*.

The compare-and-swap happens as one atomic operation. The return value is the value that was in *Target* at the start of the call — equal to *OldValueCompare* on success, anything else on failure (in which case *Target* is left unchanged). Wraps the Win32 `InterlockedCompareExchange` intrinsic.

### See Also

- [InterlockedCompareExchange64](InterlockedCompareExchange64) function
- [InterlockedCompareExchangePointer](InterlockedCompareExchangePointer) function
- [InterlockedIncrement32](InterlockedIncrement32), [InterlockedDecrement32](InterlockedDecrement32) functions
