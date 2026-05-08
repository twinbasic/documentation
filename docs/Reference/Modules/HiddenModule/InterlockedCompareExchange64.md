---
title: InterlockedCompareExchange64
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/InterlockedCompareExchange64
---
# InterlockedCompareExchange64
{: .no_toc }

Atomically compares a 64-bit value at a memory location with a comparand and replaces it with a new value if they match. Returns the original value either way.

Syntax: **InterlockedCompareExchange64(** *Target* **,** *NewValue* **,** *OldValueCompare* **)** **As LongLong**

*Target*
: *required* **LongLong**. The 64-bit variable to update, passed by reference.

*NewValue*
: *required* **LongLong**. The value to write into *Target* if the compare succeeds.

*OldValueCompare*
: *required* **LongLong**. The expected current value of *Target*.

The compare-and-swap happens as one atomic operation. The return value is the value that was in *Target* at the start of the call — equal to *OldValueCompare* on success, anything else on failure (in which case *Target* is left unchanged). Wraps the Win32 `InterlockedCompareExchange64` intrinsic.

### See Also

- [InterlockedCompareExchange32](InterlockedCompareExchange32) function
- [InterlockedCompareExchangePointer](InterlockedCompareExchangePointer) function
