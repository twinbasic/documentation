---
title: LvwWorkAreas
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwWorkAreas
has_toc: false
---

# LvwWorkAreas class
{: .no_toc }

The collection of the work areas of a [**ListView**](.), which its [**WorkAreas**](Views#workareas) property returns. A work area is a rectangle of the control that holds icons of its own, in the icon, small icon and tile views; its items are [**LvwWorkArea**](LvwWorkArea) objects, numbered from 1.

<!-- test: ListViewTests.WorkAreas_Remove_RenumbersTheLaterAreas -->
```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewIcon
    .WorkAreas.Add 0, 0, 1500, 1500
    .WorkAreas.Add 1500, 0, 1500, 1500
    .ListItems.Add , , "first"
    Debug.Print .WorkAreas.Count; .WorkAreas(1).ListItemIndices.Count
    .WorkAreas.Remove 1
    Debug.Print .WorkAreas.Count; .WorkAreas(1).Left > 0
End With
' Output:
'  2  1
'  1 True
```
<!-- /test -->

The control arranges its items in the first work area, and the user drags an item into another; an item's [**WorkArea**](LvwListItem#workarea) says which it is in. Without work areas the whole control is one. The control holds them, not the collection, so a program can get the collection again at any time. It cannot make an **LvwWorkAreas** object with **New**, and a program goes through the work areas with **For Each**, or by number from 1 to [**Count**](#count).

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of work areas. **Long**, read-only.

### Item
{: .no_toc }

Returns one work area. It is the default member, so `ListView1.WorkAreas(1)` is `ListView1.WorkAreas.Item(1)`.

Syntax: *object*.**Item**( *Index* ) **As LvwWorkArea**

*Index*
: *required* A **Long**: the number of the work area, from 1 to [**Count**](#count).

<!-- test: ListViewTests.WorkAreas_Item_OutOfRange_Raises35600 -->
A number outside that range raises run-time error 35600.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Adds a work area and returns its [**LvwWorkArea**](LvwWorkArea).

Syntax: *object*.**Add**( *Left*, *Top*, *Width*, *Height* [, *Index* ] ) **As LvwWorkArea**

*Left*, *Top*, *Width*, *Height*
: *required* **Single**: the rectangle, measured from the control's top left corner, in the scale units of the control's container.

*Index*
: *optional* A **Long**: the number the new work area gets. The work areas from that number on move up by one. Without it, or with 0, it goes after the last one.

<!-- test: ListViewTests.WorkAreas_Add_ZeroWidth_Raises380 -->
A width or a height of 0 raises run-time error 380. A negative *Index*, one greater than [**Count**](#count) + 1, and a seventeenth work area, raise run-time error 35600: a control has 16 at most.
<!-- /test -->

### Clear
{: .no_toc }

Removes every work area, so that the whole control is one again.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

Returns whether there is a work area of a number. **Boolean**.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

### Remove
{: .no_toc }

Removes one work area. The work areas after it move down by one. A number that no work area has raises run-time error 35600.

Syntax: *object*.**Remove** *Index*

## See Also

- [Views and Icons](Views#work-areas) -- work areas in the control
- [LvwWorkArea](LvwWorkArea) class -- one work area
