---
title: LvwVirtualListItems
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwVirtualListItems
has_toc: false
---

# LvwVirtualListItems class
{: .no_toc }

The items of a [**ListView**](.) in [virtual mode](VirtualMode), which its [**VirtualListItems**](VirtualMode#virtuallistitems) property returns. Its items are [**LvwVirtualListItem**](LvwVirtualListItem) objects, numbered from 1 to the control's [**VirtualItemCount**](VirtualMode#virtualitemcount). The program holds the data; the collection only reaches the items the control shows, by number.

```tb check_build
' In a ListView whose VirtualMode is True.
Dim i As Long
With ListView1.VirtualListItems
    For i = 1 To .Count
        If .Item(i).Selected Then Debug.Print "Selected:"; i
    Next
End With
```

A program goes through the items with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **LvwVirtualListItems** object with **New**. While the control is not in virtual mode, reading **VirtualListItems** raises run-time error 91.

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of items, the control's [**VirtualItemCount**](VirtualMode#virtualitemcount). **Long**, read-only.

### Item
{: .no_toc }

Returns one item. It is the default member, so `ListView1.VirtualListItems(5)` is `ListView1.VirtualListItems.Item(5)`.

Syntax: *object*.**Item**( *Index* ) **As LvwVirtualListItem**

*Index*
: *required* A **Long**: the number of the item, from 1 to [**Count**](#count). Another number raises run-time error 35600.

Methods
-------

### Exists
{: .no_toc }

Returns whether there is an item of a number, from 1 to [**Count**](#count). **Boolean**.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

## See Also

- [Virtual Mode](VirtualMode) -- a list the program supplies
- [LvwVirtualListItem](LvwVirtualListItem) class -- one item
