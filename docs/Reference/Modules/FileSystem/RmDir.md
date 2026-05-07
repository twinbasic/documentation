---
title: RmDir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/RmDir
redirect_from:
-  /tB/Core/RmDir
---
# RmDir
{: .no_toc }

Removes an existing directory or folder.

Syntax: **RmDir** *path*

*path*
: A string expression that identifies the directory or folder to be removed. The *path* may include the drive. If no drive is specified, **RmDir** removes the directory or folder on the current drive.

An error occurs if you try to use **RmDir** on a directory or folder containing files. Use the [**Kill**](Kill) statement to delete all files before attempting to remove a directory or folder.

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [MkDir](MkDir) statements
- [CurDir](CurDir), [Dir](Dir) functions
- [Kill](Kill) statement

### Example

This example uses the **RmDir** statement to remove an existing directory or folder.

```vb
' Assume that MYDIR is an empty directory or folder.
RmDir "MYDIR"   ' Remove MYDIR.
```

{% include VBA-Attribution.md %}
