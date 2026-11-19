---
title: Selection and Check Boxes
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/Selection
has_toc: false
---

# Selection and Check Boxes
{: .no_toc }

Selects one item or several of a [**ListView**](.), gives the items check boxes, and reports each change of the selection, the focus and the check boxes.

```tb hidden
Class SelectionWatcher
    Public WithEvents LV As VBCCR18.ListView
    Private Sub LV_ItemSelect(ByVal Item As LvwListItem, ByVal Selected As Boolean) Handles LV.ItemSelect
        Debug.Print "ItemSelect " & Item.Text & " " & Selected
    End Sub
    Private Sub LV_ItemFocus(ByVal Item As LvwListItem) Handles LV.ItemFocus
        Debug.Print "ItemFocus " & Item.Text
    End Sub
    Private Sub LV_ItemCheck(ByVal Item As LvwListItem, ByVal Checked As Boolean) Handles LV.ItemCheck
        Debug.Print "ItemCheck " & Item.Text & " " & Checked
    End Sub
End Class
```

<!-- test: ListViewSelectionTests.Add_FirstItem_IsSelectedAndFocused, ListViewSelectionTests.Selected_Assigned_RaisesItemSelectAndItemFocus -->
```tb check_build check_run arch=win32,win64
Dim Watch As New SelectionWatcher
Set Watch.LV = ListView1
ListView1.ListItems.Add , , "alpha"
ListView1.ListItems.Add , , "beta"
ListView1.ListItems(2).Selected = True
Debug.Print ListView1.SelectedItem.Text; ListView1.GetSelectedCount
' Output:
' ItemFocus alpha
' ItemSelect alpha True
' ItemSelect alpha False
' ItemFocus beta
' ItemSelect beta True
' beta 1
```
<!-- /test -->

**SelectionWatcher** in the samples of this page is a class of the program's own that holds the control **WithEvents** and prints each of its item events.

* TOC
{:toc}

## Selected and focused items

