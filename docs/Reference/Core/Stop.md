---
title: Stop
parent: Statements
permalink: /tB/Core/Stop
vba_attribution: true
---

# Stop
{: .no_toc }

Suspends execution.

Syntax:

> **Stop**

You can place **Stop** statements anywhere in procedures to suspend execution. Using the **Stop** statement is similar to setting a breakpoint in the code.

The **Stop** statement suspends execution, but unlike [**End**](End), it doesn't close any files or clear variables, unless it is in a compiled executable (.exe) file.

### Example

This example uses the **Stop** statement to suspend execution for each iteration through the **For...Next** loop.

```tb
Dim i As Long
For i = 1 To 10 ' Start For...Next loop.
    Debug.Print i ' Print i to the Immediate window.
    Stop ' Stop during each iteration.
Next i
```

### See Also

- [**End** statement](End)
