---
title: CurrentComponentName
parent: Compilation Module
permalink: /tB/Modules/Compilation/CurrentComponentName
---
# CurrentComponentName
{: .no_toc }

Returns the name of the current component (module or class) as a literal **String**.

Syntax: **CurrentComponentName** [ **()** ]

The value identifies the source unit --- the **Module**, **Class**, **Form**, or other component --- that lexically contains the call site.

> [!NOTE]
> **CurrentComponentName** is a compile-time intrinsic: the literal string is embedded in the compiled code at the point of the call. It does not change at run time, even when the call is reached through a forwarded or inherited member.

### Example

```tb
Public Sub Log(Message As String)
    Debug.Print CurrentComponentName() & ": " & Message
End Sub
```

### See Also

- [CurrentComponentCLSID](CurrentComponentCLSID) function
- [CurrentProcedureName](CurrentProcedureName) function
- [CurrentProjectName](CurrentProjectName) function
- [CurrentSourceFile](CurrentSourceFile) function
