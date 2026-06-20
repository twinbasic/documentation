---
title: InterlockedCompareExchangePointer
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/InterlockedCompareExchangePointer
---
# InterlockedCompareExchangePointer
{: .no_toc }

Atomically compares a pointer-sized value at a memory location with a comparand and replaces it with a new value if they match. Returns the original value either way.

Syntax: **InterlockedCompareExchangePointer(** *Target* **,** *NewValue* **,** *OldValueCompare* **)** **As LongPtr**

*Target*
: *required* **LongPtr**. The pointer-sized variable to update, passed by reference.

*NewValue*
: *required* **LongPtr**. The value to write into *Target* if the compare succeeds.

*OldValueCompare*
: *required* **LongPtr**. The expected current value of *Target*.

The compare-and-swap happens as one atomic operation. The return value is the value that was in *Target* at the start of the call --- equal to *OldValueCompare* on success, anything else on failure (in which case *Target* is left unchanged). Wraps the Win32 `InterlockedCompareExchangePointer` intrinsic.

### Example

```tb
' Atomically claim ownership of a slot.
Dim Slot As LongPtr = 0
Dim NewObj As LongPtr = ObjPtr(New Collection)
If InterlockedCompareExchangePointer(Slot, NewObj, 0) = 0 Then
    ' Won the race — Slot now holds NewObj.
End If
```

### See Also

- [InterlockedExchangePointer](InterlockedExchangePointer) function
- [InterlockedCompareExchange32](InterlockedCompareExchange32), [InterlockedCompareExchange64](InterlockedCompareExchange64) functions
