---
title: cDataGrid
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cDataGrid
has_toc: false
---

# cDataGrid class
{: .no_toc }

Draws a table of text into the screen buffer, with a header row, columns of fixed widths, aligned cells, coloured rows and one selected row.

A **cDataGrid** keeps the [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer) of the console it was made with. The program gives it the rows of text, the widths and alignments of the columns and the colours of the rows with the four `Set` members, and then calls [**Render**](#render), which draws the whole table at a position. The grid holds no scroll position and does not read keys: a program that lets the user choose a row calls [**MoveUp**](#moveup) and [**MoveDown**](#movedown) from its own key handler and draws the table again.

```tb check_build
Dim con As New cConsole
Dim grid As cDataGrid
Dim rows(0 To 2) As String
Dim widths(0 To 1) As Long
Dim aligns(0 To 1) As ColumnAlignment
Dim colors(0 To 2) As ConsoleColor
Dim ci As ConsoleCharInfo

con.EnterFullScreenMode
Set grid = New cDataGrid(con)

rows(0) = "Name" & vbTab & "Size"                 ' the first row is the header
rows(1) = "readme.txt" & vbTab & "1,204"
rows(2) = "setup.exe" & vbTab & "88,512"
widths(0) = 12: widths(1) = 8
aligns(0) = ColumnAlignment.Left: aligns(1) = ColumnAlignment.Right
colors(1) = ConsoleColor.Green: colors(2) = ConsoleColor.Yellow

grid.SetRows rows
grid.SetColumnWidths widths
grid.SetColumnAlignments aligns
grid.SetRowColors colors
grid.SelectedRow = 1                              ' the second row under the header
grid.Render 0, 0

ci = con.Buffer.GetChar(0, 3)                     ' the selected row
Debug.Print ci.Char & " " & ci.ForeColor & " " & ci.BackColor
ci = con.Buffer.GetChar(0, 2)
Debug.Print ci.Char & " " & ci.ForeColor & " " & ci.BackColor
con.ExitFullScreenMode
' Output:
' s 15 1
' r 10 0
```

The sample draws these four rows, the first at row 0 and column 0. The selected row is white on dark blue, and the row above it is green:

```text
Name        │    Size
────────────┼────────
readme.txt  │   1,204
setup.exe   │  88,512
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cDataGrid**. Columns and rows are counted from 0 in the buffer.

## The data

The text of the table is an array of **String**, one element for each row. Within a row the cells are separated by the tab character, `vbTab`. When [**ShowHeader**](#showheader) is **True**, which is the default, the first element is the header row and the others are data rows.

The grid needs all four of the arrays of [**SetRows**](#setrows), [**SetColumnWidths**](#setcolumnwidths), [**SetColumnAlignments**](#setcolumnalignments) and [**SetRowColors**](#setrowcolors) before [**Render**](#render). **Render** raises error 9, *Subscript out of range*, when any of the four was never set.

The number of columns is the number of elements of the widths array. A cell is cut to the width of its column, without an ellipsis, and padded with spaces to that width; an alignment of **Center** puts the extra space of an odd padding on the right. A row with fewer cells than columns has empty cells, and the cells beyond the last column are dropped.

With [**ShowBorders**](#showborders) **True**, which is the default, a vertical bar U+2502 is drawn in the column after each column except the last, and a line of U+2500 with U+253C where the bars are lies under the header. That is not a frame: the table has no outer border and no lines between data rows. With **ShowBorders** at **False** there is no separator column and no line, and the columns follow each other with no space between.

The colours are these. The header is drawn in the header colour on black. A data row is drawn in the *fore* and *back* colours of [**Render**](#render), or in the colour from [**SetRowColors**](#setrowcolors) when one is given, on *back*. The selected row is white on the selection colour. The separator line and the vertical bars take *fore* and *back*, and in the header the header colour.

## Enumeration

### ColumnAlignment
{: .no_toc }

The alignment of the cells of a column. The enumeration is declared in the class, and its members are written without the class, as in `ColumnAlignment.Right`.

| Member | Value | Cells |
|---|---:|---|
| **Left** | 0 | start at the left edge of the column; the default |
| **Center** | 1 | are centred; for an odd padding the extra space is on the right |
| **Right** | 2 | end at the right edge of the column |

An element of the alignment array that is missing, because the array is shorter than the number of columns, is **Left**.

## Constructor

### New
{: .no_toc }

Creates a grid for a console.

Syntax: **New cDataGrid** ( *console* )

*console*
: *required* A [**cConsole**](../TBMANLIB_ConsoleCore/cConsole) that is in full-screen mode.

Keeps the console and its current [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer). The grid starts with the header colour **Cyan**, the selection colour **DarkBlue**, no selected row (the row number -1), the header shown and the separators shown. When the console is not in full-screen mode, the buffer is **Nothing** and [**Render**](#render) raises error 91. See [How a component works](./#how-a-component-works).

## Properties

All the properties can be set and none can be read: each has a `Let` and no `Get`. They take effect at the next [**Render**](#render).

### HeaderColor
{: .no_toc }

The colour of the header row. A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), write-only. The default is **Cyan**. The header is drawn on a black background whatever *back* is.

Syntax: *object*.**HeaderColor** **=** *value*

### SelectedRow
{: .no_toc }

The selected row. **Long**, write-only. The default is -1, which selects none.

Syntax: *object*.**SelectedRow** **=** *value*

*value*
: A **Long**, the number of the row counted from 0 among the data rows, not counting the header row.

### SelectionColor
{: .no_toc }

The background colour of the selected row. A **ConsoleColor**, write-only. The default is **DarkBlue**. The text of the selected row is **White**.

Syntax: *object*.**SelectionColor** **=** *value*

### ShowBorders
{: .no_toc }

Whether the column separators and the line under the header are drawn. **Boolean**, write-only. The default is **True**.

Syntax: *object*.**ShowBorders** **=** *value*

### ShowHeader
{: .no_toc }

Whether the first row is a header. **Boolean**, write-only. The default is **True**. With **False**, every row is a data row, and no line is drawn under the first row.

Syntax: *object*.**ShowHeader** **=** *value*

## Methods

### GetRowCount
{: .no_toc }

Returns the number of data rows.

Syntax: *object*.**GetRowCount** ( ) **As Long**

Returns the number of elements of the rows array, less one when [**ShowHeader**](#showheader) is **True**. Raises error 9 when [**SetRows**](#setrows) was never called.

### MoveDown
{: .no_toc }

Selects the next row.

Syntax: *object*.**MoveDown** ( *maxRow* )

*maxRow*
: *required* A **Long**, the number of data rows. The selection moves down only while the selected row is less than *maxRow* - 1, so the last data row is the last one reachable. [**GetRowCount**](#getrowcount) gives the number.

With no selection (-1) the first data row is selected.

### MoveUp
{: .no_toc }

Selects the previous row.

Syntax: *object*.**MoveUp** ( )

The selection moves up only while the selected row is above 0, so the first data row is the first one reachable, and a call with no selection does nothing.

### Render
{: .no_toc }

Draws the table.

Syntax: *object*.**Render** ( *col* , *row* [ , *fore* [ , *back* ] ] )

*col*, *row*
: *required* **Long** values, the position of the upper left cell of the table.

*fore*
: *optional* A **ConsoleColor**, the text colour of the data rows without a row colour, and of the separators. The default is **Gray**.

*back*
: *optional* A **ConsoleColor**, the background of the data rows and the separators. The default is **Black**.

Draws the header row, the line under it when [**ShowBorders**](#showborders) is on, and then every data row, one row of the buffer each, going down from *row*. The grid is as wide as the column widths plus one column for each separator, and as high as the number of rows plus one for the line. Rows that reach below the buffer are dropped.

### ScrollTo
{: .no_toc }

Selects a row.

Syntax: *object*.**ScrollTo** ( *row* )

*row*
: *required* A **Long**, the number of the data row, counted from 0.

The method only sets the selected row, as [**SelectedRow**](#selectedrow) does. It does not scroll: the grid has no scroll position, and always draws all its rows.

### SetColumnAlignments
{: .no_toc }

Sets the alignment of each column.

Syntax: *object*.**SetColumnAlignments** ( *alignments* )

*alignments*
: *required* An array of [**ColumnAlignment**](#columnalignment), passed by reference. The element for the first column is the one at the lower bound of the array. The method copies the array.

### SetColumnWidths
{: .no_toc }

Sets the width of each column.

Syntax: *object*.**SetColumnWidths** ( *widths* )

*widths*
: *required* An array of **Long**, passed by reference, the width in cells of each column. Its number of elements is the number of columns. The method copies the array.

### SetRowColors
{: .no_toc }

Sets the text colour of rows.

Syntax: *object*.**SetRowColors** ( *colors* )

*colors*
: *required* An array of [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), passed by reference. The method copies the array.

Both arrays start at index 0. The colour of the row at index *i* of the array of [**SetRows**](#setrows) is `colors(i)`. The header row is counted, so with a header the first data row takes `colors(1)`, and `colors(0)` is not used: the header has its own colour. A row whose index lies beyond the end of the colour array keeps *fore*. The selected row ignores its colour.

### SetRows
{: .no_toc }

Sets the text of the table.

Syntax: *object*.**SetRows** ( *rows* )

*rows*
: *required* An array of **String**, passed by reference, one element for each row, with the cells separated by the tab character. The method copies the array: later changes to it do not reach the grid.

## See Also

- [cConsolePanel](cConsolePanel) class -- a bordered area to draw the table in
- [cProgressBar](cProgressBar) class and [cSparkline](cSparkline) class -- other drawing components
- [cConsoleBuffer](../TBMANLIB_ConsoleCore/cConsoleBuffer) class -- the buffer the table is drawn into
