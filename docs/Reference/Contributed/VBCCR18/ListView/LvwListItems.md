---
title: LvwListItems
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwListItems
has_toc: false
---

# LvwListItems class
{: .no_toc }

The collection of the items of a [**ListView**](.), which its [**ListItems**](Items#listitems) property returns. Its items are [**LvwListItem**](LvwListItem) objects, numbered from 1 in their order in the control, and an item can have a key as well.

```tb check_build check_run arch=win32,win64
With ListView1.ListItems
    .Add , "open", "Open"
    .Add , "save", "Save"
    Debug.Print .Count; .Item("SAVE").Index
    .Remove "open"
    Debug.Print .Item("save").Index; .Exists("open")
End With
' Output:
'  2  2
'  1 False
```

A program goes through the items with **For Each**, in their order in the control, or by number from 1 to [**Count**](#count). It cannot make an **LvwListItems** object with **New**.

* TOC
{:toc}

## Numbers and keys

<!-- test: ListViewItemsTests.Remove_RenumbersTheLaterItems -->
The number of an item is its place in the control. It changes when an item is added or removed in front of it, and when the items are sorted, so a program that keeps a number over such a change keeps the wrong item. A key stays with its item, and so does an **LvwListItem** object that the program holds: after its item is removed, its [**Index**](LvwListItem#index) is 0.
<!-- /test -->

<!-- test: ListViewItemsTests.Item_ByKey_IgnoresCase -->
A key is any string, and capital and small letters in it are the same: `"Open"` and `"OPEN"` are one key. No two items have the same key. An item needs no key: an empty string is no key.
<!-- /test -->

Properties
----------

### Count
{: .no_toc }

The number of items. **Long**, read-only.

### Item
{: .no_toc }

Returns one item. It is the default member, so `ListView1.ListItems("open")` is `ListView1.ListItems.Item("open")`.

Syntax: *object*.**Item**( *Index* ) **As LvwListItem**

*Index*
: *required* The number of the item, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: ListViewItemsTests.Item_NumberOutOfRange_Raises35600, ListViewItemsTests.Item_UnknownKey_Raises5 -->
A number outside that range raises run-time error 35600, *Index out of bounds*, and a key that no item has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Adds an item and returns its [**LvwListItem**](LvwListItem).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Text* ] [, *Icon* ] [, *SmallIcon* ] ) **As LvwListItem**

*Index*
: *optional* A **Long**: the number the new item gets. The items from that number on move down by one. Without it, or with 0, the item goes after the last one.

*Key*
: *optional* A **String** by which the program can name the item. See [Numbers and keys](#numbers-and-keys).

*Text*
: *optional* A **String**: the item's text.

*Icon*
: *optional* The number or the key of the item's large icon in the image list of [**Icons**](Views#icons).

*SmallIcon*
: *optional* The number or the key of the item's small icon in the image list of [**SmallIcons**](Views#smallicons).

<!-- test: ListViewItemsTests.Add_IndexOutOfRange_Raises35600, ListViewItemsTests.Add_DuplicateKey_Raises457, ListViewItemsTests.Add_IconKeyWithoutImageList_Raises35601 -->
A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600. A *Key* that another item has raises run-time error 457, and no item is added. A key for an icon that the image list does not have, or a key while there is no image list, raises run-time error 35601, *Element not found*, and a negative number for an icon raises run-time error 35600.
<!-- /test -->

While [**Sorted**](SortingAndSearching#sorted) is **True**, the item goes to its place in the order instead; see [Sorting](SortingAndSearching#sorting).

### Clear
{: .no_toc }

Removes every item.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

<!-- test: ListViewItemsTests.Exists_SaysWhetherTheItemIsThere -->
Returns whether the collection has an item of a number or a key, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one item. The items after it move up by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the item. One that the collection does not have raises the error that [**Item**](#item) raises for it.

## See Also

- [ListView](.) control
- [LvwListItem](LvwListItem) class -- one item
- [Items and Subitems](Items) -- what the items show
