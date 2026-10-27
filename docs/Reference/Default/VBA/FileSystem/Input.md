---
title: Input, Input$
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Input
redirect_from:
  - /tB/Modules/HiddenModule/Input
vba_attribution: true
---
# Input, Input$
{: .no_toc }

Returns a fixed number of characters read from a file opened in **Input** or **Binary** mode.

Syntax:
- **Input(** *Number* **,** [ **#** ] *FileNumber* **)** --- returns a **Variant**.
- **Input$(** *Number* **,** [ **#** ] *FileNumber* **)** --- returns a **String**.

*Number*
: *required* The number of characters to return.

*FileNumber*
: *required* The file number used to open the file with the [**Open**](../../Core/Open) statement.

Data read with **Input** is usually written to a file with **Print #** or **[Put](../../Core/Put)**. Use this function only with files opened in **Input** or **Binary** mode.

Unlike the **Input #** statement, the **Input** function returns all the characters it reads, including commas, carriage returns, linefeeds, quotation marks, and leading spaces.

For files opened for **Binary** access, an attempt to read through the file using **Input** until [**EOF**](EOF) returns **True** generates an error. Use [**LOF**](LOF) and [**Loc**](Loc) instead of **EOF** when reading binary files with **Input**, or use **[Get](../../Core/Get)** when **EOF** is needed.

> [!NOTE]
> Use [**InputB**](InputB) for byte data contained within text files. With **InputB**, *Number* specifies the number of bytes to return rather than the number of characters.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *Number* is more characters than are left in a file open for **Input**<br>the file is open for **Output**, **Append** or **Random**<br>*Number* is negative, after rounding<br>*FileNumber* is not the number of an open file<br>*Number* is 0, after rounding |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *Number* or *FileNumber* is **Null** |

> [!NOTE] BETA 1010
> When *Number* is more characters than are left in a file open for **Input**, VB6 and 64-bit VBA raise error [62 (`&H3E`)](tb:Errors#62), *Input past end of file*, instead.

> [!NOTE] BETA 1010
> When the file is open for **Output**, **Append** or **Random**, VB6 and 64-bit VBA raise error [54 (`&H36`)](tb:Errors#54), *Bad file mode*, instead.

> [!NOTE] BETA 1010
> When *Number* is negative, after rounding, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *FileNumber* is not the number of an open file, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When *Number* is 0, after rounding, VB6 and 64-bit VBA raise no error.

<!-- /errors -->

### Example

This example uses the **Input** function to read one character at a time from a file and print it to the [Debug Console](../../IDE/Debugging/Debug-Console). *TESTFILE* is assumed to be a text file with a few lines of sample data.

```tb check_build
Dim MyChar As Variant
Open "TESTFILE" For Input As #1     ' Open file.
Do While Not EOF(1)                 ' Loop until end of file.
    MyChar = Input(1, #1)           ' Get one character.
    Debug.Print MyChar              ' Print to the Debug Console.
Loop
Close #1                            ' Close file.
```

### See Also

- [InputB, InputB$](InputB) functions
- [Open](../../Core/Open) statement
- [EOF](EOF), [LOF](LOF), [Loc](Loc) functions
