---
title: cConsoleBuffer
parent: TBMANLIB_ConsoleCore Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleCore/cConsoleBuffer
has_toc: false
---

# cConsoleBuffer class
{: .no_toc }

A grid of character cells in memory, with a colour pair for each cell and a record of the rectangle that has changed, that is drawn on the console in one call.

The drawing members change cells of the grid and nothing on the screen. [**Flush**](#flush) writes the cells that changed since the last write to the console with a single call of `WriteConsoleOutputW`, so a program draws a whole picture without flicker. The full-screen mode of [**cConsole**](cConsole#enterfullscreenmode) makes one buffer, which its [**Buffer**](cConsole#buffer) property returns and its [**Refresh**](cConsole#refresh) method flushes. A program can also create a buffer with `New`, and it needs no console to do so, since the grid is ordinary memory.

```tb check_build check_run
Dim buf As cConsoleBuffer = New cConsoleBuffer(10, 3)
Dim ci As ConsoleCharInfo

buf.WriteAt 2, 1, "Hi", ConsoleColor.Yellow, ConsoleColor.DarkBlue
ci = buf.GetChar(2, 1)
Debug.Print ci.Char & " " & ci.ForeColor & " " & ci.BackColor
ci = buf.GetChar(3, 1)
Debug.Print ci.Char & " " & ci.ForeColor & " " & ci.BackColor
ci = buf.GetChar(0, 0)
Debug.Print "[" & ci.Char & "] " & ci.ForeColor & " " & ci.BackColor
' Output:
' H 14 1
' i 14 1
' [ ] 7 0
```

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cConsoleBuffer**. Columns and rows are counted from 0, and a position is a column and a row, in that order.

## The cells

<!-- test: BufferTests.New_HoldsSpacesInGrayOnBlack_AndIsAllDirty, BufferTests.BufferPtr_IsTheAddressOfTheFirstCellAndCellsAreFourBytes, BufferTests.WriteAt_CharacterOutsideTheBasicMultilingualPlane_TakesTwoCells, BufferTests.SetChar_DefaultColoursAreGrayOnBlack_NotTheColoursOfTheConsole -->
The grid has *Width* columns and *Height* rows. A cell holds one UTF-16 code unit and one colour attribute, which is the foreground [**ConsoleColor**](Types#consolecolor) plus 16 times the background. The cells are kept row after row as the `CHAR_INFO` structure of Windows (two 16-bit values, 4 bytes), so the cell at *col* and *row* is number `row * Width + col`. [**BufferPtr**](#bufferptr) returns the address of the first cell.

A character outside the Basic Multilingual Plane, such as most emoji, is two code units and takes two cells. The buffer has no notion of the width of a character: a character that the console draws two cells wide still takes one cell of the grid.

Defaults: where a member takes *fore* and *back* and they are omitted, the cell gets **Gray** on **Black**. The members do not use the colours of the [**cConsole**](cConsole#forecolor) object.
<!-- /test -->

## The dirty rectangle

<!-- test: BufferTests.DirtyRect_GrowsToHoldEveryCellChanged, BufferTests.DirtyRect_WriteAt_HoldsTheFirstAndLastColumnOfTheText, BufferTests.DirtyRect_FillRect_HoldsTheCutRectangle, BufferTests.DirtyRect_DrawBoxAndLines_GrowThroughSetChar, BufferTests.CopyRegion_DirtyRectangleHoldsTheDestinationAndTheSource, BufferTests.ClearDirty_EmptiesTheRectangleToItsEmptyForm, BufferTests.Clear_MarksTheWholeGridDirty_AlsoDuringABatch, BufferTests.Resize_GivesANewSizeAndLosesTheContents, FlushTests.Flush_EmptiesTheDirtyRectangle -->
The buffer records the smallest rectangle that contains every cell changed since the last [**Flush**](#flush). [**SetChar**](#setchar), [**WriteAt**](#writeat), [**FillRect**](#fillrect) and [**CopyRegion**](#copyregion) grow the rectangle, and so do [**DrawBox**](#drawbox), [**DrawHLine**](#drawhline) and [**DrawVLine**](#drawvline) through **SetChar**. [**Clear**](#clear) and [**Resize**](#resize) mark the whole grid, and [**Flush**](#flush) and [**ClearDirty**](#cleardirty) empty the rectangle. [**IsDirty**](#isdirty) tells whether it holds anything, and [**GetDirtyRect**](#getdirtyrect) returns it. After the rectangle is emptied, its **Left** is *Width*, its **Top** is *Height*, and its **Right** and **Bottom** are 0.
<!-- /test -->

```tb check_build check_run
Dim buf As cConsoleBuffer = New cConsoleBuffer(10, 3)
Dim r As ConsoleRect

Debug.Print buf.IsDirty              ' a new buffer is all dirty
buf.ClearDirty
Debug.Print buf.IsDirty
buf.SetChar 4, 1, "x"
buf.SetChar 6, 2, "y"
r = buf.GetDirtyRect
Debug.Print r.Left & " " & r.Top & " " & r.Right & " " & r.Bottom
' Output:
' True
' False
' 4 1 6 2
```

<!-- test: FlushTests.WriteAt_BeyondTheGrid_NextFlushStillDrawsTheChangedCells, FlushTests.WriteAt_NegativeColumn_NextFlushStillDrawsTheChangedCells, FlushTests.WriteAt_NegativeRow_NextFlushStillDrawsTheChangedCells, FlushTests.FillRect_RectangleAboveAndLeftOfTheGrid_NextFlushStillDrawsTheChangedCells, FlushTests.CopyRegion_NegativeDestination_NextFlushStillDrawsTheCopiedCells, FlushTests.Flush_AfterANegativePosition_EmptiesTheRectangleAndForceAllDrawsTheCells -->
[**WriteAt**](#writeat) and [**CopyRegion**](#copyregion) pass the positions they were given to the record without checking them against the buffer, and so does [**FillRect**](#fillrect) when the right or the bottom edge of its rectangle is negative, so a call with a position outside the grid can leave a dirty rectangle that reaches beyond the grid. [**Flush**](#flush) then asks Windows to write a region that is partly outside the screen buffer. A row below the grid or a column beyond its width does no harm: Windows clips the region. A negative column or row does: the next **Flush** writes nothing, and empties the rectangle all the same, so the cells that changed since the previous flush stay off the screen until they change again or [**RefreshAll**](cConsole#refreshall) of the console writes the whole buffer.
<!-- /test -->

## Batch updates

<!-- test: BufferTests.Batch_DoesNotGrowTheDirtyRectangle_AndEndMarksTheWholeGrid, BufferTests.Batch_Nested_MarksTheGridWhenTheOutermostEnds, BufferTests.EndBatchUpdate_WithoutABegin_DoesNothing, BufferTests.CopyRegion_InABatch_DirtyRectangleHoldsOnlyTheDestination -->
A program that changes most of the grid in one pass can skip the bookkeeping. Between [**BeginBatchUpdate**](#beginbatchupdate) and [**EndBatchUpdate**](#endbatchupdate) the members do not grow the dirty rectangle, and [**EndBatchUpdate**](#endbatchupdate) marks the whole grid as dirty, so the next [**Flush**](#flush) writes everything. Batches nest: the grid is marked when the outermost one ends.
<!-- /test -->

```tb check_build check_run
Dim buf As cConsoleBuffer = New cConsoleBuffer(10, 3)
Dim r As ConsoleRect

buf.ClearDirty
buf.BeginBatchUpdate
buf.SetChar 4, 1, "x"
Debug.Print buf.IsInBatchMode & " " & buf.IsDirty
buf.EndBatchUpdate
r = buf.GetDirtyRect
Debug.Print buf.IsInBatchMode & " " & buf.IsDirty
Debug.Print r.Left & " " & r.Top & " " & r.Right & " " & r.Bottom
' Output:
' True False
' False True
' 0 0 9 2
```

## Known problems in version 1.0.0.1

<!-- test: BufferTests.ScrollRegion_Down_AtTheTopEdge_MovesTheRowsByTheDistanceAsked, BufferTests.ScrollRegion_Right_AtTheLeftEdge_MovesTheColumnsByTheDistanceAsked, FlushTests.WriteAt_NegativeColumn_NextFlushStillDrawsTheChangedCells, FlushTests.WriteAt_NegativeRow_NextFlushStillDrawsTheChangedCells, FlushTests.FillRect_RectangleAboveAndLeftOfTheGrid_NextFlushStillDrawsTheChangedCells, FlushTests.CopyRegion_NegativeDestination_NextFlushStillDrawsTheCopiedCells -->
> [!WARNING] 1.0.0.1
> [**ScrollRegion**](#scrollregion) moves a region by less than the distance asked for when the region starts closer to the top or left edge than that distance, and clears the full distance, so cells are lost without an error. A [**WriteAt**](#writeat) with a negative column or row, a [**CopyRegion**](#copyregion) with a negative destination, and a [**FillRect**](#fillrect) whose right or bottom edge is negative make the next [**Flush**](#flush) draw nothing, and raise no error; see [The dirty rectangle](#the-dirty-rectangle).

## Constructor

### New
{: .no_toc }

Creates a buffer and clears it.

Syntax: **New cConsoleBuffer** ( *width* , *height* )

*width*
: *required* A **Long**, the number of columns, 1 or more.

*height*
: *required* A **Long**, the number of rows, 1 or more.

<!-- test: BufferTests.New_HoldsSpacesInGrayOnBlack_AndIsAllDirty -->
The constructor does not check the sizes. It calls [**Resize**](#resize), so every cell holds a space in **Gray** on **Black**, and the whole grid is dirty. The buffer takes 4 bytes for each cell.
<!-- /test -->

## Properties

### BufferPtr
{: .no_toc }

The address of the first cell. **LongPtr**, read-only.

Syntax: *object*.**BufferPtr**

<!-- test: BufferTests.BufferPtr_IsTheAddressOfTheFirstCellAndCellsAreFourBytes -->
The address is that of the first element of the array of cells, `VarPtr(m_Buffer(0))`. It is valid until [**Resize**](#resize) is called, which allocates a new array. A program can read or write the cells through it, for example with `CopyMemory`; see [The cells](#the-cells) for the layout. The dirty rectangle does not follow such writes, so the program calls [**Flush**](#flush) with the flag *forceAll*, or [**FlushRegion**](#flushregion).
<!-- /test -->

### Height
{: .no_toc }

The number of rows. **Long**, read-only.

Syntax: *object*.**Height**

### IsDirty
{: .no_toc }

Whether a cell has changed since the last write to the console. **Boolean**, read-only.

Syntax: *object*.**IsDirty**

### IsInBatchMode
{: .no_toc }

Whether a batch update is open. **Boolean**, read-only.

Syntax: *object*.**IsInBatchMode**

**True** from [**BeginBatchUpdate**](#beginbatchupdate) until the matching [**EndBatchUpdate**](#endbatchupdate).

### Width
{: .no_toc }

The number of columns. **Long**, read-only.

Syntax: *object*.**Width**

## Methods

### BeginBatchUpdate
{: .no_toc }

Starts a batch update.

Syntax: *object*.**BeginBatchUpdate**

Adds 1 to a counter. While the counter is above 0, [**SetChar**](#setchar), [**WriteAt**](#writeat), [**FillRect**](#fillrect), [**CopyRegion**](#copyregion) and the other members do not grow the dirty rectangle.

### Clear
{: .no_toc }

Fills every cell with one character and one pair of colours.

Syntax: *object*.**Clear** [ *fore* [ , *back* [ , *fillChar* ] ] ]

<!-- test: BufferTests.Clear_FillsEveryCellWithTheGivenCharacterAndColours, BufferTests.Clear_EmptyFillCharacter_Raises5, BufferTests.Clear_MarksTheWholeGridDirty_AlsoDuringABatch -->
*fore*
: *optional* A [**ConsoleColor**](Types#consolecolor), the text colour. The default is **Gray**.

*back*
: *optional* A [**ConsoleColor**](Types#consolecolor), the background colour. The default is **Black**.

*fillChar*
: *optional* A **String** whose first character is used. The default is a space. An empty string raises error 5, *Invalid procedure call or argument*.

Marks the whole grid as dirty, also during a batch update.
<!-- /test -->

### ClearDirty
{: .no_toc }

Empties the dirty rectangle without writing anything.

Syntax: *object*.**ClearDirty**

<!-- test: BufferTests.ClearDirty_EmptiesTheRectangleToItsEmptyForm, FlushTests.Flush_NothingDirty_WritesNothing -->
Sets [**IsDirty**](#isdirty) to **False** and the rectangle to its empty form. The cells that were dirty are not written by the next [**Flush**](#flush), unless that call forces all.
<!-- /test -->

### CopyRegion
{: .no_toc }

Copies a rectangle of cells to another position.

Syntax: *object*.**CopyRegion** ( *srcLeft* , *srcTop* , *srcRight* , *srcBottom* , *dstLeft* , *dstTop* )

*srcLeft*, *srcTop*, *srcRight*, *srcBottom*
: *required* **Long** values, the corners of the source rectangle, inclusive.

*dstLeft*, *dstTop*
: *required* **Long** values, the position of the upper left corner of the copy.

<!-- test: BufferTests.CopyRegion_CopiesACharacterAndItsColours, BufferTests.CopyRegion_OverlappingToTheRight_ReadsCellsBeforeOverwritingThem, BufferTests.CopyRegion_OverlappingDownward_ReadsCellsBeforeOverwritingThem, BufferTests.CopyRegion_DestinationCellsOutsideTheGridAreSkipped, BufferTests.CopyRegion_SourceOutsideTheGridIsCutAndTheDestinationIsNotMoved, BufferTests.CopyRegion_DirtyRectangleHoldsTheDestinationAndTheSource, BufferTests.CopyRegion_InABatch_DirtyRectangleHoldsOnlyTheDestination -->
The source rectangle is first cut to the grid. Its left and top edges are raised to 0 and its right and bottom edges lowered to the last column and row, and the destination is not moved to match, so a source that reaches outside the grid is copied from its cut position to the unchanged destination. Cells whose destination lies outside the grid are skipped. Source and destination can overlap; the copy runs in the direction that does not overwrite cells before they are read. The method passes the corners of the destination and of the source rectangle to the dirty rectangle, which a batch update suppresses, and it does not cut the destination corners to the grid.
<!-- /test -->

### DrawBox
{: .no_toc }

Draws the outline of a rectangle with line-drawing characters.

Syntax: *object*.**DrawBox** ( *left* , *top* , *right* , *bottom* [ , *fore* [ , *back* [ , *doubleLine* ] ] ] )

*left*, *top*
: *required* **Long** values, the column and the row of the upper left corner.

*right*, *bottom*
: *required* **Long** values, the column and the row of the lower right corner.

*fore*, *back*
: *optional* [**ConsoleColor**](Types#consolecolor) values. The defaults are **Gray** and **Black**.

*doubleLine*
: *optional* A **Boolean**. **True** uses the double-line characters (U+2554, U+2557, U+255A, U+255D, U+2550, U+2551), **False**, the default, the single-line ones (U+250C, U+2510, U+2514, U+2518, U+2500, U+2502).

<!-- test: BufferTests.DrawBox_SingleLine_DrawsTheOutlineOnly, BufferTests.DrawBox_DoubleLine_UsesTheDoubleLineCharacters, BufferTests.DrawBox_PartsOutsideTheGridAreLeftOut, BufferTests.DrawBox_OneCellWideBox_RaisesNoError -->
The four corners, then the top and bottom lines, then the left and right lines are written with [**SetChar**](#setchar), so the parts outside the grid are left out. The inside of the box is not changed. No error is raised for a rectangle that is one cell wide or high; the corners overwrite each other.
<!-- /test -->

### DrawHLine
{: .no_toc }

Draws a horizontal line.

Syntax: *object*.**DrawHLine** ( *col* , *row* , *length* [ , *fore* [ , *back* [ , *doubleLine* ] ] ] )

*col*, *row*
: *required* **Long** values, the start of the line.

*length*
: *required* A **Long**, the number of cells.

<!-- test: BufferTests.DrawHLine_DrawsHorizontalLineCharacters -->
*fore*, *back*, *doubleLine*
: *optional*, as for [**DrawBox**](#drawbox). The line uses U+2500, or U+2550 when *doubleLine* is **True**.

The cells are written with [**SetChar**](#setchar).
<!-- /test -->

### DrawVLine
{: .no_toc }

Draws a vertical line.

Syntax: *object*.**DrawVLine** ( *col* , *row* , *length* [ , *fore* [ , *back* [ , *doubleLine* ] ] ] )

*col*, *row*
: *required* **Long** values, the start of the line.

*length*
: *required* A **Long**, the number of cells, going down.

<!-- test: BufferTests.DrawVLine_DrawsVerticalLineCharactersGoingDown -->
*fore*, *back*, *doubleLine*
: *optional*, as for [**DrawBox**](#drawbox). The line uses U+2502, or U+2551 when *doubleLine* is **True**.
<!-- /test -->

### EndBatchUpdate
{: .no_toc }

Ends a batch update.

Syntax: *object*.**EndBatchUpdate**

<!-- test: BufferTests.EndBatchUpdate_WithoutABegin_DoesNothing, BufferTests.Batch_Nested_MarksTheGridWhenTheOutermostEnds -->
Subtracts 1 from the counter when it is above 0. When the counter reaches 0 the whole grid is marked as dirty. A call without a matching **BeginBatchUpdate** does nothing.
<!-- /test -->

### FillRect
{: .no_toc }

Fills a rectangle with one character and one pair of colours.

Syntax: *object*.**FillRect** ( *left* , *top* , *right* , *bottom* [ , *char* [ , *fore* [ , *back* ] ] ] )

*left*, *top*, *right*, *bottom*
: *required* **Long** values, the corners, inclusive. The rectangle is cut to the grid: a left or top below 0 is raised to 0, and a right or bottom beyond the grid is lowered to its last column or row.

*char*
: *optional* A **String** whose first character is used. The default is a space. An empty string raises error 5.

*fore*, *back*
: *optional* [**ConsoleColor**](Types#consolecolor) values. The defaults are **Gray** and **Black**.

<!-- test: BufferTests.FillRect_FillsTheRectangleOnly, BufferTests.FillRect_IsCutToTheGrid, BufferTests.FillRect_LeftGreaterThanRight_ChangesNoCell, BufferTests.FillRect_DefaultIsASpaceInGrayOnBlack, BufferTests.FillRect_EmptyCharacter_Raises5, BufferTests.DirtyRect_FillRect_HoldsTheCutRectangle -->
The two corners of the cut rectangle are passed to the dirty rectangle. A rectangle with *left* greater than *right* changes no cell.
<!-- /test -->

### Flush
{: .no_toc }

Writes the changed cells to a console screen buffer.

Syntax: *object*.**Flush** ( *hOutput* [ , *forceAll* ] )

*hOutput*
: *required* A **LongPtr**, the handle of a console screen buffer with write access. [**Refresh**](cConsole#refresh) of **cConsole** passes the standard output handle.

*forceAll*
: *optional* A **Boolean**. **True** writes every cell. The default, **False**, writes the dirty rectangle only, and returns at once when nothing is dirty.

<!-- test: FlushTests.Flush_WritesEachCellToTheSamePositionWithItsColours, FlushTests.Flush_WritesOnlyTheDirtyRectangle, FlushTests.Flush_NothingDirty_WritesNothing, FlushTests.Flush_ForceAll_WritesEveryCell, FlushTests.Flush_EmptiesTheDirtyRectangle, FlushTests.Flush_ToAHandleThatIsNotAConsole_EmptiesTheDirtyRectangleAllTheSame -->
The cells go to the same positions in the screen buffer: the cell at column *c* and row *r* of the grid is written at column *c* and row *r*, counted from the top left of the screen buffer and not of the window. Afterwards the dirty rectangle is emptied. The method does not check the result of `WriteConsoleOutputW`: when the call fails, because the handle is not a console, the cells are not shown and the dirty rectangle is emptied all the same. Calls `WriteConsoleOutputW`. Without a console, nothing is shown.
<!-- /test -->

### FlushRegion
{: .no_toc }

Writes a rectangle of cells to a console screen buffer.

Syntax: *object*.**FlushRegion** ( *hOutput* , *left* , *top* , *right* , *bottom* )

*hOutput*
: *required* A **LongPtr**, as for [**Flush**](#flush).

*left*, *top*, *right*, *bottom*
: *required* **Long** values, the corners, inclusive. The rectangle is cut to the grid.

<!-- test: FlushTests.FlushRegion_WritesTheRectangleWhetherOrNotItIsDirty, FlushTests.FlushRegion_LeavesTheDirtyRectangleAsItIs, FlushTests.FlushRegion_IsCutToTheGrid -->
Writes the rectangle whether or not it is dirty, at the same position in the screen buffer. The dirty rectangle is left as it is. Calls `WriteConsoleOutputW`.
<!-- /test -->

### GetChar
{: .no_toc }

Returns the character and the colours of a cell.

Syntax: *object*.**GetChar** ( *col* , *row* ) **As ConsoleCharInfo**

*col*, *row*
: *required* **Long** values, the position of the cell.

<!-- test: BufferTests.GetChar_OutsideTheGridReturnsTheEmptyStructure, BufferTests.GetChar_StyleIsAlwaysNone -->
Returns a [**ConsoleCharInfo**](Types#consolecharinfo). **Char** holds the one character, **ForeColor** and **BackColor** the colours; **Style** is always 0. For a position outside the grid it returns the empty structure: **Char** is an empty string and both colours are **Black**.
<!-- /test -->

### GetDirtyRect
{: .no_toc }

Returns the dirty rectangle.

Syntax: *object*.**GetDirtyRect** **As ConsoleRect**

Returns a [**ConsoleRect**](Types#consolerect). When nothing is dirty it is the empty form described in [The dirty rectangle](#the-dirty-rectangle).

### Resize
{: .no_toc }

Gives the buffer a new size and clears it.

Syntax: *object*.**Resize** ( *width* , *height* )

*width*, *height*
: *required* **Long** values, the new number of columns and rows.

<!-- test: BufferTests.Resize_GivesANewSizeAndLosesTheContents, EventTests.OnResize_NewSize_CallsTheHandlerAndGivesTheBufferANewSize -->
The old contents are lost, not copied: the method allocates a new array and calls [**Clear**](#clear) with its defaults, so every cell is a space in **Gray** on **Black** and the whole grid is dirty. Any address from [**BufferPtr**](#bufferptr) is no longer valid. The full-screen mode of **cConsole** calls this method when a size event shows a new size, so a program redraws after the resize handler.
<!-- /test -->

### ScrollRegion
{: .no_toc }

Moves the cells of a rectangle by a number of rows and columns, and clears the cells that this uncovers.

Syntax: *object*.**ScrollRegion** ( *left* , *top* , *right* , *bottom* , *deltaRow* , *deltaCol* )

*left*, *top*, *right*, *bottom*
: *required* **Long** values, the corners of the region, inclusive. The region is cut to the grid.

*deltaRow*
: *required* A **Long**. A positive value moves the content down, a negative value up.

*deltaCol*
: *required* A **Long**. A positive value moves the content right, a negative value left.

<!-- test: BufferTests.ScrollRegion_Up_MovesTheRowsUpAndClearsTheBottomRow, BufferTests.ScrollRegion_Left_MovesTheColumnsLeftAndClearsTheRightColumn, BufferTests.ScrollRegion_Down_InARegionAwayFromTheTop_MovesTheRowsDown, BufferTests.ScrollRegion_Down_AtTheTopEdge_MovesTheRowsByTheDistanceAsked, BufferTests.ScrollRegion_Right_AtTheLeftEdge_MovesTheColumnsByTheDistanceAsked, BufferTests.ScrollRegion_BothDeltasZero_DoesNothing -->
The rows (or columns) that the move uncovers are filled with spaces in **Gray** on **Black**. Cells moved out of the region are lost. The method does nothing when both deltas are 0. Note the order of the two deltas: rows come first.

The method works by copying from a source rectangle that is *deltaRow* rows above and *deltaCol* columns left of the region. When that source reaches above the top of the grid, or left of its left edge, it is cut (see [**CopyRegion**](#copyregion)) and the destination is not moved, so the content moves by the distance between the region and the edge, which is less than the delta, while the full number of rows or columns is cleared. At the top edge a scroll down of one row therefore moves nothing and only clears the first row. Scrolling up and to the left, and scrolling down or right in a region that is as far from the top or left edge as the delta, work as expected.
<!-- /test -->

```tb check_build check_run
Dim a As cConsoleBuffer = New cConsoleBuffer(5, 4)
Dim b As cConsoleBuffer = New cConsoleBuffer(5, 4)
Dim ci As ConsoleCharInfo
Dim y As Long
Dim textA As String
Dim textB As String

For y = 0 To 3
    a.WriteAt 0, y, String$(5, Chr$(65 + y))      ' the rows A, B, C, D
    b.WriteAt 0, y, String$(5, Chr$(65 + y))
Next

a.ScrollRegion 0, 0, 4, 3, -1, 0                  ' up by one row
b.ScrollRegion 0, 0, 4, 3, 1, 0                   ' down by one row, from the top edge

For y = 0 To 3
    ci = a.GetChar(0, y)
    textA = textA & ci.Char
    ci = b.GetChar(0, y)
    textB = textB & ci.Char
Next
Debug.Print "[" & textA & "]"
Debug.Print "[" & textB & "]"
' Output:
' [BCD ]
' [ BCD]
```

The second line should read `[ ABC]`. Moving the region down from a distance of 1 row below the top, with `b.ScrollRegion 0, 1, 4, 3, 1, 0`, gives the expected `A BC`.

### SetChar
{: .no_toc }

Sets one cell.

Syntax: *object*.**SetChar** ( *col* , *row* , *char* [ , *fore* [ , *back* ] ] )

*col*, *row*
: *required* **Long** values, the position of the cell. A position outside the grid is ignored, and nothing is marked.

<!-- test: BufferTests.SetChar_StoresTheFirstCharacterAndTheColours, BufferTests.SetChar_DefaultColoursAreGrayOnBlack_NotTheColoursOfTheConsole, BufferTests.SetChar_OutsideTheGridIsIgnoredAndNothingIsMarked, BufferTests.SetChar_EmptyString_Raises5 -->
*char*
: *required* A **String**. Only its first character is used. An empty string raises error 5, *Invalid procedure call or argument*.

*fore*, *back*
: *optional* [**ConsoleColor**](Types#consolecolor) values. The defaults are **Gray** and **Black**.

Marks the cell as dirty.
<!-- /test -->

### WriteAt
{: .no_toc }

Writes a string into a row of cells.

Syntax: *object*.**WriteAt** ( *col* , *row* , *text* [ , *fore* [ , *back* ] ] )

*col*, *row*
: *required* **Long** values, the position of the first character.

<!-- test: BufferTests.WriteAt_WritesTextAndColoursIntoARow, BufferTests.WriteAt_CharactersBeyondTheLastColumnAreDropped_TheTextDoesNotWrap, BufferTests.WriteAt_CharactersLeftOfColumnZeroAreSkipped, BufferTests.WriteAt_RowOutsideTheGridWritesNothing, BufferTests.WriteAt_ControlCharactersAreStoredAsOrdinaryCharacters, BufferTests.DirtyRect_WriteAtWithEmptyText_StillGrowsTheRectangle -->
*text*
: *required* A **String**. Each UTF-16 code unit takes one cell, including carriage returns, line feeds and tabs, which are stored as ordinary characters. Characters that fall to the right of the last column are dropped, and characters to the left of column 0 are skipped. The text does not wrap.

*fore*, *back*
: *optional* [**ConsoleColor**](Types#consolecolor) values. The defaults are **Gray** and **Black**.

Nothing is written when *row* is outside the grid. The dirty rectangle is grown by the first and the last column of the text and by *row* in every case, even when they lie outside the grid, and also when *text* is empty.
<!-- /test -->

### WriteTextEx
{: .no_toc }

Writes a string, shortened to a width with an ellipsis.

Syntax: *object*.**WriteTextEx** ( *text* , *col* , *row* , *fore* , *back* , *maxWidth* [ , *ellipsis* ] )

*text*
: *required* A **String**.

*col*, *row*
: *required* **Long** values, the position of the first character.

*fore*, *back*
: *required* [**ConsoleColor**](Types#consolecolor) values. Unlike the other drawing members, this one has no defaults for the colours.

*maxWidth*
: *required* A **Long**, the most cells to write. A value of 0 or less writes nothing.

*ellipsis*
: *optional* A **String**, the mark that shows the text was cut. The default is the character U+2026, the horizontal ellipsis.

<!-- test: BufferTests.WriteTextEx_LongText_EndsInTheEllipsis, BufferTests.WriteTextEx_DefaultEllipsisIsTheHorizontalEllipsisCharacter, BufferTests.WriteTextEx_ShortTextIsWrittenWhole, BufferTests.WriteTextEx_EllipsisAsLongAsTheWidth_WritesOnlyTheEllipsis, BufferTests.WriteTextEx_WidthZeroOrLess_WritesNothing -->
When *text* is longer than *maxWidth*, the method writes the first `maxWidth - Len(ellipsis)` characters of the text followed by the ellipsis, so that the result is *maxWidth* characters. When the ellipsis itself is as long as *maxWidth* or longer, only the first *maxWidth* characters of the ellipsis are written, and nothing of the text. Shorter text is written whole. The order of the parameters differs from [**WriteAt**](#writeat): the text comes first.
<!-- /test -->

```tb check_build check_run
Dim buf As cConsoleBuffer = New cConsoleBuffer(20, 2)
Dim ci As ConsoleCharInfo
Dim x As Long
Dim line As String

buf.WriteTextEx "Filename.extension", 0, 0, ConsoleColor.Gray, ConsoleColor.Black, 10, "..."
For x = 0 To 9
    ci = buf.GetChar(x, 0)
    line = line & ci.Char
Next
Debug.Print line
' Output:
' Filenam...
```

## See Also

- [cConsole](cConsole) class -- the console, and the full-screen mode that owns a buffer
- [Types](Types) -- **ConsoleColor**, **ConsoleCharInfo** and **ConsoleRect**
- [cProgressBar](../TBMANLIB_ConsoleComponents/cProgressBar), [cDataGrid](../TBMANLIB_ConsoleComponents/cDataGrid) and the other components, which draw into a buffer
