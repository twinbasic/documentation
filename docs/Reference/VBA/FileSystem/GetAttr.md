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

To determine which attributes are set, use the **And** operator to perform a bitwise comparison of the value returned by **GetAttr** and the value of the individual file attribute you want. If the result is not zero, that attribute is set for the named file.

```tb
Result = GetAttr(FName) And vbArchive
```

A nonzero value is returned if the Archive attribute is set.

### Example

This example uses the **GetAttr** function to determine the attributes of a file and directory or folder.

```tb
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
