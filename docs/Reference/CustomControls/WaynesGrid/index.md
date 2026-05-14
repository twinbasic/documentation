---
title: WaynesGrid
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesGrid/
has_toc: false
---

# WaynesGrid class
{: .no_toc }

A tabular data display --- a grid of cells with column headers and row headers, resizable columns, optional grid lines, hover and selection highlighting, vertical and horizontal scrolling via the mouse wheel, and full keyboard navigation. The number of rows is set by [**RowCount**](#rowcount); the cells themselves are filled in by handling the [**GetCellText**](#getcelltext) event, which fires once per visible cell as the grid paints.

The grid has an array of [**Column**](Column) objects giving each column its [**Caption**](Column#caption) and [**Width**](Column#width). Five distinct [**CellRenderingOptions**](CellRenderingOptions) sub-objects control the appearance of column headers, row headers, normal cells, the hovered cell, the selected cell, and full-column / full-row multi-selection.

```tb
Private Sub Form_Load()
    ReDim Grid1.Columns(2)
    Set Grid1.Columns(0) = New Column
    Set Grid1.Columns(1) = New Column
    Set Grid1.Columns(2) = New Column
    Grid1.Columns(0).Caption = "ID"
    Grid1.Columns(1).Caption = "Name"
    Grid1.Columns(2).Caption = "Date"
    Grid1.RowCount = 100
End Sub

Private Sub Grid1_GetCellText( _
        ByVal X As Long, ByVal Y As Long, ByRef Value As String)

    Select Case X
        Case 0: Value = CStr(Y + 1)
        Case 1: Value = "Row " & (Y + 1)
        Case 2: Value = Format$(DateAdd("d", Y, Date), "yyyy-mm-dd")
    End Select
End Sub
```

The six [**CellRenderingOptions**](CellRenderingOptions) sub-objects ([**ColumnHeaderOptions**](#columnheaderoptions), [**RowHeaderOptions**](#rowheaderoptions), [**CellOptions**](#celloptions), [**HoverCellOptions**](#hovercelloptions), [**SelectedCellOptions**](#selectedcelloptions), [**MultiSelectCellOptions**](#multiselectcelloptions)) control the grid's visual style. A typical setup gives headers a gradient, body cells left-aligned text with a small left-padding indent, and the selected cell a contrasting border:

```tb
With Grid1.ColumnHeaderOptions
    .Fill.SetSimplePattern &HE0E0E0, &HC0C0C0, _
            Pattern:=tbGradientNorthToSouth
    .TextRendering.Font.Weight = tbBold
    .TextRendering.Alignment = tbAlignMiddleCenter
End With

With Grid1.CellOptions
    .Fill.ColorPoints.SetSolidColor vbWhite
    .TextRendering.Alignment = tbAlignMiddleLeft
    .TextRendering.Padding.Left = 10
End With

With Grid1.SelectedCellOptions
    .Fill.ColorPoints.SetSolidColor &HFFEEDD                ' pale blue
    .Borders.SetSimpleBorder StrokeSize:=2, ColorRGB:=vbBlue
End With
```

* TOC
{:toc}

## Cell selection

The grid exposes three separate selection states, each tracked through its own pair of properties:

- A single hover-highlight cell --- the cell currently under the mouse --- controlled by [**HoverCellOptions**](#hovercelloptions). Internal to the grid; not exposed as a property.
- A single selected cell, with coordinates in [**SelectedCellX**](#selectedcellx) and [**SelectedCellY**](#selectedcelly), drawn using [**SelectedCellOptions**](#selectedcelloptions).
- A full-row or full-column multi-selection, indicated by clicking the row header or column header. [**SelectedFullColumnX**](#selectedfullcolumnx) and [**SelectedFullRowY**](#selectedfullrowy) hold the indices; the affected cells render with [**MultiSelectCellOptions**](#multiselectcelloptions).

A value of `-1` on any of the selection-coordinate properties means "no selection of that kind". Setting a selection programmatically and then asking the grid to repaint moves the focus to the corresponding cell as well, by way of [**CustomControlContext.ChangeFocusedElement**](../Framework/CustomControlContext#changefocusedelement).

## Properties

### Anchors
{: .no_toc }

Which sides of the control are attached to its container during resize. [**Anchors**](../Styles/Anchors). Inherited.

### CellOptions
{: .no_toc }

The [**CellRenderingOptions**](CellRenderingOptions) used to draw ordinary, unselected, non-hovered cells.

### ColumnHeaderOptions
{: .no_toc }

The [**CellRenderingOptions**](CellRenderingOptions) used to draw the column-header row (the top row).

### Columns
{: .no_toc }

The array of [**Column**](Column) objects describing each column. Read-write; `ReDim` to grow / shrink, and assign individual [**Column**](Column) instances into the elements.

### Dock
{: .no_toc }

How the control is docked inside its container. A member of [**DockMode**](../Enumerations/DockMode). Inherited.

### HeaderRowHeight
{: .no_toc }

The height of the column-header row, in pixels (unscaled by DPI). **Long**. Default: 60.

### Height
{: .no_toc }

The control's height in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### HorizontalLineOptions
{: .no_toc }

The [**Line**](../Styles/Line) drawn between successive rows. Set its [**StrokeSize**](../Styles/Line#strokesize) to 0 to suppress the horizontal lines.

### HoverCellOptions
{: .no_toc }

The [**CellRenderingOptions**](CellRenderingOptions) used to draw the cell currently under the mouse cursor.

### Left
{: .no_toc }

The horizontal offset of the control's left edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### MultiSelectCellOptions
{: .no_toc }

The [**CellRenderingOptions**](CellRenderingOptions) used to draw cells that belong to a full-column or full-row multi-selection.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. **String**. Inherited.

### ResizerBar
{: .no_toc }

The [**Line**](../Styles/Line) drawn over a column-edge while the user is dragging it to resize. Transparent when not hovered; rendered with the line's fill while the resize is active.

### RowCount
{: .no_toc }

The total number of rows in the grid. **Long**. Default: -1 (unbounded --- the grid paints rows forever as the user scrolls).

### RowHeaderOptions
{: .no_toc }

The [**CellRenderingOptions**](CellRenderingOptions) used to draw the row-header column (the leftmost column).

### RowHeight
{: .no_toc }

The height of every non-header row, in pixels (unscaled by DPI). **Long**. Default: 40.

### SelectedCellOptions
{: .no_toc }

The [**CellRenderingOptions**](CellRenderingOptions) used to draw the single currently-selected cell at ([**SelectedCellX**](#selectedcellx), [**SelectedCellY**](#selectedcelly)).

### SelectedCellX
{: .no_toc }

The X (column) index of the currently-selected cell, or -1 if no cell is selected. **Long**. Default: -1.

### SelectedCellY
{: .no_toc }

The Y (row) index of the currently-selected cell, or -1 if no cell is selected. **Long**. Default: -1.

### SelectedFullColumnX
{: .no_toc }

The X (column) index of a full-column multi-selection, or -1 if no full column is selected. **Long**. Default: -1.

### SelectedFullRowY
{: .no_toc }

The Y (row) index of a full-row multi-selection, or -1 if no full row is selected. **Long**. Default: -1.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**. Inherited.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing **TAB**. **Boolean**. Inherited. Default: **True**.

### Top
{: .no_toc }

The vertical offset of the control's top edge from its container, in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### VerticalLineOptions
{: .no_toc }

The [**Line**](../Styles/Line) drawn between successive columns. Set its [**StrokeSize**](../Styles/Line#strokesize) to 0 to suppress the vertical lines.

### Visible
{: .no_toc }

Whether the control is currently displayed. **Boolean**. Inherited. Default: **True**.

### Width
{: .no_toc }

The control's width in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

## Methods

### Repaint
{: .no_toc }

Asks the framework to redraw the grid. Equivalent to calling [**CustomControlContext.Repaint**](../Framework/CustomControlContext#repaint) on the control's stored context; exposed as a public method on the grid so an external observer (e.g. the form, after updating the data behind the grid) can trigger a redraw without accessing the framework directly.

Syntax: *object*.**Repaint**

## Events

### GetCellText
{: .no_toc }

Raised once per visible cell as the grid paints, asking the host for the text to display. The default text is `<column-caption><row-index+1>` --- replace *Value* in the handler to show real data.

Syntax: *object*\_**GetCellText**( **ByVal** *X* **As Long**, **ByVal** *Y* **As Long**, **ByRef** *Value* **As String** )

*X*
: The column index of the cell being painted.

*Y*
: The row index of the cell being painted.

*Value*
: A pre-populated default value; assign to it to override what is displayed.
