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

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *filenumber* is not the number of an open file<br>*returntype* is not 1, after rounding |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *filenumber* or *returntype* is **Null** |

> [!NOTE] BETA 1010
> When *filenumber* is not the number of an open file, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When *returntype* is not 1, after rounding, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example uses the **FileAttr** function to return the file mode of an open file.

```tb check_build
Dim FileNum, Mode
FileNum = 1    ' Assign file number.
Open "TESTFILE" For Append As FileNum    ' Open file.
Mode = FileAttr(FileNum, 1)    ' Returns 8 (Append file mode).
Close FileNum    ' Close file.
```

### See Also

- [LOF](LOF), [EOF](EOF) functions
