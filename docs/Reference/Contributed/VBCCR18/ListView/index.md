---
title: ListView
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/
has_toc: false
symbols:
  - ListView
---

# ListView class
{: .no_toc }

A **ListView** shows a list of items as large icons, small icons, a list, tiles or a report with a column for each part of an item. The user selects items, checks them, edits their labels, sorts the report by a column and drags items; the program can show the items in groups, or supply them as they are shown.

```tb check_build check_run arch=win32,win64
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Size", , LvwColumnHeaderAlignmentRight
    .ListItems.Add(, "r", "readme.txt").SubItems(1) = "2 KB"
    .ListItems.Add(, "n", "notes.txt").SubItems(1) = "11 KB"
    .Sorted = True                          ' by the first column, from A to Z
    Debug.Print .ListItems(1).Text; " "; .ListItems(1).SubItems(1)
    Debug.Print .ListItems("r").Index
End With
' Output:
' notes.txt 11 KB
'  2
```

The control stands in place of the ListView of the Microsoft common controls (`MSCOMCTL.OCX`). The [WinNativeCommonCtls](../../../WinNativeCommonCtls/ListView/) package has a **ListView** too. This one adds the tile view, [groups](Groups), work areas, a [virtual mode](VirtualMode) for lists too long to hold, check boxes, filters and split buttons in the column headers, a background picture, insertion marks for drag and drop, and an event for each change of an item's selection, focus or check box.

Of the [common members](../Common), the control has all of them: those under [Name and place](../Common#name-and-place), [Window handles](../Common#window-handles), [Font and visual styles](../Common#font-and-visual-styles), [Mouse](../Common#mouse), [Keyboard and focus](../Common#keyboard-and-focus), [Dragging the control](../Common#dragging-the-control), [OLE drag and drop](../Common#ole-drag-and-drop) and [Right-to-left](../Common#right-to-left), **RightToLeftLayout** included. [Drag and Drop](DragAndDrop) says what the control does of its own with **OLEDrag** and **OLEStartDrag**.

* TOC
{:toc}

## Topics

The members of the control are on these pages, by what they do:

- [Views and Icons](Views) -- the five views, the image lists of the icons, the arrangement of the icons, work areas, scrolling and the size of the control
- [Items and Subitems](Items) -- the items, the texts of their columns, their tool tips, and the events of a click on an item
- [Selection and Check Boxes](Selection) -- the selected item, selecting several, check boxes, ghosted items and hot tracking
- [Columns](Columns) -- the columns of the report view and the header above them: sizing, moving, sort arrows, check boxes, split buttons and filters
- [Sorting and Searching](SortingAndSearching) -- sorting the items by a column, finding an item by its text or its place
- [Groups](Groups) -- the items shown in groups with headers, which the user can collapse
- [Editing Labels](LabelEditing) -- the user editing the text of an item in place
- [Virtual Mode](VirtualMode) -- a list whose items the program supplies when they are shown
- [Drag and Drop](DragAndDrop) -- dragging items, insertion marks and dropped files
- [Appearance](Appearance) -- colors, border, background picture and the look of Windows Explorer

The objects the control holds have pages of their own:

- [LvwListItems](LvwListItems) and [LvwListItem](LvwListItem) -- the items and one item
- [LvwListSubItems](LvwListSubItems) and [LvwListSubItem](LvwListSubItem) -- the subitems of an item and one subitem
- [LvwColumnHeaders](LvwColumnHeaders) and [LvwColumnHeader](LvwColumnHeader) -- the columns and one column
- [LvwGroups](LvwGroups) and [LvwGroup](LvwGroup) -- the groups and one group
- [LvwWorkAreas](LvwWorkAreas) and [LvwWorkArea](LvwWorkArea) -- the work areas and one work area
- [LvwVirtualListItems](LvwVirtualListItems) and [LvwVirtualListItem](LvwVirtualListItem) -- the items of a virtual list and one item

## Numbers and keys

Items, subitems, columns and groups are numbered from 1. A number is a place: it changes when an object is added or removed in front of it, and the number of an item also changes when the items are sorted. A key is a string of the program's own that stays with its object, and capital and small letters in it are the same. Each collection of these has **Add**, **Item**, **Exists**, **Count**, **Remove** and **Clear**, and a program goes through it with **For Each**.

## Filling a long list

<!-- test: ListViewTests.Redraw_False_KeepsTheItems -->
While [**Redraw**](#redraw) is **False** the control does not draw itself, so a program that adds many items sets it to **False** first and to **True** at the end. The items are there all the time; only the drawing waits.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim i As Long
ListView1.Redraw = False
For i = 1 To 500
    ListView1.ListItems.Add , , "Item " & i
Next
ListView1.Redraw = True
Debug.Print ListView1.ListItems.Count
' Output:
'  500
```

Properties
----------

### Redraw
{: .no_toc }

Whether the control draws itself when its items change. **Boolean**. Default: **True**. Setting it to **True** draws the control again at once.

Events
------

### ContextMenu
{: .no_toc }

Raised when the user asks for a shortcut menu over the control: with the right mouse button, with Shift+F10, or with the menu key.

Syntax: *object*\_**ContextMenu**( **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*X*, *Y*
: Where the pointer is, measured from the control's top left corner in the scale units of its container. Both are -1 when the user pressed a key: the program then shows the menu at the selected item, or at the control.

```tb check_build
Private Sub ListView1_ContextMenu(ByVal X As Single, ByVal Y As Single)
    If X = -1 And Y = -1 Then
        Debug.Print "Menu from the keyboard"
    Else
        Debug.Print "Menu at"; X; Y
    End If
End Sub
```

## See Also

- [Common members](../Common) -- the members this control shares with the package's other controls
- [ImageList](../ImageList/) control -- the pictures of the items, the columns and the groups
- [ListView](../../../WinNativeCommonCtls/ListView/) -- the control of the same name in the WinNativeCommonCtls package
