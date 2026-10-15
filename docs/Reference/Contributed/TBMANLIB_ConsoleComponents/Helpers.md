---
title: TBMANLIB_ConsoleComponents Helpers
parent: TBMANLIB_ConsoleComponents Package
permalink: /tB/Packages/Contributed/TBMANLIB_ConsoleComponents/Helpers
has_toc: false
---

# cColorHelper, cLayoutHelper
{: .no_toc }

Two small classes that compute values and draw nothing: **cColorHelper** chooses a colour for a number, and **cLayoutHelper** works out positions and rectangles in the console window.

<!-- test: ColorHelperTests.HeatmapColor_ThresholdsAreAtHalfAndEightTenths, ColorHelperTests.CPUUsageColor_ThresholdsAre50And80 -->
**cColorHelper** needs no console and no state. **cLayoutHelper** is made with a [**cConsole**](../TBMANLIB_ConsoleCore/cConsole), and reads its window size each time a member is called. Both are created with `New`.

```tb check_build check_run
Dim helper As New cColorHelper

Debug.Print helper.HeatmapColor(10, 0, 100)
Debug.Print helper.HeatmapColor(60, 0, 100)
Debug.Print helper.HeatmapColor(95, 0, 100)
Debug.Print helper.CPUUsageColor(72)
' Output:
' 10
' 14
' 12
' 14
```

The four numbers are **ConsoleColor** values: 10 is **Green**, 14 is **Yellow** and 12 is **Red**.
<!-- /test -->

* TOC
{:toc}

## cColorHelper class

<!-- test: ColorHelperTests.BrightenColor_DarkGray_IsAConsoleColour, ColorHelperTests.DimColor_DarkColour_IsNotBrighter, ColorHelperTests.IntensityColor_UsesItsBaseColour, ColorHelperTests.GradientColor_ChoosesAmongTheThreeColoursAtAQuarterAndThreeQuarters -->
Every colour parameter and result is a [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), and every function is called on an object, as in `helper.DimColor(...)`. The numbers that give the choice of a colour are in each entry; they are fixed in the code. In the syntax lines of this section, *object* is a **cColorHelper**.

Known problems in version 1.0.0.1: [**BrightenColor**](#brightencolor) returns 16 for **DarkGray**, [**DimColor**](#dimcolor) returns **DarkGray** for every dark colour, [**IntensityColor**](#intensitycolor) ignores its *baseColor*, and [**GradientColor**](#gradientcolor) chooses among three colours and does not blend.
<!-- /test -->

<!-- test: ColorHelperTests.BrightenColor_DarkColour_IsTheBrightColourOfTheSameHue, ColorHelperTests.BrightenColor_BrightColour_IsWhite, ColorHelperTests.BrightenColor_DarkGray_IsAConsoleColour -->
### BrightenColor
{: .no_toc }

Returns a brighter version of a colour.

Syntax: *object*.**BrightenColor** ( *color* ) **As ConsoleColor**

*color*
: *required* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor).

For a colour from **Black** (0) up to **DarkGray** (8) the result is the colour plus 8: **Black** gives **DarkGray**, **DarkBlue** gives **Blue**, **Gray** gives **White**. **DarkGray** is in that range as well, and 8 + 8 is 16, which is not a **ConsoleColor**. The result 16 has bit 4 set; used as a text colour it adds the blue background bit to the attribute of the cell. For every colour from **Blue** (9) up, the result is **White**.

```tb check_build check_run
Dim helper As New cColorHelper

Debug.Print helper.BrightenColor(ConsoleColor.DarkBlue)
Debug.Print helper.BrightenColor(ConsoleColor.DarkGray)
Debug.Print helper.BrightenColor(ConsoleColor.Red)
' Output:
' 9
' 16
' 15
```
<!-- /test -->

<!-- test: ColorHelperTests.CPUUsageColor_ThresholdsAre50And80 -->
### CPUUsageColor
{: .no_toc }

Returns a colour for a processor load.

