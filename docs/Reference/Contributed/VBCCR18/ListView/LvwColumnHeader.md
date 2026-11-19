---
title: LvwColumnHeader
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwColumnHeader
has_toc: false
---

# LvwColumnHeader class
{: .no_toc }

One column of a [**ListView**](.) and its header: its text, its width, the alignment of its texts, its place, and the sort arrow, check box, split button and filter of its header. A program gets one from the [**LvwColumnHeaders**](LvwColumnHeaders) collection and its [**Add**](LvwColumnHeaders#add) method, and from the control's events that name a column.

```tb check_build check_run arch=win32,win64
Dim Size As LvwColumnHeader
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , "name", "Name"
    Set Size = .ColumnHeaders.Add(, "size", "Size")
    Size.Alignment = LvwColumnHeaderAlignmentRight
    Size.SortArrow = LvwColumnHeaderSortArrowUp
    Debug.Print Size.Index; Size.Position; Size.SubItemIndex; Size.Text
End With
' Output:
'  2  2  1 Size
```

A program cannot make an **LvwColumnHeader** object with **New**.

* TOC
{:toc}

## Filters

While the control's [**UseColumnFilterBar**](Columns#usecolumnfilterbar) is **True**, each header has a box under its text in which the user types a filter, a text or a whole number by the column's [**FilterType**](#filtertype). [**FilterValue**](#filtervalue) reads and sets it, and is **Null** while the box is empty.

<!-- test: ListViewColumnsTests.FilterValue_NoValue_IsNull -->
```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewReport
    .UseColumnFilterBar = True
    .ColumnHeaders.Add , , "Size"
    .ColumnHeaders(1).FilterType = LvwColumnHeaderFilterTypeNumber
    Debug.Print IsNull(.ColumnHeaders(1).FilterValue)
    .ColumnHeaders(1).FilterValue = 42
    Debug.Print .ColumnHeaders(1).FilterValue
    .ColumnHeaders(1).ClearFilter
    Debug.Print IsNull(.ColumnHeaders(1).FilterValue)
End With
' Output:
' True
'  42
' True
```
<!-- /test -->

Properties
----------

### Alignment
{: .no_toc }

How the texts of the column are aligned. A member of [**LvwColumnHeaderAlignmentConstants**](Columns#lvwcolumnheaderalignmentconstants). Another value raises run-time error 380.

### Bold
{: .no_toc }

Whether the header's text is drawn in bold. **Boolean**. Default: **False**.

### CheckBox
{: .no_toc }

Whether the header shows a check box, while the control's [**AllowColumnCheckboxes**](Columns#allowcolumncheckboxes) is **True**. **Boolean**. Default: **False**. **False** also unchecks it. It has an effect when the program has visual styles.

### Checked
{: .no_toc }

Whether the header's check box is checked. **Boolean**. Default: **False**. A change raises [**ColumnCheck**](Columns#columncheck). A column whose [**CheckBox**](#checkbox) is **False** stays unchecked.

### FilterType
{: .no_toc }

Whether the column's filter is a text or a whole number. A member of [**LvwColumnHeaderFilterTypeConstants**](Columns#lvwcolumnheaderfiltertypeconstants). Default: **LvwColumnHeaderFilterTypeText**. Another value raises run-time error 380. A change empties the filter.

### FilterValue
{: .no_toc }

The column's filter. **Variant**: a **String** or a **Long** by [**FilterType**](#filtertype), or **Null** while the filter is empty. An assignment takes a string for a text filter, and a number for a number filter, rounded to a whole one; **Null** or **Empty** empties the filter.

<!-- test: ListViewColumnsTests.FilterValue_NumberForTextFilter_Raises13 -->
A value of another type raises run-time error 13.
<!-- /test -->

### ForeColor
{: .no_toc }

The color of the header's text. **OLE_COLOR**. Default: **vbButtonText**.

### Icon
{: .no_toc }

The number or the key of the header's icon in the image list of [**ColumnHeaderIcons**](Columns#columnheadericons). **Variant**. 0 when the header has none. An assignment takes a number or a key, as [**Add**](LvwColumnHeaders#add) does.

### IconIndex
{: .no_toc }

The number of the header's icon in the image list, also when [**Icon**](#icon) names it by its key. **Long**, read-only.

### IconOnRight
{: .no_toc }

Whether the header's icon is at the right of its text. **Boolean**. Default: **False**.

### Index
{: .no_toc }

The number of the column in the [**LvwColumnHeaders**](LvwColumnHeaders) collection, from 1. **Long**, read-only.

### Key
{: .no_toc }

The column's key in the [**LvwColumnHeaders**](LvwColumnHeaders) collection. **String**. An assignment gives the column another key; an empty string takes the key away, and a key that another column has raises run-time error 457.

### Left
{: .no_toc }

The distance from the left edge of the header to the left edge of this column's header, in the scale units of the control's container. **Single**, read-only: an assignment raises run-time error 383.

### Position
{: .no_toc }

The place of the column among the others, from the left, from 1. **Long**. An assignment moves the column there. See [The order of the columns](Columns#the-order-of-the-columns).

<!-- test: ListViewColumnsTests.Position_OutOfRange_Raises380 -->
A place less than 1 or greater than the number of columns raises run-time error 380.
<!-- /test -->

### Resizable
{: .no_toc }

Whether the user can change the column's width. **Boolean**. Default: **True**. The control's [**ResizableColumnHeaders**](Columns#resizablecolumnheaders) set to **False** fixes every column.

### SortArrow
{: .no_toc }

The sort arrow in the header. A member of [**LvwColumnHeaderSortArrowConstants**](Columns#lvwcolumnheadersortarrowconstants). Default: **LvwColumnHeaderSortArrowNone**. Another value raises run-time error 380. Setting it does not sort the items; see [Sorting by a click on a column](SortingAndSearching#sorting-by-a-click-on-a-column).

### SplitButton
{: .no_toc }

Whether the header is a split button, with an arrow at its right that raises [**ColumnDropDown**](Columns#columndropdown). **Boolean**. Default: **False**. It has an effect when the program has visual styles.

### Tag
{: .no_toc }

A value of the program's own, which the control does not use. **Variant**: it holds a value of any type, an object included, which is assigned with **Set**. A new column has an empty string.

### Text
{: .no_toc }

The header's text. **String**. It is the default member.

### ToolTipText
{: .no_toc }

The tip shown while the pointer rests on the header and the control's [**ShowColumnTips**](Columns#showcolumntips) is **True**. **String**. Default: empty.

### ToolTipTextDropDown
{: .no_toc }

The tip shown over the arrow of the header's split button. **String**. Default: empty.

### ToolTipTextFilterBtn
{: .no_toc }

The tip shown over the filter button of the header. **String**. Default: empty.

### Width
{: .no_toc }

The width of the column, in the scale units of the control's container. **Single**.

<!-- test: ListViewColumnsTests.Width_Negative_Raises380 -->
A negative width raises run-time error 380.
<!-- /test -->

Methods
-------

### AutoSize
{: .no_toc }

Makes the column as wide as its texts.

Syntax: *object*.**AutoSize** *Value*

*Value*
: *required* A member of [**LvwColumnHeaderAutoSizeConstants**](Columns#lvwcolumnheaderautosizeconstants): the widest text of the items, or of the items and the header. Another value raises run-time error 380.

### ClearFilter
{: .no_toc }

Empties the column's filter.

Syntax: *object*.**ClearFilter**

### EditFilter
{: .no_toc }

Gives the focus to the column's filter box, while the control's [**UseColumnFilterBar**](Columns#usecolumnfilterbar) is **True**, so that the user can type in it.

Syntax: *object*.**EditFilter**

### SubItemIndex
{: .no_toc }

Returns the number of the subitem the column shows: 0 for the items' own texts, in the first column, 1 for the second column, and so on. **Long**.

Syntax: *object*.**SubItemIndex**( ) **As Long**

## See Also

- [Columns](Columns) -- the header and its events
- [LvwColumnHeaders](LvwColumnHeaders) class -- the collection of the columns
