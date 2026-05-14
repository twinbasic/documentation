---
title: GetDeclaredMinEnumValue
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetDeclaredMinEnumValue
---
# GetDeclaredMinEnumValue
{: .no_toc }

Returns the smallest member value of a declared enumeration type, resolved at compile time.

Syntax: **GetDeclaredMinEnumValue(Of** *T* **)()** **As Long**

*T*
: *required* The enumeration type to query.

Iterates over the members of *T* and returns the lowest assigned value. Resolved at compile time and folded into the generated code as a numeric constant — there is no run-time iteration.

### Example

```tb
Enum Severity
    Trace = 0
    Debug = 1
    Info = 2
    Warning = 3
    Error = 4
End Enum

Debug.Print GetDeclaredMinEnumValue(Of Severity)()    ' 0
Debug.Print GetDeclaredMaxEnumValue(Of Severity)()    ' 4
```

### See Also

- [GetDeclaredMaxEnumValue](GetDeclaredMaxEnumValue) function
