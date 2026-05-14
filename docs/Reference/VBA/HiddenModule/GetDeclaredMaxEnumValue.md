---
title: GetDeclaredMaxEnumValue
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetDeclaredMaxEnumValue
---
# GetDeclaredMaxEnumValue
{: .no_toc }

Returns the largest member value of a declared enumeration type, resolved at compile time.

Syntax: **GetDeclaredMaxEnumValue(Of** *T* **)()** **As Long**

*T*
: *required* The enumeration type to query.

Iterates over the members of *T* and returns the highest assigned value. Resolved at compile time and folded into the generated code as a numeric constant --- there is no run-time iteration.

### See Also

- [GetDeclaredMinEnumValue](GetDeclaredMinEnumValue) function
