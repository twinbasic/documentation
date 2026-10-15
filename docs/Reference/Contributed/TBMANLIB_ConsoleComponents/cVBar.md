---
title: cVBar
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/cVBar
has_toc: false
---

# cVBar class
{: .no_toc }

<!-- test: VBarTests.Render_BarGrowsFromTheBottom_AndTheRowsAboveAreSpaces -->
Draws vertical bars into the screen buffer: a single bar, a row of bars from an array, bars coloured by value, a bar with a label, and a history of values that scrolls to the left.

A **cVBar** keeps the [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer) of the console it was made with. Each bar is one column wide and *height* rows high, and grows from the bottom. The members draw into the buffer only; [**Refresh**](../TBMANLIB_ConsoleCore/cConsole#refresh) of the console shows it.

```tb check_build
Dim con As New cConsole
Dim chart As cVBar
Dim ci As ConsoleCharInfo
Dim y As Long

con.EnterFullScreenMode
Set chart = New cVBar(con)

chart.Render 3, 0, 4, 50                  ' a bar 4 rows high, half full
For y = 0 To 3
    ci = con.Buffer.GetChar(3, y)
    Debug.Print y & " " & Hex$(AscW(ci.Char))
Next
con.ExitFullScreenMode
' Output:
' 0 20
' 1 20
' 2 2588
' 3 2588
```
<!-- /test -->

* TOC
{:toc}

In the syntax lines of this page, *object* is a **cVBar**. Columns and rows are counted from 0 in the buffer.

<!-- test: VBarTests.Render_FilledRowsAreRoundedHalfToEven_AndAnyPercentAboveZeroFillsOneRow, VBarTests.Render_PercentOutsideTheRange_IsLimited, VBarTests.Render_DrawnAgainOverATallerBar_ClearsIt, VBarTests.Render_GivenColours_AreUsed, VBarTests.RenderBars_MaxEqualToMin_RaisesError11, VBarTests.Render_BarMadeBeforeFullScreenMode_RaisesError91 -->
## How a bar is drawn

A bar of *height* rows is drawn in the rows *row* to *row* + *height* - 1 of one column. The number of filled rows is `CLng(percent / 100 * height)`, which rounds half to even, and a bar with a *percent* above 0 has at least one filled row. The filled rows are the bottom ones, drawn with the bar character in the colours *fore* on *back*. The rows above them are overwritten with spaces in the same colours, so a bar that is drawn again on top of a taller one clears it.

A *percent* outside 0 to 100 is limited to the range. In the members that take *minValue* and *maxValue*, each value is first converted to a percentage with `100 * (value - minValue) / (maxValue - minValue)`; a *maxValue* equal to *minValue* raises error 11, *Division by zero*.

A bar that is made before the console enters full-screen mode holds no buffer, and its first draw raises error 91, *Object variable or With block variable not set*; see [How a component works](./#how-a-component-works).
<!-- /test -->

<!-- test: VBarTests.Render_CharStyles_UseTheirCharacters, VBarTests.Render_CustomStyle_DrawsACharacterOfItsOwn, VBarTests.Render_StyleOutsideTheEnumeration_RaisesError5WhenARowIsFilled -->
## Enumeration

### BarCharStyle
{: .no_toc }

The character of the filled rows. The enumeration is declared in the class, and its members are written without the class, as in `BarCharStyle.Dark`.

| Member | Value | Character |
|---|---:|---|
| **Block** | 0 | U+2588, a full block; the default |
| **Light** | 1 | U+2591, a light shade |
| **Medium** | 2 | U+2592, a medium shade |
| **Dark** | 3 | U+2593, a dark shade |
| **Custom** | 4 | U+2588, as **Block** |

**Custom** is meant for a character chosen by the program, but no member has a parameter for one, so **Custom** draws the same character as **Block**. A value outside 0 to 4 leaves the character empty, and a bar with at least one filled row then raises error 5, *Invalid procedure call or argument*.
<!-- /test -->

## Constructor

### New
{: .no_toc }

Creates a bar chart for a console.

Syntax: **New cVBar** ( *console* )

*console*
: *required* A [**cConsole**](../TBMANLIB_ConsoleCore/cConsole) that is in full-screen mode.

<!-- test: VBarTests.Render_BarMadeBeforeFullScreenMode_RaisesError91 -->
Keeps the console and its current [**Buffer**](../TBMANLIB_ConsoleCore/cConsole#buffer). When the console is not in full-screen mode, the buffer is **Nothing** and every draw raises error 91.
<!-- /test -->

## Methods

<!-- test: VBarTests.Render_BarGrowsFromTheBottom_AndTheRowsAboveAreSpaces, VBarTests.Render_GivenColours_AreUsed, VBarTests.Render_CharStyles_UseTheirCharacters -->
### Render
{: .no_toc }

Draws one bar.

Syntax: *object*.**Render** ( *col* , *row* , *height* , *percent* [ , *fore* [ , *back* [ , *charStyle* ] ] ] )

*col*, *row*
: *required* **Long** values, the column of the bar and the row of its top.

*height*
: *required* A **Long**, the number of rows.

*percent*
: *required* A **Double**, 0 to 100.

*fore*
: *optional* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), the colour of the bar. The default is **Green**.

*back*
: *optional* A **ConsoleColor**, the background. The default is **Black**.

*charStyle*
: *optional* A [**BarCharStyle**](#barcharstyle). The default is **Block**.
<!-- /test -->

<!-- test: VBarTests.RenderBars_DrawsABarForEachValue_ApartBySpacingPlusOne, VBarTests.RenderBars_ArrayStartingAtOne_DrawsEveryBar, VBarTests.RenderBars_DoesNotWriteTheBlankColumns_AndUsesOneSpacingByDefault, VBarTests.RenderBars_MinAndMax_GiveTheEmptyAndTheFullBar, VBarTests.RenderBars_MaxEqualToMin_RaisesError11 -->
### RenderBars
{: .no_toc }

Draws a bar for each value of an array, side by side.

Syntax: *object*.**RenderBars** ( *col* , *row* , *height* , *values* [ , *spacing* [ , *minValue* [ , *maxValue* [ , *fore* [ , *back* [ , *charStyle* ] ] ] ] ] ] )

*col*, *row*, *height*
: *required* **Long** values: the column of the first bar, the row of the top of the bars, and their height.

*values*
: *required* An array of **Double**, passed by reference. The bars follow the order of the array, from its lower bound to its upper bound.

*spacing*
: *optional* A **Long**, the number of blank columns between two bars. The default is 1. The bars are `1 + spacing` columns apart; the blank columns are not written.

*minValue*, *maxValue*
: *optional* **Double** values, the values that give an empty bar and a full bar. The defaults are 0 and 100.

*fore*, *back*, *charStyle*
: *optional*, as for [**Render**](#render).

The bar for the first value is in column *col*, and the next bars are at *col* + (`1 + spacing`), and so on.
<!-- /test -->

<!-- test: VBarTests.RenderHistory_LastValueIsAtTheGivenColumn_TheOthersGoToItsLeft, VBarTests.RenderHistory_ColumnsLeftOfTheBuffer_AreDropped, VBarTests.RenderHistory_ArrayWithNoElement_DrawsNothing, VBarTests.RenderHistory_ArrayStartingAtOne_DrawsTheChart -->
### RenderHistory
{: .no_toc }

Draws a series of values as bars with no gap, the last value at the right.

Syntax: *object*.**RenderHistory** ( *col* , *row* , *height* , *history* [ , *minValue* [ , *maxValue* [ , *fore* [ , *back* [ , *charStyle* ] ] ] ] ] )

*col*, *row*, *height*
: *required* **Long** values: the column of the last bar, the row of the top of the bars, and their height.

*history*
: *required* An array of **Double**, passed by reference, that starts at index 0. The last element is the newest value.

*minValue*, *maxValue*, *fore*, *back*, *charStyle*
: *optional*, as for [**RenderBars**](#renderbars).

The last element of the array is drawn in column *col*, the one before it in column *col* - 1, and so on to the left, one column each, so *col* is the right end of the chart and not its start. Columns left of the buffer are dropped. Nothing is drawn for an array with no element. The drawing code addresses the values by position from 0, so an array with a lower bound of 1 raises error 9, *Subscript out of range*. A program that shows a moving history keeps its own array, shifts it by one value for each new reading, and draws it again.
<!-- /test -->

<!-- test: VBarTests.RenderWithGradient_ColourOfABarIsOneOfThree, VBarTests.RenderWithGradient_GivenColoursAndBackground_AreInTheDocumentedOrder -->
### RenderWithGradient
{: .no_toc }

Draws a bar for each value, coloured by its value.

Syntax: *object*.**RenderWithGradient** ( *col* , *row* , *height* , *values* [ , *spacing* [ , *minValue* [ , *maxValue* [ , *lowColor* [ , *midColor* [ , *highColor* [ , *back* [ , *charStyle* ] ] ] ] ] ] ] ] )

*col*, *row*, *height*, *values*, *spacing*, *minValue*, *maxValue*
: As for [**RenderBars**](#renderbars).

*lowColor*
: *optional* A **ConsoleColor**, for bars below 50 percent. The default is **Green**.

*midColor*
: *optional* A **ConsoleColor**, for bars from 50 percent up to, but not including, 80 percent. The default is **Yellow**.

*highColor*
: *optional* A **ConsoleColor**, for bars of 80 percent and more. The default is **Red**.

*back*, *charStyle*
: *optional*, as for [**Render**](#render).

The colour of each bar is one of the three; there is no gradient between them. Note the order of the parameters: the three colours come before *back*, and there is no *fore*.
<!-- /test -->

<!-- test: VBarTests.RenderWithLabel_LabelIsWrittenOneRowBelowTheBlankRowUnderTheBar, VBarTests.RenderWithLabel_LabelIsCentredUnderTheBar, VBarTests.RenderWithLabel_LabelWouldStartLeftOfTheBuffer_StartsInColumn0 -->
### RenderWithLabel
{: .no_toc }

Draws one bar and a label below it.

Syntax: *object*.**RenderWithLabel** ( *col* , *row* , *height* , *percent* , *label* [ , *fore* [ , *back* [ , *charStyle* [ , *labelColor* ] ] ] ] )

*col*, *row*, *height*, *percent*, *fore*, *back*, *charStyle*
: As for [**Render**](#render).

*label*
: *required* A **String**.

*labelColor*
: *optional* A **ConsoleColor**, the colour of the label. The default is **Gray**.

Draws the bar with **Render**, and writes the label in the row `row + height + 1`, which leaves one blank row under the bar. The label starts in column `col - Len(label) \ 2 + 1`, or in column 0 when that is negative. That is one column to the right of the column that would centre the label under the bar.
<!-- /test -->

## See Also

- [cProgressBar](cProgressBar) class -- progress bars
- [cSparkline](cSparkline) class -- line charts
- [cColorHelper](Helpers#ccolorhelper-class) -- colours chosen from values
