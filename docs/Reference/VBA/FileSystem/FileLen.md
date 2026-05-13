---
title: FileLen
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FileLen
redirect_from:
-  /tB/Core/FileLen
vba_attribution: true
---
# FileLen
{: .no_toc }

Returns a **Long** specifying the length of a file in bytes.

Syntax: **FileLen(** *pathname* **)**

*pathname*
: *required* String expression that specifies a file name. The *pathname* may include the directory or folder, and the drive.

If the specified file is open when the **FileLen** function is called, the value returned represents the size of the file immediately before it was opened.

> [!NOTE]
> Use the [LOF](LOF) function to obtain the length of an open file.

### Example

This example uses the **FileLen** function to return the length of a file in bytes. For purposes of this example, assume that `TESTFILE` is a file containing some data.

```tb
Dim MySize
MySize = FileLen("TESTFILE")    ' Returns file length (bytes).
```

### See Also

- [LOF](LOF) function
- [FileDateTime](FileDateTime) function
