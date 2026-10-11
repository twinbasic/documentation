---
title: RmDir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/RmDir
redirect_from:
-  /tB/Core/RmDir
vba_attribution: true
---
# RmDir
{: .no_toc }

Removes an existing directory or folder.

Syntax: **RmDir** *path*

*path*
: A string expression that identifies the directory or folder to be removed. The *path* may include the drive. If no drive is specified, **RmDir** removes the directory or folder on the current drive.

An error occurs when **RmDir** is used on a directory or folder containing files. Use the [**Kill**](Kill) statement to delete all files before attempting to remove a directory or folder.

> [!NOTE]
> In BETA 1005, **RmDir** raises run-time error -2147467259 (`&H80004005`) when it fails. VB6 raises 75 (*Path/File access error*) for a folder that holds files, and 76 (*Path not found*) for one that does not exist.

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [MkDir](MkDir) statements
- [CurDir](CurDir), [Dir](Dir) functions
- [Kill](Kill) statement

### Example

This example uses the **RmDir** statement to remove an existing directory or folder.

```tb check_build
' Assume that MYDIR is an empty directory or folder.
RmDir "MYDIR"   ' Remove MYDIR.
```
