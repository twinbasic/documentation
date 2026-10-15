---
title: cProgressBar
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cProgressBar
has_toc: false
---

# cProgressBar class
{: .no_toc }

Draws a progress bar, horizontal or vertical, into the screen buffer of the full-screen mode.

<!-- test: ProgressBarTests.Render_DrawsTheFilledPartInGreenAndTheEmptyPartInDarkGray, ProgressBarTests.Render_ThenRefresh_ShowsTheBarOnTheScreenBuffer, ProgressBarTests.Render_DoesNotClearTheCellsAroundTheBar -->
A **cProgressBar** keeps the [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer) of the console it was made with. Its `Render` members write a bar made of a filled part and an empty part into that buffer; they do not clear the cells around the bar and do not write to the console. [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh) of the console shows the result. The filled part is drawn with the character U+2588 (a full block), in green, and the empty part with U+2591 (a light shade), in dark grey, unless the call says otherwise.

```tb check_build
Dim con As New cConsole
Dim bar As cProgressBar
Dim ci As ConsoleCharInfo

con.EnterFullScreenMode                   ' before the bar is made: it keeps the buffer
Set bar = New cProgressBar(con)

bar.Render 0, 0, 10, 50
ci = con.Buffer.GetChar(4, 0)
Debug.Print Hex$(AscW(ci.Char)) & " " & ci.ForeColor
ci = con.Buffer.GetChar(5, 0)
Debug.Print Hex$(AscW(ci.Char)) & " " & ci.ForeColor
con.ExitFullScreenMode
' Output:
' 2588 10
' 2591 8
```
<!-- /test -->

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cProgressBar**. Columns and rows are counted from 0 in the buffer, and a position is a column and a row, in that order.

<!-- test: ProgressBarTests.Render_FilledCellsAreRoundedHalfToEven, ProgressBarTests.Render_FilledAndEmptyPartsTogetherAreExactlyTheWidth, ProgressBarTests.Render_PercentOutsideTheRange_IsTakenAsTheNearestEnd, ProgressBarTests.Render_UsesTheFirstCharacterOfTheStrings_AndTheColoursGiven, ProgressBarTests.Render_EmptyString_RaisesError5, ProgressBarTests.Render_CellsOutsideTheBuffer_AreDropped, ProgressBarTests.Render_BarMadeBeforeFullScreenMode_RaisesError91 -->
## Common behaviour

In every `Render` member, *percent* is a **Double** from 0 to 100; a value outside the range is taken as the nearest end. The number of filled cells is `CLng(percent / 100 * size)`, which rounds half to even, so 25 percent of 10 cells is 2 cells. The filled and empty parts together are exactly *size* cells.

*filledChar* and *emptyChar* are strings of which only the first character is used; an empty string raises error 5, *Invalid procedure call or argument*. The colours *filledColor* and *emptyColor* are [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor) values, and the cells have a black background. A cell outside the buffer is dropped.

A bar that is made before the console enters full-screen mode holds no buffer, and its first `Render` raises error 91, *Object variable or With block variable not set*; see [How a component works](./#how-a-component-works).
<!-- /test -->

## Constructor

### New
{: .no_toc }

Creates a progress bar for a console.

Syntax: **New cProgressBar** ( *console* )

*console*
: *required* A [**cConsole**](../TBMANLIB_ConsoleCore/cConsole) that is in full-screen mode.

<!-- test: ProgressBarTests.Render_BarMadeBeforeFullScreenMode_RaisesError91, ProgressBarTests.Render_AfterFullScreenModeWasLeftAndEnteredAgain_DrawsIntoTheOldBuffer -->
Keeps the console and its current [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer). When the console is not in full-screen mode, the buffer is **Nothing** and every `Render` member raises error 91. The bar keeps that buffer object: after the console leaves full-screen mode and enters it again, the console has a new buffer and the bar still draws into the old one.
<!-- /test -->

## Methods

<!-- test: ProgressBarTests.GetProgressColor_ThresholdsAre50And80_AndTheValueIsNotLimited -->
### GetProgressColor
{: .no_toc }

Returns a colour for a percentage: one colour for low values, one for medium values and one for high values.

Syntax: *object*.**GetProgressColor** ( *percent* [ , *lowColor* [ , *midColor* [ , *highColor* ] ] ] ) **As ConsoleColor**

*percent*
: *required* A **Double**. This method does not limit the value to 0 to 100.

*lowColor*
: *optional* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), for values below 50. The default is **Green**.

*midColor*
: *optional* A **ConsoleColor**, for values from 50 up to, but not including, 80. The default is **Yellow**.

*highColor*
: *optional* A **ConsoleColor**, for values of 80 and above. The default is **Red**.

The method does not draw, so it needs no buffer.

```tb check_build
Dim con As New cConsole
Dim bar As cProgressBar = New cProgressBar(con)

Debug.Print bar.GetProgressColor(10) & " " & bar.GetProgressColor(50) & " " & bar.GetProgressColor(80)
' Output:
' 10 14 12
```
<!-- /test -->

<!-- test: ProgressBarTests.Render_DrawsTheFilledPartInGreenAndTheEmptyPartInDarkGray, ProgressBarTests.Render_WidthOfZeroOrLess_DrawsNothing -->
### Render
{: .no_toc }

Draws a horizontal bar.

Syntax: *object*.**Render** ( *col* , *row* , *width* , *percent* [ , *filledChar* [ , *emptyChar* [ , *filledColor* [ , *emptyColor* ] ] ] ] )

*col*, *row*
: *required* **Long** values, the position of the left end of the bar.

