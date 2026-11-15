---
title: Sizes and Positions
parent: VBFlexGrid
grand_parent: VBFLXGRD18 Package
permalink: /tB/Packages/Contributed/VBFLXGRD18/VBFlexGrid/Sizing
has_toc: false
---

# Sizes and Positions
{: .no_toc }

The members that set the heights of the rows and the widths of the columns of a **VBFlexGrid**, let the user resize them, fit them to their contents, and report where cells and the client area are.

All sizes and positions here are in twips. The control keeps them in pixels, so a value that is read back can differ from the one assigned by the rounding to whole pixels.

A row or a column that has no size of its own has the default size. The default height of a row is the height of one line of the font plus a small spacing, and the default width of a column is four times that height. When [**FontFixed**](Appearance#fontfixed) is set, the fixed rows and columns have the default size of that font. Setting a row height or a column width to -1 gives the row or the column the default size again.

The size of a row or a column is found in this order:

1. A hidden row or column has the size 0.
2. A row has the height that was set for it with [**RowHeight**](#rowheight). When none was set, it has [**RowHeightUniform**](#rowheightuniform) if that is not -1, and otherwise the default height. A column has the width set with [**ColWidth**](#colwidth), or else the default width.
3. A size that is not 0 is raised to [**RowHeightMin**](#rowheightmin) or [**ColWidthMin**](#colwidthmin) when it is smaller, and lowered to [**RowHeightMax**](#rowheightmax) or [**ColWidthMax**](#colwidthmax) when it is larger, when these are not 0.

[**RowHeight**](#rowheight) and [**ColWidth**](#colwidth) return the result of this order, not the number that was assigned. The last column can be widened to fill the control by [**ExtendLastCol**](#extendlastcol), which changes what is drawn and not what **ColWidth** returns.

The user resizes a column by dragging the divider at its right edge in a fixed row, and a row by dragging the divider at its bottom edge in a fixed column, when [**AllowUserResizing**](#allowuserresizing) permits. [**RowResizable**](#rowresizable) and [**ColResizable**](#colresizable) exclude single rows and columns, and the events [**BeforeUserResize**](#beforeuserresize), [**AfterUserResize**](#afteruserresize) and [**AfterUserResizeEnd**](#afteruserresizeend) report the drag. A double click on a divider raises [**DividerDblClick**](#dividerdblclick); the grid does not resize anything then, but a handler can call [**AutoSize**](#autosize) to fit the row or the column.

```tb check_build check_run slot=sub
With VBFlexGrid1
    .Rows = 4
    .Cols = 3
    .TextMatrix(1, 1) = "ab"
    .TextMatrix(2, 1) = "a much longer piece of text"
    Dim before As Long
    before = .ColWidth(1)
    .AutoSize 1                                  ' fit column 1 to its longest text
    Debug.Print "Widened: " & (.ColWidth(1) > before)
    .RowHeight(2) = 900
    Debug.Print "Taller: " & (.RowHeight(2) > .RowHeight(1))
    .RowHeight(-1) = -1                          ' every row back to the default
    Debug.Print "Equal: " & (.RowHeight(2) = .RowHeight(1))
    .RowHidden(3) = True
    Debug.Print "Hidden: " & .RowHeight(3)
End With
' Output:
' Widened: True
' Taller: True
' Equal: True
' Hidden: 0
```

The position of a cell on the screen is given by [**RowPos**](#rowpos) and [**ColPos**](#colpos) for any row and column, and by [**CellLeft**](#cellleft), [**CellTop**](#celltop), [**CellWidth**](#cellwidth) and [**CellHeight**](#cellheight) for the current cell. [**ClientLeft**](#clientleft), [**ClientTop**](#clienttop), [**ClientWidth**](#clientwidth) and [**ClientHeight**](#clientheight) give the area inside the border and the scroll bars. The grid line of a cell lies inside the cell's rectangle, on its right and bottom side; [**GetGridLineOffsets**](#getgridlineoffsets) tells how much of the cell it takes. [**TextWidth**](#textwidth) and [**TextHeight**](#textheight) measure a text in the font of a cell, and [**GetMetrics**](#getmetrics) returns the fixed sizes that the control adds.

* TOC
{:toc}

## Properties

### AllowUserResizing
{: .no_toc }

Returns or sets whether the user can resize rows and columns with the mouse. A [**FlexAllowUserResizingConstants**](../Enumerations/CellsAndAppearance#flexallowuserresizingconstants) member. Default: **FlexAllowUserResizingNone**.

Syntax: *object*.**AllowUserResizing** [ = *value* ]

With **FlexAllowUserResizingColumns**, **FlexAllowUserResizingRows** or **FlexAllowUserResizingBoth** the user can drag the right edge of a column in a fixed row, and the bottom edge of a row in a fixed column. A row or column whose **RowResizable** or **ColResizable** is **False** cannot be dragged. A value that is not a member of the enumeration raises run-time error 380.

### BestFitMode
{: .no_toc }

Returns or sets which parts of a cell [**AutoSize**](#autosize) and [**FormatString**](Structure#formatstring) take into account for the best fit. A [**FlexBestFitModeConstants**](../Enumerations/CellsAndAppearance#flexbestfitmodeconstants) member. Default: **FlexBestFitModeTextOnly**.

Syntax: *object*.**BestFitMode** [ = *value* ]

With **FlexBestFitModeTextOnly** the best fit is the width of the text. The other modes add what shares the cell with the text:

| Value | Adds to the text |
|-------|------------------|
| **FlexBestFitModeFull** | the room of a combo button, of a check box beside the text and of a picture that does not overlap the text, and of a sort arrow |
| **FlexBestFitModeSortArrowText** | the room of a sort arrow |
| **FlexBestFitModeOtherText** | the room of a combo button, a check box and a picture, but not of a sort arrow |

The sort arrow counts only in the fixed row named by [**RowSortArrows**](SortingAndSearching#rowsortarrows). The text of a cell that shows a picture from the column's image list, or a check box in place of the text (**FlexTextAsCheckBox**), does not count. A column whose [**ColTextIndent**](Text#coltextindent) is **True** gets the indentation from the **CellTextIndent** event added in every mode. A value that is not a member of the enumeration raises run-time error 380.

### CellHeight
{: .no_toc }

Returns the height of the current cell. A **Long**, in twips. Read-only.

Syntax: *object*.**CellHeight**

The height is that of the row less the grid line, so it is [**RowHeight**](#rowheight) of the current row less the top and bottom offsets of [**GetGridLineOffsets**](#getgridlineoffsets). Reading it first scrolls the grid so that the current cell is visible. When the grid has no current cell, that is when it has no rows or columns, it raises run-time error 30009 or 30010.

### CellLeft
{: .no_toc }

Returns the distance between the left edge of the control and the left edge of the current cell, in twips. A **Long**. Read-only.

Syntax: *object*.**CellLeft**

The distance is measured from the edge of the control, so the border of the control is included. Reading it first scrolls the grid so that the current cell is visible. The errors are those of [**CellHeight**](#cellheight).

### CellTop
{: .no_toc }

Returns the distance between the top edge of the control and the top edge of the current cell, in twips. A **Long**. Read-only.

Syntax: *object*.**CellTop**

It is measured as [**CellLeft**](#cellleft) is, with the border included, and has the same side effect and the same errors. Together **CellLeft** and **CellTop** place a control, such as a text box or a combo box of your own, over the current cell.

### CellWidth
{: .no_toc }

Returns the width of the current cell. A **Long**, in twips. Read-only.

Syntax: *object*.**CellWidth**

The width is that of the column less the grid line: the result is [**ColWidth**](#colwidth) of the current column less the left and right offsets of [**GetGridLineOffsets**](#getgridlineoffsets). It has the same side effect and the same errors as [**CellHeight**](#cellheight).

### ClientHeight
{: .no_toc }

Returns the height of the client area of the control, the part inside the border and the horizontal scroll bar. A **Long**, in twips. Read-only.

Syntax: *object*.**ClientHeight**

### ClientLeft
{: .no_toc }

Returns the distance between the left edge of the control and the left edge of its client area, in twips. A **Long**. Read-only.

Syntax: *object*.**ClientLeft**

The distance is the width of the border of the control on the left.

### ClientTop
{: .no_toc }

Returns the distance between the top edge of the control and the top edge of its client area, in twips. A **Long**. Read-only.

Syntax: *object*.**ClientTop**

### ClientWidth
{: .no_toc }

Returns the width of the client area of the control, the part inside the border and the vertical scroll bar. A **Long**, in twips. Read-only.

Syntax: *object*.**ClientWidth**

### ColPos
{: .no_toc }

Returns the distance between the left edge of the client area and the left edge of a column, in twips. A **Long**. Read-only.

Syntax: *object*.**ColPos**(*Index*)

*Index*
: *required* A **Long**: the column. A column the grid does not have raises run-time error 30010.

The position is the one the column has now: a column that is scrolled out to the left of the first visible column has a negative position, and one that is scrolled out to the right a position beyond the client area. The fixed and frozen columns are always at the left.

### ColResizable
{: .no_toc }

Returns or sets whether the user can resize a column with the mouse. **Boolean**. Default: **True**.

Syntax: *object*.**ColResizable**(*Index*) [ = *value* ]

*Index*
: *required* A **Long**: the column. For the assignment, -1 sets every column. A column the grid does not have raises run-time error 30010.

It has no effect on [**ColWidth**](#colwidth) and on the program, only on the mouse, and only when [**AllowUserResizing**](#allowuserresizing) allows the resizing of columns.

### ColWidth
{: .no_toc }

Returns or sets the width of a column, in twips. A **Long**.

Syntax: *object*.**ColWidth**(*Index*) [ = *value* ]

*Index*
: *required* A **Long**: the column. For the assignment, -1 sets every column. A column the grid does not have raises run-time error 30010.

*value*
: A **Long**: the width, or -1 for the default width. A smaller value raises run-time error 30014 (*Invalid Col Width value*). 0 gives the column no width without hiding it: [**ColHidden**](Structure#colhidden) stays **False**.

The result is the width that the column has, as the introduction of this page lists. It is 0 for a hidden column, it is limited by [**ColWidthMin**](#colwidthmin) and [**ColWidthMax**](#colwidthmax), and it does not include what [**ExtendLastCol**](#extendlastcol) adds to the last column.

### ColWidthMax
{: .no_toc }

Returns or sets the largest width that a column has, in twips. A **Long**. Default: 0, which means no limit.

Syntax: *object*.**ColWidthMax** [ = *value* ]

A column that is wider is shown at this width, and a column whose width is 0 is not changed. A negative *value* raises run-time error 30014.

### ColWidthMin
{: .no_toc }

Returns or sets the smallest width that a column has, in twips. A **Long**. Default: 0, which means no limit.

Syntax: *object*.**ColWidthMin** [ = *value* ]

A column that is narrower is shown at this width, and a column whose width is 0 is not changed. A negative *value* raises run-time error 30014.

### ExtendLastCol
{: .no_toc }

Returns or sets whether the last column is widened to fill the client area. **Boolean**. Default: **False**.

Syntax: *object*.**ExtendLastCol** [ = *value* ]

When the columns together are narrower than the client area, the last column that is not hidden and has a width is drawn wider by the difference, so that no empty space is left on the right. The width that [**ColWidth**](#colwidth) returns for the column does not change, and the user cannot drag the divider on the right of the extended column.

### FixGridLineOffsets
{: .no_toc }

Returns or sets whether the grid line offsets follow the grid line style. **Boolean**. Default: **False**.

Syntax: *object*.**FixGridLineOffsets** [ = *value* ]

With **False** the offsets of every cell are those of the Microsoft FlexGrid control: 0 on the left and on the top and one pixel on the right and at the bottom, whatever [**GridLines**](Appearance#gridlines) is. That keeps the cells the same size and position as they have in that control. With **True** they follow the style of the cell's grid lines: none for **FlexGridLineNone**, one pixel on the right and at the bottom for the flat, inset, dashed and dotted lines, one pixel on the left and on the top for the raised lines, and in the same way for the styles that draw horizontal or vertical lines only. The border at the end of the sheet ([**SheetBorder**](Appearance#sheetborder)) and the lines of the frozen area add what they need.

### RowHeight
{: .no_toc }

Returns or sets the height of a row, in twips. A **Long**.

Syntax: *object*.**RowHeight**(*Index*) [ = *value* ]

*Index*
: *required* A **Long**: the row. For the assignment, -1 sets every row. A row the grid does not have raises run-time error 30009.

*value*
: A **Long**: the height, or -1 for the default height. A smaller value raises run-time error 30013 (*Invalid Row Height value*). 0 gives the row no height without hiding it: [**RowHidden**](Structure#rowhidden) stays **False**.

The result is the height that the row has, as the introduction of this page lists. It is 0 for a hidden row, and it is limited by [**RowHeightMin**](#rowheightmin) and [**RowHeightMax**](#rowheightmax).

### RowHeightMax
{: .no_toc }

Returns or sets the largest height that a row has, in twips. A **Long**. Default: 0, which means no limit.

Syntax: *object*.**RowHeightMax** [ = *value* ]

A row that is taller is shown at this height, and a row whose height is 0 is not changed. A negative *value* raises run-time error 30013.

### RowHeightMin
{: .no_toc }

Returns or sets the smallest height that a row has, in twips. A **Long**. Default: 0, which means no limit.

Syntax: *object*.**RowHeightMin** [ = *value* ]

A row that is lower is shown at this height, and a row whose height is 0 is not changed. A negative *value* raises run-time error 30013.

### RowHeightUniform
{: .no_toc }

Returns or sets the height of all rows that have no height of their own, in twips. A **Long**. Default: -1, which means no uniform height.

Syntax: *object*.**RowHeightUniform** [ = *value* ]

A row whose height was set with [**RowHeight**](#rowheight) keeps it. Rows without one have this height instead of the default. With [**RowSizingMode**](#rowsizingmode) set to **FlexRowSizingModeUniform**, resizing one row with the mouse sets this property and makes all the rows equal. A *value* below -1 raises run-time error 30013.

### RowPos
{: .no_toc }

Returns the distance between the top edge of the client area and the top edge of a row, in twips. A **Long**. Read-only.

Syntax: *object*.**RowPos**(*Index*)

*Index*
: *required* A **Long**: the row. A row the grid does not have raises run-time error 30009.

The position is the one the row has now, as for [**ColPos**](#colpos): the fixed and frozen rows are always at the top, and a row scrolled out above the first visible row has a negative position.

### RowResizable
{: .no_toc }

Returns or sets whether the user can resize a row with the mouse. **Boolean**. Default: **True**.

Syntax: *object*.**RowResizable**(*Index*) [ = *value* ]

*Index*
: *required* A **Long**: the row. For the assignment, -1 sets every row. A row the grid does not have raises run-time error 30009.

It has no effect on [**RowHeight**](#rowheight) and on the program, only on the mouse, and only when [**AllowUserResizing**](#allowuserresizing) allows the resizing of rows.

### RowSizingMode
{: .no_toc }

Returns or sets what happens to the other rows when the user resizes one. A [**FlexRowSizingModeConstants**](../Enumerations/CellsAndAppearance#flexrowsizingmodeconstants) member. Default: **FlexRowSizingModeIndividual**.

Syntax: *object*.**RowSizingMode** [ = *value* ]

| Value | The user resizes a row |
|-------|------------------------|
| **FlexRowSizingModeIndividual** | and only that row changes its height |
| **FlexRowSizingModeAll** | and every row gets that height |
| **FlexRowSizingModeUniform** | and [**RowHeightUniform**](#rowheightuniform) is set to that height, while the row itself goes back to using it |

The property concerns the mouse only; assigning [**RowHeight**](#rowheight) works as always. A value that is not a member of the enumeration raises run-time error 380.

## Methods

### AutoSize
{: .no_toc }

Sets the widths of columns or the heights of rows to fit their contents.

Syntax: *object*.**AutoSize** *RowOrCol1* [ , *RowOrCol2* [ , *Mode* [ , *Scope* [ , *Equal* [ , *ExtraSpace* [ , *ExcludeHidden* ] ] ] ] ] ]

*RowOrCol1*
: *required* A **Long**: the first column (or row, for the mode **FlexAutoSizeModeRowHeight**) to fit.

*RowOrCol2*
: *optional* A **Long**: the last column or row. The default, -1, is the same as *RowOrCol1*. A range can run backward. A value below -1 raises run-time error 380.

*Mode*
: *optional* A [**FlexAutoSizeModeConstants**](../Enumerations/CellsAndAppearance#flexautosizemodeconstants) member: **FlexAutoSizeModeColWidth** (the default) fits column widths, **FlexAutoSizeModeRowHeight** row heights.

*Scope*
: *optional* A [**FlexAutoSizeScopeConstants**](../Enumerations/CellsAndAppearance#flexautosizescopeconstants) member: the cells of each column (or row) that are measured. **FlexAutoSizeScopeAll** (the default) is all of them, **FlexAutoSizeScopeFixed** the fixed cells, **FlexAutoSizeScopeScrollable** the cells that are neither fixed nor frozen, **FlexAutoSizeScopeMovable** all cells that are not fixed, and **FlexAutoSizeScopeFrozen** the frozen ones.

*Equal*
: *optional* A **Boolean**: **True** gives all the columns or rows the same size, that of the biggest. The default is **False**.

*ExtraSpace*
: *optional* A **Long**: twips added to each size, on top of the cell spacing. The default is 0.

*ExcludeHidden*
: *optional* A **Boolean**: **True** leaves hidden columns and rows out, both as the ones to fit and as the cells to measure. The default is **False**, so that a hidden row still counts.

A column or row that was fitted has the size of the biggest cell in its scope, but never less than the default size: the size of the column is first reset to the default, and then raised. The cell text is measured in the font of the cell, in what [**BestFitMode**](#bestfitmode) says, and as the cell displays it. **AutoSize** does nothing for a grid without rows or columns. A column or row that the grid does not have raises run-time error 381, and a mode or scope that is not a member of its enumeration raises 380.

```tb check_build check_run slot=sub
With VBFlexGrid1
    .Rows = 3
    .Cols = 3
    .TextMatrix(1, 1) = "ab"
    .TextMatrix(2, 1) = "a much longer piece of text"
    .TextMatrix(1, 2) = "x"
    .AutoSize 1, 2, , , True                    ' columns 1 and 2, all of the same width
    Debug.Print .ColWidth(1) = .ColWidth(2)
    .RowHeight(1) = 3000
    .AutoSize 1, 2, FlexAutoSizeModeRowHeight   ' rows 1 and 2 fit their text
    Debug.Print .RowHeight(1) < 3000
End With
' Output:
' True
' True
```

### GetGridLineOffsets
{: .no_toc }

Returns how much of a cell's rectangle its grid lines take on each side.

Syntax: *object*.**GetGridLineOffsets** *Left*, *Top*, *Right*, *Bottom* [ , *Row* [ , *Col* ] ]

*Left*, *Top*, *Right*, *Bottom*
: *required* **Long** variables that receive the offsets in twips.

*Row*, *Col*
: *optional* **Long**: the cell. -1 (the default) is the current row or column. A cell the grid does not have raises run-time error 381; a value below -1 raises 380.

The offsets depend on [**FixGridLineOffsets**](#fixgridlineoffsets). With the default of **False** they are 0, 0, one pixel, one pixel for every cell. With **True** the last row and the last column have a pixel on the bottom and on the right in any case, for the line of [**SheetBorder**](Appearance#sheetborder). The cell's content is drawn inside the rectangle less the offsets, as [**CellWidth**](#cellwidth) and [**CellHeight**](#cellheight) show.

```tb check_build check_run slot=sub
Dim l As Long, t As Long, r As Long, b As Long
With VBFlexGrid1
    .Rows = 3
    .Cols = 3
    .GetGridLineOffsets l, t, r, b
    Debug.Print l & " " & t & " " & (r > 0) & " " & (b > 0)
    .FixGridLineOffsets = True
    .GridLines = FlexGridLineRaised
    .GetGridLineOffsets l, t, r, b, 1, 1
    Debug.Print (l > 0) & " " & (t > 0) & " " & r & " " & b
    .GridLines = FlexGridLineNone
    .GetGridLineOffsets l, t, r, b, 1, 1
    Debug.Print l & " " & t & " " & r & " " & b
End With
' Output:
' 0 0 True True
' True True 0 0
' 0 0 0 0
```

### GetMetrics
{: .no_toc }

Returns one of the fixed sizes that the control uses.

Syntax: *object*.**GetMetrics** *Metric*, *CX*, *CY*

*Metric*
: *required* A [**FlexMetricConstants**](../Enumerations/CellsAndAppearance#flexmetricconstants) member. Another value raises run-time error 380.

*CX*, *CY*
: *required* **Long** variables that receive the width and the height, in twips.

The metrics are:

| Metric | Size |
|--------|------|
| **FlexMetricDividerSpacing** | the margin on each side of a divider in which the mouse pointer counts as being on the divider |
| **FlexMetricTextPadding** | the space between the border of a cell and its text |
| **FlexMetricCellSpacing** | the size that is added to the size of the text for the default size of rows and columns and for the best fit |
| **FlexMetricScrollBarSize** | the width of the vertical and the height of the horizontal scroll bar |
| **FlexMetricCheckBoxSize** | the size of a check box |

The sizes scale with the display's resolution.

### TextHeight
{: .no_toc }

Returns the height that a text needs in the font of a cell, in twips. A **Long**.

Syntax: *object*.**TextHeight**(*Text* [ , *Row* [ , *Col* ] ])

*Text*
: *required* A **String**. Line breaks start new lines, and every line adds its height, unless [**SingleLine**](Text#singleline) is **True**, which ignores them. An empty text gives the height of one line.

*Row*, *Col*
: *optional* **Long**: the cell whose font is used, which can be a fixed cell, a cell with a font of its own, or one of the normal cells. -1 (the default) is the current row or column. A cell the grid does not have raises run-time error 381; a value below -1 raises 380.

### TextWidth
{: .no_toc }

Returns the width that a text needs in the font of a cell, in twips. A **Long**.

Syntax: *object*.**TextWidth**(*Text* [ , *Row* [ , *Col* ] ])

*Text*
: *required* A **String**. For a text of several lines, the result is that of the widest line. An empty text has the width 0.

*Row*, *Col*
: *optional* As for [**TextHeight**](#textheight).

The padding of the cell is not included: it is [**GetMetrics**](#getmetrics)'s **FlexMetricTextPadding** on each side.

```tb check_build check_run slot=sub
With VBFlexGrid1
    Debug.Print (.TextWidth("abcdefgh") > .TextWidth("ab")) & " " & .TextWidth("")
    Debug.Print .TextHeight("a" & vbCr & "b") > .TextHeight("a")
End With
' Output:
' True 0
' True
```

## Events

### AfterUserResize
{: .no_toc }

Occurs when the user lets go of a divider after dragging it, before the new size is applied.

Syntax: *object*\_**AfterUserResize**( *Row* **As Long**, *Col* **As Long**, *NewSize* **As Long** )

*Row*
: The row that is resized, or -1 when a column is.

*Col*
: The column that is resized, or -1 when a row is.

*NewSize*
: The new height of the row or width of the column, in twips. It can be changed: the grid uses the value that the handler leaves. A value of 0 or less gives the row or column the size 0.

The size is always at least one pixel as the user drags it. Only a drag that moved the divider raises the event. After it the grid applies the size as [**RowSizingMode**](#rowsizingmode) says for rows, and raises [**AfterUserResizeEnd**](#afteruserresizeend).

```tb check_build
Private Sub VBFlexGrid1_AfterUserResize(ByVal Row As Long, ByVal Col As Long, ByRef NewSize As Long)
    If Col > -1 And NewSize > 3000 Then NewSize = 3000   ' no column wider than 3000 twips
End Sub
```

### AfterUserResizeEnd
{: .no_toc }

Occurs after the grid has applied the size that the user gave a row or a column.

Syntax: *object*\_**AfterUserResizeEnd**( *Row* **As Long**, *Col* **As Long** )

*Row*
: The row that was resized, or -1 when a column was.

*Col*
: The column that was resized, or -1 when a row was.

### BeforeUserResize
{: .no_toc }

Occurs when the user presses the mouse button on a divider of a row or a column, before the drag starts.

Syntax: *object*\_**BeforeUserResize**( *Row* **As Long**, *Col* **As Long**, *Cancel* **As Boolean** )

*Row*
: The row that would be resized, or -1 when it is a column.

*Col*
: The column that would be resized, or -1 when it is a row.

*Cancel*
: Set to **True** to stop the resizing. The default is **False**.

```tb check_build
Private Sub VBFlexGrid1_BeforeUserResize(ByVal Row As Long, ByVal Col As Long, ByRef Cancel As Boolean)
    If Col = 0 Then Cancel = True   ' the first column keeps its width
End Sub
```

### DividerDblClick
{: .no_toc }

Occurs when the user double-clicks a divider of a row or a column.

Syntax: *object*\_**DividerDblClick**( *Row* **As Long**, *Col* **As Long** )

*Row*
: The row whose divider was clicked, or -1 when it is a column's.

*Col*
: The column whose divider was clicked, or -1 when it is a row's.

The grid does nothing in response. The usual handler fits the row or the column to its contents:

```tb check_build
Private Sub VBFlexGrid1_DividerDblClick(ByVal Row As Long, ByVal Col As Long)
    If Col > -1 Then
        VBFlexGrid1.AutoSize Col
    Else
        VBFlexGrid1.AutoSize Row, , FlexAutoSizeModeRowHeight
    End If
End Sub
```

## See Also

- [Rows and Columns](Structure) -- hidden rows and columns, and moving them
- [Cell Text](Text) -- word wrap and ellipsis change the size a text needs
- [Scrolling](Scrolling) -- the part of the grid that is visible
- [Appearance](Appearance) -- grid lines and borders
- [FlexAllowUserResizingConstants](../Enumerations/CellsAndAppearance#flexallowuserresizingconstants) -- the resizing modes
- [FlexAutoSizeModeConstants](../Enumerations/CellsAndAppearance#flexautosizemodeconstants) -- widths or heights for **AutoSize**
- [FlexAutoSizeScopeConstants](../Enumerations/CellsAndAppearance#flexautosizescopeconstants) -- the cells that **AutoSize** measures
- [FlexBestFitModeConstants](../Enumerations/CellsAndAppearance#flexbestfitmodeconstants) -- the parts of a cell that the best fit counts
- [FlexMetricConstants](../Enumerations/CellsAndAppearance#flexmetricconstants) -- the sizes of **GetMetrics**
- [FlexRowSizingModeConstants](../Enumerations/CellsAndAppearance#flexrowsizingmodeconstants) -- what resizing a row does to the others
