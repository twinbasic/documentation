---
title: ColumnHeader
parent: ListView
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ListView/ColumnHeader
has_toc: false
---

# ColumnHeader class
{: .no_toc }

A **ColumnHeader** represents a single column in a [**ListView**](.) running in **lvwReport** view. Returned from [**ColumnHeaders.Add**](ColumnHeaders#add) and from [**ColumnHeaders.Item**](ColumnHeaders#item).

The class is tagged `[COMCreatable(False)]` — user code accesses **ColumnHeader** instances through the parent [**ListView**](.)'s [**ColumnHeaders**](ColumnHeaders) collection.

```tb
With ListView1.ColumnHeaders
    .Add , "name", "Name", 150
    .Add , "size", "Size",  80, lvwColumnRight
    .Add , "date", "Date", 100, lvwColumnCenter
End With
```

* TOC
{:toc}

Properties
----------

### Alignment
{: .no_toc }

The horizontal alignment of the column's text. A member of [**ListColumnAlignmentConstants**](#listcolumnalignmentconstants). Default: **lvwColumnLeft**.

> [!NOTE]
> The first column in a ListView must be left-aligned. Attempting to add a non-left-aligned column at position 1 raises run-time error 5.

### Icon
{: .no_toc }

The icon rendered in the header. **Variant** — either a 1-based **Long** index into [**ListView.ColumnHeaderIcons**](.#columnheadericons), or a **String** key. Assignment validates against the bound image list.

### Index
{: .no_toc }

The 1-based position of the column in the parent collection. **Long**, read-only. Attempting to assign raises run-time error 383.

### Key
{: .no_toc }

The string key the column was added under. **String**, read/write.

### Left
{: .no_toc }

The column's horizontal pixel position in the listview, computed as the sum of preceding columns' widths. **Single**, read-only.

### Position
{: .no_toc }

The column's visual position. **Long**, read/write. Distinct from [**Index**](#index) — when [**ListView.AllowColumnReorder**](.#allowcolumnreorder) is **True**, the user can drag columns to reorder them, in which case **Index** stays fixed but **Position** changes.

Assigning a value outside `1..Count` raises run-time error 380.

### SubItemIndex
{: .no_toc }

The 0-based sub-item index this column displays. **Long**, read-only. Maps the column to a [**ListItem.SubItems**](ListItem#subitemsindex)(*index*) value. Returns `0` for the first column (which shows [**ListItem.Text**](ListItem#text)).

### Tag
{: .no_toc }

Arbitrary data the application can attach to the column. **Variant**.

### Text
{: .no_toc }

The column header text. **String**, read/write. The default member.

### Width
{: .no_toc }

The column's pixel width. **Single**, read/write.

## ListColumnAlignmentConstants
{: #listcolumnalignmentconstants }

Determines the horizontal alignment of a column's text. Declared on the **ColumnHeader** class.

| Member                    | Value | Description       |
|---------------------------|-------|-------------------|
| **lvwColumnLeft**{: #ListColumnAlignmentConstants_lvwColumnLeft }     | 0 | Left-aligned text.   |
| **lvwColumnRight**{: #ListColumnAlignmentConstants_lvwColumnRight }   | 1 | Right-aligned text.  |
| **lvwColumnCenter**{: #ListColumnAlignmentConstants_lvwColumnCenter } | 2 | Centered text.       |

## See Also

- [ListView](.) -- the parent control
- [ColumnHeaders](ColumnHeaders) -- the collection holding **ColumnHeader** instances
- [ListItem](ListItem) -- a row, whose [**SubItems**](ListItem#subitemsindex) align with columns
