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

<!-- bug: kill-hidden-system-files -->
> [!WARNING] BETA 1010
> **Kill** deletes a hidden or a system file, whether *pathname* names it or a wildcard matches it, and raises no error. VB6 and 64-bit VBA never delete such a file: they raise error 53, *File not found*, when *pathname* matches only hidden or system files, and otherwise delete the other files a wildcard matches and leave these.

> [!NOTE]
> To delete directories, use the [**RmDir**](RmDir) statement.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | no file matches *pathname*, which includes a folder, a folder or drive that does not exist, and a zero-length string<br>the file, or a file a wildcard matches, is read-only<br>the file, or a file a wildcard matches, is open |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* is **Null** |

> [!NOTE] BETA 1010
> When no file matches *pathname*, which includes a folder, a folder or drive that does not exist, and a zero-length string, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*, instead.

> [!NOTE] BETA 1010
> When the file, or a file a wildcard matches, is read-only, VB6 and 64-bit VBA raise error [75 (`&H4B`)](tb:Errors#75), *Path/File access error*, instead.

> [!NOTE] BETA 1010
> When the file, or a file a wildcard matches, is open, VB6 and 64-bit VBA raise error [55 (`&H37`)](tb:Errors#55), *File already open*, instead.

> [!NOTE] BETA 1010
> When *pathname* names a hidden or system file, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*; twinBASIC raises none.

<!-- /errors -->

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
