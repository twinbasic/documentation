---
title: Line Input #
parent: Statements
permalink: /tB/Core/Line-Input
vba_attribution: true
---
# Line Input # statement
{: .no_toc }

Reads a single line from an open sequential file and assigns it to a **String** variable.

Syntax:
> **Line Input** **#** *filenumber* **,** *varname*

*filenumber*
: Any valid file number.

*varname*
: Valid **Variant** or **String** variable name.

Data read with **Line Input #** is usually written to a file with [**Print #**](Print).

The **Line Input #** statement reads from a file one character at a time until it encounters a carriage return (**Chr**(13)) or carriage return-linefeed (**Chr**(13) + **Chr**(10)) sequence. Carriage return-linefeed sequences are skipped rather than appended to the character string.

### Example

This example uses the **Line Input #** statement to read a line from a sequential file and assign it to a variable. This example assumes that `TESTFILE` is a text file with a few lines of sample data.

```tb
Dim TextLine
Open "TESTFILE" For Input As #1 ' Open file.
Do While Not EOF(1) ' Loop until end of file.
    Line Input #1, TextLine ' Read line into variable.
    Debug.Print TextLine ' Print to the Immediate window.
Loop
Close #1 ' Close file.
```

### See Also

- [**Open** statement](Open)
- [**Close** statement](Close)
- [**Input #** statement](Input)
- [**Print #** statement](Print)
- [**Write #** statement](Write)
- [**EOF** function](../Modules/FileSystem/EOF)
