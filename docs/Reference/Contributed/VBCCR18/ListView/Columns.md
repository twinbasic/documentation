---
title: Columns
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/Columns
has_toc: false
symbols:
  - LvwColumnHeaderAlignmentConstants
  - LvwColumnHeaderSortArrowConstants
  - LvwColumnHeaderAutoSizeConstants
  - LvwColumnHeaderFilterTypeConstants
---

# Columns
{: .no_toc }

Sets up the columns of a [**ListView**](.) in the report view, and the header above them, which the user clicks, resizes, moves and filters by.

```tb check_build
Private Sub Form_Load()
    With ListView1
        .View = LvwViewReport
        .ColumnHeaders.Add , "name", "Name", 2400
        .ColumnHeaders.Add , "size", "Size", 1000, LvwColumnHeaderAlignmentRight
        .ColumnHeaders.Add , "type", "Type"
        .AllowColumnReorder = True
        .FullRowSelect = True
        .GridLines = True
    End With
End Sub

Private Sub ListView1_ColumnClick(ByVal ColumnHeader As LvwColumnHeader)
    Debug.Print "Sort by "; ColumnHeader.Text
End Sub
```

* TOC
{:toc}

## Columns and the header

[**ColumnHeaders**](#columnheaders) returns the columns as an [**LvwColumnHeaders**](LvwColumnHeaders) collection, and its [**Add**](LvwColumnHeaders#add) method adds one, with its text, its width and the alignment of its texts. Each column is an [**LvwColumnHeader**](LvwColumnHeader). The first column shows the items' own texts and the others their [subitems](Items#subitems), one column for each subitem number. The columns are shown in the report view; in the tile view an item shows some of its subitems, named by the column numbers in its [**TileViewIndices**](LvwListItem#tileviewindices).

The header is a window of its own, [**hWndHeader**](#hwndheader), above the items. [**HideColumnHeaders**](#hidecolumnheaders) hides it, and [**GetHeaderHeight**](#getheaderheight) returns its height. Its own pointer is [**HeaderMousePointer**](#headermousepointer).

## What the user does with the header

| The user | Allowed by | Events |
|---|---|---|
| clicks a column's header | [**ClickableColumnHeaders**](#clickablecolumnheaders) | [**ColumnClick**](#columnclick), [**ColumnDblClick**](#columndblclick) |
| drags the divider between two headers to resize a column | [**ResizableColumnHeaders**](#resizablecolumnheaders) and the column's [**Resizable**](LvwColumnHeader#resizable) | [**ColumnBeforeResize**](#columnbeforeresize), [**ColumnAfterResize**](#columnafterresize) |
| double-clicks a divider, which sizes the column to its contents | the same | [**ColumnDividerDblClick**](#columndividerdblclick) |
| drags a header to another place | [**AllowColumnReorder**](#allowcolumnreorder) | [**ColumnBeforeDrag**](#columnbeforedrag), [**ColumnAfterDrag**](#columnafterdrag) |
| clicks the arrow of a split button | the column's [**SplitButton**](LvwColumnHeader#splitbutton) | [**ColumnDropDown**](#columndropdown) |
| checks a column's check box | [**AllowColumnCheckboxes**](#allowcolumncheckboxes) and the column's [**CheckBox**](LvwColumnHeader#checkbox) | [**ColumnCheck**](#columncheck) |
| clicks the chevron at the right of a header too wide for the control | [**UseColumnChevron**](#usecolumnchevron) | [**ColumnChevronPushed**](#columnchevronpushed) |
| types a filter under a header | [**UseColumnFilterBar**](#usecolumnfilterbar) | [**BeforeFilterEdit**](#beforefilteredit), [**ColumnFilterChanged**](#columnfilterchanged), [**AfterFilterEdit**](#afterfilteredit), [**ColumnFilterButtonClick**](#columnfilterbuttonclick) |

The split buttons, the check boxes and the chevron are there when the program has visual styles.

## The order of the columns

<!-- test: ListViewColumnsTests.ColumnOrder_IsTheIndexesInPositionOrder -->
A column has a number, its [**Index**](LvwColumnHeader#index), and a place among the others, its [**Position**](LvwColumnHeader#position), from 1. They are the same until the user drags a header to another place, or the program sets a **Position**. [**ColumnOrder**](#columnorder) holds the order as an array that counts from 0: its first element is the number, less 1, of the column at the first place.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Order As Variant
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , "n", "Name"
    .ColumnHeaders.Add , "s", "Size"
    .ColumnHeaders.Add , "t", "Type"
    .ColumnHeaders("t").Position = 1
    Order = .ColumnOrder
    Debug.Print Order(0); Order(1); Order(2)
    Debug.Print .ColumnHeaders.ItemFromPosition(1).Text
    .ColumnOrder = Empty                    ' back to the order of the numbers
    Debug.Print .ColumnHeaders("t").Position
End With
' Output:
'  2  0  1
' Type
'  3
```

## Check boxes in the header

```tb hidden
Class ColumnWatcher
    Public WithEvents LV As VBCCR18.ListView
    Private Sub LV_ColumnCheck(ByVal ColumnHeader As LvwColumnHeader) Handles LV.ColumnCheck
        Debug.Print "ColumnCheck " & ColumnHeader.Text & " " & ColumnHeader.Checked
    End Sub
End Class
```

<!-- test: ListViewColumnsTests.Checked_WithCheckBox_RaisesColumnCheck, ListViewColumnsTests.Checked_WithoutCheckBox_StaysFalse -->
With [**AllowColumnCheckboxes**](#allowcolumncheckboxes) **True**, a column whose [**CheckBox**](LvwColumnHeader#checkbox) is **True** shows a check box in its header, such as one that checks every item. The user's click and an assignment to the column's [**Checked**](LvwColumnHeader#checked) both change it and raise [**ColumnCheck**](#columncheck). A column without a check box stays unchecked.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Watch As New ColumnWatcher
Set Watch.LV = ListView1
With ListView1
    .View = LvwViewReport
    .AllowColumnCheckboxes = True
    .ColumnHeaders.Add , , "All"
    .ColumnHeaders(1).Checked = True        ' no check box yet: nothing happens
    .ColumnHeaders(1).CheckBox = True
    .ColumnHeaders(1).Checked = True
End With
' Output:
' ColumnCheck All True
```

**ColumnWatcher** in this sample is a class of the program's own that holds the control **WithEvents** and prints the event.

Properties
----------

### AllowColumnCheckboxes
{: .no_toc }

Whether the header shows the check boxes of the columns whose [**CheckBox**](LvwColumnHeader#checkbox) is **True**. **Boolean**. Default: **False**. It has an effect when the program has visual styles.

### AllowColumnReorder
{: .no_toc }

Whether the user can drag a column's header to another place. **Boolean**. Default: **False**.

### ClickableColumnHeaders
{: .no_toc }

Whether the headers act as buttons that the user clicks. **Boolean**. Default: **True**.

### ColumnFilterChangedTimeout
{: .no_toc }

How long after the user changes a filter [**ColumnFilterChanged**](#columnfilterchanged) is raised, in milliseconds. **Long**. A new header has 1000. -1 raises the event only when the user ends the filter's editing. It reads 0 while the control has no header, before it has been in the report view.

<!-- test: ListViewColumnsTests.ColumnFilterChangedTimeout_Zero_Raises380 -->
0, and a value less than -1, raise run-time error 380.
<!-- /test -->

### ColumnHeaderIcons
{: .no_toc }

The image list of the icons of the column headers. **Variant**: an [**ImageList**](../ImageList/) control, its name or the handle of an image list, as for [**Icons**](Views#icons). Default: none. A column names its icon by its [**Icon**](LvwColumnHeader#icon).

### ColumnHeaders
{: .no_toc }

The columns of the control, as an [**LvwColumnHeaders**](LvwColumnHeaders) collection. Read-only.

### ColumnOrder
{: .no_toc }

The order of the columns from left to right. **Variant**: an array of **Long**, from 0, with one element for each column: the column's number less 1. See [The order of the columns](#the-order-of-the-columns).

An assignment takes such an array of numbers less 1, or of the columns' keys as strings. **Empty**, or an array with no elements, puts the columns in the order of their numbers.

<!-- test: ListViewColumnsTests.ColumnOrder_NumberOutOfRange_Raises381 -->
A number that is no column's raises run-time error 381. A value that is no array and not **Empty** raises run-time error 380, and an array of more than one dimension raises run-time error 5.
<!-- /test -->

### GridLines
{: .no_toc }

Whether lines are drawn between the rows and the columns of the report view. **Boolean**. Default: **False**.

### HeaderMouseIcon
{: .no_toc }

The pointer shown over the header when [**HeaderMousePointer**](#headermousepointer) is **CCMousePointerCustom**. A picture that holds an icon or a cursor; a picture of another kind raises run-time error 380.

### HeaderMousePointer
{: .no_toc }

The pointer shown while the mouse is over the header. A member of [**CCMousePointerConstants**](../Common#ccmousepointerconstants). Default: **CCMousePointerDefault**. Another value raises run-time error 380. Over the divider of a column that the user cannot resize, the header shows this pointer, or the arrow, in place of the pointer for resizing.

### HideColumnHeaders
{: .no_toc }

Whether the header is hidden in the report view. **Boolean**. Default: **False**.

### HighlightColumnHeaders
{: .no_toc }

Whether a header is highlighted while the pointer is over it. **Boolean**. Default: **False**. With visual styles Windows highlights the headers in its own way.

### hWndHeader
{: .no_toc }

The handle of the header's window. **LongPtr**, read-only. 0 until the control has been in the report view.

### hWndHeaderToolTip
{: .no_toc }

The handle of the window that shows the tool tips of the headers. **LongPtr**, read-only. 0 while [**ShowColumnTips**](#showcolumntips) is **False**.

### ResizableColumnHeaders
{: .no_toc }

Whether the user can resize the columns, by dragging or double-clicking a divider, or with Ctrl and the plus key of the keypad. **Boolean**. Default: **True**. A single column can be fixed by its [**Resizable**](LvwColumnHeader#resizable).

### SelectedColumn
{: .no_toc }

The column whose texts are drawn on a shaded background, as the column a list is sorted by often is. An [**LvwColumnHeader**](LvwColumnHeader), or **Nothing**. Setting it to **Nothing** shades no column. While the background [**Picture**](Appearance#picture) is tiled, an assignment of a column does nothing.

### ShowColumnTips
{: .no_toc }

Whether a header shows its column's [**ToolTipText**](LvwColumnHeader#tooltiptext) while the pointer rests on it, and the [**ToolTipTextFilterBtn**](LvwColumnHeader#tooltiptextfilterbtn) and [**ToolTipTextDropDown**](LvwColumnHeader#tooltiptextdropdown) over its filter button and split button. **Boolean**. Default: **False**.

### TrackSizeColumnHeaders
{: .no_toc }

Whether the column is drawn at its new width while the user drags its divider. **Boolean**. Default: **True**. With **False** a line shows where the divider is until the user lets go.

### UseColumnChevron
{: .no_toc }

Whether the header shows a chevron button when the columns are wider than the control, which raises [**ColumnChevronPushed**](#columnchevronpushed). **Boolean**. Default: **False**. It has an effect when the program has visual styles.

### UseColumnFilterBar
{: .no_toc }

Whether the header has a row of filter boxes under the column titles, in which the user types a value to filter by. **Boolean**. Default: **False**. The control does not filter the items itself: the program reads the columns' [**FilterValue**](LvwColumnHeader#filtervalue) in [**ColumnFilterChanged**](#columnfilterchanged) and shows the items that match.

Methods
-------

### GetHeaderHeight
{: .no_toc }

Returns the height of the header, in the scale units of the control's container. **Single**. 0 while the control has no header.

Syntax: *object*.**GetHeaderHeight**( ) **As Single**

Events
------

### AfterFilterEdit
{: .no_toc }

Raised when the user stops editing a column's filter.

Syntax: *object*\_**AfterFilterEdit**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

### BeforeFilterEdit
{: .no_toc }

Raised when the user starts to edit a column's filter.

Syntax: *object*\_**BeforeFilterEdit**( **ByVal** *ColumnHeader* **As LvwColumnHeader**, **ByVal** *hWndFilterEdit* **As LongPtr** )

*hWndFilterEdit*
: The handle of the edit box in which the user types.

### ColumnAfterDrag
{: .no_toc }

Raised when the user drops a header that was dragged to another place.

Syntax: *object*\_**ColumnAfterDrag**( **ByVal** *ColumnHeader* **As LvwColumnHeader**, **ByVal** *NewPosition* **As Long**, *Cancel* **As Boolean** )

*NewPosition*
: The [**Position**](LvwColumnHeader#position) the column will have, from 1.

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the column at its place.

### ColumnAfterResize
{: .no_toc }

Raised when the user has dragged a divider to resize a column.

Syntax: *object*\_**ColumnAfterResize**( **ByVal** *ColumnHeader* **As LvwColumnHeader**, *NewWidth* **As Single** )

*NewWidth*
: The width the user gave the column, in the scale units of the control's container. A handler that changes it gives the column that width instead; 0 or less makes the column 0 wide.

### ColumnBeforeDrag
{: .no_toc }

Raised when the user starts to drag a header to another place, while [**AllowColumnReorder**](#allowcolumnreorder) is **True**.

Syntax: *object*\_**ColumnBeforeDrag**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

### ColumnBeforeResize
{: .no_toc }

Raised when the user starts to drag a divider to resize a column that can be resized.

Syntax: *object*\_**ColumnBeforeResize**( **ByVal** *ColumnHeader* **As LvwColumnHeader**, *Cancel* **As Boolean** )

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the width.

### ColumnCheck
{: .no_toc }

Raised when the check box of a column's header changes, by the user or by an assignment to its [**Checked**](LvwColumnHeader#checked).

Syntax: *object*\_**ColumnCheck**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

### ColumnChevronPushed
{: .no_toc }

Raised when the user clicks the chevron button of the header, while [**UseColumnChevron**](#usecolumnchevron) is **True**. The program shows a menu of the columns that do not fit.

Syntax: *object*\_**ColumnChevronPushed**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

*ColumnHeader*
: The column that Windows names with the click.

### ColumnClick
{: .no_toc }

Raised when the user clicks a column's header. A program sorts by that column here; see [Sorting and Searching](SortingAndSearching#sorting-by-a-click-on-a-column).

Syntax: *object*\_**ColumnClick**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

### ColumnDblClick
{: .no_toc }

Raised when the user double-clicks a column's header.

Syntax: *object*\_**ColumnDblClick**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

### ColumnDividerDblClick
{: .no_toc }

Raised when the user double-clicks the divider at the right of a column that can be resized, which makes the column as wide as its widest text.

Syntax: *object*\_**ColumnDividerDblClick**( **ByVal** *ColumnHeader* **As LvwColumnHeader**, *Cancel* **As Boolean** )

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the width.

### ColumnDropDown
{: .no_toc }

Raised when the user clicks the arrow of a column's split button. The program shows a menu under it.

Syntax: *object*\_**ColumnDropDown**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

### ColumnFilterButtonClick
{: .no_toc }

Raised when the user clicks the filter button at the right of a column's filter box.

Syntax: *object*\_**ColumnFilterButtonClick**( **ByVal** *ColumnHeader* **As LvwColumnHeader**, *RaiseFilterChanged* **As Boolean**, **ByVal** *ButtonLeft* **As Long**, **ByVal** *ButtonTop* **As Long**, **ByVal** *ButtonRight* **As Long**, **ByVal** *ButtonBottom* **As Long** )

*RaiseFilterChanged*
: **False** when the event is raised. A handler that changed the filter, from a menu of its own, sets it to **True** to have [**ColumnFilterChanged**](#columnfilterchanged) raised.

*ButtonLeft*, *ButtonTop*, *ButtonRight*, *ButtonBottom*
: The edges of the button, in pixels of the header's window, for placing a menu under it.

### ColumnFilterChanged
{: .no_toc }

Raised when the filter of a column has changed, [**ColumnFilterChangedTimeout**](#columnfilterchangedtimeout) after the user's last key.

Syntax: *object*\_**ColumnFilterChanged**( **ByVal** *ColumnHeader* **As LvwColumnHeader** )

## LvwColumnHeaderAlignmentConstants
{: #lvwcolumnheaderalignmentconstants }

The values of a column's [**Alignment**](LvwColumnHeader#alignment).

| Member | Value | Description |
|---|---|---|
| **LvwColumnHeaderAlignmentLeft**{: #LvwColumnHeaderAlignmentConstants_LvwColumnHeaderAlignmentLeft } | 0 | The texts are at the left. |
| **LvwColumnHeaderAlignmentRight**{: #LvwColumnHeaderAlignmentConstants_LvwColumnHeaderAlignmentRight } | 1 | The texts are at the right, as numbers often are. |
| **LvwColumnHeaderAlignmentCenter**{: #LvwColumnHeaderAlignmentConstants_LvwColumnHeaderAlignmentCenter } | 2 | The texts are centered. |

## LvwColumnHeaderSortArrowConstants
{: #lvwcolumnheadersortarrowconstants }

The values of a column's [**SortArrow**](LvwColumnHeader#sortarrow).

| Member | Value | Description |
|---|---|---|
| **LvwColumnHeaderSortArrowNone**{: #LvwColumnHeaderSortArrowConstants_LvwColumnHeaderSortArrowNone } | 0 | No arrow. |
| **LvwColumnHeaderSortArrowDown**{: #LvwColumnHeaderSortArrowConstants_LvwColumnHeaderSortArrowDown } | 1 | An arrow that points down, for a descending order. |
| **LvwColumnHeaderSortArrowUp**{: #LvwColumnHeaderSortArrowConstants_LvwColumnHeaderSortArrowUp } | 2 | An arrow that points up, for an ascending order. |

## LvwColumnHeaderAutoSizeConstants
{: #lvwcolumnheaderautosizeconstants }

The values of the argument of a column's [**AutoSize**](LvwColumnHeader#autosize).

| Member | Value | Description |
|---|---|---|
| **LvwColumnHeaderAutoSizeToItems**{: #LvwColumnHeaderAutoSizeConstants_LvwColumnHeaderAutoSizeToItems } | 0 | As wide as the widest text of the column's items. |
| **LvwColumnHeaderAutoSizeToHeader**{: #LvwColumnHeaderAutoSizeConstants_LvwColumnHeaderAutoSizeToHeader } | 1 | As wide as the widest text of the items and of the header together; the last column fills the rest of the control. |

## LvwColumnHeaderFilterTypeConstants
{: #lvwcolumnheaderfiltertypeconstants }

The values of a column's [**FilterType**](LvwColumnHeader#filtertype).

| Member | Value | Description |
|---|---|---|
| **LvwColumnHeaderFilterTypeText**{: #LvwColumnHeaderFilterTypeConstants_LvwColumnHeaderFilterTypeText } | 0 | The filter is a text. |
| **LvwColumnHeaderFilterTypeNumber**{: #LvwColumnHeaderFilterTypeConstants_LvwColumnHeaderFilterTypeNumber } | 1 | The filter is a whole number. |

## See Also

- [ListView](.) control
- [LvwColumnHeaders](LvwColumnHeaders) class -- the collection of the columns
- [LvwColumnHeader](LvwColumnHeader) class -- one column