*width*
: *required* A **Long**, the number of cells.

*percent*
: *required* A **Double**, 0 to 100.

*filledChar*
: *optional* A **String**, the character of the filled part. The default is U+2588.

*emptyChar*
: *optional* A **String**, the character of the empty part. The default is U+2591.

*filledColor*
: *optional* A **ConsoleColor**. The default is **Green**.

*emptyColor*
: *optional* A **ConsoleColor**. The default is **DarkGray**.

The filled part starts at *col* and the empty part follows it, to *col* + *width* - 1. A *width* of 0 or less draws nothing.
<!-- /test -->

<!-- test: ProgressBarTests.RenderVertical_FilledPartGrowsFromTheBottom, ProgressBarTests.RenderVertical_FilledCellsAreRoundedHalfToEven_AndPercentIsLimited -->
### RenderVertical
{: .no_toc }

Draws a vertical bar.

Syntax: *object*.**RenderVertical** ( *col* , *row* , *height* , *percent* [ , *filledChar* [ , *emptyChar* [ , *filledColor* [ , *emptyColor* ] ] ] ] )

*col*, *row*
: *required* **Long** values, the position of the top of the bar.

*height*
: *required* A **Long**, the number of cells.

*percent*, *filledChar*, *emptyChar*, *filledColor*, *emptyColor*
: As for [**Render**](#render).

The filled part grows from the bottom, in the cells from `row + height - 1` upwards, and the empty part is drawn from *row* downwards.
<!-- /test -->

<!-- test: ProgressBarTests.RenderWithAutoColor_FilledColourFollowsThePercent_AndTheParametersAreInTheDocumentedOrder -->
### RenderWithAutoColor
{: .no_toc }

Draws a horizontal bar whose filled colour depends on the percentage.

Syntax: *object*.**RenderWithAutoColor** ( *col* , *row* , *width* , *percent* [ , *filledChar* [ , *emptyChar* [ , *emptyColor* [ , *lowColor* [ , *midColor* [ , *highColor* ] ] ] ] ] ] )

*col*, *row*, *width*, *percent*, *filledChar*, *emptyChar*
: As for [**Render**](#render).

*emptyColor*
: *optional* A **ConsoleColor**. The default is **DarkGray**.

*lowColor*, *midColor*, *highColor*
: *optional* **ConsoleColor** values for [**GetProgressColor**](#getprogresscolor). The defaults are **Green**, **Yellow** and **Red**.

Chooses the filled colour with **GetProgressColor** and calls **Render**. Note the order of the parameters: the empty colour comes before the three colours, and there is no *filledColor*.
<!-- /test -->

<!-- test: ProgressBarTests.RenderWithBrackets_DrawsTheBarBetweenSquareBrackets, ProgressBarTests.RenderWithBrackets_DrawsThePercentage -->
### RenderWithBrackets
{: .no_toc }

Draws a horizontal bar between square brackets.

Syntax: *object*.**RenderWithBrackets** ( *col* , *row* , *width* , *percent* [ , *filledChar* [ , *emptyChar* [ , *filledColor* [ , *emptyColor* [ , *bracketColor* ] ] ] ] ] )

*col*, *row*, *width*, *percent*, *filledChar*, *emptyChar*, *filledColor*, *emptyColor*
: As for [**Render**](#render), except that *width* includes the two brackets.

*bracketColor*
: *optional* A **ConsoleColor**, the colour of the brackets. The default is **Gray**.

Draws `[` at *col*, the bar in the *width* - 2 cells after it, and `]` at *col* + *width* - 1. Despite its source comment, the method draws no percentage; [**RenderWithLabel**](#renderwithlabel) does.
<!-- /test -->

<!-- test: ProgressBarTests.RenderWithLabel_DrawsTheLabel_TheBar_AndThePercentage, ProgressBarTests.RenderWithLabel_BarIsOneCellNarrowerAtTenAndHundredPercent, ProgressBarTests.RenderWithLabel_BarNarrowerThanThreeCells_DrawsOnlyTheLabelAndThePercentage -->
### RenderWithLabel
{: .no_toc }

Draws a label, a horizontal bar and the percentage in a row.

Syntax: *object*.**RenderWithLabel** ( *col* , *row* , *width* , *percent* , *label* [ , *filledChar* [ , *emptyChar* [ , *filledColor* [ , *emptyColor* [ , *labelColor* ] ] ] ] ] )

*col*, *row*, *width*, *percent*, *filledChar*, *emptyChar*, *filledColor*, *emptyColor*
: As for [**Render**](#render), except that *width* is the width of the whole row: label, bar and percentage.

*label*
: *required* A **String**, written first.

*labelColor*
: *optional* A **ConsoleColor**, the colour of the label and the percentage. The default is **Gray**.

The row is the label, a space, the bar, a space, and the percentage rounded to a whole number with a percent sign. The bar gets what is left of *width* after the label and the percentage text. The text has one character more for each digit of the rounded percentage, so the bar is one cell narrower at 10 percent and at 100 percent than just below them. When the bar would be less than 3 cells wide, the method draws only the label, a space and the percentage, in *labelColor*, and no bar.
<!-- /test -->

## See Also

- [cVBar](cVBar) class -- vertical bar charts
- [cSparkline](cSparkline) class -- line charts of a series of values
- [DrawProgressBar](../TBMANLIB_ConsoleCore/cConsole#drawprogressbar) of **cConsole** -- a bar that is written to the console directly, without a buffer
- [cConsoleBuffer](../TBMANLIB_ConsoleCore/cConsoleBuffer) class -- the buffer that the bar draws into
