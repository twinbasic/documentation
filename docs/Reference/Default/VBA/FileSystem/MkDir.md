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

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [RmDir](RmDir) statements
- [CurDir](CurDir), [Dir](Dir) functions

### Example

This example uses the **MkDir** statement to create a directory or folder. If the drive is not specified, the new directory or folder is created on the current drive.

```tb
MkDir "MYDIR"   ' Make new directory or folder.
```
