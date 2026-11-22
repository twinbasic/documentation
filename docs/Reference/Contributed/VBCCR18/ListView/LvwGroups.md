---
title: LvwGroups
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwGroups
has_toc: false
---

# LvwGroups class
{: .no_toc }

The collection of the groups of a [**ListView**](.), which its [**Groups**](Groups#groups) property returns. Its items are [**LvwGroup**](LvwGroup) objects, numbered from 1, and a group can have a key as well.

<!-- test: ListViewGroupsTests.Sorted_True_SortsThePositions -->
```tb check_build check_run arch=win32,win64
With ListView1.Groups
    .Add , "b", "Beta"
    .Add , "c", "Gamma"
    .Add , "a", "Alpha"
    .Sorted = True                          ' by the headers' texts
    Debug.Print .Item("a").Position; .Item("b").Position; .Item("c").Position
    Debug.Print .Item(1).Header; .Item(1).Index
End With
' Output:
'  1  2  3
' Beta 1
```
<!-- /test -->

A program goes through the groups with **For Each**, or by number from 1 to [**Count**](#count). It cannot make an **LvwGroups** object with **New**. The number of a group, its [**Index**](LvwGroup#index), is its place in the collection; its place on the screen is its [**Position**](LvwGroup#position), which sorting changes.

* TOC
{:toc}

Properties
----------

### Count
{: .no_toc }

The number of groups. **Long**, read-only.

### Item
{: .no_toc }

Returns one group. It is the default member, so `ListView1.Groups("a")` is `ListView1.Groups.Item("a")`.

Syntax: *object*.**Item**( *Index* ) **As LvwGroup**

*Index*
: *required* The number of the group, from 1 to [**Count**](#count), or its key as a **String**, in which capital and small letters are the same.

A number outside that range raises run-time error 9, and a key that no group has raises run-time error 5. [**Exists**](#exists) asks without an error.

### Sorted
{: .no_toc }

Whether the groups are shown in the order of their [**Header**](LvwGroup#header) texts. **Boolean**. Default: **False**. **True** sorts them at once, and a group added while it is **True** goes to its place. Sorting changes the groups' [**Position**](LvwGroup#position), not their numbers.

### SortOrder
{: .no_toc }

Whether the groups are sorted in ascending or descending order. A member of [**LvwSortOrderConstants**](SortingAndSearching#lvwsortorderconstants). Default: **LvwSortOrderAscending**. Another value raises run-time error 380.

### SortType
{: .no_toc }

How two headers compare when the groups are sorted. A member of [**LvwSortTypeConstants**](SortingAndSearching#lvwsorttypeconstants). Default: **LvwSortTypeBinary**. Another value raises run-time error 380.

Methods
-------

### Add
{: .no_toc }

Adds a group and returns its [**LvwGroup**](LvwGroup).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Header* ] [, *HeaderAlignment* ] [, *Footer* ] [, *FooterAlignment* ] ) **As LvwGroup**

*Index*
: *optional* A **Long**: the number the new group gets, and its place on the screen. The groups from that number on move up by one. Without it, or with 0, the group goes after the last one.

*Key*
: *optional* A **String** by which the program can name the group.

*Header*
: *optional* A **String**: the text of the group's header.

*HeaderAlignment*
: *optional* A member of [**LvwGroupHeaderAlignmentConstants**](Groups#lvwgroupheaderalignmentconstants). The default is **LvwGroupHeaderAlignmentLeft**.

*Footer*
: *optional* A **String**: the text of the group's footer.

*FooterAlignment*
: *optional* A member of [**LvwGroupFooterAlignmentConstants**](Groups#lvwgroupfooteralignmentconstants). The default is **LvwGroupFooterAlignmentLeft**.

<!-- test: ListViewGroupsTests.Add_IndexOutOfRange_Raises35600 -->
A negative *Index*, and one greater than [**Count**](#count) + 1, raises run-time error 35600. A *Key* that another group has raises run-time error 457.
<!-- /test -->

<!-- test: ListViewGroupsTests.Add_DuplicateKey_AddsNoGroup -->
> [!WARNING] 1.8.142.0
> A call that raises error 457 for its *Key* has already given the control the group. The collection is as it was, and the control shows a group with that header that no **LvwGroup** stands for, which the program cannot remove but with [**Clear**](#clear). A program asks [**Exists**](#exists) before it adds a group with a key that the collection may have.

### Clear
{: .no_toc }

Removes every group. [**GroupView**](Groups#groupview) stays as it was.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

Returns whether the collection has a group of a number or a key.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one group. The groups after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the group. One that the collection does not have raises the error that [**Item**](#item) raises for it.

## See Also

- [Groups](Groups) -- the groups in the control
- [LvwGroup](LvwGroup) class -- one group
