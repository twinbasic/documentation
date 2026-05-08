---
title: CurrentSourceFile
parent: Compilation Module
permalink: /tB/Modules/Compilation/CurrentSourceFile
---
# CurrentSourceFile
{: .no_toc }

Returns the full path of the source file in which the function is called, as a **String**.

Syntax: **CurrentSourceFile** [ **()** ]

The value is the absolute path of the source file that lexically contains the call.

> [!NOTE]
> **CurrentSourceFile** is a compile-time intrinsic: the path is captured when the source is compiled. It reflects where the file lived on the build machine and may not correspond to any path that exists at run time.

### Example

```tb
Public Sub TraceHere()
    Debug.Print "Trace from " & CurrentSourceFile() & " in " & CurrentProcedureName()
End Sub
```

### See Also

- [CurrentComponentName](CurrentComponentName) function
- [CurrentProcedureName](CurrentProcedureName) function
- [CurrentProjectName](CurrentProjectName) function
