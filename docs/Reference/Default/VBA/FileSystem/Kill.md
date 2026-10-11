---
title: Kill
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Kill
redirect_from:
-  /tB/Core/Kill
vba_attribution: true
---
# Kill
{: .no_toc }

Deletes files from a disk.

Syntax: **Kill** *pathname*

*pathname*
: *required* String expression that specifies one or more file names to be deleted. The *pathname* may include the directory or folder, and the drive.

**Kill** supports the use of multiple-character (`*`) and single-character (`?`) wildcards to specify multiple files.

An error occurs when **Kill** is used to delete an open file.

> [!NOTE]
> In BETA 1005, each of these failures of **Kill** raises run-time error -2147467259 (`&H80004005`), where VB6 raises the numbered error shown:
>
> - 53 (*File not found*) when no file matches *pathname*;
> - 75 (*Path/File access error*) for a read-only file;
> - 55 (*File already open*) for a file that is open.

> [!NOTE]
> To delete directories, use the [**RmDir**](RmDir) statement.

### Example

This example uses the **Kill** statement to delete a file from a disk.

```tb check_build
' Assume TESTFILE is a file containing some data.
Kill "TestFile"   ' Delete file.

' Delete all *.TXT files in current directory.
Kill "*.TXT"
```

### See Also

- [Dir](Dir) function
- [RmDir](RmDir), [MkDir](MkDir) statements
