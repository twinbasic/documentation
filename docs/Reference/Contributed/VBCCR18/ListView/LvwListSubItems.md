---
title: LvwListSubItems
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwListSubItems
has_toc: false
---

# LvwListSubItems class
{: .no_toc }

The collection of the subitems of one item of a [**ListView**](.), which the item's [**ListSubItems**](LvwListItem#listsubitems) property returns. Its items are [**LvwListSubItem**](LvwListSubItem) objects, numbered from 1, and a subitem can have a key as well. Subitem 1 is shown in the second column of the report view, subitem 2 in the third, and so on; see [Subitems](Items#subitems).

```tb check_build check_run arch=win32,win64
Dim Item As LvwListItem
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Size"
    .ColumnHeaders.Add , , "Type"
    Set Item = .ListItems.Add(, , "readme")
    Item.ListSubItems.Add , "size", "2 KB"
    Item.ListSubItems.Add , "type", "Text", , "A text file"
    Debug.Print Item.ListSubItems.Count; Item.ListSubItems("TYPE").Index
    Debug.Print Item.SubItems(2); " "; Item.ListSubItems(2).ToolTipText
End With
' Output:
'  2  2
' Text A text file
```

A program goes through the subitems with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **LvwListSubItems** object with **New**. The collection holds subitems beyond the number of columns as well; they are not shown.

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of subitems of the item. **Long**, read-only.

### Item
{: .no_toc }

Returns one subitem. It is the default member, so `Item.ListSubItems("size")` is `Item.ListSubItems.Item("size")`.

Syntax: *object*.**Item**( *Index* ) **As LvwListSubItem**

*Index*
: *required* The number of the subitem, from 1 to [**Count**](#count), or its key as a **String**, in which capital and small letters are the same.

<!-- test: ListViewItemsTests.ListSubItems_Item_OutOfRange_Raises9 -->
A number outside that range, and a key that no subitem has, raise run-time error 9. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Adds a subitem and returns its [**LvwListSubItem**](LvwListSubItem).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Text* ] [, *ReportIcon* ] [, *ToolTipText* ] ) **As LvwListSubItem**

*Index*
: *optional* A **Long**: the number the new subitem gets. The subitems from that number on move up by one, and so move one column to the right. Without it, or with 0, the subitem goes after the last one.

*Key*
: *optional* A **String** by which the program can name the subitem.

*Text*
: *optional* A **String**: the subitem's text.

*ReportIcon*
: *optional* The number or the key of an icon in the image list of [**SmallIcons**](Views#smallicons), shown in front of the text.

*ToolTipText*
: *optional* A **String**: the subitem's [**ToolTipText**](LvwListSubItem#tooltiptext).

<!-- test: ListViewItemsTests.ListSubItems_Add_DuplicateKey_Raises457 -->
A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600. A *Key* that another subitem of the item has raises run-time error 457, and no subitem is added. A key for an icon that the image list does not have raises run-time error 35601.
<!-- /test -->

### Clear
{: .no_toc }

Removes every subitem of the item, which leaves its columns empty.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

Returns whether the item has a subitem of a number or a key.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one subitem. The subitems after it move down by one, and so one column to the left.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the subitem. One that the item does not have raises run-time error 9.

## See Also

- [LvwListItem](LvwListItem) class -- the item and its **SubItems**
- [LvwListSubItem](LvwListSubItem) class -- one subitem
- [Columns](Columns) -- the columns that show the subitems
