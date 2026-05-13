---
title: CurrentProcedureName
parent: Compilation Module
permalink: /tB/Modules/Compilation/CurrentProcedureName
---
# CurrentProcedureName
{: .no_toc }

Returns the name of the procedure in which the function is called, as a literal **String**.

Syntax: **CurrentProcedureName** [ **()** ]

The value is the name of the **Sub**, **Function**, or **Property** that lexically contains the call.

> [!NOTE]
> **CurrentProcedureName** is a compile-time intrinsic: the literal string is determined when the source is compiled, from the procedure that surrounds the call. It is not derived from the runtime call stack — wrapping the call in a helper records the helper's name, not the original caller's.

### Example

```tb
Public Sub DoWork()
    Debug.Print CurrentProcedureName()    ' Prints "DoWork"
End Sub
```

### See Also

- [CurrentComponentName](CurrentComponentName) function
- [CurrentProjectName](CurrentProjectName) function
- [CurrentSourceFile](CurrentSourceFile) function
