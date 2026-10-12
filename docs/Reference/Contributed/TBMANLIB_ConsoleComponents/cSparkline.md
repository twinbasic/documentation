---
title: cSparkline
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cSparkline
has_toc: false
---

# cSparkline class
{: .no_toc }

Draws a small chart of a series of numbers into the screen buffer, as Braille dots, as asterisks joined by vertical bars, or as columns of blocks.

A **cSparkline** keeps the [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer) of the console it was made with. [**Render**](#render) takes a series of **Double** values, scales them between a minimum and a maximum, and draws one column of the chart for each of *width* columns of the buffer. [**RenderWithStats**](#renderwithstats) also writes the smallest, the average and the largest value under the chart. The class draws into the buffer only; [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh) of the console shows it.

```tb check_build
Dim con As New cConsole
Dim chart As cSparkline
Dim cpu(0 To 9) As Double
Dim i As Long

con.EnterFullScreenMode
Set chart = New cSparkline(con)

For i = 0 To 9
    cpu(i) = 10 + i * 8
Next
chart.RenderWithStats 2, 1, 10, 4, cpu, 0, 100, ConsoleColor.Green, ConsoleColor.Black, SparklineCharSet.Braille
con.Refresh
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cSparkline**. Columns and rows are counted from 0 in the buffer.

## The series

The series is an array of **Double** values that has to start at index 0: the drawing code addresses the values by position from 0, so an array with a lower bound of 1 raises error 9, *Subscript out of range*.

A series of fewer than 2 values draws nothing, and an array that was never allocated raises error 9. Each value is scaled to `(value - minValue) / (maxValue - minValue)` and limited to 0 to 1. A *minValue* equal to *maxValue* raises error 11, *Division by zero*. A *width* of 0 raises error 11 too.

The chart has *width* columns. When the series has more values than columns, each column takes the value at position `CLng(x * count / width)`, where *x* is the column counted from 0; the Braille set takes all the values from that position up to the position of the next column. When the series has fewer values than columns, the ASCII and Block sets repeat values, and the Braille set leaves some columns empty. The series is not averaged or smoothed.

## Character sets

### Braille
{: .no_toc }

Each cell of the chart is a character of the Braille Patterns block, U+2800 plus a number from 0 to 255 in which each dot is one bit. The chart is *width* cells wide and `(height + 3) \ 4` cells high, so *height* counts dots, four to a cell. Every cell of that area is written, with U+2800 where no dot is set, so the chart clears its area.

For each value, the vertical position in dots is `CLng((1 - scaled) * height)`, counted from the top: 0 for the maximum, and *height* for the minimum. The dot is set in the cell row `position \ 4` at the dot `position Mod 4` of the cell. The code uses the first four bits of the Braille pattern for those four positions, which are the dots 1, 2 and 3 of the left column, from the top, and the dot 4, which is the top dot of the right column. A value in the lowest of the four positions of a cell therefore appears at the top of the right column, and not below the third dot.

A value equal to the minimum has the position *height*. When *height* is a multiple of 4 that position lies below the last cell row, and the value sets no dot.

With 5 values, 5 columns and a height of 4, the cells are:

```tb check_build
Dim con As New cConsole
Dim chart As cSparkline
Dim v(0 To 4) As Double
Dim ci As ConsoleCharInfo
Dim x As Long
Dim line As String

con.EnterFullScreenMode
Set chart = New cSparkline(con)
v(0) = 100: v(1) = 75: v(2) = 50: v(3) = 25: v(4) = 0

chart.Render 0, 0, 5, 4, v, 0, 100
For x = 0 To 4
    ci = con.Buffer.GetChar(x, 0)
    line = line & Hex$(AscW(ci.Char)) & " "
Next
Debug.Print Trim$(line)
con.ExitFullScreenMode
' Output:
' 2801 2802 2804 2808 2800
```

The cells are `U+2801`, `U+2802`, `U+2804` and `U+2808` for the values 100, 75, 50 and 25: the dots 1, 2, 3 and 4. The value 0 sets no dot.

Rows of cells are drawn in the reverse order. The code draws the cell row for dot rows 0 to 3 (the top ones) on the bottom row of the chart, and the cell row for dot rows 4 to 7 above it. For a *height* above 4 the chart is therefore upside down in its rows: a value in the upper half of the range appears in the lower row.

```tb check_build
Dim con As New cConsole
Dim chart As cSparkline
Dim v(0 To 4) As Double
Dim ci As ConsoleCharInfo
Dim x As Long
Dim y As Long
Dim line As String

con.EnterFullScreenMode
Set chart = New cSparkline(con)
v(0) = 0: v(1) = 25: v(2) = 50: v(3) = 75: v(4) = 100        ' a rising series

chart.Render 0, 0, 5, 8, v, 0, 100
For y = 0 To 1
    line = ""
    For x = 0 To 4
        ci = con.Buffer.GetChar(x, y)
        line = line & Hex$(AscW(ci.Char)) & " "
    Next
    Debug.Print Trim$(line)
Next
con.ExitFullScreenMode
' Output:
' 2800 2804 2801 2800 2800
' 2800 2800 2800 2804 2801
```

The series rises, and the first row (the top one) holds the dots of the values 25 and 50, while the second row holds those of 75 and 100.

### ASCII
{: .no_toc }

The chart is *width* columns wide and *height* rows high. A value is drawn as `*` in the row `CLng((1 - scaled) * (height - 1))` counted from the top, so the maximum is in the top row and the minimum in the bottom row. When the point of a column lies more than one row above or below the point of the column on its left, the cells of that left column strictly between the two rows are filled with U+2502 (a vertical bar). The set writes only the points and the bars; it does not clear the other cells of its area.

### Block
{: .no_toc }

The chart is *width* columns wide and *height* rows high. Each column is a bar of U+2588 (a full block) of `CLng(scaled * height)` cells from the bottom, and a column whose value is above the minimum has at least one cell. The cells above the bar are set to spaces, so the area is cleared.

```tb check_build
Dim con As New cConsole
Dim chart As cSparkline
Dim v(0 To 4) As Double
Dim ci As ConsoleCharInfo
Dim x As Long
Dim y As Long
Dim line As String

con.EnterFullScreenMode
Set chart = New cSparkline(con)
v(0) = 0: v(1) = 25: v(2) = 50: v(3) = 75: v(4) = 100

chart.Render 0, 0, 5, 4, v, 0, 100, ConsoleColor.Green, ConsoleColor.Black, SparklineCharSet.Block
For y = 0 To 3
    line = ""
    For x = 0 To 4
        ci = con.Buffer.GetChar(x, y)
        If ci.Char = ChrW$(&H2588) Then line = line & "#" Else line = line & " "
    Next
    Debug.Print "[" & line & "]"
Next
con.ExitFullScreenMode
' Output:
' [    #]
' [   ##]
' [  ###]
' [ ####]
```

## Enumeration

### SparklineCharSet
{: .no_toc }

The character set of a chart. The enumeration is declared in the class, and its members are written without the class, as in `SparklineCharSet.Block`.

| Member | Value | Drawn with |
|---|---:|---|
| **Braille** | 0 | Braille dots; the default. See [Braille](#braille). |
| **ASCII** | 1 | `*` and the bar U+2502. See [ASCII](#ascii). |
| **Block** | 2 | U+2588 and spaces. See [Block](#block). |

The name **ASCII** is the author's: the set also uses the bar U+2502, which is not an ASCII character.

## Constructor

### New
{: .no_toc }

Creates a sparkline for a console.

Syntax: **New cSparkline** ( *console* )

*console*
: *required* A [**cConsole**](../TBMANLIB_ConsoleCore/cConsole) that is in full-screen mode.

Keeps the console and its current [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer). When the console is not in full-screen mode, the buffer is **Nothing** and [**Render**](#render) raises error 91. See [How a component works](./#how-a-component-works).

## Methods

### Render
{: .no_toc }

Draws a chart of a series of values.

Syntax: *object*.**Render** ( *col* , *row* , *width* , *height* , *values* [ , *minValue* [ , *maxValue* [ , *fore* [ , *back* [ , *charSet* ] ] ] ] ] )

*col*, *row*
: *required* **Long** values, the position of the upper left cell of the chart.

*width*
: *required* A **Long**, the number of columns of the chart.

*height*
: *required* A **Long**, the height of the chart: in rows for the sets ASCII and Block, and in dots for Braille, four to a row.

*values*
: *required* An array of **Double**, passed by reference, that starts at index 0. See [The series](#the-series).

*minValue*
: *optional* A **Double**, the value drawn at the bottom. The default is 0.

*maxValue*
: *optional* A **Double**, the value drawn at the top. The default is 100.

*fore*
: *optional* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), the colour of the chart. The default is **Green**.

*back*
: *optional* A **ConsoleColor**, the background. The default is **Black**.

*charSet*
: *optional* A [**SparklineCharSet**](#sparklinecharset). The default is **Braille**.

Returns without drawing when the array has fewer than 2 values.

### RenderWithStats
{: .no_toc }

Draws a chart and a line with the smallest, the average and the largest value.

Syntax: *object*.**RenderWithStats** ( *col* , *row* , *width* , *height* , *values* [ , *minValue* [ , *maxValue* [ , *fore* [ , *back* [ , *charSet* [ , *statColor* ] ] ] ] ] ] )

*col*, *row*, *width*, *height*, *values*, *minValue*, *maxValue*, *fore*, *back*, *charSet*
: As for [**Render**](#render).

*statColor*
: *optional* A **ConsoleColor**, the colour of the text line. The default is **Gray**.

Draws the chart with **Render**, then writes `Min:`, `Avg:` and `Max:` with the three numbers, each formatted with one decimal, in one line at the row `row + height + 1`, starting at *col*, on the background *back*. The numbers are taken from all the values, and not from *minValue* and *maxValue*. The row is the same for all three character sets, so a Braille chart, which is `(height + 3) \ 4` rows high, has a gap before the line. The decimal separator is that of the regional settings of the user. An array with no element raises error 9.

## See Also

- [cVBar](cVBar) class -- bar charts
- [cProgressBar](cProgressBar) class -- progress bars
- [cColorHelper](Helpers#ccolorhelper-class) -- colours chosen from values
