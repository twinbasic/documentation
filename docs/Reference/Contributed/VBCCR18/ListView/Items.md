---
title: Items and Subitems
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/Items
has_toc: false
---

# Items and Subitems
{: .no_toc }

Fills a [**ListView**](.) with items, gives each item a text for every column, and reports the user's clicks on them.

<!-- test: ListViewItemsTests.Add_AtAnIndex_MovesTheLaterItemsDown -->
```tb check_build check_run arch=win32,win64
Dim Item As LvwListItem
ListView1.ListItems.Add , "a", "alpha"
ListView1.ListItems.Add , "b", "beta"
ListView1.ListItems.Add 1, "c", "gamma"      ' before the first
For Each Item In ListView1.ListItems
    Debug.Print Item.Index; Item.Key; " "; Item.Text
Next
' Output:
'  1 c gamma
'  2 a alpha
'  3 b beta
```
<!-- /test -->

* TOC
{:toc}

## Items

[**ListItems**](#listitems) returns the items as an [**LvwListItems**](LvwListItems) collection, and its [**Add**](LvwListItems#add) method adds one, with its text, a key and its icons. Each item is an [**LvwListItem**](LvwListItem). The number of an item is its place in the control, from the top or the first in the current order, so it changes when items are added or removed in front of it and when the items are [sorted](SortingAndSearching).

## Subitems

In the report view each item fills a row: its own text is in the first column, and its subitems are in the others. The texts of the subitems are the item's [**SubItems**](LvwListItem#subitems), from 1, and each subitem is also an [**LvwListSubItem**](LvwListSubItem) of the item's [**ListSubItems**](LvwListItem#listsubitems), which holds its key, its icon, its color, its font and its tool tip.

<!-- test: ListViewItemsTests.SubItems_NoColumnForIt_Raises380, ListViewItemsTests.SubItems_Assigned_AddsTheSubitemsBefore -->
**SubItems** has one number for each column after the first: with three columns, **SubItems(1)** and **SubItems(2)**. Any other number raises run-time error 380. Assigning **SubItems** a number that the item has no subitem for yet adds the subitems up to it, with empty texts in between.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Item As LvwListItem
With ListView1
    .View = LvwViewReport
    .ColumnHeaders.Add , , "Name"
    .ColumnHeaders.Add , , "Size"
    .ColumnHeaders.Add , , "Type"
    Set Item = .ListItems.Add(, , "readme")
    Item.SubItems(2) = "Text"
    Debug.Print Item.ListSubItems.Count; "["; Item.SubItems(1); "] "; Item.SubItems(2)
End With
' Output:
'  2 [] Text
```

<!-- test: ListViewColumnsTests.Remove_LaterColumnsShowTheSubitemsOfTheirNumber -->
A subitem belongs to the column of its number, not to a particular column: **SubItems(1)** is shown in the second column, whichever column that is. Adding or removing a column in front of others leaves the subitems as they are, so the columns after it show other texts. A program that removes the column of **SubItems(1)** removes the first subitem of every item as well.
<!-- /test -->

A program that reads subitems of more than 259 characters reads them from **ListSubItems**: see the warning under [**SubItems**](LvwListItem#subitems).

## Tool tips

With [**ShowInfoTips**](#showinfotips) **True**, the control shows the [**ToolTipText**](LvwListItem#tooltiptext) of an item in a small window while the pointer rests on it, and in the report view the [**ToolTipText**](LvwListSubItem#tooltiptext) of a subitem. With [**ShowLabelTips**](#showlabeltips) **True**, an item whose text is cut off shows its whole text in the same way.

## The user and the items

A click on an item raises [**ItemClick**](#itemclick), with the button, before **MouseUp** and **Click**. A double click raises [**ItemDblClick**](#itemdblclick) and then **DblClick**. An item is *activated*, which raises [**ItemActivate**](#itemactivate), when the user double-clicks it or presses Enter on it, or clicks it once while [**HotTracking**](Selection#hottracking) is **True**: the event is where a program opens what the item stands for.

```tb check_build
Private Sub ListView1_ItemActivate(ByVal Item As LvwListItem, ByVal SubItemIndex As Long, ByVal Shift As Integer)
    Debug.Print "Open "; Item.Text
End Sub
```

Properties
----------

### hWndToolTip
{: .no_toc }

The handle of the tool tip window that shows the tips of the items. **LongPtr**, read-only.

### ListItems
{: .no_toc }

The items of the control, as an [**LvwListItems**](LvwListItems) collection. Read-only.

In [virtual mode](VirtualMode) the control holds no items, and reading **ListItems** raises run-time error 91; [**VirtualListItems**](VirtualMode#virtuallistitems) takes its place.

### ShowInfoTips
{: .no_toc }

Whether the control shows the tool tip texts of the items and the subitems. **Boolean**. Default: **False**.

### ShowLabelTips
{: .no_toc }

Whether an item whose text is partly hidden shows its whole text in a tip while the pointer rests on it. **Boolean**. Default: **False**. The icon view does this always.

Methods
-------

### ResetEmptyMarkup
{: .no_toc }

Makes the control raise [**GetEmptyMarkup**](#getemptymarkup) again the next time it is drawn without items, so that the program can give it another text.

Syntax: *object*.**ResetEmptyMarkup**

### ResetForeColors
{: .no_toc }

<!-- test: ListViewItemsTests.ResetForeColors_GivesBackTheControlsForeColor -->
Gives every item and every subitem the [**ForeColor**](Appearance#forecolor) of the control again, taking away the colors the program gave them.
<!-- /test -->

Syntax: *object*.**ResetForeColors**

In [virtual mode](VirtualMode) it raises run-time error 5.

Events
------

### GetEmptyMarkup
{: .no_toc }

Raised when the control is drawn without items, and the program has visual styles. A handler that gives *Text* a string has it drawn in the empty control, such as a line that says why the list is empty.

Syntax: *object*\_**GetEmptyMarkup**( *Text* **As String**, *Center* **As Boolean** )

*Text*
: Set by the handler: the text. An empty string draws nothing.

*Center*
: Set by the handler: **True** to center the text, **False** to draw it at the top left.

The control asks once; [**ResetEmptyMarkup**](#resetemptymarkup) makes it ask again.

```tb check_build
Private Sub ListView1_GetEmptyMarkup(Text As String, Center As Boolean)
    Text = "No files match the search."
    Center = True
End Sub
```

### ItemActivate
{: .no_toc }

Raised when the user activates an item; see [The user and the items](#the-user-and-the-items).

Syntax: *object*\_**ItemActivate**( **ByVal** *Item* **As LvwListItem**, **ByVal** *SubItemIndex* **As Long**, **ByVal** *Shift* **As Integer** )

*Item*
: The [**LvwListItem**](LvwListItem).

*SubItemIndex*
: The number of the subitem the user clicked, in the report view; 0 for the item's own text.

*Shift*
: The sum of the [**ShiftConstants**](../../../VBRUN/Constants/ShiftConstants) members for the Shift, Ctrl and Alt keys held down.

### ItemBkColor
{: .no_toc }

Raised before an item is drawn, so that the program can give the background of its text another color, such as every second row of a report in a light shade.

Syntax: *object*\_**ItemBkColor**( **ByVal** *Item* **As LvwListItem**, *RGBColor* **As Long** )

*Item*
: The [**LvwListItem**](LvwListItem) about to be drawn.

*RGBColor*
: The color, as [**RGB**](../../../../Modules/Information/RGB) returns one. A handler that sets it draws the item on that color; one that leaves it alone keeps the color of the control.

```tb check_build
Private Sub ListView1_ItemBkColor(ByVal Item As LvwListItem, RGBColor As Long)
    If Item.Index Mod 2 = 0 Then RGBColor = RGB(235, 242, 252)
End Sub
```

### ItemClick
{: .no_toc }

Raised when the user clicks an item with the left or the right mouse button.

Syntax: *object*\_**ItemClick**( **ByVal** *Item* **As LvwListItem**, **ByVal** *Button* **As Integer** )

*Item*
: The [**LvwListItem**](LvwListItem).

*Button*
: **vbLeftButton** or **vbRightButton**, of [**MouseButtonConstants**](../../../VBRUN/Constants/MouseButtonConstants).

### ItemDblClick
{: .no_toc }

Raised when the user double-clicks an item with the left or the right mouse button, before **DblClick**. Its arguments are those of [**ItemClick**](#itemclick).

Syntax: *object*\_**ItemDblClick**( **ByVal** *Item* **As LvwListItem**, **ByVal** *Button* **As Integer** )

## See Also

- [ListView](.) control
- [LvwListItems](LvwListItems) class -- the collection of the items
- [LvwListItem](LvwListItem) class -- one item
- [LvwListSubItem](LvwListSubItem) class -- one subitem
