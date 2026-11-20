---
title: LvwListItem
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwListItem
has_toc: false
---

# LvwListItem class
{: .no_toc }

One item of a [**ListView**](.): its text, its icons, its subitems, its state and its place. A program gets one from the [**LvwListItems**](LvwListItems) collection and its [**Add**](LvwListItems#add) method, and from the control's properties and events that name an item.

```tb check_build check_run arch=win32,win64
Dim Item As LvwListItem
Set Item = ListView1.ListItems.Add(, "k", "one")
Item.Tag = "first"
Debug.Print Item.Index; Item.Key; " "; Item.Text; " "; Item.Tag
Item.Key = "kk"
Debug.Print ListView1.ListItems("kk").Text; ListView1.ListItems.Exists("k")
' Output:
'  1 k one first
' oneFalse
```

A program cannot make an **LvwListItem** object with **New**. An object kept in a variable after its item is removed still has its **Text**, **Key** and **Tag**; its [**Index**](#index) is then 0, and the members that work on the item in the control do nothing. In [virtual mode](VirtualMode) an item knows only its number, and most of its members raise run-time error 91; [What virtual mode changes](VirtualMode#what-virtual-mode-changes) lists the others.

* TOC
{:toc}

Properties
----------

### Bold
{: .no_toc }

Whether the item's text is drawn in bold. **Boolean**. Default: **False**.

### Checked
{: .no_toc }

Whether the item's check box is checked. **Boolean**. Default: **False**. A change raises [**ItemCheck**](Selection#itemcheck). The check box shows while [**Checkboxes**](Selection#checkboxes) is **True**.

### ForeColor
{: .no_toc }

The color of the item's text. **OLE_COLOR**.

<!-- test: ListViewItemsTests.ForeColor_New_IsTheControlsForeColor -->
A new item has the [**ForeColor**](Appearance#forecolor) of the control, and follows it until the program gives the item a color of its own. [**ResetForeColors**](Items#resetforecolors) takes that color away again.
<!-- /test -->

### Ghosted
{: .no_toc }

Whether the item is drawn dimmed, as a file cut to the clipboard is. **Boolean**. Default: **False**. See [**GhostedIndices**](Selection#ghostedindices).

### Group
{: .no_toc }

The group the item is in. An [**LvwGroup**](LvwGroup), or **Nothing** (the default). Assigned with **Set**; **Nothing** takes the item out of its group. See [Groups](Groups), and its warning about a 64-bit program.

### Height, Width
{: .no_toc }

The height and the width of the item's icon and text together, in the scale units of the control's container. **Single**, read-only.

<!-- test: ListViewItemsTests.Width_Assigned_Raises383 -->
An assignment raises run-time error 383.
<!-- /test -->

### Hot
{: .no_toc }

Whether the item is the [**HotItem**](Selection#hotitem). **Boolean**. Setting it to **True** makes it the hot item, and **False** makes no item hot if it was.

### Icon
{: .no_toc }

The number or the key of the item's large icon in the image list of [**Icons**](Views#icons). **Variant**. 0 when the item has none. An assignment takes a number or a key, as [**Add**](LvwListItems#add) does, and raises the same errors.

### IconIndex
{: .no_toc }

The number of the item's large icon in the image list, also when [**Icon**](#icon) names it by its key. **Long**, read-only.

### Indentation
{: .no_toc }

How far the item is moved to the right in the report view, in widths of a small icon. **Long**. Default: 0.

### Index
{: .no_toc }

The number of the item, its place in the control, from 1. **Long**, read-only. It changes when items are added or removed in front of it, and when the items are sorted. 0 after the item is removed.

### Key
{: .no_toc }

The item's key in the [**LvwListItems**](LvwListItems) collection. **String**. Empty for an item without a key.

<!-- test: ListViewItemsTests.Key_OfAnotherItem_Raises457 -->
An assignment gives the item another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another item has raises run-time error 457, and the item keeps its key.
<!-- /test -->

### Left, Top
{: .no_toc }

The place of the item's icon in the control, in the scale units of the control's container. **Single**. An assignment moves the item, in the icon, small icon and tile views.

### ListSubItems
{: .no_toc }

The item's subitems, as an [**LvwListSubItems**](LvwListSubItems) collection. Read-only. See [Subitems](Items#subitems).

### Selected
{: .no_toc }

Whether the item is selected. **Boolean**. Setting it to **True** also gives the item the focus. A change raises [**ItemSelect**](Selection#itemselect). See [Selected and focused items](Selection#selected-and-focused-items).

### SmallIcon
{: .no_toc }

The number or the key of the item's small icon in the image list of [**SmallIcons**](Views#smallicons). **Variant**. 0 when the item has none. An assignment takes a number or a key, as [**Add**](LvwListItems#add) does.

### SmallIconIndex
{: .no_toc }

The number of the item's small icon in the image list, also when [**SmallIcon**](#smallicon) names it by its key. **Long**, read-only.

### SubItems
{: .no_toc }

The text of one of the item's subitems.

Syntax: *object*.**SubItems**( *Index* ) [ = *value* ]

*Index*
: *required* An **Integer**: the number of the subitem, from 1 to the number of columns less 1. Another number raises run-time error 380.

*value*
: A **String**. Assigning a number that the item has no subitem for yet adds the subitems up to it, with empty texts in between. See [Subitems](Items#subitems).

<!-- test: ListViewItemsTests.SubItems_LongText_IsReturnedWhole -->
> [!WARNING] 1.8.141.0
> **SubItems** returns at most the first 259 characters of a subitem's text. The text is kept whole: the subitem's [**Text**](LvwListSubItem#text) in [**ListSubItems**](#listsubitems) returns all of it, and the control shows as much as fits.

### Tag
{: .no_toc }

A value of the program's own, which the control does not use. **Variant**: it holds a value of any type, an object included, which is assigned with **Set**.

<!-- test: ListViewItemsTests.Tag_NewItem_IsAnEmptyString -->
A new item has an empty string.
<!-- /test -->

### Text
{: .no_toc }

The item's text. **String**. It is the default member.

### TileViewIndices
{: .no_toc }

The subitems the item shows under its text in the tile view, as an array of their numbers. **Variant**: an array of **Long**, from 0, or **Empty** when the item shows none. An assignment takes an array of up to 20 numbers, or **Empty**; the control shows as many of them as [**TileViewLines**](Views#tileviewlines) allows.

<!-- test: ListViewItemsTests.TileViewIndices_ZeroIndex_Raises381 -->
A number less than 1 raises run-time error 381. A value that is no array and not **Empty** raises run-time error 380.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Item As LvwListItem, Shown As Variant
With ListView1
    .View = LvwViewTile
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Size"
    .ColumnHeaders.Add , , "Type"
    Set Item = .ListItems.Add(, , "readme")
    Item.SubItems(1) = "2 KB"
    Item.SubItems(2) = "Text"
    Item.TileViewIndices = Array(2, 1)       ' the type, then the size
    Shown = Item.TileViewIndices
    Debug.Print Shown(0); Shown(1)
End With
' Output:
'  2  1
```

### ToolTipText
{: .no_toc }

The text shown in a tip while the pointer rests on the item and [**ShowInfoTips**](Items#showinfotips) is **True**. **String**. Default: empty.

### Visible
{: .no_toc }

Whether the item is in the part of the control that can be seen. **Boolean**, read-only.

### WorkArea
{: .no_toc }

The work area the item is in, in the icon, small icon and tile views. An [**LvwWorkArea**](LvwWorkArea), read-only, or **Nothing** when the control has no work areas. In another view reading it raises run-time error 394.

Methods
-------

### CreateDragImage
{: .no_toc }

Returns the handle of a new image list of Windows that holds a picture of the item, for drawing it under the pointer during a drag of the program's own. The image list is the program's: it destroys it with the **ImageList_Destroy** function of Windows when it is done. **LongPtr**.

Syntax: *object*.**CreateDragImage**( [ *X* ] [, *Y* ] ) **As LongPtr**

*X*, *Y*
: *optional* **Single** variables that receive the place of the picture's top left corner, in the scale units of the control's container.

### EnsureVisible
{: .no_toc }

Scrolls the control so that the item can be seen.

Syntax: *object*.**EnsureVisible**

## See Also

- [ListView](.) control
- [LvwListItems](LvwListItems) class -- the collection of the items
- [LvwListSubItems](LvwListSubItems) class -- the subitems of an item
