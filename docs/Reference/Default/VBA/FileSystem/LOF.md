---
title: LOF
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/LOF
redirect_from:
-  /tB/Core/LOF
vba_attribution: true
---
# LOF
{: .no_toc }

Returns a **Long** representing the size, in bytes, of a file opened by using the **Open** statement.

Syntax: **LOF(** *filenumber* **)**

*filenumber*
: *required* **Integer** containing a valid file number.

> [!NOTE]
> Use the **FileLen** function to obtain the length of a file that is not open.

### Example

This example uses the **LOF** function to determine the size of an open file. This example assumes that `TESTFILE` is a text file containing sample data.

```tb
Dim FileLength
Open "TESTFILE" For Input As #1    ' Open file.
FileLength = LOF(1)    ' Get length of file.
Close #1    ' Close file.
```

### See Also

- [EOF](EOF) function
