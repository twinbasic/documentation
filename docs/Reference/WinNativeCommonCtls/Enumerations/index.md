---
title: Enumerations
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/Enumerations/
has_children: true
has_toc: false
nav_order: 99
---

# WinNativeCommonCtls Enumerations
{: .no_toc }

The ten module-level enumerations declared in the package's shared modules and exposed to user code. Each is reachable from any project that references the package.

Per-control nested enumerations (those declared *inside* a `<Name>BaseCtl` class — `ListViewConstants`, `ListArrangeConstants`, `ListLabelEditConstants`, `ListTextBackgroundConstants`, `ListColumnAlignmentConstants`, `PrbOrientation`, `PrbScrolling`, `PrbState`, `TickStyleConstants`, `TextPositionConstants`, `ImageListColorDepth`) are documented on the page of the control that declares them, not under this folder.

* TOC
{:toc}

## DTPicker

- [DTPickerFormatConstants](DTPickerFormatConstants) -- the [**DTPicker.Format**](../DTPicker#format) values

## ImageList

- [ImlDrawConstants](ImlDrawConstants) -- the *Style* flags for [**ListImage.Draw**](../ImageList/ListImage#draw)

## Shared (Slider, UpDown)

- [OrientationConstants](OrientationConstants) -- the horizontal / vertical enum used by [**Slider.Orientation**](../Slider#orientation) and [**UpDown.Orientation**](../UpDown#orientation)

## TreeView (and ListView via TreeBorderStyleConstants)

- [TreeBorderStyleConstants](TreeBorderStyleConstants) -- the [**TreeView.BorderStyle**](../TreeView/#borderstyle) and [**ListView.BorderStyle**](../ListView/#borderstyle) values
- [TreeLabelEditConstants](TreeLabelEditConstants) -- the [**TreeView.LabelEdit**](../TreeView/#labeledit) values
- [TreeLineStyleConstants](TreeLineStyleConstants) -- the [**TreeView.LineStyle**](../TreeView/#linestyle) values
- [TreeRelationshipConstants](TreeRelationshipConstants) -- the *Relationship* values for [**Nodes.Add**](../TreeView/Nodes#add)
- [TreeSortOrderConstants](TreeSortOrderConstants) -- the [**TreeView.SortOrder**](../TreeView/#sortorder) and [**Node.SortOrder**](../TreeView/Node#sortorder) values
- [TreeSortTypeConstants](TreeSortTypeConstants) -- the [**TreeView.SortType**](../TreeView/#sorttype) and [**Node.SortType**](../TreeView/Node#sorttype) values
- [TreeStyleConstants](TreeStyleConstants) -- the [**TreeView.Style**](../TreeView/#style) values
