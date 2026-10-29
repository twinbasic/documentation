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

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *path* already exists, as a folder or as a file<br>the folder or drive that would hold *path* does not exist, or *path* is a zero-length string or a name a folder cannot have |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *path* is **Null** |

> [!NOTE] BETA 1010
> When *path* already exists, as a folder or as a file, VB6 and 64-bit VBA raise error [75 (`&H4B`)](tb:Errors#75), *Path/File access error*, instead.

> [!NOTE] BETA 1010
> When the folder or drive that would hold *path* does not exist, or *path* is a zero-length string or a name a folder cannot have, VB6 and 64-bit VBA raise error [76 (`&H4C`)](tb:Errors#76), *Path not found*, instead.

<!-- /errors -->

### See Also

- [ChDir](ChDir), [ChDrive](ChDrive), [RmDir](RmDir) statements
- [CurDir](CurDir), [Dir](Dir) functions

### Example

This example uses the **MkDir** statement to create a directory or folder. If the drive is not specified, the new directory or folder is created on the current drive.

```tb check_build
MkDir "MYDIR"   ' Make new directory or folder.
```
