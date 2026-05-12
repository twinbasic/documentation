---
title: Width
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/Width
redirect_from:
-  /tB/Core/Width
vba_attribution: true
---
# Width #
{: .no_toc }

Assigns an output line width to a file opened by the [**Open**](../../Core/Open) statement.

Syntax: **Width #** *FileNumber* **,** *Width*

*FileNumber*
: *required* The file number used to open the file.

*Width*
: *required* A numeric expression in the range 0–255, inclusive, indicating how many characters appear on a line before a new line is started. If *Width* equals `0`, there is no limit to the length of a line. The default is `0`.

### Example

This example sets the output line width to 5 — five characters are written per line before the channel wraps.

```tb
Dim I As Long
Open "TESTFILE" For Output As #1     ' Open file for output.
Width #1, 5                          ' Set output line width to 5.
For I = 0 To 9                       ' Loop 10 times.
    Print #1, Chr(48 + I);           ' Prints five characters per line.
Next I
Close #1                             ' Close file.
```

### See Also

- [Open](../../Core/Open) statement
- [Print #](../../Core/Print) statement
