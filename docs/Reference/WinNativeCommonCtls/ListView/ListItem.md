---
title: ListItem
parent: ListView
grand_parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/ListView/ListItem
has_toc: false
---

# ListItem class
{: .no_toc }

A **ListItem** is a single row in a [**ListView**](.). Returned from [**ListItems.Add**](ListItems#add) and from [**ListItems.Item**](ListItems#item). In **lvwReport** view, the first column is the main label ([**Text**](#text)); subsequent columns are exposed through [**SubItems**](#subitemsindex)(*index*).

The class is tagged `[COMCreatable(False)]` — user code reaches **ListItem** instances through the parent [**ListView**](.)'s [**ListItems**](ListItems) collection, never by direct instantiation.

```tb
Dim item As ListItem = ListView1.ListItems.Add(, "doc1", "Report.docx", "doc")
item.SubItems(1) = "Word document"
item.SubItems(2) = "24 KB"
item.Bold = True
item.ForeColor = vbBlue
```

* TOC
{:toc}

Properties
----------

### BackColor
{: .no_toc }

The background color used to render this row. **OLE_COLOR**. Default: `-1` (transparent — defer to [**ListView.BackColor**](#backcolor)).

### Bold
{: .no_toc }

Whether the row is rendered in a bold font. **Boolean**. Default: **False**.

### Checked
{: .no_toc }

Whether the row's checkbox is checked. **Boolean**. Only meaningful when [**ListView.CheckBoxes**](.#checkboxes) is **True**.

### EnsureVisible
{: .no_toc }

Scrolls the listview so this row is visible. Available as a method (not a property — listed in the methods section below).

### ForeColor
{: .no_toc }

The text color used to render this row. **OLE_COLOR**. Default: **vbWindowText**.

### Ghosted
{: .no_toc }

Whether the row is rendered as ghosted / cut (typically half-transparent). **Boolean**. The visual mirrors the Win32 `LVIS_CUT` state.

### Height
{: .no_toc }

The pixel height of the row's selection rectangle. **Single**, read-only.

### Icon
{: .no_toc }

The large icon for the row in [**lvwIcon**](.#listviewconstants) view. **Variant** — either a 1-based **Long** index into [**ListView.Icons**](.#icons), or a **String** key. Assignment validates against the bound image list and raises run-time error 35601 (*"Element not found"*) for an unknown key, 35600 (*"Index out of bounds"*) for an out-of-range index, or 35613 (*"ImageList must be initialized before it can be used"*) if no image list is bound.

### Index
{: .no_toc }

The 1-based position of the row in the parent collection. **Long**, read-only. Attempting to assign raises run-time error 383.

### Key
{: .no_toc }

The string key the row was added under. **String**, read/write. Re-assignment moves the row inside the collection's internal index, preserving its position.

### Left
{: .no_toc }

The row's horizontal pixel position inside the listview. **Single**, read/write. Useful in [**lvwIcon**](.#listviewconstants) view for repositioning items.

### Selected
{: .no_toc }

Whether the row is selected. **Boolean**, read/write. Setting **Selected = True** also sets the focused state.

### SmallIcon
{: .no_toc }

The small icon for the row in non-icon views. **Variant** — either an index or a key into [**ListView.SmallIcons**](.#smallicons). Same validation as [**Icon**](#icon).

### SubItems(Index)
{: #subitemsindex .no_toc }

The sub-item text at the given 1-based column index in [**lvwReport**](.#listviewconstants) view. **String**, read/write. The main text is accessed through [**Text**](#text); **SubItems**(1) is the second column, **SubItems**(2) is the third, and so on. Index `0` is rejected with run-time error 380.

Syntax: *object*.**SubItems**( *Index* ) [ **=** *value* ]

### Tag
{: .no_toc }

Arbitrary data the application can attach to the row. **Variant**.

### Text
{: .no_toc }

The row's main label text. **String**, read/write. The default member. Maps to the listview item's column-0 text.

### ToolTipText
{: .no_toc }

A tooltip string shown when the user hovers over this row. **String**. Surfaced through the listview's `LVS_EX_INFOTIP` extended style.

### Top
{: .no_toc }

The row's vertical pixel position inside the listview. **Single**, read/write.

### Width
{: .no_toc }

The pixel width of the row's selection rectangle. **Single**, read-only.

Methods
-------

### CreateDragImage
{: .no_toc }

> [!NOTE]
> **CreateDragImage** is tagged `[Unimplemented]` in the current source. Calling it has no useful effect — the body is empty.

### EnsureVisible
{: .no_toc }

Scrolls the listview so this row is visible.

Syntax: *object*.**EnsureVisible**

## See Also

- [ListView](.) -- the parent control
- [ListItems](ListItems) -- the collection holding **ListItem** instances
- [ColumnHeader](ColumnHeader) -- a column header (defines what [**SubItems**](#subitemsindex) align to)
