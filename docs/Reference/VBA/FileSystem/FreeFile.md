---
title: FreeFile
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/FreeFile
redirect_from:
-  /tB/Core/FreeFile
vba_attribution: true
---
# FreeFile
{: .no_toc }

Returns an **Integer** representing the next file number available for use by the **Open** statement.

Syntax: **FreeFile** [ **(** *rangenumber* **)** ]

*rangenumber*
: *optional* **Variant** that specifies the range from which the next free file number is to be returned. Specify **0** (default) to return a file number in the range 1–255, inclusive. Specify **1** to return a file number in the range 256–511.

Use **FreeFile** to supply a file number that is not already in use.

### Example

This example uses the **FreeFile** function to return the next available file number. Five files are opened for output within the loop, and some sample data is written to each.

```tb
Dim MyIndex, FileNumber
For MyIndex = 1 To 5    ' Loop 5 times.
    FileNumber = FreeFile    ' Get unused file number.
    Open "TEST" & MyIndex For Output As #FileNumber    ' Create file name.
    Write #FileNumber, "This is a sample."    ' Output text.
    Close #FileNumber    ' Close file.
Next MyIndex
```
