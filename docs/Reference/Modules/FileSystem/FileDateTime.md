---
title: FileDateTime
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FileDateTime
redirect_from:
-  /tB/Core/FileDateTime
---
# FileDateTime
{: .no_toc }

Returns a **Variant** (**Date**) indicating the date and time when a file was created or last modified.

Syntax: **FileDateTime(** *pathname* **)**

*pathname*
: *required* String expression that specifies a file name. The *pathname* may include the directory or folder, and the drive.

### Example

This example uses the **FileDateTime** function to determine the date and time a file was created or last modified. The format of the date and time displayed is based on the locale settings of your system.

```vb
Dim MyStamp
' Assume TESTFILE was last modified on February 12, 1993 at 4:35:47 PM.
' Assume English/U.S. locale settings.
MyStamp = FileDateTime("TESTFILE")    ' Returns "2/12/93 4:35:47 PM".
```

### See Also

- [FileLen](FileLen), [GetAttr](GetAttr) functions

{% include VBA-Attribution.md %}
