---
title: ChDir
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/ChDir
redirect_from:
-  /tB/Core/ChDir
vba_attribution: true
---
# ChDir
{: .no_toc }

Changes the current directory or folder.

Syntax: **ChDir** *path*

*path*
: *required* A string expression that identifies which directory or folder becomes the new default directory or folder. The *path* may include the drive. If no drive is specified, **ChDir** changes the default directory or folder on the current drive.

The **ChDir** statement changes the default directory but not the default drive. For example, if the default drive is C, the following statement changes the default directory on drive D, but C remains the default drive:

```tb check_build
ChDir "D:\TMP" ' Make "D:\TMP" the current folder. 

ChDrive "D"    ' Make "D" the current drive. 
```

<!--
On Linux MacOS, the default drive always changes to the drive specified in *path*. Full path specifications begin with the volume name, and relative paths begin with a colon (**:**). **ChDir** resolves any aliases specified in the path: 

ChDir "MacDrive:Tmp" ' On the Macintosh. 

Note that when making relative directory changes, different symbols are used in Microsoft Windows and MacOS:

ChDir ".." ' Moves up one directory in Microsoft Windows. 

ChDir "::" ' Moves up one directory on the MacOS.

On MacOS, the default drive name is "HD" and portions of the pathname are separated by colons instead of backslashes. Similarly, you would specify MacOS folders instead of Windows. Finally, wildcard characters have no special meaning on the MacOS and are treated simply as characters.

-->

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *path* names no folder that exists, which includes a file, a drive that does not exist, a zero-length string, and a name with a wildcard or a character a name cannot hold |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *path* is **Null** |

> [!NOTE] BETA 1010
> When *path* names no folder that exists, which includes a file, a drive that does not exist, a zero-length string, and a name with a wildcard or a character a name cannot hold, VB6 and 64-bit VBA raise error [76 (`&H4C`)](tb:Errors#76), *Path not found*, instead.

<!-- /errors -->

### Example

This example uses the **ChDir** statement to change the current directory or folder.

```tb check_build
' Change current directory or folder to "MYDIR".
ChDir "MYDIR"

' Assume "C:" is the current drive. The following statement changes 
' the default directory on drive "D:". "C:" remains the current drive.
ChDir "D:\WINDOWS\SYSTEM"
```

### See Also

- [ChDrive](ChDrive), [MkDir](MkDir), [RmDir](RmDir) statements
- [CurDir](CurDir), [Dir](Dir) functions