Syntax: *object*.**CPUUsageColor** ( *usage* ) **As ConsoleColor**

*usage*
: *required* A **Double**, a percentage.

**Green** below 50, **Yellow** from 50 up to, but not including, 80, and **Red** from 80. The value is not limited to 0 to 100.
<!-- /test -->

<!-- test: ColorHelperTests.CycleColor_GoesRoundTheList_AlsoBackwards, ColorHelperTests.CycleColor_EmptyList_IsGray, ColorHelperTests.CycleColor_ListStartingAtOne_GivesTheFirstElementForIndexZero -->
### CycleColor
{: .no_toc }

Returns the colour for an item number, going round a list of colours.

Syntax: *object*.**CycleColor** ( *index* , *colors* ) **As ConsoleColor**

*index*
: *required* A **Long**, the number of the item. A negative number counts back from the end of the list.

*colors*
: *required* An array of **ConsoleColor**, passed by reference, that starts at index 0.

Returns `colors(index Mod count)`, with a negative remainder raised by *count*. Returns **Gray** for an array with no element. The code takes the result of `Mod` as an index, so an array whose lower bound is not 0 gives a wrong element or error 9, *Subscript out of range*.
<!-- /test -->

<!-- test: ColorHelperTests.DimColor_BrightColour_IsTheDarkColourOfTheSameHue, ColorHelperTests.DimColor_DarkColour_IsNotBrighter -->
### DimColor
{: .no_toc }

Returns a dimmer version of a colour.

Syntax: *object*.**DimColor** ( *color* ) **As ConsoleColor**

*color*
: *required* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor).

For a colour from **Blue** (9) to **White** (15) the result is the colour less 8, the dark colour of the same hue: **Red** gives **DarkRed**, **White** gives **Gray**. For every colour from **Black** to **DarkGray**, the result is **DarkGray**; so the dimmer version of **Black** is the brighter **DarkGray**.
<!-- /test -->

<!-- test: ColorHelperTests.DiskUsageColor_ThresholdsAre80And95 -->
### DiskUsageColor
{: .no_toc }

Returns a colour for the use of a disk.

Syntax: *object*.**DiskUsageColor** ( *usage* ) **As ConsoleColor**

*usage*
: *required* A **Double**, a percentage.

**Green** below 80, **Yellow** from 80 up to, but not including, 95, and **Red** from 95.
<!-- /test -->

<!-- test: ColorHelperTests.GetContrastColor_WhiteUpToDarkGray_BlackAbove -->
### GetContrastColor
{: .no_toc }

Returns a text colour that can be read on a background.

Syntax: *object*.**GetContrastColor** ( *bgColor* ) **As ConsoleColor**

*bgColor*
: *required* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor), the background.

Returns **White** for a background from **Black** (0) to **DarkGray** (8), and **Black** for **Blue** (9) and up. **DarkYellow** and **Gray** are in the first group, so white text is chosen on a grey background.
<!-- /test -->

<!-- test: ColorHelperTests.GradientColor_ChoosesAmongTheThreeColoursAtAQuarterAndThreeQuarters -->
### GradientColor
{: .no_toc }

Returns one of three colours for a value in a range.

Syntax: *object*.**GradientColor** ( *value* , *min* , *max* , *color1* , *color2* , *color3* ) **As ConsoleColor**

*value*
: *required* A **Double**.

*min*, *max*
: *required* **Double** values, the ends of the range. When *max* is not greater than *min*, the position is taken as the middle of the range.

*color1*, *color2*, *color3*
: *required* **ConsoleColor** values.

The position of *value* in the range, limited to 0 to 1, gives *color1* below 0.25, *color2* from 0.25 up to, but not including, 0.75, and *color3* from 0.75. The comment of the source speaks of a smooth transition; the console has 16 colours and the function does not blend.
<!-- /test -->

