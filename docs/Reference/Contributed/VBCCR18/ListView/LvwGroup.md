---
title: LvwGroup
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwGroup
has_toc: false
---

# LvwGroup class
{: .no_toc }

One group of a [**ListView**](.): its header, its footer, its state and its items. A program gets one from the [**LvwGroups**](LvwGroups) collection and its [**Add**](LvwGroups#add) method, from an item's [**Group**](LvwListItem#group), and from the control's events that name a group.

```tb check_build check_run arch=win32,win64
Dim Group As LvwGroup
Set Group = ListView1.Groups.Add(, "docs", "Documents", LvwGroupHeaderAlignmentCenter, "3 files")
Group.Hint = "Opened this week"
Group.Collapsible = True
Debug.Print Group.Header; " | "; Group.Footer; " | "; Group.Hint
Debug.Print Group.HeaderAlignment; Group.Collapsible; Group.Collapsed
' Output:
' Documents | 3 files | Opened this week
'  2 TrueFalse
```

A program cannot make an **LvwGroup** object with **New**. Most of a group's members need visual styles; without them a program has no groups at all.

* TOC
{:toc}

Properties
----------

### Collapsed
{: .no_toc }

Whether the group's items are hidden under its header. **Boolean**. Default: **False**. A change raises [**GroupCollapsedChanged**](Groups#groupcollapsedchanged).

### Collapsible
{: .no_toc }

Whether the group's header has a button with which the user collapses and expands the group. **Boolean**. Default: **False**.

### Footer
{: .no_toc }

The text under the group's items. **String**. Default: the *Footer* of [**Add**](LvwGroups#add).

### FooterAlignment
{: .no_toc }

Where the footer's text is. A member of [**LvwGroupFooterAlignmentConstants**](Groups#lvwgroupfooteralignmentconstants). Another value raises run-time error 380.

### Header
{: .no_toc }

The text of the group's header. **String**. It is the default member.

### HeaderAlignment
{: .no_toc }

Where the header's text is. A member of [**LvwGroupHeaderAlignmentConstants**](Groups#lvwgroupheaderalignmentconstants). Another value raises run-time error 380.

### Height, Left, Top, Width
{: .no_toc }

The place and the size of the group's header in the control, in the scale units of the control's container. **Single**, read-only: an assignment raises run-time error 383.

### Hint
{: .no_toc }

A text shown under the header, in smaller type. **String**. Default: empty.

### ID
{: .no_toc }

The number by which Windows knows the group. **Long**, read-only. The groups of a control get 1, 2, 3 and on, in the order they are added, and a group keeps its ID; so after a group is added in front of others, or removed, the ID of a group is not its [**Index**](#index).

### Icon
{: .no_toc }

The number or the key of the header's icon in the image list of [**GroupIcons**](Groups#groupicons). **Variant**. 0 when the group has none. An assignment takes a number or a key; a key that the image list does not have raises run-time error 35601.

<!-- test: ListViewGroupsTests.Icon_SetsTheIconOfItsOwnGroup -->
> [!WARNING] 1.8.142.0
> An assignment draws the icon in the header of the group whose [**ID**](#id) is this group's [**Index**](#index). The two are the same while the groups are only added after one another. Once a group has been added in front of others or removed, the icon goes to another group's header, or to none, and this group's **Icon** still returns the value assigned. A program that gives its groups icons adds each group after the last one and removes none, and puts them in another order with [**Sorted**](LvwGroups#sorted).

### IconIndex
{: .no_toc }

The number of the header's icon in the image list, also when [**Icon**](#icon) names it by its key. **Long**, read-only.

### Index
{: .no_toc }

The number of the group in the [**LvwGroups**](LvwGroups) collection, from 1. **Long**, read-only.

### Key
{: .no_toc }

The group's key in the [**LvwGroups**](LvwGroups) collection. **String**. An assignment gives the group another key; an empty string takes the key away, and a key that another group has raises run-time error 457.

### Link
{: .no_toc }

A text in the group's header that the user clicks as a link, which raises [**GroupLinkClick**](Groups#grouplinkclick). **String**. Default: empty, with which there is no link.

### ListItemCount
{: .no_toc }

The number of items in the group. **Long**, read-only.

### ListItemIndices
{: .no_toc }

The numbers of the items in the group, as a **Collection**, in the order they are shown. Read-only.

### Position
{: .no_toc }

The place of the group among the others as they are shown, from 1. **Long**, read-only: an assignment raises run-time error 383. It differs from [**Index**](#index) when the groups are [sorted](LvwGroups#sorted).

### Selected
{: .no_toc }

Whether the group is selected. **Boolean**. Default: **False**. Setting it to **True** selects the group and gives it the focus. A change raises [**GroupSelectedChanged**](Groups#groupselectedchanged).

### ShowHeader
{: .no_toc }

Whether the group's header is shown. **Boolean**. Default: **True**.

### Subseted
{: .no_toc }

Whether the group shows only its first [**GroupSubsetCount**](Groups#groupsubsetcount) items, with its [**SubsetLink**](#subsetlink) under them. **Boolean**. Default: **False**.

### SubsetLink
{: .no_toc }

The text of the link with which the user shows all the items of a [**Subseted**](#subseted) group. **String**. Default: empty.

### SubsetLinkSelected
{: .no_toc }

Whether the group's subset link has the focus. **Boolean**. Default: **False**.

### Tag
{: .no_toc }

A value of the program's own, which the control does not use. **Variant**: it holds a value of any type, an object included, which is assigned with **Set**. A new group has an empty string.

## See Also

- [Groups](Groups) -- the groups in the control
- [LvwGroups](LvwGroups) class -- the collection of the groups
- [LvwListItem](LvwListItem) class -- the **Group** of an item
