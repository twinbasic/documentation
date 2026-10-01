---
title: FileCopy
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FileCopy
redirect_from:
-  /tB/Core/FileCopy
vba_attribution: true
---

# FileCopy

Copies a file.

Syntax: **FileCopy** *source*, *destination*

*source*
: *required* String expression that specifies the name of the file to be copied. The *source* may include directory or folder, and drive.

*destination*
: *required* String expression that specifies the target file name. The *destination* may include directory or folder, and drive.

An error occurs when **FileCopy** is used on a file that is currently open.

> [!NOTE]
> twinBASIC raises run-time error -2147467259 (`&H80004005`, *Unspecified error*) for a file that is open, for **Input** as well as for **Append**. VB6 raises error 55 (*File already open*) for a file open for **Append**, and copies a file open for **Input** without an error.

### Example

This example uses the **FileCopy** statement to copy one file to another. For the purposes of this example, assume that the file contains some data.

```tb check_build
Dim SourceFile, DestinationFile 
SourceFile = "SRCFILE" ' Define source file name. 
DestinationFile = "DESTFILE" ' Define target file name. 
FileCopy SourceFile, DestinationFile ' Copy source to target. 
```

### See Also

- [Kill](Kill) statement
- [Name](../../Core/Name) statement
- [FileLen](FileLen) function