<!-- test: ColorHelperTests.HeatmapColor_ThresholdsAreAtHalfAndEightTenths, ColorHelperTests.HeatmapColor_ValueOutsideTheRange_IsLimitedToIt, ColorHelperTests.HeatmapColor_MaxNotAboveMin_IsTheMiddleColour, ColorHelperTests.HeatmapColor_GivenColours_AreUsedInPlaceOfTheDefaults -->
### HeatmapColor
{: .no_toc }

Returns a colour for a value in a range: one colour for the low part, one for the middle and one for the high part.

Syntax: *object*.**HeatmapColor** ( *value* , *min* , *max* [ , *lowColor* [ , *midColor* [ , *highColor* ] ] ] ) **As ConsoleColor**

*value*
: *required* A **Double**.

*min*, *max*
: *required* **Double** values, the ends of the range. When *max* is not greater than *min*, the position is taken as the middle of the range, which gives *midColor*.

*lowColor*
: *optional* A **ConsoleColor**, for positions below 0.5. The default is **Green**.

*midColor*
: *optional* A **ConsoleColor**, for positions from 0.5 up to, but not including, 0.8. The default is **Yellow**.

*highColor*
: *optional* A **ConsoleColor**, for positions from 0.8. The default is **Red**.

The position is `(value - min) / (max - min)`, limited to 0 to 1.
<!-- /test -->

<!-- test: ColorHelperTests.IntensityColor_EightLevelsInTheOrderOfTheColourNumbers, ColorHelperTests.IntensityColor_LevelIsRoundedHalfToEven, ColorHelperTests.IntensityColor_UsesItsBaseColour -->
### IntensityColor
{: .no_toc }

Returns one of eight colours for a value in a range.

Syntax: *object*.**IntensityColor** ( *value* , *min* , *max* [ , *baseColor* ] ) **As ConsoleColor**

*value*
: *required* A **Double**.

*min*, *max*
: *required* **Double** values, the ends of the range. When *max* is not greater than *min*, the position is taken as the middle of the range.

*baseColor*
: *optional* A **ConsoleColor**. The default is **Gray**. It is not used: the function never reaches the line that returns it.

The level is `CLng(position * 7)`, from 0 to 7, which rounds half to even. The result is **Black**, **DarkBlue**, **DarkGreen**, **DarkCyan**, **DarkRed**, **DarkMagenta**, **DarkYellow** or **DarkGray** for the levels 0 to 7, in that order. This is the order of the numbers of the colours, not an order of brightness, so a rising value does not give a steadily lighter colour.
<!-- /test -->

<!-- test: ColorHelperTests.IsDarkColor_TrueUpToDarkGray_FalseAbove -->
### IsDarkColor
{: .no_toc }

Tells whether a colour is dark.

Syntax: *object*.**IsDarkColor** ( *color* ) **As Boolean**

