---
title: vbaRefVarAry
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaRefVarAry
---
# vbaRefVarAry
{: .no_toc }

Returns a pointer to the **SAFEARRAY** descriptor stored inside a **Variant** array.

Syntax: **vbaRefVarAry(** *Variant* **)** **As LongPtr**

*Variant*
: *required* A **Variant** that contains an array, passed by reference.

The returned address is the location of the **SAFEARRAY*** field inside the **Variant** --- that is, the dereference yields the **SAFEARRAY** pointer that the **Variant** wraps. Useful when calling Win32 APIs that expect to receive or fill a **SAFEARRAY** through a `VARIANT*` argument.

If *Variant* does not contain an array, the result is undefined.

### See Also

- [VarPtr](VarPtr) function
- [vbaAryMove](vbaAryMove) procedure
