---
title: FileAttr
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FileAttr
redirect_from:
-  /tB/Core/FileAttr
vba_attribution: true
---
# FileAttr
{: .no_toc }

Returns a **Long** representing the file mode for files opened with the **Open** statement.

Syntax: **FileAttr(** *filenumber* **,** *returntype* **)**

*filenumber*
: *required* **Integer** containing any valid file number.

*returntype*
: *required* **Integer** indicating the type of information to return. Must be **1** to return the file access mode.

### Return Values

The following return values indicate the file access mode:

| Mode       | Value |
|------------|:-----:|
| **Input**  | 1     |
| **Output** | 2     |
| **Random** | 4     |
| **Append** | 8     |
| **Binary** | 32    |

### Example

This example uses the **FileAttr** function to return the file mode of an open file.

```tb
Dim FileNum, Mode
FileNum = 1    ' Assign file number.
Open "TESTFILE" For Append As FileNum    ' Open file.
Mode = FileAttr(FileNum, 1)    ' Returns 8 (Append file mode).
Close FileNum    ' Close file.
```

### See Also

- [LOF](LOF), [EOF](EOF) functions
