---
title: Print
parent: Statements
permalink: /tB/Core/Print
vba_attribution: true
---
# Print
{: .no_toc }

Writes display-formatted data to a file, to the Debug Console, or to a drawing surface.

**Print** is one language-level statement, not a method. The same *outputlist* grammar applies wherever it is used; only the target changes.

Syntax:

- > **Print** **#** *filenumber* **,** [ *outputlist* ]
- > **Debug.Print** [ *outputlist* ]
- > *object*.**Print** [ *outputlist* ]

## The output list

*outputlist* is a list of expressions, optionally separated and positioned by the items below. It has the following syntax:

> [ { **Spc(***n***)** \| **Tab** [ **(***n***)** ] } ] [ *expression* ] [ *charpos* ]

**Spc(***n***)**
: Inserts *n* space characters at the current position.

**Tab(***n***)**
: Moves the insertion point to column *n*. **Tab** with no argument moves it to the beginning of the next [print zone](../Gloss#print-zone).

*expression*
: A numeric or string expression to write.

*charpos*
: The insertion point for the next character. A semicolon places it immediately after the last character written; a comma moves it to the next print zone. If *charpos* is omitted, the next expression begins on a new line.

Multiple expressions may be separated by either a space or a semicolon; a space has the same effect as a semicolon. A comma at the end of the list suppresses the line break, so the next **Print** continues the same line. With no *outputlist* at all, **Print** writes a blank line.

### Print zones

A comma advances to the next [print zone](../Gloss#print-zone) --- a column every 14 character widths. Because a number is written with a leading space where its sign would go and a trailing space after the value, a positive number in the first zone begins at column 1 rather than column 0:

```tb
Debug.Print 1, 2, 3
' writes:  1             2             3
```

An expression that reaches the end of its zone pushes the next one into the zone after. The test is made on the position the statement has reached, not on the length of the expression, so an expression that stops just short of a zone boundary still skips to the following zone --- there has to be room for at least one more character.

## Writing to a file

**Print #** writes an image of the data to a sequential file opened with [**Open**](Open).

*filenumber*
: Any valid file number.

When *outputlist* is omitted and only a list separator follows *filenumber*, a blank line is written.

Data written with **Print #** is usually read back with [**Line Input #**](Line-Input) or [**Input #**](Input). Because **Print #** writes an image of the data rather than a delimited record, it has to be written so that it reads back correctly: when **Tab** is used with no argument to move to the next print zone, **Print #** writes the intervening spaces to the file as well.

For **Boolean** data, either `True` or `False` is written. The keywords are not translated, whatever the locale. **Date** data is written using the system's standard short date format; when either the date or the time component is missing or zero, only the part supplied is written. Nothing is written for **Empty**, but `Null` is written for **Null**. For **Error** data the output is `Error `*errorcode*, and the **Error** keyword is not translated either. All other data is formatted with the locale's decimal separator.

> [!NOTE]
> When the data is to be read back with [**Input #**](Input), use [**Write #**](Write) rather than **Print #**. **Write #** delimits each field properly, which is what makes it readable by **Input #** and readable in any locale.

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

## Writing to the Debug Console

[**Debug.Print**](../Modules/Debug#print) writes to the IDE's [Debug Console](../IDE/Project/DebugConsole). The console is monospaced, so a print zone there is 14 characters wide and zones begin at columns 0, 14, 28 and so on. [**Debug.TracePrint**](../Modules/Debug#traceprint) takes the same *outputlist* but writes to the trace log instead.

## Writing to a drawing surface

[**Form**](../Packages/VB/Form/), [**PictureBox**](../Packages/VB/PictureBox/), [**Printer**](../Packages/VB/Printer/), [**PropertyPage**](../Packages/VB/PropertyPage/), [**Report**](../Packages/VB/Report/) and [**UserControl**](../Packages/VB/UserControl/) all accept **Print**. Text is drawn with the object's **Font** starting at its **CurrentX** / **CurrentY**, which advance as it goes.

On a drawing surface a column is the font's average character width rather than a fixed number of characters, so **print zones line up even in a proportional font**. The statement positions each field by column; it does not pad the text with spaces.

## How Print reaches its target

**Print** is not a member that each class happens to provide. The compiler drives it against any object whose class implements [**IVBPrint**](../Packages/VB/IVBPrint), a three-member interface in the [VB package](../Packages/VB/). The statement evaluates the expressions and works out the column arithmetic itself, then calls the target to write text and to move the print position.

Reading a class's **Column** property and writing it back is what makes a comma work, which is why a proportional font does not break alignment: the statement deals in columns, and the target decides what a column is worth.

## See Also

- [**Open** statement](Open), [**Close** statement](Close)
- [**Write #** statement](Write) -- delimited output that [**Input #**](Input) can read back
- [**Input #** statement](Input), [**Line Input #** statement](Line-Input)
- [**Debug.Print**](../Modules/Debug#print) -- the Debug Console target
- [**IVBPrint**](../Packages/VB/IVBPrint) interface -- how a class becomes a **Print** target
- [print zone](../Gloss#print-zone) in the glossary
