---
title: Loc
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Loc
redirect_from:
-  /tB/Core/Loc
---
# Loc
{: .no_toc }

Returns a **Long** specifying the current read/write position within an open file.

Syntax: **Loc(** *filenumber* **)**

*filenumber*
: *required* **Integer** containing a valid file number.

### Remarks

The return value depends on the file access mode:

| Mode           | Return value                                                |
|----------------|-------------------------------------------------------------|
| **Random**     | Number of the last record read from or written to the file. |
| **Sequential** | Current byte position in the file divided by 128.           |
| **Binary**     | Position of the last byte read or written.                  |

### Example

This example uses the **Loc** function to return the current read/write position within an open file. This example assumes that `TESTFILE` is a text file with a few lines of sample data.

```tb
Dim MyLocation, MyLine
Open "TESTFILE" For Binary As #1    ' Open file.
Do While MyLocation < LOF(1)    ' Loop until end of file.
    MyLine = MyLine & Input(1, #1)    ' Read character into variable.
    MyLocation = Loc(1)    ' Get current position within file.
    Debug.Print MyLine; Tab; MyLocation
Loop
Close #1    ' Close file.
```

### See Also

- [LOF](LOF) function
- [Seek](Seek) function
- [EOF](EOF) function

{% include VBA-Attribution.md %}
