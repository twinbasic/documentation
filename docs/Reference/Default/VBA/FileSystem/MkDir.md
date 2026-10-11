---
title: MkDir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/MkDir
redirect_from:
-  /tB/Core/MkDir
vba_attribution: true
---
# MkDir
{: .no_toc }

Creates a new directory or folder.

Syntax: **MkDir** *path*

*path*
: A string expression that identifies the directory or folder to be created. The *path* may include the drive. If no drive is specified, **MkDir** creates the new directory or folder on the current drive.

> [!NOTE]
> In BETA 1005, **MkDir** raises run-time error -2147467259 (`&H80004005`) when it fails. VB6 raises 75 (*Path/File access error*) when *path* already exists, and 76 (*Path not found*) when the folder that would hold it does not exist.

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [RmDir](RmDir) statements
- [CurDir](CurDir), [Dir](Dir) functions

### Example

This example uses the **MkDir** statement to create a directory or folder. If the drive is not specified, the new directory or folder is created on the current drive.

```tb check_build
MkDir "MYDIR"   ' Make new directory or folder.
```