*color*
: *required* A [**ConsoleColor**](../TBMANLIB_ConsoleCore/Types#consolecolor).

Returns **True** for **Black** (0) up to **DarkGray** (8), which includes **Gray**.
<!-- /test -->

<!-- test: ColorHelperTests.MemoryUsageColor_ThresholdsAre70And90 -->
### MemoryUsageColor
{: .no_toc }

Returns a colour for the use of memory.

Syntax: *object*.**MemoryUsageColor** ( *usage* ) **As ConsoleColor**

*usage*
: *required* A **Double**, a percentage.

**Green** below 70, **Yellow** from 70 up to, but not including, 90, and **Red** from 90.
<!-- /test -->

## cLayoutHelper class

<!-- test: LayoutHelperTests.Members_FollowTheWindowWhenItIsResized, LayoutHelperTests.Members_ProgramWithoutAConsole_ComputeFor80By25Cells, LayoutHelperTests.ArrangementsWithACountOfZero_RaiseError11, LayoutHelperTests.Grid_ElementOfTheVariant_CannotBeReadMemberByMember, LayoutHelperTests.Grid_Variant_IsAssignedToAnArrayOfRectangles, LayoutHelperTests.SpacedPositions_DoNotUseTheWindow, compile VariantElementToRect, compile CenterMember, compile CenterAssign, compile CenterRectAssign, compile PercentRectAssign, compile PercentAssign, compile WithMarginsAssign, compile ClampRectAssign, compile SpacedPositionsToVariant, compile CenterXToLong, compile GridToRectArray -->
Computes positions and [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect) rectangles from the size of the window of a console. A rectangle has inclusive edges, and columns and rows are counted from 0. Every member except [**SpacedPositions**](#spacedpositions) reads [**Width**](../TBMANLIB_ConsoleCore/cConsole#width) and [**Height**](../TBMANLIB_ConsoleCore/cConsole#height) of the console when it is called, so the results follow a window that the user resizes; without a console they are computed for 80 columns by 25 rows. In the syntax lines of this section, *object* is a **cLayoutHelper**.

The members that give several rectangles or numbers return them in a **Variant** that holds an array, with indexes from 0, in the order the entry names. The rectangles of one result do not overlap and have no gap between them, except where the entry says so. A division by a count of 0 raises error 11, *Division by zero*.

A program that includes the source files of the components (see [The two packages](./#the-two-packages)) reads an array of rectangles by assigning the **Variant** to an array variable of the type: with `Dim rects() As ConsoleRect`, the statement `rects = helper.Grid(2, 2)` gives `rects(0)` to `rects(3)`. An element cannot be taken out of the **Variant** itself: `r = parts(0)`, with `r` a **ConsoleRect**, is refused (TB5028, *Unable to convert type 'Variant' to type 'ConsoleRect'*), and `parts(0).Left` raises error -2147467259, *Unspecified error*. An array of **Long**, as **SpacedPositions** gives, is read element by element from the **Variant**, as the sample below does.

```tb check_build
Dim con As New cConsole
Dim layout As cLayoutHelper = New cLayoutHelper(con)
Dim columns As Variant

Debug.Print layout.CenterX(20) & " " & layout.CenterY(5)
Debug.Print layout.PercentX(25) & " " & layout.PercentY(50)
columns = layout.SpacedPositions(3, 10, 2, 5)
Debug.Print columns(0) & " " & columns(1) & " " & columns(2)
' Output:
' 30 10
' 20 12
' 5 17 29
```

The output is that of a console of 80 columns by 25 rows, which is also the size that a program without a console gets.

> [!NOTE] 1.0.0.1, BETA 1005
> A program that references the packages TBMANLIB_ConsoleCore and TBMANLIB_ConsoleComponents cannot read what the members that give a **ConsoleRect** or a **ConsolePosition** return: the compiler refuses the members of the value and its assignment to a variable of the type. The members that give a **Long** or an array of **Long** compile. A **cLayoutHelper** cannot be made with the **cConsole** of the published package at all; see [The two packages](./#the-two-packages).
<!-- /test -->

### New
{: .no_toc }

Creates a layout helper for a console.

Syntax: **New cLayoutHelper** ( *console* )

*console*
: *required* A [**cConsole**](../TBMANLIB_ConsoleCore/cConsole).

Keeps the console. The console does not have to be in full-screen mode.

<!-- test: LayoutHelperTests.Center_CenterX_CenterY_UseTheSizeOfTheWindow -->
### Center
{: .no_toc }

Returns the position at which an area of a given size is centred in the window.

Syntax: *object*.**Center** ( *width* , *height* ) **As ConsolePosition**

*width*, *height*
: *required* **Long** values, the size of the area in columns and rows.

Returns a [**ConsolePosition**](../TBMANLIB_ConsoleCore/Types#consoleposition) with **Col** `(Width - width) \ 2` and **Row** `(Height - height) \ 2`. The values are negative when the area is larger than the window.
<!-- /test -->

<!-- test: LayoutHelperTests.CenterRect_StartsAtCenter_AndIsTheRectangleOfTheConsoleMember -->
### CenterRect
{: .no_toc }

Returns the rectangle of an area of a given size, centred in the window.

Syntax: *object*.**CenterRect** ( *width* , *height* ) **As ConsoleRect**

*width*, *height*
: *required* **Long** values.

The rectangle starts at the position that [**Center**](#center) returns and is *width* columns wide and *height* rows high. [**CenterRect**](../TBMANLIB_ConsoleCore/cConsole#centerrect) of **cConsole** gives the same rectangle.
<!-- /test -->

<!-- test: LayoutHelperTests.Center_CenterX_CenterY_UseTheSizeOfTheWindow -->
### CenterX
{: .no_toc }

Returns the column at which an area of a given width is centred.

Syntax: *object*.**CenterX** ( *width* ) **As Long**

*width*
: *required* A **Long**.

Returns `(Width - width) \ 2`.
<!-- /test -->

<!-- test: LayoutHelperTests.Center_CenterX_CenterY_UseTheSizeOfTheWindow -->
### CenterY
{: .no_toc }

Returns the row at which an area of a given height is centred.

Syntax: *object*.**CenterY** ( *height* ) **As Long**

*height*
: *required* A **Long**.

Returns `(Height - height) \ 2`.
<!-- /test -->

<!-- test: LayoutHelperTests.ClampRect_CutsTheRectangleToTheWindow -->
### ClampRect
{: .no_toc }

Cuts a rectangle to the window.

Syntax: *object*.**ClampRect** ( *rect* ) **As ConsoleRect**

*rect*
: *required* A [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect).

Raises **Left** and **Top** to 0 when they are negative, and lowers **Right** and **Bottom** to the last column and the last row of the window. A rectangle that lies wholly outside the window is cut to an invalid one; [**IsValidRect**](#isvalidrect) tells.
<!-- /test -->

<!-- test: LayoutHelperTests.EvenColumns_LastColumnTakesTheRemainder -->
### EvenColumns
{: .no_toc }

Divides the window into columns of the same width.

Syntax: *object*.**EvenColumns** ( *count* , *margin* ) **As Variant**

*count*
: *required* A **Long**, the number of columns.

*margin*
: *required* A **Long**, the number of cells to leave free on every side of the window.

Returns *count* rectangles, from left to right. Each is `(Width - 2 * margin) \ count` columns wide and reaches from the row *margin* to the row `Height - 1 - margin`. The last one is widened to the right margin, so it takes the remainder.
<!-- /test -->

<!-- test: LayoutHelperTests.EvenRows_LastRowTakesTheRemainder -->
### EvenRows
{: .no_toc }

Divides the window into rows of the same height.

Syntax: *object*.**EvenRows** ( *count* , *margin* ) **As Variant**

*count*
: *required* A **Long**, the number of rows.

*margin*
: *required* A **Long**, the number of cells to leave free on every side of the window.

Returns *count* rectangles, from top to bottom, each as wide as the window less the margins and `(Height - 2 * margin) \ count` rows high. The last one is heightened to the bottom margin.
<!-- /test -->

<!-- test: LayoutHelperTests.IsValidRect_GetRectWidth_GetRectHeight -->
### GetRectHeight
{: .no_toc }

Returns the height of a rectangle.

Syntax: *object*.**GetRectHeight** ( *rect* ) **As Long**

*rect*
: *required* A [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect).

Returns `Bottom - Top + 1`, as [**ConsoleRect_Height**](../TBMANLIB_ConsoleCore/Types#consolerect_height) does.
<!-- /test -->

<!-- test: LayoutHelperTests.IsValidRect_GetRectWidth_GetRectHeight -->
### GetRectWidth
{: .no_toc }

Returns the width of a rectangle.

Syntax: *object*.**GetRectWidth** ( *rect* ) **As Long**

*rect*
: *required* A [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect).

Returns `Right - Left + 1`, as [**ConsoleRect_Width**](../TBMANLIB_ConsoleCore/Types#consolerect_width) does.
<!-- /test -->

<!-- test: LayoutHelperTests.Grid_CellsAreWidthDivColsByHeightDivRows_AndTheRemainderIsNotCovered -->
### Grid
{: .no_toc }

Divides the window into a grid of cells.

Syntax: *object*.**Grid** ( *cols* , *rows* ) **As Variant**

*cols*, *rows*
: *required* **Long** values, the number of columns and rows.

Returns `cols * rows` rectangles, row by row from the top left. Each cell is `Width \ cols` columns wide and `Height \ rows` rows high, with no gap between cells. The remainder of the division is not covered: the right and bottom edges of the grid can end short of the window. [**CreateGrid**](cConsoleLayout#creategrid) of **cConsoleLayout** leaves a gap and gives the remainder to the last column and row.
<!-- /test -->

<!-- test: LayoutHelperTests.HeaderFooter_GivesAHeaderABodyAndAFooter -->
### HeaderFooter
{: .no_toc }

Divides the window into a header, a body and a footer.

Syntax: *object*.**HeaderFooter** ( *headerHeight* , *footerHeight* ) **As Variant**

*headerHeight*, *footerHeight*
: *required* **Long** values, the number of rows of the header and of the footer.

Returns three rectangles as wide as the window: the header (the first *headerHeight* rows), the body (the rows between) and the footer (the last *footerHeight* rows), in that order.
<!-- /test -->

<!-- test: LayoutHelperTests.IsValidRect_GetRectWidth_GetRectHeight, LayoutHelperTests.ClampRect_CutsTheRectangleToTheWindow -->
### IsValidRect
{: .no_toc }

Tells whether a rectangle has a positive size.

Syntax: *object*.**IsValidRect** ( *rect* ) **As Boolean**

*rect*
: *required* A [**ConsoleRect**](../TBMANLIB_ConsoleCore/Types#consolerect).

Returns **True** when `Left <= Right` and `Top <= Bottom`.
<!-- /test -->

<!-- test: LayoutHelperTests.Percent_PercentX_PercentY_AreNotLimitedTo0To100 -->
### Percent
{: .no_toc }

Returns the position at given percentages of the window.

Syntax: *object*.**Percent** ( *percentX* , *percentY* ) **As ConsolePosition**

*percentX*, *percentY*
: *required* **Double** values, the share of the width and of the height. They are not limited to 0 to 100.

Returns a [**ConsolePosition**](../TBMANLIB_ConsoleCore/Types#consoleposition) with **Col** `CLng(Width * percentX / 100)` and **Row** `CLng(Height * percentY / 100)`.
<!-- /test -->

<!-- test: LayoutHelperTests.PercentRect_LeftTopWidthHeightAreShares -->
### PercentRect
{: .no_toc }

Returns the rectangle at given percentages of the window.

Syntax: *object*.**PercentRect** ( *leftPercent* , *topPercent* , *widthPercent* , *heightPercent* ) **As ConsoleRect**

*leftPercent*, *topPercent*, *widthPercent*, *heightPercent*
: *required* **Double** values. The first two give the upper left corner, and the last two the size, all as percentages of the width and the height.

**Left** is `CLng(Width * leftPercent / 100)`, and **Right** is `CLng(Width * (leftPercent + widthPercent) / 100) - 1`, and **Top** and **Bottom** are computed in the same way from the height.
<!-- /test -->

<!-- test: LayoutHelperTests.Percent_PercentX_PercentY_AreNotLimitedTo0To100 -->
### PercentX
{: .no_toc }

Returns the column at a percentage of the width.

Syntax: *object*.**PercentX** ( *percent* ) **As Long**

*percent*
: *required* A **Double**. Unlike [**PercentX**](../TBMANLIB_ConsoleCore/cConsole#percentx) of **cConsole**, this one does not limit it to 0 to 100.

Returns `CLng(Width * percent / 100)`.
<!-- /test -->

<!-- test: LayoutHelperTests.Percent_PercentX_PercentY_AreNotLimitedTo0To100 -->
### PercentY
{: .no_toc }

Returns the row at a percentage of the height.

Syntax: *object*.**PercentY** ( *percent* ) **As Long**

*percent*
: *required* A **Double**, not limited to 0 to 100.

Returns `CLng(Height * percent / 100)`.
<!-- /test -->

<!-- test: LayoutHelperTests.Sidebar_GivesASidebarAndTheRestOfTheWindow -->
### Sidebar
{: .no_toc }

Divides the window into a sidebar on the left and a content area.

Syntax: *object*.**Sidebar** ( *sidebarWidth* ) **As Variant**

*sidebarWidth*
: *required* A **Long**, the number of columns of the sidebar.

Returns two rectangles as high as the window: the sidebar (the first *sidebarWidth* columns) and the content area (the rest), in that order.
<!-- /test -->

<!-- test: LayoutHelperTests.SpacedPositions_DoNotUseTheWindow -->
### SpacedPositions
{: .no_toc }

Returns the columns of items of equal width placed in a row.

Syntax: *object*.**SpacedPositions** ( *count* , *itemWidth* , *spacing* , *startX* ) **As Variant**

*count*
: *required* A **Long**, the number of items.

*itemWidth*
: *required* A **Long**, the width of an item in columns.

*spacing*
: *required* A **Long**, the number of blank columns between two items.

*startX*
: *required* A **Long**, the column of the first item.

Returns *count* **Long** values: the column of item *i* is `startX + i * (itemWidth + spacing)`. This member does not use the size of the window.
<!-- /test -->

<!-- test: LayoutHelperTests.SplitHorizontal_GivesATopAndABottomRectangle, LayoutTests.SplitHorizontal_AndLayoutHelperSplitHorizontal_DivideInTheSameDirection -->
### SplitHorizontal
{: .no_toc }

Divides the window into a top part and a bottom part.

Syntax: *object*.**SplitHorizontal** ( *topPercent* ) **As Variant**

*topPercent*
: *required* A **Double**, the share of the height for the top part, in percent.

Returns two rectangles as wide as the window: the top one, from row 0 to row `PercentY(topPercent) - 1`, and the bottom one, from row `PercentY(topPercent)` to the last row. The line between the parts is horizontal. The member of the same name in [**cConsoleLayout**](cConsoleLayout#splithorizontal) divides the width instead.
<!-- /test -->

<!-- test: LayoutHelperTests.SplitVertical_GivesALeftAndARightRectangle -->
### SplitVertical
{: .no_toc }

Divides the window into a left part and a right part.

Syntax: *object*.**SplitVertical** ( *leftPercent* ) **As Variant**

*leftPercent*
: *required* A **Double**, the share of the width for the left part, in percent.

Returns two rectangles as high as the window: the left one, from column 0 to column `PercentX(leftPercent) - 1`, and the right one, from column `PercentX(leftPercent)` to the last column. The line between the parts is vertical. The member of the same name in [**cConsoleLayout**](cConsoleLayout#splitvertical) divides the height instead.
<!-- /test -->

<!-- test: LayoutHelperTests.WithMargins_LeavesTheMarginsFree -->
### WithMargins
{: .no_toc }

Returns the window less a margin on each side.

Syntax: *object*.**WithMargins** ( *left* , *top* , *right* , *bottom* ) **As ConsoleRect**

*left*, *top*, *right*, *bottom*
: *required* **Long** values, the number of cells to leave free at each side.

Returns the rectangle from column *left* and row *top* to column `Width - 1 - right` and row `Height - 1 - bottom`.
<!-- /test -->

## See Also

- [cConsoleLayout](cConsoleLayout) class -- panels placed by name
- [cConsolePanel](cConsolePanel) class
- [cConsole](../TBMANLIB_ConsoleCore/cConsole) class -- **Width**, **Height** and its own **Center** and **Percent** members
- [Types](../TBMANLIB_ConsoleCore/Types) of ConsoleCore -- **ConsoleRect**, **ConsolePosition** and **ConsoleColor**
