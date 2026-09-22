---
title: CurrentSourceFile
parent: Compilation Module
permalink: /tB/Modules/Compilation/CurrentSourceFile
---
# CurrentSourceFile
{: .no_toc }

Returns the name of the source file in which the function is called, as a **String**.

Syntax: **CurrentSourceFile** [ **()** ]

The value is the file name (without directory components) of the source file that lexically contains the call --- for example, `"Form1.twin"`.

> [!NOTE]
> **CurrentSourceFile** is a compile-time intrinsic: the name is captured when the source is compiled and embedded as a literal in the output.

### Example

```tb check_build
Public Sub TraceHere()
    Debug.Print "Trace from " & CurrentSourceFile() & " in " & CurrentProcedureName()
End Sub
```

### See Also

- [CurrentComponentName](CurrentComponentName) function
- [CurrentProcedureName](CurrentProcedureName) function
- [CurrentProjectName](CurrentProjectName) function
