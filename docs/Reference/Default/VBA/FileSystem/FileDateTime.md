---
title: FileDateTime
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FileDateTime
redirect_from:
-  /tB/Core/FileDateTime
vba_attribution: true
---
# FileDateTime
{: .no_toc }

Returns a **Variant** (**Date**) indicating the date and time when a file was created or last modified.

Syntax: **FileDateTime(** *pathname* **)**

*pathname*
: *required* String expression that specifies a file name. The *pathname* may include the directory or folder, and the drive.

<!-- bug: filesystem-argument-checks -->
> [!WARNING] BETA 1010
> Given a *pathname* with a wildcard (`*` or `?`) that matches a file or a folder, **FileDateTime** returns the date and time of the first match, which may be a hidden file or a folder, and raises no error. VB6 and 64-bit VBA raise error 52, *Bad file name or number*.

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

This example uses the **FileDateTime** function to determine the date and time a file was created or last modified. The format of the date and time displayed is based on the system's locale settings.

```tb check_build
Dim MyStamp
' Assume TESTFILE was last modified on February 12, 1993 at 4:35:47 PM.
' Assume English/U.S. locale settings.
MyStamp = FileDateTime("TESTFILE")    ' Returns "2/12/93 4:35:47 PM".
```

### See Also

- [FileLen](FileLen), [GetAttr](GetAttr) functions
