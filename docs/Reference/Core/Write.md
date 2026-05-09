---
title: Write #
parent: Statements
permalink: /tB/Core/Write
---
# Write # statement
{: .no_toc }

Writes data to a sequential file.

Syntax:
> **Write** **#** *filenumber* **,** [ *outputlist* ]

*filenumber*
: Any valid file number.

*outputlist*
: *optional*  One or more comma-delimited numeric expressions or string expressions to write to a file.

Data written with **Write #** is usually read from a file with [**Input #**](Input).

If you omit *outputlist* and include a comma after *filenumber*, a blank line is printed to the file. Multiple expressions can be separated with a space, a semicolon, or a comma. A space has the same effect as a semicolon.

When **Write #** is used to write data to a file, several universal assumptions are followed so that the data can always be read and correctly interpreted by using **Input #**, regardless of locale:

- Numeric data is always written by using the period as the decimal separator.
- For **Boolean** data, either `#TRUE#` or `#FALSE#` is printed. The **True** and **False** keywords are not translated, regardless of locale.
- **Date** data is written to the file by using the universal date format. When either the date or the time component is missing or zero, only the part provided gets written to the file.
- Nothing is written to the file if *outputlist* data is **Empty**. However, for **Null** data, `#NULL#` is written.
- For **Error** data, the output appears as `#ERROR `*errorcode*`#`. The **Error** keyword is not translated, regardless of locale.

Unlike the [**Print #**](Print) statement, the **Write #** statement inserts commas between items and quotation marks around strings as they are written to the file. You don't have to put explicit delimiters in the list. **Write #** inserts a newline character — that is, a carriage return-linefeed (**Chr**(13) + **Chr**(10)) — after it has written the final character in *outputlist* to the file.

> [!NOTE]
> You should not write strings that contain embedded quotation marks (for example, `"1,2""X"`) for use with the **Input #** statement; **Input #** parses this string as two complete and separate strings.

### Example

This example uses the **Write #** statement to write raw data to a sequential file.

```tb
Open "TESTFILE" For Output As #1    ' Open file for output.
Write #1, "Hello World", 234    ' Write comma-delimited data.
Write #1, ' Write blank line.

Dim MyBool, MyDate, MyNull, MyError
' Assign Boolean, Date, Null, and Error values.
MyBool = False : MyDate = #February 12, 1969# : MyNull = Null
MyError = CVErr(32767)
' Boolean data is written as #TRUE# or #FALSE#. Date literals are
' written in universal date format, for example, #1994-07-13#
' represents July 13, 1994. Null data is written as #NULL#.
' Error data is written as #ERROR errorcode#.
Write #1, MyBool; " is a Boolean value"
Write #1, MyDate; " is a date"
Write #1, MyNull; " is a null value"
Write #1, MyError; " is an error value"
Close #1    ' Close file.
```

### See Also

- [**Open** statement](Open)
- [**Close** statement](Close)
- [**Input #** statement](Input)
- [**Line Input #** statement](Line-Input)
- [**Print #** statement](Print)

{% include VBA-Attribution.md %}
