---
title: SetAttr
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/SetAttr
redirect_from:
-  /tB/Core/SetAttr
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

A run-time error occurs if you try to set the attributes of an open file.

### Example

This example uses the **SetAttr** statement to set attributes for a file.

```tb
SetAttr "TESTFILE", vbHidden    ' Set hidden attribute.
SetAttr "TESTFILE", vbHidden + vbReadOnly    ' Set hidden and read-only attributes.
```

### See Also

- [GetAttr](GetAttr) function

{% include VBA-Attribution.md %}
