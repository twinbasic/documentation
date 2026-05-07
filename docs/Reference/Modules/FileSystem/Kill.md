---
title: Kill
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Kill
redirect_from:
-  /tB/Core/Kill
---
# Kill
{: .no_toc }

Deletes files from a disk.

Syntax: **Kill** *pathname*

*pathname*
: *required* String expression that specifies one or more file names to be deleted. The *pathname* may include the directory or folder, and the drive.

**Kill** supports the use of multiple-character (`*`) and single-character (`?`) wildcards to specify multiple files.

An error occurs if you try to use **Kill** to delete an open file.

> [!NOTE]
> To delete directories, use the [**RmDir**](RmDir) statement.

### Example

This example uses the **Kill** statement to delete a file from a disk.

```vb
' Assume TESTFILE is a file containing some data.
Kill "TestFile"   ' Delete file.

' Delete all *.TXT files in current directory.
Kill "*.TXT"
```

### See Also

- [Dir](Dir) function
- [RmDir](RmDir), [MkDir](MkDir) statements

{% include VBA-Attribution.md %}
