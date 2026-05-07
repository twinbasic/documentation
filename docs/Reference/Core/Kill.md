---
title: Kill
parent: Statements
permalink: /tB/Core/Kill
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
> To delete directories, use the [**RmDir**](../Modules/FileSystem/RmDir) statement.

### Example

This example uses the **Kill** statement to delete a file from a disk.

```vb
' Assume TESTFILE is a file containing some data.
Kill "TestFile"   ' Delete file.

' Delete all *.TXT files in current directory.
Kill "*.TXT"
```

### See Also

- [Dir](../Modules/FileSystem/Dir) function
- [RmDir](../Modules/FileSystem/RmDir), [MkDir](../Modules/FileSystem/MkDir) statements

{% include VBA-Attribution.md %}
