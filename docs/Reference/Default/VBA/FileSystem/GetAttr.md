---
title: GetAttr
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/GetAttr
redirect_from:
-  /tB/Core/GetAttr
vba_attribution: true
---
# GetAttr
{: .no_toc }

Returns an **Integer** representing the attributes of a file, directory, or folder.

Syntax: **GetAttr(** *pathname* **)**

*pathname*
: *required* String expression that specifies a file name. The *pathname* may include the directory or folder, and the drive.

### Return Values

The value returned by **GetAttr** is the sum of the following attribute values:

| Constant        | Value | Description            |
|-----------------|:-----:|------------------------|
| **vbNormal**    | 0     | Normal.                |
| **vbReadOnly**  | 1     | Read-only.             |
| **vbHidden**    | 2     | Hidden.                |
| **vbSystem**    | 4     | System file.           |
| **vbDirectory** | 16    | Directory or folder.   |
| **vbArchive**   | 32    | File has changed since last backup. |

To determine which attributes are set, use the **And** operator to perform a bitwise comparison of the value returned by **GetAttr** and the value of the individual file attribute being tested. If the result is not zero, that attribute is set for the named file.

```tb check_build
Dim FName As String, Result As Long
Result = GetAttr(FName) And vbArchive
```

A nonzero value is returned if the Archive attribute is set.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | no file or folder has the name *pathname*, or it is a zero-length string<br>the folder or drive named in *pathname* does not exist<br>*pathname* holds a wildcard<br>*pathname* holds a character a name cannot hold, or names a file with a backslash at its end |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* is **Null** |

> [!NOTE] BETA 1010
> When no file or folder has the name *pathname*, or it is a zero-length string, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*, instead.

> [!NOTE] BETA 1010
> When the folder or drive named in *pathname* does not exist, VB6 and 64-bit VBA raise error [76 (`&H4C`)](tb:Errors#76), *Path not found*, instead.

> [!NOTE] BETA 1010
> When *pathname* holds a wildcard, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When *pathname* holds a character a name cannot hold, or names a file with a backslash at its end, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example uses the **GetAttr** function to determine the attributes of a file and directory or folder.

```tb check_build
Dim MyAttr
' Assume file TESTFILE has hidden attribute set.
MyAttr = GetAttr("TESTFILE")    ' Returns 2.

' Returns nonzero if hidden attribute is set on TESTFILE.
Debug.Print MyAttr And vbHidden

' Assume file TESTFILE has hidden and read-only attributes set.
MyAttr = GetAttr("TESTFILE")    ' Returns 3.

' Returns nonzero if hidden attribute is set on TESTFILE.
Debug.Print MyAttr And (vbHidden + vbReadOnly)

' Assume MYDIR is a directory or folder.
MyAttr = GetAttr("MYDIR")    ' Returns 16.
```

### See Also

- [Dir](Dir) function
