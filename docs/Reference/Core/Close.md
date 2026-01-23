---
title: Close
parent: Statements
permalink: /tB/Core/Close
---

# Close
{: .no_toc }

Concludes input/output (I/O) to a file opened using the **Open**  statement.

Syntax: 

- **Close** [[ **#** ] *filenumber1* ] [ **,** [ **#** ] *filenumber2* ] *. . .*  
  The *filenumber* is any valid file number, given as an expression evaluating to an integer. The file numbers do not have to be constant. The **#** prefixes are optional.
  
- **Close**  
  If you omit *filenumber* list, all active files opened by the **Open**  statement are closed.

> [!WARNING]
>
> The parameterless form should be used only when shutting down/exiting the program, since it will close *all*  open files that were opened elsewhere in the program.

When you close files that were opened for **Output** or **Append**, the  final buffer of output is written to the operating system buffer for that file.  All buffer space associated with the closed file is released.

When the **Close** statement is executed, the association of a file with  its file number ends.

### Example

This example uses the **Close** statement to close the three files opened  for **Output**.

```vb
Dim I%, FileName$, FileNumber%(1 To 3)
For I = 1 To 3             ' Loop 3 times
   FileName = "TEST" & I   ' Create file name
   FileNumber(I) = FreeFile()
   Open FileName For Output As #FileNumber(I)   ' Open file
   Print #FileNumber(I), "This is a test."      ' Write string to file
Next I
Close #FileNumber(1), #FileNumber(2), #FileNumber(3)  ' Close the 3 open files.
```

### See Also

- [Open](Open) statement
- [FreeFile](../Modules/FileSystem) function

{% include VBA-Attribution.md %}
