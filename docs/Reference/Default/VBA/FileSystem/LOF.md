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

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *filenumber* is not the number of an open file |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *filenumber* is **Null** |

> [!NOTE] BETA 1010
> When *filenumber* is not the number of an open file, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

<!-- /errors -->

### Example

This example uses the **LOF** function to determine the size of an open file. This example assumes that `TESTFILE` is a text file containing sample data.

```tb check_build
Dim FileLength
Open "TESTFILE" For Input As #1    ' Open file.
FileLength = LOF(1)    ' Get length of file.
Close #1    ' Close file.
```

### See Also

- [EOF](EOF) function
