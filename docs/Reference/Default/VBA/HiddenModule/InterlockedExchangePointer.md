---
title: InterlockedExchangePointer
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/InterlockedExchangePointer
---
# InterlockedExchangePointer
{: .no_toc }

Atomically exchanges a pointer-sized value at a memory location and returns the previous value.

Syntax: **InterlockedExchangePointer(** *Target* **,** *NewValue* **)** **As LongPtr**

*Target*
: *required* **LongPtr**. The pointer-sized variable to update, passed by reference.

*NewValue*
: *required* **LongPtr**. The new value to store at *Target*.

The store and the read of the prior value happen as a single atomic operation, observable by other threads as either fully-before or fully-after the call. Wraps the Win32 `InterlockedExchangePointer` intrinsic.

<!-- errors: generated from errors/VBA.HiddenModule.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *NewValue* is **Null** |

<!-- /errors -->

### See Also

- [InterlockedCompareExchangePointer](InterlockedCompareExchangePointer) function
- [InterlockedCompareExchange32](InterlockedCompareExchange32), [InterlockedCompareExchange64](InterlockedCompareExchange64) functions
