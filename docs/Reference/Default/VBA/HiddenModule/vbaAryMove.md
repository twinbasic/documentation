---
title: vbaAryMove
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/vbaAryMove
---
# vbaAryMove
{: .no_toc }

Moves the contents of one array variable into another in O(1) time, leaving the source empty.

Syntax: **vbaAryMove** *Dest* **,** *Source*

*Dest*
: *required* An array variable that receives the contents of *Source*. Any prior contents are released first.

*Source*
: *required* An array variable whose contents are transferred to *Dest*. After the call, *Source* is in the unallocated state.

The **SAFEARRAY** descriptor pointer is moved without copying its elements --- equivalent to a swap-and-release rather than an element-wise copy. Both arrays must have compatible element types.

This is the building block for returning a freshly built array from a function without paying for a copy on the way out.

### See Also

- [vbaRefVarAry](vbaRefVarAry) function
- [vbaCopyBytes](vbaCopyBytes) function
