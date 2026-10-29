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

<!-- bug: filesystem-argument-checks -->
> [!WARNING] BETA 1010
> Given a *pathname* with a wildcard (`*` or `?`) that matches a file or a folder, **FileLen** returns the length of the first match, which may be a hidden file, or a folder, whose length is 0, and raises no error. VB6 and 64-bit VBA raise error 52, *Bad file name or number*.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | no file or folder has the name *pathname*, which includes a zero-length string, a folder named with a backslash at its end, and a name with a character a name cannot hold<br>the folder or drive named in *pathname* does not exist<br>*pathname* holds a wildcard that matches no file or folder |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* is **Null** |

> [!NOTE] BETA 1010
> When no file or folder has the name *pathname*, which includes a zero-length string, a folder named with a backslash at its end, and a name with a character a name cannot hold, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*, instead.

> [!NOTE] BETA 1010
> When the folder or drive named in *pathname* does not exist, VB6 and 64-bit VBA raise error [76 (`&H4C`)](tb:Errors#76), *Path not found*, instead.

> [!NOTE] BETA 1010
> When *pathname* holds a wildcard that matches no file or folder, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When *pathname* holds a wildcard that matches a file or folder, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **FileLen** function to return the length of a file in bytes. For purposes of this example, assume that `TESTFILE` is a file containing some data.

```tb check_build
Dim MySize
MySize = FileLen("TESTFILE")    ' Returns file length (bytes).
```

### See Also

- [LOF](LOF) function
- [FileDateTime](FileDateTime) function
