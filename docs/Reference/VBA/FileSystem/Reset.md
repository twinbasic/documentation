---
title: Reset
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Reset
redirect_from:
-  /tB/Core/Reset
---
# Reset
{: .no_toc }

Closes all disk files opened by using the **Open** statement.

Syntax: **Reset**

The **Reset** statement closes all active files opened by the [Open](../../Core/Open) statement and writes the contents of all file buffers to disk.

### Example

This example uses the **Reset** statement to close all open files and write the contents of all file buffers to disk.

```tb
Dim FileNumber
For FileNumber = 1 To 5    ' Loop 5 times.
    Open "TEST" & FileNumber For Output As #FileNumber
    Write #FileNumber, "Hello World"    ' Write data to file.
Next FileNumber
Reset    ' Close files and write contents to disk.
```

### See Also

- [Close](../../Core/Close) statement

{% include VBA-Attribution.md %}
