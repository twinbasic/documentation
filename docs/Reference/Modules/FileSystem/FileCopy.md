---
title: FileCopy
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FileCopy
redirect_from:
-  /tB/Core/FileCopy
---

# FileCopy

Copies a file.

Syntax: **FileCopy** *source*, *destination*

*source*
: String expression that specifies the name of the file to be copied. The *source* may include directory or folder, and drive.

*destination*
: String expression that specifies the target file name. The *destination* may include directory or folder, and drive.

If you try to use the **FileCopy** statement on a file that is currently open, an error occurs.

### Example

This example uses the **FileCopy** statement to copy one file to another. For the purposes of this example, assume that the file contains some data.

```vb
Dim SourceFile, DestinationFile 
SourceFile = "SRCFILE" ' Define source file name. 
DestinationFile = "DESTFILE" ' Define target file name. 
FileCopy SourceFile, DestinationFile ' Copy source to target. 
```
{% include VBA-Attribution.md %}