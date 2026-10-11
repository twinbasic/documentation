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

**SetAttr** sets the attributes of a file that is open, whatever mode it is open in, without an error.

> [!WARNING]
> In BETA 1005 this differs from VB6, which raises run-time error 55 (*File already open*) for a file open for **Output**, **Append**, **Binary** or **Random**, and leaves its attributes unchanged. VB6 sets them only for a file open for **Input**. So twinBASIC can make a file read-only while the program still has it open for writing.

> [!NOTE]
> In BETA 1005, **SetAttr** raises run-time error -2147467259 (`&H80004005`) for a file that does not exist, where VB6 raises 53 (*File not found*).

### Example

This example uses the **SetAttr** statement to set attributes for a file.

```tb check_build
SetAttr "TESTFILE", vbHidden    ' Set hidden attribute.
SetAttr "TESTFILE", vbHidden + vbReadOnly    ' Set hidden and read-only attributes.
```

### See Also

- [GetAttr](GetAttr) function