Each item can be selected, and one item at a time has the focus: the dotted rectangle that the arrow keys move. While [**MultiSelect**](#multiselect) is **False**, selecting an item takes the selection from the others. With **True**, the user selects more with Ctrl and Shift, or by dragging a rectangle over them, and [**SelectedIndices**](#selectedindices) returns their numbers.

<!-- test: ListViewSelectionTests.SelectedItem_IsTheFocusedItem, ListViewSelectionTests.SelectedItem_Nothing_KeepsTheSelection -->
[**SelectedItem**](#selecteditem) is the item that has the focus, and that item need not be selected: an item whose [**Selected**](LvwListItem#selected) is set to **False** keeps the focus. Setting **SelectedItem** to an item selects it and gives it the focus. Setting it to **Nothing** takes the focus from every item and leaves the selection as it was.
<!-- /test -->

<!-- test: ListViewSelectionTests.Add_FirstItem_IsSelectedAndFocused, ListViewSelectionTests.AutoSelectFirstItem_False_FocusesTheFirstItemOnly -->
When the first item comes into an empty control it gets the focus, and while [**AutoSelectFirstItem**](#autoselectfirstitem) is **True** it is selected as well.
<!-- /test -->

Each change raises an event, whether the user or the program makes it: [**ItemSelect**](#itemselect) for an item selected or no longer selected, and [**ItemFocus**](#itemfocus) for the item that gets the focus. The sample above shows the order.

## Check boxes

<!-- test: ListViewSelectionTests.Checked_Assigned_RaisesItemCheckOnce, ListViewSelectionTests.Checkboxes_True_UnchecksEveryItem -->
With [**Checkboxes**](#checkboxes) **True** every item has a check box in front of its icon, which the user checks with a click or the Space key. An item's [**Checked**](LvwListItem#checked) reads and sets it, and each change raises [**ItemCheck**](#itemcheck); assigning the state an item already has raises nothing. Setting **Checkboxes** to **True** unchecks every item, and raises **ItemCheck** for each item that was checked.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Watch As New SelectionWatcher
ListView1.Checkboxes = True
ListView1.ListItems.Add , , "alpha"
ListView1.ListItems.Add , , "beta"
Set Watch.LV = ListView1
ListView1.ListItems(2).Checked = True
ListView1.ListItems(2).Checked = True
Debug.Print ListView1.CheckedIndices.Count; ListView1.CheckedIndices(1)
' Output:
' ItemCheck beta True
'  1  2
```

<!-- test: ListViewSelectionTests.GhostedIndices_HoldsTheGhostedItems -->
An item can also be *ghosted*, drawn dimmed as a file cut to the clipboard is, by its [**Ghosted**](LvwListItem#ghosted). [**GhostedIndices**](#ghostedindices) returns the numbers of the ghosted items, as [**CheckedIndices**](#checkedindices) does of the checked ones.
<!-- /test -->

## Hot tracking

With [**HotTracking**](#hottracking) **True** the item under the pointer is *hot*: it is highlighted, it is selected when the pointer rests on it for [**HoverSelectionTime**](#hoverselectiontime), and one click activates it, which raises [**ItemActivate**](Items#itemactivate). [**HighlightHot**](#highlighthot) and [**UnderlineHot**](#underlinehot) draw the hot item's text in the hot-tracking color or underlined. [**HoverSelection**](#hoverselection) selects an item the pointer rests on without the rest of hot tracking.

Properties
----------

### AutoSelectFirstItem
{: .no_toc }

Whether the first item that comes into an empty control is selected as well as given the focus. **Boolean**. Default: **True**.

### Checkboxes
{: .no_toc }

Whether each item has a check box. **Boolean**. Default: **False**. See [Check boxes](#check-boxes).

### FullRowSelect
{: .no_toc }

Whether a selected item is highlighted across all its columns in the report view, and whether a click anywhere in the row selects it. **Boolean**. Default: **False**, with which only the item's own text is highlighted.

### HideSelection
{: .no_toc }

Whether the selection is hidden while the control does not have the focus. **Boolean**. Default: **True**. With **False** the selected items stay highlighted.

### HighlightHot
{: .no_toc }

Whether the text of the hot item is drawn in the hot-tracking color of Windows. **Boolean**. Default: **False**. It has an effect while [**HotTracking**](#hottracking) is **True**.

### HotItem
{: .no_toc }

The hot item. An [**LvwListItem**](LvwListItem), or **Nothing** when no item is hot. Setting it to an item makes that item hot; **Nothing** makes no item hot. It has a meaning while [**HotTracking**](#hottracking) is **True**.

### HotMouseIcon
{: .no_toc }

The pointer shown over an item while hot tracking, when [**HotMousePointer**](#hotmousepointer) is **CCMousePointerCustom**. A picture that holds an icon or a cursor; a picture of another kind raises run-time error 380.

### HotMousePointer
{: .no_toc }

The pointer shown while the mouse is over an item and [**HotTracking**](#hottracking) or [**HoverSelection**](#hoverselection) is **True**. A member of [**CCMousePointerConstants**](../Common#ccmousepointerconstants). Default: **CCMousePointerDefault**, the pointer the list view of Windows shows there. Another value raises run-time error 380.

### HotTracking
{: .no_toc }

Whether the item under the pointer is hot, is selected when the pointer rests on it, and is activated by one click. **Boolean**. Default: **False**. See [Hot tracking](#hot-tracking).

### HoverSelection
{: .no_toc }

Whether an item is selected when the pointer rests on it for [**HoverSelectionTime**](#hoverselectiontime). **Boolean**. Default: **False**. [**HotTracking**](#hottracking) does the same and more.

### HoverSelectionTime
{: .no_toc }

How long the pointer rests on an item before the item is selected, in milliseconds. **Long**. Default: -1, the time of Windows.

<!-- test: ListViewSelectionTests.HoverSelectionTime_Zero_Raises380 -->
0, and a negative value other than -1, raise run-time error 380.
<!-- /test -->

### MultiSelect
{: .no_toc }

Whether the user can select several items. **Boolean**. Default: **False**.

### SelectedItem
{: .no_toc }

The item that has the focus. An [**LvwListItem**](LvwListItem), or **Nothing**. See [Selected and focused items](#selected-and-focused-items) for what an assignment does.

### SelectionMark
{: .no_toc }

The item from which a selection with Shift and a click or an arrow key goes on. An [**LvwListItem**](LvwListItem), or **Nothing**. A program sets it to an item, or to **Nothing**.

### UnderlineHot
{: .no_toc }

Whether the text of the hot item is underlined. **Boolean**. Default: **False**. It has an effect while [**HotTracking**](#hottracking) is **True**.

Methods
-------

### CheckedIndices
{: .no_toc }

Returns a **Collection** of the numbers of the checked items, in their order in the control. An empty collection when none is checked.

Syntax: *object*.**CheckedIndices**( ) **As Collection**

### GetSelectedCount
{: .no_toc }

Returns the number of selected items. **Long**.

Syntax: *object*.**GetSelectedCount**( ) **As Long**

### GhostedIndices
{: .no_toc }

Returns a **Collection** of the numbers of the ghosted items, in their order in the control. In [virtual mode](VirtualMode) it raises run-time error 91.

Syntax: *object*.**GhostedIndices**( ) **As Collection**

### SelectedIndices
{: .no_toc }

Returns a **Collection** of the numbers of the selected items, in their order in the control.

Syntax: *object*.**SelectedIndices**( ) **As Collection**

```tb check_build check_run arch=win32,win64
Dim Number As Variant
With ListView1
    .MultiSelect = True
    .ListItems.Add , , "alpha"
    .ListItems.Add , , "beta"
    .ListItems.Add , , "gamma"
    .ListItems(3).Selected = True
    For Each Number In .SelectedIndices
        Debug.Print .ListItems(Number).Text
    Next
End With
' Output:
' alpha
' gamma
```

Events
------

### BeginMarqueeSelection
{: .no_toc }

Raised when the user starts to drag a rectangle over the items to select them, while [**MultiSelect**](#multiselect) is **True**.

Syntax: *object*\_**BeginMarqueeSelection**( *Cancel* **As Boolean** )

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** stops the rectangle.

### ItemCheck
{: .no_toc }

Raised when the check box of an item changes, by the user or by code.

Syntax: *object*\_**ItemCheck**( **ByVal** *Item* **As LvwListItem**, **ByVal** *Checked* **As Boolean** )

*Item*
: The [**LvwListItem**](LvwListItem).

*Checked*
: The new state: **True** when the item is now checked.

### ItemFocus
{: .no_toc }

Raised when an item gets the focus, by the user or by code.

Syntax: *object*\_**ItemFocus**( **ByVal** *Item* **As LvwListItem** )

### ItemSelect
{: .no_toc }

Raised when an item is selected or is no longer selected, by the user or by code.

Syntax: *object*\_**ItemSelect**( **ByVal** *Item* **As LvwListItem**, **ByVal** *Selected* **As Boolean** )

*Item*
: The [**LvwListItem**](LvwListItem). In [virtual mode](VirtualMode) it is **Nothing** when every item is no longer selected at once.

*Selected*
: The new state: **True** when the item is now selected.

## See Also

- [ListView](.) control
- [LvwListItem](LvwListItem) class -- the **Selected**, **Checked**, **Ghosted** and **Hot** of an item
