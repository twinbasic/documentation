---
title: SetAttr
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/SetAttr
redirect_from:
-  /tB/Core/SetAttr
vba_attribution: true
---
# SetAttr
{: .no_toc }

Sets attribute information for a file.

Syntax: **SetAttr** *pathname*, *attributes*

*pathname*
: *required* String expression that specifies a file name; may include directory or folder, and drive.

*attributes*
: *required* Constant or numeric expression whose sum specifies file attributes.

### Settings

The *attributes* settings are:

| Constant       | Value | Description                         |
|----------------|:-----:|-------------------------------------|
| **vbNormal**   | 0     | Normal (default).                   |
| **vbReadOnly** | 1     | Read-only.                          |
| **vbHidden**   | 2     | Hidden.                             |
| **vbSystem**   | 4     | System file.                        |
| **vbArchive**  | 32    | File has changed since last backup. |

**SetAttr** passes *attributes* to Windows as it is, so it sets any attribute Windows lets a program set, such as 256 (temporary) or 8192 (not indexed), and raises an error where Windows refuses. A bit that Windows ignores, such as **vbDirectory** (16) on a file, is left out.

> [!NOTE]
> VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*, for *attributes* that are not a sum of the values in the table, and for **vbDirectory** on a folder.

**SetAttr** sets the attributes of a file that is open, whatever mode it is open in, without an error.

<!-- bug: setattr-open-file-no-error -->
> [!WARNING] BETA 1010
> This differs from VB6 and 64-bit VBA, which raise run-time error 55 (*File already open*) for a file open for **Output**, **Append**, **Binary** or **Random**, and leave its attributes unchanged. They set them only for a file open for **Input**. So twinBASIC can make a file read-only while the program still has it open for writing.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | no file or folder has the name *pathname*, which includes one in a folder or drive that does not exist, a zero-length string, and a name with a character a name cannot hold<br>*pathname* holds a wildcard |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* or *attributes* is **Null** |

> [!NOTE] BETA 1010
> When no file or folder has the name *pathname*, which includes one in a folder or drive that does not exist, a zero-length string, and a name with a character a name cannot hold, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*, instead.

> [!NOTE] BETA 1010
> When *pathname* holds a wildcard, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When the file is open for **Output**, **Append**, **Binary** or **Random**, VB6 and 64-bit VBA raise error [55 (`&H37`)](tb:Errors#55), *File already open*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **SetAttr** statement to set attributes for a file.

```tb check_build
SetAttr "TESTFILE", vbHidden    ' Set hidden attribute.
SetAttr "TESTFILE", vbHidden + vbReadOnly    ' Set hidden and read-only attributes.
```

### See Also

- [GetAttr](GetAttr) function
