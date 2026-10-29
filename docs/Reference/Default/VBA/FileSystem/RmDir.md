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

**RmDir** removes only an empty folder. To remove a folder that holds files, delete them first with the [**Kill**](Kill) statement.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | no folder has the name *path*, which includes a file, a zero-length string, and a name with a wildcard or a character a name cannot hold<br>the folder holds a file or a folder, or it is the current directory |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *path* is **Null** |

> [!NOTE] BETA 1010
> When no folder has the name *path*, which includes a file, a zero-length string, and a name with a wildcard or a character a name cannot hold, VB6 and 64-bit VBA raise error [76 (`&H4C`)](tb:Errors#76), *Path not found*, instead.

> [!NOTE] BETA 1010
> When the folder holds a file or a folder, or it is the current directory, VB6 and 64-bit VBA raise error [75 (`&H4B`)](tb:Errors#75), *Path/File access error*, instead.

<!-- /errors -->

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
