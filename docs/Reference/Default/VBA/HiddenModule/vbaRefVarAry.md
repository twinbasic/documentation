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

### Example

This example retrieves the address of the **SAFEARRAY** descriptor inside a **Variant** array.

```tb
Dim v As Variant
v = Array(10, 20, 30)          ' Variant holding an array
Dim pSAPtr As LongPtr
pSAPtr = vbaRefVarAry(v)       ' address of the SAFEARRAY* field in v
Dim pSA As LongPtr
GetMemPtr pSAPtr, pSA          ' dereference: pSA is the SAFEARRAY pointer
```

### See Also

- [VarPtr](VarPtr) function
- [vbaAryMove](vbaAryMove) procedure
