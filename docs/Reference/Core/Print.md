---
title: Print #
parent: Statements
permalink: /tB/Core/Print
vba_attribution: true
---
# Print # statement
{: .no_toc }

Writes display-formatted data to a sequential file.

> [!NOTE]
> This page documents the **Print #** *statement* (file I/O). The unrelated `Debug.Print` statement writes to the **Immediate** window during debugging.

Syntax:
> **Print** **#** *filenumber* **,** [ *outputlist* ]

*filenumber*
: Any valid file number.

*outputlist*
: *optional* Expression or list of expressions to print. The *outputlist* settings are:

  > [ { **Spc(***n***)** \| **Tab** [ **(***n***)** ] } ] [ *expression* ] [ *charpos* ]

  **Spc(***n***)**
  : Used to insert space characters in the output, where *n* is the number of space characters to insert.

  **Tab(***n***)**
  : Used to position the insertion point to an absolute column number, where *n* is the column number. Use **Tab** with no argument to position the insertion point at the beginning of the next print zone.

  *expression*
  : Numeric expressions or string expressions to print.

  *charpos*
  : Specifies the insertion point for the next character. Use a semicolon to position the insertion point immediately after the last character displayed. Use **Tab(***n***)** to position the insertion point to an absolute column number. Use **Tab** with no argument to position the insertion point at the beginning of the next print zone. If *charpos* is omitted, the next character is printed on the next line.

Data written with **Print #** is usually read from a file with [**Line Input #**](Line-Input) or [**Input #**](Input).

When *outputlist* is omitted and only a list separator follows *filenumber*, a blank line is printed to the file.

Multiple expressions can be separated with either a space or a semicolon. A space has the same effect as a semicolon.

For **Boolean** data, either `True` or `False` is printed. The **True** and **False** keywords are not translated, regardless of the locale.

**Date** data is written to the file by using the standard short date format recognized by the system. When either the date or the time component is missing or zero, only the part provided gets written to the file.

Nothing is written to the file if *outputlist* data is **Empty**. However, if *outputlist* data is **Null**, `Null` is written to the file.

For **Error** data, the output appears as `Error `*errorcode*. The **Error** keyword is not translated regardless of the locale.

All data written to the file by using **Print #** is internationally-aware; that is, the data is properly formatted by using the appropriate decimal separator.

Because **Print #** writes an image of the data to the file, the data must be delimited so that it prints correctly. When **Tab** is used with no arguments to move the print position to the next print zone, **Print #** also writes the spaces between print fields to the file.

> [!NOTE]
> When the data is later read from a file by using the **Input #** statement, use the [**Write #**](Write) statement instead of the **Print #** statement to write the data to the file. Using **Write #** ensures the integrity of each separate data field by properly delimiting it, so that it can be read back in by using **Input #**. Using **Write #** also ensures that it can be correctly read in any locale.

### Example

This example uses the **Print #** statement to write data to a file.

```tb
Open "TESTFILE" For Output As #1 ' Open file for output.
Print #1, "This is a test" ' Print text to file.
Print #1, ' Print blank line to file.
Print #1, "Zone 1"; Tab; "Zone 2" ' Print in two print zones.
Print #1, "Hello"; " "; "World" ' Separate strings with space.
Print #1, Spc(5); "5 leading spaces " ' Print five leading spaces.
Print #1, Tab(10); "Hello" ' Print word at column 10.

' Assign Boolean, Date, Null and Error values.
Dim MyBool, MyDate, MyNull, MyError
MyBool = False : MyDate = #February 12, 1969# : MyNull = Null
MyError = CVErr(32767)
' True, False, Null, and Error are translated using locale settings of
' your system. Date literals are written using standard short date
' format.
Print #1, MyBool; " is a Boolean value"
Print #1, MyDate; " is a date"
Print #1, MyNull; " is a null value"
Print #1, MyError; " is an error value"
Close #1 ' Close file.
```

### See Also

- [**Open** statement](Open)
- [**Close** statement](Close)
- [**Write #** statement](Write)
- [**Input #** statement](Input)
- [**Line Input #** statement](Line-Input)
