---
title: LvwListSubItem
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwListSubItem
has_toc: false
---

# LvwListSubItem class
{: .no_toc }

One subitem of an item of a [**ListView**](.): the text of one column of the report view, with its key, its icon, its color and its tool tip. A program gets one from the item's [**LvwListSubItems**](LvwListSubItems) collection and its [**Add**](LvwListSubItems#add) method.

```tb check_build check_run arch=win32,win64
Dim Item As LvwListItem, Size As LvwListSubItem
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Size"
    Set Item = .ListItems.Add(, , "readme")
    Set Size = Item.ListSubItems.Add(, "size", "2 KB")
    Size.Bold = True
    Size.ForeColor = vbRed
    Debug.Print Size.Index; Size.Key; " "; Size.Text; " "; Item.SubItems(1)
End With
' Output:
'  1 size 2 KB 2 KB
```

A program cannot make an **LvwListSubItem** object with **New**. The object stands for a number of the item's subitems: after a subitem in front of it is added or removed, it works on the subitem that now has that number.

* TOC
{:toc}

Properties
----------

### Bold
{: .no_toc }

Whether the subitem's text is drawn in bold. **Boolean**. Default: **False**.

### ForeColor
{: .no_toc }

The color of the subitem's text. **OLE_COLOR**. A new subitem has the [**ForeColor**](Appearance#forecolor) of the control, and follows it until the program gives it a color of its own; [**ResetForeColors**](Items#resetforecolors) takes that color away again.

### Height, Left, Top, Width
{: .no_toc }

The place and the size of the subitem's cell in the report view, in the scale units of the control's container. **Single**, read-only.

<!-- test: ListViewItemsTests.ListSubItem_Width_Assigned_Raises383 -->
An assignment raises run-time error 383.
<!-- /test -->

### Index
{: .no_toc }

The number of the subitem, from 1. **Long**, read-only.

### Key
{: .no_toc }

The subitem's key, given by [**Add**](LvwListSubItems#add). **String**, read-only. Empty for a subitem without a key.

### ReportIcon
{: .no_toc }

The number or the key of the icon drawn in front of the subitem's text, in the image list of [**SmallIcons**](Views#smallicons). **Variant**. **Empty** when the subitem has none. An assignment takes a number or a key; a key that the image list does not have raises run-time error 35601.

### ReportIconIndex
{: .no_toc }

The number of the subitem's icon in the image list, also when [**ReportIcon**](#reporticon) names it by its key. **Long**, read-only. 0 when the subitem has none.

### Tag
{: .no_toc }

A value of the program's own, which the control does not use. **Variant**: it holds a value of any type, an object included, which is assigned with **Set**. A new subitem has an empty string.

### Text
{: .no_toc }

The subitem's text. **String**. It is the default member. It returns the whole text, however long; see the warning under the item's [**SubItems**](LvwListItem#subitems).

### ToolTipText
{: .no_toc }

The text shown in a tip while the pointer rests on the subitem in the report view and [**ShowInfoTips**](Items#showinfotips) is **True**. **String**. Default: empty.

## See Also

- [LvwListSubItems](LvwListSubItems) class -- the subitems of an item
- [LvwListItem](LvwListItem) class -- the item
