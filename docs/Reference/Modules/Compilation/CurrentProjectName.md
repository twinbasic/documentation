---
title: CurrentProjectName
parent: Compilation Module
permalink: /tB/Modules/Compilation/CurrentProjectName
---
# CurrentProjectName
{: .no_toc }

Returns the name of the current project as a literal **String**.

Syntax: **CurrentProjectName** [ **()** ]

The value is the name of the project (executable or library) that owns the call site.

> [!NOTE]
> **CurrentProjectName** is a compile-time intrinsic — the literal string is baked into the compiled code from the project's metadata at the point of the call.

### Example

```tb
Dim ProjectName As String
ProjectName = CurrentProjectName()
Debug.Print "Running in project: " & ProjectName
```

### See Also

- [CurrentComponentName](CurrentComponentName) function
- [CurrentProcedureName](CurrentProcedureName) function
- [CurrentSourceFile](CurrentSourceFile) function
