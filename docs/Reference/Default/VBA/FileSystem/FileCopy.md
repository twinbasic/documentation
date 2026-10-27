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

A *source* that the program has open is copied when it is open for reading only: **For Input**, or with **Access Read** in any mode, and not locked against reading.

> [!NOTE]
> VB6 and 64-bit VBA copy an open *source* only when it is open **For Input** and not locked against reading, and raise error 55, *File already open*, for one open with **Access Read** in another mode.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [53 (`&H35`)](tb:Errors#53), *File not found* | *source* does not exist |
| [76 (`&H4C`)](tb:Errors#76), *Path not found* | the folder or drive named in *source* or *destination* does not exist, or *destination* ends in a backslash |
| [55 (`&H37`)](tb:Errors#55), *File already open* | *source* is open with write access or locked against reading, or *destination* is open<br>*destination* names the same file as *source*<br>*source* is open **For Input** with **Lock Read** |
| [70 (`&H46`)](tb:Errors#70), *Permission denied* | *source* is a folder, or *destination* is a folder or a read-only or hidden file |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *source* or *destination* is a zero-length string<br>*source* or *destination* holds a wildcard or a character a file name cannot hold |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *source* or *destination* is **Null** |

> [!NOTE] BETA 1010
> When *destination* names the same file as *source*, VB6 and 64-bit VBA raise error [70 (`&H46`)](tb:Errors#70), *Permission denied*, instead.

> [!NOTE] BETA 1010
> When *source* is open **For Input** with **Lock Read**, VB6 and 64-bit VBA raise error [70 (`&H46`)](tb:Errors#70), *Permission denied*, instead.

> [!NOTE] BETA 1010
> When *source* is a folder, or *destination* is a folder or a read-only or hidden file, VB6 and 64-bit VBA raise error [75 (`&H4B`)](tb:Errors#75), *Path/File access error*, instead.

> [!NOTE] BETA 1010
> When *source* or *destination* is a zero-length string, VB6 and 64-bit VBA raise error [75 (`&H4B`)](tb:Errors#75), *Path/File access error*, instead.

> [!NOTE] BETA 1010
> When *source* or *destination* holds a wildcard or a character a file name cannot hold, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

<!-- /errors -->

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