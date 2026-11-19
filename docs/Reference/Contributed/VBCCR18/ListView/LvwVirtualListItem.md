---
title: LvwVirtualListItem
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwVirtualListItem
has_toc: false
---

# LvwVirtualListItem class
{: .no_toc }

One item of a [**ListView**](.) in [virtual mode](VirtualMode): its number, the texts the program gave it, its state and its place. A program gets one from the [**LvwVirtualListItems**](LvwVirtualListItems) collection.

```tb check_build
' In a ListView whose VirtualMode is True.
With ListView1.VirtualListItems(10)
    .Selected = True
    .EnsureVisible
    Debug.Print .Text; .Checked
End With
```

A program cannot make an **LvwVirtualListItem** object with **New**. The object stands for a number, and its texts and its check box are those that [**GetVirtualItem**](VirtualMode#getvirtualitem) gives the control when it asks.

* TOC
{:toc}

Properties
----------

### Checked
{: .no_toc }

Whether the item's check box is checked, as [**GetVirtualItem**](VirtualMode#getvirtualitem) gives it. **Boolean**, read-only.

### Height, Width
{: .no_toc }

The height and the width of the item's icon and text together, in the scale units of the control's container. **Single**, read-only: an assignment raises run-time error 383.

### Hot
{: .no_toc }

Whether the item is the [**HotItem**](Selection#hotitem). **Boolean**. Setting it to **True** makes it the hot item, and **False** makes no item hot if it was.

### Indentation
{: .no_toc }

How far the item is moved to the right in the report view, in widths of a small icon, as [**GetVirtualItem**](VirtualMode#getvirtualitem) gives it. **Long**, read-only.

### Index
{: .no_toc }

The number of the item, from 1. **Long**, read-only.

### Left, Top
{: .no_toc }

The place of the item's icon in the control, in the scale units of the control's container. **Single**. An assignment gives Windows a new place for the item, which the automatic arrangement of a virtual list can change again.

### Selected
{: .no_toc }

Whether the item is selected. **Boolean**. Setting it to **True** also gives the item the focus. A change raises [**ItemSelect**](Selection#itemselect).

### SubItems
{: .no_toc }

The text of one of the item's subitems, as [**GetVirtualItem**](VirtualMode#getvirtualitem) gives it. **String**, read-only, at most 259 characters.

Syntax: *object*.**SubItems**( *Index* )

*Index*
: *required* An **Integer**: the number of the subitem, from 1 to the number of columns less 1. Another number raises run-time error 380.

### Text
{: .no_toc }

The item's text, as [**GetVirtualItem**](VirtualMode#getvirtualitem) gives it. **String**, read-only, at most 259 characters. It is the default member.

### Visible
{: .no_toc }

Whether the item is in the part of the control that can be seen. **Boolean**, read-only.

Methods
-------

### CreateDragImage
{: .no_toc }

Returns the handle of a new image list of Windows that holds a picture of the item, as the [**CreateDragImage**](LvwListItem#createdragimage) of an ordinary item does. The program destroys it when it is done. **LongPtr**.

Syntax: *object*.**CreateDragImage**( [ *X* ] [, *Y* ] ) **As LongPtr**

*X*, *Y*
: *optional* **Single** variables that receive the place of the picture's top left corner, in the scale units of the control's container.

### EnsureVisible
{: .no_toc }

Scrolls the control so that the item can be seen.

Syntax: *object*.**EnsureVisible**

## See Also

- [Virtual Mode](VirtualMode) -- a list the program supplies
- [LvwVirtualListItems](LvwVirtualListItems) class -- the items of a virtual list
