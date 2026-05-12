---
title: Input #
parent: Statements
permalink: /tB/Core/Input
vba_attribution: true
---
# Input # statement
{: .no_toc }

Reads data from an open sequential file and assigns the data to variables.

> [!NOTE]
> This page documents the **Input #** *statement*. The unrelated [**Input** function](../Modules/HiddenModule/Input) reads a fixed number of characters from any open file.

Syntax:
> **Input** **#** *filenumber* **,** *varlist*

*filenumber*
: Any valid file number.

*varlist*
: Comma-delimited list of variables that are assigned values read from the file. *varlist* can't contain an array variable or an object variable. However, variables that describe an element of an array or user-defined type may be used.

Data read with **Input #** is usually written to a file with [**Write #**](Write). Use this statement only with files opened in **Input** or **Binary** mode. When read, standard string or numeric data is assigned to variables without modification.

The following table illustrates how other input data is treated:

| Data | Value assigned to variable |
|:-----|:-----|
| Delimiting comma or blank line | **Empty** |
| `#NULL#` | **Null** |
| `#TRUE#` or `#FALSE#` | **True** or **False** |
| `#`*yyyy-mm-dd hh:mm:ss*`#` | The date and/or time represented by the expression |
| `#ERROR `*errornumber*`#` | *errornumber* (variable is a **Variant** tagged as an error) |

Double quotation marks (`"`) within input data are ignored.

> [!NOTE]
> You should not write strings that contain embedded quotation marks (for example, `"1,2""X"`) for use with the **Input #** statement; **Input #** parses this string as two complete and separate strings.

Data items in a file must appear in the same order as the variables in *varlist* and match variables of the same data type. If a variable is numeric and the data is not numeric, a value of zero is assigned to the variable.

If you reach the end of the file while you are inputting a data item, the input is terminated and an error occurs.

> [!NOTE]
> To be able to correctly read data from a file into variables by using **Input #**, use the [**Write #**](Write) statement instead of the [**Print #**](Print) statement to write the data to the files. Using **Write #** ensures that each separate data field is properly delimited.

### Example

This example uses the **Input #** statement to read data from a file into two variables. This example assumes that `TESTFILE` is a file with a few lines of data written to it by using the **Write #** statement; that is, each line contains a string in quotations and a number separated by a comma, for example, `"Hello", 234`.

```tb
Dim MyString, MyNumber
Open "TESTFILE" For Input As #1    ' Open file for input.
Do While Not EOF(1)    ' Loop until end of file.
    Input #1, MyString, MyNumber    ' Read data into two variables.
    Debug.Print MyString, MyNumber    ' Print data to the Immediate window.
Loop
Close #1    ' Close file.
```

### See Also

- [**Open** statement](Open)
- [**Close** statement](Close)
- [**Line Input #** statement](Line-Input)
- [**Write #** statement](Write)
- [**Print #** statement](Print)
- [**Input** function](../Modules/HiddenModule/Input)
- [**EOF** function](../Modules/FileSystem/EOF)
