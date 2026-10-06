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

**FileCopy** raises run-time error 55 (*File already open*) when *source* is a file that is currently open for **Append**. A file that is open for **Input** is copied without an error, and so is a file that is closed.

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