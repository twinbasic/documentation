---
title: VirtualCombo
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/VirtualCombo
has_toc: false
symbols:
  - VirtualCombo
  - VcbStyleConstants
  - VcbDrawModeConstants
---

# VirtualCombo class
{: .no_toc }

A **VirtualCombo** is a combo box that holds no items: the program tells it how many items there are, and supplies the text of an item in an event each time the control shows it.

```tb check_build check_run arch=win32,win64
VirtualCombo1.ListCount = 100000
VirtualCombo1.Text = "any text"
Debug.Print VirtualCombo1.ListCount; VirtualCombo1.ListIndex; VirtualCombo1.Text
' Output:
'  100000 -1 any text
```

It is the [**ComboBoxW**](ComboBoxW) control without a list of its own, and most of its members are the same. VB6 has no such control.

Of the [common members](Common), the control has every member under [Name and place](Common#name-and-place), [Window handles](Common#window-handles), [Font and visual styles](Common#font-and-visual-styles), [Mouse](Common#mouse), [Keyboard and focus](Common#keyboard-and-focus), [Dragging the control](Common#dragging-the-control), [OLE drag and drop](Common#ole-drag-and-drop) and [Right-to-left](Common#right-to-left) but **RightToLeftLayout**. Its [**Click**](#click) and [**DblClick**](#dblclick) have a meaning of their own, and its [mouse events](#mousedown-mousemove-mouseup) give the position in twips.

* TOC
{:toc}

## Items that the program supplies

The program sets [**ListCount**](#listcount) to the number of items. From then on the list drops down, scrolls and selects as that of any combo box, and the control raises [**GetVirtualItem**](#getvirtualitem) whenever it needs the text of an item: to draw it in the list, to put it in the text box when the item is selected, or to return it from [**List**](#list). The handler looks the text up where the program keeps its data, such as an array:

```tb check_build
Private Cities() As String          ' filled elsewhere, from index 0

Private Sub VirtualCombo1_GetVirtualItem(ByVal Item As Long, Text As String)
    Text = Cities(Item)
End Sub
```

The handler is called often, for the items in view each time the list is drawn, so it must be quick and must not change the list.

<!-- test: VirtualComboTests.List_RaisesGetVirtualItem, VirtualComboTests.List_NoHandler_IsEmpty, VirtualComboTests.ListCount_Assigned_RemovesTheSelectionAndKeepsTheText -->
The control keeps no item text. Without a handler every item is empty. When the data changes, the program sets **ListCount** again if the number of items changed and calls [**Refresh**](Common#refresh). An assignment to **ListCount** leaves no item selected, and leaves the text in the text box as it is.
<!-- /test -->

## When to choose it

A [**ComboBoxW**](ComboBoxW) copies the text of every item when it is filled, which takes time and memory in proportion to the list. A **VirtualCombo** takes the same short time for a hundred items and for a million, since it asks for the few items in view. Choose it for a list of many thousands of items, and for data that the program holds anyway, in an array, a collection or a recordset.

What it gives up follows from having no items: there is no **AddItem**, **RemoveItem** or **Clear**, no **ItemData** and no **Sorted**. The order of the items is the order of the program's data, and searching is the program's work as well.

## Searching

The control cannot search texts that it does not have, so it raises an event for each search and the handler answers with an index.

<!-- test: VirtualComboTests.FindItem_RaisesFindVirtualItem, VirtualComboTests.SelectItem_SelectsWhatTheHandlerFound -->
[**FindVirtualItem**](#findvirtualitem) is raised by [**FindItem**](#finditem) and [**SelectItem**](#selectitem), by [**AutoSelect**](#autoselect), by an assignment to [**Text**](#text) on a **VcbStyleDropDownList** control, and when the list opens and looks for the item that matches the text box. The handler receives the text, the item after which to start, and whether the beginning of an item's text is enough.
<!-- /test -->

```tb check_build
Private Sub VirtualCombo1_FindVirtualItem(ByVal StartIndex As Long, ByVal SearchText As String, ByVal Partial As Boolean, FoundIndex As Long)
    Dim Index As Long, Candidate As String
    For Index = StartIndex + 1 To VirtualCombo1.ListCount - 1
        Candidate = VirtualCombo1.List(Index)
        If Partial Then Candidate = Left$(Candidate, Len(SearchText))
        If StrComp(Candidate, SearchText, vbTextCompare) = 0 Then
            FoundIndex = Index
            Exit Sub
        End If
    Next
End Sub
```

[**IncrementalSearch**](#incrementalsearch) is raised when the user types a character while a **VcbStyleDropDownList** control has the focus, to jump to an item. The control collects the characters typed in quick succession into one search string, and the handler sets the item to select.

## What is shared with ComboBoxW

The styles, the selection and the text, the drop-down list and its size and colors work as in **ComboBoxW**, whose sections explain them: [The styles](ComboBoxW#the-styles), [The selection and the text](ComboBoxW#the-selection-and-the-text) and [The drop-down list](ComboBoxW#the-drop-down-list). The items of a **VirtualCombo** all have one height.

<!-- test: VirtualComboTests.ListIndex_Assigned_SetsTextAndRaisesClick, VirtualComboTests.Text_Assigned_RaisesChangeAndKeepsListIndex -->
```tb check_build check_run arch=win32,win64
With VirtualCombo1
    .ListCount = 50
    .ListIndex = 7               ' no handler supplies a text: the text box is empty
    Debug.Print "["; .Text; "]"; .ListIndex
    .Text = "mauve"
    Debug.Print .Text; .ListIndex
End With
' Output:
' [] 7
' mauve 7
```
<!-- /test -->

Properties
----------

### AlwaysFindExact
{: .no_toc }

Whether the control looks in its list for whole texts only. **Boolean**. Default: **False**, with which the list, when it opens, asks [**FindVirtualItem**](#findvirtualitem) for the first item that begins with the text in the text box. With **True** it asks for an item whose whole text is that text.

### AutoSelect
{: .no_toc }

Whether the control selects an item as soon as the user has typed its whole text. **Boolean**. Default: **False**. After each change that the user makes to the text, the control raises [**FindVirtualItem**](#findvirtualitem) for the whole text, and selects the item that the handler found. It has no effect on a **VcbStyleDropDownList** control.

### BackColor
{: .no_toc }

The background color of the control. **OLE_COLOR**. A new control has **vbWindowBackground**.

### DrawMode
{: .no_toc }

Whether the control or the program draws the items. A member of [**VcbDrawModeConstants**](#vcbdrawmodeconstants). Default: **VcbDrawModeNormal**. With **VcbDrawModeOwnerDrawFixed** the control raises [**ItemDraw**](#itemdraw) for each item to show, and no **GetVirtualItem** to draw it.

<!-- test: VirtualComboTests.DrawMode_AssignedAtRunTime -->
Unlike that of **ComboBoxW**, it can be assigned at run time. A value that is not a member raises run-time error 380.
<!-- /test -->

### DropDownHeight
{: .no_toc }

The height of the drop-down list, in the scale units of the control's container. **Single**. An assignment fixes the height: [**MaxDropDownItems**](#maxdropdownitems) no longer counts, until it is assigned again, and [**IntegralHeight**](#integralheight) becomes **False**. A value that is not greater than 0 raises run-time error 380. On a **VcbStyleSimpleCombo** control the property raises run-time error 5.

### DropDownWidth
{: .no_toc }

The least width of the drop-down list, in the scale units of the control's container. **Single**. The list is never narrower than the control. A negative value raises run-time error 380.

### DroppedDown
{: .no_toc }

Whether the drop-down list is open. **Boolean**. An assignment opens or closes it, and the control raises [**DropDown**](#dropdown) or [**CloseUp**](#closeup).

### ExtendedUI
{: .no_toc }

Whether the control uses the extended keyboard interface of the Windows combo box. **Boolean**. Default: **False**. With **True** the Down Arrow key opens the list, the F4 key does not, and the mouse wheel does not change the selection while the list is closed. It has no effect on a **VcbStyleSimpleCombo** control.

### FieldHeight
{: .no_toc }

The height of the text box, or of the field of a **VcbStyleDropDownList** control, in the scale units of the control's container. **Single**. A negative value raises run-time error 380.

### ForeColor
{: .no_toc }

The color of the control's text. **OLE_COLOR**.

### HorizontalExtent
{: .no_toc }

The width over which the list can be scrolled sideways, in the scale units of the control's container. **Single**. Default: 0. The list has a horizontal scroll bar while this is greater than its own width. A negative value raises run-time error 380.

### hWndEdit
{: .no_toc }

The handle of the text box inside the control. **LongPtr**, read-only. It is 0 on a **VcbStyleDropDownList** control.

### hWndList
{: .no_toc }

The handle of the list. **LongPtr**, read-only.

### IMEMode
{: .no_toc }

The state of the Input Method Editor while the text box has the focus. A member of [**CCIMEModeConstants**](Common#ccimemodeconstants). Default: **CCIMEModeNoControl**. Another value raises run-time error 380.

### IntegralHeight
{: .no_toc }

Whether the list shows whole items only. **Boolean**. Default: **True**, with which the list makes itself a little lower so that its last item is not cut.

<!-- test: VirtualComboTests.IntegralHeight_AtRunTime_Raises382 -->
It is set at design time: an assignment at run time raises run-time error 382. An assignment to [**DropDownHeight**](#dropdownheight) makes it **False**.
<!-- /test -->

### ItemHeight
{: .no_toc }

The height of an item in the list, in the scale units of the control's container. **Single**. All items have this height. A negative value raises run-time error 380.

### List
{: .no_toc }

The text of an item, as the handler of [**GetVirtualItem**](#getvirtualitem) supplies it. **String**, read-only.

Syntax: *object*.**List**( *Index* )

<!-- test: VirtualComboTests.List_NoSuchItem_Raises5 -->
An *Index* that is not an item raises run-time error 5.
<!-- /test -->

### ListBackColor
{: .no_toc }

The background color of the drop-down list while [**UseListBackColor**](#uselistbackcolor) is **True**. **OLE_COLOR**. Default: **vbWindowBackground**.

### ListCount
{: .no_toc }

The number of items in the list. **Long**. Default: 0. The program sets it.

<!-- test: VirtualComboTests.ListCount_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### ListForeColor
{: .no_toc }

The color of the text in the drop-down list while [**UseListForeColor**](#uselistforecolor) is **True**. **OLE_COLOR**. Default: **vbWindowText**.

### ListIndex
{: .no_toc }

The index of the selected item, or -1 when no item is selected. **Long**. Default: -1.

<!-- test: VirtualComboTests.ListIndex_NoSuchItem_Raises380, VirtualComboTests.ListIndex_SameValue_RaisesNoClick -->
An assignment selects the item, puts its text in the text box and raises [**Click**](#click), unless the item is selected already; the text box receives the item's text in either case. -1 removes the selection and empties the text box. A value that is not an item raises run-time error 380.
<!-- /test -->

### Locked
{: .no_toc }

Whether the user is kept from changing the text and the selection. **Boolean**. Default: **False**. With **True** the text box takes no typing, and the list does not respond to the keyboard or to the mouse on its items. The program can still assign [**Text**](#text) and [**ListIndex**](#listindex).

### MaxDropDownItems
{: .no_toc }

The greatest number of items that the drop-down list shows without scrolling. **Integer**. Default: 9.

<!-- test: VirtualComboTests.MaxDropDownItems_OutOfRange_Raises380 -->
A value less than 1 or greater than 30 raises run-time error 380.
<!-- /test -->

### MaxLength
{: .no_toc }

The greatest number of characters that the user can type in the text box. **Long**. Default: 0. With 0 the user can type 255 characters, and a text that the program assigns to [**Text**](#text) has no limit. With another value the limit is that number of characters for both. A negative value raises run-time error 380.

### OLEDragMode
{: .no_toc }

Whether the user can drag the selected text out of the text box. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants). Default: **vbOLEDragManual**, with which only [**OLEDrag**](Common#oledrag) starts a drag. With **vbOLEDragAutomatic** a drag that begins on the selected text carries it as text, to copy or to move; the control removes text that was moved. Another value raises run-time error 380.

### ScrollTrack
{: .no_toc }

Whether the list scrolls while the user drags the scroll box of its scroll bar. **Boolean**. Default: **True**. With **False** the list scrolls when the user releases the scroll box.

### SelLength
{: .no_toc }

The number of characters selected in the text box. **Long**. A negative value raises run-time error 380.

### SelStart
{: .no_toc }

The position where the selection in the text box starts, counted from 0, or the position of the caret when nothing is selected. **Long**. An assignment puts the caret there and selects nothing. A negative value raises run-time error 380.

### SelText
{: .no_toc }

The selected text of the text box. **String**. An assignment replaces the selection, or inserts the text at the caret. On a **VcbStyleDropDownList** control the property raises run-time error 380.

### Style
{: .no_toc }

What the control is made of. A member of [**VcbStyleConstants**](#vcbstyleconstants). Default: **VcbStyleDropDownCombo**. See [The styles](ComboBoxW#the-styles).

<!-- test: VirtualComboTests.Style_AtRunTime_Raises382 -->
It is set at design time. At run time an assignment raises run-time error 382, and a value that is not a member raises 380.
<!-- /test -->

### Text
{: .no_toc }

The text in the text box. **String**. A control newly drawn on a form has its own name.

On a **VcbStyleDropDownList** control it is the text of the selected item, and an assignment raises [**FindVirtualItem**](#findvirtualitem) for an item with this whole text and selects the item that the handler found; when the handler finds none, the assignment raises run-time error 383.

On the other styles an assignment that changes the text raises [**Change**](#change), and does not change [**ListIndex**](#listindex).

### TopIndex
{: .no_toc }

The index of the item at the top of the list. **Long**. An assignment scrolls the list. A value that is not an item raises run-time error 380.

### UseListBackColor
{: .no_toc }

Whether the drop-down list has [**ListBackColor**](#listbackcolor) as its background color. **Boolean**. Default: **False**.

### UseListForeColor
{: .no_toc }

Whether the drop-down list has [**ListForeColor**](#listforecolor) as the color of its text. **Boolean**. Default: **False**.

Methods
-------

### FindItem
{: .no_toc }

Raises [**FindVirtualItem**](#findvirtualitem) and returns the index that its handler found, or -1.

Syntax: *object*.**FindItem**( *Text* [, *Index* [, *Partial* ] ] )

*Text*
: *required* A **String**: the text to look for.

*Index*
: *optional* A **Long**: the item after which the search starts. The default, -1, searches from the top. A value that is not an item raises run-time error 381.

*Partial*
: *optional* A **Boolean**: **True** asks for an item that begins with *Text*, **False** (the default) for one whose whole text is *Text*.

### GetIdealHorizontalExtent
{: .no_toc }

Returns the [**HorizontalExtent**](#horizontalextent) with which the widest item can be scrolled into view, as a **Single** in the scale units of the control's container. It raises [**GetVirtualItem**](#getvirtualitem) for every item of the list, so it is slow on a long one.

Syntax: *object*.**GetIdealHorizontalExtent**

### SelectItem
{: .no_toc }

Raises [**FindVirtualItem**](#findvirtualitem) for an item that begins with a text, selects the item that the handler found, and returns its index, or -1. When it selects another item than before, the text box receives the item's text and the control raises [**Click**](#click).

Syntax: *object*.**SelectItem**( *Text* [, *Index* ] )

*Text*
: *required* A **String**: the beginning of the item's text.

*Index*
: *optional* A **Long**: the item after which the search starts, as in [**FindItem**](#finditem).

Events
------

### Change
{: .no_toc }

Raised when the text in the text box has changed: by the user's typing, or by an assignment to [**Text**](#text) of another text than the box has. Selecting an item raises [**Click**](#click) instead.

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised when another item has been selected: by the user, with the mouse or the keyboard, or by [**ListIndex**](#listindex), [**SelectItem**](#selectitem) or [**AutoSelect**](#autoselect). A mouse click that selects nothing raises no **Click**.

Syntax: *object*\_**Click**( )

### CloseUp
{: .no_toc }

Raised when the drop-down list has closed.

Syntax: *object*\_**CloseUp**( )

### ContextMenu
{: .no_toc }

Raised when the user asks for the control's shortcut menu, with the right mouse button or with Shift+F10.

Syntax: *object*\_**ContextMenu**( *Handled* **As Boolean**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*Handled*
: **False** when the event is raised. A handler that sets it to **True**, having shown a menu of its own, keeps the text box from showing the menu of Windows.

*X*, *Y*
: The position of the pointer, measured from the control's top left corner in the scale units of the control's container. Both are -1 when the user asked with the keyboard.

### DblClick
{: .no_toc }

Raised when the user double-clicks an item in the list of a **VcbStyleSimpleCombo** control. The other styles do not raise it.

Syntax: *object*\_**DblClick**( )

### DropDown
{: .no_toc }

Raised when the drop-down list is about to open.

Syntax: *object*\_**DropDown**( )

### FindVirtualItem
{: .no_toc }

Raised when an item is to be found by its text. See [Searching](#searching).

Syntax: *object*\_**FindVirtualItem**( **ByVal** *StartIndex* **As Long**, **ByVal** *SearchText* **As String**, **ByVal** *Partial* **As Boolean**, *FoundIndex* **As Long** )

*StartIndex*
: The item after which the search starts, or -1 to search from the top.

*SearchText*
: The text to look for.

*Partial*
: **True** when an item that begins with *SearchText* is asked for, **False** when the item's whole text must be *SearchText*.

*FoundIndex*
: -1 when the event is raised. The handler sets it to the index of the item found, and leaves it when there is none.

### GetVirtualItem
{: .no_toc }

Raised when the control needs the text of an item. See [Items that the program supplies](#items-that-the-program-supplies).

Syntax: *object*\_**GetVirtualItem**( **ByVal** *Item* **As Long**, *Text* **As String**)

*Item*
: The index of the item, from 0 to [**ListCount**](#listcount) - 1.

*Text*
: Empty when the event is raised. The handler sets it to the item's text.

### IncrementalSearch
{: .no_toc }

Raised when the user types a character while a **VcbStyleDropDownList** control has the focus. See [Searching](#searching).

Syntax: *object*\_**IncrementalSearch**( **ByVal** *SearchString* **As String**, **ByVal** *StartIndex* **As Long**, *FoundIndex* **As Long** )

*SearchString*
: The characters typed. A character typed soon after the one before is added to the string; after a pause the string starts again.

*StartIndex*
: The value of [**ListIndex**](#listindex).

*FoundIndex*
: -1 when the event is raised. The handler sets it to the index of the item to select.

### ItemDraw
{: .no_toc }

Raised when an item is to be drawn, while [**DrawMode**](#drawmode) is **VcbDrawModeOwnerDrawFixed**. Its arguments are those of the [**ItemDraw**](ComboBoxW#itemdraw) event of **ComboBoxW**.

Syntax: *object*\_**ItemDraw**( **ByVal** *Item* **As Long**, **ByVal** *ItemAction* **As Long**, **ByVal** *ItemState* **As Long**, **ByVal** *hDC* **As Long**, **ByVal** *Left* **As Long**, **ByVal** *Top* **As Long**, **ByVal** *Right* **As Long**, **ByVal** *Bottom* **As Long** )

### MouseDown, MouseMove, MouseUp
{: .no_toc }

<!-- test: VirtualComboTests.MouseMove_XAndY_AreInTwips -->
As the [common events](Common#mousedown-mousemove-mouseup) of these names, but *X* and *Y* are in twips, whatever the scale units of the control's container, and are measured from the top left corner of the control.
<!-- /test -->

### Scroll
{: .no_toc }

Raised when the list has scrolled, so that another item is at its top.

Syntax: *object*\_**Scroll**( )

## VcbStyleConstants
{: #vcbstyleconstants }

The values of [**Style**](#style).

| Member | Value | Description |
|---|---|---|
| **VcbStyleDropDownCombo**{: #VcbStyleConstants_VcbStyleDropDownCombo } | 0 | A text box and a list that drops down. |
| **VcbStyleSimpleCombo**{: #VcbStyleConstants_VcbStyleSimpleCombo } | 1 | A text box and a list that is always open. |
| **VcbStyleDropDownList**{: #VcbStyleConstants_VcbStyleDropDownList } | 2 | A list that drops down, and no text box. |

## VcbDrawModeConstants
{: #vcbdrawmodeconstants }

The values of [**DrawMode**](#drawmode).

| Member | Value | Description |
|---|---|---|
| **VcbDrawModeNormal**{: #VcbDrawModeConstants_VcbDrawModeNormal } | 0 | The control draws the items, with the texts that [**GetVirtualItem**](#getvirtualitem) supplies. |
| **VcbDrawModeOwnerDrawFixed**{: #VcbDrawModeConstants_VcbDrawModeOwnerDrawFixed } | 1 | The program draws the items, which all have one height. |

## See Also

- [Common members](Common) -- the members this control shares with the package's other controls
- [ComboBoxW](ComboBoxW) -- the combo box that holds its items
- [VListBox](VListBox) -- a list box whose items the program supplies
